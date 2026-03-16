# Jarvis OR Guardian

**Multimodal AI Assistant for Anaesthesia & Critical Care**

Jarvis OR Guardian uses a phone or tablet camera pointed at an anesthesia workstation monitor to continuously extract vital signs, interpret waveforms, detect clinical deterioration, and provide real-time decision support to anaesthesiologists — powered by Gemini 2.5 Flash vision.

> **Disclaimer:** Prototype for research and education. Not FDA-cleared. Not for autonomous medical decisions.

---

## The Problem

During surgery, anaesthesiologists monitor 8+ vital parameters simultaneously while managing drugs, airway, fluids, and responding to surgical events. Cognitive overload is real — studies show critical alarms are missed or acknowledged late in **23–30%** of cases, especially during high-workload phases.

Existing solutions require proprietary monitor integrations (HL7, DICOM, vendor SDKs) that are expensive, gated, and incompatible across devices.

## The Solution

**The camera is the interface.** Point any phone at any monitor. Jarvis reads the screen every 3 seconds, extracts structured vitals via Gemini vision, tracks trends over time, and escalates through 4 alert tiers with voice alerts, vibration, and clinical guidance — all without touching the hospital's IT infrastructure.

---

## Features

### Core Capabilities

| Feature | Description |
|---|---|
| **Vision Monitor** | Camera-based vital sign extraction via Gemini 2.5 Flash multimodal |
| **ROI Cropping** | Draggable bounding box to isolate the monitor region, improving OCR accuracy and reducing token cost |
| **4-Tier Alert Engine** | NONE → WATCH → CONCERN → CRITICAL with audio tones, vibration, voice alerts, and full-screen red overlay |
| **Clinical Insight Cards** | Structured 7-section cards: vitals, waveforms, trend interpretation, differentials, checks, actions, alarms |
| **Temporal Trend Tracking** | Sliding-window buffer with trajectory detection (STABLE / DECLINING / DETERIORATING_FAST / IMPROVING) |
| **Pre-flight Camera Check** | Gemini validates the camera can read all parameters before surgery begins |
| **Copilot Chat** | Streaming AI chat fused with patient context, vitals, baseline, and surgical events |
| **Voice I/O** | Web Speech API for voice input + browser TTS for critical voice alerts |
| **Surgical Event Log** | Timestamped event logging with auto-detection from voice input |
| **Simulation Mode** | Hidden MP4 fallback for demo reliability (triple-click logo or Ctrl+Shift+S) |
| **PWA Support** | Installable on any device via manifest, works on phones and tablets |

### Alert Levels

| Level | Trigger | UI Response |
|---|---|---|
| **NONE** | All vitals within baseline range | Green banner, quiet |
| **WATCH** | Single mild deviation | Yellow banner, soft tone |
| **CONCERN** | Two deviations or waveform change | Orange pulsing banner, distinct tone + vibration |
| **CRITICAL** | SpO2 <90, HR >130/<40, severe hypotension, EtCO2 loss | Full-screen red overlay, persistent alarm, voice alert, strong vibration |

---

## Architecture

```
Camera / MP4 Video
       │
       ▼
  ┌──────────────┐    ROI Crop    ┌──────────────┐
  │  Browser      │──────────────▶│  FastAPI      │
  │  getUserMedia │   base64 JPEG │  Backend      │
  │  + ROI Box    │               │               │
  └──────────────┘               └───────┬──────┘
       ▲                                 │
       │                                 ▼
  ┌──────────────┐               ┌──────────────┐
  │  Alert Engine │◀─────────────│  Gemini 2.5   │
  │  + Trend Buf  │  struct JSON  │  Flash Vision │
  │  + Chart.js   │               └──────────────┘
  │  + Voice TTS  │
  └──────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + Uvicorn |
| AI Vision | Google Gemini 2.5 Flash (multimodal) |
| Frontend | Vanilla HTML / CSS / JS (no build step) |
| Camera | `MediaDevices.getUserMedia()` with ROI crop |
| Charts | Chart.js 4.x (CDN) |
| Alerts | Web Audio API + Vibration API + Web Speech API |
| Deployment | Docker → Azure App Service |

---

## Quick Start

### Prerequisites

- Python 3.10+
- A [Gemini API key](https://aistudio.google.com/apikey)

### Local Development

```bash
# Clone and setup
git clone <repo-url>
cd JarvisOR
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run
uvicorn app:app --host 0.0.0.0 --port 8000

# Open http://localhost:8000
```

### Docker

```bash
docker build -t jarvis-or .
docker run -p 8000:8000 jarvis-or
```

### Azure Deployment

```bash
# Option 1: Azure App Service (Python)
az webapp up --name jarvis-or-guardian --resource-group <rg> --runtime "PYTHON:3.11"
az webapp config set --startup-file "startup.sh"

# Option 2: Azure Container Instances
az acr build --registry <acr> --image jarvis-or .
az container create --resource-group <rg> --name jarvis-or \
  --image <acr>.azurecr.io/jarvis-or --ports 8000
```

Set the API key as an environment variable to skip the UI input:

```bash
az webapp config appsettings set --settings GEMINI_API_KEY=<your-key>
```

---

## Project Structure

```
JarvisOR/
├── app.py                    # FastAPI backend (Gemini vision, chat, safety endpoints)
├── static/
│   ├── index.html            # Single-page app (dashboard, camera, vitals, chat)
│   ├── style.css             # Dark medical-grade UI with ROI and alert styles
│   ├── app.js                # Client logic (CameraManager, ROIManager, AlertEngine,
│   │                         #   VitalsTrendBuffer, ChartManager, SimulationMode)
│   └── manifest.json         # PWA manifest
├── or_guardian_live_full.py   # Legacy Streamlit version (preserved for reference)
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Production container image
├── startup.sh                 # Azure App Service startup command
└── README.md
```

---

## Demo Flow

The recommended sequence for a live demo:

1. Open Jarvis on a phone/tablet → enter API key → set patient baseline (HR 72, SpO2 99%, BP 130/80)
2. Start camera → run **Pre-flight Check** → confirm "Camera Ready"
3. Position the **ROI bounding box** over the monitor display
4. Enable **Auto-capture** (3s interval) → Jarvis begins reading vitals
5. Gradually change displayed vitals (simulate progressive hypotension)
6. Watch Jarvis escalate: **NONE → WATCH → CONCERN → CRITICAL**
7. At CRITICAL: full-screen red overlay, voice alert, clinical insight card
8. Clinician says (voice): *"250ml fluid bolus given"* → Jarvis logs event, watches for recovery
9. Vitals recover → Jarvis downgrades to WATCH and notes improvement in trend

**If the live camera fails:** Triple-click the brain logo (or Ctrl+Shift+S) to activate **Simulation Mode** with a pre-recorded MP4.

---

## Known Limitations

Acknowledged transparently for clinical credibility:

- **Not FDA-cleared** — prototype and research context only
- **OCR accuracy** varies with camera angle, monitor brand, screen brightness
- **Waveform interpretation** is directional, not diagnostic-grade
- **3–8 second latency** per Gemini round trip — this is a copilot, not a real-time safety interlock
- The system **augments, never replaces** the clinician's direct observation

---

## Authors

**Dr Bhavna Gupta** — Anaesthesiologist
[LinkedIn](https://www.linkedin.com/in/dr-bhavna-gupta)

**Aayush Gupta**
[LinkedIn](https://www.linkedin.com/in/gaaush/)

Project: Jarvis OR Guardian — AI-Assisted Intraoperative Reasoning
Purpose: Ambient clinical monitoring with multimodal vision, voice, and decision support
