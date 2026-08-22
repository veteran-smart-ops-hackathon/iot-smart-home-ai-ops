import React from 'react';
import { Phone, Mail, ShieldCheck, HardHat } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const Footer: React.FC = () => {
  const { role, switchRole } = useAuth();

  if (role === 'homeowner') {
    return (
      <footer className="mt-auto border-t border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs font-sans text-stone-600 dark:text-stone-300 gap-2.5 sm:gap-4">
          
          {/* Trạng Thái An Toàn & KTV Phụ Trách */}
          <div className="flex items-center gap-2 text-center sm:text-left flex-wrap justify-center sm:justify-start">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] sm:text-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Căn hộ đang được bảo vệ 24/7</span>
            </span>
            <span className="hidden md:inline text-stone-400">•</span>
            <span className="text-stone-600 dark:text-stone-300 text-[11px] sm:text-xs">
              KTV phụ trách: <strong>Nguyễn Văn Minh Tâm</strong>
            </span>
          </div>

          {/* Hotline & Email Liên Hệ Kỹ Thuật Viên */}
          <div className="flex items-center flex-wrap justify-center gap-2 sm:gap-3">
            <a 
              href="tel:0383371859"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-bold text-xs transition-all active:scale-95 shadow-2xs"
            >
              <Phone className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Hotline: <strong className="font-mono">0383371859</strong></span>
            </a>

            <a 
              href="mailto:nvmtamm@gmail.com"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-mono transition-all active:scale-95"
            >
              <Mail className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
              <span>nvmtamm@gmail.com</span>
            </a>

            <button
              type="button"
              onClick={() => switchRole('technician')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-[11px] font-medium transition-all active:scale-95 cursor-pointer hover:bg-amber-600 dark:hover:bg-amber-400"
              title="Chuyển sang màn hình Kỹ thuật viên để xem chi tiết chuyên sâu"
            >
              <HardHat className="h-3 w-3" />
              <span>Giao Diện KTV</span>
            </button>
          </div>
        </div>
      </footer>
    );
  }

  // Footer Kỹ Thuật Viên (Hiển thị chi tiết hạ tầng streaming)
  return (
    <footer className="mt-auto border-t border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-stone-600 dark:text-stone-400 gap-2">
        <div className="flex items-center flex-wrap justify-center sm:justify-start gap-1.5 sm:gap-2 text-[11px]">
          <span>KTV: <strong>Nguyễn Văn Minh Tâm</strong> (nvmtamm@gmail.com)</span>
          <span>•</span>
          <span>Hạ tầng:</span>
          <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold rounded">
            MQTT 1883
          </span>
          <span className="px-1.5 py-0.5 bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 font-bold rounded">
            RabbitMQ 5672
          </span>
          <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 font-bold rounded">
            TimescaleDB 5432
          </span>
        </div>
        
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="flex items-center space-x-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 glow-dot-emerald inline-block"></span>
            <span>Hệ Thống Hoạt Động Bình Thường</span>
          </span>
        </div>
      </div>
    </footer>
  );
};
