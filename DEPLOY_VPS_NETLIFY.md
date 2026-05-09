# Deployment Guide (VPS + Netlify)

This guide makes your admin updates shared for all visitors.

## 1) Deploy backend on VPS

Assumptions:
- Ubuntu VPS
- Domain/subdomain for API (example: `api.example.com`)
- Project path on VPS: `/var/www/swetty`

### A. Install runtime
```bash
sudo apt update
sudo apt install -y nginx git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

### B. Upload project
```bash
sudo mkdir -p /var/www/swetty
sudo chown -R $USER:$USER /var/www/swetty
cd /var/www/swetty
# Option 1: git clone your repo
# git clone <YOUR_REPO_URL> .
```

### C. Configure backend env
Create `server/.env`:
```env
PORT=8787
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID=YOUR_TWILIO_VERIFY_SERVICE_SID
```

### D. Install and run backend
```bash
cd /var/www/swetty/server
npm install
```

Edit `ecosystem.config.cjs` and confirm:
- `cwd` is `/var/www/swetty/server`

Then run:
```bash
cd /var/www/swetty/server
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### E. Nginx reverse proxy
Create file:
`/etc/nginx/sites-available/swetty-api`

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/swetty-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### F. HTTPS (recommended)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
```

Now your API should be live on:
- `https://api.example.com/health`
- `https://api.example.com/api/inventory`

## 2) Deploy frontend on Netlify

1. Push your project to GitHub.
2. In Netlify: **Add new site** -> **Import from Git**.
3. Build settings:
   - Build command: *(leave empty for static site)*  
   - Publish directory: `.`
4. Deploy.

## 3) Connect frontend to your VPS API

In `index.html`, set:
```html
<script>
  window.SWETTY_API_BASE = "https://api.example.com";
</script>
```

Then redeploy Netlify.

## 4) Verify shared behavior

1. Open site from two devices/browsers.
2. Add a sweet from admin panel in browser A.
3. Wait up to ~20 seconds (auto-sync) in browser B.
4. Confirm new item appears for everyone.

## 5) Operations

Useful commands on VPS:
```bash
pm2 status
pm2 logs swetty-backend
pm2 restart swetty-backend
```
