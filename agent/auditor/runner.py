"""Restricted runner protocol. Never exposes Docker arguments to the model."""
import json
import os
import signal
import subprocess
import sys
import time
import uuid

from .models import Profile

MAX_REQUEST = 48 * 1024 * 1024
MAX_RESPONSE = 3 * 1024 * 1024
INSTALL_NETWORK = "devhub-audit-install"


def docker(*args, payload=None, timeout=320):
    result = subprocess.run(["docker", *args], input=payload, capture_output=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors="replace")[-2000:] or
                           result.stdout.decode(errors="replace")[-2000:] or "Docker command failed")
    return result.stdout


def decode_response(data):
    if len(data) > MAX_RESPONSE:
        raise ValueError("Container response exceeds 3 MiB")
    result = json.loads(data)
    if not isinstance(result, dict):
        raise ValueError("Container response must be a JSON object")
    return result


def verify_install_network():
    internal = docker("network", "inspect", "--format", "{{.Internal}}",
                      INSTALL_NETWORK, timeout=30).decode().strip().lower()
    if internal != "true":
        raise RuntimeError("Audit install network must be internal")


def write_response(payload):
    encoded = json.dumps(payload, separators=(",", ":")).encode()
    if len(encoded) > MAX_RESPONSE:
        encoded = json.dumps({"error": "Runner response exceeds 3 MiB", "checks": [],
                              "limitations": ["Runner output was rejected by its size limit"]},
                             separators=(",", ":")).encode()
    sys.stdout.buffer.write(encoded + b"\n")


def execute(request):
    profile = Profile.model_validate(request["profile"])
    # Images are provisioned by operators. Never pull an image named by a PR/model.
    allowed = {item.strip() for item in
               os.getenv("AUDIT_RUNNER_IMAGES", "devhub-audit-node:22").split(",")
               if item.strip()}
    if profile.node_image not in allowed:
        raise ValueError("Runner image is not approved")
    operation = request["operation"]
    if operation not in ("analyze", "check"):
        raise ValueError("Unsupported runner operation")
    name = "devhub-audit-" + uuid.uuid4().hex
    network = INSTALL_NETWORK if operation == "check" else "none"
    if operation == "check":
        verify_install_network()
    try:
        docker("run", "-d", "--pull=never", "--name", name, "--label", "devhub.audit=true",
               "--label", f"devhub.created={int(time.time())}",
               "--network", network, "--read-only", "--user", "1000:1000",
               "--cap-drop=ALL", "--security-opt=no-new-privileges", "--pids-limit=128",
               "--memory=2g", "--memory-swap=2g", "--cpus=2", "--ulimit", "nofile=1024:1024",
               "--tmpfs", "/workspace:rw,exec,nosuid,nodev,size=1536m,uid=1000,gid=1000",
               "--tmpfs", "/tmp:rw,exec,nosuid,nodev,size=256m,uid=1000,gid=1000",
               "-e", "HOME=/tmp", "-e", "CI=true", "-e", "PYTHONDONTWRITEBYTECODE=1",
               "--entrypoint", "sleep", profile.node_image, "1200", timeout=30)

        def helper(data, install=False):
            env = ["-e", "HTTPS_PROXY=http://devhub-audit-proxy:3128",
                   "-e", "HTTP_PROXY=http://devhub-audit-proxy:3128",
                   "-e", "npm_config_https_proxy=http://devhub-audit-proxy:3128",
                   "-e", "npm_config_proxy=http://devhub-audit-proxy:3128"] if install else []
            return decode_response(docker("exec", "-i", *env, name, "python3", "-m", "auditor.container",
                                          payload=json.dumps(data).encode(), timeout=650))

        helper({"operation": "load", "archive": request["archive"]})
        if operation == "analyze":
            return decode_response(docker("exec", "-i", "-w", "/workspace", name,
                                          "python3", "/opt/audit/analyze.py", payload=json.dumps({
                                              "changed_files": request["changed_files"],
                                              "max_files": 100, "max_chars": 100000}).encode()))
        installed = helper({"operation": "install", "profile": profile.model_dump()}, install=True)
        # Network isolation is enforced by the host, outside the repository process.
        docker("network", "disconnect", INSTALL_NETWORK, name, timeout=30)
        if any(c["exit_code"] != 0 for c in installed["checks"]):
            return {**installed, "limitations": ["Dependency installation failed; tests not executed"]}
        checked = helper({"operation": "check", "profile": profile.model_dump()})
        return {"checks": installed["checks"] + checked["checks"], "limitations": []}
    finally:
        try:
            subprocess.run(["docker", "rm", "-f", name], capture_output=True, timeout=30)
        except (OSError, subprocess.TimeoutExpired):
            # The host's labelled-container reaper is the final cleanup backstop.
            pass


def main():
    def stop(_signal, _frame):
        raise InterruptedError("Runner interrupted")
    signal.signal(signal.SIGTERM, stop)
    # Runner's wall timer also bounds a disconnected SSH request.
    signal.signal(signal.SIGALRM, stop)
    signal.alarm(1200)
    try:
        data = sys.stdin.buffer.read(MAX_REQUEST + 1)
        if len(data) > MAX_REQUEST:
            raise ValueError("Runner request too large")
        write_response(execute(json.loads(data)))
    except Exception as exc:
        write_response({"error": str(exc)[:2000], "checks": [],
                        "limitations": ["Runner could not complete this operation"]})
        sys.exit(1)


if __name__ == "__main__":
    main()
