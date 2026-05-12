#!/usr/bin/env bash
set -eu
DOMAIN="r8estate.duckdns.org"
PUBLIC_URL="http://${DOMAIN}"
SUPA_DIR="/opt/supabase"
APP_DIR="/opt/r8estate/app"

export DEBIAN_FRONTEND=noninteractive

if ! swapon --show | grep -q swapfile; then
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

apt-get update -qq
apt-get install -y -qq git openssl ca-certificates curl

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

mkdir -p "$SUPA_DIR"
rm -rf /tmp/supa-clone
git clone --depth 1 https://github.com/supabase/supabase.git /tmp/supa-clone
cp -r /tmp/supa-clone/docker/. "$SUPA_DIR/"
rm -rf /tmp/supa-clone
cd "$SUPA_DIR"
cp -f .env.example .env

POOLER_TID="$(openssl rand -hex 8)"
sed -i "s|^POOLER_TENANT_ID=.*|POOLER_TENANT_ID=${POOLER_TID}|" .env
sed -i "s|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=${PUBLIC_URL}|" .env
sed -i "s|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=${PUBLIC_URL}|" .env
sed -i "s|^SITE_URL=.*|SITE_URL=${PUBLIC_URL}|" .env
sed -i "s|^KONG_HTTP_PORT=.*|KONG_HTTP_PORT=127.0.0.1:8000|" .env
sed -i "s|^ADDITIONAL_REDIRECT_URLS=.*|ADDITIONAL_REDIRECT_URLS=${PUBLIC_URL}|" .env || true

chmod +x utils/generate-keys.sh
./utils/generate-keys.sh --update-env

docker compose pull
docker compose up -d

echo "Waiting for Postgres..."
for i in $(seq 1 90); do
  if docker compose exec -T db pg_isready -U postgres -h localhost >/dev/null 2>&1; then
    echo "Postgres ready after ${i}s"
    break
  fi
  sleep 2
done

docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < /tmp/001_initial_schema.sql
docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < /tmp/002_company_gallery.sql

ANON_KEY="$(grep '^ANON_KEY=' .env | cut -d= -f2-)"
SRV_KEY="$(grep '^SERVICE_ROLE_KEY=' .env | cut -d= -f2-)"

cat > /etc/nginx/sites-available/r8-estate << NGINX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${DOMAIN} _;

    root ${APP_DIR}/dist;
    index index.html;

    location /rest/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location /auth/v1/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location /realtime/v1/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location /storage/v1/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location /graphql/v1 {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

nginx -t
systemctl reload nginx

printf '%s\n' "VITE_API_URL=${PUBLIC_URL}" "VITE_SUPABASE_URL=${PUBLIC_URL}" "VITE_SUPABASE_ANON_KEY=${ANON_KEY}" > "${APP_DIR}/.env.production"

printf '%s\n' \
  "SUPABASE_URL=http://127.0.0.1:8000" \
  "SUPABASE_SERVICE_ROLE_KEY=${SRV_KEY}" \
  "PORT=8787" \
  "APP_URL=${PUBLIC_URL}" \
  "RESEND_API_KEY=" \
  'EMAIL_FROM=R8 Estate <onboarding@resend.dev>' \
  > "${APP_DIR}/server/.env"

cd "${APP_DIR}"
npm run build
cd "${APP_DIR}/server"
npm run build
systemctl restart r8-estate-api.service || true

echo "DONE. Supabase status:"
cd "$SUPA_DIR" && docker compose ps
