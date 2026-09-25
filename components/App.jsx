// App.jsx — root + screen router + tweaks
const TWEAKS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "nudgeStyle": "card",
  "startScreen": "live"
}/*EDITMODE-END*/;

// Read a saved preference from localStorage with a fallback. SSR-safe and
// resilient to localStorage being disabled (Safari private mode, etc).
function loadPref(key, fallback, allowed) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const v = localStorage.getItem(key);
    if (v == null) return fallback;
    // A stale or hand-edited value must not put the app in a state no UI
    // control can represent (e.g. an unknown screen with no tab selected).
    return allowed && !allowed.includes(v) ? fallback : v;
  } catch { return fallback; }
}

const SCREENS = ['live', 'overlay', 'review', 'profile'];
const NUDGE_STYLES = ['card', 'inline', 'pill'];

// Keys typed into a form control belong to that control.
function isEditableTarget(el) {
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}
// Space on a focused button/link must activate it, not the global shortcut.
function isActivatableTarget(el) {
  return !!el && (/^(BUTTON|A|SUMMARY)$/.test(el.tagName) || el.getAttribute('role') === 'button');
}

// Save text as a file download (Export notes).
function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// First-run theme picks up the system preference; once the user picks a
// theme in Tweaks it's pinned and the OS preference is ignored.
function pickInitialTheme() {
  const stored = loadPref('talksmith.theme', null);
  if (stored === 'dark' || stored === 'light') return stored;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return TWEAKS.theme;
}

// Live mic transcription via the browser's Web Speech API (Chrome, Edge,
// Safari). Final results become transcript lines stamped with the meeting
// clock (`getT`); `interim` is the words still being recognized. Chrome ends
// recognition after a silence, so we restart it while the user wants it on.
function useSpeechTranscript(getT) {
  const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const [lines, setLines] = React.useState([]);
  const [interim, setInterim] = React.useState('');
  // idle | listening | denied | unsupported | error
  const [status, setStatus] = React.useState(Recognition ? 'idle' : 'unsupported');
  const [error, setError] = React.useState('');
  const recRef = React.useRef(null);
  const wantRef = React.useRef(false);
  const getTRef = React.useRef(getT);
  getTRef.current = getT;

  const stop = React.useCallback(() => {
    wantRef.current = false;
    const rec = recRef.current;
    recRef.current = null;
    if (rec) { try { rec.abort(); } catch {} }
    setInterim('');
    setStatus(s => (s === 'listening' ? 'idle' : s));
  }, []);

  const start = React.useCallback(() => {
    if (!Recognition || recRef.current) return;
    wantRef.current = true;
    const rec = new Recognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || 'en-US';
    rec.onresult = (e) => {
      let pending = '';
      const finals = [];
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const txt = (r[0] && r[0].transcript || '').trim();
        if (!txt) continue;
        if (r.isFinal) finals.push(txt); else pending += (pending ? ' ' : '') + txt;
      }
      if (finals.length) {
        const t = Math.round(getTRef.current() * 10) / 10;
        setLines(prev => [...prev, ...finals.map(txt => ({
          t, s: 'you', txt: txt.charAt(0).toUpperCase() + txt.slice(1),
        }))]);
      }
      setInterim(pending);
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return; // benign; onend restarts
      wantRef.current = false;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setStatus('denied');
      else { setStatus('error'); setError(e.error || 'unknown error'); }
    };
    rec.onend = () => {
      if (recRef.current !== rec) return;           // stopped or replaced
      if (wantRef.current) { try { rec.start(); return; } catch {} }
      recRef.current = null;
      setInterim('');
      setStatus(s => (s === 'listening' ? 'idle' : s));
    };
    recRef.current = rec;
    setError('');
    try { rec.start(); setStatus('listening'); }
    catch (err) { recRef.current = null; wantRef.current = false; setStatus('error'); setError(String(err && err.message || err)); }
  }, [Recognition]);

  const clear = React.useCallback(() => { setLines([]); setInterim(''); }, []);
  React.useEffect(() => stop, [stop]); // release the mic on unmount

  return { lines, interim, status, error, start, stop, clear, listening: status === 'listening' };
}

function App() {
  const [theme, setTheme] = React.useState(pickInitialTheme);
  const [nudgeStyle, setNudgeStyle] = React.useState(() => loadPref('talksmith.nudgeStyle', TWEAKS.nudgeStyle, NUDGE_STYLES));
  const [showTweaks, setShowTweaks] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);

  const [screen, setScreen] = React.useState(() => loadPref('talksmith.screen', TWEAKS.startScreen, SCREENS));
  const [running, setRunning] = React.useState(true);
  const [speed, setSpeed] = React.useState(1);
  const [muted, setMuted] = React.useState(() => loadPref('talksmith.muted', '0') === '1');
  const [idle, setIdle] = React.useState(false);
  const [activeGoal, setActiveGoal] = React.useState(() =>
    loadPref('talksmith.goal', 'listen', Object.keys(MeetingData.GOAL_COACH_WEIGHTS)));
  const [profileRange, setProfileRange] = React.useState(() =>
    loadPref('talksmith.profileRange', 'All', Object.keys(MeetingData.PROFILE_RANGES)));
  const [explainOpen, setExplainOpen] = React.useState(false);
  const closeExplain = React.useCallback(() => setExplainOpen(false), []);
  const [scenarioId, setScenarioId] = React.useState(() => {
    const v = loadPref('talksmith.scenario', 'q2_roadmap');
    return MeetingData.SCENARIOS[v] || v === MeetingData.MIC_SCENARIO_ID ? v : 'q2_roadmap';
  });
  const micMode = scenarioId === MeetingData.MIC_SCENARIO_ID;

  React.useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  React.useEffect(() => { try { localStorage.setItem('talksmith.theme', theme); } catch {} }, [theme]);
  React.useEffect(() => { try { localStorage.setItem('talksmith.nudgeStyle', nudgeStyle); } catch {} }, [nudgeStyle]);
  React.useEffect(() => { try { localStorage.setItem('talksmith.screen', screen); } catch {} }, [screen]);
  React.useEffect(() => { try { localStorage.setItem('talksmith.goal', activeGoal); } catch {} }, [activeGoal]);
  React.useEffect(() => { try { localStorage.setItem('talksmith.muted', muted ? '1' : '0'); } catch {} }, [muted]);
  React.useEffect(() => { try { localStorage.setItem('talksmith.scenario', scenarioId); } catch {} }, [scenarioId]);
  React.useEffect(() => { try { localStorage.setItem('talksmith.profileRange', profileRange); } catch {} }, [profileRange]);

  // Pause the live sim when the user isn't on a screen that consumes it.
  // Profile/Review don't read sim state; ticking it is wasted work and the
  // timecode is misleading anyway when you're not "in" the meeting.
  const screenWantsSim = screen === 'live' || screen === 'overlay';
  // Live mic: the clock runs exactly while the mic is listening, in real time,
  // so line timestamps match when you spoke.
  const tRef = React.useRef(0);
  const mic = useSpeechTranscript(() => tRef.current);
  const [promptId, setPromptId] = React.useState(() =>
    loadPref('talksmith.practicePrompt', 'free', MeetingData.PRACTICE_PROMPTS.map(p => p.id)));
  React.useEffect(() => { try { localStorage.setItem('talksmith.practicePrompt', promptId); } catch {} }, [promptId]);
  const micScenario = React.useMemo(
    () => (micMode ? MeetingData.micScenario(mic.lines, promptId) : null),
    [micMode, mic.lines, promptId]
  );
  // Saving is explicit: nothing is stored unless you press Save. `savedLines`
  // remembers which transcript was saved so the button can say so.
  const [savedLines, setSavedLines] = React.useState(null);
  const saveMicSession = () => {
    if (MeetingData.saveSession(mic.lines, promptId)) setSavedLines(mic.lines);
  };
  const sim = MeetingData.useMeetingSim({
    running: micMode ? mic.listening : running && !idle && screenWantsSim,
    speed: micMode ? 1 : speed, activeGoal, scenarioId, scenario: micScenario,
  });
  tRef.current = sim.t;
  // Leaving mic mode releases the microphone.
  React.useEffect(() => { if (!micMode) mic.stop(); }, [micMode, mic.stop]);
  const toggleRun = () => {
    if (!micMode) return setRunning(r => !r);
    if (mic.listening) mic.stop(); else mic.start();
  };
  const toggleRunRef = React.useRef(toggleRun);
  toggleRunRef.current = toggleRun;

  const [reviewT, setReviewT] = React.useState(42);
  const [reviewPlaying, setReviewPlaying] = React.useState(false);
  // The Review screen reads everything from the active scenario so it tracks
  // the scenario picker just like Live does. Clamp the scrub head to the
  // scenario duration so switching from a long to a short meeting can't leave
  // the playhead past the end.
  const reviewScenario = sim.scenario;
  React.useEffect(() => {
    setReviewT(prev => Math.min(prev, reviewScenario.duration));
  }, [reviewScenario]);
  const reviewSim = React.useMemo(() => ({
    ...sim,
    t: reviewT, tc: MeetingData.fmtTime(reviewT),
    totalDuration: reviewScenario.duration,
    timelineEvents: reviewScenario.timeline,
    participants: reviewScenario.participants,
  }), [reviewT, sim, reviewScenario]);

  // Keyboard handler binds once. The screen value is read through a ref so
  // we don't tear down/rebuild the listener on every navigation, and so the
  // Space-bar branch always sees the freshest screen.
  const screenRef = React.useRef(screen);
  React.useEffect(() => { screenRef.current = screen; }, [screen]);
  // Latest sim, so overlay shortcuts act on the cue currently on screen.
  const simRef = React.useRef(sim);
  simRef.current = sim;

  React.useEffect(() => {
    const onKey = (e) => {
      if (isEditableTarget(e.target)) return;
      const cur = screenRef.current;
      const key = e.key.toLowerCase();
      if (e.metaKey || e.ctrlKey) {
        const idx = ['1', '2', '3', '4'].indexOf(e.key);
        if (idx >= 0) { setScreen(SCREENS[idx]); e.preventDefault(); }
        else if (key === 'm') { setMuted(m => !m); e.preventDefault(); }
        else if (key === ',') { setShowTweaks(s => !s); e.preventDefault(); }
        else if (key === 'e' && cur === 'overlay') { setScreen('live'); e.preventDefault(); }
      } else if (e.altKey) {
        return;
      } else if (e.key === ' ') {
        if (isActivatableTarget(e.target)) return;
        if (cur === 'live' || cur === 'overlay') toggleRunRef.current();
        if (cur === 'review') setReviewPlaying(p => !p);
        e.preventDefault();
      } else if (e.key === 'Escape') {
        setShowTweaks(false);
      } else if (cur === 'overlay' && (key === 's' || key === 'x')) {
        // Compact overlay: act on the top cue without reaching for the mouse.
        const top = simRef.current.activeNudges[0];
        if (!top) return;
        if (key === 's') simRef.current.snoozeNudge(top.id);
        else simRef.current.dismissNudge(top.id);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === '__activate_edit_mode') setEditMode(true);
      if (e.data?.type === '__deactivate_edit_mode') setEditMode(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const persist = (key, val) => {
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*');
  };

  const notesFor = () => MeetingData.buildReviewNotes(sim.scenario);
  const exportNotes = () => downloadText(`talksmith-${sim.scenario.id}-review.md`, notesFor());
  // Share = copy the notes to the clipboard, with brief confirmation. Only
  // claim success when the write actually succeeded.
  const [shared, setShared] = React.useState(false);
  const shareReview = () => {
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(notesFor()).then(() => {
      setShared(true);
      setTimeout(() => setShared(false), 1400);
    }, () => {});
  };

  const meetingState = screen === 'live' || screen === 'overlay'
    ? { recording: micMode ? mic.listening : running && !idle, timecode: sim.tc }
    : null;
  const simRunning = micMode ? mic.listening : running;

  return (
    <div style={appStyles.chrome} data-screen-label={`Talksmith — ${screen}`}>
      <TitleBar
        meetingState={meetingState}
        activeScreen={screen}
        onScreenChange={setScreen}
        onSettings={() => setShowTweaks(s => !s)}
        muted={muted}
        onToggleMute={() => setMuted(m => !m)}
      />

      <div style={{
        height: 40, flexShrink: 0, borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
        background: 'var(--bg-0)',
      }}>
        {screen === 'live' && micMode && (
          <>
            <span data-testid="active-scenario-name"><Chip tone="neutral">{sim.scenario.name}</Chip></span>
            {!mic.listening && mic.lines.length === 0 && (
              <select data-testid="practice-prompt" value={promptId} onChange={(e) => setPromptId(e.target.value)}
                aria-label="Practice prompt"
                style={{
                  fontFamily: 'inherit', fontSize: 11.5, padding: '3px 6px',
                  background: 'var(--bg-inset)', color: 'var(--ink-0)',
                  border: '1px solid var(--line)', borderRadius: 5, cursor: 'pointer',
                }}>
                {MeetingData.PRACTICE_PROMPTS.map(p => (
                  <option key={p.id} value={p.id}>{p.title}{p.targetSec ? ` · ${p.targetSec}s` : ''}</option>
                ))}
              </select>
            )}
            <span data-testid="mic-status" data-status={mic.status} style={{ fontSize: 12, color: mic.status === 'denied' || mic.status === 'error' || mic.status === 'unsupported' ? 'var(--rose)' : 'var(--ink-2)' }}>
              {mic.status === 'unsupported' ? 'Live mic needs a browser with speech recognition (Chrome, Edge or Safari).'
                : mic.status === 'denied' ? 'Microphone access was blocked — allow it in the address bar, then press Start.'
                : mic.status === 'error' ? `Speech recognition stopped: ${mic.error}`
                : mic.listening ? 'Listening — speak as you would in the meeting.'
                : mic.lines.length ? 'Stopped. Save keeps this session in this browser only.'
                : 'Press Start and speak. Your browser transcribes (in Chrome, audio goes to Google); nothing is saved unless you press Save.'}
            </span>
            <div style={{ flex: 1 }}/>
            {mic.lines.length > 0 && !mic.listening && (
              <>
                <button data-testid="save-session" onClick={saveMicSession}
                  disabled={savedLines === mic.lines} style={subBtn(savedLines === mic.lines)}>
                  {savedLines === mic.lines && I('check', { size: 12 })}
                  {savedLines === mic.lines ? 'Saved' : 'Save session'}
                </button>
                <button onClick={() => { mic.clear(); sim.setT(0); }} style={subBtn(false)}>Clear</button>
              </>
            )}
            <button data-testid="mic-toggle" onClick={toggleRun} disabled={mic.status === 'unsupported'}
              style={subBtn(mic.listening)}>
              {I('mic', { size: 12 })}{mic.listening ? 'Stop mic' : 'Start mic'}
            </button>
          </>
        )}
        {screen === 'live' && !micMode && (
          <>
            <span data-testid="active-scenario-name"><Chip tone="neutral">{sim.scenario.name}</Chip></span>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{sim.scenario.summary}</span>
            <div style={{ flex: 1 }}/>
            <button onClick={() => setIdle(i => !i)} style={subBtn(idle)}>
              {idle ? 'Start meeting' : 'Idle state'}
            </button>
            <button onClick={() => setMuted(m => !m)} style={subBtn(muted)}>
              {muted ? I('bellOff', { size: 12 }) : I('bell', { size: 12 })}
              {muted ? 'Muted' : 'Coaching on'}
            </button>
          </>
        )}
        {screen === 'overlay' && (
          <>
            <Chip tone="neutral">Compact mode</Chip>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Shown while you screen-share</span>
            <div style={{ flex: 1 }}/>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>⌘E expands</span>
          </>
        )}
        {screen === 'review' && (
          <>
            <Chip tone="neutral">{sim.scenario.name}</Chip>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              {MeetingData.fmtTime(sim.scenario.duration)} · {sim.scenario.participants.length} participants · {sim.scenario.timeline.length} moments flagged
            </span>
            <div style={{ flex: 1 }}/>
            <button data-testid="share-review" onClick={shareReview} style={subBtn(shared)}>
              {I(shared ? 'check' : 'copy', { size: 12 })}{shared ? 'Copied' : 'Share review'}
            </button>
            <button data-testid="export-notes" onClick={exportNotes} style={subBtn(false)}>Export notes</button>
          </>
        )}
        {screen === 'profile' && (
          <>
            <Chip tone="neutral">Personal model</Chip>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              {Object.keys(MeetingData.SCENARIOS).length} meetings analyzed
            </span>
            <div style={{ flex: 1 }}/>
            <button data-testid="explain-model-button" onClick={() => setExplainOpen(true)} style={subBtn(explainOpen)}>
              Explain model
            </button>
          </>
        )}
      </div>

      {idle && screen === 'live' && !micMode ? (
        <IdleState scenario={sim.scenario} onStart={() => setIdle(false)} onReview={() => setScreen('review')}/>
      ) : screen === 'live' ? (
        <LiveDashboard sim={sim} running={simRunning} onToggleRun={toggleRun}
          interim={micMode ? mic.interim : ''}
          muted={muted} onToggleMute={() => setMuted(m => !m)}
          variant={nudgeStyle} speed={speed} onSpeed={setSpeed}/>
      ) : screen === 'overlay' ? (
        <CompactOverlay sim={sim} running={simRunning} onExpand={() => setScreen('live')}
          muted={muted} onToggleMute={() => setMuted(m => !m)}/>
      ) : screen === 'review' ? (
        <Review sim={reviewSim} t={reviewT} setT={setReviewT}
          playing={reviewPlaying} onTogglePlay={() => setReviewPlaying(p => !p)}/>
      ) : (
        <Profile activeGoal={activeGoal} setActiveGoal={setActiveGoal}
          range={profileRange} setRange={setProfileRange}
          explainOpen={explainOpen} onCloseExplain={closeExplain}/>
      )}

      <div style={{
        height: 24, flexShrink: 0, borderTop: '1px solid var(--line)',
        background: 'var(--bg-1)',
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 12,
        fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
      }}>
        <span>Talksmith v0.4.2</span><span>·</span>
        <span>{micMode ? 'Browser speech recognition · analysis in this page' : 'On-device audio · cloud analysis'}</span>
        <div style={{ flex: 1 }}/>
        <span>⌘, settings</span><span>·</span>
        <span>⌘M mute coaching</span>
      </div>

      {(showTweaks || editMode) && (
        <TweaksPanel
          theme={theme} setTheme={(v) => { setTheme(v); persist('theme', v); }}
          nudgeStyle={nudgeStyle} setNudgeStyle={(v) => { setNudgeStyle(v); persist('nudgeStyle', v); }}
          scenarioId={scenarioId} setScenarioId={setScenarioId}
          onClose={() => { setShowTweaks(false); }}
          editMode={editMode}
        />
      )}
    </div>
  );
}

function subBtn(active) {
  return {
    border: '1px solid var(--line)',
    background: active ? 'var(--bg-2)' : 'transparent',
    color: active ? 'var(--ink-0)' : 'var(--ink-1)',
    fontSize: 11.5, padding: '4px 10px', borderRadius: 5,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  };
}

function IdleState({ scenario, onStart, onReview }) {
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 40, background: 'var(--bg-0)' }}>
      <div style={{ maxWidth: 420, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'var(--bg-1)', border: '1px solid var(--line)',
          display: 'grid', placeItems: 'center', color: 'var(--ink-1)', position: 'relative',
        }}>
          {I('mic', { size: 22 })}
          <span style={{
            position: 'absolute', inset: -4, borderRadius: 18,
            border: '1px solid var(--blue-line)', animation: 'breathe 2.4s ease-in-out infinite',
          }}/>
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6, letterSpacing: '-0.01em' }}>No active meeting</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Talksmith is watching your calendar. Your next meeting <b style={{ color: 'var(--ink-1)' }}>{scenario.name}</b> starts in 3 minutes — I'll join automatically, or click below to start now.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onStart} style={{
            border: '1px solid var(--ink-0)', background: 'var(--ink-0)', color: 'var(--bg-0)',
            fontSize: 12.5, fontWeight: 500, padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
          }}>Start listening now</button>
          <button onClick={onReview} style={{
            border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-1)',
            fontSize: 12.5, padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
          }}>Review last meeting</button>
        </div>
        <div style={{
          marginTop: 12, padding: 12, width: '100%',
          background: 'var(--bg-1)', border: '1px solid var(--line-soft)', borderRadius: 8,
          textAlign: 'left',
        }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Today's meetings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { t: '2:00 PM', n: scenario.name, ppl: scenario.participants.length, next: true },
              { t: '3:30 PM', n: '1:1 with Priya',  ppl: 2 },
              { t: '4:30 PM', n: 'Design review',   ppl: 6 },
            ].map((m, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 8px', borderRadius: 5,
                background: m.next ? 'var(--blue-soft)' : 'transparent',
                border: '1px solid', borderColor: m.next ? 'var(--blue-line)' : 'transparent',
              }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', width: 55 }}>{m.t}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-0)', fontWeight: m.next ? 500 : 400 }}>{m.n}</span>
                <span style={{ fontSize: 10.5, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>{m.ppl}p</span>
                {m.next && <Chip tone="blue" size="sm">up next</Chip>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TweaksPanel({ theme, setTheme, nudgeStyle, setNudgeStyle, scenarioId, setScenarioId, onClose, editMode }) {
  const scenarios = MeetingData.SCENARIOS;
  const activeScenario = scenarios[scenarioId];
  return (
    <div data-testid="tweaks-panel" style={{
      position: 'fixed', bottom: 40, left: 20, width: 260,
      background: 'var(--bg-1)', border: '1px solid var(--line-strong)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-pop)', zIndex: 100,
      animation: 'fadeUp 200ms var(--ease) both',
    }}>
      <div style={{
        padding: '10px 12px', borderBottom: '1px solid var(--line-soft)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span className="eyebrow">Tweaks</span>
        <div style={{ flex: 1 }}/>
        {!editMode && (
          <button onClick={onClose} aria-label="Close tweaks panel" title="Close" style={{
            border: 'none', background: 'transparent', color: 'var(--ink-2)',
            cursor: 'pointer', padding: 2, display: 'grid', placeItems: 'center',
          }}>{I('x', { size: 12 })}</button>
        )}
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {setScenarioId && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-1)', marginBottom: 5 }}>Scenario</div>
            <select
              data-testid="scenario-picker"
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              style={{
                width: '100%', fontFamily: 'inherit', fontSize: 11.5, padding: '5px 8px',
                background: 'var(--bg-inset)', color: 'var(--ink-0)',
                border: '1px solid var(--line)', borderRadius: 5, cursor: 'pointer',
              }}
            >
              {Object.values(scenarios).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value={MeetingData.MIC_SCENARIO_ID}>Live mic (practice)</option>
            </select>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.4 }}>
              {activeScenario ? activeScenario.summary : 'Coach yourself on your own speech, live.'}
            </div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-1)', marginBottom: 5 }}>Theme</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['dark', 'light'].map(v => (
              <button key={v} onClick={() => setTheme(v)} style={segBtn(theme === v)}>
                {v === 'dark' ? I('moon', { size: 11 }) : I('sun', { size: 11 })}{v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-1)', marginBottom: 5 }}>Nudge style</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['card', 'inline', 'pill'].map(v => (
              <button key={v} onClick={() => setNudgeStyle(v)} style={segBtn(nudgeStyle === v)}>{v}</button>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.4 }}>
            Controls how active coaching cues render in the center stream.
          </div>
        </div>
      </div>
    </div>
  );
}

function segBtn(active) {
  return {
    flex: 1, border: '1px solid', borderColor: active ? 'var(--line-strong)' : 'var(--line-soft)',
    background: active ? 'var(--bg-2)' : 'var(--bg-inset)',
    color: active ? 'var(--ink-0)' : 'var(--ink-2)',
    fontSize: 11, padding: '5px 8px', borderRadius: 5,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    textTransform: 'capitalize', transition: 'all var(--speed)',
  };
}

// Last line of defence: a render error anywhere would otherwise unmount the
// whole tree and leave a blank window. Show what broke and offer a reset.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Talksmith crashed:', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    const reset = () => {
      try { Object.keys(localStorage).filter(k => k.startsWith('talksmith.')).forEach(k => localStorage.removeItem(k)); } catch {}
      location.reload();
    };
    return (
      <div role="alert" data-testid="crash-screen" style={{
        height: '100vh', display: 'grid', placeItems: 'center', padding: 24,
        background: 'var(--bg-0)', color: 'var(--ink-0)',
      }}>
        <div style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Something went wrong</div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--rose)', whiteSpace: 'pre-wrap' }}>
            {String(this.state.error && this.state.error.message || this.state.error)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => location.reload()} style={subBtn(true)}>Reload</button>
            <button onClick={reset} style={subBtn(false)}>Reset preferences & reload</button>
          </div>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
