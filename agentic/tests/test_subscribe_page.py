import unittest
from fastapi.testclient import TestClient
from backend.app import app, orchestrator

class TestSubscribePageAndAPI(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_get_subscribe_pages(self):
        for route in ["/subscribe", "/alerts", "/user", "/notify"]:
            res = self.client.get(route)
            self.assertEqual(res.status_code, 200)
            self.assertIn("text/html", res.headers["content-type"])
            self.assertTrue("root" in res.text or "user-email" in res.text)

    def test_post_subscribe_email_valid(self):
        res = self.client.post("/api/subscribe-email", json={
            "email": "user_homeowner@example.com"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertEqual(data["recipient_email"], "user_homeowner@example.com")
        self.assertIn("notification", data)
        self.assertEqual(data["notification"]["recipient_email"], "user_homeowner@example.com")

        # Verify orchestrator recipient was updated
    def test_post_subscribe_multiple_emails(self):
        res = self.client.post("/api/subscribe-email", json={
            "email": "owner@smarthome.ai, engineer@smarthome.ai, manager@domain.com"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertEqual(data["total_recipients"], 3)
        self.assertEqual(len(data["recipient_emails"]), 3)
        self.assertIn("owner@smarthome.ai", data["recipient_emails"])
        self.assertIn("engineer@smarthome.ai", data["recipient_emails"])
        self.assertIn("manager@domain.com", data["recipient_emails"])

    def test_add_and_remove_recipient_endpoints(self):
        # 1. Add recipient
        res1 = self.client.post("/api/notifications/recipients/add", json={"email": "new_guest@smarthome.ai"})
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertIn("new_guest@smarthome.ai", data1["settings"]["recipient_emails"])

        # 2. Remove recipient
        res2 = self.client.post("/api/notifications/recipients/remove", json={"email": "new_guest@smarthome.ai"})
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertNotIn("new_guest@smarthome.ai", data2["settings"]["recipient_emails"])

    def test_post_subscribe_email_invalid(self):
        # Empty string
        res1 = self.client.post("/api/subscribe-email", json={"email": ""})
        self.assertEqual(res1.status_code, 400)
        self.assertIn("error", res1.json())

        # Missing @
        res2 = self.client.post("/api/subscribe-email", json={"email": "invalidemail.com"})
        self.assertEqual(res2.status_code, 400)

        # Missing domain dot
        res3 = self.client.post("/api/subscribe-email", json={"email": "invalid@com"})
        self.assertEqual(res3.status_code, 400)

if __name__ == "__main__":
    unittest.main()
