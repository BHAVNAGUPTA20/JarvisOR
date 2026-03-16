# Jarvis OR Guardian — Pitch Deck

---

## Slide 1: Title

### Jarvis OR Guardian

**Ambient AI Vision for Clinical Monitoring**

*A multimodal AI copilot that watches the monitor so clinicians can watch the patient — in the OR, ICU, ED, PACU, and beyond.*

Dr Bhavna Gupta | Consultant Anaesthesiologist & Intensivist

---

## Slide 2: The Problem

### Cognitive Overload Kills — Everywhere

Every clinician managing a monitored patient faces the same impossible task: simultaneously tracking **8+ vital parameters**, interpreting trends, managing interventions, and responding to unpredictable clinical events — for hours, often across multiple patients.

**The numbers are alarming:**

- **23–30%** of critical monitor alarms are missed or acknowledged late during high-workload phases
- **73%** of intraoperative adverse events have a cognitive factors component
- Alarm fatigue causes clinicians to ignore **85–99%** of monitor alarms in ICU and OR settings
- ICU nurses manage **3–4 patients simultaneously**, each generating **150+ data points per hour**
- ED physicians juggle **25+ patients** at a time, many on continuous monitoring
- PACU nurses miss **early respiratory depression** in 1 in 5 postoperative patients within the first hour
- L&D units face **maternal cardiac arrest** rates that have doubled in the last decade

**And the existing solutions don't help — in any setting:**

- Proprietary monitor APIs (HL7, DICOM) require expensive vendor agreements
- Hospital IT integration takes 6–18 months per device type
- No solution works across monitor brands (Philips, GE, Drager, Mindray)
- ICU clinical information systems cost **$50K–$250K per unit** and still miss context

> "The clinician's eyes are the bottleneck — whether in the OR, ICU, ED, or PACU."

---

## Slide 3: The Insight

### The Camera Is the Universal Medical Device Interface

Every monitor in every OR, ICU, ED, PACU, and L&D suite in every hospital displays the same information: **numbers on a screen and waveforms on a trace.**

A phone camera pointed at any monitor can read what a human reads — without:

- Proprietary integrations
- IT department approval
- Vendor licensing
- Hardware installation

This works identically whether the monitor sits in a state-of-the-art cardiac OR, a 30-bed ICU, a crowded emergency department, a PACU bay, a labor room, an endoscopy suite, or a field hospital.

**Gemini 2.5 Flash** can OCR numbers, interpret ECG morphology, read SpO2 pleth quality, detect alarm states, and reason about clinical meaning — all from a single JPEG frame.

And when the camera isn't available? Clinicians can **enter vitals manually** — Jarvis still delivers the same trend analysis, alarm detection, and clinical reasoning.

---

## Slide 4: The Solution

### Jarvis OR Guardian — Clinical Monitoring Across Settings

Point any phone at any monitor. Select your clinical setting. Jarvis becomes your ambient clinical copilot.

**Clinical Setting Selector** — Jarvis adapts its reasoning, alarm thresholds, event categories, and risk models to the chosen environment:

| Setting | Key Focus |
|---|---|
| **Operating Room** | Intraoperative anaesthesia monitoring, surgical events, drug administration |
| **ICU / Critical Care** | Multi-patient bedside monitoring, ventilator tracking, sedation scoring |
| **Emergency Department** | Trauma resuscitation, rapid sequence intubation, triage deterioration |
| **PACU / Recovery** | Postoperative respiratory depression, emergence delirium, discharge readiness |
| **Labor & Delivery** | Maternal hemodynamics during epidural/spinal, C-section monitoring |
| **Procedural Sedation** | Endoscopy, cath lab, interventional radiology — sedation depth monitoring |
| **Transport / Transfer** | Inter-hospital transfers, ambulance monitoring in resource-limited conditions |

**Before monitoring begins,** the clinician:
1. Acknowledges a **medical disclaimer**
2. Selects the **clinical setting** (OR / ICU / ED / PACU / L&D / Procedural Sedation / Transport)
3. Fills a structured **patient intake form** — patient ID, demographics, procedure/diagnosis, risk score, comorbidities, medications, comprehensive anesthesia technique selection (30+ options across Neuraxial, Peripheral Regional, General, Sedation/MAC, and Combined categories), monitoring plan, and baseline vitals

**Every 1–5 minutes during monitoring, Jarvis:**

1. **Captures** a frame from the camera (or accepts **manual vitals entry**)
2. **Extracts** all visible vital signs via Gemini vision
3. **Calculates** derived indicators — **MAP** and **Shock Index** (HR ÷ SBP)
4. **Compares** against the patient's pre-set baseline and **9 configurable alarm thresholds**
5. **Tracks** trends across **4 dedicated graphs** — Hemodynamic, Respiratory, Temperature, Fluid Balance & Shock Index
6. **Monitors** fluid balance (blood loss, IV fluids, transfusions, urine output) and drug administration
7. **Alerts** through 4 severity tiers with Gemini Live voice, sound, vibration, and visual overlay
8. **Guides** with differential diagnosis, immediate checks, and suggested actions
9. **Predicts** clinical risks adapted to the setting — postop complications, ICU deterioration, sepsis, AKI
10. **Exports** a complete clinical monitoring report as PDF — patient demographics, vitals history, fluid balance, drug log, events, alarms, and clinical insight

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
       ▲                     │  Clinical    │
       │                     │  Dashboard   │
  ┌──────────┐               │  ┌─────────┐ │
  │  Alert    │◀─────────────│  │4 Trends │ │          ┌──────────────┐
  │  Engine   │  threshold    │  │FluidBal │ │  WebSkt  │  Gemini Live │
  │  + Voice  │  alarms       │  │DrugLog  │ │◀────────▶│  Native Audio│
  │  + Alarms │               │  │RiskPred │ │          │  Voice I/O   │
  │  + PDF    │               │  │PDFExport│ │          └──────────────┘
  └──────────┘               └──────────────┘
```

**Key technical decisions:**

| Decision | Rationale |
|---|---|
| Camera as sensor | Zero-integration, works on any monitor, any hospital, any clinical setting |
| Clinical setting selector | Adapts alarm logic, event types, risk models, and AI reasoning per environment |
| Manual entry fallback | Works even when camera is unavailable — clinician types vitals directly |
| ROI bounding box | User aligns monitor within box → crops out distractions → better OCR, lower cost |
| Auto-calculated MAP & Shock Index | Derived indicators detect organ perfusion problems and early shock without extra input |
| 4 dedicated trend graphs | Hemodynamic, Respiratory, Temperature, and Fluid/SI trends — clinicians see patterns instantly |
| 9 configurable alarm thresholds | MAP, SpO₂, EtCO₂, HR, Shock Index, Temperature — each tunable per patient |
| Structured JSON prompts | Gemini returns machine-parseable vitals, not narrative text |
| Gemini Live API for voice | Real-time bidirectional native audio — clinician speaks, Jarvis responds with natural voice via WebSocket |
| Client-side PDF export | One-click clinical report with full vitals history, fluid balance, drug log, events, and clinical insight — no server round-trip |
| Client-side state | Stateless backend → trivial cloud deployment, no database needed |

---

## Slide 6: The Dashboard — What Clinicians See

### Complete Clinical Monitoring in One Screen

```
┌─────────────────────────────────────────────────────┐
│  HEADER  [Status Dot]  [📄 PDF] [Setting: OR/ICU/…]│
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
│  🚨 Alarm & Safety    │  📊 Clinical Risk Prediction  │
│  9 thresholds,       │  Setting-adapted risk bars    │
│  configurable        │  (Hypotension, Sepsis, AKI…) │
├──────────────────────┬──────────────────────────────┤
│  📋 Clinical Events   │  💬 Copilot Chat             │
│  Setting-adaptive    │  Streaming AI with full      │
│  event buttons       │  clinical context            │
└──────────────────────┴──────────────────────────────┘
```

### Clinical Events — Adaptive by Setting

| Setting | Event Categories |
|---|---|
| **OR** | Induction, Intubation, Incision, Extubation, Bleeding Episode, Cardiac Arrest, Anaphylaxis |
| **ICU** | Admission, Transfer, Discharge, Line Inserted/Removed, Ventilator Change, Prone Positioning, Code Blue, Handover |
| **ED** | Triage, RSI, Chest Decompression, Central Line, Code Blue, Trauma Alert, ROSC, Intubation |
| **PACU** | Arrival, Aldrete Score, Respiratory Depression, Emergence Delirium, Nausea/Vomiting, Discharge |
| **L&D** | Epidural Placed, Spinal Given, C-Section Start, Delivery, PPH, Neonatal Resuscitation |
| **Procedural Sedation** | Sedation Start, Deepening, Airway Intervention, Procedure End, Recovery, Reversal Agent |
| **Transport** | Departure, Arrival, Deterioration, Intervention, Handover |

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
- Jarvis fuses **clinical context** ("epidural placed" explains a BP drop; "RSI started" explains transient desaturation)
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

The clinical insight card adapts to context — an ICU patient on vasopressors receives guidance about titration, while an ED trauma patient receives damage-control resuscitation recommendations.

---

## Slide 9: Multimodal Input Fusion

### Camera + Voice + Manual Entry + Context = Clinical Intelligence

Jarvis doesn't just read the monitor. It **fuses all available information** for clinical reasoning:

```
Camera frame (vitals + waveforms)     ─┐
  ─OR─ Manual vitals entry            ─┤
Clinical setting (OR/ICU/ED/PACU/…)  ─┤
Derived: MAP, Shock Index             ─┤
Clinician voice (Gemini Live audio)   ─┤
Patient profile (65yo M, BMI 32)      ─┤
Risk score (ASA III / APACHE II / …) ─┤
Comorbidities (HTN, DM, CKD)         ─┤
Medications (beta-blockers, insulin)  ─┼─▶ Jarvis Clinical Reasoning
Allergies (penicillin)                ─┤
Procedure/Diagnosis context           ─┤     ├─▶ 4 Trend Graphs
Baseline vitals (HR 72, SpO2 99%)     ─┤     ├─▶ Threshold Alarms
4 trend graphs (Hemo/Resp/Temp/Fluid) ─┤     ├─▶ Clinical Insight Card
Fluid balance (EBL, IVF, blood, UO)   ─┤     ├─▶ Safety Alerts
Drug administration log               ─┤     ├─▶ Clinical Risk Prediction
Clinical events (setting-adaptive)    ─┤     └─▶ PDF Clinical Report
Active alarms                         ─┘
```

**OR Example:** HR ↑ + BP ↓ + Blood loss logged → Jarvis suggests **possible hypovolemia / bleeding**

**OR Example:** BP drop after spinal anesthesia → Jarvis interprets as **sympathetic blockade**, not hemorrhage

**ICU Example:** Rising lactate trend + Temp > 38.5°C + WBC ↑ + vasopressor requirement increasing → Jarvis flags **evolving septic shock — consider source control and antibiotic escalation**

**ICU Example:** Ventilated patient with rising peak pressures + falling SpO₂ + absent breath sounds → Jarvis flags **possible tension pneumothorax — urgent decompression needed**

**ED Example:** Trauma patient with Shock Index > 1.2 + dropping Hgb + tachycardia → Jarvis flags **hemorrhagic shock — activate massive transfusion protocol**

**PACU Example:** Postop patient with falling SpO₂ + rising EtCO₂ + low RR + opioid on drug log → Jarvis flags **opioid-induced respiratory depression — consider naloxone**

---

## Slide 10: Clinical Recording — What Must Be Monitored

### Mandatory Physiological Parameters

| Category | Parameters |
|---|---|
| **Core Vitals** (every reading) | HR★, SBP/DBP★, SpO₂★, EtCO₂★, RR★, Temperature★ |
| **Derived Indicators** (auto-calculated) | MAP (DBP + (SBP−DBP)/3), Shock Index (HR ÷ SBP) |
| **Respiratory/Ventilation** (if available) | FiO₂, Tidal Volume, Peak Airway Pressure, Ventilator Mode, Minute Ventilation |
| **Fluid Balance** (running totals) | Estimated Blood Loss★, IV Fluids★, Blood Transfusion, Urine Output |
| **Drug Administration** (timestamped log) | Vasopressors, Inotropes, Sedatives, Muscle Relaxants, Analgesics, Antibiotics, IV Fluids/Colloids, Blood Products |
| **Clinical Events** (timestamped log) | Setting-adaptive event types across Anesthesia, Surgical, Critical, ICU, ED, PACU, L&D, and Transport categories |
| **Infection/Sepsis Indicators** | Temperature rise, Infection suspicion, Sepsis event, Antibiotics administered, Cultures sent |

### Monitoring Frequency

Vitals should ideally be recorded **every 1–5 minutes** — configurable via auto-capture interval (1s to 5min) or manual entry. This allows Jarvis to analyze **trend patterns over time**.

---

## Slide 11: Trend Graphs — What Clinicians Need to See

### 4 Essential Trend Graphs

| Graph | Parameters | Detects |
|---|---|---|
| **Hemodynamic Trend** (top priority) | HR, MAP, SBP | Bleeding, shock, hypotension, sympathetic responses, vasopressor response |
| **Respiratory Trend** | SpO₂, EtCO₂, RR | Hypoxia, ventilator problems, airway obstruction, respiratory depression, disconnection |
| **Temperature Trend** | Body temperature over time | Hypothermia, malignant hyperthermia, infection, sepsis |
| **Fluid Balance & Shock Index** | EBL, IVF, Shock Index | Hypovolemia, fluid imbalance, renal perfusion, early shock, fluid overload |

### Pattern Detection Examples

| Pattern | Interpretation |
|---|---|
| HR ↑ + MAP ↓ | Possible hypovolemia / bleeding |
| MAP ↓ after spinal | Sympathetic block |
| SpO₂ ↓ + EtCO₂ ↓ | Airway disconnection |
| SpO₂ ↓ + EtCO₂ ↑ | Hypoventilation / respiratory depression |
| SpO₂ ↓ + low RR + opioids given | Opioid-induced respiratory depression (PACU) |
| Gradual temperature drop | Intraoperative hypothermia |
| Rapid temperature rise | Malignant hyperthermia / sepsis |
| Shock Index > 0.9 | Possible shock |
| Rising peak pressures + falling SpO₂ | Pneumothorax / bronchospasm (ICU/ED) |
| Persistent tachycardia + rising vasopressor dose | Worsening septic shock (ICU) |

---

## Slide 12: Clinical Risk Prediction

### Beyond Monitoring — Clinical Decision Support

Jarvis combines all clinical data to estimate risk — adapted to the clinical setting:

| Risk | Based On | Relevant Settings |
|---|---|---|
| **Hypotension** | MAP trends, Shock Index, fluid balance, blood loss, age, comorbidities | OR, ICU, ED, PACU, L&D |
| **ICU Admission / Escalation** | Severity score, critical events, blood loss, urgency, organ failures | OR, ED, PACU, L&D |
| **Sepsis Risk** | Temperature trends, infection events, antibiotics, WBC, lactate, comorbidities | OR, ICU, ED |
| **Acute Kidney Injury** | MAP time below 65mmHg, urine output, blood loss, CKD history, nephrotoxins | OR, ICU |
| **Respiratory Failure** | SpO₂ trends, RR, ventilator parameters, opioid administration, obesity | ICU, PACU, ED |
| **Cardiac Arrest Risk** | Shock Index trajectory, rhythm changes, electrolyte context, arrest history | ICU, ED, OR |
| **Discharge Readiness** | Aldrete score, pain score, vitals stability, ambulation, nausea | PACU |

Each risk is displayed as a visual bar with LOW / MODERATE / HIGH / CRITICAL labels.

> This makes the system more than a monitor — it becomes a **clinical decision support tool** that adapts to where the patient is in their care journey.

---

## Slide 13: Use Cases Across Clinical Settings

### One Platform, Every Monitored Patient

| Setting | Use Case | Key Value |
|---|---|---|
| **Operating Room** | Anaesthesiologist monitors complex case — Jarvis tracks 8+ vitals, flags early shock, logs surgical events, predicts postop risk | **Second pair of eyes** during cognitive overload |
| **ICU / Critical Care** | Nurse manages 3–4 ventilated patients — Jarvis watches bedside monitors, flags deterioration trends, alerts for sepsis and ventilator changes | **Continuous vigilance** across multiple patients |
| **Emergency Department** | ED physician managing trauma bay — Jarvis tracks resuscitation vitals, flags hemorrhagic shock, monitors post-RSI ventilation | **Rapid situational awareness** in chaos |
| **PACU / Recovery** | PACU nurse monitors 6 recovering patients — Jarvis catches respiratory depression, emergence delirium, and delayed bleeding | **Early warning** before clinical deterioration |
| **Labor & Delivery** | Anaesthesiologist monitors epidural/spinal for C-section — Jarvis tracks maternal hemodynamics, flags sympathetic block, alerts for PPH | **Maternal safety** during high-risk deliveries |
| **Procedural Sedation** | Endoscopist performing colonoscopy — Jarvis monitors sedation depth, SpO₂, capnography, flags apnea or obstruction | **Safety net** when attention is on the procedure |
| **Transport / Transfer** | Paramedic during inter-hospital transfer — Jarvis reads transport monitor, tracks trends in austere conditions, flags deterioration | **Monitoring continuity** when resources are limited |
| **Field / Military** | Medic in austere environment — Jarvis reads any available monitor, provides clinical reasoning without connectivity to specialists | **Expert guidance** where none exists |
| **Medical Education** | Simulation lab — Jarvis monitors simulated patient, provides real-time feedback to trainees on alarm response and clinical reasoning | **Teaching tool** for the next generation |

---

## Slide 14: Demo-Ready Features

### Built for the Stage — and the Bedside

| Feature | Why It Matters |
|---|---|
| **Disclaimer on Entry** | Medical disclaimer displayed before any data entry — establishes clinical credibility |
| **Clinical Setting Selector** | Choose OR / ICU / ED / PACU / L&D / Procedural Sedation / Transport — adapts events, alarms, and reasoning |
| **Patient Intake Form** | Structured clinical form with collapsible sections, patient ID, auto-BMI, comorbidity checkboxes, 30+ anesthesia technique options across 6 categories, mandatory field validation |
| **Manual Vitals Entry** | Camera fails? Expand the manual panel → type vitals → system works identically. No demo failure. |
| **Setting-Adaptive Event Buttons** | One-tap clinical event logging adapted to the selected setting. No typing. Color-coded categories. |
| **Drug Administration Log** | Log any drug with category, dose, route. 12 categories. Context-aware AI interpretation. |
| **Fluid Balance Tracking** | Running totals with auto-calculated net balance. Visual summary cards. |
| **4 Trend Graphs** | Real-time Hemodynamic, Respiratory, Temperature, and Fluid/Shock Index trends |
| **9 Configurable Alarms** | Adjustable thresholds per patient and setting. Safety alarm badges. |
| **Clinical Risk Calculator** | Click "Calculate Risk" → setting-adapted risk assessment based on all clinical data |
| **Pre-flight Camera Check** | Gemini validates readability before monitoring begins |
| **ROI Bounding Box** | Draggable box crops monitor region → better accuracy |
| **Simulation Mode** | Triple-click logo → load MP4 → pipeline continues seamlessly |
| **Voice I/O (Gemini Live)** | Real-time bidirectional native audio via WebSocket. Clinician speaks naturally; Jarvis responds with Gemini voice. Browser TTS fallback. |
| **PDF Export** | One-click clinical monitoring report — patient demographics, vitals history table, fluid balance, drug log, events, alarms, and clinical insight. Client-side generation via jsPDF. |
| **Streaming Chat** | Full context: patient + vitals + trends + fluids + drugs + events + alarms |
| **PWA** | Install on any phone. Full-screen. Works on mobile and tablet. |

---

## Slide 15: Technology

### Stack — Optimized for Hackathon Speed and Cloud Deployment

| Component | Technology | Why |
|---|---|---|
| AI Vision & Reasoning | **Gemini 2.5 Flash** | Best-in-class multimodal OCR. 3s latency. Structured JSON output. |
| Backend | **FastAPI** | Async Python. 4 endpoints. Stateless. |
| Frontend | **Vanilla HTML/CSS/JS** | Zero build step. No npm. Full clinical dashboard with 4 trend charts, fluid tracking, drug log, alarm system, and risk prediction. |
| Camera | **getUserMedia API** | Native browser. Rear camera. No SDK. |
| Manual Entry | **Browser forms** | Fallback when camera unavailable. Same trend/alarm pipeline. |
| Voice I/O | **Gemini Live API** | Real-time bidirectional native audio via WebSocket (`gemini-2.5-flash-native-audio-preview`). Browser TTS fallback. |
| Charts | **Chart.js** (x4) | 4 dedicated graphs: Hemodynamic, Respiratory, Temperature, Fluid/SI. |
| PDF Export | **jsPDF** (CDN) | Client-side clinical monitoring report generation. |
| Deployment | **Docker → Google Cloud Run** | Single container. Health endpoint. Auto-scaling ready. |

**Total codebase:** ~5,100 lines across 4 core files. No external AI SDKs beyond `google-genai`.

---

## Slide 16: Market & Impact

### Why This Matters — A Massive, Underserved Market

**The addressable context spans all of acute care medicine:**

| Segment | Global Scale | Problem | Jarvis Opportunity |
|---|---|---|---|
| **Operating Rooms** | **310 million** surgeries/year globally (Lancet) | 70%+ occur where dedicated monitoring staff is unavailable | Ambient copilot for every anaesthesiologist |
| **ICU / Critical Care** | **30 million** ICU admissions/year; global shortage of **100,000+** ICU beds | Nurse-to-patient ratios of 1:3–1:6 create monitoring gaps; alarm fatigue causes 85–99% of alarms to be ignored | Continuous AI vigilance across multiple patients |
| **Emergency Departments** | **400+ million** ED visits/year globally; **50%** of EDs report overcrowding | Monitored patients in hallways with no dedicated watcher; cognitive overload during resuscitation | Automated trend detection and shock recognition |
| **PACU / Recovery** | **150+ million** patients/year through recovery rooms | 1 in 5 patients experiences respiratory depression in first hour; nurse ratios of 1:4–1:6 | Early respiratory depression detection |
| **Labor & Delivery** | **140 million** births/year; **15 million** C-sections | Maternal mortality rising in developed nations; hemodynamic instability during neuraxial anesthesia | Maternal safety monitoring during high-risk deliveries |
| **Procedural Sedation** | **50+ million** sedated procedures/year (endoscopy, cath lab, IR) | Proceduralist focused on procedure, not the monitor; no dedicated anesthesiologist present in many cases | Safety net for unmonitored sedation |
| **Transport Medicine** | **10+ million** inter-hospital transfers/year | Limited monitoring capability during transport; single paramedic managing critically ill patient | Monitoring continuity in austere conditions |
| **LMIC Settings** | **5.7 billion** people lack access to safe surgical/anaesthesia care | 0.5 anaesthesiologists per 100,000 people (vs. 20+ in high-income countries) | Democratizing clinical monitoring globally |

**Total addressable market: $15B+ across clinical monitoring, alarm management, and clinical decision support.**

**Jarvis addresses all three barriers to AI-assisted monitoring:**

| Barrier | Traditional Approach | Jarvis Approach |
|---|---|---|
| Monitor integration | Proprietary API licensing ($50K–$250K per system) | Camera reads the screen (or manual entry) |
| Hardware requirements | Dedicated servers, custom devices | Any phone or tablet |
| Deployment time | 6–18 months per hospital | Open the URL |

**Clinical impact potential:**

- Reduce alarm response time from **minutes to seconds**
- Catch slow deterioration trends that humans miss (MAP declining 2 mmHg per minute over 15 minutes)
- Detect early shock via **Shock Index trending** before overt hypotension
- Catch **respiratory depression in PACU** before desaturation events
- Flag **sepsis earlier** in ICU patients by fusing temperature, hemodynamic, and medication trends
- Detect **hemorrhagic shock in ED trauma** via real-time Shock Index monitoring
- **Predict clinical risks** during care — enabling proactive intervention
- Bridge the monitoring gap in resource-limited settings worldwide

---

## Slide 17: What We Acknowledge

### Transparent Limitations Build Clinical Trust

- **Not FDA-cleared** — this is a research prototype, not a medical device
- **OCR accuracy varies** with camera angle, monitor brand, and lighting conditions
- **Waveform interpretation is directional**, not diagnostic-grade arrhythmia detection
- **3–8 second latency** means Jarvis is a **copilot**, not a real-time safety interlock
- **Clinical risk scores** are heuristic estimates based on monitored data, not validated predictive models
- **Gemini may hallucinate** vital values if the image is ambiguous — the `image_quality_note` field provides self-assessment
- **Setting-specific reasoning** is based on clinical guidelines, not trained on setting-specific datasets
- **Gemini Live voice** requires a stable internet connection; browser TTS serves as fallback

> **We position Jarvis as cognitive support, not autonomous decision-making.** This is both the safer framing and the more credible one.

---

## Slide 18: Roadmap

### From Hackathon to Clinical Platform

| Phase | Timeline | Milestone |
|---|---|---|
| **Hackathon MVP** | Now | Full clinical monitoring: disclaimer, setting selector, patient intake (30+ anesthesia techniques), camera + manual entry, 4 trend graphs, fluid balance, drug log, setting-adaptive events, 9-threshold alarm system, clinical risk prediction, AI chat with full context, Gemini Live voice I/O, PDF clinical report export |
| **Multi-Setting Validation** | 3 months | Test accuracy against manual vital recording across 3 monitor brands in OR, ICU, and PACU settings |
| **ICU Workflow Integration** | 6 months | Multi-patient dashboard for ICU nurses — switch between patients, handover summaries, shift reports |
| **ED Trauma Module** | 6 months | Trauma-specific protocols — massive transfusion alerts, FAST exam integration, GCS tracking |
| **Edge Inference** | 6 months | On-device Gemini Nano for offline capability and lower latency (critical for transport/field) |
| **PACU Discharge Scoring** | 9 months | Automated Aldrete scoring, respiratory depression early warning, discharge readiness prediction |
| **Multi-Monitor Support** | 9 months | Split-screen ROI for simultaneous patient + ventilator monitor reading |
| **Clinical Trial** | 12 months | IRB-approved multi-center study measuring alert response time improvement across OR, ICU, and PACU |
| **L&D Module** | 12 months | Maternal hemodynamic monitoring with fetal heart rate correlation, PPH early warning |
| **LMIC Deployment** | 15 months | Offline-capable version for low-resource settings — field tested in 3 countries |
| **Regulatory Pathway** | 18 months | CE marking (EU) / FDA De Novo classification for clinical decision support |

---

## Slide 19: The Team

### Dr Bhavna Gupta

**Consultant Anaesthesiologist & Intensivist**

- Practising clinician who lives the problem every day — in the operating room, ICU, and acute care settings
- Domain expertise in intraoperative monitoring, critical care, crisis management, and patient safety
- Designed Jarvis to solve real workflow gaps observed across thousands of surgical cases and ICU admissions

---

## Slide 20: The Ask

### What We Need

1. **Feedback** from clinicians and judges on clinical relevance, multi-setting applicability, and safety framing
2. **Gemini API credits** for extended testing and multi-setting validation studies
3. **Clinical partnerships** for multi-center, multi-setting accuracy validation (OR, ICU, ED, PACU)
4. **Cloud credits** for production-grade deployment and scaling across clinical environments

---

## Slide 21: Live Demo

### See Jarvis in Action

1. Open Jarvis → **Disclaimer** → "I Understand — Continue"
2. Enter API key
3. **Select clinical setting:** Operating Room
4. **Patient intake:** 65yo Male, total hip replacement, ASA III, HTN + DM, spinal anesthesia, baseline HR 72, BP 130/80, SpO₂ 99%
5. Start monitoring → Pre-flight check: "Camera Ready"
6. Auto-capture at 3-second intervals — OR — open **Manual Entry** and type vitals
7. **Quick-log events:** ★ Induction → ★ Intubation → ★ Incision
8. **Log drugs:** Propofol 200mg IV, Fentanyl 100mcg IV
9. **Track fluids:** EBL 200ml → 500ml → 800ml; IVF 1000ml
10. Watch 4 trend graphs update in real time
11. Simulate deterioration → HR ↑, MAP ↓, Shock Index > 0.9
12. **Safety alarms fire:** "MAP 58 < 65 mmHg" + "Shock Index 1.1 > 0.9"
13. CRITICAL alert: full-screen overlay, voice alert, clinical insight card
14. Log: ★ Bleeding episode → "250ml bolus given"
15. Click **Calculate Risk** → Clinical risk bars: Hypotension HIGH, ICU Admission MODERATE
16. Click 🎤 → start **Gemini Live voice session** → speak naturally to Jarvis → receive native audio response
17. Vitals recover → trend reversal → alert downgrades
18. Click **📄 Export PDF** → download complete clinical monitoring report
19. **Switch setting to ICU** → demonstrate setting-adaptive events and reasoning

**Live:** `https://jarvis-or-995915388976.us-central1.run.app/`

---

*Jarvis OR Guardian — Because in every clinical setting, every second of awareness counts.*

---

### Authors

**Dr Bhavna Gupta** — Consultant Anaesthesiologist & Intensivist | [LinkedIn](https://www.linkedin.com/in/dr-bhavna-gupta)

**Aayush Gupta** — Staff Data Scientist | [LinkedIn](https://www.linkedin.com/in/gaaush/)
