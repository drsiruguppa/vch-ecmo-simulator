# ECMO-Sim Multi-Agent Architecture & Project Rules

Always adhere to [SKILL.md](./SKILL.md) for all physiological modeling, clinical rules, and the structured Bedside Telemetry output format.

## Specialized Subagent Team

1. **`ecmo-debrief-evaluator` (Attending Debrief & Physiology Evaluator)**
   - **Role**: Logs every action, order, and dial change taken by the participant across all simulation turns. Classifies each intervention (`GOOD` / Optimal, `CAUTION` / Suboptimal, `BAD` / Protocol Deviation) and explains the first-principles cardiovascular, pulmonary, cerebral autoregulatory ($PaCO_2$ vs. NIRS $rSO_2$), hematologic, and centrifugal hydraulic ($\Delta P$, $P_{in}$, $P_{out}$) mechanisms behind each outcome.
   - **Code Location**: `window.evaluateTurnActionForDebrief` in [src/multiAgentEngine.js](./src/multiAgentEngine.js) and the Attending Debrief Modal in [src/App.js](./src/App.js).

2. **`ecmo-bedside-team` (Multidisciplinary Bedside Team Co-Pilot)**
   - **Role**: Models ECMO as a multidisciplinary team sport by voicing real-time, context-aware bedside observations and hints from the **ECMO Specialist / Perfusionist**, **Bedside PICU/CICU RN**, **Pediatric Respiratory Therapist (RT)**, and **ECLS Surgeon / Echo Cardiologist**.
   - **Code Location**: `window.generateBedsideTeamHuddle` in [src/multiAgentEngine.js](./src/multiAgentEngine.js) and Case 8 in [src/scenarios.js](./src/scenarios.js).

3. **`ecmo-scenario-architect` (Neonatal & Pediatric Scenario Architect)**
   - **Role**: Designs and generates realistic neonatal and pediatric VV/VA ECMO and E-CPR scenarios with spoiler-free bedside handoffs, multi-stage turn progressions, and coherent blood gas/circuit pressure signatures.
   - **Code Location**: `window.ARCHETYPE_TEMPLATES` in [src/multiAgentEngine.js](./src/multiAgentEngine.js) and `window.ECMO_SCENARIOS` in [src/scenarios.js](./src/scenarios.js).

4. **`ecmo-physiology-engineer` (Physiology & Hydraulic Systems Engineer)**
   - **Role**: Maintains and expands the mathematical hemodynamic, gas-exchange, and Spectrum QWS hydraulic equations in [src/physiologyEngine.js](./src/physiologyEngine.js), the natural-language order parsing in [src/specialistAgent.js](./src/specialistAgent.js), and the spoiler-free pre-simulation one-page physiological briefing engine in [src/physiologyBriefing.js](./src/physiologyBriefing.js).

5. **`ecmo-app-developer` (Clinical UI/UX & Simulation Developer)**
   - **Role**: Maintains and upgrades the interactive React + Tailwind workstation interface across [index.html](./index.html), [src/App.js](./src/App.js), [src/components/TelemetryMonitor.js](./src/components/TelemetryMonitor.js), [src/components/QuantumConsole.js](./src/components/QuantumConsole.js), and [src/components/ClinicalWorkstation.js](./src/components/ClinicalWorkstation.js).

## Simulation Flow & Rules

- **Pre-Simulation Physiology Briefing**: Every simulation run must prompt the participant to review a spoiler-free, one-page foundational physiology briefing prior to commencing Turn 1 (managed by `window.PhysiologyBriefingModal` in [src/physiologyBriefing.js](./src/physiologyBriefing.js)). The briefing provides first-principles reminders on circuit hemodynamics, CO2 diffusion/cerebral autoregulation, hydraulic pressure zones, and lung-protective rest without giving away case-specific diagnostic surprises.
