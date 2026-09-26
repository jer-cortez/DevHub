#!/usr/bin/env bash
# Configure the isolated audit runner as its unprivileged runner user.
# Docker Engine and rootless mode are prerequisites; this script intentionally
# does not install or reconfigure the daemon.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENT_DIR="$REPO_DIR/agent"
RUNNER_IMAGE="devhub-audit-node:22"
INSTALL_NETWORK="devhub-audit-install"
EGRESS_NETWORK="devhub-audit-egress"
PROXY_CONTAINER="devhub-audit-proxy"
AUDIT_RUNNER_IMAGES="${AUDIT_RUNNER_IMAGES:-$RUNNER_IMAGE}"
AUDIT_SQUID_IMAGE="${AUDIT_SQUID_IMAGE:-ubuntu/squid:latest}"

if [[ "$EUID" -eq 0 ]]; then
  echo "Run this script as the dedicated, unprivileged audit runner user." >&2
  exit 1
fi

for command in docker python3 crontab; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing prerequisite: $command" >&2
    exit 1
  fi
done
if ! python3 -c 'import sys; raise SystemExit(sys.version_info < (3, 11))'; then
  echo "Python 3.11 or newer is required on the runner host." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is unavailable for this user. Start its rootless daemon first." >&2
  exit 1
fi

security_options="$(docker info --format '{{json .SecurityOptions}}')"
if [[ "$security_options" != *rootless* ]]; then
  if [[ "$(uname -s)" != "Darwin" || "${AUDIT_LOCAL_DOCKER:-0}" != "1" ]]; then
    echo "Refusing a non-rootless Docker daemon. Rootless Docker is required on the runner host." >&2
    echo "Docker Desktop may be used only for local macOS testing with AUDIT_LOCAL_DOCKER=1." >&2
    exit 1
  fi
  echo "WARNING: using Docker Desktop under the explicit local macOS exception." >&2
fi
DOCKER_BIN="$(command -v docker)"
DOCKER_CONTEXT="$(docker context show)"
DOCKER_HOST_VALUE="$(docker context inspect --format '{{.Endpoints.docker.Host}}' "$DOCKER_CONTEXT")"

echo "==> Installing the audit package into agent/.venv"
if [[ ! -x "$AGENT_DIR/.venv/bin/python" ]]; then
  python3 -m venv "$AGENT_DIR/.venv"
fi
"$AGENT_DIR/.venv/bin/python" -m pip install --upgrade pip
"$AGENT_DIR/.venv/bin/python" -m pip install --editable "$AGENT_DIR"

echo "==> Building the approved runner image"
docker build --pull --tag "$RUNNER_IMAGE" --file "$AGENT_DIR/Dockerfile.runner" "$AGENT_DIR"

ensure_network() {
  local network="$1"
  local expected_internal="$2"
  if ! docker network inspect "$network" >/dev/null 2>&1; then
    if [[ "$expected_internal" == "true" ]]; then
      docker network create --internal "$network" >/dev/null
    else
      docker network create "$network" >/dev/null
    fi
  fi
  local actual_internal
  actual_internal="$(docker network inspect --format '{{.Internal}}' "$network")"
  if [[ "$actual_internal" != "$expected_internal" ]]; then
    echo "Network $network exists with Internal=$actual_internal; expected $expected_internal." >&2
    exit 1
  fi
}

echo "==> Creating isolated install and proxy-egress networks"
ensure_network "$INSTALL_NETWORK" true
ensure_network "$EGRESS_NETWORK" false

if ! docker image inspect "$AUDIT_SQUID_IMAGE" >/dev/null 2>&1; then
  docker pull "$AUDIT_SQUID_IMAGE"
fi

# Recreating is intentional: it applies a changed Squid config or operator
# image override while keeping the resulting configuration deterministic.
docker rm -f "$PROXY_CONTAINER" >/dev/null 2>&1 || true
docker run -d \
  --name "$PROXY_CONTAINER" \
  --hostname "$PROXY_CONTAINER" \
  --restart unless-stopped \
  --network "$INSTALL_NETWORK" \
  --read-only \
  --security-opt no-new-privileges \
  --pids-limit 128 \
  --memory 512m \
  --tmpfs /run:rw,nosuid,nodev,size=16m \
  --tmpfs /var/log/squid:rw,nosuid,nodev,size=32m \
  --tmpfs /var/spool/squid:rw,nosuid,nodev,size=64m \
  --mount "type=bind,src=$SCRIPT_DIR/audit-squid.conf,dst=/etc/squid/squid.conf,readonly" \
  "$AUDIT_SQUID_IMAGE" >/dev/null
docker network connect "$EGRESS_NETWORK" "$PROXY_CONTAINER"
docker exec "$PROXY_CONTAINER" squid -k parse >/dev/null

echo "==> Installing the forced-command SSH wrapper"
mkdir -p "$HOME/.local/bin" "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
WRAPPER="$HOME/.local/bin/devhub-audit-runner-ssh"
RUNNER_BIN="$AGENT_DIR/.venv/bin/devhub-audit-runner"
{
  echo '#!/usr/bin/env bash'
  echo 'set -euo pipefail'
  echo 'if [[ "${SSH_ORIGINAL_COMMAND:-}" != "devhub-audit-runner" ]]; then'
  echo '  echo "Only devhub-audit-runner is allowed." >&2'
  echo '  exit 126'
  echo 'fi'
  printf 'export AUDIT_RUNNER_IMAGES=%q\n' "$AUDIT_RUNNER_IMAGES"
  printf 'export DOCKER_HOST=%q\n' "$DOCKER_HOST_VALUE"
  printf 'export PATH=%q:"$PATH"\n' "$(dirname "$DOCKER_BIN")"
  printf 'exec %q\n' "$RUNNER_BIN"
} > "$WRAPPER"
chmod 700 "$WRAPPER"

echo "==> Registering one-minute stale-container cleanup"
chmod 755 "$SCRIPT_DIR/audit-cleanup.py"
CRON_MARKER="# devhub-audit-cleanup"
CRON_LINE="* * * * * AUDIT_DOCKER_BIN=$DOCKER_BIN DOCKER_HOST=$DOCKER_HOST_VALUE $SCRIPT_DIR/audit-cleanup.py >/dev/null 2>&1 $CRON_MARKER"
CRON_TEMP="$(mktemp)"
trap 'rm -f "$CRON_TEMP"' EXIT
crontab -l 2>/dev/null | grep -Fv "$CRON_MARKER" > "$CRON_TEMP" || true
printf '%s\n' "$CRON_LINE" >> "$CRON_TEMP"
crontab "$CRON_TEMP"

AUTHORIZED_PREFIX="restrict,no-pty,command=\"$WRAPPER\""
if [[ -n "${AUDIT_WORKER_SOURCE:-}" ]]; then
  AUTHORIZED_PREFIX="from=\"$AUDIT_WORKER_SOURCE\",$AUTHORIZED_PREFIX"
fi

if [[ -n "${AUDIT_WORKER_PUBLIC_KEY_FILE:-}" ]]; then
  if [[ ! -f "$AUDIT_WORKER_PUBLIC_KEY_FILE" ]]; then
    echo "Public key not found: $AUDIT_WORKER_PUBLIC_KEY_FILE" >&2
    exit 1
  fi
  PUBLIC_KEY="$(<"$AUDIT_WORKER_PUBLIC_KEY_FILE")"
  AUTHORIZED_LINE="$AUTHORIZED_PREFIX $PUBLIC_KEY"
  touch "$HOME/.ssh/authorized_keys"
  chmod 600 "$HOME/.ssh/authorized_keys"
  if ! grep -Fqx "$AUTHORIZED_LINE" "$HOME/.ssh/authorized_keys"; then
    printf '%s\n' "$AUTHORIZED_LINE" >> "$HOME/.ssh/authorized_keys"
  fi
else
  AUTHORIZED_LINE="$AUTHORIZED_PREFIX <APPLICATION_HOST_PUBLIC_KEY>"
fi

cat <<EOF

Audit runner setup complete.

Install this exact line in $HOME/.ssh/authorized_keys (or rerun with
AUDIT_WORKER_PUBLIC_KEY_FILE set):

$AUTHORIZED_LINE

The runner binary used by the forced command is:
$RUNNER_BIN
EOF
