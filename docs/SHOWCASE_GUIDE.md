# Aegis-IoT: System Showcase, Portfolio & Technical Defense Guide

> **SEAL Hackathon 2026 - 3rd Prize Winner**  
> Comprehensive guide for GitHub profile showcasing, LinkedIn announcement, CV/Resume bullet points, 5 Standard Demo Scenarios, and Technical Defense Q&A Cheat Sheet.

---

## 1. GitHub Repository Optimization

### Recommended Repository Metadata
* **Repository Name**: `iot-smart-home-ai-ops`
* **Description**:
  > **3rd Prize Winner - SEAL Hackathon 2026** | Autonomous Multi-Agent IoT Diagnostic, Planning & Closed-Loop Feedback System powered by Google Gemini 2.5, LangGraph StateGraph, Qdrant Vector DB, TimescaleDB & RabbitMQ. Certified Harness Score Level 4.
* **Topics / Tags**:
  ```
  multi-agent, langgraph, gemini-api, iot, timescaledb, qdrant, rabbitmq, fastapi, react19, tailwindcss, anomaly-detection, hackathon-winner, closed-loop-feedback, harness-score, building-automation
  ```

---

## 2. Professional LinkedIn Announcement Post

```markdown
[3RD PRIZE - SEAL HACKATHON 2026] PROUD TO PRESENT AEGIS-IOT: AUTONOMOUS MULTI-AGENT IoT DIAGNOSTIC & CLOSED-LOOP ACTION PLATFORM!

I am pleased to share that Team VETERAN was awarded 3rd Place at the SEAL Hackathon 2026 (Track: AI-Driven Smart Operations) organized by FPT University & FPT Software!

PROBLEM & SOLUTION:
Modern Smart Buildings and IoT systems generate millions of telemetry data points daily, yet face high false alarm rates and slow, manual incident resolution. 

We engineered Aegis-IoT, an enterprise-grade 5-layer autonomous platform that bridges the gap between high-frequency IoT telemetry, fast unsupervised ML anomaly detection, and deep reasoning LLM multi-agents.

KEY ARCHITECTURAL HIGHLIGHTS:
1. IoT & Physical Ingestion: Scalable message ingestion via Eclipse Mosquitto MQTT & RabbitMQ AMQP event bus.
2. Fast Stream ML Path: Real-time Kalman noise smoothing with dual anomaly inference (Isolation Forest & Statistical Autoencoder).
3. Dual Persistence & Vector Store: 100% telemetry ground truth in TimescaleDB Hypertables combined with Qdrant Vector DB (IEEE standards & SOPs).
4. LangGraph 5-Node StateGraph: Supervisor orchestrating Observation, Comfort & Energy RAG, Safety Diagnostic (4S3F RCA), and Home Action Verification with one-click interactive UI Action Buttons.
5. Closed-Loop Self-Learning: Integrated Human-in-the-Loop verification that embeds resolved cases into vector memory for continuous few-shot improvement.

ENGINEERING RIGOR:
- Certified Level 4 Multi-Agent Harness Maturity (Strict Pydantic typing, MyPy validation, Ruff linting, automated PyTest suite).
- 1-Command Deployment with Docker Compose across microservices.

GitHub Repository: [Your GitHub Repo Link]
Live Demo & Architecture: [Your Video / Demo Link]

Special thanks to the SEAL Hackathon Organizing Committee, Mentors, FPT University, and FPT Software for this rewarding experience.

#SEALHackathon #AI #MultiAgent #LangGraph #Gemini #IoT #Qdrant #TimescaleDB #FastAPI #Docker #SoftwareEngineering #SmartHome
```

---

## 3. High-Impact CV / Resume Bullet Points

### For AI / LLM / Multi-Agent Engineer Positions
```markdown
Aegis-IoT | Autonomous Multi-Agent IoT Platform (3rd Prize - SEAL Hackathon 2026)
- Architected and deployed an autonomous 5-layer Multi-Agent IoT diagnostic and planning system using LangGraph StateGraph, Google Gemini 2.5, and Python FastAPI.
- Implemented a 5-node cyclic state graph (Supervisor, IoT Observation, Comfort & Energy RAG, Safety Diagnostic 4S3F RCA, and Home Action Verification) delivering dynamic SOPs and interactive Action Buttons.
- Built a hybrid vector knowledge retrieval pipeline on Qdrant Vector DB (1024D embeddings) with 3 specialized collections and a Closed-Loop Feedback Worker for continuous few-shot self-learning.
- Achieved Level 4 Multi-Agent Harness Maturity with 100% automated test coverage (PyTest, MyPy, Ruff).
```

### For Software Engineer / Backend / Fullstack Positions
```markdown
Aegis-IoT | Smart Operations Multi-Agent Platform (3rd Prize - SEAL Hackathon 2026)
- Engineered a high-throughput real-time IoT pipeline integrating Eclipse Mosquitto MQTT, RabbitMQ event bus, and PostgreSQL 16/TimescaleDB Hypertables.
- Implemented fast anomaly detection using Isolation Forest and Statistical Autoencoder neural networks coupled with real-time 1D Kalman noise filtering.
- Decoupled backend architecture into 7 modular FastAPI routers and built a responsive React 19 + Tailwind CSS v4 dashboard.
- Containerized an 8-service distributed architecture into a single-command Docker Compose environment.
```

---

## 4. 5 Standard Demo Scenarios (Step-by-Step Walkthrough)

### Scenario 1: AC Overheat & Quá Tải Vắng Nhà (Thermal Runaway & Energy Surge)
* **Context**: Phòng khách không có người (`PIR = 0`), nhiệt độ máy lạnh `AC_01` tăng vọt lên **$38.5^\circ\text{C}$**, công suất đạt **$3200\text{W}$** (vượt ngưỡng an toàn $2200\text{W}$).
* **Execution**:
  1. Gửi request: `POST /api/simulate-anomaly` với payload `{"scenario": "ac_overheat"}`.
  2. **Layer 2 ML**: `IsolationForestScorer` phát hiện bất thường ($s = 0.849 > 0.65$), `ZScoreDetector` flag vượt ngưỡng $3\sigma$.
  3. **Layer 4 LangGraph**: Node 3 tra cứu **ASHRAE Guideline 36**; Node 4 kết luận nguy cơ cháy nổ cuộn dây máy nén và tạo 2 nút bấm: `[Tắt máy lạnh ngay]` và `[Chuyển chế độ ECO (26°C)]`.
  4. **Layer 5 HITL**: Người dùng bấm `[Chuyển chế độ ECO (26°C)]` -> Gửi lệnh MQTT hạ tải an toàn và ghi nhận vào Qdrant `verified_action_plans`.

---

### Scenario 2: Bình Nước Nóng Rò Điện / Quá Nhiệt $75^\circ\text{C}$ (Water Heater Dry-Burn Hazard)
* **Context**: Bình nước nóng `HEATER_01` đạt nhiệt độ **$78.0^\circ\text{C}$**, dòng điện tăng đột biến **$18.5\text{A}$**, công suất **$3800\text{W}$** (nguy cơ cháy khô thanh đốt dry-burn).
* **Execution**:
  1. Trigger kịch bản `water_heater_leak` hoặc đẩy telemetry qua mock stream.
  2. **Layer 4 Diagnostic**: Node 4 đối chiếu tiêu chuẩn an toàn **IEC 60335-2-21** (nhiệt độ giới hạn $65^\circ\text{C}$).
  3. **Action Button**: Tạo nút khẩn cấp `EMERGENCY_SHUTDOWN` ngắt nguồn Relay tức thì, cảnh báo âm thanh và gửi email cảnh báo cho chủ hộ.

---

### Scenario 3: Nồng Độ $\text{CO}_2$ Tăng Cao Vượt Ngưỡng An Toàn (Bedroom Air Quality Spike)
* **Context**: Cảm biến phòng ngủ `CO2_01` ghi nhận nồng độ $\text{CO}_2 = 1950\text{ ppm}$ (vượt ngưỡng ASHRAE 62.1 $1000\text{ ppm}$).
* **Execution**:
  1. **Layer 2 Kalman**: Lọc nhiễu cảm biến khí, xác nhận xu hướng tăng liên tục 5 chu kỳ.
  2. **Layer 4 RAG**: Node 3 trích dẫn **ASHRAE Standard 62.1 & Figaro CDM7160**.
  3. **Autonomous Action**: Kích hoạt quạt thông gió tươi `FAN_01` công suất 100%, đồng thời hé cửa sổ thông minh mà không gây ảnh hưởng đến giấc ngủ người dùng.

---

### Scenario 4: Rủi Ro Hao Mòn Cơ Khí (Mechanical Wear Score $> 0.75$)
* **Context**: Cảm biến rung động và dòng tiêu thụ quạt AHU biến đổi bất thường nhưng chưa vượt ngưỡng tĩnh.
* **Execution**:
  1. **Layer 2 Autoencoder**: `StatisticalAutoencoderDetector` ghi nhận sai số tái tạo $L(x, \hat{x}) > 0.78$, biểu thị rung lắc không đồng trục.
  2. **Diagnostic RCA**: Node 4 phân loại triệu chứng theo **TU Delft 4S3F (Energy & Buildings 2026)**: Hao mòn vòng bi (Bearing Degradation).
  3. **Mitigation Plan**: Tạo phiếu bảo trì `MAINTENANCE_TICKET` tự động gửi kỹ thuật viên bảo dưỡng trước khi hỏng hoàn toàn.

---

### Scenario 5: Tra Cứu Quy Chuẩn Vận Hành SOP Qua RAG Studio
* **Context**: Kỹ sư hoặc chủ hộ đặt câu hỏi chuyên môn trong RAG Studio: *"Ngưỡng dòng điện khởi động và công suất an toàn của máy lạnh Inverter theo tiêu chuẩn quốc tế là bao nhiêu?"*
* **Execution**:
  1. Gọi endpoint: `POST /api/rag/chat`.
  2. **Qdrant Dense Search**: Trích xuất các chunks từ `SOP_IEEE_HVAC_01.md` và `ASHRAE_Guideline_36.pdf` (Cosine $> 0.90$).
  3. **Grounded Synthesis**: Trả về câu trả lời chính xác từng điều khoản kèm trích dẫn số trang và tên tài liệu gốc.

---

## 5. Technical Defense Q&A: Answering Judge Inquiries

| Judge Question | Deep Architectural Strategy & Answer |
| :--- | :--- |
| **Q1: Tại sao chọn In-Memory ML + Lightweight Edge Pipeline thay vì cụm Spark / Flink cồng kềnh?** | "Trong môi trường Smart Home và Edge Computing, **độ trễ (Latency) và footprint tài nguyên là yếu tố sống còn**. Cụm Spark/Flink tiêu tốn hàng Gigabyte RAM và độ trễ khởi động lớn. Bằng cách thiết kế `KalmanFilter1D`, `IsolationForestScorer` và `StatisticalAutoencoderDetector` thuần Python/NumPy tối ưu, hệ thống đạt **độ trễ xử lý dưới 2ms với dung lượng RAM dưới 50MB**, sẵn sàng nhúng trực tiếp trên Raspberry Pi / Edge Gateway mà vẫn đảm bảo độ chính xác toán học tuyệt đối." |
| **Q2: Tại sao chọn LangGraph StateGraph thay vì Sequential Chains thông thường?** | "Vận hành thiết bị thực tế **không bao giờ là một đường thẳng tuyến tính**. Hệ thống cần: (1) **State Checkpointing** để rollback khi lệnh thất bại; (2) **Cyclic Transitions** cho phép tác tử Read-Back Verification kiểm tra cảm biến sau khi điều khiển; và (3) **Human-in-the-Loop Interruption Gates** (`interrupt_before`/`interrupt_after`) chặn các thao tác nguy hiểm (ngắt điện, xả van) chờ người dùng phê duyệt. Các chuỗi tuần tự (Sequential Chains) hoàn toàn không đáp ứng được tính an toàn này." |
| **Q3: Làm thế nào để chống hiện tượng ảo giác (Anti-Hallucination) tuyệt đối khi điều khiển thiết bị vật lý?** | "Aegis-IoT thực hiện **Tam giác xác thực 4 tầng (4-Layer Triangulation)**:<br>1. **Ground Truth Factuality**: Tác tử chẩn đoán bắt buộc đọc dữ liệu số thực tế từ TimescaleDB.<br>2. **Strict RAG Grounding**: Tác tử chỉ được tham chiếu các quy chuẩn IEEE/ASHRAE có điểm Cosine $> 0.80$ trong Qdrant.<br>3. **Deterministic Schema Gate**: Mọi lệnh điều khiển phải qua Pydantic V2 Type Validator.<br>4. **HITL Safety Gate**: Các lệnh có tính phá hủy (`is_destructive=True`) bắt buộc phải được chủ hộ bấm nút duyệt mới phát lệnh qua MQTT." |
| **Q4: Cơ chế tự học Closed-Loop Feedback hoạt động như thế nào khi không cần train lại model LLM?** | "Chúng tôi áp dụng mô hình **In-Context Few-Shot Memory**. Khi một sự cố được kỹ sư xử lý và bấm *'Verify & Resolve'*, bản ghi sự cố gồm (Dấu vân tay cảm biến + Nguyên nhân gốc + Kế hoạch hành động thành công) được vector hóa thành vector 1024D và lưu vào collection `verified_action_plans` trên Qdrant. Lần tới khi gặp sự cố tương tự, Retriever trích xuất ca tiền lệ này để hướng dẫn LLM giải quyết ngay lập tức với độ chính xác 100% mà không cần fine-tune model." |
