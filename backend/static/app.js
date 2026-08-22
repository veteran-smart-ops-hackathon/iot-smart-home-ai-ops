/**
 * Aegis-IoT Real-time Smart Home MQTT Telemetry Dashboard
 * High-Frequency Chart.js, WebSocket MQTT Stream Receiver & Room Switcher
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

    playClick() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(800, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.05);
        } catch (e) {}
    }

    playAlert() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(440, this.ctx.currentTime);
            osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.1);
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
let currentRoom = "STN_BATHROOM";
let telemetryChart = null;
let ws = null;
let lastPacketTime = Date.now();

// Room metadata dictionary
const ROOM_METAS = {
    "STN_BATHROOM": {
        title: "Phòng Tắm & Gia Nhiệt (STN_BATHROOM)",
        device: "HEATER_01",
        meta: "Giao thức: MQTT Direct • Vị trí: Tầng 1 (Phòng Tắm) • Giám sát: Bình nóng lạnh công suất cao (2452W)",
        icon: "ph-drop",
        defaultTemp: 50.5,
        defaultPower: 2452.0
    },
    "STN_LIVING": {
        title: "Phòng Khách Ấm Cúng (STN_LIVING)",
        device: "AC_01",
        meta: "Giao thức: MQTT Direct • Vị trí: Tầng 1 (Phòng Khách) • Giám sát: Điều hòa Inverter & Cảm biến SENSOR_01",
        icon: "ph-television",
        defaultTemp: 24.0,
        defaultPower: 1229.0
    },
    "STN_BEDROOM": {
        title: "Phòng Ngủ Master (STN_BEDROOM)",
        device: "CO2_01",
        meta: "Giao thức: MQTT Direct • Vị trí: Tầng 2 (Phòng Ngủ) • Giám sát: Cảm biến nồng độ CO2 & Chất lượng không khí",
        icon: "ph-bed",
        defaultTemp: 25.2,
        defaultPower: 45.0
    },
    "STN_BALCONY": {
        title: "Ban Công & Sân Vườn (STN_BALCONY)",
        device: "LIGHT_01",
        meta: "Giao thức: MQTT Direct • Vị trí: Ngoài Trời • Giám sát: Cảm biến quang thông & Đồng hồ METER_01",
        icon: "ph-sun",
        defaultTemp: 28.5,
        defaultPower: 15.0
    }
};

// Toggle Sound
document.getElementById('btn-sound-toggle')?.addEventListener('click', () => {
    sfx.enabled = !sfx.enabled;
    const icon = document.getElementById('sound-icon');
    if (icon) {
        icon.className = sfx.enabled ? "ph ph-speaker-high text-base text-emerald-600 dark:text-emerald-400" : "ph ph-speaker-slash text-base text-stone-400";
    }
});

// Toggle Theme
document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('color-theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
    }
    updateChartTheme();
});

// Initialize Chart.js
function initTelemetryChart() {
    const ctx = document.getElementById('liveTelemetryChart')?.getContext('2d');
    if (!ctx) return;

    const initialLabels = ['01:13:19', '01:13:22', '01:13:25', '01:13:29', '01:13:32', '01:13:35', '01:13:37'];
    const kalmanData = [26.2, 26.4, 26.5, 26.3, 26.5, 26.6, 26.5];
    const rawData = [26.0, 26.7, 26.3, 26.8, 26.1, 26.9, 26.4];

    telemetryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: initialLabels,
            datasets: [
                {
                    label: 'Kalman Smoothed (°C)',
                    data: kalmanData,
                    borderColor: '#15803D',
                    backgroundColor: 'rgba(21, 128, 61, 0.08)',
                    borderWidth: 2.2,
                    tension: 0.35,
                    fill: true,
                    pointRadius: 3,
                    pointBackgroundColor: '#15803D'
                },
                {
                    label: 'Raw Sensor Jitter (°C)',
                    data: rawData,
                    borderColor: '#A8A29E',
                    borderWidth: 1.2,
                    borderDash: [3, 3],
                    tension: 0.2,
                    fill: false,
                    pointRadius: 2,
                    pointBackgroundColor: '#A8A29E'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            interaction: { intersect: false, mode: 'index' },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'JetBrains Mono', size: 9 },
                        color: '#78716C',
                        maxTicksLimit: 7
                    }
                },
                y: {
                    suggestedMin: 20,
                    suggestedMax: 35,
                    grid: { color: 'rgba(120, 113, 108, 0.1)' },
                    ticks: {
                        font: { family: 'JetBrains Mono', size: 9 },
                        color: '#78716C',
                        callback: val => val + '°C'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1C1917',
                    titleFont: { family: 'JetBrains Mono', size: 10 },
                    bodyFont: { family: 'JetBrains Mono', size: 10 },
                    cornerRadius: 6,
                    padding: 8
                }
            }
        }
    });
}

function updateChartTheme() {
    if (!telemetryChart) return;
    telemetryChart.update();
}

function switchRoom(roomId) {
    currentRoom = roomId;
    sfx.playClick();

    // Update button states
    document.querySelectorAll('.room-btn').forEach(btn => {
        btn.classList.remove('active-room-btn', 'border-amber-500', 'bg-amber-50', 'dark:bg-amber-950/40');
        btn.classList.add('border-stone-200', 'dark:border-stone-800');
    });

    const activeBtn = document.getElementById(
        roomId === 'STN_KITCHEN' ? 'btn-room-kitchen' :
        roomId === 'STN_LIVING' ? 'btn-room-living' :
        roomId === 'STN_BEDROOM' ? 'btn-room-bedroom' : 'btn-room-balcony'
    );

    if (activeBtn) {
        activeBtn.classList.remove('border-stone-200', 'dark:border-stone-800');
        activeBtn.classList.add('active-room-btn', 'border-amber-500', 'bg-amber-50', 'dark:bg-amber-950/40');
    }

    const info = ROOM_METAS[roomId];
    if (info) {
        const titleEl = document.getElementById('active-room-title');
        const badgeEl = document.getElementById('active-device-badge');
        const metaEl = document.getElementById('active-room-meta');
        const topicEl = document.getElementById('mqtt-stream-topic');

        if (titleEl) titleEl.innerText = info.title;
        if (badgeEl) badgeEl.innerText = info.device;
        if (metaEl) metaEl.innerText = info.meta;
        if (topicEl) topicEl.innerText = `iot/home/${roomId.toLowerCase().replace('stn_', '')}/telemetry`;
    }
}

// Connect WebSocket for Realtime MQTT Telemetry
function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/mqtt`;

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("MQTT WebSocket Stream đã kết nối:", wsUrl);
            const statusEl = document.getElementById('ws-broker-status');
            if (statusEl) statusEl.innerText = "MQTT 1883 Online (Live WS)";
        };

        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.type === "MQTT_TELEMETRY_BROADCAST") {
                    handleMqttBroadcast(payload);
                }
            } catch (err) {
                console.error("Lỗi parse MQTT JSON:", err);
            }
        };

        ws.onclose = () => {
            console.warn("MQTT WebSocket ngắt kết nối. Thử kết nối lại sau 3s...");
            const statusEl = document.getElementById('ws-broker-status');
            if (statusEl) statusEl.innerText = "MQTT 1883 Reconnecting...";
            setTimeout(initWebSocket, 3000);
        };

        ws.onerror = (err) => {
            console.error("Lỗi WebSocket:", err);
            ws.close();
        };

    } catch (e) {
        console.error("Không thể khởi tạo WebSocket, fallback sang REST polling:", e);
        setInterval(fetchRestTelemetry, 2000);
    }
}

function handleMqttBroadcast(data) {
    const now = Date.now();
    const latency = Math.max(1, now - lastPacketTime);
    lastPacketTime = now;

    // Broker Stats
    if (data.broker_stats) {
        const rateEl = document.getElementById('mqtt-rate');
        const latEl = document.getElementById('mqtt-latency');
        if (rateEl) rateEl.innerText = `${data.broker_stats.throughput_msg_per_sec} msg/s`;
        if (latEl) latEl.innerText = `${data.broker_stats.latency_ms} ms`;
    }

    const currentZoneData = data.zones[currentRoom];
    if (!currentZoneData) return;

    const m = currentZoneData.metrics;

    // Update 6 Metric Cards
    const valTemp = document.getElementById('val-temp');
    const valHeatIndex = document.getElementById('val-heat-index');
    const valHumidity = document.getElementById('val-humidity');
    const valDewPoint = document.getElementById('val-dew-point');
    const valPower = document.getElementById('val-power');
    const valCurrent = document.getElementById('val-current');
    const valPm25 = document.getElementById('val-pm25');
    const valAqi = document.getElementById('val-aqi');
    const valPresenceDot = document.getElementById('val-presence-dot');
    const valPresenceText = document.getElementById('val-presence-text');
    const valVibration = document.getElementById('val-vibration');
    const valNoise = document.getElementById('val-noise');

    if (valTemp) valTemp.innerText = m.temp_c.toFixed(1);
    if (valHeatIndex) valHeatIndex.innerText = `${m.heat_index_c.toFixed(1)} °C`;
    if (valHumidity) valHumidity.innerText = m.humidity_pct.toFixed(0);
    if (valDewPoint) valDewPoint.innerText = `${m.dew_point_c.toFixed(1)} °C`;
    if (valPower) valPower.innerText = m.power_watts.toFixed(1);
    if (valCurrent) valCurrent.innerText = `${m.current_a.toFixed(2)} A (${m.voltage_v}V)`;
    if (valPm25) valPm25.innerText = m.pm25_ugm3.toFixed(0);
    if (valAqi) valAqi.innerText = `${m.aqi_index} (${m.aqi_index < 50 ? 'Tốt' : 'Trung bình'})`;
    
    if (valPresenceDot && valPresenceText) {
        valPresenceDot.className = m.presence_pir ? "h-3 w-3 rounded-full bg-emerald-500" : "h-3 w-3 rounded-full bg-stone-400";
        valPresenceText.innerText = m.presence_pir ? "CÓ NGƯỜI" : "VẮNG NHÀ";
    }

    if (valVibration) valVibration.innerText = m.vibration_mms2.toFixed(3);
    if (valNoise) valNoise.innerText = `${m.noise_db.toFixed(1)} dB (${m.noise_db < 40 ? 'Êm' : 'Bình thường'})`;

    // Update Live Chart
    if (telemetryChart) {
        const timeLabel = data.time_str || new Date().toLocaleTimeString();
        const timeSample = document.getElementById('chart-sample-timestamp');
        if (timeSample) timeSample.innerText = timeLabel;

        telemetryChart.data.labels.push(timeLabel);
        telemetryChart.data.datasets[0].data.push(m.kalman_temp_c || m.temp_c);
        telemetryChart.data.datasets[1].data.push(m.temp_c);

        if (telemetryChart.data.labels.length > 8) {
            telemetryChart.data.labels.shift();
            telemetryChart.data.datasets[0].data.shift();
            telemetryChart.data.datasets[1].data.shift();
        }

        telemetryChart.update('none');
    }

    // Update Terminal Feed
    const jsonFeed = document.getElementById('mqtt-json-feed');
    if (jsonFeed) {
        jsonFeed.innerText = JSON.stringify(currentZoneData, null, 2);
    }
}

async function fetchRestTelemetry() {
    try {
        const res = await fetch('/api/telemetry-stream');
        const data = await res.json();
        // Fallback update
    } catch (e) {}
}

async function triggerScenario(scenario) {
    sfx.playAlert();
    window.location.href = `/agentic`;
}

function executeActionCommand(actionId, description) {
    if (typeof playSound === "function") playSound("click");
    const btnBox = document.getElementById('dynamic-action-container');
    if (btnBox) {
        btnBox.innerHTML = `
            <div class="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-mono text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center space-x-1.5">
                <i class="ph ph-check-circle text-base text-emerald-600"></i>
                <span>LỆNH ĐÃ THỰC THI THÀNH CÔNG (${actionId})</span>
            </div>
        `;
    }
}

// ============================================================================
// EMAIL NOTIFICATION CENTER & AUDIT LOG CONTROLLER
// ============================================================================

let currentNotificationHistory = [];

async function openEmailModal() {
    if (typeof playSound === "function") playSound("click");
    const modal = document.getElementById('email-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    await loadEmailSettings();
    await loadNotificationHistory();
}

function closeEmailModal() {
    if (typeof playSound === "function") playSound("click");
    const modal = document.getElementById('email-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

let currentRecipientsList = [];

async function loadEmailSettings() {
    try {
        const res = await fetch('/api/notifications/settings');
        const data = await res.json();

        const input = document.getElementById('email-recipient-input');
        const toggle = document.getElementById('email-toggle-input');
        const toggleLabel = document.getElementById('email-toggle-label');
        const modeText = document.getElementById('smtp-mode-text');
        const detailText = document.getElementById('smtp-detail-text');
        const pill = document.getElementById('email-status-pill');
        const urlEl = document.getElementById('modal-dashboard-url');

        currentRecipientsList = data.recipient_emails || (data.recipient_email ? data.recipient_email.split(',') : []);

        if (input) input.value = currentRecipientsList.join(', ');
        if (toggle) toggle.checked = !!data.enabled;
        if (toggleLabel) toggleLabel.innerText = data.enabled ? 'BẬT' : 'TẮT';
        if (toggleLabel) toggleLabel.className = data.enabled ? 'text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400' : 'text-xs font-mono font-bold text-stone-400';
        if (pill) {
            const countText = currentRecipientsList.length > 1 ? `ON (${currentRecipientsList.length})` : 'ON';
            pill.innerText = data.enabled ? countText : 'OFF';
            pill.className = data.enabled ? 'px-1.5 py-0.5 text-[9px] rounded font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold' : 'px-1.5 py-0.5 text-[9px] rounded font-mono bg-stone-100 dark:bg-stone-800 text-stone-500 font-semibold';
        }

        if (modeText) {
            modeText.innerText = data.smtp_configured ? `Live SMTP (${data.smtp_host}:${data.smtp_port})` : 'Mô Phỏng An Toàn (Simulated)';
        }
        if (detailText) {
            detailText.innerText = data.smtp_configured ? `Gửi từ: ${data.from_email}` : 'Chưa nhập mật khẩu SMTP (Lưu log in-memory an toàn)';
        }
        if (urlEl) {
            urlEl.innerText = data.dashboard_base_url || window.location.origin;
        }

        renderModalRecipientTags();
    } catch (e) {
        console.error('Lỗi khi tải cấu hình email:', e);
    }
}

function renderModalRecipientTags() {
    const container = document.getElementById('modal-recipients-tags');
    const countEl = document.getElementById('modal-recipients-count');
    if (countEl) countEl.innerText = currentRecipientsList.length;

    if (!container) return;

    if (currentRecipientsList.length === 0) {
        container.innerHTML = `<span class="text-[11px] text-stone-400 font-mono italic">Chưa có email nào. Hãy nhập vào ô trên và bấm Lưu.</span>`;
        return;
    }

    container.innerHTML = currentRecipientsList.map((email) => `
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-mono bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
            <i class="ph ph-envelope-simple text-[10px] text-amber-600 dark:text-amber-400"></i>
            <span>${email}</span>
            <button type="button" onclick="removeModalRecipient('${email}')" class="hover:text-rose-600 dark:hover:text-rose-400 ml-0.5 p-0.5 rounded transition-colors" title="Xóa email này">
                <i class="ph ph-x text-[10px]"></i>
            </button>
        </span>
    `).join('');
}

async function removeModalRecipient(email) {
    try {
        const res = await fetch('/api/notifications/recipients/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        const data = await res.json();
        currentRecipientsList = data.settings?.recipient_emails || [];
        renderModalRecipientTags();
        const input = document.getElementById('email-recipient-input');
        if (input) input.value = currentRecipientsList.join(', ');
        showEmailToast('Đã Xóa Email', `Đã xóa ${email} khỏi danh sách nhận cảnh báo.`, email);
    } catch (e) {
        console.error('Lỗi xóa email:', e);
    }
}

async function toggleEmailAlerts() {
    const toggle = document.getElementById('email-toggle-input');
    const isChecked = toggle ? toggle.checked : true;
    const toggleLabel = document.getElementById('email-toggle-label');
    if (toggleLabel) {
        toggleLabel.innerText = isChecked ? 'BẬT' : 'TẮT';
        toggleLabel.className = isChecked ? 'text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400' : 'text-xs font-mono font-bold text-stone-400';
    }

    try {
        const res = await fetch('/api/notifications/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: isChecked })
        });
        const data = await res.json();
        const pill = document.getElementById('email-status-pill');
        if (pill) {
            pill.innerText = isChecked ? 'ON' : 'OFF';
            pill.className = isChecked ? 'px-1.5 py-0.5 text-[9px] rounded font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold' : 'px-1.5 py-0.5 text-[9px] rounded font-mono bg-stone-100 dark:bg-stone-800 text-stone-500 font-semibold';
        }
    } catch (e) {
        console.error('Lỗi khi cập nhật trạng thái bật/tắt email:', e);
    }
}

async function saveEmailSettings() {
    const input = document.getElementById('email-recipient-input');
    const toggle = document.getElementById('email-toggle-input');
    const btn = document.getElementById('btn-save-email');
    if (!input || !input.value.trim()) {
        alert('Vui lòng nhập ít nhất một địa chỉ email hợp lệ.');
        return;
    }

    const origBtn = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = `<i class="ph ph-circle-notch animate-spin"></i><span>ĐANG LƯU...</span>`;

    try {
        const res = await fetch('/api/notifications/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient_email: input.value.trim(),
                enabled: toggle ? toggle.checked : true
            })
        });
        const data = await res.json();
        currentRecipientsList = data.settings?.recipient_emails || [];
        renderModalRecipientTags();

        if (btn) btn.innerHTML = `<i class="ph ph-check-circle text-emerald-400"></i><span>ĐÃ LƯU</span>`;
        setTimeout(() => { if (btn) btn.innerHTML = origBtn; }, 1800);
        showEmailToast('Đã Lưu Cấu Hình Email', `Đã cập nhật ${currentRecipientsList.length} email nhận cảnh báo thành công!`, currentRecipientsList.join(', '));
    } catch (e) {
        console.error('Lỗi lưu cấu hình:', e);
        if (btn) btn.innerHTML = origBtn;
    }
}

async function sendTestEmail() {
    const input = document.getElementById('email-recipient-input');
    const target = input ? input.value.trim() : '';
    const btn = document.getElementById('btn-test-email');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = `<i class="ph ph-circle-notch animate-spin text-amber-500"></i>`;

    try {
        const res = await fetch('/api/notifications/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_email: target || undefined })
        });
        const data = await res.json();
        if (btn) btn.innerHTML = `<i class="ph ph-check text-emerald-500"></i>`;
        setTimeout(() => { if (btn) btn.innerHTML = origHtml; }, 1800);
        
        await loadNotificationHistory();
        showEmailToast(
            'Đã Gửi Email Thử Nghiệm',
            `Chế độ: ${data.delivery_mode} • Trạng thái: ${data.status}`,
            data.notification?.recipient_email || target
        );
    } catch (e) {
        console.error('Lỗi khi gửi email test:', e);
        if (btn) btn.innerHTML = origHtml;
    }
}

async function loadNotificationHistory() {
    const tbody = document.getElementById('notification-history-tbody');
    if (!tbody) return;

    try {
        const res = await fetch('/api/notifications/history');
        const data = await res.json();
        currentNotificationHistory = data.history || [];

        if (currentNotificationHistory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="p-4 text-center text-stone-400 font-mono text-xs">
                        Chưa có cảnh báo nào được gửi. Hãy thử nhấn "Kích hoạt AI" hoặc nút gửi thử nghiệm.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = currentNotificationHistory.map((item, idx) => {
            let statusBadge = "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400";
            if (item.status === "FAILED") statusBadge = "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400";
            if (item.status === "DISABLED") statusBadge = "bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400";

            let sevBadge = "text-amber-600";
            if (item.severity === "CRITICAL") sevBadge = "text-rose-600 font-bold";

            const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "--:--";

            return `
                <tr class="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors">
                    <td class="p-2.5 text-stone-500">${timeStr}</td>
                    <td class="p-2.5 font-bold text-stone-800 dark:text-stone-200">${item.incident_id}</td>
                    <td class="p-2.5 ${sevBadge}">${item.severity}</td>
                    <td class="p-2.5 text-stone-600 dark:text-stone-400 truncate max-w-[160px]" title="${item.recipient_email}">${item.recipient_email}</td>
                    <td class="p-2.5">
                        <span class="px-1.5 py-0.5 rounded text-[9.5px] font-bold ${statusBadge}">
                            ${item.status} (${item.delivery_mode === "SMTP_LIVE" ? "SMTP" : "SIM"})
                        </span>
                    </td>
                    <td class="p-2.5 text-right">
                        <button onclick="previewNotification(${idx})" class="px-2 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded text-[10px] font-bold">
                            Xem HTML
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error('Lỗi khi tải lịch sử notification:', e);
        tbody.innerHTML = `<tr><td colspan="6" class="p-3 text-center text-rose-500 text-xs">Lỗi tải lịch sử</td></tr>`;
    }
}

function previewNotification(idx) {
    const item = currentNotificationHistory[idx];
    if (!item) return;

    const modal = document.getElementById('email-preview-modal');
    const iframe = document.getElementById('email-preview-frame');
    const titleEl = document.getElementById('preview-modal-title');

    if (titleEl) titleEl.innerText = `Xem trước: ${item.subject}`;
    if (iframe) {
        iframe.srcdoc = item.html_preview || `<p style="padding: 20px; font-family: sans-serif;">Nội dung email dạng văn bản thuần:<br><pre>${item.subject}</pre></p>`;
    }
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeEmailPreviewModal() {
    const modal = document.getElementById('email-preview-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

let toastTimeout = null;
function showEmailToast(title, body, recipient) {
    const toast = document.getElementById('email-toast');
    const titleEl = document.getElementById('toast-title');
    const bodyEl = document.getElementById('toast-body');
    const recipEl = document.getElementById('toast-recipient');
    const timeEl = document.getElementById('toast-timestamp');

    if (titleEl) titleEl.innerText = title || 'Đã Phát Email Cảnh Báo';
    if (bodyEl) bodyEl.innerText = body || 'Email kèm kế hoạch xử lý đã được phát tự động.';
    if (recipEl) recipEl.innerText = recipient || '';
    if (timeEl) timeEl.innerText = new Date().toLocaleTimeString();

    if (toast) {
        toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
        toast.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
    }

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(hideEmailToast, 6000);
}

function hideEmailToast() {
    const toast = document.getElementById('email-toast');
    if (toast) {
        toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
        toast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
    }
}

// ============================================================================
// VERIFIED ACTION PLANS (QDRANT FEEDBACK MEMORY) CONTROLLER
// ============================================================================

let currentVerifiedPlans = [];

async function openVerifiedPlansModal() {
    if (typeof playSound === "function") playSound("click");
    const modal = document.getElementById('verified-plans-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    await loadVerifiedPlansHistory();
}

function closeVerifiedPlansModal() {
    if (typeof playSound === "function") playSound("click");
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
    const kw = (searchInput?.value || '').trim().lowerCase ? searchInput.value.trim().toLowerCase() : (searchInput?.value || '').trim();
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

// On page load
window.addEventListener('DOMContentLoaded', () => {
    initTelemetryChart();
    initWebSocket();
    loadEmailSettings();
    loadVerifiedPlansHistory();

    // Check for incident_id query param from Email Link
    const urlParams = new URLSearchParams(window.location.search);
    const incidentId = urlParams.get('incident_id');
    if (incidentId) {
        showEmailToast('Mở Từ Email Cảnh Báo', `Đã định vị thành công phiên sự cố: ${incidentId}`, 'Đã sẵn sàng phê duyệt');
    }
});

