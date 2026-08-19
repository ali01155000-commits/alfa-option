#!/usr/bin/env python3
"""
Deploy to Hostinger VPS via SSH
Pulls latest code from GitHub and rebuilds the app
"""
import paramiko
import sys
import time

HOST = '76.13.40.219'
USER = 'root'
PASSWORD = 'Ali@0164569934'
PORT = 22

REPO_URL = 'https://github.com/ali01155000-commits/alfa-option.git'
APP_DIR = '/home/z/my-project'

def run(client, cmd, timeout=300, show_output=True):
    """Run command and show progress"""
    print(f"\n$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    out_lines = []
    while True:
        line = stdout.readline()
        if not line:
            break
        if show_output:
            print(f"  {line}", end='')
        out_lines.append(line)
    exit_code = stdout.channel.recv_exit_status()
    return ''.join(out_lines), exit_code

def main():
    print("=" * 60)
    print("🚀 Alfa Option - Deploy to Hostinger VPS")
    print("=" * 60)

    # Step 1: SSH connect
    print(f"\n🔌 Connecting to {USER}@{HOST}:{PORT}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
        print("✅ SSH Connected!")
    except Exception as e:
        print(f"❌ SSH connection failed: {e}")
        sys.exit(1)

    # Step 2: Check server status
    print("\n📊 Step 1: Server Status...")
    run(client, "uname -a && echo '---' && uptime && echo '---' && df -h / | tail -1")

    # Step 3: Backup database
    print("\n💾 Step 2: Backup database...")
    run(client, f"cd {APP_DIR} && mkdir -p db && cp db/custom.db db/custom.db.bak.$(date +%Y%m%d_%H%M%S) 2>/dev/null; echo 'backup done'")

    # Step 4: Check current state of git
    print("\n📂 Step 3: Check current project state...")
    out, _ = run(client, f"cd {APP_DIR} && git status 2>&1 | head -5; echo '---'; ls -la")

    # Step 5: Reset any local changes and pull latest
    print("\n🔄 Step 4: Pull latest code from GitHub...")
    run(client, f"cd {APP_DIR} && git fetch origin 2>&1 | tail -5")
    run(client, f"cd {APP_DIR} && git reset --hard origin/main 2>&1 | tail -5")
    run(client, f"cd {APP_DIR} && git log --oneline -3")

    # Step 6: Install dependencies
    print("\n📦 Step 5: Install dependencies...")
    run(client, f"cd {APP_DIR} && npm install --no-audit --no-fund --loglevel=error 2>&1 | tail -10", timeout=300)

    # Step 7: Build Next.js
    print("\n🏗️ Step 6: Build Next.js...")
    out, code = run(client, f"cd {APP_DIR} && npm run build 2>&1 | tail -25", timeout=300)
    if code != 0:
        print(f"⚠️ Build exited with code {code}")

    # Step 8: Restart PM2 services
    print("\n🔄 Step 7: Restart PM2 services...")
    run(client, f"cd {APP_DIR} && mkdir -p logs")
    run(client, f"cd {APP_DIR} && pm2 delete trading-app 2>/dev/null; pm2 start ecosystem.config.js 2>&1 | tail -10")
    run(client, "pm2 save 2>&1")

    # Step 9: Wait for services to start
    print("\n⏳ Step 8: Waiting for services to start...")
    time.sleep(5)

    # Step 10: Check PM2 status
    print("\n📊 Step 9: PM2 Status...")
    run(client, "pm2 list 2>&1")

    # Step 11: Test endpoints
    print("\n🧪 Step 10: Testing endpoints...")
    out, _ = run(client, "curl -s -o /dev/null -w 'HTTP %{http_code} - %{time_total}s\\n' http://localhost:3000/ 2>&1", show_output=True)
    print(f"   Next.js: {out.strip()}")
    out, _ = run(client, "curl -s -o /dev/null -w 'HTTP %{http_code} - %{time_total}s\\n' http://localhost:3003/ 2>&1", show_output=True)
    print(f"   Trading WS: {out.strip()}")
    out, _ = run(client, "curl -s -o /dev/null -w 'HTTP %{http_code} - %{time_total}s\\n' http://localhost:3004/ 2>&1", show_output=True)
    print(f"   EO Bridge: {out.strip()}")

    # Step 12: External URL test
    print("\n🌐 Step 11: External URL test...")
    out, _ = run(client, "curl -s -o /dev/null -w 'HTTP %{http_code} - %{time_total}s\\n' http://76.13.40.219:3005/ 2>&1", show_output=True)
    print(f"   External port 3005: {out.strip()}")
    out, _ = run(client, "curl -s -o /dev/null -w 'HTTP %{http_code} - %{time_total}s\\n' http://76.13.40.219:81/ 2>&1", show_output=True)
    print(f"   Caddy port 81: {out.strip()}")

    # Step 13: Verify back button is deployed
    print("\n🔍 Step 12: Verify back button is deployed...")
    out, _ = run(client, f"ls -la {APP_DIR}/src/components/ui/back-button.tsx {APP_DIR}/src/lib/device-fingerprint.ts {APP_DIR}/src/app/auth/device-bind/route.ts 2>&1")
    print(out)

    client.close()

    print("\n" + "=" * 60)
    print("✅ Deployment Complete!")
    print("=" * 60)
    print(f"\n🌐 App URLs:")
    print(f"   → http://76.13.40.219:3005")
    print(f"   → http://76.13.40.219:81")
    print(f"\n📦 GitHub repo: https://github.com/ali01155000-commits/alfa-option")

if __name__ == "__main__":
    main()
