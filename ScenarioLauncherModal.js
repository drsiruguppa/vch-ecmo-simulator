// Scenario Selection Hub & Clinical Curriculum Launcher Component
// Presents the user with an intuitive case picker before commencing foundational physiology review.

window.ScenarioLauncherModal = function({
  isOpen,
  onClose,
  onSelectScenario,
  scenarios,
  examMode,
  setExamMode,
  onOpenCustomModal
}) {
  if (!isOpen) return null;

  const [selectedFilter, setSelectedFilter] = React.useState('all');

  const getCategoryBadgeClass = (category) => {
    if (!category) return 'bg-slate-800 text-slate-300 border-slate-700';
    if (category.includes('Initiation')) return 'bg-emerald-950/80 text-emerald-300 border-emerald-600/70';
    if (category.includes('Pediatric VA')) return 'bg-sky-950/80 text-sky-300 border-sky-600/70';
    if (category.includes('Hydraulics')) return 'bg-amber-950/80 text-amber-300 border-amber-600/70';
    if (category.includes('Drainage')) return 'bg-rose-950/80 text-rose-300 border-rose-600/70';
    if (category.includes('Recirculation')) return 'bg-purple-950/80 text-purple-300 border-purple-600/70';
    if (category.includes('CO2')) return 'bg-indigo-950/80 text-indigo-300 border-indigo-600/70';
    if (category.includes('E-CPR')) return 'bg-cyan-950/80 text-cyan-300 border-cyan-600/70';
    return 'bg-teal-950/80 text-teal-300 border-teal-600/70';
  };

  const filteredScenarios = (scenarios || []).filter((s) => {
    if (selectedFilter === 'neonate') return s.patient.weightKg < 5.0;
    if (selectedFilter === 'peds') return s.patient.weightKg >= 5.0;
    if (selectedFilter === 'vv') return s.patient.mode === 'VV';
    if (selectedFilter === 'va') return s.patient.mode === 'VA';
    if (selectedFilter === 'emergency') {
      return (
        s.circuit.onEcmo === false ||
        s.category.includes('Hydraulics') ||
        s.category.includes('Drainage') ||
        s.category.includes('Recirculation') ||
        s.category.includes('CO2') ||
        s.id.includes('ecpr')
      );
    }
    return true;
  });

  return React.createElement(
    'div',
    { className: 'fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200' },
    React.createElement(
      'div',
      { className: 'bg-slate-900 border-2 border-sky-500/80 rounded-2xl max-w-5xl w-full p-4 sm:p-6 space-y-4 font-mono text-xs shadow-2xl max-h-[92vh] flex flex-col' },

      // Header Bar
      React.createElement(
        'div',
        { className: 'border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-3' },
        React.createElement(
          'div',
          { className: 'space-y-1' },
          React.createElement(
            'div',
            { className: 'flex items-center gap-2' },
            React.createElement('span', { className: 'px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-black uppercase tracking-wider' }, 'Simulation Case Hub'),
            React.createElement('span', { className: 'text-[11px] font-bold text-emerald-400' }, 'Step 1: Choose Your Scenario')
          ),
          React.createElement('h2', { className: 'text-base sm:text-lg font-black text-white tracking-tight' }, 'Select Clinical Scenario to Begin'),
          React.createElement('p', { className: 'text-[11px] text-slate-400' }, 'Choose an institutional clinical scenario. You will review foundational physiology for your selection before entering Turn 1.')
        ),
        React.createElement(
          'div',
          { className: 'flex flex-wrap items-center gap-2' },
          // Exam Mode Switcher
          React.createElement(
            'button',
            {
              onClick: () => setExamMode(!examMode),
              className: `px-2.5 py-1.5 rounded-lg border cursor-pointer font-bold transition text-[11px] ${
                examMode
                  ? 'bg-purple-950 text-purple-300 border-purple-700'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-700'
              }`
            },
            examMode ? '🔒 Blind Exam Mode' : '🎓 Guided Training Mode'
          ),
          // Custom Scenario Architect Button
          React.createElement(
            'button',
            {
              onClick: () => {
                onClose();
                if (onOpenCustomModal) onOpenCustomModal();
              },
              className: 'px-3 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-600/70 cursor-pointer font-bold flex items-center gap-1.5'
            },
            '✨ Custom Scenario'
          ),
          React.createElement(
            'button',
            {
              onClick: onClose,
              className: 'px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer text-xs'
            },
            '✕ Dismiss'
          )
        )
      ),

      // Filter Pill Bar
      React.createElement(
        'div',
        { className: 'flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5' },
        React.createElement(
          'div',
          { className: 'flex flex-wrap gap-1.5' },
          [
            { id: 'all', label: `All Scenarios (${(scenarios || []).length})` },
            { id: 'neonate', label: '👶 Neonatal (<5 kg)' },
            { id: 'peds', label: '🧒 Pediatric (≥5 kg)' },
            { id: 'vv', label: '🫁 VV ECMO' },
            { id: 'va', label: '🫀 VA ECMO' },
            { id: 'emergency', label: '🚨 Emergency & Alarms' }
          ].map((pill) =>
            React.createElement(
              'button',
              {
                key: pill.id,
                onClick: () => setSelectedFilter(pill.id),
                className: `px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  selectedFilter === pill.id
                    ? 'bg-sky-600 text-white border border-sky-400 shadow'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`
              },
              pill.label
            )
          )
        ),
        React.createElement(
          'span',
          { className: 'text-[11px] text-slate-500 font-mono hidden sm:inline' },
          `Showing ${filteredScenarios.length} cases`
        )
      ),

      // Grid of Scenario Cards
      React.createElement(
        'div',
        { className: 'flex-1 overflow-y-auto pr-1 space-y-3' },
        React.createElement(
          'div',
          { className: 'grid grid-cols-1 md:grid-cols-2 gap-3.5' },
          filteredScenarios.map((s) =>
            React.createElement(
              'div',
              {
                key: s.id,
                className:
                  'bg-slate-950/90 border-2 border-slate-800 hover:border-sky-500/80 rounded-xl p-4 transition-all duration-150 flex flex-col justify-between space-y-3 group shadow-lg hover:shadow-sky-500/10'
              },
              React.createElement(
                'div',
                { className: 'space-y-2' },
                // Header Tags Row
                React.createElement(
                  'div',
                  { className: 'flex flex-wrap items-center justify-between gap-1.5' },
                  React.createElement(
                    'span',
                    { className: `px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getCategoryBadgeClass(s.category)}` },
                    s.category
                  ),
                  React.createElement(
                    'div',
                    { className: 'flex items-center gap-1.5' },
                    React.createElement(
                      'span',
                      {
                        className: `px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${
                          s.patient.mode === 'VV'
                            ? 'bg-sky-950 text-sky-300 border-sky-700'
                            : 'bg-red-950 text-red-300 border-red-700'
                        }`
                      },
                      `${s.patient.mode} ECMO`
                    ),
                    s.circuit.onEcmo === false
                      ? React.createElement(
                          'span',
                          { className: 'px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-700 font-mono animate-pulse' },
                          'STANDBY CLAMPED'
                        )
                      : React.createElement(
                          'span',
                          { className: 'px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono' },
                          'ACTIVE BYPASS'
                        )
                  )
                ),
                // Title
                React.createElement(
                  'h3',
                  { className: 'text-sm font-black text-white group-hover:text-sky-300 transition-colors leading-snug' },
                  examMode && s.blindTitle ? s.blindTitle : s.title
                ),
                // Patient Demographic Specs
                React.createElement(
                  'div',
                  { className: 'flex flex-wrap gap-1 text-[10px] text-slate-400 font-mono' },
                  React.createElement('span', { className: 'bg-slate-900 px-2 py-0.5 rounded border border-slate-800' }, `⚖️ ${s.patient.weightKg} kg (BSA ${s.patient.bsa} m²)`),
                  React.createElement('span', { className: 'bg-slate-900 px-2 py-0.5 rounded border border-slate-800' }, `👶 ${s.patient.ageLabel || 'Pediatric'}`),
                  React.createElement('span', { className: 'bg-slate-900 px-2 py-0.5 rounded border border-slate-800' }, `📐 ${s.patient.tubingSize} Tubing`),
                  React.createElement('span', { className: 'bg-slate-900 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[210px]' }, `🩺 ${s.patient.cannulaDesc}`)
                ),
                // Clinical Briefing Snippet
                React.createElement(
                  'p',
                  { className: 'text-[11px] text-slate-300/90 leading-relaxed line-clamp-2 pt-0.5' },
                  s.handoff || s.brief
                )
              ),
              // Card Action Button
              React.createElement(
                'button',
                {
                  onClick: () => onSelectScenario(s.id),
                  className:
                    'w-full mt-2 py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider shadow cursor-pointer flex items-center justify-center gap-1.5 transition group-hover:bg-sky-400 group-hover:text-slate-950'
                },
                'Select Case & Review Physiology →'
              )
            )
          )
        )
      )
    )
  );
};
