"""PostgreSQL integration coverage for the durable audit queue.

These tests are deliberately opt-in: they never fall back to DATABASE_URL,
which may point at a real DevHub database. Run with an explicitly disposable
database, for example::

    AUDIT_TEST_DATABASE_URL=postgresql://postgres:devhub-test@127.0.0.1:55439/devhub_test \
      pytest tests/test_store_integration.py
"""

from __future__ import annotations

import os
import io
import json
import tarfile
from pathlib import Path
from types import SimpleNamespace
from typing import TypedDict
from uuid import UUID

import psycopg
import pytest
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from langgraph.graph import END, START, StateGraph

from auditor.checkpoints import checkpoint_saver
from auditor.config import Settings
from auditor.store import Store
from auditor.worker import process


TEST_DATABASE_URL = os.getenv("AUDIT_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="requires an explicit disposable AUDIT_TEST_DATABASE_URL",
)

REPO_ID = UUID("10000000-0000-0000-0000-000000000001")
PR_ID = UUID("20000000-0000-0000-0000-000000000001")
USER_ID = UUID("30000000-0000-0000-0000-000000000001")
PROFILE = {
    "version": "1",
    "enabled": True,
    "node_image": "devhub-audit-node:22",
    "projects": [{
        "directory": ".",
        "rebuild": [],
        "checks": [{"name": "test", "argv": ["npm", "test"]}],
    }],
}


def _connection():
    assert TEST_DATABASE_URL is not None
    return psycopg.connect(TEST_DATABASE_URL, row_factory=dict_row)


@pytest.fixture(scope="session", autouse=True)
def migrated_test_database():
    if not TEST_DATABASE_URL:
        yield
        return

    # A second, explicit guard makes an accidental production URL fail closed
    # even if somebody exports the opt-in variable with the wrong value.
    parameters = psycopg.conninfo.conninfo_to_dict(TEST_DATABASE_URL)
    if parameters.get("dbname") != "devhub_test":
        pytest.fail("AUDIT_TEST_DATABASE_URL must target the disposable devhub_test database")

    migration = (
        Path(__file__).resolve().parents[2] / "server" / "prisma" / "sql" / "006_agent_audits.sql"
    ).read_text()
    with _connection() as connection:
        connection.execute("create table if not exists schema_migrations (version text primary key, name text not null)")
        connection.execute("create table if not exists users (id uuid primary key)")
        connection.execute("create table if not exists repositories (id uuid primary key)")
        connection.execute("create table if not exists pull_request (id uuid primary key)")
        connection.commit()
        connection.execute(migration)
        connection.execute("insert into users(id) values (%s) on conflict do nothing", (USER_ID,))
        connection.execute("insert into repositories(id) values (%s) on conflict do nothing", (REPO_ID,))
        connection.execute("insert into pull_request(id) values (%s) on conflict do nothing", (PR_ID,))
    with checkpoint_saver(TEST_DATABASE_URL) as saver:
        saver.setup()
    yield


@pytest.fixture(autouse=True)
def clean_queue(monkeypatch: pytest.MonkeyPatch, migrated_test_database):
    if not TEST_DATABASE_URL:
        yield
        return
    monkeypatch.setenv("AUDIT_ENABLED", "true")
    monkeypatch.delenv("REDIS_URL", raising=False)
    with _connection() as connection:
        connection.execute("truncate audit_feedback, audit_runs, audit_webhook_deliveries")
        connection.execute(
            "truncate audit_private.checkpoint_writes, audit_private.checkpoint_blobs, audit_private.checkpoints"
        )
        connection.execute(
            "update audit_control set enabled=true, publish_enabled=false where id=true"
        )
    yield


@pytest.fixture
def store() -> Store:
    assert TEST_DATABASE_URL is not None
    return Store(TEST_DATABASE_URL)


def _insert_run(*, suffix: str = "1", status: str = "queued", completed: str | None = None,
                result=None, profile=PROFILE):
    with _connection() as connection:
        return connection.execute(
            """insert into audit_runs
               (pr_id,repo_id,owner,repo,pr_number,base_sha,head_sha,config_version,profile,
                status,completed_at,result)
               values (%s,%s,'example','repo',7,%s,%s,%s,%s,%s,%s,%s)
               returning *""",
            (
                PR_ID,
                REPO_ID,
                f"base-{suffix}",
                f"head-{suffix}",
                f"config-{suffix}",
                Jsonb(profile),
                status,
                completed,
                Jsonb(result or {}),
            ),
        ).fetchone()


class TinyState(TypedDict):
    count: int


def _write_checkpoint(thread_id: str) -> None:
    builder = StateGraph(TinyState)
    builder.add_node("increment", lambda state: {"count": state["count"] + 1})
    builder.add_edge(START, "increment")
    builder.add_edge("increment", END)
    with checkpoint_saver(TEST_DATABASE_URL) as saver:
        graph = builder.compile(checkpointer=saver)
        result = graph.invoke({"count": 0}, {"configurable": {"thread_id": thread_id}})
    assert result == {"count": 1}


def _has_checkpoint(thread_id: str) -> bool:
    with checkpoint_saver(TEST_DATABASE_URL) as saver:
        return next(saver.list({"configurable": {"thread_id": thread_id}}, limit=1), None) is not None


def test_migration_contract_matches_worker_queries(store: Store):
    with _connection() as connection:
        control = connection.execute(
            "select id,enabled,publish_enabled from audit_control where id=true"
        ).fetchone()
        columns = {
            row["column_name"]
            for row in connection.execute(
                """select column_name from information_schema.columns
                   where table_schema='public' and table_name='audit_runs'"""
            )
        }
        delivery_columns = {
            row["column_name"]
            for row in connection.execute(
                """select column_name from information_schema.columns
                   where table_schema='public' and table_name='audit_webhook_deliveries'"""
            )
        }

    assert control == {"id": True, "enabled": True, "publish_enabled": False}
    assert {
        "id", "pr_id", "repo_id", "profile", "status", "stage", "attempts",
        "lease_token", "lease_until", "cancel_requested", "result", "usage",
        "publication_state", "updated_at",
    } <= columns
    assert {"delivery_id", "processed", "created_at"} <= delivery_columns
    assert store.controls() == {"enabled": True, "publish_enabled": False}


def test_claim_is_single_concurrency_and_heartbeat_is_lease_scoped(store: Store):
    queued = _insert_run()

    claimed = store.claim()

    assert claimed["id"] == queued["id"]
    assert claimed["status"] == "running"
    assert claimed["attempts"] == 1
    assert claimed["lease_token"] is not None
    assert store.claim() is None
    assert store.heartbeat(claimed) is True
    wrong_lease = {**claimed, "lease_token": UUID("ffffffff-ffff-ffff-ffff-ffffffffffff")}
    assert store.heartbeat(wrong_lease) is False


def test_cancellation_holds_single_slot_until_lease_expires_then_allows_next_job(store: Store):
    first = _insert_run(suffix="cancelled")
    second = _insert_run(suffix="next")
    claimed = store.claim()
    assert claimed["id"] == first["id"]

    with _connection() as connection:
        connection.execute(
            "update audit_runs set cancel_requested=true where id=%s",
            (claimed["id"],),
        )

    with pytest.raises(InterruptedError, match="cancelled"):
        store.active(claimed)
    # Keep the global one-runner invariant while the old container may still
    # be shutting down. Cancellation frees the slot only after worker ack or
    # lease expiry.
    assert store.claim() is None
    with _connection() as connection:
        connection.execute(
            "update audit_runs set lease_until=now()-interval '1 second' where id=%s",
            (claimed["id"],),
        )
    next_claim = store.claim()
    assert next_claim is not None
    assert next_claim["id"] == second["id"]
    with _connection() as connection:
        cancelled = connection.execute(
            "select status from audit_runs where id=%s", (first["id"],)
        ).fetchone()
    assert cancelled["status"] == "cancelled"


def test_expired_lease_retries_three_times_then_fails(store: Store):
    queued = _insert_run(suffix="retry")

    for expected_attempt in (1, 2, 3):
        claimed = store.claim()
        assert claimed["id"] == queued["id"]
        assert claimed["attempts"] == expected_attempt
        with _connection() as connection:
            connection.execute(
                "update audit_runs set lease_until=now()-interval '1 second' where id=%s",
                (queued["id"],),
            )

    assert store.claim() is None
    with _connection() as connection:
        failed = connection.execute(
            "select status,error,attempts from audit_runs where id=%s", (queued["id"],)
        ).fetchone()
    assert failed == {"status": "failed", "error": "Retry limit exceeded", "attempts": 3}


def test_prune_strips_old_execution_evidence_and_deletes_expired_records(store: Store):
    retained = _insert_run(
        suffix="retained",
        status="completed",
        result={"findings": [{"id": "finding-1"}], "analysis": {"large": True}, "messages": ["x"]},
    )
    expired = _insert_run(
        suffix="expired",
        status="completed",
        result={"findings": []},
    )
    with _connection() as connection:
        # The helper binds values, so set relative timestamps explicitly.
        connection.execute("update audit_runs set completed_at=now()-interval '15 days' where id=%s", (retained["id"],))
        connection.execute("update audit_runs set completed_at=now()-interval '91 days' where id=%s", (expired["id"],))
        connection.execute(
            "insert into audit_webhook_deliveries(delivery_id,created_at) values ('old',now()-interval '15 days')"
        )

    store.prune()

    with _connection() as connection:
        kept = connection.execute("select result from audit_runs where id=%s", (retained["id"],)).fetchone()
        deleted = connection.execute("select 1 from audit_runs where id=%s", (expired["id"],)).fetchone()
        old_delivery = connection.execute(
            "select 1 from audit_webhook_deliveries where delivery_id='old'"
        ).fetchone()
    assert kept["result"] == {"findings": [{"id": "finding-1"}]}
    assert deleted is None
    assert old_delivery is None


def test_prune_removes_old_run_and_orphan_langgraph_checkpoints(store: Store):
    old_run = _insert_run(
        suffix="checkpoint",
        status="completed",
        result={"findings": [], "checks": [{"name": "test", "exit_code": 0}]},
    )
    old_thread = str(old_run["id"])
    orphan_thread = "40000000-0000-0000-0000-000000000001"
    _write_checkpoint(old_thread)
    _write_checkpoint(orphan_thread)
    assert _has_checkpoint(old_thread)
    assert _has_checkpoint(orphan_thread)

    with _connection() as connection:
        connection.execute(
            "update audit_runs set completed_at=now()-interval '15 days' where id=%s",
            (old_run["id"],),
        )

    store.prune()

    assert not _has_checkpoint(old_thread)
    assert not _has_checkpoint(orphan_thread)


def _fixture_archive(source: str) -> bytes:
    files = {
        "fixture/package.json": json.dumps({
            "name": "audit-worker-fixture",
            "version": "1.0.0",
            "scripts": {"test": "node test.js"},
        }) + "\n",
        "fixture/package-lock.json": json.dumps({
            "name": "audit-worker-fixture",
            "version": "1.0.0",
            "lockfileVersion": 3,
            "requires": True,
            "packages": {"": {"name": "audit-worker-fixture", "version": "1.0.0"}},
        }) + "\n",
        "fixture/source.js": source,
        "fixture/test.js": (
            "const assert = require('node:assert/strict');\n"
            "const { add } = require('./source');\n"
            "assert.equal(add(2, 3), 5);\n"
        ),
    }
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w:gz") as archive:
        for name, content in files.items():
            raw = content.encode()
            member = tarfile.TarInfo(name)
            member.size = len(raw)
            member.mode = 0o644
            archive.addfile(member, io.BytesIO(raw))
    return output.getvalue()


class _ToolBlock:
    type = "tool_use"

    def __init__(self, block_id: str, name: str, input_: dict):
        self.id, self.name, self.input = block_id, name, input_

    def model_dump(self, **_kwargs):
        return {"type": self.type, "id": self.id, "name": self.name, "input": self.input}


class _ScriptedMessages:
    def __init__(self):
        self.calls = 0

    def count_tokens(self, **_kwargs):
        return SimpleNamespace(input_tokens=20)

    def create(self, **_kwargs):
        self.calls += 1
        if self.calls == 1:
            content = [_ToolBlock("patch-1", "try_patch", {
                "finding_id": "regression-add",
                "edits": [{"path": "source.js", "old": "a - b", "new": "a + b"}],
            })]
        elif self.calls == 2:
            content = [_ToolBlock("report-1", "submit_report", {
                "summary": "The change breaks addition and the configured test reproduces the regression.",
                "findings": [{
                    "id": "regression-add",
                    "title": "Addition now subtracts its operands",
                    "severity": "high",
                    "category": "logical-regression",
                    "path": "source.js",
                    "line": 1,
                    "explanation": "Calling add with positive operands returns their difference instead of their sum.",
                    "evidence": "exports.add = (a, b) => a - b;",
                    "verification": "static",
                }],
                "limitations": [],
            })]
        else:
            raise AssertionError("Worker made an unexpected live-model-shaped call")
        return SimpleNamespace(
            content=content,
            usage=SimpleNamespace(input_tokens=20, output_tokens=100),
        )


class _FakeAnthropic:
    def __init__(self):
        self.messages = _ScriptedMessages()


class _FixtureGitHub:
    bot_login = "unused[bot]"

    def __init__(self):
        self.base = _fixture_archive("exports.add = (a, b) => a + b;\n")
        self.head = _fixture_archive("exports.add = (a, b) => a - b;\n")

    def get(self, path: str, **_params):
        assert path.endswith("/compare/base-sha...head-sha")
        return {"merge_base_commit": {"sha": "merge-base-sha"}}

    def archive(self, repo: str, sha: str):
        assert repo == "example/repo"
        if sha == "merge-base-sha":
            return self.base
        assert sha == "head-sha"
        return self.head


@pytest.mark.skipif(
    os.getenv("AUDIT_TEST_DOCKER", "").lower() != "true" or not TEST_DATABASE_URL,
    reason="requires AUDIT_TEST_DOCKER=true and an explicit disposable AUDIT_TEST_DATABASE_URL",
)
def test_full_worker_process_validates_candidate_fix_without_external_apis(
    store: Store, monkeypatch: pytest.MonkeyPatch
):
    profile = {
        **PROFILE,
        "projects": [{
            "directory": ".",
            "rebuild": [],
            "checks": [{"name": "test", "argv": ["npm", "test"]}],
        }],
    }
    queued = _insert_run(suffix="worker", profile=profile)
    with _connection() as connection:
        connection.execute(
            "update audit_runs set base_sha='base-sha',head_sha='head-sha' where id=%s",
            (queued["id"],),
        )
    run = store.claim()
    assert run is not None and run["id"] == queued["id"]

    fake_anthropic = _FakeAnthropic()
    monkeypatch.setattr("auditor.workflow.make_client", lambda *_args, **_kwargs: fake_anthropic)
    monkeypatch.setenv("AUDIT_RUNNER_IMAGES", profile["node_image"])
    monkeypatch.setenv("PYTHONPATH", str(Path(__file__).resolve().parents[1]))
    settings = Settings(database_url=TEST_DATABASE_URL, model="scripted-test-model")

    process(settings, store, _FixtureGitHub(), run)

    completed = store.get(run["id"])
    assert completed["status"] == "completed", completed.get("error")
    checks = [row for row in completed["result"]["checks"] if row["name"].endswith(":test")]
    assert next(row for row in checks if row["revision"] == "base")["exit_code"] == 0
    assert next(row for row in checks if row["revision"] == "head")["exit_code"] != 0
    patch = completed["result"]["patches"][0]
    assert patch["verified"] is True
    candidate_test = next(row for row in patch["checks"] if row["name"].endswith(":test"))
    assert candidate_test["exit_code"] == 0
    finding = completed["result"]["findings"][0]
    assert finding["verification"] == "static"
    assert finding["checks_validated"] is True
    assert fake_anthropic.messages.calls == 2
