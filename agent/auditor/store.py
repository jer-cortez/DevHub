import json
import os
import uuid
from pathlib import Path
from datetime import datetime, timezone
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


class Store:
    def __init__(self, url):
        self.url = url

    def connect(self):
        return psycopg.connect(self.url, row_factory=dict_row)

    def controls(self):
        with self.connect() as c:
            row = c.execute("select enabled,publish_enabled from audit_control where id=true").fetchone()
        return row or {"enabled": False, "publish_enabled": False}

    def claim(self):
        if os.getenv("AUDIT_ENABLED") != "true" or not self.controls()["enabled"]:
            return None
        with self.connect() as c:
            # Single global pilot worker, including accidental duplicate deployments.
            c.execute("select pg_advisory_xact_lock(9182201)")
            c.execute("""update audit_runs set status='cancelled',stage='cancelled',
                completed_at=now(),updated_at=now() where status='running'
                and cancel_requested=true and lease_until<now()""")
            c.execute("""update audit_runs set status='failed', error='Retry limit exceeded',
                completed_at=now(), updated_at=now() where status='running'
                and lease_until < now() and attempts >= 3""")
            if c.execute("select 1 from audit_runs where status='running' and lease_until>now() limit 1").fetchone():
                return None
            row = c.execute("""select * from audit_runs where cancel_requested=false and
                (status='queued' or (status='running' and lease_until<now() and attempts<3))
                order by created_at for update skip locked limit 1""").fetchone()
            if not row:
                return None
            return c.execute("""update audit_runs set status='running', attempts=attempts+1,
                lease_token=%s, lease_until=now()+interval '90 seconds',
                started_at=coalesce(started_at,now()),updated_at=now()
                where id=%s returning *""", (uuid.uuid4(), row["id"])).fetchone()

    def get(self, run_id):
        with self.connect() as c:
            return c.execute("select * from audit_runs where id=%s", (run_id,)).fetchone()

    def active(self, run):
        row = self.get(run["id"])
        if not row or row["status"] != "running" or row["cancel_requested"] or row["lease_token"] != run["lease_token"]:
            raise InterruptedError("Audit cancelled, superseded, or lease lost")
        if row["lease_until"] < datetime.now(timezone.utc):
            raise InterruptedError("Audit lease expired")
        if os.getenv("AUDIT_ENABLED") != "true" or not self.controls()["enabled"]:
            raise InterruptedError("Auditor disabled")
        if os.getenv("AUDIT_PROFILES_PATH"):
            profiles = json.loads(Path(os.environ["AUDIT_PROFILES_PATH"]).read_text())
            key = f"{run['owner']}/{run['repo']}".lower()
            profile = next((v for k, v in profiles.items() if k.lower() == key), None)
            if not profile or not profile.get("enabled", True):
                raise InterruptedError("Repository auditing disabled")
        return row

    def heartbeat(self, run):
        with self.connect() as c:
            return c.execute("""update audit_runs set lease_until=now()+interval '90 seconds'
                where id=%s and lease_token=%s and status='running' and cancel_requested=false
                returning id""", (run["id"], run["lease_token"])).fetchone() is not None

    def update(self, run, **fields):
        allowed = {"stage", "status", "result", "usage", "error", "merge_base_sha", "publication_state", "lease_until",
                   "github_review_id", "github_review_url", "completed_at"}
        if not set(fields) <= allowed:
            raise ValueError("Unexpected update field")
        values = [Jsonb(v) if k in ("result", "usage") else v for k, v in fields.items()]
        with self.connect() as c:
            result = c.execute(
                "update audit_runs set " + ",".join(f"{k}=%s" for k in fields) +
                ",updated_at=now() where id=%s and lease_token=%s and status='running' returning id",
                (*values, run["id"], run["lease_token"])).fetchone()
        if not result:
            raise InterruptedError("Audit lease lost")
        self.notify(run)

    def notify(self, run):
        if not os.getenv("REDIS_URL"):
            return
        try:
            import redis
            with redis.Redis.from_url(os.environ["REDIS_URL"], socket_timeout=2) as client:
                client.publish("repo-events", json.dumps({"type": "audit", "repoId": str(run["repo_id"]),
                                                           "data": {"id": str(run["id"]), "pr_id": str(run["pr_id"])}}))
        except Exception:
            pass  # UI polls as fallback; event delivery must not affect job durability.

    def prune(self):
        with self.connect() as c:
            if c.execute("select to_regclass('audit_private.checkpoints') as relation").fetchone()["relation"]:
                old = c.execute("""select distinct cp.thread_id from audit_private.checkpoints cp
                    left join audit_runs a on a.id::text=cp.thread_id
                    where a.id is null or a.completed_at < now()-interval '14 days'""").fetchall()
                if old:
                    from .checkpoints import checkpoint_saver
                    with checkpoint_saver(self.url) as saver:
                        for row in old:
                            saver.delete_thread(row["thread_id"])
            c.execute("""update audit_runs set result=result-'checks'-'analysis'-'messages'-'patches'
                where completed_at < now()-interval '14 days'""")
            c.execute("delete from audit_runs where completed_at < now()-interval '90 days'")
            c.execute("delete from audit_webhook_deliveries where created_at < now()-interval '14 days'")
