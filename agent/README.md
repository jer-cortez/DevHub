# DevHub auditor

The auditor is a separately enabled worker for TypeScript and JavaScript pull
requests. The application host claims durable jobs from Postgres, reads source
through a GitHub App, and calls the model. Untrusted repository code runs on a
separate EC2 runner through a forced SSH command. The runner uses rootless
Docker and allows dependency traffic only to `registry.npmjs.org` through a
restricted Squid proxy.

The runner is intentionally separate from the API/worker host. Do not add the
application worker user to the Docker group and do not expose a Docker socket
to it.

## Database and API gate

Apply the idempotent audit migration from the application host, then confirm
the migration ledger is clean:

```bash
cd /srv/github-extension/server
npx prisma db execute --file prisma/sql/006_agent_audits.sql
npm run migrate:status
```

The migration creates `audit_control` with `enabled=false` and
`publish_enabled=false`. `AUDIT_ENABLED` also defaults to false. Leave all
three gates off while installing and testing. `enabled` allows jobs to be
created and claimed; `publish_enabled` separately permits completed findings
to be posted as GitHub reviews.

The worker removes stored check logs, analysis details, messages, and candidate
patches after 14 days, then deletes audit runs after 90 days. Feedback rows are
removed with their run.

The API host needs these additional values in `server/.env`:

```dotenv
AUDIT_ENABLED=false
AUDIT_PROFILES_PATH=/srv/github-extension/agent/profiles.json
AUDIT_GITHUB_APP_ID=
AUDIT_GITHUB_INSTALLATION_ID=
AUDIT_GITHUB_PRIVATE_KEY_PATH=/etc/devhub/audit-github-app.pem
AUDIT_GITHUB_WEBHOOK_SECRET=
```

The GitHub App needs repository contents read access and pull request read and
write access. Configure its pull request webhook to call
`/api/audit-webhooks/github`, using `AUDIT_GITHUB_WEBHOOK_SECRET`. The API and
worker use the same App ID, installation ID, and private key identity; the
webhook secret is needed only by the API.

Copy `profiles.example.json` to the ignored `profiles.json`, add only reviewed
commands, and keep each repository disabled until its offline checks pass.

## Model provider

The auditor defaults to the OpenAI Responses API with
`AGENT_PROVIDER=openai`, `AGENT_MODEL=gpt-5.6-sol`, and
`AGENT_REASONING_EFFORT=low`. Set `OPENAI_API_KEY` for that provider. Anthropic
remains an optional auditor provider only when explicitly selected with
`AGENT_PROVIDER=anthropic`; it then uses `ANTHROPIC_API_KEY` and an Anthropic
model name.

For local development, the worker loads `agent/.env` and then falls back to
`server/.env`, without overriding variables already supplied by the process.
This means a locally stored `OPENAI_API_KEY` in `server/.env` is supported.
Production uses the worker's root-owned `/etc/devhub/auditor.env`; do not rely
on the server dotenv fallback there. The Express server's existing Claude
summaries are separate and still require a valid `ANTHROPIC_API_KEY`.

LangGraph runs locally with the Postgres checkpointer and needs no account.
For details on the OpenAI mechanisms used by the adapter, see the official
[function calling guide](https://platform.openai.com/docs/guides/function-calling)
and [token counting guide](https://platform.openai.com/docs/guides/token-counting).

## Isolated runner EC2 host

Both the application worker and runner require Python 3.11 or newer. The
runner also needs Docker, an SSH server, and cron. Node and npm for reviewed
code are installed inside the runner image.

Create a small private EC2 instance reachable on SSH only from the application
host. As an administrator, create a dedicated unprivileged user such as
`audit-runner`, then install Docker Engine in rootless mode for that user by
following Docker's official rootless guide. Rootless prerequisites and daemon
installation are deliberately manual; `deploy/audit-runner-setup.sh` never
uses `apt`, installs Docker, or modifies a system daemon. Enable user lingering
if the rootless daemon must survive logout.

Verify the daemon while logged in as the runner user:

```bash
docker info --format '{{json .SecurityOptions}}'
docker context show
```

The security options must include `rootless`, and only the runner user should
control that daemon. Clone the deployment at its final absolute path, then run:

```bash
cd /srv/github-extension
AUDIT_SQUID_IMAGE='ubuntu/squid@sha256:<reviewed-digest>' \
  bash deploy/audit-runner-setup.sh
```

The example defaults to `ubuntu/squid:latest`; that tag is mutable. Production
operators should inspect and choose a digest, then preserve the digest in their
host configuration. The setup script builds `agent/Dockerfile.runner` as
`devhub-audit-node:22`, installs the editable package in `agent/.venv`, creates
the internal `devhub-audit-install` network and separate
`devhub-audit-egress` network, and connects only the Squid proxy to both. Audit
containers lose the install network before tests run. A runner-user cron entry
removes labeled containers older than 1,200 seconds every minute.

## Restricted SSH path

On the application host, create an SSH key owned by the worker service user.
Record the runner host key in that user's `~/.ssh/known_hosts` only after
verifying its fingerprint through the EC2 console or another trusted channel.
The transport uses `BatchMode=yes` and `StrictHostKeyChecking=yes`; it will not
accept a new or changed key interactively.

Run runner setup with the application public key and, preferably, the
application host's private address:

```bash
AUDIT_WORKER_PUBLIC_KEY_FILE=/tmp/devhub-auditor.pub \
AUDIT_WORKER_SOURCE=10.0.1.25 \
AUDIT_SQUID_IMAGE='ubuntu/squid@sha256:<reviewed-digest>' \
  bash deploy/audit-runner-setup.sh
```

The resulting `authorized_keys` entry uses `restrict,no-pty` and a forced
wrapper at an absolute path. The wrapper accepts only the literal original
command `devhub-audit-runner` and executes the deployment's absolute
`agent/.venv/bin/devhub-audit-runner`. Do not replace it with a shell or add
unrestricted keys for the worker.

From the application worker account, verify the forced command before enabling
audits:

```bash
ssh audit-runner@10.0.2.25 devhub-audit-runner </dev/null
```

An empty request should fail as JSON rather than open a shell. Any other SSH
command should be rejected by the wrapper.

## Application worker service

On the application host, create the restricted `devhub-auditor` system user.
It needs read access to the deployment and GitHub App PEM, its SSH private key
and verified `known_hosts`, and no Docker privileges. Install the package and
service files:

```bash
sudo useradd --system --create-home --home-dir /var/lib/devhub-auditor \
  --shell /usr/sbin/nologin devhub-auditor
sudo install -d -o devhub-auditor -g devhub-auditor -m 0700 \
  /var/lib/devhub-auditor/.ssh
sudo -u devhub-auditor ssh-keygen -t ed25519 -N '' \
  -f /var/lib/devhub-auditor/.ssh/id_ed25519
# Verify the runner's host-key fingerprint through a trusted channel before
# adding that key to /var/lib/devhub-auditor/.ssh/known_hosts.

cd /srv/github-extension
python3 -m venv agent/.venv
agent/.venv/bin/pip install --editable agent
sudo install -d -o root -g root -m 0755 /etc/devhub
sudo install -o root -g root -m 0600 deploy/audit-worker.env.example /etc/devhub/auditor.env
sudo install -o root -g root -m 0644 deploy/audit-worker.service /etc/systemd/system/devhub-auditor.service
sudo systemctl daemon-reload
```

Fill `/etc/devhub/auditor.env` and run setup and checks from the same
environment and service account. `--setup` prepares the LangGraph Postgres
checkpointer. `--check` validates only the database, GitHub App API, and
configured model without claiming normal work. Because the environment file
is deliberately root-owned mode `0600`, use transient systemd units to apply
it without exposing its secrets to the service user's shell:

```bash
sudo systemd-run --wait --pipe --collect \
  -p User=devhub-auditor \
  -p EnvironmentFile=/etc/devhub/auditor.env \
  -p WorkingDirectory=/srv/github-extension/agent \
  -- /srv/github-extension/agent/.venv/bin/devhub-auditor --setup
sudo systemd-run --wait --pipe --collect \
  -p User=devhub-auditor \
  -p EnvironmentFile=/etc/devhub/auditor.env \
  -p WorkingDirectory=/srv/github-extension/agent \
  -- /srv/github-extension/agent/.venv/bin/devhub-auditor --check
```

Exercise the real forced-command SSH and remote Docker boundary separately.
The smoke test uses synthetic source and no database, GitHub, or model keys:

```bash
sudo systemd-run --wait --pipe --collect \
  -p User=devhub-auditor \
  -p WorkingDirectory=/srv/github-extension/agent \
  -- /srv/github-extension/agent/.venv/bin/python -m auditor.smoke \
     --host audit-runner@10.0.2.25
```

LangGraph itself uses the configured Postgres checkpointer and requires no
account. LangSmith tracing is a separate, optional service; it is disabled in
the environment example and no LangSmith account is required.

After the checks pass, start the normal worker with no CLI arguments:

```bash
sudo systemctl enable --now devhub-auditor
sudo systemctl status devhub-auditor
sudo journalctl -u devhub-auditor -f
```

## Local Docker smoke test

Linux development should use the same rootless Docker setup and the same
runner script. Docker Desktop on macOS is the only non-rootless exception, and
it is for local development only:

```bash
cd /absolute/path/to/Github-Extension
AUDIT_LOCAL_DOCKER=1 bash deploy/audit-runner-setup.sh
cp agent/.env.example agent/.env
# Keep AUDIT_RUNNER_HOST empty so the worker uses the local runner.
set -a; source agent/.env; set +a
agent/.venv/bin/devhub-auditor --setup
agent/.venv/bin/devhub-auditor --check
agent/.venv/bin/python -m auditor.smoke
```

Run fixture tests before turning on either gate:

```bash
agent/.venv/bin/pip install --editable 'agent[test]'
agent/.venv/bin/pytest agent/tests
```

Only after offline fixtures, setup, and connectivity checks pass should a
database administrator enable job creation:

```sql
update public.audit_control set enabled = true where id = true;
```

Then set `AUDIT_ENABLED=true` on both the API and worker and restart them.
Leave `publish_enabled=false` until completed audit output has been reviewed
offline. Publishing requires a separate manual database change by an admin:

```sql
update public.audit_control set publish_enabled = true where id = true;
```

Deployment is an operator action. These repository files document and prepare
the deployment; they do not execute it.

## Evaluation and configuration changes

LangGraph source-bearing checkpoints live in the private `audit_private`
database schema, outside Supabase's public API schema. The `--setup` command
creates these tables after migration 006. Orphaned threads are also removed.

For repeatable installs, add `-c agent/constraints.txt` to the pip command.
To score saved synthetic fixture reviews offline:

    agent/.venv/bin/devhub-audit-evaluate agent/evaluation-results.json

To generate those reviews with the default OpenAI provider:

    agent/.venv/bin/devhub-audit-evaluate agent/evaluation-results.json \
      --generate --model gpt-5.6-sol

Generation sends 20 synthetic requests with a 2,000-output-token limit per
request. To compare Anthropic explicitly, add `--provider anthropic`, choose an
Anthropic model, and set `ANTHROPIC_API_KEY`. The initial release gate requires
eight of ten seeded defects, no high/critical findings on clean snippets, and
valid evidence for every published finding. This component benchmark
supplements the full workflow tests and dashboard-only pilot; it does not
establish real-world detection accuracy.

Changing model, analyzer, or test configuration should increment each
affected profile's `version`. Equivalent revision/configuration runs are
deduplicated, including failed or dashboard-only completed runs. A version
bump permits a new run after configuration corrections or enabling publishing.

A candidate passing previously failing checks is marked as check-validated;
the finding remains statically supported until there is a finding-specific
reproducer. The model cannot promote its own verification status.

If a review POST has an ambiguous response, the worker searches for its
unique marker under its own GitHub App bot identity. If it cannot establish
the outcome, it preserves `publication_state=uncertain` and stops rather than
blindly reposting. An operator should inspect GitHub before resetting a
failed run's publication state and status for retry.
