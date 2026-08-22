# 📘 QUY CHUẨN KỸ THUẬT & QUY TRÌNH FDD HỆ THỐNG HVAC & ĐIỀU HÒA KHÔNG KHÍ (AC_01)

> **Mã thiết bị áp dụng:** `AC_01` (Living Room Air Conditioner / Heat Recovery Inverter AHU)  
> **Tiêu chuẩn tham chiếu:** IEEE / ASHRAE Guideline 36-2018 / ISSO Publication 31 / REHVA COVID-19 Guidance / TU Delft 4S3F FDD Framework (Wang et al., Energy & Buildings 2026)  
> **Phân loại:** Standard Operating Procedure (SOP) & Fault Detection and Diagnosis (FDD)

---

## 1. Tổng Quan Kỹ Thuật & Cấu Trúc Thiết Bị

Thiết bị **`AC_01`** trong hệ thống Aegis-IoT đại diện cho tổ hợp Điều hòa không khí Biến tần (Inverter HVAC) và Khối xử lý không khí trung tâm (Air Handling Unit - AHU) tích hợp bánh xe thu hồi nhiệt (Heat Recovery Wheel - HRW) và van cuộn gia nhiệt (Heating Coil Valve - HCV).

### 1.1. Sơ đồ các điểm đo cảm biến (Sensor Measurement Points)
Theo tiêu chuẩn **ASHRAE Guideline 36** và **ISSO Publication 31**, các điểm đo chuẩn bao gồm:
- $T_{oa}$: Nhiệt độ không khí ngoài trời (Outdoor Air Temperature) [°C].
- $T_{pre}$: Nhiệt độ sau bộ thu hồi nhiệt (Pre-heated Air Temperature) [°C].
- $T_{sa}$: Nhiệt độ khí cấp vào phòng (Supply Air Temperature) [°C].
- $T_{sa,set}$: Ngưỡng đặt nhiệt độ khí cấp (Supply Air Temperature Setpoint, giới hạn 18.0°C – 26.0°C).
- $T_{ra}$: Nhiệt độ khí hồi từ phòng (Return Air Temperature) [°C].
- $T_{ea}$: Nhiệt độ khí thải ra ngoài (Exhaust Air Temperature) [°C].
- $T_{in}$: Nhiệt độ môi trường trong phòng (Indoor Temperature, Setpoint: 21.5°C).
- $P_{sa}$: Áp suất tĩnh khí cấp (Supply Air Static Pressure) [Pa, Setpoint: 250 Pa].
- $U_{hc}$: Độ mở van cuộn nhiệt (Heating Coil Valve Openness) [%].
- $N_{sf}$: Tốc độ quay quạt cấp (Supply Fan Speed) [%, Định mức: 80%].
- $\Delta P_{sf}$: Độ chênh áp qua quạt cấp (Supply Fan Differential Pressure) [Pa].
- $\Delta P_{fi}$: Độ chênh áp qua bộ lọc khí (Filter Differential Pressure, Định mức: < 350 Pa).

---

## 2. Công Thức Tính Hiệu Suất & Ngưỡng Vận Hành An Toàn

### 2.1. Hiệu suất thu hồi nhiệt (Heat Recovery Efficiency)
Hiệu suất thu hồi nhiệt phía cấp ($\eta_{sa}$) và phía thải ($\eta_{ea}$) được xác định theo mô hình Pecceu & Cailou (2019):
$$\eta_{sa} = \frac{T_{oa} - T_{pre}}{T_{oa} - T_{ra}} \times 100\%$$
$$\eta_{ea} = \frac{T_{ra} - T_{ea}}{T_{ra} - T_{oa}} \times 100\%$$

* **Ngưỡng hiệu suất định mức ($\eta_{sa,nm}$):** $\ge 71.0\%$
* **Ngưỡng hiệu suất tối đa ($\eta_{hrw,max}$):** $80.0\%$
* **Độ lệch cân bằng hiệu suất ($\varepsilon_{s,e} = |\eta_{sa} - \eta_{ea}|$):** Phải $\le 1.0\%$. Nếu vượt quá ngưỡng này, cảnh báo hiện tượng rò rỉ khí hoặc kẹt cơ khí bánh xe nhiệt.

### 2.2. Bảng thông số ngưỡng phát hiện bất thường (Symptom Thresholds)
| Ký hiệu triệu chứng | Tên triệu chứng | Biểu thức kiểm tra | Ngưỡng lệch ($\varepsilon_i$) |
| :--- | :--- | :--- | :--- |
| **$S_1$ (Tset-Tsa-Diff)** | Lệch nhiệt độ khí cấp và setpoint | $|T_{sa} - T_{sa,set}| > \varepsilon_T$ | $\varepsilon_T = 0.5^\circ\text{C}$ |
| **$S_2$ (Pset-Psa-Diff)** | Lệch áp suất tĩnh và setpoint | $|P_{sa} - P_{sa,set}| > \varepsilon_P$ | $\varepsilon_P = 5.0\text{ Pa}$ |
| **$S_3$ (Tin-Tinset-Diff)** | Lệch nhiệt độ phòng và setpoint | $|T_{in} - T_{in,set}| > \varepsilon_{Tin}$ | $\varepsilon_{Tin} = 0.5^\circ\text{C}$ |
| **$S_4$ (Uhc-Upred-Diff)** | Lệch độ mở van thực tế và dự báo | $|U_{hc} - U_{hc,pred}| > \varepsilon_{hc}$ | $\varepsilon_{hc} = 18.0\%$ |
| **$S_5$ (Tpre-Tra,oa-Max)** | Nhiệt độ preheat vượt giới hạn vật lý | $T_{pre} > \max(T_{ra}, T_{oa}) - \varepsilon_{Tpre}$ | $\varepsilon_{Tpre} = 1.0^\circ\text{C}$ |
| **$S_6$ (Tsa-Tpred-Diff)** | Lệch nhiệt độ khí cấp mô hình hồi quy | $|T_{sa} - T_{sa,pred}| > \varepsilon_{Tsa}$ | $\varepsilon_{Tsa} = 1.19^\circ\text{C}$ |
| **$S_8$ (HRW-Effi-Max)** | Hiệu suất bánh xe nhiệt vượt ngưỡng tối đa | $\eta_{sa} > \eta_{hrw,max}$ | $\eta_{hrw,max} = 80.0\%$ |
| **$S_{10}$ (HRW-Effi-Min)** | Hiệu suất bánh xe nhiệt suy giảm | $\eta_{sa} \le \eta_{sa,nm}$ | $\eta_{sa,nm} = 71.0\%$ |
| **$S_{11}$ (Pfi-diff-Min)** | Chênh áp phin lọc bất thường | $\Delta P_{sf} < 350\text{ Pa} \land \Delta P_{fi} < \varepsilon_{fi}$ | $\varepsilon_{fi} = 55.0\text{ Pa}$ |
| **$S_{14}$ (Pset-Toa-Ctrl)** | Setpoint áp suất quá cao khi trời lạnh | $P_{sa,set} > 250\text{ Pa} \land T_{oa} \le \varepsilon_{oa}$ | $\varepsilon_{oa} = 20.0^\circ\text{C}$ |
| **$S_{15}$ (Tset-Toa-Ctrl)** | Setpoint nhiệt độ quá cao khi trời lạnh | $T_{sa,set} > 26.0^\circ\text{C} \land T_{oa} \le \varepsilon_{oa}$ | $\varepsilon_{oa} = 20.0^\circ\text{C}$ |
| **$S_{18}$ (Psf-Psfpred-Diff)**| Lệch chênh áp quạt thực tế và mô hình | $|\Delta P_{sf} - \Delta P_{sf,pred}| > \varepsilon_{\Delta Psf}$ | $\varepsilon_{\Delta Psf} = 59.55\text{ Pa}$ |
| **$S_{19}$ (Nsf-Nsfpred-Diff)**| Lệch tín hiệu điều khiển quạt | $|N_{sf} - N_{sf,pred}| > \varepsilon_{Nsf}$ | $\varepsilon_{Nsf} = 6.30\%$ |

---

## 3. Phân Loại Lỗi (Fault Matrix) & Ma Trận Chẩn Đoán DBN

| Mã Lỗi | Tên Sự Cố | Triệu chứng kích hoạt chính | Xác suất hậu nghiệm mục tiêu |
| :--- | :--- | :--- | :---: |
| **$F_1$ (HRW-Stuck)** | Bánh xe thu hồi nhiệt bị kẹt cơ khí / hỏng đai truyền | $S_{10}$ (HRW-Effi-Min), $S_4$ (Uhc lệch), $S_{18}$, $S_{19}$ | $P(F_1\|S) \ge 0.78$ |
| **$F_2$ (SF-Stuck)** | Quạt cấp bị kẹt tốc độ (30% hoặc 65%) | $S_2$ (Lệch áp suất), $S_{11}$ (Chênh áp lọc), $S_7$ (CO2 tăng), $S_{18}$, $S_{19}$ | $P(F_2\|S) \ge 0.91$ |
| **$F_3$ (HCV-Stuck)** | Van cấp nhiệt bị kẹt ở độ mở cố định (75% - 100%) | $S_3$ (Nhiệt độ phòng tăng vọt), $S_4$ (Lệch mô hình van), $S_1$ | $P(F_3\|S) \ge 0.51$ |
| **$F_4$ (Pset-Wrong)** | Cài đặt sai áp suất tĩnh khí cấp (+50 Pa) | $S_{14}$ (Pset cao), $S_{10}$ (Hiệu suất giảm do gió quá nhanh), $S_1$ | $P(F_4\|S) \ge 0.90$ |
| **$F_5$ (Tset-Wrong)** | Cài đặt sai ngưỡng nhiệt độ (+3°C) | $S_3$ (Lệch nhiệt phòng), $S_{15}$ (Tset cao), $S_4$ | $P(F_5\|S) \ge 0.90$ |
| **$F_6$ (Tsa-Bias)** | Lệch cảm biến nhiệt độ khí cấp (+3°C) | $S_6$ (Lệch hồi quy Tsa), $S_{13}$ (Lệch cảm biến gần), $S_4$ | $P(F_6\|S) \ge 0.78$ |
| **$F_7$ (Psa-Bias)** | Lệch cảm biến áp suất tĩnh (+30 Pa) | $S_7$ (CO2 phòng tích tụ), $S_9$ (Lệch mô hình Psa) | $P(F_7\|S) \ge 0.19$ |
| **$F_8$ (Tpre-Bias)**| Lệch cảm biến nhiệt độ preheat (+3°C) | $S_8$ (HRW-Effi-Max), $S_{12}$ (Lệch $\eta_{sa}-\eta_{ea}$), $S_5$ ($T_{pre} > T_{ra}$) | $P(F_8\|S) = 1.00$ |

---

## 4. Quy Trình Phản Ứng Sự Cố & Hành Động Tự Động (Action Steps)

1. **Khi phát hiện Kẹt Bánh Xe Thu Hồi Nhiệt ($F_1$):**
   - **Tác vụ khẩn cấp:** Chuyển hệ thống sang chế độ Bypass cơ khí. Tự động bù nhiệt độ thông qua van cuộn nhiệt $U_{hc}$ để duy trì $T_{sa}$ ở mức $21.5^\circ\text{C}$.
   - **Hành động điều khiển:** Gửi lệnh `SWITCH_BYPASS_MODE` qua MQTT topic `hackathon/smarthome/AC_01/control`.
   - **Phiếu bảo trì:** Yêu cầu kỹ thuật viên kiểm tra dây đai truyền động và motor servo của bánh xe nhiệt trong vòng 24 giờ.

2. **Khi phát hiện Quạt Cấp Bị Kẹt ($F_2$):**
   - **Tác vụ khẩn cấp:** Nếu $N_{sf} \le 30\%$, cảnh báo nguy cơ thiếu oxy và quá nhiệt cục bộ dàn coil. Giảm công suất cuộn gia nhiệt $U_{hc} \to 0\%$ ngay lập tức để tránh cháy phin lọc.
   - **Hành động điều khiển:** Gửi lệnh `EMERGENCY_FAN_RESET` hoặc `POWER_OFF_COIL`.

3. **Khi phát hiện Lệch Cảm Biến $T_{sa}$ hoặc $T_{pre}$ ($F_6, F_8$):**
   - **Tác vụ khẩn cấp:** Kích hoạt cảm biến ảo (Virtual Sensor) sử dụng mô hình hồi quy đa thức bậc 2 để thay thế giá trị cảm biến bị lệch trong vòng lặp điều khiển PID:
   $$T_{sa,pred} = 3.6926 + 0.5025 \cdot T_{pre} + 0.3618 \cdot T_{sw}$$
   - **Hành động điều khiển:** Gửi cảnh báo hiệu chuẩn (Calibration Ticket) cho kỹ sư vận hành.
