import streamlit as st
import speech_recognition as sr
import pyttsx3
from google import genai

st.set_page_config(layout="wide")

st.title("🎤 OR Guardian Voice Copilot")
st.subheader("Talk to the AI Clinical Assistant")

st.info("Speak your clinical question and the AI will respond.")

# -----------------------------------
# GEMINI API
# -----------------------------------

api_key = st.sidebar.text_input("Gemini API Key", type="password")

if not api_key:
    st.warning("Enter Gemini API key")
    st.stop()

client = genai.Client(api_key=api_key)

# -----------------------------------
# SPEECH ENGINE
# -----------------------------------

engine = pyttsx3.init()

def speak(text):
    engine.say(text)
    engine.runAndWait()

# -----------------------------------
# MICROPHONE INPUT
# -----------------------------------

def listen():

    r = sr.Recognizer()

    with sr.Microphone() as source:

        st.write("🎤 Listening...")

        audio = r.listen(source)

    try:

        text = r.recognize_google(audio)

        return text

    except:

        return "Could not understand audio"


# -----------------------------------
# BUTTON TO TALK
# -----------------------------------

if st.button("🎤 Speak to AI"):

    user_text = listen()

    st.write("Doctor:", user_text)

    prompt = f"""
You are an anaesthesia clinical decision support assistant.

Doctor question:
{user_text}

Provide concise clinical reasoning and safety advice.
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    answer = response.text

    st.write("AI:", answer)

    speak(answer)