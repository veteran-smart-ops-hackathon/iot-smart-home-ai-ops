/**
 * Aegis-IoT Core TypeScript Type Definitions
 */

export * from './metrics';

export type RoomId = 'AC_01' | 'SENSOR_01' | 'METER_01' | 'CO2_01' | 'HEATER_01' | 'LIGHT_01';

export interface RoomMeta {
  id: RoomId;
  title: string;
  subTitle: string;
  deviceId: string;
  location: string;
  description: string;
  icon: string;
  nominalTemp: number;
  nominalPower: number;
}

export interface ZoneTelemetry {
  device_id: string;
  room: string;
  metrics: {
    temp_c?: number;
    kalman_temp_c?: number;
    humidity_pct?: number;
    power_watts?: number;
    current_a?: number;
    voltage_v?: number;
    co2_ppm?: number;
    lux?: number;
  };
  anomaly_score: number;
  status: 'NORMAL' | 'ANOMALY' | 'CRITICAL';
  timestamp: string;
}

export interface MqttBroadcastPayload {
  type: string;
  timestamp: string;
  time_str: string;
  broker_stats: {
    broker: string;
    throughput_msg_per_sec: number;
    latency_ms: number;
    active_subscriptions: number;
  };
  zones: Record<RoomId, ZoneTelemetry>;
}

export interface ActionButtonDef {
  button_id?: string;
  action_id?: string;
  title?: string;
  label?: string;
  action_type?: string;
  target_devices?: string[];
  mqtt_topic: string;
  mqtt_payload?: Record<string, any>;
  payload?: string;
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  style?: string;
}

export interface MitigationPlanStep {
  step_number?: number;
  title?: string;
  action_description?: string;
}

export interface DiagnosticReport {
  incident_id?: string;
  primary_cause?: string;
  root_cause_summary?: string;
  severity?: 'NORMAL' | 'WARNING' | 'CRITICAL';
  overall_severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_assessment?: string;
  affected_components?: string[];
  affected_devices?: Array<{
    device_id: string;
    device_type: string;
    location: string;
    fault_type: string;
    evidence?: string[];
  }>;
  home_occupied?: boolean;
  confidence_score?: number;
}

export interface MitigationPlan {
  incident_id?: string;
  title?: string;
  explanation?: string;
  summary?: string;
  urgency_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  steps?: MitigationPlanStep[];
  recommended_steps?: string[];
  action_buttons?: ActionButtonDef[];
  requires_human_approval?: boolean;
  estimated_energy_saved_watts?: number;
}

export interface AnomalySimulationResult {
  scenario: string;
  room: string;
  detected_at: string;
  diagnostic_report: DiagnosticReport;
  mitigation_plan: MitigationPlan;
  rag_sop_context: string;
  workflow_latency_ms: number;
  verification_status?: string;
  verification_details?: Array<{
    action_type?: string;
    target_id?: string;
    verified?: boolean;
    verification_readback?: string;
    timestamp?: string;
    [key: string]: any;
  }>;
  schedule_created?: Record<string, any>;
  maintenance_ticket?: Record<string, any>;
  agent_traces: Array<{
    node: string;
    agent: string;
    action: string;
    latency_ms: number;
    details: Record<string, any>;
  }>;
}

export interface RagDocument {
  doc_id: string;
  filename: string;
  total_pages: number;
  total_chunks: number;
  total_chars: number;
  uploaded_at: string;
  is_active: boolean;
  is_sample?: boolean;
}

export interface RagCitation {
  chunk_id: string;
  filename: string;
  page_number: number;
  similarity_score: number;
  text_snippet: string;
  full_text?: string;
}

export interface RagThoughtStep {
  step_number: number;
  title: string;
  detail: string;
  status: 'completed' | 'in_progress' | 'pending';
  latency_ms?: number;
}

export interface RagChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model_used?: string;
  confidence_score?: number;
  latency_ms?: number;
  citations?: RagCitation[];
  chain_of_thought?: RagThoughtStep[];
  thought_process?: string;
  is_loading?: boolean;
}

export type UserRole = 'homeowner' | 'technician';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  title: string;
  description: string;
}

export interface HomeownerActionProposal {
  actionId: string;
  title: string;
  description: string;
  targetDevice: RoomId;
  targetDeviceName: string;
  command: Record<string, any>;
  mqttTopic: string;
  estimatedEnergySavedWatts?: number;
  estimatedCostSavedVnd?: number;
  status: 'pending' | 'applied' | 'rejected';
}

export interface HomeownerChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  proposal?: HomeownerActionProposal;
  isLoading?: boolean;
}

export type QuickSceneId = 'eco' | 'away' | 'night' | 'comfort';

export interface QuickSceneDef {
  id: QuickSceneId;
  name: string;
  description: string;
  icon: string;
  color: string;
  targetStates: Partial<Record<RoomId, string>>;
}

export interface EnergyBillingEstimate {
  currentTotalWatts: number;
  hourlyCostVnd: number;
  dailyCostVnd: number;
  monthlyCostVnd: number;
  savingsPercent: number;
  tierDescription: string;
}

