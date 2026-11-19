# 🚀 GenBridge Production Deployment Guide

This guide walks you through deploying **GenBridge** to the web so anyone can test and use it online.

---

## Deployment Strategy Options

| Target | Complexity | Cost | Best For |
| :--- | :--- | :--- | :--- |
| **Option 1: Render.com / Railway** | Very Low (5 mins) | Free Tier available | Rapid demo, client pitch, MVP |
| **Option 2: Linux VPS (Ubuntu + Nginx)** | Medium | \$4–\$6/mo (Hetzner, DO) | Full production, private domain & SSL |
| **Option 3: Docker & Docker Compose** | Low | Any host | Containerized enterprise staging |

---

## Option 1: 1-Click Cloud Deployment (Render.com)

Render provides free hosting for Node.js web services with automated HTTPS.

### Steps:
1. Push your GenBridge project to **GitHub** or **GitLab**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of GenBridge"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/GenBridge.git
   git push -u origin main
   ```
2. Log in to [dashboard.render.com](https://dashboard.render.com).
3. Click **New +** $\rightarrow$ **Web Service**.
4. Connect your **GenBridge** GitHub repository.
5. Configure the service settings:
   - **Name**: `genbridge-app`
   - **Environment**: `Node`
   - **Build Command**: `npm install` (or leave empty, as standard library is zero-dep)
   - **Start Command**: `node server.js`
   - **Plan**: `Free`
6. Add Environment Variables under the **Environment** tab:
   - `PORT`: `10000` (or leave default, Render sets this automatically)
   - `JWT_SECRET`: `your_random_64_char_secure_hex_key`
7. Click **Create Web Service**.
8. In 2 minutes, your web app will be live at:
   `https://genbridge-app.onrender.com`

---

## Option 2: Production VPS Deployment (Ubuntu 22.04 / 24.04 LTS)

For full ownership with a custom domain (e.g. `https://genbridge.org`), follow these steps on any VPS (DigitalOcean Droplet, Hetzner, AWS EC2, or Linode):

### 1. Connect & Update Server
```bash
ssh root@YOUR_SERVER_IP
apt update && apt upgrade -y
```

### 2. Install Node.js (v22+ or v24 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git nginx certbot python3-certbot-nginx
node -v # Should display v22.x or v24.x
```

### 3. Clone Repository
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/GenBridge.git
cd GenBridge
```

### 4. Install PM2 (Process Manager)
PM2 keeps your server running forever, restarts on system reboots, and manages logs:
```bash
npm install -g pm2
pm2 start server.js --name "genbridge"
pm2 save
pm2 startup
```

### 5. Configure Nginx Reverse Proxy
Create a new server block:
```bash
nano /etc/nginx/sites-available/genbridge
```

Paste the following configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration and restart Nginx:
```bash
ln -s /etc/nginx/sites-available/genbridge /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 6. Install Free SSL with Let's Encrypt (HTTPS)
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot will automatically reconfigure Nginx for HTTPS with HTTP-to-HTTPS redirect!

---

## Option 3: Docker & Docker Compose

Create a `Dockerfile` and `docker-compose.yml` for unified 1-command startup:

### `Dockerfile`
```dockerfile
FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY . .

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  web:
    build: .
    container_name: genbridge_web
    restart: always
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - JWT_SECRET=change_this_to_a_secret_key_in_production
    volumes:
      - ./database:/usr/src/app/database
```

Run with:
```bash
docker compose up -d
```

---

## 4. Production Checklist

- [x] **Branding Assets**: Verify `GenBridge.jpg` is served at `/assets/GenBridge.jpg`.
- [x] **Change Default Admin Password**: Go to the Admin Panel $\rightarrow$ Users $\rightarrow$ Edit Admin credentials.
- [x] **JWT Secret Key**: Set a custom `JWT_SECRET` environment variable in production.
- [x] **Database Backup**: Set up a daily cron job to backup `genbridge.sqlite` or MySQL dumps:
  ```bash
  0 2 * * * cp /var/www/GenBridge/database/genbridge.sqlite /backups/gb_$(date +\%F).sqlite
  ```
- [x] **Platform Settings**: Set your live commission percentage and banner alert from the Private Admin Panel (`/#/admin`).
