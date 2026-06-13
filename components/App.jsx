// App.jsx — root + screen router + tweaks
const TWEAKS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "nudgeStyle": "card",
  "startScreen": "live"
}/*EDITMODE-END*/;

// Read a saved preference from localStorage with a fallback. SSR-safe and
// resilient to localStorage being disabled (Safari private mode, etc).
function loadPref(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const v = localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch { return fallback; }
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

function App() {
  const [theme, setTheme] = React.useState(pickInitialTheme);
  const [nudgeStyle, setNudgeStyle] = React.useState(() => loadPref('talksmith.nudgeStyle', TWEAKS.nudgeStyle));
  const [showTweaks, setShowTweaks] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);

  const [screen, setScreen] = React.useState(() => loadPref('talksmith.screen', TWEAKS.startScreen));
  const [running, setRunning] = React.useState(true);
  const [speed, setSpeed] = React.useState(1);
  const [muted, setMuted] = React.useState(() => loadPref('talksmith.muted', '0') === '1');
  const [idle, setIdle] = React.useState(false);
  const [activeGoal, setActiveGoal] = React.useState(() => loadPref('talksmith.goal', 'listen'));
  const [scenarioId, setScenarioId] = React.useState(() => {
    const v = loadPref('talksmith.scenario', 'q2_roadmap');
    return MeetingData.SCENARIOS[v] ? v : 'q2_roadmap';
  });

  React.useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  React.useEffect(() => { try { localStorage.setItem('talksmith.theme', theme); } catch {} }, [theme]);
  React.useEffect(() => { try { localStorage.setItem('talksmith.nudgeStyle', nudgeStyle); } catch {} }, [nudgeStyle]);
  React.useEffect(() => { try { localStorage.setItem('talksmith.screen', screen); } catch {} }, [screen]);
  React.useEffect(() => { try { localStorage.setItem('talksmith.goal', activeGoal); } catch {} }, [activeGoal]);
  React.useEffect(() => { try { localStorage.setItem('talksmith.muted', muted ? '1' : '0'); } catch {} }, [muted]);
  React.useEffect(() => { try { localStorage.setItem('talksmith.scenario', scenarioId); } catch {} }, [scenarioId]);

  // Pause the live sim when the user isn't on a screen that consumes it.
  // Profile/Review don't read sim state; ticking it is wasted work and the
  // timecode is misleading anyway when you're not "in" the meeting.
  const screenWantsSim = screen === 'live' || screen === 'overlay';
  const sim = MeetingData.useMeetingSim({
    running: running && !idle && screenWantsSim,
    speed, activeGoal, scenarioId,
  });

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

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '1') { setScreen('live'); e.preventDefault(); }
        if (e.key === '2') { setScreen('overlay'); e.preventDefault(); }
        if (e.key === '3') { setScreen('review'); e.preventDefault(); }
        if (e.key === '4') { setScreen('profile'); e.preventDefault(); }
        if (e.key.toLowerCase() === 'm') { setMuted(m => !m); e.preventDefault(); }
      } else if (e.key === ' ') {
        const cur = screenRef.current;
        if (cur === 'live' || cur === 'overlay') setRunning(r => !r);
        if (cur === 'review') setReviewPlaying(p => !p);
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

  const meetingState = screen === 'live' || screen === 'overlay'
    ? { recording: running && !idle, timecode: sim.tc }
    : null;

  return (
    <div style={appStyles.chrome} data-screen-label={`Talksmith — ${screen}`}>
      <TitleBar
        meetingState={meetingState}
        activeScreen={screen}
        onScreenChange={setScreen}
        onSettings={() => setShowTweaks(s => !s)}
      />

      <div style={{
        height: 40, flexShrink: 0, borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
        background: 'var(--bg-0)',
      }}>
        {screen === 'live' && (
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
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>⌘E expands · ⌘⇧H hides</span>
          </>
        )}
        {screen === 'review' && (
          <>
            <Chip tone="neutral">{sim.scenario.name}</Chip>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              {MeetingData.fmtTime(sim.scenario.duration)} · {sim.scenario.participants.length} participants · {sim.scenario.timeline.length} moments flagged
            </span>
            <div style={{ flex: 1 }}/>
            <button style={subBtn(false)}>Share review</button>
            <button style={subBtn(false)}>Export notes</button>
          </>
        )}
        {screen === 'profile' && (
          <>
            <Chip tone="neutral">Personal model</Chip>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Last updated 14m ago · 142 meetings analyzed</span>
            <div style={{ flex: 1 }}/>
            <button style={subBtn(false)}>Explain model</button>
          </>
        )}
      </div>

      {idle && screen === 'live' ? (
        <IdleState onStart={() => setIdle(false)}/>
      ) : screen === 'live' ? (
        <LiveDashboard sim={sim} running={running} onToggleRun={() => setRunning(r => !r)}
          muted={muted} onToggleMute={() => setMuted(m => !m)}
          variant={nudgeStyle} speed={speed} onSpeed={setSpeed}/>
      ) : screen === 'overlay' ? (
        <CompactOverlay sim={sim} running={running} onExpand={() => setScreen('live')}
          muted={muted} onToggleMute={() => setMuted(m => !m)}/>
      ) : screen === 'review' ? (
        <Review sim={reviewSim} t={reviewT} setT={setReviewT}
          playing={reviewPlaying} onTogglePlay={() => setReviewPlaying(p => !p)}/>
      ) : (
        <Profile activeGoal={activeGoal} setActiveGoal={setActiveGoal}/>
      )}

      <div style={{
        height: 24, flexShrink: 0, borderTop: '1px solid var(--line)',
        background: 'var(--bg-1)',
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 12,
        fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
      }}>
        <span>Talksmith v0.4.2</span><span>·</span>
        <span>On-device audio · cloud analysis</span>
        <div style={{ flex: 1 }}/>
        <span>⌘K commands</span><span>·</span>
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

function IdleState({ onStart }) {
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
            Talksmith is watching your calendar. Your next meeting <b style={{ color: 'var(--ink-1)' }}>Q2 roadmap sync</b> starts in 3 minutes — I'll join automatically, or click below to start now.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onStart} style={{
            border: '1px solid var(--ink-0)', background: 'var(--ink-0)', color: 'var(--bg-0)',
            fontSize: 12.5, fontWeight: 500, padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
          }}>Start listening now</button>
          <button style={{
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
              { t: '2:00 PM', n: 'Q2 roadmap sync', ppl: 4, next: true },
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
            </select>
            {activeScenario && (
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.4 }}>
                {activeScenario.summary}
              </div>
            )}
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

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
