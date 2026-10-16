// Multi-Agent Clinical Simulation Engine:
// 1. ecmo-debrief-evaluator: Action-by-Action Attending Debrief & First-Principles Physiology Evaluator
// 2. ecmo-bedside-team: Multidisciplinary Bedside Team Co-Pilot (Perfusionist, PICU RN, RT, Surgeon/Echo)
// 3. ecmo-scenario-architect: Neonatal & Pediatric ECMO Scenario Generator

// ============================================================================
// SUBAGENT 1: ecmo-debrief-evaluator (Action-by-Action Physiological Debrief)
// ============================================================================
window.evaluateTurnActionForDebrief = function(actionText, prevState, nextState, turnNumber) {
  const lower = (actionText || '').toLowerCase();
  const prevTargets = window.computeProtocolTargets(prevState);
  const nextTargets = window.computeProtocolTargets(nextState);
  const evaluations = [];

  // 1. Evaluate Blood Flow Rate (BFR) / RPM Changes
  const flowChanged = Math.abs(nextState.circuit.flowLpm - prevState.circuit.flowLpm) >= 0.02 || nextState.circuit.rpm !== prevState.circuit.rpm;
  if (flowChanged) {
    const flowJump = nextState.circuit.flowLpm - prevState.circuit.flowLpm;
    const maxSafeStep = Math.max(0.08, nextTargets.boxATargetLpm * 0.35);

    if (nextState.elapsedMinutes <= 4 && Math.abs(nextState.circuit.flowLpm - nextTargets.boxBTargetLpm) <= Math.max(0.05, nextTargets.boxBTargetLpm * 0.4)) {
      evaluations.push({
        turn: turnNumber,
        minute: nextState.elapsedMinutes,
        action: `Initiated / Adjusted BFR to ${nextState.circuit.flowLpm.toFixed(2)} L/min (${nextState.circuit.rpm} RPM)`,
        verdict: 'GOOD',
        verdictLabel: '✅ Optimal (Protocol-Adherent)',
        feedback: `Appropriate Minute 1–4 BFR initiation near Box B target (${nextTargets.boxBTargetLpm} L/min = Box A / 6).`,
        physiology: `First-Principles Physiology: Starting ECLS at 1/6th of target flow (Box B) prevents abrupt right atrial decompression and avoids a sudden surge in systemic arterial afterload (on VA ECMO) or pulmonary vascular shear (on VV ECMO). Rapid transition to full flow causes acute shifts in cerebral blood flow velocity and left ventricular wall stress (myocardial stun).`
      });
    } else if (flowJump > maxSafeStep && prevState.elapsedMinutes < 15) {
      evaluations.push({
        turn: turnNumber,
        minute: nextState.elapsedMinutes,
        action: `Ramped BFR abruptly from ${prevState.circuit.flowLpm.toFixed(2)} to ${nextState.circuit.flowLpm.toFixed(2)} L/min`,
        verdict: 'BAD',
        verdictLabel: '❌ Hazardous (Abrupt Hemodynamic Ramp)',
        feedback: `BFR was increased by +${flowJump.toFixed(2)} L/min in a single step, exceeding the 3-minute incremental ramp-up schedule.`,
        physiology: `First-Principles Physiology: Abruptly increasing extracorporeal blood flow causes a sudden rise in MAP and LV afterload (in VA ECMO) and rapid washout of dissolved CO2 before sweep gas can be equilibrated. In neonates and infants with impaired cerebral autoregulation, sudden hemodynamic and osmotic/pH shifts markedly increase the risk of Germinal Matrix / Intracranial Hemorrhage (ICH) and reperfusion injury.`
      });
    } else if (nextState.elapsedMinutes >= 15 && nextState.circuit.flowLpm >= nextTargets.boxAMinLpm * 0.9 && nextState.circuit.flowLpm <= nextTargets.boxAMaxLpm * 1.1) {
      evaluations.push({
        turn: turnNumber,
        minute: nextState.elapsedMinutes,
        action: `Achieved 15-Minute Target BFR of ${nextState.circuit.flowLpm.toFixed(2)} L/min`,
        verdict: 'GOOD',
        verdictLabel: '✅ Optimal (Box A Target Achieved)',
        feedback: `Reached full target support within the Box A goal (${nextTargets.boxAMinLpm}–${nextTargets.boxAMaxLpm} L/min for ${nextState.patient.mode} ECMO).`,
        physiology: `First-Principles Physiology: Oxygen delivery (DO2 = Q × CaO2) is now matched to systemic metabolic oxygen consumption (VO2), normalizing mixed venous saturation (SvO2) and clearing tissue lactic acidosis via aerobic ATP restoration.`
      });
    } else {
      evaluations.push({
        turn: turnNumber,
        minute: nextState.elapsedMinutes,
        action: `Adjusted Pump Speed to ${nextState.circuit.rpm} RPM (Flow ${nextState.circuit.flowLpm.toFixed(2)} L/min)`,
        verdict: 'GOOD',
        verdictLabel: '✅ Incremental Flow Titration',
        feedback: `Controlled adjustment of centrifugal pump speed along the ramp curve.`,
        physiology: `First-Principles Physiology: Centrifugal pumps generate non-occlusive pressure head proportional to RPM² and blood viscosity. Gradual RPM titration maintains laminar venous drainage without inducing atrial wall suction chatter.`
      });
    }
  }

  // 2. Evaluate Sweep Gas & PaCO2 Kinetics
  const sweepChanged = Math.abs(nextState.circuit.sweepLpm - prevState.circuit.sweepLpm) >= 0.01;
  const paco2DropFromPre = nextState.patient.preEclsPaco2 - nextState.telemetry.paco2;
  const maxAllowedDrop = 10 + Math.floor(nextState.elapsedMinutes / 240) * 5;

  if (sweepChanged || (paco2DropFromPre > maxAllowedDrop && prevState.telemetry.paco2 !== nextState.telemetry.paco2)) {
    if (paco2DropFromPre > maxAllowedDrop + 2) {
      evaluations.push({
        turn: turnNumber,
        minute: nextState.elapsedMinutes,
        action: `Sweep Gas at ${nextState.circuit.sweepLpm.toFixed(2)} L/min -> PaCO2 dropped to ${nextState.telemetry.paco2} mmHg (Δ -${paco2DropFromPre} mmHg from Pre-ECLS ${nextState.patient.preEclsPaco2} mmHg)`,
        verdict: 'BAD',
        verdictLabel: '❌ Neuro-Protection Alert (Excessive PaCO2 Drop)',
        feedback: `PaCO2 dropped ${paco2DropFromPre} mmHg below pre-ECLS baseline (protocol limit: <10 mmHg initial drop, then 5 mmHg q4h). Cerebral NIRS fell to ${nextState.telemetry.nirsLeft}%/${nextState.telemetry.nirsRight}%.`,
        physiology: `First-Principles Physiology: CO2 rapidly crosses the blood-brain barrier while bicarbonate (HCO3-) equilibrates slowly over 6–24 hours via choroid plexus transport. A rapid fall in PaCO2 causes acute perivascular CSF alkalosis (decreased [H+]), triggering potent cerebral arteriolar smooth muscle vasoconstriction. Cerebral blood flow drops ~3–4% for every 1 mmHg fall in PaCO2, causing acute cerebral ischemia (reflected by falling Bifrontal NIRS rSO2) and risking ischemic stroke or rebound hemorrhage.`
      });
    } else if (nextState.telemetry.postOxPh >= 7.55 && nextState.circuit.sweepLpm > 0) {
      evaluations.push({
        turn: turnNumber,
        minute: nextState.elapsedMinutes,
        action: `Sweep Gas at ${nextState.circuit.sweepLpm.toFixed(2)} L/min -> Post-Ox pH ${nextState.telemetry.postOxPh}`,
        verdict: 'CAUTION',
        verdictLabel: '⚠️ Exceeded Post-Ox pH Cap (>=7.55)',
        feedback: `Post-oxygenator blood gas pH reached ${nextState.telemetry.postOxPh}, exceeding the institutional cap of <7.55.`,
        physiology: `First-Principles Physiology: Severe alkalemia inside the membrane lung (pH >= 7.55) shifts the oxyhemoglobin dissociation curve sharply to the left (Bohr effect), impairing oxygen unloading at the tissue level, promoting ionized hypocalcemia (increasing myocardial irritability), and risking plasma protein denaturation.`
      });
    } else if (sweepChanged && nextState.circuit.sweepLpm > 0) {
      evaluations.push({
        turn: turnNumber,
        minute: nextState.elapsedMinutes,
        action: `Titrated Sweep Gas to ${nextState.circuit.sweepLpm.toFixed(2)} L/min (FiO2 ${nextState.circuit.sweepFio2}%) -> PaCO2 ${nextState.telemetry.paco2} mmHg`,
        verdict: 'GOOD',
        verdictLabel: '✅ Optimal Neuro-Protective Sweep Titration',
        feedback: `Maintained PaCO2 at ${nextState.telemetry.paco2} mmHg (Δ ${paco2DropFromPre} mmHg from Pre-ECLS ${nextState.patient.preEclsPaco2} mmHg) with stable Cerebral NIRS (${nextState.telemetry.nirsLeft}%/${nextState.telemetry.nirsRight}%).`,
        physiology: `First-Principles Physiology: Membrane lung CO2 clearance is governed by the Fick diffusion gradient and sweep gas ventilation rate (New Sweep = Current Sweep × Current PCO2 / Desired PCO2). Keeping ΔPaCO2 < 10 mmHg preserves perivascular [H+] homeostasis and prevents cerebral vasoconstriction.`
      });
    }
  }

  // 3. Evaluate QWS Safety Alarms Activation
  const prevAlarmsOk = prevState.circuit.alarms.backflowPrevention && prevState.circuit.alarms.maxInlet === -60 && prevState.circuit.alarms.maxOutlet === 250;
  const nextAlarmsOk = nextState.circuit.alarms.backflowPrevention && nextState.circuit.alarms.maxInlet === -60 && nextState.circuit.alarms.maxOutlet === 250;
  if (!prevAlarmsOk && nextAlarmsOk) {
    evaluations.push({
      turn: turnNumber,
      minute: nextState.elapsedMinutes,
      action: 'Transitioned Spectrum QWS Console Alarms from Default to ECLS Run Mode',
      verdict: 'GOOD',
      verdictLabel: '✅ Optimal Circuit Safety Configuration',
      feedback: 'Enabled Backflow Prevention, Inlet (-60/-100 mmHg), Outlet (+250/+300 mmHg), and Small Bubble Detection.',
      physiology: `First-Principles Physiology & Hydraulics: Centrifugal pumps are non-occlusive; if pump head pressure falls below patient MAP (in VA ECMO), retrograde arterial-to-venous exsanguination occurs unless the Backflow Prevention clamp/speed floor is active. Setting Max Inlet Cutback to -60 mmHg prevents extreme negative pressure cavitation (dissolved gas microemboli pull-out of solution) and hemolysis (elevated Plasma Free Hemoglobin).`
    });
  }

  // 4. Evaluate Ventilator Weaning (Box D & Rest Settings)
  const ventChanged = nextState.vent.pip !== prevState.vent.pip || nextState.vent.peep !== prevState.vent.peep || nextState.vent.rate !== prevState.vent.rate || nextState.vent.mode !== prevState.vent.mode;
  if (ventChanged) {
    if (nextState.elapsedMinutes < 12 && (nextState.vent.pip < prevState.vent.pip || nextState.vent.rate < prevState.vent.rate)) {
      evaluations.push({
        turn: turnNumber,
        minute: nextState.elapsedMinutes,
        action: `Weaned Ventilator at Minute ${nextState.elapsedMinutes} (Prior to 15-Minute Target BFR)`,
        verdict: 'CAUTION',
        verdictLabel: '⚠️ Premature Ventilator Wean (<15 Min)',
        feedback: `Ventilator settings were reduced at Minute ${nextState.elapsedMinutes} before achieving 15-minute target ECLS BFR and sweep equilibrium.`,
        physiology: `First-Principles Physiology: Weaning native lung ventilation before extracorporeal blood flow and sweep gas reach target capacity causes acute hypoxemia and hypercapnic acidosis during the low-flow transition window.`
      });
    } else if (prevState.vent.pip > 32 && nextState.vent.pip <= 32 && nextState.vent.rate < prevState.vent.rate && nextState.elapsedMinutes < 45) {
      evaluations.push({
        turn: turnNumber,
        minute: nextState.elapsedMinutes,
        action: `Reduced Both Danger-Range PIP (${prevState.vent.pip}->${nextState.vent.pip}) AND Ventilator Rate (${prevState.vent.rate}->${nextState.vent.rate}) Simultaneously at First Wean`,
        verdict: 'CAUTION',
        verdictLabel: '⚠️ Protocol Deviation on First Vent Wean (Box D)',
        feedback: `Protocol specifies weaning danger-range PIP to 32 and PEEP to 12 at 15 minutes WITHOUT decreasing ventilator rate or frequency on the first wean.`,
        physiology: `First-Principles Physiology: Dropping both driving pressure and respiratory rate simultaneously at Minute 15 causes an abrupt change in native alveolar minute ventilation (VE), destabilizing PaCO2 kinetics right after the BFR ramp.`
      });
    } else {
      evaluations.push({
        turn: turnNumber,
        minute: nextState.elapsedMinutes,
        action: `Ventilator Weaned to ${nextState.vent.mode} ${nextState.vent.pip}/${nextState.vent.peep} cmH2O, Rate ${nextState.vent.rate} bpm, FiO2 ${nextState.vent.fio2}%`,
        verdict: 'GOOD',
        verdictLabel: '✅ Optimal Lung-Protective De-escalation',
        feedback: `Stepwise reduction in mechanical ventilator mechanical power toward lung rest.`,
        physiology: `First-Principles Physiology: Once extracorporeal gas exchange supports VO2 and VCO2, reducing transpulmonary driving pressure (ΔP = PIP - PEEP) and FiO2 halts ventilator-induced lung injury (VILI—barotrauma, volutrauma, atelectrauma, and hyperoxic biotrauma) while PEEP 10–12 cmH2O maintains alveolar recruitment above closing capacity.`
      });
    }
  }

  // 5. Evaluate iNO / Flolan Weaning
  if (nextState.vent.inoPpm !== prevState.vent.inoPpm || nextState.vent.flolan !== prevState.vent.flolan) {
    if (nextState.elapsedMinutes < 120) {
      evaluations.push({
        turn: turnNumber,
        minute: nextState.elapsedMinutes,
        action: `Weaned Pulmonary Vasodilator (iNO/Flolan) at Minute ${nextState.elapsedMinutes}`,
        verdict: 'CAUTION',
        verdictLabel: '⚠️ Early Vasodilator Wean (Protocol Starts at Hour 2)',
        feedback: `Pulmonary vasodilator weaning was initiated prior to ECLS Hour 2 (120 minutes).`,
        physiology: `First-Principles Physiology: Abrupt or early withdrawal of exogenous nitric oxide (cGMP pathway) or prostacyclin (cAMP pathway) before ECLS hemodynamic stabilization can trigger acute rebound pulmonary vasoconstriction, spiking RV afterload.`
      });
    } else {
      evaluations.push({
        turn: turnNumber,
        minute: nextState.elapsedMinutes,
        action: `Stepwise Wean of Pulmonary Vasodilators (iNO ${nextState.vent.inoPpm} ppm / Flolan ${nextState.vent.flolan} mcg/kg/min)`,
        verdict: 'GOOD',
        verdictLabel: '✅ Optimal Stepwise Vasodilator Weaning (Hour 2+)',
        feedback: `Gradual q2h de-escalation of pulmonary vasodilators after ECLS Hour 2.`,
        physiology: `First-Principles Physiology: Exogenous iNO down-regulates endogenous endothelial nitric oxide synthase (eNOS). Stepwise weaning (20->15->10->8->6->4->3->2->1->OFF) allows endogenous eNOS recovery and prevents rebound pulmonary hypertensive crisis.`
      });
    }
  }

  // 6. Evaluate Transfusions, Platelets Route, Echo, and Mechanical Troubleshooting
  if (lower.includes('platelet')) {
    const viaCircuit = lower.includes('circuit') || lower.includes('pre-ox') || lower.includes('venous cannula');
    if (viaCircuit) {
      evaluations.push({
        turn: turnNumber,
        minute: nextState.elapsedMinutes,
        action: 'Infused Platelets Directly Into ECLS Circuit / Near Venous Cannula',
        verdict: 'BAD',
        verdictLabel: '❌ Critical Protocol Violation (Circuit Platelet Infusion)',
        feedback: 'Platelets were infused into the circuit rather than via a peripheral IV far from the venous drainage cannula.',
        physiology: `First-Principles Physiology: Concentrated platelets exposed immediately to high centrifugal pump shear stress and the foreign hollow-fiber polymethylpentene (PMP) oxygenator surface undergo shear-induced vWF/GPIIb-IIIa activation and degranulation, causing acute oxygenator membrane thrombosis (spiking ΔP/TMP and failing gas transfer).`
      });
    } else {
      evaluations.push({
        turn: turnNumber,
        minute: nextState.elapsedMinutes,
        action: 'Transfused Platelets via Peripheral IV Line (Far from Venous Cannula)',
        verdict: 'GOOD',
        verdictLabel: '✅ Optimal Platelet Administration Route',
        feedback: `Repleted platelets to ${nextState.patient.labs.platelets}k/µL via peripheral route per protocol.`,
        physiology: `First-Principles Physiology: Infusing platelets into a peripheral vein allows systemic dilution and pulmonary/capillary dispersion before reaching the venous drainage cannula, preventing localized platelet plug formation in the oxygenator header.`
      });
    }
  }

  if (lower.includes('prbc') || lower.includes('packed red')) {
    evaluations.push({
      turn: turnNumber,
      minute: nextState.elapsedMinutes,
      action: `Transfused <14-Day Fresh PRBCs (Hct ${prevState.patient.labs.hct}% -> ${nextState.patient.labs.hct}%)`,
      verdict: 'GOOD',
      verdictLabel: '✅ Optimal Oxygen Carrying Capacity & Preload Restoration',
      feedback: `Maintained Hct >35% using fresh (<14-day) PRBCs.`,
      physiology: `First-Principles Physiology: Arterial oxygen content is dominated by hemoglobin-bound O2 (CaO2 = 1.34 × Hb × SaO2 + 0.003 × PaO2). Raising Hct >35% allows adequate systemic DO2 at lower ECLS pump flows (reducing shear hemolysis) while fresh (<14-day) RBCs preserve 2,3-DPG levels for optimal tissue O2 unloading.`
    });
  }

  if (prevState.complications.wireCoiled && !nextState.complications.wireCoiled) {
    evaluations.push({
      turn: turnNumber,
      minute: nextState.elapsedMinutes,
      action: 'Verified Guide Wire on Procedural Echo/Fluoro & Redirected Coiled Wire into IVC',
      verdict: 'GOOD',
      verdictLabel: '✅ Life-Saving Cannulation Safety Intervention',
      feedback: 'Detected and corrected coiled guide wire in RA/SVC prior to cannula insertion.',
      physiology: `First-Principles Anatomy & Mechanics: Advancing a rigid dilator or large-bore wire-reinforced cannula over a guide wire coiled in the thin-walled neonatal Right Atrium, Right Ventricle, or Coronary Sinus causes catastrophic cardiac perforation and acute pericardial tamponade.`
    });
  }

  if (prevState.circuit.recirculationFraction >= 0.30 && nextState.circuit.recirculationFraction < 0.15) {
    evaluations.push({
      turn: turnNumber,
      minute: nextState.elapsedMinutes,
      action: 'Diagnosed VV Recirculation & Repositioned Malrotated Dual-Lumen Cannula Under Echo',
      verdict: 'GOOD',
      verdictLabel: '✅ Optimal Resolution of VV Recirculation',
      feedback: `Reduced recirculation fraction from ${Math.round(prevState.circuit.recirculationFraction * 100)}% to ${Math.round(nextState.circuit.recirculationFraction * 100)}%, restoring color differential and systemic SpO2 (${nextState.telemetry.postSpo2}%).`,
      physiology: `First-Principles Physiology: In dual-lumen VV ECMO (MC3 Crescent RA), oxygenated blood must exit the return port directed toward the tricuspid valve. If malrotated toward the caval/atrial drainage ports, oxygenated blood is immediately sucked back into the circuit (high SvO2 ~90%+ with low patient SpO2), reducing effective systemic oxygen delivery.`
    });
  }

  if (prevState.circuit.obstructionSite === 4 && nextState.circuit.obstructionSite === 0) {
    evaluations.push({
      turn: turnNumber,
      minute: nextState.elapsedMinutes,
      action: 'Identified Site 4 Oxygenator Thrombosis (High P_out, High P_ox-in, High ΔP/TMP) & Exchanged Oxygenator',
      verdict: 'GOOD',
      verdictLabel: '✅ Definitive Resolution of Oxygenator Failure',
      feedback: `Correctly localized Site 4 obstruction via transmembrane pressure gradient (ΔP = P1 - P2) and exchanged the thrombosed membrane.`,
      physiology: `First-Principles Hydraulics: By Darcy's Law / Poiseuille's Law (ΔP = Q × R), thrombus deposition inside the oxygenator hollow-fiber bundle increases internal resistance R, causing pre-membrane pressure (P_ox-in) and pump outlet pressure (P_out) to spike while post-membrane pressure (P_ox-out) remains normal/low—producing a pathognomonic rise in ΔP (TMP) and impaired gas diffusion.`
    });
  }

  if (!prevState.complications?.tamponade && nextState.complications?.tamponade) {
    evaluations.push({
      turn: turnNumber,
      minute: nextState.elapsedMinutes,
      action: 'Advanced Vascular Cannula Without Verifying Guide Wire Alignment on Echo/Fluoro',
      verdict: 'BAD',
      verdictLabel: '❌ Critical Adverse Event (Cardiac Perforation & Tamponade)',
      feedback: 'Cannula was advanced over an unverified, coiled guide wire, causing cardiac wall perforation, hemopericardium, and acute cardiac tamponade.',
      physiology: `First-Principles Anatomy: Advancing a rigid vascular dilator over a coiled guide wire directs force against the thin-walled neonatal right atrium or ventricle, perforating into the pericardial space. Intrapericardial pressure rises rapidly, equalizing with intracardiac pressures, preventing venous return and causing immediate obstructive cardiovascular collapse.`
    });
  }

  if (prevState.complications?.tamponade && !nextState.complications?.tamponade) {
    evaluations.push({
      turn: turnNumber,
      minute: nextState.elapsedMinutes,
      action: 'Performed Emergency Subxiphoid Pericardiocentesis (Evacuated 40 mL Hemopericardium)',
      verdict: 'GOOD',
      verdictLabel: '✅ Life-Saving Rescue Procedure',
      feedback: 'Aspirated hemopericardium, immediately relieving cardiac compression and restoring systemic perfusion.',
      physiology: `First-Principles Hemodynamics: Evacuating even 15–30 mL from a tense pericardial sac dramatically shifts the steep cardiac pressure-volume curve downward, eliminating diastolic RV compression, restoring trans-pulmonary venous return, and rebounding stroke volume and MAP.`
    });
  }

  if (!prevState.complications?.pneumothorax && nextState.complications?.pneumothorax) {
    evaluations.push({
      turn: turnNumber,
      minute: nextState.elapsedMinutes,
      action: `Maintained Danger-Range PIP (${nextState.vent.pip} cmH2O) Past Minute 15 on Full ECMO Support`,
      verdict: 'BAD',
      verdictLabel: '❌ Critical Protocol Deviation (Barotrauma & Tension Pneumothorax)',
      feedback: 'Failed to execute Box D First Ventilator Wean (PIP to 32, PEEP to 12) at Minute 15, causing alveolar rupture and tension pneumothorax.',
      physiology: `First-Principles Pulmonary Mechanics: Once extracorporeal gas exchange is established, high positive inspiratory pressures (PIP > 32 cmH2O) deliver unnecessary mechanical power to diseased, non-compliant alveoli. Alveolar overdistension (volutrauma) and high shear stress rupture terminal bronchoalveolar junctions, creating an uncontained one-way pleural air leak that compresses the mediastinum and impairs IVC/SVC venous return.`
    });
  }

  if (prevState.complications?.pneumothorax && !nextState.complications?.pneumothorax) {
    evaluations.push({
      turn: turnNumber,
      minute: nextState.elapsedMinutes,
      action: 'Performed Emergency Needle Thoracostomy / Chest Tube Placement (Decompressed Tension PTX)',
      verdict: 'GOOD',
      verdictLabel: '✅ Life-Saving Thoracic Decompression',
      feedback: 'Relieved pleural tension, re-expanded right lung, and restored systemic venous return.',
      physiology: `First-Principles Mechanics: Decompressing positive intrapleural pressure relieves mechanical obstruction of the vena cava, restoring right heart filling and eliminating contralateral mediastinal shift.`
    });
  }

  if (nextState.patient.labs.pfHgb >= 60 && prevState.patient.labs.pfHgb < 60) {
    evaluations.push({
      turn: turnNumber,
      minute: nextState.elapsedMinutes,
      action: `Unaddressed Venous Line Chatter / Excessive Negative Suction (P_in ${nextState.circuit.pIn} mmHg)`,
      verdict: 'BAD',
      verdictLabel: '❌ Critical Complication (Centrifugal Cavitation Hemolysis)',
      feedback: `Line chatter left uncorrected caused red blood cell shear lysis (PFHgb spiked to ${nextState.patient.labs.pfHgb} mg/dL with port-wine hemoglobinuria).`,
      physiology: `First-Principles Hydraulics: When negative inlet pressure exceeds -50 to -60 mmHg, vapor pressure of dissolved gases is reached, causing cavitation vapor bubbles to form and implode violently against the pump impeller and RBC membranes. Shear stresses exceeding 150 Pa rupture erythrocyte membranes, releasing free hemoglobin into plasma, exhausting haptoglobin and producing renal tubular toxicity (pigment nephropathy).`
    });
  }

  if (!prevState.circuit.onEcmo && nextState.circuit.onEcmo) {
    evaluations.push({
      turn: turnNumber,
      minute: nextState.elapsedMinutes,
      action: 'Cannulated Patient and Released Circuit Clamps to Initiate ECMO Bypass',
      verdict: 'GOOD',
      verdictLabel: '✅ Successful ECLS Cannulation & Bypass Initiation',
      feedback: `Patient successfully transitioned from pre-cannulation standby onto ${nextState.patient.mode} ECMO bypass. ECMO console numbers and live pressures are now active.`,
      physiology: `First-Principles Physiology: Establishing extracorporeal circuit blood flow and membrane gas exchange rescues end-organ perfusion during cardiovascular arrest/decompensation, reversing anaerobic metabolism and clearing systemic lactic acidosis.`
    });
  }

  if (evaluations.length === 0) {
    evaluations.push({
      turn: turnNumber,
      minute: nextState.elapsedMinutes,
      action: actionText,
      verdict: 'GOOD',
      verdictLabel: '✅ Clinical Assessment / Monitoring Step',
      feedback: `Executed bedside assessment/order at Minute ${nextState.elapsedMinutes}.`,
      physiology: `Continuous serial reassessment of hemodynamics, circuit pressures (P_in, P_out, ΔP), and neuro-monitoring (TCM CO2 & Bifrontal NIRS) ensures early detection of physiological drift.`
    });
  }

  return evaluations;
};

// ============================================================================
// SUBAGENT 2: ecmo-bedside-team (Multidisciplinary Real-Time Team Input & Hints)
// ============================================================================
window.generateBedsideTeamHuddle = function(state) {
  const { patient, circuit, vent, telemetry, complications, elapsedMinutes, pendingLabs, teamDialogue } = state;
  const targets = window.computeProtocolTargets(state);
  const cues = [];

  // A. Active Dynamic Team Dialogues & Recent Inquiries (Filtered by expiration)
  if (teamDialogue && teamDialogue.length > 0) {
    teamDialogue.forEach((dlg) => {
      let roleTag = 'team';
      const roleLower = (dlg.role || '').toLowerCase();
      if (roleLower.includes('perfusionist') || roleLower.includes('ecmo') || roleLower.includes('specialist')) {
        roleTag = 'perfusionist';
      } else if (roleLower.includes('rn') || roleLower.includes('nurse')) {
        roleTag = 'rn';
      } else if (roleLower.includes('rt') || roleLower.includes('respiratory')) {
        roleTag = 'rt';
      } else if (roleLower.includes('surgeon') || roleLower.includes('echo') || roleLower.includes('cardiologist')) {
        roleTag = 'surgeon';
      }

      cues.push({
        role: dlg.role,
        roleTag,
        badgeColor: dlg.badgeColor,
        message: dlg.message
      });
    });
  }

  // B. Lab Status & Standby Alerts
  const readyLabs = (pendingLabs || []).filter((l) => l.status === 'ready');
  const activePendingLabs = (pendingLabs || []).filter((l) => l.status === 'pending');

  if (readyLabs.length > 0 && !cues.some((c) => c.message.includes('ready for review in your Labs tab'))) {
    const latestReady = readyLabs[readyLabs.length - 1];
    cues.push({
      role: 'Bedside PICU/CICU RN & Perfusionist',
      roleTag: 'rn',
      badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-500',
      message: `"Doctor, the ${latestReady.shortName || latestReady.name} results are back and ready for review in your Labs tab (resulted at Min ${latestReady.readyMinute}). We are on standby for any sweep, ventilator, BFR, or heparin orders."`,
      quickReplyLabel: '🧪 Check Labs',
      quickReplyPrompt: '@rn check lab status'
    });
  } else if (activePendingLabs.length > 0 && !cues.some((c) => c.message.includes('analyzer'))) {
    const nextLab = activePendingLabs[0];
    const rem = Math.max(1, nextLab.readyMinute - (elapsedMinutes || 0));
    cues.push({
      role: 'Bedside PICU/CICU RN',
      roleTag: 'rn',
      badgeColor: 'bg-sky-900 text-sky-200 border-sky-500',
      message: `"${nextLab.shortName || nextLab.name} was drawn and is currently running on the analyzer (~${rem} min remaining). We are standing by at the bedside."`,
      quickReplyLabel: '🧪 Lab Status',
      quickReplyPrompt: '@rn check lab status'
    });
  }

  // C. Perfusionist / ECMO Specialist Observations (Only if not already resolved)
  const qwsRunSet =
    circuit.alarms.backflowPrevention &&
    circuit.alarms.maxInlet === -60 &&
    circuit.alarms.maxOutlet === 250 &&
    circuit.alarms.bubbleDetection;

  if (!circuit.onEcmo) {
    cues.push({
      role: 'ECMO Specialist / Perfusionist',
      roleTag: 'perfusionist',
      badgeColor: 'bg-amber-900 text-amber-200 border-amber-600',
      message: `"The circuit is primed, debubbled, and CLAMPED at the bedside on STANDBY (0 RPM, zero flow). As soon as the surgeon cannulates and orders 'Initiate ECMO' or 'Release Clamps', we are ready to ramp to Minute 1 Box B flow (${targets.boxBTargetLpm} L/min) and start Sweep Gas at ${(0.25 * targets.boxBTargetLpm).toFixed(2)} L/min."`,
      quickReplyLabel: '⚡ Release Clamps & Start ECMO',
      quickReplyPrompt: '@perfusionist release clamps and start ecmo'
    });
  } else if (!qwsRunSet) {
    cues.push({
      role: 'ECMO Specialist / Perfusionist',
      roleTag: 'perfusionist',
      badgeColor: 'bg-sky-900 text-sky-200 border-sky-600',
      message: `"Doctor, a quick heads-up on the QWS console—our safety alarms are still in Default bypass mode (Max Inlet -100, Max Outlet +300, Backflow & Bubble OFF). Should I switch all 6 safety alarms to ECLS Run mode now?"`,
      quickReplyLabel: '🛡️ Switch Alarms to Run Mode',
      quickReplyPrompt: '@perfusionist switch safety alarms to run mode'
    });
  } else if (circuit.obstructionSite === 4) {
    cues.push({
      role: 'ECMO Specialist / Perfusionist',
      roleTag: 'perfusionist',
      badgeColor: 'bg-rose-900 text-rose-200 border-rose-600',
      message: `"Look at our pressure drop across the membrane lung: P_ox-in is +${circuit.pOxIn} mmHg while P_ox-out is +${circuit.pOxOut} mmHg—that's a ΔP (TMP) of ${circuit.tmp} mmHg! I see dark clot stranding in the pre-membrane header and our post-ox PO2 is down to ${circuit.postOxPo2} mmHg. I have a primed backup oxygenator at the bedside if you want to exchange it."`,
      quickReplyLabel: '🔄 Exchange Oxygenator',
      quickReplyPrompt: '@perfusionist exchange oxygenator'
    });
  } else if (circuit.obstructionSite === 1 || circuit.pIn <= -58) {
    cues.push({
      role: 'ECMO Specialist / Perfusionist',
      roleTag: 'perfusionist',
      badgeColor: 'bg-amber-900 text-amber-200 border-amber-600',
      message: `"We're getting strong venous line chatter and P_in is hitting ${circuit.pIn} mmHg (Site 1 drainage limitation). We can drop RPM slightly to release the atrial wall suction while we check volume status, Hct (${patient.labs.hct}%), or cannula position."`,
      quickReplyLabel: '⬇️ Lower RPM to Relieve Suction',
      quickReplyPrompt: '@perfusionist lower RPM and relieve suction'
    });
  } else if (elapsedMinutes < 15) {
    const stepTarget = targets.rampSteps[targets.currentStepIndex];
    cues.push({
      role: 'ECMO Specialist / Perfusionist',
      roleTag: 'perfusionist',
      badgeColor: 'bg-sky-900 text-sky-200 border-sky-600',
      message: `"For this ${patient.weightKg} kg (${patient.bsa} m²) ${patient.mode} run, our 15-min Box A target is ${targets.boxATargetLpm} L/min (${targets.boxAMlKg} mL/kg/min) and Min 1 Box B is ${targets.boxBTargetLpm} L/min. At Minute ${elapsedMinutes}, our ramp step target is ~${stepTarget.flowLpm} L/min with initial Box M sweep at ${(0.25 * stepTarget.flowLpm).toFixed(2)} L/min."`,
      quickReplyLabel: `📈 Advance Ramp Step (~${stepTarget.flowLpm} L/min)`,
      quickReplyPrompt: `@perfusionist advance next ramp step to ${stepTarget.flowLpm} L/min`
    });
  } else {
    cues.push({
      role: 'ECMO Specialist / Perfusionist',
      roleTag: 'perfusionist',
      badgeColor: 'bg-sky-900 text-sky-200 border-sky-600',
      message: `"Circuit mechanics look smooth right now: P_in ${circuit.pIn} mmHg, P_out +${circuit.pOut} mmHg, and ΔP (TMP) is ${circuit.tmp} mmHg (<40–50 baseline)."`
    });
  }

  // D. Bedside PICU/CICU RN Input
  const paco2Drop = patient.preEclsPaco2 - (telemetry ? telemetry.paco2 : patient.preEclsPaco2);
  if (paco2Drop >= 10 && elapsedMinutes <= 60 && telemetry) {
    const suggestedSweep = +((circuit.sweepLpm || 0.1) * (telemetry.paco2 / Math.max(50, patient.preEclsPaco2 - 6))).toFixed(2);
    cues.push({
      role: 'Bedside PICU/CICU RN',
      roleTag: 'rn',
      badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
      message: `"⚠️ Doctor, our TCM CO2 has dropped ${paco2Drop} mmHg from the pre-ECLS baseline of ${patient.preEclsPaco2} mmHg, and bilateral Cerebral NIRS dropped to ${telemetry.nirsLeft}%/${telemetry.nirsRight}%! Per our neuro-protection protocol, should I draw a STAT ABG and reduce sweep using the titration formula (to ~${suggestedSweep} L/min)?"`,
      quickReplyLabel: `🧠 STAT ABG & Titrate Sweep (~${suggestedSweep} L/min)`,
      quickReplyPrompt: `@rn draw STAT ABG and titrate sweep to ${suggestedSweep} L/min`
    });
  } else if (patient.labs.hct < 35 || patient.labs.platelets < 100 || patient.labs.fibrinogen < 150) {
    cues.push({
      role: 'Bedside PICU/CICU RN',
      roleTag: 'rn',
      badgeColor: 'bg-amber-900 text-amber-200 border-amber-500',
      message: `"Checking our transfusion thresholds: Hct is ${patient.labs.hct}% (goal >35%), Platelets are ${patient.labs.platelets}k (goal >100k, or >150k pre-pump in <1yr), and Fibrinogen is ${patient.labs.fibrinogen} mg/dL. I have the bedside cooler with <14-day fresh PRBCs and a peripheral IV ready for platelets whenever you order them."`,
      quickReplyLabel: '🩸 Transfuse 15 mL/kg PRBCs',
      quickReplyPrompt: '@rn transfuse 15 mL/kg fresh PRBCs from bedside cooler'
    });
  } else if (telemetry) {
    cues.push({
      role: 'Bedside PICU/CICU RN',
      roleTag: 'rn',
      badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-600',
      message: `"Neuro-monitoring is stable: Bifrontal Cerebral NIRS ${telemetry.nirsLeft}% L / ${telemetry.nirsRight}% R, Somatic NIRS ${telemetry.nirsSomatic}%, and TCM CO2 is ${telemetry.tcmCo2} mmHg (Δ ${paco2Drop} mmHg from baseline)."`
    });
  }

  // E. Pediatric Respiratory Therapist (RT) Input
  if (complications.pneumothorax) {
    cues.push({
      role: 'Pediatric Respiratory Therapist (RT)',
      roleTag: 'rt',
      badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
      message: `"⚠️ TENSION PNEUMOTHORAX! Right hemithorax is tympanic to percussion with completely absent breath sounds and tracheal shift. Alveolar barotrauma rupture! Order STAT needle decompression in 2nd ICS MCL!"`,
      quickReplyLabel: '🚨 Needle Decompression STAT',
      quickReplyPrompt: '@rt perform emergency needle decompression'
    });
  } else if (elapsedMinutes >= 15 && (vent.pip > 32 || vent.peep > 12)) {
    cues.push({
      role: 'Pediatric Respiratory Therapist (RT)',
      roleTag: 'rt',
      badgeColor: 'bg-purple-900 text-purple-200 border-purple-500',
      message: `"We're at Minute ${elapsedMinutes} and at target ECLS support, Doctor. Our ventilator is still in the danger range at PIP ${vent.pip} / PEEP ${vent.peep} cmH2O. Per Box D protocol, shall I wean PIP to 32 and PEEP to 12 cmH2O right now while keeping the rate at ${vent.rate} bpm?"`,
      quickReplyLabel: '🫁 Box D Wean (PIP 32 / PEEP 12)',
      quickReplyPrompt: '@rt yes, wean PIP to 32 and PEEP to 12'
    });
  } else if (elapsedMinutes >= 120 && (vent.inoPpm > 0 || vent.flolan > 0 || vent.pip > 20)) {
    cues.push({
      role: 'Pediatric Respiratory Therapist (RT)',
      roleTag: 'rt',
      badgeColor: 'bg-purple-900 text-purple-200 border-purple-500',
      message: `"We are past ECLS Hour 2 (${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m). We can step down the ${vent.mode} ventilator toward Rest Settings (q2h) and wean iNO (${vent.inoPpm} ppm) / Flolan (${vent.flolan} mcg/kg/min) stepwise per protocol."`,
      quickReplyLabel: '🫁 Wean Toward Rest Settings',
      quickReplyPrompt: '@rt wean ventilator toward rest settings'
    });
  } else {
    cues.push({
      role: 'Pediatric Respiratory Therapist (RT)',
      roleTag: 'rt',
      badgeColor: 'bg-purple-900 text-purple-200 border-purple-600',
      message: `"Patient is synchronous with the ventilator on ${vent.mode} (PIP ${vent.pip} / PEEP ${vent.peep} cmH2O, Rate ${vent.rate} bpm, FiO2 ${vent.fio2}%). Airway pressures stable."`
    });
  }

  // F. ECLS Surgeon & Echo Cardiologist Input
  if (complications.tamponade) {
    cues.push({
      role: 'Interventional / Echo Cardiologist & Surgeon',
      roleTag: 'surgeon',
      badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
      message: `"⚠️ CARDIAC TAMPONADE on echo! Large circumferential pericardial fluid collection compressing the right ventricle with diastolic collapse. MAP is critically low (${telemetry.radialMap} mmHg). Order STAT subxiphoid pericardiocentesis immediately!"`,
      quickReplyLabel: '🚨 Pericardiocentesis STAT',
      quickReplyPrompt: '@surgeon perform emergency pericardiocentesis'
    });
  } else if (complications.wireCoiled) {
    cues.push({
      role: 'Interventional / Echo Cardiologist & Surgeon',
      roleTag: 'surgeon',
      badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
      message: `"🛑 STOP before advancing the cannula! On bicaval/subcostal echo, I see the guide wire tip coiled in the Right Atrium/SVC. Tell us to withdraw and redirect the wire into the IVC before dilating!"`,
      quickReplyLabel: '🛑 Echo Check & Redirect Wire',
      quickReplyPrompt: '@surgeon check wire on echo and redirect into IVC'
    });
  } else if (patient.mode === 'VV' && circuit.recirculationFraction >= 0.30) {
    cues.push({
      role: 'Echo Cardiologist & ECLS Surgeon',
      roleTag: 'surgeon',
      badgeColor: 'bg-amber-900 text-amber-200 border-amber-500',
      message: `"Notice how both the venous and arterial limbs look bright red (ScvO2 ${circuit.svo2}% vs SaO2 ${circuit.postOxSao2}%) while patient SpO2 is only ${telemetry.postSpo2}%. That's classic dual-lumen VV recirculation—if you order an echo and cannula repositioning, we can rotate the MC3 Crescent RA jet toward the tricuspid valve."`,
      quickReplyLabel: '🔄 Rotate Dual-Lumen Cannula',
      quickReplyPrompt: '@surgeon rotate dual-lumen cannula under echo guidance'
    });
  } else {
    cues.push({
      role: 'ECLS Surgeon / Echo Cardiologist',
      roleTag: 'surgeon',
      badgeColor: 'bg-rose-900 text-rose-200 border-rose-600',
      message: `"Cannulation site is secure with sterile occlusive dressing. Vessel hemostasis confirmed with zero active oozing. Standing by at the bedside."`
    });
  }

  return cues;
};

// ============================================================================
// SUBAGENT 3: ecmo-scenario-architect (AI & Procedural Scenario Generator)
// ============================================================================
window.ARCHETYPE_TEMPLATES = [
  {
    id: 'arch-mas-pphn',
    label: 'Neonatal Meconium Aspiration & Severe PPHN (VV ECMO + iNO)',
    build: () => ({
      id: 'gen-mas-' + Date.now(),
      title: 'Generated Case: 3.9 kg Neonate (MAS / PPHN) — VV Initiation & Team Run',
      blindTitle: 'Generated Case: 3.9 kg Neonate — Severe Hypoxemic & Hypercapnic Failure (VV ECLS)',
      category: 'AI Scenario Architect (Neonatal VV)',
      handoff: 'Bedside Handoff: 2-day-old, 3.9 kg (BSA 0.24 m²) term neonate with severe Meconium Aspiration Syndrome and suprasystemic PPHN (OI 48) on CMV (PIP 38 / PEEP 14 / Rate 45 / FiO2 100%) and iNO 20 ppm. Pre-ECLS ABG: pH 7.08, PaCO2 78 mmHg, PaO2 34 mmHg, Lactate 5.4 mmol/L. Cannulated with a 15 Fr MC3 Crescent RA dual-lumen cannula via Right IJ (1/4" circuit).',
      initialPrompt: 'Bedside Team Huddle: "Clamps are released at idle RPM, Doctor. The Perfusionist, RN, and RT are standing by for your Minute 1 BFR (Box B), initial Sweep (Box M), and QWS alarm orders!"',
      stages: [
        { stageId: 1, name: 'Min 1 Box B Flow, Box M Sweep & QWS Run Alarms', promptHint: 'Set Box B flow (~0.055 L/min), Box M sweep (0.25 × BFR), and activate QWS ECLS Run alarms.' },
        { stageId: 2, name: '15-Min Ramp to Box A & Box D Danger Vent Wean', promptHint: 'Ramp every 3 min to Box A (0.29–0.36 L/min), keep ΔPaCO2 <10 mmHg, and wean PIP to 32 / PEEP to 12 at Min 15.' }
      ],
      elapsedMinutes: 1,
      patient: {
        name: 'Baby Boy Liam (2d old - MAS)',
        ageLabel: '2 days old (Neonate)',
        weightKg: 3.9,
        bsa: 0.24,
        mode: 'VV',
        tubingSize: '1/4"',
        cannulaType: 'MC3 Crescent RA (Dual-Lumen VV)',
        cannulaDesc: '15 Fr (9.7 cm) MC3 Crescent RA via Right IJ',
        lowerArtSite: 'Umbilical Art',
        preEclsPaco2: 78,
        targetPaco2Min: 69,
        targetPaco2Max: 78,
        nativeCardiacIndex: 2.6,
        nativeLungShunt: 0.70,
        nativeCompliance: 0.32,
        intravascularVolumeStatus: -0.5,
        labs: { hb: 11.5, hct: 34, platelets: 96, inr: 1.5, ptt: 64, fibrinogen: 145, antiXa: 0.42, at3: 74, pfHgb: 16, lactate: 5.4 }
      },
      circuit: {
        rpm: 1150, flowLpm: 0.05, sweepLpm: 0.0, sweepFio2: 80, waterTemp: 37.0, bloodTemp: 36.9,
        obstructionSite: 0, obstructionSeverity: 0, recirculationFraction: 0.05, airBubbleDetected: false,
        alarms: { backflowPrevention: false, maxInlet: -100, stopInlet: -150, maxOutlet: 300, stopOutlet: 400, bubbleDetection: false, gaugeNarrowed: false }
      },
      vent: { mode: 'CMV', pip: 38, peep: 14, rate: 45, iTime: 0.55, hz: 0, fio2: 100, inoPpm: 20, flolan: 0.05 },
      complications: { tamponade: false, wireCoiled: false }
    })
  },
  {
    id: 'arch-pertussis-va',
    label: 'Infant Malignant Pertussis & Leukostasis Pulmonary Crisis (VA ECMO)',
    build: () => ({
      id: 'gen-pertussis-' + Date.now(),
      title: 'Generated Case: 4.8 kg Infant (Malignant Pertussis / RV Failure) — VA ECMO',
      blindTitle: 'Generated Case: 4.8 kg Infant — Severe Pulmonary Hypertension & Shock (VA ECLS)',
      category: 'AI Scenario Architect (Infant VA)',
      handoff: 'Bedside Handoff: 7-week-old, 4.8 kg (BSA 0.28 m²) infant with malignant Bordetella pertussis pneumonia (WBC 84k), refractory hypoxemia, and acute right ventricular failure on VDR4 (36/14, Rate 40, 400 Hz), iNO 20 ppm, and Flolan 0.1 mcg/kg/min. Pre-ECLS PaCO2 84 mmHg, Hct 33%, Platelets 88k. Cannulated onto VA ECMO (15 Fr Right IJ venous / 10 Fr Right Carotid arterial, 1/4" circuit).',
      initialPrompt: 'Bedside Team Huddle: "We are on VA bypass at Minute 1, Doctor. Remember this infant has chronic hypercapnia (PaCO2 84 mmHg) and high blood viscosity. What are your Minute 1 BFR, Sweep, Alarm, and Transfusion orders?"',
      stages: [
        { stageId: 1, name: 'Minute 1 VA Initiation & Neuro-Protective Sweep', promptHint: 'Set Minute 1 VA BFR (Box B = Box A / 6 where Box A = 2.0-2.5 × 0.28 = 0.56-0.70 L/min), Box M sweep, and QWS Run alarms.' },
        { stageId: 2, name: '15-Min Ramp, Box D VDR4 Wean & Hct/Platelet Repletion', promptHint: 'Ramp to 0.63 L/min over 15 min, keep PaCO2 75-84 mmHg (<10 mmHg initial drop), wean VDR4 to 32/12, and transfuse PRBCs & peripheral platelets.' }
      ],
      elapsedMinutes: 1,
      patient: {
        name: 'Baby Girl Maya (7 wk old - Pertussis)',
        ageLabel: '7 weeks old (Infant)',
        weightKg: 4.8,
        bsa: 0.28,
        mode: 'VA',
        tubingSize: '1/4"',
        cannulaType: 'Wire-Reinforced Single-Lumen',
        cannulaDesc: '15 Fr Venous (Right IJ) / 10 Fr Arterial (Right Carotid)',
        lowerArtSite: 'Right Femoral',
        preEclsPaco2: 84,
        targetPaco2Min: 75,
        targetPaco2Max: 84,
        nativeCardiacIndex: 1.2,
        nativeLungShunt: 0.66,
        nativeCompliance: 0.30,
        intravascularVolumeStatus: -0.8,
        labs: { hb: 10.9, hct: 33, platelets: 88, inr: 1.6, ptt: 60, fibrinogen: 140, antiXa: 0.38, at3: 68, pfHgb: 28, lactate: 7.2 }
      },
      circuit: {
        rpm: 1350, flowLpm: 0.10, sweepLpm: 0.03, sweepFio2: 80, waterTemp: 37.0, bloodTemp: 36.8,
        obstructionSite: 0, obstructionSeverity: 0, recirculationFraction: 0.0, airBubbleDetected: false,
        alarms: { backflowPrevention: false, maxInlet: -100, stopInlet: -150, maxOutlet: 300, stopOutlet: 400, bubbleDetection: false, gaugeNarrowed: false }
      },
      vent: { mode: 'VDR4', pip: 36, peep: 14, rate: 40, iTime: 0.6, hz: 400, fio2: 100, inoPpm: 20, flolan: 0.10 },
      complications: { tamponade: false, wireCoiled: false }
    })
  },
  {
    id: 'arch-septic-conduit-kink',
    label: 'Pediatric Refractory Septic Shock — Acute Site 3 Conduit Obstruction (3/8" Circuit)',
    build: () => ({
      id: 'gen-sepsis-' + Date.now(),
      title: 'Generated Case: 22.0 kg Child (Septic Shock VA ECMO) — Acute Site 3 Conduit Kink',
      blindTitle: 'Generated Case: 22.0 kg Child (VA ECMO Hr 18) — Sudden High Outlet Alarm',
      category: 'AI Scenario Architect (3/8" Circuit Troubleshooting)',
      handoff: 'Bedside Handoff: 6-year-old, 22.0 kg (BSA 0.85 m²) child on central/neck VA ECMO (23 Fr Venous / 17 Fr Arterial, 3/8" circuit) for refractory meningococcal septic shock at Hour 18. After portable chest X-ray plate removal, the QWS console triggers a Max Outlet Cutback alarm.',
      initialPrompt: 'Bedside Team Huddle: "Doctor, P_out just spiked to +268 mmHg and flow cut back, but look at P_ox-in (+64 mmHg) and ΔP (4 mmHg)! What does the pressure differential tell us, and what is your order?"',
      stages: [
        { stageId: 1, name: 'Localize Obstruction via P_out vs P_ox-in Differential', promptHint: 'High P_out with normal/low P_ox-in and ΔP ≈ 0 localizes the obstruction between the centrifugal pump head and the pre-oxygenator transducer (Site 3: Conduit limb).' },
        { stageId: 2, name: 'Clear Site 3 Obstruction & Verify 3/8" Sampling', promptHint: 'Unkink the conduit limb between pump and oxygenator, draw 3/8" post-ox gas (with second specialist ready with clamp), and replete fibrinogen/platelets.' }
      ],
      elapsedMinutes: 1080,
      patient: {
        name: 'Jordan S. (6 yr old - Sepsis)',
        ageLabel: '6 years old (Pediatric)',
        weightKg: 22.0,
        bsa: 0.85,
        mode: 'VA',
        tubingSize: '3/8"',
        cannulaType: 'Wire-Reinforced Single-Lumen',
        cannulaDesc: '23 Fr Venous (Right IJ) / 17 Fr Arterial (Right Carotid)',
        lowerArtSite: 'Right Femoral',
        preEclsPaco2: 58,
        targetPaco2Min: 44,
        targetPaco2Max: 50,
        nativeCardiacIndex: 1.4,
        nativeLungShunt: 0.48,
        nativeCompliance: 0.45,
        intravascularVolumeStatus: -0.5,
        labs: { hb: 10.8, hct: 33, platelets: 74, inr: 1.9, ptt: 78, fibrinogen: 92, antiXa: 0.55, at3: 62, pfHgb: 30, lactate: 5.8 }
      },
      circuit: {
        rpm: 2950, flowLpm: 1.15, sweepLpm: 1.60, sweepFio2: 75, waterTemp: 37.0, bloodTemp: 37.0,
        obstructionSite: 3, obstructionSeverity: 0.76, recirculationFraction: 0.0, airBubbleDetected: false,
        alarms: { backflowPrevention: true, maxInlet: -60, stopInlet: -100, maxOutlet: 250, stopOutlet: 300, bubbleDetection: true, gaugeNarrowed: true }
      },
      vent: { mode: 'CMV', pip: 20, peep: 10, rate: 10, iTime: 2.0, hz: 0, fio2: 35, inoPpm: 0, flolan: 0 },
      complications: { tamponade: false, wireCoiled: false }
    })
  }
];
