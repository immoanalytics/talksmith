// CompactOverlay.jsx — floating widget for screen-share use
function CompactOverlay({ sim, running, onExpand, muted, onToggleMute }) {
  const top = sim.activeNudges[0];
  const tone = top?.tone || 'blue';

  return (
    <div style={{
      flex: 1, display: 'grid', placeItems: 'center',
      background: `
        radial-gradient(circle at 30% 30%, oklch(0.25 0.02 260 / 0.6), transparent 60%),
        radial-gradient(circle at 70% 70%, oklch(0.22 0.02 250 / 0.5), transparent 60%),
        var(--bg-0)
      `,
      position: 'relative',
      padding: 30,
    }}>
      {/* Fake screen-share stage */}
      <div style={{
        position: 'absolute', inset: 30,
        border: '1px dashed var(--line)', borderRadius: 12,
        display: 'grid', placeItems: 'center',
        color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11,
        background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, var(--line-soft) 8px, var(--line-soft) 9px)',
      }}>
        <div style={{ background: 'var(--bg-0)', padding: '6px 12px', borderRadius: 4 }}>
          your shared screen
        </div>
      </div>

      {/* Compact floating widget */}
      <div style={{
        position: 'absolute', bottom: 60, right: 60,
        width: 320,
        background: 'oklch(0.17 0.008 260 / 0.88)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        border: '1px solid var(--line-strong)',
        borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        animation: 'fadeUp 400ms var(--ease) both',
      }}>
        {/* Header strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px',
          borderBottom: '1px solid var(--line-soft)',
        }}>
          <BrandMark size={14}/>
          <span style={{ fontSize: 11, fontWeight: 600 }}>Talksmith</span>
          <div style={{ flex: 1 }}/>
          {running && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', background: 'var(--rose)',
                animation: 'pulseDot 1.4s ease-in-out infinite',
              }}/>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-1)' }}>{sim.tc}</span>
            </div>
          )}
          <IconButton size={22} tip="Mute" onClick={onToggleMute} danger={muted}>
            {muted ? I('bellOff', { size: 11 }) : I('bell', { size: 11 })}
          </IconButton>
          <IconButton size={22} tip="Expand (⌘E)" onClick={onExpand}>
            {I('expand', { size: 11 })}
          </IconButton>
        </div>

        {/* Top nudge region */}
        <div style={{ padding: 12 }}>
          {top ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: `var(--${tone})`,
                  animation: 'pulseDot 1.6s ease-in-out infinite',
                }}/>
                <span className="eyebrow" style={{ color: `var(--${tone})` }}>{top.type}</span>
                <div style={{ flex: 1 }}/>
                <Confidence level={top.confidence}/>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, marginBottom: 3 }}>
                {top.title}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-1)', lineHeight: 1.45 }}>
                {top.detail}
              </div>
              {top.action && (
                <div style={{
                  marginTop: 8, padding: '7px 9px',
                  background: 'var(--bg-inset)', border: '1px solid var(--line-soft)',
                  borderRadius: 5, fontSize: 11.5, fontStyle: 'italic', color: 'var(--ink-0)',
                }}>
                  “{top.action.phrase.replace(/^"|"$/g, '')}”
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-2)',
                animation: 'breathe 2s ease-in-out infinite',
              }}/>
              <span style={{ fontSize: 12, color: 'var(--ink-1)' }}>Listening — no cues</span>
            </div>
          )}
        </div>

        {/* Micro-stats strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          borderTop: '1px solid var(--line-soft)',
          background: 'var(--bg-inset)',
        }}>
          <MicroStat label="Talk" value={`${sim.metrics.yourTalkPct}%`} alert={sim.metrics.yourTalkPct > 60}/>
          <MicroStat label="Tone" value={sim.metrics.sentiment > 0.5 ? 'Calm' : 'Tense'} alert={sim.metrics.sentiment < 0.35}/>
          <MicroStat label="Int." value={sim.metrics.interruptions} alert={sim.metrics.interruptions > 1} last/>
        </div>

        {/* Secondary nudge preview */}
        {sim.activeNudges[1] && (
          <div style={{
            padding: '8px 12px',
            borderTop: '1px solid var(--line-soft)',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, color: 'var(--ink-1)',
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: `var(--${sim.activeNudges[1].tone})`, opacity: 0.7,
            }}/>
            <span style={{ flex: 1 }}>{sim.activeNudges[1].title}</span>
          </div>
        )}

        {/* Shortcut footer */}
        <div style={{
          padding: '6px 10px',
          borderTop: '1px solid var(--line-soft)',
          display: 'flex', gap: 10, alignItems: 'center',
          background: 'oklch(0.14 0.005 260 / 0.5)',
        }}>
          <span style={{ fontSize: 10, color: 'var(--ink-3)', display: 'flex', gap: 4, alignItems: 'center' }}>
            <Kbd>␣</Kbd> dismiss
          </span>
          <span style={{ fontSize: 10, color: 'var(--ink-3)', display: 'flex', gap: 4, alignItems: 'center' }}>
            <Kbd>S</Kbd> snooze
          </span>
          <span style={{ fontSize: 10, color: 'var(--ink-3)', display: 'flex', gap: 4, alignItems: 'center' }}>
            <Kbd>⌘E</Kbd> expand
          </span>
        </div>
      </div>

      {/* Peripheral indicator — top-right edge */}
      <div style={{
        position: 'absolute', top: 30, right: 30,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 8px', borderRadius: 12,
        background: 'oklch(0.17 0.008 260 / 0.85)',
        border: '1px solid var(--line-soft)',
        backdropFilter: 'blur(10px)',
      }}>
        <LevelBars active={running} count={4} color="var(--ink-1)"/>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-2)' }}>
          {running ? 'REC' : 'PAUSED'} · {sim.tc}
        </span>
      </div>
    </div>
  );
}

function MicroStat({ label, value, alert, last }) {
  return (
    <div style={{
      padding: '7px 10px',
      borderRight: last ? 'none' : '1px solid var(--line-soft)',
    }}>
      <div className="eyebrow" style={{ fontSize: 9, marginBottom: 1 }}>{label}</div>
      <div className="mono" style={{
        fontSize: 13, fontWeight: 600,
        color: alert ? 'var(--amber)' : 'var(--ink-0)',
        letterSpacing: '-0.02em',
      }}>{value}</div>
    </div>
  );
}

window.CompactOverlay = CompactOverlay;
