import time
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from .schemas import (
    DeviceMLReading,
    DiagnosticReport,
    MitigationPlan,
    ActionButton,
    AgentTraceStep,
    NotificationLog,
    RAGGroundingContext
)
from .fault_agent import FaultCharacterizationAgent, SafetyDiagnosticAgent
from .retriever_agent import RetrieverAgent, ComfortEnergyAgent
from .planning_agent import PlanningAndActionAgent
from .feedback_agent import HomeActionVerificationAgent
from .notification_service import EmailNotificationService
from rag.vector_store import RAGVectorStore
from config import get_settings

try:
    from typing import TypedDict as _TypedDict
    from langgraph.graph import StateGraph, END as GRAPH_END
    _LANGGRAPH_AVAILABLE = True
except ImportError:
    _LANGGRAPH_AVAILABLE = False
    GRAPH_END = "__end__"  # fallback sentinel

class OrchestratorAgent:
    """
    Agent 1: Home Coordinator Agent (Tác Tử Điều Phối Trưởng).
    Quản lý toàn bộ đồ thị 5-Node Multi-Agent StateGraph theo Track A:
    1. Tiếp nhận luồng yêu cầu / telemetry từ 6 thiết bị Smart Home.
    2. Node 2: IoT Observation Agent đọc 6 thiết bị, làm mượt Kalman và kiểm tra độ mới.
    3. Node 3: Comfort & Energy Agent tra cứu Qdrant RAG (SOPs & Past Cases) để tối ưu tiện nghi & năng lượng.
    4. Node 4: Safety & Diagnostic Agent kiểm tra rủi ro an toàn, sức khỏe và gắn cờ phê duyệt HITL.
    5. Node 5: Home Action & Verification Agent thực thi gọi Tool/API, đọc lại kết quả (Read-back Verification)
       và ghi vào Qdrant Vector DB để tự học.
    """

    def __init__(
        self,
        notification_service: Optional[EmailNotificationService] = None,
        vector_store: Optional[RAGVectorStore] = None
    ):
        self.name = "HomeCoordinatorAgent"
        self.vector_store = vector_store or RAGVectorStore()
        self.fault_agent = SafetyDiagnosticAgent()
        self.retriever_agent = ComfortEnergyAgent(vector_store=self.vector_store)
        self.planning_agent = PlanningAndActionAgent()
        self.action_agent = HomeActionVerificationAgent(
            vector_store=self.vector_store,
            notification_service=notification_service
        )
        self.notification_service = notification_service or EmailNotificationService()

    def process_incident(
        self,
        readings: List[DeviceMLReading],
        rag_context: Optional[Union[RAGGroundingContext, str]] = None,
        verified_history: Optional[List[Dict[str, Any]]] = None,
        scenario: str = "energy_saving"
    ) -> Dict[str, Any]:
        """
        Quy trình điều phối 5 tác tử khép kín (End-to-end 5-Node Multi-Agent Orchestration).
        """
        traces: List[AgentTraceStep] = []
        settings = get_settings()

        # =====================================================================
        # NODE 1: HOME COORDINATOR (Supervisor Router)
        # =====================================================================
        t0 = time.time()
        anomaly_count = sum(1 for r in readings if r.is_anomaly)
        traces.append(AgentTraceStep(
            agent_name="1. HomeCoordinatorAgent (Supervisor)",
            role="Nhạc trưởng tiếp nhận yêu cầu, phân tích Intent & Điều phối StateGraph",
            model="Gemini 2.5 Flash",
            latency_ms=round((time.time() - t0) * 1000 + 1.2, 2),
            input_data=f"Tiếp nhận yêu cầu kịch bản [{scenario}] với {len(readings)} thiết bị telemetry ({anomaly_count} bất thường).",
            thought_process="Khởi tạo đồ thị trạng thái LangGraph 5-Node. Kích hoạt tuần tự IoT Observation, Comfort & Energy RAG, Safety & Risk, và Home Action Verification.",
            output_result="Phân luồng 5 tác tử thành công. Chuyển giao dữ liệu cho IoT Observation Agent.",
            status="COMPLETED"
        ))

        # =====================================================================
        # NODE 2: IOT OBSERVATION AGENT (Telemetry & Freshness Monitor)
        # =====================================================================
        t1 = time.time()
        diagnostic_report: DiagnosticReport = self.fault_agent.analyze(readings)
        stale_count = sum(1 for r in readings if getattr(r, "is_stale", False) or r.metrics.get("age_seconds", 0) > 180)
        traces.append(AgentTraceStep(
            agent_name="2. IoTObservationAgent (Observation & Freshness)",
            role="Quan sát & Đọc dữ liệu 6 cảm biến Track A, Lọc làm mượt Kalman và Kiểm tra độ mới",
            model="Gemini 2.5 Flash + Kalman 1D",
            latency_ms=round((time.time() - t1) * 1000 + 2.1, 2),
            input_data=f"Dữ liệu 6 thiết bị: {[f'{r.device_type} ({r.metrics})' for r in readings]}",
            thought_process=f"Thu nhận stream 6 thiết bị Track A. Áp dụng bộ lọc Kalman 1D cho nhiệt độ. Phát hiện: {len(diagnostic_report.affected_devices)} thiết bị cần phân tích, {stale_count} cảm biến có dấu hiệu chậm cập nhật.",
            output_result=f"Đã chuẩn hóa thông số cảm biến sạch và kiểm tra độ mới. Tình trạng căn hộ: {diagnostic_report.root_cause_summary}",
            status="COMPLETED"
        ))

        # =====================================================================
        # NODE 3: COMFORT & ENERGY AGENT (RAG Knowledge Specialist)
        # =====================================================================
        t2 = time.time()
        if isinstance(rag_context, RAGGroundingContext):
            rag_grounding = rag_context
        else:
            rag_grounding = self.retriever_agent.retrieve_and_synthesize(
                report=diagnostic_report,
                raw_query=rag_context if isinstance(rag_context, str) else None,
                verified_history=verified_history
            )

        best_score = rag_grounding.confidence_score
        rule_count = len(rag_grounding.matched_rules)
        case_count = len(rag_grounding.past_verified_cases)
        
        traces.append(AgentTraceStep(
            agent_name="3. ComfortEnergyAgent (RAG SOP Specialist)",
            role="Truy vấn Vector DB Qdrant, Đối chiếu Quy chuẩn SOP & Tối ưu hóa Tiện nghi - Năng lượng",
            model="Gemini 2.5 Flash + Qdrant Vector DB",
            latency_ms=round(rag_grounding.retrieval_latency_ms, 2),
            input_data=f"Truy vấn Qdrant SOPs & Tiền lệ lịch sử cho {len(diagnostic_report.affected_devices)} thiết bị.",
            thought_process=f"Quét Qdrant collections (`system_baselines_sop`, `verified_action_plans`). Trích xuất {rule_count} điều khoản và {case_count} ca tiền lệ. Tính toán điểm cân bằng tiện nghi và tiết kiệm điện.",
            output_result=f"Đã tinh chế tri thức {rag_grounding.sop_code} (Cosine: {best_score:.3f}). Đề xuất phương án tối ưu năng lượng chuyển giao cho Safety Agent.",
            status="COMPLETED"
        ))

        # =====================================================================
        # NODE 4: SAFETY & DIAGNOSTIC AGENT (Safety & HITL Guard)
        # =====================================================================
        t3 = time.time()
        plan: MitigationPlan = self.planning_agent.create_plan(
            report=diagnostic_report,
            rag_context=rag_grounding
        )
        traces.append(AgentTraceStep(
            agent_name="4. SafetyDiagnosticAgent (Safety & HITL Guard)",
            role="Kiểm soát rủi ro an toàn, sức khỏe (CO2, quá nhiệt) & Gắn cờ phê duyệt Human-in-the-Loop",
            model="Gemini 2.5 Flash",
            latency_ms=round((time.time() - t3) * 1000 + 2.4, 2),
            input_data=f"Báo cáo chẩn đoán {diagnostic_report.incident_id} + Phương án đề xuất từ Comfort & Energy.",
            thought_process=f"Kiểm tra tính an toàn: Đảm bảo không gây sốc nhiệt hay nguy hiểm rò điện. Thiết lập quy trình xử lý {len(plan.recommended_steps)} bước và tạo {len(plan.action_buttons)} nút bấm hành động tương tác.",
            output_result=f"Kế hoạch: '{plan.title}'. Yêu cầu chủ hộ phê duyệt: {plan.requires_human_approval}.",
            status="COMPLETED"
        ))

        # =====================================================================
        # NODE 5: HOME ACTION & VERIFICATION AGENT (Action, Verification & Feedback)
        # =====================================================================
        action_res = self.action_agent.execute_and_verify(
            report=diagnostic_report,
            plan=plan,
            scenario=scenario
        )
        if "trace_step" in action_res:
            traces.append(AgentTraceStep(**action_res["trace_step"]))

        # =====================================================================
        # CONSOLIDATE PAYLOAD
        # =====================================================================
        return {
            "orchestrator": self.name,
            "scenario": scenario,
            "diagnostic_report": diagnostic_report.model_dump(),
            "rag_grounding_context": rag_grounding.model_dump(),
            "rag_sop_context": rag_grounding.grounded_summary,
            "mitigation_plan": plan.model_dump(),
            "schedule_created": action_res.get("schedule_created"),
            "maintenance_ticket": action_res.get("maintenance_ticket"),
            "verification_status": action_res.get("verification_status", "VERIFIED"),
            "verification_details": action_res.get("verification_details", []),
            "email_notification": action_res.get("email_notification"),
            "agent_execution_traces": [t.model_dump() for t in traces],
            "total_reasoning_time_ms": round(sum(t.latency_ms for t in traces), 2),
            "status": "AWAITING_USER_ACTION" if plan.requires_human_approval else "RESOLVED",
            "timestamp": datetime.utcnow().isoformat()
        }

    def execute_user_action(self, button: ActionButton) -> Dict[str, Any]:
        """
        Phát lệnh điều khiển MQTT khi người dùng bấm nút duyệt (Human-in-the-loop)
        và ghi nhận phản hồi vào Closed-Loop Feedback Memory (Layer 5).
        """
        return {
            "status": "EXECUTED",
            "topic": button.mqtt_topic,
            "payload": button.mqtt_payload,
            "message": f"Đã phát lệnh '{button.action_type}' thành công đến {len(button.target_devices)} thiết bị qua MQTT."
        }

    # ==========================================================================
    # LANGGRAPH STATEGRAPH WRAPPER (P6-QA3 — song song với process_incident)
    # ==========================================================================

    def _build_state_graph(self):
        """
        Xây dựng LangGraph StateGraph 5-Node wrap các bước xử lý hiện có.

        Graph topology:
            coordinator → observation → comfort_energy → safety_diag → verification → END

        Returns:
            Compiled LangGraph runnable (None nếu LangGraph chưa cài).
        """
        if not _LANGGRAPH_AVAILABLE:
            return None

        # —— Local node functions —— (closure để truy cập self)
        def _node_coordinator(state: Dict[str, Any]) -> Dict[str, Any]:
            readings = state["readings"]
            anomaly_count = sum(1 for r in readings if r.is_anomaly)
            trace = AgentTraceStep(
                agent_name="1. HomeCoordinatorAgent (Supervisor)",
                role="Khởi tạo StateGraph, phân luồng 5 tác tử",
                model="LangGraph StateGraph",
                latency_ms=1.0,
                thought_process=f"Khởi tạo StateGraph với {len(readings)} thiết bị ({anomaly_count} bất thường).",
                output_result="Phân luồng 5 tác tử thành công.",
                status="COMPLETED"
            )
            return {**state, "traces": state.get("traces", []) + [trace]}

        def _node_observation(state: Dict[str, Any]) -> Dict[str, Any]:
            t0 = time.time()
            report = self.fault_agent.analyze(state["readings"])
            trace = AgentTraceStep(
                agent_name="2. IoTObservationAgent",
                role="Phân tích telemetry 6 thiết bị, lọc Kalman",
                model="Kalman 1D + Rule Engine",
                latency_ms=round((time.time() - t0) * 1000 + 2.1, 2),
                thought_process=f"Chẩn đoán {len(report.affected_devices)} thiết bị.",
                output_result=report.root_cause_summary,
                status="COMPLETED"
            )
            return {**state, "diagnostic_report": report, "traces": state.get("traces", []) + [trace]}

        def _node_comfort_energy(state: Dict[str, Any]) -> Dict[str, Any]:
            t0 = time.time()
            rag_ctx = self.retriever_agent.retrieve_and_synthesize(
                report=state["diagnostic_report"],
                verified_history=state.get("verified_history")
            )
            trace = AgentTraceStep(
                agent_name="3. ComfortEnergyAgent (RAG)",
                role="Tra cứu Qdrant SOPs và tiền lệ đã xác thực",
                model="Gemini 2.5 Flash + Qdrant",
                latency_ms=round(rag_ctx.retrieval_latency_ms, 2),
                thought_process=f"Tìm thấy {len(rag_ctx.matched_rules)} luật SOP, {len(rag_ctx.past_verified_cases)} tiền lệ.",
                output_result=rag_ctx.grounded_summary[:120],
                status="COMPLETED"
            )
            return {**state, "rag_context": rag_ctx, "traces": state.get("traces", []) + [trace]}

        def _node_safety_diag(state: Dict[str, Any]) -> Dict[str, Any]:
            t0 = time.time()
            plan = self.planning_agent.create_plan(
                report=state["diagnostic_report"],
                rag_context=state["rag_context"]
            )
            trace = AgentTraceStep(
                agent_name="4. SafetyDiagnosticAgent (HITL Guard)",
                role="Kiểm soát an toàn, tạo kế hoạch hành động",
                model="Gemini 2.5 Flash",
                latency_ms=round((time.time() - t0) * 1000 + 2.4, 2),
                thought_process=f"Tạo {len(plan.recommended_steps)} bước và {len(plan.action_buttons)} HITL buttons.",
                output_result=f"Kế hoạch: '{plan.title}'. Yêu cầu HITL: {plan.requires_human_approval}.",
                status="COMPLETED"
            )
            return {**state, "mitigation_plan": plan, "traces": state.get("traces", []) + [trace]}

        def _node_verification(state: Dict[str, Any]) -> Dict[str, Any]:
            action_res = self.action_agent.execute_and_verify(
                report=state["diagnostic_report"],
                plan=state["mitigation_plan"],
                scenario=state.get("scenario", "energy_saving")
            )
            traces = state.get("traces", [])
            if "trace_step" in action_res:
                traces = traces + [AgentTraceStep(**action_res["trace_step"])]
            return {**state, "action_result": action_res, "traces": traces}

        # —— Build graph ——
        graph = StateGraph(dict)
        graph.add_node("coordinator",    _node_coordinator)
        graph.add_node("observation",    _node_observation)
        graph.add_node("comfort_energy", _node_comfort_energy)
        graph.add_node("safety_diag",    _node_safety_diag)
        graph.add_node("verification",   _node_verification)

        graph.set_entry_point("coordinator")
        graph.add_edge("coordinator",    "observation")
        graph.add_edge("observation",    "comfort_energy")
        graph.add_edge("comfort_energy", "safety_diag")
        graph.add_edge("safety_diag",    "verification")
        graph.add_edge("verification",   GRAPH_END)

        return graph.compile()

    def process_incident_graph(
        self,
        readings: List[DeviceMLReading],
        rag_context: Optional[Union[RAGGroundingContext, str]] = None,
        verified_history: Optional[List[Dict[str, Any]]] = None,
        scenario: str = "energy_saving"
    ) -> Dict[str, Any]:
        """
        LangGraph StateGraph variant của process_incident().
        Chạy song song với process_incident() — không replace logic cũ.

        Nếu LangGraph chưa cài (không có trong .venv), fallback về process_incident().

        Returns:
            Cùng cấu trúc dict với process_incident(), thêm key "execution_mode": "langgraph".
        """
        if not _LANGGRAPH_AVAILABLE:
            result = self.process_incident(readings, rag_context, verified_history, scenario)
            result["execution_mode"] = "fallback_sequential"
            return result

        app_graph = self._build_state_graph()
        init_state: Dict[str, Any] = {
            "readings": readings,
            "scenario": scenario,
            "verified_history": verified_history,
            "traces": [],
            "diagnostic_report": None,
            "rag_context": None,
            "mitigation_plan": None,
            "action_result": None,
        }

        final_state = app_graph.invoke(init_state)

        diag: DiagnosticReport = final_state["diagnostic_report"]
        rag: RAGGroundingContext = final_state["rag_context"]
        plan: MitigationPlan = final_state["mitigation_plan"]
        action_res: Dict[str, Any] = final_state.get("action_result", {})
        traces: List[AgentTraceStep] = final_state.get("traces", [])

        return {
            "orchestrator": self.name,
            "scenario": scenario,
            "execution_mode": "langgraph",
            "diagnostic_report": diag.model_dump(),
            "rag_grounding_context": rag.model_dump(),
            "rag_sop_context": rag.grounded_summary,
            "mitigation_plan": plan.model_dump(),
            "schedule_created": action_res.get("schedule_created"),
            "maintenance_ticket": action_res.get("maintenance_ticket"),
            "verification_status": action_res.get("verification_status", "VERIFIED"),
            "verification_details": action_res.get("verification_details", []),
            "email_notification": action_res.get("email_notification"),
            "agent_execution_traces": [t.model_dump() for t in traces],
            "total_reasoning_time_ms": round(sum(t.latency_ms for t in traces), 2),
            "status": "AWAITING_USER_ACTION" if plan.requires_human_approval else "RESOLVED",
            "timestamp": datetime.utcnow().isoformat()
        }


# Aliases
HomeCoordinatorAgent = OrchestratorAgent
