#!/bin/bash
# ==============================================================================
# 🚀 Veteran Home: Permanent Public Tunnel Launcher
# Static Domain: https://ramrod-cake-crisped.ngrok-free.dev
# ==============================================================================

PORT=${1:-8000}
DOMAIN="ramrod-cake-crisped.ngrok-free.dev"

echo "================================================================="
echo "  🏠 VETERAN HOME - CỔNG TRUY CẬP CÔNG KHAI CỐ ĐỊNH (PERMANENT)"
echo "================================================================="
echo "🌐 URL Công Khai Cố Định: https://$DOMAIN"
echo "🔌 Cổng Localhost:        http://localhost:$PORT"
echo "-----------------------------------------------------------------"
echo "Đang khởi chạy đường hầm Ngrok Static Domain..."
echo "Từ nay về sau, link truy cập này là VĨNH VIỄN CỐ ĐỊNH, không đổi."
echo "================================================================="

ngrok http --url https://$DOMAIN $PORT
