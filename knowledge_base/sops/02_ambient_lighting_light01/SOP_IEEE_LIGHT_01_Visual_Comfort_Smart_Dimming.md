# 📘 TIÊU CHUẨN TIỆN NGHI THỊ GIÁC & QUY TRÌNH ĐIỀU KHIỂN CHIẾU SÁNG THÔNG MINH (LIGHT_01)

> **Mã thiết bị áp dụng:** `LIGHT_01` (Smart LED Panel & Ambient Light Sensor)  
> **Tiêu chuẩn tham chiếu:** EN 12464-1 / EN 12665 / CIE 17 / IEEE 802.15.4 ZigBee Standard / Nghiên cứu tiện nghi thị giác Carlucci et al. (Renewable & Sustainable Energy Reviews, 2015) / Hệ thống WSN LED Magno et al. (IEEE Sensors Journal, 2015)  
> **Phân loại:** Standard Operating Procedure (SOP) & Energy Optimization Protocol

---

## 1. Cơ Sở Khoa Học Về Tiện Nghi Thị Giác (Visual Comfort)

Theo tiêu chuẩn châu Âu **EN 12665** và **EN 12464-1**, tiện nghi thị giác là trạng thái cảm giác thỏa mãn của con người đối với môi trường ánh sáng, được quyết định bởi 4 yếu tố cốt lõi:
1. **Cường độ rọi sáng (Amount of Light - Illuminance $E_p$):** Lượng quang thông trên một đơn vị diện tích mặt phẳng làm việc [Lux].
2. **Độ đồng đều ánh sáng (Uniformity of Light $U_0$):** Tỷ lệ giữa độ rọi tối thiểu và độ rọi trung bình trên bề mặt nhiệm vụ.
3. **Hiện tượng chói lóa (Glare - UGR & DGP):** Cảm giác khó chịu hoặc giảm thị lực do tương phản độ chói quá mức.
4. **Chất lượng hiển thị màu sắc (Color Rendering Index - CRI $R_a$):** Khả năng tái tạo màu sắc trung thực của nguồn sáng so với ánh sáng tự nhiên.

---

## 2. Các Chỉ Số Kỹ Thuật & Ngưỡng Vận Hành Tiêu Chuẩn

### 2.1. Độ rọi mặt phẳng làm việc (Work-Plane Illuminance $E_p$)
$$E_p = \frac{d\Phi}{dA_{\text{rec}}} \quad [\text{Lux}]$$
- **Ngưỡng tiện nghi khu vực làm việc văn phòng / phòng khách:** $300\text{ Lux} \le E_p \le 750\text{ Lux}$ (Giá trị tham chiếu khuyến nghị: $500\text{ Lux}$, Target cài đặt hệ thống: $600\text{ Lux}$).
- **Dải chiếu sáng tự nhiên hữu ích (Useful Daylight Illuminance - UDI):** $100\text{ Lux} \le \text{UDI} \le 2000\text{ Lux}$.
- **Trường hợp thiếu sáng (Under-lit):** $E_p < 150\text{ Lux}$ $\to$ Bắt buộc tăng công suất đèn LED nhân tạo.
- **Trường hợp quá sáng / Nguy cơ chói (Over-lit):** $E_p > 750\text{ Lux}$ $\to$ Giảm độ sáng đèn LED về mức tối thiểu hoặc tự động đóng rèm che nắng.

### 2.2. Độ đồng đều ánh sáng (Illuminance Uniformity $U_0$)
$$U_{0,\text{average}} = \frac{E_{\min}}{E_{\text{average}}} \ge 0.80$$
$$U_{0,\max} = \frac{E_{\min}}{E_{\max}} \ge 0.70$$

### 2.3. Chỉ số chói lóa chuẩn CIE (Unified Glare Rating - UGR)
$$\text{UGR} = 8 \log_{10} \left[ \frac{0.25}{L_b} \sum_{i=1}^n \frac{L_{s,i}^2 \cdot \omega_{s,i}}{P_i^2} \right]$$
* **Ngưỡng giới hạn an toàn thị giác:** $\text{UGR} \le 19.0$ (Mức ranh giới giữa tiện nghi và chói mắt khó chịu).
* **Mức không thể chịu đựng (Intolerable Glare):** $\text{UGR} \ge 28.0$.

### 2.4. Chỉ số hoàn màu (Color Rendering Index - CRI)
$$\text{CRI} = R_a = \frac{1}{8} \sum_{i=1}^8 R_i \ge 80.0$$
Đèn LED panel bắt buộc phải đạt $R_a \ge 80$ để đảm bảo nhận diện vật thể tự nhiên và không gây mỏi mắt kéo dài.

---

## 3. Giao Thức Điều Khiển Chiếu Sáng Thông Minh (Smart Zigbee LED Dimming)

Hệ thống điều khiển chiếu sáng phân tán dựa trên mạng cảm biến không dây **Zigbee (IEEE 802.15.4 MAC)** kết hợp cảm biến quang học **Osram SFH 5711** và bộ điều khiển xung **PWM 0-10V** kết nối Driver công nghiệp **Mean Well LPF-40D-42**:

```
[Cảm biến Quang Osram SFH 5711] ──(ADC)──> [Vi điều khiển MSP430]
                                                  │
                                          (Tính toán PWM)
                                                  │
                                                  ▼
[Driver Mean Well LPF-40D-42] <──(0-10V)── [Mạch P-MOS Interface]
```

### 3.1. Thuật toán điều chỉnh độ mờ (Dimming Algorithm)
1. **Chu kỳ lấy mẫu cảm biến:** $500\text{ ms}$ (Đảm bảo cân bằng tối ưu giữa tốc độ phản hồi và tiết kiệm năng lượng).
2. **Logic điều khiển vòng kín (Closed-Loop Dimming):**
   - Nếu $E_{\text{room}} > E_{\text{target}} + \Delta \varepsilon$: Giảm giá trị xung $\text{PWM} = \text{PWM} - \text{SMOOTH\_STEP}$.
   - Nếu $E_{\text{room}} < E_{\text{target}} - \Delta \varepsilon$: Tăng giá trị xung $\text{PWM} = \text{PWM} + \text{SMOOTH\_STEP}$.
3. **Dải điều chế công suất:** Khả dụng từ $0\%$ đến $87\%$ PWM. Khi PWM $\ge 87\%$, đèn tự động ngắt nguồn hoàn toàn ($0\text{ Watt}$).
4. **Hiệu quả tiết kiệm năng lượng:** Giảm $55\%$ tổng điện năng tiêu thụ trong chu kỳ 6 tháng và lên đến $69\%$ vào mùa xuân nhờ tận dụng tối đa ánh sáng tự nhiên ban ngày (Daylight Harvesting).

---

## 4. Quy Trình Chẩn Đoán Lỗi & Xử Lý Sự Cố

| Mã Sự Cố | Triệu chứng kỹ thuật | Nguyên nhân gốc rễ (RCA) | Hành động khắc phục tự động |
| :--- | :--- | :--- | :--- |
| **LIGHT-ERR-01** | $E_p < 100\text{ Lux}$ dù PWM = 100% | Cháy thanh LED, hỏng Driver nguồn Mean Well, hoặc đứt cáp tín hiệu 0-10V | Phát cảnh báo thay thế bóng đèn, chuyển tải sang cụm đèn dự phòng |
| **LIGHT-ERR-02** | $\text{PWM}$ dao động liên tục (>10 lần/phút) | Cảm biến ánh sáng bị bóng đổ chuyển động hoặc ánh sáng mặt trời chiếu trực tiếp | Kích hoạt bộ lọc Kalman làm mịn dữ liệu quang học, tăng ngưỡng trễ $\Delta \varepsilon = \pm 50\text{ Lux}$ |
| **LIGHT-ERR-03** | Đèn vẫn bật $100\%$ khi phòng vắng người $>15\text{ phút}$ | Mất kết nối gói tin Zigbee từ cảm biến PIR hoặc lỗi trạng thái Coordinator | Phát lệnh broadcast `FORCE_DIM_ZERO` qua MQTT topic `hackathon/smarthome/LIGHT_01/control` |
