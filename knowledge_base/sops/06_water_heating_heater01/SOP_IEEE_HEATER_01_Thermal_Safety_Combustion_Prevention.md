# 📘 KANGAROO SMART WATER HEATER TECHNICAL SOP & THERMAL SAFETY SPECIFICATION (HEATER_01)

> **Applied Device Code:** `HEATER_01` (Smart Electric Water Heater & Thermal Storage)  
> **Reference Standards:** Kangaroo Electric Water Heater Product Manual (Models KG 516 / KG 518 / KG 68A2 / KG 69A2 / KG 73R2) / IEC 60335-2-21 Safety Standard / Hattori et al. (MDPI Sensors 2022)  
> **Classification:** Standard Operating Procedure (SOP) & Thermal Runaway Life-Safety Protocol

---

## 1. Hardware Specifications & Operating Parameters

The **`HEATER_01`** device represents an electric water heater system equipped with high-grade **Inox 316L heating elements**, anti-corrosion Magnesium anodes, and multi-tier safety mechanisms:

* **Supported Kangaroo Models:** KG 516 (15L), KG 518 (30L), KG 68A2/3 (22L/30L), KG 69A2/3 (22L/30L), KG 73R2 (22L).
* **Electrical Ratings:** Voltage $220\text{V} \pm 10\%$, Frequency $50\text{ Hz}$, Rated Power $P_{\text{rated}} = 2500\text{ W}$.
* **Wiring Requirements:** Dedicated power line with cross-sectional area $\ge 2.5\text{ mm}^2$, Dedicated Circuit Breaker $16\text{A} - 20\text{A}$, Mandatory Earth Grounding.
* **Maximum Safe Operating Temperature ($T_{\max}$):** $75.0^\circ\text{C}$ (Adjustable thermostat range $30^\circ\text{C} - 75^\circ\text{C}$).
* **Operating Hydraulic Pressure:** Maximum $0.8\text{ MPa}$ ($8.0\text{ bar}$) protected by a 1-way safety pressure relief valve.

---

## 2. Multi-Tier Safety & Fault Detection Classification

| Operational State | Water Temp ($T_{\text{water}}$) | Power ($P$) | Multi-Agent Status | Safety Interlock Action |
| :--- | :---: | :---: | :---: | :--- |
| **Normal Heating** | $45.0^\circ\text{C} - 55.0^\circ\text{C}$ | $2200\text{ W} - 2500\text{ W}$ | `NORMAL` | Standard thermostatic control, anti-scald protection. |
| **Eco Standby** | $30.0^\circ\text{C} - 45.0^\circ\text{C}$ | $0\text{ W} - 800\text{ W}$ | `NORMAL` | Low-power standby, energy conservation. |
| **High Thermal Warning** | $55.1^\circ\text{C} - 75.0^\circ\text{C}$ | $2501\text{ W} - 3000\text{ W}$ | `WARNING` | Check scaling on Inox 316L heating element. |
| **Critical Overheat / Dry Burn** | **$> 75.0^\circ\text{C}$ (up to $98^\circ\text{C}$)** | **$> 3200\text{ W}$** | **`CRITICAL_ANOMALY`** | **Immediate ELCB Relay Trip + Emergency Water Shutoff** |

---

## 3. Automated Emergency Protocols & Safety Interlocks

### 3.1. Anti-Dry Burn & Overheat Protection (Chống Đun Khô)
If power is supplied ($P > 2000\text{ W}$) while the tank is empty, the heating element temperature accelerates at $\frac{dT}{dt} > 5.0^\circ\text{C/min}$:
1. **Immediate Disconnect**: Hardware ELCB/Relay trip triggered within $< 500\text{ ms}$.
2. **Control MQTT Payload**:
   ```json
   {
     "device_code": "HEATER_01",
     "action": "EMERGENCY_SHUTDOWN",
     "reason": "ANTI_DRY_BURN_PROTECTION",
     "timestamp": "2026-08-21T15:30:00Z"
   }
   ```

### 3.2. Unoccupied Interlock
When `PIR_01` confirms room vacancy $> 15\text{ minutes}$, `HEATER_01` automatically transitions from active heating ($75^\circ\text{C}$) to `ECO_STANDBY` ($45^\circ\text{C}$), eliminating standby thermal dissipation and preventing accidental unattended boiling.

---

## 4. Maintenance & Diagnostic Procedures

* **Magnesium Anode Inspection**: Replace once every 12 months to prevent tank corrosion.
* **Safety Relief Valve Test**: Manually test the relief lever 1–2 times per year to prevent calcium limescale clogging.
* **ELCB Circuit Test**: Press the `TEST` button monthly; ensure the power LED turns off instantly and resumes upon pressing `RESET`.
