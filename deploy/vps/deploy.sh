#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/Tik-Tools-Deploy-1"
REPO_URL="https://github.com/wztyr5thcf-del/Tik-Tools-Deploy-1.git"

if [ ! -d "$APP_DIR" ]; then
  sudo mkdir -p /var/www
  sudo git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
sudo git pull origin main
pnpm install --frozen-lockfile
pnpm --filter @workspace/creatools run build
pnpm --filter @workspace/api-server run build

cd "$APP_DIR/artifacts/api-server"
pm2 restart creatools-api || pm2 start "pnpm run start" --name creatools-api
sudo systemctl reload nginx
