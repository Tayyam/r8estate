#!/usr/bin/env bash
set -eu
APP_ROOT=/opt/r8estate/app
DOMAIN=r8estate.duckdns.org

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx curl ca-certificates

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v 2>/dev/null || true)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

mkdir -p "$APP_ROOT"
tar xzf /tmp/r8-deploy.tgz -C "$APP_ROOT"

cd "$APP_ROOT"
cat > .env.production << EOF
VITE_API_URL=https://${DOMAIN}
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
EOF

npm ci --silent
npm run build

cd "$APP_ROOT/server"
npm ci --silent

cat > .env << 'ENVEOF'
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
PORT=8787
APP_URL=https://r8estate.duckdns.org
RESEND_API_KEY=
EMAIL_FROM=R8 Estate <onboarding@resend.dev>
ENVEOF

npm run build

cat > /etc/systemd/system/r8-estate-api.service << 'UNIT'
[Unit]
Description=R8 Estate Node API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/r8estate/app/server
EnvironmentFile=/opt/r8estate/app/server/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/nginx/sites-available/r8-estate << NGINX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${DOMAIN} _;

    root ${APP_ROOT}/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/r8-estate /etc/nginx/sites-enabled/r8-estate

nginx -t
systemctl daemon-reload
systemctl enable r8-estate-api.service
systemctl restart r8-estate-api.service || true
systemctl restart nginx.service

echo "Remote setup finished. Edit ${APP_ROOT}/server/.env then: systemctl restart r8-estate-api"
