/* ═══════════════════════════════════════════════════════════
   Jarvis OR Guardian — Client Application
   Multimodal AI Clinical Monitoring & Decision Support
   Camera capture, ROI cropping, simulation mode,
   trend tracking, alert engine, voice, chat,
   manual vitals entry, fluid balance, drug log,
   alarm system, clinical risk prediction
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
    voiceOutputEnabled: false,
    fluidBalance: { ebl: 0, ivf: 0, blood: 0, urine: 0 },
    fluidLog: [],
    drugLog: [],
    activeAlarms: [],
    alarmThresholds: {
        mapLow: 65, spo2Low: 92, etco2Low: 25, etco2High: 50,
        hrLow: 45, hrHigh: 130, siHigh: 0.9, tempHigh: 38.5, tempLow: 35
    },
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

// ─── Gemini Live Voice Session ───────────────────────────

class GeminiLiveSession {
    constructor() {
        this.ws = null;
        this.captureCtx = null;
        this.playbackCtx = null;
        this.mediaStream = null;
        this.processor = null;
        this.isActive = false;
        this.nextPlayTime = 0;
        this.pendingSources = [];

        this.onInputTranscription = null;
        this.onOutputTranscription = null;
        this.onStateChange = null;
        this.onError = null;
        this.onTurnComplete = null;
    }

    async start(apiKey, systemInstruction, voiceName = 'Aoede') {
        if (this.isActive) return;

        const MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
        const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

        this.isActive = true;
        this.onStateChange?.('connecting');
        this._inputTranscript = '';
        this._outputTranscript = '';

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(WS_URL);

            this.ws.onopen = () => {
                const config = {
                    setup: {
                        model: `models/${MODEL}`,
                        generationConfig: {
                            responseModalities: ['AUDIO'],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: { voiceName }
                                }
                            }
                        },
                        systemInstruction: {
                            parts: [{ text: systemInstruction }]
                        },
                        inputAudioTranscription: {},
                        outputAudioTranscription: {}
                    }
                };
                this.ws.send(JSON.stringify(config));
            };

            this.ws.onmessage = async (event) => {
                let raw = event.data;
                if (raw instanceof Blob) {
                    raw = await raw.text();
                }
                let msg;
                try {
                    msg = JSON.parse(raw);
                } catch (_) {
                    return;
                }
                if (msg.setupComplete) {
                    this.onStateChange?.('active');
                    resolve();
                    return;
                }
                this._handleMessage(msg);
            };

            this.ws.onerror = (err) => {
                this.onError?.(err);
                this.stop();
                reject(new Error('WebSocket connection failed'));
            };

            this.ws.onclose = () => {
                if (this.isActive) {
                    this.isActive = false;
                    this.onStateChange?.('closed');
                }
            };
        });
    }

    async startAudioCapture() {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { channelCount: 1, sampleRate: { ideal: 16000 } }
        });

        this.captureCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const source = this.captureCtx.createMediaStreamSource(this.mediaStream);

        const workletCode = `
class PCMProcessor extends AudioWorkletProcessor {
    process(inputs) {
        const ch = inputs[0]?.[0];
        if (ch?.length) this.port.postMessage(ch);
        return true;
    }
}
registerProcessor('pcm-processor', PCMProcessor);`;
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await this.captureCtx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);

        this.processor = new AudioWorkletNode(this.captureCtx, 'pcm-processor');
        this.processor.port.onmessage = (e) => {
            if (!this.isActive || this.ws?.readyState !== WebSocket.OPEN) return;
            const int16 = this._float32ToInt16(e.data);
            const b64 = this._bufferToBase64(int16.buffer);
            this.ws.send(JSON.stringify({
                realtimeInput: {
                    mediaChunks: [{
                        data: b64,
                        mimeType: 'audio/pcm;rate=16000'
                    }]
                }
            }));
        };

        source.connect(this.processor);
        this.processor.connect(this.captureCtx.destination);
    }

    sendText(text) {
        if (!this.isActive || this.ws?.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify({
            clientContent: {
                turns: [{ role: 'user', parts: [{ text }] }],
                turnComplete: true
            }
        }));
    }

    _handleMessage(msg) {
        if (msg.serverContent) {
            const sc = msg.serverContent;

            if (sc.modelTurn?.parts) {
                for (const part of sc.modelTurn.parts) {
                    if (part.inlineData) {
                        this._playAudioChunk(part.inlineData.data);
                    }
                }
            }

            if (sc.inputTranscription?.text) {
                this._inputTranscript += sc.inputTranscription.text;
                this.onInputTranscription?.(this._inputTranscript, false);
            }

            if (sc.outputTranscription?.text) {
                this._outputTranscript += sc.outputTranscription.text;
                this.onOutputTranscription?.(this._outputTranscript, false);
            }

            if (sc.turnComplete) {
                if (this._inputTranscript) {
                    this.onInputTranscription?.(this._inputTranscript, true);
                    this._inputTranscript = '';
                }
                if (this._outputTranscript) {
                    this.onOutputTranscription?.(this._outputTranscript, true);
                    this._outputTranscript = '';
                }
                this.onTurnComplete?.();
            }
        }
    }

    _playAudioChunk(b64Data) {
        if (!this.playbackCtx) {
            this.playbackCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            this.nextPlayTime = 0;
        }

        const raw = atob(b64Data);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

        const buf = this.playbackCtx.createBuffer(1, float32.length, 24000);
        buf.getChannelData(0).set(float32);

        const src = this.playbackCtx.createBufferSource();
        src.buffer = buf;
        src.connect(this.playbackCtx.destination);

        const now = this.playbackCtx.currentTime;
        const t = Math.max(now + 0.01, this.nextPlayTime);
        src.start(t);
        this.nextPlayTime = t + buf.duration;
        this.pendingSources.push(src);
        src.onended = () => {
            const idx = this.pendingSources.indexOf(src);
            if (idx >= 0) this.pendingSources.splice(idx, 1);
        };
    }

    stopPlayback() {
        this.pendingSources.forEach(s => { try { s.stop(); } catch (_) {} });
        this.pendingSources = [];
        this.nextPlayTime = 0;
    }

    stop() {
        this.isActive = false;
        if (this.processor) { this.processor.port.onmessage = null; this.processor.disconnect(); this.processor = null; }
        if (this.captureCtx) { this.captureCtx.close().catch(() => {}); this.captureCtx = null; }
        if (this.mediaStream) { this.mediaStream.getTracks().forEach(t => t.stop()); this.mediaStream = null; }
        if (this.ws && this.ws.readyState <= WebSocket.OPEN) { this.ws.close(); }
        this.ws = null;
        this.stopPlayback();
        if (this.playbackCtx) { this.playbackCtx.close().catch(() => {}); this.playbackCtx = null; }
        this.onStateChange?.('closed');
    }

    _float32ToInt16(f32) {
        const i16 = new Int16Array(f32.length);
        for (let i = 0; i < f32.length; i++) {
            const s = Math.max(-1, Math.min(1, f32[i]));
            i16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return i16;
    }

    _bufferToBase64(buf) {
        const bytes = new Uint8Array(buf);
        let bin = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        return btoa(bin);
    }
}

// ─── Multi-Chart Manager ─────────────────────────────────

function createChart(canvasEl, datasets, opts = {}) {
    return new Chart(canvasEl, {
        type: 'line',
        data: { labels: [], datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', usePointStyle: true, padding: 12, font: { size: 10 } } },
            },
            scales: {
                x: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: 'rgba(30,58,95,0.3)' } },
                y: {
                    ticks: { color: '#64748b', font: { size: 9 } },
                    grid: { color: 'rgba(30,58,95,0.3)' },
                    ...(opts.yMin != null ? { min: opts.yMin } : {}),
                    ...(opts.yMax != null ? { max: opts.yMax } : {}),
                },
            },
            animation: { duration: 400 },
        },
    });
}

class MultiChartManager {
    constructor() {
        this.hemo = createChart($('#hemo-chart'), [
            { label: 'HR (bpm)', data: [], borderColor: '#ef4444', borderWidth: 2, tension: 0.3, pointRadius: 2 },
            { label: 'MAP (mmHg)', data: [], borderColor: '#22d3ee', borderWidth: 2, tension: 0.3, pointRadius: 2 },
            { label: 'SBP (mmHg)', data: [], borderColor: '#10b981', borderWidth: 2, tension: 0.3, pointRadius: 2, borderDash: [4, 2] },
        ]);
        this.resp = createChart($('#resp-chart'), [
            { label: 'SpO₂ (%)', data: [], borderColor: '#06b6d4', borderWidth: 2, tension: 0.3, pointRadius: 2 },
            { label: 'EtCO₂ (mmHg)', data: [], borderColor: '#a855f7', borderWidth: 2, tension: 0.3, pointRadius: 2 },
            { label: 'RR (/min)', data: [], borderColor: '#f59e0b', borderWidth: 2, tension: 0.3, pointRadius: 2 },
        ]);
        this.temp = createChart($('#temp-chart'), [
            { label: 'Temp (°C)', data: [], borderColor: '#f97316', borderWidth: 2, tension: 0.3, pointRadius: 3, fill: true, backgroundColor: 'rgba(249,115,22,0.08)' },
        ]);
        this.fluidSI = createChart($('#fluid-si-chart'), [
            { label: 'Est. Blood Loss (ml)', data: [], borderColor: '#ef4444', borderWidth: 2, tension: 0.3, pointRadius: 2, yAxisID: 'y' },
            { label: 'IV Fluids (ml)', data: [], borderColor: '#10b981', borderWidth: 2, tension: 0.3, pointRadius: 2, yAxisID: 'y' },
            { label: 'Shock Index', data: [], borderColor: '#ec4899', borderWidth: 2, tension: 0.3, pointRadius: 2, yAxisID: 'y1' },
        ]);

        this.fluidSI.options.scales.y1 = {
            position: 'right',
            ticks: { color: '#ec4899', font: { size: 9 } },
            grid: { drawOnChartArea: false },
        };
        this.fluidSI.update();
    }

    update(history) {
        const labels = history.map(r => {
            const d = new Date(r.timestamp);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        });

        this.hemo.data.labels = labels;
        this.hemo.data.datasets[0].data = history.map(r => r.hr ?? null);
        this.hemo.data.datasets[1].data = history.map(r => r.map ?? null);
        this.hemo.data.datasets[2].data = history.map(r => r.sbp ?? null);
        this.hemo.update();

        this.resp.data.labels = labels;
        this.resp.data.datasets[0].data = history.map(r => r.spo2 ?? null);
        this.resp.data.datasets[1].data = history.map(r => r.etco2 ?? null);
        this.resp.data.datasets[2].data = history.map(r => r.rr ?? null);
        this.resp.update();

        this.temp.data.labels = labels;
        this.temp.data.datasets[0].data = history.map(r => r.temp ?? null);
        this.temp.update();

        this.fluidSI.data.labels = labels;
        this.fluidSI.data.datasets[0].data = history.map(r => r.ebl ?? null);
        this.fluidSI.data.datasets[1].data = history.map(r => r.ivf ?? null);
        this.fluidSI.data.datasets[2].data = history.map(r => r.si ?? null);
        this.fluidSI.update();
    }

    clear() {
        [this.hemo, this.resp, this.temp, this.fluidSI].forEach(chart => {
            chart.data.labels = [];
            chart.data.datasets.forEach(ds => { ds.data = []; });
            chart.update();
        });
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

// ─── Derived Vitals Calculator ───────────────────────────

function calcMAP(sbp, dbp) {
    if (sbp == null || dbp == null) return null;
    return Math.round(dbp + (sbp - dbp) / 3);
}

function calcShockIndex(hr, sbp) {
    if (hr == null || sbp == null || sbp === 0) return null;
    return +(hr / sbp).toFixed(2);
}

// ─── Main Application ────────────────────────────────────

class JarvisApp {
    constructor() {
        this.camera = new CameraManager($('#camera-feed'), $('#capture-canvas'));
        this.roi = new ROIManager($('#camera-viewport'), $('#roi-box'));
        this.trendBuffer = new VitalsTrendBuffer(state.trendWindowSize);
        this.alerts = new AlertEngine();
        this.charts = new MultiChartManager();
        this.api = new APIClient();
        this.simClickCount = 0;
        this.simClickTimer = null;
        this.liveSession = null;
        this._liveInputBubble = null;
        this._liveOutputBubble = null;
        this._ttsSession = null;
    }

    init() {
        this.bindDisclaimer();
        this.bindSetup();
        this.bindCamera();
        this.bindROI();
        this.bindSimulation();
        this.bindChat();
        this.bindEvents();
        this.bindSettings();
        this.bindCriticalOverlay();
        this.bindManualEntry();
        this.bindFluidBalance();
        this.bindDrugLog();
        this.bindAlarmPanel();
        this.bindPostopRisk();
        this.bindExportPDF();
    }

    // ── Disclaimer ──

    bindDisclaimer() {
        const modal = $('#disclaimer-modal');
        const acceptBtn = $('#disclaimer-accept');

        acceptBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            $('#setup-panel').classList.remove('hidden');
        });
    }

    // ── Setup ──

    bindSetup() {
        this.bindSectionToggles();
        this.bindBMICalc();
        this.bindComorbidToggle();
        this.bindMedControlledToggle();
        this.bindAnesthesiaOtherToggle();

        $('#start-monitoring').addEventListener('click', () => {
            const apiKey = $('#api-key').value.trim();
            if (!apiKey) { alert('Please enter your Gemini API key'); return; }

            const patientId = $('#patient-id').value.trim();
            const age = $('#patient-age').value.trim();
            const sex = $('#patient-sex').value;
            const clinicalSetting = $('#patient-setting')?.value || '';
            const procedure = $('#patient-procedure').value.trim();
            const anesthesiaTechniques = this.collectAnesthesiaTechniques();
            const baseHR = $('#base-hr').value.trim();
            const baseSBP = $('#base-sbp').value.trim();
            const baseDBP = $('#base-dbp').value.trim();
            const baseSpo2 = $('#base-spo2').value.trim();

            if (!age || !sex) { alert('Please fill Age and Sex (required fields)'); return; }
            if (!clinicalSetting) { alert('Please select a Clinical Setting (required field)'); return; }
            if (!procedure) { alert('Please fill Procedure / Surgery / Admission Reason (required field)'); return; }
            if (!anesthesiaTechniques.length) { alert('Please select at least one Anesthesia Technique (required field)'); return; }
            if (!baseHR || !baseSBP || !baseDBP || !baseSpo2) { alert('Please fill mandatory baseline vitals: HR, SBP, DBP, SpO₂'); return; }

            state.apiKey = apiKey;

            const comorbidities = this.collectComorbidities();
            const medications = this.collectCheckboxes('medications');
            const monitoring = this.collectCheckboxes('monitoring');
            const medControlled = document.querySelector('input[name="med-controlled"]:checked')?.value || 'yes';

            state.patientContext = {
                patient_id: patientId || null,
                age, sex,
                clinical_setting: clinicalSetting,
                weight: $('#patient-weight').value || null,
                height: $('#patient-height').value || null,
                bmi: $('#patient-bmi').value || null,
                procedure,
                specialty: $('#patient-specialty').value || null,
                urgency: $('#patient-urgency').value || null,
                duration: $('#patient-duration').value || null,
                position: $('#patient-position').value || null,
                asa: $('#patient-asa').value || null,
                diagnosis: $('#patient-diagnosis').value || null,
                allergies: $('#patient-allergies').value || null,
                comorbidities: comorbidities.length ? comorbidities.join(', ') : 'None',
                medication_controlled: medControlled,
                medications: medications.length ? medications.join(', ') : 'None',
                other_medications: $('#med-other-text').value || null,
                anesthesia_technique: anesthesiaTechniques.join(', '),
                airway_assessment: $('#patient-airway-assessment').value || null,
                difficult_airway: $('#patient-difficult-airway').value || 'No',
                monitoring_plan: monitoring.length ? monitoring.join(', ') : 'Standard monitoring',
                pregnancy: $('#patient-pregnancy').value || 'N/A',
                npo_hours: $('#patient-npo').value || null,
                blood_group: $('#patient-blood-group').value || null,
                blood_products: $('#patient-blood-products').value || null,
                icu_planned: $('#patient-icu').value || 'No',
                notes: $('#patient-notes').value || null,
            };

            state.baseline = {
                hr: +baseHR,
                spo2: +baseSpo2,
                sbp: +baseSBP,
                dbp: +baseDBP,
                etco2: +$('#base-etco2').value || null,
                rr: +$('#base-rr').value || null,
                temp: +$('#base-temp').value || null,
            };

            state.trendWindowSize = +$('#trend-window').value || 10;
            this.trendBuffer.windowSize = state.trendWindowSize;

            $('#setup-panel').classList.add('hidden');
            $('#dashboard').classList.remove('hidden');
            $('#connection-dot').className = 'status-dot dot-connected';
            $('#export-pdf-btn').classList.remove('hidden');
            this.renderBaselineVitals();
        });
    }

    bindSectionToggles() {
        $$('.form-section-header').forEach(header => {
            header.addEventListener('click', () => {
                const targetId = header.dataset.toggle;
                const body = $(`#${targetId}`);
                if (!body) return;
                body.classList.toggle('hidden');
                header.classList.toggle('collapsed');
            });
        });
    }

    bindBMICalc() {
        const weightEl = $('#patient-weight');
        const heightEl = $('#patient-height');
        const bmiEl = $('#patient-bmi');
        const calc = () => {
            const w = parseFloat(weightEl.value);
            const h = parseFloat(heightEl.value);
            if (w > 0 && h > 0) {
                bmiEl.value = (w / ((h / 100) ** 2)).toFixed(1);
            } else {
                bmiEl.value = '';
            }
        };
        weightEl.addEventListener('input', calc);
        heightEl.addEventListener('input', calc);
    }

    bindComorbidToggle() {
        document.querySelectorAll('input[name="comorbid-toggle"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const show = document.querySelector('input[name="comorbid-toggle"]:checked')?.value === 'yes';
                $('#comorbid-list').classList.toggle('hidden', !show);
            });
        });

        const otherCb = document.querySelector('#comorbid-list input[value="Other"]');
        if (otherCb) {
            otherCb.addEventListener('change', () => {
                $('#comorbid-other-field').classList.toggle('hidden', !otherCb.checked);
            });
        }
    }

    bindMedControlledToggle() {
        document.querySelectorAll('input[name="med-controlled"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const show = document.querySelector('input[name="med-controlled"]:checked')?.value === 'yes';
                $('#med-details').classList.toggle('hidden', !show);
            });
        });
    }

    collectComorbidities() {
        const hasComorbid = document.querySelector('input[name="comorbid-toggle"]:checked')?.value === 'yes';
        if (!hasComorbid) return [];
        const checked = [...document.querySelectorAll('#comorbid-list input[type="checkbox"]:checked')].map(cb => cb.value);
        const otherIdx = checked.indexOf('Other');
        if (otherIdx !== -1) {
            const otherText = $('#comorbid-other-text').value.trim();
            if (otherText) checked[otherIdx] = otherText;
            else checked.splice(otherIdx, 1);
        }
        return checked;
    }

    collectCheckboxes(name) {
        return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(cb => cb.value);
    }

    bindAnesthesiaOtherToggle() {
        const otherCb = $('#anesthesia-other-cb');
        if (otherCb) {
            otherCb.addEventListener('change', () => {
                $('#anesthesia-other-field').classList.toggle('hidden', !otherCb.checked);
            });
        }
    }

    collectAnesthesiaTechniques() {
        const checked = [...document.querySelectorAll('input[name="anesthesia-technique"]:checked')].map(cb => cb.value);
        const otherIdx = checked.indexOf('Other');
        if (otherIdx !== -1) {
            const otherText = $('#anesthesia-other-text').value.trim();
            if (otherText) checked[otherIdx] = otherText;
            else checked.splice(otherIdx, 1);
        }
        return checked;
    }

    renderBaselineVitals() {
        if (!state.baseline) return;
        const b = state.baseline;
        $('#val-hr').textContent = b.hr || '--';
        $('#val-spo2').textContent = b.spo2 || '--';
        $('#val-bp').textContent = `${b.sbp || '--'}/${b.dbp || '--'}`;
        const baseMAP = calcMAP(b.sbp, b.dbp);
        const baseSI = calcShockIndex(b.hr, b.sbp);
        $('#val-map').textContent = baseMAP ?? '--';
        $('#val-etco2').textContent = b.etco2 || '--';
        $('#val-rr').textContent = b.rr || '--';
        $('#val-temp').textContent = b.temp || '--';
        $('#val-si').textContent = baseSI ?? '--';
    }

    // ── Manual Data Entry ──

    bindManualEntry() {
        const header = $('#manual-entry-header');
        const body = $('#manual-entry-body');
        const chevron = $('#manual-collapse-chevron');

        header.addEventListener('click', () => {
            body.classList.toggle('hidden');
            chevron.textContent = body.classList.contains('hidden') ? '▸' : '▾';
        });

        const fields = ['manual-hr', 'manual-sbp', 'manual-dbp'];
        fields.forEach(id => {
            $(`#${id}`).addEventListener('input', () => this.updateManualDerived());
        });

        $('#manual-submit').addEventListener('click', () => this.submitManualVitals());
    }

    updateManualDerived() {
        const hr = parseFloat($('#manual-hr').value);
        const sbp = parseFloat($('#manual-sbp').value);
        const dbp = parseFloat($('#manual-dbp').value);
        const map = calcMAP(sbp, dbp);
        const si = calcShockIndex(hr, sbp);
        $('#manual-map-calc').textContent = map ?? '--';
        $('#manual-si-calc').textContent = si ?? '--';
    }

    submitManualVitals() {
        const hr = parseFloat($('#manual-hr').value) || null;
        const sbp = parseFloat($('#manual-sbp').value) || null;
        const dbp = parseFloat($('#manual-dbp').value) || null;
        const spo2 = parseFloat($('#manual-spo2').value) || null;
        const etco2 = parseFloat($('#manual-etco2').value) || null;
        const rr = parseFloat($('#manual-rr').value) || null;
        const temp = parseFloat($('#manual-temp').value) || null;

        if (!hr && !sbp && !spo2) {
            alert('Please enter at least HR, SBP, or SpO₂.');
            return;
        }

        const map = calcMAP(sbp, dbp);
        const si = calcShockIndex(hr, sbp);

        const vitals = { hr, spo2, sbp, dbp, map, etco2, rr, temp };
        const ventilation = {
            fio2: parseFloat($('#manual-fio2').value) || null,
            tidal_volume: parseFloat($('#manual-tv').value) || null,
            peak_airway_pressure: parseFloat($('#manual-paw').value) || null,
            ventilator_mode: $('#manual-vent-mode').value || null,
            minute_ventilation: parseFloat($('#manual-mv').value) || null,
        };

        this.updateVitalsDisplay(vitals);
        this.pushToTrend({
            vitals_extracted: vitals,
            alert_level: 'NONE',
        }, si);

        this.checkThresholdAlarms(vitals, si);
        this.updateTrajectory();
        $('#vitals-timestamp').textContent = new Date().toLocaleTimeString();

        state.surgicalEvents.push({
            time: new Date().toLocaleTimeString(),
            event: `[Manual] Vitals recorded — HR:${hr || '-'} BP:${sbp || '-'}/${dbp || '-'} SpO₂:${spo2 || '-'} EtCO₂:${etco2 || '-'} RR:${rr || '-'} Temp:${temp || '-'}`,
            type: 'info',
        });
        this.renderEvents();

        this.appendChat('assistant', `Manual vitals recorded. MAP: ${map ?? 'N/A'} mmHg, Shock Index: ${si ?? 'N/A'}.`);
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

        logoIcon.addEventListener('click', () => {
            this.simClickCount++;
            clearTimeout(this.simClickTimer);
            this.simClickTimer = setTimeout(() => { this.simClickCount = 0; }, 600);

            if (this.simClickCount >= 3) {
                this.simClickCount = 0;
                if (state.simMode) this.exitSimMode();
                else simInput.click();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                if (state.simMode) this.exitSimMode();
                else simInput.click();
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
        $('#camera-toggle').textContent = '⏹ Stop Camera';
        $('#capture-btn').disabled = false;
        $('#preflight-btn').disabled = false;
        $('#camera-status-text').textContent = 'SIM Active';
        $('#camera-status-dot').className = 'status-dot dot-active';
        $('#camera-placeholder').classList.add('hidden');
        $('#sim-badge').classList.remove('hidden');
        if (state.roiEnabled) $('#roi-overlay').classList.remove('hidden');
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
            if (state.simMode) { this.exitSimMode(); return; }

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
            if (autoToggle.checked) this.startAutoCapture(+intervalSel.value);
            else this.stopAutoCapture();
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

        if (result.recommendation) html += `<p style="margin-bottom:12px">${result.recommendation}</p>`;

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
            div.innerHTML = '<span class="spinner"></span> Jarvis analysing…';
            document.querySelector('.camera-panel').appendChild(div);
        } else if (!on && existing) {
            existing.remove();
        }
    }

    // ── Analysis Result ──

    onAnalysisResult(analysis) {
        state.lastAnalysis = analysis;
        const level = analysis.alert_level || 'NONE';
        const vitals = analysis.vitals_extracted || {};

        if (vitals.sbp != null && vitals.dbp != null && vitals.map == null) {
            vitals.map = calcMAP(vitals.sbp, vitals.dbp);
        }
        const si = calcShockIndex(vitals.hr, vitals.sbp);

        this.updateVitalsDisplay(vitals);
        this.updateWaveforms(analysis.waveforms || {});
        this.pushToTrend(analysis, si);
        this.renderClinicalCard(analysis);
        this.alerts.trigger(level, analysis);
        this.checkThresholdAlarms(vitals, si);
        this.updateTrajectory();

        if (si != null) {
            $('#val-si').textContent = si;
            if (si > state.alarmThresholds.siHigh) {
                $('#v-si').classList.add('vital-alert-si');
            } else {
                $('#v-si').classList.remove('vital-alert-si');
            }
        }

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

        const si = calcShockIndex(v.hr, v.sbp);
        set('si', si);

        this.highlightAlertVitals(v);
    }

    highlightAlertVitals(v) {
        $$('.vital-card').forEach(c => c.classList.remove('vital-alert'));
        const t = state.alarmThresholds;
        if (v.hr != null && (v.hr > t.hrHigh || v.hr < t.hrLow)) $('#v-hr')?.classList.add('vital-alert');
        if (v.spo2 != null && v.spo2 < t.spo2Low) $('#v-spo2')?.classList.add('vital-alert');
        if (v.sbp != null && state.baseline && v.sbp < state.baseline.sbp - 30) $('#v-bp')?.classList.add('vital-alert');
        if (v.map != null && v.map < t.mapLow) $('#v-map')?.classList.add('vital-alert');
        if (v.etco2 != null && (v.etco2 < t.etco2Low || v.etco2 > t.etco2High)) $('#v-etco2')?.classList.add('vital-alert');
        if (v.temp != null && (v.temp > t.tempHigh || v.temp < t.tempLow)) $('#v-temp')?.classList.add('vital-alert');
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

    pushToTrend(analysis, si) {
        const v = analysis.vitals_extracted || {};
        if (!Object.values(v).some(val => val != null)) return;

        this.trendBuffer.push(v);
        state.visionHistory.push({
            ...v,
            si: si ?? calcShockIndex(v.hr, v.sbp),
            ebl: state.fluidBalance.ebl,
            ivf: state.fluidBalance.ivf,
            timestamp: Date.now(),
            alert_level: analysis.alert_level || 'NONE',
        });

        this.charts.update(state.visionHistory);
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
        } else { diffSection.classList.add('hidden'); }

        const checks = analysis.immediate_checks || [];
        const checksSection = $('#card-checks');
        if (checks.length) {
            checksSection.classList.remove('hidden');
            $('#card-checks-list').innerHTML = checks.map(c => `<div class="check-item">${c}</div>`).join('');
        } else { checksSection.classList.add('hidden'); }

        const actions = analysis.suggested_actions || [];
        const actionsSection = $('#card-actions');
        if (actions.length) {
            actionsSection.classList.remove('hidden');
            $('#card-actions-list').innerHTML = actions.map(a => `<div class="action-item">${a}</div>`).join('');
        } else { actionsSection.classList.add('hidden'); }

        const alarms = analysis.alarms_visible || [];
        const alarmsSection = $('#card-alarms');
        if (alarms.length) {
            alarmsSection.classList.remove('hidden');
            $('#card-alarms-list').innerHTML = alarms.map(a => `<div class="alarm-item">${a}</div>`).join('');
        } else { alarmsSection.classList.add('hidden'); }

        const quality = analysis.image_quality_note;
        const qualSection = $('#card-quality');
        if (quality) {
            qualSection.classList.remove('hidden');
            $('#card-quality-text').textContent = quality;
        } else { qualSection.classList.add('hidden'); }
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

    // ── Fluid Balance ──

    bindFluidBalance() {
        const updateFluid = (type, inputId) => {
            const val = parseFloat($(`#${inputId}`).value) || 0;
            state.fluidBalance[type] = val;
            state.fluidLog.push({
                time: new Date().toLocaleTimeString(),
                type,
                value: val,
            });
            this.renderFluidSummary();
        };

        $('#fluid-ebl-btn').addEventListener('click', () => updateFluid('ebl', 'fluid-ebl'));
        $('#fluid-ivf-btn').addEventListener('click', () => updateFluid('ivf', 'fluid-ivf'));
        $('#fluid-blood-btn').addEventListener('click', () => updateFluid('blood', 'fluid-blood'));
        $('#fluid-urine-btn').addEventListener('click', () => updateFluid('urine', 'fluid-urine'));
    }

    renderFluidSummary() {
        const f = state.fluidBalance;
        const totalLoss = f.ebl + f.urine;
        const totalInput = f.ivf + f.blood;
        const netBalance = totalInput - totalLoss;

        $('#fluid-total-loss').textContent = `${totalLoss} ml`;
        $('#fluid-total-input').textContent = `${totalInput} ml`;
        $('#fluid-net-balance').textContent = `${netBalance >= 0 ? '+' : ''}${netBalance} ml`;

        const logEl = $('#fluid-log');
        logEl.innerHTML = state.fluidLog.slice(-10).reverse().map(entry => {
            const labels = { ebl: 'Blood Loss', ivf: 'IV Fluids', blood: 'Transfusion', urine: 'Urine' };
            return `<div class="fluid-log-entry"><span class="fluid-log-time">${entry.time}</span><span>${labels[entry.type]}: ${entry.value} ml</span></div>`;
        }).join('');
    }

    // ── Drug Administration Log ──

    bindDrugLog() {
        $('#drug-log-btn').addEventListener('click', () => {
            const category = $('#drug-category').value;
            const name = $('#drug-name').value.trim();
            const dose = $('#drug-dose').value.trim();
            const route = $('#drug-route').value.trim();

            if (!name) { alert('Please enter a drug name.'); return; }

            const entry = {
                time: new Date().toLocaleTimeString(),
                category: category || 'Other',
                name,
                dose,
                route,
            };

            state.drugLog.push(entry);

            state.surgicalEvents.push({
                time: entry.time,
                event: `[Drug] ${entry.category}: ${name} ${dose} ${route}`.trim(),
                type: 'drug',
            });

            this.renderDrugLog();
            this.renderEvents();

            $('#drug-name').value = '';
            $('#drug-dose').value = '';
            $('#drug-route').value = '';
        });
    }

    renderDrugLog() {
        const container = $('#drug-log-list');
        if (!state.drugLog.length) {
            container.innerHTML = '<p class="events-empty">No drugs logged yet</p>';
            return;
        }
        container.innerHTML = [...state.drugLog].reverse().map(d =>
            `<div class="drug-log-entry">
                <span class="drug-log-time">${d.time}</span>
                <span class="drug-log-cat">${d.category}</span>
                <span class="drug-log-detail">${d.name} ${d.dose ? '— ' + d.dose : ''} ${d.route ? '(' + d.route + ')' : ''}</span>
            </div>`
        ).join('');
    }

    // ── Alarm & Safety System ──

    bindAlarmPanel() {
        const header = $('#alarm-panel-header');
        const body = $('#alarm-panel-body');
        const chevron = $('#alarm-collapse-chevron');

        header.addEventListener('click', () => {
            body.classList.toggle('hidden');
            chevron.textContent = body.classList.contains('hidden') ? '▸' : '▾';
        });

        const thresholdFields = [
            ['alarm-map-low', 'mapLow'], ['alarm-spo2-low', 'spo2Low'],
            ['alarm-etco2-low', 'etco2Low'], ['alarm-etco2-high', 'etco2High'],
            ['alarm-hr-low', 'hrLow'], ['alarm-hr-high', 'hrHigh'],
            ['alarm-si-high', 'siHigh'], ['alarm-temp-high', 'tempHigh'],
            ['alarm-temp-low', 'tempLow'],
        ];

        thresholdFields.forEach(([elId, key]) => {
            $(`#${elId}`).addEventListener('change', (e) => {
                state.alarmThresholds[key] = parseFloat(e.target.value);
            });
        });
    }

    checkThresholdAlarms(vitals, si) {
        const t = state.alarmThresholds;
        const alarms = [];

        if (vitals.map != null && vitals.map < t.mapLow)
            alarms.push({ msg: `MAP ${vitals.map} < ${t.mapLow} mmHg — Possible hypovolemia or bleeding`, level: 'critical' });
        if (vitals.spo2 != null && vitals.spo2 < t.spo2Low)
            alarms.push({ msg: `SpO₂ ${vitals.spo2}% < ${t.spo2Low}% — Hypoxia risk`, level: 'critical' });
        if (vitals.etco2 != null && vitals.etco2 < t.etco2Low)
            alarms.push({ msg: `EtCO₂ ${vitals.etco2} < ${t.etco2Low} mmHg — Check ventilation / airway disconnect`, level: 'critical' });
        if (vitals.etco2 != null && vitals.etco2 > t.etco2High)
            alarms.push({ msg: `EtCO₂ ${vitals.etco2} > ${t.etco2High} mmHg — Hypoventilation`, level: 'warning' });
        if (vitals.hr != null && vitals.hr < t.hrLow)
            alarms.push({ msg: `HR ${vitals.hr} < ${t.hrLow} bpm — Bradycardia`, level: 'critical' });
        if (vitals.hr != null && vitals.hr > t.hrHigh)
            alarms.push({ msg: `HR ${vitals.hr} > ${t.hrHigh} bpm — Tachycardia`, level: 'warning' });
        if (si != null && si > t.siHigh)
            alarms.push({ msg: `Shock Index ${si} > ${t.siHigh} — Possible shock`, level: 'critical' });
        if (vitals.temp != null && vitals.temp > t.tempHigh)
            alarms.push({ msg: `Temp ${vitals.temp}°C > ${t.tempHigh}°C — Possible malignant hyperthermia / infection`, level: 'critical' });
        if (vitals.temp != null && vitals.temp < t.tempLow)
            alarms.push({ msg: `Temp ${vitals.temp}°C < ${t.tempLow}°C — Hypothermia`, level: 'warning' });

        state.activeAlarms = alarms;
        this.renderActiveAlarms(alarms);
        this.renderSafetyBar(alarms);
    }

    renderActiveAlarms(alarms) {
        const container = $('#active-alarms');
        if (!alarms.length) {
            container.innerHTML = '<p class="events-empty">No active alarms</p>';
            return;
        }
        container.innerHTML = alarms.map(a =>
            `<div class="active-alarm-item alarm-active">🚨 ${a.msg}</div>`
        ).join('');
    }

    renderSafetyBar(alarms) {
        const bar = $('#safety-alarms-bar');
        const list = $('#safety-alarms-list');

        if (!alarms.length) {
            bar.classList.add('hidden');
            return;
        }

        bar.classList.remove('hidden');
        list.innerHTML = alarms.map(a =>
            `<span class="safety-alarm-badge alarm-${a.level}">🚨 ${a.msg.split('—')[0].trim()}</span>`
        ).join('');
    }

    // ── Postoperative Risk Prediction ──

    bindPostopRisk() {
        $('#postop-calculate').addEventListener('click', () => this.calculatePostopRisk());
    }

    calculatePostopRisk() {
        const ctx = state.patientContext;
        const b = state.baseline;
        const history = state.visionHistory;
        const fluids = state.fluidBalance;

        if (history.length < 3) {
            alert('Insufficient monitoring data. Please record at least 3 vitals readings.');
            return;
        }

        let hypotensionScore = 0;
        let icuScore = 0;
        let sepsisScore = 0;
        let akiScore = 0;

        const age = parseInt(ctx.age) || 0;
        if (age > 70) { hypotensionScore += 20; icuScore += 15; sepsisScore += 10; akiScore += 15; }
        else if (age > 55) { hypotensionScore += 10; icuScore += 8; sepsisScore += 5; akiScore += 10; }

        const asa = ctx.asa || '';
        if (asa.includes('III')) { icuScore += 15; akiScore += 10; }
        if (asa.includes('IV') || asa.includes('V')) { icuScore += 30; akiScore += 20; sepsisScore += 10; }

        if (ctx.urgency === 'Emergency') { icuScore += 15; sepsisScore += 10; }

        const comorbidities = ctx.comorbidities || '';
        if (comorbidities.includes('kidney')) akiScore += 20;
        if (comorbidities.includes('Hypertension')) { hypotensionScore += 10; akiScore += 5; }
        if (comorbidities.includes('Heart failure')) { hypotensionScore += 15; icuScore += 15; }
        if (comorbidities.includes('Diabetes')) { sepsisScore += 5; akiScore += 5; }

        const mapValues = history.map(r => r.map).filter(v => v != null);
        const lowMapReadings = mapValues.filter(v => v < 65).length;
        if (lowMapReadings > 0) {
            const pct = (lowMapReadings / mapValues.length) * 100;
            hypotensionScore += Math.min(40, pct * 1.5);
            akiScore += Math.min(25, pct);
        }

        const siValues = history.map(r => r.si).filter(v => v != null);
        const highSI = siValues.filter(v => v > 0.9).length;
        if (highSI > 0) { hypotensionScore += 15; icuScore += 10; }

        if (fluids.ebl > 1000) { hypotensionScore += 20; icuScore += 15; akiScore += 15; }
        else if (fluids.ebl > 500) { hypotensionScore += 10; icuScore += 5; akiScore += 5; }

        if (fluids.urine > 0 && fluids.urine < 100) akiScore += 20;

        const tempValues = history.map(r => r.temp).filter(v => v != null);
        const highTemp = tempValues.filter(v => v > 38.5).length;
        if (highTemp > 0) sepsisScore += 20;

        const critEvents = state.surgicalEvents.filter(e =>
            e.event.toLowerCase().includes('bleeding') || e.event.toLowerCase().includes('hypotension') ||
            e.event.toLowerCase().includes('cardiac') || e.event.toLowerCase().includes('sepsis')
        );
        if (critEvents.length > 0) { icuScore += critEvents.length * 10; }

        const risks = [
            { name: 'Postoperative Hypotension', score: Math.min(100, Math.round(hypotensionScore)) },
            { name: 'ICU Admission', score: Math.min(100, Math.round(icuScore)) },
            { name: 'Sepsis Risk', score: Math.min(100, Math.round(sepsisScore)) },
            { name: 'Acute Kidney Injury', score: Math.min(100, Math.round(akiScore)) },
        ];

        this.renderPostopRisk(risks);
    }

    renderPostopRisk(risks) {
        const container = $('#postop-body');
        const riskClass = (s) => s >= 70 ? 'critical' : s >= 45 ? 'high' : s >= 20 ? 'moderate' : 'low';
        const riskLabel = (s) => s >= 70 ? 'HIGH' : s >= 45 ? 'MODERATE-HIGH' : s >= 20 ? 'MODERATE' : 'LOW';

        container.innerHTML = `<div class="postop-grid">
            ${risks.map(r => `
                <div class="postop-risk-item">
                    <h4>${r.name}</h4>
                    <div class="postop-risk-bar"><div class="postop-risk-fill risk-${riskClass(r.score)}" style="width:${r.score}%"></div></div>
                    <span class="postop-risk-label risk-${riskClass(r.score)}">${riskLabel(r.score)} (${r.score}%)</span>
                </div>
            `).join('')}
        </div>
        <p style="font-size:11px;color:var(--text-muted);margin-top:12px;text-align:center;">
            Risk scores are estimated based on patient baseline, vitals trends, fluid balance, and clinical events. These are for decision support only.
        </p>`;
    }

    // ── Chat ──

    bindChat() {
        const input = $('#chat-input');
        const sendBtn = $('#chat-send');
        const voiceBtn = $('#voice-btn');
        const voiceOutputBtn = $('#voice-output-btn');

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

        voiceBtn.addEventListener('click', () => this.toggleVoiceSession());

        voiceOutputBtn.addEventListener('click', () => {
            state.voiceOutputEnabled = !state.voiceOutputEnabled;
            voiceOutputBtn.textContent = state.voiceOutputEnabled ? '🔊' : '🔇';
            voiceOutputBtn.classList.toggle('btn-voice-active', state.voiceOutputEnabled);
            if (state.voiceOutputEnabled) {
                this.speakWithGemini('Voice output enabled.');
            } else {
                if (this._ttsSession) { this._ttsSession.stop(); this._ttsSession = null; }
            }
        });
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
                    try {
                        const parsed = JSON.parse(line.slice(6));
                        if (parsed.error) {
                            bubbleEl.textContent = `Error: ${parsed.error}`;
                            return;
                        }
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

            if (state.voiceOutputEnabled && fullText) {
                this.speakWithGemini(fullText);
            }
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

        let demographics = '';
        if (ctx.patient_id) demographics += `Patient ID: ${ctx.patient_id} | `;
        demographics += `${ctx.age}yo ${ctx.sex || ''}`;
        if (ctx.weight) demographics += ` | ${ctx.weight}kg`;
        if (ctx.bmi) demographics += ` (BMI ${ctx.bmi})`;
        if (ctx.asa) demographics += ` | ${ctx.asa}`;
        parts.push(demographics);

        if (ctx.clinical_setting) parts.push(`Clinical Setting: ${ctx.clinical_setting}`);

        let procedureInfo = `Procedure / Reason: ${ctx.procedure}`;
        if (ctx.urgency) procedureInfo += ` (${ctx.urgency})`;
        if (ctx.specialty) procedureInfo += ` | Specialty: ${ctx.specialty}`;
        if (ctx.duration) procedureInfo += ` | Est. duration: ${ctx.duration}`;
        if (ctx.anesthesia_technique) procedureInfo += ` | Sedation/Anesthesia: ${ctx.anesthesia_technique}`;
        if (ctx.position) procedureInfo += ` | Position: ${ctx.position}`;
        parts.push(procedureInfo);

        if (ctx.diagnosis) parts.push(`Diagnosis: ${ctx.diagnosis}`);
        parts.push(`Comorbidities: ${ctx.comorbidities}`);
        if (ctx.medications && ctx.medications !== 'None') {
            let meds = `Medications: ${ctx.medications} (Controlled: ${ctx.medication_controlled})`;
            if (ctx.other_medications) meds += ` | Other: ${ctx.other_medications}`;
            parts.push(meds);
        } else if (ctx.other_medications) {
            parts.push(`Medications: ${ctx.other_medications} (Controlled: ${ctx.medication_controlled})`);
        }
        if (ctx.allergies) parts.push(`Allergies: ${ctx.allergies}`);

        let airway = '';
        if (ctx.difficult_airway === 'Yes') airway += '⚠ Anticipated difficult airway';
        if (ctx.airway_assessment) airway += `${airway ? ' | ' : ''}Airway assessment: ${ctx.airway_assessment}`;
        if (airway) parts.push(airway);

        if (ctx.monitoring_plan) parts.push(`Monitoring: ${ctx.monitoring_plan}`);
        if (ctx.npo_hours) parts.push(`NPO status: ${ctx.npo_hours} hours`);
        if (ctx.pregnancy && ctx.pregnancy !== 'N/A') parts.push(`Pregnancy: ${ctx.pregnancy}`);

        let blood = '';
        if (ctx.blood_group) blood += `Blood group: ${ctx.blood_group}`;
        if (ctx.blood_products) blood += `${blood ? ' | ' : ''}Blood products: ${ctx.blood_products}`;
        if (blood) parts.push(blood);

        if (ctx.icu_planned && ctx.icu_planned !== 'No') parts.push(`Postop ICU planned: ${ctx.icu_planned}`);
        if (ctx.notes) parts.push(`Clinical notes: ${ctx.notes}`);

        if (state.baseline) {
            const b = state.baseline;
            let bl = `Baseline: HR ${b.hr}, SpO2 ${b.spo2}%, BP ${b.sbp}/${b.dbp}`;
            if (b.etco2) bl += `, EtCO2 ${b.etco2}`;
            if (b.rr) bl += `, RR ${b.rr}`;
            if (b.temp) bl += `, Temp ${b.temp}°C`;
            parts.push(bl);
        }

        if (state.lastAnalysis) {
            const la = state.lastAnalysis;
            parts.push(`Latest vitals: ${JSON.stringify(la.vitals_extracted || {})}`);
            parts.push(`Alert level: ${la.alert_level || 'NONE'}`);
            if (la.trend_interpretation) parts.push(`Trend: ${la.trend_interpretation}`);
        }

        const trend = this.trendBuffer.getTrendSummary();
        if (trend && !trend.text) {
            parts.push(`Trend summary: ${JSON.stringify(trend)}`);
        }

        const f = state.fluidBalance;
        parts.push(`Fluid balance: EBL ${f.ebl}ml, IVF ${f.ivf}ml, Blood ${f.blood}ml, Urine ${f.urine}ml`);

        if (state.drugLog.length) {
            parts.push('Drug log:\n' + state.drugLog.slice(-5).map(d => `- ${d.time}: ${d.category} — ${d.name} ${d.dose} ${d.route}`).join('\n'));
        }

        if (state.surgicalEvents.length) {
            parts.push('Clinical events:\n' + state.surgicalEvents.slice(-8).map(e => `- ${e.time}: ${e.event}`).join('\n'));
        }

        if (state.activeAlarms.length) {
            parts.push('ACTIVE ALARMS:\n' + state.activeAlarms.map(a => `- ${a.msg}`).join('\n'));
        }

        return parts.join('\n\n');
    }

    detectSurgicalEvent(text) {
        const keywords = ['bolus', 'incision', 'clamp', 'intubat', 'extubat', 'tourniquet', 'blood', 'suture', 'induction', 'bleeding', 'arrest'];
        if (keywords.some(kw => text.toLowerCase().includes(kw))) {
            state.surgicalEvents.push({ time: new Date().toLocaleTimeString(), event: `[Voice] ${text}`, type: 'voice' });
            this.renderEvents();
        }
    }

    // ── Voice (Gemini Live API) ──

    async toggleVoiceSession() {
        if (this.liveSession?.isActive) {
            this._endVoiceSession();
            return;
        }

        if (!state.apiKey) {
            this.appendChat('assistant', 'Please enter your Gemini API key and start monitoring before using voice.');
            return;
        }

        const voiceBtn = $('#voice-btn');
        const chatInput = $('#chat-input');
        voiceBtn.classList.add('btn-recording');
        voiceBtn.textContent = '🔴';
        chatInput.placeholder = 'Live voice session active — speak to Jarvis…';

        const session = new GeminiLiveSession();
        this.liveSession = session;
        this._liveInputBubble = null;
        this._liveOutputBubble = null;

        const systemPrompt = `You are Jarvis, an AI clinical copilot for real-time patient monitoring.
You provide concise, evidence-based clinical guidance to clinicians.
You are currently in a live voice conversation with a clinician during a procedure.
Be direct, clinical, and actionable. Keep responses brief for voice — aim for 2-3 sentences unless the clinician asks for detail.
If the clinician reports a clinical event, acknowledge it and adjust your interpretation.

CURRENT CLINICAL CONTEXT:
${this.buildContext()}`;

        session.onStateChange = (s) => {
            if (s === 'closed' && this.liveSession === session) {
                this._endVoiceSession();
            }
        };

        session.onInputTranscription = (text, isFinal) => {
            if (!this._liveInputBubble) {
                this._liveInputBubble = this.appendChat('user', text);
            } else {
                this._liveInputBubble.textContent = text;
            }
            if (isFinal && text.trim()) {
                state.chatHistory.push({ role: 'user', content: text });
                this.detectSurgicalEvent(text);
                this._liveInputBubble = null;
            }
        };

        session.onOutputTranscription = (text, isFinal) => {
            if (!this._liveOutputBubble) {
                this._liveOutputBubble = this.appendChat('assistant', text);
            } else {
                this._liveOutputBubble.textContent = text;
            }
            if (isFinal && text.trim()) {
                state.chatHistory.push({ role: 'assistant', content: text });
                this._liveOutputBubble = null;
            }
        };

        session.onError = () => {
            this.appendChat('assistant', 'Voice session error. Please check your API key and try again.');
        };

        try {
            await session.start(state.apiKey, systemPrompt);
            await session.startAudioCapture();
            this.appendChat('assistant', 'Live voice session started — speak naturally. Click 🔴 to end.');
        } catch (err) {
            this.appendChat('assistant', `Could not start voice session: ${err.message}`);
            this._endVoiceSession();
        }
    }

    _endVoiceSession() {
        const voiceBtn = $('#voice-btn');
        const chatInput = $('#chat-input');
        voiceBtn.classList.remove('btn-recording');
        voiceBtn.textContent = '🎤';
        chatInput.placeholder = 'Ask Jarvis anything…';

        if (this.liveSession) {
            const session = this.liveSession;
            this.liveSession = null;
            session.stop();
        }
        this._liveInputBubble = null;
        this._liveOutputBubble = null;
    }

    async speakWithGemini(text) {
        if (!state.apiKey || !text) return;

        if (this._ttsSession?.isActive) {
            this._ttsSession.sendText(text);
            return;
        }

        const session = new GeminiLiveSession();
        this._ttsSession = session;

        session.onStateChange = (s) => {
            if (s === 'closed') this._ttsSession = null;
        };
        session.onTurnComplete = () => {
            setTimeout(() => {
                if (this._ttsSession === session) {
                    session.stop();
                    this._ttsSession = null;
                }
            }, 500);
        };

        try {
            await session.start(state.apiKey, 'Read the following text aloud naturally. Do not add any commentary.');
            session.sendText(text);
        } catch (_) {
            this._ttsSession = null;
            this.alerts.speak(text);
        }
    }

    // ── Surgical Events (Enhanced) ──

    bindEvents() {
        const input = $('#event-input');
        const logBtn = $('#event-log');
        const clearBtn = $('#clear-trends');

        logBtn.addEventListener('click', () => {
            const text = input.value.trim();
            if (!text) return;
            state.surgicalEvents.push({ time: new Date().toLocaleTimeString(), event: text, type: 'custom' });
            input.value = '';
            this.renderEvents();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') logBtn.click();
        });

        clearBtn.addEventListener('click', () => {
            state.visionHistory = [];
            this.trendBuffer = new VitalsTrendBuffer(state.trendWindowSize);
            this.charts.clear();
            $('#trend-deltas').classList.add('hidden');
            this.updateTrajectory();
        });

        $$('.quick-event-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const eventText = btn.dataset.event;
                const isCritical = btn.classList.contains('quick-event-critical');
                const isWarn = btn.classList.contains('quick-event-warn');
                const type = isCritical ? 'critical' : isWarn ? 'warn' : 'event';

                state.surgicalEvents.push({
                    time: new Date().toLocaleTimeString(),
                    event: eventText,
                    type,
                });
                this.renderEvents();

                btn.style.transform = 'scale(0.9)';
                btn.style.opacity = '0.6';
                setTimeout(() => {
                    btn.style.transform = '';
                    btn.style.opacity = '';
                }, 300);
            });
        });
    }

    renderEvents() {
        const container = $('#events-list');
        if (!state.surgicalEvents.length) {
            container.innerHTML = '<p class="events-empty">No events logged yet</p>';
            return;
        }

        container.innerHTML = [...state.surgicalEvents].reverse().map(e => {
            const cls = e.type === 'critical' ? 'event-critical' : e.type === 'warn' ? 'event-warn' : '';
            return `<div class="event-item ${cls}"><span class="event-time">${e.time}</span><span>${e.event}</span></div>`;
        }).join('');
    }

    // ── Settings ──

    bindSettings() {
        const drawer = $('#settings-drawer');

        $('#settings-toggle').addEventListener('click', () => {
            drawer.classList.toggle('hidden');
            if (!drawer.classList.contains('hidden')) {
                $('#settings-api-key').value = state.apiKey || '';
                $('#settings-window').value = state.trendWindowSize;
                $('#settings-patient-id').value = state.patientContext.patient_id || '';
                $('#settings-age').value = state.patientContext.age || '';
                $('#settings-sex').value = state.patientContext.sex || '';
                $('#settings-procedure').value = state.patientContext.procedure || '';
                $('#settings-anesthesia').value = state.patientContext.anesthesia_technique || '';
                $('#settings-comorbidities').value = state.patientContext.comorbidities || '';
                $('#settings-allergies').value = state.patientContext.allergies || '';
                if (state.baseline) {
                    $('#settings-hr').value = state.baseline.hr || '';
                    $('#settings-spo2').value = state.baseline.spo2 || '';
                    $('#settings-sbp').value = state.baseline.sbp || '';
                    $('#settings-dbp').value = state.baseline.dbp || '';
                }
            }
        });

        $('#settings-close').addEventListener('click', () => drawer.classList.add('hidden'));

        $('#settings-save').addEventListener('click', () => {
            const newKey = $('#settings-api-key').value.trim();
            if (newKey) state.apiKey = newKey;
            state.trendWindowSize = +$('#settings-window').value || 10;
            this.trendBuffer.windowSize = state.trendWindowSize;
            state.patientContext.patient_id = $('#settings-patient-id').value.trim() || null;
            state.patientContext.age = $('#settings-age').value;
            state.patientContext.sex = $('#settings-sex').value;
            state.patientContext.procedure = $('#settings-procedure').value;
            state.patientContext.comorbidities = $('#settings-comorbidities').value;
            state.patientContext.allergies = $('#settings-allergies').value;
            const hr = +$('#settings-hr').value;
            const spo2 = +$('#settings-spo2').value;
            const sbp = +$('#settings-sbp').value;
            const dbp = +$('#settings-dbp').value;
            if (hr > 0) state.baseline.hr = hr;
            if (spo2 > 0) state.baseline.spo2 = spo2;
            if (sbp > 0) state.baseline.sbp = sbp;
            if (dbp > 0) state.baseline.dbp = dbp;
            this.renderBaselineVitals();
            drawer.classList.add('hidden');
        });

        $('#back-to-setup').addEventListener('click', () => {
            this.camera.stop();
            if (state.simMode) this.exitSimMode();
            this.stopAutoCapture();
            $('#dashboard').classList.add('hidden');
            $('#setup-panel').classList.remove('hidden');
            $('#alert-banner').classList.add('hidden');
            $('#safety-alarms-bar').classList.add('hidden');
            $('#connection-dot').className = 'status-dot dot-disconnected';
            $('#export-pdf-btn').classList.add('hidden');
            drawer.classList.add('hidden');
        });
    }

    // ── Export PDF ──

    bindExportPDF() {
        $('#export-pdf-btn').addEventListener('click', () => this.exportToPDF());
    }

    exportToPDF() {
        if (window.jspdf && window.jspdf.jsPDF) {
            try {
                this._generatePDF();
            } catch (err) {
                console.error('PDF export failed:', err);
                alert('PDF export failed: ' + err.message);
            }
            return;
        }
        const btn = $('#export-pdf-btn');
        const origText = btn.textContent;
        btn.textContent = '⏳ Loading PDF library…';
        btn.disabled = true;
        this._loadJsPDFDynamic()
            .then(() => {
                btn.textContent = origText;
                btn.disabled = false;
                this._generatePDF();
            })
            .catch(() => {
                btn.textContent = origText;
                btn.disabled = false;
                alert('Could not load PDF library. Please check your internet connection and try again.');
            });
    }

    _loadJsPDFDynamic() {
        const urls = [
            'https://cdn.jsdelivr.net/npm/jspdf@4.2.0/dist/jspdf.umd.min.js',
            'https://unpkg.com/jspdf@4.2.0/dist/jspdf.umd.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/3.0.3/jspdf.umd.min.js',
        ];
        return urls.reduce(
            (chain, url) => chain.catch(() => new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = url;
                s.onload = () => (window.jspdf && window.jspdf.jsPDF) ? resolve() : reject();
                s.onerror = reject;
                document.head.appendChild(s);
            })),
            Promise.reject()
        );
    }

    _generatePDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentW = pw - margin * 2;
        let y = margin;

        const colors = {
            headerBg: [30, 58, 138],
            sectionBg: [239, 246, 255],
            accent: [30, 64, 175],
            green: [4, 120, 87],
            red: [185, 28, 28],
            orange: [180, 83, 9],
            textPrimary: [15, 23, 42],
            textSecondary: [51, 65, 85],
            textMuted: [100, 116, 139],
            border: [203, 213, 225],
        };

        const checkPage = (needed) => {
            if (y + needed > ph - 15) {
                doc.addPage();
                y = margin;
            }
        };

        const drawSectionHeader = (title) => {
            checkPage(14);
            doc.setFillColor(...colors.accent);
            doc.roundedRect(margin, y, contentW, 9, 1.5, 1.5, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(255, 255, 255);
            doc.text(title, margin + 4, y + 6.5);
            y += 13;
        };

        const drawKeyValue = (key, value, xOffset = 0) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...colors.textSecondary);
            doc.text(`${key}:`, margin + 3 + xOffset, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.textPrimary);
            const valStr = value != null ? String(value) : 'N/A';
            doc.text(valStr, margin + 3 + xOffset + doc.getTextWidth(`${key}: `), y);
        };

        const drawRow = (pairs) => {
            checkPage(7);
            const colW = contentW / pairs.length;
            pairs.forEach(([k, v], i) => drawKeyValue(k, v, i * colW));
            y += 6;
        };

        // === Title Banner ===
        const patientIdStr = state.patientContext.patient_id || '';
        const bannerHeight = patientIdStr ? 38 : 32;
        doc.setFillColor(...colors.headerBg);
        doc.rect(0, 0, pw, bannerHeight, 'F');
        doc.setFillColor(...colors.accent);
        doc.rect(0, bannerHeight, pw, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('Jarvis OR Guardian', pw / 2, 14, { align: 'center' });
        doc.setFontSize(9);
        doc.setTextColor(...colors.textSecondary);
        doc.text('Clinical Monitoring Report', pw / 2, 21, { align: 'center' });
        const now = new Date();
        doc.setFontSize(8);
        doc.setTextColor(...colors.textMuted);
        doc.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, pw / 2, 28, { align: 'center' });
        if (patientIdStr) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(...colors.accent);
            doc.text(`Patient ID: ${patientIdStr}`, pw / 2, 35, { align: 'center' });
        }
        y = bannerHeight + 8;

        // === Patient Demographics ===
        const ctx = state.patientContext;
        if (ctx && ctx.age) {
            drawSectionHeader('Patient Demographics');
            if (ctx.patient_id) drawRow([['Patient ID', ctx.patient_id]]);
            drawRow([['Age', `${ctx.age} years`], ['Sex', ctx.sex], ['Setting', ctx.clinical_setting || 'N/A'], ['ASA', ctx.asa || 'N/A']]);
            if (ctx.weight || ctx.height) {
                drawRow([['Weight', ctx.weight ? `${ctx.weight} kg` : 'N/A'], ['Height', ctx.height ? `${ctx.height} cm` : 'N/A'], ['BMI', ctx.bmi || 'N/A']]);
            }
            drawRow([['Procedure', ctx.procedure], ['Urgency', ctx.urgency || 'N/A']]);
            drawRow([['Anesthesia', ctx.anesthesia_technique], ['Position', ctx.position || 'N/A']]);
            if (ctx.diagnosis) drawRow([['Diagnosis', ctx.diagnosis]]);
            drawRow([['Comorbidities', ctx.comorbidities || 'None']]);
            drawRow([['Allergies', ctx.allergies || 'NKDA']]);
            if (ctx.medications && ctx.medications !== 'None') drawRow([['Medications', ctx.medications]]);
            if (ctx.difficult_airway === 'Yes') drawRow([['Airway', 'Anticipated Difficult Airway']]);
            if (ctx.monitoring_plan) drawRow([['Monitoring', ctx.monitoring_plan]]);
            y += 4;
        }

        // === Baseline Vitals ===
        if (state.baseline) {
            drawSectionHeader('Baseline Vitals');
            const b = state.baseline;
            const baseMAP = calcMAP(b.sbp, b.dbp);
            drawRow([['HR', `${b.hr} bpm`], ['SpO\u2082', `${b.spo2}%`], ['BP', `${b.sbp}/${b.dbp} mmHg`], ['MAP', baseMAP != null ? `${baseMAP} mmHg` : 'N/A']]);
            drawRow([['EtCO\u2082', b.etco2 ? `${b.etco2} mmHg` : 'N/A'], ['RR', b.rr ? `${b.rr}/min` : 'N/A'], ['Temp', b.temp ? `${b.temp}\u00B0C` : 'N/A']]);
            y += 4;
        }

        // === Current Vitals ===
        if (state.lastAnalysis && state.lastAnalysis.vitals_extracted) {
            drawSectionHeader('Current Vitals (Last Reading)');
            const v = state.lastAnalysis.vitals_extracted;
            const si = calcShockIndex(v.hr, v.sbp);
            drawRow([['HR', v.hr != null ? `${v.hr} bpm` : '--'], ['SpO\u2082', v.spo2 != null ? `${v.spo2}%` : '--'], ['BP', v.sbp != null ? `${v.sbp}/${v.dbp} mmHg` : '--'], ['MAP', v.map != null ? `${v.map} mmHg` : '--']]);
            drawRow([['EtCO\u2082', v.etco2 != null ? `${v.etco2} mmHg` : '--'], ['RR', v.rr != null ? `${v.rr}/min` : '--'], ['Temp', v.temp != null ? `${v.temp}\u00B0C` : '--'], ['Shock Index', si != null ? si : '--']]);
            drawRow([['Alert Level', state.lastAnalysis.alert_level || 'NONE']]);
            y += 4;
        }

        // === Vitals Trend Summary ===
        if (state.visionHistory.length >= 2) {
            drawSectionHeader(`Vitals Trend (${state.visionHistory.length} readings)`);
            const trend = this.trendBuffer.getTrendSummary();
            if (trend && !trend.text) {
                drawRow([['Trajectory', trend.trajectory?.replace(/_/g, ' ')], ['Duration', `${trend.duration_mins} min`], ['Readings', trend.readings_count]]);
                const deltas = Object.entries(trend).filter(([k]) => k.endsWith('_delta'));
                if (deltas.length) {
                    checkPage(7);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(...colors.textSecondary);
                    const deltaStr = deltas.map(([k, v]) => {
                        const name = k.replace('_delta', '').toUpperCase();
                        return `${name}: ${v > 0 ? '+' : ''}${v}`;
                    }).join('   |   ');
                    doc.text(`Deltas: ${deltaStr}`, margin + 3, y);
                    y += 6;
                }
            }

            // Vitals history table
            checkPage(20);
            const history = state.visionHistory;
            const headers = ['Time', 'HR', 'SpO\u2082', 'SBP/DBP', 'MAP', 'EtCO\u2082', 'RR', 'Temp', 'SI'];
            const colWidths = [22, 14, 14, 22, 16, 16, 12, 14, 14];
            let tx = margin;

            doc.setFillColor(...colors.sectionBg);
            doc.rect(margin, y, contentW, 6, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(...colors.accent);
            headers.forEach((h, i) => {
                doc.text(h, tx + 1, y + 4);
                tx += colWidths[i];
            });
            y += 7;

            const maxRows = 30;
            const displayHistory = history.length > maxRows ? history.slice(-maxRows) : history;
            displayHistory.forEach((r, idx) => {
                checkPage(6);
                if (idx % 2 === 0) {
                    doc.setFillColor(241, 245, 249);
                    doc.rect(margin, y - 1, contentW, 5.5, 'F');
                }
                tx = margin;
                const time = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const rowData = [
                    time,
                    r.hr != null ? String(r.hr) : '--',
                    r.spo2 != null ? String(r.spo2) : '--',
                    r.sbp != null ? `${r.sbp}/${r.dbp || '--'}` : '--',
                    r.map != null ? String(r.map) : '--',
                    r.etco2 != null ? String(r.etco2) : '--',
                    r.rr != null ? String(r.rr) : '--',
                    r.temp != null ? String(r.temp) : '--',
                    r.si != null ? String(r.si) : '--',
                ];
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(...colors.textPrimary);
                rowData.forEach((d, i) => {
                    doc.text(d, tx + 1, y + 3);
                    tx += colWidths[i];
                });
                y += 5.5;
            });

            if (history.length > maxRows) {
                doc.setFontSize(7);
                doc.setTextColor(...colors.textMuted);
                doc.text(`... showing last ${maxRows} of ${history.length} readings`, margin + 3, y + 3);
                y += 5;
            }
            y += 4;
        }

        // === Fluid Balance ===
        const f = state.fluidBalance;
        if (f.ebl || f.ivf || f.blood || f.urine) {
            drawSectionHeader('Fluid Balance');
            const totalLoss = f.ebl + f.urine;
            const totalInput = f.ivf + f.blood;
            const net = totalInput - totalLoss;
            drawRow([['Est. Blood Loss', `${f.ebl} ml`], ['IV Fluids', `${f.ivf} ml`], ['Blood Transfusion', `${f.blood} ml`], ['Urine Output', `${f.urine} ml`]]);
            drawRow([['Total Loss', `${totalLoss} ml`], ['Total Input', `${totalInput} ml`], ['Net Balance', `${net >= 0 ? '+' : ''}${net} ml`]]);
            y += 4;
        }

        // === Drug Administration Log ===
        if (state.drugLog.length) {
            drawSectionHeader(`Drug Administration Log (${state.drugLog.length} entries)`);
            state.drugLog.forEach((d) => {
                checkPage(6);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(...colors.textMuted);
                doc.text(d.time, margin + 3, y);
                doc.setTextColor(...colors.orange);
                doc.text(d.category, margin + 25, y);
                doc.setTextColor(...colors.textPrimary);
                const detail = `${d.name}${d.dose ? ' — ' + d.dose : ''}${d.route ? ' (' + d.route + ')' : ''}`;
                doc.text(detail, margin + 55, y);
                y += 5;
            });
            y += 4;
        }

        // === Surgical Events Timeline ===
        if (state.surgicalEvents.length) {
            drawSectionHeader(`Clinical Events Timeline (${state.surgicalEvents.length} events)`);
            state.surgicalEvents.forEach((e) => {
                checkPage(6);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(...colors.textMuted);
                doc.text(e.time, margin + 3, y);
                const color = e.type === 'critical' ? colors.red : e.type === 'warn' ? colors.orange : colors.textPrimary;
                doc.setTextColor(...color);
                const evLines = doc.splitTextToSize(e.event, contentW - 28);
                doc.text(evLines, margin + 25, y);
                y += evLines.length * 4 + 2;
            });
            y += 4;
        }

        // === Active Alarms ===
        if (state.activeAlarms.length) {
            drawSectionHeader('Active Alarms');
            state.activeAlarms.forEach((a) => {
                checkPage(6);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                const color = a.level === 'critical' ? colors.red : colors.orange;
                doc.setTextColor(...color);
                const alarmLines = doc.splitTextToSize(`\u26A0 ${a.msg}`, contentW - 6);
                doc.text(alarmLines, margin + 3, y);
                y += alarmLines.length * 4 + 2;
            });
            y += 4;
        }

        // === Clinical Insight ===
        if (state.lastAnalysis) {
            const la = state.lastAnalysis;
            drawSectionHeader('Clinical Insight (Last Analysis)');
            if (la.trend_interpretation) {
                checkPage(10);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(...colors.accent);
                doc.text('Trend:', margin + 3, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...colors.textPrimary);
                const lines = doc.splitTextToSize(la.trend_interpretation, contentW - 18);
                doc.text(lines, margin + 18, y);
                y += lines.length * 4 + 3;
            }
            if (la.physiological_explanation) {
                checkPage(10);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(...colors.accent);
                doc.text('Physiology:', margin + 3, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...colors.textPrimary);
                const lines = doc.splitTextToSize(la.physiological_explanation, contentW - 25);
                doc.text(lines, margin + 25, y);
                y += lines.length * 4 + 3;
            }
            if (la.differentials?.length) {
                checkPage(8);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(...colors.accent);
                doc.text('Differentials:', margin + 3, y);
                y += 5;
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...colors.textPrimary);
                la.differentials.forEach((d, i) => {
                    checkPage(5);
                    const lines = doc.splitTextToSize(`${i + 1}. ${d}`, contentW - 10);
                    doc.text(lines, margin + 6, y);
                    y += lines.length * 4 + 1;
                });
                y += 2;
            }
            if (la.suggested_actions?.length) {
                checkPage(8);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(...colors.accent);
                doc.text('Suggested Actions:', margin + 3, y);
                y += 5;
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...colors.textPrimary);
                la.suggested_actions.forEach((a) => {
                    checkPage(5);
                    const lines = doc.splitTextToSize(`\u2022 ${a}`, contentW - 10);
                    doc.text(lines, margin + 6, y);
                    y += lines.length * 4 + 1;
                });
                y += 2;
            }
            y += 4;
        }

        // === Footer ===
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFillColor(...colors.border);
            doc.rect(0, ph - 12, pw, 12, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(...colors.textSecondary);
            doc.text('Jarvis OR Guardian — Educational clinical decision support prototype. Not FDA-cleared.', pw / 2, ph - 6, { align: 'center' });
            doc.text(`Page ${i} of ${totalPages}`, pw - margin, ph - 6, { align: 'right' });
        }

        const patientIdPart = ctx.patient_id ? `${ctx.patient_id}_` : '';
        const patientAge = ctx.age || 'unknown';
        const patientSex = ctx.sex || '';
        const timestamp = now.toISOString().slice(0, 16).replace(/[:T]/g, '-');
        doc.save(`JarvisOR_Report_${patientIdPart}${patientAge}${patientSex.charAt(0)}_${timestamp}.pdf`);
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
