import os
import smtplib
import time
import uuid
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional, Dict, Any
from datetime import datetime

from config import get_settings, Settings, get_all_recipient_emails
from .schemas import DiagnosticReport, MitigationPlan, NotificationLog, NotificationSettings

# Anti-spam cooldown duration: 15 minutes (900 seconds)
INCIDENT_ALERT_COOLDOWN_SECONDS = 900.0

RESERVED_OR_MOCK_DOMAINS = {
    "example.com", "example.org", "example.net",
    "domain.com", "domain.org", "domain.net",
    "smarthome.ai", "smarthome.local", "smarthome.test",
    "test.com", "test.org", "test.net",
    "sample.com", "sample.org",
    "localhost", "invalid"
}

def is_mock_domain(email: str) -> bool:
    """
    Kiểm tra xem email có thuộc domain thử nghiệm/mẫu (RFC 2606 hoặc placeholder) không.
    Các domain này sẽ được mô phỏng an toàn (SIMULATED) để tránh gửi qua Live SMTP gây bounce mail.
    """
    if not email or "@" not in email:
        return True
    domain = email.split("@")[-1].strip().lower()
    if domain in RESERVED_OR_MOCK_DOMAINS:
        return True
    if any(domain.endswith(f".{suffix}") for suffix in ["example", "test", "invalid", "local", "localhost"]):
        return True
    return False

logger = logging.getLogger("agentic.notification_service")

class EmailNotificationService:
    """
    Tác Tử Dịch Vụ Thông Báo Email Cảnh Báo (Email Notification Dispatcher).
    
    Đặc điểm thiết kế (Deep Module):
    - Đóng gói toàn bộ logic định dạng email HTML chuyên nghiệp, plaintext fallback.
    - Hỗ trợ gửi đồng thời tới DANH SÁCH NHIỀU EMAIL NGƯỜI NHẬN (Multi-Recipient Dispatch).
    - Cho phép người dùng tự do thêm, xóa, cập nhật danh sách email nhận cảnh báo realtime.
    - Tự động chuyển đổi giữa SMTP Thực tế (Live SMTP) và Chế độ Mô phỏng (Simulated Mode).
    - Không chặn (non-blocking) luồng xử lý Multi-Agent, cô lập hoàn toàn lỗi ngoại lệ mạng.
    - Cung cấp liên kết trực tiếp (Direct CTA Link) để người dùng mở Dashboard phê duyệt tức thì.
    - Lưu vết lịch sử thông báo (Audit Notification History).
    """

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self._history: List[NotificationLog] = []
        source = f"{self.settings.ALERT_RECIPIENT_EMAIL},{self.settings.ALERT_RECIPIENT_EMAILS}"
        self._recipient_emails: List[str] = self.parse_email_list(source)
        if not self._recipient_emails:
            default_email = self.settings.SMTP_USER if (self.settings.SMTP_USER and "@" in self.settings.SMTP_USER) else "user@smarthome.ai"
            self._recipient_emails = [default_email]
        self._override_enabled: Optional[bool] = None
        self._incident_cooldown: Dict[str, float] = {}

    @property
    def is_enabled(self) -> bool:
        if self._override_enabled is not None:
            return self._override_enabled
        return bool(self.settings.EMAIL_NOTIFICATION_ENABLED)

    @property
    def recipient_emails(self) -> List[str]:
        if self._recipient_emails:
            return list(self._recipient_emails)
        source = f"{self.settings.ALERT_RECIPIENT_EMAIL},{self.settings.ALERT_RECIPIENT_EMAILS}"
        emails = self.parse_email_list(source)
        default_email = self.settings.SMTP_USER if (self.settings.SMTP_USER and "@" in self.settings.SMTP_USER) else "user@smarthome.ai"
        return emails if emails else [default_email]

    @property
    def recipient_email(self) -> str:
        """Trả về chuỗi hiển thị tóm tắt (email đầu tiên hoặc các email phân tách bằng dấu phẩy)."""
        emails = self.recipient_emails
        default_email = self.settings.SMTP_USER if (self.settings.SMTP_USER and "@" in self.settings.SMTP_USER) else "user@smarthome.ai"
        return ", ".join(emails) if emails else default_email

    @property
    def is_smtp_configured(self) -> bool:
        user = (self.settings.SMTP_USER or "").strip()
        pwd = (self.settings.SMTP_PASSWORD or "").strip()
        return bool(user and pwd and not user.startswith("your_") and not pwd.startswith("your_"))

    def parse_email_list(self, raw_input: Any) -> List[str]:
        """Chuẩn hóa và làm sạch danh sách email từ chuỗi hoặc mảng."""
        emails: List[str] = []
        if isinstance(raw_input, str):
            parts = raw_input.replace(";", ",").replace("\n", ",").split(",")
        elif isinstance(raw_input, (list, tuple, set)):
            parts = [str(x) for x in raw_input]
        else:
            parts = []

        for item in parts:
            cleaned = item.strip().lower()
            if cleaned and "@" in cleaned and "." in cleaned and cleaned not in emails:
                emails.append(cleaned)
        return emails

    def set_recipient_emails(self, emails: Any) -> List[str]:
        parsed = self.parse_email_list(emails)
        if parsed:
            self._recipient_emails = parsed
        return self.recipient_emails

    def add_recipient_email(self, email: str) -> List[str]:
        cleaned = (email or "").strip().lower()
        if cleaned and "@" in cleaned and "." in cleaned:
            if cleaned not in self._recipient_emails:
                self._recipient_emails.append(cleaned)
        return self.recipient_emails

    def remove_recipient_email(self, email: str) -> List[str]:
        cleaned = (email or "").strip().lower()
        if cleaned in self._recipient_emails:
            self._recipient_emails.remove(cleaned)
        if not self._recipient_emails:
            default_email = self.settings.SMTP_USER if (self.settings.SMTP_USER and "@" in self.settings.SMTP_USER) else "user@smarthome.ai"
            self._recipient_emails = [default_email]
        return self.recipient_emails

    def get_settings_summary(self) -> NotificationSettings:
        emails = self.recipient_emails
        return NotificationSettings(
            enabled=self.is_enabled,
            recipient_email=self.recipient_email,
            recipient_emails=emails,
            total_recipients=len(emails),
            smtp_configured=self.is_smtp_configured,
            smtp_host=self.settings.SMTP_HOST,
            smtp_port=self.settings.SMTP_PORT,
            from_email=self.settings.SMTP_FROM_EMAIL,
            dashboard_base_url=self.settings.DASHBOARD_BASE_URL
        )

    def update_settings(
        self,
        recipient_email: Optional[str] = None,
        recipient_emails: Optional[List[str]] = None,
        enabled: Optional[bool] = None,
        smtp_user: Optional[str] = None,
        smtp_password: Optional[str] = None,
        smtp_from_email: Optional[str] = None,
        smtp_host: Optional[str] = None,
        smtp_port: Optional[int] = None
    ) -> NotificationSettings:
        env_updates: Dict[str, str] = {}

        if recipient_emails is not None:
            self.set_recipient_emails(recipient_emails)
            emails_str = ",".join(self.recipient_emails)
            self.settings.ALERT_RECIPIENT_EMAILS = emails_str
            self.settings.ALERT_RECIPIENT_EMAIL = self.recipient_emails[0] if self.recipient_emails else ""
            env_updates["ALERT_RECIPIENT_EMAILS"] = emails_str
            env_updates["ALERT_RECIPIENT_EMAIL"] = self.settings.ALERT_RECIPIENT_EMAIL
        elif recipient_email is not None and recipient_email.strip():
            self.set_recipient_emails(recipient_email)
            emails_str = ",".join(self.recipient_emails)
            self.settings.ALERT_RECIPIENT_EMAILS = emails_str
            self.settings.ALERT_RECIPIENT_EMAIL = self.recipient_emails[0] if self.recipient_emails else ""
            env_updates["ALERT_RECIPIENT_EMAILS"] = emails_str
            env_updates["ALERT_RECIPIENT_EMAIL"] = self.settings.ALERT_RECIPIENT_EMAIL
            
        if enabled is not None:
            self._override_enabled = enabled
            env_updates["EMAIL_NOTIFICATION_ENABLED"] = "true" if enabled else "false"

        if smtp_user is not None and smtp_user.strip():
            clean_user = smtp_user.strip()
            self.settings.SMTP_USER = clean_user
            env_updates["SMTP_USER"] = clean_user
            if not smtp_from_email:
                self.settings.SMTP_FROM_EMAIL = clean_user
                env_updates["SMTP_FROM_EMAIL"] = clean_user

        if smtp_password is not None and smtp_password.strip():
            clean_pwd = smtp_password.strip()
            self.settings.SMTP_PASSWORD = clean_pwd
            env_updates["SMTP_PASSWORD"] = clean_pwd

        if smtp_from_email is not None and smtp_from_email.strip():
            self.settings.SMTP_FROM_EMAIL = smtp_from_email.strip()
            env_updates["SMTP_FROM_EMAIL"] = smtp_from_email.strip()

        if smtp_host is not None and smtp_host.strip():
            self.settings.SMTP_HOST = smtp_host.strip()
            env_updates["SMTP_HOST"] = smtp_host.strip()

        if smtp_port is not None and smtp_port > 0:
            self.settings.SMTP_PORT = int(smtp_port)
            env_updates["SMTP_PORT"] = str(smtp_port)

        if env_updates:
            self._persist_to_env(env_updates)

        return self.get_settings_summary()

    def _persist_to_env(self, updates: Dict[str, str]):
        """Ghi đè cấu hình mới vào file .env trên ổ đĩa để duy trì kể cả khi khởi động lại."""
        env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
        if not os.path.exists(env_path):
            return
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            updated_keys = set()
            new_lines = []
            for line in lines:
                stripped = line.strip()
                if stripped and not stripped.startswith("#") and "=" in stripped:
                    k, _ = stripped.split("=", 1)
                    k = k.strip()
                    if k in updates:
                        new_lines.append(f"{k}={updates[k]}\n")
                        updated_keys.add(k)
                        continue
                new_lines.append(line)
            
            for k, v in updates.items():
                if k not in updated_keys:
                    new_lines.append(f"{k}={v}\n")
                    
            with open(env_path, "w", encoding="utf-8") as f:
                f.writelines(new_lines)
            logger.info(f"Đã lưu thành công cấu hình email vào .env: {list(updates.keys())}")
        except Exception as e:
            logger.warning(f"Không thể ghi đè .env: {e}")

    @staticmethod
    def verify_smtp_credentials(
        user: str,
        password: str,
        host: str = "smtp.gmail.com",
        port: int = 587
    ) -> Dict[str, Any]:
        """Kiểm tra trực tiếp thông tin đăng nhập SMTP trước khi lưu."""
        clean_user = (user or "").strip()
        clean_pwd = (password or "").strip()
        # Thử cả 2 dạng: có khoảng cách và bỏ khoảng cách
        passwords_to_try = [clean_pwd]
        if " " in clean_pwd:
            passwords_to_try.append(clean_pwd.replace(" ", ""))

        last_error = None
        for pwd in passwords_to_try:
            try:
                if port == 465:
                    server = smtplib.SMTP_SSL(host, port, timeout=12)
                else:
                    server = smtplib.SMTP(host, port, timeout=12)
                    server.starttls()
                server.login(clean_user, pwd)
                server.quit()
                return {
                    "success": True,
                    "message": f"Kết nối và xác thực thành công tài khoản Gmail {clean_user}!",
                    "valid_password": pwd
                }
            except smtplib.SMTPAuthenticationError as auth_err:
                last_error = auth_err
            except Exception as exc:
                last_error = exc

        err_msg = str(last_error)
        is_bad_credentials = "535" in err_msg or "BadCredentials" in err_msg or "Username and Password not accepted" in err_msg
        if is_bad_credentials:
            return {
                "success": False,
                "error": "Google từ chối mật khẩu (BadCredentials / 535). Mật khẩu ứng dụng 16 chữ số không đúng hoặc đã hết hạn.",
                "hint": "Truy cập Google Account -> Bảo mật -> Xác minh 2 bước -> Mật khẩu ứng dụng để tạo mật khẩu 16 chữ số mới."
            }
        return {
            "success": False,
            "error": f"Lỗi kết nối máy chủ SMTP ({host}:{port}): {err_msg}"
        }

    def get_history(self, limit: int = 50) -> List[NotificationLog]:
        return list(reversed(self._history[-limit:]))

    def _generate_email_html(
        self,
        report: DiagnosticReport,
        plan: MitigationPlan,
        dashboard_url: str
    ) -> str:
        """Sinh giao diện email HTML chuyên nghiệp, chuẩn responsive và thương hiệu Veteran Home."""
        sev = report.overall_severity.upper()
        
        # Bảng màu theo mức độ nghiêm trọng
        sev_colors = {
            "CRITICAL": {"bg": "#e11d48", "text": "#ffffff", "border": "#be123c", "light": "#ffe4e6", "label": "NGUY CẤP"},
            "HIGH": {"bg": "#ea580c", "text": "#ffffff", "border": "#c2410c", "light": "#ffedd5", "label": "MỨC CAO"},
            "MEDIUM": {"bg": "#d97706", "text": "#ffffff", "border": "#b45309", "light": "#fef3c7", "label": "MỨC TRUNG BÌNH"},
            "LOW": {"bg": "#0284c7", "text": "#ffffff", "border": "#0369a1", "light": "#e0f2fe", "label": "THÔNG TIN"},
        }
        color = sev_colors.get(sev, sev_colors["MEDIUM"])

        # Danh sách thiết bị dạng bảng
        devices_rows = ""
        for d in report.affected_devices:
            ev_list = "".join(f"<li style='margin-bottom: 3px;'>{e}</li>" for e in d.evidence)
            devices_rows += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 12px; font-weight: 700; color: #1e293b; font-size: 13px;">{d.device_type}</td>
                <td style="padding: 10px 12px; color: #475569; font-size: 12.5px;">{d.location}</td>
                <td style="padding: 10px 12px; font-size: 12px;">
                    <span style="background-color: {color['light']}; color: {color['border']}; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-family: monospace; font-size: 11px;">
                        {d.fault_type}
                    </span>
                </td>
                <td style="padding: 10px 12px; color: #64748b; font-size: 12px;">
                    <ul style="margin: 0; padding-left: 16px;">{ev_list}</ul>
                </td>
            </tr>
            """

        # Danh sách quy trình đề xuất
        steps_html = "".join(
            f"""<li style="margin-bottom: 8px; line-height: 1.5; color: #334155;">
                <strong style="color: #0f172a;">Bước {idx+1}:</strong> {step}
            </li>"""
            for idx, step in enumerate(plan.recommended_steps)
        )

        html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Veteran Home - Cảnh Báo An Toàn & Đề Xuất Xử Lý</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #18181b; padding: 22px 28px; border-bottom: 4px solid #f59e0b;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px;">
                      🏠 VETERAN <span style="color: #f59e0b;">HOME</span>
                    </div>
                    <div style="font-size: 11px; color: #a1a1aa; font-family: -apple-system, sans-serif; margin-top: 3px; font-weight: 500;">
                      TRUNG TÂM GIÁM SÁT AN TOÀN & ĐIỀU HÀNH SMART HOME 24/7
                    </div>
                  </td>
                  <td align="right">
                    <span style="background-color: {color['bg']}; color: {color['text']}; padding: 5px 12px; border-radius: 20px; font-weight: 800; font-size: 11px; letter-spacing: 0.5px; font-family: monospace;">
                      {color.get('label', sev)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 24px 28px;">
              
              <!-- Resident Greeting & Incident Info -->
              <div style="margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; pb-3">
                <div style="font-size: 13px; color: #64748b; margin-bottom: 6px;">
                  Kính gửi Chủ Hộ: <strong style="color: #0f172a; font-size: 14px;">Nguyễn Văn Minh Tâm</strong>
                </div>
                <div style="font-size: 12px; color: #64748b; margin-bottom: 10px;">
                  Vị trí: <strong>Chung Cư EcoGreen - Căn Hộ 1204</strong> • Mã sự cố: <strong style="font-family: monospace; color: #0f172a;">{report.incident_id}</strong>
                </div>
                
                <h2 style="margin: 0 0 12px 0; font-size: 17px; font-weight: 800; color: #0f172a; line-height: 1.4;">
                  {plan.title}
                </h2>
                
                <!-- RCA Box -->
                <div style="background-color: {color['light']}; border-left: 4px solid {color['bg']}; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #1e293b; line-height: 1.5;">
                  <strong>📌 Chẩn đoán nguyên nhân gốc (RCA):</strong> {report.root_cause_summary}
                </div>
              </div>

              <!-- Affected Devices Table -->
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">
                  📡 Thiết Bị Cần Lưu Ý / Tiêu Thụ Cao ({len(report.affected_devices)})
                </h3>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 12px; border-collapse: collapse; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #f8fafc; text-align: left; border-bottom: 1px solid #e2e8f0;">
                      <th style="padding: 8px 12px; font-size: 11px; color: #475569; font-weight: 700;">THIẾT BỊ</th>
                      <th style="padding: 8px 12px; font-size: 11px; color: #475569; font-weight: 700;">VỊ TRÍ</th>
                      <th style="padding: 8px 12px; font-size: 11px; color: #475569; font-weight: 700;">TRẠNG THÁI</th>
                      <th style="padding: 8px 12px; font-size: 11px; color: #475569; font-weight: 700;">CHỈ SỐ ĐO ĐẠC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices_rows}
                  </tbody>
                </table>
              </div>

              <!-- Mitigation Steps -->
              <div style="margin-bottom: 26px;">
                <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">
                  📋 Quy Trình Xử Lý Đề Xuất (Action Plan)
                </h3>
                <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 14px 18px;">
                  <ol style="margin: 0; padding-left: 18px; font-size: 13px;">
                    {steps_html}
                  </ol>
                </div>
              </div>

              <!-- Primary CTA Action Button -->
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="{dashboard_url}" target="_blank" style="display: inline-block; background-color: #f59e0b; color: #1c1917; text-decoration: none; padding: 14px 28px; border-radius: 14px; font-weight: 800; font-size: 14px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35); transition: all 0.2s;">
                  👉 TRUY CẬP VETERAN HOME ĐỂ PHÊ DUYỆT / XỬ LÝ ➔
                </a>
                <div style="font-size: 11.5px; color: #71717a; margin-top: 8px;">
                  Bấm vào nút trên để mở trực tiếp giao diện điều khiển trên điện thoại hoặc máy tính.
                </div>
              </div>

            </td>
          </tr>

          <!-- Footer with KTV Contact & Hotline 0383371859 -->
          <tr>
            <td style="background-color: #fafafa; border-top: 1px solid #f4f4f5; padding: 18px 24px; font-size: 11.5px; color: #71717a; line-height: 1.6; text-align: center;">
              <div>
                Kỹ thuật viên phụ trách: <strong style="color: #18181b;">Nguyễn Văn Minh Tâm</strong> • Hotline: <strong style="color: #d97706; font-family: monospace; font-size: 12px;">0383371859</strong>
              </div>
              <div style="margin-top: 2px;">
                Email hỗ trợ: <strong style="color: #18181b;">nvmtamm@gmail.com</strong>
              </div>
              <div style="margin-top: 6px; font-size: 10.5px; color: #a1a1aa;">
                Thông báo tự động từ Hệ thống Trợ Lý Gia Đình Veteran Home (LangGraph L4 Multi-Agent Autonomous).
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
        return html

    def _generate_email_plain(
        self,
        report: DiagnosticReport,
        plan: MitigationPlan,
        dashboard_url: str
    ) -> str:
        """Sinh nội dung email dạng văn bản thuần (Plaintext Fallback)."""
        devices_text = "\n".join(
            f"- {d.device_type} ({d.location}) | Trạng thái: {d.fault_type}\n  Chỉ số: {'; '.join(d.evidence)}"
            for d in report.affected_devices
        )
        steps_text = "\n".join(
            f"{idx+1}. {step}"
            for idx, step in enumerate(plan.recommended_steps)
        )

        return f"""[VETERAN HOME - CẢNH BÁO AN TOÀN {report.overall_severity}]
===================================================================
Kính gửi Chủ Hộ: Nguyễn Văn Minh Tâm
Căn hộ: Chung Cư EcoGreen - Căn Hộ 1204
Mã sự cố: {report.incident_id}
Tiêu đề: {plan.title}

CHẨN ĐOÁN NGUYÊN NHÂN GỐC (RCA):
{report.root_cause_summary}

THIẾT BỊ BẤT THƯỜNG / CẦN TỐI ƯU ({len(report.affected_devices)}):
{devices_text}

QUY TRÌNH XỬ LÝ ĐỀ XUẤT:
{steps_text}

TRUY CẬP ĐIỀU KHIỂN & PHÊ DUYỆT TRỰC TIẾP:
{dashboard_url}
===================================================================
Kỹ thuật viên phụ trách: Nguyễn Văn Minh Tâm (Hotline: 0383371859 - Email: nvmtamm@gmail.com)
Hệ thống Trợ Lý Gia Đình Veteran Home.
"""

    def send_incident_alert(
        self,
        report: DiagnosticReport,
        plan: MitigationPlan,
        recipient_email: Optional[str] = None,
        recipient_emails: Optional[List[str]] = None,
        bypass_cooldown: bool = False
    ) -> NotificationLog:
        """
        Gửi email thông báo sự cố và kế hoạch xử lý đến danh sách người dùng.
        Tự động chọn giữa Live SMTP hoặc Simulated Mode.
        """
        if recipient_emails:
            target_emails = self.parse_email_list(recipient_emails)
        elif recipient_email:
            target_emails = self.parse_email_list(recipient_email)
        else:
            target_emails = self.recipient_emails

        if not target_emails:
            target_emails = ["user@smarthome.ai"]

        display_email = ", ".join(target_emails)
        notification_id = f"NOTIF-{uuid.uuid4().hex[:8].upper()}"
        subject = f"[VETERAN HOME - CẢNH BÁO {report.overall_severity}] {plan.title}"
        
        # Đảm bảo URL luôn sử dụng domain công khai hoặc cấu hình trong DASHBOARD_BASE_URL
        base_url = (getattr(self, "_custom_dashboard_base_url", None) or self.settings.DASHBOARD_BASE_URL or "http://localhost:8000").rstrip("/")
        dashboard_url = f"{base_url}/?incident_id={report.incident_id}"

        if not self.is_enabled:
            log = NotificationLog(
                notification_id=notification_id,
                incident_id=report.incident_id,
                recipient_email=display_email,
                recipient_emails=target_emails,
                subject=subject,
                status="DISABLED",
                delivery_mode="DISABLED",
                severity=report.overall_severity,
                dashboard_url=dashboard_url,
                error_message="Tính năng gửi email thông báo đang bị tắt trong cấu hình."
            )
            self._history.append(log)
            return log
        html_content = self._generate_email_html(report, plan, dashboard_url)
        plain_content = self._generate_email_plain(report, plan, dashboard_url)

        # Phân loại danh sách: người nhận thực tế vs email thử nghiệm/mô phỏng
        real_recipients = [e for e in target_emails if not is_mock_domain(e)]
        mock_recipients = [e for e in target_emails if is_mock_domain(e)]

        # Kiểm tra môi trường test (Pytest / CI)
        is_test_env = "PYTEST_CURRENT_TEST" in os.environ or os.environ.get("TESTING") == "true"

        # Kiểm tra Cooldown chống Spam (chỉ áp dụng với gửi SMTP Live cho sự cố thật, không áp dụng cho gửi thử test hoặc bypass)
        cooldown_key = f"{report.overall_severity}_{plan.title}"
        now_ts = time.time()
        last_sent = self._incident_cooldown.get(cooldown_key, 0.0)

        if not is_test_env and not bypass_cooldown and (now_ts - last_sent < INCIDENT_ALERT_COOLDOWN_SECONDS):
            logger.info(f"Cảnh báo '{subject}' đang trong thời gian Cooldown chống spam (15 phút). Bỏ qua gửi SMTP lặp lại.")
            log = NotificationLog(
                notification_id=notification_id,
                incident_id=report.incident_id,
                recipient_email=display_email,
                recipient_emails=target_emails,
                subject=f"[COOLDOWN] {subject}",
                status="SENT",
                delivery_mode="COOLDOWN_SUPPRESSED",
                severity=report.overall_severity,
                dashboard_url=dashboard_url,
                html_preview=html_content,
                error_message="Email đã được gửi gần đây. Hệ thống kích hoạt bộ lọc chống spam để bảo vệ hòm thư của bạn."
            )
            self._history.append(log)
            return log

        # Kiểm tra chế độ gửi: Live SMTP hay Simulated (Nếu chạy trong Pytest -> Tự động dùng SIMULATED)
        if self.is_smtp_configured and real_recipients and not is_test_env:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = self.settings.SMTP_FROM_EMAIL
                msg["To"] = ", ".join(real_recipients)

                part1 = MIMEText(plain_content, "plain", "utf-8")
                part2 = MIMEText(html_content, "html", "utf-8")
                msg.attach(part1)
                msg.attach(part2)

                # Kết nối SMTP Server
                host = self.settings.SMTP_HOST
                port = self.settings.SMTP_PORT
                user = (self.settings.SMTP_USER or "").strip()
                raw_pwd = (self.settings.SMTP_PASSWORD or "").strip()
                # Thử mật khẩu gốc và mật khẩu đã xóa khoảng trắng (chuẩn App Password của Google)
                pwds_to_try = [raw_pwd]
                if " " in raw_pwd:
                    pwds_to_try.append(raw_pwd.replace(" ", ""))

                logged_in = False
                last_auth_exc = None
                for pwd in pwds_to_try:
                    try:
                        if port == 465:
                            server = smtplib.SMTP_SSL(host, port, timeout=12)
                        else:
                            server = smtplib.SMTP(host, port, timeout=12)
                            server.starttls()
                        server.login(user, pwd)
                        logged_in = True
                        break
                    except smtplib.SMTPAuthenticationError as auth_err:
                        last_auth_exc = auth_err
                    except Exception as e:
                        last_auth_exc = e

                if not logged_in:
                    raise last_auth_exc or Exception("Không thể đăng nhập máy chủ SMTP.")

                server.sendmail(self.settings.SMTP_FROM_EMAIL, real_recipients, msg.as_string())
                server.quit()

                # Chỉ ghi nhận Cooldown khi gửi THÀNH CÔNG và không phải chế độ bypass
                if not is_test_env and not bypass_cooldown:
                    self._incident_cooldown[cooldown_key] = now_ts

                if mock_recipients:
                    logger.info(f"Đã gửi email qua SMTP đến {len(real_recipients)} người nhận thực ({', '.join(real_recipients)}) và mô phỏng {len(mock_recipients)} địa chỉ mẫu ({', '.join(mock_recipients)}).")
                else:
                    logger.info(f"Đã gửi email cảnh báo {notification_id} thành công qua SMTP đến {len(real_recipients)} recipients: {', '.join(real_recipients)}")

                log = NotificationLog(
                    notification_id=notification_id,
                    incident_id=report.incident_id,
                    recipient_email=display_email,
                    recipient_emails=target_emails,
                    subject=subject,
                    status="SENT",
                    delivery_mode="SMTP_LIVE",
                    severity=report.overall_severity,
                    dashboard_url=dashboard_url,
                    html_preview=html_content
                )
            except Exception as e:
                logger.error(f"Lỗi khi gửi email qua SMTP: {e}")
                err_msg = str(e)
                if "535" in err_msg or "BadCredentials" in err_msg or "Username and Password not accepted" in err_msg:
                    err_hint = "Google từ chối mật khẩu (535 BadCredentials). Vui lòng kiểm tra lại Mật khẩu ứng dụng 16 chữ số của Gmail."
                else:
                    err_hint = err_msg

                log = NotificationLog(
                    notification_id=notification_id,
                    incident_id=report.incident_id,
                    recipient_email=display_email,
                    recipient_emails=target_emails,
                    subject=subject,
                    status="FAILED",
                    delivery_mode="SMTP_LIVE",
                    severity=report.overall_severity,
                    dashboard_url=dashboard_url,
                    html_preview=html_content,
                    error_message=err_hint
                )
        else:
            # Chế độ Mô phỏng (Simulated Delivery)
            delivery_reason = "Email mẫu/thử nghiệm mô phỏng" if (self.is_smtp_configured and not real_recipients) else "Chưa cấu hình mật khẩu SMTP"
            logger.info(f"Chế độ mô phỏng ({delivery_reason}): Đã phát email cảnh báo {notification_id} đến {len(target_emails)} recipients: {display_email}")
            log = NotificationLog(
                notification_id=notification_id,
                incident_id=report.incident_id,
                recipient_email=display_email,
                recipient_emails=target_emails,
                subject=subject,
                status="SIMULATED",
                delivery_mode="SIMULATED",
                severity=report.overall_severity,
                dashboard_url=dashboard_url,
                html_preview=html_content
            )

        self._history.append(log)
        return log

    def send_test_email(
        self,
        recipient_email: Optional[str] = None,
        recipient_emails: Optional[List[str]] = None
    ) -> NotificationLog:
        """Gửi email thử nghiệm để kiểm tra cấu hình kết nối và mẫu giao diện đến một hoặc nhiều email."""
        from .schemas import DeviceFaultSummary
        mock_report = DiagnosticReport(
            incident_id=f"TEST-{uuid.uuid4().hex[:6].upper()}",
            home_occupied=False,
            overall_severity="HIGH",
            affected_devices=[
                DeviceFaultSummary(
                    device_id="HEATER_01",
                    device_type="Bình Nóng Lạnh Phòng Tắm",
                    location="Khu vực Phòng Tắm",
                    severity="HIGH",
                    fault_type="QUÁ_NHIỆT_THỬ_NGHIỆM",
                    description="Thử nghiệm kết nối hệ thống cảnh báo email tự động Veteran-Home.",
                    evidence=["Nhiệt độ thử nghiệm: 76.5°C", "Công suất tiêu thụ: 2452W"]
                )
            ],
            root_cause_summary="Đây là email kiểm tra tính năng gửi cảnh báo tự động từ Trung tâm Điều hành Đa Tác Tử Aegis-IoT."
        )
        mock_plan = MitigationPlan(
            incident_id=mock_report.incident_id,
            title="Thử Nghiệm Hệ Thống Cảnh Báo Email & Phê Duyệt Tác Vụ",
            explanation="Kiểm tra kết nối và khả năng mở Dashboard trực tiếp từ liên kết trong email.",
            recommended_steps=[
                "Xác nhận nhận được email thử nghiệm thành công.",
                "Nhấn nút mở Dashboard bên dưới để kiểm tra chuyển hướng.",
                "Lưu lại cấu hình email người nhận chính thức."
            ],
            action_buttons=[],
            requires_human_approval=True
        )
        return self.send_incident_alert(
            mock_report,
            mock_plan,
            recipient_email=recipient_email,
            recipient_emails=recipient_emails,
            bypass_cooldown=True
        )
