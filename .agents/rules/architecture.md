---
trigger: always_on
description: 5-Layer Multi-Agent IoT System (FastAPI + TimescaleDB + Qdrant + LangGraph)
globs: ["**/*"]
---

# Multi-Agent IoT Diagnostic Architecture Rules

See [AGENTS.md](file:///Users/nguyenvanminhtam/Documents/Hackathon_SRC/AGENTS.md) for full architecture specifications.

## 5-Layer Microservices Topology:
1. **Layer 1 (Ingestion)**: IoT -> MQTT / gRPC -> Message Queue (`rabitmq/`).
2. **Layer 2 (Real-Time Fast Path)**: `pre_progressor/` (Kalman/Smoothing) writes 100% to TimescaleDB; forwards to `machine_learning/` (Isolation Forest/Autoencoder).
3. **Layer 3 (Persistence & Vectors)**:
   - **3A. TSDB**: **PostgreSQL 16 + TimescaleDB** (`timescale/timescaledb-ha:pg16`) for 100% Telemetry ground truth.
   - **3B. Qdrant Vector DB**: 3 Collections (`incident_telemetry`, `system_baselines_sop`, `verified_action_plans`) with semantic embeddings + rich payload filtering.
4. **Layer 4 (Multi-Agent Reasoning)**: `agentic/` built with **LangGraph (StateGraph)** & FastAPI:
   - **Orchestrator Node**: Supervises execution graph & Human-in-the-Loop interruptions.
   - **Retriever Node**: Queries TimescaleDB metrics and Qdrant collections.
   - **Diagnostic Node**: Performs root-cause analysis against baselines.
   - **Planner Node**: Generates actionable SOP plans and interactive UI buttons.
5. **Layer 5 (Verification & Feedback Loop)**: User/Engineer clicks 'Verify/Pass' -> Feedback worker writes back to Qdrant `verified_action_plans` for self-learning memory.

## Standards:
- Python 3.11+ with **FastAPI** and **LangGraph** across backend services.
- Deterministic AI Harness validated via `paladini/harness-score@v1` (100% L4).