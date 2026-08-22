"""
backend/dependencies.py
Centralized FastAPI dependency providers cho tất cả routers.
Các singleton được khởi tạo tại module-level trong app.py và được
expose qua dependency functions để dùng với FastAPI Depends().
"""
from __future__ import annotations
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from agentic.orchestrator import OrchestratorAgent
    from rag.vector_store import RAGVectorStore
    from rag.chat_engine import RAGChatEngine
    from pre_progressor.mqtt_gateway import MQTTGateway
    from agentic.verified_plans_store import VerifiedPlansHistoryStore

# Module-level references — được gán bởi app.py khi startup
_mqtt_gateway = None
_orchestrator = None
_rag_vector_store = None
_rag_engine = None
_verified_plans_store = None


def init_dependencies(
    mqtt_gateway,
    orchestrator,
    rag_vector_store,
    rag_engine,
    verified_plans_store,
):
    """Gọi 1 lần khi app.py khởi tạo các singleton."""
    global _mqtt_gateway, _orchestrator, _rag_vector_store, _rag_engine, _verified_plans_store
    _mqtt_gateway = mqtt_gateway
    _orchestrator = orchestrator
    _rag_vector_store = rag_vector_store
    _rag_engine = rag_engine
    _verified_plans_store = verified_plans_store


def get_mqtt_gateway():
    return _mqtt_gateway


def get_orchestrator():
    return _orchestrator


def get_rag_vector_store():
    return _rag_vector_store


def get_rag_engine():
    return _rag_engine


def get_verified_plans_store():
    return _verified_plans_store
