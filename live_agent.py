import streamlit as st
from google import genai
import pandas as pd
import numpy as np
import time

st.set_page_config(layout="wide", page_title="OR Guardian Live Agent")

st.title("🧠 OR Guardian Live")
st.subheader("Real-time AI Copilot for Anaesthesia & Critical Care")

st.info("Educational clinical support only. Not for autonomous decision making.")

# ----------------------------------
# GEMINI CLIENT
# ----------------------------------

api_key = st.sidebar.text_input("Gemini API Key", type="password")

if not api_key:
    st.stop()

client = genai.Client(api_key=api_key)

# ----------------------------------
# LIVE PATIENT MONITOR
# ----------------------------------

st.markdown("## Patient Monitor")

if "hr" not in st.session_state:
    st.session_state.hr = 75
    st.session_state.bp = 120
    st.session_state.spo2 = 98

col1,col2,col3 = st.columns(3)

col1.metric("Heart Rate", f"{st.session_state.hr} bpm")
col2.metric("BP", f"{st.session_state.bp}/70")
col3.metric("SpO2", f"{st.session_state.spo2}%")

if st.button("Simulate Vital Change"):

    st.session_state.hr += np.random.randint(-10,10)
    st.session_state.bp += np.random.randint(-15,15)
    st.session_state.spo2 += np.random.randint(-2,1)

    st.rerun()

# ----------------------------------
# CASE DESCRIPTION
# ----------------------------------

st.markdown("## Clinical Context")

case = st.text_area(
"Describe procedure or clinical situation",
placeholder="Example: Spinal anesthesia for hip surgery"
)

# ----------------------------------
# FILE UPLOAD
# ----------------------------------

st.markdown("## Upload Clinical File")

uploaded_file = st.file_uploader(
"Upload report / ECG / notes",
type=["pdf","txt","png","jpg"]
)

file_text = ""

if uploaded_file:

    if uploaded_file.type == "text/plain":
        file_text = uploaded_file.read().decode()

    st.success("File uploaded")

# ----------------------------------
# AI ANALYSIS
# ----------------------------------

if st.button("Run AI Clinical Analysis"):

    prompt = f"""
You are an anaesthesia decision-support AI.

Patient vitals:

HR: {st.session_state.hr}
BP: {st.session_state.bp}/70
SpO2: {st.session_state.spo2}

Clinical situation:
{case}

Additional file notes:
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

# ----------------------------------
# LIVE CHAT
# ----------------------------------

st.markdown("## AI Copilot Chat")

if "history" not in st.session_state:
    st.session_state.history=[]

for msg in st.session_state.history:
    with st.chat_message(msg["role"]):
        st.write(msg["content"])

query = st.chat_input("Ask AI")

if query:

    st.session_state.history.append({"role":"user","content":query})

    with st.chat_message("user"):
        st.write(query)

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

# ----------------------------------
# DEVELOPER
# ----------------------------------

st.markdown("---")

st.write(
"""
Developer  
Dr Bhavna Gupta  
Anaesthesiologist  

Project: OR Guardian Live
"""
)