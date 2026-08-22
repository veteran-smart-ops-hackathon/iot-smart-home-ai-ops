import unittest
from agentic.schemas import DeviceMLReading, ActionButton, RAGGroundingContext, SOPRuleMatch
from agentic.orchestrator import OrchestratorAgent
from agentic.fault_agent import FaultCharacterizationAgent
from agentic.retriever_agent import RetrieverAgent
from agentic.planning_agent import PlanningAndActionAgent
from rag.vector_store import RAGVectorStore

class TestMultiAgentSystem(unittest.TestCase):

    def test_fault_characterization_agent_unattended_device(self):
        agent = FaultCharacterizationAgent()
        readings = [
            DeviceMLReading(
                device_id="AC_01",
                device_type="air_conditioner",
                location="living_room",
                is_anomaly=True,
                anomaly_score=0.88,
                wear_score=0.1,
                metrics={"power_watts": 1200.0, "temp_c": 24.0},
                presence_detected=False
            ),
            DeviceMLReading(
                device_id="HEATER_01",
                device_type="water_heater",
                location="bathroom",
                is_anomaly=True,
                anomaly_score=0.95,
                metrics={"power_watts": 2452.0, "temp_c": 76.5},
                presence_detected=False
            )
        ]

        report = agent.analyze(readings)

        self.assertIn(report.overall_severity, ["HIGH", "CRITICAL"])
        self.assertEqual(len(report.affected_devices), 2)
        self.assertFalse(report.home_occupied)
        self.assertTrue(report.incident_id.startswith("INC-"))

    def test_retriever_agent_extracts_sop_and_past_cases(self):
        vector_store = RAGVectorStore()
        retriever = RetrieverAgent(vector_store=vector_store)
        fault_agent = FaultCharacterizationAgent()

        readings = [
            DeviceMLReading(
                device_id="HEATER_01",
                device_type="water_heater",
                location="bathroom",
                is_anomaly=True,
                anomaly_score=0.96,
                metrics={"power_watts": 2452.0, "temp_c": 76.5},
                presence_detected=False
            )
        ]
        report = fault_agent.analyze(readings)
        rag_context = retriever.retrieve_and_synthesize(report=report)

        self.assertIsInstance(rag_context, RAGGroundingContext)
        self.assertEqual(rag_context.sop_code, "SOP-SH-2026")
        self.assertGreater(len(rag_context.matched_rules), 0)
        self.assertEqual(rag_context.matched_rules[0].required_action, "EMERGENCY_SHUTDOWN")
        self.assertGreater(len(rag_context.past_verified_cases), 0)
        self.assertGreater(rag_context.confidence_score, 0.70)
        self.assertIn("SOP-SH-2026", rag_context.grounded_summary)

    def test_planning_agent_generates_action_buttons(self):
        fault_agent = FaultCharacterizationAgent()
        planning_agent = PlanningAndActionAgent()

        readings = [
            DeviceMLReading(
                device_id="plug-01",
                device_type="heater",
                location="bedroom",
                is_anomaly=True,
                anomaly_score=0.85,
                metrics={"power_watts": 1500.0, "temp_c": 45.0},
                presence_detected=False
            )
        ]

        report = fault_agent.analyze(readings)
        plan = planning_agent.create_plan(report)

        self.assertTrue(plan.requires_human_approval)
        self.assertGreaterEqual(len(plan.action_buttons), 1)
        shutdown_btn = next((b for b in plan.action_buttons if b.action_type == "SHUTDOWN_DEVICE"), None)
        self.assertIsNotNone(shutdown_btn)
        self.assertIn("plug-01", shutdown_btn.target_devices)
        self.assertEqual(shutdown_btn.style, "danger")

    def test_planning_agent_reasons_with_rag_grounding(self):
        fault_agent = FaultCharacterizationAgent()
        retriever = RetrieverAgent()
        planning_agent = PlanningAndActionAgent()

        readings = [
            DeviceMLReading(
                device_id="ac-living-01",
                device_type="dieu_hoa_living",
                location="living_room",
                is_anomaly=True,
                anomaly_score=0.92,
                metrics={"power_watts": 2650.0, "temp_c": 42.0, "current_a": 12.1},
                presence_detected=True
            )
        ]
        report = fault_agent.analyze(readings)
        rag_context = retriever.retrieve_and_synthesize(report=report)
        plan = planning_agent.create_plan(report, rag_context=rag_context)

        self.assertTrue(plan.requires_human_approval)
        self.assertIn("Eco", plan.action_buttons[0].title)
        self.assertEqual(plan.action_buttons[0].action_type, "SET_ECO_MODE")
        self.assertGreater(len(plan.recommended_steps), 1)
        self.assertGreater(plan.estimated_energy_saved_watts, 0)

    def test_orchestrator_pipeline_end_to_end(self):
        orchestrator = OrchestratorAgent()
        readings = [
            DeviceMLReading(
                device_id="tv-living",
                device_type="smart_tv",
                location="living_room",
                is_anomaly=False,
                anomaly_score=0.1,
                metrics={"power_watts": 120.0, "temp_c": 30.0},
                presence_detected=False
            )
        ]

        result = orchestrator.process_incident(readings)

        self.assertEqual(result["status"], "AWAITING_USER_ACTION")
        self.assertIn("diagnostic_report", result)
        self.assertIn("rag_grounding_context", result)
        self.assertIn("mitigation_plan", result)
        self.assertIn("agent_execution_traces", result)
        self.assertEqual(len(result["agent_execution_traces"]), 5) # 5 agent nodes

        plan_data = result["mitigation_plan"]
        self.assertGreater(len(plan_data["action_buttons"]), 0)

        # Test user action execution
        btn = ActionButton(**plan_data["action_buttons"][0])
        exec_result = orchestrator.execute_user_action(btn)
        self.assertEqual(exec_result["status"], "EXECUTED")
        self.assertEqual(exec_result["topic"], btn.mqtt_topic)

if __name__ == "__main__":
    unittest.main()
