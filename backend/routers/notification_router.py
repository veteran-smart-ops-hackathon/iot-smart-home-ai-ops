"""
backend/routers/notification_router.py
Email Notification Dispatcher and Subscription endpoints.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.dependencies import get_orchestrator

logger = logging.getLogger("NotificationRouter")

router = APIRouter(tags=["Notifications"])


class NotificationUpdateRequest(BaseModel):
    recipient_email: Optional[str] = None
    recipient_emails: Optional[List[str]] = None
    enabled: Optional[bool] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None


class VerifySmtpRequest(BaseModel):
    smtp_user: str
    smtp_password: str
    smtp_host: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 587


class TestEmailRequest(BaseModel):
    recipient_email: Optional[str] = None
    recipient_emails: Optional[List[str]] = None


class SubscribeEmailRequest(BaseModel):
    email: Optional[str] = None
    emails: Optional[List[str]] = None


class RecipientActionRequest(BaseModel):
    email: str


@router.get("/api/notifications/settings")
async def get_notification_settings(orchestrator=Depends(get_orchestrator)):
    """
    Returns current email notification configuration and status.
    """
    settings = orchestrator.notification_service.get_settings_summary()
    return JSONResponse(content=settings.model_dump())


@router.post("/api/notifications/settings")
async def update_notification_settings(
    req: NotificationUpdateRequest,
    orchestrator=Depends(get_orchestrator)
):
    """
    Updates recipient emails, SMTP credentials, and toggle state for automated incident email alerts.
    """
    updated = orchestrator.notification_service.update_settings(
        recipient_email=req.recipient_email,
        recipient_emails=req.recipient_emails,
        enabled=req.enabled,
        smtp_user=req.smtp_user,
        smtp_password=req.smtp_password,
        smtp_from_email=req.smtp_from_email,
        smtp_host=req.smtp_host,
        smtp_port=req.smtp_port
    )
    return JSONResponse(content={
        "status": "SUCCESS",
        "message": "Đã cập nhật cấu hình thông báo email thành công.",
        "settings": updated.model_dump()
    })


@router.post("/api/notifications/verify-smtp")
async def verify_smtp_credentials(
    req: VerifySmtpRequest,
    orchestrator=Depends(get_orchestrator)
):
    """
    Tests SMTP connection & authentication with provided credentials without saving.
    """
    res = orchestrator.notification_service.verify_smtp_credentials(
        user=req.smtp_user,
        password=req.smtp_password,
        host=req.smtp_host or "smtp.gmail.com",
        port=req.smtp_port or 587
    )
    status_code = 200 if res.get("success") else 400
    return JSONResponse(status_code=status_code, content=res)


@router.post("/api/notifications/recipients/add")
async def add_notification_recipient(
    req: RecipientActionRequest,
    orchestrator=Depends(get_orchestrator)
):
    """
    Adds a new recipient email to the alert distribution list.
    """
    clean_email = (req.email or "").strip().lower()
    if not clean_email or "@" not in clean_email or "." not in clean_email:
        return JSONResponse(
            status_code=400,
            content={"status": "ERROR", "error": "Địa chỉ email không hợp lệ."}
        )
    orchestrator.notification_service.add_recipient_email(clean_email)
    summary = orchestrator.notification_service.get_settings_summary()
    return JSONResponse(content={
        "status": "SUCCESS",
        "message": f"Đã thêm {clean_email} vào danh sách nhận cảnh báo.",
        "settings": summary.model_dump()
    })


@router.post("/api/notifications/recipients/remove")
async def remove_notification_recipient(
    req: RecipientActionRequest,
    orchestrator=Depends(get_orchestrator)
):
    """
    Removes a recipient email from the alert distribution list.
    """
    clean_email = (req.email or "").strip().lower()
    orchestrator.notification_service.remove_recipient_email(clean_email)
    summary = orchestrator.notification_service.get_settings_summary()
    return JSONResponse(content={
        "status": "SUCCESS",
        "message": f"Đã xóa {clean_email} khỏi danh sách nhận cảnh báo.",
        "settings": summary.model_dump()
    })


@router.get("/api/notifications/history")
async def get_notification_history(orchestrator=Depends(get_orchestrator)):
    """
    Returns historical log of dispatched incident email alerts.
    """
    history = orchestrator.notification_service.get_history(limit=50)
    return JSONResponse(content={
        "total": len(history),
        "history": [h.model_dump() for h in history]
    })


@router.post("/api/notifications/test")
async def send_test_notification(
    req: TestEmailRequest = TestEmailRequest(),
    orchestrator=Depends(get_orchestrator)
):
    """
    Sends a test alert email to verify template formatting and SMTP/Simulated connectivity.
    """
    targets = req.recipient_emails or (req.recipient_email.split(",") if req.recipient_email else None)
    log = orchestrator.notification_service.send_test_email(
        recipient_emails=targets,
        recipient_email=req.recipient_email
    )
    return JSONResponse(content={
        "status": log.status,
        "delivery_mode": log.delivery_mode,
        "message": f"Đã gửi email thử nghiệm đến {log.recipient_email} (Chế độ: {log.delivery_mode})",
        "notification": log.model_dump()
    })


@router.post("/api/subscribe-email")
async def subscribe_email(
    req: SubscribeEmailRequest,
    orchestrator=Depends(get_orchestrator)
):
    """
    Subscribes one or more user emails for instant incident alerts and dispatches test alerts immediately.
    """
    input_source = req.emails if req.emails else req.email
    parsed_emails = orchestrator.notification_service.parse_email_list(input_source)

    if not parsed_emails:
        return JSONResponse(
            status_code=400,
            content={"status": "ERROR", "error": "Vui lòng nhập ít nhất một địa chỉ email hợp lệ (ví dụ: user@example.com, engineer@domain.com)."}
        )

    # 1. Update recipient email list in notification service
    orchestrator.notification_service.set_recipient_emails(parsed_emails)
    orchestrator.notification_service.update_settings(enabled=True)

    # 2. Immediately dispatch a test alert email to all registered recipients
    notif_log = orchestrator.notification_service.send_test_email(recipient_emails=parsed_emails)

    return JSONResponse(content={
        "status": "SUCCESS",
        "message": f"Đã đăng ký {len(parsed_emails)} email và phát cảnh báo thành công!",
        "recipient_emails": parsed_emails,
        "recipient_email": ", ".join(parsed_emails),
        "total_recipients": len(parsed_emails),
        "notification": notif_log.model_dump()
    })
