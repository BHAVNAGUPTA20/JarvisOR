/* ═══════════════════════════════════════════════════════════
   Jarvis OR Guardian — Client Application
   Camera capture, ROI cropping, simulation mode,
   trend tracking, alert engine, voice, chat
   ═══════════════════════════════════════════════════════════ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── State ───────────────────────────────────────────────

const state = {
    apiKey: null,
    baseline: null,
    patientContext: {},
    lastAnalysis: null,
    alertLevel: 'NONE',
    cameraReady: false,
    autoCapture: false,
    autoCaptureTimer: null,
    cameraStream: null,
    visionHistory: [],
    surgicalEvents: [],
    chatHistory: [],
    analyzing: false,
    trendWindowSize: 10,
    roiEnabled: true,
    simMode: false,
};

// ─── ROI Manager ─────────────────────────────────────────

class ROIManager {
    constructor(viewport, box) {
        this.viewport = viewport;
        this.box = box;
        this.roi = { x: 0.08, y: 0.08, w: 0.84, h: 0.84 };
        this.dragging = false;
        this.resizing = false;
        this.resizeDir = null;
        this.startPointer = null;
        this.startROI = null;
        this.bind();
        this.render();
    }

    bind() {
        this.box.addEventListener('pointerdown', (e) => {
            if (this.resizing) return;
            e.preventDefault();
            this.dragging = true;
            this.startPointer = this.normalize(e);
            this.startROI = { ...this.roi };
            this.box.setPointerCapture(e.pointerId);
        });

        this.box.querySelectorAll('.roi-handle').forEach(h => {
            h.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.resizing = true;
                this.resizeDir = h.dataset.dir;
                this.startPointer = this.normalize(e);
                this.startROI = { ...this.roi };
                h.setPointerCapture(e.pointerId);
            });
        });

        document.addEventListener('pointermove', (e) => this.onMove(e));
        document.addEventListener('pointerup', () => {
            this.dragging = false;
            this.resizing = false;
        });
    }

    normalize(e) {
        const r = this.viewport.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    }

    onMove(e) {
        if (!this.dragging && !this.resizing) return;
        const p = this.normalize(e);
        const dx = p.x - this.startPointer.x;
        const dy = p.y - this.startPointer.y;
        const s = this.startROI;

        if (this.dragging) {
            this.roi.x = clamp(s.x + dx, 0, 1 - s.w);
            this.roi.y = clamp(s.y + dy, 0, 1 - s.h);
        } else if (this.resizing) {
            const dir = this.resizeDir;
            const MIN = 0.1;
            if (dir.includes('w')) {
                const newX = clamp(s.x + dx, 0, s.x + s.w - MIN);
                this.roi.w = s.w - (newX - s.x);
                this.roi.x = newX;
            }
            if (dir.includes('e')) {
                this.roi.w = clamp(s.w + dx, MIN, 1 - s.x);
            }
            if (dir.includes('n')) {
                const newY = clamp(s.y + dy, 0, s.y + s.h - MIN);
                this.roi.h = s.h - (newY - s.y);
                this.roi.y = newY;
            }
            if (dir.includes('s')) {
                this.roi.h = clamp(s.h + dy, MIN, 1 - s.y);
            }
        }
        this.render();
    }

    render() {
        const vw = this.viewport.clientWidth;
        const vh = this.viewport.clientHeight;
        this.box.style.left = `${this.roi.x * vw}px`;
        this.box.style.top = `${this.roi.y * vh}px`;
        this.box.style.width = `${this.roi.w * vw}px`;
        this.box.style.height = `${this.roi.h * vh}px`;
    }

    getROI() {
        if (!state.roiEnabled) return null;
        return { enabled: true, ...this.roi };
    }
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

// ─── Camera Manager ──────────────────────────────────────

class CameraManager {
    constructor(videoEl, canvasEl) {
        this.video = videoEl;
        this.canvas = canvasEl;
        this.stream = null;
        this.simObjectURL = null;
    }

    async start() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            this.video.srcObject = this.stream;
            state.cameraStream = this.stream;
            return true;
        } catch (err) {
            console.error('Camera access denied:', err);
            return false;
        }
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
            this.video.srcObject = null;
            state.cameraStream = null;
        }
    }

    loadSimVideo(file) {
        this.stop();
        if (this.simObjectURL) URL.revokeObjectURL(this.simObjectURL);
        this.simObjectURL = URL.createObjectURL(file);
        this.video.srcObject = null;
        this.video.src = this.simObjectURL;
        this.video.loop = true;
        this.video.muted = true;
        this.video.play().catch(() => {});
        state.simMode = true;
    }

    exitSim() {
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
        if (this.simObjectURL) {
            URL.revokeObjectURL(this.simObjectURL);
            this.simObjectURL = null;
        }
        state.simMode = false;
    }

    captureFrame(roi, quality = 0.85) {
        const video = this.video;
        if (!video.videoWidth) return null;

        const fullW = video.videoWidth;
        const fullH = video.videoHeight;
        this.canvas.width = fullW;
        this.canvas.height = fullH;
        this.canvas.getContext('2d').drawImage(video, 0, 0);

        if (roi && roi.enabled) {
            const cx = Math.max(0, Math.round(roi.x * fullW));
            const cy = Math.max(0, Math.round(roi.y * fullH));
            const cw = Math.min(fullW - cx, Math.round(roi.w * fullW));
            const ch = Math.min(fullH - cy, Math.round(roi.h * fullH));

            if (cw > 20 && ch > 20) {
                const crop = document.createElement('canvas');
                crop.width = cw;
                crop.height = ch;
                crop.getContext('2d').drawImage(this.canvas, cx, cy, cw, ch, 0, 0, cw, ch);
                return crop.toDataURL('image/jpeg', quality);
            }
        }

        return this.canvas.toDataURL('image/jpeg', quality);
    }

    isActive() {
        return !!(this.stream || state.simMode);
    }
}

// ─── Vitals Trend Buffer ─────────────────────────────────

class VitalsTrendBuffer {
    constructor(windowSize = 10) {
        this.buffer = [];
        this.windowSize = windowSize;
    }

    push(reading) {
        this.buffer.push({ ...reading, timestamp: Date.now() });
        while (this.buffer.length > this.windowSize) this.buffer.shift();
    }

    getTrendSummary() {
        if (this.buffer.length < 2) return { text: 'Insufficient data', trajectory: 'INSUFFICIENT_DATA' };
        const first = this.buffer[0];
        const last = this.buffer[this.buffer.length - 1];
        const durationMins = ((last.timestamp - first.timestamp) / 60000).toFixed(1);
        const trajectory = this.detectTrajectory();

        const summary = { readings_count: this.buffer.length, duration_mins: durationMins, trajectory };
        for (const key of ['hr', 'spo2', 'sbp', 'dbp', 'map', 'etco2', 'rr']) {
            const fv = first[key], lv = last[key];
            if (fv != null && lv != null) summary[`${key}_delta`] = +(lv - fv).toFixed(1);
        }
        return summary;
    }

    detectTrajectory() {
        const maps = this.buffer.map(r => r.map).filter(v => v != null);
        let slope;
        if (maps.length >= 2) {
            slope = (maps[maps.length - 1] - maps[0]) / maps.length;
        } else {
            const hrs = this.buffer.map(r => r.hr).filter(v => v != null);
            if (hrs.length < 2) return 'INSUFFICIENT_DATA';
            slope = (hrs[hrs.length - 1] - hrs[0]) / hrs.length;
        }
        if (slope < -3) return 'DETERIORATING_FAST';
        if (slope < -1) return 'DECLINING';
        if (slope > 2) return 'IMPROVING';
        return 'STABLE';
    }

    getFormatted() {
        const s = this.getTrendSummary();
        if (typeof s === 'string') return s;
        return JSON.stringify(s);
    }
}

// ─── Alert Engine ────────────────────────────────────────

class AlertEngine {
    constructor() {
        this.audioCtx = null;
    }

    getAudioContext() {
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return this.audioCtx;
    }

    trigger(level, analysis) {
        state.alertLevel = level;
        this.updateBanner(level, analysis);

        if (level === 'CRITICAL') {
            this.showCriticalOverlay(analysis);
            this.speak(`Critical alert. ${(analysis.deviations_from_baseline || [])[0] || 'Immediate attention required.'}`);
            this.vibrate([500, 200, 500, 200, 500]);
            this.playTone(880, 0.8);
        } else if (level === 'CONCERN') {
            this.playTone(660, 0.3);
            this.vibrate([300, 100, 300]);
        } else if (level === 'WATCH') {
            this.playTone(440, 0.15);
        }
    }

    updateBanner(level, analysis) {
        const banner = $('#alert-banner');
        const icon = $('#alert-icon');
        const text = $('#alert-text');
        const time = $('#alert-time');

        banner.classList.remove('hidden', 'alert-none', 'alert-watch', 'alert-concern', 'alert-critical');

        const config = {
            NONE: { cls: 'alert-none', ico: '✅', txt: 'ALL CLEAR' },
            WATCH: { cls: 'alert-watch', ico: '👁', txt: 'WATCH' },
            CONCERN: { cls: 'alert-concern', ico: '⚠️', txt: 'CONCERN' },
            CRITICAL: { cls: 'alert-critical', ico: '🚨', txt: 'CRITICAL' },
        };

        const c = config[level] || config.NONE;
        banner.classList.add(c.cls);
        icon.textContent = c.ico;

        let detail = c.txt;
        if (analysis) {
            const devs = analysis.deviations_from_baseline || [];
            if (devs.length) detail += ` — ${devs[0]}`;
            else if (analysis.trend_interpretation) detail += ` — ${analysis.trend_interpretation}`;
        }
        text.textContent = detail;
        time.textContent = new Date().toLocaleTimeString();
    }

    showCriticalOverlay(analysis) {
        const overlay = $('#critical-overlay');
        const msg = $('#critical-message');
        const vitalsRow = $('#critical-vitals');

        const devs = analysis.deviations_from_baseline || [];
        msg.textContent = devs[0] || 'Physiological instability detected — immediate attention required';

        vitalsRow.innerHTML = '';
        const v = analysis.vitals_extracted || {};
        for (const [key, val] of Object.entries(v)) {
            if (val != null) {
                const el = document.createElement('div');
                el.className = 'critical-vital';
                el.textContent = `${key.toUpperCase()}: ${val}`;
                vitalsRow.appendChild(el);
            }
        }
        overlay.classList.remove('hidden');
    }

    speak(text) {
        if (!('speechSynthesis' in window)) return;
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.9;
        u.volume = 1.0;
        u.pitch = 1.0;
        window.speechSynthesis.speak(u);
    }

    vibrate(pattern) {
        if (navigator.vibrate) navigator.vibrate(pattern);
    }

    playTone(freq, duration) {
        try {
            const ctx = this.getAudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.value = 0.3;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.stop(ctx.currentTime + duration + 0.05);
        } catch (_) {}
    }
}

// ─── Chart Manager ───────────────────────────────────────

class ChartManager {
    constructor(canvasEl) {
        this.chart = new Chart(canvasEl, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'HR', data: [], borderColor: '#ef4444', borderWidth: 2, tension: 0.3, pointRadius: 3 },
                    { label: 'SpO₂', data: [], borderColor: '#06b6d4', borderWidth: 2, tension: 0.3, pointRadius: 3 },
                    { label: 'MAP', data: [], borderColor: '#22d3ee', borderWidth: 2, tension: 0.3, pointRadius: 3 },
                    { label: 'EtCO₂', data: [], borderColor: '#a855f7', borderWidth: 2, tension: 0.3, pointRadius: 3 },
                    { label: 'RR', data: [], borderColor: '#f59e0b', borderWidth: 2, tension: 0.3, pointRadius: 3 },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#94a3b8', usePointStyle: true, padding: 16, font: { size: 11 } } },
                },
                scales: {
                    x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(30,58,95,0.3)' } },
                    y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(30,58,95,0.3)' } },
                },
                animation: { duration: 400 },
            },
        });
    }

    update(history) {
        const labels = history.map((_, i) => `#${i + 1}`);
        this.chart.data.labels = labels;
        const keys = ['hr', 'spo2', 'map', 'etco2', 'rr'];
        keys.forEach((key, idx) => {
            this.chart.data.datasets[idx].data = history.map(r => r[key] ?? null);
        });
        this.chart.update();
    }

    clear() {
        this.chart.data.labels = [];
        this.chart.data.datasets.forEach(ds => { ds.data = []; });
        this.chart.update();
    }
}

// ─── API Client ──────────────────────────────────────────

class APIClient {
    async analyze(base64, opts = {}) {
        const body = {
            image_base64: base64,
            api_key: state.apiKey,
            baseline: state.baseline,
            patient_context: state.patientContext,
            surgical_events: state.surgicalEvents.map(e => `${e.time}: ${e.event}`),
            trend_summary: opts.trendSummary || null,
            preflight: opts.preflight || false,
        };

        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Analysis failed');
        }
        return res.json();
    }

    async chat(message, context, stream = false) {
        const body = { message, api_key: state.apiKey, context, stream };
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Chat failed');
        }

        if (stream) return res.body;
        return res.json();
    }

    async safety(alertData, context) {
        const body = { alert_data: alertData, api_key: state.apiKey, context };
        const res = await fetch('/api/safety', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Safety check failed');
        return res.json();
    }
}

// ─── Main Application ────────────────────────────────────

class JarvisApp {
    constructor() {
        this.camera = new CameraManager($('#camera-feed'), $('#capture-canvas'));
        this.roi = new ROIManager($('#camera-viewport'), $('#roi-box'));
        this.trendBuffer = new VitalsTrendBuffer(state.trendWindowSize);
        this.alerts = new AlertEngine();
        this.chart = new ChartManager($('#trend-chart'));
        this.api = new APIClient();
        this.simClickCount = 0;
        this.simClickTimer = null;
    }

    init() {
        this.bindSetup();
        this.bindCamera();
        this.bindROI();
        this.bindSimulation();
        this.bindChat();
        this.bindEvents();
        this.bindSettings();
        this.bindCriticalOverlay();
    }

    // ── Setup ──

    bindSetup() {
        $('#start-monitoring').addEventListener('click', () => {
            const apiKey = $('#api-key').value.trim();
            if (!apiKey) { alert('Please enter your Gemini API key'); return; }

            state.apiKey = apiKey;
            state.patientContext = {
                age: $('#patient-age').value,
                procedure: $('#patient-procedure').value,
                comorbidities: $('#patient-comorbidities').value,
            };
            state.baseline = {
                hr: +$('#base-hr').value,
                spo2: +$('#base-spo2').value,
                sbp: +$('#base-sbp').value,
                dbp: +$('#base-dbp').value,
                etco2: +$('#base-etco2').value,
                rr: +$('#base-rr').value,
            };

            $('#setup-panel').classList.add('hidden');
            $('#dashboard').classList.remove('hidden');
            $('#connection-dot').className = 'status-dot dot-connected';
            this.renderBaselineVitals();
        });
    }

    renderBaselineVitals() {
        if (!state.baseline) return;
        const b = state.baseline;
        $('#val-hr').textContent = b.hr || '--';
        $('#val-spo2').textContent = b.spo2 || '--';
        $('#val-bp').textContent = `${b.sbp || '--'}/${b.dbp || '--'}`;
        $('#val-etco2').textContent = b.etco2 || '--';
        $('#val-rr').textContent = b.rr || '--';
    }

    // ── ROI ──

    bindROI() {
        const toggle = $('#roi-toggle');
        toggle.addEventListener('change', () => {
            state.roiEnabled = toggle.checked;
            const overlay = $('#roi-overlay');
            if (state.roiEnabled && this.camera.isActive()) {
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        });

        window.addEventListener('resize', () => this.roi.render());
    }

    // ── Simulation Mode ──

    bindSimulation() {
        const logoIcon = document.querySelector('.logo-icon');
        const simInput = $('#sim-video-input');

        // Triple-click on logo toggles sim mode
        logoIcon.addEventListener('click', () => {
            this.simClickCount++;
            clearTimeout(this.simClickTimer);
            this.simClickTimer = setTimeout(() => { this.simClickCount = 0; }, 600);

            if (this.simClickCount >= 3) {
                this.simClickCount = 0;
                if (state.simMode) {
                    this.exitSimMode();
                } else {
                    simInput.click();
                }
            }
        });

        // Ctrl+Shift+S keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                if (state.simMode) {
                    this.exitSimMode();
                } else {
                    simInput.click();
                }
            }
        });

        simInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            this.enterSimMode(file);
            simInput.value = '';
        });
    }

    enterSimMode(file) {
        this.camera.loadSimVideo(file);

        // Update UI to reflect active state
        $('#camera-toggle').textContent = '⏹ Stop Camera';
        $('#capture-btn').disabled = false;
        $('#preflight-btn').disabled = false;
        $('#camera-status-text').textContent = 'SIM Active';
        $('#camera-status-dot').className = 'status-dot dot-active';
        $('#camera-placeholder').classList.add('hidden');
        $('#sim-badge').classList.remove('hidden');

        if (state.roiEnabled) {
            $('#roi-overlay').classList.remove('hidden');
        }

        // Auto-start 3s capture in sim mode
        if (!state.autoCapture) {
            $('#auto-capture-toggle').checked = true;
            this.startAutoCapture(3000);
        }
    }

    exitSimMode() {
        this.camera.exitSim();
        this.stopAutoCapture();

        $('#camera-toggle').textContent = '📷 Start Camera';
        $('#capture-btn').disabled = true;
        $('#preflight-btn').disabled = true;
        $('#camera-status-text').textContent = 'Camera Off';
        $('#camera-status-dot').className = 'status-dot dot-off';
        $('#camera-placeholder').classList.remove('hidden');
        $('#sim-badge').classList.add('hidden');
        $('#roi-overlay').classList.add('hidden');
    }

    // ── Camera ──

    bindCamera() {
        const toggleBtn = $('#camera-toggle');
        const captureBtn = $('#capture-btn');
        const preflightBtn = $('#preflight-btn');
        const autoToggle = $('#auto-capture-toggle');
        const intervalSel = $('#capture-interval');
        const uploadInput = $('#upload-image');

        toggleBtn.addEventListener('click', async () => {
            if (state.simMode) {
                this.exitSimMode();
                return;
            }

            if (this.camera.isActive()) {
                this.camera.stop();
                toggleBtn.textContent = '📷 Start Camera';
                captureBtn.disabled = true;
                preflightBtn.disabled = true;
                $('#camera-status-text').textContent = 'Camera Off';
                $('#camera-status-dot').className = 'status-dot dot-off';
                $('#camera-placeholder').classList.remove('hidden');
                $('#roi-overlay').classList.add('hidden');
                this.stopAutoCapture();
            } else {
                const ok = await this.camera.start();
                if (ok) {
                    toggleBtn.textContent = '⏹ Stop Camera';
                    captureBtn.disabled = false;
                    preflightBtn.disabled = false;
                    $('#camera-status-text').textContent = 'Camera Active';
                    $('#camera-status-dot').className = 'status-dot dot-active';
                    $('#camera-placeholder').classList.add('hidden');
                    if (state.roiEnabled) $('#roi-overlay').classList.remove('hidden');
                } else {
                    alert('Could not access camera. Please grant camera permission.');
                }
            }
        });

        captureBtn.addEventListener('click', () => this.captureAndAnalyze());
        preflightBtn.addEventListener('click', () => this.runPreflight());

        autoToggle.addEventListener('change', () => {
            if (autoToggle.checked) {
                this.startAutoCapture(+intervalSel.value);
            } else {
                this.stopAutoCapture();
            }
        });

        intervalSel.addEventListener('change', () => {
            if (state.autoCapture) {
                this.stopAutoCapture();
                this.startAutoCapture(+intervalSel.value);
            }
        });

        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => this.analyzeFrame(reader.result);
            reader.readAsDataURL(file);
        });
    }

    startAutoCapture(intervalMs) {
        state.autoCapture = true;
        $('#auto-capture-status').textContent = `every ${intervalMs / 1000}s`;
        state.autoCaptureTimer = setInterval(() => {
            if (!state.analyzing) this.captureAndAnalyze();
        }, intervalMs);
    }

    stopAutoCapture() {
        state.autoCapture = false;
        $('#auto-capture-status').textContent = '';
        if (state.autoCaptureTimer) {
            clearInterval(state.autoCaptureTimer);
            state.autoCaptureTimer = null;
        }
        $('#auto-capture-toggle').checked = false;
    }

    captureAndAnalyze() {
        const roi = this.roi.getROI();
        const frame = this.camera.captureFrame(roi);
        if (!frame) return;
        this.flashCapture();
        this.analyzeFrame(frame);
    }

    flashCapture() {
        const flash = $('#capture-flash');
        flash.classList.add('flash');
        setTimeout(() => flash.classList.remove('flash'), 120);
    }

    async analyzeFrame(base64Data) {
        if (state.analyzing) return;
        state.analyzing = true;
        this.showAnalyzing(true);

        try {
            const trendSummary = this.trendBuffer.getFormatted();
            const result = await this.api.analyze(base64Data, { trendSummary });
            if (result.error) {
                console.error('Analysis error:', result.raw);
                this.appendChat('assistant', 'Vision analysis failed — could not parse monitor image. Try adjusting camera angle or ROI.');
                return;
            }
            this.onAnalysisResult(result);
        } catch (err) {
            console.error('Analysis request failed:', err);
            this.appendChat('assistant', `Analysis error: ${err.message}`);
        } finally {
            state.analyzing = false;
            this.showAnalyzing(false);
        }
    }

    async runPreflight() {
        const roi = this.roi.getROI();
        const frame = this.camera.captureFrame(roi);
        if (!frame) return;

        this.flashCapture();
        this.showAnalyzing(true);

        try {
            const result = await this.api.analyze(frame, { preflight: true });
            this.renderPreflightResult(result);
        } catch (err) {
            alert('Pre-flight check failed: ' + err.message);
        } finally {
            this.showAnalyzing(false);
        }
    }

    renderPreflightResult(result) {
        const modal = $('#preflight-modal');
        const content = $('#preflight-result');
        const ready = result.camera_ready;

        let html = `<div class="preflight-status ${ready ? 'preflight-ready' : 'preflight-not-ready'}">`;
        html += ready ? '✅ Camera Ready' : '⚠️ Camera Not Ready';
        html += '</div>';

        if (result.recommendation) {
            html += `<p style="margin-bottom:12px">${result.recommendation}</p>`;
        }

        if (result.readable_parameters?.length) {
            html += '<p><strong>Readable:</strong></p><ul class="preflight-list">';
            result.readable_parameters.forEach(p => { html += `<li style="color:var(--green)">${p}</li>`; });
            html += '</ul>';
        }

        if (result.unreadable_parameters?.length) {
            html += '<p><strong>Not readable:</strong></p><ul class="preflight-list">';
            result.unreadable_parameters.forEach(p => { html += `<li style="color:var(--orange)">${p}</li>`; });
            html += '</ul>';
        }

        if (result.quality_issues?.length) {
            html += '<p><strong>Issues:</strong></p><ul class="preflight-list">';
            result.quality_issues.forEach(q => { html += `<li style="color:var(--yellow)">${q}</li>`; });
            html += '</ul>';
        }

        content.innerHTML = html;
        modal.classList.remove('hidden');

        if (ready) state.cameraReady = true;
        $('#preflight-close').onclick = () => modal.classList.add('hidden');
    }

    showAnalyzing(on) {
        const existing = document.querySelector('.analyzing-indicator');
        if (on && !existing) {
            const div = document.createElement('div');
            div.className = 'analyzing-indicator';
            div.innerHTML = '<span class="spinner"></span> Jarvis analysing monitor…';
            document.querySelector('.camera-panel').appendChild(div);
        } else if (!on && existing) {
            existing.remove();
        }
    }

    // ── Analysis Result ──

    onAnalysisResult(analysis) {
        state.lastAnalysis = analysis;
        const level = analysis.alert_level || 'NONE';

        this.updateVitalsDisplay(analysis.vitals_extracted || {});
        this.updateWaveforms(analysis.waveforms || {});
        this.pushToTrend(analysis);
        this.renderClinicalCard(analysis);
        this.alerts.trigger(level, analysis);
        this.updateTrajectory();

        $('#vitals-timestamp').textContent = new Date().toLocaleTimeString();
    }

    updateVitalsDisplay(v) {
        const set = (id, val) => {
            const el = $(`#val-${id}`);
            if (el) el.textContent = val ?? '--';
        };

        set('hr', v.hr);
        set('spo2', v.spo2);
        set('bp', (v.sbp != null && v.dbp != null) ? `${v.sbp}/${v.dbp}` : '--/--');
        set('map', v.map);
        set('etco2', v.etco2);
        set('rr', v.rr);
        set('temp', v.temp);

        this.highlightAlertVitals(v);
    }

    highlightAlertVitals(v) {
        $$('.vital-card').forEach(c => c.classList.remove('vital-alert'));
        if (!state.baseline) return;
        const b = state.baseline;
        if (v.hr != null && (v.hr > 130 || v.hr < 45)) $('#v-hr')?.classList.add('vital-alert');
        if (v.spo2 != null && v.spo2 < 92) $('#v-spo2')?.classList.add('vital-alert');
        if (v.sbp != null && v.sbp < b.sbp - 30) $('#v-bp')?.classList.add('vital-alert');
        if (v.map != null && v.map < 60) $('#v-map')?.classList.add('vital-alert');
        if (v.etco2 != null && (v.etco2 < 20 || v.etco2 > 50)) $('#v-etco2')?.classList.add('vital-alert');
    }

    updateWaveforms(wf) {
        const section = $('#waveform-section');
        const container = $('#waveform-items');
        const entries = Object.entries(wf).filter(([, v]) => v);

        if (!entries.length) { section.classList.add('hidden'); return; }

        section.classList.remove('hidden');
        container.innerHTML = entries.map(([name, desc]) =>
            `<div class="waveform-item"><strong>${name.replace(/_/g, ' ')}:</strong> ${desc}</div>`
        ).join('');
    }

    pushToTrend(analysis) {
        const v = analysis.vitals_extracted || {};
        if (!Object.values(v).some(val => val != null)) return;

        this.trendBuffer.push(v);
        state.visionHistory.push({
            ...v,
            timestamp: Date.now(),
            alert_level: analysis.alert_level || 'NONE',
        });

        this.chart.update(state.visionHistory);
        this.renderDeltas();
    }

    renderDeltas() {
        const summary = this.trendBuffer.getTrendSummary();
        const container = $('#trend-deltas');
        if (!summary || summary.text) { container.classList.add('hidden'); return; }

        container.classList.remove('hidden');
        let html = '';
        for (const [key, val] of Object.entries(summary)) {
            if (!key.endsWith('_delta')) continue;
            const name = key.replace('_delta', '').toUpperCase();
            const cls = val > 0 ? 'delta-positive' : val < 0 ? 'delta-negative' : 'delta-neutral';
            html += `<div class="delta-item"><span class="delta-label">${name}</span><span class="delta-value ${cls}">${val > 0 ? '+' : ''}${val}</span></div>`;
        }
        container.innerHTML = html;
    }

    updateTrajectory() {
        const summary = this.trendBuffer.getTrendSummary();
        const traj = summary?.trajectory || 'INSUFFICIENT_DATA';
        const icons = {
            DETERIORATING_FAST: '🔴',
            DECLINING: '🟠',
            STABLE: '🟢',
            IMPROVING: '🟢',
            INSUFFICIENT_DATA: '⚪',
        };

        $('#trajectory-icon').textContent = icons[traj] || '⚪';
        $('#trajectory-text').textContent = traj.replace(/_/g, ' ');
        $('#reading-count').textContent = state.visionHistory.length;
    }

    renderClinicalCard(analysis) {
        const card = $('#clinical-card');
        card.classList.remove('hidden');

        const level = analysis.alert_level || 'NONE';
        const icons = { NONE: '✅', WATCH: '👁', CONCERN: '⚠️', CRITICAL: '🚨' };
        $('#card-alert-label').textContent = `${icons[level] || '📋'} Clinical Insight — ${level}`;
        $('#card-timestamp').textContent = new Date().toLocaleTimeString();

        this.showSection('card-trend', analysis.trend_interpretation, 'card-trend-text');
        this.showSection('card-physio', analysis.physiological_explanation, 'card-physio-text');

        const diffs = analysis.differentials || [];
        const diffSection = $('#card-differentials');
        if (diffs.length) {
            diffSection.classList.remove('hidden');
            $('#card-diff-list').innerHTML = diffs.map(d => `<li>${d}</li>`).join('');
        } else {
            diffSection.classList.add('hidden');
        }

        const checks = analysis.immediate_checks || [];
        const checksSection = $('#card-checks');
        if (checks.length) {
            checksSection.classList.remove('hidden');
            $('#card-checks-list').innerHTML = checks.map(c => `<div class="check-item">${c}</div>`).join('');
        } else {
            checksSection.classList.add('hidden');
        }

        const actions = analysis.suggested_actions || [];
        const actionsSection = $('#card-actions');
        if (actions.length) {
            actionsSection.classList.remove('hidden');
            $('#card-actions-list').innerHTML = actions.map(a => `<div class="action-item">${a}</div>`).join('');
        } else {
            actionsSection.classList.add('hidden');
        }

        const alarms = analysis.alarms_visible || [];
        const alarmsSection = $('#card-alarms');
        if (alarms.length) {
            alarmsSection.classList.remove('hidden');
            $('#card-alarms-list').innerHTML = alarms.map(a => `<div class="alarm-item">${a}</div>`).join('');
        } else {
            alarmsSection.classList.add('hidden');
        }

        const quality = analysis.image_quality_note;
        const qualSection = $('#card-quality');
        if (quality) {
            qualSection.classList.remove('hidden');
            $('#card-quality-text').textContent = quality;
        } else {
            qualSection.classList.add('hidden');
        }
    }

    showSection(sectionId, text, textId) {
        const el = $(`#${sectionId}`);
        if (text) {
            el.classList.remove('hidden');
            $(`#${textId}`).textContent = text;
        } else {
            el.classList.add('hidden');
        }
    }

    // ── Chat ──

    bindChat() {
        const input = $('#chat-input');
        const sendBtn = $('#chat-send');
        const voiceBtn = $('#voice-btn');

        const sendMessage = () => {
            const msg = input.value.trim();
            if (!msg) return;
            input.value = '';
            this.sendChat(msg);
        };

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        voiceBtn.addEventListener('click', () => this.startVoiceInput());
    }

    async sendChat(message) {
        this.appendChat('user', message);

        const context = this.buildContext();
        const bubbleEl = this.appendChat('assistant', '');
        bubbleEl.innerHTML = '<span class="spinner"></span>';

        try {
            const res = await this.api.chat(message, context, true);
            const reader = res.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const data = line.slice(6);
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.done) break;
                        if (parsed.text) {
                            fullText += parsed.text;
                            bubbleEl.textContent = fullText;
                        }
                    } catch (_) {}
                }
            }

            if (!fullText) bubbleEl.textContent = '(No response)';
            state.chatHistory.push({ role: 'user', content: message }, { role: 'assistant', content: fullText });

            this.detectSurgicalEvent(message);
        } catch (err) {
            bubbleEl.textContent = `Error: ${err.message}`;
        }
    }

    appendChat(role, text) {
        const container = $('#chat-messages');
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${role}`;
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = text;
        msgDiv.appendChild(bubble);
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
        return bubble;
    }

    buildContext() {
        const parts = [];
        const ctx = state.patientContext;
        parts.push(`Patient: ${ctx.age}yo | Procedure: ${ctx.procedure} | Comorbidities: ${ctx.comorbidities}`);

        if (state.baseline) {
            const b = state.baseline;
            parts.push(`Baseline: HR ${b.hr}, SpO2 ${b.spo2}%, BP ${b.sbp}/${b.dbp}, EtCO2 ${b.etco2}, RR ${b.rr}`);
        }

        if (state.lastAnalysis) {
            const la = state.lastAnalysis;
            parts.push(`Latest vision read: ${JSON.stringify(la.vitals_extracted || {})}`);
            parts.push(`Vision alert: ${la.alert_level || 'NONE'}`);
            if (la.trend_interpretation) parts.push(`Trend: ${la.trend_interpretation}`);
        }

        const trend = this.trendBuffer.getTrendSummary();
        if (trend && !trend.text) {
            parts.push(`Trend summary: ${JSON.stringify(trend)}`);
        }

        if (state.surgicalEvents.length) {
            parts.push('Surgical events:\n' + state.surgicalEvents.slice(-5).map(e => `- ${e.time}: ${e.event}`).join('\n'));
        }

        return parts.join('\n\n');
    }

    detectSurgicalEvent(text) {
        const keywords = ['bolus', 'incision', 'clamp', 'intubat', 'extubat', 'tourniquet', 'blood', 'suture', 'induction'];
        if (keywords.some(kw => text.toLowerCase().includes(kw))) {
            const event = { time: new Date().toLocaleTimeString(), event: `[Voice] ${text}` };
            state.surgicalEvents.push(event);
            this.renderEvents();
        }
    }

    // ── Voice ──

    startVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition not supported in this browser. Try Chrome.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        const voiceBtn = $('#voice-btn');
        voiceBtn.classList.add('btn-recording');
        voiceBtn.textContent = '🔴';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            $('#chat-input').value = transcript;
            voiceBtn.classList.remove('btn-recording');
            voiceBtn.textContent = '🎤';
            this.sendChat(transcript);
        };

        recognition.onerror = () => {
            voiceBtn.classList.remove('btn-recording');
            voiceBtn.textContent = '🎤';
        };

        recognition.onend = () => {
            voiceBtn.classList.remove('btn-recording');
            voiceBtn.textContent = '🎤';
        };

        recognition.start();
    }

    // ── Surgical Events ──

    bindEvents() {
        const input = $('#event-input');
        const logBtn = $('#event-log');
        const clearBtn = $('#clear-trends');

        logBtn.addEventListener('click', () => {
            const text = input.value.trim();
            if (!text) return;
            state.surgicalEvents.push({ time: new Date().toLocaleTimeString(), event: text });
            input.value = '';
            this.renderEvents();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') logBtn.click();
        });

        clearBtn.addEventListener('click', () => {
            state.visionHistory = [];
            this.trendBuffer = new VitalsTrendBuffer(state.trendWindowSize);
            this.chart.clear();
            $('#trend-deltas').classList.add('hidden');
            this.updateTrajectory();
        });
    }

    renderEvents() {
        const container = $('#events-list');
        if (!state.surgicalEvents.length) {
            container.innerHTML = '<p class="events-empty">No events logged yet</p>';
            return;
        }

        container.innerHTML = [...state.surgicalEvents].reverse().map(e =>
            `<div class="event-item"><span class="event-time">${e.time}</span><span>${e.event}</span></div>`
        ).join('');
    }

    // ── Settings ──

    bindSettings() {
        const drawer = $('#settings-drawer');

        $('#settings-toggle').addEventListener('click', () => {
            drawer.classList.toggle('hidden');
            if (!drawer.classList.contains('hidden')) {
                $('#settings-api-key').value = state.apiKey || '';
                $('#settings-window').value = state.trendWindowSize;
                $('#settings-age').value = state.patientContext.age || '';
                $('#settings-procedure').value = state.patientContext.procedure || '';
                $('#settings-comorbidities').value = state.patientContext.comorbidities || '';
            }
        });

        $('#settings-close').addEventListener('click', () => drawer.classList.add('hidden'));

        $('#settings-save').addEventListener('click', () => {
            const newKey = $('#settings-api-key').value.trim();
            if (newKey) state.apiKey = newKey;
            state.trendWindowSize = +$('#settings-window').value || 10;
            this.trendBuffer.windowSize = state.trendWindowSize;
            state.patientContext.age = $('#settings-age').value;
            state.patientContext.procedure = $('#settings-procedure').value;
            state.patientContext.comorbidities = $('#settings-comorbidities').value;
            drawer.classList.add('hidden');
        });

        $('#back-to-setup').addEventListener('click', () => {
            this.camera.stop();
            if (state.simMode) this.exitSimMode();
            this.stopAutoCapture();
            $('#dashboard').classList.add('hidden');
            $('#setup-panel').classList.remove('hidden');
            $('#alert-banner').classList.add('hidden');
            $('#connection-dot').className = 'status-dot dot-disconnected';
            drawer.classList.add('hidden');
        });
    }

    // ── Critical Overlay ──

    bindCriticalOverlay() {
        $('#critical-dismiss').addEventListener('click', () => {
            $('#critical-overlay').classList.add('hidden');
        });
    }
}

// ─── Boot ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    window.jarvis = new JarvisApp();
    jarvis.init();
});
