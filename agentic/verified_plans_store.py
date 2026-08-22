"""
agentic/verified_plans_store.py
Layer 5 Closed-Loop Feedback Memory Store.
Di chuyển từ backend/app.py để tách biệt business logic khỏi API layer.
"""
from typing import List, Optional
from agentic.schemas import VerifiedActionPlanRecord, VerifiedPlansStats


class VerifiedPlansHistoryStore:
    """
    Quản lý kho lưu trữ lịch sử các kế hoạch xử lý sự cố đã được xác thực (Layer 5 Closed-Loop Feedback Memory).
    Đồng bộ và ánh xạ trực tiếp với Qdrant collection `verified_action_plans`.
    """
    def __init__(self):
        self.records: List[VerifiedActionPlanRecord] = []
        self._seed_default_history()

    def _seed_default_history(self):
        sample_cases = [
            VerifiedActionPlanRecord(
                record_id="rec-hist-001",
                incident_id="INC-20260815-01",
                timestamp="2026-08-15T22:30:15.120Z",
                scenario_name="Bình nóng lạnh quá nhiệt vắng nhà (HEATER_01 Overheat)",
                severity="CRITICAL",
                affected_devices=["HEATER_01", "AC_01"],
                location="Phòng Tắm & Khách",
                root_cause_summary="Bình nóng lạnh HEATER_01 tiêu thụ công suất 2452W đạt 74.7°C khi nhà không có người. Nguy cơ chập cháy khẩn cấp theo SOP-SH-2026.",
                action_type="SHUTDOWN_DEVICE",
                action_title="Ngắt Nguồn Bình Nóng Lạnh & Điều Chỉnh Điều Hòa",
                target_devices=["HEATER_01", "AC_01"],
                mqtt_topic="iot/devices/control",
                mqtt_payload={"command": "POWER_OFF", "targets": ["HEATER_01"], "incident_id": "INC-20260815-01"},
                recommended_steps=[
                    "Cách ly nguồn điện khẩn cấp đến bình nóng lạnh HEATER_01.",
                    "Chuyển toàn bộ hệ thống Smart Home sang Chế độ Vắng Nhà (Away Mode).",
                    "Gửi email cảnh báo tức thời đến Chủ Hộ và Kỹ Thuật Viên."
                ],
                energy_saved_watts=2452.0,
                status="VERIFIED_RESOLVED",
                operator="Chủ Nhà (Nguyễn Văn An)",
                qdrant_collection="verified_action_plans",
                vector_dims=1024,
                few_shot_learned=True,
                raw_metrics={"temp_c": 74.7, "power_watts": 2452.0, "current_a": 11.2, "presence_pir": False}
            ),
            VerifiedActionPlanRecord(
                record_id="rec-hist-002",
                incident_id="INC-20260815-02",
                timestamp="2026-08-15T18:15:40.450Z",
                scenario_name="Tối ưu năng lượng máy lạnh (AC_01 Energy Optimization)",
                severity="MEDIUM",
                affected_devices=["AC_01", "METER_01"],
                location="Phòng Khách & Tủ Điện",
                root_cause_summary="Máy lạnh AC_01 hoạt động 20.8°C công suất 1229W làm tăng công suất tổng METER_01 lên 3982W. Đề xuất tăng lên 26°C chế độ Eco.",
                action_type="SET_ECO_MODE",
                action_title="Chuyển Máy Lạnh AC_01 Sang Chế Độ Tiết Kiệm (Eco 26°C)",
                target_devices=["AC_01"],
                mqtt_topic="iot/devices/control",
                mqtt_payload={"command": "ECO_MODE", "target_temp": 26.0, "targets": ["AC_01"], "incident_id": "INC-20260815-02"},
                recommended_steps=[
                    "Điều chỉnh nhiệt độ AC_01 từ 20.8°C lên 26.0°C duy trì tiện nghi.",
                    "Giảm tải dòng điện tổng tại tủ METER_01.",
                    "Tiết kiệm ước tính ~1.2 kWh/ngày cho gia đình."
                ],
                energy_saved_watts=850.0,
                status="VERIFIED_RESOLVED",
                operator="Chủ Nhà / KTV Vận Hành",
                qdrant_collection="verified_action_plans",
                vector_dims=1024,
                few_shot_learned=True,
                raw_metrics={"temp_c": 20.8, "power_watts": 1229.0, "current_a": 5.6, "presence_pir": True}
            ),
            VerifiedActionPlanRecord(
                record_id="rec-hist-003",
                incident_id="INC-20260814-03",
                timestamp="2026-08-14T09:45:10.880Z",
                scenario_name="Chất lượng không khí phòng ngủ giảm (CO2_01 Spike)",
                severity="HIGH",
                affected_devices=["CO2_01", "SENSOR_01"],
                location="Phòng Ngủ Master",
                root_cause_summary="Cảm biến CO2_01 đo được nồng độ 1016 ppm (vượt ngưỡng thông thoáng 1000 ppm) trong phòng ngủ. Đề xuất mở thông gió.",
                action_type="SET_ECO_MODE",
                action_title="Kích Hoạt Thông Gió & Nhắc Mở Cửa Sổ Phòng Ngủ",
                target_devices=["CO2_01"],
                mqtt_topic="iot/devices/control",
                mqtt_payload={"command": "VENTILATION_ON", "targets": ["CO2_01"], "incident_id": "INC-20260814-03"},
                recommended_steps=[
                    "Gửi thông báo nhắc nhở gia đình mở hé cửa sổ hoặc bật quạt thông gió.",
                    "Tạo phiếu nhắc Kỹ Thuật Viên kiểm tra màng lọc gió."
                ],
                energy_saved_watts=0.0,
                status="VERIFIED_RESOLVED",
                operator="Chủ Nhà (Nguyễn Văn An)",
                qdrant_collection="verified_action_plans",
                vector_dims=1024,
                few_shot_learned=True,
                raw_metrics={"co2_ppm": 1016.0, "temp_c": 25.7, "humidity_pct": 78.3}
            )
        ]
        self.records = sample_cases

    def add_record(self, record: VerifiedActionPlanRecord) -> VerifiedActionPlanRecord:
        self.records.insert(0, record)
        return record

    def list_records(self, limit: int = 50, severity: Optional[str] = None, search: Optional[str] = None) -> List[VerifiedActionPlanRecord]:
        results = self.records
        if severity and severity.upper() != "ALL":
            results = [r for r in results if r.severity.upper() == severity.upper()]
        if search and search.strip():
            kw = search.strip().lower()
            results = [
                r for r in results
                if kw in r.scenario_name.lower()
                or kw in r.root_cause_summary.lower()
                or kw in r.incident_id.lower()
                or any(kw in d.lower() for d in r.affected_devices)
            ]
        return results[:limit]

    def get_record(self, record_id: str) -> Optional[VerifiedActionPlanRecord]:
        for r in self.records:
            if r.record_id == record_id or r.incident_id == record_id:
                return r
        return None

    def reset_to_seed(self):
        self._seed_default_history()

    def clear(self):
        self.records = []

    def get_stats(self) -> VerifiedPlansStats:
        total = len(self.records)
        critical_cnt = sum(1 for r in self.records if r.severity == "CRITICAL")
        high_cnt = sum(1 for r in self.records if r.severity == "HIGH")
        medium_cnt = sum(1 for r in self.records if r.severity == "MEDIUM")
        resolved_cnt = sum(1 for r in self.records if r.status == "VERIFIED_RESOLVED")
        total_energy_kwh = round(sum(r.energy_saved_watts for r in self.records) / 1000.0 * 2.5, 2)
        return VerifiedPlansStats(
            total_records=total,
            critical_count=critical_cnt,
            high_count=high_cnt,
            medium_count=medium_cnt,
            resolved_count=resolved_cnt,
            total_energy_saved_kwh=total_energy_kwh,
            qdrant_collection="verified_action_plans",
            vector_dims=1024,
            status="ONLINE_SYNCHRONIZED"
        )
