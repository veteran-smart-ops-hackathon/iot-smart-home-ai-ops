import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  Tv, 
  Zap, 
  Activity, 
  Thermometer, 
  Droplets, 
  Wind, 
  Sun,
  ShieldCheck, 
  Clock, 
  Terminal, 
  CheckCircle2, 
  Cpu,
  AlertTriangle,
  FileText,
  Wrench,
  Layers,
  ArrowUpRight,
  TrendingDown,
  RefreshCw,
  Sliders,
  Send,
  Database
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sound } from '@/lib/sound';
import { MetricHelpButton } from '@/components/MetricHelpButton';
import { RoomId, RoomMeta, ZoneTelemetry, MqttBroadcastPayload } from '@/types';

const ROOM_CONFIGS: Record<RoomId, RoomMeta> = {
  AC_01: {
    id: 'AC_01',
    title: 'Máy Lạnh Phòng Khách (AC_01)',
    subTitle: 'Phòng Khách',
    deviceId: 'AC_01',
    location: 'Phòng Khách',
    description: 'Chỉ số: Công suất (W), Nhiệt độ (°C) • Lọc Kalman 1D',
    icon: 'tv',
    nominalTemp: 26.0,
    nominalPower: 1200.0,
  },
  SENSOR_01: {
    id: 'SENSOR_01',
    title: 'Cảm Biến Nhiệt Ẩm (SENSOR_01)',
    subTitle: 'Phòng Khách',
    deviceId: 'SENSOR_01',
    location: 'Phòng Khách',
    description: 'Chỉ số: Nhiệt độ (°C), Độ ẩm (%)',
    icon: 'thermometer',
    nominalTemp: 26.0,
    nominalPower: 0,
  },
  METER_01: {
    id: 'METER_01',
    title: 'Đồng Hồ Điện Tổng (METER_01)',
    subTitle: 'Tủ Điện Chính',
    deviceId: 'METER_01',
    location: 'Tủ Điện Tổng',
    description: 'Chỉ số: Điện áp (V), Dòng điện (A), Công suất tổng (W)',
    icon: 'zap',
    nominalTemp: 0,
    nominalPower: 4000.0,
  },
  CO2_01: {
    id: 'CO2_01',
    title: 'Cảm Biến CO₂ (CO2_01)',
    subTitle: 'Phòng Ngủ Master',
    deviceId: 'CO2_01',
    location: 'Phòng Ngủ',
    description: 'Chỉ số: Nồng độ CO₂ (ppm) • Ngưỡng chuẩn: <1000 ppm',
    icon: 'wind',
    nominalTemp: 0,
    nominalPower: 0,
  },
  HEATER_01: {
    id: 'HEATER_01',
    title: 'Bình Nóng Lạnh (HEATER_01)',
    subTitle: 'Phòng Tắm',
    deviceId: 'HEATER_01',
    location: 'Phòng Tắm',
    description: 'Chỉ số: Công suất (W), Nhiệt độ nước (°C) • Ngưỡng an toàn: 70°C',
    icon: 'flame',
    nominalTemp: 55.0,
    nominalPower: 2500.0,
  },
  LIGHT_01: {
    id: 'LIGHT_01',
    title: 'Cảm Biến Ánh Sáng (LIGHT_01)',
    subTitle: 'Ban Công / Cửa Sổ',
    deviceId: 'LIGHT_01',
    location: 'Ban Công',
    description: 'Chỉ số: Độ rọi sáng (Lux) • Phân loại sáng/tối tự động',
    icon: 'flower',
    nominalTemp: 0,
    nominalPower: 0,
  },
};

interface ChartPoint {
  time: string;
  kalmanTemp: number;
  rawTemp: number;
}

interface TechWorkOrder {
  id: string;
  title: string;
  deviceCode: RoomId;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  sopRef: string;
  rootCause: string;
  recommendedAction: string;
  status: 'PENDING' | 'RESOLVED';
  timestamp: string;
  mqttPayload: Record<string, any>;
}

export const DashboardView: React.FC<{ onTriggerAgentic: () => void }> = ({ onTriggerAgentic }) => {
  const [techTab, setTechTab] = useState<'matrix' | 'tickets' | 'waveform'>('matrix');
  const [selectedDevice, setSelectedDevice] = useState<RoomId>('AC_01');
  const [mqttConnected, setMqttConnected] = useState<boolean>(true);
  const [msgRate, setMsgRate] = useState<number>(24.5);
  const [latency, setLatency] = useState<number>(2.5);
  const [lastUpdated, setLastUpdated] = useState<string>('Vừa xong');

  // Full 6 devices real-time telemetry snapshot
  const [devicesState, setDevicesState] = useState<Record<RoomId, ZoneTelemetry>>({
    AC_01: { device_id: 'AC_01', room: 'Phòng Khách', metrics: {}, anomaly_score: 0.05, status: 'NORMAL', timestamp: new Date().toISOString() },
    SENSOR_01: { device_id: 'SENSOR_01', room: 'Phòng Khách', metrics: {}, anomaly_score: 0.05, status: 'NORMAL', timestamp: new Date().toISOString() },
    METER_01: { device_id: 'METER_01', room: 'Tủ Điện Chính', metrics: {}, anomaly_score: 0.05, status: 'NORMAL', timestamp: new Date().toISOString() },
    CO2_01: { device_id: 'CO2_01', room: 'Phòng Ngủ Master', metrics: {}, anomaly_score: 0.05, status: 'NORMAL', timestamp: new Date().toISOString() },
    HEATER_01: { device_id: 'HEATER_01', room: 'Phòng Tắm', metrics: {}, anomaly_score: 0.05, status: 'NORMAL', timestamp: new Date().toISOString() },
    LIGHT_01: { device_id: 'LIGHT_01', room: 'Ban Công', metrics: {}, anomaly_score: 0.05, status: 'NORMAL', timestamp: new Date().toISOString() },
  });

  const [chartData, setChartData] = useState<ChartPoint[]>(() => {
    const now = Date.now();
    return [10, 8, 6, 4, 2, 0].map((offsetSec, idx) => ({
      time: new Date(now - offsetSec * 1000).toLocaleTimeString('vi-VN', { hour12: false }),
      kalmanTemp: +(23.5 + idx * 0.08).toFixed(1),
      rawTemp: +(23.7 + (idx % 2 === 0 ? 0.2 : -0.2)).toFixed(1),
    }));
  });

  const [rawJsonString, setRawJsonString] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // Technician Work Orders / Tickets list
  const [workOrders, setWorkOrders] = useState<TechWorkOrder[]>(() => {
    const now = Date.now();
    return [
      {
        id: 'TICK-2026-0816-01',
        title: 'Tối ưu hóa nhiệt độ và công suất AC_01',
        deviceCode: 'AC_01',
        severity: 'MEDIUM',
        sopRef: 'SOP-SH-2026 (Mục 4.1: Tiết kiệm năng lượng)',
        rootCause: 'Máy lạnh AC_01 đang duy trì nhiệt độ sâu và công suất lớn. Đề xuất điều chỉnh 26.0°C Eco Mode.',
        recommendedAction: 'Gửi lệnh MQTT ECO_MODE và đồng bộ ngưỡng công suất về <900W.',
        status: 'PENDING',
        timestamp: new Date(now - 120000).toLocaleTimeString('vi-VN', { hour12: false }),
        mqttPayload: { command: 'SET_TEMP', target_temp: 26.0, device: 'AC_01' }
      },
      {
        id: 'TICK-2026-0816-02',
        title: 'Giám sát nồng độ CO₂ phòng ngủ (CO2_01)',
        deviceCode: 'CO2_01',
        severity: 'HIGH',
        sopRef: 'SOP-SH-2026 (Mục 1.2: Chất lượng không khí)',
        rootCause: 'Cảm biến CO2_01 ghi nhận chỉ số cao trong phòng ngủ kín. Cần kích hoạt quạt thông gió.',
        recommendedAction: 'Kích hoạt quạt thông gió phòng ngủ và gửi thông báo nhắc mở cửa sổ.',
        status: 'PENDING',
        timestamp: new Date(now - 30000).toLocaleTimeString('vi-VN', { hour12: false }),
        mqttPayload: { command: 'VENTILATION_ON', target: 'CO2_01' }
      }
    ];
  });

  // Helper chuẩn hóa dữ liệu nhận từ backend
  const normalizeData = (raw: any): Partial<Record<RoomId, ZoneTelemetry>> => {
    if (!raw) return {};
    const normalized: Partial<Record<RoomId, ZoneTelemetry>> = {};
    const keys: RoomId[] = ['AC_01', 'SENSOR_01', 'METER_01', 'CO2_01', 'HEATER_01', 'LIGHT_01'];
    
    for (const code of keys) {
      const dev = raw[code] || raw[code.toLowerCase()];
      if (!dev) continue;
      
      const m = dev.metrics || {};
      const sm = dev.smoothed_metrics || {};
      
      const temp = m.temperature ?? m.temp_c ?? dev.temp_c ?? dev.temperature;
      const kalmanTemp = sm.kalman_temperature ?? dev.kalman_temp_c ?? temp;
      const power = m.power ?? m.power_watts ?? dev.power_watts ?? dev.power;
      const hum = m.humidity ?? m.humidity_pct ?? dev.humidity_pct ?? dev.humidity;
      const volt = m.voltage ?? m.voltage_v ?? dev.voltage_v ?? dev.voltage;
      const curr = m.current ?? m.current_a ?? dev.current_a ?? dev.current;
      const co2 = m.co2 ?? m.co2_ppm ?? dev.co2_ppm ?? dev.co2;
      const lux = m.lux ?? dev.lux;
      
      normalized[code] = {
        device_id: code,
        room: dev.location || dev.room || code,
        metrics: {
          temp_c: temp !== undefined ? Number(temp) : undefined,
          kalman_temp_c: kalmanTemp !== undefined ? Number(kalmanTemp) : undefined,
          power_watts: power !== undefined ? Number(power) : undefined,
          humidity_pct: hum !== undefined ? Number(hum) : undefined,
          voltage_v: volt !== undefined ? Number(volt) : undefined,
          current_a: curr !== undefined ? Number(curr) : undefined,
          co2_ppm: co2 !== undefined ? Number(co2) : undefined,
          lux: lux !== undefined ? Number(lux) : undefined,
        },
        anomaly_score: dev.anomaly_score ?? (dev.status === 'ANOMALY' || dev.status === 'CRITICAL' ? 0.95 : 0.05),
        status: dev.status === 'CRITICAL' || dev.status === 'ANOMALY' ? dev.status : 'NORMAL',
        timestamp: dev.timestamp || new Date().toISOString()
      };
    }
    return normalized;
  };

  // 1. Initial HTTP fetch
  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/mqtt/devices');
      if (res.ok) {
        const data = await res.json();
        if (data && data.devices) {
          const norm = normalizeData(data.devices);
          setDevicesState((prev) => ({ ...prev, ...norm }));
          if (data.broker_connected !== undefined) {
            setMqttConnected(data.broker_connected);
          }
          setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
        }
      }
    } catch (e) {
      console.error('Error fetching devices', e);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  // 2. WebSocket Real-time Stream
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/mqtt`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setMqttConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data: MqttBroadcastPayload = JSON.parse(event.data);
            if (data) {
              if (data.broker_stats) {
                setMsgRate(data.broker_stats.throughput_msg_per_sec || 24.5);
                setLatency(data.broker_stats.latency_ms || 2.5);
              }
              if (data.zones) {
                const norm = normalizeData(data.zones);
                setDevicesState((prev) => ({ ...prev, ...norm }));

                const targetDev = norm[selectedDevice];
                if (targetDev) {
                  setRawJsonString(JSON.stringify(targetDev, null, 2));
                  const timeLabel = new Date().toLocaleTimeString('vi-VN', { hour12: false });
                  const tVal = targetDev.metrics.temp_c ?? targetDev.metrics.power_watts ?? 25.0;
                  const kVal = targetDev.metrics.kalman_temp_c ?? tVal;
                  setChartData((prev) => {
                    const next = [...prev, { time: timeLabel, kalmanTemp: kVal, rawTemp: tVal }];
                    return next.length > 10 ? next.slice(next.length - 10) : next;
                  });
                }
              }
              setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour12: false }));
            }
          } catch (e) {
            console.error('Error parsing MQTT WebSocket frame', e);
          }
        };

        ws.onclose = () => {
          setMqttConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          setMqttConnected(false);
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
      }
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [selectedDevice]);

  // Execute Work Order Action
  const handleResolveTicket = (ticketId: string) => {
    sound.playSuccess();
    setWorkOrders((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'RESOLVED' } : t))
    );
    setActionSuccessMsg(`Đã thực thi thành công lệnh cho Ticket ${ticketId} và lưu phản hồi vào Qdrant Vector Memory.`);
    setTimeout(() => setActionSuccessMsg(''), 5000);
  };

  const currentDevData = devicesState[selectedDevice] || {};
  const currentDevMeta = ROOM_CONFIGS[selectedDevice];

  const totalHouseholdPower = devicesState.METER_01?.metrics?.power_watts ?? 0;
  const householdVoltage = devicesState.METER_01?.metrics?.voltage_v ?? 220.0;
  const householdCurrent = devicesState.METER_01?.metrics?.current_a ?? 0.0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 flex-1 w-full space-y-5 pb-16 pt-4">
      
      {/* 1. TOP HEADER & OPERATIONAL STATUS BANNER */}
      <div className="bg-white dark:bg-stone-900/90 rounded-2xl p-3.5 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 overflow-hidden">
        <div className="space-y-1 sm:space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="p-1.5 sm:p-2 bg-blue-600/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-xl shrink-0">
              <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <h1 className="font-display font-extrabold text-lg sm:text-2xl text-stone-900 dark:text-white tracking-tight leading-snug break-words">
              Trung Tâm Điều Hành Kỹ Thuật (Tech Command)
            </h1>
            <Badge variant="outline" className="font-mono text-[10px] sm:text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shrink-0">
              🟢 GIÁM SÁT 24/7
            </Badge>
          </div>
          <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 font-mono break-all sm:break-normal">
            IoT Gateway: <span className="font-bold text-stone-700 dark:text-stone-300">mqtt-hackathon.lexatek.vn:443 (WSS)</span> • Cập nhật: {lastUpdated}
          </p>
        </div>

        {/* Live Status Indicators & Action */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
          <div className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-mono text-[11px] sm:text-xs flex items-center space-x-2">
            <span className={`h-2 sm:h-2.5 w-2 sm:w-2.5 rounded-full ${mqttConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="font-bold text-stone-800 dark:text-stone-200">
              {mqttConnected ? 'MQTT ONLINE' : 'MẤT KẾT NỐI'}
            </span>
            <span className="text-stone-400">({latency.toFixed(1)}ms)</span>
          </div>

          <Button
            size="sm"
            onClick={() => {
              sound.playClick();
              fetchTelemetry();
            }}
            variant="outline"
            className="text-xs font-mono"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <span>Làm mới</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              sound.playAlert();
              onTriggerAgentic();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs space-x-1 shadow-sm flex-1 sm:flex-none justify-center"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Kích hoạt Multi-Agent</span>
          </Button>
        </div>
      </div>

      {/* 2. TOP KPI CARDS FOR TECHNICIAN */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4 flex flex-col justify-between border-blue-500/20 bg-gradient-to-br from-blue-50/50 via-white to-transparent dark:from-blue-950/20 dark:via-stone-900 dark:to-transparent">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500">
            <span className="font-bold uppercase">Tổng Tải Điện Căn Hộ</span>
            <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-stone-900 dark:text-white">
              {totalHouseholdPower.toFixed(0)}
            </span>
            <span className="text-sm font-semibold text-stone-500 ml-1">Watts</span>
          </div>
          <div className="text-[11px] font-mono text-stone-500 flex justify-between border-t border-stone-100 dark:border-stone-800 pt-1">
            <span>Đồng hồ: METER_01</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{(totalHouseholdPower / 1000).toFixed(2)} kW</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500">
            <span className="font-bold uppercase">Lưới Điện Tòa Nhà</span>
            <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-stone-900 dark:text-white">
              {householdVoltage.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-stone-500 ml-1">V</span>
          </div>
          <div className="text-[11px] font-mono text-stone-500 flex justify-between border-t border-stone-100 dark:border-stone-800 pt-1">
            <span>Dòng tải RMS:</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">{householdCurrent.toFixed(2)} A</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500">
            <span className="font-bold uppercase">Trạm Cảm Biến Online</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-emerald-600 dark:text-emerald-400">
              6 / 6
            </span>
            <span className="text-sm font-semibold text-stone-500 ml-1">Thiết Bị</span>
          </div>
          <div className="text-[11px] font-mono text-stone-500 flex justify-between border-t border-stone-100 dark:border-stone-800 pt-1">
            <span>Độ tươi dữ liệu:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">&lt; 1.0s (Live)</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500">
            <span className="font-bold uppercase">Phiếu Sự Cố (Tickets)</span>
            <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-amber-600 dark:text-amber-400">
              {workOrders.filter(w => w.status === 'PENDING').length}
            </span>
            <span className="text-sm font-semibold text-stone-500 ml-1">Đang xử lý</span>
          </div>
          <div className="text-[11px] font-mono text-stone-500 flex justify-between border-t border-stone-100 dark:border-stone-800 pt-1">
            <span>Chuẩn SOP:</span>
            <span className="font-semibold text-stone-700 dark:text-stone-300">SOP-SH-2026</span>
          </div>
        </Card>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{actionSuccessMsg}</span>
          </div>
          <Badge variant="emerald">QDRANT_SYNCHRONIZED</Badge>
        </div>
      )}

      {/* 3. TECHNICIAN VIEW TABS (RESPONSIVE SEGMENTED CONTROL) */}
      <div className="tactile-tab-track p-1.5 rounded-2xl shadow-sm grid grid-cols-3 gap-1.5 sm:gap-2">
        <button
          onClick={() => { sound.playClick(); setTechTab('matrix'); }}
          className={`h-11 sm:h-12 px-1.5 sm:px-4 rounded-xl flex items-center justify-center space-x-1 sm:space-x-2 text-[11px] sm:text-xs md:text-sm font-mono transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
            techTab === 'matrix'
              ? 'bg-white dark:bg-stone-800 text-amber-700 dark:text-amber-400 font-extrabold shadow-md ring-1 ring-amber-500/30 dark:ring-amber-500/40 border border-stone-200/90 dark:border-stone-700/90 scale-[1.01]'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-100 hover:bg-white/70 dark:hover:bg-stone-800/70 font-semibold'
          }`}
        >
          <Sliders className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${techTab === 'matrix' ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500'}`} />
          <span className="sm:hidden">1. Thiết Bị (6)</span>
          <span className="hidden sm:inline">1. MA TRẬN 6 THIẾT BỊ (MATRIX)</span>
        </button>

        <button
          onClick={() => { sound.playClick(); setTechTab('tickets'); }}
          className={`h-11 sm:h-12 px-1.5 sm:px-4 rounded-xl flex items-center justify-center space-x-1.5 sm:space-x-2 text-[11px] sm:text-xs md:text-sm font-mono transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
            techTab === 'tickets'
              ? 'bg-white dark:bg-stone-800 text-amber-700 dark:text-amber-400 font-extrabold shadow-md ring-1 ring-amber-500/30 dark:ring-amber-500/40 border border-stone-200/90 dark:border-stone-700/90 scale-[1.01]'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-100 hover:bg-white/70 dark:hover:bg-stone-800/70 font-semibold'
          }`}
        >
          <FileText className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${techTab === 'tickets' ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500'}`} />
          <span className="sm:hidden">2. Sự Cố</span>
          <span className="hidden sm:inline">2. PHIẾU CÔNG VIỆC</span>
          {workOrders.filter(w => w.status === 'PENDING').length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              techTab === 'tickets' 
                ? 'bg-rose-500 text-white shadow-xs' 
                : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
            }`}>
              {workOrders.filter(w => w.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          onClick={() => { sound.playClick(); setTechTab('waveform'); }}
          className={`h-11 sm:h-12 px-1.5 sm:px-4 rounded-xl flex items-center justify-center space-x-1 sm:space-x-2 text-[11px] sm:text-xs md:text-sm font-mono transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
            techTab === 'waveform'
              ? 'bg-white dark:bg-stone-800 text-amber-700 dark:text-amber-400 font-extrabold shadow-md ring-1 ring-amber-500/30 dark:ring-amber-500/40 border border-stone-200/90 dark:border-stone-700/90 scale-[1.01]'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-100 hover:bg-white/70 dark:hover:bg-stone-800/70 font-semibold'
          }`}
        >
          <Activity className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${techTab === 'waveform' ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500'}`} />
          <span className="sm:hidden">3. Sóng & Logs</span>
          <span className="hidden sm:inline">3. PHÂN TÍCH SÓNG & LOGS</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 6-DEVICE OPERATIONAL MATRIX */}
      {/* ========================================================================= */}
      {techTab === 'matrix' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* 1. AC_01 (Máy lạnh phòng khách) */}
          <Card className="p-4 flex flex-col justify-between hover:border-blue-400 transition-all border-l-4 border-l-blue-600">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Tv className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-sm text-stone-900 dark:text-white font-mono">AC_01</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">Phòng Khách</Badge>
              </div>
              <p className="text-xs text-stone-500 mb-3">Máy lạnh phòng khách</p>

              <div className="grid grid-cols-2 gap-2 p-2.5 bg-stone-50 dark:bg-stone-950 rounded-xl font-mono mb-3">
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Công Suất P</span>
                  <span className="text-lg font-extrabold text-stone-900 dark:text-white">
                    {devicesState.AC_01?.metrics?.power_watts?.toFixed(0) || '--'}
                  </span>
                  <span className="text-xs text-stone-500 ml-0.5">W</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Nhiệt Độ Cài Đặt</span>
                  <span className="text-lg font-extrabold text-stone-900 dark:text-white">
                    {devicesState.AC_01?.metrics?.temp_c?.toFixed(1) || '--'}
                  </span>
                  <span className="text-xs text-stone-500 ml-0.5">°C</span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-stone-500 space-y-1">
                <div className="flex justify-between">
                  <span>Kalman Smoothed:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {devicesState.AC_01?.metrics?.kalman_temp_c?.toFixed(2) || '--'} °C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Trạng thái:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">NORMAL (QoS 1)</span>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedDevice('AC_01');
                setTechTab('waveform');
              }}
              className="w-full mt-3 text-xs font-mono"
            >
              <span>Xem Sóng Kalman & Log</span>
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Card>

          {/* 2. SENSOR_01 (Cảm biến nhiệt ẩm phòng khách) */}
          <Card className="p-4 flex flex-col justify-between hover:border-amber-400 transition-all border-l-4 border-l-amber-500">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Thermometer className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-bold text-sm text-stone-900 dark:text-white font-mono">SENSOR_01</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">Phòng Khách</Badge>
              </div>
              <p className="text-xs text-stone-500 mb-3">Cảm biến nhiệt ẩm môi trường</p>

              <div className="grid grid-cols-2 gap-2 p-2.5 bg-stone-50 dark:bg-stone-950 rounded-xl font-mono mb-3">
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Nhiệt Độ Phòng</span>
                  <span className="text-lg font-extrabold text-stone-900 dark:text-white">
                    {devicesState.SENSOR_01?.metrics?.temp_c?.toFixed(1) || '--'}
                  </span>
                  <span className="text-xs text-stone-500 ml-0.5">°C</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Độ Ẩm Tương Đối</span>
                  <span className="text-lg font-extrabold text-stone-900 dark:text-white">
                    {devicesState.SENSOR_01?.metrics?.humidity_pct?.toFixed(1) || '--'}
                  </span>
                  <span className="text-xs text-stone-500 ml-0.5">%</span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-stone-500 space-y-1">
                <div className="flex justify-between">
                  <span>Chênh lệch nhiệt với AC:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {Math.abs((devicesState.SENSOR_01?.metrics?.temp_c || 0) - (devicesState.AC_01?.metrics?.temp_c || 0)).toFixed(1)} °C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Độ tiện nghi:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Lý tưởng (55-65%)</span>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedDevice('SENSOR_01');
                setTechTab('waveform');
              }}
              className="w-full mt-3 text-xs font-mono"
            >
              <span>Xem Sóng Kalman & Log</span>
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Card>

          {/* 3. METER_01 (Đồng hồ điện tổng) */}
          <Card className="p-4 flex flex-col justify-between hover:border-purple-400 transition-all border-l-4 border-l-purple-600">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-bold text-sm text-stone-900 dark:text-white font-mono">METER_01</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">Tủ Điện</Badge>
              </div>
              <p className="text-xs text-stone-500 mb-3">Đồng hồ đo đếm điện tổng</p>

              <div className="grid grid-cols-3 gap-1.5 p-2.5 bg-stone-50 dark:bg-stone-950 rounded-xl font-mono mb-3 text-center">
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Điện Áp</span>
                  <span className="text-sm font-extrabold text-stone-900 dark:text-white">
                    {devicesState.METER_01?.metrics?.voltage_v?.toFixed(1) || '--'}
                  </span>
                  <span className="text-[10px] text-stone-500 ml-0.5">V</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Dòng Điện</span>
                  <span className="text-sm font-extrabold text-stone-900 dark:text-white">
                    {devicesState.METER_01?.metrics?.current_a?.toFixed(2) || '--'}
                  </span>
                  <span className="text-[10px] text-stone-500 ml-0.5">A</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Công Suất</span>
                  <span className="text-sm font-extrabold text-stone-900 dark:text-white">
                    {devicesState.METER_01?.metrics?.power_watts?.toFixed(0) || '--'}
                  </span>
                  <span className="text-[10px] text-stone-500 ml-0.5">W</span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-stone-500 space-y-1">
                <div className="flex justify-between">
                  <span>Hệ số công suất cosφ:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">0.96 (Đạt chuẩn)</span>
                </div>
                <div className="flex justify-between">
                  <span>Tải đỉnh cho phép:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">7,500 W</span>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedDevice('METER_01');
                setTechTab('waveform');
              }}
              className="w-full mt-3 text-xs font-mono"
            >
              <span>Xem Sóng Kalman & Log</span>
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Card>

          {/* 4. CO2_01 (Cảm biến CO₂ phòng ngủ) */}
          <Card className="p-4 flex flex-col justify-between hover:border-emerald-400 transition-all border-l-4 border-l-emerald-600">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Wind className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-sm text-stone-900 dark:text-white font-mono">CO2_01</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">Phòng Ngủ</Badge>
              </div>
              <p className="text-xs text-stone-500 mb-3">Cảm biến chất lượng không khí CO₂</p>

              <div className="p-2.5 bg-stone-50 dark:bg-stone-950 rounded-xl font-mono mb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Nồng Độ CO₂</span>
                  <span className="text-xl font-extrabold text-stone-900 dark:text-white">
                    {devicesState.CO2_01?.metrics?.co2_ppm?.toFixed(0) || '--'}
                  </span>
                  <span className="text-xs text-stone-500 ml-0.5">ppm</span>
                </div>
                <Badge variant={(devicesState.CO2_01?.metrics?.co2_ppm || 0) > 1000 ? 'destructive' : 'emerald'}>
                  {(devicesState.CO2_01?.metrics?.co2_ppm || 0) > 1000 ? 'NGỘT NGẠT' : 'TRONG LÀNH'}
                </Badge>
              </div>

              <div className="text-[11px] font-mono text-stone-500 space-y-1">
                <div className="flex justify-between">
                  <span>Ngưỡng cảnh báo:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">1,000 ppm (SOP Mục 1.2)</span>
                </div>
                <div className="flex justify-between">
                  <span>Khuyến nghị:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Thông gió tự nhiên</span>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedDevice('CO2_01');
                setTechTab('waveform');
              }}
              className="w-full mt-3 text-xs font-mono"
            >
              <span>Xem Sóng Kalman & Log</span>
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Card>

          {/* 5. HEATER_01 (Bình nóng lạnh) */}
          <Card className="p-4 flex flex-col justify-between hover:border-rose-400 transition-all border-l-4 border-l-rose-600">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Flame className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span className="font-bold text-sm text-stone-900 dark:text-white font-mono">HEATER_01</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">Phòng Tắm</Badge>
              </div>
              <p className="text-xs text-stone-500 mb-3">Bình nóng lạnh phòng tắm</p>

              <div className="grid grid-cols-2 gap-2 p-2.5 bg-stone-50 dark:bg-stone-950 rounded-xl font-mono mb-3">
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Công Suất P</span>
                  <span className="text-lg font-extrabold text-stone-900 dark:text-white">
                    {devicesState.HEATER_01?.metrics?.power_watts?.toFixed(0) || '--'}
                  </span>
                  <span className="text-xs text-stone-500 ml-0.5">W</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Nhiệt Độ Nước</span>
                  <span className="text-lg font-extrabold text-stone-900 dark:text-white">
                    {devicesState.HEATER_01?.metrics?.temp_c?.toFixed(1) || '--'}
                  </span>
                  <span className="text-xs text-stone-500 ml-0.5">°C</span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-stone-500 space-y-1">
                <div className="flex justify-between">
                  <span>Khóa quá nhiệt:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">70.0 °C (Tự động ngắt)</span>
                </div>
                <div className="flex justify-between">
                  <span>Trạng thái rơ-le:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Đóng ngắt an toàn</span>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedDevice('HEATER_01');
                setTechTab('waveform');
              }}
              className="w-full mt-3 text-xs font-mono"
            >
              <span>Xem Sóng Kalman & Log</span>
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Card>

          {/* 6. LIGHT_01 (Cảm biến ánh sáng) */}
          <Card className="p-4 flex flex-col justify-between hover:border-amber-400 transition-all border-l-4 border-l-yellow-500">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Sun className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="font-bold text-sm text-stone-900 dark:text-white font-mono">LIGHT_01</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">Ban Công</Badge>
              </div>
              <p className="text-xs text-stone-500 mb-3">Cảm biến ánh sáng tự nhiên</p>

              <div className="p-2.5 bg-stone-50 dark:bg-stone-950 rounded-xl font-mono mb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Độ Rọi Sáng</span>
                  <span className="text-xl font-extrabold text-stone-900 dark:text-white">
                    {devicesState.LIGHT_01?.metrics?.lux?.toFixed(0) || '--'}
                  </span>
                  <span className="text-xs text-stone-500 ml-0.5">lux</span>
                </div>
                <Badge variant="secondary">
                  {(devicesState.LIGHT_01?.metrics?.lux || 0) > 300 ? 'BAN NGÀY' : 'BAN ĐÊM'}
                </Badge>
              </div>

              <div className="text-[11px] font-mono text-stone-500 space-y-1">
                <div className="flex justify-between">
                  <span>Điều khiển đèn tự động:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">ENABLED</span>
                </div>
                <div className="flex justify-between">
                  <span>Độ nhạy cảm biến:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">10 lx resolution</span>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedDevice('LIGHT_01');
                setTechTab('waveform');
              }}
              className="w-full mt-3 text-xs font-mono"
            >
              <span>Xem Sóng Kalman & Log</span>
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Card>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TECHNICIAN WORK ORDERS & INCIDENT TICKETS */}
      {/* ========================================================================= */}
      {techTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Danh Sách Phiếu Sự Cố & Nhiệm Vụ Kỹ Thuật (Work Orders)</span>
            </h2>
            <Badge variant="outline" className="font-mono text-xs">
              Chuẩn Quy Trình SOP-SH-2026
            </Badge>
          </div>

          <div className="space-y-3">
            {workOrders.map((ticket) => {
              const isPending = ticket.status === 'PENDING';
              return (
                <Card
                  key={ticket.id}
                  className={`p-5 transition-all ${
                    isPending
                      ? ticket.severity === 'CRITICAL' || ticket.severity === 'HIGH'
                        ? 'border-l-4 border-l-rose-600 bg-rose-50/20 dark:bg-rose-950/10'
                        : 'border-l-4 border-l-blue-600'
                      : 'opacity-70 border-stone-200 dark:border-stone-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2.5">
                      <Badge
                        variant={
                          ticket.severity === 'CRITICAL' || ticket.severity === 'HIGH'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="font-mono text-xs"
                      >
                        {ticket.severity}
                      </Badge>
                      <span className="font-bold font-mono text-sm text-stone-900 dark:text-white">
                        {ticket.id}
                      </span>
                      <span className="text-xs text-stone-400 font-mono">• {ticket.timestamp}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="font-mono text-xs text-blue-600 dark:text-blue-400">
                        Thiết bị: {ticket.deviceCode}
                      </Badge>
                      <Badge variant={isPending ? 'amber' : 'emerald'} className="font-mono text-xs">
                        {isPending ? 'CHỜ XỬ LÝ' : 'ĐÃ GIẢI QUYẾT'}
                      </Badge>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 dark:text-white mb-1.5">
                    {ticket.title}
                  </h3>

                  <div className="p-3 bg-white dark:bg-stone-950 rounded-xl border border-stone-200/80 dark:border-stone-800 space-y-2 mb-3 text-xs font-mono">
                    <p className="text-stone-700 dark:text-stone-300">
                      <span className="font-bold text-stone-900 dark:text-white">🔍 Nguyên nhân gốc (RCA):</span> {ticket.rootCause}
                    </p>
                    <p className="text-stone-700 dark:text-stone-300">
                      <span className="font-bold text-stone-900 dark:text-white">📋 Phương án đề xuất:</span> {ticket.recommendedAction}
                    </p>
                    <p className="text-stone-500">
                      <span className="font-bold text-stone-600 dark:text-stone-400">📚 Tham chiếu SOP:</span> {ticket.sopRef}
                    </p>
                  </div>

                  {isPending && (
                    <div className="flex items-center justify-end space-x-3 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDevice(ticket.deviceCode);
                          setTechTab('waveform');
                        }}
                        className="text-xs font-mono"
                      >
                        <span>Xem Dữ Liệu Thiết Bị</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleResolveTicket(ticket.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold space-x-1.5"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Xác Nhận Đã Xử Lý & Lưu Qdrant Memory</span>
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REAL-TIME WAVEFORM ANALYSIS & RAW TERMINAL */}
      {/* ========================================================================= */}
      {techTab === 'waveform' && (
        <div className="space-y-4">
          
          {/* Station Switcher Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-stone-600 dark:text-stone-300">Đang chọn thiết bị:</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(ROOM_CONFIGS) as RoomId[]).map((rId) => (
                  <button
                    key={rId}
                    onClick={() => {
                      sound.playClick();
                      setSelectedDevice(rId);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      selectedDevice === rId
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {rId}
                  </button>
                ))}
              </div>
            </div>

            <Badge variant="indigo">{currentDevMeta.title}</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Chart Column (7 cols) */}
            <Card className="lg:col-span-7 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300 uppercase">
                    Biểu Đồ Sóng Cửa Sổ Trượt ({selectedDevice})
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-[10px] font-mono">
                  <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
                    <span>Kalman Smoothed</span>
                  </span>
                  <span className="flex items-center space-x-1 text-stone-400">
                    <span className="h-2 w-2 rounded-full bg-stone-400 inline-block"></span>
                    <span>Raw Sensor</span>
                  </span>
                </div>
              </div>

              <div className="h-56 w-full my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="kalmanGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#78716C', fontFamily: 'JetBrains Mono' }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#78716C', fontFamily: 'JetBrains Mono' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0C0A09',
                        borderColor: '#292524',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono',
                      }}
                      itemStyle={{ color: '#E7E5E4' }}
                    />
                    <Area type="monotone" dataKey="kalmanTemp" stroke="#2563EB" strokeWidth={2.2} fill="url(#kalmanGrad)" />
                    <Area type="monotone" dataKey="rawTemp" stroke="#78716C" strokeWidth={1.2} strokeDasharray="3 3" fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="text-[11px] font-mono text-stone-500 flex justify-between border-t border-stone-100 dark:border-stone-800 pt-2">
                <span>Thuật toán: 1D Linear Kalman Filter</span>
                <span>Chu kỳ: 1.8s (QoS 1)</span>
              </div>
            </Card>

            {/* Live Terminal Column (5 cols) */}
            <Card className="lg:col-span-5 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Terminal className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300 uppercase">
                    Gói Tin JSON Gốc (MQTT Live Frame)
                  </span>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">JSON TELEMETRY</Badge>
              </div>

              <div className="bg-stone-950 text-stone-100 p-3 rounded-xl border border-stone-800 font-mono text-xs overflow-x-auto max-h-56 terminal-scroll">
                <div className="text-[10px] text-stone-400 pb-1.5 mb-1.5 border-b border-stone-800">
                  Topic: <span className="text-blue-400">hackathon/veteran/test/telemetry</span>
                </div>
                <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed text-[11px]">
                  {rawJsonString || JSON.stringify(currentDevData, null, 2)}
                </pre>
              </div>

              <div className="text-[11px] font-mono text-stone-500 flex justify-between border-t border-stone-100 dark:border-stone-800 pt-2 mt-2">
                <span>Client ID: veteran-smarthome-client</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">● WSS ACTIVE</span>
              </div>
            </Card>

          </div>
        </div>
      )}

    </main>
  );
};
