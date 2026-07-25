# VPS Production Deployment Guide - DraftBoard

Complete step-by-step guide to deploy **DraftBoard** on a Linux VPS (DigitalOcean, Linode, AWS EC2, Hetzner, Vultr, etc.) with **Node.js**, **PM2**, **Nginx** (with WebSocket support), **SSL (HTTPS)**, and **Firewall**.

---

## 📋 Prerequisites
- A Linux VPS instance (Ubuntu 22.04 LTS or Fedora/Debian/AlmaLinux).
- A domain name pointed to your VPS IP address (A-Record: `yourdomain.com` -> `YOUR_VPS_IP`).
- SSH access to your server.

---

## 🛠️ Step 1: Initial Server Setup & Dependencies

Connect to your VPS:
```bash
ssh root@YOUR_SERVER_IP
```

### Update System Packages & Install Node.js 20 LTS + Nginx

#### On Ubuntu / Debian:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx ufw certbot python3-certbot-nginx
```

#### On Fedora / RHEL / AlmaLinux:
```bash
sudo dnf update -y
sudo dnf install -y nodejs npm git nginx certbot python3-certbot-nginx
```

Verify installations:
```bash
node -v   # Should be v20.x or higher
npm -v
nginx -v
```

---

## 🚀 Step 2: PM2 Process Manager Setup

Install PM2 globally to manage Node.js background server instances:
```bash
sudo npm install -g pm2
```

---

## 📁 Step 3: Clone & Build DraftBoard

1. Navigate to web directory and clone repository:
```bash
cd /var/www
sudo git clone <YOUR_REPOSITORY_URL> draftboard
cd draftboard
```

2. Set proper directory permissions:
```bash
sudo chown -R $USER:$USER /var/www/draftboard
```

3. Install project dependencies & build frontend bundle:
```bash
npm install
npm run build
```

4. Start backend server using PM2:
```bash
pm2 start ecosystem.config.cjs --env production
```

5. Enable PM2 autostart on system reboot:
```bash
pm2 save
pm2 startup
```
*(Copy and run the command output by `pm2 startup` if prompted).*

Check running status:
```bash
pm2 status
```

---

## 🌐 Step 4: Configure Nginx Reverse Proxy with WebSockets

Nginx will serve your frontend assets, forward HTTP requests, and handle **Socket.io WebSocket upgrades**.

1. Create a new Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/draftboard
```

2. Paste the following configuration (replace `yourdomain.com` with your actual domain):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Maximum upload size for player skin assets
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        # Critical WebSocket headers for Socket.io real-time sync
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;

        # IP Forwarding
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long-lived WebSocket drafting sessions
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

3. Enable the site configuration and test Nginx syntax:
```bash
sudo ln -s /etc/nginx/sites-available/draftboard /etc/nginx/sites-enabled/
sudo nginx -t
```

4. Restart Nginx:
```bash
sudo systemctl restart nginx
```

---

## 🔒 Step 5: Enable SSL (HTTPS) with Let's Encrypt

Obtain a free SSL certificate for secure HTTPS and WebSocket (`wss://`) connectivity:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Select the option to automatically redirect HTTP traffic to HTTPS.

---

## 🛡️ Step 6: Configure Firewall (UFW)

Ensure your server ports are secure while allowing Web (HTTP/HTTPS) and SSH access:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Verify firewall status:
```bash
sudo ufw status
```

---

## ⚙️ Maintenance & Useful Commands

| Action | Command |
| :--- | :--- |
| **Check Backend Logs** | `pm2 logs draftboard-server` |
| **Restart Backend** | `pm2 restart draftboard-server` |
| **Update App Code** | `git pull && npm install && npm run build && pm2 restart draftboard-server` |
| **Check Nginx Status** | `sudo systemctl status nginx` |
| **Test Nginx Config** | `sudo nginx -t` |
