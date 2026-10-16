// Spectrum Medical Quantum Elite Console & Hardware (QWS) Component

window.QuantumConsole = function({ state, onUpdateCircuit, onTriggerAction, examMode }) {
  const [showAlarmModal, setShowAlarmModal] = React.useState(false);
  const { patient, circuit, telemetry } = state;
  const targets = window.computeProtocolTargets(state);
  const isOnEcmo = circuit.onEcmo !== false;

  const indexFlowMlKg = isOnEcmo ? Math.round((circuit.flowLpm * 1000) / patient.weightKg) : '--';
  const bsaFlow = isOnEcmo ? (circuit.flowLpm / patient.bsa).toFixed(2) : '--';

  // Helper to set a desired blood flow L/min by solving for corresponding RPM
  const setDesiredFlowLpm = (targetFlow) => {
    const maxRefFlow = targets.boxATargetLpm * 1.45;
    const clamped = Math.max(0, Math.min(maxRefFlow * 1.2, targetFlow));
    if (clamped <= 0.01) {
      onUpdateCircuit({ rpm: 0 });
      return;
    }
    const rpmRatio = Math.pow(clamped / maxRefFlow, 1 / 1.15);
    const newRpm = Math.round(600 + rpmRatio * 3000);
    onUpdateCircuit({ rpm: Math.max(650, Math.min(4500, newRpm)), onEcmo: true });
  };

  const applyEclsRunAlarms = () => {
    onUpdateCircuit({
      alarms: {
        backflowPrevention: true,
        maxInlet: -60,
        stopInlet: -100,
        maxOutlet: 250,
        stopOutlet: 300,
        bubbleDetection: true,
        gaugeNarrowed: true
      }
    });
  };

  const allRunAlarmsActive =
    circuit.alarms.backflowPrevention &&
    circuit.alarms.maxInlet === -60 &&
    circuit.alarms.stopInlet === -100 &&
    circuit.alarms.maxOutlet === 250 &&
    circuit.alarms.stopOutlet === 300 &&
    circuit.alarms.bubbleDetection;

  // Determine venous vs arterial tubing visual color
  const isRecirculating = isOnEcmo && patient.mode === 'VV' && circuit.recirculationFraction >= 0.30;
  const venousColor = !isOnEcmo ? '#334155' : isRecirculating ? '#ef4444' : '#7f1d1d';
  const arterialColor = !isOnEcmo ? '#334155' : (circuit.sweepLpm > 0.01 && circuit.flowLpm > 0.01 ? '#ef4444' : '#7f1d1d');
  const hasChatter = isOnEcmo && (circuit.pIn <= -58 || circuit.obstructionSite === 1);

  return React.createElement(
    'div',
    { className: 'bg-slate-900 border-2 border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col' },

    // Console Header Bar
    React.createElement(
      'div',
      { className: 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-3.5 py-2 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2' },
      React.createElement(
        'div',
        { className: 'flex items-center gap-2' },
        React.createElement(
          'span',
          { className: `px-2 py-0.5 rounded text-xs font-bold font-mono border ${isOnEcmo ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}` },
          isOnEcmo ? 'QWS ACTIVE' : 'QWS STANDBY'
        ),
        React.createElement('span', { className: 'text-xs font-bold tracking-wider uppercase text-slate-200' }, 'Spectrum Medical Quantum Elite Console'),
        React.createElement(
          'span',
          { className: 'text-[11px] text-slate-400 font-mono hidden sm:inline' },
          isOnEcmo ? `• ${patient.cannulaDesc}` : '• Circuit Primed & Clamped at Bedside'
        )
      ),
      React.createElement(
        'div',
        { className: 'flex items-center gap-2' },
        !isOnEcmo &&
          React.createElement(
            'button',
            {
              onClick: () => onTriggerAction('Release circuit clamps and initiate ECMO bypass at Minute 1 Box B flow'),
              className: 'text-[11px] font-bold px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono uppercase tracking-wider shadow cursor-pointer flex items-center gap-1 animate-pulse'
            },
            '⚡ Initiate Bypass (Release Clamps)'
          ),
        isOnEcmo && !allRunAlarmsActive &&
          React.createElement(
            'button',
            {
              onClick: applyEclsRunAlarms,
              className: 'text-[11px] font-bold px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 transition cursor-pointer'
            },
            '⚡ Activate ECLS Run Alarms'
          ),
        React.createElement(
          'button',
          {
            onClick: () => setShowAlarmModal(!showAlarmModal),
            className: `text-[11px] font-mono px-2.5 py-1 rounded border transition cursor-pointer ${
              allRunAlarmsActive
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'
            }`
          },
          !isOnEcmo ? '⚙️ QWS Alarms: STANDBY' : allRunAlarmsActive ? '🛡️ QWS Alarms: ECLS RUN' : '⚙️ Configure QWS Alarms (Default)'
        )
      )
    ),

    // Active Cutbacks / Alarms Banner
    circuit.activeAlarms &&
      circuit.activeAlarms.length > 0 &&
      React.createElement(
        'div',
        { className: 'bg-rose-950/90 border-b border-rose-700 px-3.5 py-2 flex items-center justify-between gap-2' },
        React.createElement(
          'div',
          { className: 'flex items-center gap-2 text-xs font-mono text-rose-200 font-bold' },
          React.createElement('span', { className: 'inline-block w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping' }),
          React.createElement('span', null, circuit.activeAlarms.join('  •  '))
        )
      ),

    // Optional Alarm Configuration Drawer
    showAlarmModal &&
      React.createElement(
        'div',
        { className: 'bg-slate-950 border-b border-slate-700 p-3 text-xs space-y-2' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between' },
          React.createElement(
            'span',
            { className: 'font-bold text-sky-300 uppercase tracking-wider' },
            'Spectrum QWS Safety & Gauge Alarms Protocol (Ver. Aug 22, 2026)'
          ),
          React.createElement(
            'div',
            { className: 'flex gap-2' },
            React.createElement(
              'button',
              {
                onClick: applyEclsRunAlarms,
                className: 'px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer'
              },
              'Set All to ECLS Run Mode'
            ),
            React.createElement(
              'button',
              {
                onClick: () => setShowAlarmModal(false),
                className: 'px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer'
              },
              'Close'
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 font-mono text-[11px]' },
          // Backflow Prevention
          React.createElement(
            'div',
            { className: 'bg-slate-900 p-2 rounded border border-slate-800' },
            React.createElement('div', { className: 'text-slate-400' }, 'Backflow Prev.'),
            React.createElement(
              'button',
              {
                onClick: () =>
                  onUpdateCircuit({
                    alarms: { ...circuit.alarms, backflowPrevention: !circuit.alarms.backflowPrevention }
                  }),
                className: `mt-1 w-full py-0.5 rounded font-bold cursor-pointer ${
                  circuit.alarms.backflowPrevention ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-950 text-rose-300'
                }`
              },
              circuit.alarms.backflowPrevention ? 'ON (ECLS Run)' : 'OFF (Default)'
            )
          ),
          // Max Inlet
          React.createElement(
            'div',
            { className: 'bg-slate-900 p-2 rounded border border-slate-800' },
            React.createElement('div', { className: 'text-slate-400' }, 'Max Inlet (Cutback)'),
            React.createElement(
              'button',
              {
                onClick: () =>
                  onUpdateCircuit({
                    alarms: { ...circuit.alarms, maxInlet: circuit.alarms.maxInlet === -60 ? -100 : -60 }
                  }),
                className: `mt-1 w-full py-0.5 rounded font-bold cursor-pointer ${
                  circuit.alarms.maxInlet === -60 ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-950 text-amber-300'
                }`
              },
              `${circuit.alarms.maxInlet} mmHg`
            )
          ),
          // Stop Inlet
          React.createElement(
            'div',
            { className: 'bg-slate-900 p-2 rounded border border-slate-800' },
            React.createElement('div', { className: 'text-slate-400' }, 'Stop Inlet (Stop)'),
            React.createElement(
              'button',
              {
                onClick: () =>
                  onUpdateCircuit({
                    alarms: { ...circuit.alarms, stopInlet: circuit.alarms.stopInlet === -100 ? -150 : -100 }
                  }),
                className: `mt-1 w-full py-0.5 rounded font-bold cursor-pointer ${
                  circuit.alarms.stopInlet === -100 ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-950 text-amber-300'
                }`
              },
              `${circuit.alarms.stopInlet} mmHg`
            )
          ),
          // Max Outlet
          React.createElement(
            'div',
            { className: 'bg-slate-900 p-2 rounded border border-slate-800' },
            React.createElement('div', { className: 'text-slate-400' }, 'Max Outlet (Cut)'),
            React.createElement(
              'button',
              {
                onClick: () =>
                  onUpdateCircuit({
                    alarms: { ...circuit.alarms, maxOutlet: circuit.alarms.maxOutlet === 250 ? 300 : 250 }
                  }),
                className: `mt-1 w-full py-0.5 rounded font-bold cursor-pointer ${
                  circuit.alarms.maxOutlet === 250 ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-950 text-amber-300'
                }`
              },
              `+${circuit.alarms.maxOutlet} mmHg`
            )
          ),
          // Stop Outlet
          React.createElement(
            'div',
            { className: 'bg-slate-900 p-2 rounded border border-slate-800' },
            React.createElement('div', { className: 'text-slate-400' }, 'Stop Outlet (Stop)'),
            React.createElement(
              'button',
              {
                onClick: () =>
                  onUpdateCircuit({
                    alarms: { ...circuit.alarms, stopOutlet: circuit.alarms.stopOutlet === 300 ? 400 : 300 }
                  }),
                className: `mt-1 w-full py-0.5 rounded font-bold cursor-pointer ${
                  circuit.alarms.stopOutlet === 300 ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-950 text-amber-300'
                }`
              },
              `+${circuit.alarms.stopOutlet} mmHg`
            )
          ),
          // Bubble Detection
          React.createElement(
            'div',
            { className: 'bg-slate-900 p-2 rounded border border-slate-800' },
            React.createElement('div', { className: 'text-slate-400' }, 'Bubble Detector'),
            React.createElement(
              'button',
              {
                onClick: () =>
                  onUpdateCircuit({
                    alarms: { ...circuit.alarms, bubbleDetection: !circuit.alarms.bubbleDetection }
                  }),
                className: `mt-1 w-full py-0.5 rounded font-bold cursor-pointer ${
                  circuit.alarms.bubbleDetection ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-950 text-rose-300'
                }`
              },
              circuit.alarms.bubbleDetection ? 'ON (Small)' : 'OFF (Default)'
            )
          )
        )
      ),

    // Main Console Body
    React.createElement(
      'div',
      { className: 'p-3 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-12 gap-2.5' },

      // Column 1: Pump Speed (RPM) & Blood Flow Rate (Q_ecmo)
      React.createElement(
        'div',
        { className: '2xl:col-span-4 bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col justify-between space-y-2.5' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between border-b border-slate-800 pb-1.5' },
          React.createElement('span', { className: 'text-[11px] font-mono uppercase text-sky-400 font-bold' }, isOnEcmo ? 'Centrifugal Pump & Flow (Q_ecmo)' : 'Pump & Flow (STANDBY • CLAMPED)'),
          !examMode && React.createElement('span', { className: 'text-[11px] font-mono text-slate-400' }, `Target Box A: ${targets.boxATargetLpm} L/m`)
        ),

        // Big Flow & RPM Readouts
        !isOnEcmo
          ? React.createElement(
              'div',
              { className: 'bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2.5 font-mono' },
              React.createElement(
                'div',
                { className: 'grid grid-cols-2 gap-2 items-center' },
                React.createElement(
                  'div',
                  null,
                  React.createElement('div', { className: 'text-[10px] text-slate-400 uppercase' }, 'Blood Flow Rate'),
                  React.createElement('div', { className: 'text-3xl font-black text-slate-500' }, '--'),
                  React.createElement('div', { className: 'text-[11px] text-amber-400 font-bold' }, 'CLAMPED (0.00 L/m)'),
                  React.createElement('div', { className: 'text-[10px] text-slate-500' }, 'Cardiac Index: --')
                ),
                React.createElement(
                  'div',
                  { className: 'border-l border-slate-800 pl-3' },
                  React.createElement('div', { className: 'text-[10px] text-slate-400 uppercase' }, 'Pump Speed'),
                  React.createElement('div', { className: 'text-2xl font-black text-slate-500' }, '--'),
                  React.createElement('div', { className: 'text-[11px] text-slate-400' }, '0 RPM (Stopped)'),
                  React.createElement('div', { className: 'text-[10px] text-slate-500' }, 'Bridge Clamped')
                )
              ),
              React.createElement(
                'button',
                {
                  onClick: () => onTriggerAction('Release circuit clamps and initiate ECMO bypass at Minute 1 Box B flow'),
                  className: 'w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer flex items-center justify-center gap-1.5 animate-pulse'
                },
                '⚡ Release Clamps & Cannulate (Box B)'
              ),
              React.createElement(
                'div',
                { className: 'text-[10px] text-slate-400 text-center leading-tight' },
                `Target Box B Initial BFR: ${targets.boxBTargetLpm} L/min (${targets.boxBMlKg} mL/kg/min)`
              )
            )
          : React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-2 items-center bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 font-mono' },
              React.createElement(
                'div',
                null,
                React.createElement('div', { className: 'text-[10px] text-slate-400 uppercase' }, 'Blood Flow Rate'),
                React.createElement(
                  'div',
                  { className: `text-3xl font-black ${circuit.flowLpm <= 0 ? 'text-rose-400' : 'text-emerald-400'}` },
                  `${circuit.flowLpm.toFixed(2)}`
                ),
                React.createElement('div', { className: 'text-[11px] text-emerald-300/90' }, `L/min (${indexFlowMlKg} mL/kg/m)`),
                React.createElement('div', { className: 'text-[10px] text-slate-400' }, `Cardiac Index: ${bsaFlow} L/min/m²`)
              ),
              React.createElement(
                'div',
                { className: 'border-l border-slate-800 pl-3' },
                React.createElement('div', { className: 'text-[10px] text-slate-400 uppercase' }, 'Pump Speed'),
                React.createElement('div', { className: 'text-2xl font-black text-sky-300' }, circuit.rpm),
                React.createElement('div', { className: 'text-[11px] text-sky-400' }, 'RPM'),
                React.createElement(
                  'input',
                  {
                    type: 'range',
                    min: 0,
                    max: 4200,
                    step: 25,
                    value: circuit.rpm,
                    onChange: (e) => onUpdateCircuit({ rpm: Number(e.target.value) }),
                    className: 'w-full mt-1 accent-sky-400 cursor-pointer'
                  }
                )
              )
            ),

        // RPM & Quick Ramp Step Buttons (Active Mode Only)
        isOnEcmo &&
          React.createElement(
            'div',
            { className: 'space-y-1.5' },
            React.createElement(
              'div',
              { className: 'grid grid-cols-4 gap-1.5 font-mono text-xs' },
              [
                { label: '-200 RPM', delta: -200 },
                { label: '-50 RPM', delta: -50 },
                { label: '+50 RPM', delta: 50 },
                { label: '+200 RPM', delta: 200 }
              ].map((b) =>
                React.createElement(
                  'button',
                  {
                    key: b.label,
                    onClick: () => onUpdateCircuit({ rpm: Math.max(0, Math.min(4500, circuit.rpm + b.delta)) }),
                    className: 'py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer'
                  },
                  b.label
                )
              )
            ),
            !examMode &&
              React.createElement(
                'div',
                { className: 'pt-1' },
                React.createElement('div', { className: 'text-[10px] font-mono text-slate-400 mb-1' }, '15-Min Protocol BFR Ramp Presets (Box B → Box A):'),
                React.createElement(
                  'div',
                  { className: 'grid grid-cols-6 gap-1 font-mono text-[10px]' },
                  targets.rampSteps.map((s) =>
                    React.createElement(
                      'button',
                      {
                        key: s.step,
                        onClick: () => setDesiredFlowLpm(s.flowLpm),
                        title: `Min ${s.minute}: ${s.flowLpm} L/min (${s.mlKg} mL/kg/min)`,
                        className: 'py-1 px-1 rounded bg-sky-950/70 hover:bg-sky-800/80 text-sky-200 border border-sky-800/60 transition cursor-pointer text-center'
                      },
                      `M${s.minute}: ${s.flowLpm}`
                    )
                  )
                )
              )
          )
      ),

      // Column 2: Hydraulic Circuit Pressures (P_in, P_out, P_ox-in, P_ox-out, TMP)
      React.createElement(
        'div',
        { className: '2xl:col-span-4 bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col justify-between space-y-2' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between border-b border-slate-800 pb-1.5' },
          React.createElement('span', { className: 'text-[11px] font-mono uppercase text-amber-400 font-bold' }, isOnEcmo ? 'Hydraulic Circuit Pressures (mmHg)' : 'Circuit Pressures (STANDBY)'),
          !examMode && React.createElement('span', { className: 'text-[10px] font-mono text-slate-400' }, 'Baseline TMP <40–50')
        ),

        React.createElement(
          'div',
          { className: 'grid grid-cols-5 gap-1.5 text-center font-mono' },
          // P_in
          React.createElement(
            'div',
            {
              className: `p-2 rounded border ${
                !isOnEcmo
                  ? 'bg-slate-900 border-slate-800 text-slate-500'
                  : circuit.pIn <= -60
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                  : circuit.pIn > 0
                  ? 'bg-amber-950/70 border-amber-600 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-sky-300'
              }`
            },
            React.createElement('div', { className: 'text-[10px] text-slate-400' }, 'P_in'),
            React.createElement('div', { className: 'text-xl font-black mt-0.5' }, isOnEcmo ? circuit.pIn : '--'),
            React.createElement('div', { className: 'text-[9px] text-slate-400 mt-0.5' }, 'Venous')
          ),
          // P_out
          React.createElement(
            'div',
            {
              className: `p-2 rounded border ${
                !isOnEcmo
                  ? 'bg-slate-900 border-slate-800 text-slate-500'
                  : circuit.pOut >= 250
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-rose-300'
              }`
            },
            React.createElement('div', { className: 'text-[10px] text-slate-400' }, 'P_out'),
            React.createElement('div', { className: 'text-xl font-black mt-0.5' }, isOnEcmo ? `+${circuit.pOut}` : '--'),
            React.createElement('div', { className: 'text-[9px] text-slate-400 mt-0.5' }, 'Pump Out')
          ),
          // P_ox-in (P1)
          React.createElement(
            'div',
            {
              className: `p-2 rounded border ${
                !isOnEcmo
                  ? 'bg-slate-900 border-slate-800 text-slate-500'
                  : circuit.pOxIn >= 240
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                  : 'bg-slate-900 border-slate-800 text-orange-300'
              }`
            },
            React.createElement('div', { className: 'text-[10px] text-slate-400' }, 'P_ox-in'),
            React.createElement('div', { className: 'text-xl font-black mt-0.5' }, isOnEcmo ? `+${circuit.pOxIn}` : '--'),
            React.createElement('div', { className: 'text-[9px] text-slate-400 mt-0.5' }, 'Pre-Oxy')
          ),
          // P_ox-out (P2)
          React.createElement(
            'div',
            {
              className: `p-2 rounded border ${
                !isOnEcmo
                  ? 'bg-slate-900 border-slate-800 text-slate-500'
                  : circuit.pOxOut >= 220
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                  : 'bg-slate-900 border-slate-800 text-emerald-300'
              }`
            },
            React.createElement('div', { className: 'text-[10px] text-slate-400' }, 'P_ox-out'),
            React.createElement('div', { className: 'text-xl font-black mt-0.5' }, isOnEcmo ? `+${circuit.pOxOut}` : '--'),
            React.createElement('div', { className: 'text-[9px] text-slate-400 mt-0.5' }, 'Post-Oxy')
          ),
          // Delta P (TMP)
          React.createElement(
            'div',
            {
              className: `p-2 rounded border ${
                !isOnEcmo
                  ? 'bg-slate-900 border-slate-800 text-slate-500'
                  : circuit.tmp >= 55
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-amber-300'
              }`
            },
            React.createElement('div', { className: 'text-[10px] text-slate-400' }, 'ΔP (TMP)'),
            React.createElement('div', { className: 'text-xl font-black mt-0.5' }, isOnEcmo ? circuit.tmp : '--'),
            React.createElement('div', { className: 'text-[9px] text-slate-400 mt-0.5' }, 'P1 - P2')
          )
        ),

        // Interactive Visual Circuit Loop & Color Differential Bar
        React.createElement(
          'div',
          { className: 'bg-slate-900/90 border border-slate-800 rounded p-2 space-y-1.5' },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between text-[10px] font-mono' },
            React.createElement(
              'span',
              { className: 'text-slate-300 font-semibold' },
              isOnEcmo ? 'Visual Circuit Loop & Tubing Color:' : 'Visual Circuit Loop: STANDBY • CLAMPED'
            ),
            hasChatter &&
              React.createElement('span', { className: 'text-amber-400 font-bold animate-bounce' }, '〰️ VENOUS LINE CHATTER')
          ),
          // Circuit Flow Bar
          React.createElement(
            'div',
            { className: 'grid grid-cols-5 gap-1 items-center text-[10px] font-mono text-center' },
            React.createElement(
              'div',
              {
                style: { backgroundColor: venousColor },
                className: 'py-1.5 px-1 rounded text-white font-bold border border-white/20'
              },
              isOnEcmo ? `1. Venous (${circuit.svo2}%)` : '1. Venous (Clamped)'
            ),
            React.createElement(
              'div',
              {
                style: { backgroundColor: venousColor },
                className: 'py-1.5 px-1 rounded text-white font-bold border border-white/20'
              },
              isOnEcmo ? '2. Pump Head' : '2. Pump (0 RPM)'
            ),
            React.createElement(
              'div',
              {
                style: { backgroundColor: venousColor },
                className: 'py-1.5 px-1 rounded text-white font-bold border border-white/20'
              },
              '3. Conduit'
            ),
            React.createElement(
              'div',
              {
                className: `py-1.5 px-1 rounded text-white font-bold border border-white/20 ${isOnEcmo ? 'bg-rose-800' : 'bg-slate-700'}`
              },
              '4. Membrane'
            ),
            React.createElement(
              'div',
              {
                style: { backgroundColor: arterialColor },
                className: 'py-1.5 px-1 rounded text-white font-bold border border-white/20'
              },
              isOnEcmo ? `5. Art (${circuit.postOxSao2}%)` : '5. Art (Clamped)'
            )
          ),
          // Quick Mechanical Troubleshooting Actions (Shown in Guided Mode)
          !examMode &&
            isOnEcmo &&
            (circuit.obstructionSite > 0 || isRecirculating || state.complications.wireCoiled) &&
            React.createElement(
              'div',
              { className: 'flex flex-wrap gap-1.5 pt-1' },
              circuit.obstructionSite === 4 &&
                React.createElement(
                  'button',
                  {
                    onClick: () => onTriggerAction('Emergency oxygenator exchange with primed backup'),
                    className: 'text-[10px] font-mono px-2 py-0.5 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold cursor-pointer'
                  },
                  '🔧 Exchange Thrombosed Oxygenator'
                ),
              (circuit.obstructionSite === 1 || circuit.obstructionSite === 2 || circuit.obstructionSite === 3 || circuit.obstructionSite === 5) &&
                React.createElement(
                  'button',
                  {
                    onClick: () => onTriggerAction('Inspect and clear mechanical circuit obstruction / kink'),
                    className: 'text-[10px] font-mono px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-600 text-white font-bold cursor-pointer'
                  },
                  `🔧 Resolve Site ${circuit.obstructionSite} Obstruction`
                ),
              isRecirculating &&
                React.createElement(
                  'button',
                  {
                    onClick: () => onTriggerAction('Check echo and reposition malrotated dual-lumen cannula'),
                    className: 'text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-700 hover:bg-indigo-600 text-white font-bold cursor-pointer'
                  },
                  '🔄 Echo & Reposition Malrotated Cannula'
                ),
              state.complications.wireCoiled &&
                React.createElement(
                  'button',
                  {
                    onClick: () => onTriggerAction('Verify echo and redirect coiled guide wire into IVC'),
                    className: 'text-[10px] font-mono px-2 py-0.5 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold cursor-pointer'
                  },
                  '⚠️ Redirect Coiled Guide Wire on Echo'
                )
            )
        )
      ),

      // Column 3: Quantum Ventilation Lite Module (Sweep Gas, FiO2, In-Line Blood Diagnostics)
      React.createElement(
        'div',
        { className: 'sm:col-span-2 2xl:col-span-4 bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col justify-between space-y-2.5' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between border-b border-slate-800 pb-1.5' },
          React.createElement('span', { className: 'text-[11px] font-mono uppercase text-emerald-400 font-bold' }, isOnEcmo ? 'Quantum Ventilation Lite & In-Line Gas' : 'Ventilation Lite (STANDBY)'),
          !examMode && React.createElement('span', { className: 'text-[10px] font-mono text-slate-400' }, `Box M Init: ${targets.boxMSweepForCurrentFlow} L/m`)
        ),

        // Sweep Gas Flow & Sweep FiO2 Controls
        React.createElement(
          'div',
          { className: 'grid grid-cols-2 gap-2 bg-slate-900/90 p-2 rounded border border-slate-800 font-mono' },
          // Sweep Gas Flow
          React.createElement(
            'div',
            null,
            React.createElement('div', { className: 'text-[10px] text-slate-400 uppercase' }, 'Sweep Gas (L/min)'),
            React.createElement(
              'div',
              { className: `text-2xl font-black ${isOnEcmo ? 'text-amber-300' : 'text-slate-500'}` },
              isOnEcmo ? circuit.sweepLpm.toFixed(2) : '--'
            ),
            isOnEcmo
              ? React.createElement(
                  'div',
                  { className: 'grid grid-cols-4 gap-1 mt-1 text-[10px]' },
                  [
                    { label: '-0.1', d: -0.1 },
                    { label: '-0.05', d: -0.05 },
                    { label: '+0.05', d: 0.05 },
                    { label: '+0.1', d: 0.1 }
                  ].map((b) =>
                    React.createElement(
                      'button',
                      {
                        key: b.label,
                        onClick: () =>
                          onUpdateCircuit({
                            sweepLpm: Math.max(0, Math.min(10, +(circuit.sweepLpm + b.d).toFixed(2)))
                          }),
                        className: 'py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer'
                      },
                      b.label
                    )
                  )
                )
              : React.createElement('div', { className: 'text-[10px] text-slate-500 mt-1' }, 'OFF / Standby'),
            !examMode &&
              isOnEcmo &&
              React.createElement(
                'button',
                {
                  onClick: () => onUpdateCircuit({ sweepLpm: targets.boxMSweepForCurrentFlow, sweepFio2: 80 }),
                  className: 'mt-1.5 w-full py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/60 text-[10px] cursor-pointer'
                },
                `Set Box M (0.25×BFR = ${targets.boxMSweepForCurrentFlow})`
              )
          ),

          // Blender FiO2 & Water Bath
          React.createElement(
            'div',
            { className: 'border-l border-slate-800 pl-2.5 flex flex-col justify-between' },
            React.createElement(
              'div',
              null,
              React.createElement('div', { className: 'text-[10px] text-slate-400 uppercase' }, 'Sweep FiO2 (%)'),
              React.createElement(
                'div',
                { className: `text-2xl font-black ${isOnEcmo ? 'text-sky-300' : 'text-slate-500'}` },
                isOnEcmo ? `${circuit.sweepFio2}%` : '--'
              ),
              isOnEcmo
                ? React.createElement(
                    'div',
                    { className: 'grid grid-cols-3 gap-1 mt-1 text-[10px]' },
                    [
                      { label: '-10%', d: -10 },
                      { label: '80%', abs: 80 },
                      { label: '+10%', d: 10 }
                    ].map((b) =>
                      React.createElement(
                        'button',
                        {
                          key: b.label,
                          onClick: () =>
                            onUpdateCircuit({
                              sweepFio2: b.abs ? b.abs : Math.max(21, Math.min(100, circuit.sweepFio2 + b.d))
                            }),
                          className: 'py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer'
                        },
                        b.label
                      )
                    )
                  )
                : React.createElement('div', { className: 'text-[10px] text-slate-500 mt-1' }, 'Standby')
            ),
            React.createElement(
              'div',
              { className: 'text-[10px] text-slate-400 pt-1 border-t border-slate-800/80' },
              isOnEcmo
                ? `Exhaust CO2: ${circuit.exhaustCo2} mmHg | VCO2: ${circuit.vco2} mL/m`
                : 'Exhaust Sensor: STANDBY'
            )
          )
        ),

        // Continuous In-Line Diagnostics Bar
        React.createElement(
          'div',
          { className: 'grid grid-cols-3 gap-1.5 text-center font-mono text-[11px] bg-slate-900/90 p-2 rounded border border-slate-800' },
          React.createElement(
            'div',
            null,
            React.createElement('div', { className: 'text-[9px] text-slate-400 uppercase' }, 'Venous Hb / Hct'),
            React.createElement(
              'div',
              { className: `font-bold ${!isOnEcmo ? 'text-slate-500' : patient.labs.hct < 35 ? 'text-amber-400' : 'text-slate-200'}` },
              isOnEcmo ? `${patient.labs.hb.toFixed(1)} / ${patient.labs.hct}%` : '-- / --'
            )
          ),
          React.createElement(
            'div',
            { className: 'border-x border-slate-800 px-1' },
            React.createElement('div', { className: 'text-[9px] text-slate-400 uppercase' }, 'Post-Ox PO2 / SaO2'),
            React.createElement(
              'div',
              { className: `font-bold ${!isOnEcmo ? 'text-slate-500' : circuit.postOxPo2 < 150 ? 'text-amber-400' : 'text-emerald-300'}` },
              isOnEcmo ? `${circuit.postOxPo2} / ${circuit.postOxSao2}%` : '-- / --'
            )
          ),
          React.createElement(
            'div',
            null,
            React.createElement('div', { className: 'text-[9px] text-slate-400 uppercase' }, 'Post-Ox pH Cap'),
            React.createElement(
              'div',
              { className: `font-bold ${!isOnEcmo ? 'text-slate-500' : telemetry.postOxPh >= 7.55 ? 'text-rose-400 animate-pulse' : 'text-sky-300'}` },
              isOnEcmo ? `${telemetry.postOxPh} (<7.55)` : '--'
            )
          )
        )
      )
    )
  );
};
