# 📘 INDOOR ENVIRONMENTAL QUALITY (IEQ) & COGNITIVE PRODUCTIVITY STANDARD (SENSOR_01)

> **Applied Device Codes:** `SENSOR_01`, `AC_01`, `CO2_01`, `LIGHT_01`  
> **Reference Standards:** EN 16798-1:2019 / ASHRAE 55-2017 / University of Ljubljana IEQLab Study (Domjan et al., Energy & Buildings 2025)  
> **Classification:** Standard Operating Procedure (SOP) & Integral Multi-Domain Productivity Index

---

## 1. 4-Domain Indoor Environmental Quality (IEQ) Framework

Indoor Environmental Quality directly governs occupant well-being and cognitive mental productivity. The system integrates physical metrics across 4 independent environmental domains:

```
┌────────────────────────────────────────────────────────────────────────┐
│               4 CORE INDOOR ENVIRONMENTAL QUALITY DOMAINS              │
├─────────────────────┬──────────────────────────────────────────────────┤
│ 1. Thermal Comfort  │ Operative Temp θ_op (21–23.5°C), PMV (-0.6..-0.7)│
│    (Weight: 0.220)  │ Humidity Index HI (68–72), Relative Humidity φ_i │
├─────────────────────┼──────────────────────────────────────────────────┤
│ 2. Indoor Air (IAQ) │ CO2 Concentration (< 900 ppm Class II / < 500 I) │
│    (Weight: 0.244)  │ Ventilation Rate, Decipols                       │
├─────────────────────┼──────────────────────────────────────────────────┤
│ 3. Lighting Comfort │ Illuminance E_p (> 550 lx), Kruithof CCT Tuning, │
│    (Weight: 0.260)  │ Daylight Glare Probability DGP (< 0.35)          │
├─────────────────────┼──────────────────────────────────────────────────┤
│ 4. Noise Exposure   │ Sound Pressure Level L_eq,A (40–50 dB(A)),       │
│    (Weight: 0.276)  │ Office Noise Masking into Ambient White Noise    │
└─────────────────────┴──────────────────────────────────────────────────┘
```

---

## 2. Integral Productivity-Loss Index ($PL\text{-}IEQ_{INDEX}$)

According to experimental findings across cognitive tests ($T_1$ d2 visual attention, $T_2$ arithmetic calculation, $T_3$ Baddeley logical reasoning), mental productivity decreases when IEQ deviates from optimal parameters:

$$PL\text{-}IEQ_{INDEX,t} = \frac{UER_o^-}{UER_o^- + UER_o^+} \times 100\%$$

Where:
* $UER_o^+ = \sum_{j=1}^4 z_j \cdot (5 - RPL_j)$ (Positive Euclidean distance from ideal rank 5)
* $UER_o^- = \sum_{j=1}^4 z_j \cdot (RPL_j - 1)$ (Negative Euclidean distance from lowest rank 1)
* **Domain Weight Factors ($z_j$):**
  $$z_T = 0.220, \quad z_{IAQ} = 0.244, \quad z_L = 0.260, \quad z_N = 0.276$$

---

## 3. Optimal Multi-Domain Setpoints for Cognitive Performance

| Environmental Metric | Target Operational Window | Cognitive Benefit & Physiological Mechanism |
| :--- | :---: | :--- |
| **Operative Temperature ($\theta_{op}$)** | **$21.0^\circ\text{C} - 23.5^\circ\text{C}$** | Minimizes metabolic thermal strain; lowest productivity loss at PMV between $-0.6$ and $-0.7$. |
| **Humidity Index ($HI$)** | **$68.0 - 72.0$** | Prevents mucosal dryness and thermal lethargy. |
| **Indoor $\text{CO}_2$ Concentration** | **$< 900\text{ ppm}$** | Sustains high executive decision-making and concentration over long working hours. |
| **Workplane Illuminance & CCT** | **$> 550\text{ Lux}$ with $4700\text{K} - 6400\text{K}$** | Aligns with Kruithof curve; cold white light at high lux enhances alertness. |
| **Acoustic Background Noise** | **$45 - 55\text{ dB(A)}$ (White Noise)** | Masks disruptive speech and traffic sounds, reducing anxiety and cognitive alienation. |

---

## 4. Multi-Agent Adaptive Control Loop

When the cognitive productivity index drops ($PL\text{-}IEQ_{INDEX} < 75\%$):
1. **`AC_01`**: Adjusts supply air temperature setpoint to bring operative temperature $\theta_{op} \to 22.0^\circ\text{C}$.
2. **`CO2_01`**: Opens fresh air damper when $[\text{CO}_2] > 900\text{ ppm}$.
3. **`LIGHT_01`**: Increases LED brightness to $600\text{ Lux}$ with correlated color temperature $\text{CCT} = 4700\text{K}$.
4. **Energy-Productivity Tradeoff**: Smart adaptive control yields a **$35\% - 45\%$ reduction in annual building energy demand** while simultaneously improving productivity by $+13.4\%$.
