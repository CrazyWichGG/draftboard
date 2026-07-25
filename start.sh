#!/usr/bin/env bash

# DraftBoard Unified Launcher Script
# Starts both Backend (Node.js/Socket.io on :3001) and Frontend (Vite/React on :3000)

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR" || exit 1

echo "======================================================"
echo "          🚀 Starting DraftBoard Web App"
echo "======================================================"
echo "  - Backend  : http://localhost:3001"
echo "  - Frontend : http://localhost:3000"
echo "======================================================"

# If --pm2 argument is passed, launch backend with PM2
if [[ "$1" == "--pm2" ]]; then
  if command -v pm2 &> /dev/null; then
    echo "[Launcher] Starting backend server via PM2..."
    pm2 start ecosystem.config.cjs
    echo "[Launcher] Starting frontend dev server..."
    npm run dev
    exit 0
  else
    echo "[Launcher] PM2 is not installed globally. Falling back to npm run dev:all..."
  fi
fi

# Default mode: Run both via concurrently with trap cleanup
trap 'echo -e "\n[Launcher] Stopping all services..."; kill 0' EXIT INT TERM

npm run dev:all
