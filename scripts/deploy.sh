#!/bin/bash
set -e

# ===== ตั้งค่าตรงนี้ =====
SERVER_USER="root"
SERVER_IP="206.189.88.42"           # แก้เป็น IP จริง
SERVER_PATH="/root/www/badminton"
PM2_APP="badminton"
# =========================

echo "🔨 Building Next.js locally..."
NODE_ENV=production npm run build

echo "📦 Syncing files to server..."
rsync -avz --progress \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next/cache' \
  --exclude='.env*' \
  ./ "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"

echo "🚀 Installing deps & reloading PM2 on server..."
ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

  PM2=$(which pm2 2>/dev/null || echo "")
  if [ -z "$PM2" ]; then
    echo "❌ pm2 not found! Please install: npm install -g pm2"
    exit 1
  fi

  cd /root/www/badminton
  npm install --omit=dev
  $PM2 reload badminton || $PM2 start ecosystem.config.js
  $PM2 save
  $PM2 status
ENDSSH

echo "✅ Deploy complete!"
