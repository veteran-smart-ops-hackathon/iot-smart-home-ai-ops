@echo off
chcp 65001 >nul
echo ==============================================================================
echo 🚀 Khởi Chạy Aegis-IoT Multi-Agent System trên Windows (Docker Compose)
echo ==============================================================================

:: 1. Kiểm tra Docker
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker chưa được cài đặt hoặc chưa được thêm vào PATH!
    echo Vui lòng cài đặt Docker Desktop for Windows và bật WSL 2 backend.
    pause
    exit /b 1
)

docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Docker Daemon chưa chạy! Đang khởi động Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Đang đợi Docker Desktop khởi động (30s)...
    timeout /t 30 /nobreak
)

:: 2. Kiểm tra file .env
if not exist .env (
    echo [INFO] File .env chưa tồn tại. Đang tạo từ .env.example...
    copy .env.example .env
    echo [WARN] Hãy kiểm tra và cấu hình các API Key (GEMINI_KEY_*, FPT_AI_API_KEY,...) trong file .env nếu cần.
)

:: 3. Build và chạy Docker Compose
echo [INFO] Đang build và khởi chạy các container (TimescaleDB, Qdrant, RabbitMQ, Mosquitto, App)...
docker compose up -d --build

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Có lỗi khi chạy docker compose up! Vui lòng kiểm tra log lỗi bên trên.
    pause
    exit /b 1
)

echo ==============================================================================
echo ✅ Hệ thống đã khởi chạy thành công!
echo ------------------------------------------------------------------------------
echo 🌐 Dashboard Web UI:      http://localhost:8000
echo 🐰 RabbitMQ Management:   http://localhost:15672 (user: guest / pass: guest)
echo 🎯 Qdrant Vector REST:    http://localhost:6333/dashboard
echo 🗄️ TimescaleDB / PG:      localhost:5432 (user: postgres / pass: postgres_secret)
echo 📡 Mosquitto MQTT:        localhost:1883
echo ==============================================================================

:: 4. Tự động mở Dashboard trên trình duyệt
timeout /t 3 /nobreak >nul
start http://localhost:8000

echo Nhấn phím bất kỳ để xem log hệ thống realtime (Ctrl+C để thoát xem log)...
pause >nul
docker compose logs -f app
