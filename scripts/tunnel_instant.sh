#!/bin/bash
# ==============================================================================
# 🌐 Aegis-IoT: Instant Zero-Auth Public Tunnel
# ==============================================================================

PORT=${1:-8000}
IP=$(curl -s https://loca.lt/mytunnelpassword || curl -s https://ifconfig.me)

echo "================================================================="
echo "  🌐 Aegis-IoT Multi-Agent Dashboard - Instant Public Tunnel"
echo "================================================================="
echo "🔑 Tunnel Access IP Password: $IP"
echo "👉 When opening the URL in browser for the first time, paste IP: $IP"
echo "-----------------------------------------------------------------"

npx localtunnel --port $PORT
