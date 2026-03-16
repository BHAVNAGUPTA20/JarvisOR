# Jarvis OR Guardian — Pitch Deck

---

## Slide 1: Title

### Jarvis OR Guardian

**Ambient AI Vision for the Operating Room**

*A multimodal AI copilot that watches the monitor so the anaesthesiologist can watch the patient.*

Dr Bhavna Gupta | Anaesthesiologist

---

## Slide 2: The Problem

### Cognitive Overload Kills

An anaesthesiologist simultaneously monitors **8+ vital parameters**, manages drugs, airway, IV fluids, and responds to unpredictable surgical events — for hours.

**The numbers are alarming:**

- **23–30%** of critical monitor alarms are missed or acknowledged late during high-workload surgical phases
- **73%** of intraoperative adverse events have a cognitive factors component
- Average anaesthesiologist manages **150+ data points per hour** from the monitor alone
- Alarm fatigue causes clinicians to ignore **85–99%** of monitor alarms in ICU settings

**And the existing solutions don't help:**

- Proprietary monitor APIs (HL7, DICOM) require expensive vendor agreements
- Hospital IT integration takes 6–18 months per device type
- No solution works across monitor brands (Philips, GE, Drager, Mindray)

> "The anaesthesiologist's eyes are the bottleneck."

---

## Slide 3: The Insight

### The Camera Is the Universal Medical Device Interface

Every monitor in every OR in every hospital displays the same information: **numbers on a screen and waveforms on a trace.**

A phone camera pointed at any monitor can read what a human reads — without:

- Proprietary integrations
- IT department approval
- Vendor licensing
- Hardware installation

**Gemini 2.5 Flash** can OCR numbers, interpret ECG morphology, read SpO2 pleth quality, detect alarm states, and reason about clinical meaning — all from a single JPEG frame.

And when the camera isn't available? Clinicians can **enter vitals manually** — Jarvis still delivers the same trend analysis, alarm detection, and clinical reasoning.

---

## Slide 4: The Solution

### Jarvis OR Guardian — Full Intraoperative Monitoring

Point any phone at any monitor. Jarvis becomes your ambient clinical copilot.

**Before the case starts,** the anaesthesiologist:
1. Acknowledges a **medical disclaimer**
2. Fills a structured **10-section patient intake form** — demographics, procedure, ASA risk, comorbidities, medications, anesthesia technique, monitoring plan, and baseline vitals

**Every 1–5 minutes during surgery, Jarvis:**

1. **Captures** a frame from the camera (or accepts **manual vitals entry**)
2. **Extracts** all visible vital signs via Gemini vision
3. **Calculates** derived indicators — **MAP** and **Shock Index** (HR ÷ SBP)
4. **Compares** against the patient's pre-set baseline and **9 configurable alarm thresholds**
5. **Tracks** trends across **4 dedicated graphs** — Hemodynamic, Respiratory, Temperature, Fluid Balance & Shock Index
6. **Monitors** fluid balance (blood loss, IV fluids, transfusions, urine output) and drug administration
7. **Alerts** through 4 severity tiers with voice, sound, vibration, and visual overlay
8. **Guides** with differential diagnosis, immediate checks, and suggested actions
9. **Predicts** postoperative risks (hypotension, ICU admission, sepsis, AKI)

---

## Slide 5: How It Works

### Architecture — Elegantly Simple

```
  Phone Camera / Manual Entry    FastAPI Backend            Gemini 2.5 Flash
  ┌──────────┐               ┌──────────────┐          ┌──────────────┐
  │  Live     │  ROI-cropped  │  Prompt      │  Vision  │  Structured  │
  │  Video    │──────────────▶│  Engineering │─────────▶│  JSON Output │
  │  Feed     │   JPEG frame  │  + Context   │          │  + Clinical  │
  │  ────OR── │               └──────────────┘          │  Reasoning   │
  │  Manual   │                      │                  └──────────────┘
  │  Entry    │                      │
  └──────────┘               ┌───────▼──────┐
       ▲                     │  Intraop     │
       │                     │  Dashboard   │
  ┌──────────┐               │  ┌─────────┐ │
  │  Alert    │◀─────────────│  │4 Trends │ │
  │  Engine   │  threshold    │  │FluidBal │ │
  │  + Voice  │  alarms       │  │DrugLog  │ │
  │  + Alarms │               │  │PostopRx │ │
  └──────────┘               └──────────────┘
```

**Key technical decisions:**

| Decision | Rationale |
|---|---|
| Camera as sensor | Zero-integration, works on any monitor, any hospital |
| Manual entry fallback | Works even when camera is unavailable — clinician types vitals directly |
| ROI bounding box | User aligns monitor within box → crops out distractions → better OCR, lower cost |
| Auto-calculated MAP & Shock Index | Derived indicators detect organ perfusion problems and early shock without extra input |
| 4 dedicated trend graphs | Hemodynamic, Respiratory, Temperature, and Fluid/SI trends — clinicians see patterns instantly |
| 9 configurable alarm thresholds | MAP, SpO₂, EtCO₂, HR, Shock Index, Temperature — each tunable per patient |
| Structured JSON prompts | Gemini returns machine-parseable vitals, not narrative text |
| Client-side state | Stateless backend → trivial cloud deployment, no database needed |

---

## Slide 6: The Dashboard — What Doctors See

### Complete Intraoperative Monitoring in One Screen

```
┌─────────────────────────────────────────────────────┐
│  HEADER  [Status Dot]  [Settings]                   │
├─────────────────────────────────────────────────────┤
│  🚨 SAFETY ALARMS BAR (MAP < 65, Shock Index > 0.9)│
├──────────────────────┬──────────────────────────────┤
│  📹 Camera / Vision  │  📊 Vitals (8 cards)         │
│  ROI + Auto-capture  │  HR SpO₂ BP MAP              │
│  Upload fallback     │  EtCO₂ RR Temp SHOCK INDEX   │
├──────────────────────┴──────────────────────────────┤
│  ✏️ Manual Vitals Entry (collapsible)                │
│  Core vitals + Respiratory/Ventilation params       │
├──────────────────────┬──────────────────────────────┤
│  ❤️ Hemodynamic Trend │  🫁 Respiratory Trend        │
│  (HR, MAP, SBP)      │  (SpO₂, EtCO₂, RR)          │
├──────────────────────┬──────────────────────────────┤
│  🌡️ Temperature Trend │  💧 Fluid & Shock Index      │
│  (Temp over time)    │  (EBL, IVF, SI)              │
├──────────────────────┬──────────────────────────────┤
│  💧 Fluid Balance     │  💊 Drug Administration Log   │
│  EBL, IVF, Blood,   │  12 categories, dose, route  │
│  Urine, Net Balance  │  Timestamped                 │
├──────────────────────┴──────────────────────────────┤
│  📋 Clinical Insight Card                            │
│  Trend ∣ Physiology ∣ Differentials ∣ Actions       │
├──────────────────────┬──────────────────────────────┤
│  🚨 Alarm & Safety    │  📊 Postop Risk Prediction   │
│  9 thresholds,       │  Hypotension, ICU, Sepsis,   │
│  configurable        │  AKI — with risk bars        │
├──────────────────────┬──────────────────────────────┤
│  📋 Surgical Events   │  💬 Copilot Chat             │
│  24 quick-log buttons │  Streaming AI with full     │
│  4 categories        │  clinical context            │
└──────────────────────┴──────────────────────────────┘
```

---

## Slide 7: The Alert Cascade

### From Silent Monitoring to Life-Saving Alarm

| Level | Trigger | What Happens |
|---|---|---|
| **NONE** | All vitals within 10% of baseline | Green status dot. Quiet. |
| **WATCH** | HR +15% from baseline | Yellow banner. Soft tone. |
| **CONCERN** | Two deviations + falling trend | Orange pulsing badge. Distinct audio. Vibration. |
| **CRITICAL** | SpO2 <90%, severe hypotension, EtCO2 loss, Shock Index >0.9 | **Full-screen red overlay. Voice alert. Strong vibration. Clinical insight card with differentials and actions.** |

**What sets Jarvis apart from a simple threshold alarm:**

- Jarvis considers **baseline-relative** deviations (HR 110 is normal for one patient, alarming for another)
- Jarvis tracks **trends** (slowly declining MAP over 8 minutes is more concerning than a transient dip)
- Jarvis calculates **Shock Index** (HR ÷ SBP > 0.9 = early shock detection)
- Jarvis fuses **surgical context** ("incision started" explains a transient HR rise)
- Jarvis provides **differential diagnosis and action steps**, not just a beep
- Jarvis generates **Jarvis-style alerts** like: *"Possible hypovolemia or bleeding — check surgical field."*

### Configurable Alarm Thresholds

| Parameter | Default |
|---|---|
| MAP | < 65 mmHg |
| SpO₂ | < 92% |
| EtCO₂ | < 25 or > 50 mmHg |
| HR | < 45 or > 130 bpm |
| Shock Index | > 0.9 |
| Temperature | > 38.5°C or < 35°C |

---

## Slide 8: Clinical Insight Card

### Not Just an Alarm — A Reasoning Partner

Each analysis produces a structured **7-section clinical card:**

```
┌─────────────────────────────────────────────┐
│ ⚠ CONCERN   14:32:07                        │
├─────────────────────────────────────────────┤
│ TREND INTERPRETATION                         │
│ Progressive tachycardia with borderline      │
│ hypotension emerging over 8 minutes.         │
│ MAP declining. Shock Index rising to 1.1.    │
├─────────────────────────────────────────────┤
│ PHYSIOLOGICAL EXPLANATION                    │
│ Compensatory tachycardia in response to      │
│ falling preload — consistent with volume     │
│ depletion post-spinal sympathetic blockade.  │
├─────────────────────────────────────────────┤
│ DIFFERENTIALS                                │
│ 1. Hypovolaemia (EBL 800ml logged)          │
│ 2. Sympathetic blockade (spinal anesthesia)  │
│ 3. Light anaesthesia / pain response         │
├─────────────────────────────────────────────┤
│ IMMEDIATE CHECKS                             │
│ ☐ Check surgical field for active bleeding   │
│ ☐ Verify IV access patent and fluid running  │
│ ☐ Review fluid balance (Net: -400ml)         │
├─────────────────────────────────────────────┤
│ SUGGESTED ACTIONS                            │
│ → Consider 250ml crystalloid bolus           │
│ → Start vasopressor if MAP < 60 persists     │
│ → Prepare blood products (EBL > 500ml)       │
└─────────────────────────────────────────────┘
```

---

## Slide 9: Multimodal Input Fusion

### Camera + Voice + Manual Entry + Context = Clinical Intelligence

Jarvis doesn't just read the monitor. It **fuses all available information** for clinical reasoning:

```
Camera frame (vitals + waveforms)     ─┐
  ─OR─ Manual vitals entry            ─┤
Derived: MAP, Shock Index             ─┤
Clinician voice ("bolus given")       ─┤
Patient profile (65yo M, BMI 32)      ─┤
ASA III, HTN, DM, CKD                ─┤
Medications (beta-blockers, insulin)  ─┼─▶ Jarvis Clinical Reasoning
Allergies (penicillin)                ─┤
Anesthesia (spinal) + difficult airway─┤     ├─▶ 4 Trend Graphs
Baseline vitals (HR 72, SpO2 99%)     ─┤     ├─▶ Threshold Alarms
4 trend graphs (Hemo/Resp/Temp/Fluid) ─┤     ├─▶ Clinical Insight Card
Fluid balance (EBL, IVF, blood, UO)   ─┤     ├─▶ Safety Alerts
Drug administration log               ─┤     └─▶ Postop Risk Prediction
Surgical events (24 quick-log types)  ─┤
Active alarms                         ─┘
```

**Example 1:** HR ↑ + BP ↓ + Blood loss logged → Jarvis suggests **possible hypovolemia / bleeding**

**Example 2:** BP drop after spinal anesthesia → Jarvis interprets as **sympathetic blockade**, not hemorrhage

**Example 3:** Shock Index rising above 0.9 with Temp > 38.5°C → Jarvis flags **possible sepsis**

---

## Slide 10: Intraoperative Recording — What Must Be Monitored

### Mandatory Physiological Parameters

| Category | Parameters |
|---|---|
| **Core Vitals** (every reading) | HR★, SBP/DBP★, SpO₂★, EtCO₂★, RR★, Temperature★ |
| **Derived Indicators** (auto-calculated) | MAP (DBP + (SBP−DBP)/3), Shock Index (HR ÷ SBP) |
| **Respiratory/Ventilation** (if available) | FiO₂, Tidal Volume, Peak Airway Pressure, Ventilator Mode, Minute Ventilation |
| **Fluid Balance** (running totals) | Estimated Blood Loss★, IV Fluids★, Blood Transfusion, Urine Output |
| **Drug Administration** (timestamped log) | Vasopressors, Inotropes, Sedatives, Muscle Relaxants, Analgesics, Antibiotics, IV Fluids/Colloids, Blood Products |
| **Surgical Events** (timestamped log) | 24 event types across Anesthesia, Surgical, Critical, and Infection/Sepsis categories |
| **Infection/Sepsis Indicators** | Temperature rise, Infection suspicion, Sepsis event, Antibiotics administered |

### Monitoring Frequency

Vitals should ideally be recorded **every 1–5 minutes** — configurable via auto-capture interval (1s to 5min) or manual entry. This allows Jarvis to analyze **trend patterns over time**.

---

## Slide 11: Trend Graphs — What Doctors Need to See

### 4 Essential Trend Graphs

| Graph | Parameters | Detects |
|---|---|---|
| **Hemodynamic Trend** (top priority) | HR, MAP, SBP | Bleeding, shock, hypotension, sympathetic responses |
| **Respiratory Trend** | SpO₂, EtCO₂, RR | Hypoxia, ventilator problems, airway obstruction, disconnection |
| **Temperature Trend** | Body temperature over time | Hypothermia, malignant hyperthermia, infection |
| **Fluid Balance & Shock Index** | EBL, IVF, Shock Index | Hypovolemia, fluid imbalance, renal perfusion, early shock |

### Pattern Detection Examples

| Pattern | Interpretation |
|---|---|
| HR ↑ + MAP ↓ | Possible hypovolemia / bleeding |
| MAP ↓ after spinal | Sympathetic block |
| SpO₂ ↓ + EtCO₂ ↓ | Airway disconnection |
| SpO₂ ↓ + EtCO₂ ↑ | Hypoventilation |
| Gradual temperature drop | Intraoperative hypothermia |
| Rapid temperature rise | Malignant hyperthermia |
| Shock Index > 0.9 | Possible shock |

---

## Slide 12: Postoperative Risk Prediction

### Beyond Monitoring — Clinical Decision Support

Jarvis combines all intraoperative data to estimate risk of:

| Risk | Based On |
|---|---|
| **Postoperative Hypotension** | MAP trends, Shock Index, fluid balance, blood loss, age, comorbidities |
| **ICU Admission** | ASA score, critical events, blood loss, urgency, age |
| **Sepsis Risk** | Temperature trends, infection events, antibiotics, age, comorbidities |
| **Acute Kidney Injury** | MAP time below 65mmHg, urine output, blood loss, CKD history |

Each risk is displayed as a visual bar with LOW / MODERATE / HIGH / CRITICAL labels.

> This makes the system more than a monitor — it becomes a **clinical decision support tool**.

---

## Slide 13: Demo-Ready Features

### Built for the Stage

| Feature | Why It Matters |
|---|---|
| **Disclaimer on Entry** | Medical disclaimer displayed before any data entry — establishes clinical credibility |
| **10-Section Patient Intake** | Structured clinical form with collapsible sections, auto-BMI, comorbidity checkboxes, mandatory field validation |
| **Manual Vitals Entry** | Camera fails? Expand the manual panel → type vitals → system works identically. No demo failure. |
| **24 Quick-Log Event Buttons** | One-tap surgical event logging. No typing. 4 categories color-coded (blue/red/orange). |
| **Drug Administration Log** | Log any drug with category, dose, route. 12 categories. Context-aware AI interpretation. |
| **Fluid Balance Tracking** | Running totals with auto-calculated net balance. Visual summary cards. |
| **4 Trend Graphs** | Real-time Hemodynamic, Respiratory, Temperature, and Fluid/Shock Index trends |
| **9 Configurable Alarms** | Adjustable thresholds per patient. Safety alarm badges. |
| **Postop Risk Calculator** | Click "Calculate Risk" → instant risk assessment based on all intraoperative data |
| **Pre-flight Camera Check** | Gemini validates readability before surgery |
| **ROI Bounding Box** | Draggable box crops monitor region → better accuracy |
| **Simulation Mode** | Triple-click logo → load MP4 → pipeline continues seamlessly |
| **Voice I/O** | Clinician speaks naturally. Jarvis responds with TTS. Events auto-detected. |
| **Streaming Chat** | Full context: patient + vitals + trends + fluids + drugs + events + alarms |
| **PWA** | Install on any phone. Full-screen. Works on mobile and tablet. |

---

## Slide 14: Technology

### Stack — Optimized for Hackathon Speed and Cloud Deployment

| Component | Technology | Why |
|---|---|---|
| AI Vision & Reasoning | **Gemini 2.5 Flash** | Best-in-class multimodal OCR. 3s latency. Structured JSON output. |
| Backend | **FastAPI** | Async Python. 4 endpoints. Stateless. |
| Frontend | **Vanilla HTML/CSS/JS** | Zero build step. No npm. Full intraoperative dashboard with 4 trend charts, fluid tracking, drug log, alarm system, and postop risk. |
| Camera | **getUserMedia API** | Native browser. Rear camera. No SDK. |
| Manual Entry | **Browser forms** | Fallback when camera unavailable. Same trend/alarm pipeline. |
| Voice | **Web Speech API** | Native STT + TTS. Zero latency. |
| Charts | **Chart.js** (x4) | 4 dedicated graphs: Hemodynamic, Respiratory, Temperature, Fluid/SI. |
| Deployment | **Docker → Google Cloud Run** | Single container. Health endpoint. Auto-scaling ready. |

**Total codebase:** ~5,000 lines across 4 core files. No external AI SDKs beyond `google-genai`.

---

## Slide 15: Market & Impact

### Why This Matters

**The addressable context is enormous:**

- **310 million** surgeries performed globally per year (Lancet 2015)
- **Over 70%** occur in settings where dedicated anaesthesia monitoring staff is unavailable
- Low- and middle-income countries have **0.5 anaesthesiologists per 100,000** people (vs. 20+ in high-income countries)

**Jarvis addresses all three barriers to AI-assisted monitoring:**

| Barrier | Traditional Approach | Jarvis Approach |
|---|---|---|
| Monitor integration | Proprietary API licensing | Camera reads the screen (or manual entry) |
| Hardware requirements | Dedicated servers, custom devices | Any phone or tablet |
| Deployment time | 6–18 months per hospital | Open the URL |

**Clinical impact potential:**

- Reduce alarm response time from **minutes to seconds**
- Catch slow deterioration trends that humans miss (MAP declining 2 mmHg per minute over 15 minutes)
- Detect early shock via **Shock Index trending** before overt hypotension
- **Predict postoperative risks** during surgery — enabling proactive intervention
- Bridge the monitoring gap in resource-limited settings

---

## Slide 16: What We Acknowledge

### Transparent Limitations Build Clinical Trust

- **Not FDA-cleared** — this is a research prototype, not a medical device
- **OCR accuracy varies** with camera angle, monitor brand, and lighting conditions
- **Waveform interpretation is directional**, not diagnostic-grade arrhythmia detection
- **3–8 second latency** means Jarvis is a **copilot**, not a real-time safety interlock
- **Postop risk scores** are heuristic estimates based on intraoperative data, not validated predictive models
- **Gemini may hallucinate** vital values if the image is ambiguous — the `image_quality_note` field provides self-assessment

> **We position Jarvis as cognitive support, not autonomous decision-making.** This is both the safer framing and the more credible one.

---

## Slide 17: Roadmap

### From Hackathon to Clinical Tool

| Phase | Timeline | Milestone |
|---|---|---|
| **Hackathon MVP** | Now | Full intraoperative monitoring: disclaimer, 10-section intake, camera + manual entry, 4 trend graphs, fluid balance, drug log, 24-event surgical timeline, 9-threshold alarm system, postop risk prediction, AI chat with full context |
| **Validation Study** | 3 months | Test accuracy against manual vital recording across 3 monitor brands |
| **Edge Inference** | 6 months | On-device Gemini Nano for offline capability and lower latency |
| **Multi-Monitor Support** | 6 months | Split-screen ROI for simultaneous patient + ventilator monitor reading |
| **Clinical Trial** | 12 months | IRB-approved study measuring alert response time improvement |
| **Regulatory Pathway** | 18 months | CE marking (EU) / FDA De Novo classification for clinical decision support |

---

## Slide 18: The Team

### Dr Bhavna Gupta

**Anaesthesiologist**

- Practising clinician who lives the problem every day in the operating room
- Domain expertise in intraoperative monitoring, crisis management, and patient safety
- Designed Jarvis to solve real workflow gaps observed in thousands of surgical cases

---

## Slide 19: The Ask

### What We Need

1. **Feedback** from clinicians and judges on clinical relevance and safety framing
2. **Gemini API credits** for extended testing and validation studies
3. **Clinical partnerships** for multi-center accuracy validation
4. **Cloud credits** for production-grade deployment and scaling

---

## Slide 20: Live Demo

### See Jarvis in Action

1. Open Jarvis → **Disclaimer** → "I Understand — Continue"
2. Enter API key
3. **Patient intake:** 65yo Male, total hip replacement, ASA III, HTN + DM, spinal anesthesia, baseline HR 72, BP 130/80, SpO₂ 99%
4. Start monitoring → Pre-flight check: "Camera Ready"
5. Auto-capture at 3-second intervals — OR — open **Manual Entry** and type vitals
6. **Quick-log events:** ★ Induction → ★ Intubation → ★ Incision
7. **Log drugs:** Propofol 200mg IV, Fentanyl 100mcg IV
8. **Track fluids:** EBL 200ml → 500ml → 800ml; IVF 1000ml
9. Watch 4 trend graphs update in real time
10. Simulate deterioration → HR ↑, MAP ↓, Shock Index > 0.9
11. **Safety alarms fire:** "MAP 58 < 65 mmHg" + "Shock Index 1.1 > 0.9"
12. CRITICAL alert: full-screen overlay, voice alert, clinical insight card
13. Log: ★ Bleeding episode → "250ml bolus given"
14. Click **Calculate Risk** → Postop risk bars: Hypotension HIGH, ICU MODERATE
15. Vitals recover → trend reversal → alert downgrades

**Live:** `https://jarvis-or-<hash>.run.app`

---

*Jarvis OR Guardian — Because in the OR, every second of awareness counts.*

---

### Authors

**Dr Bhavna Gupta** — Anaesthesiologist | [LinkedIn](https://www.linkedin.com/in/dr-bhavna-gupta)

**Aayush Gupta** — Staff Data Scientist | [LinkedIn](https://www.linkedin.com/in/gaaush/)
