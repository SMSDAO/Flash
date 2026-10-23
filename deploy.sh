#!/usr/bin/env bash
# ==============================================================================
# Phase 3: Automated Docker Cloud Deploy Script
# Enterprise MEV Flash Loan Autonomous Daemon
# ==============================================================================
set -e

echo "=== Initializing Docker Environment for MEV Daemon ==="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker not detected. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "Docker installed successfully."
fi

# Ensure docker compose is available
if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
fi

# Create .env from template if not existing
if [ ! -f .env ]; then
    echo "No .env found. Copying from .env.daemon.example..."
    cp .env.daemon.example .env
    echo "IMPORTANT: Edit .env to set your BOT_PRIVATE_KEY and RPC_WSS."
fi

echo "=== Building and Starting Arbitrage Daemon Container ==="
docker compose down || true
docker compose up -d --build

echo "=== Verifying Container Health ==="
sleep 5
docker compose ps
docker compose logs --tail=25 arbitrage-bot

echo "=== Deployment Successful! ==="
echo "Stream logs anytime: docker compose logs -f"
