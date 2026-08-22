import unittest
from agentic.schemas import (
    DeviceMLReading,
    DeviceFaultSummary,
    DiagnosticReport,
    MitigationPlan,
    ActionButton,
    NotificationLog
)
from agentic.notification_service import EmailNotificationService
from agentic.orchestrator import OrchestratorAgent
from config import Settings

class TestEmailNotificationService(unittest.TestCase):

    def setUp(self):
        self.mock_settings = Settings(
            _env_file=None,
            EMAIL_NOTIFICATION_ENABLED=True,
            SMTP_HOST="smtp.gmail.com",
            SMTP_PORT=587,
            SMTP_USER="",
            SMTP_PASSWORD="",
            SMTP_FROM_EMAIL="aegis-iot@smarthome.ai",
            ALERT_RECIPIENT_EMAIL="tester@smarthome.ai",
            ALERT_RECIPIENT_EMAILS="",
            DASHBOARD_BASE_URL="http://localhost:8000"
        )
        self.service = EmailNotificationService(settings=self.mock_settings)

        self.mock_report = DiagnosticReport(
            incident_id="INC-TEST001",
            home_occupied=False,
            overall_severity="CRITICAL",
            affected_devices=[
                DeviceFaultSummary(
                    device_id="HEATER_01",
                    device_type="Bình Nóng Lạnh Phòng Tắm",
                    location="Khu vực Phòng Tắm",
                    severity="CRITICAL",
                    fault_type="QUÁ_NHIỆT_NGHIÊM_TRỌNG",
                    description="Phát hiện tích tụ nhiệt bất thường 76.5°C.",
                    evidence=["Nhiệt độ đo được: 76.5°C", "Công suất: 2452W"]
                )
            ],
            root_cause_summary="Bình nóng lạnh đang chạy công suất lớn khi vắng nhà, nguy cơ quá nhiệt."
        )

        self.mock_plan = MitigationPlan(
            incident_id="INC-TEST001",
            title="Cảnh Báo Khẩn: Bình Nóng Lạnh Quá Nhiệt Vắng Nhà",
            explanation="Ngắt nguồn khẩn cấp ngay lập tức để bảo vệ an toàn.",
            recommended_steps=[
                "Cách ly nguồn điện khẩn cấp đến Bình nóng lạnh HEATER_01.",
                "Chuyển toàn bộ hệ thống sang Chế độ Vắng Nhà.",
                "Gửi thông báo cảnh báo đến điện thoại chủ nhà."
            ],
            action_buttons=[
                ActionButton(
                    button_id="btn-shutdown-001",
                    title="Ngắt Nguồn Khẩn Cấp Bình Nóng Lạnh",
                    action_type="POWER_OFF_HEATER",
                    target_devices=["HEATER_01"],
                    mqtt_topic="iot/devices/control",
                    mqtt_payload={"command": "POWER_OFF", "device_id": "HEATER_01"},
                    style="danger"
                )
            ],
            requires_human_approval=True
        )

    def test_simulated_delivery_when_smtp_unconfigured(self):
        self.assertFalse(self.service.is_smtp_configured)
        log = self.service.send_incident_alert(self.mock_report, self.mock_plan)

        self.assertTrue(log.notification_id.startswith("NOTIF-"))
        self.assertEqual(log.incident_id, "INC-TEST001")
        self.assertEqual(log.recipient_email, "tester@smarthome.ai")
        self.assertEqual(log.status, "SIMULATED")
        self.assertEqual(log.delivery_mode, "SIMULATED")
        self.assertEqual(log.severity, "CRITICAL")
        self.assertIn("INC-TEST001", log.dashboard_url)
        self.assertIn("76.5°C", log.html_preview)
        self.assertIn("TRUY CẬP VETERAN HOME ĐỂ PHÊ DUYỆT", log.html_preview)

    def test_disabled_notification(self):
        self.service.update_settings(enabled=False)
        self.assertFalse(self.service.is_enabled)

        log = self.service.send_incident_alert(self.mock_report, self.mock_plan)
        self.assertEqual(log.status, "DISABLED")
        self.assertEqual(log.delivery_mode, "DISABLED")

    def test_update_recipient_and_test_email(self):
        updated = self.service.update_settings(recipient_email="engineer@smarthome.ai")
        self.assertEqual(updated.recipient_email, "engineer@smarthome.ai")
        self.assertEqual(self.service.recipient_email, "engineer@smarthome.ai")

        test_log = self.service.send_test_email(recipient_email="engineer@smarthome.ai")
        self.assertEqual(test_log.recipient_email, "engineer@smarthome.ai")
        self.assertIn("Thử Nghiệm", test_log.subject)

        history = self.service.get_history(limit=10)
        self.assertGreaterEqual(len(history), 1)

    def test_multi_recipient_management(self):
        # 1. Set multiple recipients
        emails = self.service.set_recipient_emails(["user1@smarthome.ai", "user2@smarthome.ai", "engineer@domain.com"])
        self.assertEqual(len(emails), 3)
        self.assertIn("user1@smarthome.ai", emails)
        self.assertIn("engineer@domain.com", emails)

        # 2. Add recipient
        updated = self.service.add_recipient_email("manager@domain.com")
        self.assertEqual(len(updated), 4)
        self.assertIn("manager@domain.com", updated)

        # 3. Remove recipient
        after_remove = self.service.remove_recipient_email("user2@smarthome.ai")
        self.assertEqual(len(after_remove), 3)
        self.assertNotIn("user2@smarthome.ai", after_remove)

        # 4. Dispatch incident alert to all recipients
        log = self.service.send_incident_alert(self.mock_report, self.mock_plan)
        self.assertEqual(len(log.recipient_emails), 3)
        self.assertEqual(log.status, "SIMULATED")

    def test_orchestrator_integration(self):
        orchestrator = OrchestratorAgent(notification_service=self.service)
        readings = [
            DeviceMLReading(
                device_id="HEATER_01",
                device_type="water_heater",
                location="bathroom",
                is_anomaly=True,
                anomaly_score=0.96,
                metrics={"power_watts": 2452.0, "temp_c": 76.5},
                presence_detected=False
            )
        ]

        result = orchestrator.process_incident(readings, scenario="heater_overheat")

        self.assertIn("email_notification", result)
        self.assertIsNotNone(result["email_notification"])
        email_info = result["email_notification"]
        self.assertEqual(email_info["status"], "SIMULATED")
        self.assertEqual(email_info["recipient_email"], "tester@smarthome.ai")

        # Verify trace step was recorded for HomeActionVerificationAgent
        traces = result["agent_execution_traces"]
        action_trace = next((t for t in traces if "HomeActionVerificationAgent" in t["agent_name"]), None)
        self.assertIsNotNone(action_trace)
        self.assertEqual(action_trace["status"], "COMPLETED")

if __name__ == "__main__":
    unittest.main()
