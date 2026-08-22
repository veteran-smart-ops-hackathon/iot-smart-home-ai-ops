# 📘 EVN ELECTRONIC POWER METER OBIS CODES & TARIFF PEAK SHAVING SPECIFICATION (METER_01)

> **Applied Device Code:** `METER_01` (Main Smart Power Meter & Inverter Monitoring)  
> **Reference Standards:** EVNHCMC Electronic Meter Technical Guide (2025) / MOIT Decision 1279/QĐ-BCT Electricity Tariff / IEC 62056 DLMS/COSEM OBIS Protocol  
> **Classification:** Standard Operating Procedure (SOP) & Dynamic TOU Energy Cost Optimization

---

## 1. Supported Smart Meter Hardware Models & Categories

The Aegis-IoT platform interfaces with industrial and residential electronic meters deployed across EVN power grids:

| Category | Typical Models in Grid Deployment | Phase & Wire Configuration | Communication Protocol |
| :--- | :--- | :--- | :--- |
| **1-Phase Single-Tariff** | GELEX CE-1x, EVNCPC EMEC DT01xx, Hữu Hồng HHM-1x, Vinasino VSE1x, Psmart SF80P-20, Omnisystem A002, Nuri ML1 | 1-Phase 2-Wire (220V, 50Hz) | Pulse / Optical / RS485 Modbus / MQTT |
| **1-Phase Multi-Tariff** | GELEX CE-14, EVNCPC EMEC DT01M80, Hữu Hồng HHM-1x, Vinasino VSE1T-xx, Psmart CE-14, Omnisystem A003, Nuri ML5 | 1-Phase 2-Wire (220V, 50Hz) | DLMS/COSEM / MQTT Gateway |
| **3-Phase Multi-Tariff** | GELEX ME-40 / ME-xx, EVNCPC DT03P-xx / DT03xx, Hữu Hồng HHM-3x, Vinasino VSE3T-xx / VSE3x, Psmart TF100m-xx, Omnisystem B0x/C0x, Nuri ML2/ML3/ML4 | 3-Phase 4-Wire (3x220/380V) | DLMS/COSEM / TCP/IP Modbus / MQTT |

---

## 2. Standard OBIS Code Register Mapping (IEC 62056-61)

The telemetry ingestion worker decodes standard OBIS (Object Identification System) codes from the meter payload:

| OBIS Code | Parameter Name | Engineering Unit | Multi-Agent Application |
| :--- | :--- | :---: | :--- |
| **`1.8.0`** | Total Cumulative Active Energy Import | $\text{kWh}$ | Continuous Energy Consumption Baseline |
| **`1.8.1`** | Active Energy - Normal Hours (T1) | $\text{kWh}$ | Normal Tariff Tracking ($1,984 - 2,998\text{ VND/kWh}$) |
| **`1.8.2`** | Active Energy - Peak Hours (T2) | $\text{kWh}$ | Peak Shaving Trigger ($3,640 - 5,422\text{ VND/kWh}$) |
| **`1.8.3`** | Active Energy - Off-Peak Hours (T3) | $\text{kWh}$ | Off-Peak Load Shifting ($1,146 - 1,829\text{ VND/kWh}$) |
| **`2.8.0`** | Total Reverse Active Energy (Export) | $\text{kWh}$ | Rooftop Solar Grid-Tie Monitoring |
| **`3.8.0`** | Total Reactive Energy Import | $\text{kvarh}$ | Power Factor & Grid Quality Penalty Avoidance |
| **`31.7.0` / `51.7.0` / `71.7.0`** | Instantaneous Phase Current (A, B, C) | $\text{A}$ | Overcurrent & Electrical Fire Hazard ($>32\text{A}$) |
| **`32.7.0` / `52.7.0` / `72.7.0`** | Instantaneous Phase Voltage (A, B, C) | $\text{V}$ | Overvoltage ($>250\text{V}$) & Undervoltage ($<180\text{V}$) |
| **`21.7.0`** | Total Active Power ($P$) | $\text{kW}$ | Peak Load Threshold Control ($>6.5\text{kW}$) |
| **`23.7.0`** | Total Reactive Power ($Q$) | $\text{kvar}$ | Inductive Load Compensation Monitoring |
| **`33.7.0` / `53.7.0` / `73.7.0`** | Power Factor ($\cos\varphi$) | $-$ | Low Power Factor Alert ($\cos\varphi < 0.85$) |
| **`14.7.0`** | Grid Frequency ($f$) | $\text{Hz}$ | Grid Stability Boundary ($50.0 \pm 0.5\text{ Hz}$) |
| **`1.6.0` / `1.6.1` / `1.6.2`** | Maximum Power Demand (Max Demand) | $\text{kW}$ | Commercial Demand Charge Protection |

---

## 3. Electricity Retail Tariff Schedule (MOIT Decision 1279/QĐ-BCT)

```
[Retail Residential Progressive Tier Schedule]
Tier 1 (0 – 50 kWh)      : 1,984 VND/kWh
Tier 2 (51 – 100 kWh)    : 2,050 VND/kWh
Tier 3 (101 – 200 kWh)   : 2,380 VND/kWh
Tier 4 (201 – 300 kWh)   : 2,998 VND/kWh
Tier 5 (301 – 400 kWh)   : 3,350 VND/kWh
Tier 6 (401+ kWh)        : 3,460 VND/kWh
--------------------------------------------------
[Commercial Time-of-Use (TOU) Tariff Schedule]
Peak Hours (09:30-11:30 & 17:00-20:00) : 3,640 - 5,422 VND/kWh (HIGH)
Normal Hours (04:00-09:30 & 11:30-17:00): 1,833 - 3,152 VND/kWh (MEDIUM)
Off-Peak Hours (22:00-04:00)           : 1,146 - 1,918 VND/kWh (ECONOMY)
```

---

## 4. Multi-Agent Peak Shaving & Cost Optimization Algorithm

```
[Current Time in Peak Window (e.g. 17:00 - 20:00)] 
                     │
                     ▼
         [Read OBIS 21.7.0: Power > 4.5 kW]
                     │
                     ├──> [1. Planning Agent: Switch AC_01 to ECO Mode 26°C]
                     ├──> [2. Planning Agent: Defer HEATER_01 heating cycle]
                     └──> [3. Yield estimated cost reduction: 35% - 42% on electricity bill]
```

### Action Controls for Operators:
* **`ENABLE_PEAK_SHAVING_AUTO`**: Automatically curtails non-critical loads during MOIT peak hours.
* **`SHIFT_HEATER_TO_OFFPEAK`**: Re-schedules high-power thermal cycles to off-peak tariff periods ($22:00 - 04:00$).
