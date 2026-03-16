# Jarvis OR Guardian

**Multimodal AI Clinical Monitoring & Decision Support**

Jarvis OR Guardian uses a phone or tablet camera pointed at any patient monitor to continuously extract vital signs, interpret waveforms, detect clinical deterioration, and provide real-time decision support to clinicians across operating rooms, ICUs, emergency departments, PACUs, and beyond — powered by Gemini 2.5 Flash vision.

> **Disclaimer:** This system is designed for educational and clinical decision-support purposes only. It does not replace professional medical judgment or standard clinical monitoring. All patient management decisions must be made by qualified healthcare professionals. The developers assume no responsibility for clinical decisions made using this tool.

---

## The Problem

Across every monitored clinical setting — operating rooms, ICUs, emergency departments, PACUs, labor suites, procedural sedation units, and transport environments — clinicians face the same core challenge: cognitive overload. An anaesthesiologist during surgery, an intensivist managing a ventilated patient, or an ED physician running a trauma resuscitation must all track 8+ vital parameters simultaneously while managing drugs, airway, fluids, and responding to rapidly evolving clinical events. Studies show critical alarms are missed or acknowledged late in **23–30%** of cases, especially during high-workload phases — and this problem spans every setting where patients are continuously monitored.

Existing solutions require proprietary monitor integrations (HL7, DICOM, vendor SDKs) that are expensive, gated, and incompatible across devices — locking out low-resource facilities, field hospitals, and transport teams entirely.

## The Solution

**The camera is the interface.** Point any phone at any patient monitor — in an OR, ICU bed, ED bay, PACU slot, L&D suite, or field tent. Jarvis reads the screen every 3 seconds, extracts structured vitals via Gemini vision, tracks trends over time, and escalates through 4 alert tiers with voice alerts, vibration, and clinical guidance — all without touching the hospital's IT infrastructure.

When the camera isn't available, clinicians can **manually enter vitals** directly into the system. Jarvis auto-calculates derived indicators (MAP, Shock Index) and feeds everything into the same trend analysis and alarm engine.

The system adapts to the clinical context: select your setting (OR, ICU, ED, PACU, L&D, Procedural Sedation, Transport, or Other) and Jarvis tailors its event categories, risk models, and clinical reasoning accordingly.

---

## Use Cases

| Clinical Setting | Description |
|---|---|
| **Operating Room** | Intraoperative anesthesia monitoring — track vitals, surgical events, fluid balance, and drug administration during surgery |
| **ICU / Critical Care** | Continuous monitoring of ventilated and hemodynamically unstable patients, ICP tracking, sedation management, and early deterioration detection |
| **Emergency Department** | Trauma resuscitation monitoring, rapid assessment support, and real-time trend tracking in high-acuity ED bays |
| **PACU / Recovery** | Post-anesthesia recovery monitoring with sedation weaning, emergence tracking, and discharge-readiness scoring |
| **Labor & Delivery** | Maternal vital sign monitoring during labor, cesarean sections, and postpartum recovery |
| **Procedural Sedation** | Monitoring during endoscopy, cardiac catheterization, interventional radiology, and other procedures requiring sedation |
| **Transport / Transfer** | Portable monitoring during intra- and inter-hospital patient transfers, ambulance transport, and aeromedical evacuation |
| **Field / Military Medicine** | Austere-environment monitoring for combat casualty care, disaster response, and remote field hospitals where integration with fixed infrastructure is impossible |
| **Medical Education & Simulation** | Training tool for residents, fellows, and nursing students — simulate clinical deterioration scenarios and practice recognition and response |

---

## Features

### Page 1 — Patient Context & Baseline Setup

| # | Section | Key Fields |
|---|---|---|
| 1 | Patient Demographics | Patient ID, Age★, Sex★, Weight, Height, BMI (auto-calculated) |
| 2 | Clinical Setting & Procedure | **Clinical Setting★** (Operating Room, ICU, ED, PACU, L&D, Procedural Sedation, Transport, Other), Surgery/Procedure name★, Specialty, Elective/Emergency, Duration, Position |
| 3 | Clinical Risk | ASA Physical Status (I–VI), Primary diagnosis, Allergies |
| 4 | Comorbidities | Major comorbidities★ toggle with 12 condition checkboxes |
| 5 | Medication Status | Controlled Y/N, 7 medication categories |
| 6 | Airway & Sedation / Anesthesia | Comprehensive multi-category selection: **Neuraxial** (Spinal, Epidural, CSE, Segmental spinal, Continuous spinal, Caudal), **Peripheral Regional** — Upper limb (Interscalene, Supraclavicular, Infraclavicular, Axillary), Lower limb (Femoral, Sciatic, Popliteal, Adductor canal), Truncal/Fascial (TAP, Rectus sheath, Paravertebral, Erector spinae, Quadratus lumborum), Local (Infiltration, Field block), **General** (ETT, LMA, TIVA, Balanced), **Sedation/MAC** (Minimal, Moderate, Deep), **Combined**, Airway assessment, Difficult airway flag |
| 7 | Monitoring Plan | Standard, Arterial line, CVP, Cardiac output, BIS, Urine output, **ICP monitoring**, **Continuous EEG** |
| 8 | Baseline Vitals | HR★, SBP★, DBP★, SpO₂★, RR, Temp, EtCO₂ |
| 9 | Trend Settings | Window size★ (short / medium / long) |
| 10 | Optional Context | Pregnancy, NPO hours, Blood group, Blood products, ICU plan, Notes |

A mandatory **disclaimer** is displayed before any patient data entry.

### Page 2 — Clinical Monitoring Dashboard

| Feature | Description |
|---|---|
| **Vision Monitor** | Camera-based vital sign extraction via Gemini 2.5 Flash multimodal, with ROI cropping, pre-flight check, and auto-capture (1s–5min intervals) |
| **Manual Vitals Entry** | Collapsible fallback panel for when camera is unavailable — enter core vitals + respiratory/ventilation parameters (FiO₂, tidal volume, peak airway pressure, ventilator mode, minute ventilation) |
| **8 Vital Cards** | HR, SpO₂, NIBP, MAP (auto-calculated), EtCO₂, RR, Temp, **Shock Index** (HR ÷ SBP, auto-calculated) |
| **4 Trend Graphs** | Hemodynamic (HR, MAP, SBP), Respiratory (SpO₂, EtCO₂, RR), Temperature, Fluid Balance & Shock Index — all time-stamped |
| **Fluid Balance Tracking** | Estimated blood loss★, IV fluids★, blood transfusion, urine output — with auto-calculated total loss, total input, and net balance |
| **Drug Administration Log** | 12 drug categories (vasopressors, inotropes, sedatives, muscle relaxants, analgesics, antibiotics, IV fluids/colloids, blood products, local anesthetics, antiemetics, reversal agents, other) with name, dose, route, and timestamp |
| **Clinical Events Timeline** | Quick-log buttons organized across multiple categories: **Airway / Anesthesia / Sedation** (Induction, Intubation, Spinal, Epidural, Regional Block, Vent Change, Extubation, Sedation Start, Weaning Trial), **Surgical / Procedural Events** (Incision, Tourniquet On/Off, Insufflation, Major Manipulation, Clamping, Reperfusion, Procedure Start, Procedure End), **ICU / ED / PACU Events** (Admission, Transfer, Discharge, Position Change, Line Inserted, Line Removed, Handover, Code Blue), **Critical Events** (Bleeding, Hypotension, Desaturation, Arrhythmia, Airway Difficulty, Cardiac Arrest, Seizure, Respiratory Failure), **Infection / Sepsis** (Temp Rise, Infection Suspected, Sepsis Event, Antibiotics Given, Cultures Sent) — plus custom text input |
| **Alarm & Safety System** | 9 configurable threshold alarms (MAP < 65, SpO₂ < 92%, EtCO₂ < 25 / > 50, HR < 45 / > 130, Shock Index > 0.9, Temp > 38.5°C / < 35°C) with real-time alarm badges and safety bar |
| **4-Tier Alert Engine** | NONE → WATCH → CONCERN → CRITICAL with audio tones, vibration, voice alerts, and full-screen red overlay |
| **Clinical Insight Cards** | Structured 7-section cards: vitals, waveforms, trend interpretation, differentials, checks, actions, alarms |
| **Clinical Risk Prediction** | AI-estimated risk scores for hypotension, ICU admission, sepsis, and acute kidney injury — based on patient baseline, clinical trends, fluid balance, and events across the monitoring session |
| **Copilot Chat** | Streaming AI chat fused with full patient context, vitals, baseline, fluid balance, drug log, clinical events, and active alarms |
| **PDF Export** | One-click clinical monitoring report export — patient demographics, vitals history table, fluid balance, drug log, events timeline, alarms, and clinical insight — generated client-side via jsPDF |
| **Voice I/O** | Gemini Live API native audio (WebSocket) for real-time bidirectional voice conversation with Jarvis; Gemini Live TTS for spoken responses; browser TTS fallback for critical voice alerts |
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
  │  Clinical     │◀─────────────────────┘
  │  Dashboard    │  Structured JSON
  │  ┌──────────┐│
  │  │Alert     ││
  │  │Engine    ││  4 Trend Charts
  │  ├──────────┤│  (Hemo, Resp, Temp, Fluid+SI)
  │  │Trend Buf ││
  │  ├──────────┤│  Fluid Balance + Drug Log
  │  │Fluid Bal ││
  │  ├──────────┤│  Clinical Events Timeline
  │  │Drug Log  ││
  │  ├──────────┤│  Alarm System
  │  │Clinical  ││
  │  │Risk Pred ││  Clinical Risk Prediction
  │  ├──────────┤│
  │  │PDF Export││  Clinical Monitoring Report
  │  └──────────┘│
  └──────────────┘
       │                    ┌───────────────────────┐
       │  WebSocket         │  Gemini Live API       │
       └───────────────────▶│  Native Audio I/O      │
                            │  (Bidirectional voice) │
                            └───────────────────────┘
```

### What Jarvis Combines for Clinical Reasoning

```
Patient baseline (Page 1) + Clinical setting
  + Real-time vitals (camera or manual)
  + Vital trends over time (4 graphs)
  + Clinical events (quick-log buttons + custom)
  + Drug administration log
  + Fluid balance (EBL, IVF, blood, urine)
  + Active alarm states
  + Voice conversation (Gemini Live)
  = Clinical reasoning + Clinical risk prediction + PDF report
```

### Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + Uvicorn |
| AI Vision | Google Gemini 2.5 Flash (multimodal) |
| Frontend | Vanilla HTML / CSS / JS (no build step) |
| Camera | `MediaDevices.getUserMedia()` with ROI crop |
| Charts | Chart.js 4.x (CDN) — 4 separate trend graphs |
| PDF Export | jsPDF (CDN) — client-side clinical report generation |
| Voice I/O | Gemini Live API (native audio WebSocket) + browser TTS fallback |
| Alerts | Web Audio API + Vibration API + Gemini Live TTS |
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

## Reproducible Testing

### Option A: Use the Live Deployment (Fastest)

The app is deployed and ready to test — no setup required:

**https://jarvis-or-995915388976.us-central1.run.app/**

1. Open the link in Chrome (desktop or mobile)
2. Click **"I Understand — Continue"** on the disclaimer
3. Enter your Gemini API key (get one free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey))
4. Continue to the testing scenarios below

### Option B: Run Locally

```bash
git clone https://github.com/gaaush/JarvisOR.git
cd JarvisOR
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000** in Chrome.

### Option C: Run with Docker

```bash
docker build -t jarvis-or .
docker run -p 8080:8080 jarvis-or
```

Open **http://localhost:8080** in Chrome.

### Prerequisites for All Options

- A **Gemini API key** — free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **Chrome browser** recommended (for camera, Web Audio, and Gemini Live voice support)
- For camera testing: a phone/tablet camera or a monitor screenshot image

---

### Test Scenario 1: Manual Vitals Entry + Trend Analysis + Alarms (No Camera Needed)

This scenario tests the core clinical monitoring pipeline without requiring a camera or patient monitor.

**Setup (Patient Intake — ~1 min):**

1. Accept the disclaimer → enter your Gemini API key
2. Fill in patient demographics:
   - Age: **65**, Sex: **Male**
3. Clinical Setting: **Operating Room**
4. Procedure: **Total hip replacement**
5. Comorbidities: toggle **Yes** → check **Hypertension** and **Diabetes Mellitus**
6. Anesthesia Technique: check **Spinal anesthesia**
7. Baseline vitals: HR **72**, SBP **130**, DBP **80**, SpO₂ **99**
8. Click **Start Monitoring**

**Verify:** The dashboard opens with 8 vital cards showing `--`, 4 empty trend graphs, and the alert banner hidden.

**Round 1 — Normal vitals:**

1. Expand **"✏️ Manual Vitals Entry"** (click the header to expand)
2. Enter: HR **74**, SBP **128**, DBP **78**, SpO₂ **99**, EtCO₂ **35**, RR **14**
3. Click **Submit Vitals Reading**

**Verify:** All 8 vital cards update. MAP auto-calculates to ~95. Shock Index shows ~0.58. All 4 trend graphs show the first data point. Alert level stays NONE (green).

**Round 2 — Mild deterioration (submit 2–3 more readings, progressively worse):**

- HR **88**, SBP **105**, DBP **65**, SpO₂ **96**, EtCO₂ **33**, RR **18**
- HR **102**, SBP **92**, DBP **58**, SpO₂ **94**, EtCO₂ **30**, RR **20**

**Verify:** Trend graphs show declining MAP / rising HR. Shock Index rises above 0.9 → safety alarm badge appears in the top bar ("Shock Index > 0.9"). Alert level escalates to WATCH or CONCERN.

**Round 3 — Critical values:**

- HR **135**, SBP **78**, DBP **48**, SpO₂ **89**, EtCO₂ **24**, RR **26**

**Verify:** Full-screen **red CRITICAL overlay** appears with voice alert. Safety alarms fire for MAP < 65, SpO₂ < 92, HR > 130, EtCO₂ < 25, and Shock Index > 0.9. Acknowledge the overlay. A Clinical Insight Card appears with trend interpretation, differentials, and suggested actions.

---

### Test Scenario 2: Fluid Balance, Drug Log, and Clinical Events

Continuing from Scenario 1 (or start a new session):

**Fluid Balance:**

1. In the **💧 Fluid Balance** panel, set Est. Blood Loss to **800** → click Update
2. Set IV Fluids to **1500** → click Update
3. Set Urine Output to **200** → click Update

**Verify:** Summary cards show Total Loss (1000 ml), Total Input (1500 ml), Net Balance (+500 ml). The Fluid Balance & Shock Index trend graph updates.

**Drug Administration:**

1. In the **💊 Drug Administration Log** panel, select Category: **Analgesic**, name: **Fentanyl**, dose: **100mcg**, route: **IV** → click **Log Drug**
2. Log another: Category: **Vasopressor**, name: **Phenylephrine**, dose: **100mcg**, route: **IV**

**Verify:** Both drugs appear in the timestamped drug log.

**Clinical Events:**

1. Click quick-log buttons: **★ Induction** → **★ Intubation** → **★ Incision** → **★ Bleeding**
2. Type a custom event: "250ml crystalloid bolus given" → click **Log**

**Verify:** All events appear in reverse-chronological order in the timeline. Critical events (Bleeding) show in red.

---

### Test Scenario 3: AI Copilot Chat

1. In the **💬 Copilot Chat** panel, type: *"The patient's blood pressure has been falling over the last 10 minutes. Estimated blood loss is 800ml. What should I do?"*
2. Click **Send**

**Verify:** Jarvis responds with a streaming clinical answer that references the patient context, vitals, fluid balance, and logged events. The response includes actionable clinical guidance.

---

### Test Scenario 4: Clinical Risk Prediction

1. After entering several vitals readings and clinical events, scroll to the **📊 Clinical Risk Prediction** panel
2. Click **Calculate Risk**

**Verify:** Jarvis returns risk estimates (e.g., Hypotension risk, ICU Admission risk, Sepsis risk, AKI risk) displayed as colored progress bars with LOW / MODERATE / HIGH / CRITICAL labels.

---

### Test Scenario 5: Camera Vision (Requires a Patient Monitor or Screenshot)

If you have access to a patient monitor image:

1. On the dashboard, click **📷 Start Camera** (or use **"Or upload a monitor screenshot"** to upload an image)
2. Click **🔍 Pre-flight** to run a camera readability check

**Verify:** Gemini analyzes the image and reports which parameters are readable and any quality issues.

3. Click **📸 Capture** (or enable **Auto-capture** at 3s intervals)

**Verify:** Jarvis extracts vital signs from the monitor image, populates all 8 vital cards, updates trend graphs, and generates a Clinical Insight Card with trend interpretation.

**No patient monitor?** Use **Simulation Mode** — press **Ctrl+Shift+S** (or triple-click the 🫀 logo) to load a pre-recorded video.

---

### Test Scenario 6: PDF Clinical Report Export

After running any of the above scenarios:

1. Click the **📄 Export PDF** button in the header

**Verify:** A PDF downloads with the filename `JarvisOR_Report_<PatientID>_<Age><Sex>_<timestamp>.pdf`. The report includes patient demographics, baseline vitals, current vitals, vitals history table, fluid balance, drug log, clinical events timeline, active alarms, and clinical insight.

---

### Test Scenario 7: Gemini Live Voice (Chrome Required)

1. Click the **🎤** microphone button in the chat panel
2. Allow microphone access when prompted
3. Speak a clinical question, e.g., *"What's happening with the patient's blood pressure?"*

**Verify:** Jarvis responds with natural audio through the Gemini Live API. The conversation is displayed in the chat panel as transcribed text.

4. Click 🎤 again to end the voice session

---

### Verify the Health Endpoint

```bash
curl https://jarvis-or-995915388976.us-central1.run.app/health
# Expected: {"status":"ok","service":"Jarvis OR Guardian"}
```

Or for a local instance:

```bash
curl http://localhost:8000/health
# Expected: {"status":"ok","service":"Jarvis OR Guardian"}
```

---

## Project Structure

```
JarvisOR/
├── app.py                    # FastAPI backend (Gemini vision, chat, safety endpoints)
├── static/
│   ├── index.html            # Single-page app (disclaimer, 10-section patient intake,
│   │                         #   clinical monitoring dashboard with manual entry,
│   │                         #   4 trend charts, fluid balance, drug log, alarm system,
│   │                         #   clinical events timeline, clinical risk, chat)
│   ├── style.css             # Dark medical-grade UI (alarm badges, quick-event buttons,
│   │                         #   fluid summary cards, drug log, clinical risk bars,
│   │                         #   collapsible panels, responsive)
│   ├── app.js                # Client logic (CameraManager, ROIManager, AlertEngine,
│   │                         #   VitalsTrendBuffer, MultiChartManager, GeminiLiveSession,
│   │                         #   ManualEntry, FluidBalance, DrugLog, AlarmSystem,
│   │                         #   ClinicalRisk, PDF Export, SimulationMode,
│   │                         #   BMI calc, derived vitals)
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
3. **Patient setup** → fill demographics (65yo Male), select **Clinical Setting** (e.g. Operating Room), procedure (total hip replacement), ASA III, comorbidities (HTN + DM), spinal anesthesia, baseline vitals (HR 72, BP 130/80, SpO₂ 99%)
4. Click **Start Monitoring** → dashboard opens with full patient context loaded
5. Start camera → run **Pre-flight Check** → confirm "Camera Ready"
6. Position the **ROI bounding box** over the monitor display
7. Enable **Auto-capture** (3s interval) → Jarvis begins reading vitals
8. **Or** expand "Manual Vitals Entry" → type in vitals → submit → watch all 4 trend graphs update
9. Log clinical events using **quick-log buttons** ("★ Induction", "★ Incision", "★ Line Inserted", etc.)
10. Log drugs using the **Drug Administration panel** ("Propofol 200mg IV")
11. Track fluid balance — update **Estimated Blood Loss** and **IV Fluids**
12. Watch Jarvis escalate: **NONE → WATCH → CONCERN → CRITICAL**
13. At CRITICAL: full-screen red overlay, voice alert, safety alarm badges, clinical insight card with differentials
14. Click **Calculate Risk** in the Clinical Risk panel → see predicted risks
15. Click 🎤 to start a **Gemini Live voice session** — speak naturally to Jarvis in real-time
16. Clinician says (voice): *"250ml fluid bolus given"* → Jarvis responds with native audio
17. Vitals recover → trend reversal detected → alert downgrades
18. Click **📄 Export PDF** → download a complete clinical monitoring report

**If the live camera fails:** Triple-click the heart logo (or Ctrl+Shift+S) to activate **Simulation Mode** with a pre-recorded MP4.

---

## Known Limitations

Acknowledged transparently for clinical credibility:

- **Not FDA-cleared** — prototype and research context only
- **OCR accuracy** varies with camera angle, monitor brand, screen brightness
- **Waveform interpretation** is directional, not diagnostic-grade
- **3–8 second latency** per Gemini round trip — this is a copilot, not a real-time safety interlock
- **Clinical risk scores** are heuristic estimates, not validated predictive models
- The system **augments, never replaces** the clinician's direct observation

---

## Authors

**Dr Bhavna Gupta** — Consultant Anaesthesiologist & Intensivist
[LinkedIn](https://www.linkedin.com/in/dr-bhavna-gupta)

**Aayush Gupta** - Staff Data Scientist
[LinkedIn](https://www.linkedin.com/in/gaaush/)

Project: Jarvis OR Guardian — AI-Assisted Clinical Reasoning
Purpose: Ambient clinical monitoring with multimodal vision, voice, and decision support across all monitored clinical settings
