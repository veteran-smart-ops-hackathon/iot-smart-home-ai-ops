---
name: iot-incident-resolution
description: Use when an IoT anomaly or fault alert is ingested to execute the 3-agent diagnostic and planning pipeline, characterize device errors, and generate user action buttons.
---

# IoT Incident Resolution Workflow

Follow this procedure when processing IoT anomaly events:

1. **Ingest Sensor Readings**: Validate telemetry payloads against `DeviceMLReading` schema.
2. **Execute Fault Characterization**: Dispatch readings to `FaultCharacterizationAgent` to identify specific fault signatures.
3. **Generate Action Plan**: Pass `DiagnosticReport` to `PlanningAndActionAgent` to formulate mitigation steps and UI buttons.
4. **Coordinate Human Approval**: Deliver `MitigationPlan` to UI; execute MQTT command only when the user confirms.
