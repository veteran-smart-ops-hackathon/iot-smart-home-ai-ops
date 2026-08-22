from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from datetime import datetime

class RAGCitation(BaseModel):
    """Citation information for retrieved SOP chunk."""
    citation_id: str
    doc_id: Optional[str] = None
    filename: str
    page_number: int = 1
    similarity_score: float
    text_snippet: str

class SOPRuleMatch(BaseModel):
    """Extracted SOP safety rule condition and mandate."""
    standard_code: str = "SOP-SH-2026"
    clause: str
    target_device_type: str
    condition: str
    required_action: str
    threshold_value: Optional[str] = None
    time_limit_sec: Optional[int] = 30

class PastCaseMatch(BaseModel):
    """Similar historical verified incident retrieved from Qdrant."""
    incident_id: str
    scenario_name: str
    severity: str
    successful_action: str
    energy_saved_watts: float = 0.0
    similarity_score: float = 0.0

class RAGGroundingContext(BaseModel):
    """
    Synthesized and optimized knowledge context extracted from RAG/Qdrant
    passed from RetrieverAgent to PlanningAgent.
    """
    sop_code: str = "SOP-SH-2026"
    grounded_summary: str
    matched_rules: List[SOPRuleMatch] = Field(default_factory=list)
    past_verified_cases: List[PastCaseMatch] = Field(default_factory=list)
    citations: List[RAGCitation] = Field(default_factory=list)
    confidence_score: float = 0.95
    source_collection: str = "system_baselines_sop"
    retrieval_latency_ms: float = 0.0


class SmartHomeDeviceState(BaseModel):
    """Trạng thái đo đạc thời gian thực của 1 trong 6 thiết bị chuẩn Track A."""
    device_code: str = Field(description="AC_01, SENSOR_01, METER_01, CO2_01, HEATER_01, LIGHT_01")
    device_name: str
    location: str
    status: str = "NORMAL"
    timestamp: Optional[str] = None
    received_at: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)
    smoothed_metrics: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_stale: bool = False
    age_seconds: float = 0.0
    topic: Optional[str] = None

class MQTTBrokerStatusResponse(BaseModel):
    """Thông tin trạng thái kết nối MQTT Gateway."""
    status: str
    host: str
    port: int
    username: str
    is_connected: bool
    last_connect_time: Optional[str] = None
    last_error: Optional[str] = None
    reconnect_count: int = 0
    total_messages_received: int = 0
    uptime_seconds: float = 0.0
    active_devices_count: int = 0
    total_standard_devices: int = 6
    subscribed_topics: List[str] = Field(default_factory=list)

class EnergyScheduleItem(BaseModel):
    """Lịch trình tiết kiệm năng lượng tạo bởi Action Agent."""
    schedule_id: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    target_device: str = "AC_01"
    start_time: str
    end_time: str
    target_mode: str = "ECO_MODE"
    target_temp_c: float = 26.0
    expected_kwh_saved: float = 1.2
    status: str = "ACTIVE"
    verified: bool = True

class TechnicianTicket(BaseModel):
    """Phiếu yêu cầu kiểm tra kỹ thuật gửi cho KTV tòa nhà."""
    ticket_id: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    priority: str = "HIGH" # LOW, MEDIUM, HIGH, CRITICAL
    target_device_code: str
    device_name: str
    issue_type: str = "STALE_DATA_DISCONNECT" # SENSOR_FAILURE, POWER_SURGE, CO2_SPIKE
    issue_description: str
    observed_metrics: Dict[str, Any] = Field(default_factory=dict)
    recommended_technician_action: str
    status: str = "PENDING_VERIFICATION"
    verified: bool = True

class DeviceMLReading(BaseModel):
    """Raw ML anomaly and metric output from machine_learning service per device."""
    device_id: str
    device_type: str = Field(description="e.g. air_conditioner, water_heater, power_meter, co2_sensor, light_sensor")
    location: str = Field(description="e.g. living_room, kitchen, bedroom")
    is_anomaly: bool = False
    anomaly_score: float = Field(default=0.0, ge=0.0, le=1.0, description="0.0 normal -> 1.0 severe anomaly")
    wear_score: Optional[float] = Field(default=0.0, ge=0.0, le=1.0, description="Equipment wear level")
    metrics: Dict[str, float] = Field(default_factory=dict, description="e.g. power_watts, temp_c, current_a")
    presence_detected: bool = Field(default=False, description="PIR/Radar presence state")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class DeviceFaultSummary(BaseModel):
    """Characterized fault report for a single device in Vietnamese."""
    device_id: str
    device_type: str
    location: str
    severity: str = Field(description="LOW, MEDIUM, HIGH, CRITICAL")
    fault_type: str = Field(description="Mã lỗi kỹ thuật (tiếng Việt)")
    description: str = Field(description="Mô tả chi tiết bằng tiếng Việt")
    evidence: List[str] = Field(description="Bằng chứng từ dữ liệu cảm biến (tiếng Việt)")

class DiagnosticReport(BaseModel):
    """Synthesized diagnosis produced by Fault Characterization Agent."""
    incident_id: str
    home_occupied: bool
    affected_devices: List[DeviceFaultSummary]
    overall_severity: str = Field(description="LOW, MEDIUM, HIGH, CRITICAL")
    root_cause_summary: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ActionButton(BaseModel):
    """Interactive button presented to user in Dashboard/Mobile App."""
    button_id: str
    title: str = Field(description="Tiêu đề nút bấm (tiếng Việt)")
    action_type: str = Field(description="e.g. SHUTDOWN_DEVICE, SET_ECO_MODE, DISMISS")
    target_devices: List[str] = Field(default_factory=list)
    mqtt_topic: str
    mqtt_payload: Dict[str, Any]
    style: str = Field(default="danger", description="primary, warning, danger, secondary")

class MitigationPlan(BaseModel):
    """Plan generated by Planning Agent in Vietnamese."""
    incident_id: str
    title: str
    explanation: str
    recommended_steps: List[str]
    action_buttons: List[ActionButton]
    requires_human_approval: bool = True
    estimated_energy_saved_watts: Optional[float] = 0.0

class AgentTraceStep(BaseModel):
    """Audit & Verification Step for Multi-Agent Execution."""
    agent_name: str
    role: str
    model: str
    latency_ms: float
    input_data: str
    thought_process: str
    output_result: str
    status: str = "COMPLETED"

class NotificationLog(BaseModel):
    """Log record of email notification dispatch for incident alerts."""
    notification_id: str
    incident_id: str
    recipient_email: str
    recipient_emails: List[str] = Field(default_factory=list, description="Danh sách các email nhận cảnh báo")
    subject: str
    status: str = Field(description="SENT, SIMULATED, FAILED, DISABLED")
    delivery_mode: str = Field(description="SMTP_LIVE, SIMULATED, DISABLED")
    severity: str = Field(default="HIGH", description="LOW, MEDIUM, HIGH, CRITICAL")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    dashboard_url: str = Field(default="")
    html_preview: Optional[str] = None
    error_message: Optional[str] = None

class NotificationSettings(BaseModel):
    """Dynamic configuration for email alerts."""
    enabled: bool = True
    recipient_email: str
    recipient_emails: List[str] = Field(default_factory=list, description="Danh sách tất cả email người nhận")
    total_recipients: int = 1
    smtp_configured: bool = False
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    from_email: str = "aegis-iot@smarthome.ai"
    dashboard_base_url: str = "http://localhost:8000"

class VerifiedActionPlanRecord(BaseModel):
    """
    Bản ghi lưu trữ sự cố và kế hoạch xử lý đã được phê duyệt (Layer 5 Feedback Memory).
    Đồng bộ trực tiếp với Qdrant collection `verified_action_plans`.
    """
    record_id: str
    incident_id: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    scenario_name: str = Field(default="Sự cố IoT Gia đình")
    severity: str = Field(default="HIGH", description="CRITICAL, HIGH, MEDIUM, LOW")
    affected_devices: List[str] = Field(default_factory=list)
    location: str = Field(default="Toàn bộ nhà")
    root_cause_summary: str
    action_type: str
    action_title: str
    target_devices: List[str] = Field(default_factory=list)
    mqtt_topic: str = "iot/devices/control"
    mqtt_payload: Dict[str, Any] = Field(default_factory=dict)
    recommended_steps: List[str] = Field(default_factory=list)
    energy_saved_watts: float = 0.0
    status: str = Field(default="VERIFIED_RESOLVED", description="VERIFIED_RESOLVED, MANUAL_OVERRIDE, DISMISSED")
    operator: str = Field(default="Kỹ Sư Vận Hành (HITL)")
    qdrant_collection: str = "verified_action_plans"
    vector_dims: int = 1024
    few_shot_learned: bool = True
    raw_metrics: Dict[str, Any] = Field(default_factory=dict)

class VerifiedPlansStats(BaseModel):
    """Thống kê tổng quan kho lịch sử kế hoạch đã duyệt."""
    total_records: int
    critical_count: int
    high_count: int
    medium_count: int
    resolved_count: int
    total_energy_saved_kwh: float
    qdrant_collection: str
    vector_dims: int
    status: str

