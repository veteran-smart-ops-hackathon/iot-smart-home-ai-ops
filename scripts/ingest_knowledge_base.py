#!/usr/bin/env python3
"""
📚 Knowledge Base Ingestion & Vector Indexing Script
Quét toàn bộ tài liệu tiêu chuẩn IEEE và tài liệu kỹ thuật thiết bị (Markdown & PDF)
trong thư mục `knowledge_base/sops/` và tự động phân đoạn (chunking),
trích xuất metadata và nạp vào Qdrant collection `system_baselines_sop`.
"""

import os
import sys
import glob
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

# Add root directory to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from rag.pdf_processor import clean_extracted_text, chunk_text, process_pdf_bytes
from rag.vector_store import RAGVectorStore
from rag.chat_engine import RAGChatEngine


def process_markdown_file(file_path: Path) -> dict:
    """Đọc và xử lý file Markdown thành các chunk với metadata đầy đủ."""
    content = file_path.read_text(encoding="utf-8")
    clean_text = clean_extracted_text(content)
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    filename = file_path.name

    # Phân trang giả định theo tiêu đề cấp 1 hoặc 2 (# hoặc ##)
    sections = content.split("\n## ")
    pages_data = []
    all_chunks = []

    for idx, sec in enumerate(sections):
        page_num = idx + 1
        sec_text = f"## {sec}" if idx > 0 else sec
        sec_chunks = chunk_text(sec_text, doc_id, filename, page_num, chunk_size=600, chunk_overlap=100)
        all_chunks.extend(sec_chunks)
        pages_data.append({
            "page_number": page_num,
            "char_count": len(sec_text),
            "chunk_count": len(sec_chunks),
            "snippet": sec_text[:120].strip() + "..."
        })

    return {
        "doc_id": doc_id,
        "filename": filename,
        "total_pages": len(pages_data),
        "total_chunks": len(all_chunks),
        "total_chars": len(content),
        "pages": pages_data,
        "chunks": all_chunks,
        "uploaded_at": datetime.utcnow().isoformat(),
        "is_sample": False,
        "category": file_path.parent.name
    }


def ingest_all_knowledge_base(vector_store: Optional[RAGVectorStore] = None, quiet: bool = False) -> int:
    """Quét và nạp toàn bộ tài liệu trong thư mục knowledge_base/ (bao gồm sops, papers, devices, standards)"""
    base_sop_dir = root_dir / "knowledge_base"
    if not base_sop_dir.exists():
        if not quiet:
            print(f"❌ Không tìm thấy thư mục: {base_sop_dir}")
        return 0

    if not quiet:
        print("=" * 70)
        print("🚀 BẮT ĐẦU NẠP TÀI LIỆU TIÊU CHUẨN IEEE, PAPERS & THIẾT BỊ VÀO QDRANT RAG ENGINE")
        print("=" * 70)

    target_store = vector_store
    if target_store is None:
        rag_engine = RAGChatEngine()
        target_store = rag_engine.vector_store

    total_docs = 0
    total_chunks_ingested = 0

    # Quét đệ quy tất cả các file .md và .pdf trong toàn bộ thư mục knowledge_base
    md_files = sorted(list(base_sop_dir.glob("**/*.md")))
    pdf_files = sorted(list(base_sop_dir.glob("**/*.pdf")))

    if not quiet:
        print(f"🔍 Tìm thấy {len(md_files)} file Markdown và {len(pdf_files)} file PDF trong các thư mục con.\n")

    # 1. Nạp Markdown SOPs
    for md_file in md_files:
        try:
            doc_data = process_markdown_file(md_file)
            target_store.add_document(doc_data)
            total_docs += 1
            total_chunks_ingested += doc_data["total_chunks"]
            if not quiet:
                print(f"   ✅ Đã nạp {doc_data['filename']}: {doc_data['total_chunks']} chunks.")
        except Exception as e:
            if not quiet:
                print(f"   ❌ Lỗi xử lý {md_file.name}: {e}")

    # 2. Nạp PDF Papers, Devices, Standards
    for pdf_file in pdf_files:
        try:
            file_bytes = pdf_file.read_bytes()
            doc_data = process_pdf_bytes(pdf_file.name, file_bytes)
            doc_data["category"] = pdf_file.parent.name
            doc_data["doc_id"] = f"pdf_{pdf_file.stem[:18]}"
            for c in doc_data.get("chunks", []):
                c["doc_id"] = doc_data["doc_id"]
            target_store.add_document(doc_data)
            total_docs += 1
            total_chunks_ingested += doc_data["total_chunks"]
            if not quiet:
                print(f"   ✅ Đã nạp {doc_data['filename']}: {doc_data['total_chunks']} chunks từ {doc_data['total_pages']} trang.")
        except Exception as e:
            if not quiet:
                print(f"   ❌ Lỗi xử lý {pdf_file.name}: {e}")

    # 3. Đồng bộ vào Qdrant Vector Collection nếu Qdrant đang hoạt động
    try:
        from config import get_qdrant_client
        from qdrant_client.http.models import Distance, VectorParams
        client = get_qdrant_client()
        cols = [c.name for c in client.get_collections().collections]
        for col_name in ["system_baselines_sop", "incident_telemetry", "verified_action_plans"]:
            if col_name not in cols:
                client.create_collection(
                    collection_name=col_name,
                    vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
                )
                if not quiet:
                    print(f"   📦 Đã khởi tạo Qdrant Collection: {col_name}")
        if not quiet:
            print("   ✅ Qdrant Collections đã đồng bộ trạng thái READY.")
    except Exception as q_err:
        if not quiet:
            print(f"   ⚠️ Lưu ý Qdrant sync: {q_err}")

    if not quiet:
        print("\n" + "=" * 70)
        print(f"🎉 HOÀN TẤT NẠP KNOWLEDGE BASE!")
        print(f"📊 Tổng cộng: {total_docs} tài liệu tiêu chuẩn/thiết bị | {total_chunks_ingested} Chunks trong Vector Store.")
        print("=" * 70)

    return total_docs


if __name__ == "__main__":
    ingest_all_knowledge_base()

