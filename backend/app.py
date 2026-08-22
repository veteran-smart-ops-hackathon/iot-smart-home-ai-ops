"""
backend/app.py — Aegis-IoT API Gateway Entry Point
Chỉ chứa: FastAPI app init, lifespan, static mounts, page routes, và router includes.
"""
import os
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from config import get_settings, get_rag_llm, get_embeddings, get_qdrant_client
from agentic.schemas import (
    DeviceMLReading,
    ActionButton,
    VerifiedActionPlanRecord,
    VerifiedPlansStats,
    SmartHomeDeviceState,
    MQTTBrokerStatusResponse
)
from agentic.orchestrator import OrchestratorAgent
from agentic.verified_plans_store import VerifiedPlansHistoryStore
from rag import RAGVectorStore, RAGChatEngine, process_pdf_bytes, format_vietnam_datetime, is_datetime_query
from pre_progressor import get_mqtt_gateway, STANDARD_DEVICES
from machine_learning import (
    KalmanFilter1D,
    IsolationForestScorer,
    StatisticalAutoencoderDetector,
    ZScoreDetector,
    calculate_cosine_similarity,
)

from backend.routers import (
    mqtt_router,
    agent_router,
    rag_router,
    model_router,
    notification_router,
    verified_plans_router,
    chat_router,
)
from backend import dependencies

logger = logging.getLogger("DashboardApp")

# ── Singleton Initialization ──────────────────────────────────────────────────
rag_vector_store = RAGVectorStore()
rag_engine = RAGChatEngine(vector_store=rag_vector_store)
orchestrator = OrchestratorAgent(vector_store=rag_vector_store)
verified_plans_store = VerifiedPlansHistoryStore()
mqtt_gateway = get_mqtt_gateway()

# ── Wire dependencies for routers ──────────────────────────────────────────────
dependencies.init_dependencies(
    mqtt_gateway=mqtt_gateway,
    orchestrator=orchestrator,
    rag_vector_store=rag_vector_store,
    rag_engine=rag_engine,
    verified_plans_store=verified_plans_store,
)


import threading
from scripts.ingest_knowledge_base import ingest_all_knowledge_base

def _auto_ingest_kb():
    """Tự động nạp tài liệu tiêu chuẩn IEEE/SOP vào Vector Store khi khởi động container."""
    try:
        logger.info("Starting background Knowledge Base auto-ingestion...")
        loaded = ingest_all_knowledge_base(vector_store=rag_vector_store, quiet=True)
        logger.info(f"Knowledge Base auto-ingestion completed. Total documents: {loaded}")
    except Exception as exc:
        logger.warning(f"Knowledge Base auto-ingestion notice: {exc}")


# ── Lifespan (QA1: replaces deprecated @app.on_event) ─────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Khởi động và dừng an toàn MQTT Gateway và Knowledge Base theo vòng đời FastAPI app."""
    mqtt_gateway.start()
    threading.Thread(target=_auto_ingest_kb, daemon=True, name="KB-AutoIngest").start()
    yield
    mqtt_gateway.stop()


# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Aegis-IoT Cozy Home Multi-Agent Operations Center",
    description="Trung tâm Giám sát IoT Gia đình Trầm Ấm, Chẩn đoán Đa Tác Tử Tự Trị & Khép Vòng Phản Hồi",
    version="2.5.0",
    lifespan=lifespan,
)

# ── Mount static files ────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

FRONTEND_DIST = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "dist"))
if os.path.exists(os.path.join(FRONTEND_DIST, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="react_assets")


# ── Page HTML Helper ──────────────────────────────────────────────────────────
def get_page_html(template_name: str, request: Optional[Request] = None) -> str:
    if request and request.query_params.get("legacy") == "true":
        template_path = os.path.join(BASE_DIR, "templates", template_name)
        if not os.path.exists(template_path) and template_name == "evidence.html":
            template_path = os.path.join(BASE_DIR, "templates", "models.html")
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()

    react_index = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(react_index):
        with open(react_index, "r", encoding="utf-8") as f:
            return f.read()

    template_path = os.path.join(BASE_DIR, "templates", template_name)
    if not os.path.exists(template_path) and template_name == "evidence.html":
        template_path = os.path.join(BASE_DIR, "templates", "models.html")
    with open(template_path, "r", encoding="utf-8") as f:
        return f.read()


# ── Page Routes (5 Studios & User Pages) ──────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def index_page(request: Request):
    return get_page_html("index.html", request)


@app.get("/subscribe", response_class=HTMLResponse)
@app.get("/alerts", response_class=HTMLResponse)
@app.get("/user", response_class=HTMLResponse)
@app.get("/notify", response_class=HTMLResponse)
async def subscribe_page(request: Request):
    return get_page_html("subscribe.html", request)


@app.get("/agentic", response_class=HTMLResponse)
@app.get("/multi-agent", response_class=HTMLResponse)
async def agentic_page(request: Request):
    return get_page_html("agentic.html", request)


@app.get("/rag", response_class=HTMLResponse)
async def rag_page(request: Request):
    return get_page_html("rag.html", request)


@app.get("/evidence", response_class=HTMLResponse)
@app.get("/models", response_class=HTMLResponse)
async def evidence_page(request: Request):
    return get_page_html("evidence.html", request)


# ── Include Routers ───────────────────────────────────────────────────────────
app.include_router(mqtt_router.router)
app.include_router(agent_router.router)
app.include_router(rag_router.router)
app.include_router(model_router.router)
app.include_router(notification_router.router)
app.include_router(verified_plans_router.router)
app.include_router(chat_router.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
