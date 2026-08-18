#!/bin/bash
# =============================================================
#  Alfa Option - Quick Deploy (Step by Step)
#  Copy-paste each command to your terminal
# =============================================================

# ---- STEP 1: Connect to your VPS ----
ssh root@76.13.40.219
# Password: Ali@0164569934

# ---- STEP 2: Install Node.js + PM2 + Nginx (run on VPS) ----
apt-get update -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs nginx
npm install -g pm2

# ---- STEP 3: Create project folder (run on VPS) ----
mkdir -p /var/www/alfa-option

# ---- STEP 4: Upload files (run on YOUR LOCAL machine) ----
# First, exit from VPS (type: exit), then run:
cd /path/to/alfa-option  # Change to your project folder
scp -r . root@76.13.40.219:/var/www/alfa-option/

# ---- STEP 5: Install deps + Build (run on VPS) ----
ssh root@76.13.40.219
cd /var/www/alfa-option
npm install
npm run build

# ---- STEP 6: Start with PM2 (run on VPS) ----
pm2 start npm --name "alfa-option" -- start
pm2 save
pm2 startup

# ---- STEP 7: Configure Nginx (run on VPS) ----
cat > /etc/nginx/sites-available/alfa-option << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /ws {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/alfa-option /etc/nginx/sites-enabled/alfa-option
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ---- DONE! Your app is live at: ----
echo "Open: http://76.13.40.219"

# ---- Useful commands (run on VPS) ----
# pm2 list              - Check app status
# pm2 logs alfa-option  - View live logs  
# pm2 restart alfa-option - Restart app
# pm2 stop alfa-option  - Stop app
