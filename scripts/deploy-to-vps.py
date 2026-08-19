#!/usr/bin/env python3
"""
Alfa Option - Auto Deploy to VPS
Uploads code to server and rebuilds the app
"""
import paramiko
import os
import sys
import stat
import time
from io import BytesIO

# Server credentials
HOST = '76.13.40.219'
USER = 'root'
PASSWORD = 'Ali@0164569934'
PORT = 22

# Paths
LOCAL_PROJECT = '/home/z/my-project'
REMOTE_PROJECT = '/home/z/my-project'

# Files/dirs to skip (large or local-only)
SKIP_PATTERNS = {
    'node_modules', '.next', 'out', '.git', 'android-sdk', 'jdk',
    'android', 'tool-results', 'download', 'upload', 'logs',
    '.venv', '__pycache__', '.cache', 'skills', '.z-ai-config',
    '.claude', '.env.local', 'dev.log', 'dev.out.log', 'server.log',
    'db/custom.db', 'bun.lock', 'package-lock.json',
}

def should_skip(path, name):
    """Check if file/dir should be skipped"""
    full = os.path.join(path, name)
    rel = os.path.relpath(full, LOCAL_PROJECT)
    for pat in SKIP_PATTERNS:
        if pat in rel or name == pat:
            return True
    # Skip APK files
    if name.endswith('.apk'):
        return True
    # Skip large files (>5MB)
    if os.path.isfile(full) and os.path.getsize(full) > 5_000_000:
        return True
    return False

def ssh_connect():
    """Connect to SSH server"""
    print(f"🔌 Connecting to {USER}@{HOST}:{PORT}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=15)
        print("✅ SSH Connected!")
        return client
    except Exception as e:
        print(f"❌ SSH connection failed: {e}")
        sys.exit(1)

def run_cmd(client, cmd, timeout=120):
    """Run a command on server, return output"""
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    exit_code = stdout.channel.recv_exit_status()
    return out, err, exit_code

def sftp_mkdirs(sftp, remote_dir):
    """Recursively create remote directories"""
    if remote_dir in ('/', '.', ''):
        return
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        # Create parent first
        parent = os.path.dirname(remote_dir.rstrip('/'))
        sftp_mkdirs(sftp, parent)
        try:
            sftp.mkdir(remote_dir)
        except:
            pass

def upload_file(sftp, local_path, remote_path):
    """Upload a single file"""
    sftp_mkdirs(sftp, os.path.dirname(remote_path))
    sftp.put(local_path, remote_path)

def upload_dir(sftp, local_dir, remote_dir, skip_count=[0, 0]):
    """Upload a directory recursively"""
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        if should_skip(local_dir, item):
            skip_count[1] += 1
            continue
        remote_path = os.path.join(remote_dir, item).replace('\\', '/')
        if os.path.isdir(local_path):
            try:
                sftp.stat(remote_path)
            except:
                try:
                    sftp.mkdir(remote_path)
                except:
                    pass
            upload_dir(sftp, local_path, remote_path, skip_count)
        elif os.path.isfile(local_path):
            try:
                sftp.put(local_path, remote_path)
                skip_count[0] += 1
                if skip_count[0] % 50 == 0:
                    print(f"   📤 Uploaded {skip_count[0]} files...")
            except Exception as e:
                print(f"   ⚠️  Failed: {remote_path} - {e}")
                skip_count[1] += 1
    return skip_count

def main():
    print("=" * 60)
    print("🚀 Alfa Option - Auto Deployment to VPS")
    print("=" * 60)

    # Step 1: Test SSH connection
    client = ssh_connect()

    # Step 2: Check server status
    print("\n📊 Step 1: Checking server status...")
    out, _, _ = run_cmd(client, "uname -a; echo '---'; pm2 list 2>/dev/null || echo 'PM2 not installed'; echo '---'; which node bun python3 2>/dev/null")
    print(out)

    # Step 3: Backup current database
    print("\n💾 Step 2: Backing up database...")
    out, err, _ = run_cmd(client, f"cd {REMOTE_PROJECT} && cp db/custom.db db/custom.db.bak.$(date +%s) 2>/dev/null; echo 'backup done'")
    print(out)

    # Step 4: Create SFTP connection
    print("\n📂 Step 3: Opening SFTP connection...")
    transport = client.get_transport()
    sftp = paramiko.SFTPClient.from_transport(transport)
    print("✅ SFTP connected!")

    # Step 5: Upload source code
    print("\n📤 Step 4: Uploading source code...")
    # Upload src directory
    src_dir = os.path.join(LOCAL_PROJECT, 'src')
    remote_src = f"{REMOTE_PROJECT}/src"
    print(f"   Uploading src/ ...")
    counts = upload_dir(sftp, src_dir, remote_src, [0, 0])
    print(f"   ✅ Uploaded {counts[0]} files (skipped {counts[1]})")

    # Upload mini-services
    mini_dir = os.path.join(LOCAL_PROJECT, 'mini-services')
    if os.path.isdir(mini_dir):
        print(f"   Uploading mini-services/ ...")
        counts = upload_dir(sftp, mini_dir, f"{REMOTE_PROJECT}/mini-services", [0, 0])
        print(f"   ✅ Uploaded {counts[0]} files (skipped {counts[1]})")

    # Upload prisma schema
    prisma_path = os.path.join(LOCAL_PROJECT, 'prisma', 'schema.prisma')
    if os.path.exists(prisma_path):
        print(f"   Uploading prisma/schema.prisma ...")
        upload_file(sftp, prisma_path, f"{REMOTE_PROJECT}/prisma/schema.prisma")

    # Upload config files
    config_files = [
        'package.json',
        'next.config.ts',
        'tsconfig.json',
        'tailwind.config.ts',
        'postcss.config.mjs',
        'components.json',
        'ecosystem.config.js',
        'Caddyfile',
        'capacitor.config.ts',
        '.env',
        'docker-compose.yml',
        'Dockerfile',
    ]
    print(f"   Uploading config files...")
    for f in config_files:
        local_f = os.path.join(LOCAL_PROJECT, f)
        if os.path.exists(local_f):
            try:
                sftp.put(local_f, f"{REMOTE_PROJECT}/{f}")
                print(f"   ✅ {f}")
            except Exception as e:
                print(f"   ⚠️  {f}: {e}")

    sftp.close()
    print("\n✅ Upload complete!")

    # Step 6: Install dependencies & build
    print("\n📦 Step 5: Installing dependencies on server...")
    print("   (This may take a few minutes...)")
    out, err, code = run_cmd(client, f"""
cd {REMOTE_PROJECT} && \\
echo '=== Installing npm packages ===' && \\
npm install --no-audit --no-fund --loglevel=error 2>&1 | tail -5 && \\
echo '=== Building Next.js ===' && \\
npm run build 2>&1 | tail -15
    """, timeout=300)
    print(out)
    if err:
        print(f"stderr: {err}")
    if code != 0:
        print(f"⚠️ Build exited with code {code}")

    # Step 7: Restart PM2 services
    print("\n🔄 Step 6: Restarting PM2 services...")
    out, err, _ = run_cmd(client, f"""
cd {REMOTE_PROJECT} && \\
mkdir -p logs && \\
pm2 delete trading-app 2>/dev/null; \\
pm2 start ecosystem.config.js 2>&1 | tail -20
    """, timeout=60)
    print(out)

    # Step 8: Save PM2 and check status
    print("\n📊 Step 7: Final status check...")
    out, _, _ = run_cmd(client, "pm2 save 2>&1; echo '---'; pm2 list 2>&1")
    print(out)

    # Step 9: Test endpoints
    print("\n🧪 Step 8: Testing endpoints...")
    time.sleep(3)  # Wait for services to start
    out, _, _ = run_cmd(client, "curl -s -o /dev/null -w 'HTTP %{http_code} - %{time_total}s\\n' http://localhost:3000/ 2>&1")
    print(f"   Next.js: {out.strip()}")
    out, _, _ = run_cmd(client, "curl -s -o /dev/null -w 'HTTP %{http_code} - %{time_total}s\\n' http://localhost:3003/ 2>&1")
    print(f"   Trading WS: {out.strip()}")
    out, _, _ = run_cmd(client, "curl -s -o /dev/null -w 'HTTP %{http_code} - %{time_total}s\\n' http://localhost:3004/ 2>&1")
    print(f"   EO Bridge: {out.strip()}")

    # Step 10: External URL test
    print("\n🌐 Step 9: External URL test...")
    out, _, _ = run_cmd(client, "curl -s -o /dev/null -w 'HTTP %{http_code} - %{time_total}s\\n' http://76.13.40.219:3005/ 2>&1")
    print(f"   External: {out.strip()}")

    client.close()
    print("\n" + "=" * 60)
    print("✅ Deployment Complete!")
    print("=" * 60)
    print(f"\n🌐 App URL: http://76.13.40.219:3005")
    print(f"🌐 Caddy URL: http://76.13.40.219:81")

if __name__ == "__main__":
    main()
