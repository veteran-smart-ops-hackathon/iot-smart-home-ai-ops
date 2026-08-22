/**
 * Aegis-IoT Dedicated RAG Studio & PDF Q&A Client Controller
 * Reactive Document Ingestion, Grounded Source Inspection & Web Audio Feedback
 */

// ============================================================================
// 1. STATE & AUDIO ENGINE
// ============================================================================

let isAudioEnabled = true;
let currentCitations = {}; // Map of citation_id -> citation payload
let activeSearchMode = "hybrid";
let isQueryInProgress = false;

const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

function playSound(type) {
    if (!isAudioEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'upload_success') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'query_sent') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(680, now + 0.08);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'response_received') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(659.25, now);
            osc.frequency.setValueAtTime(880, now + 0.08);
            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'click') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(700, now);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            osc.start(now);
            osc.stop(now + 0.04);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.setValueAtTime(180, now + 0.1);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        }
    } catch (e) {
        console.warn("Web Audio notice:", e);
    }
}

// ============================================================================
// 2. DOCUMENT VAULT & INGESTION
// ============================================================================

async function fetchDocuments() {
    try {
        const res = await fetch("/api/rag/documents");
        if (!res.ok) throw new Error("Failed to load documents");
        const data = await res.json();
        
        renderDocumentList(data.documents || []);
        updateStats(data.stats || {});
    } catch (err) {
        console.error("Error fetching documents:", err);
    }
}

function updateStats(stats) {
    const totalDocsEl = document.getElementById("stat-total-docs");
    const totalChunksEl = document.getElementById("stat-total-chunks");
    const docCountBadge = document.getElementById("doc-count-badge");
    const topCollectionBadge = document.getElementById("top-collection-badge");

    if (totalDocsEl) totalDocsEl.textContent = stats.total_documents ?? 0;
    if (totalChunksEl) totalChunksEl.textContent = stats.total_chunks ?? 0;
    if (docCountBadge) docCountBadge.textContent = `${stats.total_documents ?? 0} TÀI LIỆU`;
    if (topCollectionBadge && stats.vector_collection) {
        topCollectionBadge.textContent = stats.vector_collection;
    }
}

function renderDocumentList(docs) {
    const listContainer = document.getElementById("document-vault-list");
    if (!listContainer) return;

    if (docs.length === 0) {
        listContainer.innerHTML = `
            <div class="p-6 text-center text-xs text-slate-500 font-mono border border-dashed border-white/10 rounded-xl">
                Chưa có tài liệu nào trong kho. Hãy kéo thả file PDF hoặc tải tài liệu mẫu.
            </div>
        `;
        return;
    }

    listContainer.innerHTML = docs.map(doc => {
        const isActive = doc.is_active !== false;
        const isSample = doc.is_sample;
        const uploadDate = doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleTimeString() : "";

        return `
            <div class="p-3 rounded-xl bg-obsidian-950/80 border ${isActive ? 'border-white/10' : 'border-white/5 opacity-60'} hover:border-purple-500/30 transition-all space-y-2 group">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2.5 overflow-hidden">
                        <div class="h-7 w-7 rounded-lg ${isSample ? 'bg-purple-500/20 text-purple-300' : 'bg-cyan-500/20 text-cyan-300'} flex-shrink-0 flex items-center justify-center">
                            <i class="ph ${isSample ? 'ph-bookmark-simple' : 'ph-file-pdf'} text-sm"></i>
                        </div>
                        <div class="truncate">
                            <div class="text-xs font-semibold text-slate-200 truncate group-hover:text-white" title="${doc.filename}">${doc.filename}</div>
                            <div class="text-[10px] text-slate-400 font-mono">
                                <span>${doc.total_pages} trang</span> · 
                                <span class="text-purple-400 font-bold">${doc.total_chunks} chunks</span> · 
                                <span>${doc.total_chars} ký tự</span>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center space-x-1 flex-shrink-0">
                        <button onclick="toggleDocActive('${doc.doc_id}')" class="p-1.5 rounded-lg ${isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-white/5 text-slate-500 border border-white/10'} hover:scale-105 transition-transform" title="${isActive ? 'Đang kích hoạt tìm kiếm' : 'Đã tạm tắt'}">
                            <i class="ph ${isActive ? 'ph-toggle-right' : 'ph-toggle-left'} text-sm"></i>
                        </button>
                        <button onclick="deleteDoc('${doc.doc_id}')" class="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors" title="Xóa tài liệu khỏi kho">
                            <i class="ph ph-trash text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

async function toggleDocActive(docId) {
    playSound('click');
    try {
        const res = await fetch(`/api/rag/toggle-active/${docId}`, { method: "POST" });
        if (res.ok) {
            await fetchDocuments();
        }
    } catch (err) {
        console.error("Error toggling doc:", err);
    }
}

async function deleteDoc(docId) {
    if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này khỏi cơ sở tri thức?")) return;
    playSound('click');
    try {
        const res = await fetch(`/api/rag/documents/${docId}`, { method: "DELETE" });
        if (res.ok) {
            await fetchDocuments();
        }
    } catch (err) {
        console.error("Error deleting doc:", err);
    }
}

async function loadSampleDoc(sampleType) {
    playSound('click');
    const btnReload = document.getElementById("btn-reload-samples");
    if (btnReload) btnReload.innerHTML = `<i class="ph ph-spinner animate-spin"></i><span>Đang nạp...</span>`;

    try {
        const res = await fetch("/api/rag/load-sample", { method: "POST" });
        if (res.ok) {
            playSound('upload_success');
            await fetchDocuments();
        }
    } catch (err) {
        console.error("Error loading samples:", err);
        playSound('error');
    } finally {
        if (btnReload) btnReload.innerHTML = `<i class="ph ph-arrows-clockwise"></i><span>Tải Lại Mẫu</span>`;
    }
}

// ============================================================================
// 3. PDF DRAG & DROP UPLOAD CONTROLLER
// ============================================================================

function initDropzone() {
    const dropzone = document.getElementById("pdf-dropzone") || document.getElementById("dropzone");
    const fileInput = document.getElementById("pdf-file-input") || document.getElementById("file-input");
    const progressContainer = document.getElementById("upload-progress-container") || document.getElementById("ingest-status-box");
    const progressBar = document.getElementById("upload-progress-bar") || document.getElementById("ingest-progress-bar");
    const statusText = document.getElementById("upload-status-text") || document.getElementById("ingest-step-title");
    const percentageText = document.getElementById("upload-percentage") || document.getElementById("ingest-percent");
    const ingestBtn = document.getElementById("btn-process-ingest");

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener("click", () => fileInput.click());

    if (ingestBtn) {
        ingestBtn.addEventListener("click", () => {
            if (fileInput.files && fileInput.files.length > 0) {
                handleFileUpload(fileInput.files[0]);
            } else {
                fileInput.click();
            }
        });
    }

    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("border-purple-400", "bg-purple-950/30");
    });

    dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("border-purple-400", "bg-purple-950/30");
    });

    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("border-purple-400", "bg-purple-950/30");
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    async function handleFileUpload(file) {
        const lowerName = file.name.toLowerCase();
        if (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".txt") && !lowerName.endsWith(".md")) {
            alert("Chỉ chấp nhận tệp định dạng .PDF, .TXT hoặc .MD");
            playSound('error');
            return;
        }

        playSound('query_sent');
        if (progressContainer) progressContainer.classList.remove("hidden");
        if (progressBar) progressBar.style.width = "35%";
        if (percentageText) percentageText.textContent = "35%";
        if (statusText) statusText.textContent = `Đang phân tích "${file.name}"...`;

        const formData = new FormData();
        formData.append("file", file);

        try {
            progressBar.style.width = "65%";
            percentageText.textContent = "65%";
            statusText.textContent = "Đang tách trang và sinh vector nhúng 1024d...";

            const res = await fetch("/api/rag/upload-pdf", {
                method: "POST",
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Upload failed");
            }

            const data = await res.json();

            progressBar.style.width = "100%";
            percentageText.textContent = "100%";
            statusText.textContent = `Đã nạp xong: ${data.total_chunks} chunks, ${data.total_pages} trang.`;
            playSound('upload_success');

            await fetchDocuments();

            setTimeout(() => {
                progressContainer.classList.add("hidden");
                progressBar.style.width = "0%";
                fileInput.value = "";
            }, 2500);

        } catch (err) {
            console.error("Upload error:", err);
            statusText.textContent = `Lỗi: ${err.message}`;
            progressBar.classList.add("bg-rose-500");
            playSound('error');
            setTimeout(() => {
                progressContainer.classList.add("hidden");
                progressBar.classList.remove("bg-rose-500");
                progressBar.style.width = "0%";
                fileInput.value = "";
            }, 3500);
        }
    }
}

// ============================================================================
// 4. INTERACTIVE MULTI-TURN Q&A CHAT
// ============================================================================

function formatMarkdown(text) {
    if (!text) return "";
    let html = text
        // Code blocks
        .replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, '<div class="my-2 p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] overflow-x-auto text-purple-200"><code>$2</code></div>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-black/40 text-purple-300 font-mono text-[11px] border border-white/10">$1</code>')
        // Headings
        .replace(/^### (.*$)/gim, '<h4 class="text-xs font-bold text-slate-200 mt-2 mb-1">$1</h4>')
        .replace(/^## (.*$)/gim, '<h3 class="text-xs font-bold text-purple-300 mt-2.5 mb-1">$1</h3>')
        .replace(/^# (.*$)/gim, '<h2 class="text-sm font-bold text-white mt-3 mb-1 pb-0.5 border-b border-white/10">$1</h2>')
        // Bold & Italic
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>')
        // Blockquote
        .replace(/^> (.*$)/gim, '<blockquote class="border-l-2 border-purple-500/80 bg-purple-950/30 pl-2.5 py-1 my-1.5 rounded-r italic text-slate-300">$1</blockquote>')
        // Bullet Lists
        .replace(/^\s*[-*]\s+(.*$)/gim, '<div class="flex items-start space-x-1.5 my-0.5"><span class="text-purple-400 shrink-0">•</span><span>$1</span></div>')
        // Numbered lists
        .replace(/^\s*(\d+)\.\s+(.*$)/gim, '<div class="flex items-start space-x-1.5 my-0.5"><span class="text-purple-400 font-mono font-bold shrink-0">$1.</span><span>$2</span></div>')
        // Newlines
        .replace(/\n\n/g, '<div class="h-2"></div>');
    return html;
}

function toggleCoT(cotId) {
    playSound('click');
    const content = document.getElementById(cotId);
    const chevron = document.getElementById('chev-' + cotId);
    if (!content) return;
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-180');
    } else {
        content.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-180');
    }
}

function appendUserMessage(query) {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;

    const msgDiv = document.createElement("div");
    msgDiv.className = "flex items-start justify-end space-x-3 animate-in fade-in slide-in-from-bottom-2 duration-200";
    msgDiv.innerHTML = `
        <div class="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-500/30 max-w-[85%] text-xs text-white leading-relaxed shadow-lg">
            <div class="flex items-center justify-between pb-1 text-[10px] font-mono text-purple-300 border-b border-white/10 mb-1.5">
                <span>KỸ SƯ HỆ THỐNG</span>
                <span>${new Date().toLocaleTimeString()}</span>
            </div>
            <div>${query}</div>
        </div>
        <div class="h-8 w-8 rounded-lg bg-obsidian-900 border border-white/15 flex-shrink-0 flex items-center justify-center text-purple-300 shadow">
            <i class="ph ph-user text-sm"></i>
        </div>
    `;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function appendThinkingShimmer() {
    const container = document.getElementById("chat-messages-container");
    if (!container) return null;

    const shimmerDiv = document.createElement("div");
    shimmerDiv.id = "thinking-shimmer";
    shimmerDiv.className = "flex items-start space-x-3 animate-pulse";
    shimmerDiv.innerHTML = `
        <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white">
            <i class="ph ph-robot text-sm"></i>
        </div>
        <div class="p-3.5 rounded-2xl bg-obsidian-950/80 border border-purple-500/20 text-xs text-purple-300 font-mono flex items-center space-x-2">
            <i class="ph ph-spinner animate-spin"></i>
            <span>Đang tra cứu Vector 1024d & lý luận trích dẫn (Chain of Thought)...</span>
        </div>
    `;
    container.appendChild(shimmerDiv);
    container.scrollTop = container.scrollHeight;
    return shimmerDiv;
}

function appendAssistantMessage(data) {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;

    // Remove shimmer
    const shimmer = document.getElementById("thinking-shimmer");
    if (shimmer) shimmer.remove();

    // Store citations
    if (data.citations && Array.isArray(data.citations)) {
        data.citations.forEach(c => {
            currentCitations[c.chunk_id] = c;
        });
    }

    const cotId = 'cot-' + Date.now();
    const hasCoT = data.chain_of_thought && Array.isArray(data.chain_of_thought) && data.chain_of_thought.length > 0;
    
    let cotHtml = '';
    if (hasCoT) {
        const stepsHtml = data.chain_of_thought.map(s => `
            <div class="p-2 rounded-lg bg-obsidian-900/80 border border-purple-500/20 space-y-1">
                <div class="flex items-center justify-between text-[11px] font-mono">
                    <div class="flex items-center space-x-1.5 text-purple-300 font-bold">
                        <i class="ph ph-check-circle text-emerald-400"></i>
                        <span>Bước ${s.step_number}: ${s.title}</span>
                    </div>
                    ${s.latency_ms ? `<span class="text-[10px] text-slate-400 font-mono">+${s.latency_ms}ms</span>` : ''}
                </div>
                <div class="text-[10.5px] font-sans text-slate-300 pl-4 leading-relaxed">${s.detail}</div>
            </div>
        `).join('');

        cotHtml = `
            <div class="mb-3 rounded-xl border border-purple-500/30 bg-purple-950/20 overflow-hidden">
                <div onclick="toggleCoT('${cotId}')" class="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-purple-900/30 transition-colors select-none">
                    <div class="flex items-center space-x-2 font-mono text-[11px] font-bold text-purple-300">
                        <i class="ph ph-sparkle text-purple-400"></i>
                        <span>Quá trình suy nghĩ (Chain of Thought)</span>
                        <span class="text-[10px] text-slate-400 font-normal">(${data.chain_of_thought.length} bước • ${data.latency_ms || 320}ms)</span>
                    </div>
                    <i id="chev-${cotId}" class="ph ph-caret-down text-purple-400 transition-transform duration-200"></i>
                </div>
                <div id="${cotId}" class="hidden px-3 pb-3 pt-1 border-t border-purple-500/20 space-y-2">
                    ${stepsHtml}
                </div>
            </div>
        `;
    }

    const citationChips = (data.citations || []).map(c => `
        <button onclick="openChunkModal('${c.chunk_id}')" class="btn-tactile px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-[10.5px] font-mono text-purple-300 flex items-center space-x-1.5 transition-all" title="Bấm để xem đoạn trích xuất gốc">
            <i class="ph ph-file-text text-purple-400"></i>
            <span class="truncate max-w-[180px]">${c.filename}</span>
            <span class="text-slate-400">| Tr.${c.page_number}</span>
            <span class="text-emerald-400 font-bold">(${Math.round(c.similarity_score * 100)}%)</span>
            <i class="ph ph-arrow-up-right text-[10px]"></i>
        </button>
    `).join("");

    const msgDiv = document.createElement("div");
    msgDiv.className = "flex items-start space-x-3 animate-in fade-in slide-in-from-bottom-2 duration-300";
    msgDiv.innerHTML = `
        <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white shadow">
            <i class="ph ph-robot text-sm"></i>
        </div>
        <div class="p-4 rounded-2xl bg-obsidian-950/90 border border-white/10 hover:border-purple-500/30 max-w-[90%] space-y-3 text-xs text-slate-200 leading-relaxed shadow-xl transition-all">
            
            <!-- Header Meta -->
            <div class="flex items-center justify-between border-b border-white/10 pb-2">
                <div class="flex items-center space-x-2">
                    <span class="font-mono text-[10.5px] font-bold text-purple-300">AEGIS RAG SPECIALIST</span>
                    <span class="px-1.5 py-0.5 text-[9px] font-mono bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20">${data.model_used || 'LLM Engine'}</span>
                </div>
                <div class="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
                    <span>${data.latency_ms || 0}ms</span>
                    <span class="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Độ tin cậy: ${Math.round((data.confidence_score || 0.95) * 100)}%</span>
                </div>
            </div>

            <!-- Chain of Thought -->
            ${cotHtml}

            <!-- Answer Content -->
            <div class="font-sans space-y-2 text-slate-100">
                ${formatMarkdown(data.answer)}
            </div>

            <!-- Citations Area -->
            ${data.citations && data.citations.length > 0 ? `
                <div class="pt-2 border-t border-white/10 space-y-1.5">
                    <div class="text-[10px] font-mono uppercase text-slate-400 flex items-center space-x-1">
                        <i class="ph ph-quotes text-purple-400"></i>
                        <span>Nguồn Trích Xuất Xác Thực (Grounded Citations):</span>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                        ${citationChips}
                    </div>
                </div>
            ` : ''}

        </div>
    `;

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

async function sendQuery(queryText) {
    if (!queryText || !queryText.trim() || isQueryInProgress) return;

    isQueryInProgress = true;
    const inputEl = document.getElementById("chat-input-textarea");
    const sendBtn = document.getElementById("btn-send-message");
    const topK = parseInt(document.getElementById("top-k-slider")?.value || "4");
    const threshold = parseFloat(document.getElementById("threshold-slider")?.value || "0.15");

    const query = queryText.trim();
    if (inputEl) inputEl.value = "";

    appendUserMessage(query);
    appendThinkingShimmer();
    playSound('query_sent');

    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.classList.add("opacity-50");
    }

    try {
        const res = await fetch("/api/rag/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: query,
                session_id: "rag_studio_session",
                top_k: topK,
                threshold: threshold,
                search_mode: activeSearchMode
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Chat query failed");
        }

        const data = await res.json();
        appendAssistantMessage(data);
        playSound('response_received');

    } catch (err) {
        console.error("Chat error:", err);
        const shimmer = document.getElementById("thinking-shimmer");
        if (shimmer) shimmer.remove();

        appendAssistantMessage({
            answer: `Lỗi kết nối tra cứu: ${err.message}. Vui lòng thử lại.`,
            confidence_score: 0.0,
            model_used: "Error Handler",
            latency_ms: 0,
            citations: []
        });
        playSound('error');
    } finally {
        isQueryInProgress = false;
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.classList.remove("opacity-50");
        }
    }
}

function sendQuickQuery(text) {
    playSound('click');
    sendQuery(text);
}

// ============================================================================
// 5. CHUNK CONTEXT INSPECTOR MODAL
// ============================================================================

function openChunkModal(chunkId) {
    playSound('click');
    const modal = document.getElementById("chunk-modal");
    const docTitle = document.getElementById("modal-doc-title");
    const chunkMeta = document.getElementById("modal-chunk-meta");
    const scoreEl = document.getElementById("modal-score");
    const textContent = document.getElementById("modal-text-content");

    const chunkData = currentCitations[chunkId];
    if (!chunkData) {
        console.warn("Chunk data not found:", chunkId);
        return;
    }

    if (docTitle) docTitle.textContent = chunkData.filename || "Tài Liệu";
    if (chunkMeta) chunkMeta.textContent = `ID: ${chunkData.chunk_id} | Trang: ${chunkData.page_number}`;
    if (scoreEl) scoreEl.textContent = `${Math.round((chunkData.similarity_score || 0.95) * 100)}% Cosine Match`;
    if (textContent) textContent.textContent = chunkData.full_text || chunkData.text_snippet || "Nội dung trống";

    if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
    }
}

function closeChunkModal() {
    playSound('click');
    const modal = document.getElementById("chunk-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }
}

// ============================================================================
// 6. INITIALIZATION & EVENT BINDINGS
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initial Load
    fetchDocuments();
    initDropzone();

    // 2. Chat Form Submit & Input Listeners
    const chatForm = document.getElementById("rag-chat-form");
    const chatInput = document.getElementById("chat-input-textarea") || document.getElementById("chat-input-text");
    const btnSend = document.getElementById("btn-send-message") || document.getElementById("btn-chat-send");

    if (btnSend && chatInput) {
        btnSend.addEventListener("click", () => {
            sendQuery(chatInput.value);
        });
    }

    if (chatForm && chatInput) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            sendQuery(chatInput.value);
        });
    }

    if (chatInput) {
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendQuery(chatInput.value);
            }
        });
    }

    // 3. Clear Chat Button
    const btnClearChat = document.getElementById("btn-clear-chat");
    if (btnClearChat) {
        btnClearChat.addEventListener("click", async () => {
            playSound('click');
            if (confirm("Làm sạch toàn bộ lịch sử đoạn chat?")) {
                await fetch("/api/rag/clear-chat", { method: "POST" });
                const container = document.getElementById("chat-messages-container");
                if (container) {
                    container.innerHTML = `
                        <div class="flex items-start space-x-3">
                            <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white shadow">
                                <i class="ph ph-robot text-sm"></i>
                            </div>
                            <div class="p-4 rounded-2xl bg-obsidian-950/90 border border-purple-500/20 max-w-[90%] space-y-2.5 text-xs text-slate-200 leading-relaxed shadow-lg">
                                <div class="flex items-center justify-between border-b border-white/10 pb-1.5">
                                    <span class="font-mono text-[10.5px] font-bold text-purple-300">TRỢ LÝ KỸ THUẬT AEGIS RAG</span>
                                    <span class="font-mono text-[10px] text-slate-400">ĐÃ LÀM SẠCH</span>
                                </div>
                                <p>Lịch sử trò chuyện đã được làm sạch. Bạn có thể tiếp tục đặt câu hỏi mới.</p>
                            </div>
                        </div>
                    `;
                }
            }
        });
    }

    // 4. Export Chat Button
    const btnExportChat = document.getElementById("btn-export-chat");
    if (btnExportChat) {
        btnExportChat.addEventListener("click", async () => {
            playSound('click');
            try {
                const res = await fetch("/api/rag/history?session_id=rag_studio_session");
                const data = await res.json();
                const history = data.history || [];

                let exportContent = `# BÁO CÁO ĐỐI THOẠI TRÍCH XUẤT TRI THỨC AEGIS-IOT RAG\nThời gian xuất: ${new Date().toISOString()}\nTổng số lượt hỏi đáp: ${history.length}\n\n---\n\n`;

                history.forEach((h, i) => {
                    exportContent += `## LƯỢT ${i+1}: ${h.query}\n- **Thời gian:** ${h.timestamp}\n- **Mô hình:** ${h.model_used}\n- **Độ tin cậy:** ${Math.round(h.confidence_score * 100)}%\n\n### Câu trả lời:\n${h.answer}\n\n### Trích dẫn nguồn:\n`;
                    (h.citations || []).forEach(c => {
                        exportContent += `- [${c.filename}] Trang ${c.page_number} (${Math.round(c.similarity_score*100)}%): "${c.text_snippet}"\n`;
                    });
                    exportContent += `\n---\n\n`;
                });

                const blob = new Blob([exportContent], { type: "text/markdown;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Aegis_RAG_Report_${new Date().getTime()}.md`;
                a.click();
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error("Export error:", err);
            }
        });
    }

    // 5. Sliders Live Value Binding
    const topKSlider = document.getElementById("top-k-slider");
    const topKVal = document.getElementById("top-k-val");
    if (topKSlider && topKVal) {
        topKSlider.addEventListener("input", (e) => {
            topKVal.textContent = `${e.target.value} Chunks`;
        });
    }

    const thresholdSlider = document.getElementById("threshold-slider");
    const thresholdVal = document.getElementById("threshold-val");
    if (thresholdSlider && thresholdVal) {
        thresholdSlider.addEventListener("input", (e) => {
            thresholdVal.textContent = `${parseFloat(e.target.value).toFixed(2)} Cosine`;
        });
    }

    // 6. Retrieval Mode Selector
    const modeBtns = document.querySelectorAll(".rag-mode-btn");
    modeBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            playSound('click');
            modeBtns.forEach(b => {
                b.classList.remove("active", "border-purple-500", "bg-purple-500/20", "text-purple-300");
                b.classList.add("border-white/10", "bg-white/[0.02]", "text-slate-400");
            });
            btn.classList.add("active", "border-purple-500", "bg-purple-500/20", "text-purple-300");
            btn.classList.remove("border-white/10", "bg-white/[0.02]", "text-slate-400");
            activeSearchMode = btn.getAttribute("data-mode") || "hybrid";
        });
    });

    // 7. Modal Close Bindings
    const btnCloseModal = document.getElementById("btn-close-modal");
    const btnModalDone = document.getElementById("btn-modal-done");
    const modal = document.getElementById("chunk-modal");

    if (btnCloseModal) btnCloseModal.addEventListener("click", closeChunkModal);
    if (btnModalDone) btnModalDone.addEventListener("click", closeChunkModal);
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeChunkModal();
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeChunkModal();
    });

    // 8. Sound Toggle Button
    const btnSound = document.getElementById("btn-sound-toggle");
    const soundIcon = document.getElementById("sound-icon");
    const soundText = document.getElementById("sound-text");

    if (btnSound) {
        btnSound.addEventListener("click", () => {
            isAudioEnabled = !isAudioEnabled;
            if (isAudioEnabled) {
                if (soundIcon) soundIcon.className = "ph ph-speaker-high text-sm text-emerald-600 dark:text-emerald-400";
                if (soundText) soundText.textContent = "ÂM THANH BẬT";
                playSound('click');
            } else {
                if (soundIcon) soundIcon.className = "ph ph-speaker-slash text-sm text-stone-400";
                if (soundText) soundText.textContent = "ÂM THANH TẮT";
            }
        });
    }

    // 8b. Theme Toggle Button
    const btnTheme = document.getElementById("btn-theme-toggle");
    if (btnTheme) {
        btnTheme.addEventListener("click", () => {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('color-theme', 'light');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('color-theme', 'dark');
            }
            playSound('click');
        });
    }

    // 9. Reload Samples Button
    const btnReload = document.getElementById("btn-reload-samples");
    if (btnReload) {
        btnReload.addEventListener("click", () => loadSampleDoc('all'));
    }
});
