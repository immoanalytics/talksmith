// Primitives.jsx — shared UI atoms
const appStyles = {
  chrome: {
    height: '100vh', width: '100vw',
    background: 'var(--bg-0)',
    display: 'flex', flexDirection: 'column',
    color: 'var(--ink-0)',
  },
};

// Title bar — custom app window chrome (not macOS; our own)
function TitleBar({ title, subtitle, meetingState, onSettings, activeScreen, onScreenChange }) {
  const screens = [
    { id: 'live', label: 'Live', key: '1' },
    { id: 'overlay', label: 'Compact', key: '2' },
    { id: 'review', label: 'Review', key: '3' },
    { id: 'profile', label: 'Profile', key: '4' },
  ];
  return (
    <div style={{
      height: 44, flexShrink: 0,
      display: 'flex', alignItems: 'center',
      padding: '0 12px',
      borderBottom: '1px solid var(--line)',
      background: 'var(--bg-1)',
      position: 'relative',
    }}>
      {/* Traffic-ish dots (our own product, not macOS) */}
      <div style={{ display: 'flex', gap: 7, marginRight: 18, alignItems: 'center' }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--line-strong)' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--line-strong)' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--line-strong)' }} />
      </div>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 20 }}>
        <BrandMark />
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>Talksmith</div>
      </div>

      {/* Screen tabs */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--bg-inset)', padding: 2, borderRadius: 8, border: '1px solid var(--line-soft)' }}>
        {screens.map(s => (
          <button key={s.id} onClick={() => onScreenChange(s.id)} style={{
            border: 'none', background: activeScreen === s.id ? 'var(--bg-2)' : 'transparent',
            color: activeScreen === s.id ? 'var(--ink-0)' : 'var(--ink-2)',
            fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 6,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: activeScreen === s.id ? 'var(--shadow-card)' : 'none',
            transition: 'all var(--speed) var(--ease)',
          }}>
            {s.label}
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', padding: '1px 4px', border: '1px solid var(--line)', borderRadius: 3 }}>⌘{s.key}</span>
          </button>
        ))}
      </div>

      {/* Center — meeting info */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
        {meetingState && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 10px',
            background: meetingState.recording ? 'var(--rose-soft)' : 'var(--bg-inset)',
            border: `1px solid ${meetingState.recording ? 'var(--rose-line)' : 'var(--line)'}`,
            borderRadius: 20, fontSize: 12,
          }}>
            {meetingState.recording ? (
              <>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--rose)', animation: 'pulseDot 1.4s ease-in-out infinite',
                }} />
                <span style={{ color: 'var(--rose)', fontWeight: 500 }}>Listening</span>
                <span style={{ color: 'var(--ink-2)' }}>·</span>
                <span className="mono" style={{ color: 'var(--ink-1)' }}>{meetingState.timecode}</span>
              </>
            ) : (
              <>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ink-3)' }} />
                <span style={{ color: 'var(--ink-2)' }}>Idle</span>
              </>
            )}
          </div>
        )}
        {subtitle && (
          <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{subtitle}</div>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', gap: 4 }}>
        <IconButton tip="Mute coaching (⌘M)">{I('bell', { size: 13 })}</IconButton>
        <IconButton tip="Settings" onClick={onSettings}>{I('settings', { size: 13 })}</IconButton>
      </div>
    </div>
  );
}

function BrandMark({ size = 18 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 5,
      background: 'var(--ink-0)', color: 'var(--bg-0)',
      display: 'grid', placeItems: 'center',
      fontFamily: 'var(--font-mono)', fontSize: size * 0.55, fontWeight: 600,
      letterSpacing: '-0.05em',
    }}>T</div>
  );
}

function IconButton({ children, tip, onClick, active, danger, size = 28 }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      title={tip} style={{
        width: size, height: size,
        display: 'grid', placeItems: 'center',
        background: active ? 'var(--bg-3)' : hover ? 'var(--bg-2)' : 'transparent',
        color: danger ? 'var(--rose)' : active ? 'var(--ink-0)' : 'var(--ink-1)',
        border: '1px solid transparent',
        borderColor: active ? 'var(--line)' : 'transparent',
        borderRadius: 7, cursor: 'pointer',
        transition: 'all var(--speed) var(--ease)',
      }}>{children}</button>
  );
}

function Kbd({ children }) {
  return (
    <span className="mono" style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 10, padding: '1px 5px',
      background: 'var(--bg-inset)',
      border: '1px solid var(--line)',
      borderBottom: '2px solid var(--line-strong)',
      borderRadius: 4, color: 'var(--ink-1)',
      minWidth: 16, justifyContent: 'center',
    }}>{children}</span>
  );
}

function Panel({ title, eyebrow, right, children, style = {}, dense = false }) {
  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      ...style,
    }}>
      {(title || eyebrow) && (
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: dense ? '10px 14px' : '14px 16px',
          borderBottom: '1px solid var(--line-soft)',
          gap: 10, flexShrink: 0,
        }}>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          {title && <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</div>}
          <div style={{ flex: 1 }} />
          {right}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  );
}

// Tiny meter bar
function Meter({ value, max = 100, color = 'var(--ink-1)', height = 4, bg = 'var(--line-soft)', animated = true }) {
  return (
    <div style={{
      width: '100%', height, background: bg, borderRadius: height/2, overflow: 'hidden',
    }}>
      <div style={{
        width: `${Math.min(100, (value/max)*100)}%`, height: '100%',
        background: color, borderRadius: height/2,
        transition: animated ? 'width 600ms var(--ease)' : 'none',
      }} />
    </div>
  );
}

function Confidence({ level = 0.82 }) {
  // tiny 4-bar confidence meter
  const bars = [0.25, 0.5, 0.75, 1.0];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 1.5, height: 10 }}
         title={`Confidence ${Math.round(level*100)}%`}>
      {bars.map((b, i) => (
        <span key={i} style={{
          width: 2, height: 3 + i*2, borderRadius: 1,
          background: level >= b ? 'var(--ink-1)' : 'var(--line-strong)',
        }}/>
      ))}
    </div>
  );
}

function Chip({ children, tone = 'neutral', size = 'md' }) {
  const tones = {
    neutral: { bg: 'var(--bg-inset)', color: 'var(--ink-1)', border: 'var(--line)' },
    blue: { bg: 'var(--blue-soft)', color: 'var(--blue)', border: 'var(--blue-line)' },
    amber: { bg: 'var(--amber-soft)', color: 'var(--amber)', border: 'var(--amber-line)' },
    rose: { bg: 'var(--rose-soft)', color: 'var(--rose)', border: 'var(--rose-line)' },
    green: { bg: 'var(--green-soft)', color: 'var(--green)', border: 'oklch(0.78 0.12 160 / 0.35)' },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: size === 'sm' ? '1px 6px' : '2px 8px',
      background: tones.bg, color: tones.color,
      border: `1px solid ${tones.border}`,
      borderRadius: 4, fontSize: size === 'sm' ? 10 : 11, fontWeight: 500,
      lineHeight: 1.4, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

Object.assign(window, { TitleBar, BrandMark, IconButton, Kbd, Panel, Meter, Confidence, Chip, appStyles });
