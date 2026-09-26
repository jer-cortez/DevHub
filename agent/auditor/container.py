"""Trusted container helper; never invoked on the application host."""
import base64
import json
import os
import re
import signal
import subprocess
import sys
import time
from pathlib import Path, PurePosixPath
from urllib.parse import urlparse

from auditor.archive import unpack
from auditor.models import Profile, safe_path

MAX_LOCKFILE = 8 * 1024 * 1024
MAX_PACKAGES = 100_000
MAX_RESPONSE = 3 * 1024 * 1024
OPERATION_TIMEOUT = 600


def command(argv, cwd, timeout=300):
    # Spool to bounded chunks instead of retaining an unbounded pipe buffer.
    import selectors
    started = time.monotonic()
    process = subprocess.Popen(argv, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                               start_new_session=True, env={**os.environ, "CI": "true", "HOME": "/tmp"})
    output = bytearray()
    limited = False
    timed_out = False
    sel = selectors.DefaultSelector()
    sel.register(process.stdout, selectors.EVENT_READ)
    try:
        while sel.get_map():
            if time.monotonic() - started > timeout:
                timed_out = True
                os.killpg(process.pid, signal.SIGKILL)
                break
            for key, _ in sel.select(.2):
                chunk = os.read(key.fileobj.fileno(), 8192)
                if not chunk:
                    sel.unregister(key.fileobj)
                    continue
                remaining = 32000 - len(output)
                output.extend(chunk[:max(remaining, 0)])
                if len(chunk) > remaining:
                    limited = True
        process.wait(timeout=2)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait()
    finally:
        # Kill background children left by a completed test command.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        sel.close()
    text = output.decode("utf-8", errors="replace")
    text = re.sub(r"\x1b\[[0-9;]*[A-Za-z]", "", text)
    return {"exit_code": process.returncode, "output": text, "timed_out": timed_out,
            "output_truncated": limited, "seconds": round(time.monotonic() - started, 2)}


def validate_dependencies(project: Path, workspace: Path = Path("/workspace")):
    lock_path = project / "package-lock.json"
    if not lock_path.is_file():
        raise ValueError("A committed package-lock.json is required")
    with lock_path.open("rb") as source:
        raw = source.read(MAX_LOCKFILE + 1)
    if len(raw) > MAX_LOCKFILE:
        raise ValueError("package-lock.json exceeds 8 MiB")
    lock = json.loads(raw)
    if not isinstance(lock, dict):
        raise ValueError("package-lock.json must contain an object")
    if lock.get("lockfileVersion", 0) < 2:
        raise ValueError("npm lockfile version 2 or 3 is required")
    packages = lock.get("packages")
    if not isinstance(packages, dict) or len(packages) > MAX_PACKAGES:
        raise ValueError("package-lock.json packages must be an object with at most 100,000 entries")
    workspace = workspace.resolve(strict=True)
    for name, entry in packages.items():
        if not isinstance(name, str) or not isinstance(entry, dict):
            raise ValueError("Invalid package-lock.json package entry")
        if name:
            package_path = PurePosixPath(name)
            if (len(name) > 1000 or package_path.is_absolute() or ".." in package_path.parts or
                    "\\" in name or "\x00" in name or ":" in name or
                    package_path.as_posix() != name or ".git" in package_path.parts):
                raise ValueError("Invalid package location in package-lock.json")
            package_location = (project / name).resolve()
            if not package_location.is_relative_to(workspace):
                raise ValueError("Package locations must remain inside /workspace")
        resolved = entry.get("resolved", "")
        if entry.get("link"):
            if not name:
                raise ValueError("Root package entry cannot be a link")
            safe_path(resolved)
            target = (project / resolved).resolve(strict=True)
            if not target.is_dir() or not target.is_relative_to(workspace):
                raise ValueError("Local npm links must resolve to a directory inside /workspace")
        elif name:
            if not isinstance(resolved, str):
                raise ValueError("Invalid package resolution")
            parsed = urlparse(resolved)
            integrity = entry.get("integrity")
            try:
                valid_port = parsed.port in (None, 443)
            except ValueError:
                valid_port = False
            valid_integrity = isinstance(integrity, str) and bool(
                re.fullmatch(r"sha512-[A-Za-z0-9+/]+={0,2}", integrity)
            )
            if (parsed.scheme != "https" or parsed.hostname != "registry.npmjs.org" or
                    parsed.username is not None or parsed.password is not None or
                    not valid_port or parsed.query or parsed.fragment or not valid_integrity):
                raise ValueError("Only SHA-512-pinned public npm registry packages are supported")


def remove_npm_configuration(root: Path):
    # Called immediately after extraction, before node_modules can exist.
    for npmrc in root.rglob(".npmrc"):
        if npmrc.is_file():
            npmrc.unlink()


def emit(payload):
    encoded = json.dumps(payload, separators=(",", ":"))
    if len(encoded.encode()) + 1 > MAX_RESPONSE and isinstance(payload.get("omitted"), list):
        payload["omitted"] = payload["omitted"][:1000]
        payload["omitted_truncated"] = True
        encoded = json.dumps(payload, separators=(",", ":"))
    if len(encoded.encode()) + 1 > MAX_RESPONSE:
        for check in reversed(payload.get("checks", [])):
            if check.get("output"):
                check["output"] = ""
                check["output_truncated"] = True
                encoded = json.dumps(payload, separators=(",", ":"))
                if len(encoded.encode()) + 1 <= MAX_RESPONSE:
                    break
    if len(encoded.encode()) + 1 > MAX_RESPONSE:
        raise ValueError("Container response exceeds 3 MiB")
    print(encoded)


def main():
    request = json.load(sys.stdin)
    op = request["operation"]
    root = Path("/workspace")
    if op == "load":
        omitted = unpack(base64.b64decode(request["archive"], validate=True), root)
        remove_npm_configuration(root)
        emit({"omitted": omitted})
        return
    profile = Profile.model_validate(request["profile"])
    results = []
    deadline = time.monotonic() + OPERATION_TIMEOUT
    for project in profile.projects:
        directory = root / project.directory
        if not directory.is_dir() or not directory.resolve().is_relative_to(root):
            raise ValueError("Invalid project directory")
        if op == "install":
            validate_dependencies(directory, root)
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError("Container operation exceeded 600 seconds")
            result = command(["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund",
                              "--registry=https://registry.npmjs.org", "--userconfig=/dev/null",
                              "--globalconfig=/opt/audit/empty-global.npmrc", "--cache=/tmp/npm-cache"], directory,
                             timeout=min(300, remaining))
            results.append({"name": f"{project.directory}:install", **result})
            if result["exit_code"] != 0:
                break
        elif op == "check":
            for check in [*project.rebuild, *project.checks]:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError("Container operation exceeded 600 seconds")
                result = command(check.argv, directory, timeout=min(300, remaining))
                results.append({"name": f"{project.directory}:{check.name}", **result})
                if check in project.rebuild and result["exit_code"] != 0:
                    break
        else:
            raise ValueError("Unsupported container operation")
    emit({"checks": results})


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        emit({"error": str(exc)[:1000], "checks": []})
        sys.exit(1)
