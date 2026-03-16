import streamlit as st
from google import genai
import pandas as pd
import plotly.graph_objects as go
from PIL import Image
import speech_recognition as sr
import pyttsx3
import json
import time

st.set_page_config(layout="wide", page_title="Jarvis OR Guardian")

st.markdown("""<style>
.critical-box {
    background: linear-gradient(135deg, #ff0000, #cc0000);
    color: white; padding: 20px; border-radius: 10px;
    font-size: 18px; font-weight: bold; margin: 10px 0;
    animation: pulse 1s infinite;
}
.concern-box {
    background: linear-gradient(135deg, #ff8c00, #e67600);
    color: white; padding: 15px; border-radius: 10px;
    font-size: 16px; margin: 10px 0;
}
.watch-box {
    background: linear-gradient(135deg, #ffd700, #e6c200);
    color: #333; padding: 12px; border-radius: 10px; margin: 10px 0;
}
.clear-box {
    background: linear-gradient(135deg, #00cc66, #00b359);
    color: white; padding: 10px; border-radius: 10px; margin: 10px 0;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
.vital-big { font-size: 28px; font-weight: bold; text-align: center; }
.vital-label { font-size: 12px; color: #888; text-align: center; }
</style>""", unsafe_allow_html=True)

st.title("🧠 Jarvis OR Guardian")
st.subheader("Multimodal AI Assistant for Anaesthesia & Critical Care")
st.info("Educational clinical decision support. Not for autonomous medical decisions.")

# ─────────────────────────────────────────────────
# GEMINI API
# ─────────────────────────────────────────────────

api_key = st.sidebar.text_input("Gemini API Key", type="password")
if not api_key:
    st.stop()

client = genai.Client(api_key=api_key)

# ─────────────────────────────────────────────────
# SESSION STATE
# ─────────────────────────────────────────────────

_defaults = {
    "baseline_set": False,
    "vitals_table": pd.DataFrame(
        columns=["Time", "HR", "BP_sys", "BP_dia", "SpO2", "EtCO2", "RR", "Temp"]
    ),
    "history": [],
    "vision_trend_buffer": [],
    "vision_vitals_history": [],
    "last_vision_analysis": None,
    "last_alert_level": "NONE",
    "camera_ready": False,
    "surgical_events": [],
}
for k, v in _defaults.items():
    if k not in st.session_state:
        st.session_state[k] = v

# ─────────────────────────────────────────────────
# SPEECH ENGINE
# ─────────────────────────────────────────────────

engine = pyttsx3.init()


def speak(text):
    engine.say(text)
    engine.runAndWait()


def listen():
    r = sr.Recognizer()
    with sr.Microphone() as source:
        st.info("🎤 Listening…")
        audio = r.listen(source)
    try:
        return r.recognize_google(audio)
    except Exception:
        return "Could not understand audio"


# ─────────────────────────────────────────────────
# MODULE 5 — VITALS TREND BUFFER
# ─────────────────────────────────────────────────

VISION_WINDOW_SIZE = 10


class VitalsTrendBuffer:
    """Sliding-window buffer that stores extracted vitals and computes trajectory."""

    def __init__(self, buffer_list, window_size=VISION_WINDOW_SIZE):
        self.buffer = buffer_list
        self.window_size = window_size

    def push(self, reading):
        self.buffer.append({**reading, "timestamp": time.time()})
        while len(self.buffer) > self.window_size:
            self.buffer.pop(0)

    def get_trend_summary(self):
        if len(self.buffer) < 2:
            return "Insufficient data for trend analysis"
        first, last = self.buffer[0], self.buffer[-1]
        duration_mins = round((last["timestamp"] - first["timestamp"]) / 60, 1)

        summary = {
            "readings_count": len(self.buffer),
            "duration_mins": duration_mins,
            "trajectory": self._detect_trajectory(),
        }
        for key in ("hr", "spo2", "sbp", "dbp", "map", "etco2", "rr"):
            fv, lv = first.get(key), last.get(key)
            if fv is not None and lv is not None:
                summary[f"{key}_delta"] = round(lv - fv, 1)
        return summary

    def _detect_trajectory(self):
        maps = [r.get("map") for r in self.buffer if r.get("map") is not None]
        if len(maps) >= 2:
            slope = (maps[-1] - maps[0]) / len(maps)
        else:
            hrs = [r.get("hr") for r in self.buffer if r.get("hr") is not None]
            if len(hrs) < 2:
                return "INSUFFICIENT_DATA"
            slope = (hrs[-1] - hrs[0]) / len(hrs)

        if slope < -3:
            return "DETERIORATING_FAST"
        if slope < -1:
            return "DECLINING"
        if slope > 2:
            return "IMPROVING"
        return "STABLE"


# ─────────────────────────────────────────────────
# MODULE 2 — GEMINI VISION ANALYSIS
# ─────────────────────────────────────────────────

_VISION_PROMPT = """You are Jarvis, an AI clinical monitoring assistant in an operating room.
Analyze this anesthesia workstation / patient monitor image.

PATIENT BASELINE:
{baseline}

CURRENT CLINICAL CONTEXT:
Patient: {age}yo | Procedure: {procedure} | Comorbidities: {comorbidities}

RECENT SURGICAL EVENTS:
{surgical_events}

VITALS TREND (last readings):
{trend_summary}

TASK:
1. Extract all visible vital signs (HR, SpO2, NIBP/IBP, EtCO2, RR, Temp)
2. Assess waveform quality (ECG rhythm, SpO2 pleth, capnography shape)
3. Identify any visible alarms or alarm states on the monitor
4. Detect deviations from the patient baseline
5. Consider the trend trajectory when interpreting current values

RESPOND ONLY with raw JSON (no markdown fences):
{{
  "vitals_extracted": {{
    "hr": null, "spo2": null, "sbp": null, "dbp": null, "map": null,
    "etco2": null, "rr": null, "temp": null
  }},
  "waveforms": {{
    "ecg_rhythm": null, "spo2_pleth": null, "capnography": null
  }},
  "alarms_visible": [],
  "deviations_from_baseline": [],
  "alert_level": "NONE",
  "trend_interpretation": "",
  "physiological_explanation": "",
  "differentials": [],
  "immediate_checks": [],
  "suggested_actions": [],
  "image_quality_note": ""
}}

alert_level must be one of: NONE, WATCH, CONCERN, CRITICAL
Use CRITICAL for SpO2<90, HR>130 or <40, severe hypotension, loss of EtCO2.
Use CONCERN for two simultaneous mild deviations or waveform abnormality.
Use WATCH for a single mild deviation.
Use NONE when all values are within acceptable range."""

_PREFLIGHT_PROMPT = """Analyze this image of an anesthesia workstation / patient monitor.
This is a PRE-FLIGHT camera quality check before surgery.

TASK:
1. Can you clearly read vital sign numbers on the display?
2. Can you see waveform tracings (ECG, SpO2, capnography)?
3. Is the image quality sufficient for continuous monitoring?
4. Any issues with angle, glare, blur, or obstruction?

RESPOND ONLY with raw JSON (no markdown fences):
{{
  "camera_ready": true,
  "readable_parameters": [],
  "unreadable_parameters": [],
  "quality_issues": [],
  "recommendation": ""
}}"""


def _baseline_str():
    if not st.session_state.baseline_set:
        return "No baseline recorded"
    return (
        f"HR: {st.session_state.baseline_hr} bpm, "
        f"BP: {st.session_state.baseline_bp_sys}/{st.session_state.baseline_bp_dia} mmHg, "
        f"SpO2: {st.session_state.baseline_spo2}%"
    )


def _events_str():
    evts = st.session_state.surgical_events
    if not evts:
        return "None logged"
    return "\n".join(f"- {e['time']}: {e['event']}" for e in evts[-5:])


def _parse_gemini_json(raw_text):
    """Strip markdown fences and parse JSON from Gemini response."""
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        end = len(lines)
        for i in range(len(lines) - 1, 0, -1):
            if lines[i].strip().startswith("```"):
                end = i
                break
        text = "\n".join(lines[1:end])
    return json.loads(text)


def analyze_monitor_frame(image, preflight=False):
    """Send a captured frame to Gemini for structured clinical analysis."""
    if preflight:
        prompt = _PREFLIGHT_PROMPT
    else:
        trend_buf = VitalsTrendBuffer(st.session_state.vision_trend_buffer)
        trend_summary = trend_buf.get_trend_summary()
        prompt = _VISION_PROMPT.format(
            baseline=_baseline_str(),
            age=age,
            procedure=procedure,
            comorbidities=comorbidities,
            surgical_events=_events_str(),
            trend_summary=(
                json.dumps(trend_summary, indent=2)
                if isinstance(trend_summary, dict)
                else str(trend_summary)
            ),
        )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[prompt, image],
    )

    try:
        return _parse_gemini_json(response.text)
    except (json.JSONDecodeError, ValueError):
        return {"error": "Failed to parse response", "raw": response.text}


# ─────────────────────────────────────────────────
# MODULE 3 — ALERT SEVERITY ENGINE
# ─────────────────────────────────────────────────

_ALERT_BOX = {
    "CRITICAL": ("critical-box", "🚨 CRITICAL"),
    "CONCERN": ("concern-box", "⚠️ CONCERN"),
    "WATCH": ("watch-box", "👁 WATCH"),
    "NONE": ("clear-box", "✅ ALL CLEAR"),
}


def render_alert_banner(level, analysis):
    css, label = _ALERT_BOX.get(level, _ALERT_BOX["NONE"])
    ts = time.strftime("%H:%M:%S")
    detail = ""
    if level in ("CRITICAL", "CONCERN"):
        devs = analysis.get("deviations_from_baseline", [])
        detail = f"<br>{devs[0]}" if devs else ""
        if not detail:
            detail = f"<br>{analysis.get('trend_interpretation', '')}"
    elif level == "WATCH":
        detail = f"<br>{analysis.get('trend_interpretation', '')}"

    st.markdown(
        f'<div class="{css}">{label} — {ts}{detail}</div>',
        unsafe_allow_html=True,
    )


# ─────────────────────────────────────────────────
# MODULE 4 — CLINICAL INSIGHT CARD
# ─────────────────────────────────────────────────

_VITAL_META = {
    "hr": ("HR", "bpm"),
    "spo2": ("SpO₂", "%"),
    "sbp": ("SBP", "mmHg"),
    "dbp": ("DBP", "mmHg"),
    "map": ("MAP", "mmHg"),
    "etco2": ("EtCO₂", "mmHg"),
    "rr": ("RR", "/min"),
    "temp": ("Temp", "°C"),
}


def render_clinical_card(analysis):
    """Render the structured 5-section clinical insight card."""
    vitals = analysis.get("vitals_extracted", {})

    # — Vitals readout —
    present = [(k, v) for k, v in vitals.items() if v is not None]
    if present:
        st.markdown("#### 📊 Vitals Read from Monitor")
        cols = st.columns(min(len(present), 4))
        for i, (key, val) in enumerate(present):
            label, unit = _VITAL_META.get(key, (key.upper(), ""))
            cols[i % len(cols)].markdown(
                f'<div class="vital-label">{label}</div>'
                f'<div class="vital-big">{val} <small>{unit}</small></div>',
                unsafe_allow_html=True,
            )

    # — Waveforms —
    wf = analysis.get("waveforms", {})
    wf_items = [(k, v) for k, v in wf.items() if v]
    if wf_items:
        st.markdown("#### 📈 Waveform Assessment")
        for name, desc in wf_items:
            st.write(f"**{name.replace('_', ' ').title()}:** {desc}")

    # — Trend interpretation —
    trend = analysis.get("trend_interpretation")
    if trend:
        st.markdown("#### 📉 Trend Interpretation")
        st.write(trend)

    # — Physiological explanation —
    physio = analysis.get("physiological_explanation")
    if physio:
        st.markdown("#### 🧬 Physiological Explanation")
        st.write(physio)

    # — Differentials —
    diffs = analysis.get("differentials", [])
    if diffs:
        st.markdown("#### 🔍 Differential Diagnosis")
        for i, d in enumerate(diffs, 1):
            st.write(f"{i}. {d}")

    # — Immediate checks —
    checks = analysis.get("immediate_checks", [])
    if checks:
        st.markdown("#### ✅ Immediate Checks")
        for c in checks:
            st.checkbox(c, key=f"chk_{hash(c)}")

    # — Suggested actions —
    actions = analysis.get("suggested_actions", [])
    if actions:
        st.markdown("#### 💡 Suggested Actions")
        for a in actions:
            st.write(f"→ {a}")

    # — Alarms visible —
    alarms = analysis.get("alarms_visible", [])
    if alarms:
        st.markdown("#### 🔔 Alarms Visible on Monitor")
        for alarm in alarms:
            st.warning(alarm)

    # — Image quality —
    quality = analysis.get("image_quality_note")
    if quality:
        st.caption(f"📷 Image quality: {quality}")


def push_vision_vitals(analysis):
    """Update trend buffer and history from a vision analysis result."""
    vitals = analysis.get("vitals_extracted", {})
    if not any(v is not None for v in vitals.values()):
        return
    VitalsTrendBuffer(st.session_state.vision_trend_buffer).push(vitals)
    st.session_state.vision_vitals_history.append(
        {**vitals, "timestamp": time.time(), "alert_level": analysis.get("alert_level", "NONE")}
    )


# ─────────────────────────────────────────────────
# PATIENT CONTEXT (sidebar)
# ─────────────────────────────────────────────────

st.sidebar.header("Patient Context")
age = st.sidebar.number_input("Age", 1, 100, 65)
procedure = st.sidebar.text_input("Procedure", "Spinal anesthesia for hip surgery")
comorbidities = st.sidebar.text_area("Comorbidities", "Hypertension, diabetes")

st.sidebar.markdown("---")
st.sidebar.header("Vision Settings")
st.sidebar.slider("Trend window size", 3, 30, VISION_WINDOW_SIZE, key="trend_window_slider")

# ─────────────────────────────────────────────────
# BASELINE VITALS
# ─────────────────────────────────────────────────

st.markdown("## Baseline Patient Vitals")
c1, c2, c3, c4 = st.columns(4)
base_hr = c1.number_input("Baseline HR", 40, 180, 80)
base_bp_sys = c2.number_input("Baseline BP Systolic", 60, 200, 120)
base_bp_dia = c3.number_input("Baseline BP Diastolic", 30, 120, 70)
base_spo2 = c4.number_input("Baseline SpO₂", 80, 100, 98)

if st.button("Record Baseline"):
    st.session_state.baseline_hr = base_hr
    st.session_state.baseline_bp_sys = base_bp_sys
    st.session_state.baseline_bp_dia = base_bp_dia
    st.session_state.baseline_spo2 = base_spo2
    st.session_state.baseline_set = True
    st.success("Baseline recorded")

if st.session_state.baseline_set:
    st.info(
        f"Baseline — HR: {st.session_state.baseline_hr} bpm | "
        f"BP: {st.session_state.baseline_bp_sys}/{st.session_state.baseline_bp_dia} | "
        f"SpO₂: {st.session_state.baseline_spo2}%"
    )

# ═════════════════════════════════════════════════
# MODULE 1 + 6 — VISION MONITOR (Camera Capture)
# ═════════════════════════════════════════════════

st.markdown("---")
st.markdown("## 📹 Vision Monitor — Live Camera Analysis")
st.caption(
    "Point your device camera at the anesthesia workstation monitor. "
    "Jarvis will extract vitals, interpret waveforms, and alert on deviations."
)

# ── Pre-flight camera check ──
with st.expander("📷 Camera Pre-flight Check", expanded=not st.session_state.camera_ready):
    st.write(
        "Capture a test frame of the monitor before surgery to verify Jarvis "
        "can read all parameters clearly."
    )
    preflight_img = st.camera_input("Pre-flight capture", key="preflight_cam")

    if preflight_img is not None and st.button("Run Pre-flight Check"):
        with st.spinner("Checking readability…"):
            result = analyze_monitor_frame(Image.open(preflight_img), preflight=True)

        if "error" not in result:
            ready = result.get("camera_ready", False)
            if ready:
                st.session_state.camera_ready = True
                st.success(f"✅ Camera Ready — {result.get('recommendation', '')}")
                readable = result.get("readable_parameters", [])
                if readable:
                    st.write("**Readable:** " + ", ".join(readable))
                unreadable = result.get("unreadable_parameters", [])
                if unreadable:
                    st.write("**Not readable:** " + ", ".join(unreadable))
            else:
                st.warning(f"⚠️ Not Ready — {result.get('recommendation', '')}")
                for issue in result.get("quality_issues", []):
                    st.write(f"• {issue}")
        else:
            st.error("Analysis failed")
            st.code(result.get("raw", ""))

# ── Live analysis tabs ──
tab_capture, tab_trend, tab_events = st.tabs(
    ["📸 Capture & Analyze", "📊 Vision Trend", "📋 Surgical Events"]
)

with tab_capture:
    camera_frame = st.camera_input("Capture monitor image", key="live_cam")

    col_a, col_b = st.columns([1, 1])
    with col_a:
        analyze_btn = st.button(
            "🔍 Analyze Frame", type="primary", disabled=(camera_frame is None)
        )
    with col_b:
        if st.session_state.last_vision_analysis:
            lvl = st.session_state.last_alert_level
            color_map = {"CRITICAL": "🔴", "CONCERN": "🟠", "WATCH": "🟡", "NONE": "🟢"}
            st.write(f"Last status: {color_map.get(lvl, '⚪')} **{lvl}**")

    if analyze_btn and camera_frame is not None:
        img = Image.open(camera_frame)
        with st.spinner("Jarvis analysing monitor…"):
            analysis = analyze_monitor_frame(img)

        if "error" not in analysis:
            st.session_state.last_vision_analysis = analysis
            st.session_state.last_alert_level = analysis.get("alert_level", "NONE")
            push_vision_vitals(analysis)

            render_alert_banner(analysis.get("alert_level", "NONE"), analysis)
            render_clinical_card(analysis)

            # Voice alert on CRITICAL
            if analysis.get("alert_level") == "CRITICAL":
                devs = analysis.get("deviations_from_baseline", [])
                speak(f"Critical alert. {devs[0] if devs else 'Immediate attention required.'}")
        else:
            st.error("Vision analysis failed — could not parse structured response.")
            st.code(analysis.get("raw", ""))

    # ── Upload monitor screenshot as alternative ──
    st.markdown("---")
    st.markdown("**Or upload a monitor screenshot**")
    uploaded_monitor = st.file_uploader(
        "Upload monitor image", type=["png", "jpg", "jpeg"], key="vision_upload"
    )
    if uploaded_monitor is not None:
        uimg = Image.open(uploaded_monitor)
        st.image(uimg, use_container_width=True)
        if st.button("🔍 Analyze Uploaded Image"):
            with st.spinner("Analysing uploaded image…"):
                analysis = analyze_monitor_frame(uimg)
            if "error" not in analysis:
                st.session_state.last_vision_analysis = analysis
                st.session_state.last_alert_level = analysis.get("alert_level", "NONE")
                push_vision_vitals(analysis)
                render_alert_banner(analysis.get("alert_level", "NONE"), analysis)
                render_clinical_card(analysis)
            else:
                st.error("Analysis failed")
                st.code(analysis.get("raw", ""))

with tab_trend:
    hist = st.session_state.vision_vitals_history
    if hist:
        vdf = pd.DataFrame(hist)
        fig = go.Figure()

        colors = {"hr": "#ef4444", "spo2": "#3b82f6", "sbp": "#22c55e", "etco2": "#a855f7", "rr": "#f59e0b"}
        for col_name, color in colors.items():
            if col_name in vdf.columns:
                vals = pd.to_numeric(vdf[col_name], errors="coerce")
                if vals.notna().any():
                    label, unit = _VITAL_META.get(col_name, (col_name.upper(), ""))
                    fig.add_trace(
                        go.Scatter(y=vals, name=f"{label} ({unit})", line=dict(color=color, width=2))
                    )

        fig.update_layout(
            title="Vision-Extracted Vital Trends",
            height=380,
            yaxis_title="Value",
            xaxis_title="Reading #",
            template="plotly_dark",
            legend=dict(orientation="h", yanchor="bottom", y=1.02),
        )
        st.plotly_chart(fig, use_container_width=True)

        # Trajectory metric
        trend_buf = VitalsTrendBuffer(st.session_state.vision_trend_buffer)
        summary = trend_buf.get_trend_summary()
        if isinstance(summary, dict):
            traj = summary.get("trajectory", "UNKNOWN")
            traj_icon = {
                "DETERIORATING_FAST": "🔴",
                "DECLINING": "🟠",
                "STABLE": "🟢",
                "IMPROVING": "🟢",
                "INSUFFICIENT_DATA": "⚪",
            }
            m1, m2, m3 = st.columns(3)
            m1.metric("Trajectory", f"{traj_icon.get(traj, '⚪')} {traj}")
            m2.metric("Readings", summary.get("readings_count", 0))
            m3.metric("Window", f"{summary.get('duration_mins', 0)} min")

            deltas = {k: v for k, v in summary.items() if k.endswith("_delta")}
            if deltas:
                st.markdown("**Deltas (first → last):**")
                dcols = st.columns(len(deltas))
                for i, (k, v) in enumerate(deltas.items()):
                    name = k.replace("_delta", "").upper()
                    dcols[i].metric(name, f"{v:+.1f}")
    else:
        st.info("No vision readings yet. Capture a monitor frame to begin tracking.")

with tab_events:
    st.markdown("Log surgical events so Jarvis can contextualise vital sign changes.")
    event_text = st.text_input(
        "Event description",
        placeholder="e.g. Incision started, 250ml fluid bolus given, tourniquet inflated",
    )
    if st.button("Log Event") and event_text:
        st.session_state.surgical_events.append(
            {"time": time.strftime("%H:%M:%S"), "event": event_text}
        )
        st.success(f"Logged: {event_text}")

    if st.session_state.surgical_events:
        for evt in reversed(st.session_state.surgical_events):
            st.write(f"**{evt['time']}** — {evt['event']}")
    else:
        st.caption("No events logged yet.")


# ═════════════════════════════════════════════════
# MANUAL VITAL ENTRY (existing, preserved)
# ═════════════════════════════════════════════════

st.markdown("---")
st.markdown("## Manual Vital Entry (Minute-by-Minute)")

c1, c2, c3, c4 = st.columns(4)
hr = c1.number_input("Heart Rate", 40, 180, 80)
bp_sys = c2.number_input("BP Systolic", 60, 200, 120)
bp_dia = c3.number_input("BP Diastolic", 30, 120, 70)
spo2 = c4.number_input("SpO₂", 70, 100, 98)

c5, c6, c7 = st.columns(3)
etco2 = c5.number_input("EtCO₂", 10, 60, 35)
rr = c6.number_input("Resp Rate", 5, 40, 14)
temp = c7.number_input("Temperature", 34.0, 41.0, 36.8)

if st.button("Record Vital Set"):
    new_row = {
        "Time": pd.Timestamp.now(),
        "HR": hr,
        "BP_sys": bp_sys,
        "BP_dia": bp_dia,
        "SpO2": spo2,
        "EtCO2": etco2,
        "RR": rr,
        "Temp": temp,
    }
    st.session_state.vitals_table = pd.concat(
        [st.session_state.vitals_table, pd.DataFrame([new_row])],
        ignore_index=True,
    )
    st.session_state.hr = hr
    st.session_state.spo2 = spo2
    st.session_state.bp_sys = bp_sys
    st.session_state.bp_dia = bp_dia

st.dataframe(st.session_state.vitals_table)

# ── Baseline deviation check ──
if st.session_state.baseline_set:
    alerts = []
    if hr - st.session_state.baseline_hr > 30:
        alerts.append("Significant tachycardia relative to baseline")
    if st.session_state.baseline_bp_sys - bp_sys > 20:
        alerts.append("Significant drop in systolic BP from baseline")
    if st.session_state.baseline_spo2 - spo2 > 5:
        alerts.append("SpO₂ falling relative to baseline")
    if alerts:
        st.warning("⚠ Baseline deviation detected")
        for a in alerts:
            st.write("•", a)

# ── Vital trend graph ──
st.markdown("### Vital Trends (Manual Entry)")
if not st.session_state.vitals_table.empty:
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=st.session_state.vitals_table["Time"],
            y=st.session_state.vitals_table["HR"],
            name="HR",
        )
    )
    fig.add_trace(
        go.Scatter(
            x=st.session_state.vitals_table["Time"],
            y=st.session_state.vitals_table["SpO2"],
            name="SpO₂",
        )
    )
    fig.update_layout(height=300)
    st.plotly_chart(fig, use_container_width=True)

# ═════════════════════════════════════════════════
# UPLOAD CLINICAL FILE (enhanced — images now sent to Gemini)
# ═════════════════════════════════════════════════

st.markdown("---")
st.markdown("## Upload Clinical File")

uploaded = st.file_uploader(
    "Upload ECG / monitor screenshot / report",
    type=["png", "jpg", "jpeg", "pdf", "txt"],
    key="clinical_upload",
)

if uploaded and uploaded.type.startswith("image"):
    img = Image.open(uploaded)
    st.image(img, use_container_width=True)

# ─────────────────────────────────────────────────
# AI CLINICAL ANALYSIS (enhanced with vision + image)
# ─────────────────────────────────────────────────

st.markdown("## AI Clinical Analysis")


def _build_analysis_context():
    """Assemble full clinical context from all input modes."""
    parts = []

    parts.append(
        f"Patient: {age}yo | Procedure: {procedure} | Comorbidities: {comorbidities}"
    )

    if st.session_state.baseline_set:
        parts.append(f"Baseline: {_baseline_str()}")

    if not st.session_state.vitals_table.empty:
        parts.append("Recent manual vitals:\n" + st.session_state.vitals_table.tail(5).to_string(index=False))

    if st.session_state.last_vision_analysis:
        va = st.session_state.last_vision_analysis
        parts.append(f"Latest vision monitor read: {json.dumps(va.get('vitals_extracted', {}))}")
        parts.append(f"Vision alert level: {va.get('alert_level', 'NONE')}")
        parts.append(f"Vision trend: {va.get('trend_interpretation', '')}")

    if st.session_state.surgical_events:
        parts.append("Surgical events:\n" + _events_str())

    return "\n\n".join(parts)


if not st.session_state.vitals_table.empty or st.session_state.last_vision_analysis:
    case = st.text_area(
        "Clinical situation",
        placeholder="Example: BP dropped after spinal anesthesia",
    )

    if st.button("Run AI Analysis"):
        context = _build_analysis_context()
        prompt = f"""You are an expert anesthesia decision-support assistant.

{context}

Clinical description: {case}

Provide:
1. Trend interpretation
2. Physiological explanation
3. Differential diagnosis
4. Immediate checks
5. Recommended actions"""

        contents = [prompt]
        if uploaded and uploaded.type.startswith("image"):
            contents.append(Image.open(uploaded))

        placeholder = st.empty()
        output_text = ""
        for chunk in client.models.generate_content_stream(
            model="gemini-2.5-flash", contents=contents
        ):
            if chunk.text:
                output_text += chunk.text
                placeholder.markdown(output_text)
else:
    st.info("Enter vitals (manual or via Vision Monitor) to enable AI analysis.")

# ─────────────────────────────────────────────────
# MODULE 7 — MULTIMODAL VOICE AI (vision-aware)
# ─────────────────────────────────────────────────

st.markdown("---")
st.markdown("## 🎤 Talk to Jarvis")
st.caption("Voice input is fused with vision data and patient context for clinical reasoning.")

if st.button("Start Voice Conversation"):
    question = listen()
    st.write("**Doctor:**", question)

    context = _build_analysis_context()
    full_prompt = (
        f"You are Jarvis, an OR clinical copilot. "
        f"The clinician is speaking to you during a case.\n\n"
        f"CLINICAL CONTEXT:\n{context}\n\n"
        f"CLINICIAN SAYS: {question}\n\n"
        f"Respond concisely and clinically. If they report a surgical event, "
        f"acknowledge it and adjust your interpretation."
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash", contents=full_prompt
    )
    answer = response.text
    st.write("**Jarvis:**", answer)
    speak(answer)

    if any(kw in question.lower() for kw in ("bolus", "incision", "clamp", "intubat", "extubat", "tourniquet", "blood")):
        st.session_state.surgical_events.append(
            {"time": time.strftime("%H:%M:%S"), "event": f"[Voice] {question}"}
        )

# ─────────────────────────────────────────────────
# AI COPILOT CHAT (vision-aware)
# ─────────────────────────────────────────────────

st.markdown("---")
st.markdown("## AI Copilot Chat")

for msg in st.session_state.history:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

query = st.chat_input("Ask Jarvis anything…")

if query:
    st.session_state.history.append({"role": "user", "content": query})

    context = _build_analysis_context()
    augmented = (
        f"[System context — not visible to clinician]\n{context}\n\n"
        f"Clinician question: {query}"
    )

    with st.chat_message("assistant"):
        placeholder = st.empty()
        full = ""
        for chunk in client.models.generate_content_stream(
            model="gemini-2.5-flash", contents=augmented
        ):
            if chunk.text:
                full += chunk.text
                placeholder.markdown(full)

    st.session_state.history.append({"role": "assistant", "content": full})

# ─────────────────────────────────────────────────
# ENHANCED SAFETY MONITOR (vision + manual)
# ─────────────────────────────────────────────────

st.markdown("---")
st.markdown("## AI Safety Monitor")

safety_triggered = False

# Check manual vitals
if "hr" in st.session_state and "spo2" in st.session_state:
    if st.session_state.hr > 110 or st.session_state.spo2 < 92:
        safety_triggered = True

# Check vision vitals
va = st.session_state.last_vision_analysis
if va and va.get("alert_level") in ("CRITICAL", "CONCERN"):
    safety_triggered = True

if safety_triggered:
    st.error("⚠ Physiological instability detected")

    alert_parts = []
    if "hr" in st.session_state:
        alert_parts.append(f"Manual HR: {st.session_state.get('hr')}")
    if "spo2" in st.session_state:
        alert_parts.append(f"Manual SpO₂: {st.session_state.get('spo2')}")
    if va:
        ve = va.get("vitals_extracted", {})
        if ve.get("hr"):
            alert_parts.append(f"Vision HR: {ve['hr']}")
        if ve.get("spo2"):
            alert_parts.append(f"Vision SpO₂: {ve['spo2']}")

    alert_prompt = f"""Vitals alert detected.

{chr(10).join(alert_parts)}

Clinical context: {_build_analysis_context()}

Provide a rapid clinical safety checklist with:
1. Immediate actions (A-B-C approach)
2. Things to rule out
3. Escalation criteria"""

    response = client.models.generate_content(
        model="gemini-2.5-flash", contents=alert_prompt
    )
    st.write(response.text)

# ─────────────────────────────────────────────────
# FOOTER
# ─────────────────────────────────────────────────

st.markdown("---")
st.markdown("### Developer")
st.write(
    """
Dr Bhavna Gupta
Consultant Anaesthesiologist 

Project: Jarvis OR Guardian — AI-Assisted Intraoperative Reasoning
Purpose: Ambient clinical monitoring with multimodal vision, voice, and decision support

**Disclaimer:** Prototype for research and education. Not FDA-cleared.
OCR accuracy varies with camera angle and monitor type. Waveform interpretation
is directional, not diagnostic-grade. 3–8 second analysis latency means this is
a copilot, not a real-time safety interlock. Always rely on direct clinical observation.
"""
)
