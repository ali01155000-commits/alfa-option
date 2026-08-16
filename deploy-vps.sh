#!/bin/bash
# ============================================================
# Alfa Expert - VPS Deployment Script
# يشتغل على Ubuntu 22.04+ / Debian 12+
# ============================================================
set -e

echo "🚀 Alfa Expert - VPS Deployment"
echo "================================"

# ---- Configuration ----
APP_DIR="/home/z/my-project"
NODE_VERSION="24"
PYTHON_VERSION="3.12"

# ---- Step 1: Install System Dependencies ----
echo ""
echo "📦 Step 1: Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
  curl wget git unzip build-essential \
  libssl-dev libffi-dev python3-dev \
  python3-venv python3-pip \
  ca-certificates gnupg

# ---- Step 2: Install Bun ----
if ! command -v bun &> /dev/null; then
  echo "📦 Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
else
  echo "✅ Bun already installed: $(bun --version)"
fi

# ---- Step 3: Install Node.js (for PM2) ----
if ! command -v node &> /dev/null; then
  echo "📦 Installing Node.js $NODE_VERSION..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
else
  echo "✅ Node.js already installed: $(node --version)"
fi

# ---- Step 4: Install PM2 ----
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2..."
  sudo npm install -g pm2
else
  echo "✅ PM2 already installed: $(pm2 --version)"
fi

# ---- Step 5: Install Python Dependencies ----
echo "📦 Installing Python dependencies..."
cd "$APP_DIR/mini-services/eo-bridge"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q fastapi uvicorn ExpertOptionAPI playwright aiohttp numpy 2>/dev/null || true
python -m playwright install chromium 2>/dev/null || echo "⚠️ Playwright chromium install skipped (may need sudo)"
deactivate

# ---- Step 6: Build Next.js ----
echo "🏗️ Building Next.js production bundle..."
cd "$APP_DIR"
bun install
bun run build

# ---- Step 7: Install PM2 Startup ----
echo "⚙️ Setting up PM2 auto-startup..."
pm2 startup systemd -u z --hp /home/z 2>/dev/null || true

# ---- Step 8: Start All Services ----
echo "🚀 Starting all services with PM2..."
cd "$APP_DIR"
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js

# ---- Step 9: Save PM2 Config ----
pm2 save

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📊 Service Status:"
pm2 list
echo ""
echo "🌐 Your app is running on:"
echo "   → http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'YOUR_VPS_IP'):81"
echo ""
echo "📋 Useful Commands:"
echo "   pm2 status          - Check service status"
echo "   pm2 logs            - View all logs"
echo "   pm2 logs eo-bridge  - View bridge logs"
echo "   pm2 restart all     - Restart all services"
echo "   pm2 stop all        - Stop all services"
echo ""
