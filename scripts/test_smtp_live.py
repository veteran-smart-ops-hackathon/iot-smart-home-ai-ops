import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("SMTP_HOST", "smtp.gmail.com")
port = int(os.getenv("SMTP_PORT", 587))
user = os.getenv("SMTP_USER", "")
password = os.getenv("SMTP_PASSWORD", "")
from_email = os.getenv("SMTP_FROM_EMAIL", user or "aegis-iot@smarthome.ai")
to_email = os.getenv("ALERT_RECIPIENT_EMAIL", user or "user@example.com")
base_url = os.getenv("DASHBOARD_BASE_URL", "http://localhost:8000")

print(f"=== TEST SMTP CONNECTION ===")
print(f"Host: {host}:{port}")
print(f"User: {user}")
print(f"Password provided: {'YES (***)' if password else 'NO (EMPTY)'}")
print(f"Recipient: {to_email}")
print(f"Dashboard Base URL: {base_url}")

if not user or not password:
    print("\n⚠️ CẢNH BÁO: SMTP_USER hoặc SMTP_PASSWORD đang để trống trong .env.")
    print("Vui lòng lưu lại file .env với thông tin tài khoản và mật khẩu ứng dụng Gmail 16 ký tự.")
    exit(1)

msg = MIMEMultipart("alternative")
msg["Subject"] = "🧪 [Aegis-IoT] Thử Nghiệm Kết Nối Email Cảnh Báo Trực Tiếp"
msg["From"] = f"Aegis Smart Home <{from_email}>"
msg["To"] = to_email

html_content = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #fdfbf7; padding: 20px; color: #1c1917;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="border-bottom: 2px solid #f59e0b; padding-bottom: 12px; margin-bottom: 16px;">
      <h2 style="color: #d97706; margin: 0; font-size: 20px;">🛡️ AEGIS·HOME — KIỂM TRA THÀNH CÔNG</h2>
      <p style="margin: 4px 0 0; color: #78716c; font-size: 13px;">Hệ Thống Giám Sát IoT & Cảnh Báo Sự Cố Tức Thời</p>
    </div>
    <p style="font-size: 14px; line-height: 1.6;">
      Xin chào! Đây là email thử nghiệm xác nhận kết nối SMTP từ hệ thống <strong>Aegis-IoT Multi-Agent</strong> đến hộp thư của bạn thành công 100%.
    </p>
    <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px; font-weight: bold; color: #92400e; font-size: 13px;">⚡ THÔNG TIN KẾT NỐI:</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #78350f;">
        <li>Giao thức: SMTP TLS (Port 587)</li>
        <li>Người nhận: <strong>{to_email}</strong></li>
        <li>Đường hầm Cloudflare: <strong>{base_url}</strong></li>
      </ul>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="{base_url}" style="display: inline-block; background-color: #d97706; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
        MỞ DASHBOARD ĐIỀU HÀNH ➔
      </a>
    </div>
  </div>
</body>
</html>
"""

msg.attach(MIMEText(html_content, "html", "utf-8"))

try:
    print("\n⏳ Đang kết nối tới máy chủ SMTP...")
    server = smtplib.SMTP(host, port, timeout=15)
    server.starttls()
    print("⏳ Đang xác thực tài khoản...")
    server.login(user, password)
    print("⏳ Đang phát email...")
    server.sendmail(from_email, [to_email], msg.as_string())
    server.quit()
    print("🎉 GỬI EMAIL THÀNH CÔNG! Vui lòng kiểm tra Hộp thư đến (hoặc thư mục Spam).")
except Exception as e:
    print(f"\n❌ LỖI KHI GỬI EMAIL: {e}")
