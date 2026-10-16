// Main Application Component with Multi-Agent Subsystems:
// 1. ecmo-bedside-team (Real-Time Multidisciplinary Team Huddle & Hints)
// 2. ecmo-debrief-evaluator (Action-by-Action Attending Debrief & First-Principles Physiology Engine)
// 3. ecmo-scenario-architect (Neonatal & Pediatric Scenario Architect)

window.EcmoSimApp = function() {
  const [selectedScenarioId, setSelectedScenarioId] = React.useState(window.ECMO_SCENARIOS[0].id);
  const [state, setState] = React.useState(() => {
    const s = window.computeDerivedState(window.ECMO_SCENARIOS[0]);
    s.pendingLabs = [];
    s.teamDialogue = [];
    return s;
  });
  const [turnNumber, setTurnNumber] = React.useState(1);
  const [currentPrompt, setCurrentPrompt] = React.useState(window.ECMO_SCENARIOS[0].initialPrompt);
  const [turnOrderInput, setTurnOrderInput] = React.useState('');
  const [showStageHint, setShowStageHint] = React.useState(false);
  const [showTeamCoPilot, setShowTeamCoPilot] = React.useState(true); // Multidisciplinary Team Subagent active!
  const [examMode, setExamMode] = React.useState(true);
  const [isSubmittingTurn, setIsSubmittingTurn] = React.useState(false);

  // Subagent 1: Debrief Evaluator Action History
  const [debriefHistory, setDebriefHistory] = React.useState([]);
  const [showDebriefModal, setShowDebriefModal] = React.useState(false);
  const [showScenarioPickerModal, setShowScenarioPickerModal] = React.useState(true); // Open on launch so user chooses scenario first!
  const [showPhysiologyModal, setShowPhysiologyModal] = React.useState(false); // Opens after scenario is chosen!
  const [showBedsideFeed, setShowBedsideFeed] = React.useState(false);

  const [logs, setLogs] = React.useState([
    {
      turn: 1,
      minute: window.ECMO_SCENARIOS[0].elapsedMinutes,
      time: new Date().toLocaleTimeString(),
      action: 'Bedside Handoff & Turn 1',
      reply: `${window.ECMO_SCENARIOS[0].handoff}\n\n${window.ECMO_SCENARIOS[0].initialPrompt}`
    }
  ]);

  const [showCustomModal, setShowCustomModal] = React.useState(false);
  const [showApiModal, setShowApiModal] = React.useState(false);
  const [showSkillModal, setShowSkillModal] = React.useState(false);

  const [apiKey, setApiKey] = React.useState(() => localStorage.getItem('ECMO_SIM_GEMINI_KEY') || '');
  const [geminiModel, setGeminiModel] = React.useState(() => localStorage.getItem('ECMO_SIM_GEMINI_MODEL') || 'gemini-2.5-flash');
  const [layoutMode, setLayoutMode] = React.useState(() => localStorage.getItem('ECMO_SIM_LAYOUT_MODE') || 'monitors-right');

  // Custom Patient Builder State
  const [customForm, setCustomForm] = React.useState({
    name: 'Custom Patient',
    weightKg: 4.5,
    bsa: 0.27,
    mode: 'VV',
    tubingSize: '1/4"',
    cannulaDesc: '15 Fr (9.7 cm) MC3 Crescent RA via Right IJ',
    preEclsPaco2: 72,
    ventMode: 'CMV',
    pip: 34,
    peep: 12,
    obstructionSite: 0,
    onEcmo: true
  });

  const loadScenario = (scenarioObj) => {
    const cloned = JSON.parse(JSON.stringify(scenarioObj));
    cloned.pendingLabs = [];
    cloned.teamDialogue = [];
    const derived = window.computeDerivedState(cloned);
    derived.pendingLabs = [];
    derived.teamDialogue = [];
    setState(derived);
    setTurnNumber(1);
    setCurrentPrompt(scenarioObj.initialPrompt || 'Bedside Specialist: "Doctor, what are your initial orders and bedside actions?"');
    setTurnOrderInput('');
    setShowStageHint(false);
    setDebriefHistory([]);
    setShowPhysiologyModal(true); // Always prompt user to review physiology prior to starting!
    if (scenarioObj.teamModeDefault) {
      setShowTeamCoPilot(true);
    }
    setLogs([
      {
        turn: 1,
        minute: derived.elapsedMinutes,
        time: new Date().toLocaleTimeString(),
        action: 'Bedside Handoff & Turn 1',
        reply: `${scenarioObj.handoff || scenarioObj.brief}\n\n${scenarioObj.initialPrompt || ''}`
      }
    ]);
  };

  const handleScenarioChange = (id) => {
    setSelectedScenarioId(id);
    const found = window.ECMO_SCENARIOS.find((s) => s.id === id);
    if (found) loadScenario(found);
  };

  const handleUpdateCircuit = (partialCircuit) => {
    setState((prev) => {
      const updated = {
        ...prev,
        circuit: {
          ...prev.circuit,
          ...partialCircuit
        }
      };
      return window.computeDerivedState(updated, 0);
    });
  };

  const handleUpdateVent = (partialVent) => {
    setState((prev) => {
      const updated = {
        ...prev,
        vent: {
          ...prev.vent,
          ...partialVent
        }
      };
      return window.computeDerivedState(updated, 0);
    });
  };

  const handleUpdatePatient = (partialPatient) => {
    setState((prev) => {
      const updated = {
        ...prev,
        patient: {
          ...prev.patient,
          ...partialPatient
        }
      };
      return window.computeDerivedState(updated, 0);
    });
  };

  const handleAdvanceTime = (minutesToAdd) => {
    handleTriggerAction(`Advance ${minutesToAdd} min and reassess telemetry`);
  };

  const handleTriggerAction = async (commandText) => {
    setIsSubmittingTurn(true);
    try {
      const prevStateSnapshot = JSON.parse(JSON.stringify(state));
      const result = await window.processBedsideCommand(commandText, state, apiKey, geminiModel, turnNumber);

      setState(result.nextState);
      setCurrentPrompt(result.specialistReply);

      if (result.isTurnAdvancing) {
        const nextTurn = turnNumber + 1;
        // Subagent 1 (ecmo-debrief-evaluator): Evaluate every intervention & physiological mechanism
        const turnEvaluations = window.evaluateTurnActionForDebrief(
          commandText,
          prevStateSnapshot,
          result.nextState,
          turnNumber
        );

        setDebriefHistory((prev) => [...prev, ...turnEvaluations]);
        setTurnNumber(nextTurn);
        setLogs((oldLogs) => [
          {
            turn: nextTurn,
            minute: result.nextState.elapsedMinutes,
            time: new Date().toLocaleTimeString(),
            action: commandText,
            reply: result.specialistReply
          },
          ...oldLogs
        ]);
      } else {
        // Pure inquiry: Clock and turn number remain paused so user can explore exam/circuit freely
        setLogs((oldLogs) => [
          {
            turn: turnNumber,
            minute: result.nextState.elapsedMinutes,
            time: new Date().toLocaleTimeString(),
            action: `[Bedside Inquiry] ${commandText}`,
            reply: result.specialistReply
          },
          ...oldLogs
        ]);
      }
    } finally {
      setIsSubmittingTurn(false);
    }
  };

  const handleTopTurnSubmit = (e) => {
    e.preventDefault();
    const order = turnOrderInput.trim() || 'Confirm current console dial adjustments and advance turn';
    setTurnOrderInput('');
    handleTriggerAction(order);
  };

  const handleLaunchCustomScenario = (e) => {
    e.preventDefault();
    const baseTemplate = JSON.parse(JSON.stringify(window.ECMO_SCENARIOS[0]));
    baseTemplate.id = 'custom-' + Date.now();
    baseTemplate.title = `Custom Case: ${customForm.name} (${customForm.weightKg} kg, ${customForm.mode} ECMO)`;
    baseTemplate.blindTitle = baseTemplate.title;
    baseTemplate.handoff = `Bedside Handoff: ${customForm.name} (${customForm.weightKg} kg, BSA ${customForm.bsa} m²) initiated on ${customForm.mode} ECMO (${customForm.cannulaDesc}). Pre-ECLS PaCO2 ${customForm.preEclsPaco2} mmHg.`;
    baseTemplate.initialPrompt = 'Bedside Specialist: "Doctor, we are ready at the bedside. What are your initial blood flow, sweep gas, alarm, and ventilator orders?"';
    baseTemplate.elapsedMinutes = 1;
    baseTemplate.patient.name = customForm.name;
    baseTemplate.patient.weightKg = Number(customForm.weightKg);
    baseTemplate.patient.bsa = Number(customForm.bsa);
    baseTemplate.patient.mode = customForm.mode;
    baseTemplate.patient.tubingSize = customForm.tubingSize;
    baseTemplate.patient.cannulaDesc = customForm.cannulaDesc;
    baseTemplate.patient.preEclsPaco2 = Number(customForm.preEclsPaco2);
    baseTemplate.vent.mode = customForm.ventMode;
    baseTemplate.vent.pip = Number(customForm.pip);
    baseTemplate.vent.peep = Number(customForm.peep);
    baseTemplate.vent.hz = customForm.ventMode === 'VDR4' ? 425 : 0;
    baseTemplate.circuit.obstructionSite = Number(customForm.obstructionSite);
    baseTemplate.circuit.obstructionSeverity = Number(customForm.obstructionSite) > 0 ? 0.75 : 0;
    const isOnEcmo = customForm.onEcmo !== false;
    baseTemplate.circuit.onEcmo = isOnEcmo;
    if (!isOnEcmo) {
      baseTemplate.circuit.rpm = 0;
      baseTemplate.circuit.flowLpm = 0;
      baseTemplate.circuit.sweepLpm = 0;
      baseTemplate.elapsedMinutes = 0;
      baseTemplate.handoff = `Bedside Handoff: ${customForm.name} (${customForm.weightKg} kg, BSA ${customForm.bsa} m²) prepped for ${customForm.mode} ECMO cannulation (${customForm.cannulaDesc}). Circuit primed & clamped on standby. Pre-ECLS PaCO2 ${customForm.preEclsPaco2} mmHg.`;
      baseTemplate.initialPrompt = 'Bedside Specialist & Surgeon: "The patient is prepped and circuit is primed on STANDBY (0 RPM, clamped). What are your pre-cannulation checklist and initiation orders to place the patient on ECMO?"';
    }

    loadScenario(baseTemplate);
    setShowCustomModal(false);
  };

  const saveApiSettings = () => {
    localStorage.setItem('ECMO_SIM_GEMINI_KEY', apiKey);
    localStorage.setItem('ECMO_SIM_GEMINI_MODEL', geminiModel);
    setShowApiModal(false);
  };

  const activeScenarioObj = window.ECMO_SCENARIOS.find((s) => s.id === selectedScenarioId) || window.ECMO_SCENARIOS[0];
  const stages = activeScenarioObj.stages || [];
  const activeStage = stages[Math.min(stages.length - 1, Math.floor((turnNumber - 1) / 2))] || stages[0];

  // Subagent 2 (ecmo-bedside-team): Live Multidisciplinary Team Huddle Cues
  const teamCues = window.generateBedsideTeamHuddle(state);

  const goodActionsCount = debriefHistory.filter((d) => d.verdict === 'GOOD').length;
  const cautionActionsCount = debriefHistory.filter((d) => d.verdict === 'CAUTION').length;
  const badActionsCount = debriefHistory.filter((d) => d.verdict === 'BAD').length;

  return React.createElement(
    'div',
    { className: 'min-h-screen bg-slate-950 text-slate-100 flex flex-col' },

    // Top Application Bar
    React.createElement(
      'header',
      { className: 'bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-lg' },
      React.createElement(
        'div',
        { className: 'flex items-center gap-3' },
        React.createElement(
          'div',
          { className: 'w-9 h-9 rounded-lg bg-gradient-to-br from-rose-600 to-sky-600 flex items-center justify-center font-black text-white shadow' },
          'EC'
        ),
        React.createElement(
          'div',
          null,
          React.createElement(
            'h1',
            { className: 'text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-2' },
            'Pediatric & Neonatal ECMO / E-CPR Simulation Engine',
            React.createElement(
              'span',
              { className: 'text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
              `Turn ${turnNumber} • Min ${state.elapsedMinutes}`
            )
          ),
          React.createElement(
            'p',
            { className: 'text-[11px] text-slate-400 font-mono' },
            'Multi-Agent Team Simulation • Bedside Team Co-Pilot • Scenario Architect • Attending Debrief'
          )
        )
      ),

      // Right Controls: Scenario Picker, Subagent Buttons
      React.createElement(
        'div',
        { className: 'flex flex-wrap items-center gap-2' },
        React.createElement(
          'button',
          {
            onClick: () => setShowScenarioPickerModal(true),
            className: 'text-xs font-mono px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold shadow cursor-pointer flex items-center gap-1.5 transition'
          },
          '🗂️ Choose Scenario'
        ),
        React.createElement(
          'select',
          {
            value: selectedScenarioId,
            onChange: (e) => handleScenarioChange(e.target.value),
            className: 'bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-500 cursor-pointer max-w-xs'
          },
          window.ECMO_SCENARIOS.map((s) =>
            React.createElement('option', { key: s.id, value: s.id }, examMode && s.blindTitle ? s.blindTitle : s.title)
          )
        ),
        React.createElement(
          'button',
          {
            onClick: () => loadScenario(activeScenarioObj),
            className: 'text-xs font-mono px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer'
          },
          '↺ Restart'
        ),
        // Subagent: Pre-Simulation Physiology Refresher
        React.createElement(
          'button',
          {
            onClick: () => setShowPhysiologyModal(true),
            className: 'text-xs font-mono px-3 py-1.5 rounded-lg bg-sky-900/90 hover:bg-sky-800 text-sky-200 border border-sky-600/70 font-bold shadow cursor-pointer flex items-center gap-1.5'
          },
          '🧠 Physiology Briefing'
        ),
        // Subagent 3: Scenario Architect Button
        React.createElement(
          'button',
          {
            onClick: () => setShowCustomModal(true),
            className: 'text-xs font-mono px-2.5 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/70 font-bold cursor-pointer'
          },
          '✨ Scenario Architect'
        ),
        // Subagent 1: Attending Debrief Evaluator Button
        React.createElement(
          'button',
          {
            onClick: () => setShowDebriefModal(true),
            className: 'text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow cursor-pointer'
          },
          `🎓 Attending Debrief (${debriefHistory.length})`
        ),
        React.createElement(
          'button',
          {
            onClick: () => setShowSkillModal(true),
            className: 'text-xs font-mono px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer'
          },
          '📖 SKILL.md'
        ),
        React.createElement(
          'button',
          {
            onClick: () => setShowApiModal(true),
            className: `text-xs font-mono px-2.5 py-1.5 rounded-lg border cursor-pointer ${
              apiKey
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`
          },
          apiKey ? '🤖 Gemini AI: ON' : '🔑 AI Key'
        ),
        // Layout Mode Switcher (Monitors Right vs Monitors Left)
        React.createElement(
          'button',
          {
            onClick: () => {
              const nextMode = layoutMode === 'monitors-right' ? 'monitors-left' : 'monitors-right';
              setLayoutMode(nextMode);
              localStorage.setItem('ECMO_SIM_LAYOUT_MODE', nextMode);
            },
            title: 'Swap side-by-side screen layout: Monitors on Right ↔ Monitors on Left',
            className: 'text-xs font-mono px-2.5 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 text-sky-200 border border-sky-600/70 font-bold cursor-pointer flex items-center gap-1.5 shadow'
          },
          layoutMode === 'monitors-right' ? '⇄ Monitors: RIGHT 💻' : '⇄ Monitors: LEFT 📊'
        )
      )
    ),

    // Main Workspace Content (Side-by-Side Dual Pane Layout)
    React.createElement(
      'main',
      { className: 'flex-1 p-3 sm:p-4 max-w-[1780px] w-full mx-auto' },
      React.createElement(
        'div',
        { className: 'grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-start' },

        // COLUMN A: USER WORKSTATION (Turn Prompt, Multidisciplinary Team Huddle, Order Form, Workstation Tabs)
        React.createElement(
          'div',
          {
            className: `w-full space-y-3.5 xl:col-span-6 ${
              layoutMode === 'monitors-right' ? 'order-1' : 'order-2'
            }`
          },

          // PROMINENT INTERACTIVE BEDSIDE SIMULATION TURN PROMPT, TEAM CO-PILOT & ORDER BAR
          React.createElement(
            'div',
            { className: 'bg-gradient-to-r from-slate-900 via-sky-950/50 to-slate-900 border-2 border-sky-600/70 rounded-xl p-3.5 shadow-xl space-y-2.5 font-mono' },
        // Handoff & Stage Row
        React.createElement(
          'div',
          { className: 'flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2' },
          React.createElement(
            'div',
            { className: 'flex items-center gap-2' },
            React.createElement(
              'span',
              { className: 'px-2 py-0.5 rounded bg-sky-500 text-slate-950 font-black text-xs uppercase' },
              `TURN ${turnNumber} (Min ${state.elapsedMinutes})`
            ),
            React.createElement(
              'span',
              { className: 'text-xs font-bold text-sky-300' },
              examMode && activeScenarioObj.blindTitle ? activeScenarioObj.blindTitle : activeScenarioObj.title
            )
          ),
          React.createElement(
            'div',
            { className: 'flex flex-wrap items-center gap-2' },
            // Subagent 2 Toggle: Multidisciplinary Team Co-Pilot
            React.createElement(
              'button',
              {
                onClick: () => setShowTeamCoPilot(!showTeamCoPilot),
                className: `text-[11px] px-2.5 py-0.5 rounded border font-bold cursor-pointer ${
                  showTeamCoPilot
                    ? 'bg-teal-900/90 text-teal-200 border-teal-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`
              },
              showTeamCoPilot ? '🤝 Bedside Team Co-Pilot: ACTIVE' : '🤝 Enable Bedside Team Hints'
            ),
            React.createElement(
              'button',
              {
                onClick: () => setShowPhysiologyModal(true),
                className: 'text-[11px] px-2.5 py-0.5 rounded bg-sky-950/80 hover:bg-sky-900 text-sky-200 border border-sky-600/70 font-semibold cursor-pointer flex items-center gap-1'
              },
              '🧠 Review Physiology'
            ),
            React.createElement(
              'button',
              {
                onClick: () => {
                  const b = window.generateScenarioPhysiologyBriefing(activeScenarioObj);
                  window.downloadBriefingMarkdown(b, activeScenarioObj);
                },
                title: 'Download pre-scenario foundational physiology review (.md)',
                className: 'text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-semibold cursor-pointer flex items-center gap-1 font-mono transition'
              },
              '📥 Download Briefing'
            ),
            activeStage &&
              React.createElement(
                'button',
                {
                  onClick: () => setShowStageHint(!showStageHint),
                  className: 'text-[11px] px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer'
                },
                showStageHint ? '🙈 Hide Stage Goal' : '💡 Stage Goal'
              ),
            React.createElement(
              'button',
              {
                onClick: () => setShowBedsideFeed(!showBedsideFeed),
                className: `text-[11px] px-2.5 py-0.5 rounded border font-bold cursor-pointer ${
                  showBedsideFeed
                    ? 'bg-indigo-900/90 text-indigo-200 border-indigo-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`
              },
              showBedsideFeed ? '📜 History: OPEN' : `📜 Turn History (${logs.length})`
            ),
            React.createElement(
              'button',
              {
                onClick: () => setExamMode(!examMode),
                className: `text-[11px] px-2.5 py-0.5 rounded border cursor-pointer ${
                  examMode
                    ? 'bg-purple-950 text-purple-300 border-purple-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                }`
              },
              examMode ? '🔒 Blind Console Mode' : '🎓 Guided Console Mode'
            )
          )
        ),

        // Optional Expandable Bedside Action & Communication History
        showBedsideFeed &&
          React.createElement(
            'div',
            { className: 'bg-slate-950/95 border border-indigo-700/60 rounded-lg p-2.5 space-y-2 max-h-56 overflow-y-auto' },
            React.createElement(
              'div',
              { className: 'flex justify-between items-center text-[10px] text-indigo-300 font-bold uppercase tracking-wider border-b border-slate-800 pb-1' },
              React.createElement('span', null, `Bedside Action & Specialist Turn History (${logs.length} entries)`),
              React.createElement('button', { onClick: () => setShowBedsideFeed(false), className: 'text-slate-400 hover:text-white cursor-pointer' }, '✕ Close')
            ),
            logs.map((entry, idx) =>
              React.createElement(
                'div',
                { key: idx, className: 'bg-slate-900/90 border border-slate-800 rounded p-2 text-xs space-y-1' },
                React.createElement(
                  'div',
                  { className: 'flex justify-between text-[10px] text-slate-400 border-b border-slate-800/60 pb-1' },
                  React.createElement('span', { className: 'text-sky-400 font-bold' }, `Turn ${entry.turn || idx + 1} (Min ${entry.minute}): ${entry.action}`),
                  React.createElement('span', null, entry.time)
                ),
                React.createElement('div', { className: 'text-slate-200 leading-snug whitespace-pre-wrap' }, entry.reply)
              )
            )
          ),

        // Handoff Stem
        React.createElement(
          'div',
          { className: 'text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-2.5 rounded border border-slate-800' },
          activeScenarioObj.handoff || activeScenarioObj.brief
        ),

        // Current Bedside Specialist Question / Prompt
        React.createElement(
          'div',
          { className: 'bg-slate-950 border-l-4 border-emerald-400 p-3 rounded-r text-xs sm:text-sm text-emerald-200 font-semibold whitespace-pre-wrap leading-relaxed' },
          currentPrompt
        ),

        // SUBAGENT 2: Multidisciplinary Bedside Team Real-Time Input ("ECMO is a Team Sport")
        showTeamCoPilot &&
          teamCues.length > 0 &&
          React.createElement(
            'div',
            { className: 'bg-slate-950/90 border border-teal-700/60 rounded-lg p-2.5 space-y-1.5' },
            React.createElement(
              'div',
              { className: 'text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center justify-between' },
              React.createElement('span', null, '🤝 Real-Time Multidisciplinary Bedside Team Input (ecmo-bedside-team subagent)'),
              React.createElement('span', { className: 'text-slate-400' }, 'Perfusionist • PICU RN • RT • Surgeon/Echo')
            ),
            React.createElement(
              'div',
              { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
              teamCues.map((cue, idx) =>
                React.createElement(
                  'div',
                  {
                    key: idx,
                    className: 'bg-slate-900/90 border border-slate-800 rounded p-2.5 text-xs space-y-2 flex flex-col justify-between'
                  },
                  React.createElement(
                    'div',
                    { className: 'space-y-1.5' },
                    React.createElement(
                      'div',
                      { className: 'flex items-center justify-between gap-1 flex-wrap' },
                      React.createElement(
                        'span',
                        { className: `inline-block text-[10px] px-2 py-0.5 rounded border font-bold ${cue.badgeColor}` },
                        cue.role
                      ),
                      cue.roleTag &&
                        React.createElement(
                          'button',
                          {
                            type: 'button',
                            onClick: () => {
                              setTurnOrderInput(`@${cue.roleTag} `);
                            },
                            className:
                              'text-[10px] font-mono font-semibold text-sky-300 hover:text-white bg-sky-950/70 hover:bg-sky-900 px-2 py-0.5 rounded border border-sky-700/60 transition cursor-pointer'
                          },
                          `💬 Reply @${cue.roleTag}`
                        )
                    ),
                    React.createElement('p', { className: 'text-slate-200 leading-snug' }, cue.message)
                  ),
                  cue.quickReplyPrompt &&
                    React.createElement(
                      'div',
                      { className: 'pt-1.5 border-t border-slate-800/80' },
                      React.createElement(
                        'button',
                        {
                          type: 'button',
                          disabled: isSubmittingTurn,
                          onClick: () => handleTriggerAction(cue.quickReplyPrompt),
                          className:
                            'w-full text-[11px] font-mono font-bold text-center py-1 px-2 rounded bg-teal-950/80 hover:bg-teal-900 text-teal-300 hover:text-white border border-teal-700/80 hover:border-teal-400 transition cursor-pointer shadow-sm'
                        },
                        cue.quickReplyLabel || `⚡ Execute Order (${cue.quickReplyPrompt})`
                      )
                    )
                )
              )
            )
          ),

        // Optional Stage Hint
        showStageHint &&
          activeStage &&
          React.createElement(
            'div',
            { className: 'bg-amber-950/60 border border-amber-600/60 rounded p-2.5 text-xs text-amber-200' },
            `🎯 Stage Objective (${activeStage.name}): ${activeStage.promptHint}`
          ),

        // Unified Rapid Bedside Order Pills (Consolidated into Primary Command Console)
        React.createElement(
          'div',
          { className: 'space-y-1.5 pt-1 border-t border-slate-800/80' },
          React.createElement(
            'div',
            { className: 'flex flex-wrap items-center justify-between gap-1 text-[11px]' },
            React.createElement('span', { className: 'font-bold text-sky-300 uppercase tracking-wider text-[10px]' }, '⚡ Quick Bedside Orders & Actions (Click to Run):'),
            React.createElement('span', { className: 'text-slate-500 text-[10px]' }, 'Or type custom orders below')
          ),
          React.createElement(
            'div',
            { className: 'flex flex-wrap gap-1.5' },
            [
              { label: '⏱️ Intensivist Time-Out', order: 'Perform Intensivist Time-Out Script and review cannula checklist' },
              { label: '🩻 Check Echo for Cannula & Wire', order: 'Check Echo and Fluoro to verify guide wire position and cannula tip' },
              { label: '🛡️ Activate QWS Run Alarms', order: 'Activate Spectrum QWS ECLS Run safety alarms' },
              { label: '💉 Heparin Bolus (75 U/kg)', order: 'Administer surgeon-directed heparin bolus 75 U/kg IV' },
              { label: '🩸 Transfuse 15 mL/kg PRBCs', order: 'Order STAT transfusion of 15 mL/kg fresh PRBCs' },
              { label: '🩸 Platelets (Peripheral Line)', order: 'Infuse platelets via peripheral line far from venous cannula' },
              { label: '🧪 STAT ABG & Coags', order: 'Draw STAT post-initiation ABG, ACT, anti-Xa, AT3, and fibrinogen' },
              { label: '🫁 Box D Wean (32/12)', order: 'Wean PIP to 32 and PEEP to 12 cmH2O immediately per Box D' },
              { label: '🔄 Reposition Cannula', order: 'Reposition cannula under Echo guidance' }
            ].map((pill, pIdx) =>
              React.createElement(
                'button',
                {
                  key: pIdx,
                  type: 'button',
                  disabled: isSubmittingTurn,
                  onClick: () => handleTriggerAction(pill.order),
                  className:
                    'text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-900/90 hover:bg-sky-950 text-sky-300 border border-slate-700 hover:border-sky-500 transition cursor-pointer shadow-sm hover:text-white'
                },
                pill.label
              )
            )
          )
        ),

        // Interactive Bedside Team Inquiries (Ask RN, Perfusionist, RT on Exam or Interventions)
        React.createElement(
          'div',
          { className: 'space-y-1 pt-1 border-t border-slate-800/80' },
          React.createElement(
            'div',
            { className: 'flex flex-wrap items-center justify-between gap-1 text-[11px]' },
            React.createElement(
              'span',
              { className: 'font-bold text-teal-300 uppercase tracking-wider text-[10px]' },
              '🗣️ Ask Bedside Team (Exam & Circuit Inquiries):'
            ),
            React.createElement(
              'span',
              { className: 'text-emerald-400 font-mono font-bold text-[10px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800' },
              '⏱️ Clock Paused: Inquiries do not consume turns'
            )
          ),
          React.createElement(
            'div',
            { className: 'flex flex-wrap gap-1.5' },
            [
              { label: '👁️ Pupils & Neuro Exam', inquiry: 'Ask RN: check pupils, fontanelle, and neurological exam' },
              { label: '🫁 Breath Sounds & ETT', inquiry: 'Ask RT and RN: auscultate breath sounds, check chest rise, and suction ETT' },
              { label: '⏱️ CRT & Pulses', inquiry: 'Ask RN: check capillary refill time, peripheral pulses, and limb perfusion' },
              { label: '🩺 Cannula Site Dressing', inquiry: 'Ask RN & Surgeon: inspect right neck cannulation dressing for bleeding or oozing' },
              { label: '💧 Urine Output / Foley', inquiry: 'Ask RN: what is the urine output in the past hour and fluid balance?' },
              { label: '🔒 Bridge Clamp Check', inquiry: 'Ask Perfusionist: is the bridge clamped and isolated?' },
              { label: '🔍 Oxygenator Clot Check', inquiry: 'Ask Perfusionist: inspect oxygenator headers and check sweep exhaust for clots' },
              { label: '🌊 Venous Line Chatter', inquiry: 'Ask Perfusionist: check venous line for chatter and evaluate P_in' },
              { label: '🌡️ Water Bath Temp', inquiry: 'Ask Perfusionist: check heater-cooler water bath and circuit blood temp' },
              { label: '🧪 Lab Status & Standby', inquiry: 'Ask RN: check lab status and are blood gases ready?' }
            ].map((item, iIdx) =>
              React.createElement(
                'button',
                {
                  key: iIdx,
                  type: 'button',
                  disabled: isSubmittingTurn,
                  onClick: () => handleTriggerAction(item.inquiry),
                  className:
                    'text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-900/90 hover:bg-teal-950 text-teal-300 border border-teal-800 hover:border-teal-400 transition cursor-pointer shadow-sm hover:text-white'
                },
                item.label
              )
            )
          )
        ),

        // Interactive Order Input Form ("What are your actions, Doctor?")
        React.createElement(
          'form',
          { onSubmit: handleTopTurnSubmit, className: 'flex flex-col sm:flex-row gap-2 pt-1' },
          React.createElement('input', {
            type: 'text',
            value: turnOrderInput,
            onChange: (e) => setTurnOrderInput(e.target.value),
            placeholder:
              'Address team members (e.g. "@perfusionist switch to run alarms", "@rt yes, wean vent", "@rn check pupils") or type orders...',
            className:
              'flex-1 bg-slate-950 border-2 border-sky-500/60 focus:border-sky-400 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none shadow-inner'
          }),
          React.createElement(
            'button',
            {
              type: 'submit',
              disabled: isSubmittingTurn,
              className:
                'px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wide transition cursor-pointer shadow-lg'
            },
            isSubmittingTurn
              ? 'Processing...'
              : `▶ Progress Turn (Min ${state.elapsedMinutes} → ${state.elapsedMinutes + (state.elapsedMinutes < 15 ? 3 : 5)})`
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => setShowDebriefModal(true),
              className:
                'px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm uppercase tracking-wide transition cursor-pointer shadow-lg'
            },
            '🎓 End & Debrief'
          )
        )
      ),

          // Clinical Workstation Tabs (inside Workstation Column)
          React.createElement(window.ClinicalWorkstation, {
            state,
            logs,
            onUpdateCircuit: handleUpdateCircuit,
            onUpdateVent: handleUpdateVent,
            onUpdatePatient: handleUpdatePatient,
            onTriggerAction: handleTriggerAction,
            examMode,
            setExamMode
          })
        ),

        // COLUMN B: MONITORING SUITE (Bedside Telemetry Monitor + Spectrum Quantum Console)
        React.createElement(
          'div',
          {
            className: `w-full space-y-3.5 xl:col-span-6 xl:sticky xl:top-3.5 ${
              layoutMode === 'monitors-right' ? 'order-2' : 'order-1'
            }`
          },
          // 1. Bedside Telemetry Monitor
          React.createElement(window.TelemetryMonitor, {
            state,
            onAdvanceTime: handleAdvanceTime
          }),

          // 2. Spectrum Medical Quantum Elite Console (QWS)
          React.createElement(window.QuantumConsole, {
            state,
            onUpdateCircuit: handleUpdateCircuit,
            onTriggerAction: handleTriggerAction,
            examMode
          })
        )
      )
    ),

    // MODAL A: SUBAGENT 1 (ecmo-debrief-evaluator) — End-of-Scenario Action-by-Action Attending Debrief
    showDebriefModal &&
      React.createElement(
        'div',
        { className: 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4' },
        React.createElement(
          'div',
          { className: 'bg-slate-900 border-2 border-emerald-600/80 rounded-xl max-w-4xl w-full p-5 space-y-4 font-mono text-xs shadow-2xl max-h-[90vh] flex flex-col' },
          React.createElement(
            'div',
            { className: 'flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-3' },
            React.createElement(
              'div',
              null,
              React.createElement(
                'h2',
                { className: 'text-sm sm:text-base font-black text-emerald-400 uppercase' },
                '🎓 Attending Debrief & First-Principles Physiology Review (ecmo-debrief-evaluator)'
              ),
              React.createElement(
                'p',
                { className: 'text-[11px] text-slate-400' },
                `${state.patient.name} • ${state.patient.mode} ECMO • ${turnNumber} Turns Completed (Minute ${state.elapsedMinutes})`
              )
            ),
            React.createElement(
              'button',
              { onClick: () => setShowDebriefModal(false), className: 'px-3 py-1 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer' },
              '✕ Close Debrief'
            )
          ),

          // Summary Stats Banner
          React.createElement(
            'div',
            { className: 'grid grid-cols-3 gap-3 text-center' },
            React.createElement(
              'div',
              { className: 'bg-emerald-950/60 border border-emerald-700/60 rounded-lg p-2.5' },
              React.createElement('div', { className: 'text-2xl font-black text-emerald-400' }, goodActionsCount),
              React.createElement('div', { className: 'text-[10px] text-emerald-200 uppercase' }, '✅ Optimal / Protocol-Adherent Actions')
            ),
            React.createElement(
              'div',
              { className: 'bg-amber-950/60 border border-amber-700/60 rounded-lg p-2.5' },
              React.createElement('div', { className: 'text-2xl font-black text-amber-400' }, cautionActionsCount),
              React.createElement('div', { className: 'text-[10px] text-amber-200 uppercase' }, '⚠️ Suboptimal / Timing Cautions')
            ),
            React.createElement(
              'div',
              { className: 'bg-rose-950/60 border border-rose-700/60 rounded-lg p-2.5' },
              React.createElement('div', { className: 'text-2xl font-black text-rose-400' }, badActionsCount),
              React.createElement('div', { className: 'text-[10px] text-rose-200 uppercase' }, '❌ Hazardous Protocol Deviations')
            )
          ),

          // Action-by-Action Physiological Breakdown
          React.createElement(
            'div',
            { className: 'flex-1 overflow-y-auto space-y-3 pr-2' },
            React.createElement(
              'div',
              { className: 'text-xs font-bold text-sky-300 uppercase tracking-wider' },
              '1. Chronological Action-by-Action Evaluation & Physiological Mechanisms:'
            ),
            debriefHistory.length === 0
              ? React.createElement(
                  'div',
                  { className: 'bg-slate-950 border border-slate-800 rounded p-4 text-slate-400 text-center' },
                  'No turns submitted yet in this run. Submit bedside orders or console adjustments during the scenario to populate your action-by-action physiological debrief!'
                )
              : debriefHistory.map((item, idx) =>
                  React.createElement(
                    'div',
                    {
                      key: idx,
                      className: `p-3.5 rounded-lg border space-y-1.5 ${
                        item.verdict === 'GOOD'
                          ? 'bg-emerald-950/30 border-emerald-700/60'
                          : item.verdict === 'CAUTION'
                          ? 'bg-amber-950/40 border-amber-600/70'
                          : 'bg-rose-950/50 border-rose-600/80'
                      }`
                    },
                    React.createElement(
                      'div',
                      { className: 'flex flex-wrap items-center justify-between gap-2' },
                      React.createElement(
                        'span',
                        { className: 'font-bold text-white text-xs sm:text-sm' },
                        `Turn ${item.turn} (Min ${item.minute}): ${item.action}`
                      ),
                      React.createElement(
                        'span',
                        {
                          className: `text-[11px] px-2 py-0.5 rounded font-bold ${
                            item.verdict === 'GOOD'
                              ? 'bg-emerald-900 text-emerald-200'
                              : item.verdict === 'CAUTION'
                              ? 'bg-amber-900 text-amber-200'
                              : 'bg-rose-900 text-rose-200'
                          }`
                        },
                        item.verdictLabel
                      )
                    ),
                    React.createElement('div', { className: 'text-slate-200 font-semibold' }, `Attending Feedback: ${item.feedback}`),
                    React.createElement(
                      'div',
                      { className: 'text-sky-200/90 bg-slate-950/80 p-2.5 rounded border border-slate-800 leading-relaxed' },
                      `🔬 ${item.physiology}`
                    )
                  )
                ),

            // Final State Protocol Checklist Summary
            React.createElement(
              'div',
              { className: 'text-xs font-bold text-sky-300 uppercase tracking-wider pt-2' },
              '2. End-of-Run Institutional Protocol Checklist Status:'
            ),
            React.createElement(
              'div',
              { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
              state.protocolChecks.map((chk) =>
                React.createElement(
                  'div',
                  {
                    key: chk.id,
                    className: `p-2.5 rounded border ${
                      chk.passed
                        ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-800/70 text-rose-200'
                    }`
                  },
                  React.createElement('div', { className: 'font-bold' }, `${chk.passed ? '✅' : '❌'} ${chk.title}`),
                  React.createElement('div', { className: 'text-[11px] text-slate-300 mt-0.5' }, chk.detail)
                )
              )
            )
          )
        )
      ),

    // MODAL B: SUBAGENT 3 (ecmo-scenario-architect) — Neonatal & Pediatric Scenario Architect + Custom Builder
    showCustomModal &&
      React.createElement(
        'div',
        { className: 'fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4' },
        React.createElement(
          'div',
          { className: 'bg-slate-900 border border-indigo-600/70 rounded-xl max-w-2xl w-full p-5 space-y-4 font-mono text-xs shadow-2xl max-h-[90vh] overflow-y-auto' },
          React.createElement(
            'div',
            { className: 'flex justify-between items-center border-b border-slate-800 pb-2.5' },
            React.createElement(
              'h2',
              { className: 'text-sm font-bold text-indigo-300 uppercase' },
              '✨ Neonatal & Pediatric Scenario Architect Subagent (ecmo-scenario-architect)'
            ),
            React.createElement(
              'button',
              { onClick: () => setShowCustomModal(false), className: 'text-slate-400 hover:text-white cursor-pointer' },
              '✕'
            )
          ),

          // Quick Archetype Generator Cards
          React.createElement(
            'div',
            { className: 'space-y-2' },
            React.createElement(
              'div',
              { className: 'text-xs font-bold text-sky-300' },
              '1. Instant Subagent-Architected Clinical Cases (Click to Generate & Launch):'
            ),
            React.createElement(
              'div',
              { className: 'grid grid-cols-1 gap-2' },
              (window.ARCHETYPE_TEMPLATES || []).map((arch) =>
                React.createElement(
                  'button',
                  {
                    key: arch.id,
                    onClick: () => {
                      const built = arch.build();
                      loadScenario(built);
                      setShowCustomModal(false);
                    },
                    className:
                      'p-3 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/60 text-left text-indigo-100 font-bold transition cursor-pointer flex items-center justify-between'
                  },
                  React.createElement('span', null, `✨ ${arch.label}`),
                  React.createElement('span', { className: 'text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white' }, 'Launch Case →')
                )
              )
            )
          ),

          // Custom Parameter Scenario Builder
          React.createElement(
            'form',
            { onSubmit: handleLaunchCustomScenario, className: 'space-y-3 border-t border-slate-800 pt-3' },
            React.createElement(
              'div',
              { className: 'text-xs font-bold text-sky-300' },
              '2. Build Custom Patient & Pathology Parameters:'
            ),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-3' },
              React.createElement(
                'div',
                null,
                React.createElement('label', { className: 'block text-slate-400 mb-1' }, 'Patient Name / Age'),
                React.createElement('input', {
                  type: 'text',
                  value: customForm.name,
                  onChange: (e) => setCustomForm({ ...customForm, name: e.target.value }),
                  className: 'w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white'
                })
              ),
              React.createElement(
                'div',
                null,
                React.createElement('label', { className: 'block text-slate-400 mb-1' }, 'ECMO Mode'),
                React.createElement(
                  'select',
                  {
                    value: customForm.mode,
                    onChange: (e) => setCustomForm({ ...customForm, mode: e.target.value }),
                    className: 'w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white'
                  },
                  React.createElement('option', { value: 'VV' }, 'VV ECMO (1.2–1.5 L/min/m²)'),
                  React.createElement('option', { value: 'VA' }, 'VA ECMO (2.0–2.5 L/min/m²)')
                )
              ),
              React.createElement(
                'div',
                null,
                React.createElement('label', { className: 'block text-slate-400 mb-1' }, 'Weight (kg)'),
                React.createElement('input', {
                  type: 'number',
                  step: '0.1',
                  value: customForm.weightKg,
                  onChange: (e) => {
                    const w = Number(e.target.value);
                    const estBsa = +Math.pow((w * 4 + 7) / (w + 90), 1).toFixed(2);
                    setCustomForm({
                      ...customForm,
                      weightKg: w,
                      bsa: estBsa,
                      tubingSize: w < 15 ? '1/4"' : '3/8"'
                    });
                  },
                  className: 'w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white'
                })
              ),
              React.createElement(
                'div',
                null,
                React.createElement('label', { className: 'block text-slate-400 mb-1' }, 'BSA (m²)'),
                React.createElement('input', {
                  type: 'number',
                  step: '0.01',
                  value: customForm.bsa,
                  onChange: (e) => setCustomForm({ ...customForm, bsa: Number(e.target.value) }),
                  className: 'w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white'
                })
              ),
              React.createElement(
                'div',
                null,
                React.createElement('label', { className: 'block text-slate-400 mb-1' }, 'Pre-ECLS PaCO2 (mmHg)'),
                React.createElement('input', {
                  type: 'number',
                  value: customForm.preEclsPaco2,
                  onChange: (e) => setCustomForm({ ...customForm, preEclsPaco2: Number(e.target.value) }),
                  className: 'w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white'
                })
              ),
              React.createElement(
                'div',
                null,
                React.createElement('label', { className: 'block text-slate-400 mb-1' }, 'Hidden Circuit Obstruction (Optional)'),
                React.createElement(
                  'select',
                  {
                    value: customForm.obstructionSite,
                    onChange: (e) => setCustomForm({ ...customForm, obstructionSite: Number(e.target.value) }),
                    className: 'w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white'
                  },
                  React.createElement('option', { value: 0 }, 'None (Unobstructed)'),
                  React.createElement('option', { value: 1 }, 'Site 1: Venous Cannula / Pre-Pump Suction'),
                  React.createElement('option', { value: 2 }, 'Site 2: Pump Head Occlusion'),
                  React.createElement('option', { value: 3 }, 'Site 3: Conduit Limb (Pump -> Oxy)'),
                  React.createElement('option', { value: 4 }, 'Site 4: Oxygenator Thrombosis (High TMP)'),
                  React.createElement('option', { value: 5 }, 'Site 5: Arterial Return Limb Kink')
                )
              )
            ),
            React.createElement(
              'div',
              { className: 'p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between' },
              React.createElement(
                'div',
                null,
                React.createElement('div', { className: 'text-xs font-bold text-slate-200' }, 'Patient Status at Scenario Start'),
                React.createElement('div', { className: 'text-[11px] text-slate-400' }, customForm.onEcmo ? 'Placed on ECMO (Live console gauges)' : 'Pre-Cannulation (Circuit clamped on Standby)')
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => setCustomForm({ ...customForm, onEcmo: !customForm.onEcmo }),
                  className: `px-3 py-1 rounded text-xs font-bold font-mono border cursor-pointer ${
                    customForm.onEcmo
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                      : 'bg-amber-950/80 text-amber-300 border-amber-700'
                  }`
                },
                customForm.onEcmo ? 'Active on ECMO' : 'Pre-Cannulation Standby'
              )
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { className: 'block text-slate-400 mb-1' }, 'Cannula Profile (from SKILL.md)'),
              React.createElement(
                'select',
                {
                  value: customForm.cannulaDesc,
                  onChange: (e) => setCustomForm({ ...customForm, cannulaDesc: e.target.value }),
                  className: 'w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white'
                },
                React.createElement('option', { value: '13 Fr (8.9 cm) MC3 Crescent RA via Right IJ' }, 'MC3 Crescent RA Dual-Lumen VV — 13 Fr (8.9 cm)'),
                React.createElement('option', { value: '15 Fr (9.7 cm) MC3 Crescent RA via Right IJ' }, 'MC3 Crescent RA Dual-Lumen VV — 15 Fr (9.7 cm)'),
                React.createElement('option', { value: '19 Fr (14.5 cm) MC3 Crescent RA via Right IJ' }, 'MC3 Crescent RA Dual-Lumen VV — 19 Fr (14.5 cm)'),
                React.createElement('option', { value: '24 Fr (30 cm) MC3 Crescent Bicaval via Right IJ' }, 'MC3 Crescent Bicaval VV — 24 Fr (30 cm)'),
                React.createElement('option', { value: '15 Fr Venous (Right IJ) / 10 Fr Arterial (Right Carotid)' }, 'Single-Lumen Wire-Reinforced VA — 15 Fr V / 10 Fr A'),
                React.createElement('option', { value: '19 Fr Venous (Right IJ) / 14 Fr Arterial (Right Carotid)' }, 'Single-Lumen Wire-Reinforced VA — 19 Fr V / 14 Fr A'),
                React.createElement('option', { value: '23 Fr Venous (Femoral) / 17 Fr Arterial (Femoral)' }, 'Single-Lumen Wire-Reinforced VA — 23 Fr V / 17 Fr A')
              )
            ),
            React.createElement(
              'div',
              { className: 'flex justify-end gap-2 pt-2' },
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => setShowCustomModal(false),
                  className: 'px-3 py-1.5 rounded bg-slate-800 text-slate-300 cursor-pointer'
                },
                'Cancel'
              ),
              React.createElement(
                'button',
                {
                  type: 'submit',
                  className: 'px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer'
                },
                'Launch Custom Simulation'
              )
            )
          )
        )
      ),

    // MODAL C: Gemini AI Specialist API Key Settings
    showApiModal &&
      React.createElement(
        'div',
        { className: 'fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4' },
        React.createElement(
          'div',
          { className: 'bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-5 space-y-4 font-mono text-xs shadow-2xl' },
          React.createElement(
            'div',
            { className: 'flex justify-between items-center border-b border-slate-800 pb-2.5' },
            React.createElement('h2', { className: 'text-sm font-bold text-emerald-400 uppercase' }, 'Hybrid AI Bedside Specialist Settings'),
            React.createElement(
              'button',
              { onClick: () => setShowApiModal(false), className: 'text-slate-400 hover:text-white cursor-pointer' },
              '✕'
            )
          ),
          React.createElement(
            'p',
            { className: 'text-slate-300 leading-relaxed' },
            'The first-principles physiological engine and all 3 clinical subagents run 100% locally in real time. Optionally add a Google Gemini API key below for live LLM-generated dialogue.'
          ),
          React.createElement(
            'div',
            null,
            React.createElement('label', { className: 'block text-slate-400 mb-1' }, 'Gemini API Key (Stored only in your browser localStorage)'),
            React.createElement('input', {
              type: 'password',
              value: apiKey,
              onChange: (e) => setApiKey(e.target.value),
              placeholder: 'AIzaSy...',
              className: 'w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white'
            })
          ),
          React.createElement(
            'div',
            null,
            React.createElement('label', { className: 'block text-slate-400 mb-1' }, 'Model'),
            React.createElement(
              'select',
              {
                value: geminiModel,
                onChange: (e) => setGeminiModel(e.target.value),
                className: 'w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white'
              },
              React.createElement('option', { value: 'gemini-2.5-flash' }, 'gemini-2.5-flash (Fast Bedside Turn)'),
              React.createElement('option', { value: 'gemini-2.5-pro' }, 'gemini-2.5-pro (Deep Physiological Reasoning)')
            )
          ),
          React.createElement(
            'div',
            { className: 'flex justify-end gap-2 pt-2' },
            React.createElement(
              'button',
              {
                onClick: () => setShowApiModal(false),
                className: 'px-3 py-1.5 rounded bg-slate-800 text-slate-300 cursor-pointer'
              },
              'Cancel'
            ),
            React.createElement(
              'button',
              {
                onClick: saveApiSettings,
                className: 'px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer'
              },
              'Save Settings'
            )
          )
        )
      ),

    // MODAL D: SKILL.md Complete Protocol Reference
    showSkillModal &&
      React.createElement(
        'div',
        { className: 'fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4' },
        React.createElement(
          'div',
          { className: 'bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full p-5 space-y-3 font-mono text-xs shadow-2xl max-h-[85vh] flex flex-col' },
          React.createElement(
            'div',
            { className: 'flex justify-between items-center border-b border-slate-800 pb-2.5' },
            React.createElement('h2', { className: 'text-sm font-bold text-amber-400 uppercase' }, 'SKILL.md — Institutional ECMO & QWS Protocol Reference'),
            React.createElement(
              'button',
              { onClick: () => setShowSkillModal(false), className: 'text-slate-400 hover:text-white cursor-pointer' },
              '✕'
            )
          ),
          React.createElement(
            'div',
            { className: 'overflow-y-auto space-y-3 text-slate-200 leading-relaxed pr-2' },
            React.createElement('p', { className: 'text-sky-300 font-bold' }, '1. BFR Transition Schedule (Box A & Box B):'),
            React.createElement(
              'p',
              null,
              '• VV ECMO Target (Box A): 1.2–1.5 L/min/m² × BSA | VA ECMO Target (Box A): 2.0–2.5 L/min/m² × BSA. Minute 1 Initial BFR (Box B) = Box A / 6 (permissible <500 mL/min in Min 1). Ramp incrementally every 3 minutes from Min 1 to Min 15.'
            ),
            React.createElement('p', { className: 'text-sky-300 font-bold' }, '2. Sweep Gas Initiation & CO2 Neuro-Protection (Box M & Box K):'),
            React.createElement(
              'p',
              null,
              '• Initial Sweep (Box M) = 0.25 × ECLS BFR (L/min) at 80% FiO2 (target post-ox PO2 200–350 mmHg). Maintain immediate post-initiation PaCO2 within <10 mmHg of pre-ECLS baseline. Wean PaCO2 by 5 mmHg every 4 hours (<10 mmHg/4h max). Keep post-ox pH < 7.55. If TCM CO2 shifts >10 mmHg or cerebral NIRS shifts >10%, obtain STAT ABG and adjust sweep: New Sweep = Current Sweep × (Current PCO2 / Desired PCO2).'
            ),
            React.createElement('p', { className: 'text-sky-300 font-bold' }, '3. Ventilator & Pulmonary Vasodilator Weaning (Box D):'),
            React.createElement(
              'p',
              null,
              '• At 15 min (Box D): If above danger range, wean PIP to 32 & PEEP to 12 immediately (do NOT drop rate/freq). Otherwise wean PIP & PEEP by 2 cmH2O. Then q2h to Rest (SIMV-PC, PEEP 10, Rate 10, PC/PS 10, I-time 2.0s, FiO2 30–40%). VDR4: Wean PIP/PEEP by 2 q2h to 26/10, increase Freq by 25 Hz q2h to 500 Hz, wean Osc Rate by 5 q2h to 30 bpm, then convert to SIMV-PC. Begin iNO (20→15→10→8→6→4→3→2→1→OFF) and Flolan (0.1→0.07→0.05→0.03→0.02→0.01→OFF) weaning at Hour 2.'
            ),
            React.createElement('p', { className: 'text-sky-300 font-bold' }, '4. Spectrum QWS Safety Alarms (ECLS Run):'),
            React.createElement(
              'p',
              null,
              '• Backflow Prevention: ON | Max Inlet: -60 mmHg (cutback) | Stop Inlet: -100 mmHg (stop) | Max Outlet: +250 mmHg (cutback) | Stop Outlet: +300 mmHg (stop) | Bubble Detection: ON (Small).'
            ),
            React.createElement('p', { className: 'text-sky-300 font-bold' }, '5. Suggested Transfusion Thresholds & Sampling:'),
            React.createElement(
              'p',
              null,
              '• PRBC: Hct >35% (<14d fresh) | Platelets: >100k (>150k pre-pump in infant <1yr; infuse peripherally far from venous cannula) | Cryo: Fib >100 (>6mo) or >150 (<6mo) | FFP: INR <1.8.'
            )
          )
        )
      ),

    // MODAL: Scenario Selection Hub & Curriculum Launcher (Step 1 on Launch)
    React.createElement(window.ScenarioLauncherModal, {
      isOpen: showScenarioPickerModal,
      onClose: () => setShowScenarioPickerModal(false),
      onSelectScenario: (scenarioId) => {
        handleScenarioChange(scenarioId);
        setShowScenarioPickerModal(false);
        setShowPhysiologyModal(true);
      },
      scenarios: window.ECMO_SCENARIOS,
      examMode,
      setExamMode,
      onOpenCustomModal: () => setShowCustomModal(true)
    }),

    // MODAL PRE-SIMULATION: Physiology Briefing Modal (Step 2 - Reviews Foundational Physiology of Chosen Case)
    React.createElement(window.PhysiologyBriefingModal, {
      scenario: activeScenarioObj,
      isOpen: showPhysiologyModal,
      onClose: () => setShowPhysiologyModal(false),
      onProceed: () => setShowPhysiologyModal(false),
      onChangeScenario: () => {
        setShowPhysiologyModal(false);
        setShowScenarioPickerModal(true);
      }
    })
  );
};
