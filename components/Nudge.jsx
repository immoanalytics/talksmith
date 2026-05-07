// Nudge.jsx — The central component: a coaching cue.
// Three variants: card | inline | pill (user can toggle via Tweaks)

function Nudge({ nudge, onDismiss, onSnooze, variant = 'card', compact = false }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  const [phraseOpen, setPhraseOpen] = React.useState(false);

  const tone = nudge.tone || 'blue';
  const toneColor = `var(--${tone})`;
  const toneBg = `var(--${tone}-soft)`;
  const toneLine = `var(--${tone}-line)`;
  const coach = nudge.coach ? MeetingData.COACHES[nudge.coach] : null;

  if (variant === 'pill') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 10px 6px 8px',
        background: toneBg,
        border: `1px solid ${toneLine}`,
        borderRadius: 999,
        animation: 'fadeUp 300ms var(--ease) both',
        maxWidth: 420,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: toneColor,
          animation: 'pulseDot 1.6s ease-in-out infinite', flexShrink: 0,
        }} />
        <span style={{ fontSize: 12, color: 'var(--ink-0)', fontWeight: 500 }}>{nudge.title}</span>
        {nudge.action && (
          <button onClick={() => setPhraseOpen(p => !p)} style={{
            border: 'none', background: 'transparent', color: toneColor,
            fontSize: 11, fontWeight: 500, cursor: 'pointer', padding: 0,
          }}>{nudge.action.label} →</button>
        )}
        <button onClick={() => onDismiss?.(nudge.id)} style={{
          border: 'none', background: 'transparent', color: 'var(--ink-2)',
          cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center',
        }}>{I('x', { size: 11 })}</button>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div style={{
        display: 'flex', gap: 10,
        padding: '10px 12px',
        borderLeft: `2px solid ${toneColor}`,
        background: toneBg,
        animation: 'fadeUp 300ms var(--ease) both',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            {coach && (
              <span style={{ fontSize: 10.5, fontWeight: 500, color: toneColor }}>
                {coach.name}
              </span>
            )}
            <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>·</span>
            <span className="eyebrow" style={{ color: 'var(--ink-2)' }}>{nudge.type}</span>
            <Confidence level={nudge.confidence} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{nudge.title}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-1)' }}>{nudge.detail}</div>
          {nudge.action && (
            <button onClick={() => setPhraseOpen(p => !p)} style={{
              marginTop: 6, border: 'none', background: 'transparent',
              color: toneColor, fontSize: 11, fontWeight: 500,
              cursor: 'pointer', padding: 0,
            }}>{nudge.action.label} →</button>
          )}
          {phraseOpen && nudge.action?.phrase && (
            <div style={{
              marginTop: 6, padding: '8px 10px',
              background: 'var(--bg-2)', border: '1px solid var(--line)',
              borderRadius: 6, fontStyle: 'italic', fontSize: 12, color: 'var(--ink-0)',
            }}>{nudge.action.phrase}</div>
          )}
        </div>
        <button onClick={() => onDismiss?.(nudge.id)} style={{
          border: 'none', background: 'transparent', color: 'var(--ink-2)',
          cursor: 'pointer', padding: 0, alignSelf: 'flex-start',
        }}>{I('x', { size: 12 })}</button>
      </div>
    );
  }

  // card (default)
  return (
    <div style={{
      background: 'var(--bg-2)',
      border: `1px solid ${toneLine}`,
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      animation: 'fadeUp 320ms var(--ease) both',
      boxShadow: 'var(--shadow-card)',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: toneColor,
      }} />
      <div style={{ padding: '11px 13px 11px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: toneColor,
            animation: nudge.positive ? 'none' : 'pulseDot 1.6s ease-in-out infinite',
          }} />
          {coach && (
            <span style={{
              fontSize: 10.5, fontWeight: 500, color: toneColor,
              fontFamily: 'var(--font-sans)', letterSpacing: '-0.005em',
            }}>{coach.name}</span>
          )}
          <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>·</span>
          <span className="eyebrow" style={{ color: 'var(--ink-2)' }}>{nudge.type}</span>
          <div style={{ flex: 1 }} />
          <Confidence level={nudge.confidence} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-2)' }}>
            {Math.round(nudge.confidence * 100)}%
          </span>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35, marginBottom: 4, letterSpacing: '-0.01em' }}>
          {nudge.title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-1)', lineHeight: 1.45 }}>
          {nudge.detail}
        </div>

        {/* Signals (explainability) */}
        {!compact && nudge.signals && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
            {nudge.signals.map((s, i) => (
              <span key={i} style={{
                fontSize: 10.5, color: 'var(--ink-2)',
                padding: '2px 6px', background: 'var(--bg-inset)',
                border: '1px solid var(--line-soft)', borderRadius: 4,
                fontFamily: 'var(--font-mono)',
              }}>{s}</span>
            ))}
          </div>
        )}

        {/* Why this nudge — counterfactual explainer */}
        {!compact && nudge.why && (
          <div style={{
            marginTop: 8,
            padding: '7px 9px',
            background: 'transparent',
            borderLeft: `1.5px solid ${toneLine}`,
            fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.45,
          }}>
            <span className="eyebrow" style={{ marginRight: 6, color: toneColor }}>Why</span>
            {nudge.why}
          </div>
        )}

        {/* Phrase reveal */}
        {phraseOpen && nudge.action?.phrase && (
          <div style={{
            marginTop: 8, padding: '9px 11px',
            background: 'var(--bg-inset)',
            border: '1px solid var(--line)',
            borderRadius: 6,
            fontSize: 12.5, color: 'var(--ink-0)',
            fontStyle: 'italic',
            animation: 'fadeUp 200ms var(--ease) both',
          }}>
            <div className="eyebrow" style={{ marginBottom: 3, fontStyle: 'normal' }}>Say it like</div>
            {nudge.action.phrase}
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-soft)',
        }}>
          {nudge.action && (
            <button onClick={() => setPhraseOpen(p => !p)} style={{
              border: `1px solid ${toneLine}`,
              background: toneBg, color: toneColor,
              fontSize: 11.5, fontWeight: 500,
              padding: '4px 10px', borderRadius: 5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              transition: 'all var(--speed) var(--ease)',
            }}>
              {I('sparkle', { size: 11 })}
              {phraseOpen ? 'Hide' : nudge.action.label}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => onSnooze?.(nudge.id)} style={{
            border: 'none', background: 'transparent', color: 'var(--ink-2)',
            fontSize: 11, cursor: 'pointer', padding: '3px 6px', borderRadius: 4,
            display: 'flex', alignItems: 'center', gap: 4,
          }} title="Snooze 2m">
            {I('snooze', { size: 12 })} Snooze
          </button>
          <button onClick={() => onDismiss?.(nudge.id)} style={{
            border: 'none', background: 'transparent', color: 'var(--ink-2)',
            fontSize: 11, cursor: 'pointer', padding: '3px 6px', borderRadius: 4,
            display: 'flex', alignItems: 'center', gap: 4,
          }} title="Dismiss">
            {I('x', { size: 12 })} Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

window.Nudge = Nudge;
