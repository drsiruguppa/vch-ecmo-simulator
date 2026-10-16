// First-Principles Physiological & Hydraulic Simulation Engine for ECMO-Sim

window.computeProtocolTargets = function(state) {
  const { patient, circuit, elapsedMinutes } = state;
  const isVA = patient.mode === 'VA';

  // 1. Box A: 15-Minute Goal Target BFR
  const minIndexLpmM2 = isVA ? 2.0 : 1.2;
  const maxIndexLpmM2 = isVA ? 2.5 : 1.5;
  const midIndexLpmM2 = isVA ? 2.25 : 1.35;

  const boxAMinLpm = +(minIndexLpmM2 * patient.bsa).toFixed(2);
  const boxAMaxLpm = +(maxIndexLpmM2 * patient.bsa).toFixed(2);
  const boxATargetLpm = +(midIndexLpmM2 * patient.bsa).toFixed(2);
  const boxAMlKg = Math.round((boxATargetLpm * 1000) / patient.weightKg);

  // 2. Box B: Minute 1 Initial BFR = Box A / 6
  const boxBMinLpm = +(boxAMinLpm / 6).toFixed(3);
  const boxBMaxLpm = +(boxAMaxLpm / 6).toFixed(3);
  const boxBTargetLpm = +(boxATargetLpm / 6).toFixed(3);
  const boxBMlKg = Math.round((boxBTargetLpm * 1000) / patient.weightKg);

  // 3. 3-Minute Ramp-Up Cadence Schedule (Min 1, 4, 7, 10, 13, 15)
  const rampSteps = [1, 2, 3, 4, 5, 6].map((step) => {
    const minute = step === 6 ? 15 : (step - 1) * 3 + 1;
    const flowLpm = +((boxATargetLpm * step) / 6).toFixed(2);
    const mlKg = Math.round((flowLpm * 1000) / patient.weightKg);
    return { step, minute, flowLpm, mlKg };
  });

  // Current expected ramp step based on elapsedMinutes (1 to 15)
  let currentStepIndex = 5;
  if (elapsedMinutes < 4) currentStepIndex = 0;
  else if (elapsedMinutes < 7) currentStepIndex = 1;
  else if (elapsedMinutes < 10) currentStepIndex = 2;
  else if (elapsedMinutes < 13) currentStepIndex = 3;
  else if (elapsedMinutes < 15) currentStepIndex = 4;
  else currentStepIndex = 5;

  const expectedNowBfrLpm = rampSteps[currentStepIndex].flowLpm;

  // 4. Box M: Initial Sweep Gas Rate = 0.25 * ECLS BFR (L/min)
  const boxMSweepForCurrentFlow = +(0.25 * Math.max(0.05, circuit.flowLpm)).toFixed(2);
  const boxMSweepAtTargetFlow = +(0.25 * boxATargetLpm).toFixed(2);

  // 5. Box K: Immediate Post-Initiation PaCO2 Target & 4-hour weaning
  const hoursElapsed = Math.floor(elapsedMinutes / 60);
  const fourHourBlocks = Math.floor(hoursElapsed / 4);
  const scheduledWeanMmHg = fourHourBlocks * 5;
  const dynamicTargetPaco2High = Math.max(52, patient.preEclsPaco2 - scheduledWeanMmHg);
  const dynamicTargetPaco2Low = Math.max(48, dynamicTargetPaco2High - 8);

  return {
    boxAMinLpm,
    boxAMaxLpm,
    boxATargetLpm,
    boxAMlKg,
    boxBMinLpm,
    boxBMaxLpm,
    boxBTargetLpm,
    boxBMlKg,
    rampSteps,
    currentStepIndex,
    expectedNowBfrLpm,
    boxMSweepForCurrentFlow,
    boxMSweepAtTargetFlow,
    dynamicTargetPaco2Low,
    dynamicTargetPaco2High
  };
};

window.computeDerivedState = function(rawState, timeDeltaMinutes = 0) {
  const state = JSON.parse(JSON.stringify(rawState));
  const { patient, circuit, vent, complications } = state;
  const targets = window.computeProtocolTargets(state);

  const isVA = patient.mode === 'VA';
  const activeAlarms = [];
  const isOnEcmo = circuit.onEcmo !== false;
  circuit.onEcmo = isOnEcmo;

  patient.inotropesActive = Boolean(patient.inotropesActive);
  patient.afterloadReducerActive = Boolean(patient.afterloadReducerActive);
  patient.laVented = Boolean(patient.laVented);

  // Ventilator alveolar ventilation contribution
  const meanAirwayP = vent.pip * 0.35 + vent.peep * 0.65;
  const ventMinuteIndex =
    ((vent.pip - vent.peep) * vent.rate * patient.nativeCompliance) / 220 +
    (vent.mode === 'VDR4' ? 0.18 : 0);
  const vasodilationBonus = (vent.inoPpm > 0 ? 0.08 : 0) + (vent.flolan > 0 ? 0.05 : 0);
  const nativeGasExchangeFactor = Math.max(0.1, (1 - patient.nativeLungShunt) + vasodilationBonus);

  // If patient is NOT on ECMO (Pre-Cannulation / Standby / Clamped)
  if (!isOnEcmo) {
    circuit.flowLpm = 0.0;
    circuit.rpm = circuit.rpm || 0;
    circuit.pIn = null;
    circuit.pOut = null;
    circuit.pOxIn = null;
    circuit.pOxOut = null;
    circuit.tmp = null;
    circuit.exhaustCo2 = 0;
    circuit.vco2 = 0;
    circuit.postOxPo2 = null;
    circuit.postOxSao2 = null;
    circuit.svo2 = null;

    const hasTamponade = Boolean(complications && complications.tamponade);
    const hasPtx = Boolean(complications && complications.pneumothorax);

    activeAlarms.push('CIRCUIT STANDBY • PRE-CANNULATION (PRIMED & CLAMPED)');
    if (hasTamponade) {
      activeAlarms.push('⚠️ CARDIAC TAMPONADE ALERT (Pericardial effusion / RV diastolic collapse / Shock)');
    }
    if (hasPtx) {
      activeAlarms.push('⚠️ TENSION PNEUMOTHORAX ALERT (Air leak / Decreased compliance / Obstructive shock)');
    }

    const cvp = Math.max(1, Math.min(24, Math.round(
      (isVA ? 9 : 10) + patient.intravascularVolumeStatus * 3 + (hasTamponade ? 8 : 0) + (hasPtx ? 6 : 0)
    )));

    const lap = isVA ? Math.max(4, cvp + 1) : null;

    // Low-flow / pre-cannulation baseline MAP driven by native cardiac index & volume
    const baseMap = isVA
      ? Math.max(18, Math.round(18 + patient.nativeCardiacIndex * 15 + patient.intravascularVolumeStatus * 3 - (hasTamponade ? 14 : 0) - (hasPtx ? 10 : 0)))
      : Math.max(20, Math.round(28 + patient.nativeCardiacIndex * 12 - (hasTamponade ? 15 : 0) - (hasPtx ? 12 : 0)));

    const pulsePressure = isVA
      ? Math.max(4, Math.round(16 * (patient.nativeCardiacIndex / 2.5) - (hasTamponade ? 6 : 0) - (hasPtx ? 4 : 0)))
      : Math.max(6, Math.round(20 - (hasTamponade ? 8 : 0) - (hasPtx ? 6 : 0)));

    const radialMap = Math.max(20, baseMap);

    const steadyStatePaco2 = Math.min(115, Math.max(35, patient.preEclsPaco2 + (patient.nativeCardiacIndex < 1.0 ? 3 : 0)));
    const prevPaco2 = (rawState.telemetry && typeof rawState.telemetry.paco2 === 'number')
      ? rawState.telemetry.paco2
      : null;

    let paco2 = steadyStatePaco2;
    if (prevPaco2 !== null) {
      if (timeDeltaMinutes > 0) {
        const alpha = 1 - Math.exp(-timeDeltaMinutes / 4.5);
        paco2 = Math.round(prevPaco2 + alpha * (steadyStatePaco2 - prevPaco2));
      } else {
        paco2 = Math.round(prevPaco2 + 0.05 * (steadyStatePaco2 - prevPaco2));
      }
    }
    paco2 = Math.max(22, Math.min(115, paco2));

    if (timeDeltaMinutes > 0 && patient.labs && typeof patient.labs.lactate === 'number') {
      if (radialMap < 35 || hasTamponade) {
        patient.labs.lactate = +(Math.min(18.0, patient.labs.lactate + 0.08 * timeDeltaMinutes)).toFixed(2);
      }
    }

    const patientPh = +(7.40 - (paco2 - 40) * 0.0065 - (patient.labs.lactate > 2 ? (patient.labs.lactate - 2) * 0.012 : 0)).toFixed(2);

    let postSpo2 = Math.max(42, Math.min(88, Math.round(48 + 26 * nativeGasExchangeFactor * (vent.fio2 / 100) - (hasPtx ? 14 : 0))));
    let preSpo2 = isVA ? postSpo2 : Math.min(92, postSpo2 + 3);
    const patientPao2 = Math.max(26, Math.round(30 + (postSpo2 - 55) * 0.85 - (hasPtx ? 12 : 0)));

    const hr = patient.nativeCardiacIndex < 1.0
      ? Math.round(50 + patient.nativeCardiacIndex * 8)
      : Math.round(145 - patient.intravascularVolumeStatus * 8 + (hasTamponade ? 22 : 0) + (hasPtx ? 14 : 0));

    const rhythm =
      hr < 60
        ? 'Severe Sinus Bradycardia (Arrest Imminent)'
        : hr > 145
        ? 'Sinus Tachycardia'
        : 'Normal Sinus Rhythm';

    const femMap = Math.max(18, radialMap - (patient.weightKg < 5 ? 2 : 0));
    const femSbp = Math.round(femMap + pulsePressure * 0.68);
    const femDbp = Math.round(femMap - pulsePressure * 0.32);
    const radialSbp = Math.round(radialMap + pulsePressure * 0.65);
    const radialDbp = Math.round(radialMap - pulsePressure * 0.35);

    const baseCerebralNirs = Math.round(preSpo2 * 0.70 - (baseMap < 35 ? (35 - baseMap) * 0.9 : 0));
    const nirsLeft = Math.max(28, Math.min(80, baseCerebralNirs));
    const nirsRight = nirsLeft;
    const nirsSomatic = Math.max(25, Math.min(80, Math.round(postSpo2 * 0.68 - (baseMap < 35 ? (35 - baseMap) * 0.7 : 0))));

    const etco2 = Math.max(6, Math.round(paco2 * (0.35 + 0.3 * nativeGasExchangeFactor) * (patient.nativeCardiacIndex < 1.0 ? 0.6 : 1.0)));
    const tcmCo2 = paco2 + 2;

    circuit.activeAlarms = activeAlarms;

    state.telemetry = {
      rhythm,
      hr,
      radialSbp,
      radialDbp,
      radialMap,
      femSbp,
      femDbp,
      femMap,
      cvp,
      lap,
      preSpo2,
      postSpo2,
      etco2,
      tcmCo2,
      nirsLeft,
      nirsRight,
      nirsSomatic,
      paco2,
      pao2: patientPao2,
      ph: patientPh,
      postOxPco2: null,
      postOxPh: null
    };

    const wireText = complications.wireCoiled
      ? '⚠️ PROCEDURAL ECHO ALERT: Guide wire tip appears coiled in Right Atrium / SVC — DO NOT advance cannula until repositioned!'
      : 'Echo confirms guide wire aligned into IVC without coiling.';

    state.assessment = {
      circuitNote: `ECMO Circuit: STANDBY • PRIMED & CLAMPED at bedside (Pump 0 RPM, No Patient Bypass). ${wireText}`,
      patientNote: `Patient in pre-cannulation low-flow state (HR ${hr} bpm, MAP ${radialMap} mmHg, Cap refill >4 sec mottled extremities). Mechanical vent CMV ${vent.pip}/${vent.peep}, FiO2 ${vent.fio2}%.`
    };

    state.protocolChecks = window.evaluateProtocolChecks(state, targets);
    return state;
  }

  // 1. Calculate unthrottled flow from RPM and cannula/circuit resistance
  const maxRefFlow = targets.boxATargetLpm * 1.45;
  const rpmRatio = Math.max(0, (circuit.rpm - 600) / 3000);
  let commandedFlowLpm = circuit.rpm <= 600 ? 0 : +(maxRefFlow * Math.pow(rpmRatio, 1.15)).toFixed(2);

  // Dynamic VV Dual-Lumen Recirculation Coupled to Pump RPM
  circuit.baseRecirculation = circuit.baseRecirculation ?? circuit.recirculationFraction ?? 0.04;
  if (patient.mode === 'VV') {
    if (circuit.baseRecirculation >= 0.20 || commandedFlowLpm > targets.boxATargetLpm * 1.05) {
      const excessFlowRatio = Math.max(0, (commandedFlowLpm - targets.boxATargetLpm * 0.75) / Math.max(0.1, targets.boxATargetLpm));
      const suctionAmplifier = circuit.baseRecirculation >= 0.20 ? excessFlowRatio * 0.28 : Math.max(0, excessFlowRatio - 0.3) * 0.15;
      circuit.recirculationFraction = Math.min(0.85, +(circuit.baseRecirculation + suctionAmplifier).toFixed(2));
    } else {
      circuit.recirculationFraction = circuit.baseRecirculation;
    }
  }

  const effectiveContractility = patient.nativeCardiacIndex + (patient.inotropesActive ? 0.65 : 0) + (patient.afterloadReducerActive ? 0.35 : 0);

  // Check for retrograde flow if VA ECMO with low RPM and Backflow Prevention OFF
  let isBackflowing = false;
  if (isVA && circuit.rpm > 0 && circuit.rpm < 950 && !circuit.alarms.backflowPrevention) {
    isBackflowing = true;
    commandedFlowLpm = -0.12;
    activeAlarms.push('RETROGRADE FLOW WARNING (Backflow Prevention OFF)');
  } else if (isVA && circuit.rpm < 950 && circuit.alarms.backflowPrevention) {
    commandedFlowLpm = 0.0;
    if (circuit.rpm > 0) activeAlarms.push('Backflow Prevention intervention ACTIVE (Zero-Flow Hold)');
  }

  const hasTamponade = Boolean(complications && complications.tamponade);
  const hasPtx = Boolean(complications && complications.pneumothorax);

  if (hasTamponade) {
    activeAlarms.push('⚠️ CARDIAC TAMPONADE ALERT (Pericardial effusion / RV diastolic collapse / Shock)');
  }
  if (hasPtx) {
    activeAlarms.push('⚠️ TENSION PNEUMOTHORAX ALERT (Air leak / Barotrauma / Obstructive shock)');
  }

  // Baseline CVP and MAP estimates before circuit modifier
  const baseCvp = Math.round(
    (isVA ? 9 : 10) +
      patient.intravascularVolumeStatus * 3 +
      (hasTamponade ? 8 : 0) +
      (hasPtx ? 6 : 0) -
      (isVA ? Math.max(0, commandedFlowLpm / targets.boxATargetLpm) * 3 : 0)
  );
  const cvp = Math.max(1, Math.min(24, baseCvp));

  // Native + ECMO preliminary MAP estimate
  const prelimSupportFraction = Math.max(0, Math.min(1.6, commandedFlowLpm / Math.max(0.1, targets.boxATargetLpm)));
  const baseMap = isVA
    ? Math.round(36 + patient.nativeCardiacIndex * 8 + prelimSupportFraction * 24 - (hasTamponade ? 14 : 0) - (hasPtx ? 10 : 0))
    : Math.round(42 + patient.nativeCardiacIndex * 9 - (hasTamponade ? 15 : 0) - (hasPtx ? 12 : 0));

  const referenceDownstreamPressure = isVA ? baseMap : cvp + 6;

  // 2. Hydraulic Circuit Pressures (P_in, P_out, P_ox-in, P_ox-out, TMP)
  const flowRatio = Math.max(0, commandedFlowLpm / Math.max(0.1, targets.boxATargetLpm));
  let pIn = Math.round(-12 - 28 * flowRatio + patient.intravascularVolumeStatus * 12 - (hasTamponade ? 18 : 0) - (hasPtx ? 8 : 0));
  let pOut = Math.round(referenceDownstreamPressure + 95 * flowRatio);
  let pOxIn = Math.round(pOut - 8 * flowRatio);
  let tmp = Math.round(22 * flowRatio);
  let pOxOut = pOxIn - tmp;

  const site = Number(circuit.obstructionSite || 0);
  const sev = Math.max(0, Math.min(1, Number(circuit.obstructionSeverity || 0.75)));

  // Apply Circuit Obstruction & Zero Flow Differential Matrix (Sites 1 to 5)
  if (site === 1) {
    // Site 1: Venous cannula / pre-pump line occlusion -> Very negative P_in, downstream pressures drop toward MAP/CVP
    pIn = Math.round(-58 - 55 * sev - 15 * flowRatio);
    const flowPenalty = Math.max(0.15, 1 - 0.75 * sev);
    commandedFlowLpm = +(commandedFlowLpm * flowPenalty).toFixed(2);
    pOut = Math.round(referenceDownstreamPressure + 35 * flowPenalty * flowRatio);
    pOxIn = Math.round(pOut - 4 * flowPenalty);
    tmp = Math.round(14 * flowPenalty * flowRatio);
    pOxOut = pOxIn - tmp;
  } else if (site === 2) {
    // Site 2: Pump head occlusion / decoupling -> P_in positive (CVP), P_out/P_ox-in/P_ox-out resemble MAP/CVP, TMP ~ 0
    commandedFlowLpm = +(commandedFlowLpm * (1 - 0.92 * sev)).toFixed(2);
    pIn = Math.round(cvp + 2);
    pOut = Math.round(referenceDownstreamPressure + 4);
    pOxIn = Math.round(referenceDownstreamPressure + 3);
    tmp = Math.round(2 * (1 - sev));
    pOxOut = pOxIn - tmp;
    activeAlarms.push('PUMP HEAD OCCLUSION / DECOUPLING ALERT');
  } else if (site === 3) {
    // Site 3: Conduit limb (pump -> oxy) -> P_in positive (CVP), P_out HIGH, P_ox-in & P_ox-out resemble MAP/CVP, TMP ~ 0
    pIn = Math.round(cvp + 1 - 8 * (1 - sev));
    pOut = Math.round(230 + 115 * sev * Math.max(0.4, flowRatio));
    commandedFlowLpm = +(commandedFlowLpm * (1 - 0.8 * sev)).toFixed(2);
    pOxIn = Math.round(referenceDownstreamPressure + 8 * (1 - sev));
    tmp = Math.round(4 * (1 - sev));
    pOxOut = pOxIn - tmp;
  } else if (site === 4) {
    // Site 4: Oxygenator thrombosis -> P_in less negative/positive, P_out HIGH, P_ox-in HIGH, TMP HIGH (^^), P_ox-out resembles MAP/CVP
    const addedTmp = Math.round(85 * sev * Math.max(0.45, flowRatio));
    tmp = Math.round(24 * Math.max(0.3, flowRatio) + addedTmp);
    pOxOut = Math.round(referenceDownstreamPressure + 28 * (1 - 0.5 * sev) * flowRatio);
    pOxIn = pOxOut + tmp;
    pOut = pOxIn + Math.round(10 * Math.max(0.3, flowRatio));
    pIn = Math.round(-25 * (1 - 0.65 * sev) + cvp * 0.4 * sev);
    commandedFlowLpm = +(commandedFlowLpm * (1 - 0.32 * sev)).toFixed(2);
  } else if (site === 5) {
    // Site 5: Arterial cannula / post-oxy limb -> P_in positive/less neg, P_out HIGH, P_ox-in HIGH, TMP ~ 0, P_ox-out HIGH
    pOxOut = Math.round(220 + 110 * sev * Math.max(0.4, flowRatio));
    tmp = Math.round(18 * (1 - 0.85 * sev) * flowRatio);
    pOxIn = pOxOut + tmp;
    pOut = pOxIn + Math.round(8 * (1 - 0.5 * sev));
    pIn = Math.round(-20 * (1 - 0.8 * sev) + cvp * 0.5 * sev);
    commandedFlowLpm = +(commandedFlowLpm * (1 - 0.72 * sev)).toFixed(2);
  }

  // 3. Apply Spectrum Medical Quantum Workstation (QWS) Safety Alarms (Cutbacks & Pump Stops)
  let actualFlowLpm = commandedFlowLpm;

  if (circuit.airBubbleDetected && circuit.alarms.bubbleDetection) {
    actualFlowLpm = 0;
    activeAlarms.push('BUBBLE DETECTOR PUMP STOP ACTIVE (Small Bubble Detected)');
  } else if (circuit.airBubbleDetected && !circuit.alarms.bubbleDetection) {
    activeAlarms.push('UNMITIGATED AIR IN CIRCUIT (Bubble Detector is OFF!)');
  }

  if (pIn <= circuit.alarms.stopInlet) {
    actualFlowLpm = 0;
    activeAlarms.push(`STOP INLET PRESSURE ACTIVE (${pIn} mmHg <= ${circuit.alarms.stopInlet} mmHg) — PUMP STOPPED`);
  } else if (pIn <= circuit.alarms.maxInlet) {
    const cutbackFactor = Math.max(0.45, 1 - (circuit.alarms.maxInlet - pIn) * 0.018);
    actualFlowLpm = +(actualFlowLpm * cutbackFactor).toFixed(2);
    pIn = Math.round(circuit.alarms.maxInlet - 3);
    activeAlarms.push(`Max Inlet Cutback ACTIVE (${pIn} mmHg; Flow down-regulated)`);
  }

  if (pOut >= circuit.alarms.stopOutlet) {
    actualFlowLpm = 0;
    activeAlarms.push(`STOP OUTLET PRESSURE ACTIVE (+${pOut} mmHg >= +${circuit.alarms.stopOutlet} mmHg) — PUMP STOPPED`);
  } else if (pOut >= circuit.alarms.maxOutlet) {
    const cutbackFactor = Math.max(0.50, 1 - (pOut - circuit.alarms.maxOutlet) * 0.012);
    actualFlowLpm = +(actualFlowLpm * cutbackFactor).toFixed(2);
    pOut = Math.round(circuit.alarms.maxOutlet + 6);
    if (site === 4 || site === 5) {
      pOxIn = pOut - 8;
      if (site === 4) tmp = pOxIn - pOxOut;
    }
    activeAlarms.push(`Max Outlet Cutback ACTIVE (+${pOut} mmHg; Flow down-regulated)`);
  }

  if (tmp >= 60) {
    activeAlarms.push(`High Transmembrane Pressure Delta P (${tmp} mmHg)`);
  }

  circuit.flowLpm = Math.max(-0.2, actualFlowLpm);
  circuit.pIn = pIn;
  circuit.pOut = Math.max(0, pOut);
  circuit.pOxIn = Math.max(0, pOxIn);
  circuit.pOxOut = Math.max(0, pOxOut);
  circuit.tmp = Math.max(0, tmp);

  // 4. Gas Exchange & CO2 Kinetics Model
  const effectiveFlowLpm = Math.max(0, circuit.flowLpm * (1 - (patient.mode === 'VV' ? circuit.recirculationFraction : 0)));
  const finalEcmoSupportFraction = Math.max(0, circuit.flowLpm / Math.max(0.1, targets.boxATargetLpm));
  const oxyMembraneEfficiency = site === 4 ? Math.max(0.28, 1 - 0.68 * sev) : 1.0;

  // VA ECMO Left Ventricular (LV) Afterload Strain & LAP
  const afterloadStrain = isVA
    ? Math.max(0, (finalEcmoSupportFraction - 0.65) * (1.8 - effectiveContractility) - (patient.afterloadReducerActive ? 0.3 : 0))
    : 0;
  const lap = isVA
    ? Math.min(32, Math.max(4, Math.round(cvp + 2 + afterloadStrain * 14 - (patient.laVented ? 10 : 0))))
    : null;

  // Pulse Pressure & Hemodynamics
  let pulsePressure = isVA
    ? Math.max(2, Math.round(24 * (effectiveContractility / 2.5) * (1 - 0.45 * finalEcmoSupportFraction) - (hasTamponade ? 10 : 0) - (hasPtx ? 5 : 0)))
    : Math.max(12, Math.round(28 - (hasTamponade ? 12 : 0) - (hasPtx ? 6 : 0)));

  if (isVA && afterloadStrain > 0.45 && !patient.laVented) {
    pulsePressure = Math.min(pulsePressure, Math.max(2, Math.round(5 - (afterloadStrain - 0.45) * 6)));
  }

  if (pulsePressure <= 6 && isVA && circuit.onEcmo) {
    activeAlarms.push(`⚠️ LV AFTERLOAD STALL / AORTIC VALVE CLOSURE (Pulse Pressure ${pulsePressure} mmHg, LAP ${lap} mmHg — Risk of LV Thrombosis & Pulmonary Edema)`);
  }

  const radialMap = Math.max(24, baseMap);
  const radialSbp = Math.round(radialMap + pulsePressure * 0.65);
  const radialDbp = Math.round(radialMap - pulsePressure * 0.35);

  const femMap = Math.max(24, radialMap - (patient.weightKg < 5 ? 2 : 0));
  const femSbp = Math.round(femMap + pulsePressure * 0.68);
  const femDbp = Math.round(femMap - pulsePressure * 0.32);

  // Post-Oxygenator PO2 and SaO2
  const sweepActive = circuit.sweepLpm > 0.01 && circuit.flowLpm > 0.01;
  const postOxPo2 = sweepActive
    ? Math.round((45 + 3.6 * circuit.sweepFio2) * oxyMembraneEfficiency)
    : 42;
  const postOxSao2 = sweepActive
    ? Math.min(100, Math.round(84 + 16 * Math.min(1, postOxPo2 / 115)))
    : 65;

  circuit.postOxPo2 = postOxPo2;
  circuit.postOxSao2 = postOxSao2;

  // ECMO CO2 removal based on Sweep Gas Flow & Blood Flow
  // Calibrated so that at Initial Sweep = 0.25 * Target BFR, PaCO2 drops ~5-6 mmHg below preEclsPaco2!
  // And follows the exact Sweep Titration Formula: New Sweep = Current Sweep * (Current PCO2 / Desired PCO2)
  let steadyStatePaco2 = patient.preEclsPaco2;
  if (circuit.sweepLpm > 0.01 && effectiveFlowLpm > 0.02) {
    const refSweep = Math.max(0.04, 0.25 * Math.max(0.15, effectiveFlowLpm));
    const expectedPaco2AtRefSweep = Math.max(46, patient.preEclsPaco2 - 5);
    const sweepRatio = Math.pow(refSweep / circuit.sweepLpm, 0.78);
    const flowCapFactor = Math.min(1.0, effectiveFlowLpm / Math.max(0.08, targets.boxATargetLpm * 0.55));
    const ecmoTargetPaco2 = expectedPaco2AtRefSweep * sweepRatio * oxyMembraneEfficiency;
    const ventPull = (ventMinuteIndex - 1.0) * 6 * nativeGasExchangeFactor;
    steadyStatePaco2 = Math.round(
      patient.preEclsPaco2 * (1 - 0.85 * flowCapFactor) +
        (ecmoTargetPaco2 - ventPull) * (0.85 * flowCapFactor)
    );
  } else {
    // On minimal/zero sweep, PaCO2 stays near or rises above pre-ECLS value
    steadyStatePaco2 = Math.round(patient.preEclsPaco2 + (circuit.flowLpm < 0.05 ? 4 : 1));
  }
  steadyStatePaco2 = Math.max(22, Math.min(115, steadyStatePaco2));

  const prevPaco2 = (state.telemetry && typeof state.telemetry.paco2 === 'number')
    ? state.telemetry.paco2
    : patient.preEclsPaco2;

  let paco2 = steadyStatePaco2;
  if (timeDeltaMinutes > 0) {
    const alpha = 1 - Math.exp(-timeDeltaMinutes / 4.5);
    paco2 = Math.round(prevPaco2 + alpha * (steadyStatePaco2 - prevPaco2));
  } else {
    if (state.telemetry && typeof state.telemetry.paco2 === 'number') {
      paco2 = Math.round(prevPaco2 + 0.05 * (steadyStatePaco2 - prevPaco2));
    } else {
      paco2 = steadyStatePaco2;
    }
  }
  paco2 = Math.max(22, Math.min(115, paco2));

  // Post-Ox PCO2 and Post-Ox pH (Cap check: pH < 7.55)
  const postOxPco2 = sweepActive
    ? Math.max(16, Math.round(paco2 * Math.pow(Math.max(0.05, 0.22 * circuit.flowLpm) / Math.max(0.05, circuit.sweepLpm), 0.55)))
    : paco2;
  const postOxPh = +(7.40 - (postOxPco2 - 40) * 0.0072).toFixed(2);

  if (postOxPh >= 7.55 && sweepActive) {
    activeAlarms.push(`POST-OX ALKALOSIS WARNING (Post-Ox pH ${postOxPh} >= 7.55 Cap)`);
  }

  // Continuous exhaust CO2 & VCO2
  circuit.exhaustCo2 = sweepActive ? Math.min(65, Math.max(12, Math.round(paco2 * 0.58 * oxyMembraneEfficiency))) : 0;
  circuit.vco2 = sweepActive ? Math.round(circuit.sweepLpm * circuit.exhaustCo2 * 1.15) : 0;

  // 5. Patient Oxygenation (Pre-ductal SpO2, Post-ductal SpO2, PaO2, SvO2)
  const ecmoO2Contribution = Math.min(1.0, (effectiveFlowLpm / Math.max(0.1, targets.boxATargetLpm)) * (postOxSao2 / 100) * oxyMembraneEfficiency);
  const nativeO2Contribution = Math.min(1.0, nativeGasExchangeFactor * (vent.fio2 / 100) * (meanAirwayP / 14));

  const isFemoralVA = isVA && (patient.cannulaDesc || '').toLowerCase().includes('femoral');
  const isNeonatalPphn = patient.weightKg < 5.0 && (vent.inoPpm > 0 || patient.preEclsPaco2 >= 70);

  let postSpo2;
  let preSpo2;

  if (isFemoralVA) {
    postSpo2 = Math.min(100, Math.round(68 + 32 * ecmoO2Contribution));
    postSpo2 = Math.max(48, Math.min(100, postSpo2));

    if (nativeO2Contribution < 0.35 && effectiveContractility >= 1.3) {
      preSpo2 = Math.round(65 + 13 * Math.min(1, nativeO2Contribution / 0.35));
      activeAlarms.push(`⚠️ HARLEQUIN (NORTH-SOUTH) DIFFERENTIAL HYPOXEMIA: Pre-ductal SpO2 ${preSpo2}% vs Post-ductal ${postSpo2}%`);
    } else {
      preSpo2 = Math.round(postSpo2 * 0.70 + (55 + 40 * nativeO2Contribution) * 0.30);
    }
  } else {
    postSpo2 = Math.round(62 + 32 * ecmoO2Contribution + 14 * nativeO2Contribution - (hasPtx ? 14 : 0));
    postSpo2 = Math.max(48, Math.min(100, postSpo2));

    if (isNeonatalPphn) {
      const ductalGradient = ecmoO2Contribution < 0.65 ? Math.round(8 + 4 * (1 - ecmoO2Contribution / 0.65)) : 2;
      preSpo2 = Math.min(100, postSpo2 + ductalGradient);
    } else if (isVA) {
      preSpo2 = Math.min(100, postSpo2 + 1);
    } else {
      preSpo2 = Math.min(100, postSpo2 + (ecmoO2Contribution < 0.4 ? 5 : 1));
    }
  }
  preSpo2 = Math.max(50, Math.min(100, preSpo2));
  postSpo2 = Math.max(48, Math.min(100, postSpo2));

  const patientPao2 = Math.max(28, Math.round(30 + (postSpo2 - 60) * 1.85 + (ecmoO2Contribution > 0.7 ? 25 : 0) - (hasPtx ? 16 : 0)));

  // Venous SO2 (SvO2 / ScvO2)
  // Rises with oxygen delivery & Hgb, and spikes abnormally high (90-96%) during VV Recirculation!
  const hbFactor = Math.min(1.1, patient.labs.hb / 12.0);
  let trueMixedVenousSo2 = Math.round(45 + 28 * ecmoO2Contribution * hbFactor + 6 * nativeO2Contribution);
  trueMixedVenousSo2 = Math.max(32, Math.min(84, trueMixedVenousSo2));

  const inlineSvo2 = patient.mode === 'VV'
    ? Math.round(trueMixedVenousSo2 * (1 - circuit.recirculationFraction) + postOxSao2 * circuit.recirculationFraction)
    : trueMixedVenousSo2;

  circuit.svo2 = Math.max(30, Math.min(98, inlineSvo2));

  if (patient.mode === 'VV' && circuit.recirculationFraction >= 0.30) {
    activeAlarms.push(`High In-Line SvO2 (${circuit.svo2}%) with Patient Hypoxemia — Suspect Recirculation`);
  }

  // Refine Neonatal PPHN preSpo2 if RA is well-oxygenated (SvO2 > 75%)
  if (isNeonatalPphn && !isFemoralVA) {
    if (circuit.svo2 > 75) {
      preSpo2 = Math.min(100, postSpo2 + 1);
    }
  }

  // Lactate Dynamics over timeDeltaMinutes
  if (timeDeltaMinutes > 0) {
    if (postSpo2 >= 88 && finalEcmoSupportFraction >= 0.7 && !hasTamponade) {
      patient.labs.lactate = Math.max(0.8, +(patient.labs.lactate - 0.04 * timeDeltaMinutes).toFixed(2));
    } else if (radialMap < 35 || postSpo2 < 75 || hasTamponade) {
      patient.labs.lactate = +(patient.labs.lactate + 0.08 * timeDeltaMinutes).toFixed(2);
    }
  }
  const patientPh = +(7.40 - (paco2 - 40) * 0.0065 - (patient.labs.lactate > 2 ? (patient.labs.lactate - 2) * 0.012 : 0)).toFixed(2);

  // 6. Cerebral & Somatic NIRS (rSO2) & Neuro-Monitoring Alerts
  // Cerebral NIRS drops steeply if PaCO2 drops > 10 mmHg below target/pre-ECLS (cerebral vasoconstriction) or if hypoxemic/hypotensive
  const paco2DropFromPre = patient.preEclsPaco2 - paco2;
  const maxPermissibleDrop = 10 + Math.floor(state.elapsedMinutes / 240) * 5;
  const excessPaco2Drop = Math.max(0, paco2DropFromPre - maxPermissibleDrop);

  const vasoconstrictionPenalty = Math.round(excessPaco2Drop * 1.35);
  const baseCerebralNirs = Math.round(preSpo2 * 0.76 - vasoconstrictionPenalty - (baseMap < 40 ? (40 - baseMap) * 0.6 : 0));
  const nirsLeft = Math.max(32, Math.min(88, baseCerebralNirs));
  const nirsRight = Math.max(32, Math.min(88, baseCerebralNirs - (isVA ? 2 : 0)));
  const nirsSomatic = Math.max(35, Math.min(90, Math.round(postSpo2 * 0.78 - (patient.intravascularVolumeStatus < 0 ? 8 : 0) - (hasTamponade ? 14 : 0) - (hasPtx ? 8 : 0))));

  const tcmCo2 = paco2 + 2;
  const etco2 = Math.max(8, Math.round(paco2 * (0.45 + 0.35 * nativeGasExchangeFactor) * (1 - 0.5 * ecmoO2Contribution)));

  if (excessPaco2Drop > 2 || (paco2DropFromPre >= 10 && state.elapsedMinutes <= 60)) {
    activeAlarms.push(`ACUTE NEURO ALERT: TCM CO2/PaCO2 dropped ${paco2DropFromPre} mmHg (Cerebral NIRS ${nirsLeft}%/${nirsRight}%) — STAT ABG & Adjust Sweep!`);
  }

  // 7. Hemodynamics (HR & Rhythm)
  const hr = Math.round(
    (patient.weightKg < 6 ? 152 : 128) -
      18 * ecmoO2Contribution -
      patient.intravascularVolumeStatus * 12 +
      (hasTamponade ? 22 : 0) +
      (hasPtx ? 16 : 0)
  );

  const rhythm =
    circuit.flowLpm === 0 && patient.nativeCardiacIndex < 1.0
      ? 'Severe Sinus Bradycardia / Arrest'
      : hr > 145
      ? 'Sinus Tachycardia'
      : 'Normal Sinus Rhythm';

  circuit.activeAlarms = activeAlarms;

  state.telemetry = {
    rhythm,
    hr,
    radialSbp,
    radialDbp,
    radialMap,
    femSbp,
    femDbp,
    femMap,
    cvp,
    lap,
    preSpo2,
    postSpo2,
    etco2,
    tcmCo2,
    nirsLeft,
    nirsRight,
    nirsSomatic,
    paco2,
    pao2: patientPao2,
    ph: patientPh,
    postOxPco2,
    postOxPh
  };

  // 8. Bedside Assessment & Circuit Inspection narrative
  const colorDiff =
    circuit.flowLpm <= 0.02
      ? 'Stagnant blood in both limbs (NO FLOW)'
      : patient.mode === 'VV' && circuit.recirculationFraction >= 0.30
      ? 'MINIMAL color differential — both venous drainage and post-membrane return lines appear bright red ("arterialized" venous blood)'
      : !sweepActive
      ? 'Minimal color differential — both pre- and post-membrane limbs are dark venous (Sweep gas OFF)'
      : 'Appropriate color differential (wine-dark venous drainage vs. bright red post-membrane arterial return)';

  const chatterText =
    pIn <= -58 || site === 1
      ? 'Marked venous line chatter/flutter observed with intermittent atrial wall suction'
      : 'Smooth laminar flow without venous line chatter';

  const clotText =
    site === 4
      ? 'Multiple dark thrombi and heavy fibrin stranding visible across the pre-membrane oxygenator header'
      : site === 2
      ? 'Audible grinding/decoupling noise at centrifugal pump head'
      : site === 3
      ? 'External kink/compression noted along conduit tubing between pump head and oxygenator'
      : site === 5
      ? 'Sharp kink/obstruction noted along post-membrane arterial return limb near cannula connector'
      : 'Membrane lung and pump head free of visible clot or fibrin accumulation';

  const wireText = complications.wireCoiled
    ? '⚠️ PROCEDURAL ECHO ALERT: Guide wire tip appears coiled in Right Atrium / SVC — DO NOT advance cannula until repositioned!'
    : 'Cannula dressings intact without oozing; suture securement marks unchanged.';

  state.assessment = {
    circuitNote: `${wireText} ${colorDiff}. ${chatterText}. ${clotText}.`,
    patientNote: `Pupils 3mm equal and reactive. Capillary refill ${
      complications.tamponade || (circuit.flowLpm < targets.boxBTargetLpm && patient.nativeCardiacIndex < 1.2)
        ? '4–5 sec (mottled extremities, muffled heart tones)'
        : '2 sec (warm extremities)'
    }. Spontaneous respiratory effort ${vent.rate > 25 ? 'tachypneic with subcostal retractions' : 'minimal, synchronous with rest ventilation'}. Urine output ${(1.8 * Math.min(1.2, ecmoO2Contribution + 0.4)).toFixed(1)} mL/kg/hr.`
  };

  // 9. Protocol Adherence Scorecard Evaluation
  state.protocolChecks = window.evaluateProtocolChecks(state, targets);

  return state;
};

window.evaluateProtocolChecks = function(state, targets) {
  const { patient, circuit, vent, telemetry, elapsedMinutes } = state;
  const checks = [];

  // If patient is not yet on ECMO (Pre-Cannulation / Standby mode)
  if (!circuit.onEcmo) {
    const wireSafe = !state.complications.wireCoiled;
    const hemePrepared = patient.labs.hct >= 32 && patient.labs.platelets >= 100 && patient.labs.fibrinogen >= 120;
    const heparinReady = patient.labs.antiXa > 0.05 || patient.labs.ptt > 45;

    checks.push({
      id: 'pre-ecls-standby',
      title: 'Pre-Cannulation / Circuit Standby Mode',
      passed: true,
      detail: 'Patient not yet placed on ECMO bypass. Circuit primed, clamps on, console numbers in standby mode.'
    });

    checks.push({
      id: 'pre-wire-echo',
      title: 'Procedural Echo / Guide Wire Position Check',
      passed: wireSafe,
      detail: wireSafe
        ? 'Guide wire safely positioned into IVC under direct echo/fluoroscopy'
        : '⚠️ DANGER: Guide wire coiled in RA/SVC — must reposition prior to advancing cannula!'
    });

    checks.push({
      id: 'pre-blood-bank',
      title: 'Blood Bank & Standby Transfusion Readiness',
      passed: hemePrepared,
      detail: `Hct ${patient.labs.hct}% (goal >35%), Plt ${patient.labs.platelets}k (goal >150k in infant <1yr), Fib ${patient.labs.fibrinogen} mg/dL (goal >150 in <6mo)`
    });

    checks.push({
      id: 'pre-timeout-heparin',
      title: 'Intensivist Time-Out & Heparin Administration',
      passed: heparinReady,
      detail: heparinReady
        ? `Surgeon-directed heparin given (PTT ${patient.labs.ptt}s, Anti-Xa ${patient.labs.antiXa} U/mL)`
        : 'Perform Intensivist Time-Out checklist and give 75 U/kg heparin bolus before cannulation'
    });

    return checks;
  }

  // Check 1: BFR Schedule (Box B at Min 1 -> Box A at Min 15)
  const expectedFlow = targets.expectedNowBfrLpm;
  const flowDiff = Math.abs(circuit.flowLpm - expectedFlow);
  const withinTargetRange =
    elapsedMinutes >= 15
      ? circuit.flowLpm >= targets.boxAMinLpm * 0.92 && circuit.flowLpm <= targets.boxAMaxLpm * 1.08
      : flowDiff <= Math.max(0.06, expectedFlow * 0.28);

  checks.push({
    id: 'bfr-ramp',
    title: elapsedMinutes < 15 ? `Ramp-Up BFR (Min ${elapsedMinutes})` : '15-Min Goal Target BFR (Box A)',
    passed: withinTargetRange,
    detail:
      elapsedMinutes < 15
        ? `Current: ${circuit.flowLpm.toFixed(2)} L/min | Expected Step Target: ~${expectedFlow.toFixed(2)} L/min (Box B ${targets.boxBTargetLpm} -> Box A ${targets.boxATargetLpm} L/min)`
        : `Current: ${circuit.flowLpm.toFixed(2)} L/min | Box A Target Range: ${targets.boxAMinLpm}–${targets.boxAMaxLpm} L/min (${patient.mode === 'VA' ? '2.0–2.5' : '1.2–1.5'} L/min/m²)`
  });

  // Check 2: Sweep Gas & PaCO2 Strategy (Box M & Box K)
  const paco2Drop = patient.preEclsPaco2 - telemetry.paco2;
  const maxAllowedDrop = 10 + Math.floor(elapsedMinutes / 240) * 5;
  const paco2Safe = paco2Drop <= maxAllowedDrop && telemetry.paco2 <= patient.preEclsPaco2 + 4 && telemetry.postOxPh < 7.55;

  checks.push({
    id: 'paco2-neuro',
    title: 'Neuro-Protective PaCO2 & Sweep Titration (Box K & M)',
    passed: paco2Safe && circuit.sweepLpm > 0,
    detail: `Pre-ECLS PaCO2: ${patient.preEclsPaco2} mmHg | Current PaCO2: ${telemetry.paco2} mmHg (Drop: ${paco2Drop} mmHg; Max allowed: <${maxAllowedDrop} mmHg) | Post-Ox pH: ${telemetry.postOxPh} (<7.55 cap)`
  });

  // Check 3: QWS Safety Alarms Set to ECLS Run Mode
  const qwsRunSet =
    circuit.alarms.backflowPrevention === true &&
    circuit.alarms.maxInlet === -60 &&
    circuit.alarms.stopInlet === -100 &&
    circuit.alarms.maxOutlet === 250 &&
    circuit.alarms.stopOutlet === 300 &&
    circuit.alarms.bubbleDetection === true;

  checks.push({
    id: 'qws-alarms',
    title: 'Spectrum QWS ECLS Run Safety Alarms',
    passed: qwsRunSet,
    detail: qwsRunSet
      ? 'All 6 QWS Safety Alarms active (Backflow ON, Inlet -60/-100, Outlet +250/+300, Bubble ON Small)'
      : 'WARNING: QWS Console still has Default bypass alarm thresholds or disabled Backflow/Bubble detection'
  });

  // Check 4: Ventilator Weaning (Box D at 15 min & Rest Settings)
  const ventDangerCleared = elapsedMinutes < 15 ? true : vent.pip <= 32 && vent.peep <= 12;
  checks.push({
    id: 'vent-wean',
    title: elapsedMinutes < 120 ? '15-Minute Ventilator Danger-Range Wean (Box D)' : '2-Hourly Ventilator & iNO/Flolan Wean',
    passed: ventDangerCleared,
    detail:
      elapsedMinutes < 15
        ? `Wait until 15-min target BFR achieved before first ventilator wean (Current: ${vent.pip}/${vent.peep} cmH2O)`
        : `PIP ${vent.pip} cmH2O (<=32 at 15m, goal 20), PEEP ${vent.peep} cmH2O (<=12 at 15m, goal 10), Rate ${vent.rate} bpm`
  });

  // Check 5: Transfusion & Anticoagulation Thresholds
  const hctOk = patient.labs.hct >= 35;
  const pltThreshold = patient.weightKg < 8 && elapsedMinutes === 0 ? 150 : 100;
  const pltOk = patient.labs.platelets >= pltThreshold;
  const fibThreshold = patient.weightKg < 7 ? 150 : 100;
  const fibOk = patient.labs.fibrinogen >= fibThreshold;

  checks.push({
    id: 'heme-thresholds',
    title: 'Transfusion & Coagulation Thresholds',
    passed: hctOk && pltOk && fibOk,
    detail: `Hct ${patient.labs.hct}% (>35%) | Plt ${patient.labs.platelets}k (>${pltThreshold}k) | Fib ${patient.labs.fibrinogen} mg/dL (>${fibThreshold}) | INR ${patient.labs.inr} (<1.8) | AT3 ${patient.labs.at3}%`
  });

  // Check 6: Circuit Integrity & Patency
  const circuitClear = circuit.obstructionSite === 0 && circuit.recirculationFraction < 0.25 && !state.complications.wireCoiled;
  checks.push({
    id: 'circuit-patency',
    title: 'Circuit Mechanics & Cannula Position',
    passed: circuitClear,
    detail: circuitClear
      ? 'No active circuit obstruction, recirculation (<25%), or guidewire coiling'
      : `Active mechanical issue requiring intervention (Obstruction Site: ${circuit.obstructionSite || 'None'}, Recirculation: ${Math.round(circuit.recirculationFraction * 100)}%)`
  });

  return checks;
};
