import pytest
from fastapi.testclient import TestClient
from rag.pdf_processor import process_pdf_bytes, create_sample_pdf_data, chunk_text
from rag.vector_store import RAGVectorStore
from rag.chat_engine import RAGChatEngine
from backend.app import app

client = TestClient(app)

def test_pdf_chunking_and_metadata():
    text = "Tiêu chuẩn an toàn thiết bị nhiệt độ cao. Khi nhiệt độ vượt quá 75 độ C cần ngắt nguồn ngay."
    chunks = chunk_text(text, doc_id="doc_test", filename="test.pdf", page_number=1, chunk_size=50)
    assert len(chunks) >= 1
    assert chunks[0]["doc_id"] == "doc_test"
    assert chunks[0]["page_number"] == 1
    assert "char_count" in chunks[0]

def test_sample_pdf_data_generation():
    samples = create_sample_pdf_data()
    assert len(samples) >= 3
    for doc in samples:
        assert "filename" in doc
        assert "chunks" in doc
        assert len(doc["chunks"]) > 0

def test_vector_store_crud():
    vs = RAGVectorStore()
    samples = create_sample_pdf_data()
    for doc in samples:
        vs.add_document(doc)
    
    docs = vs.list_documents()
    assert len(docs) == len(samples)
    
    # Test search
    res = vs.search("nhiệt độ", top_k=2)
    assert len(res) > 0
    assert "similarity_score" in res[0]
    
    # Test delete
    doc_id = samples[0]["doc_id"]
    vs.delete_document(doc_id)
    assert len(vs.list_documents()) == len(samples) - 1

def test_rag_chat_engine_grounded_answer():
    engine = RAGChatEngine()
    res = engine.ask("Bếp từ quá nhiệt xử lý thế nào?", top_k=2)
    assert "answer" in res
    assert "citations" in res
    assert len(res["citations"]) > 0
    assert "confidence_score" in res
    assert "chain_of_thought" in res
    assert len(res["chain_of_thought"]) == 4
    assert res["chain_of_thought"][0]["step_number"] == 1
    assert "thought_process" in res

def test_fastapi_rag_routes():
    # 1. Page render
    res_page = client.get("/rag")
    assert res_page.status_code == 200
    assert "root" in res_page.text or "html" in res_page.text
    
    # 2. Documents list
    res_docs = client.get("/api/rag/documents")
    assert res_docs.status_code == 200
    assert "documents" in res_docs.json()
    
    # 3. Chat API
    res_chat = client.post("/api/rag/chat", json={"query": "Ngưỡng nhiệt độ an toàn của bếp từ", "top_k": 3})
    assert res_chat.status_code == 200
    data = res_chat.json()
    assert "answer" in data
    assert "citations" in data
    assert "chain_of_thought" in data
    assert len(data["chain_of_thought"]) >= 4
    
    # 4. Stats API
    res_stats = client.get("/api/rag/stats")
    assert res_stats.status_code == 200

def test_time_utils_and_intent_detection():
    from rag.time_utils import get_vietnam_now, format_vietnam_datetime, is_datetime_query, get_vietnam_datetime_context
    
    vn_now = get_vietnam_now()
    assert vn_now.tzinfo is not None
    
    info = format_vietnam_datetime(vn_now)
    assert "day_of_week" in info
    assert "date_str" in info
    assert "time_short" in info
    assert "GMT+7" in info["summary"]
    
    ctx = get_vietnam_datetime_context(vn_now)
    assert "THỜI GIAN HỆ THỐNG HIỆN TẠI" in ctx
    
    # Test intent detection
    assert is_datetime_query("hôm nay là ngày mấy") is True
    assert is_datetime_query("bây giờ là mấy giờ mấy phút") is True
    assert is_datetime_query("hôm nay thứ mấy") is True
    assert is_datetime_query("thời gian hiện tại") is True
    assert is_datetime_query("what time is it") is True
    # Test typos and abbreviations
    assert is_datetime_query("bây giừo là mấy giừo") is True
    assert is_datetime_query("mấy h rồi") is True
    assert is_datetime_query("hôm ni ngày bn") is True
    assert is_datetime_query("ngưỡng an toàn bếp từ") is False

def test_rag_chat_engine_datetime_query():
    engine = RAGChatEngine()
    
    # Technician role
    res = engine.ask("hôm nay là ngày mấy", role="technician")
    assert "Báo cáo kỹ sư" in res["answer"] or "GMT+7" in res["answer"]
    assert res["model_used"] == "Veteran Home Real-Time Clock Engine"
    assert len(res["chain_of_thought"]) == 4
    assert res["chain_of_thought"][0]["title"] == "Nhận diện Ý định Truy vấn Thời gian Thực (RTC)"

    # Homeowner role
    res_ho = engine.ask("bây giờ là mấy giờ", role="homeowner")
    assert "Dạ thưa bạn" in res_ho["answer"] or "GMT+7" in res_ho["answer"]
    assert "kỹ sư" not in res_ho["answer"].lower()
    assert "báo cáo kỹ sư" not in res_ho["answer"].lower()

def test_rag_chat_engine_role_personas():
    engine = RAGChatEngine()
    
    # Greeting for homeowner
    ho_greet = engine.ask("chào bạn", role="homeowner")
    assert "Trợ Lý Gia Đình Thông Minh" in ho_greet["answer"]
    assert "kỹ sư" not in ho_greet["answer"].lower()
    assert "chủ hộ" in ho_greet["chain_of_thought"][0]["detail"].lower()

    # Greeting for technician
    tech_greet = engine.ask("chào bạn", role="technician")
    assert "Trợ Lý Kỹ Thuật" in tech_greet["answer"]

def test_homeowner_chat_datetime_endpoint():
    res = client.post("/api/homeowner/chat", json={"query": "hôm nay là ngày mấy"})
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "GMT+7" in data["answer"]
    assert "Thứ" in data["answer"]
    assert "kỹ sư" not in data["answer"].lower()
    
    res2 = client.post("/api/homeowner/chat", json={"query": "bây giừo là mấy giừo"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert "answer" in data2
    assert "bây giờ là" in data2["answer"].lower()
    assert "kỹ sư" not in data2["answer"].lower()



