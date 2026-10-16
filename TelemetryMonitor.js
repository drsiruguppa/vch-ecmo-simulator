// High-Fidelity PICU/CICU Bedside Telemetry Monitor Component

window.TelemetryMonitor = function({ state, onAdvanceTime }) {
  const { patient, telemetry, circuit, elapsedMinutes } = state;
  const paco2Shift = patient.preEclsPaco2 - telemetry.paco2;
  const isNeuroAlert = Math.abs(paco2Shift) >= 10 && elapsedMinutes <= 60 || telemetry.nirsLeft < 55;

  const formatElapsed = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `Min ${m}`;
    return `Hr ${h} Min ${m} (${mins}m)`;
  };

  // Pulse pressure amplitude factor for arterial waveform SVG
  const ppScale = Math.max(0.2, Math.min(1.2, (telemetry.radialSbp - telemetry.radialDbp) / 28));

  return React.createElement(
    'div',
    { className: 'bg-slate-950 border-2 border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col' },
    // Monitor Top Bar
    React.createElement(
      'div',
      { className: 'bg-slate-900 px-3 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2' },
      React.createElement(
        'div',
        { className: 'flex items-center gap-2.5' },
        React.createElement('span', { className: 'inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse' }),
        React.createElement('span', { className: 'text-xs font-bold tracking-wider uppercase text-slate-300' }, 'PICU/CICU Bedside Telemetry'),
        React.createElement(
          'span',
          { className: 'text-xs px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono border border-slate-700' },
          `${patient.name} • ${patient.weightKg} kg • BSA ${patient.bsa} m²`
        ),
        React.createElement(
          'span',
          {
            className: `text-xs px-2 py-0.5 rounded font-bold ${
              patient.mode === 'VA'
                ? 'bg-rose-950/90 text-rose-300 border border-rose-700/60'
                : 'bg-indigo-950/90 text-indigo-300 border border-indigo-700/60'
            }`
          },
          `${patient.mode} ECMO (${patient.tubingSize})`
        )
      ),
      // Time Controls
      React.createElement(
        'div',
        { className: 'flex items-center gap-1.5 flex-wrap' },
        React.createElement(
          'span',
          { className: 'text-xs font-mono bg-amber-950/70 text-amber-300 border border-amber-700/50 px-2.5 py-0.5 rounded font-semibold' },
          `⏱ ECLS Run: ${formatElapsed(elapsedMinutes)}`
        ),
        [
          { label: '+1m', mins: 1, title: 'Advance 1 minute' },
          { label: '+3m (Ramp)', mins: 3, title: 'Advance 3 minutes (Protocol BFR Ramp Cadence)' },
          { label: '+15m', mins: 15, title: 'Advance 15 minutes' },
          { label: '+2h (Vent/iNO)', mins: 120, title: 'Advance 2 hours (Scheduled Ventilator & iNO/Flolan Wean)' },
          { label: '+4h (PaCO2)', mins: 240, title: 'Advance 4 hours (Scheduled 5 mmHg PaCO2 Wean & Lab Block)' }
        ].map((btn) =>
          React.createElement(
            'button',
            {
              key: btn.label,
              onClick: () => onAdvanceTime(btn.mins),
              title: btn.title,
              className:
                'text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-sky-900/70 text-slate-200 hover:text-white border border-slate-700 transition cursor-pointer'
            },
            btn.label
          )
        )
      )
    ),

    // Main Telemetry Grid
    React.createElement(
      'div',
      { className: 'p-3 grid grid-cols-1 md:grid-cols-12 gap-3 bg-black/95' },

      // Left Waveforms Column (7 cols on md)
      React.createElement(
        'div',
        { className: 'md:col-span-7 flex flex-col justify-between space-y-2 border-r border-slate-900 pr-2' },
        // ECG Waveform Row
        React.createElement(
          'div',
          { className: 'bg-slate-950/90 border border-slate-900 rounded p-2 flex items-center justify-between' },
          React.createElement(
            'div',
            { className: 'w-3/4 overflow-hidden' },
            React.createElement(
              'div',
              { className: 'text-[10px] font-mono text-emerald-400/90 mb-0.5 flex items-center justify-between' },
              React.createElement('span', null, `II • ${telemetry.rhythm}`),
              React.createElement('span', null, '1 mV')
            ),
            React.createElement(
              'svg',
              { viewBox: '0 0 400 38', className: 'w-full h-9 stroke-emerald-400 fill-none', strokeWidth: '1.8' },
              React.createElement('path', {
                className: 'waveform-scroll',
                d: 'M0,24 L18,24 L22,20 L26,24 L32,24 L35,28 L39,5 L43,33 L47,24 L56,24 L62,17 L69,24 L95,24 L118,24 L122,20 L126,24 L132,24 L135,28 L139,5 L143,33 L147,24 L156,24 L162,17 L169,24 L195,24 L218,24 L222,20 L226,24 L232,24 L235,28 L239,5 L243,33 L247,24 L256,24 L262,17 L269,24 L295,24 L318,24 L322,20 L326,24 L332,24 L335,28 L339,5 L343,33 L347,24 L356,24 L362,17 L369,24 L400,24'
              })
            )
          ),
          React.createElement(
            'div',
            { className: 'text-right pl-2' },
            React.createElement('div', { className: 'text-[10px] font-mono text-emerald-500 uppercase' }, 'HR (bpm)'),
            React.createElement('div', { className: 'text-3xl font-black font-mono text-emerald-400 leading-none' }, telemetry.hr)
          )
        ),

        // Dual Arterial Lines Row
        React.createElement(
          'div',
          { className: 'bg-slate-950/90 border border-slate-900 rounded p-2 flex items-center justify-between' },
          React.createElement(
            'div',
            { className: 'w-7/12 overflow-hidden' },
            React.createElement(
              'div',
              { className: 'text-[10px] font-mono text-rose-400/90 mb-0.5 flex justify-between' },
              React.createElement('span', null, 'ART 1 (Right Radial) & ART 2 (' + (patient.lowerArtSite || 'Femoral') + ')'),
              React.createElement('span', null, `PP ${telemetry.radialSbp - telemetry.radialDbp} mmHg`)
            ),
            React.createElement(
              'svg',
              { viewBox: '0 0 400 38', className: 'w-full h-9 stroke-rose-500 fill-none', strokeWidth: '1.8' },
              React.createElement('path', {
                d: `M0,30 L20,30 L30,${Math.round(30 - 22 * ppScale)} L40,${Math.round(30 - 12 * ppScale)} L46,${Math.round(30 - 15 * ppScale)} L68,30 L100,30 L120,30 L130,${Math.round(30 - 22 * ppScale)} L140,${Math.round(30 - 12 * ppScale)} L146,${Math.round(30 - 15 * ppScale)} L168,30 L200,30 L220,30 L230,${Math.round(30 - 22 * ppScale)} L240,${Math.round(30 - 12 * ppScale)} L246,${Math.round(30 - 15 * ppScale)} L268,30 L300,30 L320,30 L330,${Math.round(30 - 22 * ppScale)} L340,${Math.round(30 - 12 * ppScale)} L346,${Math.round(30 - 15 * ppScale)} L368,30 L400,30`
              })
            )
          ),
          React.createElement(
            'div',
            { className: 'text-right pl-2 flex gap-3 items-center' },
            React.createElement(
              'div',
              null,
              React.createElement('div', { className: 'text-[10px] font-mono text-rose-400 uppercase' }, 'R. Radial'),
              React.createElement(
                'div',
                { className: 'text-lg font-extrabold font-mono text-rose-400 leading-tight' },
                `${telemetry.radialSbp}/${telemetry.radialDbp}`
              ),
              React.createElement('div', { className: 'text-xs font-mono text-rose-300' }, `(${telemetry.radialMap})`)
            ),
            React.createElement(
              'div',
              { className: 'border-l border-slate-800 pl-3' },
              React.createElement('div', { className: 'text-[10px] font-mono text-orange-400 uppercase' }, patient.lowerArtSite || 'Femoral'),
              React.createElement(
                'div',
                { className: 'text-lg font-extrabold font-mono text-orange-400 leading-tight' },
                `${telemetry.femSbp}/${telemetry.femDbp}`
              ),
              React.createElement('div', { className: 'text-xs font-mono text-orange-300' }, `(${telemetry.femMap})`)
            )
          )
        ),

        // SpO2 Pleth & Capnography Row
        React.createElement(
          'div',
          { className: 'bg-slate-950/90 border border-slate-900 rounded p-2 flex items-center justify-between' },
          React.createElement(
            'div',
            { className: 'w-7/12 overflow-hidden' },
            React.createElement(
              'div',
              { className: 'text-[10px] font-mono text-sky-400/90 mb-0.5' },
              'SpO2 PLETH (Pre-Ductal R. Hand / Post-Ductal)'
            ),
            React.createElement(
              'svg',
              { viewBox: '0 0 400 34', className: 'w-full h-8 stroke-sky-400 fill-none', strokeWidth: '1.8' },
              React.createElement('path', {
                d: 'M0,28 Q15,28 25,8 T50,26 L80,28 Q95,28 105,8 T130,26 L160,28 Q175,28 185,8 T210,26 L240,28 Q255,28 265,8 T290,26 L320,28 Q335,28 345,8 T370,26 L400,28'
              })
            )
          ),
          React.createElement(
            'div',
            { className: 'text-right pl-2 flex gap-3 items-center' },
            React.createElement(
              'div',
              null,
              React.createElement('div', { className: 'text-[10px] font-mono text-sky-400 uppercase' }, 'Pre SpO2'),
              React.createElement(
                'div',
                { className: `text-2xl font-black font-mono leading-none ${telemetry.preSpo2 < 85 ? 'text-amber-400 animate-pulse' : 'text-sky-400'}` },
                `${telemetry.preSpo2}%`
              )
            ),
            React.createElement(
              'div',
              { className: 'border-l border-slate-800 pl-3' },
              React.createElement('div', { className: 'text-[10px] font-mono text-cyan-300 uppercase' }, 'Post SpO2'),
              React.createElement(
                'div',
                { className: `text-2xl font-black font-mono leading-none ${telemetry.postSpo2 < 85 ? 'text-amber-400 animate-pulse' : 'text-cyan-300'}` },
                `${telemetry.postSpo2}%`
              )
            )
          )
        )
      ),

      // Right Numerics Column: CVP/LAP, Capnography & TCM CO2, Bifrontal/Somatic NIRS & SvO2 (5 cols on md)
      React.createElement(
        'div',
        { className: 'md:col-span-5 flex flex-col justify-between space-y-2' },

        // CVP / LAP & EtCO2 / TCM CO2 Row
        React.createElement(
          'div',
          { className: 'grid grid-cols-2 gap-2' },
          // CVP / LAP Box
          React.createElement(
            'div',
            { className: 'bg-slate-950 border border-slate-800 rounded p-2' },
            React.createElement('div', { className: 'text-[10px] font-mono text-cyan-400 uppercase' }, 'CVP / Preload'),
            React.createElement(
              'div',
              { className: 'flex items-baseline justify-between mt-1' },
              React.createElement('span', { className: 'text-2xl font-black font-mono text-cyan-300' }, `${telemetry.cvp}`),
              React.createElement('span', { className: 'text-[11px] font-mono text-slate-400' }, 'mmHg')
            ),
            telemetry.lap !== null &&
              React.createElement(
                'div',
                { className: 'text-[11px] font-mono text-slate-300 mt-0.5' },
                `LAP: ${telemetry.lap} mmHg`
              )
          ),

          // EtCO2 & TCM CO2 Box
          React.createElement(
            'div',
            {
              className: `rounded p-2 border ${
                isNeuroAlert
                  ? 'bg-amber-950/60 border-amber-500 animate-pulse'
                  : 'bg-slate-950 border-slate-800'
              }`
            },
            React.createElement(
              'div',
              { className: 'flex justify-between items-center' },
              React.createElement('span', { className: 'text-[10px] font-mono text-amber-300 uppercase font-bold' }, 'TCM CO2 / EtCO2'),
              React.createElement(
                'span',
                { className: 'text-[10px] font-mono text-slate-400' },
                `Pre: ${patient.preEclsPaco2}`
              )
            ),
            React.createElement(
              'div',
              { className: 'flex items-baseline justify-between mt-1' },
              React.createElement(
                'div',
                null,
                React.createElement('span', { className: 'text-2xl font-black font-mono text-amber-300' }, telemetry.tcmCo2),
                React.createElement('span', { className: 'text-[10px] font-mono text-amber-200 ml-1' }, 'TCM')
              ),
              React.createElement(
                'div',
                { className: 'text-right' },
                React.createElement('span', { className: 'text-base font-bold font-mono text-yellow-200' }, telemetry.etco2),
                React.createElement('span', { className: 'text-[10px] font-mono text-slate-400 ml-1' }, 'EtCO2')
              )
            ),
            React.createElement(
              'div',
              { className: 'text-[10px] font-mono text-amber-200/90 mt-0.5' },
              `ΔPaCO2 from Pre-ECLS: ${paco2Shift > 0 ? `-${paco2Shift}` : `+${Math.abs(paco2Shift)}`} mmHg`
            )
          )
        ),

        // Tissue Oxygenation: Bifrontal Cerebral NIRS, Somatic NIRS, Continuous SvO2/ScvO2
        React.createElement(
          'div',
          { className: 'bg-slate-950 border border-slate-800 rounded p-2.5 flex-1 flex flex-col justify-between' },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between border-b border-slate-900 pb-1' },
            React.createElement('span', { className: 'text-[10px] font-mono uppercase tracking-wider text-purple-300 font-semibold' }, 'Tissue Oxygenation (NIRS rSO2 & SvO2)'),
            telemetry.nirsLeft < 55 &&
              React.createElement(
                'span',
                { className: 'text-[10px] font-mono bg-rose-900/80 text-rose-200 px-1.5 py-0.2 rounded font-bold' },
                'CEREBRAL DESAT ALERT'
              )
          ),
          React.createElement(
            'div',
            { className: 'grid grid-cols-4 gap-2 pt-1.5 text-center' },
            React.createElement(
              'div',
              { className: 'bg-slate-900/90 rounded p-1.5 border border-slate-800' },
              React.createElement('div', { className: 'text-[10px] font-mono text-purple-300' }, 'Cerebral L'),
              React.createElement(
                'div',
                { className: `text-xl font-black font-mono ${telemetry.nirsLeft < 55 ? 'text-rose-400 animate-pulse' : 'text-purple-300'}` },
                `${telemetry.nirsLeft}%`
              )
            ),
            React.createElement(
              'div',
              { className: 'bg-slate-900/90 rounded p-1.5 border border-slate-800' },
              React.createElement('div', { className: 'text-[10px] font-mono text-purple-300' }, 'Cerebral R'),
              React.createElement(
                'div',
                { className: `text-xl font-black font-mono ${telemetry.nirsRight < 55 ? 'text-rose-400 animate-pulse' : 'text-purple-300'}` },
                `${telemetry.nirsRight}%`
              )
            ),
            React.createElement(
              'div',
              { className: 'bg-slate-900/90 rounded p-1.5 border border-slate-800' },
              React.createElement('div', { className: 'text-[10px] font-mono text-teal-300' }, 'Somatic'),
              React.createElement('div', { className: 'text-xl font-black font-mono text-teal-300' }, `${telemetry.nirsSomatic}%`)
            ),
            React.createElement(
              'div',
              { className: 'bg-slate-900/90 rounded p-1.5 border border-slate-800' },
              React.createElement(
                'div',
                { className: 'text-[10px] font-mono text-fuchsia-300' },
                patient.mode === 'VV' ? 'ScvO2' : 'SvO2'
              ),
              React.createElement(
                'div',
                {
                  className: `text-xl font-black font-mono ${
                    patient.mode === 'VV' && circuit.svo2 >= 88 ? 'text-amber-400 animate-pulse' : 'text-fuchsia-300'
                  }`
                },
                `${circuit.svo2}%`
              )
            )
          )
        )
      )
    )
  );
};
