import streamlit as st
from google import genai
import pandas as pd
import plotly.graph_objects as go
from PIL import Image
import speech_recognition as sr
import pyttsx3

st.set_page_config(layout="wide")

st.title("🧠 OR Guardian Live Copilot")
st.subheader("Multimodal AI Assistant for Anaesthesia & Critical Care")
st.info("Educational clinical decision support. Not for autonomous medical decisions.")

# ------------------------------------------------
# GEMINI API
# ------------------------------------------------

api_key = st.sidebar.text_input("Gemini API Key", type="password")

if not api_key:
    st.stop()

client = genai.Client(api_key=api_key)

# ------------------------------------------------
# SESSION STATE
# ------------------------------------------------

if "baseline_set" not in st.session_state:
    st.session_state.baseline_set = False

if "vitals_table" not in st.session_state:
    st.session_state.vitals_table = pd.DataFrame(
        columns=["Time","HR","BP_sys","BP_dia","SpO2","EtCO2","RR","Temp"]
    )

if "history" not in st.session_state:
    st.session_state.history = []

# ------------------------------------------------
# SPEECH ENGINE
# ------------------------------------------------

engine = pyttsx3.init()

def speak(text):
    engine.say(text)
    engine.runAndWait()

def listen():
    r = sr.Recognizer()
    with sr.Microphone() as source:
        st.info("🎤 Listening...")
        audio = r.listen(source)
    try:
        return r.recognize_google(audio)
    except:
        return "Could not understand audio"

# ------------------------------------------------
# PATIENT CONTEXT
# ------------------------------------------------

st.sidebar.header("Patient Context")

age = st.sidebar.number_input("Age",1,100,65)

procedure = st.sidebar.text_input(
"Procedure",
"Spinal anesthesia for hip surgery"
)

comorbidities = st.sidebar.text_area(
"Comorbidities",
"Hypertension, diabetes"
)

# ------------------------------------------------
# BASELINE VITALS
# ------------------------------------------------

st.markdown("## Baseline Patient Vitals")

col1,col2,col3,col4 = st.columns(4)

base_hr = col1.number_input("Baseline HR",40,180,80)
base_bp_sys = col2.number_input("Baseline BP Systolic",60,200,120)
base_bp_dia = col3.number_input("Baseline BP Diastolic",30,120,70)
base_spo2 = col4.number_input("Baseline SpO2",80,100,98)

if st.button("Record Baseline"):

    st.session_state.baseline_hr = base_hr
    st.session_state.baseline_bp_sys = base_bp_sys
    st.session_state.baseline_bp_dia = base_bp_dia
    st.session_state.baseline_spo2 = base_spo2

    st.session_state.baseline_set = True
    st.success("Baseline recorded successfully")

if st.session_state.baseline_set:
    st.info(
        f"Baseline HR: {st.session_state.baseline_hr} bpm | "
        f"BP: {st.session_state.baseline_bp_sys}/{st.session_state.baseline_bp_dia} | "
        f"SpO2: {st.session_state.baseline_spo2}%"
    )

# ------------------------------------------------
# LIVE VITAL ENTRY
# ------------------------------------------------

st.markdown("## Patient Vital Entry (Minute-by-Minute)")

col1,col2,col3,col4 = st.columns(4)

hr = col1.number_input("Heart Rate",40,180,80)
bp_sys = col2.number_input("BP Systolic",60,200,120)
bp_dia = col3.number_input("BP Diastolic",30,120,70)
spo2 = col4.number_input("SpO₂",70,100,98)

col5,col6,col7 = st.columns(3)

etco2 = col5.number_input("EtCO₂",10,60,35)
rr = col6.number_input("Resp Rate",5,40,14)
temp = col7.number_input("Temperature",34.0,41.0,36.8)

if st.button("Record Vital Set"):

    new_row = {
        "Time": pd.Timestamp.now(),
        "HR": hr,
        "BP_sys": bp_sys,
        "BP_dia": bp_dia,
        "SpO2": spo2,
        "EtCO2": etco2,
        "RR": rr,
        "Temp": temp
    }

    st.session_state.vitals_table = pd.concat(
        [st.session_state.vitals_table, pd.DataFrame([new_row])],
        ignore_index=True
    )

    # store latest vitals
    st.session_state.hr = hr
    st.session_state.spo2 = spo2
    st.session_state.bp_sys = bp_sys
    st.session_state.bp_dia = bp_dia

st.dataframe(st.session_state.vitals_table)

# ------------------------------------------------
# BASELINE DEVIATION CHECK
# ------------------------------------------------

if st.session_state.baseline_set:

    hr_change = hr - st.session_state.baseline_hr
    bp_drop = st.session_state.baseline_bp_sys - bp_sys
    spo2_drop = st.session_state.baseline_spo2 - spo2

    alerts = []

    if hr_change > 30:
        alerts.append("Significant tachycardia relative to baseline")

    if bp_drop > 20:
        alerts.append("Significant drop in systolic BP from baseline")

    if spo2_drop > 5:
        alerts.append("SpO2 falling relative to baseline")

    if alerts:
        st.warning("⚠ Baseline deviation detected")
        for a in alerts:
            st.write("•", a)

# ------------------------------------------------
# VITAL TREND GRAPH
# ------------------------------------------------

st.markdown("### Vital Trends")

if not st.session_state.vitals_table.empty:

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=st.session_state.vitals_table["Time"],
        y=st.session_state.vitals_table["HR"],
        name="HR"
    ))

    fig.add_trace(go.Scatter(
        x=st.session_state.vitals_table["Time"],
        y=st.session_state.vitals_table["SpO2"],
        name="SpO2"
    ))

    fig.update_layout(height=300)
    st.plotly_chart(fig, use_container_width=True)

# ------------------------------------------------
# FILE UPLOAD
# ------------------------------------------------

st.markdown("## Upload Monitor Image / Clinical File")

uploaded = st.file_uploader(
"Upload ECG / monitor screenshot / report",
type=["png","jpg","jpeg","pdf","txt"]
)

if uploaded and uploaded.type.startswith("image"):
    img = Image.open(uploaded)
    st.image(img, use_container_width=True)

# ------------------------------------------------
# CASE DESCRIPTION
# ------------------------------------------------

case = st.text_area(
"Clinical situation",
placeholder="Example: BP dropped after spinal anesthesia"
)

# ------------------------------------------------
# AI TREND ANALYSIS
# ------------------------------------------------

st.markdown("## AI Clinical Analysis")

if not st.session_state.vitals_table.empty:

    if st.button("Run AI Analysis"):

        recent_vitals = st.session_state.vitals_table.tail(5)

        vitals_summary = recent_vitals.to_string(index=False)

        prompt = f"""
You are an expert anesthesia decision-support assistant.

Patient context:
Age: {age}
Procedure: {procedure}
Comorbidities: {comorbidities}

Recent vitals:
{vitals_summary}

Clinical description:
{case}

Provide:

1. Trend interpretation
2. Physiological explanation
3. Differential diagnosis
4. Immediate checks
5. Recommended actions
"""

        placeholder = st.empty()
        output_text = ""

        for chunk in client.models.generate_content_stream(
            model="gemini-2.5-flash",
            contents=prompt
        ):

            if chunk.text:
                output_text += chunk.text
                placeholder.markdown(output_text)

else:
    st.info("Enter at least one set of vitals to enable AI analysis.")

# ------------------------------------------------
# VOICE AI
# ------------------------------------------------

st.markdown("## 🎤 Talk to AI")

if st.button("Start Voice Conversation"):

    question = listen()
    st.write("Doctor:", question)

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=question
    )

    answer = response.text
    st.write("AI:", answer)

    speak(answer)

# ------------------------------------------------
# CHAT COPILOT
# ------------------------------------------------

st.markdown("## AI Copilot Chat")

for msg in st.session_state.history:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

query = st.chat_input("Ask the AI assistant")

if query:

    st.session_state.history.append({"role":"user","content":query})

    with st.chat_message("assistant"):

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=query,
            stream=True
        )

        placeholder = st.empty()
        full=""

        for chunk in response:
            if chunk.text:
                full += chunk.text
                placeholder.markdown(full)

    st.session_state.history.append({"role":"assistant","content":full})

# ------------------------------------------------
# SAFETY MONITOR
# ------------------------------------------------

st.markdown("## AI Safety Monitor")

if "hr" in st.session_state and "spo2" in st.session_state:

    if st.session_state.hr > 110 or st.session_state.spo2 < 92:

        st.error("⚠ Physiological instability detected")

        alert_prompt = f"""
Vitals alert detected.

HR {st.session_state.hr}
SpO2 {st.session_state.spo2}

Provide rapid clinical safety checklist.
"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=alert_prompt
        )

        st.write(response.text)

# ------------------------------------------------
# DEVELOPER
# ------------------------------------------------

st.markdown("---")
st.markdown("### Developer")

st.write(
"""
Dr Bhavna Gupta  
Anaesthesiologist  

Project: OR Guardian Live Copilot  
Purpose: AI-assisted intraoperative reasoning and clinician safety support
"""
)