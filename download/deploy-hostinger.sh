#!/bin/bash
# ============================================================
# ALFA Expert Option - Deployment Script for Hostinger VPS
# ============================================================
# Run this script from your local machine:
#   chmod +x deploy-hostinger.sh
#   ./deploy-hostinger.sh
# ============================================================

set -e

# Configuration
SSH_HOST="76.13.40.219"
SSH_USER="root"
SSH_PASS="Ali@0164569934"
REPO_URL="https://github.com/ali452158/alfa-expert-option.git"
APP_DIR="/root/alfa-expert-option"
NODE_VERSION="20"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_ok() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_err() {
    echo -e "${RED}✗ $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# SSH command helper
ssh_cmd() {
    ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SSH_USER@$SSH_HOST" "$1"
}

# ============================================================
print_step "STEP 1: Testing SSH Connection"
# ============================================================
echo "Connecting to $SSH_USER@$SSH_HOST ..."
if ssh_cmd "echo 'SSH OK'" 2>/dev/null | grep -q "SSH OK"; then
    print_ok "SSH connection successful!"
else
    print_err "Cannot connect via SSH. Check your credentials and network."
    echo ""
    echo "Try manually: ssh $SSH_USER@$SSH_HOST"
    echo "Password: $SSH_PASS"
    exit 1
fi

# ============================================================
print_step "STEP 2: Checking Server Environment"
# ============================================================
ssh_cmd "
    echo '--- OS Info ---'
    cat /etc/os-release | head -3
    echo '--- Hardware ---'
    nproc
    free -h | head -2
    df -h / | tail -1
    echo '--- Installed Software ---'
    node --version 2>/dev/null || echo 'Node.js: NOT INSTALLED'
    npm --version 2>/dev/null || echo 'npm: NOT INSTALLED'
    bun --version 2>/dev/null || echo 'Bun: NOT INSTALLED'
    git --version 2>/dev/null || echo 'Git: NOT INSTALLED'
    pm2 --version 2>/dev/null || echo 'PM2: NOT INSTALLED'
    python3 --version 2>/dev/null || echo 'Python3: NOT INSTALLED'
    pip3 --version 2>/dev/null || echo 'pip3: NOT INSTALLED'
    caddy version 2>/dev/null || echo 'Caddy: NOT INSTALLED'
"

# ============================================================
print_step "STEP 3: Installing Required Software"
# ============================================================
ssh_cmd "
    # Install Node.js if not present
    if ! command -v node &>/dev/null; then
        echo 'Installing Node.js ${NODE_VERSION}.x...'
        curl -fsSL https://deb.nodesource.com/setup_\${NODE_VERSION}.x | bash -
        apt-get install -y nodejs
        echo 'Node.js installed:' && node --version
    else
        echo 'Node.js already installed:' && node --version
    fi

    # Install PM2 if not present
    if ! command -v pm2 &>/dev/null; then
        echo 'Installing PM2...'
        npm install -g pm2
        echo 'PM2 installed:' && pm2 --version
    else
        echo 'PM2 already installed:' && pm2 --version
    fi

    # Install Git if not present
    if ! command -v git &>/dev/null; then
        echo 'Installing Git...'
        apt-get update && apt-get install -y git
    else
        echo 'Git already installed:' && git --version
    fi

    # Install Python3 and pip if not present (for EO Bridge)
    if ! command -v python3 &>/dev/null; then
        echo 'Installing Python3...'
        apt-get install -y python3 python3-pip
    fi
"

# ============================================================
print_step "STEP 4: Deploying Code from GitHub"
# ============================================================
ssh_cmd "
    if [ -d '$APP_DIR' ]; then
        echo 'App directory exists. Pulling latest changes...'
        cd $APP_DIR
        git fetch --all
        git reset --hard origin/main
        echo 'Code updated!'
    else
        echo 'Cloning repository from GitHub...'
        git clone $REPO_URL $APP_DIR
        echo 'Code cloned!'
    fi
"

# ============================================================
print_step "STEP 5: Installing Dependencies"
# ============================================================
ssh_cmd "
    cd $APP_DIR
    echo 'Installing npm dependencies...'
    npm install
    echo 'Dependencies installed!'
"

# ============================================================
print_step "STEP 6: Building Next.js Application"
# ============================================================
ssh_cmd "
    cd $APP_DIR
    echo 'Building Next.js app (this may take a few minutes)...'
    npm run build
    echo 'Build complete!'
"

# ============================================================
print_step "STEP 7: Creating Production Ecosystem Config"
# ============================================================
ssh_cmd "
    cd $APP_DIR
    mkdir -p logs

    cat > ecosystem.production.js << 'ECOSYSTEM'
module.exports = {
  apps: [
    {
      name: 'alfa-expert',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '$APP_DIR',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '$APP_DIR/logs/error.log',
      out_file: '$APP_DIR/logs/out.log',
    },
  ],
};
ECOSYSTEM
    echo 'Ecosystem config created!'
"

# ============================================================
print_step "STEP 8: Starting Application with PM2"
# ============================================================
ssh_cmd "
    cd $APP_DIR
    
    # Stop existing app if running
    pm2 delete alfa-expert 2>/dev/null || true
    
    # Start the app
    pm2 start ecosystem.production.js
    
    # Save PM2 process list
    pm2 save
    
    # Show status
    pm2 status
"

# ============================================================
print_step "STEP 9: Configuring Caddy (if installed)"
# ============================================================
ssh_cmd "
    if command -v caddy &>/dev/null; then
        echo 'Caddy is installed. Checking configuration...'
        
        # Check if Caddyfile exists in app dir
        if [ -f '$APP_DIR/Caddyfile' ]; then
            echo 'Caddyfile found in project. Copying to Caddy config...'
            cp $APP_DIR/Caddyfile /etc/caddy/Caddyfile 2>/dev/null || true
            caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true
            echo 'Caddy reloaded!'
        else
            echo 'No Caddyfile in project. Keeping existing Caddy config.'
        fi
    else
        echo 'Caddy not installed. Skip reverse proxy setup.'
        echo 'App will be accessible on http://localhost:3000'
    fi
"

# ============================================================
print_step "STEP 10: Setting Up Auto-Start on Reboot"
# ============================================================
ssh_cmd "
    pm2 startup systemd -u root --hp /root 2>/dev/null
    pm2 save
    echo 'Auto-start configured!'
"

# ============================================================
print_step "STEP 11: Verifying Deployment"
# ============================================================
sleep 5
ssh_cmd "
    echo '--- PM2 Status ---'
    pm2 status
    
    echo ''
    echo '--- Testing App on port 3000 ---'
    HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null || echo '000')
    echo \"HTTP Status on :3000 -> \$HTTP_CODE\"
    
    echo ''
    echo '--- Testing Caddy on port 81 ---'
    HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' http://localhost:81/ 2>/dev/null || echo '000')
    echo \"HTTP Status on :81 -> \$HTTP_CODE\"
    
    echo ''
    echo '--- Recent Logs ---'
    pm2 logs alfa-expert --lines 15 --nostream
"

# ============================================================
print_step "DEPLOYMENT COMPLETE! 🎉"
# ============================================================
echo ""
echo "Your ALFA Expert Option app is now deployed!"
echo ""
echo "Access URLs:"
echo "  - Direct:  http://$SSH_HOST:3000"
echo "  - Caddy:   http://$SSH_HOST:81"
echo ""
echo "Useful commands (SSH into server):"
echo "  ssh $SSH_USER@$SSH_HOST"
echo "  pm2 status           # Check app status"
echo "  pm2 logs alfa-expert # View logs"
echo "  pm2 restart alfa-expert  # Restart app"
echo "  cd $APP_DIR && git pull && npm run build && pm2 restart alfa-expert  # Update"
echo ""
echo "GitHub repo: https://github.com/ali452158/alfa-expert-option"
