#!/usr/bin/env python3
"""
🚀 Mock IoT MQTT Telemetry Generator & Anomaly Simulator
Mô phỏng dữ liệu cảm biến IoT Smart Home (Track A) đẩy trực tiếp lên MQTT Broker.
Hỗ trợ cả chế độ Normal và Anomaly Trigger (Overheat, Power Surge, CO2 Spike).
"""

import sys
import json
import time
import random
import argparse
from datetime import datetime

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("❌ Thiếu thư viện paho-mqtt. Hãy cài đặt: pip install paho-mqtt")
    sys.exit(1)

def generate_telemetry(device_type: str, anomaly_mode: str = "none") -> dict:
    now_iso = datetime.now().astimezone().isoformat()
    
    if device_type == "AC_01":
        is_anomaly = anomaly_mode in ["overheat", "all"]
        temp = round(random.uniform(34.0, 42.5), 1) if is_anomaly else round(random.uniform(25.5, 26.5), 1)
        power = round(random.uniform(2200, 3500), 1) if is_anomaly else round(random.uniform(220, 320), 1)
        return {
            "topic": "hackathon/smarthome/AC_01/telemetry",
            "payload": {
                "device_code": "AC_01",
                "device_name": "Điều hòa Phòng Khách",
                "status": "ANOMALY" if is_anomaly else "NORMAL",
                "timestamp": now_iso,
                "power": power,
                "temperature": temp
            }
        }
        
    elif device_type == "SENSOR_01":
        is_anomaly = anomaly_mode in ["overheat", "all"]
        temp = round(random.uniform(35.0, 41.0), 1) if is_anomaly else round(random.uniform(25.8, 26.5), 1)
        hum = round(random.uniform(85.0, 95.0), 1) if is_anomaly else round(random.uniform(55.0, 62.0), 1)
        return {
            "topic": "hackathon/smarthome/SENSOR_01/telemetry",
            "payload": {
                "device_code": "SENSOR_01",
                "device_name": "Cảm biến Nhiệt & Độ Ẩm",
                "status": "ANOMALY" if is_anomaly else "NORMAL",
                "timestamp": now_iso,
                "temperature": temp,
                "humidity": hum
            }
        }

    elif device_type == "METER_01":
        is_anomaly = anomaly_mode in ["power_surge", "all"]
        power = round(random.uniform(6500, 9800), 1) if is_anomaly else round(random.uniform(360, 490), 1)
        current = round(power / 220.0, 2)
        voltage = round(random.uniform(235.0, 255.0), 1) if is_anomaly else round(random.uniform(221.0, 225.0), 1)
        return {
            "topic": "hackathon/smarthome/METER_01/telemetry",
            "payload": {
                "device_code": "METER_01",
                "device_name": "Công Tơ Điện Tổng",
                "status": "ANOMALY" if is_anomaly else "NORMAL",
                "timestamp": now_iso,
                "voltage": voltage,
                "current": current,
                "power": power
            }
        }

    elif device_type == "CO2_01":
        is_anomaly = anomaly_mode in ["co2_spike", "all"]
        co2 = int(random.uniform(1800, 3200)) if is_anomaly else int(random.uniform(520, 650))
        return {
            "topic": "hackathon/smarthome/CO2_01/telemetry",
            "payload": {
                "device_code": "CO2_01",
                "device_name": "Cảm biến Nồng độ CO₂",
                "status": "ANOMALY" if is_anomaly else "NORMAL",
                "timestamp": now_iso,
                "co2": co2
            }
        }

    elif device_type == "HEATER_01":
        is_anomaly = anomaly_mode in ["overheat", "all"]
        temp = round(random.uniform(85.0, 98.0), 1) if is_anomaly else round(random.uniform(50.0, 53.0), 1)
        power = round(random.uniform(3200, 4500), 1) if is_anomaly else round(random.uniform(0.0, 2.5), 1)
        return {
            "topic": "hackathon/smarthome/HEATER_01/telemetry",
            "payload": {
                "device_code": "HEATER_01",
                "device_name": "Bình Nóng Lạnh",
                "status": "ANOMALY" if is_anomaly else "NORMAL",
                "timestamp": now_iso,
                "power": power,
                "temperature": temp
            }
        }

    elif device_type == "LIGHT_01":
        return {
            "topic": "hackathon/smarthome/LIGHT_01/telemetry",
            "payload": {
                "device_code": "LIGHT_01",
                "device_name": "Cảm biến Ánh Sáng",
                "status": "NORMAL",
                "timestamp": now_iso,
                "lux": int(random.uniform(350, 750))
            }
        }
    return {}

def main():
    parser = argparse.ArgumentParser(description="Mock IoT Telemetry Stream & Anomaly Simulator")
    parser.add_argument("--host", default="localhost", help="MQTT Broker Host (default: localhost)")
    parser.add_argument("--port", type=int, default=1883, help="MQTT Port (default: 1883)")
    parser.add_argument("--user", default=None, help="MQTT Username (optional)")
    parser.add_argument("--password", default=None, help="MQTT Password (optional)")
    parser.add_argument("--interval", type=float, default=2.0, help="Publish interval in seconds (default: 2.0)")
    parser.add_argument("--loop", action="store_true", help="Run continuous loop")
    parser.add_argument("--count", type=int, default=1, help="Number of bursts if not looping")
    parser.add_argument("--anomaly", choices=["none", "overheat", "power_surge", "co2_spike", "all"], default="none",
                        help="Inject simulated anomaly scenario")
    args = parser.parse_args()

    client_id = f"mock-iot-publisher-{int(time.time())}"
    client = mqtt.Client(client_id=client_id)
    if args.user and args.password:
        client.username_pw_set(args.user, args.password)

    try:
        client.connect(args.host, args.port, 60)
    except Exception as e:
        print(f"❌ Không thể kết nối tới MQTT Broker tại {args.host}:{args.port} - {e}")
        print("💡 Hãy đảm bảo Mosquitto đang chạy: docker compose up -d mosquitto")
        sys.exit(1)

    print(f"📡 Đã kết nối MQTT [{args.host}:{args.port}] | Mode: {args.anomaly.upper()} | Loop: {args.loop}")

    device_types = ["AC_01", "SENSOR_01", "METER_01", "CO2_01", "HEATER_01", "LIGHT_01"]
    iteration = 0

    try:
        while True:
            iteration += 1
            print(f"\n🔄 [Vòng {iteration}] Phát dữ liệu cảm biến ({datetime.now().strftime('%H:%M:%S')})...")
            for dev in device_types:
                data = generate_telemetry(dev, anomaly_mode=args.anomaly)
                if not data:
                    continue
                topic = data["topic"]
                payload_str = json.dumps(data["payload"], ensure_ascii=False)
                client.publish(topic, payload_str, qos=1)
                status_icon = "⚠️" if data["payload"].get("status") == "ANOMALY" else "🟢"
                print(f"  {status_icon} [{topic}] {payload_str}")
                time.sleep(0.05)

            if not args.loop and iteration >= args.count:
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\n🛑 Dừng phát dữ liệu mô phỏng.")
    finally:
        client.disconnect()
        print("✅ Đã ngắt kết nối MQTT an toàn.")

if __name__ == "__main__":
    main()
