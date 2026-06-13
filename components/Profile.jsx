// Profile.jsx — Personal profile & learning model
function Profile({ activeGoal, setActiveGoal }) {
  const goal = activeGoal;
  const setGoal = setActiveGoal;
  const weights = MeetingData.GOAL_COACH_WEIGHTS[goal] || {};

  return (
    <div style={{
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
              <MiniStat k="Meetings" v="142" hint="last 90d"/>
              <MiniStat k="Coached hours" v="86" hint="live on"/>
              <MiniStat k="Streak" v="11d" hint="daily use"/>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Focus" title="Active goals" dense
          right={<button style={btn()}>+ Add</button>}>
          <div style={{ padding: '4px 8px 10px' }}>
            <GoalChoice
              id="listen" selected={goal === 'listen'} onSelect={setGoal}
              icon="users" label="Improve listening"
              desc="Acknowledge objections, reduce interruptions"
              progress={54} delta={+9}
            />
            <GoalChoice
              id="assertive" selected={goal === 'assertive'} onSelect={setGoal}
              icon="flag" label="Be more assertive"
              desc="Make your recommendation clear upfront"
              progress={71} delta={+4}
            />
            <GoalChoice
              id="clarity" selected={goal === 'clarity'} onSelect={setGoal}
              icon="sparkle" label="Improve clarity"
              desc="Fewer filler words, shorter sentences"
              progress={78} delta={+14}
            />
            <GoalChoice
              id="balance" selected={goal === 'balance'} onSelect={setGoal}
              icon="pulse" label="Balance talk time"
              desc="Under 50% in most meetings"
              progress={48} delta={-3} negative
            />
          </div>
        </Panel>
      </div>

      {/* RIGHT — trends */}
      <Panel eyebrow="Learning model" title="Your evolution" dense
        right={
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-inset)', padding: 2, borderRadius: 6, border: '1px solid var(--line-soft)' }}>
            {['7d', '30d', '90d', 'All'].map((r, i) => (
              <button key={r} style={{
                border: 'none', background: i === 2 ? 'var(--bg-2)' : 'transparent',
                color: i === 2 ? 'var(--ink-0)' : 'var(--ink-2)',
                fontSize: 10.5, padding: '3px 8px', borderRadius: 4,
                cursor: 'pointer', fontFamily: 'var(--font-mono)',
                boxShadow: i === 2 ? 'var(--shadow-card)' : 'none',
              }}>{r}</button>
            ))}
          </div>
        }>
        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          <TrendChart
            title="Talk time balance"
            subtitle="Your share of speaking time. Target ≤ 50%."
            current="48%" delta="−14pp since Jan"
            tone="green"
            data={[72, 68, 70, 65, 66, 61, 58, 55, 54, 51, 49, 48]}
            target={50}
            maxY={100}
            yLabel="%"
          />
          <TrendChart
            title="Interruptions per meeting"
            subtitle="Events where you cut off another speaker."
            current="1.4" delta="−2.1 since Jan"
            tone="green"
            data={[3.5, 3.2, 3.3, 3.0, 2.8, 2.5, 2.2, 2.0, 1.9, 1.7, 1.5, 1.4]}
            target={1}
            maxY={4}
            yLabel="/mtg"
          />
          <TrendChart
            title="Sentiment impact on others"
            subtitle="How your tone shifts the room average."
            current="+0.12" delta="was −0.08"
            tone="blue"
            data={[-0.1, -0.08, -0.06, -0.04, 0, 0.02, 0.04, 0.06, 0.08, 0.09, 0.11, 0.12]}
            centerZero
            maxY={0.2}
            minY={-0.2}
            yLabel=""
          />

          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>What the model has learned about you</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <Insight tone="blue"
                title="You pitch-shift up when challenged"
                detail="Pace +22%, pitch variance +18% within 4s of pushback. Suggests defensiveness."
                since="detected in 23 meetings"/>
              <Insight tone="amber"
                title="You interrupt most with Priya"
                detail="7 of 12 interruptions this quarter. Not a pattern with other teammates."
                since="confidence 91%"/>
              <Insight tone="green"
                title="You summarize better after 30m"
                detail="Longer meetings show +34% recap quality. Lean on this for long discussions."
                since="based on 41 meetings"/>
              <Insight tone="blue"
                title="Your best decisions come from asking"
                detail="Meetings with ≥4 questions from you have 2.1× outcome follow-through."
                since="correlational"/>
            </div>
          </div>
        </div>
      </Panel>
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

function GoalChoice({ id, selected, onSelect, icon, label, desc, progress, delta, negative }) {
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
          <span className="mono" style={{ fontSize: 10.5, color: negative ? 'var(--rose)' : 'var(--green)' }}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 1, marginBottom: 6 }}>{desc}</div>
        <Meter value={progress} color="var(--blue)" height={3}/>
      </div>
    </button>
  );
}

function TrendChart({ title, subtitle, current, delta, tone = 'blue', data, target, maxY, minY = 0, centerZero, yLabel }) {
  const W = 560, H = 120, padL = 30, padR = 10, padT = 10, padB = 20;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const y = v => padT + chartH - ((v - minY) / (maxY - minY)) * chartH;
  const x = i => padL + (i / (data.length - 1)) * chartW;

  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const areaPts = `${padL},${padT + chartH} ${pts} ${padL + chartW},${padT + chartH}`;

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
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 120, display: 'block' }}>
        <defs>
          <linearGradient id={`g-${tone}-${title}`} x1="0" x2="0" y1="0" y2="1">
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
        <polygon points={areaPts} fill={`url(#g-${tone}-${title})`}/>
        {/* line */}
        <polyline points={pts} fill="none" stroke={`var(--${tone})`} strokeWidth="1.75"
                  strokeLinecap="round" strokeLinejoin="round"/>
        {/* last point */}
        <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="3.5"
                fill={`var(--${tone})`} stroke="var(--bg-2)" strokeWidth="2"/>
        {/* x labels */}
        <text x={padL} y={H - 5} fill="var(--ink-3)" fontSize="9" fontFamily="var(--font-mono)">Jan</text>
        <text x={padL + chartW / 2} y={H - 5} fill="var(--ink-3)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">W25</text>
        <text x={padL + chartW} y={H - 5} fill="var(--ink-3)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="end">Apr</text>
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
