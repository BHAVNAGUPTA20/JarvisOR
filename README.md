# Jarvis OR Guardian

**Multimodal AI Assistant for Anaesthesia & Critical Care**

Jarvis OR Guardian uses a phone or tablet camera pointed at an anesthesia workstation monitor to continuously extract vital signs, interpret waveforms, detect clinical deterioration, and provide real-time decision support to anaesthesiologists — powered by Gemini 2.5 Flash vision.

> **Disclaimer:** This system is designed for educational and clinical decision-support purposes only. It does not replace professional medical judgment or standard clinical monitoring. All patient management decisions must be made by qualified healthcare professionals. The developers assume no responsibility for clinical decisions made using this tool.

---

## The Problem

During surgery, anaesthesiologists monitor 8+ vital parameters simultaneously while managing drugs, airway, fluids, and responding to surgical events. Cognitive overload is real — studies show critical alarms are missed or acknowledged late in **23–30%** of cases, especially during high-workload phases.

Existing solutions require proprietary monitor integrations (HL7, DICOM, vendor SDKs) that are expensive, gated, and incompatible across devices.

## The Solution

**The camera is the interface.** Point any phone at any monitor. Jarvis reads the screen every 3 seconds, extracts structured vitals via Gemini vision, tracks trends over time, and escalates through 4 alert tiers with voice alerts, vibration, and clinical guidance — all without touching the hospital's IT infrastructure.

When the camera isn't available, clinicians can **manually enter vitals** directly into the system. Jarvis auto-calculates derived indicators (MAP, Shock Index) and feeds everything into the same trend analysis and alarm engine.

---

## Features

### Page 1 — Patient Context & Baseline Setup

| # | Section | Key Fields |
|---|---|---|
| 1 | Patient Demographics | Age★, Sex★, Weight, Height, BMI (auto-calculated) |
| 2 | Procedure Information | Surgery name★, Specialty, Elective/Emergency, Duration, Position |
| 3 | Clinical Risk | ASA Physical Status (I–VI), Primary diagnosis, Allergies |
| 4 | Comorbidities | Major comorbidities★ toggle with 12 condition checkboxes |
| 5 | Medication Status | Controlled Y/N, 7 medication categories |
| 6 | Airway & Anesthesia | Technique★ (6 options), Assessment, Difficult airway flag |
| 7 | Monitoring Plan | Standard, Arterial line, CVP, Cardiac output, BIS, Urine output |
| 8 | Baseline Vitals | HR★, SBP★, DBP★, SpO₂★, RR, Temp, EtCO₂ |
| 9 | Trend Settings | Window size★ (short / medium / long) |
| 10 | Optional Context | Pregnancy, NPO hours, Blood group, Blood products, ICU plan, Notes |

A mandatory **disclaimer** is displayed before any patient data entry.

### Page 2 — Intraoperative Monitoring Dashboard

| Feature | Description |
|---|---|
| **Vision Monitor** | Camera-based vital sign extraction via Gemini 2.5 Flash multimodal, with ROI cropping, pre-flight check, and auto-capture (1s–5min intervals) |
| **Manual Vitals Entry** | Collapsible fallback panel for when camera is unavailable — enter core vitals + respiratory/ventilation parameters (FiO₂, tidal volume, peak airway pressure, ventilator mode, minute ventilation) |
| **8 Vital Cards** | HR, SpO₂, NIBP, MAP (auto-calculated), EtCO₂, RR, Temp, **Shock Index** (HR ÷ SBP, auto-calculated) |
| **4 Trend Graphs** | Hemodynamic (HR, MAP, SBP), Respiratory (SpO₂, EtCO₂, RR), Temperature, Fluid Balance & Shock Index — all time-stamped |
| **Fluid Balance Tracking** | Estimated blood loss★, IV fluids★, blood transfusion, urine output — with auto-calculated total loss, total input, and net balance |
| **Drug Administration Log** | 12 drug categories (vasopressors, inotropes, sedatives, muscle relaxants, analgesics, antibiotics, IV fluids/colloids, blood products, local anesthetics, antiemetics, reversal agents, other) with name, dose, route, and timestamp |
| **Surgical Events Timeline** | 24 quick-log buttons organized in 4 categories: Anesthesia Events (induction, intubation, spinal, epidural, regional block, vent change, extubation), Surgical Events (incision, tourniquet on/off, insufflation, major manipulation, clamping, reperfusion), Critical Events (bleeding, hypotension, desaturation, arrhythmia, airway difficulty, cardiac arrest), Infection/Sepsis (temp rise, infection suspected, sepsis event, antibiotics given) — plus custom text input |
| **Alarm & Safety System** | 9 configurable threshold alarms (MAP < 65, SpO₂ < 92%, EtCO₂ < 25 / > 50, HR < 45 / > 130, Shock Index > 0.9, Temp > 38.5°C / < 35°C) with real-time alarm badges and safety bar |
| **4-Tier Alert Engine** | NONE → WATCH → CONCERN → CRITICAL with audio tones, vibration, voice alerts, and full-screen red overlay |
| **Clinical Insight Cards** | Structured 7-section cards: vitals, waveforms, trend interpretation, differentials, checks, actions, alarms |
| **Postoperative Risk Prediction** | AI-estimated risk scores for postoperative hypotension, ICU admission, sepsis, and acute kidney injury — based on patient baseline, intraoperative trends, fluid balance, and surgical events |
| **Copilot Chat** | Streaming AI chat fused with full patient context, vitals, baseline, fluid balance, drug log, surgical events, and active alarms |
| **Voice I/O** | Web Speech API for voice input + browser TTS for critical voice alerts |
| **Simulation Mode** | Hidden MP4 fallback for demo reliability (triple-click logo or Ctrl+Shift+S) |
| **PWA Support** | Installable on any device via manifest, works on phones and tablets |

### Derived Physiological Indicators

Jarvis automatically calculates:

| Indicator | Formula | Clinical Use |
|---|---|---|
| **Mean Arterial Pressure (MAP)** | DBP + (SBP − DBP) / 3 | Organ perfusion monitoring |
| **Shock Index** | HR ÷ SBP | Early detection of shock / hypovolemia (> 0.9 = concern) |

### Alert Levels

| Level | Trigger | UI Response |
|---|---|---|
| **NONE** | All vitals within baseline range | Green banner, quiet |
| **WATCH** | Single mild deviation | Yellow banner, soft tone |
| **CONCERN** | Two deviations or waveform change | Orange pulsing banner, distinct tone + vibration |
| **CRITICAL** | SpO2 <90, HR >130/<40, severe hypotension, EtCO2 loss, Shock Index >0.9 | Full-screen red overlay, persistent alarm, voice alert, strong vibration |

### Configurable Safety Alarms

| Parameter | Default Threshold |
|---|---|
| MAP | < 65 mmHg |
| SpO₂ | < 92% |
| EtCO₂ | < 25 or > 50 mmHg |
| HR | < 45 or > 130 bpm |
| Shock Index | > 0.9 |
| Temperature | > 38.5°C or < 35°C |

---

## Architecture

```
Camera / MP4 / Manual Entry
       │
       ▼
  ┌──────────────┐    ROI Crop    ┌──────────────┐
  │  Browser      │──────────────▶│  FastAPI      │
  │  getUserMedia │   base64 JPEG │  Backend      │
  │  + ROI Box    │               │               │
  │  + Manual     │               └───────┬──────┘
  └──────────────┘               ┌───────▼──────┐
       ▲                         │  Gemini 2.5   │
       │                         │  Flash Vision │
  ┌──────────────┐               └───────┬──────┘
  │  Dashboard    │◀─────────────────────┘
  │  ┌──────────┐│  Structured JSON
  │  │Alert     ││
  │  │Engine    ││  4 Trend Charts
  │  ├──────────┤│  (Hemo, Resp, Temp, Fluid+SI)
  │  │Trend Buf ││
  │  ├──────────┤│  Fluid Balance + Drug Log
  │  │Fluid Bal ││
  │  ├──────────┤│  Alarm System
  │  │Drug Log  ││
  │  ├──────────┤│  Postop Risk
  │  │Postop    ││
  │  │Risk Pred ││
  │  └──────────┘│
  └──────────────┘
```

### What Jarvis Combines for Clinical Reasoning

```
Patient baseline (Page 1)
  + Real-time vitals (camera or manual)
  + Vital trends over time (4 graphs)
  + Surgical events (24 quick-log buttons + custom)
  + Drug administration log
  + Fluid balance (EBL, IVF, blood, urine)
  + Active alarm states
  = Clinical reasoning + Postoperative risk prediction
```

### Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + Uvicorn |
| AI Vision | Google Gemini 2.5 Flash (multimodal) |
| Frontend | Vanilla HTML / CSS / JS (no build step) |
| Camera | `MediaDevices.getUserMedia()` with ROI crop |
| Charts | Chart.js 4.x (CDN) — 4 separate trend graphs |
| Alerts | Web Audio API + Vibration API + Web Speech API |
| Deployment | Docker → Google Cloud Run |

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

### Google Cloud Run Deployment

```bash
# Authenticate and set project
gcloud auth login
gcloud config set project <your-project-id>

# Deploy directly from source (builds and deploys in one step)
gcloud run deploy jarvis-or \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=<your-key>
```

Or deploy via a pre-built container image:

```bash
# Build and push to Artifact Registry
gcloud builds submit --tag gcr.io/<your-project-id>/jarvis-or

# Deploy to Cloud Run
gcloud run deploy jarvis-or \
  --image gcr.io/<your-project-id>/jarvis-or \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=<your-key>
```

---

## Project Structure

```
JarvisOR/
├── app.py                    # FastAPI backend (Gemini vision, chat, safety endpoints)
├── static/
│   ├── index.html            # Single-page app (disclaimer, 10-section patient intake,
│   │                         #   intraoperative monitoring dashboard with manual entry,
│   │                         #   4 trend charts, fluid balance, drug log, alarm system,
│   │                         #   surgical events timeline, postop risk, chat)
│   ├── style.css             # Dark medical-grade UI (alarm badges, quick-event buttons,
│   │                         #   fluid summary cards, drug log, postop risk bars,
│   │                         #   collapsible panels, responsive)
│   ├── app.js                # Client logic (CameraManager, ROIManager, AlertEngine,
│   │                         #   VitalsTrendBuffer, MultiChartManager, ManualEntry,
│   │                         #   FluidBalance, DrugLog, AlarmSystem, PostopRisk,
│   │                         #   SimulationMode, BMI calc, derived vitals)
│   └── manifest.json         # PWA manifest
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Production container image (Cloud Run compatible)
└── README.md
```

---

## Demo Flow

The recommended sequence for a live demo:

1. Open Jarvis → **Disclaimer modal** appears → click "I Understand — Continue"
2. Enter Gemini API key
3. **Patient setup** → fill demographics (65yo Male), procedure (total hip replacement), ASA III, comorbidities (HTN + DM), spinal anesthesia, baseline vitals (HR 72, BP 130/80, SpO₂ 99%)
4. Click **Start Monitoring** → dashboard opens with full patient context loaded
5. Start camera → run **Pre-flight Check** → confirm "Camera Ready"
6. Position the **ROI bounding box** over the monitor display
7. Enable **Auto-capture** (3s interval) → Jarvis begins reading vitals
8. **Or** expand "Manual Vitals Entry" → type in vitals → submit → watch all 4 trend graphs update
9. Log surgical events using **quick-log buttons** ("★ Induction", "★ Incision", etc.)
10. Log drugs using the **Drug Administration panel** ("Propofol 200mg IV")
11. Track fluid balance — update **Estimated Blood Loss** and **IV Fluids**
12. Watch Jarvis escalate: **NONE → WATCH → CONCERN → CRITICAL**
13. At CRITICAL: full-screen red overlay, voice alert, safety alarm badges, clinical insight card with differentials
14. Click **Calculate Risk** in the Postop Risk panel → see predicted risks
15. Clinician says (voice): *"250ml fluid bolus given"* → Jarvis logs event, watches for recovery
16. Vitals recover → trend reversal detected → alert downgrades

**If the live camera fails:** Triple-click the brain logo (or Ctrl+Shift+S) to activate **Simulation Mode** with a pre-recorded MP4.

---

## Known Limitations

Acknowledged transparently for clinical credibility:

- **Not FDA-cleared** — prototype and research context only
- **OCR accuracy** varies with camera angle, monitor brand, screen brightness
- **Waveform interpretation** is directional, not diagnostic-grade
- **3–8 second latency** per Gemini round trip — this is a copilot, not a real-time safety interlock
- **Postop risk scores** are heuristic estimates, not validated predictive models
- The system **augments, never replaces** the clinician's direct observation

---

## Authors

**Dr Bhavna Gupta** — Anaesthesiologist
[LinkedIn](https://www.linkedin.com/in/dr-bhavna-gupta)

**Aayush Gupta**
[LinkedIn](https://www.linkedin.com/in/gaaush/)

Project: Jarvis OR Guardian — AI-Assisted Intraoperative Reasoning
Purpose: Ambient clinical monitoring with multimodal vision, voice, and decision support
