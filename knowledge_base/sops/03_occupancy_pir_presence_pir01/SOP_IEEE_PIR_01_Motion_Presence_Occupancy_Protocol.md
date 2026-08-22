# 📘 TIÊU CHUẨN CẢM BIẾN CHUYỂN ĐỘNG HỒNG NGOẠI PIR & XÁC THỰC HIỆN DIỆN (PIR_01)

> **Mã thiết bị áp dụng:** `PIR_01` & `SENSOR_01` (Passive Infrared Motion Sensor & Presence Detector)  
> **Tiêu chuẩn tham chiếu:** IEEE Sensors Journal (Magno et al., 2015) / Panasonic Industrial Sensor Standards (AMN34111J) / IEEE Access Occupancy Protocols (Vanhaeverbeke et al., 2025)  
> **Phân loại:** Standard Operating Procedure (SOP) & Safety Interlock Protocol

---

## 1. Đặc Tính Kỹ Thuật Phần Cứng Cảm Biến

Cảm biến hiện diện hồng ngoại thụ động **PIR** trong hệ thống Aegis-IoT sử dụng module chuyên dụng **Panasonic EW - AMN34111J** tích hợp thấu kính Fresnel đa vùng:

* **Khoảng cách phát hiện tối đa (Detection Range):** $10.0\text{ m}$ hình nón không gian.
* **Góc quét quang học (Field of View - FOV):** $120^\circ$ ngang và dọc.
* **Nguyên lý hoạt động:** Cảm ứng biến thiên bức xạ nhiệt hồng ngoại bước sóng $7.0\,\mu\text{m} - 14.0\,\mu\text{m}$ phát ra từ cơ thể người chuyển động.
* **Thời gian phản hồi ngắt phần cứng (Hardware Interrupt Latency):** $< 10\text{ ms}$ kích hoạt trực tiếp vào chân GPIO ngắt của vi điều khiển.
* **Vị trí lắp đặt tối ưu:** Gắn trần nhà tại vị trí trung tâm phòng, tránh chiếu trực tiếp vào cửa sổ đón nắng hoặc luồng gió nóng từ dàn lạnh điều hòa.

---

## 2. Quy Định Ngưỡng Thời Gian Chờ (Occupancy Timeout Policy)

Để tránh hiện tượng tắt nhầm thiết bị khi người dùng ngồi yên tĩnh làm việc (stationary posture), hệ thống áp dụng cơ chế điều chỉnh động thời gian trễ ngắt nguồn:

| Khung Giờ Hoạt Động | Chế Độ (Mode) | Thời Gian Chờ Ngắt ($\text{TIMEOUT}$) | Mục Đích & Ý Nghĩa |
| :--- | :--- | :---: | :--- |
| **08:00 – 18:00 (Giờ sinh hoạt / Làm việc)** | Daytime Active | **$45\text{ phút}$** | Đảm bảo tiện nghi tối đa, không làm gián đoạn công việc của người dùng khi ngồi lâu. |
| **18:00 – 08:00 (Ban đêm / Ngoài giờ)** | Night Economy | **$5\text{ phút}$** | Tối ưu hóa triệt để điện năng hao phí, tự động tắt ngay khi rời phòng. |
| **Toàn thời gian** | Instant Wakeup | **$< 500\text{ ms}$** | Ngay khi phát hiện chuyển động, kích hoạt ngắt đánh thức MCU và bật đèn/hệ thống ngay lập tức. |

---

## 3. Quy Chuẩn Kích Hoạt Trạng Thái Vắng Nhà (Unoccupied Safety Interlock)

### 3.1. Tiêu chí xác thực trạng thái vắng nhà (Unoccupied Confirmation)
Trạng thái **Vắng Nhà Toàn Diện (Unoccupied Mode)** được hệ thống kích hoạt khi thỏa mãn đồng thời 2 điều kiện:
1. Toàn bộ cảm biến PIR trong phòng không ghi nhận xung chuyển động liên tục quá **$15\text{ phút}$** ($t_{\text{no\_motion}} \ge 900\text{ s}$).
2. Tốc độ biến thiên nồng độ $\text{CO}_2$ có xu hướng giảm đều ($\frac{d[\text{CO}_2]}{dt} < 0$) chứng minh không còn người thở trong không gian kín.

### 3.2. Chuỗi hành động an toàn bắt buộc khi xác nhận vắng nhà:
```
[PIR NO_MOTION > 15 Phút] ──> [Kích hoạt Unoccupied Safety Protocol]
                                       │
      ┌────────────────────────────────┼────────────────────────────────┐
      ▼                                ▼                                ▼
[Bếp từ / Lò nướng / Bàn là]      [Bình Nước Nóng HEATER_01]       [Điều Hòa AC_01]
Ngắt điện tức thời (POWER_OFF)     Chuyển sang STANDBY 45°C        Chuyển sang ECO Mode 28°C
```

1. **Khóa tải nhiệt nguy hiểm cao:** Phát lệnh ngắt nguồn khẩn cấp (`POWER_OFF`) tới toàn bộ ổ cắm thông minh đang cấp điện cho Bếp từ, Lò nướng, Bàn là điện và Bếp sưởi.
2. **Hạ tải bình nóng lạnh `HEATER_01`:** Nếu nhiệt độ nước đang $> 65^\circ\text{C}$, tự động ngắt rơ-le gia nhiệt để chống đun sôi khô và giảm tổn thất nhiệt.
3. **Điều hòa không khí `AC_01`:** Chuyển từ chế độ làm lạnh sâu sang chế độ tiết kiệm điện năng **ECO 28°C** hoặc tắt hẳn nếu nhiệt độ ngoài trời mát mẻ ($20^\circ\text{C} - 26^\circ\text{C}$).

---

## 4. Xử Lý Sự Cố & Chẩn Đoán Lỗi Cảm Biến PIR

* **Lỗi PIR-ERR-01 (Kẹt mức logic High liên tục):** Do sensor bị nhiễu nhiệt từ luồng gió nóng hoặc ánh nắng mặt trời $\to$ Hệ thống tự động chuyển sang cơ chế nhận diện hiện diện dự phòng dựa trên nồng độ $\text{CO}_2$ (Cross-Room $\text{CO}_2$ Profiling).
* **Lỗi PIR-ERR-02 (Không ghi nhận xung dù phòng có người):** Xảy ra khi góc quét bị che khuất bởi đồ đạc $\to$ Gửi thông báo đến Dashboard khuyến nghị kỹ sư điều chỉnh góc lắp đặt cảm biến.
