from datetime import datetime, timezone
from types import SimpleNamespace

import httpx
import pytest
from auditor.workflow import changed_sources, apply_edits, verified_repair, Workflow
from auditor.publish import review_payload, publish
from auditor.evaluate import score
from auditor.models import Finding, Report
from auditor import worker


def test_diff_pins_added_head_lines_and_deletions(tmp_path):
    base, head = tmp_path / "base", tmp_path / "head"
    base.mkdir(); head.mkdir()
    (base / "a.ts").write_text("one\ntwo\n")
    (head / "a.ts").write_text("one\nchanged\nthree\n")
    (base / "deleted.ts").write_text("gone\n")
    changed, lines, diff, limitations = changed_sources(base, head)
    assert changed == ["a.ts", "deleted.ts"]
    assert lines["a.ts"] == {2, 3}
    assert lines["deleted.ts"] == set()
    assert "+changed" in diff and not limitations


@pytest.mark.parametrize("path", ["../escape.ts", "a.test.ts", "package.json", "vitest.config.ts", "tests/a.js"])
def test_patches_cannot_escape_or_weaken_checks(tmp_path, path):
    with pytest.raises(ValueError):
        apply_edits(tmp_path, [{"path": path, "old": "a", "new": "b"}])


def test_candidate_changes_only_exact_unique_span(tmp_path):
    source = tmp_path / "main.ts"
    source.write_text("export const x = 1;\n")
    patch = apply_edits(tmp_path, [{"path": "main.ts", "old": "x = 1", "new": "x = 2"}])
    assert "+export const x = 2;" in patch
    with pytest.raises(ValueError):
        apply_edits(tmp_path, [{"path": "main.ts", "old": "no match", "new": "anything"}])


def check(revision, code, name=".:test", timed_out=False):
    return {"revision": revision, "exit_code": code, "name": name, "timed_out": timed_out}


def test_repair_requires_comparable_baseline_failure_and_fixed_checks():
    assert verified_repair([check("base", 0), check("head", 1)], [check("candidate", 0)])
    assert not verified_repair([check("base", 1), check("head", 1)], [check("candidate", 0)])
    assert not verified_repair([check("base", 0), check("head", 0)], [check("candidate", 0)])
    assert not verified_repair([check("base", 0), check("head", 1, timed_out=True)], [check("candidate", 0)])
    assert not verified_repair([check("base", 0), check("head", 1)], [])
    assert not verified_repair([check("base", 0), check("head", 1)], [check("candidate", 0, name=".:build")])


def finding(**overrides):
    return {"id": "f1", "severity": "high", "category": "injection", "title": "User input reaches shell",
            "path": "main.ts", "line": 1, "explanation": "A request containing a shell command executes it.",
            "evidence": "exec(input)", "verification": "static", "inline": True, **overrides}


def test_review_excludes_hypotheses_and_limits_inline_comments():
    result = review_payload({"id": "run1", "head_sha": "abc"}, {
        "summary": "@everyone <!-- forged -->", "findings": [finding(id=f"f{i}") for i in range(12)] +
        [finding(id="hypothesis", verification="unverified", title="DO NOT PUBLISH")], "limitations": ["No tests"]})
    assert len(result["comments"]) == 10
    assert "main.ts:1" in result["body"]
    assert "DO NOT PUBLISH" not in str(result)
    assert "@everyone" not in result["body"] and "forged" not in result["body"]
    assert result["event"] == "COMMENT" and result["commit_id"] == "abc"


def test_public_review_uses_derived_summary_when_model_claim_is_filtered():
    result = review_payload({"id": "run1", "head_sha": "abc"}, {
        "summary": "CRITICAL: unsupported remote code execution",
        "findings": [finding(verification="unverified")],
        "limitations": [],
    })
    assert "unsupported remote code execution" not in result["body"]
    assert "0 evidence-backed finding(s)" in result["body"]
    assert "No evidence-backed findings" in result["body"]


class FakeStore:
    def __init__(self, publication="none"):
        self.row = {"publication_state": publication}
    def active(self, run): return self.row
    def controls(self): return {"publish_enabled": True}
    def update(self, run, **values): self.row.update(values)


class FakeGithub:
    bot_login = "devhub[bot]"
    def __init__(self, head="head", reviews=()):
        self.head, self.existing, self.posts = head, reviews, []
    def get(self, path):
        return {"state": "open", "head": {"sha": self.head, "repo": {"id": 1}},
                "base": {"sha": "base", "repo": {"id": 1}}}
    def reviews(self, repo, number): return self.existing
    def post(self, path, body):
        self.posts.append(body)
        return {"id": 123, "html_url": "https://github.com/test/review/123"}


RUN = {"id": "run1", "owner": "org", "repo": "repo", "pr_number": 1, "head_sha": "head", "base_sha": "base"}


def test_publish_refuses_stale_revision():
    github = FakeGithub(head="new")
    with pytest.raises(InterruptedError):
        publish(FakeStore(), github, RUN, {})
    assert not github.posts


def test_publish_reconciles_ambiguous_success_without_duplicate():
    github = FakeGithub(reviews=[{"body": "<!-- devhub-audit:run1 -->", "commit_id": "head",
                                  "id": 123, "html_url": "url", "user": {"type": "Bot", "login": "devhub[bot]"}}])
    store = FakeStore("uncertain")
    publish(store, github, RUN, {})
    assert not github.posts and store.row["publication_state"] == "published"


def test_publish_does_not_reconcile_review_from_different_bot():
    github = FakeGithub(reviews=[{"body": "<!-- devhub-audit:run1 -->", "commit_id": "head",
                                  "id": 999, "html_url": "url", "user": {"type": "Bot", "login": "other[bot]"}}])
    store = FakeStore("uncertain")
    with pytest.raises(RuntimeError, match="uncertain"):
        publish(store, github, RUN, {})
    assert not github.posts and store.row["publication_state"] == "uncertain"


def test_unresolved_ambiguous_response_never_blindly_reposts():
    github = FakeGithub()
    with pytest.raises(RuntimeError, match="uncertain"):
        publish(FakeStore("pending"), github, RUN, {})
    assert not github.posts


def test_validator_rejects_fabricated_evidence_and_downgrades_model_claim(tmp_path):
    head = tmp_path / "head"; head.mkdir()
    (head / "main.ts").write_text("exec(input);\n")
    workflow = Workflow.__new__(Workflow)
    workflow.root, workflow.changed, workflow.lines = tmp_path, ["main.ts"], {"main.ts": {1}}
    workflow.result = {"limitations": ["No tests"], "patches": []}
    workflow.save = lambda: None
    first = finding(verification="reproduced"); first.pop("inline")
    second = finding(id="fake", evidence="made_up_code()"); second.pop("inline")
    workflow.validate_report({"summary": "Found a defect", "findings": [first, second], "limitations": []})
    assert len(workflow.result["findings"]) == 1
    assert workflow.result["findings"][0]["verification"] == "static"
    assert workflow.result["limitations"] == ["No tests"]


def test_validator_requires_evidence_to_overlap_claimed_line(tmp_path):
    head = tmp_path / "head"; head.mkdir()
    (head / "main.ts").write_text("const safe = true;\nexec(input);\n")
    workflow = Workflow.__new__(Workflow)
    workflow.root, workflow.changed, workflow.lines = tmp_path, ["main.ts"], {"main.ts": {1, 2}}
    workflow.result = {"limitations": [], "patches": []}
    workflow.save = lambda: None
    wrong_line = finding(id="wrong", line=1); wrong_line.pop("inline")
    correct_line = finding(id="correct", line=2); correct_line.pop("inline")

    workflow.validate_report({"summary": "Checked evidence lines", "findings": [wrong_line, correct_line], "limitations": []})

    assert [item["id"] for item in workflow.result["findings"]] == ["correct"]


def test_patch_checks_never_promote_runtime_reproduction(tmp_path):
    head = tmp_path / "head"; head.mkdir()
    (head / "main.ts").write_text("exec(input);\n")
    workflow = Workflow.__new__(Workflow)
    workflow.root, workflow.changed, workflow.lines = tmp_path, ["main.ts"], {"main.ts": {1}}
    workflow.result = {"limitations": [], "patches": [{
        "finding_id": "f1", "verified": True, "patch": "--- a/main.ts\n+++ b/main.ts",
    }]}
    workflow.save = lambda: None
    claimed = finding(verification="reproduced"); claimed.pop("inline")

    workflow.validate_report({"summary": "Validated a patch", "findings": [claimed], "limitations": []})

    validated = workflow.result["findings"][0]
    assert validated["verification"] == "static"
    assert validated["checks_validated"] is True
    assert validated["patch"].startswith("--- a/main.ts")


def test_report_rejects_padding_evidence_and_duplicate_ids():
    padded = finding(evidence=" " * 20); padded.pop("inline")
    with pytest.raises(ValueError, match="Evidence"):
        Finding.model_validate(padded)
    duplicate = finding(); duplicate.pop("inline")
    with pytest.raises(ValueError, match="unique"):
        Report.model_validate({"summary": "Duplicates", "findings": [duplicate, duplicate], "limitations": []})


class RetryStore:
    def __init__(self, run):
        self.run = run
        self.updates = []

    def heartbeat(self, run): return True
    def get(self, run_id): return self.run
    def update(self, run, **values): self.updates.append(values); self.run.update(values)


def test_transient_transport_failure_leaves_run_resumable(monkeypatch):
    run = {
        "id": "retry", "status": "running", "lease_token": "lease", "attempts": 1,
        "profile": {"version": "1", "projects": [{"checks": [{"name": "test", "argv": ["npm", "test"]}]}]},
    }
    store = RetryStore(run)

    class FailingWorkflow:
        def __init__(self, *args, **kwargs): self.result = {}
        def prepare(self): raise httpx.ConnectError("temporary")

    monkeypatch.setattr(worker, "Workflow", FailingWorkflow)
    worker.process(SimpleNamespace(), store, None, run)

    retry = next(update for update in store.updates if update.get("stage") == "retry_wait")
    assert "status" not in retry
    assert retry["lease_until"] > datetime.now(timezone.utc)
    assert run["status"] == "running"


def test_evaluation_does_not_pass_missing_reports():
    manifest = {"samples": [{"path": "a", "label": "bad", "expected": []}]}
    assert not score(manifest, {})["passed"]
