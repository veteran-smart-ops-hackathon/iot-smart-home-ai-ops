# 📘 TIÊU CHUẨN CHẤT LƯỢNG KHÔNG KHÍ TRONG NHÀ IAQ & QUY CHUẨN THÔNG GIÓ CO2 (CO2_01)

> **Mã thiết bị áp dụng:** `CO2_01` & `SENSOR_01` (NDIR Carbon Dioxide Gas Sensor & Indoor Air Quality Monitor)  
> **Tiêu chuẩn tham chiếu:** ASHRAE Standard 62.1-2019 / Health Canada Exposure Guidelines / Luật Tiêu Chuẩn Xây Dựng Nhật Bản / Nghiên cứu IAQ Hattori et al. (Sensors MDPI, 2022) / Nghiên cứu nhận diện hiện diện Vanhaeverbeke et al. (IEEE Access, 2025)  
> **Phân loại:** Standard Operating Procedure (SOP) & Air Quality Life-Safety Standard

---

## 1. Đặc Tính Cảm Biến Khí NDIR & Cơ Sở Đo Lường

Module đo nồng độ $\text{CO}_2$ trong hệ thống Aegis-IoT ứng dụng cảm biến quang phổ hồng ngoại không phân tán **NDIR (Non-Dispersive Infrared)** độ chính xác cao:

* **Model cảm biến chuẩn:** **Figaro CDM7160-C00** & **Netatmo Smart IAQ Sensor**.
* **Dải đo nồng độ:** $360\text{ ppm} - 5000\text{ ppm}$ với bước nhảy $1\text{ ppm}$.
* **Độ chính xác đo lường:** $\pm (50\text{ ppm} + 3\%\text{ giá trị đo})$.
* **Nồng độ $\text{CO}_2$ khí quyển nền tự nhiên:** $\approx 415\text{ ppm} - 420\text{ ppm}$.
* **Tốc độ lấy mẫu:** $10\text{ giây/lần}$, trung bình trượt $1\text{ phút}$ cho phát hiện bất thường và $10\text{ phút}$ cho lập hồ sơ hiện diện (Occupancy Profiling).

---

## 2. Phân Cấp Ngưỡng Nồng Độ CO2 & Tác Động Sức Khỏe

Theo tiêu chuẩn quốc tế **ASHRAE 62.1** và **Health Canada Guidelines**, nồng độ $\text{CO}_2$ trong nhà được phân thành 4 cấp độ nghiêm ngặt:

| Cấp Độ | Dải Nồng Độ $\text{CO}_2$ | Đánh Giá Chất Lượng | Tác Động Sinh Học & Sức Khỏe | Hành Động Yêu Cầu Của Hệ Thống |
| :--- | :--- | :--- | :--- | :--- |
| **Mức 1: Lý tưởng** | $\le 1000\text{ ppm}$ | Không khí trong lành (Clean Air) | Trạng thái tinh thần tỉnh táo, hô hấp tối ưu, giấc ngủ sâu. | Duy trì thông gió định mức cơ bản. |
| **Mức 2: Cảnh báo sớm** | $1000 - 1500\text{ ppm}$ | Không khí bắt đầu tù đọng | Bắt đầu suy giảm độ tập trung nhẹ, cảm giác ngột ngạt. | Kích hoạt quạt thông gió mức 1 ($50\%$ công suất). |
| **Mức 3: Nguy hại vừa** | $1500 - 2500\text{ ppm}$ | Ô nhiễm mức trung bình | Đau đầu, mệt mỏi, suy giảm $20\%-50\%$ khả năng ra quyết định nhận thức. | Mở van gió tươi ngoài trời (Fresh Air Damper $100\%$). |
| **Mức 4: Nguy hiểm khẩn cấp** | $> 3000\text{ ppm}$ (lên tới $5000\text{ ppm}$) | Ô nhiễm nghiêm trọng do thiết bị cháy | Nguy cơ ngộ độc khí $\text{CO}/\text{NO}_x$, hội chứng nhà bệnh tật (Sick Building Syndrome). | **Cắt nguồn thiết bị cháy, mở thông gió cưỡng bức $100\%$, báo động còi.** |

---

## 3. Ảnh Hưởng Của Thiết Bị Đốt Nhiệt (Combustion Heating) & Nhiệt Độ Ngoài Trời

Theo công trình nghiên cứu của **Hattori et al. (Sensors 2022)** trên 24 tòa nhà thực tế:
1. **Nguy cơ từ lò sưởi đốt nhiên liệu (Gas/Kerosene Heater):** Việc sử dụng lò sưởi đốt trực tiếp khiến nồng độ $\text{CO}_2$ tăng đột ngột lên **$3500\text{ ppm} - 5000\text{ ppm}$** chỉ sau $60\text{ phút}$ sử dụng vào buổi sáng, làm tăng gấp 5 lần hàm lượng chất độc hại so với nhà dùng điều hòa không khí không phát thải.
2. **Quy luật tương quan nghịch với nhiệt độ môi trường ($T_{oa}$):**
   - Khi nhiệt độ ngoài trời giảm dưới $10^\circ\text{C}$ vào mùa đông, tần suất mở cửa sổ tự nhiên của con người giảm trên $70\%$.
   - Điều này dẫn đến sự tích tụ $\text{CO}_2$ nghiêm trọng trong phòng kín ngay cả khi không dùng máy sưởi đốt.
   - **Quy tắc điều khiển:** Khi $T_{oa} < 10^\circ\text{C}$, hệ thống Multi-Agent bắt buộc phải tự động kích hoạt thông gió cơ khí định kỳ $15\text{ phút/giờ}$ mà không phụ thuộc vào hành vi mở cửa sổ của người dùng.

---

## 4. Thuật Toán Lập Hồ Sơ Hiện Diện Đa Phòng (Cross-Room Occupancy Profiling)

Hệ thống ứng dụng thuật toán máy học theo phương pháp của **Vanhaeverbeke et al. (IEEE Access 2025)** để phát hiện người và lập lịch thông gió thích ứng:

### 4.1. Trích xuất đặc trưng chuỗi thời gian (Feature Extraction)
* Đặc trưng tức thời: Nồng độ $[\text{CO}_2]$ tại cửa sổ $10\text{ phút}$ hiện tại.
* Đặc trưng trễ $1\text{ giờ}$ (Historical Window): Giá trị trung bình $\text{Mean}([\text{CO}_2]_{1h})$ và độ dốc tốc độ tăng $\text{Slope}([\text{CO}_2]_{1h})$.
* Đặc trưng dịch chuyển thời gian (Temporal Shift Features): Dịch chuyển $1h, 2h, 4h, 8h$ trước và sau cửa sổ dự đoán.

### 4.2. Chuẩn hóa cửa sổ trượt 30 ngày (30-Day Sliding Window Normalization)
$$Z(t) = \frac{[\text{CO}_2](t) - \mu_{30\text{d}}(t)}{\sigma_{30\text{d}}(t)}$$
* Thuật toán tự động thích ứng với từng phòng và bù trôi cảm biến (Sensor Drift) mà không cần huấn luyện lại mô hình (Zero-Shot Cross-Room Transfer), đạt độ chính xác cân bằng **$80.6\% - 84.6\%$**.

---

## 5. Quy Trình Ứng Phó Sự Cố Khi CO2 Vượt Ngưỡng Khẩn Cấp

```
[Nồng độ CO2 > 1800 ppm] 
        │
        ├──> [1. Kiểm tra trạng thái lò sưởi / bếp gas] ──> Nếu đang BẬT: Gửi lệnh POWER_OFF ngắt nguồn.
        │
        ├──> [2. Điều khiển thông gió AHU / AC_01]     ──> Mở Fresh Air Damper 100%, tăng tốc quạt cấp.
        │
        └──> [3. Gửi cảnh báo ưu tiên cao qua Email]    ──> Đính kèm nút bấm "BẬT THÔNG GIÓ CƯỠNG BỨC".
```
