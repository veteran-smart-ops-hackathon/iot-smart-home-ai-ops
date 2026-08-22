"""
backend/routers/chat_router.py
Chat Sessions Persistence & Bidirectional Cross-Device Sync API endpoints.
"""
import json
import logging
import os
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger("ChatRouter")

router = APIRouter(tags=["Chat Sessions"])

# Database file path for chat sessions
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CHAT_DB_FILE = os.path.abspath(os.path.join(_CURRENT_DIR, "..", "data", "chat_sessions_db.json"))

if not os.path.exists(os.path.dirname(CHAT_DB_FILE)):
    try:
        os.makedirs(os.path.dirname(CHAT_DB_FILE), exist_ok=True)
    except Exception:
        pass


def load_chat_sessions_from_disk() -> Dict[str, Dict[str, Any]]:
    if os.path.exists(CHAT_DB_FILE):
        try:
            with open(CHAT_DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_chat_sessions_to_disk(sessions_data: Dict[str, Dict[str, Any]]):
    try:
        with open(CHAT_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(sessions_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error saving chat sessions to disk: {e}")


# Persistent Storage dictionary for cross-device synchronization (Loaded from disk on start)
CHAT_SESSIONS_STORAGE: Dict[str, Dict[str, Any]] = load_chat_sessions_from_disk()


class ChatSessionItem(BaseModel):
    id: str
    title: str
    updatedAt: str
    messages: List[Dict[str, Any]]
    role: Optional[str] = "homeowner"


class BatchSyncRequest(BaseModel):
    sessions: List[ChatSessionItem]
    role: Optional[str] = "homeowner"


@router.get("/api/chat/sessions")
async def get_chat_sessions(role: str = "homeowner"):
    """
    Trả về danh sách toàn bộ các phiên trò chuyện của người dùng (đồng bộ tức thời giữa Web và Mobile).
    """
    global CHAT_SESSIONS_STORAGE
    disk_data = load_chat_sessions_from_disk()
    if disk_data:
        CHAT_SESSIONS_STORAGE.update(disk_data)

    user_sessions = [
        s for s in CHAT_SESSIONS_STORAGE.values()
        if s.get("role", "homeowner") == role
    ]
    user_sessions.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return {"status": "success", "sessions": user_sessions}


@router.post("/api/chat/sessions/sync")
async def sync_chat_sessions_batch(req: BatchSyncRequest):
    """
    Hợp nhất 2 chiều toàn bộ danh sách phiên chat giữa Client (Điện thoại/Laptop) và Database Server.
    """
    global CHAT_SESSIONS_STORAGE
    disk_data = load_chat_sessions_from_disk()
    if disk_data:
        CHAT_SESSIONS_STORAGE.update(disk_data)

    for item in req.sessions:
        existing = CHAT_SESSIONS_STORAGE.get(item.id)
        if not existing or len(item.messages) >= len(existing.get("messages", [])):
            CHAT_SESSIONS_STORAGE[item.id] = {
                "id": item.id,
                "title": item.title,
                "updatedAt": item.updatedAt,
                "messages": item.messages,
                "role": req.role or "homeowner",
                "timestamp": existing.get("timestamp", time.time()) if existing else time.time()
            }

    save_chat_sessions_to_disk(CHAT_SESSIONS_STORAGE)

    user_sessions = [
        s for s in CHAT_SESSIONS_STORAGE.values()
        if s.get("role", "homeowner") == (req.role or "homeowner")
    ]
    user_sessions.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return {"status": "success", "sessions": user_sessions}


@router.post("/api/chat/sessions")
async def upsert_chat_session(req: ChatSessionItem):
    """
    Tạo mới hoặc cập nhật phiên trò chuyện vào Database tập trung.
    """
    global CHAT_SESSIONS_STORAGE
    CHAT_SESSIONS_STORAGE[req.id] = {
        "id": req.id,
        "title": req.title,
        "updatedAt": req.updatedAt,
        "messages": req.messages,
        "role": req.role or "homeowner",
        "timestamp": time.time()
    }
    save_chat_sessions_to_disk(CHAT_SESSIONS_STORAGE)
    return {"status": "success", "session_id": req.id}


@router.delete("/api/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str):
    """
    Xóa một phiên trò chuyện khỏi Database tập trung.
    """
    global CHAT_SESSIONS_STORAGE
    if session_id in CHAT_SESSIONS_STORAGE:
        del CHAT_SESSIONS_STORAGE[session_id]
        save_chat_sessions_to_disk(CHAT_SESSIONS_STORAGE)
    return {"status": "success", "deleted_id": session_id}
