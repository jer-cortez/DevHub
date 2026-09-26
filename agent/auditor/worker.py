import argparse
import logging
import os
import signal
import tempfile
import threading
import time
import httpx
import anthropic
import openai
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from .checkpoints import checkpoint_saver

from .config import Settings
from .github import GitHub
from .models import Profile
from .publish import publish
from .store import Store
from .workflow import Workflow
from .llm import make_client

log = logging.getLogger("devhub.auditor")


def process(settings, store, github, run):
    stopped = threading.Event()

    def heartbeat():
        while not stopped.wait(20):
            try:
                if not store.heartbeat(run):
                    return
            except Exception:
                log.warning("Heartbeat failed for audit %s", run["id"])

    thread = threading.Thread(target=heartbeat, daemon=True)
    thread.start()
    try:
        Profile.model_validate(run["profile"])
        with tempfile.TemporaryDirectory(prefix="devhub-audit-") as temporary:
            workflow = Workflow(settings, store, github, run, Path(temporary))
            if not workflow.result.get("summary"):
                workflow.prepare()
                with checkpoint_saver(settings.database_url) as checkpoint:
                    workflow.review(checkpoint)
            workflow.guard()
            publish(store, github, run, workflow.result)
            store.update(run, status="completed", stage="complete", completed_at=datetime.now(timezone.utc))
    except InterruptedError:
        # Server may already have marked it superseded/cancelled. Respect that state.
        row = store.get(run["id"])
        if row and row["status"] == "running" and row["lease_token"] == run["lease_token"]:
            store.update(run, status="cancelled", stage="cancelled", completed_at=datetime.now(timezone.utc))
    except Exception as exc:
        # Do not log exception repr: HTTP errors may contain authorization-bearing URLs.
        log.error("Audit %s failed (%s)", run["id"], type(exc).__name__)
        row = store.get(run["id"])
        if row and row["status"] == "running" and row["lease_token"] == run["lease_token"]:
            retryable = isinstance(exc, (httpx.TransportError, anthropic.APIConnectionError,
                                        anthropic.RateLimitError, anthropic.InternalServerError,
                                        openai.APIConnectionError, openai.RateLimitError,
                                        openai.InternalServerError))
            retryable = retryable or (isinstance(exc, httpx.HTTPStatusError) and
                                     exc.response.status_code in (429, 500, 502, 503, 504))
            if retryable and row["attempts"] < 3:
                # Leave a short backoff lease; claim resumes this checkpoint
                # after expiry instead of generating a second independent job.
                from datetime import timedelta
                store.update(run, stage="retry_wait", lease_until=datetime.now(timezone.utc) + timedelta(seconds=30))
                return
            detail = str(exc)[:1000] if isinstance(exc, (ValueError, TimeoutError, RuntimeError)) else type(exc).__name__
            store.update(run, status="failed", error=detail, stage="failed", completed_at=datetime.now(timezone.utc))
    finally:
        stopped.set()
        thread.join(timeout=3)


def main():
    load_dotenv(Path(__file__).parents[1] / ".env", override=False)
    load_dotenv(Path(__file__).parents[2] / "server" / ".env", override=False)
    parser = argparse.ArgumentParser()
    parser.add_argument("--setup", action="store_true", help="Create LangGraph checkpoint tables after migration 006")
    parser.add_argument("--check", action="store_true", help="Check DB, GitHub App, and model access without starting reviews")
    parser.add_argument("--once", action="store_true", help="Claim and process at most one job")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    settings = Settings.load()
    os.environ.setdefault("AUDIT_PROFILES_PATH", str(Path(__file__).parents[1] / "profiles.json"))
    store = Store(settings.database_url)
    if args.setup:
        with checkpoint_saver(settings.database_url) as saver:
            saver.setup()
        print("LangGraph checkpoint tables ready. Audit enablement remains unchanged.")
        return
    github = GitHub()
    if args.check:
        store.controls()
        github.get("/installation/repositories", per_page=1)
        make_client(settings.provider, settings.reasoning).models.retrieve(settings.model)
        print("Database, GitHub installation, and configured model are reachable.")
        return
    # Refuse to run until explicit setup has completed.
    with store.connect() as connection:
        connection.execute("select 1 from audit_private.checkpoints limit 1")
    stop = threading.Event()

    def shutdown(_signal, _frame):
        stop.set()
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, shutdown)
    last_prune = 0.0
    while not stop.is_set():
        try:
            if time.monotonic() - last_prune > 3600:
                store.prune()
                last_prune = time.monotonic()
            run = store.claim()
            if run:
                log.info("Claimed audit %s (attempt %s)", run["id"], run["attempts"])
                process(settings, store, github, run)
            if args.once:
                return
            stop.wait(2)
        except KeyboardInterrupt:
            return
        except Exception as exc:
            log.error("Worker iteration failed (%s)", type(exc).__name__)
            if args.once:
                raise
            stop.wait(5)


if __name__ == "__main__":
    main()
