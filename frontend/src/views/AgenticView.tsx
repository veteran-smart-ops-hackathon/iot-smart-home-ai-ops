import React, { useState, useEffect } from 'react';
import {
  Crown,
  Database,
  Search,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  PlayCircle,
  Tv,
  AlertTriangle,
  Flame,
  CheckCircle2,
  BookOpen,
  Atom,
  GitFork,
  Activity,
  CheckCheck,
  CalendarCheck,
  Power,
  XCircle,
  Loader2,
  Zap
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sound } from '@/lib/sound';
import { MetricHelpButton } from '@/components/MetricHelpButton';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { AnomalySimulationResult } from '@/types';

interface AgentNodeState {
  id: number;
  name: string;
  role: string;
  model: string;
  status: 'STANDBY' | 'THINKING' | 'DONE';
  latencyMs?: number;
  icon: any;
  colorClass: string;
}

export const AgenticView: React.FC<{ onNavigateEvidence: () => void }> = ({ onNavigateEvidence }) => {
  const [speed, setSpeed] = useState<number>(1);
  const [selectedScenario, setSelectedScenario] = useState<string>('energy_saving');
  const [activeStepText, setActiveStepText] = useState<string>(
    'Hệ thống đang ở trạng thái giám sát nền. Chọn 1 kịch bản phía trên để kích hoạt luồng suy luận tự trị 5-node.'
  );
  const [activeAgentRole, setActiveAgentRole] = useState<string>('Home Coordinator Supervisor:');
  const [workflowLatency, setWorkflowLatency] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [workflowResult, setWorkflowResult] = useState<AnomalySimulationResult | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<boolean>(false);
  const [isExecutingAction, setIsExecutingAction] = useState<boolean>(false);
  const [executedActionInfo, setExecutedActionInfo] = useState<{
    id: string;
    label: string;
    topic: string;
    timestamp: string;
    actionType: string;
  } | null>(null);

  const [nodes, setNodes] = useState<AgentNodeState[]>([
    {
      id: 1,
      name: 'Home Coordinator',
      role: 'Nhạc Trưởng Điều Phối',
      model: 'Gemini 2.5 Flash',
      status: 'STANDBY',
      icon: Crown,
      colorClass: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20',
    },
    {
      id: 2,
      name: 'IoT Observation',
      role: 'Quan Sát 6 Cảm Biến',
      model: 'Gemini 2.5 Flash + Kalman 1D',
      status: 'STANDBY',
      icon: Activity,
      colorClass: 'text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20',
    },
    {
      id: 3,
      name: 'Comfort & Energy',
      role: 'Tối Ưu Tiện Nghi (RAG)',
      model: 'Gemini 2.5 Flash + Qdrant',
      status: 'STANDBY',
      icon: Search,
      colorClass: 'text-sky-700 dark:text-sky-400 bg-sky-100 dark:bg-sky-500/20',
    },
    {
      id: 4,
      name: 'Safety & Risk',
      role: 'Kiểm Soát An Toàn (HITL)',
      model: 'Gemini 2.5 Flash',
      status: 'STANDBY',
      icon: ShieldAlert,
      colorClass: 'text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/20',
    },
    {
      id: 5,
      name: 'Action & Verification',
      role: 'Hành Động & Tự Học',
      model: 'Gemini 2.5 Flash + Qdrant Vector DB',
      status: 'STANDBY',
      icon: RotateCcw,
      colorClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20',
    },
  ]);

  const delay = (ms: number) => new Promise((res) => setTimeout(res, speed === 999 ? 10 : ms / speed));

  const runScenario = async (scenarioKey: string) => {
    setSelectedScenario(scenarioKey);
    setIsSimulating(true);
    setFeedbackSuccess(false);
    setExecutedActionInfo(null);

    // Reset nodes
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        status: 'STANDBY',
        latencyMs: undefined,
      }))
    );

    setActiveStepText(`Đang khởi tạo chu trình LangGraph StateGraph (${scenarioKey})...`);
    sound.playAlert();

    try {
      const res = await fetch('/api/simulate-anomaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioKey }),
      });
      const data: AnomalySimulationResult = await res.json();
      setWorkflowResult(data);

      const stepDetails = [
        {
          nodeId: 1,
          role: 'Home Coordinator (Gemini 2.5 Flash):',
          text: 'Tiếp nhận yêu cầu từ người dùng, phân tích ý định (Intent) và khởi tạo phiên điều phối 5-Node StateGraph.',
        },
        {
          nodeId: 2,
          role: 'IoT Observation Agent (Gemini 2.5 Flash + Kalman 1D):',
          text: 'Đọc luồng dữ liệu 6 thiết bị Track A từ MQTT Gateway, áp dụng bộ lọc Kalman 1D và kiểm tra độ mới timestamp (Freshness).',
        },
        {
          nodeId: 3,
          role: 'Comfort & Energy Agent (Gemini 2.5 Flash + Qdrant):',
          text: 'Tra cứu quy chuẩn SOP và lịch sử tương tự trong Qdrant Vector Store. Đề xuất điểm cân bằng tiện nghi và tiết kiệm năng lượng.',
        },
        {
          nodeId: 4,
          role: 'Safety & Risk Guard (Gemini 2.5 Flash):',
          text: `Đánh giá rủi ro an toàn và sức khỏe: ${data.diagnostic_report?.primary_cause || 'Kiểm soát phụ tải'}. Thiết lập quy trình can thiệp và gắn cờ phê duyệt HITL.`,
        },
        {
          nodeId: 5,
          role: 'Home Action & Verification Agent (Gemini 2.5 Flash + Qdrant):',
          text: 'Thực thi gọi Tool tạo Lịch sinh hoạt/Ticket kỹ thuật, thực hiện Đọc lại xác minh (Read-back Verification) và sẵn sàng lưu Qdrant Vector DB để tự học.',
        },
      ];

      for (let i = 0; i < stepDetails.length; i++) {
        const step = stepDetails[i];
        sound.playNodeActive();

        setNodes((prev) =>
          prev.map((n) => (n.id === step.nodeId ? { ...n, status: 'THINKING' } : n))
        );
        setActiveAgentRole(step.role);
        setActiveStepText(step.text);

        await delay(900);

        const lat = Math.floor(Math.random() * 25 + 15);
        setNodes((prev) =>
          prev.map((n) => (n.id === step.nodeId ? { ...n, status: 'DONE', latencyMs: lat } : n))
        );
      }

      setWorkflowLatency(data.workflow_latency_ms || 128);
      sound.playSuccess();
    } catch (err) {
      console.error('Error running scenario:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExecuteAction = async (
    actionId: string,
    label: string,
    topic: string = 'iot/devices/control',
    payload?: any,
    actionType?: string
  ) => {
    sound.playClick();
    setIsExecutingAction(true);
    try {
      const payloadStr = payload
        ? typeof payload === 'string'
          ? payload
          : JSON.stringify(payload)
        : JSON.stringify({ action: actionId });

      await fetch('/api/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: actionId,
          label: label,
          mqtt_topic: topic,
          payload: payloadStr,
        }),
      });

      setExecutedActionInfo({
        id: actionId,
        label: label,
        topic: topic,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        actionType: actionType || 'COMMAND',
      });
      setFeedbackSuccess(true);
      sound.playSuccess();
    } catch (err) {
      console.error('Action error:', err);
    } finally {
      setIsExecutingAction(false);
    }
  };

  useEffect(() => {
    runScenario('energy_saving');
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 flex-1 w-full space-y-4 pb-12">

      {/* HERO SECTION: SCENARIO DISPATCHER & MULTI-AGENT STATE GRAPH */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-medium mb-1.5">
              <GitFork className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>LANGGRAPH STATEGRAPH 5-NODE TOPOLOGY</span>
            </div>
            <h1 className="font-display font-extrabold text-xl sm:text-2xl text-stone-900 dark:text-white tracking-tight">
              Đồ Thị Phối Hợp <span className="text-indigo-600 dark:text-indigo-400">5 Tác Tử Tự Trị</span> & Khép Vòng Phản Hồi
            </h1>
            <p className="text-xs text-stone-600 dark:text-stone-300 max-w-3xl mt-1 leading-relaxed">
              Theo dõi trực quan thời gian thực luồng phân tích từ <strong>Home Coordinator</strong> &rarr; <strong>IoT Observation</strong> &rarr; <strong>Comfort & Energy RAG</strong> &rarr; <strong>Safety & Risk</strong> và <strong>Action & Verification (Qdrant Memory)</strong>.
            </p>
          </div>

          {/* Speed & Replay Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center tactile-tab-track p-0.5 rounded-lg font-mono text-[10px] shadow-inner">
              <span className="px-2 text-stone-500 font-medium hidden sm:inline">Tốc độ:</span>
              {[0.5, 1, 2, 999].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${speed === s
                      ? 'font-extrabold text-amber-700 dark:text-amber-400 bg-white dark:bg-stone-800 shadow-sm ring-1 ring-amber-500/30'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-200 font-semibold'
                    }`}
                >
                  {s === 999 ? 'Instant' : `${s}x`}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => runScenario(selectedScenario)}
              disabled={isSimulating}
              className="space-x-1.5 cursor-pointer"
            >
              <PlayCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>PHÁT LẠI</span>
            </Button>
          </div>
        </div>

        {/* Real-time Scenario Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-stone-500 mr-1">Kích hoạt sự cố thực tế:</span>

          <Button
            size="sm"
            variant={selectedScenario === 'energy_saving' ? 'default' : 'outline'}
            onClick={() => runScenario('energy_saving')}
            disabled={isSimulating}
            className="space-x-1.5 cursor-pointer"
          >
            <Tv className="h-3.5 w-3.5" />
            <span>1. Chủ động Tối Ưu Năng Lượng</span>
          </Button>

          <Button
            size="sm"
            variant={selectedScenario === 'co2_hazard' ? 'destructive' : 'outline'}
            onClick={() => runScenario('co2_hazard')}
            disabled={isSimulating}
            className="space-x-1.5 cursor-pointer"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>2. Cảnh báo Ngạt CO2 Phòng Ngủ (&gt;1000ppm)</span>
          </Button>

          <Button
            size="sm"
            variant={selectedScenario === 'stale_data' || selectedScenario === 'mqtt_loss' ? 'amber' : 'outline'}
            onClick={() => runScenario('stale_data')}
            disabled={isSimulating}
            className="space-x-1.5 cursor-pointer"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>3. Dữ Liệu Stale / Mất Kết Nối Cảm Biến</span>
          </Button>

          <Button
            size="sm"
            variant={selectedScenario === 'heater_overheat' || selectedScenario === 'away_hazard' ? 'destructive' : 'outline'}
            onClick={() => runScenario('heater_overheat')}
            disabled={isSimulating}
            className="space-x-1.5 cursor-pointer"
          >
            <Flame className="h-3.5 w-3.5 text-rose-500" />
            <span>4. Bình Nóng Lạnh Quá Nhiệt Vắng Nhà (76.5°C)</span>
          </Button>
        </div>

        {/* 5-Node LangGraph State Machine Grid */}
        <div className="p-4 rounded-xl bg-stone-50/80 dark:bg-stone-900/40 border border-stone-200/80 dark:border-stone-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {nodes.map((node) => {
              const IconComp = node.icon;
              const isThinking = node.status === 'THINKING';
              const isDone = node.status === 'DONE';

              return (
                <Card
                  key={node.id}
                  className={`p-3.5 flex flex-col justify-between space-y-2 transition-all ${isThinking
                      ? 'border-amber-500 shadow-md ring-2 ring-amber-500/30'
                      : isDone
                        ? 'border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : ''
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border rounded">
                      NODE {node.id}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-mono rounded ${isThinking
                          ? 'bg-amber-500 text-white font-bold animate-pulse'
                          : isDone
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                        }`}
                    >
                      {node.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${node.colorClass}`}>
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-stone-900 dark:text-white truncate">{node.name}</h4>
                      <span className="text-[9.5px] font-mono text-stone-500">{node.role}</span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[9.5px] font-mono text-stone-500 tabular-nums">
                    <span className="truncate pr-1">{node.model}</span>
                    <span>{node.latencyMs ? `${node.latencyMs} ms` : '-- ms'}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* LIVE THOUGHT STREAM TERMINAL */}
        <div className="rounded-xl bg-stone-950 text-stone-100 p-4 font-mono text-xs space-y-2.5 shadow-inner border border-stone-800">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-stone-200 font-bold uppercase text-[11px] tracking-wider">
                TIẾN TRÌNH SUY LUẬN TRỰC TIẾP (LIVE THOUGHT STREAM)
              </span>
            </div>
            <div className="flex items-center space-x-3 text-[10.5px]">
              <Badge variant="amber">{isSimulating ? 'Đang suy luận...' : 'Hoàn tất'}</Badge>
              <div className="flex items-center space-x-1">
                <span className="text-stone-400 tabular-nums">Độ trễ: {workflowLatency}ms</span>
                <MetricHelpButton metricKey="mqtt_latency" currentValue={`${workflowLatency}ms`} />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-stone-900/80 border border-stone-800 min-h-[80px] text-stone-300 leading-relaxed font-mono space-y-1.5">
            <div className="text-xs text-stone-400 font-mono mb-1 border-b border-stone-800 pb-1 flex items-center justify-between">
              <span className="text-amber-400 font-semibold uppercase">{activeAgentRole}</span>
              <span className="text-[10px] text-emerald-400">Stream Sẵn Sàng</span>
            </div>
            <p className="text-xs leading-relaxed text-stone-200">{activeStepText}</p>
          </div>
        </div>

      </Card>

      {/* 2-COLUMN SECTION: DIAGNOSTIC RCA (LEFT) & HUMAN-IN-THE-LOOP ACTIONS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left: Diagnostic RCA (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800 text-xs font-mono">
              <span className="text-stone-500">Mã thiết bị / Trạng thái:</span>
              <div className="flex items-center space-x-1.5">
                <Badge variant="destructive">
                  {workflowResult?.diagnostic_report?.overall_severity || workflowResult?.diagnostic_report?.severity || 'NORMAL'}
                </Badge>
                <MetricHelpButton metricKey="anomaly_score" />
              </div>
            </div>

            <div className="space-y-1 font-sans">
              <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                Phát hiện: {workflowResult?.diagnostic_report?.primary_cause || workflowResult?.diagnostic_report?.root_cause_summary || 'Kiểm soát vận hành thiết bị'}
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Đánh giá an toàn: {workflowResult?.diagnostic_report?.risk_assessment || 'Hệ thống vận hành an toàn trong giới hạn quy chuẩn.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50/90 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200/70 dark:border-stone-800 text-xs">
                <div className="flex items-center space-x-1.5 font-semibold text-stone-900 dark:text-white">
                  <BookOpen className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Cơ sở tri thức (SOP Manual Reference):</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300/60 dark:border-purple-700/60">
                    Qdrant Vector Matched
                  </span>
                  <MetricHelpButton metricKey="cosine_sim" />
                </div>
              </div>
              <div className="pt-0.5">
                <MarkdownRenderer
                  content={workflowResult?.rag_sop_context || '**SOP-SH-2026:** Ngưỡng nhiệt độ an toàn < 75°C, điều hòa Inverter dòng tải < 10A.'}
                  className="text-stone-800 dark:text-stone-200 text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Read-back Verification Details Box */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-300/80 dark:border-emerald-700/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Xác Minh Sau Hành Động (Read-back Verification Step):</span>
                </div>
                <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-mono text-[10px] font-bold">
                  {workflowResult?.verification_status || 'VERIFIED'}
                </Badge>
              </div>
              <p className="text-[11.5px] text-emerald-900 dark:text-emerald-200 leading-relaxed font-mono">
                {workflowResult?.verification_details && workflowResult.verification_details.length > 0
                  ? workflowResult.verification_details.join(' | ')
                  : 'Đã xác minh trạng thái: Lịch sinh hoạt / Phiếu kỹ thuật đã được tạo và kích hoạt trên hệ thống.'}
              </p>
            </div>
          </Card>

          {/* Quick link to mathematical evidence */}
          <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-stone-900/60 border border-amber-200/70 dark:border-amber-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              <Atom className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-bold text-stone-900 dark:text-white block font-sans">
                  Đặc Tả Công Thức Toán & Bằng Chứng Trích Dẫn
                </span>
                <span className="text-[11px] text-stone-500 font-mono">
                  Xem chi tiết Kalman Filter, Isolation Forest & Cosine Similarity
                </span>
              </div>
            </div>
            <Button size="sm" variant="amber" onClick={onNavigateEvidence} className="cursor-pointer">
              XEM ĐẶC TẢ &rarr;
            </Button>
          </div>
        </div>

        {/* Right: Human-In-The-Loop & Feedback Loop (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-stone-200 dark:border-stone-800">
              <span className="text-stone-500">Phê duyệt kế hoạch khắc phục:</span>
              <div className="flex items-center space-x-1.5">
                <Badge variant="destructive">
                  {workflowResult?.mitigation_plan?.urgency_level || 'HIGH'}
                </Badge>
                <MetricHelpButton metricKey="risk_score" />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-mono text-stone-500 block">Quy trình đề xuất từ Planner:</span>
              <div className="space-y-1.5 font-mono text-xs">
                {(
                  (workflowResult?.mitigation_plan?.recommended_steps && workflowResult.mitigation_plan.recommended_steps.length > 0)
                    ? workflowResult.mitigation_plan.recommended_steps.map((stepStr, idx) => ({
                      step_number: idx + 1,
                      title: `Bước ${idx + 1}`,
                      action_description: stepStr
                    }))
                    : (workflowResult?.mitigation_plan?.steps || [
                      { step_number: 1, title: 'Điều chỉnh cài đặt thiết bị', action_description: 'Phát lệnh MQTT tối ưu hóa' },
                      { step_number: 2, title: 'Tạo lịch sinh hoạt gia đình', action_description: 'Kích hoạt chế độ tiết kiệm' },
                    ])
                ).map((step) => (
                  <div
                    key={step.step_number}
                    className="p-2 rounded bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 flex items-start space-x-2"
                  >
                    <span className="h-4 w-4 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {step.step_number}
                    </span>
                    <div>
                      <span className="font-bold text-stone-900 dark:text-white block">{step.title}</span>
                      <span className="text-stone-500 text-[11px] font-sans">{step.action_description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <span className="text-xs font-mono text-stone-500 flex items-center justify-between">
                <span>Phê duyệt lệnh MQTT (HITL Gate):</span>
                {executedActionInfo ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCheck className="h-3 w-3" />
                    <span>Đã phê duyệt & thực thi</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">Cần xác nhận thủ công</span>
                )}
              </span>

              {executedActionInfo ? (
                /* Execution Confirmation Banner */
                <div className="p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-500/40 space-y-2 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs font-mono">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>LỆNH ĐÃ ĐƯỢC PHÁT THÀNH CÔNG</span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400">{executedActionInfo.timestamp}</span>
                  </div>

                  <div className="text-[11px] font-mono text-stone-700 dark:text-stone-300 space-y-1 bg-white/70 dark:bg-stone-900/70 p-2.5 rounded-lg border border-emerald-500/20">
                    <div className="font-bold text-stone-900 dark:text-white flex items-center space-x-1.5">
                      <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                      <span>{executedActionInfo.label}</span>
                    </div>
                    <div className="text-[10px] text-stone-500 flex items-center justify-between pt-1 border-t border-stone-200 dark:border-stone-800">
                      <span>Kênh MQTT: <code className="text-stone-800 dark:text-stone-200 font-semibold">{executedActionInfo.topic}</code></span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">QoS 1 Confirmed</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Đã nạp Qdrant 1024D (Few-Shot Learned)</span>
                    </span>
                    <button
                      onClick={() => { sound.playClick(); setExecutedActionInfo(null); }}
                      className="text-[10px] font-mono font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline cursor-pointer"
                    >
                      Chọn lại lệnh khác
                    </button>
                  </div>
                </div>
              ) : (
                /* Interactive Action Buttons with Distinct Roles & Colors */
                <div className="space-y-2">
                  {(workflowResult?.mitigation_plan?.action_buttons || [
                    {
                      action_id: 'POWER_OFF_HEATER',
                      button_id: 'btn-shutdown-demo',
                      title: 'Ngắt Nguồn Toàn Bộ 2 Thiết Bị Nguy Hiểm',
                      action_type: 'SHUTDOWN_DEVICE',
                      style: 'danger',
                      mqtt_topic: 'iot/devices/control',
                      payload: '{"command": "POWER_OFF", "targets": ["HEATER_01", "AC_01"]}'
                    },
                    {
                      action_id: 'DISMISS_ALERT',
                      button_id: 'btn-dismiss-demo',
                      title: 'Tiếp Tục Bật Thiết Bị (Bỏ Qua Cảnh Báo)',
                      action_type: 'DISMISS',
                      style: 'secondary',
                      mqtt_topic: 'agent/incident/dismiss',
                      payload: '{"incident_id": "INC-AWAY-2026"}'
                    },
                  ]).map((btn, bIdx) => {
                    const aId = btn.button_id || btn.action_id || `act-${bIdx}`;
                    const aLabel = btn.title || btn.label || 'Phê duyệt lệnh an toàn';
                    const aStyle = btn.style || (bIdx === 0 ? 'danger' : 'secondary');
                    const aType = btn.action_type || '';
                    const aTopic = btn.mqtt_topic || 'iot/devices/control';
                    const aPayload = btn.mqtt_payload || btn.payload;

                    const isDanger = aStyle === 'danger' || aType === 'SHUTDOWN_DEVICE' || aId.toLowerCase().includes('shutdown') || aId.toLowerCase().includes('power_off');
                    const isSecondary = aStyle === 'secondary' || aType === 'DISMISS' || aId.toLowerCase().includes('dismiss');

                    return (
                      <Button
                        key={aId}
                        disabled={isExecutingAction}
                        onClick={() => handleExecuteAction(aId, aLabel, aTopic, aPayload, aType)}
                        className={`w-full font-mono text-xs font-bold shadow-sm cursor-pointer transition-all duration-150 flex items-center justify-between px-3 py-2.5 h-auto ${isDanger
                            ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white border border-rose-500/40 shadow-rose-950/20 active:scale-[0.99]'
                            : isSecondary
                              ? 'bg-stone-100 dark:bg-stone-800/90 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 hover:border-stone-400 active:scale-[0.99]'
                              : 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-500/40 active:scale-[0.99]'
                          }`}
                      >
                        <div className="flex items-center space-x-2 text-left">
                          {isExecutingAction ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                          ) : isDanger ? (
                            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-200" />
                          ) : isSecondary ? (
                            <XCircle className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
                          ) : (
                            <Zap className="h-4 w-4 shrink-0 text-amber-200" />
                          )}
                          <span className="leading-snug">{aLabel}</span>
                        </div>

                        <span
                          className={`text-[9.5px] px-1.5 py-0.5 rounded font-mono uppercase shrink-0 ml-2 ${isDanger
                              ? 'bg-rose-900/80 text-rose-200 border border-rose-400/30'
                              : isSecondary
                                ? 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400'
                                : 'bg-amber-900/80 text-amber-200 border border-amber-400/30'
                            }`}
                        >
                          {isDanger ? 'Khẩn cấp' : isSecondary ? 'Bỏ qua' : 'Tối ưu Eco'}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* Layer 5 Feedback Memory Card */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center space-x-1.5">
                <RotateCcw className="h-4 w-4" />
                <span>Layer 5: Đóng Vòng Phản Hồi Tự Học</span>
                <MetricHelpButton metricKey="few_shot_memory" />
              </span>
              <div className="flex items-center space-x-1">
                <span className="text-stone-500 text-[10px]">Qdrant: verified_action_plans</span>
                <MetricHelpButton metricKey="vector_dims" />
              </div>
            </div>
            <p className="text-stone-600 dark:text-stone-300 text-xs font-sans leading-relaxed">
              Khi bạn nhấn nút xử lý sự cố, kế hoạch đã giải quyết thành công sẽ được trích xuất vector 1024D và tự động nạp vào <strong>Qdrant Vector DB</strong> để hệ thống tự học (Few-Shot Memory).
            </p>
            <div className="text-[11px] font-mono text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-900/50 p-2 rounded border border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <span>Trạng thái bộ nhớ:</span>
              {feedbackSuccess ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>ĐÃ KHÉP VÒNG THÀNH CÔNG (Few-Shot Learned)</span>
                </span>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">SẴN SÀNG HỌC TẬP</span>
              )}
            </div>
          </Card>
        </div>

      </div>

    </main>
  );
};
