import pytest
from agentic.orchestrator import HomeCoordinatorAgent
from agentic.schemas import DeviceMLReading, ActionButton
from agentic.feedback_agent import HomeActionVerificationAgent
from rag.vector_store import RAGVectorStore

def test_track_a_5_node_orchestration_energy_saving():
    """Kiểm tra kịch bản 1: Tối ưu năng lượng khi có người ở nhà"""
    coordinator = HomeCoordinatorAgent()
    
    readings = [
        DeviceMLReading(
            device_id="AC_01",
            device_type="air_conditioner",
            location="living_room",
            is_anomaly=False,
            metrics={"power_watts": 1229.0, "temp_c": 20.8, "current_a": 5.5},
            presence_detected=True
        ),
        DeviceMLReading(
            device_id="SENSOR_01",
            device_type="sensor_environment",
            location="living_room",
            is_anomaly=False,
            metrics={"temp_c": 26.2, "humidity_pct": 58.5},
            presence_detected=True
        ),
        DeviceMLReading(
            device_id="METER_01",
            device_type="power_meter",
            location="main_panel",
            is_anomaly=False,
            metrics={"power_watts": 3982.0, "current_a": 13.26, "voltage_v": 223.3},
            presence_detected=True
        )
    ]
    
    result = coordinator.process_incident(readings=readings, scenario="energy_saving")
    
    # 1. 5 execution traces
    traces = result.get("agent_execution_traces", [])
    assert len(traces) == 5
    assert "HomeCoordinatorAgent" in traces[0]["agent_name"]
    assert "IoTObservationAgent" in traces[1]["agent_name"]
    assert "ComfortEnergyAgent" in traces[2]["agent_name"]
    assert "SafetyDiagnosticAgent" in traces[3]["agent_name"]
    assert "HomeActionVerificationAgent" in traces[4]["agent_name"]
    
    # 2. Schedule created & Verified
    assert result.get("schedule_created") is not None
    assert result.get("verification_status") == "VERIFIED"
    assert len(result.get("verification_details", [])) > 0

def test_track_a_co2_air_quality_scenario():
    """Kiểm tra kịch bản 2: Cảnh báo chất lượng không khí CO2 phòng ngủ"""
    coordinator = HomeCoordinatorAgent()
    
    readings = [
        DeviceMLReading(
            device_id="CO2_01",
            device_type="co2_sensor",
            location="bedroom",
            is_anomaly=True,
            anomaly_score=0.98,
            metrics={"co2_ppm": 1250.0},
            presence_detected=True
        )
    ]
    
    result = coordinator.process_incident(readings=readings, scenario="co2_hazard")
    
    # Check ticket created for technician
    assert result.get("maintenance_ticket") is not None
    ticket = result["maintenance_ticket"]
    assert "CO2_01" in ticket["device_id"]
    assert ticket["priority"] in ["MEDIUM", "HIGH"]
    assert result["verification_status"] == "VERIFIED"

def test_track_a_stale_data_sensor_scenario():
    """Kiểm tra kịch bản 3: Dữ liệu cảm biến không mới (Stale Data > 180s)"""
    coordinator = HomeCoordinatorAgent()
    
    readings = [
        DeviceMLReading(
            device_id="SENSOR_01",
            device_type="sensor_environment",
            location="living_room",
            is_anomaly=True,
            anomaly_score=0.95,
            metrics={"temp_c": 25.0, "humidity_pct": 55.0, "age_seconds": 210.0},
            presence_detected=True
        )
    ]
    
    result = coordinator.process_incident(readings=readings, scenario="stale_data")
    assert result.get("maintenance_ticket") is not None
    assert "SENSOR_01" in result["maintenance_ticket"]["device_id"]
    assert result["verification_status"] == "VERIFIED"

def test_track_a_away_heater_overheat_scenario():
    """Kiểm tra kịch bản 4: Bình nóng lạnh quá nhiệt khi vắng nhà (HEATER_01 > 75°C)"""
    coordinator = HomeCoordinatorAgent()
    
    readings = [
        DeviceMLReading(
            device_id="HEATER_01",
            device_type="water_heater",
            location="bathroom",
            is_anomaly=True,
            anomaly_score=0.96,
            metrics={"power_watts": 2452.0, "temp_c": 76.5, "current_a": 11.2},
            presence_detected=False
        )
    ]
    
    result = coordinator.process_incident(readings=readings, scenario="heater_overheat")
    
    plan = result.get("mitigation_plan", {})
    assert plan.get("requires_human_approval") is True
    assert len(plan.get("action_buttons", [])) > 0
    
    # Simulate HITL user approval
    button = ActionButton(
        button_id="POWER_OFF_HEATER",
        title="Ngắt nguồn bình nóng lạnh khẩn cấp",
        action_type="EMERGENCY_SHUTDOWN",
        target_devices=["HEATER_01"],
        mqtt_topic="iot/devices/control",
        mqtt_payload={"command": "POWER_OFF", "targets": ["HEATER_01"]}
    )
    exec_res = coordinator.execute_user_action(button)
    assert exec_res["status"] == "EXECUTED"
