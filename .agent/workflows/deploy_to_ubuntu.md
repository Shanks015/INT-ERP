---
description: How to host the ERP on an Ubuntu Server (VPS)
---

This workflow guides you through deploying the MERN stack ERP to a fresh Ubuntu 20.04/22.04 server using Nginx and PM2.

## Prerequisites
- Ubuntu Server (t2.micro/nano or similar is fine)
- Root or Sudo access
- A domain name pointing to your server IP (optional but recommended)

## 1. Server Setup
Connect to your server via SSH.
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs nginx git

# Install global tools
sudo npm install -g pm2
// turbo
```

## 2. Database (MongoDB)
**Option A: MongoDB Atlas (Recommended)**
Use your existing connection string from Part 1 of `DEPLOYMENT.md`.

**Option B: Local MongoDB**
```bash
# Only if you want self-hosted DB
sudo apt install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

## 3. Clone & Setup Backend
```bash
# Clone repository
git clone https://github.com/Shanks015/INT-ERP.git
cd INT-ERP/server

# Install dependencies
npm install

# Setup Environment Variables
nano .env
# Paste the following (adjust keys as needed):
# PORT=5000
# MONGODB_URI=your_mongodb_connection_string
# JWT_SECRET=your_secret_key
# CLIENT_URL=http://your-domain-or-ip
# NODE_ENV=production
```

## 4. Setup Frontend
```bash
cd ../client

# Install dependencies
npm install

# Build usually sets NODE_ENV=production, which our code now uses to point API to /api
npm run build

# The build output is in dist/ folder
```

## 5. Start Backend with PM2
```bash
cd ../server
pm2 start src/server.js --name "erp-api"
pm2 save
pm2 startup
```

## 6. Configure Nginx
Create a new Nginx config file.
```bash
sudo nano /etc/nginx/sites-available/erp
```

Paste the configuration (replace `your_domain_or_ip`):
```nginx
server {
    listen 80;
    server_name your_domain_or_ip;

    root /home/ubuntu/INT-ERP/client/dist; # ADJUST PATH to where you cloned!
    index index.html;

    # Serve React Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API Requests to Backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## 7. SSL with Certbot (Optional)
If you have a domain name:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
```

Your ERP should now be live!