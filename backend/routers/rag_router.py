"""
backend/routers/rag_router.py
RAG Knowledge Base & Smart Home Technical PDF SOP Studio endpoints.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from rag import process_pdf_bytes
from backend.dependencies import get_rag_engine, get_rag_vector_store

logger = logging.getLogger("RAGRouter")

router = APIRouter(tags=["RAG"])


class RagQueryRequest(BaseModel):
    query: str


class RagChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = "default"
    top_k: Optional[int] = 4
    threshold: Optional[float] = 0.15
    search_mode: Optional[str] = "hybrid"
    doc_ids: Optional[List[str]] = None
    role: Optional[str] = "technician"


@router.post("/api/rag/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    rag_vector_store=Depends(get_rag_vector_store)
):
    try:
        filename = file.filename or "uploaded_document.pdf"
        lower_name = filename.lower()
        if not (lower_name.endswith(".pdf") or lower_name.endswith(".txt") or lower_name.endswith(".md")):
            return JSONResponse(
                status_code=400,
                content={"error": "Chỉ hỗ trợ tải lên tệp định dạng .PDF, .TXT hoặc .MD"}
            )

        file_bytes = await file.read()
        if len(file_bytes) == 0:
            return JSONResponse(
                status_code=400,
                content={"error": "Tệp PDF tải lên bị trống."}
            )

        processed_doc = process_pdf_bytes(
            filename=filename,
            file_bytes=file_bytes,
            chunk_size=600,
            chunk_overlap=100
        )

        indexed_doc = rag_vector_store.add_document(processed_doc)

        return JSONResponse(content={
            "status": "SUCCESS",
            "message": f"Tải lên và xử lý thành công tệp '{filename}'",
            "document": indexed_doc,
            "total_chunks": processed_doc["total_chunks"],
            "total_pages": processed_doc["total_pages"],
            "total_chars": processed_doc["total_chars"]
        })
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Lỗi trong quá trình xử lý PDF: {str(e)}"}
        )


@router.get("/api/rag/documents")
async def get_rag_documents(rag_vector_store=Depends(get_rag_vector_store)):
    return {
        "documents": rag_vector_store.list_documents(),
        "stats": rag_vector_store.get_stats()
    }


@router.post("/api/rag/load-sample")
async def load_sample_sops(
    rag_engine=Depends(get_rag_engine),
    rag_vector_store=Depends(get_rag_vector_store)
):
    loaded = rag_engine.load_sample_documents()
    return {
        "status": "SUCCESS",
        "message": f"Đã nạp thành công {len(loaded)} bộ quy chuẩn SOP gia đình vào cơ sở tri thức.",
        "documents": rag_vector_store.list_documents(),
        "stats": rag_vector_store.get_stats()
    }


@router.delete("/api/rag/documents/{doc_id}")
async def delete_rag_document(doc_id: str, rag_vector_store=Depends(get_rag_vector_store)):
    success = rag_vector_store.delete_document(doc_id)
    if success:
        return {
            "status": "SUCCESS",
            "message": f"Đã xóa tài liệu {doc_id} thành công.",
            "stats": rag_vector_store.get_stats()
        }
    return JSONResponse(
        status_code=404,
        content={"error": f"Không tìm thấy tài liệu có ID {doc_id}"}
    )


@router.post("/api/rag/toggle-active/{doc_id}")
async def toggle_rag_document(doc_id: str, rag_vector_store=Depends(get_rag_vector_store)):
    new_state = rag_vector_store.toggle_document_active(doc_id)
    if new_state is not None:
        return {
            "status": "SUCCESS",
            "doc_id": doc_id,
            "is_active": new_state,
            "message": f"Trạng thái tài liệu đã chuyển sang: {'BẬT' if new_state else 'TẮT'}"
        }
    return JSONResponse(
        status_code=404,
        content={"error": f"Không tìm thấy tài liệu có ID {doc_id}"}
    )


@router.post("/api/rag/chat")
async def rag_chat(req: RagChatRequest, rag_engine=Depends(get_rag_engine)):
    if not req.query or not req.query.strip():
        return JSONResponse(
            status_code=400,
            content={"error": "Vui lòng nhập nội dung câu hỏi."}
        )

    result = rag_engine.ask(
        query=req.query.strip(),
        session_id=req.session_id or "default",
        top_k=req.top_k or 4,
        threshold=req.threshold or 0.15,
        search_mode=req.search_mode or "hybrid",
        doc_ids=req.doc_ids,
        role=req.role or "technician"
    )
    return JSONResponse(content=result)


@router.get("/api/rag/history")
async def get_rag_history(session_id: str = "default", rag_engine=Depends(get_rag_engine)):
    return {
        "session_id": session_id,
        "history": rag_engine.get_session_history(session_id)
    }


@router.post("/api/rag/clear-chat")
async def clear_rag_chat(session_id: Optional[str] = "default", rag_engine=Depends(get_rag_engine)):
    rag_engine.clear_session_history(session_id or "default")
    return {
        "status": "SUCCESS",
        "message": "Đã làm sạch lịch sử trò chuyện."
    }


@router.get("/api/rag/stats")
async def get_rag_stats(rag_vector_store=Depends(get_rag_vector_store)):
    return rag_vector_store.get_stats()


@router.post("/api/rag-query")
async def rag_query(req: RagQueryRequest, rag_engine=Depends(get_rag_engine)):
    res = rag_engine.ask(query=req.query, session_id="dashboard_quick", top_k=2)
    return {
        "answer": res["answer"],
        "confidence_score": res["confidence_score"],
        "vector_collection": "system_baselines_sop",
        "model": res["model_used"]
    }
