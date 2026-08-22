# 📧 Hướng Dẫn Cấu Hình Hệ Thống Cảnh Báo Email & Tùy Chỉnh `DASHBOARD_BASE_URL`

> **Dành cho Đội ngũ Phát triển & Vận hành Hệ thống Aegis-IoT Multi-Agent**  
> Tài liệu này hướng dẫn chi tiết cách kích hoạt tính năng gửi Email cảnh báo sự cố thời gian thực, quản lý đa người nhận và cấu hình đường dẫn `DASHBOARD_BASE_URL` để người dùng có thể mở Bảng điều khiển phê duyệt hành động từ bất kỳ đâu qua Internet.

---

## 1. Tổng Quan Cơ Chế Hoạt Động

Khi hệ thống cảm biến IoT phát hiện bất thường (ví dụ: bếp từ quá nhiệt khi vắng nhà, máy nén điều hòa quá dòng), chuỗi tác tử **LangGraph Multi-Agent (5 Tầng)** sẽ tự động kích hoạt:

```
[IoT Telemetry] ➔ [ML Anomaly Detection] ➔ [Diagnostic RCA Agent] ➔ [RAG SOP Retriever] ➔ [Planner Agent]
                                                                                               │
                                    ┌──────────────────────────────────────────────────────────┴─────────┐
                                    ▼                                                                    ▼
                      [📧 EmailAlertDispatcher]                                                [🖥️ Realtime Dashboard]
                     (Gửi email cảnh báo kèm                                                  (Chờ người dùng duyệt
                     nút bấm hành động từ xa)                                                 lệnh tắt thiết bị)
```

- **Email gửi đi bao gồm:**
  1. Tóm tắt nguyên nhân gốc rễ (Root Cause Analysis - RCA).
  2. Bảng thông số và thiết bị gặp nguy cơ (nhiệt độ, công suất, dòng điện).
  3. Quy trình khắc phục từng bước theo tiêu chuẩn SOP kỹ thuật.
  4. **Nút bấm trực tiếp (`CTA Button`):** Dẫn về Bảng điều khiển (`DASHBOARD_BASE_URL`) kèm mã sự cố (`incident_id`) để người dùng bấm xác thực ngắt nguồn ngay trên điện thoại hoặc máy tính.

---

## 2. Các Biến Môi Trường Cần Cấu Hình (`.env`)

Mở file `.env` tại thư mục gốc của dự án (`Hackathon_SRC/.env`) và cấu hình các thông số sau:

```ini
# ==============================================================================
# 📧 CẤU HÌNH GỬI EMAIL CẢNH BÁO (SMTP & BASE URL)
# ==============================================================================
# 1. Bật/Tắt tính năng gửi email (True/False)
EMAIL_NOTIFICATION_ENABLED=True

# 2. Cấu hình máy chủ SMTP (Mặc định Gmail: smtp.gmail.com - Port 587)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# 3. Tài khoản Gmail gửi cảnh báo & Mật khẩu ứng dụng 16 ký tự
SMTP_USER=email_cua_ban@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
SMTP_FROM_EMAIL=email_cua_ban@gmail.com

# 4. Danh sách email người nhận cảnh báo (phân tách bằng dấu phẩy)
ALERT_RECIPIENT_EMAIL=user1@gmail.com
ALERT_RECIPIENT_EMAILS=user1@gmail.com, ky_su@smarthome.ai, quanly@domain.com

# 5. Đường dẫn Dashboard để người dùng mở từ Email (RẤT QUAN TRỌNG)
DASHBOARD_BASE_URL=https://your-public-url.trycloudflare.com
```

---

## 3. Cách Lấy Mật Khẩu Ứng Dụng Gmail (16 Ký Tự)

Google không cho phép đăng nhập bằng mật khẩu Gmail thông thường trong code mà yêu cầu **Mật khẩu ứng dụng (App Password)**:

1. Đảm bảo tài khoản Google của bạn đã **Bật xác minh 2 bước (2-Step Verification)**.
2. Truy cập trực tiếp liên kết: **[https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)**.
3. Ở ô **Tên ứng dụng (App name)**, nhập: `Aegis-IoT` (hoặc tên bất kỳ) $\rightarrow$ Nhấn **Tạo (Create)**.
4. Google sẽ hiển thị một mật khẩu gồm 16 chữ cái màu vàng (ví dụ: `dwkv cwll krbg yroo`).
5. Sao chép và dán chuỗi 16 ký tự này vào biến `SMTP_PASSWORD` trong file `.env`.

---

## 4. Hướng Dẫn Cấu Hình & Sửa Đổi `DASHBOARD_BASE_URL`

Biến `DASHBOARD_BASE_URL` quyết định liên kết gắn vào nút **"MỞ BẢNG ĐIỀU KHIỂN ĐỂ PHÊ DUYỆT HÀNH ĐỘNG"** trong email. Tùy thuộc vào môi trường sử dụng, hãy chọn một trong các cách sau:

### 🏠 Cách 1: Chạy thử nghiệm nội bộ (Localhost)
Dùng khi người nhận chỉ mở email trên chính máy tính đang chạy server:
```ini
DASHBOARD_BASE_URL=http://localhost:8000
```

---

### 🌐 Cách 2: Public ra Internet miễn phí bằng Cloudflare Tunnel (Khuyên dùng)
Dùng khi muốn người nhận có thể mở email và phê duyệt từ điện thoại (4G) hoặc từ ngoài mạng nội bộ mà không cần mở cổng modem (Port Forwarding):

1. **Khởi chạy Cloudflare Tunnel trong terminal:**
   ```bash
   cloudflared tunnel --edge-ip-version 4 --protocol http2 --url http://localhost:8000
   ```
2. **Sao chép đường dẫn Public được cấp** trong log terminal (ví dụ: `https://designer-standards-current-comparison.trycloudflare.com`).
3. **Cập nhật vào file `.env`:**
   ```ini
   DASHBOARD_BASE_URL=https://designer-standards-current-comparison.trycloudflare.com
   ```
4. **Khởi động lại server backend** (hoặc gọi API reload) để hệ thống nhận URL mới.

---

### 🚇 Cách 3: Public ra Internet bằng Ngrok
Nếu máy đã cài sẵn `ngrok`:

1. **Khởi chạy Ngrok trong terminal:**
   ```bash
   ngrok http 8000
   ```
2. **Sao chép URL HTTPS** (ví dụ: `https://abc-123.ngrok-free.app`).
3. **Cập nhật vào file `.env`:**
   ```ini
   DASHBOARD_BASE_URL=https://abc-123.ngrok-free.app
   ```

---

### ☁️ Cách 4: Triển khai trên VPS / Cloud Server có Tên Miền
Khi triển khai dự án lên Cloud/VPS có domain chính thức:
```ini
DASHBOARD_BASE_URL=https://aegis-iot.mycompany.vn
# Hoặc IP Public:
# DASHBOARD_BASE_URL=http://123.45.67.89:8000
```

---

## 5. Quản Lý Đa Email Người Nhận Cảnh Báo

Hệ thống cho phép thêm nhiều email nhận tin đồng thời (chủ nhà, kỹ sư, ban quản lý).

### Cách 1: Qua Giao Diện Trực Quan
- Mở tab **`CẢNH BÁO EMAIL`** trên giao diện: `http://localhost:8000/alerts` (hoặc URL Cloudflare).
- Nhập danh sách nhiều email cách nhau bằng dấu phẩy:
  ```text
  owner@gmail.com, kythuat@smarthome.ai, baove@chungcu.com
  ```
- Nhấn **`LƯU & PHÁT CẢNH BÁO TỚI TẤT CẢ EMAIL NGAY ➔`**.
- Mỗi email sẽ hiển thị dưới dạng **Thẻ Tag (Chip)** kèm nút `x` để xóa nhanh khi cần.

### Cách 2: Qua REST API
```bash
# Thêm một người nhận mới
curl -X POST http://localhost:8000/api/notifications/recipients/add \
  -H "Content-Type: application/json" \
  -d '{"email": "ky_su_moi@smarthome.ai"}'

# Gỡ bỏ một người nhận
curl -X POST http://localhost:8000/api/notifications/recipients/remove \
  -H "Content-Type: application/json" \
  -d '{"email": "ky_su_moi@smarthome.ai"}'
```

---

## 6. Kiểm Tra Nhanh & Khắc Phục Sự Cố (Troubleshooting)

### 🧪 Script kiểm tra SMTP trực tiếp:
Trong thư mục gốc có sẵn script `test_smtp_live.py`. Chạy lệnh sau để kiểm tra kết nối ngay:
```bash
.venv/bin/python test_smtp_live.py
```
Nếu màn hình thông báo:
```text
=== TEST SMTP CONNECTION ===
Host: smtp.gmail.com:587
User: email_cua_ban@gmail.com
⏳ Đang kết nối tới máy chủ SMTP...
⏳ Đang xác thực tài khoản...
⏳ Đang phát email...
🎉 GỬI EMAIL THÀNH CÔNG!
```
$\rightarrow$ Hệ thống đã sẵn sàng 100%!

### ❗ Một số lỗi thường gặp:

| Hiện tượng | Nguyên nhân | Cách khắc phục |
|---|---|---|
| `535 5.7.8 BadCredentials` | Nhập sai tài khoản Gmail hoặc dùng mật khẩu đăng nhập thay vì Mật khẩu ứng dụng 16 chữ cái. | Tạo lại App Password tại [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) và kiểm tra không bị gõ nhầm ký tự trong `SMTP_USER`. |
| `Status: SIMULATED` | `SMTP_USER` hoặc `SMTP_PASSWORD` đang để trống trong `.env`. | Điền đầy đủ thông tin SMTP vào file `.env` và khởi động lại backend. |
| Người dùng bấm link trong email báo `Không tìm thấy trang` | `DASHBOARD_BASE_URL` đang để `localhost:8000` nhưng người dùng mở email trên điện thoại không chung mạng WiFi. | Chạy Cloudflare Tunnel / Ngrok và cập nhật `DASHBOARD_BASE_URL` thành link public HTTPS. |
| Không thấy email trong Hộp thư đến | Email bị bộ lọc Gmail xếp vào tab Spam hoặc Quảng cáo. | Kiểm tra thư mục **Spam (Thư rác)** hoặc **Updates (Cập nhật)** và bấm "Không phải thư rác". |

---

## 7. Khởi Chạy Hệ Thống Backend & Dashboard

Để khởi chạy toàn bộ dịch vụ:

```bash
# 1. Kích hoạt môi trường ảo
source .venv/bin/activate

# 2. Khởi chạy FastAPI Backend & Dashboard
uvicorn backend.app:app --host 0.0.0.0 --port 8000

# 3. Mở giao diện trên trình duyệt
# http://localhost:8000/
# http://localhost:8000/alerts
```
