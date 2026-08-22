import os
import json
from typing import List, Optional, Union, Dict, Any
from .schemas import DiagnosticReport, MitigationPlan, ActionButton, RAGGroundingContext, SOPRuleMatch
from config import get_agent_llm

class PlanningAndActionAgent:
    """
    Agent 3: Tác Tử Lập Kế Hoạch & Điều Phối Hành Động (Planning & Action Specialist).
    Đóng vai trò Chuyên gia Hành động (Action Specialist):
    1. Tiếp nhận Báo cáo chẩn đoán RCA (DiagnosticReport) từ Fault Agent.
    2. Tiếp nhận Tri thức SOP & Bài học kinh nghiệm đã tinh chế (RAGGroundingContext) từ Retriever Agent.
    3. Suy luận (LLM Reasoning + Grounded Deterministic Fallback) để lập quy trình khắc phục từng bước
       có căn cứ quy chuẩn kỹ thuật rõ ràng.
    4. Sinh các nút bấm tương tác (Human-in-the-Loop ActionButtons) với đúng MQTT topic & payload.
    """

    def __init__(self, name: str = "PlanningAndActionAgent", use_llm: bool = True):
        self.name = name
        self.use_llm = use_llm

    def create_plan(
        self,
        report: DiagnosticReport,
        rag_context: Optional[Union[RAGGroundingContext, str]] = None
    ) -> MitigationPlan:
        """
        Sinh kế hoạch xử lý sự cố dựa trên đối chiếu RCA và Ngữ cảnh tri thức RAG.
        """
        if not report.affected_devices:
            return MitigationPlan(
                incident_id=report.incident_id,
                title="Trạng Thái Hệ Thống: Bình Thường",
                explanation="Không phát hiện sự cố bất thường. Toàn bộ thiết bị đang hoạt động ổn định trong ngưỡng an toàn.",
                recommended_steps=["Tiếp tục duy trì giám sát định kỳ qua luồng Kalman filter."],
                action_buttons=[],
                requires_human_approval=False,
                estimated_energy_saved_watts=0.0
            )

        # 1. Chuẩn hóa ngữ cảnh RAG
        grounded_rag: Optional[RAGGroundingContext] = None
        rag_str_context = ""
        
        if isinstance(rag_context, RAGGroundingContext):
            grounded_rag = rag_context
            rag_str_context = grounded_rag.grounded_summary
        elif isinstance(rag_context, str):
            rag_str_context = rag_context

        # 2. Thử nghiệm suy luận qua LLM nếu cấu hình API khả dụng
        if self.use_llm and os.getenv("GEMINI_KEY_1") and not os.getenv("GEMINI_KEY_1", "").startswith("your_"):
            try:
                llm_plan = self._reason_with_llm(report, grounded_rag, rag_str_context)
                if llm_plan:
                    return llm_plan
            except Exception:
                pass # Fallback sang Deterministic Grounded Synthesis

        # 3. Deterministic Grounded Synthesis (Chính xác, tin cậy cao và đối chiếu chặt chẽ RAG)
        return self._synthesize_grounded_plan(report, grounded_rag, rag_str_context)

    def _synthesize_grounded_plan(
        self,
        report: DiagnosticReport,
        grounded_rag: Optional[RAGGroundingContext],
        rag_str_context: str
    ) -> MitigationPlan:
        """Tổng hợp kế hoạch kỹ thuật chuẩn xác theo quy chuẩn SOP trích xuất từ RAG."""
        steps: List[str] = []
        buttons: List[ActionButton] = []
        device_ids = [d.device_id for d in report.affected_devices]
        dev_names = [d.device_type for d in report.affected_devices]

        # Trích xuất quy tắc ưu tiên từ RAG
        primary_rule: Optional[SOPRuleMatch] = None
        if grounded_rag and grounded_rag.matched_rules:
            primary_rule = grounded_rag.matched_rules[0]

        sop_code = grounded_rag.sop_code if grounded_rag else "SOP-SH-2026"
        clause_ref = primary_rule.clause if primary_rule else "Quy chuẩn an toàn thiết bị gia đình"
        req_action = primary_rule.required_action if primary_rule else ("SHUTDOWN_DEVICE" if not report.home_occupied else "SET_ECO_MODE")

        energy_saved = 0.0
        if not report.home_occupied:
            title = f"Cảnh Báo Khẩn: Phát Hiện {len(report.affected_devices)} Thiết Bị Chạy Khi Vắng Nhà"
            explanation = (
                f"Cảm biến xác nhận khu vực KHÔNG CÓ NGƯỜI (PIR=False), nhưng có {len(report.affected_devices)} thiết bị "
                f"({', '.join(dev_names)}) vẫn đang hoạt động công suất lớn. Căn cứ theo {sop_code} ({clause_ref}), "
                "cần thực thi ngắt nguồn khẩn cấp ngay lập tức để ngăn chặn nguy cơ chập cháy và triệt tiêu lãng phí điện năng."
            )
            
            steps.append(f"Cách ly nguồn điện khẩn cấp đến các thiết bị ({', '.join(dev_names)}) theo tiêu chuẩn {sop_code} ({clause_ref}).")
            steps.append("Chuyển toàn bộ hệ thống Smart Home sang Chế độ Vắng Nhà (Away / Eco Mode).")
            steps.append("Gửi thông báo cảnh báo âm thanh và liên kết phê duyệt tức thời đến điện thoại chủ nhà.")

            if grounded_rag and grounded_rag.past_verified_cases:
                top_case = grounded_rag.past_verified_cases[0]
                steps.append(f"Kế thừa tiền lệ #{top_case.incident_id} ({top_case.scenario_name}): Xử lý thành công bằng '{top_case.successful_action}'.")
                energy_saved = top_case.energy_saved_watts
            else:
                energy_saved = 2200.0

            # Nút 1: Ngắt nguồn khẩn cấp (Hành động ưu tiên cao nhất)
            buttons.append(ActionButton(
                button_id=f"btn-shutdown-{report.incident_id}",
                title=f"Ngắt Nguồn Toàn Bộ {len(report.affected_devices)} Thiết Bị Nguy Hiểm",
                action_type="SHUTDOWN_DEVICE",
                target_devices=device_ids,
                mqtt_topic="iot/devices/control",
                mqtt_payload={"command": "POWER_OFF", "targets": device_ids, "incident_id": report.incident_id},
                style="danger"
            ))

            # Nút 2: Bỏ qua / Tiếp tục duy trì
            buttons.append(ActionButton(
                button_id=f"btn-dismiss-{report.incident_id}",
                title="Tiếp Tục Bật Thiết Bị (Bỏ Qua Cảnh Báo)",
                action_type="DISMISS",
                target_devices=[],
                mqtt_topic="agent/incident/dismiss",
                mqtt_payload={"incident_id": report.incident_id},
                style="secondary"
            ))
        else:
            title = f"Cảnh Báo Vận Hành: Phát Hiện Sự Cố Mức Độ {report.overall_severity}"
            explanation = f"Phát hiện dấu hiệu bất thường trên {len(report.affected_devices)} thiết bị. {report.root_cause_summary} Căn cứ theo {sop_code} ({clause_ref})."
            
            for d in report.affected_devices:
                steps.append(f"Kiểm tra thực địa {d.device_type} tại {d.location} (Mã lỗi: {d.fault_type}).")

            steps.append(f"Chuyển thiết bị sang chế độ vận hành an toàn/tiết kiệm (Eco Mode) theo hướng dẫn {clause_ref}.")

            if grounded_rag and grounded_rag.past_verified_cases:
                top_case = grounded_rag.past_verified_cases[0]
                steps.append(f"Áp dụng giải pháp đã kiểm chứng từ Ca #{top_case.incident_id} ({top_case.scenario_name}).")
                energy_saved = top_case.energy_saved_watts
            else:
                energy_saved = 850.0

            buttons.append(ActionButton(
                button_id=f"btn-safemode-{report.incident_id}",
                title="Chuyển Các Thiết Bị Liên Quan Sang Chế Độ An Toàn (Eco Mode)",
                action_type="SET_ECO_MODE",
                target_devices=device_ids,
                mqtt_topic="iot/devices/control",
                mqtt_payload={"command": "ECO_MODE", "targets": device_ids, "incident_id": report.incident_id},
                style="warning"
            ))

        if rag_str_context and not grounded_rag:
            steps.append(f"Ghi chú Quy chuẩn SOP: {rag_str_context}")

        return MitigationPlan(
            incident_id=report.incident_id,
            title=title,
            explanation=explanation,
            recommended_steps=steps,
            action_buttons=buttons,
            requires_human_approval=True,
            estimated_energy_saved_watts=energy_saved
        )

    def _reason_with_llm(
        self,
        report: DiagnosticReport,
        grounded_rag: Optional[RAGGroundingContext],
        rag_str: str
    ) -> Optional[MitigationPlan]:
        """Tận dụng LLM Router để tổng hợp kế hoạch thông minh."""
        agent_llm = get_agent_llm()
        
        prompt = f"""Bạn là Tác Tử Lập Kế Hoạch (Planning & Action Agent) của hệ thống bảo vệ IoT thông minh Aegis-IoT.
Hãy phân tích báo cáo sự cố và tri thức quy chuẩn kỹ thuật dưới đây để lập quy trình xử lý từng bước.

BÁO CÁO SỰ CỐ (DIAGNOSTIC RCA):
- Mã sự cố: {report.incident_id}
- Mức độ nghiêm trọng: {report.overall_severity}
- Trạng thái có người: {'Có người trong nhà' if report.home_occupied else 'Vắng nhà (Không có người)'}
- Nguyên nhân gốc: {report.root_cause_summary}
- Thiết bị ảnh hưởng: {[f'{d.device_type} ({d.location}) - Lỗi: {d.fault_type}' for d in report.affected_devices]}

TRI THỨC QUY CHUẨN KỸ THUẬT & TIỀN LỆ LỊCH SỬ (TỪ RAG):
{rag_str if rag_str else 'Áp dụng tiêu chuẩn an toàn SOP-SH-2026.'}

YÊU CẦU ĐẦU RA JSON:
Trả về duy nhất 1 JSON object hợp lệ theo schema sau:
{{
  "title": "Tiêu đề cảnh báo súc tích bằng tiếng Việt",
  "explanation": "Giải thích ngắn gọn lý do và căn cứ quy chuẩn SOP",
  "recommended_steps": ["Bước 1 (kèm điều khoản SOP)", "Bước 2", "Bước 3"],
  "action_type": "SHUTDOWN_DEVICE" hoặc "SET_ECO_MODE",
  "button_title": "Tên nút bấm hành động",
  "estimated_energy_saved_watts": 2200.0
}}"""
        res = agent_llm.invoke(prompt)
        content = res.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        data = json.loads(content)
        device_ids = [d.device_id for d in report.affected_devices]
        
        action_type = data.get("action_type", "SHUTDOWN_DEVICE" if not report.home_occupied else "SET_ECO_MODE")
        btn_style = "danger" if action_type == "SHUTDOWN_DEVICE" else "warning"
        
        buttons = [
            ActionButton(
                button_id=f"btn-action-{report.incident_id}",
                title=data.get("button_title", "Thực Thi Hành Động An Toàn"),
                action_type=action_type,
                target_devices=device_ids,
                mqtt_topic="iot/devices/control",
                mqtt_payload={"command": "POWER_OFF" if action_type == "SHUTDOWN_DEVICE" else "ECO_MODE", "targets": device_ids, "incident_id": report.incident_id},
                style=btn_style
            )
        ]
        if not report.home_occupied:
            buttons.append(ActionButton(
                button_id=f"btn-dismiss-{report.incident_id}",
                title="Tiếp Tục Bật Thiết Bị (Bỏ Qua Cảnh Báo)",
                action_type="DISMISS",
                target_devices=[],
                mqtt_topic="agent/incident/dismiss",
                mqtt_payload={"incident_id": report.incident_id},
                style="secondary"
            ))

        return MitigationPlan(
            incident_id=report.incident_id,
            title=data.get("title", f"Cảnh Báo Sự Cố {report.overall_severity}"),
            explanation=data.get("explanation", report.root_cause_summary),
            recommended_steps=data.get("recommended_steps", ["Cách ly nguồn điện an toàn theo SOP."]),
            action_buttons=buttons,
            requires_human_approval=True,
            estimated_energy_saved_watts=float(data.get("estimated_energy_saved_watts", 1500.0))
        )
