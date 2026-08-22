/**
 * Aegis-IoT Scientific Model Specifications & Interactive Formula Calculators
 * Real-time Kalman Filter, Isolation Forest, Multilingual-E5 Cosine, Z-Score & BibTeX Exporter
 */

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

// Live Kalman Calculator
function calculateKalmanLive() {
    const rSlider = document.getElementById('kalman-r-slider');
    const rVal = document.getElementById('kalman-r-val');
    const out = document.getElementById('kalman-calc-output');
    if (!rSlider || !out) return;

    const r = parseFloat(rSlider.value);
    if (rVal) rVal.innerText = r.toFixed(2);

    const zk = 78.5; // measured spike
    const xprev = 26.5; // prior estimate
    const q = 0.05;
    const pprev = 1.0;

    const ppred = pprev + q;
    const kGain = ppred / (ppred + r);
    const xest = xprev + kGain * (zk - xprev);

    out.innerText = `${xest.toFixed(2)} °C (Kalman Gain K: ${kGain.toFixed(3)})`;
}

// Live Isolation Forest Calculator
function calculateIForestLive() {
    const depthSlider = document.getElementById('iforest-depth-slider');
    const depthVal = document.getElementById('iforest-depth-val');
    const out = document.getElementById('iforest-calc-output');
    if (!depthSlider || !out) return;

    const hx = parseFloat(depthSlider.value);
    if (depthVal) depthVal.innerText = hx.toFixed(1);

    const n = 256;
    const gamma = 0.5772156649;
    const cn = 2.0 * (Math.log(n - 1) + gamma) - (2.0 * (n - 1) / n);
    const score = Math.pow(2.0, - (hx / cn));

    let status = "BÌNH THƯỜNG (NORMAL)";
    let colorClass = "text-emerald-700 dark:text-emerald-300";

    if (score > 0.7) {
        status = "BẤT THƯỜNG CAO (CRITICAL)";
        colorClass = "text-rose-700 dark:text-rose-300";
    } else if (score > 0.55) {
        status = "CẢNH BÁO BẤT THƯỜNG (ANOMALY)";
        colorClass = "text-amber-700 dark:text-amber-300";
    }

    out.innerHTML = `<span class="${colorClass}">${score.toFixed(3)} (${status})</span>`;
}

// Live Cosine Similarity Calculator
function calculateCosineLive() {
    const angleSlider = document.getElementById('cosine-angle-slider');
    const angleVal = document.getElementById('cosine-angle-val');
    const out = document.getElementById('cosine-calc-output');
    if (!angleSlider || !out) return;

    const angleDeg = parseFloat(angleSlider.value);
    if (angleVal) angleVal.innerText = `${angleDeg.toFixed(1)}°`;

    const rad = angleDeg * (Math.PI / 180);
    const cosSim = Math.cos(rad);

    let status = "RẤT KHỚP (HIGH RELEVANCE)";
    let colorClass = "text-purple-700 dark:text-purple-300";

    if (cosSim < 0.5) {
        status = "KHÔNG LIÊN QUAN (LOW)";
        colorClass = "text-stone-500";
    } else if (cosSim < 0.75) {
        status = "TRUNG BÌNH (MODERATE)";
        colorClass = "text-amber-700 dark:text-amber-300";
    }

    out.innerHTML = `<span class="${colorClass}">${cosSim.toFixed(3)} (${status})</span>`;
}

// Live Z-Score Calculator
function calculateZScoreLive() {
    const xSlider = document.getElementById('zscore-x-slider');
    const xVal = document.getElementById('zscore-x-val');
    const out = document.getElementById('zscore-calc-output');
    if (!xSlider || !out) return;

    const x = parseFloat(xSlider.value);
    if (xVal) xVal.innerText = `${x.toFixed(1)} °C`;

    const mu = 26.5;
    const sigma = 1.2;
    const z = (x - mu) / sigma;

    let status = "BÌNH THƯỜNG (|Z| ≤ 3)";
    let colorClass = "text-emerald-700 dark:text-emerald-300";

    if (Math.abs(z) > 3) {
        status = "NGOẠI LAI VƯỢT 3-SIGMA (OUTLIER)";
        colorClass = "text-rose-700 dark:text-rose-300";
    }

    out.innerHTML = `<span class="${colorClass}">Z = ${z.toFixed(2)} (${status})</span>`;
}

// Copy BibTeX Function
function copyBibtex() {
    const content = document.getElementById('bibtex-content')?.innerText;
    if (content) {
        navigator.clipboard.writeText(content).then(() => {
            alert("Đã sao chép toàn bộ trích dẫn BibTeX vào clipboard thành công!");
        });
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    calculateKalmanLive();
    calculateIForestLive();
    calculateCosineLive();
    calculateZScoreLive();
});
