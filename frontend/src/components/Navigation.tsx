import React, { useState } from 'react';
import { 
  Home, 
  GitFork, 
  BookOpen, 
  Atom, 
  BellRing, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX,
  User,
  Wrench,
  ArrowRightLeft
} from 'lucide-react';
import { sound } from '@/lib/sound';
import { MetricsGlossaryModal } from '@/components/MetricsGlossaryModal';
import { useAuth } from '@/context/AuthContext';

export type ActiveTab = 'dashboard' | 'agentic' | 'rag' | 'evidence' | 'alerts';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  isAudioOn: boolean;
  setIsAudioOn: (audio: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  setIsDark,
  isAudioOn,
  setIsAudioOn,
}) => {
  const { user, role, switchRole, setIsLoginModalOpen } = useAuth();
  const [isGlossaryOpen, setIsGlossaryOpen] = useState<boolean>(false);

  const handleTabChange = (tab: ActiveTab) => {
    sound.playClick();
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const path = tab === 'dashboard' ? '/' : `/${tab}`;
      if (window.location.pathname !== path) {
        window.history.pushState({ tab }, '', path);
      }
    }
  };

  const toggleTheme = () => {
    sound.playClick();
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('color-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('color-theme', 'light');
    }
  };

  const toggleAudio = () => {
    const next = !isAudioOn;
    setIsAudioOn(next);
    sound.enabled = next;
    if (next) sound.playClick();
  };

  const togglePersona = () => {
    sound.playClick();
    const nextRole = role === 'homeowner' ? 'technician' : 'homeowner';
    switchRole(nextRole);
  };

  const tabItems: { 
    id: ActiveTab; 
    label: string; 
    shortLabel: string;
    icon: React.FC<{ className?: string }>; 
    activeColor: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'GIÁM SÁT STREAM',
      shortLabel: 'Giám Sát',
      icon: Home,
      activeColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'agentic',
      label: 'MULTI-AGENT',
      shortLabel: 'Agent',
      icon: GitFork,
      activeColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'rag',
      label: 'RAG & SOP',
      shortLabel: 'RAG/SOP',
      icon: BookOpen,
      activeColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      id: 'evidence',
      label: 'BẰNG CHỨNG TOÁN',
      shortLabel: 'Toán ML',
      icon: Atom,
      activeColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'alerts',
      label: 'CẢNH BÁO EMAIL',
      shortLabel: 'Cảnh Báo',
      icon: BellRing,
      activeColor: 'text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <header className="sticky top-1.5 sm:top-3 z-50 px-2 sm:px-6 max-w-7xl mx-auto w-full mb-2 sm:mb-3 select-none">
      <div className="warm-nav-pill rounded-2xl p-1.5 sm:p-2.5 shadow-[0_4px_24px_-2px_rgba(28,25,23,0.06),0_1px_2px_rgba(28,25,23,0.04)] dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)] flex flex-col gap-1.5 sm:gap-2">
        
        {/* ========================================================================= */}
        {/* TẦNG 1: BRAND LOGO & BỘ NÚT TIỆN ÍCH                                     */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full px-0.5 sm:px-1">
          
          {/* Brand Logo & Track Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => handleTabChange('dashboard')}
              className="flex items-center gap-1.5 sm:gap-2.5 group text-left cursor-pointer focus:outline-none shrink-0"
              title="Về Trang Chủ Dashboard"
            >
              <div className="h-7.5 w-7.5 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white flex items-center justify-center shadow-[0_2px_10px_rgba(217,119,6,0.35)] ring-1 ring-amber-400/40 dark:ring-amber-400/30 shrink-0 group-hover:scale-105 transition-transform">
                <Home className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="font-display font-bold text-xs sm:text-base tracking-tight text-stone-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  VETERAN<span className="text-amber-600 dark:text-amber-400 font-extrabold">·HOME</span>
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Single-row Tabs (Hiển thị khi màn hình lớn > xl) */}
          {role === 'technician' && (
            <nav className="hidden xl:flex items-center tactile-tab-track p-1 rounded-xl shadow-inner">
              {tabItems.map(({ id, label, icon: Icon, activeColor }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleTabChange(id)}
                    className={`relative flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-mono transition-all duration-200 select-none cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-white dark:bg-stone-800 text-stone-950 dark:text-white font-extrabold shadow-md ring-1 ring-stone-900/10 dark:ring-white/20 border border-stone-200/90 dark:border-stone-700/90 scale-[1.02]'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-100 hover:bg-white/70 dark:hover:bg-stone-800/70 font-semibold'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? activeColor : 'text-stone-500 dark:text-stone-400'}`} />
                    <span className="tracking-tight">{label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Persona Switcher & Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            
            {/* Persona Switcher */}
            <button
              onClick={togglePersona}
              title={`Chuyển sang ${role === 'homeowner' ? 'Kỹ Thuật Viên' : 'Chủ Hộ'}`}
              className={`h-7.5 sm:h-8.5 px-2 sm:px-3 rounded-xl border text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1 sm:gap-1.5 transition-all duration-200 active:scale-95 shadow-xs cursor-pointer shrink-0 ${
                role === 'homeowner'
                  ? 'bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/70 border-indigo-300 dark:border-indigo-700/80 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20'
                  : 'bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/60 dark:hover:bg-amber-900/70 border-amber-300 dark:border-amber-700/80 text-amber-800 dark:text-amber-300 ring-1 ring-amber-500/20'
              }`}
            >
              {role === 'homeowner' ? (
                <>
                  <Wrench className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>KTV</span>
                </>
              ) : (
                <>
                  <Home className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>CHỦ HỘ</span>
                </>
              )}
              <ArrowRightLeft className="h-2.5 w-2.5 opacity-70 shrink-0" />
            </button>

            {/* Login / Switch Account Modal Trigger */}
            <button
              onClick={() => {
                sound.playClick();
                setIsLoginModalOpen(true);
              }}
              title="Đăng nhập / Đổi tài khoản Persona"
              className="h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 rounded-xl bg-stone-100/90 dark:bg-stone-900/90 border border-stone-300/80 dark:border-stone-700/80 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 shadow-2xs cursor-pointer shrink-0"
            >
              <User className="h-3.5 w-3.5" />
            </button>

            {/* Glossary Help Button (Technician view) */}
            {role === 'technician' && (
              <button
                onClick={() => {
                  sound.playClick();
                  setIsGlossaryOpen(true);
                }}
                title="Tra cứu từ điển chỉ số & công thức toán học"
                className="h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/70 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-2xs cursor-pointer shrink-0"
              >
                <span className="font-mono font-bold text-xs">?</span>
              </button>
            )}

            {/* Sound Toggle */}
            <button
              onClick={toggleAudio}
              title={isAudioOn ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
              className="h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 rounded-xl bg-stone-100/90 dark:bg-stone-900/90 border border-stone-300/80 dark:border-stone-700/80 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 shadow-2xs cursor-pointer shrink-0"
            >
              {isAudioOn ? (
                <Volume2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-stone-400" />
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title="Chuyển chế độ Sáng / Tối"
              className="h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 rounded-xl bg-stone-100/90 dark:bg-stone-900/90 border border-stone-300/80 dark:border-stone-700/80 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 shadow-2xs cursor-pointer shrink-0"
            >
              {isDark ? (
                <Moon className="h-3.5 w-3.5 text-amber-300" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TẦNG 2: 5 TAB ĐIỀU HƯỚNG KỸ THUẬT VIÊN Ở ĐẦU TRANG                        */}
        {/* Dàn đều 5 cột cân đối, không có thanh cuộn xám, 1-chạm đổi trang tức thì!  */}
        {/* ========================================================================= */}
        {role === 'technician' && (
          <div className="xl:hidden w-full pt-1 border-t border-stone-200/80 dark:border-stone-800/80">
            <nav className="grid grid-cols-5 gap-0.5 sm:gap-1 tactile-tab-track p-0.5 sm:p-1 rounded-xl shadow-inner">
              {tabItems.map(({ id, shortLabel, icon: Icon, activeColor }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleTabChange(id)}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 h-10 sm:h-9.5 px-0.5 sm:px-1 rounded-lg text-[9.5px] sm:text-xs font-mono transition-all duration-200 select-none cursor-pointer active:scale-95 min-w-0 ${
                      isActive
                        ? 'bg-white dark:bg-stone-800 text-stone-950 dark:text-white font-extrabold shadow-md ring-1 ring-stone-900/10 dark:ring-white/20 border border-stone-200/90 dark:border-stone-700/90'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-100 hover:bg-white/70 dark:hover:bg-stone-800/70 font-semibold'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${isActive ? activeColor : 'text-stone-500 dark:text-stone-400'}`} />
                    <span className={`tracking-tight truncate ${isActive ? activeColor + ' font-extrabold' : ''}`}>
                      {shortLabel}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      <MetricsGlossaryModal 
        isOpen={isGlossaryOpen} 
        onClose={() => setIsGlossaryOpen(false)} 
      />
    </header>
  );
};
