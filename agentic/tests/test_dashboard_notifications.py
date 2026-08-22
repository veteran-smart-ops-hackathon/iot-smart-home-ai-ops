import unittest
from fastapi.testclient import TestClient
from backend.app import app

class TestDashboardNotificationAPI(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_get_and_update_notification_settings(self):
        # 1. Get current settings
        res = self.client.get("/api/notifications/settings")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("recipient_email", data)
        self.assertIn("enabled", data)

        # 2. Update settings
        update_res = self.client.post("/api/notifications/settings", json={
            "recipient_email": "custom_homeowner@smarthome.ai",
            "enabled": True
        })
        self.assertEqual(update_res.status_code, 200)
        update_data = update_res.json()
        self.assertEqual(update_data["status"], "SUCCESS")
        self.assertEqual(update_data["settings"]["recipient_email"], "custom_homeowner@smarthome.ai")

    def test_send_test_email_endpoint(self):
        res = self.client.post("/api/notifications/test", json={
            "recipient_email": "test_api@smarthome.ai"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn(data["status"], ["SENT", "SIMULATED", "FAILED"])
        self.assertEqual(data["notification"]["recipient_email"], "test_api@smarthome.ai")

    def test_notification_history_endpoint(self):
        # Trigger an email first to ensure history is populated
        self.client.post("/api/notifications/test", json={"recipient_email": "history_check@smarthome.ai"})
        res = self.client.get("/api/notifications/history")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("history", data)
        self.assertIsInstance(data["history"], list)
        self.assertGreaterEqual(len(data["history"]), 1)

    def test_simulate_anomaly_triggers_email(self):
        res = self.client.post("/api/simulate-anomaly", json={"scenario": "heater_overheat"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("email_notification", data)
        self.assertIsNotNone(data["email_notification"])
        self.assertIn(data["email_notification"]["status"], ["SENT", "SIMULATED", "FAILED"])


if __name__ == "__main__":
    unittest.main()
