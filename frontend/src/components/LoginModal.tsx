import React, { useState } from 'react';
import { 
  Home, 
  Wrench, 
  ShieldCheck, 
  KeyRound, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  X, 
  Mail, 
  Lock,
  Zap,
  Activity
} from 'lucide-react';
import { useAuth, DEFAULT_HOMEOWNER_PROFILE, DEFAULT_TECHNICIAN_PROFILE } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { sound } from '@/lib/sound';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setIsLoginModalOpen, login, role: currentRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole || 'homeowner');
  const [customEmail, setCustomEmail] = useState<string>('');
  const [customPassword, setCustomPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isLoginModalOpen) return null;

  const handleQuickLogin = (roleToLogin: UserRole) => {
    sound.playSuccess();
    login(roleToLogin);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    sound.playClick();

    setTimeout(() => {
      login(
        selectedRole,
        customEmail.trim() || undefined,
        selectedRole === 'homeowner' ? 'Chủ Hộ Gia Đình' : 'Kỹ Sư Vận Hành'
      );
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden p-1"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Inner Container */}
        <div className="bg-white dark:bg-stone-950/80 rounded-[1.4rem] p-6 sm:p-8 border border-stone-100 dark:border-stone-800/60">
          
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white flex items-center justify-center shadow-lg ring-2 ring-amber-400/20">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  Đăng Nhập Veteran Home
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    RBAC V2.5
                  </span>
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Chọn đúng vai trò (Persona) để trải nghiệm giao diện tương ứng
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setIsLoginModalOpen(false);
              }}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 1-Click Fast Persona Switch Cards */}
          <div className="mb-6">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3 block">
              1. Chọn Nhanh Persona (Khuyên dùng cho Demo)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Homeowner Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('homeowner');
                  handleQuickLogin('homeowner');
                }}
                className={`relative group p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                  selectedRole === 'homeowner'
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-500/40 ring-2 ring-amber-500/20 shadow-md'
                    : 'bg-stone-50/60 dark:bg-stone-900/40 border-stone-200/80 dark:border-stone-800 hover:border-amber-400/40'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Home className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                    PERSONA CHÍNH
                  </span>
                </div>
                <h3 className="font-bold text-stone-900 dark:text-white text-sm mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {DEFAULT_HOMEOWNER_PROFILE.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-3 line-clamp-2">
                  {DEFAULT_HOMEOWNER_PROFILE.description}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-800/80">
                  <span className="text-[11px] font-mono text-stone-600 dark:text-stone-300 font-medium">
                    {DEFAULT_HOMEOWNER_PROFILE.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Vào ngay <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </button>

              {/* Technician Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('technician');
                  handleQuickLogin('technician');
                }}
                className={`relative group p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                  selectedRole === 'technician'
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-500/40 ring-2 ring-indigo-500/20 shadow-md'
                    : 'bg-stone-50/60 dark:bg-stone-900/40 border-stone-200/80 dark:border-stone-800 hover:border-indigo-400/40'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300">
                    PERSONA PHỤ
                  </span>
                </div>
                <h3 className="font-bold text-stone-900 dark:text-white text-sm mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {DEFAULT_TECHNICIAN_PROFILE.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-3 line-clamp-2">
                  {DEFAULT_TECHNICIAN_PROFILE.description}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-800/80">
                  <span className="text-[11px] font-mono text-stone-600 dark:text-stone-300 font-medium">
                    {DEFAULT_TECHNICIAN_PROFILE.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    Vào ngay <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </button>

            </div>
          </div>

          {/* Custom Credentials Form */}
          <form onSubmit={handleCustomSubmit} className="pt-4 border-t border-stone-200/80 dark:border-stone-800">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3 block">
              2. Hoặc Nhập Email & Mật Khẩu Tùy Chọn
            </label>

            <div className="space-y-3">
              <div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder={
                      selectedRole === 'homeowner'
                        ? DEFAULT_HOMEOWNER_PROFILE.email
                        : DEFAULT_TECHNICIAN_PROFILE.email
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Activity className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Đăng Nhập Với Vai Trò {selectedRole === 'homeowner' ? 'Chủ Hộ' : 'Kỹ Thuật Viên'}
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
