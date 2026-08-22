import React, { useState, useEffect, useRef } from 'react';
import { 
  HelpCircle, 
  X, 
  Flame, 
  Wind, 
  Atom, 
  Activity, 
  BookOpen, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Info,
  ExternalLink,
  Sliders,
  Cpu
} from 'lucide-react';
import katex from 'katex';
import { getMetric, METRIC_CATEGORIES } from '@/constants/metricsRegistry';
import { MetricDefinition, MetricCategory } from '@/types/metrics';
import { sound } from '@/lib/sound';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MetricHelpButtonProps {
  metricKey: string;
  currentValue?: number | string | boolean;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'subtle' | 'solid' | 'ghost';
  title?: string;
}

const CategoryIcon: React.FC<{ category: MetricCategory; className?: string }> = ({ category, className = 'h-4 w-4' }) => {
  switch (category) {
    case 'thermal_power':
      return <Flame className={className} />;
    case 'environment_air':
      return <Wind className={className} />;
    case 'ai_math':
      return <Atom className={className} />;
    case 'iot_network':
      return <Activity className={className} />;
    case 'rag_knowledge':
      return <BookOpen className={className} />;
    case 'system_safety':
      return <ShieldCheck className={className} />;
    default:
      return <Info className={className} />;
  }
};

const LatexRenderer: React.FC<{ math: string; block?: boolean }> = ({ math, block = false }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      katex.render(math, containerRef.current, {
        displayMode: block,
        throwOnError: false,
      });
    }
  }, [math, block]);

  return <span ref={containerRef} />;
};

export const MetricHelpButton: React.FC<MetricHelpButtonProps> = ({
  metricKey,
  currentValue,
  className = '',
  size = 'xs',
  variant = 'subtle',
  title,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const metric: MetricDefinition | undefined = getMetric(metricKey);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    setIsOpen(true);
  };

  const handleClose = () => {
    sound.playClick();
    setIsOpen(false);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
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
  }, [isOpen]);

  if (!metric) {
    return null;
  }

  const categoryInfo = METRIC_CATEGORIES[metric.category];

  // Size styling
  const sizeClass = 
    size === 'xs' ? 'h-4 w-4 text-[10px]' :
    size === 'sm' ? 'h-5 w-5 text-xs' : 'h-6 w-6 text-xs';

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title={title || `Tìm hiểu ý nghĩa & công thức chỉ số ${metric.name}`}
        aria-label={`Giải thích chỉ số ${metric.name}`}
        className={`inline-flex items-center justify-center rounded-full font-mono font-bold transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 select-none ${sizeClass} ${
          variant === 'subtle'
            ? 'bg-amber-500/10 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-2xs hover:scale-110 active:scale-95'
            : variant === 'solid'
            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs hover:scale-105 active:scale-95'
            : 'text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800'
        } ${className}`}
      >
        <span className="leading-none select-none font-black">?</span>
      </button>

      {/* POPUP MODAL DIALOG */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={handleClose}
        >
          <div
            className="bg-[#FDFBF7] dark:bg-[#1C1917] border border-stone-200 dark:border-stone-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-stone-900 dark:text-stone-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-start justify-between gap-3 bg-white dark:bg-stone-900/90 shrink-0">
              <div className="flex items-start space-x-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center shrink-0 shadow-xs">
                  <CategoryIcon category={metric.category} className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white tracking-tight">
                      {metric.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${categoryInfo.badgeClass}`}>
                      {categoryInfo.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-stone-500 dark:text-stone-400">
                    <span>Mã định danh: <strong className="text-amber-700 dark:text-amber-400">{metric.key}</strong></span>
                    <span>•</span>
                    <span>Đơn vị: <strong className="text-stone-700 dark:text-stone-300">{metric.unit} ({metric.unitSymbol})</strong></span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title="Đóng cửa sổ giải thích (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 font-sans text-xs sm:text-sm leading-relaxed terminal-scroll">
              
              {/* Live Value Card if passed */}
              {currentValue !== undefined && (
                <div className="p-3 bg-stone-100/70 dark:bg-stone-900/60 rounded-xl border border-stone-200/80 dark:border-stone-800 flex items-center justify-between font-mono">
                  <div className="flex items-center space-x-2 text-stone-600 dark:text-stone-400 text-xs">
                    <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Giá trị đo thời gian thực hiện tại:</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold font-display text-stone-900 dark:text-white">
                    {typeof currentValue === 'boolean' 
                      ? (currentValue ? 'CÓ NGƯỜI (TRUE)' : 'VẮNG NHÀ (FALSE)') 
                      : `${currentValue} ${metric.unitSymbol}`}
                  </div>
                </div>
              )}

              {/* 1. Meaning in Plain Words */}
              <div className="space-y-1.5">
                <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Ý Nghĩa & Mục Đích Giám Sát:</span>
                </div>
                <p className="text-stone-700 dark:text-stone-300 bg-white/80 dark:bg-stone-900/50 p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800 text-xs leading-relaxed">
                  {metric.detailedExplanation || metric.description}
                </p>
              </div>

              {/* 2. Mathematical Formula / LaTeX */}
              {(metric.formulaLatex || metric.formulaText) && (
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                    <Atom className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>Công Thức Toán Học & Xử Lý Tín Hiệu:</span>
                  </div>
                  <div className="p-3.5 bg-stone-900 text-stone-100 rounded-xl border border-stone-800 font-mono text-xs overflow-x-auto shadow-inner space-y-2">
                    {metric.formulaLatex && (
                      <div className="text-amber-300 py-1 text-center sm:text-left">
                        <LatexRenderer math={metric.formulaLatex} block />
                      </div>
                    )}
                    {metric.formulaText && (
                      <div className="text-[11px] text-stone-400 border-t border-stone-800 pt-1.5">
                        <span className="text-stone-500">Mã logic: </span>
                        <code className="text-emerald-400">{metric.formulaText}</code>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Safety Ranges & Thresholds Matrix */}
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                  <Sliders className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Bảng Ngưỡng Định Mức An Toàn & Cảnh Báo:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
                  
                  {/* Normal Box */}
                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 space-y-1">
                    <div className="flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>BÌNH THƯỜNG (AN TOÀN)</span>
                    </div>
                    <p className="text-[11px] font-sans text-stone-700 dark:text-stone-300 leading-snug">
                      {metric.normalRange.description}
                    </p>
                  </div>

                  {/* Warning Box */}
                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 space-y-1">
                    <div className="flex items-center space-x-1 text-amber-700 dark:text-amber-400 font-bold text-[11px]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>CẢNH BÁO (THEO DÕI)</span>
                    </div>
                    <p className="text-[11px] font-sans text-stone-700 dark:text-stone-300 leading-snug">
                      {metric.warningThreshold?.description || 'Các giá trị tiệm cận ngưỡng cận trên định mức.'}
                    </p>
                  </div>

                  {/* Danger Box */}
                  <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 space-y-1">
                    <div className="flex items-center space-x-1 text-rose-700 dark:text-rose-400 font-bold text-[11px]">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>NGUY HIỂM (CAN THIỆP)</span>
                    </div>
                    <p className="text-[11px] font-sans text-stone-700 dark:text-stone-300 leading-snug">
                      {metric.dangerThreshold?.description || 'Vượt quá ngưỡng chịu tải, nguy cơ chập cháy khẩn cấp.'}
                    </p>
                  </div>

                </div>
              </div>

              {/* 4. Why it Matters & Practical Advice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                
                <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-1">
                  <div className="flex items-center space-x-1 text-xs font-mono font-bold text-amber-800 dark:text-amber-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Vì Sao Chỉ Số Này Quan Trọng?</span>
                  </div>
                  <p className="text-xs font-sans text-stone-700 dark:text-stone-300 leading-relaxed">
                    {metric.whyItMatters}
                  </p>
                </div>

                <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/20 space-y-1">
                  <div className="flex items-center space-x-1 text-xs font-mono font-bold text-indigo-800 dark:text-indigo-300">
                    <Cpu className="h-3.5 w-3.5" />
                    <span>Khuyến Nghị Hành Động:</span>
                  </div>
                  <p className="text-xs font-sans text-stone-700 dark:text-stone-300 leading-relaxed">
                    {metric.actionAdvice || 'Khi chỉ số vượt ngưỡng cảnh báo, kiểm tra trực tiếp thiết bị và xác nhận kế hoạch can thiệp trên Dashboard.'}
                  </p>
                </div>

              </div>

              {/* 5. Standards & Hardware Reference */}
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-stone-500 dark:text-stone-400">
                {metric.standardReference && (
                  <div>
                    Tiêu chuẩn đối chiếu: <strong className="text-stone-700 dark:text-stone-300">{metric.standardReference}</strong>
                  </div>
                )}
                {metric.sensorSource && (
                  <div>
                    Nguồn cảm biến: <span className="text-stone-700 dark:text-stone-300">{metric.sensorSource}</span>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-mono text-stone-500">
                Veteran Home Domain Standards • L4 Multi-Agent Operations
              </span>
              <Button size="sm" variant="outline" onClick={handleClose} className="font-mono text-xs">
                ĐÓNG (ESC)
              </Button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
