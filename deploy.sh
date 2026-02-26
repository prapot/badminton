#!/bin/bash
# ─────────────────────────────────────────────
#  deploy.sh  —  Next.js (badminton frontend)
#  รันบน server: bash deploy.sh
# ─────────────────────────────────────────────

set -e

APP_DIR="/root/www/badminton"
LOG_DIR="/var/log/pm2"
PM2_NAME="badminton"

echo "🚀 Starting deploy: $PM2_NAME"
echo "📁 Directory: $APP_DIR"

cd "$APP_DIR"

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing dependencies..."
npm install --omit=dev

# ── 3. Copy .env.production → .env.local ────
if [ -f ".env.production" ]; then
    echo "⚙️  Applying .env.production..."
    cp .env.production .env.local
fi

echo "🔨 Building Next.js..."
npm run build

mkdir -p "$LOG_DIR"

echo "⚡ Starting/restarting PM2..."
if pm2 describe "$PM2_NAME" > /dev/null 2>&1; then
    pm2 restart "$PM2_NAME"
else
    pm2 start ecosystem.config.js
fi

pm2 save

echo "✅ Deploy complete!"
pm2 status "$PM2_NAME"
