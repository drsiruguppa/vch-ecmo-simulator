// Pre-Simulation Physiology Briefing Engine (Spoiler-Free One-Page Overview of Physiology)
// Provides first-principles physiological, hydraulic, and neuro-protective review prior to starting any simulation run.

window.CASE_PHYSIOLOGY_BRIEFINGS = {
  'case-1-neonate': {
    title: 'Foundational Physiology: Neonatal VV ECMO & Neuro-Protective Gas Exchange',
    patientContext: '3.4 kg Neonate (BSA 0.22 m²) • VV ECMO (13 Fr MC3 Crescent RA via Right IJ) • 1/4" Circuit',
    corePrinciples: [
      {
        title: '1. Extracorporeal Hemodynamics & Native Cardiopulmonary Coupling in VV ECMO',
        icon: '🫀',
        summary: 'VV ECMO supports gas exchange in parallel with the native pulmonary circulation while native cardiac output governs systemic perfusion.',
        details: [
          'In Venovenous (VV) ECMO, deoxygenated systemic venous blood is drained from the right atrium, decarboxylated and oxygenated across the polymethylpentene (PMP) hollow-fiber membrane lung, and returned directly into the right atrium oriented toward the tricuspid valve.',
          'Crucially, VV ECMO provides zero direct hemodynamic or blood pressure support: systemic mean arterial pressure (MAP) and organ perfusion remain entirely dependent on native right and left ventricular stroke volume and systemic vascular resistance.',
          'To achieve adequate systemic arterial oxygenation, extracorporeal blood flow (BFR) must provide a substantial fraction of native cardiac output (typically 60–80% of native CO, corresponding to a 15-minute Box A target of 1.2–1.5 L/min/m² × BSA, or ~80–100 mL/kg/min in neonates).'
        ],
        pearl: 'Key Formula: Systemic arterial oxygen content is a mixing equation: CaO2 = (Q_ecmo × C_post_ox_O2 + [Q_native - Q_ecmo] × C_venous_O2) / Q_native.'
      },
      {
        title: '2. BFR Ramp-Up Schedule & Circulatory Load Protection (Box B -> Box A)',
        icon: '📈',
        summary: 'Gradual incremental flow ramp-up over 15 minutes protects against acute right atrial decompression and myocardial stun.',
        details: [
          'Immediate exposure to full extracorporeal blood flow abruptly alters venous return dynamics, right atrial geometry, and ventricular filling pressures.',
          'The institutional protocol establishes a Minute 1 Initial BFR (Box B = Box A / 6), permissible to be transiently below 500 mL/min for the first minute, followed by smooth 3-minute stepwise titration to reach Box A goal at Minute 15.',
          'This paced transition allows the neonatal myocardium and cerebral vasculature to adapt smoothly without abrupt shifts in preload or shear stress.'
        ],
        pearl: 'Protocol Rule: Minute 1 BFR = Box A / 6. Titrate incrementally every 3 minutes to avoid sudden circulatory load.'
      },
      {
        title: '3. CO2 Diffusion Kinetics & Cerebral Autoregulation (Box M & Box K)',
        icon: '🧠',
        summary: 'CO2 clearance across the membrane is 20× faster than O2. Rapid PaCO2 reduction causes acute cerebral vasoconstriction and ischemic injury.',
        details: [
          'Carbon dioxide has a solubility and diffusion coefficient across the hollow-fiber membrane roughly 20 times higher than oxygen. Consequently, membrane CO2 removal is exquisitely sensitive to Sweep Gas Flow Rate (L/min), whereas oxygenation depends primarily on Blood Flow Rate (L/min) and Hemoglobin concentration.',
          'CO2 readily diffuses across the blood-brain barrier into cerebrospinal fluid (CSF). Because CSF has minimal protein buffering and choroid plexus bicarbonate transport requires 6–24 hours, acute falls in PaCO2 cause immediate perivascular CSF alkalosis (decreased [H+]).',
          'This alkalosis triggers intense cerebral arteriolar vasoconstriction: cerebral blood flow (CBF) falls by 3–4% for every 1 mmHg decrease in PaCO2. In neonates with fragile germinal matrix vasculature, abrupt PaCO2 drops cause severe cerebral ischemia, falling Bifrontal NIRS (rSO2), and high risk of intracranial hemorrhage.',
          'Protocol Mandates: Initial Sweep Gas = 0.25 × BFR at 80% FiO2 (Box M). Maximum initial PaCO2 drop must be <10 mmHg from pre-ECLS baseline (Box K). Subsequent weaning is limited to 5 mmHg every 4 hours. Keep Post-Ox blood gas pH < 7.55 to prevent oxyhemoglobin left-shift and tissue hypoxia.'
        ],
        pearl: 'Sweep Titration Formula: New Sweep (L/min) = Current Sweep × (Current PaCO2 / Desired PaCO2).'
      },
      {
        title: '4. Hydraulic Circuit Pressures & Spectrum QWS Safety Interlocks',
        icon: '⚙️',
        summary: 'Continuous in-line pressure monitoring (P_in, P_out, P_ox-in, P_ox-out, ΔP) localizes hydraulic resistance and protects against cavitation.',
        details: [
          'P_in (Venous Drainage Pressure): Normal -20 to -60 mmHg. Reflects venous preload, intravascular volume status, and cannula resistance. Pressures more negative than -60 mmHg induce cavitation (gas extraction from blood), shear-induced hemolysis, and atrial suction.',
          'P_out & P_ox-in (Pump Outlet & Pre-Membrane): Positive pressure generated by centrifugal pump head to drive blood through the oxygenator.',
          'P_ox-out (Post-Membrane): Pressure exiting the oxygenator, reflecting downstream cannula resistance and native CVP/MAP.',
          'ΔP / TMP (Transmembrane Pressure Drop = P_ox-in - P_ox-out): By Hagen-Poiseuille law (ΔP = Q × R), ΔP reflects internal flow resistance across the hollow fibers. Normal baseline is <40–50 mmHg.',
          'QWS ECLS Run Safety Alarms: Backflow Prevention ON (prevents retrograde flow), Max Inlet Cutback at -60 mmHg (down-regulates RPM), Stop Inlet at -100 mmHg (stops pump), Max Outlet Cutback at +250 mmHg, Stop Outlet at +300 mmHg, and Small Bubble Detection ON.'
        ],
        pearl: 'Hydraulic Principle: Baseline ΔP (TMP) <40–50 mmHg. P_in must stay more positive than -60 mmHg to prevent cavitation.'
      },
      {
        title: '5. Lung-Protective Mechanical De-escalation & Rest Ventilation (Box D)',
        icon: '🫁',
        summary: 'De-escalating ventilator driving pressure once on ECLS halts ventilator-induced lung injury (VILI) while preserving alveolar patency.',
        details: [
          'High airway pressures (PIP > 32 cmH2O) and high mechanical power inflict severe barotrauma, volutrauma, and biotrauma on diseased neonatal lung tissue.',
          'Box D First Wean at 15 Minutes: Once target BFR and sweep are established, immediately reduce PIP to 32 cmH2O and PEEP to 12 cmH2O (if above danger range) without decreasing rate or frequency, eliminating overdistension stress while maintaining functional residual capacity (FRC).',
          'Subsequent Rest Settings: Stepwise weaning every 2 hours toward standard CMV rest settings (SIMV-PC, PIP 20, PEEP 10, Rate 10 bpm, I-time 2.0 sec, FiO2 30–40%).',
          'Pulmonary Vasodilator De-escalation: Inhaled Nitric Oxide (iNO) and prostacyclin down-regulate endogenous eNOS; stepwise weaning starts at Hour 2 (20->15->10->8->6->4->3->2->1->OFF) to prevent rebound pulmonary hypertension.'
        ],
        pearl: 'Lung Rest Target: SIMV-PC 20/10, Rate 10 bpm, I-time 2.0 sec, FiO2 30–40%. Wean iNO/Flolan starting at Hour 2.'
      },
      {
        title: '6. Hematology, Transfusion Thresholds & Circuit Anticoagulation',
        icon: '🩸',
        summary: 'Maintaining oxygen-carrying capacity (Hct >35%) and coagulation factors prevents both thrombosis and bleeding.',
        details: [
          'Arterial oxygen content is dominated by hemoglobin: CaO2 = 1.34 × Hb × SaO2 + 0.003 × PaO2. Target Hct >35% (<14-day fresh PRBCs) optimizes tissue O2 delivery (DO2) while preserving 2,3-DPG levels.',
          'Platelets: Maintain >100k/µL (>150k pre-pump in infants <1 yr). Crucial Rule: Always infuse platelets via a peripheral IV line far from the venous drainage cannula to prevent shear-induced platelet activation and membrane thrombosis.',
          'Antithrombin-III (AT3): Unfractionated heparin requires AT3 as a cofactor to inhibit thrombin and Factor Xa. In neonates with low endogenous AT3, heparin resistance is corrected with AT3 concentrate.'
        ],
        pearl: 'Transfusion Targets: Hct >35%, Platelets >100k (peripheral IV only!), Fibrinogen >150 mg/dL, INR <1.8.'
      }
    ]
  },

  'case-2-peds-va': {
    title: 'Foundational Physiology: Pediatric VA ECMO, Left Ventricular Afterload & VDR4 Mechanics',
    patientContext: '12.0 kg Child (BSA 0.54 m²) • VA ECMO (19 Fr Right IJ venous / 14 Fr Right Carotid arterial) • 1/4" Circuit',
    corePrinciples: [
      {
        title: '1. Venoarterial (VA) Hemodynamics & Ventricular Coupling',
        icon: '🫀',
        summary: 'VA ECMO provides biventricular circulatory support and gas exchange in parallel with the native heart, but increases Left Ventricular afterload.',
        details: [
          'In Venoarterial (VA) ECMO, deoxygenated blood is drained from the right atrium (decompressing the right heart and pulmonary circulation) and returned under arterial pressure into the systemic arterial tree (carotid or femoral artery).',
          'While right ventricular work is dramatically reduced, retrograde arterial inflow increases Left Ventricular Afterload. If native LV contractility is severely depressed, high afterload can prevent aortic valve opening, leading to LV distension, elevated left atrial pressure (LAP), pulmonary venous hypertension, and pulmonary edema.',
          'Target Blood Flow Rate (Box A) for pediatric VA ECMO is 2.0–2.5 L/min/m² × BSA (~1.08–1.35 L/min in this patient), replacing 80–100% of native cardiac index.'
        ],
        pearl: 'Physiological Pearl: In VA ECMO, monitor aortic valve opening and pulse pressure on arterial lines to detect LV afterload strain.'
      },
      {
        title: '2. Minute 1 VA Ramp-Up & Coronary Afterload Protection (Box B)',
        icon: '📈',
        summary: 'Starting at Box B (Box A / 6) avoids sudden afterload surge against a stunning myocardium.',
        details: [
          'Abruptly launching full VA arterial flow against a stunned left ventricle causes acute myocardial wall stress, sudden elevation in coronary afterload, and reperfusion arrhythmias.',
          'Minute 1 Initial BFR (Box B = Box A / 6) provides immediate baseline oxygenation and right heart decompression while the arterial tree adapts.',
          'BFR is stepped up incrementally every 3 minutes to reach full Box A flow at Minute 15 without triggering acute left ventricular stall.'
        ],
        pearl: 'Protocol Rule: VA Box B = (2.0–2.5 L/min/m² × BSA) / 6. Titrate q3m to Box A.'
      },
      {
        title: '3. Dual Arterial Line Monitoring & Two-Circulation (Harlequin) Dynamics',
        icon: '🎯',
        summary: 'Right Radial vs. Femoral/Lower Extremity arterial lines assess upper vs. lower body oxygen delivery and native cardiac output.',
        details: [
          'In VA ECMO with carotid return, well-oxygenated blood enters the aortic arch. If femoral return were used instead with severe pulmonary failure, native deoxygenated blood could eject from the LV into the brachiocephalic vessels while ECMO blood perfuses the lower body (Harlequin / Differential Hypoxemia).',
          'Right Radial arterial line measures pre-ductal perfusion to the right hemisphere and right arm. A lower extremity line (Femoral/Dorsalis Pedis) provides downstream systemic pressure comparison.',
          'Arterial pulse pressure (SBP - DBP) directly reflects native stroke volume and myocardial ejectile recovery.'
        ],
        pearl: 'Monitoring Rule: Narrow pulse pressure (<10 mmHg) indicates profound myocardial stun; widening pulse pressure signals LV recovery.'
      },
      {
        title: '4. High-Frequency Percussive Ventilation (VDR4) Dynamics & Weaning',
        icon: '🫁',
        summary: 'VDR4 delivers high-frequency sub-deadspace pulses superimposed on convective cycles, requiring a structured oscillatory weaning schedule.',
        details: [
          'VDR4 combines high-frequency percussive oscillation (400–500 Hz) with low-rate conventional convective breaths, optimizing laminar gas distribution, shear mucus clearance, and alveolar recruitment without high peak airway pressures.',
          'Protocol Weaning Cadence: At Minute 15, wean danger-range PIP to 32 and PEEP to 12 without changing rate or frequency.',
          'Subsequent q2h Weaning: Wean PIP by 2 cmH2O (goal 26), wean PEEP by 2 cmH2O (goal 10), increase frequency by 25 Hz (goal 500 Hz), and wean oscillatory rate by 5 bpm (goal 30 bpm, I:E 1:1).',
          'Conversion Point: Once at VDR4 26/10, rate 30, 500 Hz: convert to conventional SIMV-PC 26/10, rate 30, I:E 1:1 and continue standard weaning.'
        ],
        pearl: 'VDR4 Conversion: When VDR4 reaches 26/10, Rate 30, 500 Hz -> convert to conventional SIMV-PC 26/10.'
      },
      {
        title: '5. Neuro-Protective CO2 Management & Sweep Titration',
        icon: '🧠',
        summary: 'Gradual PaCO2 normalization prevents cerebral vasoconstriction and ischemic brain injury.',
        details: [
          'In chronically hypercapnic patients, cerebral arterioles are accustomed to elevated PaCO2. Rapid normalization triggers acute cerebral vasoconstriction and drops Bifrontal NIRS (rSO2).',
          'Initial Sweep Gas (Box M) = 0.25 × BFR at 80% FiO2. Keep initial PaCO2 drop <10 mmHg from baseline (Box K). Wean PaCO2 target by only 5 mmHg every 4 hours.',
          'Post-Ox blood gas pH cap <7.55 prevents acute alkalemia, ionized hypocalcemia, and myocardial irritability.'
        ],
        pearl: 'Target PaCO2: Maintain within 10 mmHg of pre-ECLS baseline initially. Titrate sweep using formula.'
      }
    ]
  },

  'case-3-high-outlet': {
    title: 'Foundational Physiology: Centrifugal Pump Hydraulics & In-Line Pressure Gradients',
    patientContext: '8.5 kg Infant (BSA 0.42 m²) • VA ECMO • 1/4" Circuit • Hour 38 Maintenance Run',
    corePrinciples: [
      {
        title: '1. Poiseuille & Darcy Hydraulic Laws in Extracorporeal Circuits',
        icon: '⚙️',
        summary: 'Fluid flow through tubing and hollow fibers is governed by pressure differentials and internal hydraulic resistance.',
        details: [
          'Blood flow through the extracorporeal circuit follows Darcy\'s and Hagen-Poiseuille\'s laws: ΔP = Q × R, where resistance R is proportional to blood viscosity and length, and inversely proportional to the 4th power of lumen radius (R ∝ 1/r⁴).',
          'A centrifugal pump head is a kinetic non-occlusive device: rotating impellers impart velocity to blood, which is converted to pressure head inside the volute housing. Unlike roller pumps, flow generated by a centrifugal head depends heavily on both preload (P_in) and afterload (P_out).'
        ],
        pearl: 'Hydraulic Principle: Centrifugal pump flow (L/min) is afterload-sensitive: as circuit resistance rises, flow falls unless RPM is increased.'
      },
      {
        title: '2. The 5 Circuit Hydraulic Pressure Zones',
        icon: '📊',
        summary: 'In-line pressure transducers define five distinct anatomical zones across the extracorporeal circuit.',
        details: [
          'Zone 1 (P_in): Venous inlet line before pump head (negative, baseline -20 to -60 mmHg). Reflects patient CVP, volume status, and venous cannula resistance.',
          'Zone 2 (P_out): Pump head outlet before the oxygenator conduit. Generated by impeller velocity.',
          'Zone 3 (P_ox-in / P1): Pre-membrane pressure entering the oxygenator housing.',
          'Zone 4 (P_ox-out / P2): Post-membrane pressure exiting the oxygenator housing.',
          'Zone 5 (ΔP / TMP = P_ox-in - P_ox-out): Transmembrane pressure drop across the polymethylpentene (PMP) hollow fibers. Baseline is <40–50 mmHg.'
        ],
        pearl: 'Pressure Signature: ΔP (TMP) directly isolates the internal resistance of the oxygenator membrane fiber bundle.'
      },
      {
        title: '3. Spectrum QWS Safety Alarm Thresholds',
        icon: '🛡️',
        summary: 'Automated cutback and stop alarms protect the patient from air embolism, cavitation, and circuit rupture.',
        details: [
          'Backflow Prevention: Prevents retrograde arterial-to-venous drainage when pump head pressure drops below patient MAP.',
          'Max Inlet Cutback (-60 mmHg) / Stop Inlet (-100 mmHg): Down-regulates RPM or stops pump to prevent cavitation and hemolysis.',
          'Max Outlet Cutback (+250 mmHg) / Stop Outlet (+300 mmHg): Protects post-pump tubing connections and membrane integrity from rupture.',
          'Bubble Detection: Ultrasonic sensor detects microbubbles on the return limb and stops the pump to prevent cerebral/systemic air emboli.'
        ],
        pearl: 'Run Thresholds: Inlet cutback -60 / stop -100 mmHg; Outlet cutback +250 / stop +300 mmHg; Backflow & Bubble ON.'
      },
      {
        title: '4. Contact Activation, Coagulation & Membrane Fibrin Kinetics',
        icon: '🩸',
        summary: 'Continuous exposure of blood to foreign PMP artificial surfaces triggers the contact activation pathway.',
        details: [
          'Blood contact with artificial biomaterials activates Factor XII and kallikrein, consuming coagulation factors, antithrombin-III, and platelets.',
          'Plasma Free Hemoglobin (PFHgb): Normal <15–20 mg/dL. Elevated PFHgb indicates shear stress intravascular hemolysis or pump head trauma.',
          'Antithrombin-III (AT3) target >70–80%: Essential for heparin efficacy. Fibrinogen target >150 mg/dL and Platelets >100k/µL.'
        ],
        pearl: 'Hematology Rule: Plasma Free Hemoglobin (PFHgb) >50 mg/dL warns of severe mechanical hemolysis or circuit thrombus.'
      }
    ]
  },

  'case-4-drainage-failure': {
    title: 'Foundational Physiology: Venous Drainage Mechanics & Atrial Suction Dynamics',
    patientContext: '4.2 kg Neonate (BSA 0.25 m²) • VV ECMO (15 Fr MC3 Crescent RA) • 1/4" Circuit • Hour 14 Maintenance Run',
    corePrinciples: [
      {
        title: '1. Venous Drainage Fluid Mechanics & The Starling Resistor',
        icon: '💧',
        summary: 'Centrifugal venous drainage depends on the pressure gradient between central venous reservoir and pump inlet.',
        details: [
          'Extracorporeal blood drainage operates via negative suction pressure generated at the centrifugal pump inlet: Q_drainage = (CVP - P_in) / R_cannula.',
          'When negative pressure in the drainage lumen exceeds the surrounding tissue and vascular pressure, the compliant venous vessel or atrial wall collapses against the cannula drainage fenestrations (the vascular waterfall / Starling resistor phenomenon).',
          'This causes cyclical cessation of flow, pressure bounce, and violent mechanical oscillation known as line chatter or flutter.'
        ],
        pearl: 'Mechanical Principle: Excessive negative suction (P_in < -60 mmHg) pulls compliant atrial tissue against cannula fenestrations.'
      },
      {
        title: '2. Differential Diagnosis of Acute Venous Drainage Limitation',
        icon: '🔍',
        summary: 'Differentiating hypovolemia, excessive pump RPM, cannula malposition, and cardiac tamponade.',
        details: [
          '1. Intravascular Underfilling / Hypovolemia: Reduced circulating volume lowers CVP and right atrial diameter, predisposing to suction.',
          '2. Excessive Pump Speed: Commanded RPM generates negative pressure exceeding the venous return capability.',
          '3. Cannula Migration / Malposition: Drainage fenestrations abut the interatrial septum, caval junction, or vessel wall.',
          '4. Pericardial Tamponade: Extrinsic cardiac compression collapses the right atrium, severely restricting diastolic filling and drainage.'
        ],
        pearl: 'Diagnostic Rule: Always inspect cannula position, check volume status, and obtain bedside echo when venous drainage fails.'
      },
      {
        title: '3. Cavitation & Hemolysis Hazards of Extreme Negative Pressure',
        icon: '⚠️',
        summary: 'Negative pressures beyond -60 mmHg extract dissolved microbubbles and shear red blood cells.',
        details: [
          'By Henry\'s Law, the solubility of gas in a liquid decreases as pressure drops. Extreme negative pressure pulls dissolved O2 and CO2 out of solution, producing microcavitation bubbles that can coalesce into visible air in the pre-pump limb.',
          'High shear forces across occluded drainage ports induce mechanical lysis of erythrocytes, releasing free hemoglobin (hemoglobinemia, hemoglobinuria, renal tubule injury, and progressive anemia).'
        ],
        pearl: 'Safety Cutback: QWS automatically activates Max Inlet Cutback at -60 mmHg to release tissue suction and halt hemolysis.'
      }
    ]
  },

  'case-5-hypoxemia': {
    title: 'Foundational Physiology: Dual-Lumen Cannula Fluid Mechanics & VV Recirculation',
    patientContext: '5.0 kg Infant (BSA 0.29 m²) • VV ECMO (15 Fr MC3 Crescent RA) • 1/4" Circuit • Hour 26 Maintenance Run',
    corePrinciples: [
      {
        title: '1. MC3 Crescent RA Dual-Lumen Geometry & Jet Alignment',
        icon: '🧭',
        summary: 'Dual-lumen single-cannula VV ECMO requires precise rotational alignment to deliver oxygenated blood across the tricuspid valve.',
        details: [
          'The MC3 Crescent RA cannula incorporates two separate lumens inside a single catheter: a venous drainage lumen with proximal and distal ports in the SVC and IVC/RA, and a central return lumen with an angled port designed to face anteriorly and inferiorly.',
          'Oxygenated blood exiting the return port must form a coherent fluid jet directed across the tricuspid valve orifice into the right ventricle, from where it is pumped through the pulmonary bed into the systemic circulation.',
          'Transthoracic or transesophageal echocardiography (TTE/TEE) in bicaval and RV inflow views is mandatory to verify that the return jet aims cleanly across the tricuspid valve.'
        ],
        pearl: 'Anatomical Principle: The return port of the MC3 Crescent must face the tricuspid valve; malrotation redirects flow away from the RV.'
      },
      {
        title: '2. Pathophysiology and Mathematical Definition of Recirculation',
        icon: '🔄',
        summary: 'Recirculation occurs when reinfused oxygenated blood is immediately sucked back into the drainage ports without perfusing the body.',
        details: [
          'If the cannula malrotates, migrates, or if pump flow markedly exceeds native cardiac output, the return jet is sucked directly into the adjacent drainage fenestrations.',
          'Mathematical Recirculation Fraction (Rf): Rf = (S_cv_O2 - S_v_O2) / (S_post_ox_O2 - S_v_O2).',
          'Clinical Signature: In-line venous saturation (ScvO2) climbs paradoxically to near-arterial levels (88–96%), the venous line loses its dark wine color and turns bright red (no color differential), while the patient becomes progressively hypoxemic (SpO2 drops to 70–80%) and acidemic despite high ECMO flows.'
        ],
        pearl: 'Diagnostic Hallmark: High circuit ScvO2 + bright red venous tubing + patient systemic hypoxemia = Recirculation.'
      },
      {
        title: '3. Troubleshooting VV Hypoxemia',
        icon: '🛠️',
        summary: 'Systematic differentiation between native lung shunt, insufficient pump flow, recirculation, and membrane oxygenator failure.',
        details: [
          'Step 1: Check post-membrane PO2 and SaO2 (rules out oxygenator failure).',
          'Step 2: Check in-line venous ScvO2 vs. patient arterial SpO2 (differentiates native lung shunt from recirculation).',
          'Step 3: Perform bedside echo to check cannula depth and rotational orientation relative to the tricuspid valve.',
          'Step 4: Check hemoglobin/Hct: anemic patients have reduced carrying capacity, magnifying the effect of any native shunt.'
        ],
        pearl: 'Clinical Rule: Do not simply increase pump flow for hypoxemia in dual-lumen VV ECMO; excessive flow worsens recirculation.'
      }
    ]
  },

  'case-6-neuro-alert': {
    title: 'Foundational Physiology: Cerebral Autoregulation, CO2 Reactivity & Bifrontal NIRS',
    patientContext: '16.5 kg Child (BSA 0.68 m²) • VV ECMO (24 Fr Bicaval) • 3/8" Circuit • Minute 25 Post-Initiation',
    corePrinciples: [
      {
        title: '1. Cerebral Arteriolar Vasoreactivity to PaCO2',
        icon: '🧠',
        summary: 'PaCO2 is the most potent physiological regulator of cerebral blood flow via perivascular CSF hydrogen ion shifts.',
        details: [
          'Arteriolar vascular smooth muscle in the cerebral circulation is acutely responsive to extracellular [H+]. CO2 rapidly crosses the blood-brain barrier via passive diffusion, whereas bicarbonate (HCO3-) transport requires active choroid plexus transport over 6–24 hours.',
          'An acute fall in PaCO2 instantly depletes perivascular carbonic acid, causing marked perivascular alkalosis: CO2 + H2O <-> H2CO3 <-> H+ + HCO3-.',
          'This alkalosis triggers rapid calcium influx and intense arteriolar vasoconstriction. Cerebral blood flow (CBF) drops by 3–4% for every 1 mmHg decrease in PaCO2. An acute 20 mmHg drop in PaCO2 reduces cerebral blood flow by up to 60–70%, causing severe brain tissue ischemia.'
        ],
        pearl: 'Physiological Law: CBF changes 3–4% per mmHg change in PaCO2. Rapid drops cause acute cerebral arteriolar spasm.'
      },
      {
        title: '2. Adaptation to Chronic Hypercapnia & The Reperfusion Risk',
        icon: '⚖️',
        summary: 'Chronically hypercapnic patients have compensated CSF bicarbonate; normalizing PaCO2 rapidly produces profound CSF alkalosis.',
        details: [
          'Patients with severe acute-on-chronic respiratory failure (e.g. status asthmaticus) have compensated CSF bicarbonate levels to maintain baseline cerebral perfusion at high PaCO2.',
          'If ECLS sweep gas abruptly drops PaCO2 from 80+ mmHg down to 40 mmHg, CSF pH surges to dangerously alkaline levels, producing severe cerebral ischemia, stroke, and reperfusion hemorrhage.',
          'Institutional Neuro-Protection Protocol: The immediate post-initiation PaCO2 target (Box K) must stay within <10 mmHg of pre-ECLS baseline. Subsequent weaning is capped at 5 mmHg every 4 hours.'
        ],
        pearl: 'Protocol Rule: Never abruptly normalize a high PaCO2 on ECMO. Wean by only 5 mmHg every 4 hours.'
      },
      {
        title: '3. Bifrontal Cerebral NIRS (rSO2) Monitoring & Acute Alert Protocol',
        icon: '📈',
        summary: 'Near-Infrared Spectroscopy continuously measures regional microvascular hemoglobin oxygen saturation in the frontal lobes.',
        details: [
          'Cerebral NIRS (rSO2) samples a mixed vascular bed (approximately 75% venous, 20% arterial, 5% capillary) in the frontal cerebral cortex.',
          'A drop in cerebral NIRS >10% from baseline or an absolute value <55% indicates a critical mismatch between cerebral oxygen delivery and cerebral metabolic demand, almost always driven by acute cerebral vasoconstriction or hypoperfusion.',
          'Acute Neuro-Monitoring Alert: If TCM CO2 shifts >10 mmHg or cerebral NIRS shifts >10%, immediately obtain a STAT ABG and titrate sweep using the formula: New Sweep = Current Sweep × (Current PaCO2 / Desired PaCO2).'
        ],
        pearl: 'Neuro Alert: A >10% drop in cerebral NIRS or >10 mmHg shift in TCM CO2 mandates STAT ABG and sweep adjustment.'
      }
    ]
  },

  'case-7-ecpr': {
    title: 'Foundational Physiology: E-CPR Resuscitation, Cannulation Safety & Circuit Prime Dynamics',
    patientContext: '6.2 kg Infant (Norwood Stage 1) • E-CPR Activation / VA Cannulation • 1/4" Circuit • Minute 0 Initiation',
    corePrinciples: [
      {
        title: '1. Hemodynamics of Extracorporeal Cardiopulmonary Resuscitation (E-CPR)',
        icon: '⚡',
        summary: 'E-CPR rapidly restores coronary and cerebral perfusion pressure in refractory cardiac arrest or low-cardiac-output state.',
        details: [
          'During conventional closed-chest CPR, coronary perfusion pressure (CPP = Diastolic Aortic Pressure - Right Atrial Pressure) is rarely >15–20 mmHg, resulting in progressive myocardial ischemia and anaerobic lactic acidosis.',
          'E-CPR rapidly establishes high-flow systemic perfusion (Box A: 2.0–2.5 L/min/m²), restoring aortic root diastolic pressure, coronary perfusion, and cerebral oxygen delivery to halt ischemic cellular death.',
          'However, cannulation must be executed with flawless anatomical safety under high-stress conditions to avoid catastrophic vascular or cardiac perforation.'
        ],
        pearl: 'Resuscitation Goal: Rapid restoration of coronary perfusion pressure (CPP >30 mmHg) and cerebral oxygen delivery.'
      },
      {
        title: '2. Intensivist Pre-Cannulation Time-Out & Guide Wire Echo Safety',
        icon: '🛑',
        summary: 'Mandatory verification that the vascular guide wire is not coiled in cardiac chambers before dilator/cannula advancement.',
        details: [
          'During percutaneous or cutdown cannulation of the right internal jugular vein and carotid artery, vascular guide wires can inadvertently coil in the right atrium, superior vena cava, or penetrate the coronary sinus/right ventricle.',
          'Advancing a stiff vascular dilator or wire-reinforced cannula over a coiled guide wire causes instant cardiac wall perforation, catastrophic hemopericardium, and fatal cardiac tamponade.',
          'Mandatory Procedural Safety Rule: Echo/fluoro verification that the guide wire passes cleanly and straight into the IVC before any dilator or cannula is advanced.',
          'Anticoagulation Timing: Heparin bolus (75 U/kg) must be administered ONLY when directed by the surgeon just prior to cannula insertion, avoiding bleeding during neck dissection.'
        ],
        pearl: 'Cannulation Safety Rule: Always confirm guide wire tip is uncoiled in the IVC on echo before dilator advancement.'
      },
      {
        title: '3. Blood Prime Physiology in Infants (<15 kg)',
        icon: '🩸',
        summary: 'Circuits for infants <15 kg must be blood-primed; uncorrected donor blood causes severe metabolic and electrolyte derangements.',
        details: [
          'The priming volume of a 1/4" neonatal/infant ECMO circuit (200–250 mL) represents nearly 50% of the total circulating blood volume of a 6.2 kg infant (~500 mL).',
          'Stored packed red blood cells (PRBCs) contain citrate (which chelates ionized calcium, causing acute myocardial depression), high potassium, and zero platelets or clotting factors.',
          'Prime Correction Protocol: The blood prime must be buffered with sodium bicarbonate, repleted with calcium chloride, heparinized, and fortified with Antithrombin-III (AT3) to prevent acute hypocalcemic arrest and coagulopathy on clamp release.'
        ],
        pearl: 'Prime Rule: Blood prime for patients <15 kg must include Calcium, Bicarbonate, Heparin, and AT3.'
      }
    ]
  },

  'case-8-team-sport': {
    title: 'Foundational Physiology: Multidisciplinary Team Dynamics & Neonatal VA ECMO',
    patientContext: '3.8 kg Neonate (BSA 0.24 m²) • VA ECMO • 1/4" Circuit • Minute 1 Initiation',
    corePrinciples: [
      {
        title: '1. The Multidisciplinary "Team Sport" Architecture',
        icon: '🤝',
        summary: 'ECMO patient outcomes rely on continuous closed-loop communication across the Perfusionist, RN, RT, and Surgeon.',
        details: [
          'No single clinician can simultaneously operate the console dials, monitor continuous neuro-telemetry, titrate mechanical ventilation, manage anticoagulation/transfusions, and oversee vascular cannula integrity.',
          'Perfusionist / ECMO Specialist: Owns circuit mechanics, pump RPM, Box A/B calculations, gauge alarms, membrane gas transfer, and in-line pressures (P_in, P_out, ΔP).',
          'Bedside PICU RN: Owns continuous hemodynamic and tissue monitoring (TCM CO2, Bifrontal NIRS, dual arterial lines, urine output), blood bank cooler readiness, and peripheral IV medication administration.',
          'Pediatric RT: Owns mechanical ventilator de-escalation, Box D 15-minute first wean, subsequent rest weaning cadence, and Hour 2+ iNO/Flolan de-escalation.',
          'ECLS Surgeon / Echo Cardiologist: Owns vascular cannulation integrity, echo wire verification, cannula orientation, and emergency decannulation/exploration readiness.'
        ],
        pearl: 'Team Rule: High-reliability ECLS care requires verbalizing intentions, closed-loop confirmation, and cross-monitoring.'
      },
      {
        title: '2. Integration of Hemodynamic, Gas Exchange & Neuro-Protection Protocols',
        icon: '🔄',
        summary: 'Simultaneous execution of BFR ramp-up (Box B->A), sweep initiation (Box M), PaCO2 targets (Box K), and ventilator rest (Box D).',
        details: [
          'Minute 1 Initiation: Minute 1 BFR = Box A / 6. Initial Sweep = 0.25 × BFR at 80% FiO2. QWS alarms transitioned to ECLS Run mode.',
          'Minutes 1–15: Incremental BFR ramp every 3 minutes toward Box A (2.0–2.5 L/min/m² × BSA for VA ECMO). PaCO2 kept within <10 mmHg of pre-ECLS baseline.',
          'Minute 15: Box D first ventilator wean (PIP to 32, PEEP to 12 cmH2O). Post-initiation STAT lab block ordered.',
          'Hour 2+: Stepwise ventilator rest weaning (q2h) and pulmonary vasodilator weaning (iNO / Flolan).'
        ],
        pearl: 'Master Protocol: Flow (Box B->A) -> Sweep (Box M) -> Neuro-Protection (Box K) -> Vent Wean (Box D).'
      }
    ]
  }
};

// Procedural fallback generator for custom cases or archetypes without static entries
window.generateScenarioPhysiologyBriefing = function(scenario) {
  if (window.CASE_PHYSIOLOGY_BRIEFINGS[scenario.id]) {
    return window.CASE_PHYSIOLOGY_BRIEFINGS[scenario.id];
  }

  const { patient, vent } = scenario;
  const isVA = patient.mode === 'VA';
  const isNeo = patient.weightKg < 5.0;
  const is38 = patient.tubingSize === '3/8"';

  return {
    title: `Foundational Physiology: ${patient.ageLabel || 'Pediatric'} ${patient.mode} ECMO & Gas Exchange Kinetics`,
    patientContext: `${patient.weightKg} kg (${patient.bsa} m²) • ${patient.mode} ECMO (${patient.cannulaDesc}) • ${patient.tubingSize} Circuit`,
    corePrinciples: [
      {
        title: `1. ${patient.mode} ECMO Hemodynamic Coupling & Native Physiology`,
        icon: '🫀',
        summary: isVA
          ? 'VA ECMO provides biventricular circulatory support and gas exchange in parallel, but increases left ventricular afterload.'
          : 'VV ECMO supports pulmonary gas exchange in parallel while systemic blood pressure relies on native ventricular function.',
        details: [
          isVA
            ? 'In VA ECMO, blood is drained from the right atrium and reinfused into the arterial tree. This unloads the right ventricle and pulmonary bed, but retrograde arterial flow increases LV afterload, requiring careful monitoring of pulse pressure and aortic valve opening.'
            : 'In VV ECMO, blood is drained from and returned to the systemic venous circulation. Oxygenated blood mixes with native venous return in the right atrium; native cardiac output and SVR dictate systemic blood pressure.',
          `15-Minute Goal Target BFR (Box A) is ${isVA ? '2.0–2.5' : '1.2–1.5'} L/min/m² × BSA (~${+( (isVA ? 2.25 : 1.35) * patient.bsa ).toFixed(2)} L/min). Starting at Box B (Box A / 6) over the first minute protects against acute circulatory shock.`
        ],
        pearl: `Target Flow: ${patient.mode} ECMO goal is ${isVA ? '2.0–2.5' : '1.2–1.5'} L/min/m² × BSA.`
      },
      {
        title: '2. CO2 Diffusion Kinetics & Cerebral Autoregulation (Box M & Box K)',
        icon: '🧠',
        summary: 'CO2 clearance is governed by sweep gas flow; rapid PaCO2 reduction causes cerebral vasoconstriction and ischemic injury.',
        details: [
          'Membrane CO2 clearance is 20× faster than O2 clearance and is controlled by Sweep Gas Flow Rate (L/min).',
          'Acute drops in PaCO2 cause perivascular CSF alkalosis, triggering potent cerebral arteriolar vasoconstriction (CBF drops 3–4% per mmHg PaCO2).',
          `Pre-ECLS PaCO2 in this patient is ${patient.preEclsPaco2} mmHg. Protocol mandates keeping the initial PaCO2 drop <10 mmHg from baseline (Box K), weaning by only 5 mmHg every 4 hours, and maintaining post-ox pH < 7.55.`
        ],
        pearl: 'Sweep Formula: New Sweep = Current Sweep × (Current PaCO2 / Desired PaCO2).'
      },
      {
        title: '3. Centrifugal Pump Hydraulics & In-Line Pressure Transducers',
        icon: '⚙️',
        summary: 'P_in, P_out, P_ox-in, P_ox-out, and ΔP define circuit mechanics and alert to cavitation or obstruction.',
        details: [
          'P_in (venous inlet) must remain between -20 and -60 mmHg to prevent cavitation microbubbles and mechanical hemolysis.',
          'Transmembrane pressure ΔP / TMP (P_ox-in - P_ox-out) reflects hollow-fiber internal resistance (normal baseline <40–50 mmHg).',
          'Spectrum QWS ECLS Run Safety Alarms: Backflow Prevention ON, Max Inlet Cutback -60 mmHg, Stop Inlet -100 mmHg, Max Outlet Cutback +250 mmHg, Stop Outlet +300 mmHg, Bubble Detection ON.'
        ],
        pearl: 'Hydraulic Target: Baseline TMP <40–50 mmHg. P_in must not be more negative than -60 mmHg.'
      },
      {
        title: '4. Lung-Protective Mechanical Ventilation & Pulmonary Vasodilators',
        icon: '🫁',
        summary: 'Weaning ventilator driving pressure halts ventilator-induced lung injury (VILI) while PEEP preserves FRC.',
        details: [
          'Box D First Wean at 15 Minutes: Wean danger-range PIP to 32 cmH2O and PEEP to 12 cmH2O immediately without decreasing rate.',
          `Subsequent q2h Weaning: Progress toward standard rest settings (${vent.mode === 'VDR4' ? 'VDR4 weaning toward 26/10, Rate 30, 500 Hz then convert to SIMV-PC' : 'SIMV-PC 20/10, Rate 10, I-time 2.0s, FiO2 30–40%'}).`,
          'Pulmonary Vasodilators: Wean iNO and Flolan stepwise starting at ECLS Hour 2 to avoid rebound pulmonary hypertension.'
        ],
        pearl: 'Ventilator Rest: Box D at 15m (PIP 32, PEEP 12), then rest settings q2h. Wean iNO/Flolan at Hr 2+.'
      },
      {
        title: '5. Transfusion Thresholds & Circuit Sampling Rules',
        icon: '🩸',
        summary: 'Maintain Hct >35%, Platelets >100k, Fibrinogen >150 mg/dL, and enforce strict circuit sampling rules.',
        details: [
          'Hct >35% using fresh PRBC (<14 days) preserves 2,3-DPG and oxygen-carrying capacity.',
          'Platelets >100k/µL: Always administer via a peripheral IV line far from the venous cannula to avoid oxygenator thrombosis.',
          is38
            ? '3/8" Circuit Sampling Rule: Routine labs from Conduit Pigtail A; Arterial face pigtail sampling requires a SECOND specialist ready at bedside with a clamp.'
            : '1/4" Circuit Sampling Rule: SC1 pigtail used for pre-ox (OFF to shunt) and post-ox (OFF to circuit); routine labs from Conduit Pigtail A.'
        ],
        pearl: 'Platelet Rule: Always infuse platelets via peripheral IV, never directly into the circuit!'
      }
    ]
  };
};

// Exportable Briefing Downloader: Markdown (.md)
window.downloadBriefingMarkdown = function(briefing, scenario) {
  if (!briefing || !scenario) return;
  const lines = [
    `# ${briefing.title}`,
    '',
    `**Patient Profile:** ${briefing.patientContext}`,
    `**Simulation Scenario:** ${scenario.title || scenario.name || 'Pediatric & Neonatal ECMO Case'}`,
    `**Clinical Category:** ${scenario.category || 'ECMO Simulation'}`,
    `**Protocol Standard:** Institutional Pediatric & Neonatal ECMO Protocol (SKILL.md)`,
    `**Exported Date:** ${new Date().toLocaleString()}`,
    '',
    '---',
    '',
    '## Clinical Notice',
    '> *This foundational briefing reviews first-principles cardiovascular, pulmonary, cerebral autoregulatory (PaCO2 vs. NIRS rSO2), hematologic, and centrifugal hydraulic (P_in, P_out, ΔP) mechanisms for this patient profile. It is spoiler-free and intended for bedside clinical orientation.*',
    '',
    '---',
    '',
    '## Foundational Physiological & Hydraulic Principles',
    ''
  ];

  briefing.corePrinciples.forEach((principle) => {
    lines.push(`### ${principle.title}`);
    lines.push(`**Core Summary:** ${principle.summary}`);
    lines.push('');
    principle.details.forEach((d) => {
      lines.push(`${d}`);
      lines.push('');
    });
    if (principle.pearl) {
      lines.push(`> 💡 **Clinical Pearl:** ${principle.pearl}`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  });

  lines.push('## Institutional Target Checklist Quick Reference');
  lines.push('- **VV Target BFR (Box A):** 1.2–1.5 L/min/m² × BSA');
  lines.push('- **VA Target BFR (Box A):** 2.0–2.5 L/min/m² × BSA');
  lines.push('- **Minute 1 Initial BFR (Box B):** Box A / 6 (incremental ramp q3m to Min 15)');
  lines.push('- **Sweep Gas Flow (Box M):** 0.25 × BFR at 80% FiO2 (target post-ox PO2 200–350 mmHg)');
  lines.push('- **PaCO2 Neuro-Protection (Box K):** Initial drop <10 mmHg from pre-ECLS baseline; subsequent weaning 5 mmHg q4h; post-ox pH < 7.55');
  lines.push('- **Ventilator Box D First Wean (15m):** Danger PIP -> 32, PEEP -> 12 cmH2O immediately; rest CMV 20/10, Rate 10, FiO2 30-40%');
  lines.push('- **QWS ECLS Run Safety Alarms:** Max Inlet -60 / Stop Inlet -100 mmHg; Max Outlet +250 / Stop Outlet +300 mmHg; Backflow ON, Bubble ON');
  lines.push('- **Hematology:** Hct >35%, Platelets >100k (>150k in <1yr; infuse via peripheral IV only!), Fibrinogen >150 mg/dL, INR <1.8');
  lines.push('');
  lines.push('---');
  lines.push('*Pediatric & Neonatal ECMO Simulation Engine (QWS Workstation) • First-Principles Simulation*');

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeFilename = (scenario.id || 'ecmo-case').replace(/[^a-z0-9_-]/gi, '_');
  link.href = url;
  link.download = `${safeFilename}-physiology-review.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Exportable Briefing Downloader: Formatted Printable View / Save as PDF
window.printOrSavePdfBriefing = function(briefing, scenario) {
  if (!briefing || !scenario) return;
  const printWindow = window.open('', '_blank', 'width=920,height=1000');
  if (!printWindow) {
    alert('Please allow popups for this site to open the printable PDF preview.');
    return;
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${briefing.title} - ECMO-Sim Briefing</title>
  <style>
    @page {
      margin: 14mm 14mm 14mm 14mm;
      size: A4 portrait;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.5;
      padding: 24px;
      margin: 0;
    }
    .header {
      border-bottom: 3px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      border-radius: 4px;
      background-color: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
      margin-bottom: 6px;
    }
    h1 {
      font-size: 19px;
      font-weight: 800;
      color: #0f172a;
      margin: 4px 0 6px 0;
    }
    .context {
      font-size: 12.5px;
      color: #475569;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .meta {
      font-size: 11px;
      color: #64748b;
    }
    .notice {
      background-color: #f8fafc;
      border-left: 4px solid #6366f1;
      padding: 10px 14px;
      font-size: 11px;
      color: #334155;
      margin-bottom: 20px;
      border-radius: 0 6px 6px 0;
    }
    .section {
      page-break-inside: avoid;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 14px;
      background-color: #ffffff;
    }
    .section-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #0369a1;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }
    .summary {
      font-weight: 600;
      font-size: 12px;
      color: #1e293b;
      background-color: #f1f5f9;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .detail-p {
      font-size: 12px;
      color: #334155;
      margin: 6px 0;
      text-align: justify;
    }
    .pearl {
      background-color: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-left: 4px solid #10b981;
      padding: 8px 12px;
      border-radius: 0 6px 6px 0;
      font-size: 11.5px;
      font-weight: 600;
      color: #065f46;
      margin-top: 10px;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
    }
    .print-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    .print-btn {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 12px;
    }
    .print-btn:hover {
      background: #0369a1;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <div>
      <strong>Pre-Simulation Physiology Review</strong> &bull; Click to Print or Save as PDF
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ Print or Save as PDF</button>
  </div>

  <div class="header">
    <div class="badge">Pre-Simulation Foundational Physiology</div>
    <h1>${briefing.title}</h1>
    <div class="context">${briefing.patientContext}</div>
    <div class="meta">Protocol: Institutional ECMO & Spectrum QWS Simulation Engine &bull; Export Date: ${new Date().toLocaleDateString()}</div>
  </div>

  <div class="notice">
    <strong>Clinical Orientation:</strong> This review outlines the foundational first-principles physiology, circuit hemodynamics, CO2 diffusion/cerebral autoregulation, hydraulic pressure zones, and lung-protective rest for this clinical archetype. It is spoiler-free and intended for bedside orientation and reference.
  </div>

  ${briefing.corePrinciples.map((p) => `
    <div class="section">
      <div class="section-title">
        <span>${p.icon}</span>
        <span>${p.title}</span>
      </div>
      <div class="summary">${p.summary}</div>
      ${p.details.map((d) => `<p class="detail-p">${d}</p>`).join('')}
      ${p.pearl ? `<div class="pearl">💡 <strong>Clinical Pearl:</strong> ${p.pearl}</div>` : ''}
    </div>
  `).join('')}

  <div class="footer">
    <span>ECMO-Sim Engine &bull; Multi-Agent Simulation Workstation</span>
    <span>Pre-Simulation Briefing Document &bull; For Clinical Training Only</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

// Interactive React Component: Pre-Simulation Physiology Briefing Modal
window.PhysiologyBriefingModal = function({ scenario, isOpen, onClose, onProceed, onChangeScenario }) {
  if (!isOpen || !scenario) return null;

  const briefing = window.generateScenarioPhysiologyBriefing(scenario);
  const [activeTab, setActiveTab] = React.useState(0);

  return React.createElement(
    'div',
    { className: 'fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200' },
    React.createElement(
      'div',
      { className: 'bg-slate-900 border-2 border-sky-500/80 rounded-2xl max-w-4xl w-full p-4 sm:p-6 space-y-4 font-mono text-xs shadow-2xl max-h-[92vh] flex flex-col' },

      // Header Banner
      React.createElement(
        'div',
        { className: 'border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-2' },
        React.createElement(
          'div',
          { className: 'space-y-1' },
          React.createElement(
            'div',
            { className: 'flex items-center gap-2' },
            React.createElement('span', { className: 'px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-black uppercase' }, 'Pre-Simulation Briefing'),
            React.createElement('span', { className: 'text-[11px] font-bold text-emerald-400' }, 'Mandatory Physiological Review (SKILL.md Engine)')
          ),
          React.createElement('h2', { className: 'text-sm sm:text-base font-black text-white tracking-tight' }, briefing.title),
          React.createElement('p', { className: 'text-[11px] text-slate-400 font-mono' }, briefing.patientContext)
        ),
        React.createElement(
          'div',
          { className: 'flex flex-wrap items-center gap-2' },
          // Option to download Markdown (.md)
          React.createElement(
            'button',
            {
              onClick: () => window.downloadBriefingMarkdown(briefing, scenario),
              title: 'Download pre-simulation physiology review as Markdown (.md)',
              className: 'px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 cursor-pointer text-xs flex items-center gap-1.5 font-bold transition'
            },
            '📥 Download .MD'
          ),
          // Option to Print or Save as PDF
          React.createElement(
            'button',
            {
              onClick: () => window.printOrSavePdfBriefing(briefing, scenario),
              title: 'Print or Save briefing as publication-ready PDF',
              className: 'px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer text-xs flex items-center gap-1.5 font-bold transition'
            },
            '🖨️ PDF / Print'
          ),
          onChangeScenario &&
            React.createElement(
              'button',
              {
                onClick: onChangeScenario,
                className: 'px-3 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 cursor-pointer text-xs font-bold'
              },
              '🗂️ Change Scenario'
            ),
          React.createElement(
            'button',
            {
              onClick: onClose,
              className: 'px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer text-xs'
            },
            'Review Later'
          ),
          React.createElement(
            'button',
            {
              onClick: onProceed,
              className: 'px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wide cursor-pointer shadow-lg'
            },
            '✓ Begin Simulation →'
          )
        )
      ),

      // Spoiler-Free Notice Banner
      React.createElement(
        'div',
        { className: 'bg-indigo-950/50 border border-indigo-700/50 rounded-lg px-3 py-2 text-[11px] text-indigo-200 flex items-center justify-between gap-2' },
        React.createElement('span', null, 'ℹ️ This briefing reviews the foundational first-principles physiology for this patient profile. No scenario spoilers or unexpected complications are revealed.'),
        React.createElement('span', { className: 'text-indigo-400 text-[10px] hidden sm:inline' }, '1-Page Clinical Overview')
      ),

      // Navigation Pills
      React.createElement(
        'div',
        { className: 'flex flex-wrap gap-1.5 border-b border-slate-800 pb-2' },
        briefing.corePrinciples.map((principle, idx) =>
          React.createElement(
            'button',
            {
              key: idx,
              onClick: () => setActiveTab(idx),
              className: `px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === idx
                  ? 'bg-sky-600 text-white shadow border border-sky-400'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`
            },
            React.createElement('span', null, principle.icon),
            React.createElement('span', { className: 'truncate max-w-[150px] sm:max-w-none' }, principle.title.split('.')[1] || principle.title)
          )
        )
      ),

      // Main Principle Detail View
      React.createElement(
        'div',
        { className: 'flex-1 overflow-y-auto space-y-3 pr-2' },
        React.createElement(
          'div',
          { className: 'bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3' },
          React.createElement(
            'div',
            { className: 'flex items-center gap-2 border-b border-slate-900 pb-2' },
            React.createElement('span', { className: 'text-xl' }, briefing.corePrinciples[activeTab].icon),
            React.createElement('h3', { className: 'text-xs sm:text-sm font-extrabold text-sky-300 uppercase tracking-wide' }, briefing.corePrinciples[activeTab].title)
          ),
          React.createElement(
            'div',
            { className: 'text-xs font-semibold text-slate-200 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80' },
            briefing.corePrinciples[activeTab].summary
          ),
          React.createElement(
            'div',
            { className: 'space-y-2 text-[11.5px] text-slate-300 leading-relaxed' },
            briefing.corePrinciples[activeTab].details.map((paragraph, pIdx) =>
              React.createElement('p', { key: pIdx }, paragraph)
            )
          ),
          briefing.corePrinciples[activeTab].pearl &&
            React.createElement(
              'div',
              { className: 'bg-emerald-950/60 border border-emerald-600/70 p-2.5 rounded-lg text-emerald-200 text-xs font-semibold' },
              `💡 ${briefing.corePrinciples[activeTab].pearl}`
            )
        )
      ),

      // Bottom Action Bar
      React.createElement(
        'div',
        { className: 'border-t border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-3' },
        React.createElement(
          'div',
          { className: 'text-[11px] text-slate-400' },
          `Section ${activeTab + 1} of ${briefing.corePrinciples.length} • Review all sections or proceed directly to Turn 1.`
        ),
        React.createElement(
          'div',
          { className: 'flex flex-wrap items-center gap-2' },
          React.createElement(
            'button',
            {
              onClick: () => window.downloadBriefingMarkdown(briefing, scenario),
              className: 'px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 cursor-pointer text-xs flex items-center gap-1 font-bold'
            },
            '📥 Download .MD'
          ),
          React.createElement(
            'button',
            {
              onClick: () => window.printOrSavePdfBriefing(briefing, scenario),
              className: 'px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer text-xs flex items-center gap-1 font-bold'
            },
            '🖨️ PDF / Print'
          ),
          activeTab > 0 &&
            React.createElement(
              'button',
              {
                onClick: () => setActiveTab(activeTab - 1),
                className: 'px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer text-xs'
              },
              '← Previous'
            ),
          activeTab < briefing.corePrinciples.length - 1 &&
            React.createElement(
              'button',
              {
                onClick: () => setActiveTab(activeTab + 1),
                className: 'px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 cursor-pointer text-xs'
              },
              'Next →'
            ),
          React.createElement(
            'button',
            {
              onClick: onProceed,
              className: 'px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wide cursor-pointer shadow-lg'
            },
            '✓ Begin Simulation →'
          )
        )
      )
    )
  );
};
