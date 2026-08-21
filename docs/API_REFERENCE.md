# Aegis-IoT: REST API & WebSocket Protocol Reference

> **Complete API Specifications for Aegis-IoT Multi-Agent Platform**  
> Base URL: `http://localhost:8000` (or configured `DASHBOARD_BASE_URL`)  
> Interactive OpenAPI Documentation: `http://localhost:8000/docs`

---

## 1. Modular Routers Architecture

The backend API is organized into 7 decoupled FastAPI routers under `dashboard/routers/`:

```
dashboard/routers/
├── agent_router.py          # Multi-Agent StateGraph & HITL Approval
├── mqtt_router.py           # WebSocket Bridge & Device Controls
├── rag_router.py            # PDF Indexing & Conversational RAG
├── model_router.py          # Machine Learning Signal Inference
├── notification_router.py   # Alert Subscriptions & SMTP Settings
├── verified_plans_router.py # Layer 5 Closed-Loop Memory CRUD
└── chat_router.py           # Multi-Device Chat Session Persistence
```

---

## 2. Multi-Agent & HITL Router (`agent_router.py`)

### `POST /api/simulate-anomaly`
Triggers an end-to-end 5-Node LangGraph multi-agent diagnostic run for a specific simulated or custom anomaly scenario.

**Request Body:**
```json
{
  "scenario": "ac_overheat"
}
```
*Supported Scenarios:* `energy_saving`, `ac_overheat`, `water_heater_leak`, `co2_spike`, `mechanical_wear`, `normal`.

**Response (200 OK):**
```json
{
  "orchestrator": "HomeCoordinatorAgent",
  "scenario": "ac_overheat",
  "diagnostic_report": {
    "incident_id": "INC-20260821-AC01",
    "timestamp": "2026-08-21T15:30:00.000Z",
    "affected_devices": ["AC_01"],
    "root_cause_summary": "Máy lạnh AC_01 quá nhiệt (38.5°C) và công suất tăng đột biến (3200W).",
    "severity": "CRITICAL",
    "confidence_score": 0.94
  },
  "rag_grounding_context": {
    "sop_code": "SOP_ASHRAE_HVAC_01",
    "confidence_score": 0.91,
    "matched_rules": ["ASHRAE 36 Overheat Protection", "ISO 50001 Energy Surge Limit"],
    "grounded_summary": "Theo ASHRAE 36, ngắt khẩn cấp hoặc chuyển sang chế độ ECO khi nhiệt độ dàn ngưng vượt 35°C."
  },
  "mitigation_plan": {
    "plan_id": "PLAN-7F8A9B",
    "title": "Hạ tải khẩn cấp và chuyển chế độ ECO máy lạnh AC_01",
    "requires_human_approval": true,
    "action_buttons": [
      {
        "action_id": "ACT-SHUTDOWN-AC",
        "label": "Tắt máy lạnh ngay",
        "action_type": "EMERGENCY_SHUTDOWN",
        "target_devices": ["AC_01"],
        "mqtt_topic": "hackathon/smarthome/AC_01/control",
        "mqtt_payload": {"power": "OFF"},
        "is_destructive": true
      },
      {
        "action_id": "ACT-ECO-AC",
        "label": "Chuyển chế độ ECO (26°C)",
        "action_type": "SWITCH_ECO_MODE",
        "target_devices": ["AC_01"],
        "mqtt_topic": "hackathon/smarthome/AC_01/control",
        "mqtt_payload": {"mode": "ECO", "target_temp": 26.0},
        "is_destructive": false
      }
    ]
  },
  "agent_execution_traces": [
    {
      "agent_name": "1. HomeCoordinatorAgent (Supervisor)",
      "role": "Điều phối StateGraph",
      "model": "Gemini 2.5 Flash",
      "latency_ms": 1.2,
      "status": "COMPLETED"
    },
    {
      "agent_name": "2. IoTObservationAgent",
      "role": "Lọc Kalman & Freshness",
      "model": "Kalman 1D",
      "latency_ms": 2.1,
      "status": "COMPLETED"
    },
    {
      "agent_name": "3. ComfortEnergyAgent",
      "role": "Tra cứu Qdrant RAG",
      "model": "Qdrant Vector DB",
      "latency_ms": 14.5,
      "status": "COMPLETED"
    },
    {
      "agent_name": "4. SafetyDiagnosticAgent",
      "role": "4S3F RCA & Lập kế hoạch",
      "model": "Gemini 2.5 Flash",
      "latency_ms": 22.8,
      "status": "COMPLETED"
    },
    {
      "agent_name": "5. HomeActionVerificationAgent",
      "role": "Thực thi & Kiểm chứng",
      "model": "Read-Back Verification",
      "latency_ms": 5.4,
      "status": "COMPLETED"
    }
  ],
  "total_reasoning_time_ms": 46.0,
  "status": "AWAITING_USER_ACTION"
}
```

---

### `POST /api/homeowner/hitl-decision`
Submits a Human-in-the-Loop decision for an action plan (confirm or reject), dispatches the approved MQTT control command, and triggers Layer 5 memory vectorization.

**Request Body:**
```json
{
  "action_id": "ACT-ECO-AC",
  "decision": "CONFIRM",
  "incident_id": "INC-20260821-AC01",
  "title": "Chuyển chế độ ECO máy lạnh AC_01",
  "target_devices": ["AC_01"],
  "mqtt_topic": "hackathon/smarthome/AC_01/control",
  "mqtt_payload": {"mode": "ECO", "target_temp": 26.0},
  "operator": "Nguyễn Văn Minh Tâm",
  "feedback_notes": "Đã phê duyệt chuyển ECO để giảm nhiệt an toàn.",
  "estimated_energy_saved_watts": 850.0
}
```

**Response (200 OK):**
```json
{
  "status": "APPROVED_AND_EXECUTED",
  "action_id": "ACT-ECO-AC",
  "decision": "CONFIRM",
  "mqtt_status": "DISPATCHED",
  "feedback_vector_id": "vec_7d9e2a1b",
  "message": "Lệnh đã được phát qua MQTT và kế hoạch đã được nạp vào bộ nhớ tự học Layer 5."
}
```

---

### `GET /api/active-incident`
Returns the currently cached active incident state, pending action buttons, and latest diagnosis.

### `GET /api/schedules`
Returns all active and historical energy/comfort schedules created by the multi-agent system.

### `GET /api/maintenance-tickets`
Returns all generated maintenance and inspection tickets.

### `GET /api/telemetry-stream`
Returns real-time aggregated telemetry readings across all 6 devices.

### `POST /api/homeowner/chat`
Conversational chat interface for homeowners to query smart home status and request agent actions.

---

## 3. MQTT & Live Devices Router (`mqtt_router.py`)

### `WebSocket /ws/mqtt`
Real-time bidirectional WebSocket stream providing:
- High-frequency sensor telemetry.
- Anomaly alerts and safety breach events.
- Streaming multi-agent reasoning trace tokens.

### `GET /api/mqtt/status`
Returns connection status and metrics for the Mosquitto MQTT broker.

### `GET /api/mqtt/devices`
Returns metadata and latest state for all 6 Track A monitored devices.

### `GET /api/mqtt/device/{device_code}`
Returns real-time telemetry and metadata for a specific device (e.g., `AC_01`, `METER_01`).

### `POST /api/mqtt/publish`
Publishes raw control payloads to a specific MQTT topic.

**Request Body:**
```json
{
  "topic": "hackathon/smarthome/AC_01/control",
  "payload": {"power": "ON", "mode": "COOL", "temp": 24.0}
}
```

---

## 4. RAG Knowledge Base Router (`rag_router.py`)

### `POST /api/rag/upload-pdf`
Uploads, extracts, and semantically indexes a PDF technical standard or equipment manual into Qdrant collection `system_baselines_sop`.

**Form-Data:**
- `file`: PDF file (`multipart/form-data`)

**Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "doc_id": "doc_ahu_guideline_36",
  "filename": "ASHRAE_Guideline_36_HVAC.pdf",
  "chunks_indexed": 42,
  "embedding_dim": 1024,
  "collection": "system_baselines_sop"
}
```

### `GET /api/rag/documents`
Lists all indexed standards, SOPs, and manuals with chunk counts and active toggle statuses.

### `POST /api/rag/chat`
Performs semantic retrieval against Qdrant and generates a grounded response with strict source citations.

**Request Body:**
```json
{
  "query": "Quy định ngưỡng nhiệt độ tối đa và công suất an toàn của máy lạnh Inverter theo ASHRAE 36 là bao nhiêu?",
  "top_k": 3
}
```

**Response (200 OK):**
```json
{
  "answer": "Theo ASHRAE Guideline 36, nhiệt độ dàn lạnh tiêu chuẩn dao động từ 20.0°C đến 24.0°C. Khi nhiệt độ vượt quá 34.0°C hoặc công suất tiêu thụ vượt 2200W, hệ thống cần kích hoạt chế độ bảo vệ giảm tải khẩn cấp.",
  "confidence_score": 0.93,
  "citations": [
    {
      "sop_code": "SOP_ASHRAE_HVAC_01",
      "title": "ASHRAE Guideline 36 HVAC Operational Baselines",
      "similarity_score": 0.934
    }
  ]
}
```

### `GET /api/rag/history` & `POST /api/rag/clear-chat`
Manages conversational history for RAG Studio.

### `GET /api/rag/stats`
Returns total document counts, chunk counts, vector dimensions, and Qdrant storage usage.

---

## 5. ML Signal Models Router (`model_router.py`)

### `POST /api/calculate-model`
Executes real-time mathematical calculations for signal processing and anomaly detection algorithms in `machine_learning/`.

**Request Body (Kalman Filter):**
```json
{
  "model_type": "kalman",
  "measurement": 32.4,
  "current_state": 25.0,
  "q": 0.05,
  "r": 0.80
}
```

**Response (200 OK):**
```json
{
  "model_type": "kalman",
  "measurement": 32.4,
  "smoothed_value": 29.28,
  "kalman_gain": 0.578,
  "formula_latex": "\\hat{x}_{k|k} = \\hat{x}_{k|k-1} + K_k(z_k - \\hat{x}_{k|k-1})"
}
```

**Request Body (Isolation Forest):**
```json
{
  "model_type": "isolation_forest",
  "h_x": 2.1,
  "n": 256
}
```

**Response (200 OK):**
```json
{
  "model_type": "isolation_forest",
  "h_x": 2.1,
  "n": 256,
  "c_n": 8.93,
  "anomaly_score": 0.849,
  "severity": "CRITICAL",
  "is_anomaly": true,
  "formula_latex": "s(x, n) = 2^{-\\frac{\\mathbb{E}(h(x))}{c(n)}}"
}
```

---

## 6. Notification Service Router (`notification_router.py`)

### `GET /api/notifications/settings` & `POST /api/notifications/settings`
Reads and updates SMTP email alert configurations, alert thresholds, and dispatch rules.

### `POST /api/notifications/recipients/add` & `remove`
Manages the distribution list for automated safety alert emails.

### `GET /api/notifications/history`
Returns historical dispatched alert logs with timestamps, recipient lists, and delivery statuses.

### `POST /api/notifications/test`
Sends a test alert email to verify SMTP gateway credentials.

### `POST /api/subscribe-email`
Allows home occupants or engineers to subscribe to safety alerts.

---

## 7. Verified Plans Memory Router (`verified_plans_router.py`)

### `GET /api/history/verified-plans`
Retrieves all human-verified resolution plans stored in Qdrant `verified_action_plans` (Layer 5 Closed-Loop Memory).

### `GET /api/history/verified-plans/{record_id}`
Retrieves detailed metadata, root-cause analysis, and executed action steps for a specific verified case.

### `POST /api/history/verified-plans/seed`
Seeds benchmark verified historical incidents for cold-start few-shot retrieval.

### `DELETE /api/history/verified-plans`
Clears the feedback memory cache.

---

## 8. Multi-Session Chat Router (`chat_router.py`)

### `GET /api/chat/sessions`
Returns all active conversational sessions with message summaries and creation timestamps.

### `POST /api/chat/sessions/sync`
Synchronizes chat history and message states across multiple client devices.

### `POST /api/chat/sessions` & `DELETE /api/chat/sessions/{session_id}`
Creates a new chat session or deletes an existing session.
