## Inspiration

Every clinician managing a monitored patient faces the same impossible task: simultaneously tracking 8+ vital parameters, interpreting trends, managing drugs and fluids, and responding to rapidly evolving clinical events — often for hours, often across multiple patients.

The numbers are alarming. **23–30%** of critical monitor alarms are missed or acknowledged late during high-workload phases. Alarm fatigue causes clinicians to ignore **85–99%** of monitor alarms in ICU and OR settings. ICU nurses manage 3–4 patients simultaneously, each generating 150+ data points per hour. PACU nurses miss early respiratory depression in 1 in 5 postoperative patients within the first hour.

And the existing solutions don't help. Proprietary monitor integrations (HL7, DICOM, vendor SDKs) cost \$50K–\$250K per system, require 6–18 months of IT deployment, and don't work across monitor brands. Low-resource facilities, field hospitals, and transport teams are locked out entirely.

We asked a simple question: **every monitor in every hospital displays the same thing — numbers on a screen and waveforms on a trace. Why can't AI just read the screen like a human does?**

That insight — that the camera is the universal medical device interface — became the foundation of Jarvis OR Guardian.

## What it does

**Jarvis OR Guardian** is a multimodal AI copilot that watches the patient monitor so clinicians can watch the patient — across operating rooms, ICUs, emergency departments, PACUs, labor & delivery suites, procedural sedation areas, and transport environments.

Point any phone or tablet camera at any patient monitor. Select your clinical setting. Jarvis becomes your ambient clinical copilot.

**Every 1–5 seconds, Jarvis:**

1. **Captures** a frame from the camera (or accepts manual vitals entry as fallback)
2. **Extracts** all visible vital signs via Gemini 2.5 Flash multimodal vision
3. **Calculates** derived indicators — MAP (mean arterial pressure) and Shock Index (HR ÷ SBP)
4. **Compares** against the patient's baseline and 9 configurable alarm thresholds
5. **Tracks** trends across 4 dedicated graphs — Hemodynamic, Respiratory, Temperature, and Fluid Balance & Shock Index
6. **Monitors** fluid balance (blood loss, IV fluids, transfusions, urine output) and drug administration
7. **Alerts** through 4 severity tiers (NONE → WATCH → CONCERN → CRITICAL) with voice alerts, vibration, and visual overlay
8. **Guides** with differential diagnosis, immediate checks, and suggested actions
9. **Predicts** clinical risks — hypotension, ICU admission, sepsis, acute kidney injury
10. **Exports** a complete clinical monitoring report as a one-click PDF

Clinicians can also speak naturally to Jarvis through **Gemini Live bidirectional voice** — reporting events, asking clinical questions, and receiving spoken responses in real time, all fused with the full patient context.

### What sets Jarvis apart from a simple threshold alarm

- Jarvis considers **baseline-relative** deviations (HR 110 is normal for one patient, alarming for another)
- Jarvis tracks **trends** (a slowly declining MAP over 8 minutes is more concerning than a transient dip)
- Jarvis calculates **Shock Index** — detecting early shock before overt hypotension
- Jarvis fuses **clinical context** ("spinal anesthesia placed" explains a BP drop; blood loss logged explains rising heart rate)
- Jarvis provides **differential diagnosis and action steps**, not just a beep

## How we built it

### The core insight: camera as sensor

We realized that instead of fighting proprietary monitor APIs, we could use the phone camera as a universal sensor. A single JPEG frame sent to Gemini 2.5 Flash can OCR vital sign numbers, interpret ECG morphology, read SpO₂ pleth quality, detect alarm states on the monitor, and reason about clinical meaning — all in one inference call.

### Architecture

The system is deliberately simple:

| Layer | Technology | Why |
|---|---|---|
| **AI Vision & Reasoning** | Gemini 2.5 Flash (multimodal) | Best-in-class vision OCR with structured JSON output, ~3s latency |
| **Backend** | FastAPI + Uvicorn | Async Python, 4 endpoints, completely stateless |
| **Frontend** | Vanilla HTML / CSS / JS | Zero build step, no npm, no framework — just a single-page clinical dashboard |
| **Camera** | `getUserMedia` API | Native browser, rear camera, no SDK |
| **Voice I/O** | Gemini Live API | Real-time bidirectional native audio via WebSocket |
| **Charts** | Chart.js (4 graphs) | Hemodynamic, Respiratory, Temperature, Fluid/Shock Index trends |
| **PDF Export** | jsPDF (client-side) | One-click clinical monitoring report, no server round-trip |
| **Deployment** | Docker → Google Cloud Run | Single container, auto-scaling, health endpoint |

The entire codebase is **~5,100 lines across 4 core files**. No external AI SDKs beyond `google-genai`. The backend is stateless — all clinical state lives in the browser, making deployment trivial and eliminating the need for a database.

### Key technical decisions

- **ROI bounding box**: The clinician drags a box over the monitor region on their phone screen. We crop to that region before sending to Gemini — better OCR accuracy, lower token cost, less visual noise.
- **Structured JSON prompts**: We engineered Gemini prompts to return machine-parseable JSON, not narrative text. This lets us pipe extracted vitals directly into trend buffers, alarm engines, and chart updates.
- **Manual entry fallback**: When the camera isn't available (bad angle, ICU rounds, transport), clinicians can type vitals directly. The same trend analysis, alarm detection, and clinical reasoning pipeline processes manual data identically.
- **Client-side state**: All vitals history, trend data, fluid balance, drug logs, and clinical events live in the browser. This means the backend is fully stateless — no database, no session management, trivially deployable to Cloud Run.
- **4-tier alert engine**: We don't just threshold-alarm. The alert engine considers baseline deviation percentages, multi-parameter correlation (HR up + MAP down = more alarming than either alone), and trend trajectory to escalate through NONE → WATCH → CONCERN → CRITICAL.
- **Setting-adaptive reasoning**: Selecting "ICU" vs "OR" vs "ED" changes event button categories, risk model parameters, and the clinical reasoning context sent to Gemini. A ventilated ICU patient gets different clinical guidance than a post-spinal anesthesia OR patient.

### The clinical monitoring dashboard

The dashboard packs a complete clinical monitoring system into a single screen:

- **8 vital cards** with color-coded status (HR, SpO₂, NIBP, MAP, EtCO₂, RR, Temp, Shock Index)
- **4 time-series trend graphs** (Hemodynamic, Respiratory, Temperature, Fluid Balance & Shock Index)
- **Fluid balance tracker** with auto-calculated net balance
- **Drug administration log** across 12 categories with timestamps
- **Clinical events timeline** with setting-adaptive quick-log buttons (50+ event types)
- **9 configurable safety alarm thresholds** with visual alarm badges
- **Clinical insight cards** with 7-section structured reasoning (trend interpretation, physiology, differentials, checks, actions)
- **Clinical risk prediction** bars (Hypotension, ICU Admission, Sepsis, AKI)
- **AI copilot chat** with streaming responses fused with full patient context
- **Gemini Live voice** for hands-free bidirectional conversation
- **One-click PDF export** of the complete clinical monitoring session

### Patient intake

Before monitoring begins, clinicians fill a structured intake form covering patient demographics, clinical setting selection, procedure details, ASA physical status, comorbidities (12 condition checkboxes), medication status (7 categories), comprehensive anesthesia technique selection (30+ options across Neuraxial, Peripheral Regional, General, Sedation/MAC, and Combined categories), monitoring plan, and baseline vitals. All of this context feeds into every subsequent Gemini analysis and clinical reasoning call.

## Challenges we ran into

### 1. OCR accuracy across monitor brands

Different monitors (Philips, GE, Dräger, Mindray) display vitals in wildly different layouts, fonts, colors, and screen arrangements. Early testing showed Gemini sometimes misread values when the image included too much visual noise — alarm banners, waveform traces, and adjacent bed information.

**Solution:** The ROI bounding box lets clinicians crop to just the vital sign region. We also added a **pre-flight camera check** — before monitoring begins, Gemini analyzes the frame and reports which parameters it can and can't read, along with quality issues (glare, blur, angle). This sets expectations upfront and lets the clinician reposition.

### 2. Structured output reliability

Gemini occasionally returned values wrapped in markdown code fences, or added narrative text around the JSON. This broke our parsing pipeline.

**Solution:** We built a robust `parse_gemini_json` function that strips markdown fences and extracts clean JSON, plus prompt engineering that explicitly requests "raw JSON, no markdown fences." The combination brought parsing reliability to near 100%.

### 3. Latency vs. safety

Each Gemini vision round trip takes 3–8 seconds. For a clinical safety system, that's an eternity. We needed to make clear that Jarvis is a **copilot, not a real-time safety interlock**.

**Solution:** We implemented client-side threshold alarms that fire instantly (no API call needed) when vitals cross safety boundaries. The Gemini analysis provides the higher-order clinical reasoning — differentials, trend interpretation, context-aware guidance — while the alarm system provides immediate alerts. The two systems complement each other.

### 4. Alert fatigue in the AI system

We were reproducing the exact problem we set out to solve — too many alerts. Early versions triggered WATCH-level alerts constantly, desensitizing the clinician.

**Solution:** We implemented baseline-relative thresholds (not just absolute values), multi-parameter correlation (single mild deviation = WATCH; two simultaneous deviations = CONCERN), and trend-aware escalation (a value that's been stable at a mild deviation doesn't re-alert). The 4-tier cascade with distinct audio, visual, and haptic responses for each tier gives clinicians proportional urgency cues.

### 5. Voice I/O in a clinical environment

Clinical environments are noisy. We needed voice interaction that works hands-free during procedures when the clinician's hands are in the sterile field.

**Solution:** We integrated Gemini Live API for native bidirectional audio via WebSocket — the clinician speaks naturally and Jarvis responds with Gemini's native voice. For critical voice alerts (CRITICAL tier), we use browser TTS as a reliable fallback that doesn't require a network round trip.

### 6. Building a complete clinical system in a hackathon

The scope was enormous — patient intake, camera management, vision analysis, manual entry, 4 trend graphs, fluid balance, drug logging, 50+ clinical event types across 7 settings, alarm systems, risk prediction, chat, voice, PDF export, and PWA support.

**Solution:** No framework. Vanilla HTML/CSS/JS with zero build step. FastAPI with 4 endpoints. Every feature was built to be independently functional — if camera fails, manual entry works; if voice fails, chat works; if risk prediction hasn't run, trends and alarms still function. This modularity let us build incrementally without any feature blocking another.

## Accomplishments that we're proud of

- **Zero-integration monitoring** — works on any patient monitor in any hospital without touching IT infrastructure
- **Complete clinical workflow** — from patient intake to PDF report export, covering the full monitoring session lifecycle
- **Setting-adaptive intelligence** — the same system adapts its reasoning, events, alarms, and risk models for OR, ICU, ED, PACU, L&D, Procedural Sedation, and Transport environments
- **~5,100 lines of code** across 4 files — a complete multimodal AI clinical monitoring system with no external dependencies beyond `google-genai`
- **Deployed and live** on Google Cloud Run — accessible from any device with a browser

## What we learned

- **The camera-as-sensor paradigm is surprisingly powerful.** Gemini 2.5 Flash can reliably extract vital signs, interpret waveform morphology, and detect monitor alarm states from a phone camera JPEG. This eliminates the entire integration problem that has stalled clinical AI monitoring for decades.
- **Clinical AI needs context, not just data.** A heart rate of 110 means very different things for a 25-year-old undergoing appendectomy vs. a 78-year-old with heart failure in the ICU. Fusing patient baseline, clinical setting, comorbidities, medications, events, and trends into every analysis call dramatically improves the quality of clinical reasoning.
- **Client-side state is an underrated architectural pattern.** By keeping all clinical data in the browser, we avoided database complexity, session management, and HIPAA-related server storage concerns — while making the backend trivially deployable and stateless.
- **Prompt engineering is clinical engineering.** The quality of Gemini's clinical reasoning depends heavily on how we structure the prompt — what context we include, how we format the JSON schema, and how we calibrate alert thresholds in the prompt instructions.

## What's next for Jarvis OR Guardian

- **Multi-center validation** — testing OCR accuracy against manual vital recording across monitor brands in real OR, ICU, and PACU settings
- **Multi-patient ICU dashboard** — allowing nurses to monitor 3–4 patients simultaneously with cross-patient deterioration alerting
- **Edge inference** — on-device Gemini Nano for offline capability and sub-second latency (critical for transport and field medicine)
- **Automated Aldrete scoring** in PACU for discharge readiness prediction
- **LMIC deployment** — offline-capable version for low-resource settings where 5.7 billion people lack access to safe surgical care
- **Clinical trial** — IRB-approved study measuring alert response time improvement and missed-deterioration rates

## Built With

- Gemini 2.5 Flash (multimodal vision + reasoning)
- Gemini Live API (native bidirectional audio)
- FastAPI + Uvicorn
- Vanilla HTML / CSS / JavaScript
- Chart.js
- jsPDF
- Docker
- Google Cloud Run
- Python
