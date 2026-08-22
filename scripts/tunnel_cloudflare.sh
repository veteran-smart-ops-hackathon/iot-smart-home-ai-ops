#!/bin/bash
# ==============================================================================
# 🌐 Aegis-IoT: Cloudflare Quick Tunnel for UI/UX Public Testing (HTTP/2 Mode)
# ==============================================================================

PORT=${1:-8000}

echo "================================================================="
echo "  🌐 Khởi Chạy Cloudflare Tunnel cho Aegis-IoT Multi-Agent UI"
echo "================================================================="
echo "Port: $PORT"
echo "Đang tạo URL HTTPS công khai qua Cloudflare (HTTP/2 Protocol)..."
echo "-----------------------------------------------------------------"

cloudflared tunnel --protocol http2 --url http://localhost:$PORT
