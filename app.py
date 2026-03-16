"""
Jarvis OR Guardian — FastAPI Backend
Multimodal AI Assistant for Anaesthesia & Critical Care
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from google import genai
from PIL import Image
import json
import base64
import io
import os

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

app = FastAPI(title="Jarvis OR Guardian")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def index():
    return FileResponse("static/index.html")


# ─── Request Models ──────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    image_base64: str
    api_key: Optional[str] = None
    baseline: Optional[dict] = None
    patient_context: Optional[dict] = None
    surgical_events: Optional[list] = []
    trend_summary: Optional[str] = None
    preflight: bool = False


class ChatRequest(BaseModel):
    message: str
    api_key: Optional[str] = None
    context: str = ""
    stream: bool = False


# ─── Gemini Prompts ──────────────────────────────────────────

VISION_PROMPT = """You are Jarvis, an AI clinical monitoring assistant in an operating room.
Analyze this anesthesia workstation / patient monitor image.

PATIENT BASELINE:
{baseline}

CURRENT CLINICAL CONTEXT:
{context}

RECENT SURGICAL EVENTS:
{events}

VITALS TREND (last readings):
{trend}

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

PREFLIGHT_PROMPT = """Analyze this image of an anesthesia workstation / patient monitor.
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

CHAT_SYSTEM = """You are Jarvis, an AI clinical copilot in an operating room.
You provide concise, evidence-based clinical guidance to anaesthesiologists.
You are aware of the patient's vitals, baseline, surgical events, and vision data.
If the clinician reports a surgical event, acknowledge it and adjust your interpretation.
Be direct, clinical, and actionable. Use numbered lists where appropriate."""

SAFETY_PROMPT = """You are Jarvis, an AI safety monitor. A physiological alert has been triggered.

ALERT DATA:
{alert_data}

CLINICAL CONTEXT:
{context}

Provide a rapid clinical safety checklist:
1. Immediate actions (A-B-C approach)
2. Things to rule out
3. Escalation criteria

Be concise and actionable. Use bullet points."""


# ─── Helpers ─────────────────────────────────────────────────

def get_client(api_key: Optional[str]) -> genai.Client:
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(status_code=400, detail="Gemini API key required")
    return genai.Client(api_key=key)


def parse_gemini_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        end = len(lines)
        for i in range(len(lines) - 1, 0, -1):
            if lines[i].strip().startswith("```"):
                end = i
                break
        text = "\n".join(lines[1:end])
    return json.loads(text)


def decode_image(b64: str) -> Image.Image:
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(b64)))


# ─── Endpoints ───────────────────────────────────────────────

@app.post("/api/analyze")
async def analyze_frame(req: AnalyzeRequest):
    client = get_client(req.api_key)
    img = decode_image(req.image_base64)

    if req.preflight:
        prompt = PREFLIGHT_PROMPT
    else:
        baseline_str = json.dumps(req.baseline) if req.baseline else "No baseline set"
        ctx = req.patient_context or {}
        context_str = (
            f"Patient: {ctx.get('age', 'N/A')}yo | "
            f"Procedure: {ctx.get('procedure', 'N/A')} | "
            f"Comorbidities: {ctx.get('comorbidities', 'N/A')}"
        )
        events_list = req.surgical_events or []
        events_str = "\n".join(f"- {e}" for e in events_list) or "None logged"
        trend_str = req.trend_summary or "No trend data yet"

        prompt = VISION_PROMPT.format(
            baseline=baseline_str,
            context=context_str,
            events=events_str,
            trend=trend_str,
        )

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[prompt, img],
    )

    try:
        return parse_gemini_json(response.text)
    except (json.JSONDecodeError, ValueError):
        return {"error": "Failed to parse Gemini response", "raw": response.text}


@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    client = get_client(req.api_key)

    prompt = f"{CHAT_SYSTEM}\n\nCLINICAL CONTEXT:\n{req.context}\n\nCLINICIAN: {req.message}"

    if req.stream:
        def generate():
            for chunk in client.models.generate_content_stream(
                model=GEMINI_MODEL, contents=prompt
            ):
                if chunk.text:
                    yield f"data: {json.dumps({'text': chunk.text})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")

    response = client.models.generate_content(
        model=GEMINI_MODEL, contents=prompt
    )
    return {"response": response.text}


class SafetyRequest(BaseModel):
    alert_data: str
    api_key: Optional[str] = None
    context: str = ""


@app.post("/api/safety")
async def safety_check(req: SafetyRequest):
    client = get_client(req.api_key)
    prompt = SAFETY_PROMPT.format(alert_data=req.alert_data, context=req.context)
    response = client.models.generate_content(
        model=GEMINI_MODEL, contents=prompt
    )
    return {"response": response.text}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Jarvis OR Guardian"}
