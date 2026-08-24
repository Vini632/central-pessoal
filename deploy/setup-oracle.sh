#!/usr/bin/env bash
#
# Central Pessoal — Oracle Cloud Free (Always Free, ARM Ampere) provisioning
# Run as the default user (ubuntu on Ubuntu images, opc on Oracle Linux):
#   curl -fsSL https://raw.githubusercontent.com/Vini632/central-pessoal/master/deploy/setup-oracle.sh | bash
# or after cloning:
#   bash deploy/setup-oracle.sh
#
# What it does:
#   1. Installs Docker (+ compose plugin)
#   2. Clones the repo (or uses CWD if already inside it)
#   3. Generates a strong API_TOKEN and writes .env
#   4. Builds and starts the container with restart:unless-stopped (24/7 + auto-recover)
#   5. Prints the token and how to access
#
# IMPORTANT: open port 3456 (and 22 for SSH) in the Oracle VCN security list
# BEFORE accessing the app from outside.
set -euo pipefail

REPO="https://github.com/Vini632/central-pessoal.git"
APP_DIR="$HOME/central-pessoal"
PORT=3456

echo "==> [1/5] Installing Docker"
if command -v docker >/dev/null 2>&1; then
  echo "    Docker already installed"
else
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "    Docker installed. You may need to re-login for docker group to apply."
fi

# Ensure compose plugin available
if ! docker compose version >/dev/null 2>&1; then
  sudo apt-get update -qq && sudo apt-get install -y -qq docker-compose-plugin || \
  sudo yum install -y docker-compose-plugin
fi

echo "==> [2/5] Preparing app directory"
if [ -d "$APP_DIR/.git" ]; then
  echo "    $APP_DIR already exists, pulling latest"
  git -C "$APP_DIR" pull
else
  git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

echo "==> [3/5] Writing .env"
if [ -f .env ]; then
  echo "    .env already exists, leaving it untouched"
else
  cp .env.example .env
  TOKEN=$(openssl rand -hex 32)
  # Uncomment and set API_TOKEN
  sed -i "s/^# API_TOKEN=.*/API_TOKEN=$TOKEN/" .env
  # Enable DISABLE_OLLAMA by default (set to false + install ollama to use AI)
  sed -i "s/^# DISABLE_OLLAMA=.*/DISABLE_OLLAMA=true/" .env
  echo "    API_TOKEN generated: $TOKEN"
  echo "    Save this token! It is required to use the app and the terminal."
fi

echo "==> [4/5] Building & starting container (24/7)"
docker compose up -d --build

echo "==> [5/5] Status"
sleep 3
docker compose ps
PUBLIC_IP=$(curl -fsSL http://169.254.169.254/opc/v1/vnics/ | grep -oP '"publicIp"[^,]*"\K[0-9.]+' | head -1 || true)
echo ""
echo "==========================================================="
echo " Central Pessoal deployed!"
echo " Local:    http://localhost:$PORT"
if [ -n "$PUBLIC_IP" ]; then
  echo " Public:   http://$PUBLIC_IP:$PORT   (open port $PORT in VCN first)"
fi
echo ""
echo " API_TOKEN: $TOKEN"
echo "==========================================================="
echo " Commands:"
echo "   docker compose -f $APP_DIR/docker-compose.yml logs -f   # view logs"
echo "   docker compose -f $APP_DIR/docker-compose.yml restart   # restart"
echo "   docker compose -f $APP_DIR/docker-compose.yml down       # stop"
