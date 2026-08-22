# 📘 TIÊU CHUẨN KIẾN TRÚC CHẨN ĐOÁN SỰ CỐ 4S3F & MẠNG BAYESIAN ĐA TÁC TỬ (SYSTEM_FDD)

> **Phân hệ áp dụng:** `SYSTEM_FDD` & Toàn bộ Tầng Multi-Agent Reasoning (`agentic/`)  
> **Tiêu chuẩn tham chiếu:** Khung kiến trúc 4S3F TU Delft (Taal et al. / Wang et al., Energy & Buildings 2026) / Chuẩn chất lượng AI Agent Harness Score Level 4 / LangGraph Multi-Agent Architecture  
> **Phân loại:** Multi-Agent System Architecture & Automated Diagnostic Standard

---

## 1. Khung Kiến Trúc Tham Chiếu 4S3F (Four Symptoms & Three Faults)

Kiến trúc **4S3F** phân tách quá trình chẩn đoán sự cố thành 2 giai đoạn độc lập nhưng liên kết chặt chẽ:

```
┌────────────────────────────────────────────────────────┐
│               GIAI ĐOẠN 1: 4 NHÓM TRIỆU CHỨNG          │
├──────────────────────────┬─────────────────────────────┤
│ 1. Triệu chứng Cân bằng  │ Cân bằng khối lượng, nhiệt, │
│    (Balance Symptoms)    │ chênh áp gần (S13, S17)     │
├──────────────────────────┼─────────────────────────────┤
│ 2. Triệu chứng Hiệu suất │ Hiệu suất thu hồi nhiệt,    │
│    (EP Symptoms)         │ COP hệ thống (S8, S10, S12) │
├──────────────────────────┼─────────────────────────────┤
│ 3. Triệu chứng Vận hành  │ Lệch Setpoint, lệch mô hình │
│    (OS Symptoms)         │ dự báo Kalman/XGBoost (S1-S6│
├──────────────────────────┼─────────────────────────────┤
│ 4. Triệu chứng Bổ sung   │ Lịch sử bảo trì, nhật ký FDD│
│    (Additional Symptoms) │ các ca tiền lệ trước đó     │
└──────────────────────────┴─────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               GIAI ĐOẠN 2: 3 NHÓM LỖI HỆ THỐNG          │
├──────────────────────────┬─────────────────────────────┤
│ 1. Lỗi Phần Cứng         │ Kẹt van, kẹt quạt, rơ-le,   │
│    (Component Faults)    │ trôi lệch cảm biến (F1-F3,F6│
├──────────────────────────┼─────────────────────────────┤
│ 2. Lỗi Điều Khiển        │ Cài sai Setpoint nhiệt độ,  │
│    (Control Faults)      │ áp suất, xung PWM (F4, F5)  │
├──────────────────────────┼─────────────────────────────┤
│ 3. Lỗi Mô Hình           │ Sai số giả định vật lý, suy │
│    (Model Faults)        │ giảm độ chính xác tham số   │
└──────────────────────────┴─────────────────────────────┘
```

---

## 2. Mô Hình Tính Toán Xác Suất Hậu Nghiệm Bayes (Bayesian Inference)

Xác suất xảy ra sự cố $F_i$ khi phát hiện tập triệu chứng $S = \{S_1, S_2, \dots, S_n\}$ được suy luận theo định lý Bayes:
$$P(F_i \mid S) = \frac{P(S \mid F_i) \cdot P(F_i)}{P(S)}$$

* **Xác suất tiên nghiệm (Prior Probability):** $P(F_i) = 0.05$ (mặc định $5\%$ khả năng xảy ra lỗi cho mọi thành phần).
* **Mô hình Noisy-OR:** Giảm độ phức tạp tham số bảng xác suất có điều kiện (CPT) từ $2^k$ xuống còn $k$ tham số độc lập với các trọng số ảnh hưởng:
  - **Cao (High):** $P(S \mid F) = 0.90$
  - **Trung bình (Medium):** $P(S \mid F) = 0.50$
  - **Thấp (Low):** $P(S \mid F) = 0.10$
* **Ngưỡng cách ly lỗi (Fault Isolation Threshold):** Nếu $P(F_i \mid S) \ge 0.15$, lỗi được coi là đã xác nhận và bàn giao cho Planner Agent sinh phương án xử lý.

---

## 3. Quy Trình Vòng Lặp Phản Hồi Khép Kín (Closed-Loop Feedback Memory)

1. **Bước 1 (Multi-Agent Reasoning):** Supervisor điều phối Retriever $\to$ Diagnostic RCA $\to$ Planner tạo kế hoạch xử lý và các nút bấm tương tác (`ActionButton`).
2. **Bước 2 (Human-in-the-Loop Approval):** Người vận hành / Kỹ sư kiểm tra chẩn đoán trên Dashboard hoặc qua Email cảnh báo và bấm nút **"Xác thực & Thực thi" (Verify & Resolve)**.
3. **Bước 3 (Self-Learning Memory Upsert):** Feedback Worker tự động đóng gói toàn bộ ngữ cảnh (Vector đặc trưng sự cố + Nguyên nhân gốc rễ + Kế hoạch xử lý được người dùng duyệt) và nạp vào Qdrant collection `verified_action_plans`.
4. **Bước 4 (Few-Shot Retrieval):** Khi sự cố tương tự xuất hiện trong tương lai, Retriever Agent ưu tiên trích xuất ca tiền lệ thành công này để hỗ trợ Diagnostic & Planner với độ tin cậy $100\%$.
