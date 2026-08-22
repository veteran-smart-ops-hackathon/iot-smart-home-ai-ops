import os
import sys
import json
from config import get_settings, get_agent_router, get_rag_llm, get_embeddings
from agentic.schemas import DeviceMLReading
from agentic.orchestrator import OrchestratorAgent

def run_live_test():
    print("=" * 70)
    print("🚀 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG HỆ THỐNG LIVE (FPT AI & GEMINI FLASH)")
    print("=" * 70)

    settings = get_settings()

    # --------------------------------------------------------------------------
    # 1. TẠO TÀI LIỆU SỔ TAY KỸ THUẬT MẪU (SOP KNOWLEDGE BASE)
    # --------------------------------------------------------------------------
    print("\n📚 [BƯỚC 1]: Tạo tài liệu kỹ thuật mẫu (SOP)...")
    sample_sop = """
    TIÊU CHUẨN VẬN HÀNH & AN TOÀN THIẾT BỊ NHÀ THÔNG MINH (SOP-SH-2026):
    1. Quy định về chế độ vắng nhà (Unoccupied Mode):
       - Khi cảm biến hiện diện (PIR/Radar) không phát hiện người trong phòng > 15 phút, các thiết bị tiêu thụ công suất cao (> 100W) như Bếp từ, Lò sưởi, Điều hòa công suất lớn PHẢI được đưa về chế độ an toàn hoặc ngắt nguồn tự động.
       - Hành động khuyến nghị: Tạo lệnh ngắt nguồn (POWER_OFF) tức thời hoặc chuyển sang chế độ ECO tiết kiệm điện.
    2. Ngưỡng cảnh báo nhiệt độ (Thermal Baseline):
       - Nhiệt độ thiết bị > 65°C: Cảnh báo mức HIGH, nguy cơ giảm tuổi thọ cuộn dây.
       - Nhiệt độ thiết bị > 75°C: Nguy cơ chập cháy CRITICAL, yêu cầu ngắt nguồn khẩn cấp trong vòng 30 giây.
    """
    print("✅ Đã tạo tài liệu mẫu:")
    print(sample_sop.strip())

    # --------------------------------------------------------------------------
    # 2. TEST FPT AI FACTORY EMBEDDING MODEL (multilingual-e5-large)
    # --------------------------------------------------------------------------
    print("\n" + "-" * 70)
    print(f"🎯 [BƯỚC 2]: Kiểm tra FPT AI Factory Embedding ({settings.FPT_EMBEDDING_MODEL_NAME})...")
    print(f"   Endpoint: {settings.FPT_AI_BASE_URL}")
    try:
        embeddings = get_embeddings()
        test_text = "Sự cố thiết bị chạy khi không có người trong nhà"
        vector = embeddings.embed_query(test_text)
        print(f"✅ Vector hóa thành công! Kích thước vector: {len(vector)} chiều.")
        print(f"   5 giá trị đầu: {vector[:5]}...")
    except Exception as e:
        print(f"⚠️ Lỗi khi gọi FPT AI Embedding: {e}")

    # --------------------------------------------------------------------------
    # 3. TEST FPT AI FACTORY INSTRUCT LLM (Llama-3.3-70B-Instruct)
    # --------------------------------------------------------------------------
    print("\n" + "-" * 70)
    print(f"📖 [BƯỚC 3]: Kiểm tra FPT AI Factory Instruct LLM ({settings.FPT_INSTRUCT_MODEL_NAME})...")
    try:
        rag_llm = get_rag_llm()
        prompt = f"""Dựa vào tài liệu kỹ thuật sau:
        {sample_sop}

        Câu hỏi: Khi không có người trong nhà mà bếp từ đang chạy, SOP quy định xử lý như thế nào? Trả lời ngắn gọn 2 câu."""
        rag_response = rag_llm.invoke(prompt)
        print("✅ Phản hồi từ FPT AI Factory LLM:")
        print(rag_response.content.strip())
    except Exception as e:
        print(f"⚠️ Lỗi khi gọi FPT AI Instruct LLM: {e}")

    # --------------------------------------------------------------------------
    # 4. TEST MULTI-AGENT VỚI GEMINI FLASH & LITELLM ROUTER
    # --------------------------------------------------------------------------
    print("\n" + "-" * 70)
    print(f"🤖 [BƯỚC 4]: Kiểm tra Multi-Agent (3 Agents: Orchestrator, Fault, Planner)...")
    
    # Mô phỏng dữ liệu sự cố IoT nhận từ ML Engine
    mock_sensor_readings = [
        DeviceMLReading(
            device_id="HEATER_01",
            device_type="water_heater",
            location="bathroom",
            is_anomaly=True,
            anomaly_score=0.96,
            wear_score=0.15,
            metrics={"power_watts": 2452.0, "temp_c": 76.5},
            presence_detected=False
        ),
        DeviceMLReading(
            device_id="AC_01",
            device_type="air_conditioner",
            location="living_room",
            is_anomaly=True,
            anomaly_score=0.89,
            wear_score=0.45,
            metrics={"power_watts": 1400.0, "temp_c": 26.0},
            presence_detected=False
        )
    ]

    orchestrator = OrchestratorAgent()
    rag_context = "SOP-SH-2026: Nhiệt độ > 75°C yêu cầu ngắt nguồn khẩn cấp ngay lập tức."
    
    result = orchestrator.process_incident(
        readings=mock_sensor_readings,
        rag_context=rag_context
    )

    print("\n📊 [KẾT QUẢ ĐẦU RA CỦA MULTI-AGENT]:")
    print(json.dumps(result, indent=2, ensure_ascii=False))

    # --------------------------------------------------------------------------
    # 5. TEST AUTOMATED EMAIL NOTIFICATION DISPATCH
    # --------------------------------------------------------------------------
    print("\n" + "-" * 70)
    print("📧 [BƯỚC 5]: Kiểm tra Tác Tử Email Notification Dispatcher...")
    if result.get("email_notification"):
        notif = result["email_notification"]
        print(f"✅ Đã phát email cảnh báo thành công:")
        print(f"   - Mã thông báo: {notif['notification_id']}")
        print(f"   - Người nhận: {notif['recipient_email']}")
        print(f"   - Trạng thái: {notif['status']} (Chế độ: {notif['delivery_mode']})")
        print(f"   - Tiêu đề: {notif['subject']}")
        print(f"   - Link Dashboard: {notif['dashboard_url']}")
    else:
        print("ℹ️ Không có thông báo email nào được phát.")

    # --------------------------------------------------------------------------
    # 6. TEST HUMAN-IN-THE-LOOP (CLICK BUTTON EXECUTION)
    # --------------------------------------------------------------------------
    print("\n" + "-" * 70)
    print("🎮 [BƯỚC 6]: Mô phỏng Người dùng click nút 'Turn Off All Devices' trên Dashboard...")
    plan = result["mitigation_plan"]
    if plan["action_buttons"]:
        btn_to_click = plan["action_buttons"][0]
        print(f"👉 Người dùng click button: [{btn_to_click['title']}]")
        from agentic.schemas import ActionButton
        exec_res = orchestrator.execute_user_action(ActionButton(**btn_to_click))
        print("✅ Kết quả điều khiển thiết bị:")
        print(json.dumps(exec_res, indent=2, ensure_ascii=False))

    print("\n" + "=" * 70)
    print("🎉 HOÀN TẤT TOÀN BỘ QUÁ TRÌNH TEST TỰ ĐỘNG!")
    print("=" * 70)

if __name__ == "__main__":
    run_live_test()
