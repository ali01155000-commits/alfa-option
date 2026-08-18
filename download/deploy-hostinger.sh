#!/bin/bash
# =============================================================
# Alfa Option - Auto Deploy Script for Hostinger VPS
# Run this script from YOUR LOCAL MACHINE
# =============================================================
# 
# Usage:
#   chmod +x deploy-hostinger.sh
#   ./deploy-hostinger.sh
#
# Prerequisites: SSH access to your VPS
# =============================================================

set -e

# ============ CONFIG ============
VPS_IP="76.13.40.219"
VPS_USER="root"
VPS_PASS="Ali@0164569934"
REMOTE_DIR="/var/www/alfa-option"
APP_PORT=3000
DOMAIN=""  # Set your domain here if you have one, e.g. "alfaoption.com"

echo "================================================"
echo "  Alfa Option - Deploy to Hostinger VPS"
echo "================================================"
echo ""

# ============ STEP 1: Check SSH ============
echo "[1/7] Testing SSH connection..."
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${VPS_USER}@${VPS_IP} "echo 'SSH OK'" || {
    echo "❌ SSH connection failed!"
    echo "   Make sure you can connect: ssh ${VPS_USER}@${VPS_IP}"
    echo "   If SSH port is different, add: -p PORT_NUMBER"
    exit 1
}
echo "✅ SSH connection works!"
echo ""

# ============ STEP 2: Setup Server ============
echo "[2/7] Setting up server environment..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSETUP'
set -e

# Update system
apt-get update -y

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi
echo "PM2: $(pm2 --version)"

# Install Nginx for reverse proxy
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get install -y nginx
fi
echo "Nginx installed"

# Create project directory
mkdir -p /var/www/alfa-option

ENDSETUP
echo "✅ Server environment ready!"
echo ""

# ============ STEP 3: Build Locally ============
echo "[3/7] Building Next.js for production..."
if [ ! -d ".next" ]; then
    npm run build || bun run build
fi
echo "✅ Build ready!"
echo ""

# ============ STEP 4: Transfer Files ============
echo "[4/7] Transferring project files to VPS..."

# Create a temporary tar archive (excluding node_modules, .next cache, dev files)
tar czf /tmp/alfa-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.next/cache' \
    --exclude='dev.log' \
    --exclude='logs' \
    --exclude='.zscripts' \
    --exclude='skills' \
    --exclude='download' \
    --exclude='examples' \
    --exclude='.git' \
    . 

# Transfer via SCP
scp /tmp/alfa-deploy.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/alfa-deploy.tar.gz

# Extract on server
ssh ${VPS_USER}@${VPS_IP} << 'ENDEXTRACT'
set -e
cd /var/www/alfa-option
rm -rf src app prisma public mini-services 2>/dev/null || true
tar xzf /tmp/alfa-deploy.tar.gz
rm /tmp/alfa-deploy.tar.gz
echo "Files extracted!"
ENDEXTRACT

rm /tmp/alfa-deploy.tar.gz
echo "✅ Files transferred!"
echo ""

# ============ STEP 5: Install Dependencies ============
echo "[5/7] Installing dependencies on VPS..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDINSTALL'
set -e
cd /var/www/alfa-option

# Install main app dependencies
echo "Installing npm packages..."
npm install --production

# Install mini-services dependencies
if [ -d "mini-services/chat-service" ]; then
    cd mini-services/chat-service && npm install && cd ../..
fi
if [ -d "mini-services/trading-ws" ]; then
    cd mini-services/trading-ws && npm install && cd ../..
fi

echo "Dependencies installed!"
ENDINSTALL
echo "✅ Dependencies installed!"
echo ""

# ============ STEP 6: Start App with PM2 ============
echo "[6/7] Starting application with PM2..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDPM2'
set -e
cd /var/www/alfa-option

# Kill any existing process
pm2 delete alfa-option 2>/dev/null || true

# Start Next.js app
pm2 start npm --name "alfa-option" -- start -- -p 3000

# Start WebSocket service if exists
if [ -f "mini-services/trading-ws/index.ts" ]; then
    pm2 start "mini-services/trading-ws/node_modules/.bin/bun run dev" --name "trading-ws" 2>/dev/null || true
fi

# Save PM2 config
pm2 save
pm2 startup

echo "App started!"
pm2 list
ENDPM2
echo "✅ App running with PM2!"
echo ""

# ============ STEP 7: Configure Nginx ============
echo "[7/7] Configuring Nginx reverse proxy..."
ssh ${VPS_USER}@${VPS_IP} << ENDNGINX
set -e

# Create Nginx config
cat > /etc/nginx/sites-available/alfa-option << 'NGINXCONF'
server {
    listen 80;
    server_name _;

    # Next.js App
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket for Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # API for EO Bridge
    location /api/ {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # WebSocket for EO Bridge
    location /ws {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
NGINXCONF

# Enable site
ln -sf /etc/nginx/sites-available/alfa-option /etc/nginx/sites-enabled/alfa-option
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

echo "Nginx configured!"
ENDNGINX
echo "✅ Nginx configured!"
echo ""

# ============ DONE ============
echo "================================================"
echo "  ✅ Deployment Complete!"
echo "================================================"
echo ""
echo "  🌐 Your app is live at: http://${VPS_IP}"
if [ -n "$DOMAIN" ]; then
    echo "  🌐 Domain: http://${DOMAIN}"
fi
echo ""
echo "  Useful commands:"
echo "    ssh ${VPS_USER}@${VPS_IP}                          # Connect to server"
echo "    ssh ${VPS_USER}@${VPS_IP} 'pm2 list'               # Check app status"
echo "    ssh ${VPS_USER}@${VPS_IP} 'pm2 logs alfa-option'   # View logs"
echo "    ssh ${VPS_USER}@${VPS_IP} 'pm2 restart alfa-option' # Restart app"
echo ""
