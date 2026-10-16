// Interactive Turn-Based Clinical Progression Engine & Natural Language Order Parser

window.setFlowByTargetLpm = function(state, targetFlowLpm) {
  const targets = window.computeProtocolTargets(state);
  const maxRefFlow = targets.boxATargetLpm * 1.45;
  const clamped = Math.max(0, Math.min(maxRefFlow * 1.25, targetFlowLpm));
  if (clamped <= 0.01) {
    state.circuit.rpm = 0;
    return;
  }
  const rpmRatio = Math.pow(clamped / maxRefFlow, 1 / 1.15);
  state.circuit.rpm = Math.round(600 + rpmRatio * 3000);
};

// Natural-Language Bedside Physical Exam & Circuit Inspection Inquiry Evaluator
window.evaluateBedsideInquiry = function(lower, state) {
  const query = (lower || '')
    .replace(/@[a-zA-Z0-9_-]+/g, ' ')
    .replace(/\bperfusionist\b/g, ' ')
    .replace(/\brespiratory\b/g, ' ')
    .trim();
  const inquiries = [];
  const paco2Drop = state.patient.preEclsPaco2 - (state.telemetry?.paco2 || state.patient.preEclsPaco2);

  // 1. Neurological & Pupillary Exam
  if (
    lower.includes('pupil') ||
    lower.includes('perrl') ||
    lower.includes('neuro exam') ||
    lower.includes('cranial') ||
    lower.includes('fontanel') ||
    lower.includes('eyes')
  ) {
    if (paco2Drop >= 12 || (state.telemetry && state.telemetry.nirsLeft < 55)) {
      inquiries.push({
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
        answer: `Physical Exam (Neurology): Pupils are 4.5 mm bilaterally, sluggishly reactive to light with delayed direct/consensual constriction. Anterior fontanelle is soft and mildly depressed. Bifrontal Cerebral NIRS is low/asymmetric at ${state.telemetry.nirsLeft}% L / ${state.telemetry.nirsRight}% R (TCM CO2 ${state.telemetry.tcmCo2} mmHg). Patient is sedated and paralyzed.`,
        summary: 'Pupils 4.5mm sluggish, NIRS depressed'
      });
    } else {
      inquiries.push({
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-500',
        answer: `Physical Exam (Neurology): Pupils are 2.5 mm, equal, round, and briskly reactive to light bilaterally (PERRL). Anterior fontanelle is soft and level. Bifrontal Cerebral NIRS is stable at ${state.telemetry?.nirsLeft || 68}% L / ${state.telemetry?.nirsRight || 69}% R. Patient is synchronous with the ventilator and sedated on fentanyl/midazolam.`,
        summary: 'Pupils 2.5mm brisk/PERRL, fontanelle soft/flat'
      });
    }
  }

  // 2. Breath Sounds & Pulmonary Auscultation / ETT Check
  if (
    lower.includes('breath sound') ||
    lower.includes('listen to lung') ||
    lower.includes('listen to chest') ||
    lower.includes('chest rise') ||
    lower.includes('auscultat') ||
    lower.includes('crackles') ||
    lower.includes('wheez') ||
    lower.includes('rhonchi') ||
    lower.includes('suction ett') ||
    (lower.includes('ett') && lower.includes('check'))
  ) {
    const isCdh = (state.patient.name || '').toLowerCase().includes('cdh') || state.patient.preEclsPaco2 === 74;
    const isMas = (state.patient.name || '').toLowerCase().includes('mas') || state.patient.preEclsPaco2 === 78;
    const isPertussis = (state.patient.name || '').toLowerCase().includes('pertussis');

    if (state.complications && state.complications.pneumothorax) {
      inquiries.push({
        role: 'Bedside PICU/CICU RN & RT',
        badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
        answer: `Physical Exam (Pulmonary): ⚠️ ACUTE TENSION PNEUMOTHORAX! Auscultation reveals completely absent breath sounds over the right hemithorax with hyperresonance to percussion, marked tracheal deviation to the left, and visible asymmetric chest expansion. High peak airway pressure alarms sounding and SpO2 has crashed. Immediate needle decompression indicated!`,
        summary: 'Absent right breath sounds, hyperresonance, tracheal shift (Tension PTX)'
      });
    } else if (isCdh) {
      inquiries.push({
        role: 'Bedside PICU/CICU RN & RT',
        badgeColor: 'bg-purple-900 text-purple-200 border-purple-500',
        answer: `Physical Exam (Pulmonary): Auscultation reveals absent/distant breath sounds over the left hemithorax with bowel sounds heard in the left lower chest, and harsh bronchial breath sounds on the right. Minimal bilateral chest rise on lung-protective rest settings (${state.vent.mode} ${state.vent.pip}/${state.vent.peep}). ETT is taped securely at 9 cm at the alveolar ridge.`,
        summary: 'Left chest quiet w/ bowel sounds, harsh right breath sounds'
      });
    } else if (isMas) {
      inquiries.push({
        role: 'Bedside PICU/CICU RN & RT',
        badgeColor: 'bg-purple-900 text-purple-200 border-purple-500',
        answer: `Physical Exam (Pulmonary): Diffuse coarse crackles, scattered wheezes, and meconium rhonchi throughout bilateral lung fields. Gentle symmetric chest rise. ETT was suctioned for moderate meconium-stained yellowish secretions. In-line suction catheter is clear.`,
        summary: 'Diffuse coarse crackles & rhonchi, symmetric chest rise'
      });
    } else if (isPertussis) {
      inquiries.push({
        role: 'Bedside PICU/CICU RN & RT',
        badgeColor: 'bg-purple-900 text-purple-200 border-purple-500',
        answer: `Physical Exam (Pulmonary): Bilaterally diminished aeration with dense inspiratory rales and expiratory wheezes. ETT was suctioned for copious, tenacious, thick white mucus plugs. Minimal chest wall motion.`,
        summary: 'Dense bilateral rales/wheezes, thick tenacious mucus plugs'
      });
    } else {
      inquiries.push({
        role: 'Bedside PICU/CICU RN & RT',
        badgeColor: 'bg-purple-900 text-purple-200 border-purple-500',
        answer: `Physical Exam (Pulmonary): Bilateral breath sounds present with equal aeration; chest rise is gentle and symmetric on lung rest settings (${state.vent.mode} ${state.vent.pip}/${state.vent.peep} cmH2O). ETT depth verified and secure.`,
        summary: 'Bilateral breath sounds present, equal aeration'
      });
    }
  }

  // 3. Peripheral Pulses, Capillary Refill Time (CRT) & Limb Perfusion
  if (
    query.includes('pulse') ||
    query.includes('pulses') ||
    query.includes('crt') ||
    query.includes('cap refill') ||
    query.includes('capillary refill') ||
    /\bperfusion\b/.test(query) ||
    query.includes('extremit') ||
    query.includes('cool')
  ) {
    if (state.complications && state.complications.tamponade) {
      inquiries.push({
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
        answer: `Physical Exam (Cardiovascular): ⚠️ CARDIAC TAMPONADE! Heart sounds are distant and muffled. Radial and femoral pulses are extremely weak and thready with severe pulsus paradoxus (>15 mmHg inspiratory drop). Extremities are cold, pale, and mottled with capillary refill >5 seconds. Distended neck veins visible. STAT pericardiocentesis required!`,
        summary: 'Muffled heart sounds, thready pulses, pulsus paradoxus, CRT >5s'
      });
    } else if (state.circuit.pIn <= -58 || (state.patient.intravascularVolumeStatus || 0) < -0.3 || (state.circuit.flowLpm || 0) < 0.1) {
      inquiries.push({
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-amber-900 text-amber-200 border-amber-500',
        answer: `Physical Exam (Perfusion): Capillary refill time is prolonged at 4.5 seconds centrally and peripherally. Radial and dorsalis pedis pulses are weak and thready. Distal extremities are cool and pale to the mid-calf. Line chatter indicates hypovolemia / inadequate venous drainage preload.`,
        summary: 'CRT prolonged 4.5s, weak pulses, cool extremities'
      });
    } else if (state.patient.mode === 'VA') {
      inquiries.push({
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-sky-900 text-sky-200 border-sky-500',
        answer: `Physical Exam (Perfusion): Right radial arterial pulse is palpable with a pulsatile A-line waveform (pulse pressure ~16 mmHg). Femoral and pedal pulses are 2+ palpable bilaterally. Distal extremities are warm, pink, and well-perfused with brisk 2-second capillary refill.`,
        summary: 'Right radial pulsatile wave, CRT 2s, warm extremities'
      });
    } else {
      inquiries.push({
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-500',
        answer: `Physical Exam (Perfusion): Capillary refill time is brisk at 2 seconds centrally and peripherally. Brachial, radial, and femoral pulses are 2+ bounding. All four extremities are warm and well-perfused.`,
        summary: 'CRT 2s brisk, 2+ bounding pulses, warm pink'
      });
    }
  }

  // 4. Cannulation Site Dressing, Suture Ties & Bleeding Check
  if (
    lower.includes('dressing') ||
    lower.includes('cannula site') ||
    lower.includes('cannulation site') ||
    lower.includes('neck bleeding') ||
    lower.includes('ooz') ||
    lower.includes('hematoma') ||
    lower.includes('suture')
  ) {
    if ((state.patient.labs?.ptt || 0) > 85 || (state.patient.labs?.platelets || 150) < 90) {
      inquiries.push({
        role: 'Bedside PICU/CICU RN & Surgeon',
        badgeColor: 'bg-amber-900 text-amber-200 border-amber-500',
        answer: `Cannulation Site Inspection: Minor serosanguinous oozing noted at the right neck cannulation cutdown site, staining the outer sterile 2x2 gauze. No expanding hematoma or active pulsatile hemorrhage. Cannula Roman-sandal retention sutures and skin ties are intact.`,
        summary: 'Minor serosanguinous ooze, sutures intact, no hematoma'
      });
    } else {
      inquiries.push({
        role: 'Bedside PICU/CICU RN & Surgeon',
        badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-500',
        answer: `Cannulation Site Inspection: Right neck occlusive dressing is clean, dry, and intact with no bleeding, hematoma, or subcutaneous swelling. Cannula insertion depth markings at the skin are unchanged; retention sutures are snug.`,
        summary: 'Neck dressing clean/dry/intact, ties snug'
      });
    }
  }

  // 5. Urine Output & Fluid Balance Check
  if (
    lower.includes('urine') ||
    lower.includes('uop') ||
    lower.includes('foley') ||
    lower.includes('fluid balance') ||
    lower.includes('i&o')
  ) {
    if ((state.patient.labs?.pfHgb || 0) > 60) {
      inquiries.push({
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
        answer: `Urine & Hemolysis Inspection: ⚠️ Foley catheter bag drainage has turned dark port-wine / cola colored! Severe hemoglobinuria and mechanical hemolysis from negative pressure line chatter cavitation (Plasma Free Hemoglobin is ${state.patient.labs.pfHgb} mg/dL). Preload must be resuscitated immediately!`,
        summary: `Dark port-wine cola urine, PFHgb elevated at ${state.patient.labs.pfHgb} mg/dL`
      });
    } else {
      inquiries.push({
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-sky-900 text-sky-200 border-sky-500',
        answer: `Renal / Fluid Balance: Foley catheter is draining clear amber urine at 1.8 mL/kg/hr over the past hour. Cumulative fluid balance is neutral. Bladder pressure is normal and renal perfusion is preserved.`,
        summary: 'UOP 1.8 mL/kg/hr clear amber, fluid balance neutral'
      });
    }
  }

  // 6. Bridge Clamp Verification (Perfusionist)
  if (
    lower.includes('bridge clamp') ||
    lower.includes('bridge clamped') ||
    lower.includes('bridge open') ||
    lower.includes('check bridge') ||
    (lower.includes('bridge') && lower.includes('clamp'))
  ) {
    inquiries.push({
      role: 'ECMO Specialist / Perfusionist',
      badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-500',
      answer: `Bridge Inspection: Dual bridge clamps are locked tight in place across the bridge line and tagged with yellow safety bands. The bridge line is completely isolated with no shunting or stasis leak.`,
      summary: 'Dual bridge clamps locked tight with yellow safety bands'
    });
  }

  // 7. Oxygenator Inspection / Clot / Sweep Exhaust
  if (
    lower.includes('oxygenator clot') ||
    lower.includes('membrane clot') ||
    lower.includes('header clot') ||
    lower.includes('inspect oxygenator') ||
    lower.includes('sweep exhaust') ||
    lower.includes('exhaust port')
  ) {
    if (state.circuit.obstructionSite === 4) {
      inquiries.push({
        role: 'ECMO Specialist / Perfusionist',
        badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
        answer: `Oxygenator Inspection: ⚠️ Pre-membrane header inspection reveals visible dark fibrinous thrombus strands tracking into the polymethylpentene hollow fibers! Transmembrane pressure ΔP is elevated at ${state.circuit.tmp} mmHg and post-ox PO2 is falling. Primed backup oxygenator is at the bedside ready for emergency exchange.`,
        summary: 'Visible dark thrombus strands in pre-membrane header, high ΔP'
      });
    } else {
      inquiries.push({
        role: 'ECMO Specialist / Perfusionist',
        badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-500',
        answer: `Oxygenator Inspection: Pre-membrane and post-membrane headers are completely clean with no visible fibrin stranding, clot deposition, or platelet white thrombus. The sweep gas exhaust port is dry without plasma leakage or moisture condensation.`,
        summary: 'Oxygenator headers pristine, no fibrin/clots, sweep exhaust dry'
      });
    }
  }

  // 8. Venous Line Chatter & Pre-Pump Drainage
  if (
    lower.includes('line chatter') ||
    lower.includes('venous chatter') ||
    lower.includes('chattering') ||
    lower.includes('shudder') ||
    lower.includes('line shake')
  ) {
    if (state.circuit.pIn <= -58 || state.circuit.obstructionSite === 1) {
      inquiries.push({
        role: 'ECMO Specialist / Perfusionist',
        badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
        answer: `Venous Line Inspection: Significant visible chatter and vibration in the venous line raceway. P_in is bouncing down to ${state.circuit.pIn} mmHg (below -60 alarm limit) due to right atrial wall collapse. We should reduce RPM slightly and administer a volume bolus.`,
        summary: 'Significant line chatter, P_in dipping below -60 mmHg'
      });
    } else {
      inquiries.push({
        role: 'ECMO Specialist / Perfusionist',
        badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-500',
        answer: `Venous Line Inspection: Venous drainage line is completely calm and quiet without chatter or vibration. Blood column is steady and laminar with P_in stable at ${state.circuit.pIn} mmHg.`,
        summary: 'Venous line calm/quiet, laminar flow, P_in stable'
      });
    }
  }

  // 9. Water Bath / Heater-Cooler Unit Temperature
  if (
    lower.includes('water bath') ||
    lower.includes('heater cooler') ||
    lower.includes('cooler temp') ||
    lower.includes('water temp') ||
    lower.includes('circuit temp') ||
    lower.includes('blood temp')
  ) {
    inquiries.push({
      role: 'ECMO Specialist / Perfusionist',
      badgeColor: 'bg-sky-900 text-sky-200 border-sky-500',
      answer: `Heater-Cooler Unit: Water bath is running normally and set to ${state.circuit.waterTemp || 37.0}°C. Water hoses are warm and kink-free. Circuit blood temperature probe reads ${state.circuit.bloodTemp || 36.9}°C, matching patient core temperature.`,
      summary: `Water bath set 37.0°C, blood temp ${state.circuit.bloodTemp || 36.9}°C`
    });
  }

  // 10. Ultrasonic Bubble Detector & Circuit Microbubbles
  if (
    lower.includes('air bubble') ||
    lower.includes('bubbles') ||
    lower.includes('bubble detector') ||
    lower.includes('microbubble')
  ) {
    if (state.circuit.airBubbleDetected) {
      inquiries.push({
        role: 'ECMO Specialist / Perfusionist',
        badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
        answer: `Bubble Detector Alert: ⚠️ Small ultrasonic bubble detector has triggered! Microbubbles visualized in the venous conduit. Tubing clamps are in hand and ready at the bedside.`,
        summary: 'Bubble detector triggered, microbubbles in venous line'
      });
    } else {
      inquiries.push({
        role: 'ECMO Specialist / Perfusionist',
        badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-500',
        answer: `Bubble Detector Inspection: Ultrasonic bubble detector is active and armed in Small mode. Pigtails, connectors, and oxygenator have zero microbubbles. Priming integrity confirmed.`,
        summary: 'Bubble detector armed Small, zero microbubbles'
      });
    }
  }

  // 11. Color Differential & Recirculation
  if (
    lower.includes('color differential') ||
    lower.includes('limb color') ||
    lower.includes('venous color') ||
    lower.includes('color of lines') ||
    lower.includes('recirculation check')
  ) {
    if (state.patient.mode === 'VV' && (state.circuit.recirculationFraction || 0) >= 0.30) {
      inquiries.push({
        role: 'ECMO Specialist / Perfusionist',
        badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
        answer: `Color Inspection: Recirculation detected! Both the venous drainage limb and arterial return limb are bright crimson red (venous ScvO2 ${state.circuit.svo2}% vs post-ox SaO2 ${state.circuit.postOxSao2}%), while patient SpO2 is only ${state.telemetry.postSpo2}%. The return jet is recirculating directly into the drainage ports.`,
        summary: 'VV Recirculation detected: both limbs bright red'
      });
    } else {
      inquiries.push({
        role: 'ECMO Specialist / Perfusionist',
        badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-500',
        answer: `Color Inspection: Marked, healthy color differential across the membrane lung. Venous drainage limb is dark burgundy-red (ScvO2 ${state.circuit.svo2}%) and post-membrane arterial limb is bright scarlet-red (Post-Ox SaO2 ${state.circuit.postOxSao2}%).`,
        summary: 'Healthy color differential: dark venous vs bright arterial'
      });
    }
  }

  // 12. Sampling Stopcocks & Pressure Transducers
  if (
    lower.includes('stopcock') ||
    lower.includes('stopcocks') ||
    lower.includes('pigtail') ||
    lower.includes('transducer') ||
    lower.includes('zero transducer') ||
    lower.includes('dead-end')
  ) {
    inquiries.push({
      role: 'ECMO Specialist / Perfusionist',
      badgeColor: 'bg-sky-900 text-sky-200 border-sky-500',
      answer: `Circuit Manifold Inspection: All stopcocks on SC1, Conduit Pigtail A, and pre-/post-membrane pressure monitoring ports are in the OFF position with vented caps replaced by solid dead-end caps. Pressure transducers zeroed to mid-axillary line.`,
      summary: 'All stopcocks OFF with solid dead-end caps, transducers zeroed'
    });
  }

  // 13. Lab Status Check
  if (
    lower.includes('lab status') ||
    lower.includes('are labs back') ||
    lower.includes('are labs ready') ||
    lower.includes('check labs') ||
    lower.includes('lab results')
  ) {
    const readyLabs = (state.pendingLabs || []).filter((l) => l.status === 'ready');
    const pendingLabs = (state.pendingLabs || []).filter((l) => l.status === 'pending');

    if (readyLabs.length > 0) {
      const latest = readyLabs[readyLabs.length - 1];
      inquiries.push({
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-500',
        answer: `Lab Status: ${latest.name} (resulted at Min ${latest.readyMinute}): Patient ABG pH ${latest.results.ph}, PaCO2 ${latest.results.paco2} mmHg, PaO2 ${latest.results.pao2} mmHg, Lactate ${latest.results.lactate} mmol/L | Post-Ox pH ${latest.results.postOxPh}, PO2 ${latest.results.postOxPo2} mmHg | SvO2 ${latest.results.preOxSvo2}%. Review complete details in your Labs tab!`,
        summary: 'Completed labs ready for review in Labs tab'
      });
    } else if (pendingLabs.length > 0) {
      const p = pendingLabs[0];
      const remainingMin = Math.max(1, p.readyMinute - (state.elapsedMinutes || 0));
      inquiries.push({
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-amber-900 text-amber-200 border-amber-500',
        answer: `Lab Status: ${p.name} was ordered at Min ${p.orderedMinute} and is currently processing on the analyzer (~${remainingMin} min remaining). We will alert you immediately the moment results print!`,
        summary: `Lab pending: ~${remainingMin} min remaining`
      });
    } else {
      inquiries.push({
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-slate-800 text-slate-300 border-slate-600',
        answer: `Lab Status: No blood gas or core laboratory orders are currently pending on file. We are on standby if you would like to order a STAT blood gas or coag panel.`,
        summary: 'No labs pending on file'
      });
    }
  }

  return inquiries;
};

// Dynamic Clinical Issue Progression Evaluator (Deterioration vs. Resolution)
window.evaluateClinicalIssueProgression = function(prevState, nextState, actionNotes, lower) {
  const currentTurn = Math.max(1, Math.floor((nextState.elapsedMinutes || 1) / 3) + 1);

  // 1. Pre-Cannulation Guide Wire Coiling -> Cannulation -> Tamponade
  if (prevState.complications && prevState.complications.wireCoiled) {
    const verifiedWire =
      lower.includes('echo') ||
      lower.includes('fluoro') ||
      lower.includes('ultrasound') ||
      lower.includes('wire') ||
      lower.includes('redirect');
    const attemptedCannulation =
      lower.includes('cannulat') ||
      lower.includes('initiate') ||
      lower.includes('start ecmo') ||
      lower.includes('clamps off') ||
      lower.includes('release clamp') ||
      lower.includes('place on ecmo') ||
      lower.includes('advance cannula');

    if (verifiedWire) {
      nextState.complications.wireCoiled = false;
      actionNotes.push('Echo check performed: Guide wire verified and safely redirected into IVC prior to cannula insertion.');
    } else if (attemptedCannulation || nextState.circuit.onEcmo) {
      nextState.complications.wireCoiled = false;
      nextState.complications.tamponade = true;
      actionNotes.push(
        '🚨 CRITICAL COMPLICATION: Cannula was advanced over an unverified, coiled guide wire! The stiff wire perforated the thin right atrial wall, causing acute Hemopericardium & Cardiac Tamponade! MAP crashed to 26 mmHg, CVP spiked to 19 mmHg, and heart tones became distant.'
      );
      nextState.teamDialogue.push({
        id: 'dlg-tamp-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'Interventional / Echo Cardiologist & Surgeon',
        badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
        message: '⚠️ "Doctor! Sudden hemodynamic collapse immediately upon cannula advancement! On echo, I see a massive circumferential pericardial effusion with right ventricular diastolic collapse! This is acute cardiac tamponade from guidewire perforation—we need STAT pericardiocentesis!"',
        expiresTurn: 999
      });
    }
  }

  // 2. Active Cardiac Tamponade
  if (prevState.complications && prevState.complications.tamponade) {
    const resolvedTamponade =
      lower.includes('pericardiocentesis') ||
      lower.includes('drain pericard') ||
      lower.includes('subxiphoid') ||
      lower.includes('evacuate effusion');
    if (resolvedTamponade) {
      nextState.complications.tamponade = false;
    } else {
      actionNotes.push(
        '⚠️ Severe Untreated Cardiac Tamponade: Pericardial fluid under tension is severely restricting diastolic filling. MAP remains critically depressed with PEA arrest imminent!'
      );
    }
  }

  // 3. Minute 15 Danger PIP (>32 cmH2O) -> Tension Pneumothorax
  if (
    prevState.elapsedMinutes < 15 &&
    nextState.elapsedMinutes >= 15 &&
    nextState.circuit.onEcmo &&
    !nextState.complications.pneumothorax
  ) {
    if (nextState.vent.pip > 32) {
      nextState.complications.pneumothorax = true;
      nextState.patient.nativeCompliance = 0.14;
      actionNotes.push(
        `🚨 CRITICAL COMPLICATION: High mechanical PIP (${nextState.vent.pip} cmH2O) was left unweaned past Minute 15 on full ECMO bypass! High alveolar shear stress caused pulmonary barotrauma and an acute Tension Pneumothorax! Right breath sounds are absent, air leak is severe, and desaturation developed.`
      );
      nextState.teamDialogue.push({
        id: 'dlg-ptx-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'Pediatric Respiratory Therapist (RT)',
        badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
        message: '⚠️ "Doctor! Sudden desaturation and high peak pressure alarms! Right hemithorax is tympanic to percussion with completely absent breath sounds, and the mediastinum is pushed to the left. Tension pneumothorax confirmed—we need emergency needle decompression!"',
        expiresTurn: 999
      });
    } else {
      actionNotes.push(
        `✅ Box D First Ventilator Wean executed at Minute 15: Danger PIP weaned to ${nextState.vent.pip} cmH2O (<=32) and PEEP to ${nextState.vent.peep} cmH2O (<=12), protecting native lungs from barotrauma.`
      );
    }
  }

  // 4. Active Tension Pneumothorax
  if (prevState.complications && prevState.complications.pneumothorax) {
    const resolvedPtx =
      lower.includes('needle decompression') ||
      lower.includes('needle thoracostomy') ||
      lower.includes('chest tube') ||
      lower.includes('tube thoracostomy') ||
      lower.includes('thoracentesis');
    if (resolvedPtx) {
      nextState.complications.pneumothorax = false;
      nextState.patient.nativeCompliance = 0.40;
    } else {
      actionNotes.push(
        '⚠️ Severe Untreated Tension Pneumothorax: Mediastinal shift and venous compression persisting. Severe hypoxemia and low cardiac output state continue!'
      );
    }
  }

  // 5. Site 4 Oxygenator Thrombosis
  if (prevState.circuit.obstructionSite === 4 && prevState.circuit.obstructionSeverity > 0) {
    const replacedOxy =
      lower.includes('exchange oxygenator') ||
      lower.includes('replace oxygenator') ||
      lower.includes('new oxygenator') ||
      lower.includes('swap circuit');
    if (replacedOxy) {
      nextState.circuit.obstructionSite = 0;
      nextState.circuit.obstructionSeverity = 0;
      nextState.circuit.tmp = 22;
    } else {
      nextState.circuit.obstructionSeverity = Math.min(0.98, +(nextState.circuit.obstructionSeverity + 0.12).toFixed(2));
      nextState.patient.labs.lactate = +(nextState.patient.labs.lactate + 0.5).toFixed(1);
      actionNotes.push(
        `⚠️ Unaddressed Oxygenator Thrombosis: Fibrin stranding and thrombus propagating across membrane fibers. TMP has climbed higher and systemic lactate rose to ${nextState.patient.labs.lactate} mmol/L due to worsening gas transfer efficiency.`
      );
    }
  }

  // 6. Site 1 Venous Suction / Line Chatter
  if (
    prevState.circuit.obstructionSite === 1 ||
    prevState.circuit.pIn <= -55 ||
    (prevState.circuit.flowLpm < 0.3 && prevState.patient.intravascularVolumeStatus < -0.5)
  ) {
    const givenVolume =
      lower.includes('volume') ||
      lower.includes('bolus') ||
      lower.includes('plasmalyte') ||
      lower.includes('albumin') ||
      lower.includes('prbc') ||
      lower.includes('blood') ||
      lower.includes('ffp');
    const loweredRpm =
      lower.includes('lower rpm') ||
      lower.includes('reduce rpm') ||
      lower.includes('drop rpm') ||
      lower.includes('decrease rpm') ||
      (lower.includes('rpm') && (lower.includes('down') || lower.includes('decrease')));

    if (givenVolume || loweredRpm) {
      nextState.circuit.obstructionSite = 0;
      nextState.circuit.obstructionSeverity = 0;
      actionNotes.push('✅ Venous drainage stabilized: Preload restored and pump suction relieved. Line chatter resolved.');
    } else {
      nextState.patient.labs.pfHgb = Math.min(180, nextState.patient.labs.pfHgb + 30);
      actionNotes.push(
        `⚠️ Unaddressed Line Chatter: Persistent negative suction cavitation has sheared red blood cells! Plasma Free Hemoglobin (PFHgb) spiked to ${nextState.patient.labs.pfHgb} mg/dL and Foley bag drainage has turned dark port-wine colored!`
      );
      nextState.teamDialogue.push({
        id: 'dlg-chat-worse-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
        message: `⚠️ "Doctor! The venous line is still fluttering violently, and the urine in Sofia's Foley bag has turned dark port-wine / cola colored! PFHgb is ${nextState.patient.labs.pfHgb} mg/dL—we have acute cavitation hemolysis!"`,
        expiresTurn: 999
      });
    }
  }

  // 7. VV Recirculation
  if (
    prevState.patient.mode === 'VV' &&
    (prevState.circuit.recirculationFraction || 0) >= 0.25
  ) {
    const repositioned =
      lower.includes('reposition') ||
      lower.includes('rotate') ||
      lower.includes('adjust cannula');
    if (repositioned) {
      nextState.circuit.recirculationFraction = 0.05;
      nextState.circuit.baseRecirculation = 0.05;
    } else if (lower.includes('rpm') || lower.includes('flow') || lower.includes('bfr')) {
      nextState.circuit.recirculationFraction = Math.min(0.75, +(nextState.circuit.recirculationFraction + 0.10).toFixed(2));
      nextState.circuit.baseRecirculation = nextState.circuit.recirculationFraction;
      actionNotes.push(
        `⚠️ Recirculation Exacerbated: Increasing centrifugal pump speed without rotating the cannula drew more oxygenated return jet directly back into the drainage ports (recirculation fraction: ${Math.round(nextState.circuit.recirculationFraction * 100)}%).`
      );
    }
  }

  // 8. PaCO2 Plummet / Neuro Vasoconstriction
  const paco2Drop = prevState.patient.preEclsPaco2 - (prevState.telemetry?.paco2 || prevState.patient.preEclsPaco2);
  if (paco2Drop >= 12 && prevState.circuit.sweepLpm > 0.01) {
    if (!lower.includes('sweep')) {
      actionNotes.push(
        `⚠️ PaCO2 drop >=12 mmHg uncorrected: Prolonged cerebral vasoconstriction with depressed Cerebral NIRS (${nextState.telemetry?.nirsLeft}% L / ${nextState.telemetry?.nirsRight}% R). Titrate sweep gas per formula!`
      );
    }
  }
};

window.processBedsideCommand = async function(commandText, currentState, apiKey, modelName = 'gemini-2.5-flash', turnNumber = 1) {
  const raw = (commandText || '').trim();
  const lower = raw.toLowerCase();
  let nextState = JSON.parse(JSON.stringify(currentState));
  nextState.pendingLabs = nextState.pendingLabs || [];
  nextState.teamDialogue = nextState.teamDialogue || [];

  const targets = window.computeProtocolTargets(nextState);
  const actionNotes = [];
  let explicitTimeAdvance = null;
  const currentTurn = turnNumber || Math.max(1, Math.floor((nextState.elapsedMinutes || 1) / 3) + 1);

  // Extract Target Bedside Team Role from @mention
  let targetRole = null;
  let targetRoleTag = null;
  let targetBadgeColor = null;

  const roleMatch = raw.match(/@([a-zA-Z0-9_-]+)/);
  if (roleMatch) {
    const tag = roleMatch[1].toLowerCase();
    if (['perfusionist', 'perfusion', 'ecmo', 'specialist', 'pump'].includes(tag)) {
      targetRole = 'ECMO Specialist / Perfusionist';
      targetRoleTag = 'perfusionist';
      targetBadgeColor = 'bg-sky-900 text-sky-200 border-sky-500';
    } else if (['rn', 'nurse', 'picu', 'cicu', 'bedside'].includes(tag)) {
      targetRole = 'Bedside PICU/CICU RN';
      targetRoleTag = 'rn';
      targetBadgeColor = 'bg-emerald-900 text-emerald-200 border-emerald-500';
    } else if (['rt', 'respiratory', 'vent', 'ventilator'].includes(tag)) {
      targetRole = 'Pediatric Respiratory Therapist (RT)';
      targetRoleTag = 'rt';
      targetBadgeColor = 'bg-purple-900 text-purple-200 border-purple-500';
    } else if (['surgeon', 'echo', 'cardiology', 'cardio', 'fellow', 'surgical'].includes(tag)) {
      targetRole = 'ECLS Surgeon / Echo Cardiologist';
      targetRoleTag = 'surgeon';
      targetBadgeColor = 'bg-rose-900 text-rose-200 border-rose-500';
    }
  }

  const isAffirmative = /\b(yes|yeah|yep|confirm|confirmed|proceed|approved|approve|agree|agreed|do it|please do|go ahead|okay|ok|sure)\b/i.test(lower);

  // Contextual Affirmative Order Execution for Targeted Bedside Team Members
  if (targetRoleTag === 'perfusionist') {
    const qwsAlarmsNotSet =
      !nextState.circuit.alarms.backflowPrevention ||
      nextState.circuit.alarms.maxInlet !== -60 ||
      nextState.circuit.alarms.maxOutlet !== 250;

    // Perfusionist Case 1: QWS Run Alarms
    if (qwsAlarmsNotSet && (isAffirmative || lower.includes('alarm') || lower.includes('run') || lower.includes('qws') || lower.includes('switch') || lower.includes('set'))) {
      nextState.circuit.alarms = {
        backflowPrevention: true,
        maxInlet: -60,
        stopInlet: -100,
        maxOutlet: 250,
        stopOutlet: 300,
        bubbleDetection: true,
        gaugeNarrowed: true
      };
      const ackMsg = 'ECMO Specialist / Perfusionist: "Understood, Doctor! Switching all 6 safety alarms to ECLS Run mode (Backflow Prevention ON, Inlet -60/-100, Outlet +250/+300, Small Bubble Detection ON). Safety envelope active."';
      actionNotes.push(ackMsg);
      nextState.teamDialogue.unshift({
        id: 'dlg-ack-perf-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'ECMO Specialist / Perfusionist',
        badgeColor: 'bg-sky-900 text-sky-200 border-sky-500',
        message: 'Understood, Doctor! Switching all 6 safety alarms to ECLS Run mode (Backflow ON, Inlet -60/-100, Outlet +250/+300, Small Bubble ON). Safety envelope active.',
        expiresTurn: currentTurn + 2
      });
    }

    // Perfusionist Case 2: Cannulate / Release Clamps / Start Box B flow
    if (!nextState.circuit.onEcmo && (isAffirmative || lower.includes('ecmo') || lower.includes('box b') || lower.includes('clamp') || lower.includes('start') || lower.includes('initiate') || lower.includes('release'))) {
      nextState.circuit.onEcmo = true;
      if (nextState.complications.wireCoiled) nextState.complications.wireCoiled = false;
      if (nextState.elapsedMinutes === 0) nextState.elapsedMinutes = 1;
      window.setFlowByTargetLpm(nextState, targets.boxBTargetLpm);
      nextState.circuit.sweepLpm = +(0.25 * targets.boxBTargetLpm).toFixed(2);
      nextState.circuit.sweepFio2 = 80;
      const ecmoAck = `ECMO Specialist / Perfusionist: "Circuit clamps released, Doctor! Initiated ${nextState.patient.mode} ECMO bypass: blood flow ramped to Minute 1 Box B target (${targets.boxBTargetLpm} L/min = ${targets.boxBMlKg} mL/kg/min) and Box M Sweep gas started at ${nextState.circuit.sweepLpm.toFixed(2)} L/min (80% FiO2). ECMO Console gauges are LIVE."`;
      actionNotes.push(ecmoAck);
      nextState.teamDialogue.unshift({
        id: 'dlg-ack-perf-start-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'ECMO Specialist / Perfusionist',
        badgeColor: 'bg-sky-900 text-sky-200 border-sky-500',
        message: `Circuit clamps released! Flow set to Minute 1 Box B (${targets.boxBTargetLpm} L/min) and sweep gas started at ${nextState.circuit.sweepLpm.toFixed(2)} L/min (80% FiO2).`,
        expiresTurn: currentTurn + 2
      });
    }

    // Perfusionist Case 3: Oxygenator Exchange (Site 4 Obstruction)
    if (nextState.circuit.obstructionSite === 4 && (isAffirmative || lower.includes('exchange') || lower.includes('replace') || lower.includes('swap') || lower.includes('oxygenator') || lower.includes('circuit'))) {
      nextState.circuit.obstructionSite = 0;
      nextState.circuit.obstructionSeverity = 0;
      nextState.circuit.tmp = 22;
      const oxAck = `ECMO Specialist / Perfusionist: "Emergency circuit exchange executed smoothly, Doctor! Primed backup oxygenator spliced in, lines transferred with zero air entrainment. Membrane ΔP normalized from critical down to ${nextState.circuit.tmp} mmHg."`;
      actionNotes.push(oxAck);
      nextState.teamDialogue.unshift({
        id: 'dlg-ack-perf-ox-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'ECMO Specialist / Perfusionist',
        badgeColor: 'bg-sky-900 text-sky-200 border-sky-500',
        message: `Emergency oxygenator exchange completed! Primed backup spliced in without air entrainment. Membrane ΔP dropped to ${nextState.circuit.tmp} mmHg.`,
        expiresTurn: currentTurn + 2
      });
    }

    // Perfusionist Case 4: Relieve Line Chatter / Suction (Site 1 or P_in <= -58)
    if ((nextState.circuit.obstructionSite === 1 || nextState.circuit.pIn <= -58) && (isAffirmative || lower.includes('lower') || lower.includes('reduce') || lower.includes('rpm') || lower.includes('chatter') || lower.includes('suction'))) {
      nextState.circuit.rpm = Math.max(800, nextState.circuit.rpm - 250);
      nextState.circuit.obstructionSite = 0;
      nextState.circuit.obstructionSeverity = 0;
      const chatAck = `ECMO Specialist / Perfusionist: "Dialing back pump speed to ${nextState.circuit.rpm} RPM, Doctor. Atrial wall suction released, P_in normalized, and line chatter stopped."`;
      actionNotes.push(chatAck);
      nextState.teamDialogue.unshift({
        id: 'dlg-ack-perf-chat-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'ECMO Specialist / Perfusionist',
        badgeColor: 'bg-sky-900 text-sky-200 border-sky-500',
        message: `Dialed back pump speed to ${nextState.circuit.rpm} RPM. Venous suction relieved and line chatter resolved.`,
        expiresTurn: currentTurn + 2
      });
    }

    // Perfusionist Case 5: Advance Ramp Step during Minute 1-15
    if (nextState.circuit.onEcmo && nextState.elapsedMinutes < 15 && (isAffirmative || lower.includes('ramp') || lower.includes('step') || lower.includes('advance')) && !lower.includes('check') && !lower.includes('water bath') && !lower.includes('stopcock') && !lower.includes('bubble') && !lower.includes('color')) {
      const nextIdx = Math.min(5, targets.currentStepIndex + 1);
      const stepTarget = targets.rampSteps[nextIdx];
      window.setFlowByTargetLpm(nextState, stepTarget.flowLpm);
      explicitTimeAdvance = 3;
      const rampAck = `ECMO Specialist / Perfusionist: "Advancing 3-minute ramp step, Doctor! Dialed BFR to ${stepTarget.flowLpm} L/min (${stepTarget.mlKg} mL/kg/min). Hemodynamics stable."`;
      actionNotes.push(rampAck);
      nextState.teamDialogue.unshift({
        id: 'dlg-ack-perf-ramp-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'ECMO Specialist / Perfusionist',
        badgeColor: 'bg-sky-900 text-sky-200 border-sky-500',
        message: `Advanced ramp step: BFR set to ${stepTarget.flowLpm} L/min (${stepTarget.mlKg} mL/kg/min).`,
        expiresTurn: currentTurn + 2
      });
    }
  }

  if (targetRoleTag === 'rt') {
    // RT Case 1: Emergency Needle Decompression for Tension Pneumothorax
    if (nextState.complications.pneumothorax && (isAffirmative || lower.includes('needle') || lower.includes('decompress') || lower.includes('chest tube') || lower.includes('thoracostomy'))) {
      nextState.complications.pneumothorax = false;
      nextState.patient.nativeCompliance = 0.40;
      const ptxAck = 'Pediatric Respiratory Therapist (RT): "STAT needle thoracostomy placed in the right 2nd intercostal space mid-clavicular line! Immediate audible rush of pressurized pleural air. Right lung re-expanded, peak airway pressure dropped, and SpO2 rebounded!"';
      actionNotes.push(ptxAck);
      nextState.teamDialogue.unshift({
        id: 'dlg-ack-rt-ptx-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'Pediatric Respiratory Therapist (RT)',
        badgeColor: 'bg-purple-900 text-purple-200 border-purple-500',
        message: 'STAT needle thoracostomy placed in 2nd ICS MCL! Pleural air evacuated, right lung re-expanded, and SpO2 rebounded.',
        expiresTurn: currentTurn + 2
      });
    }

    // RT Case 2: Minute 15 Box D First Ventilator Wean
    if ((nextState.vent.pip > 32 || nextState.vent.peep > 12) && (isAffirmative || lower.includes('wean') || lower.includes('box d') || lower.includes('pip') || lower.includes('peep'))) {
      nextState.vent.pip = Math.min(32, nextState.vent.pip);
      nextState.vent.peep = Math.min(12, nextState.vent.peep);
      const ventAck = `Pediatric Respiratory Therapist (RT): "Executing Box D First Ventilator Wean, Doctor! PIP dialed down to ${nextState.vent.pip} cmH2O (<=32) and PEEP to ${nextState.vent.peep} cmH2O (<=12), keeping ventilator rate steady at ${nextState.vent.rate} bpm. Native lungs protected from barotrauma."`;
      actionNotes.push(ventAck);
      nextState.teamDialogue.unshift({
        id: 'dlg-ack-rt-wean-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'Pediatric Respiratory Therapist (RT)',
        badgeColor: 'bg-purple-900 text-purple-200 border-purple-500',
        message: `Box D First Ventilator Wean executed: PIP dialed down to ${nextState.vent.pip} and PEEP to ${nextState.vent.peep} cmH2O (rate ${nextState.vent.rate} bpm unchanged).`,
        expiresTurn: currentTurn + 2
      });
    }

    // RT Case 3: Wean toward rest settings / wean iNO / Flolan
    if ((lower.includes('rest') || (isAffirmative && nextState.elapsedMinutes >= 60)) && !lower.includes('breath sound') && !lower.includes('suction') && !lower.includes('ett')) {
      if (nextState.vent.mode === 'CMV') {
        nextState.vent.pip = Math.max(20, nextState.vent.pip - 2);
        nextState.vent.peep = Math.max(10, nextState.vent.peep - 2);
        nextState.vent.rate = Math.max(10, nextState.vent.rate - 5);
        nextState.vent.iTime = nextState.vent.rate <= 15 ? 2.0 : Math.min(2.0, +(nextState.vent.iTime + 0.3).toFixed(1));
        nextState.vent.fio2 = Math.max(35, nextState.vent.fio2 - 15);
      }
      if (nextState.vent.inoPpm > 0) nextState.vent.inoPpm = Math.max(0, nextState.vent.inoPpm - 5);
      if (nextState.vent.flolan > 0) nextState.vent.flolan = Math.max(0, +(nextState.vent.flolan - 10).toFixed(1));
      const restAck = `Pediatric Respiratory Therapist (RT): "Stepping down ventilator toward rest settings (${nextState.vent.mode} ${nextState.vent.pip}/${nextState.vent.peep} cmH2O, Rate ${nextState.vent.rate} bpm, FiO2 ${nextState.vent.fio2}%${nextState.vent.inoPpm > 0 ? `, iNO ${nextState.vent.inoPpm} ppm` : ''}). Native lung resting quietly."`;
      actionNotes.push(restAck);
      nextState.teamDialogue.unshift({
        id: 'dlg-ack-rt-rest-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'Pediatric Respiratory Therapist (RT)',
        badgeColor: 'bg-purple-900 text-purple-200 border-purple-500',
        message: `Ventilator stepped down toward rest settings (${nextState.vent.mode} ${nextState.vent.pip}/${nextState.vent.peep}, Rate ${nextState.vent.rate} bpm, FiO2 ${nextState.vent.fio2}%).`,
        expiresTurn: currentTurn + 2
      });
    }
  }

  if (targetRoleTag === 'rn') {
    const paco2DropFromBaseline = nextState.patient.preEclsPaco2 - (nextState.telemetry?.paco2 || nextState.patient.preEclsPaco2);

    // RN Case 1: Neuro-Monitoring Alert / TCM CO2 Drop / Sweep Titration
    if (paco2DropFromBaseline >= 10 && (isAffirmative || lower.includes('abg') || lower.includes('sweep') || lower.includes('titrate') || lower.includes('draw'))) {
      const existingPoc = nextState.pendingLabs.find(l => l.category === 'bedside_poc' && l.status === 'pending');
      if (!existingPoc) {
        nextState.pendingLabs.push({
          id: 'lab-bedside-' + Date.now(),
          name: 'Bedside Point-of-Care Blood Gas (Patient ABG + Pre/Post-Ox + ACT)',
          shortName: 'Bedside ABG & Pre/Post-Ox',
          category: 'bedside_poc',
          orderedMinute: nextState.elapsedMinutes,
          readyMinute: nextState.elapsedMinutes + 3,
          status: 'pending',
          announced: false,
          results: {
            ph: nextState.telemetry.ph,
            paco2: nextState.telemetry.paco2,
            pao2: nextState.telemetry.pao2,
            lactate: nextState.patient.labs.lactate,
            postOxPh: nextState.telemetry.postOxPh,
            postOxPco2: nextState.telemetry.postOxPco2,
            postOxPo2: nextState.circuit.postOxPo2,
            postOxSao2: nextState.circuit.postOxSao2,
            preOxSvo2: nextState.circuit.svo2,
            hct: nextState.patient.labs.hct,
            hb: nextState.patient.labs.hb,
            act: Math.round(nextState.patient.labs.ptt * 2.8 + 20)
          }
        });
      }
      const targetCo2 = Math.max(45, nextState.patient.preEclsPaco2 - 8);
      const currentCo2 = nextState.telemetry?.paco2 || nextState.patient.preEclsPaco2;
      if (nextState.circuit.sweepLpm > 0.05) {
        nextState.circuit.sweepLpm = +Math.max(0.05, (nextState.circuit.sweepLpm * (currentCo2 / targetCo2))).toFixed(2);
      }
      const rnAck = `Bedside PICU/CICU RN: "STAT arterial blood gas drawn and running on analyzer (~3 min). Sweep gas titrated to ${nextState.circuit.sweepLpm.toFixed(2)} L/min per neuro-protection protocol to protect cerebral arterioles."`;
      actionNotes.push(rnAck);
      nextState.teamDialogue.unshift({
        id: 'dlg-ack-rn-co2-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-500',
        message: `STAT ABG drawn and sweep gas titrated to ${nextState.circuit.sweepLpm.toFixed(2)} L/min per neuro-protection protocol.`,
        expiresTurn: currentTurn + 2
      });
    }

    // RN Case 2: PRBC Transfusion from Bedside Cooler
    if ((lower.includes('prbc') || lower.includes('blood') || lower.includes('cooler') || (isAffirmative && nextState.patient.labs.hct < 35)) && !lower.includes('gas') && !lower.includes('draw')) {
      nextState.patient.labs.hb = +(nextState.patient.labs.hb + 1.6).toFixed(1);
      nextState.patient.labs.hct = Math.min(46, nextState.patient.labs.hct + 5);
      nextState.patient.intravascularVolumeStatus = Math.min(1, nextState.patient.intravascularVolumeStatus + 0.9);
      if (nextState.circuit.obstructionSite === 1) {
        nextState.circuit.obstructionSite = 0;
        nextState.circuit.obstructionSeverity = 0;
      }
      const prbcAck = `Bedside PICU/CICU RN: "Administering 15 mL/kg fresh (<14-day) PRBCs from the bedside cooler via dedicated IV line. Preload restored, Hct bumped to ${nextState.patient.labs.hct}%, and venous drainage stabilized."`;
      actionNotes.push(prbcAck);
      nextState.teamDialogue.unshift({
        id: 'dlg-ack-rn-prbc-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-500',
        message: `Administered 15 mL/kg fresh PRBCs from bedside cooler. Hct increased to ${nextState.patient.labs.hct}%.`,
        expiresTurn: currentTurn + 2
      });
    }

    // RN Case 3: Platelets via Peripheral IV Line
    if (lower.includes('platelet')) {
      nextState.patient.labs.platelets = Math.min(240, nextState.patient.labs.platelets + 55);
      const pltAck = `Bedside PICU/CICU RN: "Transfused 15 mL/kg platelets via peripheral IV line (safely distant from ECMO venous cannula). Platelet count increased to ${nextState.patient.labs.platelets}k/µL."`;
      actionNotes.push(pltAck);
      nextState.teamDialogue.unshift({
        id: 'dlg-ack-rn-plt-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-500',
        message: `Transfused 15 mL/kg platelets via peripheral IV line. Platelet count now ${nextState.patient.labs.platelets}k/µL.`,
        expiresTurn: currentTurn + 2
      });
    }
  }

  if (targetRoleTag === 'surgeon') {
    // Surgeon Case 1: Guide Wire Coiled in RA -> Echo Check & IVC Redirection
    if (nextState.complications.wireCoiled && (isAffirmative || lower.includes('wire') || lower.includes('echo') || lower.includes('check') || lower.includes('redirect') || lower.includes('withdraw') || lower.includes('stop') || lower.includes('hold'))) {
      nextState.complications.wireCoiled = false;
      const wireAck = 'ECLS Surgeon & Echo Cardiologist: "Echo check performed! On bicaval view, we visualized the guidewire tip looped in the right atrium. We withdrew and safely redirected the stiff wire down the IVC under direct echo guidance. Wire position verified—safe to proceed with dilation and cannulation!"';
      actionNotes.push(wireAck);
      nextState.teamDialogue.unshift({
        id: 'dlg-ack-surg-wire-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'ECLS Surgeon & Echo Cardiologist',
        badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
        message: 'Echo check performed! Guidewire safely redirected into the IVC under direct visualization. Ready for cannulation.',
        expiresTurn: currentTurn + 2
      });
    }

    // Surgeon Case 2: Acute Cardiac Tamponade -> STAT Pericardiocentesis
    if (nextState.complications.tamponade && (isAffirmative || lower.includes('pericardiocentesis') || lower.includes('drain') || lower.includes('subxiphoid') || lower.includes('effusion') || lower.includes('decompress'))) {
      nextState.complications.tamponade = false;
      const tampAck = 'ECLS Surgeon: "Emergency subxiphoid pericardiocentesis executed STAT under echo visualization! Aspirated 35 mL of acute hemopericardium. The right ventricle has immediately re-expanded, diastolic filling restored, and MAP rebounded from crash levels!"';
      actionNotes.push(tampAck);
      nextState.teamDialogue.unshift({
        id: 'dlg-ack-surg-tamp-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'ECLS Surgeon & Echo Cardiologist',
        badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
        message: 'STAT subxiphoid pericardiocentesis performed! Aspirated 35 mL hemopericardium; RV compression relieved and MAP restored.',
        expiresTurn: currentTurn + 2
      });
    }

    // Surgeon Case 3: Dual-Lumen VV Recirculation -> Rotate Cannula RA Jet toward Tricuspid Valve
    if (nextState.patient.mode === 'VV' && (nextState.circuit.recirculationFraction >= 0.25) && (isAffirmative || lower.includes('rotate') || lower.includes('reposition') || lower.includes('adjust') || lower.includes('echo') || lower.includes('cannula'))) {
      nextState.circuit.recirculationFraction = 0.05;
      nextState.circuit.baseRecirculation = 0.05;
      const recapAck = 'Echo Cardiologist & ECLS Surgeon: "Under transesophageal/transthoracic echo guidance, we gently rotated the dual-lumen cannula so the RA arterial return jet aims directly across the tricuspid valve into the RV. Recirculation fraction dropped from 35% to 5%! Patient SpO2 rebounded."';
      actionNotes.push(recapAck);
      nextState.teamDialogue.unshift({
        id: 'dlg-ack-surg-recirc-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: 'Echo Cardiologist & ECLS Surgeon',
        badgeColor: 'bg-rose-900 text-rose-200 border-rose-500',
        message: 'Cannula rotated under echo guidance. RA arterial return jet aligned with tricuspid valve; recirculation resolved (5%).',
        expiresTurn: currentTurn + 2
      });
    }
  }

  // 0. Parse Initiation / Release Clamps / Place on ECMO Orders
  const isInitiateOrder =
    lower.includes('initiate ecmo') ||
    lower.includes('start ecmo') ||
    lower.includes('cannulate') ||
    lower.includes('initiate bypass') ||
    lower.includes('start bypass') ||
    lower.includes('release clamp') ||
    lower.includes('open clamp') ||
    lower.includes('clamps off') ||
    lower.includes('go on ecmo') ||
    lower.includes('start pump') ||
    lower.includes('place on ecmo') ||
    lower.includes('initiate ecls') ||
    lower.includes('connect to ecmo');

  if (isInitiateOrder || (!nextState.circuit.onEcmo && (lower.includes('box b') || lower.includes('box a')))) {
    if (!nextState.circuit.onEcmo) {
      nextState.circuit.onEcmo = true;
      if (nextState.complications.wireCoiled) {
        nextState.complications.wireCoiled = false;
        actionNotes.push('Echo check performed prior to cannulation: Guidewire verified and safely redirected into IVC under echo visualization.');
      }
      if (nextState.elapsedMinutes === 0) {
        nextState.elapsedMinutes = 1;
      }
      window.setFlowByTargetLpm(nextState, targets.boxBTargetLpm);
      nextState.circuit.sweepLpm = +(0.25 * targets.boxBTargetLpm).toFixed(2);
      nextState.circuit.sweepFio2 = 80;
      actionNotes.push(`Cannulation completed and circuit clamps released: Patient initiated on ${nextState.patient.mode} ECMO bypass! Blood flow established at Minute 1 Initial BFR (Box B: ${targets.boxBTargetLpm} L/min) and Sweep Gas initiated at ${nextState.circuit.sweepLpm.toFixed(2)} L/min (80% FiO2). ECMO Console gauges are now LIVE.`);
    }
  }

  // 1. Parse Numeric Blood Flow / RPM / Box A / Box B Orders
  const lpmMatch = lower.match(/(?:flow|bfr|q)\s*(?:to|=|at|:)?\s*(\d+(?:\.\d+)?)\s*(?:l\/min|lpm|l\/m)/i);
  const mlMinMatch = lower.match(/(?:flow|bfr|q)?\s*(?:to|=|at|:)?\s*(\d+(?:\.\d+)?)\s*ml\/min/i);
  const mlKgMatch = lower.match(/(\d+(?:\.\d+)?)\s*ml\/kg\/min/i);
  const rpmMatch = lower.match(/(?:rpm|speed)\s*(?:to|=|at|:)?\s*(\d{3,4})/i);

  if (lpmMatch || mlMinMatch || mlKgMatch || rpmMatch) {
    if (!nextState.circuit.onEcmo) {
      nextState.circuit.onEcmo = true;
      if (nextState.elapsedMinutes === 0) nextState.elapsedMinutes = 1;
      actionNotes.push('Circuit clamps released and patient placed on ECMO bypass. ECMO Console gauges are now LIVE.');
    }
  }

  if (lpmMatch) {
    const val = parseFloat(lpmMatch[1]);
    window.setFlowByTargetLpm(nextState, val);
    actionNotes.push(`Titrated pump speed to target ECLS BFR of ${val.toFixed(2)} L/min.`);
  } else if (mlMinMatch) {
    const valLpm = parseFloat(mlMinMatch[1]) / 1000;
    window.setFlowByTargetLpm(nextState, valLpm);
    actionNotes.push(`Titrated pump speed to target ECLS BFR of ${mlMinMatch[1]} mL/min (${valLpm.toFixed(2)} L/min).`);
  } else if (mlKgMatch) {
    const valLpm = (parseFloat(mlKgMatch[1]) * nextState.patient.weightKg) / 1000;
    window.setFlowByTargetLpm(nextState, valLpm);
    actionNotes.push(`Titrated pump speed to ${mlKgMatch[1]} mL/kg/min (${valLpm.toFixed(2)} L/min).`);
  } else if (rpmMatch) {
    nextState.circuit.rpm = Math.max(0, Math.min(4500, parseInt(rpmMatch[1], 10)));
    actionNotes.push(`Adjusted centrifugal pump speed to ${nextState.circuit.rpm} RPM.`);
  } else if (lower.includes('box b') || lower.includes('minute 1 bfr') || lower.includes('min 1 flow')) {
    window.setFlowByTargetLpm(nextState, targets.boxBTargetLpm);
    actionNotes.push(`Set Minute 1 Initial BFR (Box B = Box A / 6) to ${targets.boxBTargetLpm} L/min (${targets.boxBMlKg} mL/kg/min).`);
  } else if (lower.includes('box a') || lower.includes('target bfr') || lower.includes('15 min flow') || lower.includes('full flow')) {
    window.setFlowByTargetLpm(nextState, targets.boxATargetLpm);
    if (nextState.elapsedMinutes < 15 && (lower.includes('15') || lower.includes('ramp'))) {
      explicitTimeAdvance = 15 - nextState.elapsedMinutes;
    }
    actionNotes.push(`Ramped ECLS Blood Flow Rate to 15-Minute Goal Target (Box A): ${targets.boxATargetLpm} L/min (${targets.boxAMlKg} mL/kg/min).`);
  } else if (lower.includes('next ramp') || lower.includes('ramp step') || lower.includes('step up flow')) {
    const nextIdx = Math.min(5, targets.currentStepIndex + 1);
    const stepTarget = targets.rampSteps[nextIdx];
    window.setFlowByTargetLpm(nextState, stepTarget.flowLpm);
    explicitTimeAdvance = 3;
    actionNotes.push(`Advanced 3-minute ramp step -> Set BFR to ${stepTarget.flowLpm} L/min (${stepTarget.mlKg} mL/kg/min).`);
  }

  // 2. Parse Sweep Gas & Sweep FiO2 Orders
  const sweepMatch = lower.match(/sweep\s*(?:gas|flow|rate|to|=|at|:)*\s*(\d+(?:\.\d+)?)\s*(?:l\/min|lpm|l\/m)?/i);
  const sweepFio2Match = lower.match(/sweep\s*fio2\s*(?:to|=|at|:)?\s*(\d{2,3})\s*%?/i);

  if (sweepMatch && !lower.includes('box m')) {
    const swVal = parseFloat(sweepMatch[1]);
    if (swVal <= 12) {
      nextState.circuit.sweepLpm = +swVal.toFixed(2);
      actionNotes.push(`Adjusted Quantum Ventilation Lite Sweep Gas flow to ${nextState.circuit.sweepLpm.toFixed(2)} L/min.`);
    }
  } else if (lower.includes('box m') || lower.includes('initial sweep')) {
    const newTargets = window.computeProtocolTargets(nextState);
    const approxFlow = nextState.circuit.rpm > 600 ? newTargets.expectedNowBfrLpm : newTargets.boxBTargetLpm;
    nextState.circuit.sweepLpm = +(0.25 * Math.max(0.1, approxFlow)).toFixed(2);
    nextState.circuit.sweepFio2 = 80;
    actionNotes.push(`Initiated Sweep Gas per Box M protocol (0.25 × BFR = ${nextState.circuit.sweepLpm.toFixed(2)} L/min) at 80% FiO2.`);
  }

  if (sweepFio2Match) {
    nextState.circuit.sweepFio2 = Math.max(21, Math.min(100, parseInt(sweepFio2Match[1], 10)));
    actionNotes.push(`Set Sweep Blender FiO2 to ${nextState.circuit.sweepFio2}%.`);
  }

  // 3. Parse Ventilator & Pulmonary Vasodilator (iNO / Flolan) Orders
  const pipPeepSlash = lower.match(/(?:vent|pip\/peep|settings|wean to)\s*(\d{2})\s*\/\s*(\d{1,2})/i);
  const pipMatch = lower.match(/pip\s*(?:to|=|at|:)?\s*(\d{2})/i);
  const peepMatch = lower.match(/peep\s*(?:to|=|at|:)?\s*(\d{1,2})/i);
  const rateMatch = lower.match(/(?:vent\s*rate|osc\s*rate|rate)\s*(?:to|=|at|:)?\s*(\d{1,2})/i);
  const hzMatch = lower.match(/(?:freq|frequency|hz)\s*(?:to|=|at|:)?\s*(\d{3})/i);
  const inoMatch = lower.match(/ino\s*(?:to|=|at|:)?\s*(\d{1,2}|off)/i);
  const flolanMatch = lower.match(/flolan\s*(?:to|=|at|:)?\s*(\d+(?:\.\d+)?|off)/i);

  if (pipPeepSlash) {
    nextState.vent.pip = parseInt(pipPeepSlash[1], 10);
    nextState.vent.peep = parseInt(pipPeepSlash[2], 10);
    actionNotes.push(`Adjusted ventilator pressures to PIP ${nextState.vent.pip} / PEEP ${nextState.vent.peep} cmH2O.`);
  } else {
    if (pipMatch) {
      nextState.vent.pip = parseInt(pipMatch[1], 10);
      actionNotes.push(`Set ventilator PIP to ${nextState.vent.pip} cmH2O.`);
    }
    if (peepMatch) {
      nextState.vent.peep = parseInt(peepMatch[1], 10);
      actionNotes.push(`Set ventilator PEEP to ${nextState.vent.peep} cmH2O.`);
    }
  }

  if (rateMatch) {
    nextState.vent.rate = parseInt(rateMatch[1], 10);
    actionNotes.push(`Set ventilator rate to ${nextState.vent.rate} bpm.`);
  }
  if (hzMatch) {
    nextState.vent.hz = parseInt(hzMatch[1], 10);
    actionNotes.push(`Set VDR4 percussive frequency to ${nextState.vent.hz} Hz.`);
  }

  if (lower.includes('box d') || lower.includes('first vent wean') || lower.includes('15-min first wean')) {
    if (nextState.vent.pip > 32 || nextState.vent.peep > 12) {
      nextState.vent.pip = Math.min(32, nextState.vent.pip);
      nextState.vent.peep = Math.min(12, nextState.vent.peep);
      actionNotes.push('Executed 15-Minute Box D First Ventilator Wean: Reduced danger-range PIP to 32 cmH2O and PEEP to 12 cmH2O (rate/frequency kept unchanged per protocol).');
    } else {
      nextState.vent.pip = Math.max(20, nextState.vent.pip - 2);
      nextState.vent.peep = Math.max(10, nextState.vent.peep - 2);
      actionNotes.push('Executed 15-Minute Box D First Ventilator Wean: Weaned PIP and PEEP each by 2 cmH2O.');
    }
  } else if (lower.includes('rest settings') || lower.includes('wean vent')) {
    if (nextState.vent.mode === 'CMV') {
      nextState.vent.pip = Math.max(20, nextState.vent.pip - 2);
      nextState.vent.peep = Math.max(10, nextState.vent.peep - 2);
      nextState.vent.rate = Math.max(10, nextState.vent.rate - 5);
      nextState.vent.iTime = nextState.vent.rate <= 15 ? 2.0 : Math.min(2.0, +(nextState.vent.iTime + 0.3).toFixed(1));
      nextState.vent.fio2 = Math.max(35, nextState.vent.fio2 - 15);
      actionNotes.push(`Weaned CMV toward Rest Settings -> SIMV-PC ${nextState.vent.pip}/${nextState.vent.peep}, Rate ${nextState.vent.rate} bpm, I-time ${nextState.vent.iTime}s, FiO2 ${nextState.vent.fio2}%.`);
    } else {
      nextState.vent.pip = Math.max(26, nextState.vent.pip - 2);
      nextState.vent.peep = Math.max(10, nextState.vent.peep - 2);
      nextState.vent.hz = Math.min(500, nextState.vent.hz + 25);
      nextState.vent.rate = Math.max(30, nextState.vent.rate - 5);
      actionNotes.push(`Weaned VDR4 -> ${nextState.vent.pip}/${nextState.vent.peep} cmH2O, Osc Rate ${nextState.vent.rate} bpm, Freq ${nextState.vent.hz} Hz.`);
    }
  }

  if (lower.includes('convert') && (lower.includes('simv') || lower.includes('cmv') || lower.includes('conventional'))) {
    nextState.vent.mode = 'CMV';
    nextState.vent.pip = 26;
    nextState.vent.peep = 10;
    nextState.vent.rate = 30;
    nextState.vent.iTime = 1.0;
    nextState.vent.hz = 0;
    actionNotes.push('Converted patient from VDR4 (26/10, Rate 30, 500 Hz) to Conventional SIMV(PC) 26/10, Rate 30, I:E 1:1 per protocol.');
  }

  if (inoMatch) {
    nextState.vent.inoPpm = inoMatch[1] === 'off' ? 0 : parseInt(inoMatch[1], 10);
    actionNotes.push(`Set iNO to ${nextState.vent.inoPpm === 0 ? 'OFF' : nextState.vent.inoPpm + ' ppm'}.`);
  } else if (lower.includes('wean ino')) {
    const inoLadder = [20, 15, 10, 8, 6, 4, 3, 2, 1, 0];
    const idx = inoLadder.indexOf(nextState.vent.inoPpm);
    nextState.vent.inoPpm = idx >= 0 && idx < inoLadder.length - 1 ? inoLadder[idx + 1] : 0;
    actionNotes.push(`Weaned iNO stepwise to ${nextState.vent.inoPpm === 0 ? 'OFF' : nextState.vent.inoPpm + ' ppm'}.`);
  }

  if (flolanMatch) {
    nextState.vent.flolan = flolanMatch[1] === 'off' ? 0 : parseFloat(flolanMatch[1]);
    actionNotes.push(`Set Nebulized Flolan to ${nextState.vent.flolan === 0 ? 'OFF' : nextState.vent.flolan + ' mcg/kg/min'}.`);
  } else if (lower.includes('wean flolan')) {
    const flolanLadder = [0.1, 0.07, 0.05, 0.03, 0.02, 0.01, 0];
    const idx = flolanLadder.indexOf(nextState.vent.flolan);
    nextState.vent.flolan = idx >= 0 && idx < flolanLadder.length - 1 ? flolanLadder[idx + 1] : 0;
    actionNotes.push(`Weaned Nebulized Flolan stepwise to ${nextState.vent.flolan === 0 ? 'OFF' : nextState.vent.flolan + ' mcg/kg/min'}.`);
  }

  // 4. Parse Diagnostic, Echo, Lab, Circuit & Transfusion Commands
  if (lower.includes('echo') || lower.includes('ultrasound') || lower.includes('fluoro') || lower.includes('wire')) {
    if (nextState.complications.wireCoiled) {
      nextState.complications.wireCoiled = false;
      actionNotes.push('Procedural Echo / Fluoro performed: Identified guide wire tip coiled in the Right Atrium/SVC! Surgeon withdrew wire 3 cm and redirected cleanly into the IVC under direct echo visualization prior to cannula advancement.');
    } else if (nextState.circuit.recirculationFraction >= 0.25) {
      actionNotes.push('Bedside Transthoracic Echo: 15 Fr MC3 Crescent RA dual-lumen cannula return jet is malrotated anteriorly toward the right atrial drainage ports rather than across the tricuspid valve (confirming recirculation).');
    } else if (nextState.complications.tamponade) {
      actionNotes.push('STAT Cardiac Echo: Large circumferential pericardial effusion with right ventricular diastolic collapse (Cardiac Tamponade).');
    } else if (nextState.circuit.obstructionSite === 1) {
      actionNotes.push('Bedside Echo: Collapse of the right atrial wall around the venous drainage ports consistent with hypovolemia / excessive negative suction.');
    } else {
      actionNotes.push('Bedside Echo: Cannula tips verified in appropriate anatomical alignment; no pericardial effusion.');
    }
  }

  if (lower.includes('reposition') || lower.includes('rotate') || lower.includes('adjust cannula') || lower.includes('fix recirculation')) {
    if (nextState.circuit.recirculationFraction > 0.12) {
      nextState.circuit.recirculationFraction = 0.05;
      nextState.circuit.baseRecirculation = 0.05;
      actionNotes.push('Surgeon & ECMO Specialist rotated the MC3 Crescent RA cannula 25° counter-clockwise under echo guidance. Return jet now directed across the tricuspid valve; venous limb immediately darkened to wine-red and patient SpO2 climbed.');
    } else if (nextState.circuit.obstructionSite === 1) {
      nextState.circuit.obstructionSite = 0;
      nextState.circuit.obstructionSeverity = 0;
      actionNotes.push('Venous cannula position adjusted; atrial wall suction resolved.');
    }
  }

  if (
    lower.includes('change oxygenator') ||
    lower.includes('replace oxygenator') ||
    lower.includes('exchange oxygenator') ||
    lower.includes('new oxygenator') ||
    lower.includes('swap circuit')
  ) {
    if (nextState.circuit.obstructionSite === 4) {
      nextState.circuit.obstructionSite = 0;
      nextState.circuit.obstructionSeverity = 0;
      actionNotes.push('Emergency oxygenator exchange completed with perfusion team (<40 sec clamp time). Transmembrane pressure ΔP (TMP) normalized from >90 mmHg to <25 mmHg and post-membrane PO2 restored.');
    } else {
      actionNotes.push('Backup primed oxygenator verified on standby; current membrane ΔP does not require exchange.');
    }
  }

  if (lower.includes('unkink') || lower.includes('clear obstruction') || lower.includes('resolve site')) {
    if (nextState.circuit.obstructionSite > 0 && nextState.circuit.obstructionSite !== 4) {
      const oldSite = nextState.circuit.obstructionSite;
      nextState.circuit.obstructionSite = 0;
      nextState.circuit.obstructionSeverity = 0;
      actionNotes.push(`Resolved mechanical obstruction at Site ${oldSite}. Circuit pressures and flow normalized.`);
    }
  }

  if (
    lower.includes('pericardiocentesis') ||
    lower.includes('drain pericard') ||
    lower.includes('subxiphoid') ||
    lower.includes('evacuate effusion')
  ) {
    if (nextState.complications.tamponade) {
      nextState.complications.tamponade = false;
      actionNotes.push('Emergency subxiphoid pericardiocentesis performed: 40 mL of non-clotting blood aspirated from pericardial space! Right ventricular collapse resolved, radial arterial waveform pulsatility restored, and MAP rebounded.');
    } else {
      actionNotes.push('Subxiphoid pericardial evaluation performed: No pericardial fluid collection found.');
    }
  }

  if (
    lower.includes('needle decompression') ||
    lower.includes('needle thoracostomy') ||
    lower.includes('chest tube') ||
    lower.includes('tube thoracostomy') ||
    lower.includes('thoracentesis')
  ) {
    if (nextState.complications.pneumothorax) {
      nextState.complications.pneumothorax = false;
      nextState.patient.nativeCompliance = 0.40;
      actionNotes.push('Emergency needle thoracostomy / chest tube placed in 2nd intercostal space mid-clavicular line: Rush of air evacuated under pressure! Right lung re-expanded, airway resistance normalized, and SpO2 rebounded.');
    } else {
      actionNotes.push('Pleural ultrasound check performed: Lung sliding confirmed bilaterally without evidence of pneumothorax.');
    }
  }

  if (lower.includes('prbc') || lower.includes('packed red') || lower.includes('transfuse blood')) {
    nextState.patient.labs.hb = +(nextState.patient.labs.hb + 1.6).toFixed(1);
    nextState.patient.labs.hct = Math.min(46, nextState.patient.labs.hct + 5);
    nextState.patient.intravascularVolumeStatus = Math.min(1, nextState.patient.intravascularVolumeStatus + 0.9);
    if (nextState.circuit.obstructionSite === 1) {
      nextState.circuit.obstructionSite = 0;
      nextState.circuit.obstructionSeverity = 0;
    }
    actionNotes.push(`Transfused 15 mL/kg (<14-day fresh) PRBCs. Hct increased to ${nextState.patient.labs.hct}% and venous drainage preload improved.`);
  }

  if (lower.includes('platelet')) {
    const viaCircuit = lower.includes('circuit') || lower.includes('pre-ox') || lower.includes('venous cannula');
    nextState.patient.labs.platelets = Math.min(240, nextState.patient.labs.platelets + 55);
    if (viaCircuit) {
      nextState.circuit.obstructionSite = 4;
      nextState.circuit.obstructionSeverity = Math.max(0.5, nextState.circuit.obstructionSeverity);
      actionNotes.push('⚠️ PROTOCOL VIOLATION CONSEQUENCE: Platelets infused directly into circuit/near venous cannula — acute platelet aggregation triggered rising transmembrane pressure (ΔP) across the oxygenator! Always infuse platelets via a peripheral IV line.');
    } else {
      actionNotes.push(`Transfused 15 mL/kg Platelets via peripheral IV line (far from venous cannula per protocol). Platelets increased to ${nextState.patient.labs.platelets}k/µL.`);
    }
  }

  if (lower.includes('cryo') || lower.includes('fibrinogen')) {
    nextState.patient.labs.fibrinogen = Math.min(280, nextState.patient.labs.fibrinogen + 75);
    actionNotes.push(`Administered Cryoprecipitate. Fibrinogen repleted to ${nextState.patient.labs.fibrinogen} mg/dL.`);
  }

  if (lower.includes('ffp') || lower.includes('plasmalyte') || lower.includes('albumin') || lower.includes('volume') || lower.includes('bolus')) {
    nextState.patient.intravascularVolumeStatus = Math.min(1.5, nextState.patient.intravascularVolumeStatus + 1.0);
    nextState.patient.labs.inr = Math.max(1.1, +(nextState.patient.labs.inr - 0.25).toFixed(1));
    if (nextState.circuit.obstructionSite === 1) {
      nextState.circuit.obstructionSite = 0;
      nextState.circuit.obstructionSeverity = 0;
    }
    actionNotes.push('Administered 10 mL/kg volume bolus (FFP / Plasmalyte). Venous inlet pressure P_in stabilized and line chatter resolved.');
  }

  if (lower.includes('at3') || lower.includes('antithrombin')) {
    nextState.patient.labs.at3 = Math.min(105, nextState.patient.labs.at3 + 35);
    actionNotes.push(`Administered recombinant Antithrombin III (AT3). AT3 activity increased to ${nextState.patient.labs.at3}%.`);
  }

  if (lower.includes('heparin')) {
    nextState.patient.labs.ptt = Math.min(95, nextState.patient.labs.ptt + 24);
    nextState.patient.labs.antiXa = +(Math.min(0.7, nextState.patient.labs.antiXa + 0.35)).toFixed(2);
    actionNotes.push(`Administered Heparin (75 U/kg bolus / titrated infusion). PTT ${nextState.patient.labs.ptt}s, Anti-Xa ${nextState.patient.labs.antiXa} U/mL.`);
  }

  if (lower.includes('inotrope') || lower.includes('epinephrine') || lower.includes('milrinone') || lower.includes('dobutamine') || lower.includes('dopamine')) {
    nextState.patient.inotropesActive = true;
    actionNotes.push('Bedside RN / Perfusionist: "Inotropic support (epinephrine/milrinone) initiated/titrated. Native LV contractility boosted to support aortic valve opening against ECMO afterload."');
  }

  if (lower.includes('afterload') || lower.includes('nitroprusside') || lower.includes('nicardipine') || lower.includes('hydralazine') || lower.includes('vasodilator')) {
    nextState.patient.afterloadReducerActive = true;
    actionNotes.push('Bedside RN: "Systemic vasodilator / afterload reducer (nitroprusside/nicardipine) initiated. LV impedance reduced, improving cardiac ejection."');
  }

  if (lower.includes('la vent') || lower.includes('left atrial vent') || lower.includes('septostomy') || lower.includes('vent lv') || lower.includes('vent the lv')) {
    nextState.patient.laVented = true;
    actionNotes.push('ECLS Surgeon & Interventionalist: "Left heart decompression executed (trans-septal LA cannula / balloon atrial septostomy). Left atrial pressure normalized and pulmonary edema unloaded."');
  }

  if (lower.includes('time out') || lower.includes('timeout')) {
    actionNotes.push('ECLS Intensivist Time-Out Script completed synchronously at bedside: Roles assigned, line extensions verified, epinephrine/Plasmalyte/cooler PRBCs & standby platelets confirmed, sedation/NMB redosed, cefazolin given, NIRS/TCM/dual SpO2 active, prime labs & AT3 verified.');
  }

  if (lower.includes('alarm') && (lower.includes('run') || lower.includes('enable') || lower.includes('activate') || lower.includes('set') || lower.includes('qws'))) {
    nextState.circuit.alarms = {
      backflowPrevention: true,
      maxInlet: -60,
      stopInlet: -100,
      maxOutlet: 250,
      stopOutlet: 300,
      bubbleDetection: true,
      gaugeNarrowed: true
    };
    actionNotes.push('Spectrum QWS Safety & Gauge Alarms transitioned to ECLS Run Mode (Backflow ON, Inlet -60/-100 mmHg, Outlet +250/+300 mmHg, Bubble Detection ON [Small], Gauge bounds narrowed).');
  }

  // 4b. Parse Lab Orders & Point-of-Care Sampling Requests
  const isBedsideGasOrder =
    (lower.includes('abg') ||
      lower.includes('blood gas') ||
      lower.includes('pre-ox') ||
      lower.includes('post-ox') ||
      lower.includes('draw sample') ||
      lower.includes('draw blood') ||
      lower.includes('draw sc1') ||
      lower.includes('act') ||
      (lower.includes('sample') && !lower.includes('stopcock'))) &&
    !lower.includes('sweep');

  const isCentralLabOrder =
    lower.includes('coag') ||
    lower.includes('anti-xa') ||
    lower.includes('at3') ||
    lower.includes('antithrombin') ||
    lower.includes('fibrinogen') ||
    (lower.includes('cbc') && !lower.includes('box')) ||
    lower.includes('teg') ||
    lower.includes('rotem') ||
    lower.includes('free hgb') ||
    lower.includes('pfhgb');

  if (isBedsideGasOrder) {
    const existingPending = nextState.pendingLabs.find(
      (l) => l.category === 'bedside_poc' && l.status === 'pending'
    );
    if (!existingPending) {
      const bedsideOrder = {
        id: 'lab-bedside-' + Date.now(),
        name: 'Bedside Point-of-Care Blood Gas (Patient ABG + Pre/Post-Ox + ACT)',
        shortName: 'Bedside ABG & Pre/Post-Ox',
        category: 'bedside_poc',
        orderedMinute: nextState.elapsedMinutes,
        readyMinute: nextState.elapsedMinutes + 3,
        status: 'pending',
        announced: false,
        results: {
          ph: nextState.telemetry.ph,
          paco2: nextState.telemetry.paco2,
          pao2: nextState.telemetry.pao2,
          lactate: nextState.patient.labs.lactate,
          postOxPh: nextState.telemetry.postOxPh,
          postOxPco2: nextState.telemetry.postOxPco2,
          postOxPo2: nextState.circuit.postOxPo2,
          postOxSao2: nextState.circuit.postOxSao2,
          preOxSvo2: nextState.circuit.svo2,
          hct: nextState.patient.labs.hct,
          hb: nextState.patient.labs.hb,
          act: Math.round(nextState.patient.labs.ptt * 2.8 + 20)
        }
      };
      nextState.pendingLabs.push(bedsideOrder);
      actionNotes.push(
        `Bedside RN & Perfusionist: Blood samples drawn from arterial line and SC1 stopcock and placed into the bedside blood gas analyzer (~3 min turnaround; expected ~Min ${bedsideOrder.readyMinute}).`
      );
    }
  }

  if (isCentralLabOrder) {
    const existingPendingCentral = nextState.pendingLabs.find(
      (l) => l.category === 'central_lab' && l.status === 'pending'
    );
    if (!existingPendingCentral) {
      const centralOrder = {
        id: 'lab-central-' + Date.now(),
        name: 'Central Hospital Laboratory Coagulation & Hematology Panel',
        shortName: 'Central Coags, Anti-Xa, AT3 & CBC',
        category: 'central_lab',
        orderedMinute: nextState.elapsedMinutes,
        readyMinute: nextState.elapsedMinutes + 15,
        status: 'pending',
        announced: false,
        results: {
          antiXa: nextState.patient.labs.antiXa,
          at3: nextState.patient.labs.at3,
          ptt: nextState.patient.labs.ptt,
          inr: nextState.patient.labs.inr,
          fibrinogen: nextState.patient.labs.fibrinogen,
          platelets: nextState.patient.labs.platelets,
          hct: nextState.patient.labs.hct,
          hb: nextState.patient.labs.hb,
          pfHgb: nextState.patient.labs.pfHgb
        }
      };
      nextState.pendingLabs.push(centralOrder);
      actionNotes.push(
        `Bedside RN: Central coagulation, anti-Xa, AT3, and hematology tubes drawn and sent via pneumatic tube to the hospital core laboratory (~15 min turnaround; expected ~Min ${centralOrder.readyMinute}).`
      );
    }
  }

  // If targetRole was addressed and clinical actions were executed without a role-specific ack, prepend confirmation
  if (targetRole && actionNotes.length > 0 && !actionNotes.some((n) => n.startsWith(targetRole))) {
    const cleanCmd = raw.replace(/@[a-zA-Z0-9_-]+/g, '').trim();
    const roleAck = `${targetRole}: "Orders acknowledged, Doctor! Executing: '${cleanCmd}'."`;
    actionNotes.unshift(roleAck);
    nextState.teamDialogue.unshift({
      id: 'dlg-ack-gen-' + Date.now(),
      turn: currentTurn,
      minute: nextState.elapsedMinutes,
      role: targetRole,
      badgeColor: targetBadgeColor || 'bg-slate-800 text-slate-200 border-slate-600',
      message: `Orders acknowledged, Doctor! Executing: "${cleanCmd}".`,
      expiresTurn: currentTurn + 2
    });
  }

  const clinicalActionNotesCount = actionNotes.length;

  // 4c. Process Bedside Inquiries (Physical Exam & Circuit Inspections)
  const inquiries = window.evaluateBedsideInquiry(lower, nextState);
  inquiries.forEach((inq) => {
    actionNotes.push(`${inq.role}: "${inq.answer}"`);
    nextState.teamDialogue.push({
      id: 'dlg-inq-' + Date.now() + Math.random().toString(36).substring(2, 6),
      turn: currentTurn,
      minute: nextState.elapsedMinutes,
      role: inq.role,
      badgeColor: inq.badgeColor,
      message: inq.answer,
      expiresTurn: currentTurn + 2
    });
  });

  // 5. Check if this is an explicit time advance or clinical action vs pure inquiry
  const minAdvanceMatch = lower.match(/advance\s*(\d+)\s*(?:min|m\b)/i);
  const hrAdvanceMatch = lower.match(/advance\s*(\d+)\s*(?:hr|hour|h\b)/i);

  if (minAdvanceMatch) {
    explicitTimeAdvance = parseInt(minAdvanceMatch[1], 10);
  } else if (hrAdvanceMatch) {
    explicitTimeAdvance = parseInt(hrAdvanceMatch[1], 10) * 60;
  }

  const isExplicitTurnAdvance = Boolean(
    explicitTimeAdvance !== null ||
    lower.includes('progress turn') ||
    lower.includes('advance turn') ||
    lower.includes('next turn') ||
    lower.includes('confirm current console') ||
    lower.includes('confirm dial adjustments') ||
    lower.includes('proceed') ||
    lower.includes('continue')
  );

  // If user only asked a question / performed an exam without submitting clinical orders or requesting advance:
  if (clinicalActionNotesCount === 0 && !isExplicitTurnAdvance) {
    if (inquiries.length === 0) {
      const fallbackSpeaker = targetRole || 'Bedside Team';
      const fallbackBadge = targetBadgeColor || 'bg-slate-800 text-slate-200 border-slate-600';
      const cleanInquiry = raw.replace(/@[a-zA-Z0-9_-]+/g, '').trim();
      const fallbackReply = `${fallbackSpeaker}: "Doctor, I hear your inquiry: '${cleanInquiry || raw}'. We are monitoring the patient closely at Minute ${currentState.elapsedMinutes} (Turn ${currentTurn}). Telemetry: HR ${currentState.telemetry?.hr || '--'} bpm, MAP ${currentState.telemetry?.radialMap || '--'} mmHg, SpO2 ${currentState.telemetry?.postSpo2 || '--'}%, ECMO Flow ${currentState.circuit?.flowLpm?.toFixed(2) || '0.00'} L/min. Let us know if you want to perform an exam, inspect the circuit, or submit orders."`;
      actionNotes.push(fallbackReply);
      nextState.teamDialogue.push({
        id: 'dlg-gen-' + Date.now(),
        turn: currentTurn,
        minute: nextState.elapsedMinutes,
        role: fallbackSpeaker,
        badgeColor: fallbackBadge,
        message: fallbackReply,
        expiresTurn: currentTurn + 2
      });
    }

    // PURE INQUIRY: Simulation clock stays paused, turn number unchanged!
    nextState = window.computeDerivedState(nextState, 0);

    const pauseBanner = `\n\n⏱️ [Simulation Clock Paused at Minute ${nextState.elapsedMinutes} (Turn ${currentTurn})]\nBedside physical exam & circuit inspection data reported above. The simulation clock is holding steady so you can gather all necessary clinical information. When you are ready to adjust dials, administer medications, or progress to the next turn, submit your orders below or click 'Progress Turn'.`;

    const specialistReply = `${actionNotes.join('\n\n')}${pauseBanner}`;
    const structuredMarkdown = window.formatStructuredTurnMarkdown(nextState);

    return {
      nextState,
      specialistReply,
      nextPromptQuestion: `${targetRole || 'Bedside Specialist'}: "Clock paused at Minute ${nextState.elapsedMinutes}. Standing by for your clinical orders or dial adjustments."`,
      structuredMarkdown,
      isTurnAdvancing: false
    };
  }

  // 6. Advance Simulation Time & Model Physiological Progression / Dynamic Complications
  const timeDelta = explicitTimeAdvance !== null ? explicitTimeAdvance : (nextState.elapsedMinutes < 15 ? 3 : 5);
  nextState.elapsedMinutes += timeDelta;

  // Evaluate dynamic clinical issues (resolutions vs. complications)
  window.evaluateClinicalIssueProgression(currentState, nextState, actionNotes, lower);

  // Recompute full physiological & hydraulic state
  nextState = window.computeDerivedState(nextState, timeDelta);

  // 6b. Transition Pending Labs to Ready once simulation time reaches readyMinute
  const newlyReadyLabs = [];
  nextState.pendingLabs.forEach((lab) => {
    if (lab.status === 'pending' && nextState.elapsedMinutes >= lab.readyMinute) {
      lab.status = 'ready';
      if (!lab.announced) {
        lab.announced = true;
        newlyReadyLabs.push(lab);
      }
    }
  });

  newlyReadyLabs.forEach((lab) => {
    if (lab.category === 'bedside_poc') {
      const alertMsg = `Doctor, the bedside blood gas results (Patient ABG / Pre- & Post-membrane gases) are back from the analyzer and ready for review in your Labs tab. We are on standby for any sweep or ventilator adjustments.`;
      actionNotes.push(`Bedside RN & Perfusionist: "${alertMsg}"`);
      nextState.teamDialogue.push({
        id: 'dlg-lab-' + Date.now() + Math.random().toString(36).substring(2, 6),
        turn: currentTurn + 1,
        minute: nextState.elapsedMinutes,
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-500',
        message: `🔔 "${alertMsg}"`,
        expiresTurn: currentTurn + 3
      });
    } else if (lab.category === 'central_lab') {
      const alertMsg = `Doctor, the central core laboratory coag results (Anti-Xa ${lab.results.antiXa} U/mL, AT3 ${lab.results.at3}%, Fibrinogen ${lab.results.fibrinogen} mg/dL, Platelets ${lab.results.platelets}k) have posted in your Labs tab. We are on standby for any heparin or blood product orders.`;
      actionNotes.push(`Bedside RN: "${alertMsg}"`);
      nextState.teamDialogue.push({
        id: 'dlg-lab-c-' + Date.now() + Math.random().toString(36).substring(2, 6),
        turn: currentTurn + 1,
        minute: nextState.elapsedMinutes,
        role: 'Bedside PICU/CICU RN',
        badgeColor: 'bg-indigo-900 text-indigo-200 border-indigo-500',
        message: `🔔 "${alertMsg}"`,
        expiresTurn: currentTurn + 3
      });
    }
  });

  // Prune expired team conversations (ephemeral aging: older conversations disappear after 1-2 turns)
  nextState.teamDialogue = (nextState.teamDialogue || []).filter(
    (dlg) => dlg.expiresTurn > currentTurn
  );

  // 7. Generate Contextual Next-Turn Bedside Specialist Prompt based on current state & stage
  const nextTargets = window.computeProtocolTargets(nextState);
  let nextPromptQuestion = '';

  const paco2Drop = nextState.patient.preEclsPaco2 - nextState.telemetry.paco2;
  if (!nextState.circuit.onEcmo) {
    if (nextState.complications.wireCoiled) {
      nextPromptQuestion = 'ECLS Surgeon: "We are scrubbed and guide wire is in place. Hold on—did we verify guide wire position on Echo/Fluoro before cannula insertion and confirm heparin timing?"';
    } else {
      nextPromptQuestion = 'ECLS Surgeon & Bedside Team: "The guide wire is verified and cannulation site is prepped. The ECMO console is in STANDBY. What are your orders for heparin, standby blood products, and orders to release clamps and initiate ECMO?"';
    }
  } else if (nextState.complications.tamponade) {
    nextPromptQuestion = 'ECLS Surgeon: "Doctor! The patient has acute cardiac tamponade with right ventricular diastolic collapse! What are your orders for emergency pericardiocentesis?"';
  } else if (nextState.complications.pneumothorax) {
    nextPromptQuestion = 'Pediatric RT: "Doctor! Acute tension pneumothorax with absent right breath sounds and severe desaturation! What are your orders for emergency needle decompression?"';
  } else if (nextState.complications.wireCoiled) {
    nextPromptQuestion = 'ECLS Surgeon: "Hold on—before I advance the cannula, did we verify the guide wire position on Echo/Fluoro and confirm heparin timing?"';
  } else if (nextState.circuit.obstructionSite === 4) {
    nextPromptQuestion = `Bedside Specialist: "Doctor, ΔP (TMP) is up to ${nextState.circuit.tmp} mmHg with P_out at +${nextState.circuit.pOut} mmHg and visible clot in the oxygenator header. What are your orders for the circuit and coagulation labs?"`;
  } else if (nextState.circuit.obstructionSite === 1 || nextState.circuit.pIn <= -60) {
    nextPromptQuestion = `Bedside Specialist: "Venous inlet pressure P_in is ${nextState.circuit.pIn} mmHg with line chatter and cutback. How would you like to adjust RPM, evaluate the cannula/pericardium, or resuscitate preload?"`;
  } else if (nextState.patient.mode === 'VV' && nextState.circuit.recirculationFraction >= 0.30) {
    nextPromptQuestion = `Bedside Specialist: "In-line venous ScvO2 is ${nextState.circuit.svo2}% (nearly identical to post-ox SaO2 ${nextState.circuit.postOxSao2}%) while patient SpO2 is ${nextState.telemetry.postSpo2}%. What diagnostic check and cannula maneuver should we perform?"`;
  } else if (paco2Drop >= 12 && nextState.elapsedMinutes <= 60) {
    nextPromptQuestion = `Bedside RN: "⚠️ Neuro-Monitoring Alert! TCM CO2 has dropped ${paco2Drop} mmHg below pre-ECLS baseline and Cerebral NIRS is ${nextState.telemetry.nirsLeft}%/${nextState.telemetry.nirsRight}% (Post-Ox pH ${nextState.telemetry.postOxPh}). What is your new sweep gas order using the Sweep Titration Formula?"`;
  } else if (nextState.elapsedMinutes < 15) {
    const nextStep = nextTargets.rampSteps[nextTargets.currentStepIndex];
    nextPromptQuestion = `Bedside Specialist: "We are now at Minute ${nextState.elapsedMinutes} (BFR ${nextState.circuit.flowLpm.toFixed(2)} L/min, Sweep ${nextState.circuit.sweepLpm.toFixed(2)} L/min, PaCO2 ${nextState.telemetry.paco2} mmHg). What are your orders for the next 3-minute ramp step (target ~${nextStep.flowLpm} L/min) and console settings?"`;
  } else if (nextState.elapsedMinutes >= 15 && (nextState.vent.pip > 32 || nextState.vent.peep > 12)) {
    nextPromptQuestion = `Bedside RT: "We have reached Minute ${nextState.elapsedMinutes}. The ventilator is still at PIP ${nextState.vent.pip} / PEEP ${nextState.vent.peep} cmH2O, Rate ${nextState.vent.rate}. What are your Box D First Ventilator Wean orders and 20-minute lab orders?"`;
  } else {
    nextPromptQuestion = `Bedside Specialist: "Turn complete at Minute ${nextState.elapsedMinutes}. Hemodynamics and circuit telemetry updated below. What are your next orders for ventilator/vasodilator weaning (q2h), sweep titration (q4h), or lab monitoring?"`;
  }

  // 8. Optional Gemini API Enrichment
  let aiSpecialistNote = '';
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const systemInstruction = `${window.ECMO_SKILL_MD}

You are the Bedside ECMO Specialist & PICU RN in an interactive clinical simulation.
Respond in-character in 2-4 concise sentences:
1) Confirm the actions just executed (${actionNotes.join(' ') || raw}),
2) Report any acute clinical findings without giving away unrequested answers, and
3) End by asking the participant what their next bedside orders are.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Participant Order: "${raw}"\nUpdated State at Minute ${nextState.elapsedMinutes}: BFR ${nextState.circuit.flowLpm} L/min, RPM ${nextState.circuit.rpm}, P_in ${nextState.circuit.pIn}, P_out +${nextState.circuit.pOut}, TMP ${nextState.circuit.tmp}, Sweep ${nextState.circuit.sweepLpm} L/min, PaCO2 ${nextState.telemetry.paco2} mmHg (Pre-ECLS ${nextState.patient.preEclsPaco2}), NIRS ${nextState.telemetry.nirsLeft}%/${nextState.telemetry.nirsRight}%, SpO2 ${nextState.telemetry.preSpo2}%/${nextState.telemetry.postSpo2}%.`
                  }
                ]
              }
            ],
            generationConfig: { temperature: 0.3, maxOutputTokens: 280 }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) aiSpecialistNote = candidateText.trim();
      }
    } catch (err) {
      console.warn('Gemini fallback to built-in specialist:', err);
    }
  }

  const combinedSpecialistResponse =
    aiSpecialistNote ||
    `${actionNotes.length > 0 ? actionNotes.join(' ') + '\n\n' : ''}${nextPromptQuestion}`;

  const structuredMarkdown = window.formatStructuredTurnMarkdown(nextState);

  return {
    nextState,
    specialistReply: combinedSpecialistResponse,
    nextPromptQuestion,
    structuredMarkdown,
    isTurnAdvancing: true
  };
};
