from typing import List
import uuid
from .schemas import DeviceMLReading, DeviceFaultSummary, DiagnosticReport

# Từ điển ánh xạ tên thiết bị sang tiếng Việt chuẩn Track A
DEVICE_NAMES_VI = {
    "AC_01": "Máy Lạnh Phòng Khách (AC_01)",
    "air_conditioner": "Máy Lạnh Phòng Khách (AC_01)",
    "SENSOR_01": "Cảm Biến Nhiệt Ẩm (SENSOR_01)",
    "sensor_environment": "Cảm Biến Nhiệt Ẩm (SENSOR_01)",
    "METER_01": "Đồng Hồ Điện Tổng (METER_01)",
    "power_meter": "Đồng Hồ Điện Tổng (METER_01)",
    "CO2_01": "Cảm Biến CO₂ Phòng Ngủ (CO2_01)",
    "co2_sensor": "Cảm Biến CO₂ Phòng Ngủ (CO2_01)",
    "HEATER_01": "Bình Nóng Lạnh (HEATER_01)",
    "water_heater": "Bình Nóng Lạnh (HEATER_01)",
    "heater": "Bình Nóng Lạnh (HEATER_01)",
    "LIGHT_01": "Cảm Biến Ánh Sáng (LIGHT_01)",
    "light_sensor": "Cảm Biến Ánh Sáng (LIGHT_01)"
}

LOCATION_NAMES_VI = {
    "living_room": "Phòng Khách",
    "Phòng Khách": "Phòng Khách",
    "bedroom": "Phòng Ngủ Master",
    "Phòng Ngủ": "Phòng Ngủ Master",
    "main_panel": "Tủ Điện Tổng",
    "Tủ Điện": "Tủ Điện Tổng",
    "bathroom": "Phòng Tắm",
    "Phòng Tắm": "Phòng Tắm",
    "balcony": "Ban Công / Cửa Sổ",
    "Ban Công": "Ban Công / Cửa Sổ"
}

class FaultCharacterizationAgent:
    """
    Agent 2: Tác Tử Chẩn Đoán & Phân Tích Nguyên Nhân Gốc (Diagnostic RCA Specialist).
    Phân tích đầu ra mô hình ML của từng thiết bị IoT, phát hiện mẫu hình sự cố và
    tổng hợp báo cáo chẩn đoán kỹ thuật hoàn toàn bằng tiếng Việt.
    """

    def __init__(self, name: str = "FaultCharacterizationAgent"):
        self.name = name

    def characterize_device_fault(self, reading: DeviceMLReading) -> DeviceFaultSummary:
        evidence = []
        fault_type = "BẤT_THƯỜNG_KHÔNG_XÁC_ĐỊNH"
        severity = "LOW"
        desc_parts = []

        dev_name = DEVICE_NAMES_VI.get(reading.device_type, reading.device_type)
        loc_name = LOCATION_NAMES_VI.get(reading.location, reading.location)

        power = reading.metrics.get("power_watts", 0.0)
        temp = reading.metrics.get("temp_c", 25.0)

        # 1. Kiểm tra trạng thái phụ tải công suất
        if not reading.presence_detected and power > 100.0:
            fault_type = "PHỤ_TẢI_CAO_KHI_VẮNG_NHÀ"
            severity = "HIGH"
            evidence.append(f"Không có người trong phòng nhưng {dev_name} đang tiêu thụ công suất {power:.1f}W.")
            desc_parts.append(f"Thiết bị hoạt động ở mức công suất cao ({power:.1f}W) trong phòng trống không người.")
        elif reading.presence_detected and power > 1000.0:
            fault_type = "PHỤ_TẢI_CẦN_TỐI_ƯU_ECO"
            severity = "MEDIUM" if power < 3000.0 else "HIGH"
            evidence.append(f"Nhà đang có người sinh hoạt nhưng {dev_name} đang tiêu thụ công suất cao {power:.1f}W.")
            desc_parts.append(f"Thiết bị hoạt động ở mức công suất cao ({power:.1f}W) khi có người ở nhà, đề xuất chuyển sang chế độ Tiết Kiệm (Eco) để giảm chi phí.")

        # 2. Kiểm tra sự cố quá nhiệt nhiệt độ
        if temp > 65.0 or (reading.is_anomaly and temp > 50.0):
            fault_type = "QUÁ_NHIỆT_NGHIÊM_TRỌNG" if temp > 75.0 else "CẢNH_BÁO_QUÁ_NHIỆT"
            severity = "CRITICAL" if temp > 75.0 else "HIGH"
            evidence.append(f"Nhiệt độ đo được đạt {temp:.1f}°C (vượt ngưỡng quy chuẩn an toàn 65°C/75°C).")
            desc_parts.append(f"Phát hiện tích tụ nhiệt bất thường ({temp:.1f}°C), nguy cơ chập cháy cuộn cảm.")

        # 3. Kiểm tra hao mòn cơ khí / dự đoán bảo trì
        if reading.wear_score and reading.wear_score > 0.75:
            fault_type = "RỦI_RO_HAO_MÒN_CƠ_KHÍ"
            severity = "HIGH" if severity != "CRITICAL" else severity
            evidence.append(f"Chỉ số hao mòn ML đạt {reading.wear_score:.2f} (vượt ngưỡng cảnh báo 0.75).")
            desc_parts.append("Độ mài mòn cơ khí/điện từ ở mức nguy hiểm, cần xếp lịch bảo dưỡng dự đoán.")

        # Dự phòng phân loại ML nếu chưa khớp quy tắc cụ thể
        if not desc_parts and reading.is_anomaly:
            fault_type = "NGOẠI_LAI_THỐNG_KÊ_ML"
            severity = "MEDIUM" if reading.anomaly_score > 0.7 else "LOW"
            evidence.append(f"Mô hình Isolation Forest phát hiện điểm bất thường với điểm số {reading.anomaly_score:.2f}.")
            desc_parts.append("Phát hiện bất thường ngoại lai trong luồng chuỗi thời gian telemetry.")

        description = " ".join(desc_parts) if desc_parts else "Các thông số vận hành đều nằm trong ngưỡng an toàn."

        return DeviceFaultSummary(
            device_id=reading.device_id,
            device_type=dev_name,
            location=loc_name,
            severity=severity,
            fault_type=fault_type,
            description=description,
            evidence=evidence
        )

    def analyze(self, readings: List[DeviceMLReading]) -> DiagnosticReport:
        affected = []
        any_presence = any(r.presence_detected for r in readings)
        max_severity = "LOW"
        severity_rank = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}

        for r in readings:
            if r.is_anomaly or (not any_presence and r.metrics.get("power_watts", 0) > 50.0) or (any_presence and r.metrics.get("power_watts", 0) > 1000.0):
                fault = self.characterize_device_fault(r)
                affected.append(fault)
                if severity_rank[fault.severity] > severity_rank[max_severity]:
                    max_severity = fault.severity

        # Tổng hợp nguyên nhân gốc (RCA Synthesis bằng tiếng Việt)
        if any_presence and affected:
            dev_types = [d.device_type for d in affected]
            root_cause = (
                f"Nhà đang CÓ NGƯỜI SINH HOẠT (Occupied Mode). Phát hiện {len(affected)} thiết bị "
                f"({', '.join(dev_types)}) đang tiêu thụ công suất cao hoặc cài đặt nhiệt độ chưa tối ưu. "
                f"Đề xuất kích hoạt chế độ Tiết Kiệm Năng Lượng (Eco) để giảm hóa đơn tiền điện mà vẫn duy trì tiện nghi."
            )
        elif not any_presence and affected:
            dev_types = [d.device_type for d in affected]
            root_cause = (
                f"Nhà đang ở chế độ VẮNG NGƯỜI (Unoccupied Mode) nhưng phát hiện {len(affected)} thiết bị "
                f"({', '.join(dev_types)}) đang tiêu thụ công suất lớn hoặc vượt ngưỡng nhiệt độ an toàn, "
                f"vi phạm quy định an toàn SOP-SH-2026."
            )
        else:
            root_cause = "Toàn bộ thiết bị IoT đang vận hành ổn định trong giới hạn thông số an toàn."

        return DiagnosticReport(
            incident_id=f"INC-{uuid.uuid4().hex[:8].upper()}",
            home_occupied=any_presence,
            affected_devices=affected,
            overall_severity=max_severity,
            root_cause_summary=root_cause
        )

# Aliases
SafetyDiagnosticAgent = FaultCharacterizationAgent

