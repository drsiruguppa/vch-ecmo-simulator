// Spoiler-Free Realistic Clinical Cases with Multi-Stage Turn Progression

window.ECMO_SCENARIOS = [
  {
    id: 'case-1-neonate',
    title: 'Case 1: 3.4 kg Neonate (CDH / Severe PPHN) — New VV Cannulation',
    blindTitle: 'Case 1: 3.4 kg Neonate — Acute Respiratory Failure (VV ECLS)',
    category: 'Initiation & Ramp-Up',
    handoff: 'Bedside Handoff: 3-day-old, 3.4 kg (BSA 0.22 m²) neonate with left Congenital Diaphragmatic Hernia on CMV (PIP 36 / PEEP 14 / Rate 40 / FiO2 100%) and iNO 20 ppm. Pre-ECLS ABG: pH 7.11, PaCO2 74 mmHg, PaO2 38 mmHg, Lactate 4.8 mmol/L. Baseline Cerebral NIRS: 68% L / 69% R. The surgeon has just placed a 13 Fr MC3 Crescent RA dual-lumen cannula via the Right IJ (1/4" circuit). Circuit clamps were just released at idle speed.',
    initialPrompt: 'Bedside ECMO Specialist: "Clamps are off at idle RPM, Doctor. The QWS console is currently in Default alarm mode and sweep gas is off. What are your Minute 1 blood flow target (Box B), initial sweep gas settings (Box M), and console alarm orders?"',
    stages: [
      {
        stageId: 1,
        name: 'Minute 1 Initiation (Box B & QWS Alarms)',
        promptHint: 'Calculate Minute 1 BFR (Box B = Box A / 6), set initial sweep (Box M = 0.25 × BFR at 80% FiO2), and activate QWS ECLS Run safety alarms.'
      },
      {
        stageId: 2,
        name: 'Minutes 4–13 Stepwise BFR Ramp-Up',
        promptHint: 'Titrate BFR incrementally every 3 minutes toward 15-minute Target BFR (Box A: 1.2–1.5 L/min/m² × BSA) while keeping PaCO2 drop <10 mmHg from pre-ECLS value (74 mmHg).'
      },
      {
        stageId: 3,
        name: 'Minute 15 Target BFR & First Ventilator Wean (Box D)',
        promptHint: 'Confirm 15-minute target BFR (Box A), execute the 15-minute first ventilator wean (Box D: danger-range PIP to 32, PEEP to 12 without dropping rate), and order the 20-minute post-initiation ABG & coag block.'
      },
      {
        stageId: 4,
        name: 'Hour 2+ Rest Ventilator & iNO De-escalation',
        promptHint: 'Begin q2h ventilator weaning toward rest settings (SIMV-PC 20/10, Rate 10, I-time 2.0s, FiO2 30-40%) and initiate stepwise iNO weaning at Hour 2 (20 -> 15 ppm).'
      }
    ],
    elapsedMinutes: 1,
    patient: {
      name: 'Baby Girl Avery (3d old)',
      ageLabel: '3 days old (Neonate)',
      weightKg: 3.4,
      bsa: 0.22,
      mode: 'VV',
      tubingSize: '1/4"',
      cannulaType: 'MC3 Crescent RA (Dual-Lumen VV)',
      cannulaDesc: '13 Fr (8.9 cm) MC3 Crescent RA via Right IJ',
      lowerArtSite: 'Umbilical Art',
      preEclsPaco2: 74,
      targetPaco2Min: 65,
      targetPaco2Max: 74,
      nativeCardiacIndex: 2.8,
      nativeLungShunt: 0.68,
      nativeCompliance: 0.35,
      intravascularVolumeStatus: 0,
      labs: {
        hb: 11.8,
        hct: 35,
        platelets: 112,
        inr: 1.4,
        ptt: 68,
        fibrinogen: 165,
        antiXa: 0.45,
        at3: 78,
        pfHgb: 18,
        lactate: 4.8
      }
    },
    circuit: {
      rpm: 1150,
      flowLpm: 0.05,
      sweepLpm: 0.0,
      sweepFio2: 80,
      waterTemp: 37.0,
      bloodTemp: 36.9,
      obstructionSite: 0,
      obstructionSeverity: 0,
      recirculationFraction: 0.04,
      airBubbleDetected: false,
      alarms: {
        backflowPrevention: false,
        maxInlet: -100,
        stopInlet: -150,
        maxOutlet: 300,
        stopOutlet: 400,
        bubbleDetection: false,
        gaugeNarrowed: false
      }
    },
    vent: {
      mode: 'CMV',
      pip: 36,
      peep: 14,
      rate: 40,
      iTime: 0.6,
      hz: 0,
      fio2: 100,
      inoPpm: 20,
      flolan: 0.0
    },
    complications: {
      tamponade: false,
      wireCoiled: false
    }
  },
  {
    id: 'case-2-peds-va',
    title: 'Case 2: 12.0 kg Child (Myocarditis / ARDS on VDR4) — VA Initiation',
    blindTitle: 'Case 2: 12.0 kg Child — Cardiogenic Shock & VDR4 (VA ECLS)',
    category: 'VA Initiation & VDR4 Wean',
    handoff: 'Bedside Handoff: 2-year-old, 12.0 kg (BSA 0.54 m²) with fulminant myocarditis and severe pulmonary edema on VDR4 high-frequency percussive ventilation (36/14, Osc Rate 45, Freq 400 Hz, FiO2 100%), iNO 20 ppm, and nebulized Flolan 0.1 mcg/kg/min. Pre-ECLS PaCO2 is 68 mmHg, Hct 34%, Platelets 92k. Just cannulated onto VA ECMO (19 Fr Right IJ venous / 14 Fr Right Carotid arterial, 1/4" circuit).',
    initialPrompt: 'Bedside ECMO Specialist: "We are on bypass at Minute 1, Doctor. What are your orders for the VA blood flow ramp-up, QWS alarms, blood product transfusions, and when would you like to adjust the VDR4 ventilator?"',
    stages: [
      {
        stageId: 1,
        name: 'Minute 1 VA Initiation & Safety Alarms',
        promptHint: 'Verify Minute 1 VA BFR (Box B = Box A / 6 where VA Box A = 2.0–2.5 L/min/m² × 0.54 = 1.08–1.35 L/min), set initial sweep (0.25 × BFR), and enable QWS Run alarms.'
      },
      {
        stageId: 2,
        name: '15-Minute Target VA BFR & Box D VDR4 Wean',
        promptHint: 'Ramp BFR every 3 minutes to 1.08–1.35 L/min at Minute 15, then wean VDR4 danger pressures (PIP to 32, PEEP to 12 without changing rate/frequency) and address Hct <35% / Plt <100k.'
      },
      {
        stageId: 3,
        name: 'Hours 2–6 VDR4 Conversion & iNO/Flolan Weaning',
        promptHint: 'Every 2 hours: wean VDR4 PIP/PEEP by 2 (toward 26/10), increase Hz by 25 (toward 500 Hz), wean Osc Rate by 5 (toward 30 bpm), then convert to SIMV-PC 26/10, Rate 30. Wean iNO and Flolan stepwise starting at Hour 2.'
      }
    ],
    elapsedMinutes: 1,
    patient: {
      name: 'Lucas M. (2 yr old)',
      ageLabel: '2 years old (Pediatric)',
      weightKg: 12.0,
      bsa: 0.54,
      mode: 'VA',
      tubingSize: '1/4"',
      cannulaType: 'Wire-Reinforced Single-Lumen',
      cannulaDesc: '19 Fr Venous (Right IJ) / 14 Fr Arterial (Right Carotid)',
      lowerArtSite: 'Right Femoral',
      preEclsPaco2: 68,
      targetPaco2Min: 60,
      targetPaco2Max: 68,
      nativeCardiacIndex: 1.3,
      nativeLungShunt: 0.55,
      nativeCompliance: 0.45,
      intravascularVolumeStatus: 0,
      labs: {
        hb: 11.2,
        hct: 34,
        platelets: 92,
        inr: 1.6,
        ptt: 72,
        fibrinogen: 135,
        antiXa: 0.52,
        at3: 72,
        pfHgb: 22,
        lactate: 6.4
      }
    },
    circuit: {
      rpm: 1450,
      flowLpm: 0.20,
      sweepLpm: 0.05,
      sweepFio2: 80,
      waterTemp: 37.0,
      bloodTemp: 36.8,
      obstructionSite: 0,
      obstructionSeverity: 0,
      recirculationFraction: 0.0,
      airBubbleDetected: false,
      alarms: {
        backflowPrevention: false,
        maxInlet: -100,
        stopInlet: -150,
        maxOutlet: 300,
        stopOutlet: 400,
        bubbleDetection: false,
        gaugeNarrowed: false
      }
    },
    vent: {
      mode: 'VDR4',
      pip: 36,
      peep: 14,
      rate: 45,
      iTime: 0.65,
      hz: 400,
      fio2: 100,
      inoPpm: 20,
      flolan: 0.10
    },
    complications: {
      tamponade: false,
      wireCoiled: false
    }
  },
  {
    id: 'case-3-high-outlet',
    title: 'Case 3: 8.5 kg Infant on VA ECMO (Hr 38) — Acute Console Cutback Alarm',
    blindTitle: 'Case 3: 8.5 kg Infant (VA ECMO Hr 38) — Acute High Pressure Alarm',
    category: 'Acute Circuit Troubleshooting',
    handoff: 'Bedside Handoff: 8-month-old, 8.5 kg (BSA 0.42 m²) infant on VA ECMO Hour 38 (1/4" circuit). You are called urgently to the bedside because the QWS console is sounding a high-priority alarm and blood flow has automatically dropped from 0.90 L/min to 0.68 L/min.',
    initialPrompt: 'Bedside ECMO Specialist: "Doctor, our flow just cut back to 0.68 L/min and the Max Outlet Cutback alarm is flashing! Look at our circuit pressures and telemetry—what would you like to inspect, sample, or order right now?"',
    stages: [
      {
        stageId: 1,
        name: 'Differential Diagnosis of High P_out & Flow Cutback',
        promptHint: 'Examine P_in, P_out, P_ox-in, P_ox-out, and Delta P (TMP), inspect the circuit headers, and draw pre/post-ox blood gases via the 1/4" SC1 pigtail.'
      },
      {
        stageId: 2,
        name: 'Definitive Mechanical & Hematologic Intervention',
        promptHint: 'Address the underlying circuit obstruction, replete AT3 / Fibrinogen / Platelets / PRBCs per protocol thresholds, and verify restoration of target flow and gas exchange.'
      }
    ],
    elapsedMinutes: 2280,
    patient: {
      name: 'Mateo R. (8 mo old)',
      ageLabel: '8 months old (Infant)',
      weightKg: 8.5,
      bsa: 0.42,
      mode: 'VA',
      tubingSize: '1/4"',
      cannulaType: 'Wire-Reinforced Single-Lumen',
      cannulaDesc: '17 Fr Venous (Right IJ) / 12 Fr Arterial (Right Carotid)',
      lowerArtSite: 'Left Femoral',
      preEclsPaco2: 52,
      targetPaco2Min: 42,
      targetPaco2Max: 48,
      nativeCardiacIndex: 1.5,
      nativeLungShunt: 0.40,
      nativeCompliance: 0.55,
      intravascularVolumeStatus: 0,
      labs: {
        hb: 10.6,
        hct: 32,
        platelets: 58,
        inr: 1.9,
        ptt: 44,
        fibrinogen: 88,
        antiXa: 0.18,
        at3: 44,
        pfHgb: 85,
        lactate: 3.9
      }
    },
    circuit: {
      rpm: 3150,
      flowLpm: 0.68,
      sweepLpm: 0.70,
      sweepFio2: 80,
      waterTemp: 37.0,
      bloodTemp: 37.0,
      obstructionSite: 4,
      obstructionSeverity: 0.78,
      recirculationFraction: 0.0,
      airBubbleDetected: false,
      alarms: {
        backflowPrevention: true,
        maxInlet: -60,
        stopInlet: -100,
        maxOutlet: 250,
        stopOutlet: 300,
        bubbleDetection: true,
        gaugeNarrowed: true
      }
    },
    vent: {
      mode: 'CMV',
      pip: 20,
      peep: 10,
      rate: 10,
      iTime: 2.0,
      hz: 0,
      fio2: 35,
      inoPpm: 0,
      flolan: 0
    },
    complications: {
      tamponade: false,
      wireCoiled: false
    }
  },
  {
    id: 'case-4-drainage-failure',
    title: 'Case 4: 4.2 kg Neonate on VV ECMO (Hr 14) — Line Chatter & Flow Drop',
    blindTitle: 'Case 4: 4.2 kg Neonate (VV ECMO Hr 14) — Acute Drainage Alarm',
    category: 'Circuit Mechanics & Preload',
    handoff: 'Bedside Handoff: 10-day-old, 4.2 kg (BSA 0.25 m²) neonate on VV ECMO via a 15 Fr MC3 Crescent RA cannula at Hour 14. Over the past 10 minutes, the venous line began chattering violently and the QWS console activated a Max Inlet Cutback.',
    initialPrompt: 'Bedside RN / Specialist: "Doctor, the venous limb is jumping on the bed and P_in keeps hitting -63 mmHg with flow cutting back! How do you want to manage the pump speed and evaluate the patient?"',
    stages: [
      {
        stageId: 1,
        name: 'Immediate Suction Relief & Differential Evaluation',
        promptHint: 'Temporarily reduce RPM to stop atrial wall suction chatter, inspect the pre-pump venous tubing (Site 1), check bedside echo to rule out tamponade/malposition, and assess volume/Hct.'
      },
      {
        stageId: 2,
        name: 'Preload Resuscitation & Flow Restoration',
        promptHint: 'Administer volume / PRBC transfusion (Hct is 33%, goal >35%) and ramp BFR smoothly back to target.'
      }
    ],
    elapsedMinutes: 840,
    patient: {
      name: 'Baby Boy Noah (10d old)',
      ageLabel: '10 days old (Neonate)',
      weightKg: 4.2,
      bsa: 0.25,
      mode: 'VV',
      tubingSize: '1/4"',
      cannulaType: 'MC3 Crescent RA (Dual-Lumen VV)',
      cannulaDesc: '15 Fr (9.7 cm) MC3 Crescent RA via Right IJ',
      lowerArtSite: 'Posterior Tibial',
      preEclsPaco2: 60,
      targetPaco2Min: 48,
      targetPaco2Max: 55,
      nativeCardiacIndex: 2.4,
      nativeLungShunt: 0.58,
      nativeCompliance: 0.42,
      intravascularVolumeStatus: -1.8,
      labs: {
        hb: 11.0,
        hct: 33,
        platelets: 105,
        inr: 1.5,
        ptt: 74,
        fibrinogen: 170,
        antiXa: 0.48,
        at3: 82,
        pfHgb: 34,
        lactate: 3.1
      }
    },
    circuit: {
      rpm: 2650,
      flowLpm: 0.26,
      sweepLpm: 0.30,
      sweepFio2: 75,
      waterTemp: 37.0,
      bloodTemp: 36.9,
      obstructionSite: 1,
      obstructionSeverity: 0.65,
      recirculationFraction: 0.08,
      airBubbleDetected: false,
      alarms: {
        backflowPrevention: true,
        maxInlet: -60,
        stopInlet: -100,
        maxOutlet: 250,
        stopOutlet: 300,
        bubbleDetection: true,
        gaugeNarrowed: true
      }
    },
    vent: {
      mode: 'CMV',
      pip: 22,
      peep: 10,
      rate: 15,
      iTime: 1.5,
      hz: 0,
      fio2: 40,
      inoPpm: 4,
      flolan: 0
    },
    complications: {
      tamponade: false,
      wireCoiled: false
    }
  },
  {
    id: 'case-5-hypoxemia',
    title: 'Case 5: 5.0 kg Infant on VV ECMO — Acute Patient Desaturation to 72%',
    blindTitle: 'Case 5: 5.0 kg Infant (VV ECMO Hr 26) — Acute Patient Hypoxemia',
    category: 'Oxygenation Troubleshooting',
    handoff: 'Bedside Handoff: 3-month-old, 5.0 kg (BSA 0.29 m²) infant on VV ECMO (15 Fr MC3 Crescent RA dual-lumen cannula) at Hour 26. After routine linen change and bath, the bedside monitor alarms for patient SpO2 dropping to 72%.',
    initialPrompt: 'Bedside RN: "Doctor, the patient’s SpO2 just dropped to 72% and Cerebral NIRS is down to 54%, even though our ECMO flow is still 0.42 L/min! What are your diagnostic steps and orders?"',
    stages: [
      {
        stageId: 1,
        name: 'Identify Cause of VV Hypoxemia',
        promptHint: 'Compare in-line venous ScvO2 vs post-membrane SaO2, inspect tubing color differential, and order a bedside echo to evaluate MC3 Crescent RA cannula orientation.'
      },
      {
        stageId: 2,
        name: 'Corrective Cannula Intervention',
        promptHint: 'Reposition/rotate the malrotated dual-lumen cannula under echo guidance to direct the return jet toward the tricuspid valve and confirm systemic SpO2 recovery.'
      }
    ],
    elapsedMinutes: 1560,
    patient: {
      name: 'Chloe T. (3 mo old)',
      ageLabel: '3 months old (Infant)',
      weightKg: 5.0,
      bsa: 0.29,
      mode: 'VV',
      tubingSize: '1/4"',
      cannulaType: 'MC3 Crescent RA (Dual-Lumen VV)',
      cannulaDesc: '15 Fr (9.7 cm) MC3 Crescent RA via Right IJ',
      lowerArtSite: 'Right Femoral',
      preEclsPaco2: 64,
      targetPaco2Min: 48,
      targetPaco2Max: 54,
      nativeCardiacIndex: 2.9,
      nativeLungShunt: 0.65,
      nativeCompliance: 0.38,
      intravascularVolumeStatus: 0,
      labs: {
        hb: 12.1,
        hct: 36,
        platelets: 128,
        inr: 1.3,
        ptt: 66,
        fibrinogen: 190,
        antiXa: 0.44,
        at3: 86,
        pfHgb: 15,
        lactate: 2.8
      }
    },
    circuit: {
      rpm: 2550,
      flowLpm: 0.42,
      sweepLpm: 0.38,
      sweepFio2: 85,
      waterTemp: 37.0,
      bloodTemp: 37.0,
      obstructionSite: 0,
      obstructionSeverity: 0,
      recirculationFraction: 0.58,
      airBubbleDetected: false,
      alarms: {
        backflowPrevention: true,
        maxInlet: -60,
        stopInlet: -100,
        maxOutlet: 250,
        stopOutlet: 300,
        bubbleDetection: true,
        gaugeNarrowed: true
      }
    },
    vent: {
      mode: 'CMV',
      pip: 20,
      peep: 10,
      rate: 10,
      iTime: 2.0,
      hz: 0,
      fio2: 35,
      inoPpm: 0,
      flolan: 0
    },
    complications: {
      tamponade: false,
      wireCoiled: false
    }
  },
  {
    id: 'case-6-neuro-alert',
    title: 'Case 6: 16.5 kg Child on VV ECMO (Min 25) — Acute Cerebral NIRS Drop',
    blindTitle: 'Case 6: 16.5 kg Child (VV ECMO Min 25) — Acute NIRS & TCM Alert',
    category: 'Neuro-Monitoring & Sweep Kinetics',
    handoff: 'Bedside Handoff: 4-year-old, 16.5 kg (BSA 0.68 m²) with refractory status asthmaticus placed on VV ECMO (24 Fr MC3 Crescent Bicaval, 3/8" circuit) 25 minutes ago. Pre-ECLS ABG had pH 6.98, PaCO2 82 mmHg, and baseline Cerebral NIRS was 72% L / 73% R. You are called to the bedside for a NIRS alarm.',
    initialPrompt: 'Bedside RN: "Doctor, bilateral cerebral NIRS just dropped from 72% down to 51%, and the TCM CO2 monitor is reading 55 mmHg! What would you like to order and how should we adjust the circuit?"',
    stages: [
      {
        stageId: 1,
        name: 'STAT ABG & Sweep Titration Calculation',
        promptHint: 'Order a STAT Patient ABG & Post-Ox gas (remembering 3/8" sampling rules), check post-ox pH (<7.55 cap), and calculate the exact new sweep gas rate using: New Sweep = Current Sweep × (Current PCO2 / Desired PCO2).'
      },
      {
        stageId: 2,
        name: 'Verify Neuro-Recovery & Set 4-Hour Weaning Plan',
        promptHint: 'Confirm PaCO2 returns within <10 mmHg of Pre-ECLS baseline (74–80 mmHg), verify cerebral NIRS recovery, and plan subsequent PaCO2 weaning at 5 mmHg every 4 hours.'
      }
    ],
    elapsedMinutes: 25,
    patient: {
      name: 'Ethan K. (4 yr old)',
      ageLabel: '4 years old (Pediatric)',
      weightKg: 16.5,
      bsa: 0.68,
      mode: 'VV',
      tubingSize: '3/8"',
      cannulaType: 'MC3 Crescent Bicaval (VV)',
      cannulaDesc: '24 Fr (30 cm) MC3 Crescent Bicaval via Right IJ',
      lowerArtSite: 'Left Femoral',
      preEclsPaco2: 82,
      targetPaco2Min: 73,
      targetPaco2Max: 80,
      nativeCardiacIndex: 3.1,
      nativeLungShunt: 0.42,
      nativeCompliance: 0.30,
      intravascularVolumeStatus: 0,
      labs: {
        hb: 12.4,
        hct: 37,
        platelets: 165,
        inr: 1.2,
        ptt: 70,
        fibrinogen: 210,
        antiXa: 0.49,
        at3: 88,
        pfHgb: 12,
        lactate: 2.4
      }
    },
    circuit: {
      rpm: 2300,
      flowLpm: 0.95,
      sweepLpm: 2.10,
      sweepFio2: 80,
      waterTemp: 37.0,
      bloodTemp: 37.0,
      obstructionSite: 0,
      obstructionSeverity: 0,
      recirculationFraction: 0.05,
      airBubbleDetected: false,
      alarms: {
        backflowPrevention: true,
        maxInlet: -60,
        stopInlet: -100,
        maxOutlet: 250,
        stopOutlet: 300,
        bubbleDetection: true,
        gaugeNarrowed: true
      }
    },
    vent: {
      mode: 'CMV',
      pip: 30,
      peep: 10,
      rate: 16,
      iTime: 1.2,
      hz: 0,
      fio2: 40,
      inoPpm: 0,
      flolan: 0
    },
    complications: {
      tamponade: false,
      wireCoiled: false
    }
  },
  {
    id: 'case-7-ecpr',
    title: 'Case 7: 6.2 kg Infant (Post-Norwood) — E-CPR Activation & Cannulation',
    blindTitle: 'Case 7: 6.2 kg Infant — Acute Decompensation & E-CPR Activation',
    category: 'E-CPR & Time-Out Protocol',
    handoff: 'Bedside Handoff: 4-month-old, 6.2 kg (BSA 0.33 m²) infant status-post Stage 1 Norwood in refractory low-flow state (HR 54 bpm, MAP 26 mmHg, Lactate 11.2, PaCO2 78 mmHg, Platelets 125k, Fibrinogen 130 mg/dL). The surgical team is scrubbed at the bedside with 15 Fr venous and 10 Fr arterial cannulae and has just inserted the guide wire.',
    initialPrompt: 'ECLS Surgeon & Bedside Team: "We are scrubbed and ready to cannulate, Doctor. The ECMO console numbers are currently in STANDBY and circuit clamps are on. What are your pre-cannulation checklist orders (Time-Out, wire check, heparin bolus, standby products) and initiation orders to place Sofia on ECMO?"',
    stages: [
      {
        stageId: 1,
        name: 'Pre-Cannulation Time-Out, Wire Echo Check & Heparin Timing',
        promptHint: 'Run the Intensivist Time-Out Script, verify on Echo/Fluoro that the guide wire is NOT coiled in the SVC/RA/RV, give surgeon-directed heparin bolus (75 U/kg), and order platelets (<150k in infant <1yr) and cryo (<150 mg/dL in <6mo).'
      },
      {
        stageId: 2,
        name: 'Minute 1 VA ECMO Initiation & Ramp-Up',
        promptHint: 'Initiate Minute 1 VA BFR (Box B = Box A / 6), enable QWS ECLS Run safety alarms, set initial sweep (0.25 × BFR), and ramp every 3 minutes to 15-minute target VA flow.'
      }
    ],
    elapsedMinutes: 0,
    patient: {
      name: 'Baby Girl Sofia (4 mo old)',
      ageLabel: '4 months old (Infant - Norwood)',
      weightKg: 6.2,
      bsa: 0.33,
      mode: 'VA',
      tubingSize: '1/4"',
      cannulaType: 'Wire-Reinforced Single-Lumen',
      cannulaDesc: '15 Fr Venous (Right IJ) / 10 Fr Arterial (Right Carotid)',
      lowerArtSite: 'Left Femoral',
      preEclsPaco2: 78,
      targetPaco2Min: 69,
      targetPaco2Max: 78,
      nativeCardiacIndex: 0.8,
      nativeLungShunt: 0.55,
      nativeCompliance: 0.45,
      intravascularVolumeStatus: -1,
      labs: {
        hb: 11.4,
        hct: 34,
        platelets: 125,
        inr: 1.7,
        ptt: 42,
        fibrinogen: 130,
        antiXa: 0.0,
        at3: 58,
        pfHgb: 10,
        lactate: 11.2
      }
    },
    circuit: {
      onEcmo: false,
      rpm: 0,
      flowLpm: 0.0,
      sweepLpm: 0.0,
      sweepFio2: 80,
      waterTemp: 37.0,
      bloodTemp: 36.5,
      obstructionSite: 0,
      obstructionSeverity: 0,
      recirculationFraction: 0.0,
      airBubbleDetected: false,
      alarms: {
        backflowPrevention: false,
        maxInlet: -100,
        stopInlet: -150,
        maxOutlet: 300,
        stopOutlet: 400,
        bubbleDetection: false,
        gaugeNarrowed: false
      }
    },
    vent: {
      mode: 'CMV',
      pip: 34,
      peep: 10,
      rate: 30,
      iTime: 0.7,
      hz: 0,
      fio2: 100,
      inoPpm: 20,
      flolan: 0
    },
    complications: {
      tamponade: false,
      wireCoiled: true
    }
  },
  {
    id: 'case-8-team-sport',
    title: 'Case 8: 🤝 "Team Sport" Live Multidisciplinary Run — 3.8 kg Neonate (VA ECMO)',
    blindTitle: 'Case 8: 🤝 "Team Sport" Live Multidisciplinary Run — 3.8 kg Neonate (VA ECMO)',
    category: 'Multidisciplinary Team Co-Pilot',
    teamModeDefault: true,
    handoff: 'Bedside Handoff (Team Sport Mode Active): 4-day-old, 3.8 kg (BSA 0.24 m²) neonate with severe CDH & LV/RV dysfunction just cannulated onto VA ECMO (15 Fr Right IJ venous / 10 Fr Right Carotid arterial, 1/4" circuit). Pre-ECLS ABG: pH 7.09, PaCO2 76 mmHg, PaO2 36 mmHg, Lactate 6.8 mmol/L, Hct 33%, Platelets 94k, Fibrinogen 138 mg/dL. Your Perfusionist, Bedside PICU RN, Pediatric RT, and ECLS Surgeon are actively giving you real-time bedside input as the scenario unfolds.',
    initialPrompt: 'Multidisciplinary Team Huddle:\n• Perfusionist: "Clamps are off at idle RPM, Doctor. For 0.24 m² VA ECMO, our 15-min Box A target is ~0.54 L/min, so Minute 1 Box B (Box A / 6) is 0.09 L/min, and our QWS alarms are still in Default mode."\n• Bedside RN: "Baseline PaCO2 is 76 mmHg (TCM 78, Cerebral NIRS 66% L / 67% R), and I have <14d PRBCs and peripheral IV platelets ready for Hct 33% / Plt 94k."\n• What are your Minute 1 orders for the team?',
    stages: [
      {
        stageId: 1,
        name: 'Phase 1: Team Initiation (Box B Flow, Box M Sweep, QWS Alarms & Transfusions)',
        promptHint: 'Order Minute 1 BFR 0.09 L/min (Box B), initial sweep 0.05 L/min at 80% FiO2 (Box M), activate QWS ECLS Run alarms, and transfuse PRBCs + peripheral platelets + cryo.'
      },
      {
        stageId: 2,
        name: 'Phase 2: 3-Minute Ramp-Up & Neuro-Monitoring Vigilance',
        promptHint: 'Step up BFR every 3 minutes toward 0.54 L/min (Box A) while collaborating with the RN and Perfusionist to keep PaCO2 between 67–76 mmHg (<10 mmHg initial drop).'
      },
      {
        stageId: 3,
        name: 'Phase 3: Minute 15 Box D Ventilator Wean with RT & Acute Drainage Check',
        promptHint: 'At Minute 15, work with the RT to wean danger-range PIP to 32 and PEEP to 12 (keeping rate unchanged), draw the 20-min ABG/coag panel, and review the Attending Debrief.'
      }
    ],
    elapsedMinutes: 1,
    patient: {
      name: 'Baby Girl Maya (4d old - Team Run)',
      ageLabel: '4 days old (Neonate)',
      weightKg: 3.8,
      bsa: 0.24,
      mode: 'VA',
      tubingSize: '1/4"',
      cannulaType: 'Wire-Reinforced Single-Lumen',
      cannulaDesc: '15 Fr Venous (Right IJ) / 10 Fr Arterial (Right Carotid)',
      lowerArtSite: 'Umbilical Art',
      preEclsPaco2: 76,
      targetPaco2Min: 67,
      targetPaco2Max: 76,
      nativeCardiacIndex: 1.5,
      nativeLungShunt: 0.68,
      nativeCompliance: 0.34,
      intravascularVolumeStatus: -0.6,
      labs: {
        hb: 11.0,
        hct: 33,
        platelets: 94,
        inr: 1.5,
        ptt: 62,
        fibrinogen: 138,
        antiXa: 0.40,
        at3: 75,
        pfHgb: 18,
        lactate: 6.8
      }
    },
    circuit: {
      rpm: 1200,
      flowLpm: 0.06,
      sweepLpm: 0.0,
      sweepFio2: 80,
      waterTemp: 37.0,
      bloodTemp: 36.9,
      obstructionSite: 0,
      obstructionSeverity: 0,
      recirculationFraction: 0.0,
      airBubbleDetected: false,
      alarms: {
        backflowPrevention: false,
        maxInlet: -100,
        stopInlet: -150,
        maxOutlet: 300,
        stopOutlet: 400,
        bubbleDetection: false,
        gaugeNarrowed: false
      }
    },
    vent: {
      mode: 'CMV',
      pip: 36,
      peep: 14,
      rate: 40,
      iTime: 0.6,
      hz: 0,
      fio2: 100,
      inoPpm: 20,
      flolan: 0.05
    },
    complications: {
      tamponade: false,
      wireCoiled: false
    }
  }
];
