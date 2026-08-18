#!/usr/bin/env python3
"""Deploy ALFA Expert Option to Hostinger VPS via SSH"""

import paramiko
import time
import sys

HOST = "76.13.40.219"
USER = "root"
PASSWORD = "Ali@0164569934"
REPO_URL = "https://ali452158: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@github.com/ali452158/alfa-expert-option.git"
APP_DIR = "/root/alfa-expert-option"

def ssh_exec(ssh, cmd, timeout=120):
    """Execute command and return output"""
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    exit_code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.strip())
    if err.strip():
        print(f"STDERR: {err.strip()}")
    print(f"Exit code: {exit_code}")
    return out, err, exit_code

def main():
    print(f"Connecting to {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=30)
        print("Connected successfully!")
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

    # Step 1: Check server environment
    print("\n" + "="*60)
    print("STEP 1: Checking server environment")
    print("="*60)
    ssh_exec(ssh, "uname -a")
    ssh_exec(ssh, "cat /etc/os-release | head -5")
    ssh_exec(ssh, "node --version 2>/dev/null || echo 'Node.js not installed'")
    ssh_exec(ssh, "npm --version 2>/dev/null || echo 'npm not installed'")
    ssh_exec(ssh, "bun --version 2>/dev/null || echo 'Bun not installed'")
    ssh_exec(ssh, "git --version 2>/dev/null || echo 'Git not installed'")
    ssh_exec(ssh, "pm2 --version 2>/dev/null || echo 'PM2 not installed'")
    ssh_exec(ssh, "caddy version 2>/dev/null || echo 'Caddy not installed'")
    ssh_exec(ssh, "nginx -v 2>&1 || echo 'Nginx not installed'")
    ssh_exec(ssh, "df -h / | tail -1")
    ssh_exec(ssh, "free -h | head -2")

    # Step 2: Install Node.js if not present
    print("\n" + "="*60)
    print("STEP 2: Installing Node.js if needed")
    print("="*60)
    out, _, _ = ssh_exec(ssh, "node --version 2>/dev/null")
    if not out.strip():
        print("Installing Node.js 20.x...")
        ssh_exec(ssh, "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -", timeout=120)
        ssh_exec(ssh, "apt-get install -y nodejs", timeout=180)
        ssh_exec(ssh, "node --version")
        ssh_exec(ssh, "npm --version")
    else:
        print(f"Node.js already installed: {out.strip()}")

    # Step 3: Install PM2 if not present
    print("\n" + "="*60)
    print("STEP 3: Installing PM2 if needed")
    print("="*60)
    out, _, _ = ssh_exec(ssh, "pm2 --version 2>/dev/null")
    if not out.strip():
        print("Installing PM2 globally...")
        ssh_exec(ssh, "npm install -g pm2", timeout=120)
        ssh_exec(ssh, "pm2 --version")
    else:
        print(f"PM2 already installed: {out.strip()}")

    # Step 4: Install Git if not present
    print("\n" + "="*60)
    print("STEP 4: Installing Git if needed")
    print("="*60)
    out, _, _ = ssh_exec(ssh, "git --version 2>/dev/null")
    if not out.strip():
        print("Installing Git...")
        ssh_exec(ssh, "apt-get update && apt-get install -y git", timeout=180)
        ssh_exec(ssh, "git --version")
    else:
        print(f"Git already installed: {out.strip()}")

    # Step 5: Clone or update the repo
    print("\n" + "="*60)
    print("STEP 5: Deploying code from GitHub")
    print("="*60)
    out, _, code = ssh_exec(ssh, f"test -d {APP_DIR} && echo 'exists' || echo 'not_exists'")
    if "exists" in out:
        print("App directory exists, pulling latest changes...")
        ssh_exec(ssh, f"cd {APP_DIR} && git fetch --all && git reset --hard origin/main", timeout=60)
    else:
        print("Cloning repository...")
        ssh_exec(ssh, f"git clone {REPO_URL} {APP_DIR}", timeout=120)

    # Step 6: Install dependencies
    print("\n" + "="*60)
    print("STEP 6: Installing dependencies")
    print("="*60)
    ssh_exec(ssh, f"cd {APP_DIR} && npm install", timeout=300)

    # Step 7: Build the Next.js app
    print("\n" + "="*60)
    print("STEP 7: Building Next.js application")
    print("="*60)
    out, err, code = ssh_exec(ssh, f"cd {APP_DIR} && npm run build", timeout=300)
    if code != 0:
        print("Build failed! Trying with NODE_OPTIONS...")
        out, err, code = ssh_exec(ssh, f"cd {APP_DIR} && NODE_OPTIONS='--max-old-space-size=512' npm run build", timeout=300)
    
    # Step 8: Stop any existing process and start fresh
    print("\n" + "="*60)
    print("STEP 8: Starting application with PM2")
    print("="*60)
    ssh_exec(ssh, f"cd {APP_DIR} && pm2 delete alfa-expert 2>/dev/null; pm2 start npm --name alfa-expert -- start")
    ssh_exec(ssh, "pm2 save")
    
    # Wait a moment and check status
    time.sleep(3)
    ssh_exec(ssh, "pm2 status")
    ssh_exec(ssh, "pm2 logs alfa-expert --lines 10 --nostream")

    # Step 9: Check if app is running
    print("\n" + "="*60)
    print("STEP 9: Verifying deployment")
    print("="*60)
    time.sleep(5)
    ssh_exec(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ || echo 'Not responding on 3000'")
    ssh_exec(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost:81/ || echo 'Not responding on 81'")

    # Step 10: Setup PM2 startup for auto-restart on reboot
    print("\n" + "="*60)
    print("STEP 10: Setting up PM2 startup")
    print("="*60)
    ssh_exec(ssh, "pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1")

    print("\n" + "="*60)
    print("DEPLOYMENT COMPLETE!")
    print("="*60)

    ssh.close()

if __name__ == "__main__":
    main()
