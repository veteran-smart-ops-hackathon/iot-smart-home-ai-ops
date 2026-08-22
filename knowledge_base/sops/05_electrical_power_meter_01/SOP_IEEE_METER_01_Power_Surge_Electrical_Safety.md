# 📘 TIÊU CHUẨN ĐO LƯỜNG ĐIỆN NĂNG & BẢO VỆ QUÁ TẢI SỰ CỐ (METER_01)

> **Mã thiết bị áp dụng:** `METER_01` (Công Tơ Điện Thông Minh & Đồng Hồ Điện Tổng)  
> **Tiêu chuẩn tham chiếu:** IEEE C37 (Circuit Breakers & Protective Relays) / IEC 62053 (Electricity Metering Equipment) / IEC 61000 (Power Quality & Voltage Surges) / IEEE Smart Grid WSN Protocols (Erol-Kantarci & Mouftah, IEEE Trans. Smart Grid)  
> **Phân loại:** Standard Operating Procedure (SOP) & Electrical Life-Safety Standard

---

## 1. Đặc Tính Kỹ Thuật Đồng Hồ Đo Điện Tổng

Thiết bị **`METER_01`** chịu trách nhiệm giám sát toàn bộ phụ tải điện năng đầu vào của căn hộ/tòa nhà, kết nối trực tiếp với rơ-le ngắt nguồn thông minh (Smart Circuit Breaker):

* **Thông số đo lường:** Điện áp lưới ($V$ [Volt]), Dòng điện tổng ($I$ [Ampe]), Công suất tiêu thụ tức thời ($P$ [Watt]), Tần số lưới ($f = 50.0\text{ Hz}$).
* **Công thức xác định công suất tức thời:**
  $$P = V \cdot I \cdot \cos\varphi \quad (\text{với hệ số công suất định mức } \cos\varphi \approx 0.95)$$
* **Tốc độ lấy mẫu & truyền tin MQTT:** Chu kỳ $1.0\text{ giây/lần}$ qua giao thức MQTT topic `hackathon/smarthome/METER_01/telemetry`.

---

## 2. Các Ngưỡng Giới Hạn Vận Hành Điện An Toàn

| Đại Lượng Đo | Trạng Thái Bình Thường (Normal) | Ngưỡng Cảnh Báo (Warning) | Ngưỡng Nguy Hiểm / Cắt Nguồn (Critical Cut-off) |
| :--- | :---: | :---: | :---: |
| **Điện áp lưới ($V$)** | $218.0\text{ V} - 224.0\text{ V}$ | $225.0\text{ V} - 245.0\text{ V}$ hoặc $190.0\text{ V} - 210.0\text{ V}$ | **$> 250.0\text{ V}$ (Quá áp)** hoặc **$< 180.0\text{ V}$ (Sụt áp)** |
| **Dòng điện tải ($I$)** | $10.0\text{ A} - 17.5\text{ A}$ | $17.6\text{ A} - 28.0\text{ A}$ | **$> 32.0\text{ A}$ (Quá dòng / Nguy cơ chập cháy)** |
| **Công suất tổng ($P$)** | $2200\text{ W} - 3800\text{ W}$ | $3801\text{ W} - 6500\text{ W}$ | **$> 6500\text{ W}$ (Đỉnh phụ tải / Power Surge cực đại)** |

---

## 3. Cơ Chế Xử Lý Hiện Tượng Đột Biến Công Suất (Power Surge & Spike)

### 3.1. Phân loại sự cố điện lưới
1. **Hiện tượng Quá dòng tức thời (Current Surge Spike):** Xảy ra khi các động cơ công suất lớn (máy nén điều hòa `AC_01`, bơm nước) khởi động cùng lúc. Nếu $I > 30\text{ A}$ kéo dài dưới $3\text{ giây}$, hệ thống coi là dòng khởi động hợp lệ (Inrush Current).
2. **Hiện tượng Quá tải liên tục (Sustained Overload):** Khi $P > 6500\text{ W}$ kéo dài liên tục quá $15\text{ giây}$, có nguy cơ phát nhiệt làm chảy dây dẫn điện âm tường.
3. **Hiện tượng Chập mạch (Short Circuit):** Dòng điện tăng vọt $> 45\text{ A}$ trong vòng vài mili-giây.

### 3.2. Quy trình ngắt tải tự động theo thứ tự ưu tiên (Load Shedding Algorithm)
Khi công suất tổng $P$ vượt ngưỡng $6500\text{ W}$, hệ thống Aegis-IoT tự động thực hiện sa thải phụ tải (Load Shedding) theo 3 cấp độ:

```
[Công suất P > 6500 W]
        │
        ├──> [Cấp 1: Cắt tải nhiệt không thiết yếu]  ──> Ngắt Bình nóng lạnh HEATER_01 & Đèn trang trí
        │
        ├──> [Cấp 2: Giảm công suất điều hòa]        ──> Chuyển AC_01 sang chế độ ECO (Giảm 50% công suất)
        │
        └──> [Cấp 3: Cắt Aptomat tổng nếu P > 9000W] ──> Phát lệnh MQTT ngắt Relay chính METER_01
```

---

## 4. Hành Động Khắc Phục & Nút Điều Khiển Tương Tác (Action Buttons)

* **Nút bấm 1:** `SHUTDOWN_NON_ESSENTIAL_LOADS` $\to$ Ngắt các thiết bị công suất cao không ưu tiên.
* **Nút bấm 2:** `SWITCH_ECO_MODE_ALL` $\to$ Hạ công suất toàn bộ điều hòa và hệ thống làm mát.
* **Nút bấm 3:** `EMERGENCY_MAIN_BREAKER_TRIP` $\to$ Cắt điện toàn nhà trong tình huống khẩn cấp.
