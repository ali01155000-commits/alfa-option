module.exports = {
  apps: [
    // Next.js Production Server
    {
      name: 'trading-app',
      script: 'server.js',
      cwd: '/home/z/my-project/.next/standalone',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        DATABASE_URL: 'file:/home/z/my-project/db/custom.db',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/home/z/my-project/logs/trading-app-error.log',
      out_file: '/home/z/my-project/logs/trading-app-out.log',
    },

    // Trading WebSocket Server (Simulated - Bun Socket.IO)
    {
      name: 'trading-ws',
      script: 'index.ts',
      cwd: '/home/z/my-project/mini-services/trading-ws',
      interpreter: '/usr/local/bin/bun',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/home/z/my-project/logs/trading-ws-error.log',
      out_file: '/home/z/my-project/logs/trading-ws-out.log',
    },

    // Expert Option Python Bridge (FastAPI + WebSocket)
    {
      name: 'eo-bridge',
      script: '/home/z/my-project/mini-services/eo-bridge/start-pm2.sh',
      interpreter: 'bash',
      cwd: '/home/z/my-project/mini-services/eo-bridge',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/home/z/my-project/logs/eo-bridge-error.log',
      out_file: '/home/z/my-project/logs/eo-bridge-out.log',
    },
  ],
};
