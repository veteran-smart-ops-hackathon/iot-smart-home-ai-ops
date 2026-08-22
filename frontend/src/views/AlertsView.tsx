import React, { useState, useEffect } from 'react';
import { 
  BellRing, 
  Mail, 
  Send, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw, 
  Sparkles, 
  ExternalLink,
  Users,
  History
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sound } from '@/lib/sound';
import { MetricHelpButton } from '@/components/MetricHelpButton';

interface NotificationLogItem {
  notification_id: string;
  incident_id: string;
  timestamp: string;
  recipient_email?: string;
  recipient_emails?: string[];
  total_recipients?: number;
  subject: string;
  status: string;
  delivery_mode: string;
  severity: string;
  dashboard_url: string;
  html_preview: string;
}

export const AlertsView: React.FC = () => {
  const [emailInput, setEmailInput] = useState('');
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpFromEmail, setSmtpFromEmail] = useState('veteran-home@smarthome.ai');

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [lastNotification, setLastNotification] = useState<NotificationLogItem | null>(null);
  const [historyLogs, setHistoryLogs] = useState<NotificationLogItem[]>([]);

  // Load current notification settings on mount
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/notifications/settings');
      if (res.ok) {
        const data = await res.json();
        setRecipientEmails(data.recipient_emails || (data.recipient_email ? [data.recipient_email] : ['user@smarthome.ai']));
        setIsEnabled(data.enabled ?? true);
        setSmtpConfigured(data.smtp_configured ?? false);
        setSmtpHost(data.smtp_host || 'smtp.gmail.com');
        setSmtpPort(data.smtp_port || 587);
        setSmtpFromEmail(data.smtp_from_email || 'veteran-home@smarthome.ai');
      }
    } catch (err) {
      console.error('Failed to fetch notification settings:', err);
    }
  };

  // Load notification history
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/notifications/history?limit=10');
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data.history || []);
        if (data.history && data.history.length > 0 && !lastNotification) {
          setLastNotification(data.history[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notification history:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchHistory();
  }, []);

  // Handle adding new email from text input
  const handleAddEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = emailInput.trim();
    if (!raw) return;

    sound.playClick();
    setLoading(true);
    setStatusMessage(null);

    try {
      // Use subscribe API which supports comma separated emails
      const res = await fetch('/api/subscribe-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: raw })
      });

      const data = await res.json();
      if (res.ok && data.status === 'SUCCESS') {
        sound.playSuccess();
        setRecipientEmails(data.recipient_emails || []);
        if (data.notification) {
          setLastNotification(data.notification);
        }
        setEmailInput('');
        setStatusMessage({
          type: 'success',
          text: `Đã lưu và phát cảnh báo đến ${data.total_recipients || 1} email thành công!`
        });
        fetchHistory();
      } else {
        sound.playAlarm();
        setStatusMessage({
          type: 'error',
          text: data.error || 'Có lỗi xảy ra khi lưu danh sách email.'
        });
      }
    } catch (err) {
      sound.playAlarm();
      setStatusMessage({
        type: 'error',
        text: 'Lỗi kết nối tới máy chủ Veteran Home.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle removing a single email tag
  const handleRemoveEmail = async (emailToRemove: string) => {
    sound.playClick();
    try {
      const res = await fetch('/api/notifications/recipients/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToRemove })
      });

      const data = await res.json();
      if (res.ok && data.settings) {
        setRecipientEmails(data.settings.recipient_emails || []);
        setStatusMessage({
          type: 'info',
          text: `Đã gỡ bỏ ${emailToRemove} khỏi danh sách nhận cảnh báo.`
        });
      }
    } catch (err) {
      console.error('Failed to remove email:', err);
    }
  };

  // Toggle notification enabled/disabled
  const handleToggleEnabled = async () => {
    sound.playClick();
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    try {
      await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });
      setStatusMessage({
        type: 'info',
        text: nextState ? 'Đã BẬT hệ thống thông báo Email cảnh báo.' : 'Đã TẮT thông báo Email.'
      });
    } catch (err) {
      console.error('Failed to update enabled state:', err);
    }
  };

  // Send a test email to all recipients
  const handleSendTestEmail = async () => {
    sound.playClick();
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok && data.status === 'SUCCESS') {
        sound.playSuccess();
        if (data.notification) {
          setLastNotification(data.notification);
        }
        setStatusMessage({
          type: 'success',
          text: `Đã gửi email thử nghiệm tới ${recipientEmails.length} người nhận thành công!`
        });
        fetchHistory();
      } else {
        sound.playAlarm();
        setStatusMessage({
          type: 'error',
          text: data.error || 'Lỗi khi gửi email thử nghiệm.'
        });
      }
    } catch (err) {
      sound.playAlarm();
      setStatusMessage({
        type: 'error',
        text: 'Lỗi kết nối tới máy chủ.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-xs font-semibold">
            <BellRing className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>HỆ THỐNG CẢNH BÁO TỨC THỜI (MULTI-RECIPIENT)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-stone-900 dark:text-white">
            Quản Lý Danh Sách Email Nhận Cảnh Báo Sự Cố
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-2xl">
            Tự do thêm nhiều email (chủ nhà, thành viên gia đình, kỹ sư bảo trì). Khi phát hiện bất thường từ cảm biến IoT, hệ thống sẽ tự động phát email cảnh báo kèm kế hoạch can thiệp tức thì.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleEnabled}
            className={`font-mono text-xs font-semibold ${
              isEnabled 
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/30 hover:bg-stone-500/20'
            }`}
          >
            {isEnabled ? '● TRẠNG THÁI: ĐANG BẬT' : '○ TRẠNG THÁI: ĐANG TẮT'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSendTestEmail}
            disabled={loading || recipientEmails.length === 0}
            className="font-mono text-xs gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-800 dark:text-amber-200"
          >
            <Send className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Gửi Thử Nghiệm</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Form Left, Preview/History Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Email Registry Form */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-5 sm:p-6 bg-white/90 dark:bg-stone-900/90 border-stone-200/80 dark:border-stone-800 shadow-sm space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h2 className="font-mono font-bold text-sm uppercase text-stone-900 dark:text-white">
                  Danh Sách Email Đang Nhận Tin ({recipientEmails.length})
                </h2>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                {smtpConfigured ? 'SMTP KẾT NỐI' : 'CHẾ ĐỘ MÔ PHỎNG'}
              </Badge>
            </div>

            {/* Chip Tags of Active Recipients */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-stone-500 dark:text-stone-400">Các địa chỉ email đang được kích hoạt:</span>
              <div className="flex flex-wrap gap-2 p-3 bg-stone-50 dark:bg-stone-950/60 rounded-xl border border-stone-200/60 dark:border-stone-800/80 min-h-[52px] items-center">
                {recipientEmails.length === 0 ? (
                  <span className="text-xs text-stone-400 italic">Chưa có email nào trong danh sách.</span>
                ) : (
                  recipientEmails.map((email) => (
                    <span 
                      key={email}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100/80 dark:bg-amber-950/80 border border-amber-300/60 dark:border-amber-700/50 text-amber-900 dark:text-amber-200 text-xs font-mono font-medium shadow-xs"
                    >
                      <Mail className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="ml-1 text-amber-700 dark:text-amber-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-amber-200 dark:hover:bg-amber-900 p-0.5 rounded transition-colors"
                        title={`Gỡ bỏ ${email}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleAddEmail} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-mono font-bold text-stone-700 dark:text-stone-300 uppercase">
                  Thêm Email Mới (Có thể nhập nhiều email cách nhau bằng dấu phẩy):
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="ví dụ: chutro@gmail.com, kythuat@smarthome.ai"
                    className="w-full pl-10 pr-24 py-2.5 bg-stone-50 dark:bg-stone-950/80 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all placeholder:text-stone-400"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading || !emailInput.trim()}
                    className="absolute right-1.5 top-1.5 h-7 px-3 text-xs font-mono bg-amber-600 hover:bg-amber-700 text-white gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Thêm</span>
                  </Button>
                </div>
              </div>

              {/* Status Message Notification */}
              {statusMessage && (
                <div className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 border ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : statusMessage.type === 'error'
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
                    : 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                }`}>
                  {statusMessage.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                  {statusMessage.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />}
                  {statusMessage.type === 'info' && <Sparkles className="h-4 w-4 text-sky-600 shrink-0" />}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  disabled={loading || (!emailInput.trim() && recipientEmails.length === 0)}
                  className="flex-1 h-10 font-mono text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-sm"
                >
                  <Send className="h-4 w-4" />
                  <span>LƯU & PHÁT CẢNH BÁO TỚI TẤT CẢ EMAIL NGAY</span>
                </Button>
              </div>
            </form>

            {/* SMTP Information Details */}
            <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800 text-[11px] font-mono text-stone-500 dark:text-stone-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>SMTP Host: <strong className="text-stone-700 dark:text-stone-300">{smtpHost}:{smtpPort}</strong></span>
                <span>Người gửi: <strong className="text-stone-700 dark:text-stone-300">{smtpFromEmail}</strong></span>
              </div>
              <p className="text-[10px] text-stone-400 italic">
                * Khi chưa thiết lập mật khẩu ứng dụng Gmail trong biến môi trường SMTP, hệ thống tự động ghi nhận mô phỏng chuẩn xác 100% không làm gián đoạn luồng vận hành.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Live Email Dispatch Preview & History */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Last Dispatched Email Preview */}
          <Card className="p-5 bg-white/90 dark:bg-stone-900/90 border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                <h3 className="font-mono font-bold text-xs uppercase text-stone-900 dark:text-white">
                  Bản Xem Trước Email Cảnh Báo Gần Nhất
                </h3>
                <MetricHelpButton metricKey="risk_score" />
              </div>
              {lastNotification && (
                <div className="flex items-center space-x-1">
                  <Badge variant="outline" className="font-mono text-[9px] bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25">
                    {lastNotification.severity || 'CRITICAL'}
                  </Badge>
                  <MetricHelpButton metricKey="anomaly_score" />
                </div>
              )}
            </div>

            {lastNotification ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="bg-stone-50 dark:bg-stone-950 p-3 rounded-xl border border-stone-200/60 dark:border-stone-800/80 space-y-1.5">
                  <div className="text-stone-500 text-[11px]">
                    Mã thông báo: <span className="text-stone-800 dark:text-stone-200 font-semibold">{lastNotification.notification_id}</span>
                  </div>
                  <div className="text-stone-500 text-[11px]">
                    Người nhận: <span className="text-amber-700 dark:text-amber-300 font-semibold">{lastNotification.recipient_emails?.join(', ') || lastNotification.recipient_email}</span>
                  </div>
                  <div className="text-stone-500 text-[11px]">
                    Chủ đề: <span className="text-stone-900 dark:text-white font-bold">{lastNotification.subject}</span>
                  </div>
                  <div className="text-stone-500 text-[11px]">
                    Hình thức: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{lastNotification.delivery_mode} ({lastNotification.status})</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 text-stone-700 dark:text-stone-300 text-xs leading-relaxed space-y-2">
                  <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Nội Dung Can Thiệp Được Đính Kèm:</span>
                  </div>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-3">
                    Bao gồm nguyên nhân gốc rễ (RCA), danh sách thiết bị nguy cơ, và nút mở Bảng Điều Khiển để phê duyệt ngắt nguồn khẩn cấp tức thì.
                  </p>
                  {lastNotification.dashboard_url && (
                    <a
                      href={lastNotification.dashboard_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                    >
                      <span>Mở Liên Kết Dashboard</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-stone-400 text-xs font-mono">
                Chưa có thông báo nào được phát ra. Hãy nhấn "Gửi Thử Nghiệm" hoặc "Lưu & Phát Cảnh Báo" ở trên.
              </div>
            )}
          </Card>

          {/* History Logs */}
          <Card className="p-5 bg-white/90 dark:bg-stone-900/90 border-stone-200/80 dark:border-stone-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-mono font-bold text-xs uppercase text-stone-900 dark:text-white">
                  Lịch Sử Gửi Cảnh Báo ({historyLogs.length})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchHistory}
                className="h-6 w-6 p-0 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                title="Làm mới lịch sử"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {historyLogs.length === 0 ? (
                <div className="text-center py-4 text-stone-400 text-xs font-mono">
                  Chưa có lịch sử.
                </div>
              ) : (
                historyLogs.map((log) => (
                  <div
                    key={log.notification_id}
                    className="p-2.5 bg-stone-50 dark:bg-stone-950/60 rounded-lg border border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between gap-2 text-[11px] font-mono"
                  >
                    <div className="space-y-0.5 truncate">
                      <div className="font-bold text-stone-800 dark:text-stone-200 truncate">
                        {log.subject}
                      </div>
                      <div className="text-stone-400 text-[10px] truncate">
                        {log.recipient_emails?.join(', ') || log.recipient_email} • {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('vi-VN') : ''}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0 font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                      {log.delivery_mode}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};
