# VPS deployment guide

## 1) Server requirements
- Ubuntu 22.04/24.04
- Node.js 24
- pnpm
- nginx
- pm2
- PostgreSQL (optional, only if you want to use the DB-backed features)

## 2) Install dependencies
```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -bash
sudo apt update
sudo apt install -y nodejs nginx git postgresql-client
corepack enable
corepack prepare pnpm@latest --activate
sudo npm install -g pm2
```

## 3) Clone and install
```bash
cd /var/www
sudo git clone https://github.com/wztyr5thcf-del/Tik-Tools-Deploy-1.git
cd Tik-Tools-Deploy-1
pnpm install
```

## 4) Build
```bash
pnpm --filter @workspace/creatools run build
pnpm --filter @workspace/api-server run build
```

## 5) Environment variables
Create a `.env` file for the API server:
```bash
cat > /var/www/Tik-Tools-Deploy-1/artifacts/api-server/.env <<'EOF'
NODE_ENV=production
PORT=8080
JWT_SECRET=troque-esta-chave
APP_URL=https://app.seu-dominio.com
FRONTEND_URL=https://app.seu-dominio.com
TIKTOOLS_API_KEY=sua-chave
DATABASE_URL=postgresql://user:pass@host:5432/dbname
EOF
```

## 6) Start the API with PM2
```bash
cd /var/www/Tik-Tools-Deploy-1/artifacts/api-server
pm2 start "pnpm run start" --name creatools-api
pm2 save
pm2 startup
```

## 7) Nginx config
Create `/etc/nginx/sites-available/creatools`:
```nginx
server {
  listen 80;
  server_name app.seu-dominio.com;

  location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    root /var/www/Tik-Tools-Deploy-1/artifacts/creatools/dist/public;
    try_files $uri $uri/ /index.html;
  }
}
```

Then:
```bash
sudo ln -s /etc/nginx/sites-available/creatools /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 8) SSL
Use Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.seu-dominio.com
```
