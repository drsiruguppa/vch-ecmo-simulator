// Embedded SKILL.md operational rules, structured output template, and AI system prompt builder

window.ECMO_SKILL_MD = `# Pediatric & Neonatal ECMO Simulation Engine

## Operational Rules & Simulation Protocol

1. **Bedside Fidelity**:
   - Maintain character as the bedside PICU/CICU monitor, ECMO console, and bedside specialist/RN.
   - Do not summarize clinical management upfront.
   - Never reveal the underlying diagnosis or correct interventions without diagnostic actions from the participant.

2. **First-Principles Physiological Model**:
   - Native cardiac function (contractility, rhythm, LV afterload, native stroke volume).
   - Pulmonary gas exchange (lung compliance, shunt fraction, alveolar-arterial gradient).
   - Extracorporeal kinetics: pump speed (RPM), index blood flow (Q_ecmo in mL/kg/min or L/min), sweep gas flow, sweep FiO2.
   - Hydraulic Circuit Pressures:
     - P_in (P_inlet / Venous drainage): Baseline -20 to -60 mmHg.
     - P_out (Centrifugal pump head outlet / conduit to oxygenator).
     - P_ox-in (P1 / Pre-oxygenator pressure).
     - P_ox-out (P2 / Post-oxygenator pressure).
     - Delta P / TMP (P_ox-in - P_ox-out): Transmembrane pressure drop (baseline <40-50 mmHg).
   - Hemodynamics, Neuro-Monitoring & Perfusion: Right radial arterial line vs. lower extremity arterial line, CVP, pre-ductal vs. post-ductal SpO2, bifrontal/cerebral NIRS (rSO2), somatic NIRS, continuous transcutaneous CO2 (TCM CO2), continuous SvO2 / ScvO2.

3. **Structured Response Output**: For every scenario turn, render this exact bedside interface:
### Bedside Telemetry
### ECMO Circuit Console & Hardware
### Bedside Assessment & Circuit Inspection
`;

window.formatStructuredTurnMarkdown = function(state) {
  const { patient, circuit, telemetry, vent, assessment } = state;
  const indexFlowMlKg = Math.round((circuit.flowLpm * 1000) / patient.weightKg);
  const bsaFlow = (circuit.flowLpm / patient.bsa).toFixed(2);
  const alarmsText = circuit.activeAlarms && circuit.activeAlarms.length > 0
    ? circuit.activeAlarms.join(' | ')
    : 'None';

  const isOnEcmo = circuit.onEcmo !== false;
  const consoleSection = isOnEcmo
    ? `### ECMO Circuit Console & Hardware

  - **Hardware / Console**: Spectrum Medical Quantum Elite Console & Diagnostics (${patient.tubingSize} Circuit)
  - **Configuration**: ${patient.mode} ECMO — ${patient.cannulaDesc}
  - **Speed & Flow**: Pump Speed ${circuit.rpm} RPM | Measured Flow ${circuit.flowLpm.toFixed(2)} L/min (${indexFlowMlKg} mL/kg/min | ${bsaFlow} L/min/m²)
  - **Circuit Pressures**:
      - $P_{in}$ (Venous inlet): ${circuit.pIn} mmHg
      - $P_{out}$ (Pump outlet): +${circuit.pOut} mmHg
      - $P_{ox-in}$ (Pre-membrane): +${circuit.pOxIn} mmHg
      - $P_{ox-out}$ (Post-membrane): +${circuit.pOxOut} mmHg
      - $\\Delta P$ (Transmembrane $P_{ox-in} - P_{ox-out}$): ${circuit.tmp} mmHg
  - **Ventilation & Blender**: Quantum Ventilation Lite Module (Sweep Gas Flow ${circuit.sweepLpm.toFixed(2)} L/min | Delivered FiO2 ${circuit.sweepFio2}% | Continuous exhaust $EtCO_2$ ${circuit.exhaustCo2} mmHg / calculated $VCO_2$ ${circuit.vco2} mL/min) | Water Bath Temperature ${circuit.waterTemp.toFixed(1)} °C
  - **Continuous In-Line Diagnostics**: Venous $SO_2$ ${circuit.svo2}% / Hb ${patient.labs.hb.toFixed(1)} g/dL / Hct ${patient.labs.hct}% / Blood Temp ${circuit.bloodTemp.toFixed(1)} °C | Arterial $SaO_2$ ${circuit.postOxSao2}% / Post-Ox $PO_2$ ${circuit.postOxPo2} mmHg / Blood Temp ${circuit.bloodTemp.toFixed(1)} °C
  - **Active Alarms / Cutbacks**: ${alarmsText}`
    : `### ECMO Circuit Console & Hardware

  - **Hardware / Console**: Spectrum Medical Quantum Elite Console & Diagnostics (${patient.tubingSize} Circuit) — **STANDBY MODE**
  - **Status**: ⚠️ PRE-CANNULATION / CIRCUIT PRIMED & CLAMPED AT BEDSIDE (Not on Bypass)
  - **Speed & Flow**: STANDBY (-- RPM | -- L/min | Clamped)
  - **Circuit Pressures**: Clamped ($P_{in}$: -- mmHg | $P_{out}$: -- mmHg | $P_{ox-in}$: -- mmHg | $P_{ox-out}$: -- mmHg | $\\Delta P$: -- mmHg)
  - **Ventilation & Blender**: Standby (-- L/min sweep | Blender Standby)
  - **Continuous In-Line Diagnostics**: Standby (-- / --)
  - **Active Alarms**: STANDBY • PRE-CANNULATION (CLAMPED)`;

  return `### Bedside Telemetry

  - **Rhythm / HR**: ${telemetry.rhythm} @ ${telemetry.hr} bpm
  - **Arterial Line**: Right Radial ${telemetry.radialSbp}/${telemetry.radialDbp} (MAP ${telemetry.radialMap}) mmHg vs. ${patient.lowerArtSite || 'Femoral'} ${telemetry.femSbp}/${telemetry.femDbp} (MAP ${telemetry.femMap}) mmHg
  - **CVP / LAP**: CVP ${telemetry.cvp} mmHg${telemetry.lap !== null ? ` | LAP ${telemetry.lap} mmHg` : ''}
  - **Oximetry & Capnography**: Pre-ductal SpO2 (Right Hand) ${telemetry.preSpo2}% | Post-ductal SpO2 ${telemetry.postSpo2}% | EtCO2 ${telemetry.etco2} mmHg | TCM CO2 ${telemetry.tcmCo2} mmHg
  - **Tissue Oxygenation**: Cerebral NIRS ($rSO_2$, Left ${telemetry.nirsLeft}% & Right ${telemetry.nirsRight}%) | Somatic NIRS ${telemetry.nirsSomatic}% | Continuous ${patient.mode === 'VV' ? 'ScvO2' : 'SvO2'} ${circuit.svo2 !== null ? `${circuit.svo2}%` : '--'}

${consoleSection}

### Bedside Assessment & Circuit Inspection

  - **Cannula & Circuit**: ${assessment.circuitNote}
  - **Ventilator & Adjuncts**: ${vent.mode === 'VDR4' ? `VDR4 ${vent.pip}/${vent.peep} cmH2O, Osc Rate ${vent.rate} bpm, Freq ${vent.hz} Hz, FiO2 ${vent.fio2}%` : `SIMV-PC ${vent.pip}/${vent.peep} cmH2O, Rate ${vent.rate} bpm, I-time ${vent.iTime.toFixed(1)}s, FiO2 ${vent.fio2}%`}${vent.inoPpm > 0 ? ` | iNO ${vent.inoPpm} ppm` : ''}${vent.flolan > 0 ? ` | Nebulized Flolan ${vent.flolan} mcg/kg/min` : ''}
  - **Patient Exam**: ${assessment.patientNote}`;
};
