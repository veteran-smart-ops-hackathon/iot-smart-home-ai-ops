import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  Tv, 
  Flame, 
  Wind, 
  Sun, 
  Zap, 
  Thermometer, 
  Droplets, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Send, 
  Sparkles, 
  Mail, 
  Clock, 
  TrendingDown, 
  Moon, 
  Smile, 
  UserCheck, 
  UserX, 
  Activity,
  ArrowRight,
  RefreshCw,
  BellRing,
  Info,
  Layers,
  ChevronRight,
  Eye,
  Sliders,
  Check,
  Volume2,
  VolumeX,
  MessageSquare,
  BarChart3,
  X,
  Database,
  CheckCheck,
  AlertCircle,
  History,
  Plus,
  MessageSquarePlus,
  Trash2,
  PanelLeft,
  PanelLeftClose,
  Search,
  ThumbsUp,
  ThumbsDown,
  Copy,
  SquarePen,
  Settings
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { sound } from '@/lib/sound';
import { useAuth } from '@/context/AuthContext';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { 
  RoomId, 
  ZoneTelemetry, 
  MqttBroadcastPayload, 
  HomeownerChatMessage, 
  HomeownerActionProposal,
  QuickSceneId 
} from '@/types';

interface HomeownerViewProps {
  onSwitchToTechView?: () => void;
}

interface NotificationItem {
  notification_id: string;
  incident_id: string;
  recipient_email: string;
  subject: string;
  status: string;
  delivery_mode: string;
  severity: string;
  timestamp: string;
  dashboard_url?: string;
  html_preview?: string;
  error_message?: string;
}

interface PriorityProposal extends HomeownerActionProposal {
  priorityRank: number; // 1 (Highest/Critical) -> 4 (Low)
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  incidentId?: string;
}

export const HomeownerView: React.FC<HomeownerViewProps> = ({ onSwitchToTechView }) => {
  const { user, switchRole } = useAuth();

  // Sub-view Tab: 'overview' (Không gian & Thiết bị) vs 'assistant' (Trợ lý ảo AI gia đình)
  const [subTab, setSubTab] = useState<'overview' | 'assistant'>('overview');

  // WebSocket & Live Telemetry State for 6 Track A devices
  const [telemetry, setTelemetry] = useState<Record<RoomId, ZoneTelemetry>>({
    AC_01: {
      device_id: 'AC_01',
      room: 'Phòng Khách',
      metrics: {},
      anomaly_score: 0.05,
      status: 'NORMAL',
      timestamp: new Date().toISOString()
    },
    SENSOR_01: {
      device_id: 'SENSOR_01',
      room: 'Phòng Khách',
      metrics: {},
      anomaly_score: 0.05,
      status: 'NORMAL',
      timestamp: new Date().toISOString()
    },
    METER_01: {
      device_id: 'METER_01',
      room: 'Tủ Điện Chính',
      metrics: {},
      anomaly_score: 0.05,
      status: 'NORMAL',
      timestamp: new Date().toISOString()
    },
    CO2_01: {
      device_id: 'CO2_01',
      room: 'Phòng Ngủ Master',
      metrics: {},
      anomaly_score: 0.05,
      status: 'NORMAL',
      timestamp: new Date().toISOString()
    },
    HEATER_01: {
      device_id: 'HEATER_01',
      room: 'Phòng Tắm',
      metrics: {},
      anomaly_score: 0.05,
      status: 'NORMAL',
      timestamp: new Date().toISOString()
    },
    LIGHT_01: {
      device_id: 'LIGHT_01',
      room: 'Ban Công / Cửa Sổ',
      metrics: {},
      anomaly_score: 0.05,
      status: 'NORMAL',
      timestamp: new Date().toISOString()
    }
  });

  const [mqttConnected, setMqttConnected] = useState<boolean>(true);
  const [latencyMs, setLatencyMs] = useState<number>(2.5);
  const [lastUpdated, setLastUpdated] = useState<string>('Đang cập nhật...');
  
  // Smart 1-Touch Scenes State
  const [activeScene, setActiveScene] = useState<QuickSceneId>('eco');
  const [isSceneApplying, setIsSceneApplying] = useState<boolean>(false);
  const [selectedSceneForModal, setSelectedSceneForModal] = useState<QuickSceneId | null>(null);

  // Active Safety Proposals List with Priority Ordering (Human-in-the-Loop)
  const [proposals, setProposals] = useState<PriorityProposal[]>([]);

  // HITL Execution & AI Assistant Feedback Toast state
  const [feedbackToast, setFeedbackToast] = useState<{
    show: boolean;
    type: 'success' | 'info' | 'error';
    title: string;
    message: string;
    subStatus?: string;
  }>({
    show: false,
    type: 'success',
    title: '',
    message: '',
    subStatus: ''
  });

  // Multi-Session Chat History State (Quản lý đa phiên hội thoại chuẩn Gemini)
  const [sessions, setSessions] = useState<Array<{
    id: string;
    title: string;
    updatedAt: string;
    messages: HomeownerChatMessage[];
  }>>(() => {
    try {
      const saved = localStorage.getItem('veteran_homeowner_chat_sessions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'session-default',
        title: 'Lời Chào Ban Đầu Và Hỗ Trợ',
        updatedAt: 'Hôm nay',
        messages: [
          {
            id: 'msg-welcome',
            sender: 'assistant',
            text: `Xin chào Nguyễn Văn Minh Tâm! Tôi là Trợ Lý Gia Đình Thông Minh Veteran Home. Đang theo dõi và bảo vệ 6 thiết bị trong căn hộ 24/7 theo thời gian thực. Căn hộ đang an toàn và vận hành ổn định! Bạn cần tôi tối ưu điện năng, kiểm tra không khí hay kích hoạt kịch bản nào hôm nay không?`,
            timestamp: 'Vừa xong'
          }
        ]
      }
    ];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('veteran_homeowner_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed[0].id;
      }
    } catch {}
    return 'session-default';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Synchronize chat sessions from centralized backend on mount (Đồng bộ 2 chiều Laptop <-> Mobile)
  useEffect(() => {
    const syncWithBackend = async () => {
      try {
        let localSessions: any[] = [];
        try {
          const saved = localStorage.getItem('veteran_homeowner_chat_sessions');
          if (saved) localSessions = JSON.parse(saved);
        } catch {}

        const res = await fetch('/api/chat/sessions/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessions: localSessions, role: 'homeowner' })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.sessions && data.sessions.length > 0) {
            setSessions(data.sessions);
            const stillExists = data.sessions.find((s: any) => s.id === currentSessionId);
            if (!stillExists) {
              setCurrentSessionId(data.sessions[0].id);
            }
            try {
              localStorage.setItem('veteran_homeowner_chat_sessions', JSON.stringify(data.sessions));
            } catch {}
          }
        }
      } catch (err) {
        console.error('Chat sync error:', err);
      }
    };
    syncWithBackend();
  }, []);

  const syncSessionToBackend = async (sessionData: any) => {
    try {
      await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sessionData, role: 'homeowner' })
      });
    } catch {}
  };

  const deleteSessionFromBackend = async (sessionId: string) => {
    try {
      await fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
    } catch {}
  };

  const activeSession = sessions.find((s) => s.id === currentSessionId) || sessions[0] || {
    id: 'session-default',
    title: 'Lời Chào Ban Đầu Và Hỗ Trợ',
    updatedAt: 'Hôm nay',
    messages: []
  };
  const chatMessages = activeSession.messages;

  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const handleNewSession = () => {
    sound.playClick();
    const newId = `session-${Date.now()}`;
    const newSession = {
      id: newId,
      title: 'Cuộc trò chuyện mới',
      updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      messages: [
        {
          id: `msg-welcome-${Date.now()}`,
          sender: 'assistant' as const,
          text: `Xin chào Nguyễn Văn Minh Tâm! Tôi đã sẵn sàng cho một chủ đề mới. Bạn cần tôi hỗ trợ kiểm tra hoặc tối ưu thiết bị nào?`,
          timestamp: 'Vừa xong'
        }
      ]
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setCurrentSessionId(newId);
    setIsMobileDrawerOpen(false);
    try {
      localStorage.setItem('veteran_homeowner_chat_sessions', JSON.stringify(updated));
    } catch {}
    syncSessionToBackend(newSession);
  };

  const handleSelectSession = (sId: string) => {
    sound.playClick();
    setCurrentSessionId(sId);
    setIsMobileDrawerOpen(false);
  };

  const handleDeleteSession = (sId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    deleteSessionFromBackend(sId);
    if (sessions.length <= 1) {
      handleNewSession();
      return;
    }
    const updated = sessions.filter((s) => s.id !== sId);
    setSessions(updated);
    if (currentSessionId === sId) {
      setCurrentSessionId(updated[0].id);
    }
    try {
      localStorage.setItem('veteran_homeowner_chat_sessions', JSON.stringify(updated));
    } catch {}
  };

  // Homeowner Family Email Notification Settings
  const [familyEmail, setFamilyEmail] = useState<string>('');
  const [emailStatusMsg, setEmailStatusMsg] = useState<string>('');
  const [isSavingEmail, setIsSavingEmail] = useState<boolean>(false);
  const [isTestingEmail, setIsTestingEmail] = useState<boolean>(false);
  const [smtpUser, setSmtpUser] = useState<string>('');
  const [smtpPassword, setSmtpPassword] = useState<string>('');
  const [smtpConfigured, setSmtpConfigured] = useState<boolean>(false);
  const [showSmtpConfig, setShowSmtpConfig] = useState<boolean>(false);
  const [isVerifyingSmtp, setIsVerifyingSmtp] = useState<boolean>(false);
  const [smtpVerifyMsg, setSmtpVerifyMsg] = useState<{ type: 'success' | 'error'; text: string; hint?: string } | null>(null);

  // Notification Center History List
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState<boolean>(false);

  // Energy Details Modal State
  const [isEnergyModalOpen, setIsEnergyModalOpen] = useState<boolean>(false);

  // Helper chuẩn hóa dữ liệu nhận từ Backend hoặc WebSocket
  const normalizeZonesFromBackend = (raw: any): Partial<Record<RoomId, ZoneTelemetry>> => {
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

  // 1. Fetch live telemetry ngay khi mở trang
  const fetchLiveTelemetry = async () => {
    try {
      const res = await fetch('/api/mqtt/devices');
      if (res.ok) {
        const data = await res.json();
        if (data && data.devices) {
          const norm = normalizeZonesFromBackend(data.devices);
          setTelemetry((prev) => ({ ...prev, ...norm }));
          if (data.broker_connected !== undefined) {
            setMqttConnected(data.broker_connected);
          }
          setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
        }
      }
    } catch (e) {
      console.error('Error loading live devices telemetry', e);
    }
  };

  // 2. Fetch current configured email on mount
  useEffect(() => {
    fetchLiveTelemetry();
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/notifications/settings');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            if (data.recipient_emails && data.recipient_emails.length > 0) {
              setFamilyEmail(data.recipient_emails.join(', '));
            } else if (data.recipient_email) {
              setFamilyEmail(data.recipient_email);
            } else if (user.email) {
              setFamilyEmail(user.email);
            }
            if (data.smtp_configured !== undefined) {
              setSmtpConfigured(data.smtp_configured);
            }
            if (data.from_email && data.from_email.includes('@')) {
              setSmtpUser(data.from_email);
            }
          }
        }
      } catch (e) {
        console.error('Error loading notification settings', e);
        if (user.email) setFamilyEmail(user.email);
      }
    };

    fetchSettings();
    const pollTimer = setInterval(fetchLiveTelemetry, 3000);
    return () => clearInterval(pollTimer);
  }, [user.email]);

  // 3. Fetch Notification History
  const fetchNotificationHistory = async () => {
    setIsLoadingNotifications(true);
    try {
      const res = await fetch('/api/notifications/history');
      if (res.ok) {
        const data = await res.json();
        if (data && data.history) {
          setNotifications(data.history);
        }
      }
    } catch (e) {
      console.error('Error fetching notification history', e);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // 4. Fetch Active Incident from Backend
  const fetchActiveIncident = async (specificIncidentId?: string) => {
    try {
      const url = specificIncidentId
        ? `/api/active-incident?incident_id=${encodeURIComponent(specificIncidentId)}`
        : '/api/active-incident';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const incident = data.active_incident || data.incident;
        if (incident && incident.mitigation_plan) {
          const plan = incident.mitigation_plan;
          const diag = incident.diagnostic_report || {};
          const buttons = plan.action_buttons || [];
          
          // Lọc tìm nút hành động khả thi chính (không phải nút DISMISS/Bỏ qua phụ)
          const btn = buttons.find((b: any) => {
            const actionType = (b.action_type || '').toUpperCase();
            return actionType !== 'DISMISS';
          }) || buttons[0];

          if (btn) {
            const rawActionId = btn.button_id || btn.action_id || `prop-${diag.incident_id || Date.now()}`;
            const targetDev = (btn.target_devices?.[0] as RoomId) || (diag.affected_devices?.[0]?.device_id as RoomId) || 'AC_01';
            
            // Xây dựng nội dung giải thích đầy đủ và rõ ràng
            let desc = plan.explanation || plan.summary;
            if (!desc && plan.recommended_steps && plan.recommended_steps.length > 0) {
              desc = plan.recommended_steps.join('. ');
            }
            if (!desc) {
              desc = diag.root_cause_summary || 'Đề xuất can thiệp an toàn dựa trên chuẩn quy chuẩn SOP-SH-2026.';
            }

            const rawSev = (diag.overall_severity || diag.severity || 'HIGH').toUpperCase();
            const sev: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 
              rawSev === 'CRITICAL' ? 'CRITICAL' : 
              rawSev === 'LOW' ? 'LOW' : 
              rawSev === 'MEDIUM' ? 'MEDIUM' : 'HIGH';

            const newProp: PriorityProposal = {
              actionId: rawActionId,
              incidentId: diag.incident_id || 'INC-LIVE',
              title: btn.title || btn.label || plan.title || 'Đề Xuất Hành Động Khắc Phục',
              description: desc,
              targetDevice: targetDev,
              targetDeviceName: btn.title || btn.label || diag.affected_devices?.[0]?.device_type || 'Thiết bị thông minh',
              command: btn.mqtt_payload || (typeof btn.payload === 'string' ? JSON.parse(btn.payload || '{}') : (btn.payload || {})),
              mqttTopic: btn.mqtt_topic || 'iot/devices/control',
              estimatedEnergySavedWatts: plan.estimated_energy_saved_watts || 650,
              estimatedCostSavedVnd: Math.round((plan.estimated_energy_saved_watts || 650) * 2.5 * 24 * 30 / 1000 * 0.35),
              status: 'pending',
              priorityRank: sev === 'CRITICAL' ? 1 : 2,
              urgencyLevel: sev
            };

            setProposals((prev) => {
              const existingIdx = prev.findIndex((p) => 
                p.actionId === newProp.actionId || 
                (p.incidentId && p.incidentId === newProp.incidentId)
              );
              if (existingIdx >= 0) {
                // Nếu đã tồn tại và đang pending thì cập nhật nội dung mới nhất
                if (prev[existingIdx].status === 'pending') {
                  const updated = [...prev];
                  updated[existingIdx] = { ...updated[existingIdx], ...newProp };
                  return updated;
                }
                return prev;
              }
              return [newProp, ...prev.filter(p => p.status === 'pending')];
            });
          }
        }
      }
    } catch (e) {
      console.error('Error fetching active incident', e);
    }
  };

  useEffect(() => {
    let incidentIdFromUrl: string | null = null;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      incidentIdFromUrl = urlParams.get('incident_id');
      if (incidentIdFromUrl) {
        setFeedbackToast({
          show: true,
          type: 'info',
          title: 'Đã Mở Từ Email Cảnh Báo',
          message: `Đã định vị thành công phiên sự cố ${incidentIdFromUrl}. Đang hiển thị đề xuất xử lý trực tiếp để bạn phê duyệt.`,
          subStatus: 'Trợ lý AI sẵn sàng 24/7'
        });
      }
    }

    fetchNotificationHistory();
    fetchActiveIncident(incidentIdFromUrl || undefined);

    const interval = setInterval(() => {
      fetchNotificationHistory();
      fetchActiveIncident(incidentIdFromUrl || undefined);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // 5. Connect WebSocket to real-time MQTT Stream
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.port === '5173' ? 'localhost:8000' : window.location.host;
      const wsUrl = `${protocol}//${host}/ws/mqtt`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setMqttConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data: MqttBroadcastPayload = JSON.parse(event.data);
            if (data) {
              if (data.zones) {
                const norm = normalizeZonesFromBackend(data.zones);
                setTelemetry((prev) => ({ ...prev, ...norm }));
              }
              setLatencyMs(data.broker_stats?.latency_ms || 2.5);
              setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour12: false }));
            }
          } catch (e) {
            console.error('Error parsing live WS telemetry', e);
          }
        };

        ws.onclose = () => {
          setMqttConnected(false);
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          setMqttConnected(false);
        };
      } catch {
        setMqttConnected(false);
        reconnectTimeout = setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  useEffect(() => {
    if (subTab === 'assistant') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, subTab]);

  // Dynamic metrics derived directly from real live telemetry
  const acPower = telemetry.AC_01?.metrics?.power_watts ?? 0;
  const acTemp = telemetry.AC_01?.metrics?.temp_c ?? 0;
  const sensorTemp = telemetry.SENSOR_01?.metrics?.temp_c ?? 0;
  const sensorHumidity = telemetry.SENSOR_01?.metrics?.humidity_pct ?? 0;
  const totalPower = telemetry.METER_01?.metrics?.power_watts ?? (acPower + (telemetry.HEATER_01?.metrics?.power_watts ?? 0));
  const totalVolt = telemetry.METER_01?.metrics?.voltage_v ?? 220;
  const totalCurr = telemetry.METER_01?.metrics?.current_a ?? 0;
  const co2Ppm = telemetry.CO2_01?.metrics?.co2_ppm ?? 0;
  const heaterPower = telemetry.HEATER_01?.metrics?.power_watts ?? 0;
  const heaterTemp = telemetry.HEATER_01?.metrics?.temp_c ?? 0;
  const lightLux = telemetry.LIGHT_01?.metrics?.lux ?? 0;

  // Home Presence Status & Energy Bill Calculation
  const isHomeOccupied = activeScene !== 'away' && totalPower > 150.0;
  const totalKw = totalPower / 1000.0;
  const hourlyVnd = Math.round(totalKw * 2500);
  const monthlyVnd = Math.round(hourlyVnd * 24 * 30 * 0.55); // Weighted household duty cycle
  const estimatedSavingsMonthlyVnd = Math.round(monthlyVnd * 0.35); // 35% estimated monthly savings

  // Cập nhật đề xuất động dựa trên chỉ số thực tế (Đa kịch bản Track A)
  useEffect(() => {
    // Chỉ tạo đề xuất khi đã nhận được dữ liệu telemetry hợp lệ từ WebSocket
    if (totalPower > 0 && acTemp > 0) {
      if (proposals.length === 0) {
        if (co2Ppm > 950) {
          // Kịch bản 1: Cảnh báo chất lượng không khí CO2 phòng ngủ cao
          setProposals([
            {
              actionId: 'prop-dyn-co2',
              incidentId: 'INC-AIR-2026',
              title: 'Kích Hoạt Thông Gió Phòng Ngủ (CO₂ Tăng Cao)',
              description: `Cảm biến CO2_01 phòng ngủ đang ghi nhận ${co2Ppm.toFixed(0)} ppm (vượt ngưỡng thông thoáng 1000 ppm). Đề xuất bật quạt thông gió và mở hé cửa sổ.`,
              targetDevice: 'CO2_01',
              targetDeviceName: 'Cảm biến CO₂ phòng ngủ (CO2_01)',
              command: { command: 'VENTILATION_ON', targets: ['CO2_01'] },
              mqttTopic: 'iot/devices/control',
              estimatedEnergySavedWatts: 0,
              estimatedCostSavedVnd: 0,
              status: 'pending',
              priorityRank: 1,
              urgencyLevel: 'CRITICAL'
            }
          ]);
        } else if ((activeScene === 'away' || !isHomeOccupied) && (heaterPower > 200 || acPower > 100 || heaterTemp > 65)) {
          // Kịch bản 2: Vắng nhà nhưng thiết bị công suất cao vẫn bật
          setProposals([
            {
              actionId: 'prop-dyn-away-hazard',
              incidentId: 'INC-AWAY-2026',
              title: 'Cảnh Báo Vắng Nhà: Thiết Bị Vẫn Bật Tiêu Thụ Điện',
              description: `Hệ thống đang ở Chế Độ Vắng Nhà nhưng phát hiện thiết bị (${heaterPower > 200 ? 'Bình nóng lạnh' : 'Máy lạnh'}) đang hoạt động (${totalPower.toFixed(0)}W). Đề xuất ngắt nguồn khẩn cấp để đảm bảo an toàn.`,
              targetDevice: 'HEATER_01',
              targetDeviceName: 'Bình nóng lạnh & Máy lạnh gia đình',
              command: { command: 'POWER_OFF', targets: ['HEATER_01', 'AC_01'] },
              mqttTopic: 'iot/devices/control',
              estimatedEnergySavedWatts: totalPower,
              estimatedCostSavedVnd: 125000,
              status: 'pending',
              priorityRank: 1,
              urgencyLevel: 'CRITICAL'
            }
          ]);
        } else if (heaterTemp > 65 || heaterPower > 1500) {
          // Kịch bản 3: Bình nóng lạnh quá nhiệt
          setProposals([
            {
              actionId: 'prop-dyn-heater',
              incidentId: 'INC-HEATER-2026',
              title: 'Tối Ưu Ngắt Bình Nóng Lạnh Quá Nhiệt',
              description: `Bình nóng lạnh HEATER_01 đang đạt ${heaterTemp.toFixed(1)}°C (${heaterPower.toFixed(0)}W). Đề xuất ngắt nguồn tự động để đảm bảo an toàn và chống quá nhiệt.`,
              targetDevice: 'HEATER_01',
              targetDeviceName: 'Bình nóng lạnh phòng tắm (HEATER_01)',
              command: { command: 'POWER_OFF', targets: ['HEATER_01'] },
              mqttTopic: 'iot/devices/control',
              estimatedEnergySavedWatts: 2450.0,
              estimatedCostSavedVnd: 158000,
              status: 'pending',
              priorityRank: 1,
              urgencyLevel: 'CRITICAL'
            }
          ]);
        } else if (acPower > 600 || acTemp < 24.5) {
          // Kịch bản 4: Máy lạnh đang tiêu thụ cao cần tối ưu Eco
          setProposals([
            {
              actionId: 'prop-dyn-eco',
              incidentId: 'INC-ECO-2026',
              title: 'Tối Ưu Năng Lượng & Chuyển Chế Độ Eco',
              description: `Máy lạnh AC_01 đang tiêu thụ ${acPower.toFixed(0)}W (${acTemp.toFixed(1)}°C), tổng công suất nhà ${totalPower.toFixed(0)}W. Đề xuất đặt AC lên 26.0°C để tiết kiệm điện.`,
              targetDevice: 'AC_01',
              targetDeviceName: 'Máy Lạnh Phòng Khách (AC_01)',
              command: { command: 'ECO_MODE', target_temp: 26.0, targets: ['AC_01', 'HEATER_01'] },
              mqttTopic: 'iot/devices/control',
              estimatedEnergySavedWatts: 350.0,
              estimatedCostSavedVnd: 38000,
              status: 'pending',
              priorityRank: 2,
              urgencyLevel: 'HIGH'
            }
          ]);
        } else {
          // Kịch bản 5: Trạng thái bình thường duy trì Eco
          setProposals([
            {
              actionId: 'prop-dyn-smart-eco',
              incidentId: 'INC-STANDBY-2026',
              title: 'Kích Hoạt Kịch Bản Tiết Kiệm Năng Lượng (Eco Home)',
              description: `Tổng công suất tiêu thụ căn hộ hiện tại là ${totalPower.toFixed(0)}W (${acTemp.toFixed(1)}°C). Trợ lý AI đề xuất duy trì chế độ tiết kiệm năng lượng thông minh và giám sát an toàn 24/7.`,
              targetDevice: 'AC_01',
              targetDeviceName: 'Hệ thống điện thông minh (METER_01)',
              command: { command: 'ECO_MODE', target_temp: 26.0, targets: ['AC_01'] },
              mqttTopic: 'iot/devices/control',
              estimatedEnergySavedWatts: 150.0,
              estimatedCostSavedVnd: 18000,
              status: 'pending',
              priorityRank: 3,
              urgencyLevel: 'LOW'
            }
          ]);
        }
      }
    }
  }, [acPower, acTemp, totalPower, co2Ppm, heaterPower, heaterTemp, proposals.length, activeScene, isHomeOccupied]);

  // =========================================================================
  // DYNAMIC PRIORITY SCORING & ORDERING FOR ROOMS / DEVICE CARDS
  // =========================================================================
  const calculateLivingRoomPriority = () => {
    if (sensorTemp > 35 || acPower > 2500) return 100;
    if (acPower > 1000 || acTemp < 21) return 80;
    return 20;
  };

  const calculateBedroomPriority = () => {
    if (co2Ppm > 1200) return 95;
    if (co2Ppm > 850) return 75;
    return 15;
  };

  const calculateBathroomPriority = () => {
    if (heaterTemp > 65 || heaterPower > 2600) return 90; // Critical overheat
    if (heaterPower > 100) return 70; // High - Đang đun công suất lớn
    return 10; // Normal
  };

  const calculateBalconyPriority = () => {
    if (!isHomeOccupied && totalPower > 2000) return 85; // Unoccupied hazard
    return 10; // Normal
  };

  const roomCards = [
    {
      id: 'living_room',
      title: 'Phòng Khách',
      subTitle: 'Máy lạnh (AC_01) & Cảm biến (SENSOR_01)',
      icon: Tv,
      iconColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      priorityScore: calculateLivingRoomPriority(),
      priorityBadge: calculateLivingRoomPriority() >= 80 ? '⚡ ƯU TIÊN TỐI ƯU' : 'Mát mẻ dễ chịu',
      badgeClass: calculateLivingRoomPriority() >= 80 ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 font-bold' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      metrics: [
        { label: 'Nhiệt độ', value: `${sensorTemp.toFixed(1)}°C`, sub: `Đặt: ${acTemp.toFixed(1)}°C`, icon: Thermometer, color: 'text-amber-500' },
        { label: 'Độ ẩm', value: `${sensorHumidity.toFixed(1)}%`, sub: 'Tốt cho hô hấp', icon: Droplets, color: 'text-blue-500' }
      ]
    },
    {
      id: 'bedroom',
      title: 'Phòng Ngủ Master',
      subTitle: 'Chất lượng không khí (CO2_01)',
      icon: Wind,
      iconColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      priorityScore: calculateBedroomPriority(),
      priorityBadge: co2Ppm > 1000 ? '🔴 CO₂ CAO - CẦN THÔNG GIÓ' : co2Ppm > 850 ? '🟡 CHÚ Ý KHÔNG KHÍ' : 'Trong lành',
      badgeClass: co2Ppm > 1000 ? 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40 font-bold' : co2Ppm > 850 ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      metrics: [
        { label: 'Nồng độ CO₂', value: `${co2Ppm.toFixed(0)} ppm`, sub: 'Chuẩn: <1000 ppm', icon: Wind, color: 'text-indigo-500' },
        { label: 'Đánh giá ngủ', value: co2Ppm < 800 ? 'Rất sâu giấc' : 'Hơi ngột ngạt', sub: 'Giám sát 24/7', icon: Moon, color: 'text-purple-500' }
      ]
    },
    {
      id: 'bathroom',
      title: 'Phòng Tắm',
      subTitle: 'Bình nóng lạnh (HEATER_01)',
      icon: Flame,
      iconColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      priorityScore: calculateBathroomPriority(),
      priorityBadge: heaterTemp > 65 ? '🔴 QUÁ NHIỆT KHẨN CẤP' : heaterPower > 100 ? '⚡ ĐANG ĐUN TẢI CAO' : 'Sẵn sàng',
      badgeClass: heaterTemp > 65 ? 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40 font-bold' : heaterPower > 100 ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      metrics: [
        { label: 'Nước nóng', value: `${heaterTemp.toFixed(1)}°C`, sub: 'Ngưỡng an toàn: 70°C', icon: Thermometer, color: 'text-rose-500' },
        { label: 'Công suất', value: `${heaterPower.toFixed(0)} W`, sub: heaterPower > 100 ? 'Tải đun 2.45 kW' : 'Chờ tiết kiệm', icon: Zap, color: 'text-amber-500' }
      ]
    },
    {
      id: 'balcony',
      title: 'Ban Công & Hiện Diện',
      subTitle: 'Ánh sáng (LIGHT_01) & Radar hiện diện',
      icon: Sun,
      iconColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      priorityScore: calculateBalconyPriority(),
      priorityBadge: isHomeOccupied ? 'Có người ở nhà' : 'Vắng nhà',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      metrics: [
        { label: 'Độ rọi tự nhiên', value: `${lightLux.toFixed(0)} lux`, sub: 'Sáng rõ, tận dụng ánh sáng', icon: Sun, color: 'text-amber-500' },
        { label: 'Hiện diện', value: isHomeOccupied ? '🟢 Đang sinh hoạt' : '🟡 Vắng nhà', sub: 'Đồng bộ kịch bản', icon: UserCheck, color: 'text-emerald-500' }
      ]
    }
  ];

  // Sort room cards descending by priority score
  const sortedRoomCards = [...roomCards].sort((a, b) => b.priorityScore - a.priorityScore);

  // Active Pending Proposals Sorted by Priority (Rank 1 -> 4)
  const pendingProposals = proposals
    .filter((p) => p.status === 'pending')
    .sort((a, b) => a.priorityRank - b.priorityRank);

  // =========================================================================
  // HUMAN-IN-THE-LOOP (HITL) HANDLER WITH QDRANT LAYER 5 PERSISTENCE
  // =========================================================================
  const handleHITLDecision = async (proposal: PriorityProposal, decision: 'CONFIRM' | 'REJECT') => {
    sound.playClick();

    try {
      const res = await fetch('/api/homeowner/hitl-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: proposal.actionId,
          decision,
          incident_id: proposal.incidentId || `INC-${Date.now()}`,
          title: proposal.title,
          target_devices: [proposal.targetDevice],
          mqtt_topic: proposal.mqttTopic || 'iot/devices/control',
          mqtt_payload: proposal.command || {},
          operator: 'Chủ Hộ (Nguyễn Văn Minh Tâm)',
          log_data: {
            action: `HITL_${decision}_${proposal.actionId}`,
            status: 'SUCCESS',
            operator: 'Chủ Hộ (Nguyễn Văn Minh Tâm)',
            feedback: `Chủ hộ đã ${decision === 'CONFIRM' ? 'xác nhận thực thi' : 'từ chối'} đề xuất ${proposal.title}.`,
          },
          estimated_energy_saved_watts: proposal.estimatedEnergySavedWatts || 850.0
        })
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();

      sound.playSuccess();

      // Update proposal status in state
      setProposals((prev) =>
        prev.map((p) =>
          p.actionId === proposal.actionId
            ? { ...p, status: decision === 'CONFIRM' ? 'applied' : 'rejected' }
            : p
        )
      );

      // Update chat messages in session if attached
      setSessions((prevSessions) => {
        const updated = prevSessions.map((s) => {
          if (s.id === currentSessionId) {
            const updatedMsgs = s.messages.map((msg) =>
              msg.proposal?.actionId === proposal.actionId
                ? {
                    ...msg,
                    proposal: {
                      ...msg.proposal,
                      status: decision === 'CONFIRM' ? ('applied' as const) : ('rejected' as const)
                    }
                  }
                : msg
            );
            return { ...s, messages: updatedMsgs };
          }
          return s;
        });
        try {
          localStorage.setItem('veteran_homeowner_chat_sessions', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // Show Feedback Toast with Homeowner-friendly AI status
      setFeedbackToast({
        show: true,
        type: decision === 'CONFIRM' ? 'success' : 'info',
        title: decision === 'CONFIRM' ? '✅ Đã Kích Hoạt Chế Độ Tối Ưu' : 'ℹ️ Đã Bỏ Qua Đề Xuất',
        message: data.message || (decision === 'CONFIRM' 
          ? 'Đã điều chỉnh các thiết bị về trạng thái an toàn tối ưu. Căn hộ đang vận hành ổn định và tiết kiệm điện năng.' 
          : 'Hệ thống giữ nguyên cài đặt hiện tại. Trợ lý AI sẽ tiếp tục theo dõi và gợi ý phương án phù hợp hơn.'),
        subStatus: decision === 'CONFIRM'
          ? '✨ Trợ lý AI đã ghi nhớ thói quen này để tự động chăm sóc gia đình tốt hơn.'
          : '💡 AI đã cập nhật sở thích của bạn vào bộ nhớ thông minh.'
      });

      // Refresh notification history
      fetchNotificationHistory();

      setTimeout(() => {
        setFeedbackToast((prev) => ({ ...prev, show: false }));
      }, 6000);

    } catch (e) {
      console.error(e);
      sound.playAlarm();
      setFeedbackToast({
        show: true,
        type: 'error',
        title: '⚠️ Chưa Thể Kết Nối Thiết Bị',
        message: 'Không thể gửi lệnh đến thiết bị lúc này. Vui lòng kiểm tra lại kết nối mạng của gia đình.',
        subStatus: '🔄 Hệ thống sẽ tự động thử kết nối lại khi có mạng.'
      });
    }
  };

  // Scenario Plan Metadata (Detailed AI Suggestions for each scenario)
  const SCENARIO_AI_PLANS: Record<QuickSceneId, {
    title: string;
    icon: string;
    badge: string;
    aiRationale: string;
    energySavedWatts: number;
    costSavedMonthlyVnd: number;
    actions: Array<{ device: string; action: string; targetValue: string }>;
  }> = {
    eco: {
      title: 'Kịch Bản Tiết Kiệm Thông Minh (Eco Mode)',
      icon: '🌿',
      badge: 'GIẢM 35% ĐIỆN NĂNG',
      aiRationale: 'Căn hộ đang có người sinh hoạt. AI đề xuất tăng nhiệt độ máy lạnh lên 26.0°C (mức nhiệt tối ưu cho sức khỏe) và giảm công suất nền của bình nóng lạnh. Giữ nguyên sự thoải mái và mát mẻ.',
      energySavedWatts: 850,
      costSavedMonthlyVnd: 380000,
      actions: [
        { device: 'Máy lạnh AC_01', action: 'Đặt nhiệt độ 26.0°C & Chế độ quạt Auto', targetValue: '26.0°C' },
        { device: 'Bình nóng lạnh HEATER_01', action: 'Duy trì nhiệt độ 50°C, giảm chu kỳ đun', targetValue: '50.0°C' },
        { device: 'Cảm biến ánh sáng LIGHT_01', action: 'Tự động giảm 40% đèn khi ban công > 500 lux', targetValue: 'Tự động' }
      ]
    },
    away: {
      title: 'Kịch Bản Rời Nhà An Toàn (Away Mode)',
      icon: '🚪',
      badge: 'BẢO VỆ 100% • TẮT PHỤ TẢI',
      aiRationale: 'Khi chủ nhà ra ngoài, AI sẽ ngắt nguồn toàn bộ bình nóng lạnh và máy lạnh để triệt tiêu nguy cơ chập cháy, đồng thời kích hoạt cảm biến giám sát an ninh radar.',
      energySavedWatts: 3200,
      costSavedMonthlyVnd: 1250000,
      actions: [
        { device: 'Bình nóng lạnh HEATER_01', action: 'Ngắt nguồn hoàn toàn (POWER_OFF)', targetValue: 'TẮT NGUỒN' },
        { device: 'Máy lạnh AC_01', action: 'Tắt máy lạnh phòng khách', targetValue: 'TẮT NGUỒN' },
        { device: 'Chiếu sáng LIGHT_01', action: 'Tắt toàn bộ đèn nội thất', targetValue: 'TẮT ĐÈN' },
        { device: 'Cảm biến SENSOR_01 & CO2_01', action: 'Bật chế độ radar phát hiện xâm nhập', targetValue: 'GIÁM SÁT' }
      ]
    },
    night: {
      title: 'Kịch Bản Đi Ngủ Êm Dịu (Night Mode)',
      icon: '🌙',
      badge: 'CHĂM SÓC GIẤC NGỦ SÂU',
      aiRationale: 'Vào ban đêm, AI điều chỉnh máy lạnh lên 26.5°C êm dịu tránh cảm lạnh, tắt bình nóng lạnh sau 23:30 và tự động giám sát nồng độ CO2 để bảo vệ đường thở.',
      energySavedWatts: 1100,
      costSavedMonthlyVnd: 490000,
      actions: [
        { device: 'Máy lạnh AC_01', action: 'Đặt 26.5°C chế độ Sleep êm dịu', targetValue: '26.5°C Sleep' },
        { device: 'Cảm biến CO2_01', action: 'Tự động thông gió nếu CO₂ vượt 800 ppm', targetValue: '< 800 ppm' },
        { device: 'Bình nóng lạnh HEATER_01', action: 'Hẹn giờ tắt sau khi gia đình tắm xong', targetValue: 'TẮT LÚC 23:30' },
        { device: 'Đèn ban công LIGHT_01', action: 'Tắt đèn ban công tiết kiệm điện', targetValue: 'TẮT ĐÈN' }
      ]
    },
    comfort: {
      title: 'Kịch Bản Thoải Mái Tối Đa (Max Comfort Mode)',
      icon: '❄️',
      badge: 'LÀM MÁT NHANH & TIỆN NGHI',
      aiRationale: 'Dành cho những ngày nắng nóng hoặc khi gia đình có khách: Làm mát nhanh phòng khách xuống 24.0°C và đun nước nóng sẵn sàng cho cả nhà.',
      energySavedWatts: 0,
      costSavedMonthlyVnd: 0,
      actions: [
        { device: 'Máy lạnh AC_01', action: 'Làm mát nhanh phòng khách Turbo 24.0°C', targetValue: '24.0°C Turbo' },
        { device: 'Bình nóng lạnh HEATER_01', action: 'Đun nóng 60°C sẵn sàng tắm', targetValue: '60.0°C Ready' },
        { device: 'Cảm biến SENSOR_01', action: 'Duy trì độ ẩm lý tưởng 55 - 60%', targetValue: '58%' }
      ]
    }
  };

  // Send Message to Homeowner AI Assistant with Multi-Session Sync
  const handleSendChat = async (queryText?: string) => {
    const text = (queryText || chatInput).trim();
    if (!text || isChatLoading) return;

    sound.playClick();
    const userMsg: HomeownerChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    // Update session immediately
    setSessions((prevSessions) => {
      const updated = prevSessions.map((s) => {
        if (s.id === currentSessionId) {
          const isFirstUserMsg = s.title === 'Cuộc trò chuyện mới' || s.title === 'Trò chuyện tổng quan';
          const newTitle = isFirstUserMsg ? (text.slice(0, 30) + (text.length > 30 ? '...' : '')) : s.title;
          return {
            ...s,
            title: newTitle,
            updatedAt: 'Vừa xong',
            messages: [...s.messages, userMsg]
          };
        }
        return s;
      });
      try {
        localStorage.setItem('veteran_homeowner_chat_sessions', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/homeowner/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          current_metrics: {
            total_power: totalPower,
            ac_temp: acTemp,
            co2: co2Ppm,
            humidity: sensorHumidity,
            occupied: isHomeOccupied
          }
        })
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();

      sound.playSuccess();
      const botMsg: HomeownerChatMessage = {
        id: `msg-bot-${Date.now()}`,
        sender: 'assistant',
        text: data.answer || 'Tôi đã tiếp nhận thông tin của bạn.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        proposal: data.proposal || undefined
      };

      setSessions((prevSessions) => {
        const updated = prevSessions.map((s) => {
          if (s.id === currentSessionId) {
            const updatedSession = {
              ...s,
              messages: [...s.messages, botMsg]
            };
            syncSessionToBackend(updatedSession);
            return updatedSession;
          }
          return s;
        });
        try {
          localStorage.setItem('veteran_homeowner_chat_sessions', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } catch {
      sound.playAlarm();
      const errorMsg: HomeownerChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'assistant',
        text: 'Dạ, hiện tại kết nối mạng đang bị gián đoạn. Căn hộ của bạn vẫn đang hoạt động an toàn theo cài đặt sẵn có.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setSessions((prevSessions) => {
        const updated = prevSessions.map((s) => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: [...s.messages, errorMsg]
            };
          }
          return s;
        });
        try {
          localStorage.setItem('veteran_homeowner_chat_sessions', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  // Apply 1-Touch Quick Scene
  const handleApplyScene = async (sceneId: QuickSceneId) => {
    sound.playClick();
    setIsSceneApplying(true);
    setActiveScene(sceneId);

    const commands: Record<QuickSceneId, any> = {
      eco: { command: 'SET_ECO_MODE', target_temp: 26.0, targets: ['AC_01', 'HEATER_01'] },
      away: { command: 'SET_AWAY_MODE', targets: ['AC_01', 'HEATER_01', 'LIGHT_01'] },
      night: { command: 'SET_NIGHT_MODE', target_temp: 26.5, targets: ['AC_01', 'HEATER_01'] },
      comfort: { command: 'SET_COMFORT_MODE', target_temp: 24.0, targets: ['AC_01'] }
    };

    try {
      await fetch('/api/mqtt/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'iot/devices/control',
          payload: commands[sceneId]
        })
      });
      sound.playSuccess();
      setSelectedSceneForModal(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSceneApplying(false);
    }
  };

  // Save/Update Family Email (supports single or comma-separated emails)
  const handleUpdateFamilyEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = familyEmail.trim();
    if (!clean || !clean.includes('@')) {
      setEmailStatusMsg('Vui lòng nhập ít nhất một địa chỉ email hợp lệ (ví dụ: gia_dinh@gmail.com).');
      return;
    }

    sound.playClick();
    setIsSavingEmail(true);
    setEmailStatusMsg('');

    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_email: clean, enabled: true })
      });

      if (!res.ok) throw new Error('Failed to update email');
      const data = await res.json();
      sound.playSuccess();
      const updatedList = data.settings?.recipient_emails?.join(', ') || clean;
      setFamilyEmail(updatedList);
      setEmailStatusMsg(`✅ Đã cập nhật thành công danh sách email nhận cảnh báo: ${updatedList}`);
    } catch {
      sound.playAlarm();
      setEmailStatusMsg('❌ Không thể lưu email lúc này. Vui lòng thử lại sau.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  // Dispatch Test Email
  const handleSendTestEmail = async () => {
    const clean = familyEmail.trim();
    if (!clean || !clean.includes('@')) {
      setEmailStatusMsg('Vui lòng nhập email hợp lệ trước khi gửi thử.');
      return;
    }

    sound.playClick();
    setIsTestingEmail(true);
    setEmailStatusMsg('');

    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_email: clean })
      });

      if (!res.ok) throw new Error('Failed to test email');
      const data = await res.json();

      if (data.status === 'SENT' && data.delivery_mode === 'SMTP_LIVE') {
        sound.playSuccess();
        setEmailStatusMsg(`🎉 Đã gửi email cảnh báo THỰC TẾ thành công qua Google SMTP tới ${clean}! Vui lòng kiểm tra Hộp thư đến (hoặc thư mục Spam).`);
      } else if (data.status === 'FAILED') {
        sound.playAlarm();
        const errMsg = data.notification?.error_message || 'Mật khẩu ứng dụng Gmail không hợp lệ hoặc bị Google từ chối.';
        setEmailStatusMsg(`❌ Gửi qua Gmail thất bại: ${errMsg} 👉 Bấm "Cấu Hình Tài Khoản Gmail Gửi" bên dưới để cập nhật Mật khẩu ứng dụng 16 chữ số mới.`);
      } else {
        sound.playSuccess();
        setEmailStatusMsg(`📬 Đã tạo email cảnh báo thử nghiệm tới ${clean} (Chế độ: MÔ PHỎNG AN TOÀN). Bạn có thể bấm "Xem Thư" ở danh sách thông báo bên dưới để xem giao diện thư! Để gửi thư thật vào Gmail, bấm "Cấu Hình Tài Khoản Gmail Gửi" bên dưới để nhập Mật khẩu ứng dụng 16 chữ số.`);
      }
      fetchNotificationHistory();
    } catch {
      sound.playAlarm();
      setEmailStatusMsg('❌ Không thể gửi email thử nghiệm. Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setIsTestingEmail(false);
    }
  };

  // Verify and Save SMTP Credentials
  const handleVerifyAndSaveSmtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userClean = smtpUser.trim();
    const pwdClean = smtpPassword.trim();
    if (!userClean || !pwdClean) {
      setSmtpVerifyMsg({ type: 'error', text: 'Vui lòng nhập đầy đủ Email người gửi và Mật khẩu ứng dụng 16 ký tự.' });
      return;
    }
    sound.playClick();
    setIsVerifyingSmtp(true);
    setSmtpVerifyMsg(null);
    try {
      // 1. Kiểm tra xác thực trước
      const vRes = await fetch('/api/notifications/verify-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtp_user: userClean, smtp_password: pwdClean })
      });
      const vData = await vRes.json();
      if (!vRes.ok || !vData.success) {
        sound.playAlarm();
        setSmtpVerifyMsg({
          type: 'error',
          text: vData.error || 'Xác thực Google SMTP thất bại.',
          hint: vData.hint || 'Hãy chắc chắn rằng tài khoản Google đã BẬT xác minh 2 bước và tạo Mật khẩu ứng dụng 16 chữ số.'
        });
        return;
      }
      // 2. Lưu vào backend & .env
      const sRes = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_user: userClean,
          smtp_password: vData.valid_password || pwdClean,
          smtp_from_email: userClean,
          enabled: true
        })
      });
      if (sRes.ok) {
        sound.playSuccess();
        setSmtpConfigured(true);
        setSmtpPassword('');
        setSmtpVerifyMsg({
          type: 'success',
          text: '🎉 Đã kết nối và lưu thông tin Gmail SMTP thành công 100%! Giờ đây hệ thống sẽ tự động gửi email cảnh báo thật đến bất kỳ người nhận nào.'
        });
      }
    } catch {
      sound.playAlarm();
      setSmtpVerifyMsg({ type: 'error', text: 'Lỗi kết nối tới máy chủ khi kiểm tra SMTP.' });
    } finally {
      setIsVerifyingSmtp(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header Hero Banner: Warm Persona Welcome & Sub-Tab Switcher (CHỈ HIỆN Ở TAB OVERVIEW) */}
      {subTab === 'overview' && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-stone-100 to-amber-500/5 dark:from-amber-950/40 dark:via-stone-900/60 dark:to-stone-950 border border-amber-500/20 p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-sans text-xs font-semibold">
                  <Home className="h-3 w-3" />
                  Gia Đình
                </span>

                {mqttConnected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-sans text-xs font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    6/6 Thiết bị trực tuyến
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-400 font-sans text-xs font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                    Chế độ dự phòng
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white tracking-tight">
                Xin chào, Nguyễn Văn Minh Tâm! 🏡
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                Căn hộ đang được bảo vệ an toàn 24/7 • {isHomeOccupied ? '🟢 Có người ở nhà' : '🚪 Đang vắng nhà'}
              </p>
            </div>

            {/* Sub-view Navigator & Role Switch */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* View Switcher: Overview vs Chatbot */}
              <div className="flex tactile-tab-track p-1 rounded-2xl shadow-inner">
                <button
                  onClick={() => {
                    sound.playClick();
                    setSubTab('overview');
                  }}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                    subTab === 'overview'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white font-medium'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  <span>Không Gian & Thiết Bị</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setSubTab('assistant');
                  }}
                  className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Trợ Lý Ảo AI</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                </button>
              </div>

              {/* Switch to Tech Studio */}
              <button
                onClick={() => {
                  sound.playClick();
                  switchRole('technician');
                  if (onSwitchToTechView) onSwitchToTechView();
                }}
                className="px-4 py-2.5 rounded-2xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-amber-600 dark:hover:bg-amber-400 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <span>🛠️ Kỹ Thuật Viên</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Floating Feedback Notification Toast (Homeowner AI Feedback & Status) */}
      {feedbackToast.show && (
        <div className={`p-4 rounded-2xl border shadow-xl flex items-start justify-between gap-3 animate-in slide-in-from-top-4 duration-300 ${
          feedbackToast.type === 'success'
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-200'
            : feedbackToast.type === 'error'
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-950 dark:text-rose-200'
            : 'bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white/60 dark:bg-black/30 shrink-0">
              {feedbackToast.type === 'success' ? (
                <CheckCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : feedbackToast.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              ) : (
                <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="space-y-0.5">
              <h4 className="font-bold text-sm">{feedbackToast.title}</h4>
              <p className="text-xs leading-relaxed opacity-90">{feedbackToast.message}</p>
              {feedbackToast.subStatus && (
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                  {feedbackToast.type === 'success' ? (
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : feedbackToast.type === 'error' ? (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  <span>{feedbackToast.subStatus}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setFeedbackToast((prev) => ({ ...prev, show: false }))}
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-stone-500 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-VIEW 1: TỔNG QUAN KHÔNG GIAN, THIẾT BỊ, KỊCH BẢN & CẢNH BÁO */}
      {/* ==================================================================== */}
      {subTab === 'overview' && (
        <div className="space-y-6">

          {/* 2. Gợi Ý Tiết Kiệm & An Toàn (Visual Smart Action Card) */}
          {pendingProposals.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <h2 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white">
                    💡 Gợi Ý Tối Ưu Từ Trợ Lý AI
                  </h2>
                </div>
                <span className="text-xs font-sans font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300">
                  {pendingProposals.length} đề xuất mới
                </span>
              </div>

              {pendingProposals.map((prop, idx) => {
                const isCritical = prop.urgencyLevel === 'CRITICAL';
                return (
                  <section
                    key={prop.actionId || idx}
                    className={`relative rounded-2xl p-4 sm:p-5 shadow-sm transition-all animate-in slide-in-from-top-4 duration-300 ${
                      isCritical
                        ? 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/40'
                        : 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shadow-md shrink-0 text-white ${
                          isCritical ? 'bg-rose-600' : 'bg-amber-500'
                        }`}>
                          {isCritical ? <AlertTriangle className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-md ${
                              isCritical
                                ? 'bg-rose-500/20 text-rose-800 dark:text-rose-200'
                                : 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
                            }`}>
                              {isCritical ? '🔴 CẦN XỬ LÝ' : '💡 TIẾT KIỆM ĐIỆN'}
                            </span>

                            <h3 className="font-bold text-stone-900 dark:text-white text-sm sm:text-base">
                              {prop.title}
                            </h3>
                          </div>

                          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                            {prop.description}
                          </p>

                          {prop.estimatedCostSavedVnd && (
                            <div className="pt-0.5">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs inline-flex items-center gap-1">
                                <TrendingDown className="h-3.5 w-3.5" />
                                Tiết kiệm ước tính: ~{prop.estimatedCostSavedVnd.toLocaleString('vi-VN')} đ/tháng
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2 Nút Bấm Thân Thiện: Đồng Ý & Bỏ Qua */}
                      <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0 pt-1 lg:pt-0">
                        <button
                          onClick={() => handleHITLDecision(prop, 'CONFIRM')}
                          className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Đồng Ý Áp Dụng</span>
                        </button>

                        <button
                          onClick={() => handleHITLDecision(prop, 'REJECT')}
                          className="px-3.5 py-2.5 rounded-xl bg-stone-200/70 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 font-medium text-xs sm:text-sm flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Bỏ Qua</span>
                        </button>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* 3. Main Bento Grid: Health & Environment vs Energy Billing */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Health & Living Comfort (8 Cols) - Dynamically Sorted by Priority */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-1 bg-amber-500 rounded-full" />
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                    Môi Trường & Không Gian Sống
                  </h2>
                </div>
                <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                  Cập nhật: {lastUpdated}
                </span>
              </div>

              {/* 4 Environment Cards Grid - Rendered in Priority Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sortedRoomCards.map((room) => {
                  const Icon = room.icon;
                  const isHighPriority = room.priorityScore >= 70;

                  return (
                    <div
                      key={room.id}
                      className={`p-5 rounded-3xl bg-white dark:bg-stone-900/90 border transition-all duration-200 shadow-sm ${
                        isHighPriority
                          ? 'border-amber-500/60 ring-1 ring-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent'
                          : 'border-stone-200/80 dark:border-stone-800 hover:border-amber-400/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${room.iconColor}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-sm text-stone-900 dark:text-white">{room.title}</h3>
                              {isHighPriority && (
                                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">{room.subTitle}</p>
                          </div>
                        </div>

                        <Badge variant="outline" className={`text-[11px] ${room.badgeClass}`}>
                          {room.priorityBadge}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                        {room.metrics.map((m, mIdx) => {
                          const MetricIcon = m.icon;
                          return (
                            <div key={mIdx}>
                              <span className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1">
                                <MetricIcon className={`h-3.5 w-3.5 ${m.color}`} /> {m.label}
                              </span>
                              <div className="text-xl font-bold text-stone-900 dark:text-white mt-0.5">
                                {m.value}
                              </div>
                              <span className="text-[10.5px] text-stone-400">{m.sub}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 4. One-Touch Quick Scenes (Kịch bản 1-chạm kèm Đề xuất của AI) */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white">
                      Kịch Bản Thông Minh 1-Chạm
                    </h3>
                  </div>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    Bấm để xem đề xuất AI & chuyển chế độ tức thời
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  
                  {/* Eco Scene */}
                  <div
                    onClick={() => setSelectedSceneForModal('eco')}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative group ${
                      activeScene === 'eco'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/50 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 hover:border-emerald-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">🌿</span>
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        {activeScene === 'eco' ? 'ĐANG BẬT' : 'AI GỢI Ý'}
                      </span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">Tiết Kiệm (Eco)</div>
                    <p className="text-[10.5px] text-stone-500 dark:text-stone-400 mt-0.5">AC 26°C • -35% điện</p>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-0.5 group-hover:underline">
                      <span>Xem chi tiết AI</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Away Scene */}
                  <div
                    onClick={() => setSelectedSceneForModal('away')}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative group ${
                      activeScene === 'away'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500/50 ring-2 ring-amber-500/20 shadow-sm'
                        : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 hover:border-amber-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">🚪</span>
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        {activeScene === 'away' ? 'ĐANG BẬT' : 'AN TOÀN'}
                      </span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">Rời Nhà (Away)</div>
                    <p className="text-[10.5px] text-stone-500 dark:text-stone-400 mt-0.5">Tắt nóng lạnh • Bảo vệ</p>
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-0.5 group-hover:underline">
                      <span>Xem chi tiết AI</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Night Scene */}
                  <div
                    onClick={() => setSelectedSceneForModal('night')}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative group ${
                      activeScene === 'night'
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500/50 ring-2 ring-purple-500/20 shadow-sm'
                        : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 hover:border-purple-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">🌙</span>
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300">
                        {activeScene === 'night' ? 'ĐANG BẬT' : 'ÊM DỊU'}
                      </span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">Đi Ngủ (Night)</div>
                    <p className="text-[10.5px] text-stone-500 dark:text-stone-400 mt-0.5">AC 26.5°C • Lọc CO2</p>
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-1 flex items-center gap-0.5 group-hover:underline">
                      <span>Xem chi tiết AI</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Comfort Scene */}
                  <div
                    onClick={() => setSelectedSceneForModal('comfort')}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative group ${
                      activeScene === 'comfort'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500/50 ring-2 ring-blue-500/20 shadow-sm'
                        : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 hover:border-blue-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">❄️</span>
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300">
                        {activeScene === 'comfort' ? 'ĐANG BẬT' : 'TIỆN NGHI'}
                      </span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">Thoải Mái (Max)</div>
                    <p className="text-[10.5px] text-stone-500 dark:text-stone-400 mt-0.5">AC 24°C • Mát sâu</p>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-1 flex items-center gap-0.5 group-hover:underline">
                      <span>Xem chi tiết AI</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Right Column: Energy Billing & Family Email Settings (4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Energy Billing Card with 'Xem Chi Tiết' Button */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 text-white border border-stone-800 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Điện Năng & Tiền Điện</h3>
                      <p className="text-[11px] text-stone-400">Đồng hồ tổng (METER_01)</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    -35% TIẾT KIỆM
                  </span>
                </div>

                {/* Total Power Large Display */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-xs text-stone-400">Tổng công suất tiêu thụ tức thời</span>
                  <div className="text-3xl font-extrabold text-amber-400 tracking-tight flex items-baseline gap-1.5">
                    {(totalPower / 1000.0).toFixed(2)}
                    <span className="text-sm font-normal text-stone-300">kW ({totalPower.toFixed(0)} W)</span>
                  </div>
                </div>

                {/* Bill Estimates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[11px] text-stone-400">Ước tính / giờ</span>
                    <div className="text-lg font-bold text-stone-100 mt-0.5">
                      ~{hourlyVnd.toLocaleString('vi-VN')} đ
                    </div>
                    <span className="text-[10px] text-stone-400">Mức sinh hoạt</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[11px] text-stone-400">Dự tính tháng</span>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5">
                      ~{monthlyVnd.toLocaleString('vi-VN')} đ
                    </div>
                    <span className="text-[10px] text-stone-400">Bậc 4-5 EVN</span>
                  </div>
                </div>

                {/* Device Breakdown */}
                <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                  <div className="flex items-center justify-between text-stone-300">
                    <span>• Bình nóng lạnh (HEATER_01)</span>
                    <span className="font-mono font-bold text-amber-300">{heaterPower.toFixed(0)} W</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-300">
                    <span>• Máy lạnh phòng khách (AC_01)</span>
                    <span className="font-mono font-bold text-amber-300">{acPower.toFixed(0)} W</span>
                  </div>
                </div>

                {/* View Details Button for Energy */}
                <button
                  onClick={() => {
                    sound.playClick();
                    setIsEnergyModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Xem Chi Tiết Phân Tích & Đề Xuất AI</span>
                </button>
              </div>

              {/* Family Email Alerts Card - Cập nhật email */}
              <div className="p-6 rounded-3xl bg-white dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-stone-900 dark:text-white">Email Nhận Cảnh Báo An Toàn</h3>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">Gửi cảnh báo đến chủ nhà hoặc bất kỳ ai</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-semibold ${
                    smtpConfigured 
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                  }`}>
                    {smtpConfigured ? '● GMAIL SMTP LIVE' : '○ MÔ PHỎNG AN TOÀN'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Email người nhận (Nhập 1 hoặc nhiều email cách nhau bằng dấu phẩy):
                    </label>
                    <input
                      type="text"
                      value={familyEmail}
                      onChange={(e) => setFamilyEmail(e.target.value)}
                      placeholder="vi_du: chuhogiadinh@gmail.com, nguoi_than@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      * Bạn có thể đổi sang bất kỳ email nào tại đây để nhận thư cảnh báo.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleUpdateFamilyEmail}
                      disabled={isSavingEmail}
                      className="py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingEmail ? <Activity className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      <span>Lưu Danh Sách</span>
                    </button>

                    <button
                      onClick={handleSendTestEmail}
                      disabled={isTestingEmail}
                      className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isTestingEmail ? <Activity className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
                      <span>Gửi Thử Cảnh Báo</span>
                    </button>
                  </div>

                  {emailStatusMsg && (
                    <div className="text-[11px] font-medium animate-in fade-in leading-relaxed p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
                      {emailStatusMsg}
                    </div>
                  )}

                  {/* Collapsible SMTP Sender Configuration */}
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                    <button
                      type="button"
                      onClick={() => setShowSmtpConfig(!showSmtpConfig)}
                      className="w-full text-left flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline py-1"
                    >
                      <span>⚙️ Cấu Hình Tài Khoản Gmail Gửi Thư (SMTP)</span>
                      <span className="text-xs font-mono">{showSmtpConfig ? '▲ Đóng' : '▼ Mở'}</span>
                    </button>

                    {showSmtpConfig && (
                      <div className="mt-3 p-3.5 rounded-2xl bg-amber-500/5 dark:bg-stone-950/60 border border-amber-500/20 space-y-3 animate-in fade-in">
                        <div>
                          <label className="block text-[10.5px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                            Tài khoản Gmail người gửi:
                          </label>
                          <input
                            type="email"
                            value={smtpUser}
                            onChange={(e) => setSmtpUser(e.target.value)}
                            placeholder="nvmtamm@gmail.com"
                            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                            Mật khẩu ứng dụng 16 ký tự của Google:
                          </label>
                          <input
                            type="password"
                            value={smtpPassword}
                            onChange={(e) => setSmtpPassword(e.target.value)}
                            placeholder="16 chữ số (ví dụ: abcd efgh ijkl mnop)"
                            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-white"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleVerifyAndSaveSmtp}
                          disabled={isVerifyingSmtp || !smtpUser.trim() || !smtpPassword.trim()}
                          className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                        >
                          {isVerifyingSmtp ? <Activity className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          <span>Kiểm Tra Kết Nối & Lưu Gmail</span>
                        </button>

                        {smtpVerifyMsg && (
                          <div className={`p-2.5 rounded-lg text-xs leading-relaxed border ${
                            smtpVerifyMsg.type === 'success'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
                          }`}>
                            <div className="font-semibold">{smtpVerifyMsg.text}</div>
                            {smtpVerifyMsg.hint && (
                              <div className="text-[10.5px] mt-1 text-stone-600 dark:text-stone-400 italic">
                                👉 {smtpVerifyMsg.hint}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-800/80 text-[10px] text-stone-600 dark:text-stone-400 space-y-1">
                          <p className="font-semibold text-stone-700 dark:text-stone-300">📖 Cách tạo Mật khẩu ứng dụng Gmail (16 chữ số):</p>
                          <ol className="list-decimal list-inside space-y-0.5">
                            <li>Vào trang quản lý tài khoản: <strong>myaccount.google.com/security</strong></li>
                            <li>Bật tính năng <strong>Xác minh 2 bước</strong> (2-Step Verification)</li>
                            <li>Tìm mục <strong>Mật khẩu ứng dụng</strong> (App passwords)</li>
                            <li>Đặt tên (ví dụ: SmartHome), nhấn Tạo và sao chép 16 chữ số dán vào đây</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* 5. Notification Center: Liệt kê các thông báo sự cố */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <BellRing className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white flex items-center gap-2">
                    Trung Tâm Thông Báo & Lịch Sử Cảnh Báo An Toàn
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono font-bold">
                      {notifications.length} bản ghi
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Danh sách các cảnh báo sự cố, email thông báo và các lệnh điều khiển đã thực hiện
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  fetchNotificationHistory();
                }}
                disabled={isLoadingNotifications}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium transition-all cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingNotifications ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-8 text-stone-500 dark:text-stone-400 space-y-2">
                <ShieldCheck className="h-10 w-10 mx-auto text-emerald-500 opacity-80" />
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  Hiện không có sự cố nào!
                </p>
                <p className="text-xs">Toàn bộ 6 thiết bị IoT trong nhà đang vận hành an toàn và ổn định.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {notifications.slice(0, 10).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-stone-50/70 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-amber-500/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        item.severity === 'CRITICAL' 
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' 
                          : item.severity === 'HIGH'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      }`}>
                        {item.severity === 'CRITICAL' ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10.5px] font-mono font-bold px-2 py-0.5 rounded ${
                            item.severity === 'CRITICAL'
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          }`}>
                            {item.severity || 'ALERT'}
                          </span>

                          <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">
                            {item.subject}
                          </span>

                          <Badge variant="outline" className="text-[10px] font-mono">
                            {item.status === 'SENT' ? 'ĐÃ GỬI EMAIL' : item.status}
                          </Badge>
                        </div>

                        <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-3 flex-wrap">
                          <span>Mã: <strong className="font-mono text-stone-700 dark:text-stone-300">{item.incident_id || item.notification_id}</strong></span>
                          <span>Gửi đến: <strong className="text-stone-700 dark:text-stone-300">{item.recipient_email}</strong></span>
                          <span>Thời gian: {item.timestamp ? new Date(item.timestamp).toLocaleString('vi-VN') : 'Vừa xong'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        sound.playClick();
                        setSelectedNotification(item);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:text-amber-600 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Xem Thư</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-VIEW 2: TRANG TRÌNH BÀY RIÊNG CHO TRỢ LÝ ẢO GIA ĐÌNH (GEMINI UI)  */}
      {/* ==================================================================== */}
      {subTab === 'assistant' && (
        <section className="h-[calc(100dvh-95px)] min-h-[580px] flex rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm overflow-hidden animate-in fade-in duration-200 relative">
          
          {/* ================================================================ */}
          {/* CỘT LỊCH SỬ BÊN TRÁI - DESKTOP (GEMINI-STYLE SIDEBAR 270px)        */}
          {/* ================================================================ */}
          <aside
            className={`${
              isSidebarCollapsed ? 'hidden' : 'hidden md:flex w-[260px] sm:w-[280px] p-3.5 border-r border-stone-200/80 dark:border-stone-800 bg-[#f9f9fb] dark:bg-stone-950/60'
            } flex-col justify-between shrink-0 transition-all duration-300 select-none overflow-hidden`}
          >
            {/* Top Area of Sidebar */}
            <div className="flex flex-col min-h-0 flex-1 space-y-3">
              
              {/* Sidebar Header: Logo & Toggle Button */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-sm text-stone-900 dark:text-white tracking-tight">
                    Veteran Home
                  </span>
                </div>

                <button
                  onClick={() => {
                    sound.playClick();
                    setIsSidebarCollapsed(true);
                  }}
                  className="p-1.5 rounded-xl hover:bg-stone-200/70 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Thu gọn thanh bên"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>

              {/* Segment Switcher (Trò chuyện / Tối ưu) */}
              <div className="flex items-center tactile-tab-track p-1 rounded-2xl text-xs font-semibold shadow-inner">
                <button className="flex-1 py-1.5 rounded-xl bg-white dark:bg-stone-800 text-stone-950 dark:text-white font-extrabold shadow-sm ring-1 ring-stone-900/10 dark:ring-white/10 text-center cursor-pointer">
                  Trò chuyện
                </button>
                <button
                  onClick={() => setSubTab('overview')}
                  className="flex-1 py-1.5 text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-200 font-semibold text-center transition-colors cursor-pointer"
                >
                  Tối ưu IoT
                </button>
              </div>

              {/* Cuộc trò chuyện mới Button */}
              <button
                onClick={handleNewSession}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700/80 border border-stone-200/80 dark:border-stone-700/80 text-stone-800 dark:text-stone-100 text-xs font-semibold shadow-2xs transition-all active:scale-98 cursor-pointer"
              >
                <SquarePen className="h-4 w-4 text-stone-600 dark:text-stone-400" />
                <span>Cuộc trò chuyện mới</span>
              </button>

              {/* Tìm kiếm trong các cuộc trò chuyện */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm cuộc trò chuyện"
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/60 border border-transparent focus:border-stone-300 dark:focus:border-stone-700 text-[11.5px] text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none transition-all"
                />
              </div>

              {/* Section Title: Gần đây */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider px-2 pb-1">
                  Gần đây
                </p>

                {/* Session List */}
                <div className="min-h-0 max-h-[calc(100vh-380px)] overflow-y-auto space-y-1 pr-1 terminal-scroll">
                  {sessions
                    .filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectSession(s.id)}
                        className={`group px-3 py-2 rounded-2xl text-xs flex items-center justify-between cursor-pointer transition-all ${
                          s.id === currentSessionId
                            ? 'bg-stone-200/80 dark:bg-stone-800 text-stone-950 dark:text-white font-semibold shadow-2xs'
                            : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-200'
                        }`}
                      >
                        <span className="truncate max-w-[170px] sm:max-w-[190px]">{s.title}</span>
                        <button
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-stone-400 hover:text-rose-500 transition-all"
                          title="Xóa cuộc trò chuyện này"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>

            </div>

            {/* Bottom Profile Footer (Nguyễn Văn Minh Tâm) */}
            <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800 flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                  TM
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900 dark:text-white truncate max-w-[140px]">
                    Nguyễn Văn Minh Tâm
                  </p>
                  <p className="text-[10px] text-stone-400">Chủ Hộ Gia Đình</p>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  setFeedbackToast({
                    show: true,
                    type: 'info',
                    title: '⚙️ Cài Đặt Hệ Thống',
                    message: 'Chủ hộ: Nguyễn Văn Minh Tâm • Đang bảo vệ 6 thiết bị IoT 24/7.'
                  });
                }}
                className="p-1.5 rounded-xl hover:bg-stone-200/70 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                title="Cài đặt"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>

          </aside>

          {/* ================================================================ */}
          {/* MOBILE DRAWER OVERLAY (Trượt ra khi bấm Menu trên điện thoại)     */}
          {/* ================================================================ */}
          {isMobileDrawerOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
              <div
                onClick={() => setIsMobileDrawerOpen(false)}
                className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs"
              />
              <aside className="relative z-10 w-[290px] max-w-[85vw] bg-white dark:bg-stone-900 h-full p-4 flex flex-col justify-between shadow-2xl border-r border-stone-200 dark:border-stone-800 animate-in slide-in-from-left duration-200">
                <div className="flex flex-col min-h-0 flex-1 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-sm text-stone-900 dark:text-white tracking-tight">
                        Veteran Home
                      </span>
                    </div>

                    <button
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={handleNewSession}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs"
                  >
                    <SquarePen className="h-4 w-4" />
                    <span>Cuộc trò chuyện mới</span>
                  </button>

                  <div className="pt-2 flex-1 min-h-0 flex flex-col">
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-2 pb-1">
                      Gần đây ({sessions.length})
                    </p>
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1 terminal-scroll">
                      {sessions.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => handleSelectSession(s.id)}
                          className={`px-3 py-2 rounded-2xl text-xs flex items-center justify-between cursor-pointer ${
                            s.id === currentSessionId
                              ? 'bg-amber-500 text-white font-semibold'
                              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                          }`}
                        >
                          <span className="truncate max-w-[200px]">{s.title}</span>
                          <button
                            onClick={(e) => handleDeleteSession(s.id, e)}
                            className="p-1 rounded text-stone-400 hover:text-rose-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    TM
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900 dark:text-white truncate">
                      Nguyễn Văn Minh Tâm
                    </p>
                    <p className="text-[10px] text-stone-400">Chủ Hộ Gia Đình</p>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* ================================================================ */}
          {/* KHÔNG GIAN CHAT CHÍNH (GEMINI MAIN WORKSPACE)                    */}
          {/* ================================================================ */}
          <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-stone-900 overflow-hidden relative w-full">
            
            {/* Minimal Header Bar */}
            <div className="p-3 sm:p-3.5 border-b border-stone-100 dark:border-stone-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                
                {/* Mobile Drawer Trigger Button (Luôn hiện trên điện thoại) */}
                <button
                  onClick={() => {
                    sound.playClick();
                    setIsMobileDrawerOpen(true);
                  }}
                  className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 md:hidden transition-colors cursor-pointer shrink-0"
                  title="Mở thanh bên lịch sử"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>

                {/* Desktop Toggle Button (Khi thu gọn trên máy tính) */}
                {isSidebarCollapsed && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsSidebarCollapsed(false);
                    }}
                    className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 hidden md:inline-flex transition-colors cursor-pointer shrink-0"
                    title="Mở thanh bên lịch sử"
                  >
                    <PanelLeft className="h-4 w-4" />
                  </button>
                )}

                <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white truncate">
                  {activeSession.title}
                </h2>
              </div>

              {/* Status Badges & Quick View Switcher */}
              <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                <button
                  onClick={() => {
                    sound.playClick();
                    setSubTab('overview');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-amber-500 hover:text-white dark:bg-stone-800 dark:hover:bg-amber-600 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  title="Quay lại bảng điều khiển thiết bị & năng lượng"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Không Gian & Thiết Bị</span>
                </button>

                <span className="px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[11px] hidden sm:inline">
                  ⚡ {totalPower.toFixed(0)}W
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[11px] hidden sm:inline">
                  🌡️ {sensorTemp.toFixed(1)}°C
                </span>
              </div>
            </div>

            {/* Chat Messages List (Gemini Clean Flow) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 terminal-scroll max-w-4xl mx-auto w-full">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  
                  {/* USER MESSAGE (Aligned Right, Soft Pill) */}
                  {msg.sender === 'user' && (
                    <div className="flex justify-end">
                      <div className="px-5 py-3 rounded-3xl rounded-tr-sm bg-[#f0f4f9] dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-normal max-w-[85%] sm:max-w-[75%] shadow-2xs">
                        <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                        <span className="text-[10px] text-stone-400 block mt-1 text-right font-mono">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ASSISTANT MESSAGE (Aligned Left, Clean Typography + Markdown + Action Toolbar) */}
                  {msg.sender === 'assistant' && (
                    <div className="flex flex-col space-y-2.5 max-w-[92%] sm:max-w-[85%] animate-in fade-in duration-200">
                      
                      {/* Markdown Text */}
                      <div className="text-xs sm:text-sm text-stone-900 dark:text-stone-100 leading-relaxed font-normal">
                        <MarkdownRenderer content={msg.text} />
                      </div>

                      {/* Proposal Card if attached */}
                      {msg.proposal && (
                        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4" />
                              Gợi Ý Can Thiệp Tối Ưu
                            </span>
                            {msg.proposal.status === 'applied' && (
                              <Badge className="bg-emerald-600 text-white text-[10px]">Đã Áp Dụng ✅</Badge>
                            )}
                            {msg.proposal.status === 'rejected' && (
                              <Badge className="bg-stone-500 text-white text-[10px]">Đã Bỏ Qua</Badge>
                            )}
                          </div>

                          <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed font-medium">
                            {msg.proposal.title}: {msg.proposal.description}
                          </p>

                          {msg.proposal.estimatedCostSavedVnd && (
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <TrendingDown className="h-3.5 w-3.5" />
                              Ước tính tiết kiệm: ~{msg.proposal.estimatedCostSavedVnd.toLocaleString('vi-VN')} đ/tháng
                            </p>
                          )}

                          {msg.proposal.status === 'pending' && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => {
                                  const propToExec: PriorityProposal = {
                                    ...msg.proposal!,
                                    priorityRank: 2,
                                    urgencyLevel: 'HIGH'
                                  };
                                  handleHITLDecision(propToExec, 'CONFIRM');
                                }}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Đồng Ý Áp Dụng
                              </button>
                              <button
                                onClick={() => {
                                  const propToExec: PriorityProposal = {
                                    ...msg.proposal!,
                                    priorityRank: 2,
                                    urgencyLevel: 'HIGH'
                                  };
                                  handleHITLDecision(propToExec, 'REJECT');
                                }}
                                className="px-3.5 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 text-xs font-medium transition-all active:scale-95 cursor-pointer"
                              >
                                Bỏ Qua
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Gemini Action Icons Toolbar */}
                      <div className="flex items-center gap-2 text-stone-400 pt-1 select-none">
                        <button
                          onClick={() => sound.playClick()}
                          className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                          title="Hữu ích"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => sound.playClick()}
                          className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                          title="Chưa hài lòng"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleSendChat(chatMessages[chatMessages.length - 2]?.text || 'Tối ưu lại')}
                          className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                          title="Tạo lại câu trả lời"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            sound.playClick();
                            navigator.clipboard.writeText(msg.text);
                            setCopiedMsgId(msg.id);
                            setTimeout(() => setCopiedMsgId(null), 2000);
                          }}
                          className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                          title="Sao chép nội dung"
                        >
                          {copiedMsgId === msg.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Bottom Gemini Floating Capsule Prompt Bar */}
            <div className="p-3 sm:p-4 shrink-0 max-w-4xl mx-auto w-full space-y-2">
              
              {/* Quick Prompt Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none py-0.5">
                {[
                  { icon: '💡', title: 'Tiết Kiệm Điện', prompt: 'Làm sao để tiết kiệm điện tối nay mà phòng khách vẫn mát?' },
                  { icon: '🌿', title: 'Không Khí & CO2', prompt: 'Chất lượng không khí và nồng độ CO2 phòng ngủ hiện tại thế nào?' },
                  { icon: '⚡', title: 'Hóa Đơn Tiền Điện', prompt: 'Ước tính tiền điện tháng này của nhà tôi hết bao nhiêu?' },
                  { icon: '🌙', title: 'Giấc Ngủ Ban Đêm', prompt: 'Nên bật chế độ gì cho máy lạnh và bình nóng lạnh trước khi đi ngủ?' }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(item.prompt)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs whitespace-nowrap transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    <span>{item.icon}</span>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>

              {/* Capsule Input Bar (Khung viên thuốc chuẩn Gemini) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="rounded-full bg-[#f0f4f9] dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700/80 px-4 py-2 flex items-center gap-2.5 shadow-xs focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:bg-white dark:focus-within:bg-stone-800 transition-all"
              >
                <button
                  type="button"
                  onClick={() => handleNewSession()}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                  title="Tạo cuộc trò chuyện mới"
                >
                  <Plus className="h-4 w-4" />
                </button>

                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Hỏi Veteran Home..."
                  className="flex-1 bg-transparent text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none"
                />

                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-700 text-stone-600 dark:text-stone-300 font-semibold hidden sm:inline">
                  Flash ⚡
                </span>

                <button
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="h-8 w-8 rounded-full bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 flex items-center justify-center shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  {isChatLoading ? (
                    <Activity className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </form>

              {/* Disclaimer footer */}
              <p className="text-[11px] text-center text-stone-400 dark:text-stone-500">
                Veteran Home là trợ lý AI và có thể cần bạn xác nhận thực tế đối với các thiết bị công suất cao.
              </p>
            </div>

          </main>

        </section>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: CHI TIẾT KỊCH BẢN THÔNG MINH & ĐỀ XUẤT CỦA AI */}
      {/* ==================================================================== */}
      {selectedSceneForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{SCENARIO_AI_PLANS[selectedSceneForModal].icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base sm:text-lg text-stone-900 dark:text-white">
                      {SCENARIO_AI_PLANS[selectedSceneForModal].title}
                    </h3>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px]">
                      {SCENARIO_AI_PLANS[selectedSceneForModal].badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Phân tích đề xuất & kế hoạch tự động của AI
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSceneForModal(null)}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* AI Explanation Box */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                Phân Tích Chuyên Sâu Từ AI:
              </span>
              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                {SCENARIO_AI_PLANS[selectedSceneForModal].aiRationale}
              </p>
            </div>

            {/* Device Actions List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                Hành động thực thi trên 6 thiết bị:
              </span>
              <div className="space-y-2">
                {SCENARIO_AI_PLANS[selectedSceneForModal].actions.map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-xs text-stone-900 dark:text-white">{act.device}</div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">{act.action}</div>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10.5px]">
                      {act.targetValue}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                onClick={() => handleApplyScene(selectedSceneForModal)}
                disabled={isSceneApplying}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                {isSceneApplying ? <Activity className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>🚀 Kích Hoạt Kịch Bản Này Ngay</span>
              </button>

              <button
                onClick={() => setSelectedSceneForModal(null)}
                className="py-3 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 font-medium text-xs sm:text-sm transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: BÁO CÁO CHI TIẾT TIÊU THỤ & TỐI ƯU TIỀN ĐIỆN */}
      {/* ==================================================================== */}
      {isEnergyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-stone-900 dark:text-white">
                    Báo Cáo Chi Tiết Phân Bổ Điện Năng & Dự Tính Tiền Điện
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Phân tích biểu giá bậc thang EVN và đề xuất tối ưu hóa hóa đơn
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEnergyModalOpen(false)}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 space-y-1">
                <span className="text-xs text-stone-500">Công suất tổng</span>
                <div className="text-2xl font-bold text-amber-500">{(totalPower / 1000).toFixed(2)} kW</div>
                <span className="text-[10.5px] text-stone-400">Đồng hồ METER_01</span>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 space-y-1">
                <span className="text-xs text-stone-500">Ước tính tháng này</span>
                <div className="text-2xl font-bold text-stone-900 dark:text-white">~{monthlyVnd.toLocaleString('vi-VN')} đ</div>
                <span className="text-[10.5px] text-stone-400">Bậc 4-5 EVN (~2.536đ/kWh)</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                <span className="text-xs text-emerald-700 dark:text-emerald-300">Khả năng tiết kiệm</span>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">~{estimatedSavingsMonthlyVnd.toLocaleString('vi-VN')} đ</div>
                <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400">Khi bật chế độ Eco (-35%)</span>
              </div>
            </div>

            {/* Device Load Distribution */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Phân bổ phụ tải các thiết bị chính:
              </h4>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-white">Bình Nóng Lạnh (HEATER_01)</div>
                    <div className="text-[11px] text-stone-500">Công suất: {heaterPower.toFixed(0)}W • Chiếm ~61.5% tổng phụ tải</div>
                  </div>
                  <div className="font-mono font-bold text-amber-500">~{(heaterPower * 2.5).toFixed(0)} đ/giờ</div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-white">Máy Lạnh Phòng Khách (AC_01)</div>
                    <div className="text-[11px] text-stone-500">Công suất: {acPower.toFixed(0)}W • Đang đặt {acTemp.toFixed(1)}°C</div>
                  </div>
                  <div className="font-mono font-bold text-amber-500">~{(acPower * 2.5).toFixed(0)} đ/giờ</div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-white">Chiếu Sáng & Thiết Bị Nền</div>
                    <div className="text-[11px] text-stone-500">Đèn ban công (LIGHT_01) & các thiết bị phụ trợ</div>
                  </div>
                  <div className="font-mono font-bold text-stone-500">~300 W</div>
                </div>
              </div>
            </div>

            {/* 3 AI Recommendations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                3 Đề Xuất Tối Ưu Hóa Của AI Cho Căn Hộ:
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                  <div className="font-bold text-stone-900 dark:text-white">1. Tăng nhiệt độ máy lạnh lên 26.0°C</div>
                  <p className="text-stone-600 dark:text-stone-300">
                    Máy lạnh đang ở mức 20.8°C quá lạnh. Tăng lên 26°C giúp tiết kiệm ~850W (~45.000 đ/tháng) mà vẫn thoải mái.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                  <div className="font-bold text-stone-900 dark:text-white">2. Hẹn giờ tắt bình nóng lạnh sau khi đun đủ 50°C</div>
                  <p className="text-stone-600 dark:text-stone-300">
                    Bình nóng lạnh HEATER_01 tiêu thụ 2452W. Không nên bật liên tục cả ngày khi không tắm.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                  <div className="font-bold text-stone-900 dark:text-white">3. Tận dụng ánh sáng tự nhiên ban công 532 lux</div>
                  <p className="text-stone-600 dark:text-stone-300">
                    Ánh sáng tự nhiên đang rất sáng rõ, có thể tắt bớt 2 bóng đèn phòng khách ban ngày.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
              <button
                onClick={() => {
                  sound.playClick();
                  handleApplyScene('eco');
                  setIsEnergyModalOpen(false);
                }}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Áp Dụng Kịch Bản Tiết Kiệm (Eco) Ngay</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: XEM CHI TIẾT BẢNG THÔNG BÁO / EMAIL CẢNH BÁO */}
      {/* ==================================================================== */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-start justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white">
                    Chi Tiết Thông Báo Cảnh Báo An Toàn
                  </h3>
                  <span className="text-[11px] font-mono text-stone-500">
                    Mã: {selectedNotification.incident_id || selectedNotification.notification_id}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedNotification(null)}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 dark:text-white">{selectedNotification.subject}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">{selectedNotification.severity}</Badge>
                </div>
                <div className="text-stone-500">
                  Người nhận: <strong className="text-stone-700 dark:text-stone-300">{selectedNotification.recipient_email}</strong> • Chế độ: {selectedNotification.delivery_mode}
                </div>
                <div className="text-stone-400 text-[10.5px]">
                  Thời gian gửi: {selectedNotification.timestamp ? new Date(selectedNotification.timestamp).toLocaleString('vi-VN') : 'Vừa xong'}
                </div>
              </div>

              {selectedNotification.dashboard_url && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2">
                  <span className="text-amber-800 dark:text-amber-300 text-xs font-semibold">
                    Liên kết trực tiếp phê duyệt sự cố:
                  </span>
                  <a
                    href={selectedNotification.dashboard_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-colors"
                  >
                    Mở Dashboard ➔
                  </a>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
              <button
                onClick={() => setSelectedNotification(null)}
                className="py-2 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 font-medium text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
};
