#!/bin/bash
# ==============================================================================
# 🚀 Aegis-IoT: Ngrok Tunnel Launcher
# ==============================================================================

PORT=${1:-8000}

echo "================================================================="
echo "  🛡️ Aegis-IoT Multi-Agent Dashboard - Ngrok Public Tunnel"
echo "================================================================="

# Check if ngrok is authenticated
if ! ngrok config check &>/dev/null; then
    echo "⚠️ Ngrok authtoken is not configured. Run: ngrok config add-authtoken <TOKEN>"
fi

DOMAIN="ramrod-cake-crisped.ngrok-free.dev"

echo "🚀 Starting Ngrok tunnel with PERMANENT Static Domain: https://$DOMAIN"
echo "Forwarding to http://localhost:$PORT..."
echo "-----------------------------------------------------------------"

ngrok http --url https://$DOMAIN $PORT


