---
description: Trigger the 3-agent orchestration pipeline to diagnose an IoT anomaly incident and generate mitigation plans.
---

# Diagnose IoT Incident Workflow

1. Ingest telemetry from `pre_progressor/` and anomaly detections from `machine_learning/`.
2. Run `FaultCharacterizationAgent` to identify specific fault signatures.
3. Run `PlanningAndActionAgent` to formulate resolution steps and create actionable UI buttons.
4. Output the synthesized incident plan to the user for approval.
