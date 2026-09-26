import json
import os
import signal
import subprocess
import sys
import tempfile
import time
from .archive import pack

MAX_RUNNER_RESPONSE = 4 * 1024 * 1024


class Runner:
    def __init__(self, settings, guard):
        self.settings, self.guard = settings, guard

    def call(self, operation, root, profile, changed_files=None):
        payload = {"operation": operation, "archive": pack(root), "profile": profile,
                   "changed_files": changed_files or []}
        argv = (["ssh", "-oBatchMode=yes", "-oStrictHostKeyChecking=yes", "-oConnectTimeout=10",
                 self.settings.runner_host, "devhub-audit-runner"] if self.settings.runner_host
                else [sys.executable, "-m", "auditor.runner"])
        # Temporary files avoid pipe deadlocks while the guard checks cancellation.
        with tempfile.TemporaryFile() as stdin, tempfile.TemporaryFile() as stdout:
            stdin.write(json.dumps(payload).encode())
            stdin.seek(0)
            process = subprocess.Popen(argv, stdin=stdin, stdout=stdout, stderr=subprocess.DEVNULL,
                                       start_new_session=True)
            try:
                while process.poll() is None:
                    self.guard()
                    time.sleep(.5)
                stdout.seek(0)
                data = stdout.read(MAX_RUNNER_RESPONSE + 1)
                if len(data) > MAX_RUNNER_RESPONSE:
                    raise ValueError("Runner response exceeds 4 MiB")
                result = json.loads(data)
                if not isinstance(result, dict):
                    raise ValueError("Runner response must be a JSON object")
                if "error" in result:
                    return result
                return result
            finally:
                if process.poll() is None:
                    os.killpg(process.pid, signal.SIGTERM)
                    try:
                        process.wait(timeout=35)
                    except subprocess.TimeoutExpired:
                        os.killpg(process.pid, signal.SIGKILL)
                        process.wait()
