#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/dinefor}"
cd "$APP_DIR/server"
npm ci --omit=dev
node --check server.js
pm2 restart dinefor-api --update-env
pm2 save
cd "$APP_DIR/client"
npm ci
npm run build
nginx -t
systemctl reload nginx
echo "Bundle 22 deployment complete. Purge Cloudflare cache and run QA."
