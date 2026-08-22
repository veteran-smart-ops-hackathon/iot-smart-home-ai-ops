"""
backend/routers/verified_plans_router.py
Layer 5 Closed-Loop Feedback Memory & Verified Action Plans History endpoints.
"""
from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from backend.dependencies import get_verified_plans_store

router = APIRouter(tags=["Verified Plans"])


@router.get("/api/history/verified-plans")
async def get_verified_plans_history(
    limit: int = 50,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    verified_plans_store=Depends(get_verified_plans_store)
):
    """
    Returns history of verified action plans and past incidents stored in Qdrant feedback memory.
    """
    records = verified_plans_store.list_records(limit=limit, severity=severity, search=search)
    stats = verified_plans_store.get_stats()
    return JSONResponse(content={
        "total": len(records),
        "records": [r.model_dump() for r in records],
        "stats": stats.model_dump()
    })


@router.get("/api/history/verified-plans/{record_id}")
async def get_verified_plan_detail(
    record_id: str,
    verified_plans_store=Depends(get_verified_plans_store)
):
    """
    Returns full details for a single verified action plan.
    """
    record = verified_plans_store.get_record(record_id)
    if not record:
        return JSONResponse(
            status_code=404,
            content={"error": f"Không tìm thấy bản ghi kế hoạch có ID '{record_id}'"}
        )
    return JSONResponse(content={"record": record.model_dump()})


@router.post("/api/history/verified-plans/seed")
async def seed_verified_plans(verified_plans_store=Depends(get_verified_plans_store)):
    """
    Resets/seeds realistic default verified action plans into history.
    """
    verified_plans_store.reset_to_seed()
    return JSONResponse(content={
        "status": "SUCCESS",
        "message": "Đã nạp lại các ca sự cố mẫu vào lịch sử Qdrant memory.",
        "stats": verified_plans_store.get_stats().model_dump()
    })


@router.delete("/api/history/verified-plans")
async def clear_verified_plans(verified_plans_store=Depends(get_verified_plans_store)):
    """
    Clears all history records.
    """
    verified_plans_store.clear()
    return JSONResponse(content={
        "status": "SUCCESS",
        "message": "Đã làm sạch toàn bộ lịch sử kế hoạch đã duyệt.",
        "stats": verified_plans_store.get_stats().model_dump()
    })
