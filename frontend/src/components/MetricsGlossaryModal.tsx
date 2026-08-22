import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  X, 
  Flame, 
  Wind, 
  Atom, 
  Activity, 
  ShieldCheck, 
  ChevronRight,
  Info,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { METRICS_REGISTRY, METRIC_CATEGORIES, searchMetrics, getMetricsByCategory } from '@/constants/metricsRegistry';
import { MetricDefinition, MetricCategory } from '@/types/metrics';
import { MetricHelpButton } from '@/components/MetricHelpButton';
import { sound } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MetricsGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedKey?: string;
}

export const MetricsGlossaryModal: React.FC<MetricsGlossaryModalProps> = ({
  isOpen,
  onClose,
  initialSelectedKey,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | 'all'>('all');
  const [selectedMetricKey, setSelectedMetricKey] = useState<string>(initialSelectedKey || 'temp_c');

  useEffect(() => {
    if (initialSelectedKey) {
      setSelectedMetricKey(initialSelectedKey);
    }
  }, [initialSelectedKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter metrics
  let displayedMetrics = searchQuery ? searchMetrics(searchQuery) : Object.values(METRICS_REGISTRY);
  if (selectedCategory !== 'all') {
    displayedMetrics = displayedMetrics.filter((m) => m.category === selectedCategory);
  }

  const selectedMetric = METRICS_REGISTRY[selectedMetricKey] || displayedMetrics[0] || METRICS_REGISTRY['temp_c'];

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-[#FDFBF7] dark:bg-[#1C1917] border border-stone-200 dark:border-stone-800 rounded-2xl max-w-5xl w-full h-[88vh] max-h-[800px] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-stone-900 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4 bg-white dark:bg-stone-900/90 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white tracking-tight">
                  Từ Điển Chỉ Số & Quy Chuẩn Đo Lường Veteran Home
                </h2>
                <Badge variant="amber">KNOWLEDGE BASE</Badge>
              </div>
              <p className="text-xs text-stone-500 font-mono">
                Tra cứu 100% định nghĩa, công thức toán, đơn vị và ngưỡng an toàn của toàn bộ hệ thống
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Đóng (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-3 bg-stone-50 dark:bg-stone-900/50 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          <div className="relative flex-1 w-full">
            <Search className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên chỉ số, công thức, đơn vị (°C, W, A, AQI, Kalman, Cosine)..."
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-stone-900 dark:text-white"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => { sound.playClick(); setSelectedCategory('all'); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
              }`}
            >
              Tất cả ({Object.keys(METRICS_REGISTRY).length})
            </button>
            {(Object.keys(METRIC_CATEGORIES) as MetricCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => { sound.playClick(); setSelectedCategory(cat); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
                }`}
              >
                {METRIC_CATEGORIES[cat].name.split('&')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Body: Metric List Left & Metric Detail Right */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Metric Item List (5 cols) */}
          <div className="md:col-span-5 border-r border-stone-200 dark:border-stone-800 overflow-y-auto p-2 space-y-1 terminal-scroll bg-stone-50/50 dark:bg-stone-950/30">
            {displayedMetrics.length === 0 ? (
              <div className="p-8 text-center text-stone-400 font-mono text-xs">
                Không tìm thấy chỉ số phù hợp với từ khóa "{searchQuery}".
              </div>
            ) : (
              displayedMetrics.map((m) => {
                const isSelected = m.key === selectedMetric?.key;
                const cat = METRIC_CATEGORIES[m.category];
                return (
                  <button
                    key={m.key}
                    onClick={() => { sound.playClick(); setSelectedMetricKey(m.key); }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-white dark:bg-stone-900 border-amber-500 shadow-sm ring-1 ring-amber-500/20'
                        : 'border-transparent hover:bg-white/60 dark:hover:bg-stone-900/50 hover:border-stone-200 dark:hover:border-stone-800'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-stone-900 dark:text-white truncate font-sans">
                          {m.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[10.5px] font-mono text-stone-500 mt-0.5">
                        <span className="text-amber-700 dark:text-amber-400 font-bold">{m.key}</span>
                        <span>•</span>
                        <span>{m.unitSymbol}</span>
                      </div>
                    </div>

                    <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? 'text-amber-600 translate-x-0.5' : 'text-stone-400'}`} />
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Metric Full Detail (7 cols) */}
          <div className="md:col-span-7 overflow-y-auto p-4 sm:p-6 space-y-4 terminal-scroll bg-white dark:bg-stone-900">
            {selectedMetric ? (
              <div className="space-y-4">
                
                {/* Metric Title Box */}
                <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-display font-extrabold text-lg sm:text-xl text-stone-900 dark:text-white">
                      {selectedMetric.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${METRIC_CATEGORIES[selectedMetric.category].badgeClass}`}>
                      {METRIC_CATEGORIES[selectedMetric.category].name}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-stone-500">
                    <span>Mã định danh: <strong className="text-amber-700 dark:text-amber-400">{selectedMetric.key}</strong></span>
                    <span>•</span>
                    <span>Đơn vị: <strong className="text-stone-800 dark:text-stone-200">{selectedMetric.unit} ({selectedMetric.unitSymbol})</strong></span>
                  </div>
                </div>

                {/* Plain meaning */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300 uppercase flex items-center space-x-1.5">
                    <Info className="h-4 w-4 text-amber-600" />
                    <span>Diễn Giải Ý Nghĩa Kỹ Thuật:</span>
                  </h4>
                  <p className="text-xs leading-relaxed text-stone-700 dark:text-stone-300 p-3 bg-stone-50 dark:bg-stone-950/60 rounded-xl border border-stone-200/80 dark:border-stone-800">
                    {selectedMetric.detailedExplanation || selectedMetric.description}
                  </p>
                </div>

                {/* Mathematical formula */}
                {(selectedMetric.formulaLatex || selectedMetric.formulaText) && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300 uppercase flex items-center space-x-1.5">
                      <Atom className="h-4 w-4 text-purple-600" />
                      <span>Công Thức Tính Toán & Logic:</span>
                    </h4>
                    <div className="p-3 bg-stone-950 text-amber-300 rounded-xl border border-stone-800 font-mono text-xs overflow-x-auto shadow-inner">
                      <code>{selectedMetric.formulaText || selectedMetric.formulaLatex}</code>
                    </div>
                  </div>
                )}

                {/* Safety Ranges Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300 uppercase flex items-center space-x-1.5">
                    <Sliders className="h-4 w-4 text-emerald-600" />
                    <span>Định Mức Vận Hành & Ngưỡng An Toàn:</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-1">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-[10.5px] block">BÌNH THƯỜNG</span>
                      <p className="font-sans text-[11px] text-stone-700 dark:text-stone-300 leading-snug">
                        {selectedMetric.normalRange.description}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-1">
                      <span className="font-bold text-amber-700 dark:text-amber-400 text-[10.5px] block">CẢNH BÁO</span>
                      <p className="font-sans text-[11px] text-stone-700 dark:text-stone-300 leading-snug">
                        {selectedMetric.warningThreshold?.description || 'Tiệm cận ngưỡng cao'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-1">
                      <span className="font-bold text-rose-700 dark:text-rose-400 text-[10.5px] block">NGUY HIỂM</span>
                      <p className="font-sans text-[11px] text-stone-700 dark:text-stone-300 leading-snug">
                        {selectedMetric.dangerThreshold?.description || 'Vượt tải nguy hiểm'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Why it Matters */}
                <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-amber-800 dark:text-amber-300">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Tầm Quan Trọng & An Toàn:</span>
                  </div>
                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-sans">
                    {selectedMetric.whyItMatters}
                  </p>
                </div>

                {/* Standards & Sensors */}
                <div className="pt-2 border-t border-stone-200 dark:border-stone-800 text-[11px] font-mono text-stone-500 space-y-1">
                  {selectedMetric.standardReference && (
                    <div>Tiêu chuẩn viện dẫn: <strong className="text-stone-700 dark:text-stone-300">{selectedMetric.standardReference}</strong></div>
                  )}
                  {selectedMetric.sensorSource && (
                    <div>Cảm biến thu thập: <span className="text-stone-700 dark:text-stone-300">{selectedMetric.sensorSource}</span></div>
                  )}
                </div>

              </div>
            ) : (
              <div className="p-12 text-center text-stone-400 font-mono text-xs">
                Chọn một chỉ số ở cột bên trái để xem đặc tả chi tiết.
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 flex items-center justify-between shrink-0">
          <span className="text-xs font-mono text-stone-500">
            Veteran Home Domain Standards v2.5 • Chuẩn hóa 100% không Magic Numbers
          </span>
          <Button size="sm" variant="amber" onClick={onClose} className="font-mono text-xs">
            ĐÓNG (ESC)
          </Button>
        </div>

      </div>
    </div>
  );
};
