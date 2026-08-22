#!/usr/bin/env python3
"""
MQTT Telemetry Test Client & Ingestion Gateway
Hỗ trợ kiểm tra kết nối Broker chính thức của Hackathon, đọc luồng dữ liệu 6 thiết bị Smart Home.
"""

import sys
import os
import json
import time
import argparse
from datetime import datetime
from typing import Dict, Any, Optional

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("❌ Thiếu thư viện paho-mqtt. Hãy chạy: pip install paho-mqtt")
    sys.exit(1)

DEFAULT_TOPICS = [
    "hackathon/smarthome/+/telemetry",
    "hackathon/smarthome/AC_01/telemetry",
    "hackathon/smarthome/SENSOR_01/telemetry",
    "hackathon/smarthome/METER_01/telemetry",
    "hackathon/smarthome/CO2_01/telemetry",
    "hackathon/smarthome/HEATER_01/telemetry",
    "hackathon/smarthome/LIGHT_01/telemetry",
    "hackathon/veteran/test/telemetry",
    "hackathon/#"
]

class MQTTTelemetryTester:
    def __init__(
        self,
        host: str = "mqtt-hackathon.lexatek.vn",
        port: int = 443,
        username: Optional[str] = "VETERAN",
        password: Optional[str] = "mq_fEMRpHqjWO6IqX3U_TTy-Q",
        topics: Optional[list] = None,
        use_tls: bool = True,
        transport: str = "websockets",
        ws_path: str = "/mqtt"
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.topics = topics or DEFAULT_TOPICS
        self.use_tls = use_tls
        self.transport = transport
        self.ws_path = ws_path
        self.received_count = 0
        self.device_data: Dict[str, Any] = {}
        self.start_time = time.time()

        callback_api_ver = getattr(mqtt, "CallbackAPIVersion", None)
        if callback_api_ver is not None:
            self.client = mqtt.Client(
                callback_api_version=callback_api_ver.VERSION2,
                client_id=f"veteran-test-{int(time.time())}",
                transport=self.transport
            )
        else:
            self.client = mqtt.Client(client_id=f"veteran-test-{int(time.time())}", transport=self.transport)

        if self.username and self.password:
            self.client.username_pw_set(self.username, self.password)

        if self.use_tls or self.port in [443, 8883]:
            import ssl
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            self.client.tls_set_context(context)

        if self.transport == "websockets" and self.ws_path:
            self.client.ws_set_options(path=self.ws_path)

        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect
        self.client.on_subscribe = self._on_subscribe

    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        rc_val = getattr(reason_code, "value", reason_code)
        if rc_val == 0 or str(reason_code).lower() in ["success", "0"]:
            print(f"\n✅ [KẾT NỐI THÀNH CÔNG] Đã kết nối tới MQTT Broker: {self.host}:{self.port} ({self.transport})")
            print(f"📡 Đang đăng ký lắng nghe (Subscribe) các topic Smart Home...")
            for topic in self.topics:
                res, mid = client.subscribe(topic, qos=1)
                print(f"   ➕ Đăng ký topic: {topic} (mid={mid})")
        else:
            print(f"\n❌ [KẾT NỐI THẤT BẠI] Broker từ chối kết nối. Reason Code: {reason_code}")

    def _on_subscribe(self, client, userdata, mid, granted_qos, properties=None):
        print(f"   🎯 Xác nhận đăng ký topic thành công (mid={mid}, qos={granted_qos})")

    def _on_disconnect(self, client, userdata, *args):
        print(f"\n⚠️ [NGẮT KẾT NỐI] Đã ngắt kết nối với Broker.")

    def _on_message(self, client, userdata, message):
        self.received_count += 1
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        try:
            payload_raw = message.payload.decode("utf-8")
            data = json.loads(payload_raw)
        except Exception:
            payload_raw = str(message.payload)
            data = {"raw": payload_raw}

        # Xử lý nếu là dạng mảng devices
        if isinstance(data, dict) and "devices" in data and isinstance(data["devices"], list):
            scenario = data.get("scenario", "NORMAL")
            team = data.get("teamCode", "VETERAN")
            ts = data.get("timestamp", now_str)
            print(f"\n📦 [GÓI BATCH #{self.received_count}] | {now_str} | TOPIC: {message.topic} | Team: {team} | Scenario: {scenario}")
            for d in data["devices"]:
                d_code = d.get("deviceCode", "UNKNOWN")
                d_metrics = d.get("metrics", {})
                self.device_data[d_code] = {"timestamp": ts, "metrics": d_metrics, "status": d.get("status", "ok")}
                metric_strs = [f"{k}: {v}" for k, v in d_metrics.items()]
                print(f"   🔹 [{d_code}] Status: {d.get('status')} | Metrics: {' | '.join(metric_strs)}")
            return

        device_code = data.get("device_code") or data.get("deviceCode") or (message.topic.split("/")[-2] if "smarthome" in message.topic else "UNKNOWN")
        self.device_data[device_code] = data

        print("\n" + "=" * 80)
        print(f"📥 [GÓI DỮ LIỆU #{self.received_count}] | {now_str} | TOPIC: {message.topic}")
        print(f"🏷️ Thiết bị: {data.get('device_name', device_code)} ({device_code}) | Trạng thái: {data.get('status', 'N/A')}")
        
        metrics = []
        if "power" in data: metrics.append(f"Công suất: {data['power']} W")
        if "temperature" in data: metrics.append(f"Nhiệt độ: {data['temperature']} °C")
        if "humidity" in data: metrics.append(f"Độ ẩm: {data['humidity']} %")
        if "voltage" in data: metrics.append(f"Điện áp: {data['voltage']} V")
        if "current" in data: metrics.append(f"Dòng điện: {data['current']} A")
        if "co2" in data: metrics.append(f"Nồng độ CO2: {data['co2']} ppm")
        if "lux" in data: metrics.append(f"Độ rọi sáng: {data['lux']} lx")
        
        if metrics:
            print("📊 Chỉ số: " + " | ".join(metrics))
        print(f"📦 JSON Payload: {json.dumps(data, ensure_ascii=False, indent=2)}")
        print("=" * 80)

    def run(self, duration_sec: int = 15):
        print(f"🚀 Bắt đầu kiểm tra kết nối MQTT Broker tại {self.host}:{self.port} ({self.transport})...")
        print(f"👤 Username: {self.username}")
        print(f"🔑 Password: {'*' * len(self.password) if self.password else 'None'}")
        
        try:
            self.client.connect(self.host, self.port, keepalive=60)
            self.client.loop_start()
            
            print(f"⏳ Đang lắng nghe dữ liệu trong {duration_sec} giây (Nhấn Ctrl+C để dừng)...")
            start = time.time()
            while time.time() - start < duration_sec:
                time.sleep(0.5)
                
        except KeyboardInterrupt:
            print("\n🛑 Người dùng dừng lắng nghe.")
        except Exception as e:
            print(f"\n❌ Lỗi kết nối MQTT: {e}")
        finally:
            self.client.loop_stop()
            self.client.disconnect()
            print(f"\n📊 TỔNG KẾT: Đã nhận được {self.received_count} bản tin từ {len(self.device_data)} thiết bị.")
            if self.device_data:
                print("📋 Danh sách thiết bị đã nhận diện:")
                for d_code, val in self.device_data.items():
                    print(f"   - {d_code}: {val.get('device_name', '')} (timestamp: {val.get('timestamp', 'N/A')}) | {val.get('metrics', {})}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Kiểm tra kết nối MQTT và Ingestion cho Smart Home Track A")
    parser.add_argument("--host", default="mqtt-hackathon.lexatek.vn", help="Địa chỉ MQTT Broker Host")
    parser.add_argument("--port", type=int, default=443, help="Cổng MQTT (443 WSS hoặc 1883)")
    parser.add_argument("--user", default="VETERAN", help="Username MQTT")
    parser.add_argument("--password", default="mq_fEMRpHqjWO6IqX3U_TTy-Q", help="Mật khẩu MQTT")
    parser.add_argument("--transport", default="websockets", help="Transport protocol (websockets hoặc tcp)")
    parser.add_argument("--tls", action="store_true", default=True, help="Bật kết nối bảo mật TLS/SSL")
    parser.add_argument("--duration", type=int, default=10, help="Thời gian chạy thử (giây)")
    
    args = parser.parse_args()
    
    tester = MQTTTelemetryTester(
        host=args.host,
        port=args.port,
        username=args.user,
        password=args.password,
        use_tls=args.tls,
        transport=args.transport
    )
    tester.run(duration_sec=args.duration)
