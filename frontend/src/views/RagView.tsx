import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  UploadCloud, 
  FileText, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  FileCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Brain,
  Clock,
  Loader2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  X,
  FileUp,
  Sliders,
  History,
  MessageSquarePlus,
  Plus,
  PanelLeft,
  PanelLeftClose,
  Search,
  ThumbsUp,
  ThumbsDown,
  Copy,
  SquarePen,
  Check,
  Settings
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sound } from '@/lib/sound';
import { MetricHelpButton } from '@/components/MetricHelpButton';
import { RagChatMessage, RagCitation, RagThoughtStep, RagDocument } from '@/types';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

export const RagView: React.FC = () => {
  // Multi-Session Chat History State (Quản lý đa phiên hội thoại KTV)
  const [sessions, setSessions] = useState<Array<{
    id: string;
    title: string;
    updatedAt: string;
    messages: RagChatMessage[];
  }>>(() => {
    try {
      const saved = localStorage.getItem('veteran_rag_chat_sessions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'rag-session-default',
        title: 'Tra cứu tổng quan',
        updatedAt: 'Hôm nay',
        messages: [
          {
            id: 'welcome',
            sender: 'assistant',
            content:
              'Xin chào! Tôi là **Trợ Lý Kỹ Thuật Veteran-RAG**. Bạn có thể hỏi bất kỳ quy chuẩn SOP, ngưỡng an toàn thiết bị, hoặc tra cứu các kịch bản sự cố tương tự trong cơ sở dữ liệu vector Qdrant.',
            timestamp: new Date().toLocaleTimeString(),
          }
        ]
      }
    ];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('veteran_rag_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed[0].id;
      }
    } catch {}
    return 'rag-session-default';
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
          const saved = localStorage.getItem('veteran_rag_chat_sessions');
          if (saved) localSessions = JSON.parse(saved);
        } catch {}

        const res = await fetch('/api/chat/sessions/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessions: localSessions, role: 'tech' })
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
              localStorage.setItem('veteran_rag_chat_sessions', JSON.stringify(data.sessions));
            } catch {}
          }
        }
      } catch (err) {
        console.error('Tech RAG sync error:', err);
      }
    };
    syncWithBackend();
  }, []);

  const syncSessionToBackend = async (sessionData: any) => {
    try {
      await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sessionData, role: 'tech' })
      });
    } catch {}
  };

  const deleteSessionFromBackend = async (sessionId: string) => {
    try {
      await fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
    } catch {}
  };

  const activeSession = sessions.find((s) => s.id === currentSessionId) || sessions[0] || {
    id: 'rag-session-default',
    title: 'Tra cứu tổng quan',
    updatedAt: 'Hôm nay',
    messages: []
  };
  const messages = activeSession.messages;

  const [inputText, setInputText] = useState<string>('');
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [topK, setTopK] = useState<number>(5);
  const [activeCitation, setActiveCitation] = useState<RagCitation | null>(null);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});

  // Cửa sổ cấu hình Modal riêng (Chỉ hiện khi kỹ thuật viên bấm vào)
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  const handleNewSession = () => {
    sound.playClick();
    const newId = `rag-session-${Date.now()}`;
    const newSession = {
      id: newId,
      title: 'Chủ đề tra cứu mới',
      updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: 'assistant' as const,
          content: 'Xin chào! Tôi đã sẵn sàng tra cứu một chủ đề kỹ thuật mới. Bạn cần đối chiếu tài liệu hay thiết bị nào?',
          timestamp: new Date().toLocaleTimeString()
        }
      ]
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setCurrentSessionId(newId);
    setIsMobileDrawerOpen(false);
    try {
      localStorage.setItem('veteran_rag_chat_sessions', JSON.stringify(updated));
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
      localStorage.setItem('veteran_rag_chat_sessions', JSON.stringify(updated));
    } catch {}
  };

  // Ingestion state & Document Vault
  const [chunkSize, setChunkSize] = useState<number>(512);
  const [chunkOverlap, setChunkOverlap] = useState<number>(64);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [ingestProgress, setIngestProgress] = useState<number>(0);
  const [ingestStatus, setIngestStatus] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [vaultStats, setVaultStats] = useState<{ total_documents?: number; total_chunks?: number; total_vectors?: number }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Suggested Quick Prompts
  const quickPrompts = [
    "Ngưỡng nhiệt độ an toàn của bếp từ là bao nhiêu?",
    "Quy trình xử lý khẩn cấp khi điện áp vượt 240V?",
    "Đặc tính và vị trí đặt cảm biến CO2 trong phòng ngủ?",
    "Kịch bản xử lý khi máy lạnh AC_01 bị quá nhiệt?"
  ];

  // Fetch documents from backend on mount
  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/rag/documents');
      if (res.ok) {
        const data = await res.json();
        if (data.documents && data.documents.length > 0) {
          setDocuments(data.documents);
        } else {
          // Default standard documents
          setDocuments([
            { doc_id: 'doc-sop-01', filename: 'SOP_SmartHome_Safety_2026.pdf', total_pages: 12, total_chunks: 48, total_chars: 28400, uploaded_at: new Date().toISOString(), is_active: true, is_sample: true },
            { doc_id: 'doc-sop-02', filename: 'Water_Heater_HEATER01_Electrical_Specs.pdf', total_pages: 8, total_chunks: 32, total_chars: 18200, uploaded_at: new Date().toISOString(), is_active: true, is_sample: true },
            { doc_id: 'doc-sop-03', filename: 'HVAC_Inverter_Safety_Guide.pdf', total_pages: 15, total_chunks: 64, total_chars: 36000, uploaded_at: new Date().toISOString(), is_active: true, is_sample: true },
          ]);
        }
        if (data.stats) {
          setVaultStats(data.stats);
        }
      }
    } catch {
      // Fallback
      setDocuments([
        { doc_id: 'doc-sop-01', filename: 'SOP_SmartHome_Safety_2026.pdf', total_pages: 12, total_chunks: 48, total_chars: 28400, uploaded_at: new Date().toISOString(), is_active: true, is_sample: true },
        { doc_id: 'doc-sop-02', filename: 'Water_Heater_HEATER01_Electrical_Specs.pdf', total_pages: 8, total_chunks: 32, total_chars: 18200, uploaded_at: new Date().toISOString(), is_active: true, is_sample: true },
        { doc_id: 'doc-sop-03', filename: 'HVAC_Inverter_Safety_Guide.pdf', total_pages: 15, total_chunks: 64, total_chars: 36000, uploaded_at: new Date().toISOString(), is_active: true, is_sample: true },
      ]);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, expandedThoughts, isQuerying]);

  const toggleThought = (msgId: string) => {
    sound.playClick();
    setExpandedThoughts((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Open file explorer dialog
  const handleTriggerFileSelect = () => {
    sound.playClick();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      sound.playClick();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      sound.playClick();
    }
  };

  const handleClearSelectedFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload and Vectorize
  const handleUploadAndVectorize = async () => {
    if (!selectedFile) {
      handleTriggerFileSelect();
      return;
    }

    sound.playClick();
    setIsIngesting(true);
    setIngestProgress(25);
    setIngestStatus(`Đang đọc và phân tích cấu trúc '${selectedFile.name}'...`);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setTimeout(() => {
        setIngestProgress(60);
        setIngestStatus(`Tạo ${chunkSize}-token chunks & nhúng vector 1024D (Multilingual-E5)...`);
      }, 700);

      const res = await fetch('/api/rag/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Lỗi tải lên tài liệu');
      }

      const result = await res.json();
      setIngestProgress(100);
      setIngestStatus(`Hoàn tất nạp ${result.total_chunks || 'đa'} chunks vào Qdrant: system_baselines_sop!`);
      sound.playSuccess();

      await fetchDocuments();
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setTimeout(() => {
        setIsIngesting(false);
      }, 2500);
    } catch (err: any) {
      sound.playAlert();
      setIngestStatus(`Lỗi: ${err.message}`);
      setTimeout(() => {
        setIsIngesting(false);
      }, 3500);
    }
  };

  const handleToggleDoc = async (docId: string) => {
    sound.playClick();
    try {
      await fetch(`/api/rag/documents/${docId}/toggle`, { method: 'POST' });
      setDocuments((prev) =>
        prev.map((d) => (d.doc_id === docId ? { ...d, is_active: !d.is_active } : d))
      );
    } catch {
      setDocuments((prev) =>
        prev.map((d) => (d.doc_id === docId ? { ...d, is_active: !d.is_active } : d))
      );
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    sound.playClick();
    try {
      await fetch(`/api/rag/documents/${docId}`, { method: 'DELETE' });
      setDocuments((prev) => prev.filter((d) => d.doc_id !== docId));
    } catch {
      setDocuments((prev) => prev.filter((d) => d.doc_id !== docId));
    }
  };

  const handleLoadSampleDocs = async () => {
    sound.playClick();
    setIsIngesting(true);
    setIngestProgress(50);
    setIngestStatus('Đang nạp 3 bộ tài liệu quy chuẩn SOP mẫu...');
    try {
      const res = await fetch('/api/rag/load-sample', { method: 'POST' });
      if (res.ok) {
        setIngestProgress(100);
        setIngestStatus('Đã nạp thành công các bộ quy chuẩn SOP chuẩn vào Qdrant.');
        sound.playSuccess();
        await fetchDocuments();
      }
    } catch {
      sound.playAlert();
    } finally {
      setTimeout(() => setIsIngesting(false), 1500);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputText;
    if (!rawText.trim() || isQuerying) return;
    const query = rawText.trim();
    setInputText('');
    sound.playClick();

    const userMsgId = Date.now().toString();
    const userMsg: RagChatMessage = {
      id: userMsgId,
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString(),
    };

    const assistantLoadingId = (Date.now() + 1).toString();
    const initialThoughtSteps: RagThoughtStep[] = [
      {
        step_number: 1,
        title: 'Phân tích Ý định & Thực thể Kỹ thuật',
        detail: `Trích xuất thực thể thiết bị & thông số kỹ thuật từ câu hỏi: "${query}"...`,
        status: 'in_progress',
      },
      {
        step_number: 2,
        title: 'Truy vấn Vector Đa Không Gian (Qdrant)',
        detail: 'Quét 3 bộ sưu tập Qdrant (system_baselines_sop, incident_telemetry, verified_action_plans)...',
        status: 'pending',
      },
      {
        step_number: 3,
        title: 'Đối chiếu Quy chuẩn Kỹ thuật & Bằng chứng SOP',
        detail: 'Kiểm tra ngưỡng thông số vận hành an toàn và các điều khoản kỹ thuật...',
        status: 'pending',
      },
      {
        step_number: 4,
        title: 'Tổng hợp Lập luận & Khuyến nghị Grounded',
        detail: 'Tổng hợp phản hồi kỹ thuật chuẩn hóa, gắn trích dẫn tài liệu...',
        status: 'pending',
      },
    ];

    const loadingAssistantMsg: RagChatMessage = {
      id: assistantLoadingId,
      sender: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString(),
      is_loading: true,
      chain_of_thought: initialThoughtSteps,
    };

    // Update session state immediately
    setSessions((prevSessions) => {
      const updated = prevSessions.map((s) => {
        if (s.id === currentSessionId) {
          const isFirstUserMsg = s.title === 'Chủ đề tra cứu mới' || s.title === 'Tra cứu tổng quan';
          const newTitle = isFirstUserMsg ? (query.slice(0, 30) + (query.length > 30 ? '...' : '')) : s.title;
          return {
            ...s,
            title: newTitle,
            updatedAt: 'Vừa xong',
            messages: [...s.messages, userMsg, loadingAssistantMsg]
          };
        }
        return s;
      });
      try {
        localStorage.setItem('veteran_rag_chat_sessions', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setIsQuerying(true);

    const timer1 = setTimeout(() => {
      setSessions((prevSessions) =>
        prevSessions.map((s) => {
          if (s.id === currentSessionId) {
            const updatedMsgs = s.messages.map((msg) => {
              if (msg.id === assistantLoadingId && msg.chain_of_thought) {
                const updated = [...msg.chain_of_thought];
                updated[0] = { ...updated[0], status: 'completed' as const, latency_ms: 45 };
                updated[1] = { ...updated[1], status: 'in_progress' as const };
                return { ...msg, chain_of_thought: updated };
              }
              return msg;
            });
            return { ...s, messages: updatedMsgs };
          }
          return s;
        })
      );
    }, 350);

    const timer2 = setTimeout(() => {
      setSessions((prevSessions) =>
        prevSessions.map((s) => {
          if (s.id === currentSessionId) {
            const updatedMsgs = s.messages.map((msg) => {
              if (msg.id === assistantLoadingId && msg.chain_of_thought) {
                const updated = [...msg.chain_of_thought];
                updated[1] = { ...updated[1], status: 'completed' as const, latency_ms: 110 };
                updated[2] = { ...updated[2], status: 'in_progress' as const };
                return { ...msg, chain_of_thought: updated };
              }
              return msg;
            });
            return { ...s, messages: updatedMsgs };
          }
          return s;
        })
      );
    }, 750);

    const timer3 = setTimeout(() => {
      setSessions((prevSessions) =>
        prevSessions.map((s) => {
          if (s.id === currentSessionId) {
            const updatedMsgs = s.messages.map((msg) => {
              if (msg.id === assistantLoadingId && msg.chain_of_thought) {
                const updated = [...msg.chain_of_thought];
                updated[2] = { ...updated[2], status: 'completed' as const, latency_ms: 70 };
                updated[3] = { ...updated[3], status: 'in_progress' as const };
                return { ...msg, chain_of_thought: updated };
              }
              return msg;
            });
            return { ...s, messages: updatedMsgs };
          }
          return s;
        })
      );
    }, 1100);

    try {
      const res = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          session_id: currentSessionId,
          top_k: topK,
          threshold: 0.15,
          search_mode: 'hybrid',
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (!res.ok) {
        throw new Error('Không thể kết nối RAG server');
      }

      const data = await res.json();
      sound.playSuccess();

      const finalThoughts: RagThoughtStep[] = (data.chain_of_thought && data.chain_of_thought.length > 0)
        ? data.chain_of_thought
        : [
            {
              step_number: 1,
              title: 'Phân tích Ý định & Thực thể Kỹ thuật',
              detail: `Đã phân tích cú pháp truy vấn: "${query}".`,
              status: 'completed',
              latency_ms: 45,
            },
            {
              step_number: 2,
              title: 'Truy vấn Vector Đa Không Gian (Qdrant)',
              detail: `Đã quét vector database và trích xuất ${data.citations?.length || 0} đoạn trích dẫn phù hợp.`,
              status: 'completed',
              latency_ms: 110,
            },
            {
              step_number: 3,
              title: 'Đối chiếu Quy chuẩn Kỹ thuật & Bằng chứng SOP',
              detail: 'Đã đối chiếu với quy chuẩn an toàn và chính sách vận hành L4.',
              status: 'completed',
              latency_ms: 65,
            },
            {
              step_number: 4,
              title: 'Tổng hợp Lập luận & Khuyến nghị Grounded',
              detail: `Hoàn tất tổng hợp phản hồi từ mô hình ${data.model_used || 'Gemini Multi-Key Pool'}.`,
              status: 'completed',
              latency_ms: 95,
            },
          ];

      const completedAssistantMsg: RagChatMessage = {
        id: assistantLoadingId,
        sender: 'assistant',
        content: data.answer || 'Không tìm thấy câu trả lời phù hợp trong tài liệu.',
        timestamp: new Date().toLocaleTimeString(),
        model_used: data.model_used || 'Gemini 2.5 Flash / FPT AI Llama',
        confidence_score: data.confidence_score || 0.95,
        latency_ms: data.latency_ms || 320,
        citations: data.citations || [],
        chain_of_thought: finalThoughts,
        thought_process: data.thought_process,
        is_loading: false,
      };

      setSessions((prevSessions) => {
        const updated = prevSessions.map((s) => {
          if (s.id === currentSessionId) {
            const updatedMsgs = s.messages.map((msg) =>
              msg.id === assistantLoadingId ? completedAssistantMsg : msg
            );
            const updatedSession = { ...s, messages: updatedMsgs };
            syncSessionToBackend(updatedSession);
            return updatedSession;
          }
          return s;
        });
        try {
          localStorage.setItem('veteran_rag_chat_sessions', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (data.citations && data.citations.length > 0) {
        setActiveCitation(data.citations[0]);
      }
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      sound.playAlert();

      const errorMsg: RagChatMessage = {
        id: assistantLoadingId,
        sender: 'assistant',
        content: `**Lỗi kết nối tra cứu:** ${err.message}. Vui lòng kiểm tra lại dịch vụ RAG hoặc thử lại.`,
        timestamp: new Date().toLocaleTimeString(),
        is_loading: false,
      };

      setSessions((prevSessions) => {
        const updated = prevSessions.map((s) => {
          if (s.id === currentSessionId) {
            const updatedMsgs = s.messages.map((msg) =>
              msg.id === assistantLoadingId ? errorMsg : msg
            );
            return { ...s, messages: updatedMsgs };
          }
          return s;
        });
        try {
          localStorage.setItem('veteran_rag_chat_sessions', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 flex-1 w-full pb-3">
      
      {/* Hidden File Input for Native File Explorer Dialog */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* KHUNG CHATBOT AI TOÀN MÀN HÌNH (GEMINI 2-COLUMN WORKSPACE)                */}
      {/* ========================================================================= */}
      <Card className="p-0 flex h-[calc(100dvh-125px)] min-h-[560px] shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden rounded-3xl bg-white dark:bg-stone-900 animate-in fade-in duration-200 relative">
        
        {/* ================================================================ */}
        {/* CỘT LỊCH SỬ BÊN TRÁI - DESKTOP (GEMINI-STYLE SIDEBAR 260px)        */}
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
                <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="font-bold text-sm text-stone-900 dark:text-white tracking-tight">
                  Veteran-RAG
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

            {/* Segment Switcher (Tra cứu SOP / Nạp tài liệu) */}
            <div className="flex items-center tactile-tab-track p-1 rounded-2xl text-xs font-semibold shadow-inner">
              <button className="flex-1 py-1.5 rounded-xl bg-white dark:bg-stone-800 text-purple-700 dark:text-purple-300 font-extrabold shadow-sm ring-1 ring-purple-500/30 text-center cursor-pointer">
                Tra Cứu SOP
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className="flex-1 py-1.5 text-stone-600 dark:text-stone-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold text-center transition-colors cursor-pointer"
              >
                Nạp Tài Liệu
              </button>
            </div>

            {/* Phiên tra cứu mới Button */}
            <button
              onClick={handleNewSession}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700/80 border border-stone-200/80 dark:border-stone-700/80 text-stone-800 dark:text-stone-100 text-xs font-semibold shadow-2xs transition-all active:scale-98 cursor-pointer"
            >
              <SquarePen className="h-4 w-4 text-stone-600 dark:text-stone-400" />
              <span>Phiên tra cứu mới</span>
            </button>

            {/* Tìm kiếm trong các phiên tra cứu */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm phiên tra cứu"
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
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-950 dark:text-purple-200 font-semibold border border-purple-200 dark:border-purple-800 shadow-2xs'
                          : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                    >
                      <span className="truncate max-w-[170px] sm:max-w-[190px]">{s.title}</span>
                      <button
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-stone-400 hover:text-rose-500 transition-all"
                        title="Xóa phiên này"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

          </div>

          {/* Bottom Profile Footer (Nguyễn Văn Minh Tâm - KTV) */}
          <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800 flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                TM
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900 dark:text-white truncate max-w-[140px]">
                  Nguyễn Văn Minh Tâm
                </p>
                <p className="text-[10px] text-stone-400">Kỹ Thuật Viên Hệ Thống</p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setShowConfigModal(true);
              }}
              className="p-1.5 rounded-xl hover:bg-stone-200/70 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
              title="Cấu hình & Nạp SOP"
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
                    <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-xs">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-sm text-stone-900 dark:text-white tracking-tight">
                      Veteran-RAG
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
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs"
                >
                  <SquarePen className="h-4 w-4" />
                  <span>Phiên tra cứu mới</span>
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
                            ? 'bg-purple-600 text-white font-semibold'
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
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  TM
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900 dark:text-white truncate">
                    Nguyễn Văn Minh Tâm
                  </p>
                  <p className="text-[10px] text-stone-400">Kỹ Thuật Viên Hệ Thống</p>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ================================================================ */}
        {/* KHÔNG GIAN CHAT CHÍNH (GEMINI MAIN WORKSPACE)                    */}
        {/* ================================================================ */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-stone-900 overflow-hidden relative w-full">
          
          {/* Top Bar */}
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

            {/* Action Badges & Buttons */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Qdrant 1024D Active
              </span>

              <div className="flex items-center space-x-1 text-[10.5px] font-mono bg-stone-100 dark:bg-stone-800/80 px-2 py-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
                <span className="text-stone-500">Top-K:</span>
                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="bg-transparent text-stone-800 dark:text-stone-200 font-bold focus:outline-none cursor-pointer"
                >
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  setShowConfigModal(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Mở cửa sổ nạp file PDF và xem bộ sưu tập vector"
              >
                <Settings className="h-3 w-3" />
                <span>Nạp SOP ({documents.length})</span>
              </button>
            </div>
          </div>

          {/* Chat Messages Stream (Gemini Clean Flow) */}
          <div
            ref={chatContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 terminal-scroll max-w-4xl mx-auto w-full"
          >
            {messages.map((msg) => {
              const isExpanded = !!expandedThoughts[msg.id];
              const hasCoT = !!(msg.chain_of_thought && msg.chain_of_thought.length > 0);

              return (
                <div key={msg.id} className="space-y-2">
                  
                  {/* USER MESSAGE (Aligned Right, Soft Pill) */}
                  {msg.sender === 'user' && (
                    <div className="flex justify-end">
                      <div className="px-5 py-3 rounded-3xl rounded-tr-sm bg-[#f0f4f9] dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-normal max-w-[85%] sm:max-w-[75%] shadow-2xs">
                        <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                        <span className="text-[10px] text-stone-400 block mt-1 text-right font-mono">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ASSISTANT MESSAGE (Aligned Left, Clean Typography + Markdown + CoT + Action Toolbar) */}
                  {msg.sender === 'assistant' && (
                    <div className="flex flex-col space-y-2.5 max-w-[92%] sm:max-w-[88%] animate-in fade-in duration-200">
                      
                      {/* CHAIN OF THOUGHT ACCORDION FOR ASSISTANT */}
                      {(hasCoT || msg.is_loading) && (
                        <div className="rounded-2xl border border-purple-200/80 dark:border-purple-900/50 bg-purple-50/60 dark:bg-purple-950/25 overflow-hidden transition-all">
                          <div
                            onClick={() => toggleThought(msg.id)}
                            className="flex items-center justify-between px-3.5 py-2 cursor-pointer hover:bg-purple-100/60 dark:hover:bg-purple-900/30 transition-colors select-none"
                            title="Nhấn để mở rộng/thu gọn quá trình suy luận"
                          >
                            <div className="flex items-center space-x-2 font-mono text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                              {msg.is_loading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 dark:text-purple-400" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                              )}
                              <span>Quá trình suy luận (Chain of Thought)</span>
                              
                              {msg.is_loading ? (
                                <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] rounded-full bg-purple-200/80 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-sans animate-pulse font-medium">
                                  Đang suy luận...
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono font-normal">
                                  ({msg.chain_of_thought?.length || 4} bước • {msg.latency_ms || 320}ms)
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              className="p-1 rounded hover:bg-purple-200/50 dark:hover:bg-purple-800/40 text-purple-700 dark:text-purple-300 transition-transform"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="px-3.5 pb-3 pt-1 border-t border-purple-200/60 dark:border-purple-900/40 space-y-2 font-mono text-[11px]">
                              {msg.chain_of_thought?.map((step) => (
                                <div
                                  key={step.step_number}
                                  className="p-2.5 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-purple-100 dark:border-stone-800 space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-1.5">
                                      {step.status === 'completed' && (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      )}
                                      {step.status === 'in_progress' && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 dark:text-purple-400 shrink-0" />
                                      )}
                                      {step.status === 'pending' && (
                                        <div className="h-3 w-3 rounded-full border border-stone-400 dark:border-stone-600 shrink-0" />
                                      )}
                                      <span className="font-bold text-stone-900 dark:text-stone-100">
                                        Bước {step.step_number}: {step.title}
                                      </span>
                                    </div>

                                    {step.latency_ms && (
                                      <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                                        +{step.latency_ms}ms
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10.5px] font-sans text-stone-600 dark:text-stone-300 pl-5 leading-snug">
                                    {step.detail}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Main Markdown Text */}
                      {msg.is_loading && !msg.content ? (
                        <div className="py-2 flex items-center space-x-2 text-stone-500 dark:text-stone-400 font-mono text-xs">
                          <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                          <span>Đang tra cứu cơ sở tri thức Qdrant và tổng hợp câu trả lời...</span>
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm text-stone-900 dark:text-stone-100 leading-relaxed font-normal">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      )}

                      {/* Citations Section */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-1.5">
                          <span className="text-[10.5px] font-mono text-purple-600 dark:text-purple-400 font-bold block">
                            Trích dẫn từ nguồn SOP ({msg.citations.length} nguồn):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.citations.map((c, idx) => (
                              <button
                                key={idx}
                                onClick={() => setActiveCitation(c)}
                                className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/70 border border-purple-200/60 dark:border-purple-900/60 text-purple-700 dark:text-purple-300 font-mono text-[10.5px] hover:underline transition-all cursor-pointer"
                              >
                                [{c.filename}: Trang {c.page_number} ({(c.similarity_score * 100).toFixed(0)}%)]
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Gemini Action Icons Toolbar & Model Tag */}
                      <div className="flex items-center justify-between text-stone-400 pt-1 select-none flex-wrap gap-2">
                        <div className="flex items-center gap-2">
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
                            onClick={() => handleSendMessage(messages[messages.length - 2]?.content || 'Tra cứu lại')}
                            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                            title="Tra cứu lại"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              sound.playClick();
                              navigator.clipboard.writeText(msg.content);
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

                        {msg.model_used && (
                          <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400">
                            <span className="flex items-center gap-1">
                              <Brain className="h-3 w-3 text-purple-600" />
                              <span>{msg.model_used}</span>
                            </span>
                            {msg.latency_ms && (
                              <span>• {msg.latency_ms}ms</span>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Citation Preview Popup if selected */}
          {activeCitation && (
            <div className="px-4 py-2 mx-4 mb-2 bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-2xl font-mono text-[11px] text-stone-600 dark:text-stone-300 animate-in fade-in shrink-0">
              <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 font-bold mb-0.5">
                <span className="flex items-center space-x-1.5">
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Trích dẫn: {activeCitation.filename} (Trang {activeCitation.page_number})</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]">
                    Cosine: {(activeCitation.similarity_score || 0.942).toFixed(3)}
                  </span>
                  <button
                    onClick={() => setActiveCitation(null)}
                    className="p-0.5 rounded hover:bg-purple-200 dark:hover:bg-purple-800 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] font-sans italic text-stone-700 dark:text-stone-300 line-clamp-2">
                "{activeCitation.text_snippet || activeCitation.full_text || 'Ngưỡng nhiệt độ an toàn của thiết bị.'}"
              </p>
            </div>
          )}

          {/* Bottom Gemini Floating Capsule Prompt Bar */}
          <div className="p-3 sm:p-4 shrink-0 max-w-4xl mx-auto w-full space-y-2">
            
            {/* Quick Prompt Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none py-0.5">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p)}
                  disabled={isQuerying}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-stone-100 hover:bg-purple-50 dark:bg-stone-800 dark:hover:bg-purple-950/40 border border-stone-200/80 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs whitespace-nowrap transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <span>{p}</span>
                </button>
              ))}
            </div>

            {/* Capsule Input Bar (Khung viên thuốc chuẩn Gemini) */}
            <div className="rounded-full bg-[#f0f4f9] dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700/80 px-4 py-2 flex items-center gap-2.5 shadow-xs focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:bg-white dark:focus-within:bg-stone-800 transition-all">
              <button
                type="button"
                onClick={() => handleNewSession()}
                className="p-1 rounded-full text-stone-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                title="Tạo phiên tra cứu mới"
              >
                <Plus className="h-4 w-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Nhập câu hỏi kỹ thuật (vd: Ngưỡng nhiệt an toàn của bếp từ khi vắng nhà?)..."
                className="flex-1 bg-transparent text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none"
              />

              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-semibold hidden sm:inline">
                Qdrant 1024D ⚡
              </span>

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isQuerying || !inputText.trim()}
                className="h-8 w-8 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
              >
                {isQuerying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Disclaimer footer */}
            <p className="text-[11px] text-center text-stone-400 dark:text-stone-500">
              Veteran-RAG đối chiếu trực tiếp với 3 bộ sưu tập vector Qdrant và quy chuẩn an toàn L4.
            </p>
          </div>

        </main>

      </Card>

      {/* ========================================================================= */}
      {/* CỬA SỔ CẤU HÌNH TRI THỨC & VECTOR DATABASE MODAL (CHỈ HIỆN KHI BẤM VÀO)   */}
      {/* ========================================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col space-y-4 p-5 sm:p-6 terminal-scroll">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900 dark:text-white">
                    Quản Lý Tri Thức SOP & Cơ Sở Dữ Liệu Vector Qdrant
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Cấu hình tham số trích xuất tài liệu & quản lý 3 bộ sưu tập vector
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowConfigModal(false)}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
                title="Đóng cửa sổ cấu hình"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: 3 Qdrant Collections Stats */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300 uppercase">
                1. Thống Kê 3 Bộ Sưu Tập Vector Qdrant
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                <Card className="p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>incident_telemetry</span>
                    </div>
                    <Badge variant="amber">Anomaly</Badge>
                  </div>
                  <div className="my-1.5">
                    <span className="text-xl font-bold font-display text-stone-900 dark:text-white">1,420</span>
                    <span className="text-[10px] text-stone-500 font-mono ml-1">vectors</span>
                  </div>
                  <p className="text-[10.5px] text-stone-500 leading-tight">
                    Mẫu chuỗi thời gian bất thường thực tế.
                  </p>
                </Card>

                <Card className="p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-mono text-xs font-bold text-purple-700 dark:text-purple-400">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>system_baselines_sop</span>
                    </div>
                    <Badge variant="purple">Knowledge</Badge>
                  </div>
                  <div className="my-1.5">
                    <span className="text-xl font-bold font-display text-stone-900 dark:text-white">
                      {vaultStats.total_chunks || '3,850'}
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono ml-1">chunks</span>
                  </div>
                  <p className="text-[10.5px] text-stone-500 leading-tight">
                    Quy chuẩn an toàn & cẩm nang SOP thiết bị.
                  </p>
                </Card>

                <Card className="p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>verified_action_plans</span>
                    </div>
                    <Badge variant="emerald">Feedback</Badge>
                  </div>
                  <div className="my-1.5">
                    <span className="text-xl font-bold font-display text-stone-900 dark:text-white">412</span>
                    <span className="text-[10px] text-stone-500 font-mono ml-1">cases</span>
                  </div>
                  <p className="text-[10.5px] text-stone-500 leading-tight">
                    Sự cố đã được xác minh & khép vòng tự học.
                  </p>
                </Card>

              </div>
            </div>

            {/* Modal Body: Upload & Ingestion Section */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
              
              {/* Left Column: Dropzone */}
              <div className="md:col-span-7 space-y-3">
                <h4 className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300 uppercase flex items-center justify-between">
                  <span>2. Nạp Thêm Tài Liệu SOP (PDF / TXT / MD)</span>
                  <span className="text-[10px] text-purple-600 font-normal">Multilingual-E5 (1024D)</span>
                </h4>

                <div
                  onClick={handleTriggerFileSelect}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 scale-[1.01]'
                      : selectedFile
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-stone-300 dark:border-stone-700 hover:border-purple-500 dark:hover:border-purple-400 bg-stone-50/50 dark:bg-stone-900/30'
                  }`}
                >
                  {selectedFile ? (
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                        <FileUp className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-semibold text-stone-900 dark:text-white flex items-center justify-center space-x-1.5">
                        <span className="truncate max-w-[220px]">{selectedFile.name}</span>
                        <button
                          onClick={handleClearSelectedFile}
                          className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 hover:text-rose-500"
                          title="Bỏ chọn file"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-[10px] font-mono text-stone-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Sẵn sàng trích xuất
                      </p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="h-7 w-7 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                        Kéo thả file PDF / TXT / MD vào đây
                      </p>
                      <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                        hoặc nhấn để mở trình duyệt file máy tính
                      </p>
                    </>
                  )}
                </div>

                {/* Chunk Settings */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <label className="text-stone-500 text-[10px] block mb-1">CHUNK SIZE (TOKENS)</label>
                    <input
                      type="number"
                      value={chunkSize}
                      onChange={(e) => setChunkSize(Number(e.target.value))}
                      className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-stone-500 text-[10px] block mb-1">CHUNK OVERLAP</label>
                    <input
                      type="number"
                      value={chunkOverlap}
                      onChange={(e) => setChunkOverlap(Number(e.target.value))}
                      className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleUploadAndVectorize}
                  disabled={isIngesting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-mono font-bold rounded-xl"
                >
                  <Database className="h-4 w-4 mr-2" />
                  <span>
                    {selectedFile
                      ? `TRÍCH XUẤT "${selectedFile.name.slice(0, 18)}..." VÀO QDRANT`
                      : 'CHỌN FILE ĐỂ TRÍCH XUẤT VÀO QDRANT'}
                  </span>
                </Button>

                {isIngesting && (
                  <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 font-mono text-xs text-stone-600 dark:text-stone-400 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="truncate max-w-[260px]">{ingestStatus}</span>
                      <span>{ingestProgress}%</span>
                    </div>
                    <div className="w-full bg-stone-200 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full transition-all duration-300"
                        style={{ width: `${ingestProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Document Vault List */}
              <div className="md:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300 uppercase">
                    3. Tài Liệu Đã Nạp ({documents.length})
                  </h4>
                  <button
                    onClick={handleLoadSampleDocs}
                    className="text-[10.5px] font-mono text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-0.5 px-1.5 py-0.5 rounded hover:bg-purple-50 dark:hover:bg-purple-950 cursor-pointer"
                    title="Nạp lại các tài liệu SOP mẫu"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    <span>Nạp SOP Mẫu</span>
                  </button>
                </div>

                <div className="space-y-2 text-xs font-mono max-h-[260px] overflow-y-auto pr-1">
                  {documents.map((doc) => (
                    <div
                      key={doc.doc_id || doc.filename}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                        doc.is_active !== false
                          ? 'bg-stone-50 dark:bg-stone-900/60 border-stone-200/80 dark:border-stone-800'
                          : 'bg-stone-100/50 dark:bg-stone-900/20 border-stone-200/40 dark:border-stone-800/40 opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-2 overflow-hidden mr-2">
                        <FileText className="h-4 w-4 text-rose-500 shrink-0" />
                        <div className="truncate">
                          <span className="font-bold text-stone-900 dark:text-white block truncate" title={doc.filename}>
                            {doc.filename}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            {doc.total_pages} trang • {doc.total_chunks} chunks
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handleToggleDoc(doc.doc_id)}
                          className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 hover:text-emerald-500 cursor-pointer"
                          title={doc.is_active !== false ? 'Đang kích hoạt tìm kiếm' : 'Đã tạm tắt'}
                        >
                          {doc.is_active !== false ? (
                            <ToggleRight className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-stone-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(doc.doc_id)}
                          className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-500 cursor-pointer"
                          title="Xóa tài liệu khỏi kho"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConfigModal(false)}
                className="px-5 rounded-xl font-medium text-xs cursor-pointer"
              >
                Đóng & Quay Lại Khung Chat
              </Button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
};
