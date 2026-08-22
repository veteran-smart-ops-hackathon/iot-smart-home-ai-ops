import pytest
from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

def test_get_verified_plans_history():
    res = client.get("/api/history/verified-plans")
    assert res.status_code == 200
    data = res.json()
    assert "records" in data
    assert "stats" in data
    assert data["stats"]["qdrant_collection"] == "verified_action_plans"
    assert data["stats"]["vector_dims"] == 1024

def test_execute_action_and_audit_history():
    # Execute an action button
    btn_payload = {
        "button_id": "btn-test-pytest",
        "title": "Ngắt nguồn thử nghiệm",
        "action_type": "POWER_OFF_HEATER",
        "target_devices": ["HEATER_01"],
        "mqtt_topic": "iot/devices/control",
        "mqtt_payload": {"command": "POWER_OFF", "targets": ["HEATER_01"]},
        "style": "danger"
    }
    res = client.post("/api/execute-action", json=btn_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "EXECUTED"
    assert data["qdrant_sync"]["status"] == "UPSERTED_SUCCESS"
    assert "record" in data
    rec_id = data["record"]["record_id"]

    # Verify that record can be retrieved
    res_detail = client.get(f"/api/history/verified-plans/{rec_id}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["record"]["record_id"] == rec_id

def test_filter_and_search_history():
    # Filter by severity
    res = client.get("/api/history/verified-plans?severity=CRITICAL")
    assert res.status_code == 200
    for r in res.json()["records"]:
        assert r["severity"] == "CRITICAL"

    # Search keyword
    res_kw = client.get("/api/history/verified-plans?search=Bình")
    assert res_kw.status_code == 200
