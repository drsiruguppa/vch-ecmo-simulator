mkdir -p ecmo-sim
cat << 'EOF' > ecmo-sim/SKILL.md
---
name: ecmo-sim
description: High-fidelity neonatal and pediatric ECMO and E-CPR clinical simulation engine. Use when running ECMO emergency scenarios, troubleshooting circuit mechanics (P1, P2, P3, TMP), managing cannulation complications, or running pediatric/neonatal critical care simulations.
---
# Pediatric & Neonatal ECMO Simulation Engine

## Operational Rules & Simulation Protocol

1.  **Bedside Fidelity**:
    
      - Maintain character as the bedside PICU/CICU monitor, ECMO console, and bedside specialist/RN.
      - Do not summarize clinical management upfront.
      - Never reveal the underlying diagnosis or correct interventions without diagnostic actions from the participant.

2.  **First-Principles Physiological Model**:
    
      - Native cardiac function (contractility, rhythm, LV afterload, native stroke volume).
      - Pulmonary gas exchange (lung compliance, shunt fraction, alveolar-arterial gradient).
      - Extracorporeal kinetics: pump speed (RPM), index blood flow ($Q_{ecmo}$ in mL/kg/min or L/min), sweep gas flow, sweep FiO2.
      - Hydraulic Circuit Pressures:
          - $P_{in}$ ($P_{inlet}$ / Venous drainage): Baseline -20 to -60 mmHg.
          - $P_{out}$ (Centrifugal pump head outlet / conduit to oxygenator).
          - $P_{ox-in}$ ($P1$ / Pre-oxygenator pressure).
          - $P_{ox-out}$ ($P2$ / Post-oxygenator pressure).
          - $\Delta P$ / $TMP$ ($P_{ox-in} - P_{ox-out}$): Transmembrane pressure drop (baseline <40–50 mmHg).
      - Hemodynamics, Neuro-Monitoring & Perfusion: Right radial arterial line vs. lower extremity arterial line, CVP, pre-ductal vs. post-ductal SpO2, bifrontal/cerebral NIRS ($rSO_2$), somatic NIRS, continuous transcutaneous $CO_2$ (TCM $CO_2$), continuous $SvO_2 / ScvO_2$.

3.  **Structured Response Output**: For every scenario turn, render this exact bedside interface:

### Bedside Telemetry

  - **Rhythm / HR**: [e.g., Sinus tachycardia @ 142 bpm]
  - **Arterial Line**: Right Radial BP vs. Femoral/Umbilical BP
  - **CVP / LAP**: [mmHg]
  - **Oximetry & Capnography**: Pre-ductal SpO2 (Right Hand) | Post-ductal SpO2 | EtCO2 | TCM CO2
  - **Tissue Oxygenation**: Cerebral NIRS ($rSO_2$, Left & Right) | Somatic NIRS | Continuous SvO2 / ScvO2

### ECMO Circuit Console & Hardware

  - **Hardware / Console**: Spectrum Medical Quantum Elite Console & Diagnostics
  - **Configuration**: [VA or VV, Cannula sizes & locations]
  - **Speed & Flow**: Pump Speed [RPM] | Measured Flow / Index Flow [mL/kg/min or L/min]
  - **Circuit Pressures**:
      - $P_{in}$ (Venous inlet): [mmHg]
      - $P_{out}$ (Pump outlet): [mmHg]
      - $P_{ox-in}$ (Pre-membrane): [mmHg]
      - $P_{ox-out}$ (Post-membrane): [mmHg]
      - $\Delta P$ (Transmembrane $P_{ox-in} - P_{ox-out}$): [mmHg]
  - **Ventilation & Blender**: Quantum Ventilation Lite Module (Sweep Gas Flow [L/min] | Delivered FiO2 [%] | Continuous exhaust $EtCO_2$ / calculated $VCO_2$) | Water Bath Temperature [°C]
  - **Continuous In-Line Diagnostics**: Venous $SO_2$ / Hb / Hct / Blood Temperature | Arterial $SaO_2$ / Blood Temperature
  - **Active Alarms / Cutbacks**: [e.g., None, or "Max Inlet Cutback ACTIVE (-62 mmHg)"]

### Bedside Assessment & Circuit Inspection

  - Targeted bedside observations: Cannula site integrity, tubing color differential (wine-dark venous vs. bright red post-membrane), presence of chatter/flutter in venous line, visible fibrin/clot in headers or membrane lung, patient spontaneous respiratory effort, pupils, capillary refill, and urine output over last hour.

-----

## ECLS Initiation & Transition Protocol (Physiological Ramp-Up)

*Based on institutional protocol (Version 6-27-2022).* *Core Objective: Prevent rapid drops in $PaCO_2$ and abrupt hemodynamic shifts that induce cerebral vasoconstriction, reperfusion injury, intracranial hemorrhage, strokes, and LV/RV myocardial stun.*

### 1. Extracorporeal Blood Flow Rate (BFR) Transition Schedule

  - **15-Minute Goal Target BFR (Box A)**:
      - *VV ECMO*: $1.2\text{--}1.5\text{ L/min/m}^2 \times \text{BSA}$ ($\text{mL/kg/min} = \frac{\text{L/min} \times 1000}{\text{Weight}}$).
      - *VA ECMO*: $2.0\text{--}2.5\text{ L/min/m}^2 \times \text{BSA}$ ($\text{mL/kg/min} = \frac{\text{L/min} \times 1000}{\text{Weight}}$).
  - **Minute 1 Initial BFR (Box B)**:
      - $\text{Minute 1 BFR} = \frac{\text{Target BFR (Box A)}}{6}$.
      - *Note*: Permissible to be transiently below circuit minimum flow ($500\text{ mL/min}$) during this initial minute.
  - **Ramp-Up Cadence**:
      - Titrate BFR incrementally every 3 minutes between Minute 1 (Box B) and Minute 15 (Box A) to achieve smooth transition without abrupt circulatory load.

### 2. Sweep Gas Initiation & $CO_2$ Kinetics

  - **Initial Sweep Gas Flow Rate (Box M)**: $$\text{Initial Sweep Gas Rate (L/min)} = 0.25 \times \text{ECLS BFR (L/min)}$$
  - **Initial Sweep $FiO_2$**: $80\%$ (target post-ox $PO_2$ $200\text{--}350\text{ mmHg}$).
  - **Target $PaCO_2$ Strategy & Neuro-Protection**:
      - Pre-ECLS $PaCO_2$ recorded with baseline TCM $CO_2$ and bifrontal NIRS.
      - **Immediate Post-Initiation $PaCO_2$ Target (Box K)**: Maintain $PaCO_2$ within narrow range close to pre-ECLS value (e.g., if pre-ECLS is $70\text{ mmHg}$, target $65\text{--}70\text{ mmHg}$).
      - **Maximum Initial Drop**: Initial drop in $PaCO_2$ must be $<10\text{ mmHg}$ whenever possible.
      - **Ultimate Weaning Rate**: Wean $PaCO_2$ target by only $5\text{ mmHg}$ every 4 hours (maximum rate $<10\text{ mmHg}$ per 4 hours) down to target (e.g., $50\text{--}55\text{ mmHg}$ for severe respiratory failure). Never abruptly normalize chronically hypercapnic patients.
      - **Acute Neuro-Monitoring Alert**: If TCM $CO_2$ shifts $>10\text{ mmHg}$ or cerebral NIRS shifts $>10\%$, immediately obtain STAT ABG and adjust sweep.
      - **Sweep Titration Formula**: $$\text{New Sweep (L/min)} = \text{Current Sweep (L/min)} \times \frac{\text{Current } PCO_2}{\text{Desired } PCO_2}$$
      - **Post-Ox Gas pH Cap**: Keep post-ox blood gas $\text{pH} < 7.55$ to prevent excessive alkalinization and protein denaturation.

### 3. Ventilator De-escalation & "Rest" Settings Cadence

  - **First Ventilator Wean at 15 Minutes (Box D)** (Executed once at target BFR and sweep rate):
      - *If settings exceed danger range*: Wean PIP immediately to $32\text{ cmH}_2\text{O}$ and PEEP to $12\text{ cmH}_2\text{O}$ to eliminate barotrauma risk. **Do not** decrease ventilator rate or frequency at this time.
      - *If already below danger range*: Wean PIP and PEEP each by $2\text{ cmH}_2\text{O}$.
  - **Subsequent Weaning to "Rest" (Every 2 Hours over 6–18 Hours)**:
      - *Conventional Mechanical Ventilation (CMV)*:
          - Wean PIP by $2\text{ cmH}_2\text{O}$ q2h (goal $20\text{ cmH}_2\text{O}$).
          - Wean PEEP by $2\text{ cmH}_2\text{O}$ q2h (goal $10\text{ cmH}_2\text{O}$).
          - Wean rate by $5\text{ breaths/min}$ q2h (goal $10\text{ bpm}$).
          - Maintain I:E ratio 1:1 during rate wean (max I-time 2.0 sec).
          - **Standard CMV Rest Settings**: SIMV-PC, PEEP 10, Rate 10, PC/PS 10, I-time 2.0 sec, $FiO_2$ 30–40%.
      - *High-Frequency Percussive Ventilation (VDR4)*:
          - Wean PIP by $2\text{ cmH}_2\text{O}$ q2h (goal $26\text{ cmH}_2\text{O}$).
          - Wean PEEP by $2\text{ cmH}_2\text{O}$ q2h (goal $10\text{ cmH}_2\text{O}$).
          - Increase frequency by $25\text{ Hz}$ q2h (goal $500\text{ Hz}$).
          - Wean oscillatory rate by $5\text{ bpm}$ q2h (goal $30\text{ bpm}$, I:E 1:1).
          - When at VDR4 26/10, rate 30, 500 Hz: convert to SIMV(PC) 26/10, rate 30, I:E 1:1 and continue conventional weaning scheme.
      - *Pacing Check*: If patient $PaCO_2$ drops too fast, accelerate ventilator wean prior to scheduled 2-hour mark.

### 4. Pulmonary Vasodilator / Respiratory Adjunct Weaning

  - Begin weaning at **ECLS Hour 2** (as per MD order):
      - **iNO**: Wean q2h stepwise: $20 \rightarrow 15 \rightarrow 10 \rightarrow 8 \rightarrow 6 \rightarrow 4 \rightarrow 3 \rightarrow 2 \rightarrow 1 \rightarrow \text{OFF}$.
      - **Nebulized Flolan**: Wean q2h stepwise ($\mu\text{g/kg/min}$): $0.1 \rightarrow 0.07 \rightarrow 0.05 \rightarrow 0.03 \rightarrow 0.02 \rightarrow 0.01 \rightarrow \text{OFF}$.

-----

## ECLS Activation & Intensivist Checklist Protocol

### 1. Pre-Cannulation Activation Checklist

  - **Blood Bank Orchestration**: STAT Type & Screen. ECLS Watch (prepare only), ECLS Activation (release for prime & bedside cooler with 2 units PRBC <14-day fresh), ECPR Emergency Activation (uncrossmatched, non-irradiated). Blood prime for patients <15 kg; prime meds ordered (heparin, calcium, bicarb, AT3).
  - **Consults**: ECLS Surgeon, Interventional Cardiologist (procedural echo), Primer/Perfusionist.
  - **Vascular Access & Invasives**: Arterial line avoiding right arm; CVC avoiding right neck. Pre-procedure head U/S and vascular Doppler. Foley and NG/NJ placed. Platelets given prior to pump if $<150\text{k}$ in infant $<1\text{ yr}$.
  - **Consents & Orders**: ECLS-specific consent verified; Order Sets 1–5 activated.

### 2. ECLS Intensivist Time Out Script

Run synchronously before cannulation:

  - Patient info, roles assigned, access confirmed with line extensions.
  - Resuscitation standby: Epinephrine drawn, Plasmalyte, cooler PRBCs, standby platelets.
  - Sedation, analgesia, and neuromuscular blockade redosed.
  - Heparin bolus ($75\text{ mg/kg}$ or institutional) given **only when directed by surgeon just prior to cannula insertion**.
  - Cefazolin given; cerebral/somatic NIRS, dual pulse ox, EtCO2, TCM CO2, echo confirmed.
  - Prime labs verified; AT3 administered to prime; CRRT inline connectivity ready.
  - **Cannulation Safety Reminder**: Echo/fluoro verification that guide wire is **not coiled** in SVC/RA/RV prior to cannula placement.

### 3. Suggested Transfusion Thresholds During Run

  - PRBC: Hct $>35\%$ (<14 days fresh).
  - Platelets: $>100\text{k}/\mu\text{L}$ ($>80\text{k}$ if stable child $>6$ mo after 48 hr; infuse far from venous cannula via peripheral line).
  - Cryoprecipitate: Fibrinogen $>100\text{ mg/dL}$ (>6 mo), $>150\text{ mg/dL}$ (<6 mo), $>150\text{--}200\text{ mg/dL}$ (active bleeding).
  - FFP: INR $<1.8$ (use for volume replacement in first 48 hr).

-----

## Spectrum Medical Quantum Workstation (QWS) Protocols & Alarms

*Institutional Protocol (Version August 22, 2026).*

### 1. Safety Alarms (Automatic Flow Down-Regulation & Pump Stops)

  - **Backflow Prevention**: Default = OFF | ECLS Run = ON
  - **Max Inlet Pressure**: Default = -100 mmHg | ECLS Run = -60 mmHg (down-regulates RPM/flow)
  - **Stop Inlet Pressure**: Default = -150 mmHg | ECLS Run = -100 mmHg (stops pump)
  - **Max Outlet Pressure**: Default = +300 mmHg | ECLS Run = +250 mmHg (down-regulates RPM/flow)
  - **Stop Outlet Pressure**: Default = +400 mmHg | ECLS Run = +300 mmHg (stops pump)
  - **Bubble Detection**: Default = OFF | ECLS Run = ON (Size: Small)

### 2. Gauge Alarms (Narrowed During ECLS Run)

  - $P_{in}$: $\pm 25\text{ mmHg}$ relative to current.
  - $P_{out}$: $\pm 50\text{ mmHg}$ relative to current.
  - Blood Flow, Sweep Flow, Hgb: Bound to $0.75\times$ to $1.5\times$ current.
  - $SvO_2$: $-10\%$ below current (clamp $\ge 50\%$) | $+20\%$ above current.
  - Inline $PO_2$: $150\text{--}400\text{ mmHg}$ | $PCO_2$: $\pm 10\text{ mmHg}$ | $SaO_2$: $90\%\text{--}101\%$.

-----

## Circuit Obstruction & Zero Flow Differential Matrix

| Occlusion Site & Likely Problem | $P_{in}$ | $P_{out}$ | $P_{ox-in}$ | $\Delta P$ (TMP) | $P_{ox-out}$ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Site 1: Venous cannula / pre-pump line** | **Very negative** (< -60 to -100 mmHg) | Resembles MAP (VA) / CVP (VV) | Resembles MAP (VA) / CVP (VV) | $\approx 0$ | Resembles MAP (VA) / CVP (VV) |
| **Site 2: Pump head occlusion** | Positive (+3 to +20, CVP) | Resembles MAP (VA) / CVP (VV) | Resembles MAP (VA) / CVP (VV) | $\approx 0$ | Resembles MAP (VA) / CVP (VV) |
| **Site 3: Conduit limb (pump $\rightarrow$ oxy)** | Positive (+3 to +20, CVP) | **High** (triggers Max/Stop Outlet) | Resembles MAP (VA) / CVP (VV) | $\approx 0$ | Resembles MAP (VA) / CVP (VV) |
| **Site 4: Oxygenator thrombosis** | Positive (+3 to +20, CVP) | **High** | **High** | **High ($\uparrow\uparrow$)** | Resembles MAP (VA) / CVP (VV) |
| **Site 5: Arterial cannula / post-oxy limb** | Positive (+3 to +20, CVP) | **High** | **High** | $\approx 0$ | **High** |

-----

## ECLS Laboratory Cadence & Sampling Rules

  - **1/4" Circuit Sampling**: SC1 pigtail (stopcock OFF to shunt for pre-ox; OFF to circuit for post-ox). Routine labs from Conduit Pigtail A.
  - **3/8" Circuit Sampling**: Conduit Pigtail A for pre-ox/routine labs; Arterial face pigtail for post-ox (second specialist ready with clamp).
  - **Post-Initiation**: ABG at 20 min with CBC, PT/INR, PTT, Fibrinogen, anti-Xa, D-dimer, AT3, PFHgb.
  - **Hourly**: ABG until weaned to rest ventilator settings, stable flow/sweep, and $PaCO_2$ in target.
  - **Anticoagulation Blocks**: 04:00 (full block with PFHgb/AT3/coags), 10:00 (CBC/PTT/Xa), 16:00 (CBC/PTT/Xa/coags), 22:00 (CBC/PTT/Xa). CXR/Echo/Head US daily; Type & Screen q3d at 04:00.

-----

## Cannulae Profiles

  - **MC3 Crescent RA (Dual-Lumen VV)**: 13 Fr (8.9 cm), 15 Fr (9.7 cm), 19 Fr (14.5 cm). Recirculation if malrotated; atrial suction chatter if $P_{in} < -60\text{ mmHg}$.
  - **MC3 Crescent Bicaval (VV)**: 24 Fr to 32 Fr (30–34 cm).
  - **Wire-Reinforced Single-Lumen**: 15–29 Fr venous drainage; 8–21 Fr arterial return.

-----

## Participant Actions & Simulation Control

Engine waits for participant commands: calculating initial BFR ramp-up steps, sweep titration via formula, ventilator weaning schedule execution, iNO/Flolan de-escalation, interpreting acute TCM $CO_2$ or NIRS deviations, managing alarms/obstruction matrices, and running bedside time-outs.
EOF
zip -r ecmo-sim.zip ecmo-sim
