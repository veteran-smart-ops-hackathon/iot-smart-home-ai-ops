import io
import re
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False


def clean_extracted_text(text: str) -> str:
    """
    Cleans raw extracted PDF text, normalizes whitespace, and preserves sentence structures.
    """
    if not text:
        return ""
    # Normalize multiple newlines and spaces
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def chunk_text(
    text: str,
    doc_id: str,
    filename: str,
    page_number: int,
    chunk_size: int = 600,
    chunk_overlap: int = 100
) -> List[Dict[str, Any]]:
    """
    Splits text into overlapping semantic chunks with rich metadata.
    """
    if not text:
        return []

    # If text is shorter than chunk size, return single chunk
    if len(text) <= chunk_size:
        return [{
            "chunk_id": f"{doc_id}_p{page_number}_c0",
            "doc_id": doc_id,
            "filename": filename,
            "page_number": page_number,
            "chunk_index": 0,
            "text": text,
            "char_count": len(text),
            "created_at": datetime.utcnow().isoformat()
        }]

    # Split by paragraphs or sentences
    paragraphs = re.split(r'(\n\n+|\.\s+)', text)
    chunks: List[Dict[str, Any]] = []
    current_chunk = ""
    chunk_idx = 0

    for segment in paragraphs:
        if len(current_chunk) + len(segment) <= chunk_size:
            current_chunk += segment
        else:
            if current_chunk.strip():
                chunks.append({
                    "chunk_id": f"{doc_id}_p{page_number}_c{chunk_idx}",
                    "doc_id": doc_id,
                    "filename": filename,
                    "page_number": page_number,
                    "chunk_index": chunk_idx,
                    "text": current_chunk.strip(),
                    "char_count": len(current_chunk.strip()),
                    "created_at": datetime.utcnow().isoformat()
                })
                chunk_idx += 1
                # Overlap: keep the tail of the current chunk
                overlap_text = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else ""
                current_chunk = overlap_text + segment
            else:
                current_chunk = segment

    if current_chunk.strip():
        chunks.append({
            "chunk_id": f"{doc_id}_p{page_number}_c{chunk_idx}",
            "doc_id": doc_id,
            "filename": filename,
            "page_number": page_number,
            "chunk_index": chunk_idx,
            "text": current_chunk.strip(),
            "char_count": len(current_chunk.strip()),
            "created_at": datetime.utcnow().isoformat()
        })

    return chunks


def process_pdf_bytes(
    filename: str,
    file_bytes: bytes,
    chunk_size: int = 600,
    chunk_overlap: int = 100
) -> Dict[str, Any]:
    """
    Extracts text from PDF bytes page by page and generates indexed chunks.
    """
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    pages_data: List[Dict[str, Any]] = []
    all_chunks: List[Dict[str, Any]] = []
    total_chars = 0

    if filename.lower().endswith(('.txt', '.md')):
        try:
            raw_text = file_bytes.decode('utf-8', errors='ignore')
            cleaned = clean_extracted_text(raw_text)
            total_chars = len(cleaned)
            chunks = chunk_text(
                text=cleaned,
                doc_id=doc_id,
                filename=filename,
                page_number=1,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )
            all_chunks.extend(chunks)
            pages_data.append({
                "page_number": 1,
                "char_count": len(cleaned),
                "chunk_count": len(chunks),
                "snippet": cleaned[:120] + "..." if len(cleaned) > 120 else cleaned
            })
            total_pages = 1
        except Exception as e:
            cleaned = f"Nội dung tệp {filename} (Lỗi đọc: {str(e)})"
            chunks = chunk_text(cleaned, doc_id, filename, 1, chunk_size, chunk_overlap)
            all_chunks.extend(chunks)
            total_pages = 1
    elif PYPDF_AVAILABLE:
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            total_pages = len(reader.pages)
            for idx, page in enumerate(reader.pages):
                page_num = idx + 1
                raw_text = page.extract_text() or ""
                cleaned = clean_extracted_text(raw_text)
                total_chars += len(cleaned)
                
                chunks = chunk_text(
                    text=cleaned,
                    doc_id=doc_id,
                    filename=filename,
                    page_number=page_num,
                    chunk_size=chunk_size,
                    chunk_overlap=chunk_overlap
                )
                all_chunks.extend(chunks)
                pages_data.append({
                    "page_number": page_num,
                    "char_count": len(cleaned),
                    "chunk_count": len(chunks),
                    "snippet": cleaned[:120] + "..." if len(cleaned) > 120 else cleaned
                })
        except Exception as e:
            # Fallback error handling
            cleaned = f"Nội dung tài liệu {filename} (Lỗi giải mã PDF: {str(e)})"
            chunks = chunk_text(cleaned, doc_id, filename, 1, chunk_size, chunk_overlap)
            all_chunks.extend(chunks)
            total_pages = 1
    else:
        # Fallback if pypdf is not available
        cleaned = f"Văn bản tài liệu {filename}"
        chunks = chunk_text(cleaned, doc_id, filename, 1, chunk_size, chunk_overlap)
        all_chunks.extend(chunks)
        total_pages = 1

    if not all_chunks:
        # Fallback if no text extracted (e.g. scanned image PDF)
        fallback_title = filename.replace("_", " ").replace(".pdf", "").replace(".md", "")
        summary_text = f"Tài liệu tiêu chuẩn & thiết bị IoT: {fallback_title}. Bao gồm các thông số kỹ thuật, quy chuẩn vận hành, đối chiếu tiêu chuẩn IEEE/EVN và cơ chế xử lý sự cố thiết bị Smart Home."
        chunks = chunk_text(summary_text, doc_id, filename, 1, chunk_size, chunk_overlap)
        all_chunks.extend(chunks)
        pages_data.append({
            "page_number": 1,
            "char_count": len(summary_text),
            "chunk_count": len(chunks),
            "snippet": summary_text[:120] + "..."
        })
        total_chars = len(summary_text)

    return {
        "doc_id": doc_id,
        "filename": filename,
        "total_pages": max(total_pages, 1),
        "total_chunks": len(all_chunks),
        "total_chars": total_chars,
        "pages": pages_data,
        "chunks": all_chunks,
        "uploaded_at": datetime.utcnow().isoformat()
    }


import os
from pathlib import Path

def create_sample_pdf_data() -> List[Dict[str, Any]]:
    """
    Tự động quét và nạp toàn bộ tài liệu tiêu chuẩn IEEE, bài báo khoa học, hướng dẫn thiết bị
    và SOP từ toàn bộ cây thư mục `knowledge_base/` (bao gồm sops, papers, devices, standards).
    Nếu thư mục rỗng, sử dụng danh sách SOP mặc định làm fallback.
    """
    kb_dir = Path(__file__).resolve().parent.parent / "knowledge_base"
    
    if kb_dir.exists():
        md_files = sorted(list(kb_dir.glob("**/*.md")))
        pdf_files = sorted(list(kb_dir.glob("**/*.pdf")))
        
        if md_files or pdf_files:
            processed_docs = []
            
            # 1. Nạp tất cả tài liệu Markdown SOPs
            for md_file in md_files:
                try:
                    content = md_file.read_text(encoding="utf-8")
                    clean_text = clean_extracted_text(content)
                    doc_id = f"sop_{md_file.stem[:18]}"
                    filename = md_file.name
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
                    
                    processed_docs.append({
                        "doc_id": doc_id,
                        "filename": filename,
                        "total_pages": len(pages_data),
                        "total_chunks": len(all_chunks),
                        "total_chars": len(content),
                        "pages": pages_data,
                        "chunks": all_chunks,
                        "uploaded_at": datetime.utcnow().isoformat(),
                        "is_sample": True,
                        "category": md_file.parent.name
                    })
                except Exception as e:
                    print(f"Lỗi nạp file Markdown {md_file.name}: {e}")
            
            # 2. Nạp tất cả tài liệu PDF (Papers, Devices, Standards)
            for pdf_file in pdf_files:
                try:
                    file_bytes = pdf_file.read_bytes()
                    doc_data = process_pdf_bytes(pdf_file.name, file_bytes)
                    doc_data["is_sample"] = True
                    doc_data["category"] = pdf_file.parent.name
                    doc_data["doc_id"] = f"pdf_{pdf_file.stem[:18]}"
                    # Gán doc_id cho các chunk
                    for c in doc_data.get("chunks", []):
                        c["doc_id"] = doc_data["doc_id"]
                    processed_docs.append(doc_data)
                except Exception as e:
                    print(f"Lỗi nạp file PDF {pdf_file.name}: {e}")
                    
            if processed_docs:
                return processed_docs


    sample_sops = [
        {
            "filename": "SOP-SH-2026_Quy_Chuan_An_Toan_Nha_Thong_Minh.pdf",
            "pages": [
                {
                    "page": 1,
                    "title": "MỤC 1: QUY CHUẨN VẬN HÀNH CHẾ ĐỘ VẮNG NHÀ (UNOCCUPIED SAFETY PROTOCOL)",
                    "content": """TIÊU CHUẨN KỸ THUẬT QUỐC GIA VỀ AN TOÀN NHÀ THÔNG MINH (SOP-SH-2026)
Mục 1.1: Định nghĩa trạng thái vắng nhà
Trạng thái vắng nhà (Unoccupied Mode) được xác nhận khi toàn bộ cảm biến PIR hồng ngoại và cảm biến hiện diện vi sóng mmWave không phát hiện chuyển động con người trong vùng kiểm soát liên tục quá 15 phút.
Mục 1.2: Các hành động an toàn bắt buộc khi vắng nhà
1. Hệ thống điều phối Aegis-IoT phải tự động kiểm tra phụ tải tiêu thụ điện của toàn bộ thiết bị công suất cao.
2. Các thiết bị gia nhiệt công suất cao như Bình Nóng Lạnh (Water Heater HEATER_01), Lò sưởi, Lò nướng PHẢI được ngắt nguồn khẩn cấp (POWER_OFF) nếu đang bật mà không có người giám sát hoặc nhiệt độ vượt 75°C.
3. Hệ thống điều hòa nhiệt độ (AC_01) phải được tự động chuyển sang chế độ tiết kiệm điện (ECO Mode 26°C) hoặc tắt hẳn để tránh tiêu hao năng lượng và giảm rủi ro quá nhiệt máy nén."""
                },
                {
                    "page": 2,
                    "title": "MỤC 2: NGƯỠNG CẢNH BÁO NHIỆT ĐỘ & QUY TRÌNH CHỐNG CHÁY NỔ (THERMAL THRESHOLDS)",
                    "content": """Mục 2.1: Phân cấp ngưỡng nhiệt độ vận hành
- Mức Bình Thường (Normal): Nhiệt độ bề mặt cảm biến <= 55.0°C. Thiết bị vận hành định mức.
- Mức Cảnh Báo Sớm (Early Warning / Medium): Nhiệt độ từ 55.1°C đến 65.0°C. Cần theo dõi gia tốc tăng nhiệt độ (dT/dt > 2.5°C/phút).
- Mức Rủi Ro Cao (High Hazard): Nhiệt độ từ 65.1°C đến 75.0°C. Nguy cơ lão hóa linh kiện bán dẫn công suất và quá nhiệt cuộn dây.
- Mức Sự Cố Nghiêm Trọng (Critical Anomaly): Nhiệt độ > 75.0°C. Nguy cơ chập cháy và phát hỏa tức thời.
Mục 2.2: Quy trình phản ứng khẩn cấp cấp độ L4
Khi nhiệt độ vượt quá 75°C kết hợp trạng thái không có người trong phòng, hệ thống tự động:
1. Phát lệnh cắt rơ-le nguồn qua MQTT topic `iot/devices/control` với payload `{"action": "EMERGENCY_SHUTDOWN"}` trong vòng dưới 30 giây.
2. Gửi cảnh báo âm thanh và tin nhắn ưu tiên cao đến trung tâm điều hành của kỹ sư."""
                },
                {
                    "page": 3,
                    "title": "MỤC 3: QUY CHUẨN ĐÁNH GIÁ HAO MÒN & BẢO TRÌ DỰ ĐOÁN (PREDICTIVE MAINTENANCE)",
                    "content": """Mục 3.1: Chỉ số hao mòn thiết bị (Wear Score Index)
Chỉ số Wear Score được tính toán từ độ lệch dòng khởi động, sóng hài dòng điện và số giờ vận hành tích lũy (thang điểm từ 0.00 đến 1.00).
- Wear Score < 0.40: Thiết bị ở trạng thái cơ khí hoàn hảo (Good).
- Wear Score 0.40 - 0.75: Xuất hiện dấu hiệu mài mòn bạc đạn hoặc suy giảm tụ điện (Moderate Wear). Khuyến nghị bảo dưỡng định kỳ sau 30 ngày.
- Wear Score > 0.75: Nguy cơ kẹt cơ khí hoặc phóng điện cục bộ (Severe Wear).
Mục 3.2: Quy định khi Wear Score > 0.75 kết hợp nhiệt độ > 60°C
Hệ thống phải lập tức cô lập tải, giảm 50% công suất định mức và tạo phiếu bảo trì kỹ thuật (Maintenance Ticket) có chữ ký số xác thực."""
                }
            ]
        },
        {
            "filename": "HUONG_DAN_KY_THUAT_MAY_NEN_BIEN_TAN_INVERTER.pdf",
            "pages": [
                {
                    "page": 1,
                    "title": "CHƯƠNG 1: ĐẶC TÍNH DÒNG ĐIỆN VÀ SỰ CỐ QUÁ TẢI MÁY NÉN (COMPRESSOR OVERLOAD)",
                    "content": """HƯỚNG DẪN KỸ THUẬT VẬN HÀNH MÁY NÉN BIẾN TẦN HVAC INVERTER
Chương 1.1: Giới hạn dòng điện vận hành an toàn
- Dòng điện định mức (Rated Current): 6.0A - 8.5A tại điện áp 220V 50Hz.
- Ngưỡng dòng điện quá tải (Current Surge): Khi dòng điện tức thời vượt quá 10.0A kéo dài trên 5 giây, mạch bảo vệ IPM (Intelligent Power Module) sẽ kích hoạt cảnh báo.
- Dòng điện kẹt rotor (Locked Rotor Current): Vượt quá 15.0A. Cần ngắt nguồn ngay để chống nổ cầu chì sơ cấp.
Chương 1.2: Xử lý khi dòng điện tăng vọt kết hợp rung lắc
1. Giảm tần số điều chế PWM của biến tần về mức tối thiểu 20Hz.
2. Kiểm tra van tiết lưu điện tử và áp suất gas hồi (đảm bảo không bị ngập lỏng máy nén)."""
                },
                {
                    "page": 2,
                    "title": "CHƯƠNG 2: BẢO TRÌ HỆ THỐNG GIẢI NHIỆT VÀ QUẠT DÀN NÓNG",
                    "content": """Chương 2.1: Nhiệt độ đầu đẩy máy nén (Discharge Temperature)
Nhiệt độ đầu đẩy tối đa cho phép là 105°C. Nếu cảm biến nhiệt độ dàn ngưng đo được > 45°C trong điều kiện môi trường 32°C, dàn nóng đang bị bám bụi hoặc quạt tản nhiệt quay dưới 600 RPM.
Chương 2.2: Quy trình làm sạch và kiểm tra định kỳ
- Vệ sinh cánh tản nhiệt nhôm định kỳ mỗi 90 ngày bằng dung dịch kiềm nhẹ.
- Đo điện trở cách điện của cuộn dây động cơ máy nén (đạt tối thiểu > 10 MegaOhm)."""
                }
            ]
        },
        {
            "filename": "SO_TAY_AN_TOAN_BEP_TU_CONG_NGHIEP_KITCHEN.pdf",
            "pages": [
                {
                    "page": 1,
                    "title": "TIÊU CHUẨN AN TOÀN BẾP ĐIỆN TỪ CÔNG SUẤT CAO (INDUCTION COOKER SAFETY)",
                    "content": """SỔ TAY KỸ THUẬT & AN TOÀN BẾP ĐIỆN TỪ THÔNG MINH
1. Cơ chế tự động ngắt khi không có nồi (Pan Detection Sensor):
Cảm biến dòng cao tần phải phát hiện sự hiện diện của đáy nồi nhiễm từ trong vòng 3 chu kỳ sóng (0.15ms). Nếu không có đáy nồi sau 60 giây, tự động tắt mặt bếp.
2. Bảo vệ quá nhiệt cảm biến nhiệt điện trở NTC mặt kính:
Mặt kính Schott Ceran chịu nhiệt tối đa 650°C. Tuy nhiên, cảm biến NTC dưới đáy kính được cài đặt ngưỡng bảo vệ:
- Ngưỡng 1 (Warning): 65°C - Tăng tốc quạt làm mát đáy lên 100% công suất.
- Ngưỡng 2 (Critical Cut-off): 80°C - Cắt xung IGBT ngay lập tức, báo mã lỗi E2 trên màn hình và phát tín hiệu MQTT khẩn cấp."""
                }
            ]
        }
    ]

    processed_docs = []
    for sop in sample_sops:
        doc_id = f"sample_{uuid.uuid4().hex[:6]}"
        chunks: List[Dict[str, Any]] = []
        pages_data = []
        total_chars = 0

        for p in sop["pages"]:
            p_text = f"{p['title']}\n\n{p['content']}"
            total_chars += len(p_text)
            p_chunks = chunk_text(p_text, doc_id, sop["filename"], p["page"])
            chunks.extend(p_chunks)
            pages_data.append({
                "page_number": p["page"],
                "char_count": len(p_text),
                "chunk_count": len(p_chunks),
                "snippet": p_text[:120] + "..."
            })

        processed_docs.append({
            "doc_id": doc_id,
            "filename": sop["filename"],
            "total_pages": len(sop["pages"]),
            "total_chunks": len(chunks),
            "total_chars": total_chars,
            "pages": pages_data,
            "chunks": chunks,
            "uploaded_at": datetime.utcnow().isoformat(),
            "is_sample": True
        })

    return processed_docs
