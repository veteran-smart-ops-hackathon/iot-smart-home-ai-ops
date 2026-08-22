export type MetricCategory = 
  | 'thermal_power' 
  | 'environment_air' 
  | 'ai_math' 
  | 'iot_network' 
  | 'rag_knowledge' 
  | 'system_safety';

export interface MetricRange {
  min?: number;
  max?: number;
  description: string;
}

export interface MetricThreshold {
  value?: number | string;
  description: string;
}

export interface MetricDefinition {
  key: string;
  name: string;
  shortName: string;
  category: MetricCategory;
  unit: string;
  unitSymbol: string;
  formulaText?: string;
  formulaLatex?: string;
  description: string;
  detailedExplanation: string;
  normalRange: MetricRange;
  warningThreshold?: MetricThreshold;
  dangerThreshold?: MetricThreshold;
  whyItMatters: string;
  standardReference?: string;
  sensorSource?: string;
  actionAdvice?: string;
}

export interface CategoryInfo {
  id: MetricCategory;
  name: string;
  description: string;
  iconName: string;
  badgeClass: string;
}
