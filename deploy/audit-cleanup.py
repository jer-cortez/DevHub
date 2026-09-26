#!/usr/bin/env python3
"""Remove abandoned audit containers after the runner's 20-minute wall limit."""

import json
import os
import subprocess
import time


MAX_AGE_SECONDS = 1200
DOCKER_BIN = os.environ.get("AUDIT_DOCKER_BIN", "docker")


def docker(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [DOCKER_BIN, *args],
        check=False,
        capture_output=True,
        text=True,
        timeout=30,
    )


def main() -> int:
    listed = docker("ps", "-aq", "--filter", "label=devhub.audit=true")
    if listed.returncode:
        return listed.returncode

    now = int(time.time())
    for container_id in listed.stdout.split():
        inspected = docker("inspect", container_id)
        if inspected.returncode:
            continue
        try:
            labels = json.loads(inspected.stdout)[0]["Config"]["Labels"] or {}
            created = int(labels.get("devhub.created", "0"))
        except (KeyError, TypeError, ValueError, json.JSONDecodeError, IndexError):
            continue
        if created > 0 and now - created > MAX_AGE_SECONDS:
            docker("rm", "-f", container_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
