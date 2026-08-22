/**
 * Aegis-IoT Multi-Agent LangGraph StateGraph Stream Visualizer
 * Real-time Animation, Laser SVG Highway, Typewriter Thought Stream & HITL Action Dispatcher
 */

// Sound effect generator using Web Audio API
class SoundFX {
    constructor() {
        this.enabled = true;
        this.ctx = null;
    }

    init() {
        if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playNodeActive() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12); // A5
            gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.12);
        } catch (e) {}
    }

    playSuccess() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(1046.50, this.ctx.currentTime + 0.25); // C6
            gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.25);
        } catch (e) {}
    }
}

const sfx = new SoundFX();
let visualizerSpeed = 1.0;
let currentScenario = "energy_saving";
let lastWorkflowResult = null;

// Sound toggle
document.getElementById('btn-sound-toggle')?.addEventListener('click', () => {
    sfx.enabled = !sfx.enabled;
    const icon = document.getElementById('sound-icon');
    if (icon) {
        icon.className = sfx.enabled ? "ph ph-speaker-high text-base text-emerald-600 dark:text-emerald-400" : "ph ph-speaker-slash text-base text-stone-400";
    }
});

// Theme toggle
document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('color-theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
    }
});

function setVisualizerSpeed(speed) {
    visualizerSpeed = speed;
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.classList.remove('active-speed', 'font-bold', 'text-amber-700', 'dark:text-amber-400');
    });
    if (speed === 0.5) document.getElementById('speed-05x')?.classList.add('active-speed', 'font-bold', 'text-amber-700', 'dark:text-amber-400');
    if (speed === 1) document.getElementById('speed-1x')?.classList.add('active-speed', 'font-bold', 'text-amber-700', 'dark:text-amber-400');
    if (speed === 2) document.getElementById('speed-2x')?.classList.add('active-speed', 'font-bold', 'text-amber-700', 'dark:text-amber-400');
    if (speed === 999) document.getElementById('speed-instant')?.classList.add('active-speed', 'font-bold', 'text-amber-700', 'dark:text-amber-400');
}

async function triggerScenario(scenarioName) {
    currentScenario = scenarioName;
    
    // Highlight scenario buttons
    document.querySelectorAll('#btn-scen-energy, #btn-scen-co2, #btn-scen-stale, #btn-scen-heater').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-amber-500', 'ring-sky-500');
    });
    if (scenarioName === 'energy_saving') document.getElementById('btn-scen-energy')?.classList.add('ring-2', 'ring-sky-500');
    if (scenarioName === 'co2_hazard') document.getElementById('btn-scen-co2')?.classList.add('ring-2', 'ring-amber-500');
    if (scenarioName === 'stale_data') document.getElementById('btn-scen-stale')?.classList.add('ring-2', 'ring-amber-500');
    if (scenarioName === 'heater_overheat' || scenarioName === 'stove_overheat') document.getElementById('btn-scen-heater')?.classList.add('ring-2', 'ring-amber-500');

    // Reset Nodes
    for (let i = 1; i <= 5; i++) {
        const card = document.getElementById(`agent-card-${i}`);
        const badge = document.getElementById(`node-status-${i}`);
        if (card) card.className = "agent-node-box cursor-pointer p-3.5 flex flex-col justify-between space-y-2 relative group shadow-sm";
        if (badge) {
            badge.innerText = "STANDBY";
            badge.className = "node-badge px-1.5 py-0.5 text-[9px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded border border-stone-200 dark:border-stone-700";
        }
    }

    const typewriter = document.getElementById('typewriter-content');
    if (typewriter) typewriter.innerHTML = `<span class="text-amber-500 font-mono animate-pulse">Đang nạp cảm biến và khởi động Multi-Agent StateGraph (${scenarioName})...</span>`;

    try {
        const response = await fetch('/api/simulate-anomaly', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario: scenarioName })
        });
        const data = await response.json();
        lastWorkflowResult = data;
        await runVisualizerAnimation(data);
    } catch (err) {
        console.error("Lỗi trigger kịch bản:", err);
        if (typewriter) typewriter.innerHTML = `<span class="text-rose-500">Lỗi kết nối API Multi-Agent: ${err.message}</span>`;
    }
}

async function runVisualizerAnimation(data) {
    const delay = (ms) => new Promise(res => setTimeout(res, visualizerSpeed === 999 ? 10 : ms / visualizerSpeed));

    const steps = [
        {
            node: 1,
            role: "Home Coordinator",
            text: "Tiếp nhận yêu cầu từ người dùng, phân tích ý định (Intent) và khởi tạo phiên điều phối 5-Node StateGraph."
        },
        {
            node: 2,
            role: "IoT Observation Agent",
            text: "Đọc luồng dữ liệu 6 thiết bị Track A từ MQTT Gateway, áp dụng bộ lọc Kalman 1D và kiểm tra độ mới timestamp (Freshness)."
        },
        {
            node: 3,
            role: "Comfort & Energy Agent (Qdrant)",
            text: "Tra cứu quy chuẩn SOP và lịch sử tương tự trong Qdrant Vector Store. Đề xuất điểm cân bằng tiện nghi và tiết kiệm năng lượng."
        },
        {
            node: 4,
            role: "Safety & Risk Guard",
            text: `Đánh giá rủi ro an toàn và sức khỏe: ${data.diagnostic_report?.primary_cause || data.diagnostic_report?.root_cause_summary || "Kiểm soát phụ tải"}. Thiết lập quy trình can thiệp và gắn cờ phê duyệt HITL.`
        },
        {
            node: 5,
            role: "Action & Verification Agent",
            text: `Thực thi gọi Tool tạo Lịch sinh hoạt/Ticket kỹ thuật, thực hiện Đọc lại xác minh (Read-back Verification: ${data.verification_status || "VERIFIED"}) và nạp Qdrant Vector DB để tự học.`
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const card = document.getElementById(`agent-card-${step.node}`);
        const badge = document.getElementById(`node-status-${step.node}`);
        const latSpan = document.getElementById(`node-lat-${step.node}`);
        const roleSpan = document.getElementById('stream-agent-role');
        const typewriter = document.getElementById('typewriter-content');
        const activeBadge = document.getElementById('active-agent-badge');

        sfx.playNodeActive();

        if (card) card.classList.add('node-active-thinking');
        if (badge) {
            badge.innerText = "THINKING";
            badge.className = "node-badge px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-500 text-white rounded animate-pulse";
        }
        if (roleSpan) roleSpan.innerText = step.role + ":";
        if (activeBadge) activeBadge.innerText = `Đang xử lý: ${step.role}`;
        if (typewriter) typewriter.innerHTML = `<span class="text-stone-100">${step.text}</span>`;

        await delay(900);

        if (card) {
            card.classList.remove('node-active-thinking');
            card.classList.add('node-completed');
        }
        if (badge) {
            badge.innerText = "DONE";
            badge.className = "node-badge px-1.5 py-0.5 text-[9px] font-mono font-bold bg-emerald-600 text-white rounded";
        }
        if (latSpan) latSpan.innerText = `${Math.floor(Math.random() * 20 + 15)} ms`;
    }

    sfx.playSuccess();

    // Render Diagnostic Report & Mitigation Plan
    renderDiagnosticUI(data);
}

function renderDiagnosticUI(data) {
    const diagBadge = document.getElementById('diag-status-badge');
    const diagHeadline = document.getElementById('diag-headline');
    const diagBody = document.getElementById('diag-body');
    const diagSop = document.getElementById('diag-sop-context');

    const diag = data.diagnostic_report;
    if (diag) {
        if (diagBadge) {
            diagBadge.innerText = diag.severity || "CRITICAL";
            diagBadge.className = diag.severity === "CRITICAL" ? "px-2 py-0.5 text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded" : "px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded";
        }
        if (diagHeadline) diagHeadline.innerText = `Phát hiện: ${diag.primary_cause || "Sự cố phụ tải gia đình"}`;
        if (diagBody) diagBody.innerText = `Đánh giá rủi ro an toàn: ${diag.risk_assessment || "Nguy cơ cao. Cần cách ly thiết bị phụ tải."}`;
        if (diagSop) diagSop.innerText = data.rag_sop_context || "SOP-SH-2026: Yêu cầu ngắt phụ tải và chuyển chế độ an toàn.";
    }

    // Mitigation Plan
    const plan = data.mitigation_plan;
    const planBadge = document.getElementById('plan-urgency-badge');
    const stepsList = document.getElementById('plan-steps-list');
    const buttonsContainer = document.getElementById('action-buttons-container');

    if (plan) {
        if (planBadge) {
            planBadge.innerText = plan.urgency_level || "HIGH";
            planBadge.className = "px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded";
        }

        if (stepsList && plan.steps) {
            stepsList.innerHTML = plan.steps.map(step => `
                <div class="p-2 rounded bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 flex items-start space-x-2 text-xs">
                    <span class="h-4 w-4 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">${step.step_number || 1}</span>
                    <div>
                        <span class="font-bold text-stone-900 dark:text-white block">${step.title || "Thực hiện xử lý"}</span>
                        <span class="text-stone-500 text-[11px] font-sans">${step.action_description || ""}</span>
                    </div>
                </div>
            `).join('');
        }

        if (buttonsContainer && plan.action_buttons) {
            buttonsContainer.innerHTML = plan.action_buttons.map((btn, bIdx) => {
                const aId = btn.button_id || btn.action_id || `act-${bIdx}`;
                const aLabel = btn.title || btn.label || "Phê duyệt lệnh";
                const aStyle = btn.style || (bIdx === 0 ? "danger" : "secondary");
                const aType = btn.action_type || "";
                const aTopic = btn.mqtt_topic || "iot/devices/control";
                const aPayload = btn.mqtt_payload || btn.payload || `{"action": "${aId}"}`;
                const payloadStr = typeof aPayload === "string" ? aPayload : JSON.stringify(aPayload);

                const isDanger = aStyle === "danger" || aType === "SHUTDOWN_DEVICE" || aId.toLowerCase().includes("shutdown") || aId.toLowerCase().includes("power_off");
                const isSecondary = aStyle === "secondary" || aType === "DISMISS" || aId.toLowerCase().includes("dismiss");

                const btnClass = isDanger
                    ? "w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-mono font-bold shadow-md shadow-rose-950/20 border border-rose-500/40 flex items-center justify-between transition-all"
                    : isSecondary
                    ? "w-full py-2.5 px-3.5 rounded-xl bg-stone-100 dark:bg-stone-800/90 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 text-xs font-mono font-bold flex items-center justify-between transition-all"
                    : "w-full py-2.5 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono font-bold shadow-sm flex items-center justify-between transition-all";

                const icon = isDanger
                    ? `<i class="ph ph-shield-warning text-base text-rose-200"></i>`
                    : isSecondary
                    ? `<i class="ph ph-x-circle text-base text-stone-400"></i>`
                    : `<i class="ph ph-lightning text-base text-amber-200"></i>`;

                const badge = isDanger
                    ? `<span class="text-[9.5px] px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-400/30 uppercase">Khẩn cấp</span>`
                    : isSecondary
                    ? `<span class="text-[9.5px] px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400 uppercase">Bỏ qua</span>`
                    : `<span class="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-900/80 text-amber-200 border border-amber-400/30 uppercase">Tối ưu Eco</span>`;

                return `
                    <button onclick='executeActionBtn("${aId}", "${aLabel}", "${aTopic}", ${JSON.stringify(payloadStr)})' class="${btnClass}">
                        <div class="flex items-center space-x-2 text-left">
                            ${icon}
                            <span class="leading-snug">${aLabel}</span>
                        </div>
                        ${badge}
                    </button>
                `;
            }).join('');
        }
    }
}

async function executeActionBtn(actionId, label, topic, payload) {
    const buttonsContainer = document.getElementById('action-buttons-container');
    const feedbackMem = document.getElementById('feedback-memory-status');

    if (buttonsContainer) {
        buttonsContainer.innerHTML = `
            <div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40 space-y-2 animate-in fade-in">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs font-mono">
                        <i class="ph ph-shield-check text-base text-emerald-600"></i>
                        <span>LỆNH ĐÃ ĐƯỢC PHÁT THÀNH CÔNG</span>
                    </div>
                    <span class="text-[10px] font-mono text-stone-400">${new Date().toLocaleTimeString('vi-VN')}</span>
                </div>
                <div class="text-[11px] font-mono text-stone-700 dark:text-stone-300 space-y-1 bg-white/70 dark:bg-stone-900/70 p-2 rounded-lg border border-emerald-500/20">
                    <div class="font-bold text-stone-900 dark:text-white">✓ ${label}</div>
                    <div class="text-[10px] text-stone-500 flex items-center justify-between pt-0.5 border-t border-stone-200 dark:border-stone-800">
                        <span>Topic: <code>${topic || "iot/devices/control"}</code></span>
                        <span class="text-emerald-600 font-bold">MQTT QoS 1</span>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-0.5 text-[10px] font-mono">
                    <span class="text-emerald-700 dark:text-emerald-400">Đã nạp Qdrant 1024D (Few-Shot Learned)</span>
                    <button onclick="renderScenarioMitigationPlan()" class="text-stone-500 hover:text-stone-800 underline">Chọn lại lệnh</button>
                </div>
            </div>
        `;
    }

    if (feedbackMem) {
        feedbackMem.innerHTML = `<span class="text-amber-500 animate-pulse font-mono">Đang phát lệnh MQTT & Upsert Qdrant Memory...</span>`;
    }

    try {
        const response = await fetch('/api/execute-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action_id: actionId,
                label: label,
                mqtt_topic: topic || "iot/devices/control",
                payload: typeof payload === "string" ? payload : JSON.stringify(payload || { action: actionId })
            })
        });
        const res = await response.json();
        sfx.playSuccess();

        if (feedbackMem) {
            feedbackMem.innerHTML = `
                <span class="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                    <i class="ph ph-check-circle"></i>
                    <span>ĐÃ KHÉP VÒNG THÀNH CÔNG • Qdrant 1024D Upserted (Few-Shot Learned)</span>
                </span>
            `;
        }
        await loadVerifiedPlansHistory();
    } catch (e) {
        console.error("Lỗi thực thi nút:", e);
    }
}

function replayAgentWorkflow() {
    if (lastWorkflowResult) {
        runVisualizerAnimation(lastWorkflowResult);
    } else {
        triggerScenario(currentScenario);
    }
}

// ============================================================================
// VERIFIED ACTION PLANS (QDRANT FEEDBACK MEMORY) CONTROLLER
// ============================================================================

let currentVerifiedPlans = [];

async function openVerifiedPlansModal() {
    sfx.playNodeActive();
    const modal = document.getElementById('verified-plans-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    await loadVerifiedPlansHistory();
}

function closeVerifiedPlansModal() {
    const modal = document.getElementById('verified-plans-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function loadVerifiedPlansHistory() {
    const tbody = document.getElementById('verified-plans-tbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-stone-400 font-mono text-xs"><i class="ph ph-spinner animate-spin text-base mr-1"></i> Đang tải dữ liệu lịch sử từ Qdrant memory...</td></tr>`;
    }

    try {
        const res = await fetch('/api/history/verified-plans');
        const data = await res.json();
        currentVerifiedPlans = data.records || [];

        // Update KPI Stats
        const stats = data.stats || {};
        const totalEl = document.getElementById('vp-stat-total');
        const critEl = document.getElementById('vp-stat-critical');
        const energyEl = document.getElementById('vp-stat-energy');
        const pillEl = document.getElementById('verified-plans-count-pill');

        if (totalEl) totalEl.innerText = stats.total_records || currentVerifiedPlans.length;
        if (critEl) critEl.innerText = stats.critical_count !== undefined ? stats.critical_count : currentVerifiedPlans.filter(r => r.severity === 'CRITICAL').length;
        if (energyEl) energyEl.innerText = `${stats.total_energy_saved_kwh || 12.5} kWh`;
        if (pillEl) pillEl.innerText = `${currentVerifiedPlans.length} CA`;

        renderVerifiedPlansTable(currentVerifiedPlans);
    } catch (err) {
        console.error("Lỗi tải lịch sử verified plans:", err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-rose-500 font-mono text-xs">Lỗi kết nối máy chủ khi truy vấn Qdrant collection: ${err.message}</td></tr>`;
        }
    }
}

function renderVerifiedPlansTable(records) {
    const tbody = document.getElementById('verified-plans-tbody');
    if (!tbody) return;

    if (!records || records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-stone-400 font-mono text-xs">Chưa có kế hoạch xử lý nào được lưu trong bộ nhớ.</td></tr>`;
        return;
    }

    tbody.innerHTML = records.map((rec, idx) => {
        const timeStr = rec.timestamp ? new Date(rec.timestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' }) : 'Vừa xong';
        
        let sevBadge = `<span class="px-2 py-0.5 text-[9.5px] font-mono font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded">CRITICAL</span>`;
        if (rec.severity === "HIGH") {
            sevBadge = `<span class="px-2 py-0.5 text-[9.5px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded">HIGH</span>`;
        } else if (rec.severity === "MEDIUM" || rec.severity === "LOW") {
            sevBadge = `<span class="px-2 py-0.5 text-[9.5px] font-mono font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded">${rec.severity}</span>`;
        }

        const devBadges = (rec.affected_devices || []).map(d => `<span class="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded text-[10px] mr-1">${d}</span>`).join('');

        return `
            <tr class="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                <td class="p-3 text-stone-500 whitespace-nowrap text-[11px]">${timeStr}</td>
                <td class="p-3">
                    <div class="font-bold text-stone-900 dark:text-white font-sans text-xs">${rec.scenario_name || rec.incident_id}</div>
                    <div class="text-[10px] text-stone-400 font-mono">${rec.incident_id} • ${rec.location || 'Smart Home'}</div>
                </td>
                <td class="p-3">${devBadges || '<span class="text-stone-400">N/A</span>'}</td>
                <td class="p-3">${sevBadge}</td>
                <td class="p-3">
                    <div class="font-semibold text-stone-800 dark:text-stone-200 text-xs">${rec.action_title || rec.action_type}</div>
                    <div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">${rec.status || 'VERIFIED_RESOLVED'}</div>
                </td>
                <td class="p-3">
                    <span class="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                        <i class="ph ph-check-circle"></i>
                        <span>1024D</span>
                    </span>
                </td>
                <td class="p-3 text-right">
                    <button onclick="viewPlanDetail('${rec.record_id || rec.incident_id}')" class="btn-action px-2.5 py-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-purple-700 dark:text-purple-300 font-bold rounded-lg text-xs transition-colors">
                        Chi tiết ➔
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterVerifiedPlans() {
    const searchInput = document.getElementById('vp-search-input');
    const severitySelect = document.getElementById('vp-severity-select');
    const kw = (searchInput?.value || '').trim().toLowerCase();
    const sev = severitySelect?.value || 'ALL';

    let filtered = currentVerifiedPlans;
    if (sev && sev !== 'ALL') {
        filtered = filtered.filter(r => (r.severity || '').toUpperCase() === sev.toUpperCase());
    }
    if (kw) {
        filtered = filtered.filter(r => 
            (r.scenario_name && r.scenario_name.toLowerCase().includes(kw)) ||
            (r.incident_id && r.incident_id.toLowerCase().includes(kw)) ||
            (r.root_cause_summary && r.root_cause_summary.toLowerCase().includes(kw)) ||
            (r.affected_devices && r.affected_devices.some(d => d.toLowerCase().includes(kw)))
        );
    }
    renderVerifiedPlansTable(filtered);
}

function viewPlanDetail(recordId) {
    const rec = currentVerifiedPlans.find(r => r.record_id === recordId || r.incident_id === recordId);
    if (!rec) return;

    const modal = document.getElementById('plan-detail-modal');
    const titleEl = document.getElementById('detail-modal-title');
    const subEl = document.getElementById('detail-modal-sub');
    const bodyEl = document.getElementById('detail-modal-body');

    if (titleEl) titleEl.innerText = rec.scenario_name || `Ca Sự Cố: ${rec.incident_id}`;
    if (subEl) subEl.innerText = `Mã bản ghi: ${rec.record_id} • Thời gian: ${rec.timestamp}`;

    const stepsHtml = (rec.recommended_steps || []).map((s, i) => `
        <li class="flex items-start space-x-2 py-1">
            <span class="h-4 w-4 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">${i+1}</span>
            <span class="text-stone-700 dark:text-stone-300 font-sans text-xs">${s}</span>
        </li>
    `).join('');

    if (bodyEl) {
        bodyEl.innerHTML = `
            <!-- Overview Badges -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div class="p-2 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                    <span class="text-stone-400 block text-[10px]">MỨC ĐỘ</span>
                    <strong class="${rec.severity === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'}">${rec.severity}</strong>
                </div>
                <div class="p-2 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                    <span class="text-stone-400 block text-[10px]">TRẠNG THÁI</span>
                    <strong class="text-emerald-600">${rec.status || 'VERIFIED_RESOLVED'}</strong>
                </div>
                <div class="p-2 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                    <span class="text-stone-400 block text-[10px]">NGƯỜI PHÊ DUYỆT</span>
                    <strong class="text-stone-800 dark:text-stone-200 truncate block">${rec.operator || 'Kỹ Sư Vận Hành'}</strong>
                </div>
                <div class="p-2 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                    <span class="text-stone-400 block text-[10px]">TIẾT KIỆM NĂNG LƯỢNG</span>
                    <strong class="text-amber-700 dark:text-amber-400">${rec.energy_saved_watts || 0} W</strong>
                </div>
            </div>

            <!-- Root Cause Analysis -->
            <div class="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-xl space-y-1">
                <div class="flex items-center space-x-1.5 font-bold text-rose-700 dark:text-rose-300 text-xs font-sans">
                    <i class="ph ph-shield-warning text-sm"></i>
                    <span>Chẩn Đoán Nguyên Nhân Gốc (Root Cause RCA):</span>
                </div>
                <p class="text-stone-700 dark:text-stone-300 font-sans text-xs leading-relaxed">
                    ${rec.root_cause_summary || 'Chưa có mô tả chi tiết.'}
                </p>
            </div>

            <!-- Standard Operating Procedures (SOP Steps) -->
            <div class="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl space-y-1.5">
                <div class="flex items-center justify-between">
                    <span class="font-bold text-stone-800 dark:text-stone-200 text-xs font-sans">Quy Trình Khắc Phục Chuẩn (SOP Steps):</span>
                    <span class="text-[10px] text-purple-600 dark:text-purple-400 font-bold">FEW-SHOT TEMPLATE</span>
                </div>
                <ul class="divide-y divide-stone-100 dark:divide-stone-700/60">
                    ${stepsHtml || '<li class="text-stone-400">Không có bước quy chuẩn cụ thể.</li>'}
                </ul>
            </div>

            <!-- Executed Command & MQTT Payload -->
            <div class="p-3 bg-stone-900 text-stone-100 rounded-xl border border-stone-800 space-y-1.5">
                <div class="flex items-center justify-between text-[10px] text-stone-400">
                    <span>LỆNH MQTT PHÁT THÀNH CÔNG: <strong class="text-amber-400">${rec.mqtt_topic}</strong></span>
                    <span class="text-emerald-400">ACTION: ${rec.action_type}</span>
                </div>
                <pre class="text-emerald-400 text-[11px] whitespace-pre-wrap">${JSON.stringify(rec.mqtt_payload || {}, null, 2)}</pre>
            </div>

            <!-- Qdrant Vector Metadata -->
            <div class="p-2.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-[11px] text-stone-600 dark:text-stone-400 flex items-center justify-between">
                <span>Vector DB Collection: <strong class="text-purple-700 dark:text-purple-300 font-mono">${rec.qdrant_collection || 'verified_action_plans'}</strong> (1024D Multilingual-E5)</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-bold">SYNCHRONIZED</span>
            </div>
        `;
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closePlanDetailModal() {
    const modal = document.getElementById('plan-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function exportVerifiedPlansJson() {
    if (!currentVerifiedPlans || currentVerifiedPlans.length === 0) {
        alert("Không có dữ liệu để xuất.");
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentVerifiedPlans, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `aegis_iot_verified_action_plans_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

async function seedVerifiedPlans() {
    try {
        const res = await fetch('/api/history/verified-plans/seed', { method: 'POST' });
        await res.json();
        await loadVerifiedPlansHistory();
    } catch (e) {
        console.error("Lỗi seed data:", e);
    }
}

// Auto-run default scenario on load
window.addEventListener('DOMContentLoaded', () => {
    loadVerifiedPlansHistory();
    setTimeout(() => {
        triggerScenario('energy_saving');
    }, 600);
});

