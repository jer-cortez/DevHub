#!/usr/bin/env bash
#
# One-time provisioning for a fresh Ubuntu EC2 instance.
#
#   sudo bash deploy/setup.sh yourdomain.com you@example.com
#
# Installs Node, Redis, nginx, certbot and pm2, issues a TLS certificate,
# and lays out the directories the app expects. It does NOT deploy the code —
# that's deploy/deploy.sh, which is safe to re-run on every release.
#
# Idempotent: re-running skips anything already present.

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
APP_DIR=/srv/github-extension
LOG_DIR=/var/log/github-extension

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "usage: sudo bash deploy/setup.sh <domain> <email>" >&2
  echo "  e.g. sudo bash deploy/setup.sh 54-12-34-56.sslip.io you@example.com" >&2
  exit 1
fi

if [[ "$DOMAIN" == *.amazonaws.com ]]; then
  echo "ERROR: Let's Encrypt will not issue certificates for amazonaws.com." >&2
  echo "Use an sslip.io hostname (e.g. 54-12-34-56.sslip.io) or your own domain." >&2
  exit 1
fi

echo "==> Installing system packages"
apt-get update -qq
apt-get install -y -qq curl git nginx redis-server gettext-base

# Node 22 to match the runtime the app was built against. NodeSource rather
# than Ubuntu's archive, which lags several major versions behind.
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  echo "==> Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi

if ! command -v pm2 >/dev/null; then
  echo "==> Installing pm2"
  npm install -g pm2
fi

echo "==> Securing Redis"
# Bound to loopback and with protected-mode on, Redis is unreachable from the
# internet even if the security group is later opened by mistake. This is the
# single most common way a demo box gets compromised.
sed -i 's/^bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
sed -i 's/^protected-mode .*/protected-mode yes/' /etc/redis/redis.conf
systemctl enable redis-server
systemctl restart redis-server

echo "==> Creating directories"
mkdir -p "$APP_DIR" "$LOG_DIR" /var/www/certbot
# The deploying user owns the app dir so releases don't need sudo.
chown -R "${SUDO_USER:-ubuntu}:${SUDO_USER:-ubuntu}" "$APP_DIR" "$LOG_DIR"

echo "==> Configuring nginx for $DOMAIN"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DOMAIN
envsubst '${DOMAIN}' \
  < "$SCRIPT_DIR/nginx.conf.template" \
  > /etc/nginx/sites-available/github-extension
ln -sf /etc/nginx/sites-available/github-extension /etc/nginx/sites-enabled/github-extension
rm -f /etc/nginx/sites-enabled/default

if [[ ! -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
  echo "==> Issuing TLS certificate"
  apt-get install -y -qq certbot python3-certbot-nginx
  # The generated config references certificate paths that don't exist yet,
  # so nginx can't start to serve the HTTP-01 challenge. Stop it and let
  # certbot bind port 80 itself for the one-off issuance.
  systemctl stop nginx || true
  certbot certonly --standalone \
    -d "$DOMAIN" \
    --non-interactive --agree-tos -m "$EMAIL"
  # Renewals happen while nginx is running, so they use the webroot instead.
  certbot renew --dry-run --webroot -w /var/www/certbot >/dev/null 2>&1 || true
fi

echo "==> Starting nginx"
nginx -t
systemctl enable nginx
systemctl restart nginx

cat <<EOF

Provisioning complete for https://$DOMAIN

Next:
  1. Put the env files in place (see deploy/README.md):
       $APP_DIR/server/.env
       $APP_DIR/client/.env.local
  2. Deploy the code:
       bash deploy/deploy.sh
  3. Point the GitHub webhook at:
       https://$DOMAIN/api/webhooks

EOF
