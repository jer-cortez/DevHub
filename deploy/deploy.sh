#!/usr/bin/env bash
# Redeploy after the first setup — pulls latest code, rebuilds, restarts both
# processes without downtime for whichever one didn't change.
# Run from the repo root on the EC2 instance.
set -euo pipefail

git pull

echo "==> Server"
(cd server && npm install && npx prisma generate && npm run build)

echo "==> Client"
(cd client && npm install && npm run build)

echo "==> Restarting"
pm2 restart deploy/ecosystem.config.js
pm2 save

echo "==> Done. pm2 status:"
pm2 status
