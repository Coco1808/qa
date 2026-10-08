#!/bin/bash
set -euo pipefail

cd /opt/qa

if ! swapon --show | grep -q /swapfile; then
  if [ ! -f /swapfile ]; then
    dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile || true
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

npm config set registry https://registry.npmmirror.com

if docker compose version >/dev/null 2>&1; then
  docker compose up -d
else
  docker-compose up -d
fi

for _ in $(seq 1 30); do
  status="$(docker inspect --format '{{.State.Health.Status}}' qa-mysql 2>/dev/null || true)"
  if [ "$status" = "healthy" ]; then
    break
  fi
  sleep 2
done

npm install
npm --prefix server install
npm --prefix admin install
npm run db:init
npm --prefix server run build
npm --prefix admin run build

rm -f /etc/nginx/conf.d/default.conf
cp deploy/nginx.conf /etc/nginx/conf.d/qa.conf
if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" = "Enforcing" ]; then
  setsebool -P httpd_can_network_connect 1
  chcon -Rt httpd_sys_content_t /opt/qa/admin/dist
fi
nginx -t
systemctl reload nginx

cp deploy/qa-server.service /etc/systemd/system/qa-server.service
systemctl daemon-reload
systemctl enable qa-server
systemctl restart qa-server
