// Clinical Workstation Tabs: Structured Output & AI Specialist, Ventilator/iNO, Calculators & Matrix, Labs/Transfusion, Checklists & Debrief

window.ClinicalWorkstation = function({
  state,
  logs,
  onUpdateCircuit,
  onUpdateVent,
  onUpdatePatient,
  onTriggerAction,
  examMode,
  setExamMode
}) {
  const [activeTab, setActiveTab] = React.useState('telemetry-log');
  const [desiredPco2Input, setDesiredPco2Input] = React.useState(state.patient.targetPaco2Max || 68);
  const [samplingSite, setSamplingSite] = React.useState('sc1-pre');
  const [secondSpecialistClamp, setSecondSpecialistClamp] = React.useState(false);
  const [sampleResult, setSampleResult] = React.useState(null);
  const [selectedLabId, setSelectedLabId] = React.useState(null);
  const [copiedMarkdown, setCopiedMarkdown] = React.useState(false);
  const [timeoutChecklist, setTimeoutChecklist] = React.useState({
    bloodBank: false,
    vascularAccess: false,
    resuscitationStandby: false,
    sedationNmb: false,
    wireEchoVerified: false,
    heparinSurgeon: false,
    primeVerified: false
  });

  const { patient, circuit, vent, telemetry, elapsedMinutes, protocolChecks } = state;
  const targets = window.computeProtocolTargets(state);
  const structuredMarkdown = window.formatStructuredTurnMarkdown(state);

  // Sync desiredPco2Input when scenario changes
  React.useEffect(() => {
    setDesiredPco2Input(Math.max(50, patient.preEclsPaco2 - 6));
  }, [patient.name, patient.preEclsPaco2]);

  const copyStructuredOutput = () => {
    navigator.clipboard.writeText(structuredMarkdown);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  // Sweep Titration Formula calculation
  const calculatedNewSweep =
    desiredPco2Input > 0
      ? +((circuit.sweepLpm || targets.boxMSweepForCurrentFlow) * (telemetry.paco2 / desiredPco2Input)).toFixed(2)
      : 0;

  // Box D 15-Minute First Ventilator Wean handler
  const executeBoxDFirstWean = () => {
    if (vent.pip > 32 || vent.peep > 12) {
      onUpdateVent({
        pip: Math.min(32, vent.pip),
        peep: Math.min(12, vent.peep)
      });
      onTriggerAction('Executed 15-Minute Box D First Ventilator Wean: Reduced danger-range PIP to 32 cmH2O and PEEP to 12 cmH2O (rate/frequency unchanged per protocol).');
    } else {
      onUpdateVent({
        pip: Math.max(20, vent.pip - 2),
        peep: Math.max(10, vent.peep - 2)
      });
      onTriggerAction('Executed 15-Minute Box D First Ventilator Wean: Weaned PIP and PEEP each by 2 cmH2O.');
    }
  };

  // Subsequent 2-Hourly Ventilator Rest Wean Step handler
  const executeTwoHourVentWean = () => {
    if (vent.mode === 'CMV') {
      const nextPip = Math.max(20, vent.pip - 2);
      const nextPeep = Math.max(10, vent.peep - 2);
      const nextRate = Math.max(10, vent.rate - 5);
      const nextITime = nextRate <= 15 ? 2.0 : Math.min(2.0, +(vent.iTime + 0.3).toFixed(1));
      const nextFio2 = Math.max(35, vent.fio2 - 15);
      onUpdateVent({
        pip: nextPip,
        peep: nextPeep,
        rate: nextRate,
        iTime: nextITime,
        fio2: nextFio2
      });
      onTriggerAction(`Executed q2h CMV Rest Wean step -> SIMV-PC ${nextPip}/${nextPeep}, Rate ${nextRate} bpm, I-time ${nextITime}s, FiO2 ${nextFio2}%.`);
    } else {
      // VDR4 weaning cadence
      if (vent.pip <= 26 && vent.peep <= 10 && vent.rate <= 30 && vent.hz >= 500) {
        onUpdateVent({
          mode: 'CMV',
          pip: 26,
          peep: 10,
          rate: 30,
          iTime: 1.0,
          hz: 0,
          fio2: Math.max(40, vent.fio2 - 10)
        });
        onTriggerAction('VDR4 reached 26/10, Rate 30, 500 Hz -> Converted to Conventional SIMV(PC) 26/10, Rate 30, I:E 1:1 per protocol!');
      } else {
        const nextPip = Math.max(26, vent.pip - 2);
        const nextPeep = Math.max(10, vent.peep - 2);
        const nextHz = Math.min(500, vent.hz + 25);
        const nextRate = Math.max(30, vent.rate - 5);
        onUpdateVent({
          pip: nextPip,
          peep: nextPeep,
          hz: nextHz,
          rate: nextRate,
          fio2: Math.max(40, vent.fio2 - 10)
        });
        onTriggerAction(`Executed q2h VDR4 Wean step -> ${nextPip}/${nextPeep} cmH2O, Osc Rate ${nextRate} bpm, Frequency ${nextHz} Hz.`);
      }
    }
  };

  // iNO & Flolan Stepwise Weaning arrays from SKILL.md
  const inoSteps = [20, 15, 10, 8, 6, 4, 3, 2, 1, 0];
  const flolanSteps = [0.1, 0.07, 0.05, 0.03, 0.02, 0.01, 0];

  const weanInoStep = () => {
    const idx = inoSteps.indexOf(vent.inoPpm);
    const nextVal = idx >= 0 && idx < inoSteps.length - 1 ? inoSteps[idx + 1] : 0;
    onUpdateVent({ inoPpm: nextVal });
    onTriggerAction(`Weaned iNO stepwise per Hour 2+ protocol to ${nextVal === 0 ? 'OFF' : nextVal + ' ppm'}.`);
  };

  const weanFlolanStep = () => {
    const idx = flolanSteps.indexOf(vent.flolan);
    const nextVal = idx >= 0 && idx < flolanSteps.length - 1 ? flolanSteps[idx + 1] : 0;
    onUpdateVent({ flolan: nextVal });
    onTriggerAction(`Weaned Nebulized Flolan stepwise per Hour 2+ protocol to ${nextVal === 0 ? 'OFF' : nextVal + ' mcg/kg/min'}.`);
  };

  const readyLabsCount = (state.pendingLabs || []).filter((l) => l.status === 'ready').length;
  const pendingLabsCount = (state.pendingLabs || []).filter((l) => l.status === 'pending').length;

  const labsTabLabel =
    readyLabsCount > 0
      ? `🧪 Circuit Sampling & Labs (${readyLabsCount} Ready! 🔔)`
      : pendingLabsCount > 0
      ? `🧪 Circuit Sampling & Labs (${pendingLabsCount} Pending ⏳)`
      : `🧪 Circuit Sampling (1/4" & 3/8") & Blood Bank`;

  // Circuit Lab Sampling Handler
  const drawCircuitSample = (type) => {
    if (patient.tubingSize === '3/8"' && type === 'post-ox' && !secondSpecialistClamp) {
      setSampleResult({
        error: true,
        title: '⚠️ 3/8" Circuit Arterial Face Pigtail Safety Stop!',
        body: 'Per Institutional Sampling Rules: Drawing from the 3/8" Arterial face pigtail requires a SECOND ECMO specialist ready at the bedside with a tubing clamp before opening the stopcock!'
      });
      return;
    }

    setSampleResult(null);
    const orderText =
      type === 'pre-ox'
        ? 'Draw STAT SC1 Pre-Ox blood gas from venous pigtail'
        : type === 'post-ox'
        ? (patient.tubingSize === '3/8"' ? 'Draw STAT Arterial Face Pigtail Post-Ox blood gas with second specialist clamp verified' : 'Draw STAT SC1 Post-Ox blood gas (OFF to circuit)')
        : 'Draw STAT Conduit Pigtail A blood gas and core lab coag panel';

    onTriggerAction(orderText);
  };

  return React.createElement(
    'div',
    { className: 'bg-slate-900 border-2 border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col' },

    // Navigation Tabs Header
    React.createElement(
      'div',
      { className: 'bg-slate-950 px-3 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2' },
      React.createElement(
        'div',
        { className: 'flex flex-wrap gap-1.5' },
        [
          { id: 'telemetry-log', label: '📋 Telemetry Record & Turn Audit Log' },
          { id: 'vent-adjuncts', label: '🫁 Ventilator (CMV/VDR4) & iNO/Flolan' },
          { id: 'calculators-matrix', label: '🧮 Ramp/Sweep Calculators & Obstruction Matrix' },
          { id: 'labs-transfusion', label: labsTabLabel },
          { id: 'checklist-debrief', label: `✅ Time-Out & Protocol Scorecard (${protocolChecks.filter((c) => c.passed).length}/${protocolChecks.length})` }
        ].map((tab) =>
          React.createElement(
            'button',
            {
              key: tab.id,
              onClick: () => setActiveTab(tab.id),
              className: `text-xs font-mono px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-sky-600 text-white border-sky-400 font-bold shadow'
                  : tab.id === 'labs-transfusion' && readyLabsCount > 0
                  ? 'bg-emerald-950 text-emerald-200 border-emerald-600 animate-pulse font-bold'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`
            },
            tab.label
          )
        )
      ),
      React.createElement(
        'button',
        {
          onClick: () => setExamMode(!examMode),
          className: `text-[11px] font-mono px-2.5 py-1 rounded border cursor-pointer ${
            examMode
              ? 'bg-purple-950 text-purple-300 border-purple-700'
              : 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
          }`
        },
        examMode ? '🔒 Blind Simulation Mode (Hints Hidden)' : '🎓 Guided Training Mode (Targets Visible)'
      )
    ),

    // TAB 1: Structured Telemetry Record (Exact SKILL.md Format) & Bedside Turn Audit Log
    activeTab === 'telemetry-log' &&
      React.createElement(
        'div',
        { className: 'p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-4' },

        // Left: Chronological Bedside Turn Audit Log (6 cols)
        React.createElement(
          'div',
          { className: 'lg:col-span-6 bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col justify-between space-y-2' },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between border-b border-slate-800 pb-2' },
            React.createElement(
              'span',
              { className: 'text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider' },
              `Bedside Action & Specialist Turn History (${logs.length})`
            ),
            React.createElement('span', { className: 'text-[11px] text-slate-400 font-mono' }, 'Chronological Feed')
          ),
          React.createElement(
            'div',
            { className: 'flex-1 overflow-y-auto max-h-96 space-y-2 pr-1' },
            logs.map((entry, idx) =>
              React.createElement(
                'div',
                {
                  key: idx,
                  className: 'bg-slate-900/90 border border-slate-800 rounded p-2.5 text-xs font-mono space-y-1'
                },
                React.createElement(
                  'div',
                  { className: 'flex justify-between text-[10px] text-slate-400 border-b border-slate-800/60 pb-1' },
                  React.createElement('span', { className: 'text-sky-400 font-bold' }, `Turn ${entry.turn || idx + 1} (Min ${entry.minute}): ${entry.action}`),
                  React.createElement('span', null, entry.time)
                ),
                React.createElement('div', { className: 'text-slate-200 leading-snug whitespace-pre-wrap pt-0.5' }, entry.reply)
              )
            )
          )
        ),

        // Right: Exact SKILL.md Structured Output Record (6 cols)
        React.createElement(
          'div',
          { className: 'lg:col-span-6 bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col justify-between space-y-2' },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between border-b border-slate-800 pb-2' },
            React.createElement(
              'span',
              { className: 'text-xs font-mono font-bold text-sky-400 uppercase tracking-wider' },
              'Institutional Structured Telemetry Record (SKILL.md)'
            ),
            React.createElement(
              'button',
              {
                onClick: copyStructuredOutput,
                className: 'text-[11px] font-mono px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer flex items-center gap-1'
              },
              copiedMarkdown ? '✓ Copied Markdown!' : '📋 Copy Telemetry Record'
            )
          ),
          React.createElement(
            'pre',
            {
              className:
                'text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-96 bg-black/60 p-3 rounded border border-slate-900 select-all'
            },
            structuredMarkdown
          ),
          React.createElement(
            'div',
            { className: 'text-[10px] text-slate-500 font-mono text-right' },
            'Institutional Standard: Full Bedside Telemetry Output Format'
          )
        )
      ),

    // TAB 2: Ventilator De-Escalation (CMV & VDR4) & Pulmonary Vasodilator Weaning (iNO / Flolan)
    activeTab === 'vent-adjuncts' &&
      React.createElement(
        'div',
        { className: 'p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono' },

        // Left: Ventilator Mode & Controls (7 cols)
        React.createElement(
          'div',
          { className: 'lg:col-span-7 bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-3' },
          React.createElement(
            'div',
            { className: 'flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2' },
            React.createElement(
              'div',
              { className: 'flex items-center gap-2' },
              React.createElement('span', { className: 'text-xs font-bold text-sky-400 uppercase' }, 'Mechanical Ventilator Console'),
              React.createElement(
                'button',
                {
                  onClick: () => onUpdateVent({ mode: vent.mode === 'CMV' ? 'VDR4' : 'CMV', hz: vent.mode === 'CMV' ? 425 : 0 }),
                  className: 'text-[11px] px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 cursor-pointer'
                },
                `Mode: ${vent.mode} (Click to Toggle CMV / VDR4)`
              )
            ),
            React.createElement(
              'div',
              { className: 'flex gap-2' },
              React.createElement(
                'button',
                {
                  onClick: executeBoxDFirstWean,
                  className: 'text-[11px] px-2.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/50 font-bold cursor-pointer'
                },
                '⚡ 15-Min First Wean (Box D)'
              ),
              React.createElement(
                'button',
                {
                  onClick: executeTwoHourVentWean,
                  className: 'text-[11px] px-2.5 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/50 font-bold cursor-pointer'
                },
                '⏱ Execute q2h Rest Wean Step'
              )
            )
          ),

          // Ventilator Parameter Knobs
          React.createElement(
            'div',
            { className: 'grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center' },
            // PIP
            React.createElement(
              'div',
              { className: 'bg-slate-900 p-2.5 rounded border border-slate-800' },
              React.createElement('div', { className: 'text-[10px] text-slate-400' }, 'PIP (cmH2O)'),
              React.createElement(
                'div',
                { className: `text-2xl font-black mt-0.5 ${vent.pip > 32 ? 'text-rose-400' : 'text-sky-300'}` },
                vent.pip
              ),
              React.createElement(
                'div',
                { className: 'flex justify-center gap-1 mt-1.5 text-xs' },
                React.createElement(
                  'button',
                  {
                    onClick: () => onUpdateVent({ pip: Math.max(14, vent.pip - 2) }),
                    className: 'px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                  },
                  '-2'
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => onUpdateVent({ pip: Math.min(45, vent.pip + 2) }),
                    className: 'px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                  },
                  '+2'
                )
              )
            ),
            // PEEP
            React.createElement(
              'div',
              { className: 'bg-slate-900 p-2.5 rounded border border-slate-800' },
              React.createElement('div', { className: 'text-[10px] text-slate-400' }, 'PEEP (cmH2O)'),
              React.createElement(
                'div',
                { className: `text-2xl font-black mt-0.5 ${vent.peep > 12 ? 'text-amber-400' : 'text-emerald-300'}` },
                vent.peep
              ),
              React.createElement(
                'div',
                { className: 'flex justify-center gap-1 mt-1.5 text-xs' },
                React.createElement(
                  'button',
                  {
                    onClick: () => onUpdateVent({ peep: Math.max(5, vent.peep - 2) }),
                    className: 'px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                  },
                  '-2'
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => onUpdateVent({ peep: Math.min(20, vent.peep + 2) }),
                    className: 'px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                  },
                  '+2'
                )
              )
            ),
            // Rate
            React.createElement(
              'div',
              { className: 'bg-slate-900 p-2.5 rounded border border-slate-800' },
              React.createElement('div', { className: 'text-[10px] text-slate-400' }, vent.mode === 'VDR4' ? 'Osc Rate (bpm)' : 'Rate (bpm)'),
              React.createElement('div', { className: 'text-2xl font-black mt-0.5 text-amber-300' }, vent.rate),
              React.createElement(
                'div',
                { className: 'flex justify-center gap-1 mt-1.5 text-xs' },
                React.createElement(
                  'button',
                  {
                    onClick: () => onUpdateVent({ rate: Math.max(8, vent.rate - 5) }),
                    className: 'px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                  },
                  '-5'
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => onUpdateVent({ rate: Math.min(60, vent.rate + 5) }),
                    className: 'px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                  },
                  '+5'
                )
              )
            ),
            // I-time or VDR4 Frequency (Hz)
            vent.mode === 'VDR4'
              ? React.createElement(
                  'div',
                  { className: 'bg-slate-900 p-2.5 rounded border border-slate-800' },
                  React.createElement('div', { className: 'text-[10px] text-slate-400' }, 'Freq (Hz, Goal 500)'),
                  React.createElement('div', { className: 'text-2xl font-black mt-0.5 text-purple-300' }, vent.hz),
                  React.createElement(
                    'div',
                    { className: 'flex justify-center gap-1 mt-1.5 text-xs' },
                    React.createElement(
                      'button',
                      {
                        onClick: () => onUpdateVent({ hz: Math.max(300, vent.hz - 25) }),
                        className: 'px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                      },
                      '-25'
                    ),
                    React.createElement(
                      'button',
                      {
                        onClick: () => onUpdateVent({ hz: Math.min(600, vent.hz + 25) }),
                        className: 'px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                      },
                      '+25'
                    )
                  )
                )
              : React.createElement(
                  'div',
                  { className: 'bg-slate-900 p-2.5 rounded border border-slate-800' },
                  React.createElement('div', { className: 'text-[10px] text-slate-400' }, 'I-Time (s, Max 2.0)'),
                  React.createElement('div', { className: 'text-2xl font-black mt-0.5 text-purple-300' }, vent.iTime.toFixed(1)),
                  React.createElement(
                    'div',
                    { className: 'flex justify-center gap-1 mt-1.5 text-xs' },
                    React.createElement(
                      'button',
                      {
                        onClick: () => onUpdateVent({ iTime: Math.max(0.4, +(vent.iTime - 0.2).toFixed(1)) }),
                        className: 'px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                      },
                      '-0.2'
                    ),
                    React.createElement(
                      'button',
                      {
                        onClick: () => onUpdateVent({ iTime: Math.min(2.0, +(vent.iTime + 0.2).toFixed(1)) }),
                        className: 'px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                      },
                      '+0.2'
                    )
                  )
                ),
            // Vent FiO2
            React.createElement(
              'div',
              { className: 'bg-slate-900 p-2.5 rounded border border-slate-800' },
              React.createElement('div', { className: 'text-[10px] text-slate-400' }, 'Vent FiO2 (%)'),
              React.createElement('div', { className: 'text-2xl font-black mt-0.5 text-cyan-300' }, `${vent.fio2}%`),
              React.createElement(
                'div',
                { className: 'flex justify-center gap-1 mt-1.5 text-xs' },
                React.createElement(
                  'button',
                  {
                    onClick: () => onUpdateVent({ fio2: Math.max(21, vent.fio2 - 10) }),
                    className: 'px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                  },
                  '-10%'
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => onUpdateVent({ fio2: Math.min(100, vent.fio2 + 10) }),
                    className: 'px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                  },
                  '+10%'
                )
              )
            )
          ),

          // Protocol Rest Settings Quick Reference
          !examMode &&
            React.createElement(
              'div',
              { className: 'text-[11px] bg-slate-900/70 border border-slate-800 rounded p-2.5 text-slate-300 space-y-1' },
              React.createElement(
                'div',
                { className: 'font-bold text-sky-300' },
                'Protocol Reference — Ventilator De-Escalation Cadence:'
              ),
              React.createElement(
                'div',
                null,
                '• 15-Min First Wean (Box D): If above danger range, wean PIP to 32 & PEEP to 12 immediately (DO NOT decrease rate/freq). Otherwise wean PIP & PEEP by 2 cmH2O.'
              ),
              React.createElement(
                'div',
                null,
                '• CMV Rest Goal (q2h): SIMV-PC, PIP 20 (PEEP 10 + PC/PS 10), Rate 10 bpm, I-time 2.0 sec, FiO2 30–40%.'
              ),
              React.createElement(
                'div',
                null,
                '• VDR4 Wean (q2h): Wean PIP by 2 (goal 26), PEEP by 2 (goal 10), increase Freq by 25 Hz (goal 500 Hz), wean Osc Rate by 5 (goal 30). At 26/10, Rate 30, 500 Hz -> Convert to SIMV-PC 26/10, Rate 30, I:E 1:1.'
              )
            )
        ),

        // Right: Pulmonary Vasodilator Weaning (iNO & Nebulized Flolan at Hour 2+) (5 cols)
        React.createElement(
          'div',
          { className: 'lg:col-span-5 bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between space-y-3' },
          React.createElement(
            'div',
            { className: 'border-b border-slate-800 pb-2 flex items-center justify-between' },
            React.createElement('span', { className: 'text-xs font-bold text-teal-400 uppercase' }, 'Pulmonary Vasodilator Weaning (Hour 2+)'),
            React.createElement(
              'span',
              { className: 'text-[11px] text-slate-400' },
              elapsedMinutes >= 120 ? '✅ Eligible to Wean (Hr 2+)' : `⏳ Wait until Hour 2 (Now: ${elapsedMinutes}m)`
            )
          ),

          // iNO Weaning Ladder
          React.createElement(
            'div',
            { className: 'bg-slate-900 p-3 rounded border border-slate-800 space-y-2' },
            React.createElement(
              'div',
              { className: 'flex justify-between items-center' },
              React.createElement('span', { className: 'text-xs font-bold text-slate-200' }, `Inhaled Nitric Oxide (iNO): ${vent.inoPpm} ppm`),
              React.createElement(
                'button',
                {
                  onClick: weanInoStep,
                  className: 'text-[11px] px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-600 text-white font-bold cursor-pointer'
                },
                'Wean Next Step (q2h)'
              )
            ),
            React.createElement(
              'div',
              { className: 'flex flex-wrap gap-1' },
              inoSteps.map((val) =>
                React.createElement(
                  'button',
                  {
                    key: val,
                    onClick: () => onUpdateVent({ inoPpm: val }),
                    className: `text-[10px] px-2 py-0.5 rounded border cursor-pointer ${
                      vent.inoPpm === val
                        ? 'bg-teal-600 text-white border-teal-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`
                  },
                  val === 0 ? 'OFF' : `${val}`
                )
              )
            )
          ),

          // Nebulized Flolan Weaning Ladder
          React.createElement(
            'div',
            { className: 'bg-slate-900 p-3 rounded border border-slate-800 space-y-2' },
            React.createElement(
              'div',
              { className: 'flex justify-between items-center' },
              React.createElement(
                'span',
                { className: 'text-xs font-bold text-slate-200' },
                `Nebulized Flolan: ${vent.flolan} mcg/kg/min`
              ),
              React.createElement(
                'button',
                {
                  onClick: weanFlolanStep,
                  className: 'text-[11px] px-2.5 py-1 rounded bg-indigo-700 hover:bg-indigo-600 text-white font-bold cursor-pointer'
                },
                'Wean Next Step (q2h)'
              )
            ),
            React.createElement(
              'div',
              { className: 'flex flex-wrap gap-1' },
              flolanSteps.map((val) =>
                React.createElement(
                  'button',
                  {
                    key: val,
                    onClick: () => onUpdateVent({ flolan: val }),
                    className: `text-[10px] px-2 py-0.5 rounded border cursor-pointer ${
                      vent.flolan === val
                        ? 'bg-indigo-600 text-white border-indigo-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`
                  },
                  val === 0 ? 'OFF' : `${val}`
                )
              )
            )
          )
        )
      ),

    // TAB 3: ECLS Ramp/Sweep Calculators & Circuit Obstruction Differential Matrix
    activeTab === 'calculators-matrix' &&
      React.createElement(
        'div',
        { className: 'p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono' },

        // Left: Protocol Box A, Box B, Box M, Box K & Sweep Titration Formula Calculator (6 cols)
        React.createElement(
          'div',
          { className: 'lg:col-span-6 bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-3' },
          React.createElement(
            'div',
            { className: 'text-xs font-bold text-sky-400 uppercase border-b border-slate-800 pb-2' },
            'ECLS Initiation & Sweep Titration Workbench (Ver. 6-27-2022)'
          ),

          // Box A, Box B, Box M, Box K Summary Cards
          React.createElement(
            'div',
            { className: 'grid grid-cols-2 gap-2 text-xs' },
            React.createElement(
              'div',
              { className: 'bg-slate-900 p-2.5 rounded border border-slate-800' },
              React.createElement('div', { className: 'text-[10px] text-sky-400 font-bold' }, 'BOX A: 15-Min Goal Target BFR'),
              React.createElement(
                'div',
                { className: 'text-base font-black text-white mt-0.5' },
                `${targets.boxAMinLpm}–${targets.boxAMaxLpm} L/min`
              ),
              React.createElement(
                'div',
                { className: 'text-[10px] text-slate-400' },
                `Midpoint: ${targets.boxATargetLpm} L/m (${targets.boxAMlKg} mL/kg/m)`
              )
            ),
            React.createElement(
              'div',
              { className: 'bg-slate-900 p-2.5 rounded border border-slate-800' },
              React.createElement('div', { className: 'text-[10px] text-emerald-400 font-bold' }, 'BOX B: Minute 1 Initial BFR (Box A / 6)'),
              React.createElement(
                'div',
                { className: 'text-base font-black text-white mt-0.5' },
                `${targets.boxBTargetLpm} L/min (${targets.boxBMlKg} mL/kg/m)`
              ),
              React.createElement(
                'div',
                { className: 'text-[10px] text-slate-400' },
                'Permissible <500 mL/min during Min 1'
              )
            ),
            React.createElement(
              'div',
              { className: 'bg-slate-900 p-2.5 rounded border border-slate-800' },
              React.createElement('div', { className: 'text-[10px] text-amber-400 font-bold' }, 'BOX M: Initial Sweep Gas Rate'),
              React.createElement(
                'div',
                { className: 'text-base font-black text-white mt-0.5' },
                `0.25 × BFR = ${targets.boxMSweepForCurrentFlow} L/min`
              ),
              React.createElement(
                'div',
                { className: 'text-[10px] text-slate-400' },
                `At 15m Box A: ${targets.boxMSweepAtTargetFlow} L/m @ 80% FiO2`
              )
            ),
            React.createElement(
              'div',
              { className: 'bg-slate-900 p-2.5 rounded border border-slate-800' },
              React.createElement('div', { className: 'text-[10px] text-purple-400 font-bold' }, 'BOX K: Neuro-Protective PaCO2 Target'),
              React.createElement(
                'div',
                { className: 'text-base font-black text-white mt-0.5' },
                `${targets.dynamicTargetPaco2Low}–${targets.dynamicTargetPaco2High} mmHg`
              ),
              React.createElement(
                'div',
                { className: 'text-[10px] text-slate-400' },
                `Pre-ECLS: ${patient.preEclsPaco2} | Drop <10 init, then 5 q4h`
              )
            )
          ),

          // Interactive Sweep Titration Formula Calculator
          React.createElement(
            'div',
            { className: 'bg-slate-900 border border-amber-700/50 rounded-lg p-3 space-y-2' },
            React.createElement(
              'div',
              { className: 'text-xs font-bold text-amber-300' },
              'Sweep Titration Formula: New Sweep = Current Sweep × (Current PCO2 / Desired PCO2)'
            ),
            React.createElement(
              'div',
              { className: 'grid grid-cols-3 gap-2 items-center text-xs' },
              React.createElement(
                'div',
                null,
                React.createElement('div', { className: 'text-[10px] text-slate-400' }, 'Current Sweep (L/m)'),
                React.createElement('div', { className: 'text-sm font-bold text-white' }, circuit.sweepLpm.toFixed(2))
              ),
              React.createElement(
                'div',
                null,
                React.createElement('div', { className: 'text-[10px] text-slate-400' }, 'Current PaCO2 (mmHg)'),
                React.createElement('div', { className: 'text-sm font-bold text-amber-300' }, telemetry.paco2)
              ),
              React.createElement(
                'div',
                null,
                React.createElement('div', { className: 'text-[10px] text-slate-400' }, 'Desired PaCO2 (mmHg)'),
                React.createElement('input', {
                  type: 'number',
                  min: 35,
                  max: 95,
                  value: desiredPco2Input,
                  onChange: (e) => setDesiredPco2Input(Number(e.target.value)),
                  className: 'w-20 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-sm font-bold text-sky-300'
                })
              )
            ),
            React.createElement(
              'div',
              { className: 'flex items-center justify-between pt-1 border-t border-slate-800' },
              React.createElement(
                'span',
                { className: 'text-xs text-emerald-300 font-bold' },
                `Calculated New Sweep = ${calculatedNewSweep.toFixed(2)} L/min`
              ),
              React.createElement(
                'button',
                {
                  onClick: () => {
                    onUpdateCircuit({ sweepLpm: calculatedNewSweep });
                    onTriggerAction(`Titrated Sweep Gas via Formula to ${calculatedNewSweep.toFixed(2)} L/min for Desired PaCO2 ${desiredPco2Input} mmHg.`);
                  },
                  className: 'text-xs px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer'
                },
                `Apply ${calculatedNewSweep.toFixed(2)} L/min Sweep`
              )
            )
          )
        ),

        // Right: Circuit Obstruction & Zero Flow Differential Matrix + Live Complication Simulator (6 cols)
        React.createElement(
          'div',
          { className: 'lg:col-span-6 bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-3' },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between border-b border-slate-800 pb-2' },
            React.createElement(
              'span',
              { className: 'text-xs font-bold text-rose-400 uppercase' },
              'Circuit Obstruction & Zero Flow Differential Matrix'
            ),
            React.createElement(
              'span',
              { className: 'text-[10px] text-slate-400' },
              'Click any site to simulate/clear obstruction'
            )
          ),

          React.createElement(
            'div',
            { className: 'overflow-x-auto' },
            React.createElement(
              'table',
              { className: 'w-full text-[11px] text-left border-collapse' },
              React.createElement(
                'thead',
                null,
                React.createElement(
                  'tr',
                  { className: 'border-b border-slate-800 text-slate-400' },
                  React.createElement('th', { className: 'py-1 pr-2' }, 'Site & Problem (Click to Toggle)'),
                  React.createElement('th', { className: 'py-1 px-1' }, 'P_in'),
                  React.createElement('th', { className: 'py-1 px-1' }, 'P_out'),
                  React.createElement('th', { className: 'py-1 px-1' }, 'P_ox-in'),
                  React.createElement('th', { className: 'py-1 px-1' }, 'ΔP (TMP)'),
                  React.createElement('th', { className: 'py-1 pl-1' }, 'P_ox-out')
                )
              ),
              React.createElement(
                'tbody',
                { className: 'divide-y divide-slate-900' },
                [
                  {
                    site: 1,
                    name: 'Site 1: Venous cannula / pre-pump',
                    pIn: 'Very Neg (<-60)',
                    pOut: 'MAP / CVP',
                    pOxIn: 'MAP / CVP',
                    tmp: '≈ 0',
                    pOxOut: 'MAP / CVP'
                  },
                  {
                    site: 2,
                    name: 'Site 2: Pump head occlusion',
                    pIn: '+3 to +20 (CVP)',
                    pOut: 'MAP / CVP',
                    pOxIn: 'MAP / CVP',
                    tmp: '≈ 0',
                    pOxOut: 'MAP / CVP'
                  },
                  {
                    site: 3,
                    name: 'Site 3: Conduit (pump → oxy)',
                    pIn: '+3 to +20 (CVP)',
                    pOut: 'HIGH (Cut/Stop)',
                    pOxIn: 'MAP / CVP',
                    tmp: '≈ 0',
                    pOxOut: 'MAP / CVP'
                  },
                  {
                    site: 4,
                    name: 'Site 4: Oxygenator thrombosis',
                    pIn: '+3 to +20 (CVP)',
                    pOut: 'HIGH',
                    pOxIn: 'HIGH',
                    tmp: 'HIGH (↑↑)',
                    pOxOut: 'MAP / CVP'
                  },
                  {
                    site: 5,
                    name: 'Site 5: Arterial / post-oxy limb',
                    pIn: '+3 to +20 (CVP)',
                    pOut: 'HIGH',
                    pOxIn: 'HIGH',
                    tmp: '≈ 0',
                    pOxOut: 'HIGH'
                  }
                ].map((row) => {
                  const isActive = circuit.obstructionSite === row.site;
                  return React.createElement(
                    'tr',
                    {
                      key: row.site,
                      onClick: () =>
                        onUpdateCircuit({
                          obstructionSite: isActive ? 0 : row.site,
                          obstructionSeverity: isActive ? 0 : 0.78
                        }),
                      className: `cursor-pointer transition ${
                        isActive ? 'bg-rose-950/80 text-rose-200 font-bold' : 'hover:bg-slate-900 text-slate-300'
                      }`
                    },
                    React.createElement('td', { className: 'py-1.5 pr-2' }, `${isActive ? '🔴 ' : ''}${row.name}`),
                    React.createElement('td', { className: 'py-1.5 px-1' }, row.pIn),
                    React.createElement('td', { className: 'py-1.5 px-1' }, row.pOut),
                    React.createElement('td', { className: 'py-1.5 px-1' }, row.pOxIn),
                    React.createElement('td', { className: 'py-1.5 px-1' }, row.tmp),
                    React.createElement('td', { className: 'py-1.5 pl-1' }, row.pOxOut)
                  );
                })
              )
            )
          ),

          // Additional Complication Injectors
          React.createElement(
            'div',
            { className: 'flex flex-wrap gap-1.5 pt-2 border-t border-slate-800 text-[11px]' },
            React.createElement(
              'button',
              {
                onClick: () =>
                  onUpdateCircuit({
                    recirculationFraction: circuit.recirculationFraction >= 0.3 ? 0.04 : 0.58
                  }),
                className: `px-2.5 py-1 rounded border cursor-pointer ${
                  circuit.recirculationFraction >= 0.3
                    ? 'bg-amber-800 text-white border-amber-400 font-bold'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`
              },
              circuit.recirculationFraction >= 0.3 ? '🔴 VV Recirculation ACTIVE (58%)' : 'Simulate VV Recirculation'
            ),
            React.createElement(
              'button',
              {
                onClick: () => onUpdateCircuit({ airBubbleDetected: !circuit.airBubbleDetected }),
                className: `px-2.5 py-1 rounded border cursor-pointer ${
                  circuit.airBubbleDetected
                    ? 'bg-rose-800 text-white border-rose-400 font-bold'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`
              },
              circuit.airBubbleDetected ? '🔴 Circuit Air Bubble ACTIVE' : 'Simulate Air Bubble'
            ),
            React.createElement(
              'button',
              {
                onClick: () =>
                  onUpdateCircuit({
                    obstructionSite: 0,
                    obstructionSeverity: 0,
                    recirculationFraction: 0.04,
                    airBubbleDetected: false
                  }),
                className: 'px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 cursor-pointer ml-auto'
              },
              '✓ Clear All Mechanical Faults'
            )
          )
        )
      ),

    // TAB 4: ECLS Laboratory Cadence, Circuit Sampling (1/4" vs 3/8") & Transfusion / Blood Bank
    activeTab === 'labs-transfusion' &&
      React.createElement(
        'div',
        { className: 'p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono' },

        // Left: Circuit Sampling Rules (1/4" vs 3/8") & STAT Blood Gas / Anticoag Block (6 cols)
        React.createElement(
          'div',
          { className: 'lg:col-span-6 bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-3' },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between border-b border-slate-800 pb-2' },
            React.createElement(
              'span',
              { className: 'text-xs font-bold text-sky-400 uppercase' },
              `ECLS Circuit Sampling & Lab Cadence (${patient.tubingSize} Circuit)`
            ),
            React.createElement(
              'button',
              {
                onClick: () =>
                  onUpdatePatient({
                    tubingSize: patient.tubingSize === '1/4"' ? '3/8"' : '1/4"'
                  }),
                className: 'text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer'
              },
              `Switch Tubing (${patient.tubingSize})`
            )
          ),

          // Sampling Pigtail Selection based on 1/4" vs 3/8" Protocol
          patient.tubingSize === '1/4"'
            ? React.createElement(
                'div',
                { className: 'bg-slate-900 p-2.5 rounded border border-slate-800 text-xs space-y-2' },
                React.createElement(
                  'div',
                  { className: 'text-sky-300 font-bold' },
                  '1/4" Circuit Sampling Protocol:'
                ),
                React.createElement(
                  'div',
                  { className: 'text-[11px] text-slate-300' },
                  '• Pre-Ox Gas: SC1 pigtail (stopcock OFF to shunt) | Post-Ox Gas: SC1 pigtail (stopcock OFF to circuit) | Routine Labs: Conduit Pigtail A'
                ),
                React.createElement(
                  'div',
                  { className: 'flex flex-wrap gap-2 pt-1' },
                  React.createElement(
                    'button',
                    {
                      onClick: () => drawCircuitSample('pre-ox'),
                      className: 'px-2.5 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white text-[11px] font-bold cursor-pointer'
                    },
                    '🩸 Draw SC1 Pre-Ox (OFF to Shunt)'
                  ),
                  React.createElement(
                    'button',
                    {
                      onClick: () => drawCircuitSample('post-ox'),
                      className: 'px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-bold cursor-pointer'
                    },
                    '🩸 Draw SC1 Post-Ox (OFF to Circuit)'
                  ),
                  React.createElement(
                    'button',
                    {
                      onClick: () => drawCircuitSample('routine'),
                      className: 'px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold cursor-pointer'
                    },
                    '🧪 Draw Conduit Pigtail A + Patient ABG'
                  )
                )
              )
            : React.createElement(
                'div',
                { className: 'bg-slate-900 p-2.5 rounded border border-slate-800 text-xs space-y-2' },
                React.createElement(
                  'div',
                  { className: 'text-amber-300 font-bold' },
                  '3/8" Circuit Sampling Protocol:'
                ),
                React.createElement(
                  'div',
                  { className: 'text-[11px] text-slate-300' },
                  '• Pre-Ox / Routine Labs: Conduit Pigtail A | Post-Ox Gas: Arterial face pigtail (REQUIRES second specialist ready with clamp!)'
                ),
                React.createElement(
                  'label',
                  { className: 'flex items-center gap-2 text-[11px] text-amber-200 cursor-pointer pt-1' },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: secondSpecialistClamp,
                    onChange: (e) => setSecondSpecialistClamp(e.target.checked),
                    className: 'accent-amber-400'
                  }),
                  'Second ECMO Specialist stationed at bedside with tubing clamp ready'
                ),
                React.createElement(
                  'div',
                  { className: 'flex flex-wrap gap-2 pt-1' },
                  React.createElement(
                    'button',
                    {
                      onClick: () => drawCircuitSample('pre-ox'),
                      className: 'px-2.5 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white text-[11px] font-bold cursor-pointer'
                    },
                    '🩸 Draw Conduit Pigtail A (Pre-Ox / Coags)'
                  ),
                  React.createElement(
                    'button',
                    {
                      onClick: () => drawCircuitSample('post-ox'),
                      className: 'px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-bold cursor-pointer'
                    },
                    '🩸 Draw Arterial Face Pigtail (Post-Ox)'
                  )
                )
              ),

          // Display Lab Turnaround & Results Console
          React.createElement(
            'div',
            { className: 'space-y-3 pt-2' },

            // Safety Warning if applicable
            sampleResult &&
              sampleResult.error &&
              React.createElement(
                'div',
                { className: 'p-3 rounded border text-xs space-y-1.5 bg-rose-950/90 border-rose-500 text-rose-200' },
                React.createElement('div', { className: 'font-bold text-rose-300' }, sampleResult.title),
                React.createElement('div', null, sampleResult.body)
              ),

            // Live Lab Order Queue (Pending vs Completed)
            React.createElement(
              'div',
              { className: 'bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2' },
              React.createElement(
                'div',
                { className: 'flex items-center justify-between border-b border-slate-800 pb-1.5' },
                React.createElement(
                  'span',
                  { className: 'text-xs font-bold text-sky-300 uppercase tracking-wider' },
                  `⏱️ Clinical Lab Orders & Turnaround Status (${(state.pendingLabs || []).length})`
                ),
                React.createElement(
                  'span',
                  { className: 'text-[10px] text-slate-400' },
                  'Bedside Gas: ~3m | Central Lab: ~15m'
                )
              ),
              state.pendingLabs && state.pendingLabs.length > 0
                ? React.createElement(
                    'div',
                    { className: 'space-y-2 max-h-48 overflow-y-auto' },
                    state.pendingLabs.map((lab) => {
                      const isPending = lab.status === 'pending';
                      const remMin = Math.max(1, lab.readyMinute - (elapsedMinutes || 0));
                      const isSelected = selectedLabId === lab.id;

                      return React.createElement(
                        'div',
                        {
                          key: lab.id,
                          className: `p-2.5 rounded border text-xs flex flex-wrap items-center justify-between gap-2 transition ${
                            isPending
                              ? 'bg-amber-950/40 border-amber-600/60 text-amber-200'
                              : isSelected
                              ? 'bg-sky-950/90 border-sky-400 text-sky-100 font-bold'
                              : 'bg-slate-950 border-emerald-700/60 text-emerald-200'
                          }`
                        },
                        React.createElement(
                          'div',
                          { className: 'space-y-0.5' },
                          React.createElement(
                            'div',
                            { className: 'font-bold flex items-center gap-1.5' },
                            isPending
                              ? React.createElement('span', { className: 'text-amber-400 animate-pulse' }, '⏳ PENDING')
                              : React.createElement('span', { className: 'text-emerald-400' }, '✅ READY FOR REVIEW'),
                            React.createElement('span', null, lab.shortName || lab.name)
                          ),
                          React.createElement(
                            'div',
                            { className: 'text-[11px] text-slate-400' },
                            isPending
                              ? `Ordered at Min ${lab.orderedMinute} • Expected ~Min ${lab.readyMinute} (~${remMin} min remaining on analyzer)`
                              : `Resulted at Min ${lab.readyMinute} (Ordered Min ${lab.orderedMinute})`
                          )
                        ),
                        !isPending &&
                          React.createElement(
                            'button',
                            {
                              onClick: () => setSelectedLabId(lab.id),
                              className: `text-[11px] px-2.5 py-1 rounded border font-bold cursor-pointer transition ${
                                isSelected
                                  ? 'bg-sky-600 text-white border-sky-300'
                                  : 'bg-emerald-800 hover:bg-emerald-700 text-white border-emerald-500'
                              }`
                            },
                            isSelected ? 'Viewing Results 👁️' : 'Review Results 📋'
                          )
                      );
                    })
                  )
                : React.createElement(
                    'div',
                    { className: 'text-xs text-slate-500 italic p-2 bg-slate-950/50 rounded text-center' },
                    'No blood gas or coag orders placed yet. Click the sampling buttons above or type "Draw ABG & Coags" to dispatch samples.'
                  )
            ),

            // Completed Lab Results Display
            (() => {
              const activeLab =
                (state.pendingLabs || []).find((l) => l.id === selectedLabId && l.status === 'ready') ||
                (state.pendingLabs || []).filter((l) => l.status === 'ready').slice(-1)[0];

              if (!activeLab) return null;

              const res = activeLab.results;

              return React.createElement(
                'div',
                { className: 'bg-slate-950 border border-emerald-600/70 rounded-lg p-3 space-y-2.5' },
                React.createElement(
                  'div',
                  { className: 'flex items-center justify-between border-b border-slate-800 pb-1.5' },
                  React.createElement(
                    'span',
                    { className: 'text-xs font-bold text-emerald-300' },
                    `📋 ${activeLab.name} (Min ${activeLab.readyMinute})`
                  ),
                  React.createElement(
                    'span',
                    { className: 'text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' },
                    'Point-of-Care Verified'
                  )
                ),

                React.createElement(
                  'div',
                  { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs' },

                  // Card 1: Patient Arterial Blood Gas
                  React.createElement(
                    'div',
                    { className: 'bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1' },
                    React.createElement('div', { className: 'text-[10px] text-sky-400 font-bold uppercase' }, 'Patient Arterial Blood Gas (ABG)'),
                    React.createElement('div', { className: 'text-white' }, `• pH: ${res.ph ?? telemetry.ph}`),
                    React.createElement('div', { className: 'text-amber-300 font-semibold' }, `• PaCO2: ${res.paco2 ?? telemetry.paco2} mmHg`),
                    React.createElement('div', { className: 'text-emerald-300' }, `• PaO2: ${res.pao2 ?? telemetry.pao2} mmHg | SaO2: ${res.postSpo2 ?? telemetry.postSpo2}%`),
                    React.createElement('div', { className: 'text-rose-300' }, `• Lactate: ${res.lactate ?? patient.labs.lactate} mmol/L`),
                    res.act && React.createElement('div', { className: 'text-slate-300' }, `• ACT: ${res.act} sec (Goal 180–220s)`)
                  ),

                  // Card 2: Circuit Post-Oxygenator Membrane Gas
                  React.createElement(
                    'div',
                    { className: 'bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1' },
                    React.createElement('div', { className: 'text-[10px] text-rose-400 font-bold uppercase' }, 'Circuit Post-Ox Membrane Gas'),
                    React.createElement('div', { className: 'text-white' }, `• Post-Ox pH: ${res.postOxPh ?? telemetry.postOxPh} (Institutional Cap <7.55)`),
                    React.createElement('div', { className: 'text-amber-300' }, `• Post-Ox PCO2: ${res.postOxPco2 ?? telemetry.postOxPco2} mmHg`),
                    React.createElement('div', { className: 'text-emerald-300 font-semibold' }, `• Post-Ox PO2: ${res.postOxPo2 ?? circuit.postOxPo2} mmHg`),
                    React.createElement('div', { className: 'text-white' }, `• Post-Ox SaO2: ${res.postOxSao2 ?? circuit.postOxSao2}%`)
                  ),

                  // Card 3: Pre-Oxygenator Venous Gas
                  React.createElement(
                    'div',
                    { className: 'bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1' },
                    React.createElement('div', { className: 'text-[10px] text-amber-400 font-bold uppercase' }, 'Circuit Pre-Ox Venous Gas'),
                    React.createElement('div', { className: 'text-white font-semibold' }, `• Pre-Ox SvO2: ${res.preOxSvo2 ?? circuit.svo2}%`),
                    React.createElement('div', { className: 'text-slate-300' }, `• Hct: ${res.hct ?? patient.labs.hct}% (Goal >35%)`),
                    React.createElement('div', { className: 'text-slate-300' }, `• Total Hb: ${res.hb ? res.hb.toFixed(1) : patient.labs.hb.toFixed(1)} g/dL`)
                  ),

                  // Card 4: Coagulation & Hematology Panel
                  React.createElement(
                    'div',
                    { className: 'bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1' },
                    React.createElement('div', { className: 'text-[10px] text-purple-400 font-bold uppercase' }, 'Coagulation & Hematology Panel'),
                    React.createElement('div', { className: 'text-white' }, `• Anti-Xa: ${res.antiXa ?? patient.labs.antiXa} U/mL (Goal 0.3–0.7)`),
                    React.createElement('div', { className: 'text-white' }, `• AT3 Activity: ${res.at3 ?? patient.labs.at3}% (Goal >80%)`),
                    React.createElement('div', { className: 'text-white' }, `• Fibrinogen: ${res.fibrinogen ?? patient.labs.fibrinogen} mg/dL (Goal >150)`),
                    React.createElement('div', { className: 'text-white' }, `• Platelets: ${res.platelets ?? patient.labs.platelets}k/µL (Goal >100k)`),
                    React.createElement('div', { className: 'text-slate-300' }, `• PTT: ${res.ptt ?? patient.labs.ptt}s | INR: ${res.inr ?? patient.labs.inr}`)
                  )
                )
              );
            })()
          )
        ),

        // Right: Transfusion Thresholds & Blood Bank / Anticoagulation Orders (6 cols)
        React.createElement(
          'div',
          { className: 'lg:col-span-6 bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-3' },
          React.createElement(
            'div',
            { className: 'text-xs font-bold text-rose-400 uppercase border-b border-slate-800 pb-2' },
            'Blood Bank Transfusion Thresholds & Med Administration'
          ),

          React.createElement(
            'div',
            { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs' },
            // PRBC
            React.createElement(
              'button',
              {
                onClick: () => onTriggerAction('Transfuse 15 mL/kg PRBC (<14 days fresh)'),
                className: `p-2.5 rounded border text-left transition cursor-pointer ${
                  patient.labs.hct < 35
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200 hover:bg-rose-900'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                }`
              },
              React.createElement('div', { className: 'font-bold' }, '🩸 PRBC (<14d Fresh)'),
              React.createElement('div', { className: 'text-[10px] text-slate-400 mt-0.5' }, `Hct: ${patient.labs.hct}% (Goal >35%)`)
            ),
            // Platelets via Peripheral Line (Correct)
            React.createElement(
              'button',
              {
                onClick: () => onTriggerAction('Transfuse Platelets via peripheral IV far from venous cannula'),
                className: `p-2.5 rounded border text-left transition cursor-pointer ${
                  patient.labs.platelets < 100
                    ? 'bg-amber-950/80 border-amber-500 text-amber-200 hover:bg-amber-900'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                }`
              },
              React.createElement('div', { className: 'font-bold' }, '🟡 Platelets (Peripheral IV)'),
              React.createElement('div', { className: 'text-[10px] text-slate-400 mt-0.5' }, `Plt: ${patient.labs.platelets}k (Goal >100k)`)
            ),
            // Cryoprecipitate
            React.createElement(
              'button',
              {
                onClick: () => onTriggerAction('Administer Cryoprecipitate for fibrinogen repletion'),
                className: `p-2.5 rounded border text-left transition cursor-pointer ${
                  patient.labs.fibrinogen < 150
                    ? 'bg-amber-950/80 border-amber-500 text-amber-200 hover:bg-amber-900'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                }`
              },
              React.createElement('div', { className: 'font-bold' }, '❄️ Cryoprecipitate'),
              React.createElement('div', { className: 'text-[10px] text-slate-400 mt-0.5' }, `Fib: ${patient.labs.fibrinogen} (Goal >150)`)
            ),
            // FFP / Volume
            React.createElement(
              'button',
              {
                onClick: () => onTriggerAction('Administer 10 mL/kg FFP / Plasmalyte volume bolus'),
                className: 'p-2.5 rounded border bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 text-left cursor-pointer'
              },
              React.createElement('div', { className: 'font-bold' }, '💧 FFP / Volume Bolus'),
              React.createElement('div', { className: 'text-[10px] text-slate-400 mt-0.5' }, `INR: ${patient.labs.inr} (Goal <1.8)`)
            ),
            // AT3
            React.createElement(
              'button',
              {
                onClick: () => onTriggerAction('Administer Antithrombin III (AT3) concentrate'),
                className: 'p-2.5 rounded border bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 text-left cursor-pointer'
              },
              React.createElement('div', { className: 'font-bold' }, '🧬 Antithrombin III (AT3)'),
              React.createElement('div', { className: 'text-[10px] text-slate-400 mt-0.5' }, `AT3: ${patient.labs.at3}%`)
            ),
            // Heparin
            React.createElement(
              'button',
              {
                onClick: () => onTriggerAction('Administer Heparin bolus (75 U/kg) on surgeon direction / titrate infusion'),
                className: 'p-2.5 rounded border bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 text-left cursor-pointer'
              },
              React.createElement('div', { className: 'font-bold' }, '💉 Heparin (75 U/kg / Titrate)'),
              React.createElement('div', { className: 'text-[10px] text-slate-400 mt-0.5' }, `Anti-Xa: ${patient.labs.antiXa} | PTT: ${patient.labs.ptt}`)
            )
          )
        )
      ),

    // TAB 5: Pre-Cannulation Checklist, Intensivist Time-Out Script & Live Protocol Scorecard
    activeTab === 'checklist-debrief' &&
      React.createElement(
        'div',
        { className: 'p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono' },

        // Left: Pre-Cannulation Activation & Intensivist Time-Out Script (6 cols)
        React.createElement(
          'div',
          { className: 'lg:col-span-6 bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2.5' },
          React.createElement(
            'div',
            { className: 'text-xs font-bold text-amber-400 uppercase border-b border-slate-800 pb-2' },
            'ECLS Pre-Cannulation Checklist & Intensivist Time-Out Script'
          ),
          [
            {
              key: 'bloodBank',
              label: 'Blood Bank Orchestration: STAT Type & Screen; Blood prime (<15 kg) + cooler w/ 2u PRBC (<14d fresh) + Prime meds (Heparin, Ca, Bicarb, AT3)'
            },
            {
              key: 'vascularAccess',
              label: 'Vascular Access & Pre-Procedure: A-line avoiding R arm; CVC avoiding R neck; Head US & Doppler; Platelets given if <150k in infant <1 yr'
            },
            {
              key: 'resuscitationStandby',
              label: 'Resuscitation Standby: Epinephrine drawn, Plasmalyte, bedside cooler PRBCs, standby platelets, line extensions confirmed'
            },
            {
              key: 'sedationNmb',
              label: 'Medications & Monitoring: Cefazolin given; Sedation, analgesia & neuromuscular blockade redosed; Bifrontal/somatic NIRS, dual SpO2, TCM CO2 active'
            },
            {
              key: 'wireEchoVerified',
              label: 'CANNULATION SAFETY REMINDER: Echo/Fluoro verification that guide wire is NOT coiled in SVC/RA/RV prior to cannula insertion'
            },
            {
              key: 'heparinSurgeon',
              label: 'Heparin Bolus (75 U/kg): Administered ONLY when directed by surgeon just prior to cannula insertion'
            }
          ].map((item) =>
            React.createElement(
              'label',
              {
                key: item.key,
                className: 'flex items-start gap-2.5 p-2 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 cursor-pointer hover:bg-slate-800/70'
              },
              React.createElement('input', {
                type: 'checkbox',
                checked: timeoutChecklist[item.key],
                onChange: (e) => {
                  const next = { ...timeoutChecklist, [item.key]: e.target.checked };
                  setTimeoutChecklist(next);
                  if (item.key === 'wireEchoVerified' && e.target.checked && state.complications.wireCoiled) {
                    onTriggerAction('Verify echo and redirect coiled guide wire into IVC');
                  }
                },
                className: 'mt-0.5 accent-emerald-500'
              }),
              React.createElement('span', null, item.label)
            )
          )
        ),

        // Right: Protocol Adherence Scorecard & Debrief (6 cols)
        React.createElement(
          'div',
          { className: 'lg:col-span-6 bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2.5' },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between border-b border-slate-800 pb-2' },
            React.createElement(
              'span',
              { className: 'text-xs font-bold text-emerald-400 uppercase' },
              'Live Protocol Adherence & Simulation Debrief Scorecard'
            ),
            React.createElement(
              'span',
              { className: 'text-xs font-bold text-sky-300' },
              `${protocolChecks.filter((c) => c.passed).length} / ${protocolChecks.length} Criteria Met`
            )
          ),
          React.createElement(
            'div',
            { className: 'space-y-2' },
            protocolChecks.map((chk) =>
              React.createElement(
                'div',
                {
                  key: chk.id,
                  className: `p-2.5 rounded border text-xs ${
                    chk.passed
                      ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-200'
                      : 'bg-amber-950/40 border-amber-700/70 text-amber-200'
                  }`
                },
                React.createElement(
                  'div',
                  { className: 'flex items-center justify-between font-bold' },
                  React.createElement('span', null, `${chk.passed ? '✅' : '⚠️'} ${chk.title}`),
                  React.createElement('span', { className: 'text-[10px] uppercase' }, chk.passed ? 'PASS' : 'NEEDS ACTION')
                ),
                !examMode &&
                  React.createElement('div', { className: 'text-[11px] text-slate-300 mt-1' }, chk.detail)
              )
            )
          )
        )
      )
  );
};
