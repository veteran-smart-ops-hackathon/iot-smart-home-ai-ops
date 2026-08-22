import pytest
import json
import time
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from backend.app import app
from pre_progressor import get_mqtt_gateway, STANDARD_DEVICES, KalmanFilter1D

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def gateway():
    gw = get_mqtt_gateway()
    return gw

def test_standard_devices_catalog():
    """Kiểm tra danh mục 6 thiết bị chuẩn Track A."""
    expected_codes = ["AC_01", "SENSOR_01", "METER_01", "CO2_01", "HEATER_01", "LIGHT_01"]
    for code in expected_codes:
        assert code in STANDARD_DEVICES
        meta = STANDARD_DEVICES[code]
        assert "name" in meta
        assert "location" in meta
        assert "expected_metrics" in meta
        assert len(meta["expected_metrics"]) > 0

def test_kalman_filter_smoothing():
    """Kiểm tra bộ lọc Kalman làm mịn dữ liệu nhiễu."""
    kf = KalmanFilter1D(process_noise=0.05, measurement_noise=0.8, initial_value=20.0)
    
    # Đo đạc có nhiễu
    measurements = [20.8, 21.9, 21.2, 22.5, 21.0]
    smoothed = []
    for m in measurements:
        s = kf.update(m)
        smoothed.append(s)
        assert isinstance(s, float)
    
    # Đảm bảo giá trị hội tụ ổn định
    assert 20.0 <= smoothed[-1] <= 23.0

def test_mqtt_gateway_payload_ingestion(gateway):
    """Kiểm tra khả năng nhận dạng và bóc tách gói tin MQTT mẫu từ BTC."""
    sample_payloads = [
        {
            "topic": "hackathon/smarthome/AC_01/telemetry",
            "payload": {
                "device_code": "AC_01",
                "device_name": "Máy lạnh phòng khách",
                "status": "NORMAL",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "power": 1229,
                "temperature": 20.8
            }
        },
        {
            "topic": "hackathon/smarthome/CO2_01/telemetry",
            "payload": {
                "device_code": "CO2_01",
                "device_name": "Cảm biến CO₂ phòng ngủ",
                "status": "NORMAL",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "co2": 1016
            }
        },
        {
            "topic": "hackathon/smarthome/METER_01/telemetry",
            "payload": {
                "device_code": "METER_01",
                "device_name": "Đồng hồ điện tổng",
                "status": "NORMAL",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "voltage": 223.3,
                "current": 13.26,
                "power": 3982
            }
        }
    ]

    class MockMQTTMessage:
        def __init__(self, topic: str, payload_dict: dict):
            self.topic = topic
            self.payload = json.dumps(payload_dict).encode("utf-8")

    for item in sample_payloads:
        msg = MockMQTTMessage(item["topic"], item["payload"])
        gateway._on_message(None, None, msg)

    # Kiểm tra trạng thái lưu trữ của AC_01
    ac_state = gateway.get_device("AC_01")
    assert ac_state is not None
    assert ac_state["device_code"] == "AC_01"
    assert ac_state["metrics"]["power"] == 1229
    assert ac_state["metrics"]["temperature"] == 20.8
    assert "kalman_temperature" in ac_state["smoothed_metrics"]

    # Kiểm tra CO2_01
    co2_state = gateway.get_device("CO2_01")
    assert co2_state is not None
    assert co2_state["metrics"]["co2"] == 1016

    # Kiểm tra METER_01
    meter_state = gateway.get_device("METER_01")
    assert meter_state is not None
    assert meter_state["metrics"]["voltage"] == 223.3
    assert meter_state["metrics"]["power"] == 3982

def test_mqtt_api_endpoints(client):
    """Kiểm tra các REST API endpoint quản lý MQTT."""
    # 1. API Status
    resp_status = client.get("/api/mqtt/status")
    assert resp_status.status_code == 200
    data_status = resp_status.json()
    assert "host" in data_status
    assert "port" in data_status
    assert "total_standard_devices" in data_status
    assert data_status["total_standard_devices"] == 6

    # 2. API Devices
    resp_devs = client.get("/api/mqtt/devices")
    assert resp_devs.status_code == 200
    data_devs = resp_devs.json()
    assert "devices" in data_devs
    assert "AC_01" in data_devs["devices"]
    assert "SENSOR_01" in data_devs["devices"]
    assert "METER_01" in data_devs["devices"]
    assert "CO2_01" in data_devs["devices"]
    assert "HEATER_01" in data_devs["devices"]
    assert "LIGHT_01" in data_devs["devices"]

    # 3. API Single Device
    resp_ac = client.get("/api/mqtt/device/AC_01")
    assert resp_ac.status_code == 200
    data_ac = resp_ac.json()
    assert data_ac["device"]["device_code"] == "AC_01"

    # 4. API Non-existent Device
    resp_err = client.get("/api/mqtt/device/UNKNOWN_999")
    assert resp_err.status_code == 404
