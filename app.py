import streamlit as st
from google import genai
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from PIL import Image
import time

st.set_page_config(layout="wide", page_title="OR Guardian Live")

st.title("🧠 OR Guardian Live Agent")
st.subheader("AI Copilot for Anaesthesia & Critical Care")

st.info(
"This AI system provides educational decision support. "
"It does not replace professional medical judgment."
)

# ------------------------------------------------
# GEMINI API
# ------------------------------------------------

api_key = st.sidebar.text_input("Gemini API Key", type="password")

if not api_key:
    st.sidebar.warning("Enter Gemini API key")
    st.stop()

client = genai.Client(api_key=api_key)

# ------------------------------------------------
# SIDEBAR PATIENT INFO
# ------------------------------------------------

st.sidebar.header("Patient Context")

patient_age = st.sidebar.number_input("Age", 1, 100, 65)

procedure = st.sidebar.text_input(
"Procedure",
"Spinal anesthesia for hip surgery"
)

comorbidities = st.sidebar.text_area(
"Comorbidities",
"Hypertension, diabetes"
)

# ------------------------------------------------
# LIVE VITAL MONITOR
# ------------------------------------------------

st.markdown("## Live Patient Monitor")

if "hr" not in st.session_state:
    st.session_state.hr = 78
    st.session_state.bp = 120
    st.session_state.spo2 = 98

col1, col2, col3 = st.columns(3)

col1.metric("Heart Rate", f"{st.session_state.hr} bpm")
col2.metric("BP", f"{st.session_state.bp}/70")
col3.metric("SpO2", f"{st.session_state.spo2}%")

if st.button("Simulate Vital Change"):

    st.session_state.hr += np.random.randint(-15,15)
    st.session_state.bp += np.random.randint(-20,20)
    st.session_state.spo2 += np.random.randint(-3,1)

    st.rerun()

# ------------------------------------------------
# VITAL TREND GRAPH
# ------------------------------------------------

st.markdown("### Vital Trend")

if "trend" not in st.session_state:
    st.session_state.trend = []

st.session_state.trend.append(st.session_state.hr)

trend_df = pd.DataFrame({"HR": st.session_state.trend})

fig = go.Figure()
fig.add_trace(go.Scatter(y=trend_df["HR"], mode="lines"))
fig.update_layout(height=250)

st.plotly_chart(fig, use_container_width=True)

# ------------------------------------------------
# CLINICAL CASE DESCRIPTION
# ------------------------------------------------

st.markdown("## Clinical Situation")

case_description = st.text_area(
"Describe intraoperative situation",
placeholder="Example: BP dropped to 70/40 after spinal anesthesia"
)

# ------------------------------------------------
# FILE / IMAGE UPLOAD
# ------------------------------------------------

st.markdown("## Upload Clinical File")

uploaded_file = st.file_uploader(
"Upload ECG / report / monitor screenshot",
type=["png","jpg","jpeg","txt","pdf"]
)

file_text = ""

if uploaded_file:

    if uploaded_file.type.startswith("image"):

        image = Image.open(uploaded_file)
        st.image(image, caption="Uploaded image", use_container_width=True)

    elif uploaded_file.type == "text/plain":

        file_text = uploaded_file.read().decode()

        st.success("Text file uploaded")

    else:
        st.success("File uploaded")

# ------------------------------------------------
# AI ANALYSIS
# ------------------------------------------------

st.markdown("## AI Clinical Analysis")

if st.button("Run AI Analysis"):

    prompt = f"""
You are an expert anaesthesia decision-support AI.

Patient details:
Age: {patient_age}
Procedure: {procedure}
Comorbidities: {comorbidities}

Vitals:
Heart Rate: {st.session_state.hr}
BP: {st.session_state.bp}/70
SpO2: {st.session_state.spo2}

Clinical Situation:
{case_description}

Uploaded Notes:
{file_text}

Provide structured output:

1. Situation Assessment
2. Possible Causes
3. Immediate Checks
4. Recommended Actions
5. Critical Warning Signs
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        stream=True
    )

    placeholder = st.empty()
    text=""

    for chunk in response:

        if chunk.text:

            text += chunk.text
            placeholder.markdown(text)

# ------------------------------------------------
# AI COPILOT CHAT
# ------------------------------------------------

st.markdown("## AI Copilot Chat")

if "history" not in st.session_state:
    st.session_state.history = []

for msg in st.session_state.history:

    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

query = st.chat_input("Ask the AI assistant")

if query:

    st.session_state.history.append({"role":"user","content":query})

    with st.chat_message("user"):
        st.markdown(query)

    with st.chat_message("assistant"):

        placeholder = st.empty()
        full=""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=query,
            stream=True
        )

        for chunk in response:

            if chunk.text:
                full += chunk.text
                placeholder.markdown(full)

    st.session_state.history.append(
        {"role":"assistant","content":full}
    )

# ------------------------------------------------
# AUTO SAFETY ALERT
# ------------------------------------------------

st.markdown("## AI Safety Monitor")

if st.session_state.hr > 110 or st.session_state.spo2 < 92:

    st.error("⚠ Physiological instability detected")

    alert_prompt = f"""
Vitals alert detected.

HR: {st.session_state.hr}
SpO2: {st.session_state.spo2}

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

Project: OR Guardian Live AI  
Purpose: AI-assisted clinician safety and intraoperative reasoning support
"""
)