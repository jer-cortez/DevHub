# Deploying to EC2

Everything runs on **one EC2 instance**: nginx terminates TLS on 443 and
reverse-proxies to two pm2-managed Node processes on loopback ports —
Next.js on 3000, Express on 8080 (see `deploy/nginx.conf.template`). Redis
runs on the same box via `apt`, bound to localhost. Nothing but nginx is
reachable from the internet; the security group should only ever have
22, 80, and 443 open.

This needs a hostname Let's Encrypt will issue a certificate for — an EC2
instance's auto-generated `*.amazonaws.com` DNS does **not** work for this
(AWS owns that zone and Let's Encrypt won't issue for it). If you don't have
a domain, use an [sslip.io](https://sslip.io) hostname instead — for
Elastic IP `100.49.73.135` that's `100-49-73-135.sslip.io`, which resolves
automatically with no DNS setup.

## 1. Provision the instance (one time)

SSH in, get the code, then run the provisioning script:

```bash
ssh -i your-key.pem ubuntu@100.49.73.135
git clone <your-repo-url> /srv/github-extension
cd /srv/github-extension
sudo bash deploy/setup.sh 100-49-73-135.sslip.io you@example.com
```

This installs Node 22, Redis, nginx, certbot, and pm2; secures Redis to
loopback-only; writes the nginx config from `deploy/nginx.conf.template`
with your domain substituted in; and issues the TLS certificate. It's
idempotent — safe to re-run if a step fails partway through.

Sanity-check the generated config before relying on it:
```bash
sudo nginx -t
```

## 2. Configure environment variables

```bash
cp deploy/server.env.example server/.env
cp deploy/client.env.example client/.env.local
```

Fill in `server/.env` with the same `DATABASE_URL` / `SUPABASE_*` /
`GITHUB_*` / `ANTHROPIC_*` values from your local `server/.env` — easiest
done by copying the file directly rather than retyping secrets:

```bash
# from your local machine, not the EC2 box:
scp -i your-key.pem server/.env ubuntu@100.49.73.135:/srv/github-extension/server/.env
```

Then edit both files on the box and set the domain-dependent values:
```
# server/.env
CLIENT_ORIGIN=https://100-49-73-135.sslip.io

# client/.env.local
NEXT_PUBLIC_API_URL=https://100-49-73-135.sslip.io
```

## 3. Build and start

```bash
cd server && npx prisma generate && npm run build && cd ..
cd client && npm run build && cd ..

pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup   # run the command it prints — makes both processes survive a reboot
```

Check both are up:
```bash
pm2 status    # both `api` and `web` should show `online`
pm2 logs
```

Then, **from your own machine**:
```bash
curl -I https://100-49-73-135.sslip.io/health
```
A `200` here proves TLS, nginx, and the Express server are all working
together before you touch Supabase or GitHub.

Visit `https://100-49-73-135.sslip.io` — you should see the app.

## 4. Update Supabase's redirect allow-list

The login button already builds its redirect from `window.location.origin`
(`client/src/components/Common/GitHubLoginButton.tsx`), so no code change
is needed — but Supabase will reject a redirect to an origin it doesn't
know about.

Supabase dashboard → **Authentication → URL Configuration → Redirect URLs**
→ add:
```
https://100-49-73-135.sslip.io/auth/callback
```

## 5. Point the GitHub webhook at the new server

This is the part you came here for. GitHub → your org or repo →
**Settings → Webhooks → Add webhook**:

| Field | Value |
|---|---|
| Payload URL | `https://100-49-73-135.sslip.io/api/webhooks/github` |
| Content type | `application/json` |
| Secret | the exact value of `GITHUB_WEBHOOK_SECRET` in `server/.env` |
| SSL verification | Enabled — the cert from step 1 is real, so leave this on |
| Which events | **Let me select individual events** → check **Pull requests**, **Issues**, **Issue comments**, **Pull request review comments** |

Those four map exactly to the `switch` in
`server/src/services/webhooks.services.ts`'s `handleEvent` — anything else
GitHub sends is silently ignored, so there's no benefit to checking more.

If your GitHub token's permission probe shows `403` on `repo webhooks:
read` / `org webhooks: read`, that's a token-permission issue for
*managing* webhooks via the API — it has no effect on creating one by hand
in the UI here, or on that webhook's deliveries reaching your server.

## 6. Verify end to end

**From your own machine**, using the simulator you already have — no need
to wait for a real GitHub event:

```bash
cd server
WEBHOOK_TARGET=https://100-49-73-135.sslip.io/api/webhooks/github \
  npm run webhook:simulate -- pull_request opened
```

A `200 {"received":true}` plus a listed notification confirms the deployed
server can receive, verify, and fan out a webhook exactly like it does
locally.

**From GitHub itself**: open a real PR (or comment) on the repo, then check
GitHub → Settings → Webhooks → your webhook → **Recent Deliveries**. A
green checkmark and `200` means it's live end to end; open the delivery to
see the exact payload and response if it's red.

## Redeploying later

```bash
./deploy/deploy.sh
```

Pulls, rebuilds both apps, and restarts them via pm2 with no separate steps.

---

## Notes

- **Secrets stay out of git.** `server/.env` and `client/.env.local` are
  already covered by `.gitignore` in both projects — never commit them. If
  `GITHUB_WEBHOOK_SECRET` or `ANTHROPIC_API_KEY` is ever pasted somewhere
  shared (a chat, a ticket, a screen share), rotate it.
- **Certificate renewal** is handled by certbot's own systemd timer
  (`certbot.timer`, installed automatically by the `certbot` package) — no
  cron job to maintain. `sudo certbot renew --dry-run` tests it without
  waiting for the real 90-day cycle.
- **The Elastic IP is what makes any of this durable.** A plain EC2 public
  IP changes on stop/start; if you ever see the domain stop resolving to
  the right address after a reboot, confirm the Elastic IP is still
  associated with the instance (EC2 Console → Elastic IPs).
