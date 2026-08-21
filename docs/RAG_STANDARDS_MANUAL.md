# 📚 SỔ TAY QUY CHUẨN KỸ THUẬT THIẾT BỊ & TIÊU CHUẨN QUỐC TẾ IEEE / ASHRAE / EN / IEC

> **Tài liệu tham chiếu chuẩn cho Hệ thống Aegis-IoT Multi-Agent RAG Knowledge Base**  
> Tổng hợp toàn bộ các ngưỡng vận hành an toàn, cơ sở khoa học từ các công trình nghiên cứu quốc tế và danh mục thiết bị thực tế trong hệ thống.

---

## 1. Bảng Tổng Hợp Tiêu Chuẩn Cho Từng Thiết Bị Trong Hệ Thống

| Mã Thiết Bị | Tên Thiết Bị | Thông Số Đo (Metrics) | Đơn Vị | Tiêu Chuẩn Quốc Tế Áp Dụng | Ngưỡng An Toàn (Normal) | Ngưỡng Sự Cố (Critical) |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **`AC_01`** | Máy lạnh / AHU Inverter | `power`, `temperature` | W, °C | **ASHRAE Guideline 36-2018 / ISSO 31 / TU Delft 4S3F (Energy & Buildings 2026)** | Công suất: $900 - 1400\text{ W}$<br>Nhiệt độ: $20.0 - 24.0^\circ\text{C}$<br>Hiệu suất $\eta_{sa} \ge 71\%$ | Công suất: $> 2200\text{ W}$<br>Nhiệt độ: $> 34.0^\circ\text{C}$ (Overheat)<br>Kẹt bánh xe nhiệt $\eta_{sa} \to 0\%$ |
| **`SENSOR_01`** | Cảm biến nhiệt ẩm phòng khách | `temperature`, `humidity` | °C, % | **OMRON 2JCIE-BU01 Specs / Hattori et al. (Sensors MDPI 2022)** | Nhiệt độ: $26.0 - 29.5^\circ\text{C}$<br>Độ ẩm: $55.0 - 68.0\%$ | Nhiệt độ: $> 35.0^\circ\text{C}$<br>Độ ẩm: $> 85.0\%$ (Ẩm mốc) |
| **`METER_01`** | Đồng hồ điện tổng | `voltage`, `current`, `power` | V, A, W | **IEEE C37 (Circuit Breakers) / IEC 61000 Power Quality** | Điện áp: $218 - 224\text{ V}$<br>Dòng điện: $10.0 - 17.5\text{ A}$<br>Công suất: $2200 - 3800\text{ W}$ | Điện áp: $> 250\text{ V}$ hoặc $< 180\text{ V}$<br>Dòng điện: $> 32.0\text{ A}$<br>Công suất: $> 6500\text{ W}$ (Surge) |
| **`CO2_01`** | Cảm biến $\text{CO}_2$ phòng ngủ | `co2` | ppm | **ASHRAE Standard 62.1 / Figaro CDM7160 / Vanhaeverbeke (IEEE Access 2025)** | Nồng độ: $400 - 1000\text{ ppm}$ | Nồng độ: $> 1800\text{ ppm}$ (Ngạt khí)<br>$> 3000\text{ ppm}$ (Lò sưởi cháy) |
| **`HEATER_01`** | Bình nóng lạnh | `power`, `temperature` | W, °C | **IEC 60335-2-21 Safety / Hattori et al. (Sensors 2022)** | Công suất: $1800 - 2400\text{ W}$<br>Nhiệt độ: $45.0 - 55.0^\circ\text{C}$ | Công suất: $> 3200\text{ W}$<br>Nhiệt độ: $> 85.0^\circ\text{C}$ (Đun khô) |
| **`LIGHT_01`** | Cảm biến & Đèn LED chiếu sáng | `lux` | lx | **EN 12464-1 / CIE 17 / Magno et al. (IEEE Sensors Journal 2015)** | Độ rọi: $300 - 750\text{ Lux}$<br>(Target: $600\text{ Lux}$, CRI $R_a \ge 80$) | Thiếu sáng: $< 150\text{ Lux}$<br>Chói lóa: $> 1000\text{ Lux}$ (UGR > 19) |
| **`PIR_01`** | Cảm biến chuyển động hồng ngoại | `motion`, `presence` | bool | **Panasonic AMN34111J / Magno et al. (IEEE Sensors 2015)** | FOV: $120^\circ$, Range: $10\text{ m}$<br>Timeout ngày: $45\text{ phút}$, đêm: $5\text{ phút}$ | Vắng nhà: $> 15\text{ phút}$ không chuyển động |

---

## 2. Danh Mục Các File SOP Chuẩn Trong Thư Mục `knowledge_base/sops/`

```
knowledge_base/sops/
├── 01_hvac_air_conditioner_ac01/
│   └── SOP_IEEE_HVAC_01_AHU_Heat_Recovery_FDD.md
├── 02_ambient_lighting_light01/
│   └── SOP_IEEE_LIGHT_01_Visual_Comfort_Smart_Dimming.md
├── 03_occupancy_pir_presence_pir01/
│   └── SOP_IEEE_PIR_01_Motion_Presence_Occupancy_Protocol.md
├── 04_air_quality_co2_co201/
│   └── SOP_IEEE_CO2_01_Indoor_Air_Quality_Ventilation.md
├── 05_electrical_power_meter_01/
│   └── SOP_IEEE_METER_01_Power_Surge_Electrical_Safety.md
├── 06_water_heating_heater01/
│   └── SOP_IEEE_HEATER_01_Thermal_Safety_Combustion_Prevention.md
└── 07_multi_agent_system_fdd/
    └── SOP_IEEE_FDD_01_4S3F_Diagnostic_Bayesian_Network.md
```

---

## 3. Quy Trình Tự Động Nạp & Đồng Bộ Vector Vào Qdrant

Khi có bất kỳ tài liệu quy chuẩn mới (Markdown hoặc PDF) được bổ sung vào các thư mục trên:
1. Chạy lệnh:
   ```bash
   python scripts/ingest_knowledge_base.py
   ```
2. Hệ thống sẽ tự động:
   - Làm sạch văn bản và loại bỏ ký tự rác.
   - Chia đoạn ngữ nghĩa (Semantic Chunking) với `chunk_size=600` và `overlap=100`.
   - Sinh vector đặc trưng ngữ nghĩa và nạp vào Qdrant collection `system_baselines_sop`.
   - Multi-Agent (`retriever_agent.py`) sẽ ngay lập tức truy vấn được thông tin từ tài liệu mới này.
