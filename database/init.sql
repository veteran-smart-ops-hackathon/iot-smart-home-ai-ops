-- ==============================================================================
-- 🛡️ AEGIS-IOT OPERATIONAL & TIME-SERIES DATABASE SCHEMA (LAYER 3A)
-- PostgreSQL 16 + TimescaleDB HA Architecture
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 📋 2. RELATIONAL TABLE: DEVICE REGISTRY & BASELINES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS device_registry (
    device_code VARCHAR(50) PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    location VARCHAR(100) NOT NULL,
    rated_voltage_v DOUBLE PRECISION DEFAULT 220.0,
    normal_power_min_w DOUBLE PRECISION DEFAULT 0.0,
    normal_power_max_w DOUBLE PRECISION DEFAULT 3000.0,
    normal_temp_min_c DOUBLE PRECISION DEFAULT 15.0,
    normal_temp_max_c DOUBLE PRECISION DEFAULT 65.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Standard Track A 6-Device Catalog
INSERT INTO device_registry (device_code, device_name, device_type, location, normal_power_min_w, normal_power_max_w, normal_temp_min_c, normal_temp_max_c)
VALUES
    ('AC_01', 'Điều Hòa Inverter Phòng Khách', 'air_conditioner', 'living_room', 180.0, 1200.0, 20.0, 28.0),
    ('HEATER_01', 'Bình Nóng Lạnh Phòng Tắm', 'water_heater', 'bathroom', 0.0, 2500.0, 30.0, 65.0),
    ('SENSOR_01', 'Cảm Biến Môi Trường Nhiệt Ẩm', 'environment_sensor', 'living_room', 0.0, 5.0, 20.0, 35.0),
    ('CO2_01', 'Cảm Biến Chất Lượng Khí CO₂', 'air_quality_sensor', 'bedroom', 0.0, 5.0, 0.0, 1000.0),
    ('LIGHT_01', 'Cảm Biến Quang Học Ban Công', 'light_sensor', 'balcony', 0.0, 5.0, 0.0, 1000.0),
    ('METER_01', 'Đồng Hồ Điện Thông Minh Tổng', 'smart_meter', 'main_panel', 50.0, 8000.0, 200.0, 240.0)
ON CONFLICT (device_code) DO UPDATE SET
    device_name = EXCLUDED.device_name,
    updated_at = NOW();

-- ==============================================================================
-- ⏱️ 3. TIMESCALEDB HYPERTABLE: IOT TELEMETRY GROUND TRUTH (100% Writes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS iot_telemetry_ground_truth (
    time TIMESTAMPTZ NOT NULL,
    device_code VARCHAR(50) NOT NULL REFERENCES device_registry(device_code) ON DELETE CASCADE,
    power_watts DOUBLE PRECISION,
    temperature_c DOUBLE PRECISION,
    humidity_pct DOUBLE PRECISION,
    co2_ppm DOUBLE PRECISION,
    lux DOUBLE PRECISION,
    voltage_v DOUBLE PRECISION,
    current_a DOUBLE PRECISION,
    anomaly_score DOUBLE PRECISION DEFAULT 0.0,
    is_anomaly BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'NORMAL',
    raw_payload JSONB
);

-- Convert to TimescaleDB Hypertable partitioned by time (7-day chunks by default)
SELECT create_hypertable(
    'iot_telemetry_ground_truth',
    'time',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Create Analytical Indexes for High-Throughput Stream Ingestion
CREATE INDEX IF NOT EXISTS idx_telemetry_device_time 
    ON iot_telemetry_ground_truth (device_code, time DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_anomaly_time 
    ON iot_telemetry_ground_truth (time DESC) 
    WHERE is_anomaly = TRUE;

-- Enable Columnar Compression Policy for Older Historical Chunks
ALTER TABLE iot_telemetry_ground_truth SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'device_code',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy(
    'iot_telemetry_ground_truth',
    INTERVAL '14 days',
    if_not_exists => TRUE
);

-- ==============================================================================
-- 📜 4. RELATIONAL TABLE: INCIDENT & ACTION AUDIT LOGS (HITL Verification)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS incident_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id VARCHAR(100) NOT NULL,
    scenario_name VARCHAR(100),
    action_id VARCHAR(100) NOT NULL,
    action_label TEXT NOT NULL,
    mqtt_topic VARCHAR(150) NOT NULL DEFAULT 'iot/devices/control',
    mqtt_payload JSONB,
    status VARCHAR(50) DEFAULT 'EXECUTED',
    energy_saved_watts DOUBLE PRECISION DEFAULT 0.0,
    executed_by VARCHAR(50) DEFAULT 'ENGINEER_DASHBOARD',
    qdrant_sync_status VARCHAR(50) DEFAULT 'SYNCED',
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_incident_time 
    ON incident_audit_logs (incident_id, executed_at DESC);

-- ==============================================================================
-- 📊 5. CONTINUOUS AGGREGATE VIEW: HOURLY ENERGY CONSUMPTION DOWNSAMPLING
-- ==============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_hourly_summary
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS bucket,
    device_code,
    AVG(power_watts) AS avg_power_w,
    MAX(power_watts) AS max_power_w,
    AVG(temperature_c) AS avg_temp_c,
    MAX(temperature_c) AS max_temp_c,
    COUNT(*) AS total_samples,
    COUNT(*) FILTER (WHERE is_anomaly = TRUE) AS anomaly_samples
FROM iot_telemetry_ground_truth
GROUP BY bucket, device_code
WITH NO DATA;

-- Grant standard permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
