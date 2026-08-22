@echo off
chcp 65001 >nul
echo ==============================================================================
echo 🛑 Đang dừng toàn bộ hệ thống Aegis-IoT Multi-Agent trên Windows...
echo ==============================================================================

docker compose down

echo ✅ Đã dừng toàn bộ dịch vụ an toàn.
pause
