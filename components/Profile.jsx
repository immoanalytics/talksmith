// Profile.jsx — Personal profile & learning model

const GOALS = [
  { id: 'listen',    icon: 'users',   label: 'Improve listening',  desc: 'Acknowledge objections, reduce interruptions' },
  { id: 'assertive', icon: 'flag',    label: 'Be more assertive',  desc: 'Make your recommendation clear upfront' },
  { id: 'clarity',   icon: 'sparkle', label: 'Improve clarity',    desc: 'Fewer filler words, shorter sentences' },
  { id: 'balance',   icon: 'pulse',   label: 'Balance talk time',  desc: 'Under 50% in most meetings' },
];
const DEFAULT_GOAL_TARGETS = { listen: 70, assertive: 70, clarity: 75, balance: 70 };

// Saved per-goal targets, merged over the defaults and clamped to 0–100 so a
// bad stored value can't break the progress maths.
function loadGoalTargets() {
  try {
    const saved = JSON.parse(localStorage.getItem('talksmith.goalTargets') || '{}');
    const out = { ...DEFAULT_GOAL_TARGETS };
    for (const k of Object.keys(out)) {
      const v = Number(saved[k]);
      if (Number.isFinite(v)) out[k] = Math.max(0, Math.min(100, Math.round(v)));
    }
    return out;
  } catch { return { ...DEFAULT_GOAL_TARGETS }; }
}

const ago = (d) => d === 0 ? 'today' : `${d}d ago`;

function Profile({ activeGoal, setActiveGoal, range, setRange, explainOpen, onCloseExplain }) {
  const goal = activeGoal;
  const setGoal = setActiveGoal;

  // Everything on this screen is derived from the scoring engine so it agrees
  // with Live and Review. Each trend point is one real meeting in the range.
  const rangeDays = MeetingData.PROFILE_RANGES[range] ?? null;
  const model = React.useMemo(() => MeetingData.profileModel({ rangeDays }), [rangeDays]);
  const pick = (k) => model.series.map(p => p[k]);
  const xLabels = model.series.length
    ? [ago(model.series[0].daysAgo), ago(model.series[model.series.length - 1].daysAgo)]
    : [];

  const [goalTargets, setGoalTargets] = React.useState(loadGoalTargets);
  const [editingTargets, setEditingTargets] = React.useState(false);
  React.useEffect(() => {
    try { localStorage.setItem('talksmith.goalTargets', JSON.stringify(goalTargets)); } catch {}
  }, [goalTargets]);

  return (
    <div data-testid="profile-screen" style={{
      flex: 1, display: 'grid',
      gridTemplateColumns: '1fr 1.4fr',
      gap: 14, padding: 14, minHeight: 0, overflow: 'hidden',
    }}>
      {/* LEFT — identity + goals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
        <Panel eyebrow="Profile" title="You" dense>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{
                width: 46, height: 46, borderRadius: 10,
                background: 'var(--blue-soft)',
                border: '1px solid var(--blue-line)',
                display: 'grid', placeItems: 'center',
                color: 'var(--blue)', fontFamily: 'var(--font-mono)',
                fontWeight: 600, fontSize: 16, letterSpacing: '-0.03em',
              }}>YA</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Your Avatar</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>Product Lead · 28 meetings / week</div>
              </div>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
              background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden',
            }}>
              <MiniStat k="Meetings" v={String(model.n)} hint={range === 'All' ? 'analyzed' : `in last ${range}`}/>
              <MiniStat k="Avg grade" v={model.overallGrade} hint={`${model.avgOverall}/100`}/>
              <MiniStat k="Talk avg" v={`${model.avgTalk}%`} hint="target ≤50"/>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Focus" title="Active goals" dense
          right={
            <button data-testid="edit-targets" onClick={() => setEditingTargets(e => !e)}
              aria-pressed={editingTargets} style={btn()}>
              {editingTargets ? 'Done' : 'Edit targets'}
            </button>
          }>
          <div style={{ padding: '4px 8px 10px' }}>
            {editingTargets ? (
              <div data-testid="targets-editor" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 4px' }}>
                {GOALS.map(g => (
                  <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
                    <span style={{ flex: 1 }}>{g.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>target</span>
                    <input type="number" min="0" max="100" step="5"
                      data-testid={`target-${g.id}`}
                      value={goalTargets[g.id]}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0)));
                        setGoalTargets(t => ({ ...t, [g.id]: v }));
                      }}
                      style={{
                        width: 58, fontFamily: 'var(--font-mono)', fontSize: 12, padding: '4px 6px',
                        background: 'var(--bg-inset)', color: 'var(--ink-0)',
                        border: '1px solid var(--line)', borderRadius: 5,
                      }}/>
                  </label>
                ))}
                <button onClick={() => setGoalTargets({ ...DEFAULT_GOAL_TARGETS })}
                  style={{ ...btn(), alignSelf: 'flex-start', marginTop: 4 }}>Reset to defaults</button>
              </div>
            ) : GOALS.map(g => {
              const progress = model.goalProgress[g.id];
              const delta = progress - goalTargets[g.id];
              return (
                <GoalChoice key={g.id}
                  id={g.id} selected={goal === g.id} onSelect={setGoal}
                  icon={g.icon} label={g.label} desc={g.desc}
                  progress={progress} target={goalTargets[g.id]}
                  delta={delta} negative={delta < 0}
                />
              );
            })}
          </div>
        </Panel>
      </div>

      {/* RIGHT — trends */}
      <Panel eyebrow="Learning model" title="Your evolution" dense
        right={
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-inset)', padding: 2, borderRadius: 6, border: '1px solid var(--line-soft)' }}>
            {Object.keys(MeetingData.PROFILE_RANGES).map(r => (
              <button key={r} data-testid={`range-${r}`} onClick={() => setRange(r)}
                aria-pressed={range === r} style={{
                border: 'none', background: range === r ? 'var(--bg-2)' : 'transparent',
                color: range === r ? 'var(--ink-0)' : 'var(--ink-2)',
                fontSize: 10.5, padding: '3px 8px', borderRadius: 4,
                cursor: 'pointer', fontFamily: 'var(--font-mono)',
                boxShadow: range === r ? 'var(--shadow-card)' : 'none',
              }}>{r}</button>
            ))}
          </div>
        }>
        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          {model.n === 0 ? (
            <div data-testid="profile-empty" style={{ padding: 30, textAlign: 'center', color: 'var(--ink-2)', fontSize: 12.5 }}>
              No meetings in the last {range}. Pick a longer range to see your trends.
            </div>
          ) : (<>
          <TrendChart
            title="Talk time balance"
            subtitle="Your share of speaking time, per meeting. Target ≤ 50%."
            current={`${model.avgTalk}%`} delta={`avg · ${model.avgTalk <= 50 ? 'at' : 'above'} target`}
            tone={model.avgTalk <= 50 ? 'green' : 'amber'}
            data={pick('talk')} xLabels={xLabels}
            target={50}
            maxY={100}
            yLabel="%"
          />
          <TrendChart
            title="Interruptions per meeting"
            subtitle="Times you cut off another speaker. Target ≤ 1."
            current={String(model.interruptionsPerMtg)} delta={`${model.totalInterruptions} across ${model.n}`}
            tone={model.interruptionsPerMtg <= 1 ? 'green' : 'amber'}
            data={pick('interruptions')} xLabels={xLabels}
            target={1}
            maxY={Math.max(4, ...pick('interruptions'))}
            yLabel="/mtg"
          />
          <TrendChart
            title="Listening score"
            subtitle="Acknowledgement, open questions, not dominating. Target ≥ 70."
            current={String(model.avgListening)} delta={`avg · ${model.avgListening >= 70 ? 'on track' : 'growth area'}`}
            tone={model.avgListening >= 70 ? 'green' : 'amber'}
            data={pick('listening')} xLabels={xLabels}
            target={70}
            maxY={100}
            yLabel=""
          />

          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>What the model has learned about you</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <Insight tone="green"
                title={`${model.strongest.key} is your strongest skill`}
                detail={`Averaging ${model.strongest.v}/100 across these meetings — lean on it.`}
                since={`based on ${model.n} meeting${model.n === 1 ? '' : 's'}`}/>
              <Insight tone="amber"
                title={`${model.weakest.key} is your growth area`}
                detail={`Lowest of your three skills at ${model.weakest.v}/100. Set it as a goal to turn up that coach.`}
                since="derived from scores"/>
              <Insight tone={model.byInterrupt.analysis.youInterruptedOthers > 0 ? 'amber' : 'green'}
                title={model.byInterrupt.analysis.youInterruptedOthers > 0
                  ? `You interrupt most in "${model.byInterrupt.scenario.name}"`
                  : 'You rarely talk over others'}
                detail={model.byInterrupt.analysis.youInterruptedOthers > 0
                  ? `${model.byInterrupt.analysis.youInterruptedOthers} interruption(s) there vs. fewer elsewhere — watch the high-stakes rooms.`
                  : 'No competitive interruptions detected in these meetings.'}
                since="interruption asymmetry"/>
              <Insight tone="blue"
                title={model.n < 2 ? 'Turn-length pattern needs more data'
                  : model.shorterTurnsClearer ? 'Shorter turns track higher clarity' : 'Your clarity holds across turn lengths'}
                detail={model.n < 2 ? 'Needs at least two meetings in range to compare turn length with clarity.'
                  : model.shorterTurnsClearer
                  ? 'Across your meetings, tighter turns correlate with cleaner delivery. Land the point sooner.'
                  : 'Clarity stays steady whether your turns run short or long.'}
                since="correlational"/>
            </div>
          </div>
          </>)}
        </div>
      </Panel>

      {explainOpen && (
        <ExplainModel model={model} range={range} activeGoal={goal} onClose={onCloseExplain}/>
      )}
    </div>
  );
}

// "Explain model" — how every number on this screen is produced, using the
// engine's actual constants and this range's per-meeting scores.
function ExplainModel({ model, range, activeGoal, onClose }) {
  const closeRef = React.useRef();
  React.useEffect(() => {
    const prev = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);

  const W = MeetingData.OVERALL_WEIGHTS;
  const pct = (x) => `${Math.round(x * 100)}%`;
  const weights = MeetingData.GOAL_COACH_WEIGHTS[activeGoal] || {};
  const goalLabel = (GOALS.find(g => g.id === activeGoal) || {}).label || activeGoal;
  const th = { textAlign: 'right', fontWeight: 500, color: 'var(--ink-2)', padding: '4px 6px', fontSize: 10.5 };
  const td = { textAlign: 'right', padding: '5px 6px', fontFamily: 'var(--font-mono)', fontSize: 11.5 };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'oklch(0.1 0.01 260 / 0.55)',
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="explain-title" data-testid="explain-model"
        onClick={(e) => e.stopPropagation()} className="scroll" style={{
          width: 'min(640px, 100%)', maxHeight: '85vh', overflowY: 'auto',
          background: 'var(--bg-1)', border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-pop)',
          animation: 'fadeUp 200ms var(--ease) both',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line-soft)' }}>
          <div id="explain-title" style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>How your scores are computed</div>
          <button ref={closeRef} onClick={onClose} aria-label="Close" style={{
            border: 'none', background: 'transparent', color: 'var(--ink-2)', cursor: 'pointer', padding: 4,
          }}>{I('x', { size: 13 })}</button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, fontSize: 12.5, lineHeight: 1.55 }}>
          <div>
            Every score is computed from the meeting transcript, not entered by hand. The same
            engine drives Live, Review and this screen.
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--ink-1)' }}>
            <li><b>Talk ratio</b> — your share of words spoken. Lower is better; target under 50%.</li>
            <li><b>Clarity</b> — starts at 100, minus filler words, hedges and overly long turns.</li>
            <li><b>Influence</b> — how often decisions land right after you speak and others build on your points; hedging lowers it.</li>
            <li><b>Listening</b> — objections you acknowledge and open questions raise it; talking over 50%, interrupting and ignored objections lower it.</li>
            <li><b>Overall</b> — {pct(W.balance)} talk balance, {pct(W.clarity)} clarity, {pct(W.influence)} influence,
              {' '}{pct(W.listening)} listening. Grades: A ≥ 85, B ≥ 75, C ≥ 65, D ≥ 55.</li>
          </ul>

          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Meetings in range ({range})</div>
            {model.n === 0 ? (
              <div style={{ color: 'var(--ink-2)' }}>No meetings in this range.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line-soft)' }}>
                    <th style={{ ...th, textAlign: 'left' }}>Meeting</th>
                    <th style={th}>When</th><th style={th}>Talk</th><th style={th}>Clarity</th>
                    <th style={th}>Influence</th><th style={th}>Listening</th><th style={th}>Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {model.scored.slice().reverse().map(x => (
                    <tr key={x.scenario.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                      <td style={{ padding: '5px 6px', fontSize: 12 }}>{x.scenario.name}</td>
                      <td style={{ ...td, color: 'var(--ink-2)' }}>{ago(x.scenario.daysAgo ?? 0)}</td>
                      <td style={td}>{x.talkRatio}%</td><td style={td}>{x.clarity}</td>
                      <td style={td}>{x.influence}</td><td style={td}>{x.listening}</td>
                      <td style={td}>{x.overall} · {x.grade}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: '5px 6px', fontSize: 12, fontWeight: 600 }}>Average</td><td/>
                    <td style={td}>{model.avgTalk}%</td><td style={td}>{model.avgClarity}</td>
                    <td style={td}>{model.avgInfluence}</td><td style={td}>{model.avgListening}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{model.avgOverall} · {model.overallGrade}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Your goal tunes the coaches</div>
            <div style={{ color: 'var(--ink-1)' }}>
              Active goal <b>{goalLabel}</b>. During a meeting the head coach shows at most two cues at
              a time, ranked by urgency, projected impact and confidence, then nudged by this goal:
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {Object.entries(weights).map(([coach, w]) => (
                <Chip key={coach} tone={w > 0 ? 'green' : 'amber'} size="sm">
                  {MeetingData.COACHES[coach]?.name || coach} {w > 0 ? '+' : ''}{w}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ k, v, hint }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--bg-1)' }}>
      <div className="eyebrow" style={{ marginBottom: 3 }}>{k}</div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>{v}</div>
      <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{hint}</div>
    </div>
  );
}

function GoalChoice({ id, selected, onSelect, icon, label, desc, progress, target, delta, negative }) {
  return (
    <button onClick={() => onSelect(id)} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      padding: '10px 10px', borderRadius: 8, margin: '2px 0',
      background: selected ? 'var(--bg-2)' : 'transparent',
      border: '1px solid', borderColor: selected ? 'var(--line)' : 'transparent',
      color: 'var(--ink-0)', fontFamily: 'inherit',
      display: 'flex', gap: 10, alignItems: 'flex-start',
      transition: 'all var(--speed)',
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 6,
        background: selected ? 'var(--blue-soft)' : 'var(--bg-inset)',
        border: '1px solid', borderColor: selected ? 'var(--blue-line)' : 'var(--line-soft)',
        display: 'grid', placeItems: 'center',
        color: selected ? 'var(--blue)' : 'var(--ink-2)',
        flexShrink: 0,
      }}>{I(icon, { size: 13 })}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
          <div style={{ flex: 1 }}/>
          <span className="mono" title={`${progress} vs target ${target}`}
            style={{ fontSize: 10.5, color: negative ? 'var(--rose)' : 'var(--green)' }}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 1, marginBottom: 6 }}>{desc}</div>
        <Meter value={progress} color="var(--blue)" height={3}/>
      </div>
    </button>
  );
}

function TrendChart({ title, subtitle, current, delta, tone = 'blue', data, xLabels = [], target, maxY, minY = 0, centerZero, yLabel }) {
  const W = 560, H = 120, padL = 30, padR = 10, padT = 10, padB = 20;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const y = v => padT + chartH - ((v - minY) / (maxY - minY)) * chartH;
  // A single meeting sits mid-chart instead of dividing by zero.
  const x = i => data.length < 2 ? padL + chartW / 2 : padL + (i / (data.length - 1)) * chartW;

  // Gradient ids feed url(#id), which can't contain spaces — a raw title
  // there made the fill invalid and the area rendered solid black.
  const gradId = `g-${tone}-${title.replace(/[^\w-]+/g, '-')}`;
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const areaPts = `${x(0)},${padT + chartH} ${pts} ${x(data.length - 1)},${padT + chartH}`;

  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--line-soft)',
      borderRadius: 10, padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 1 }}>{title}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{subtitle}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{
            fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em',
            color: `var(--${tone})`,
          }}>{current}</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
            {delta}
          </div>
        </div>
      </div>
      <svg data-testid="trend-chart" viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 120, display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={`var(--${tone})`} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={`var(--${tone})`} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* grid */}
        {[0, 0.5, 1].map(f => (
          <line key={f} x1={padL} x2={padL + chartW}
                y1={padT + chartH * f} y2={padT + chartH * f}
                stroke="var(--line-soft)" strokeWidth="1" strokeDasharray="2 3"/>
        ))}
        {centerZero && (
          <line x1={padL} x2={padL + chartW}
                y1={y(0)} y2={y(0)}
                stroke="var(--line-strong)" strokeWidth="1"/>
        )}
        {/* target line */}
        {target != null && (
          <g>
            <line x1={padL} x2={padL + chartW}
                  y1={y(target)} y2={y(target)}
                  stroke="var(--green)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6"/>
            <text x={padL + chartW - 2} y={y(target) - 3} fill="var(--green)"
                  fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">
              target {target}{yLabel}
            </text>
          </g>
        )}
        {/* area */}
        <polygon points={areaPts} fill={`url(#${gradId})`}/>
        {/* line */}
        <polyline points={pts} fill="none" stroke={`var(--${tone})`} strokeWidth="1.75"
                  strokeLinecap="round" strokeLinejoin="round"/>
        {/* one point per meeting; the latest is emphasized */}
        {data.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={i === data.length - 1 ? 3.5 : 2.5}
                  fill={`var(--${tone})`} stroke="var(--bg-2)" strokeWidth="2"/>
        ))}
        {/* x labels: oldest → newest meeting in range */}
        {xLabels.length > 0 && data.length > 1 && (
          <text x={padL} y={H - 5} fill="var(--ink-3)" fontSize="9" fontFamily="var(--font-mono)">{xLabels[0]}</text>
        )}
        {xLabels.length > 0 && (
          <text x={data.length > 1 ? padL + chartW : padL + chartW / 2} y={H - 5} fill="var(--ink-3)" fontSize="9"
                fontFamily="var(--font-mono)" textAnchor={data.length > 1 ? 'end' : 'middle'}>{xLabels[xLabels.length - 1]}</text>
        )}
        {/* y axis label */}
        <text x={padL - 6} y={padT + 4} fill="var(--ink-3)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="end">{maxY}{yLabel}</text>
        <text x={padL - 6} y={padT + chartH} fill="var(--ink-3)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="end">{minY}{yLabel}</text>
      </svg>
    </div>
  );
}

function Insight({ tone, title, detail, since }) {
  return (
    <div style={{
      padding: 12,
      background: 'var(--bg-2)',
      border: '1px solid var(--line-soft)',
      borderLeft: `2px solid var(--${tone})`,
      borderRadius: 6,
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-1)', lineHeight: 1.5 }}>{detail}</div>
      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
        {since}
      </div>
    </div>
  );
}

function btn() {
  return {
    border: '1px solid var(--line)', background: 'var(--bg-2)',
    color: 'var(--ink-1)', fontSize: 11, padding: '3px 8px',
    borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
  };
}

window.Profile = Profile;
