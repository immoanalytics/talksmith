// LiveDashboard.jsx — the main screen

function Transcript({ transcript, participants, t }) {
  const scrollRef = React.useRef();
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript.length]);

  const p = (id) => participants.find(x => x.id === id);
  const last = transcript[transcript.length - 1];
  const currentSpeaker = last ? p(last.s) : null;

  return (
    <div ref={scrollRef} className="scroll" style={{
      flex: 1, overflowY: 'auto',
      padding: '8px 16px 16px', minHeight: 0,
    }}>
      {transcript.map((l, i) => {
        const prev = transcript[i-1];
        const showSpeaker = !prev || prev.s !== l.s;
        const speaker = p(l.s);
        const isYou = l.s === 'you';
        const isCurrent = i === transcript.length - 1;
        return (
          <div key={i} style={{
            marginTop: showSpeaker ? 12 : 2,
            animation: isCurrent ? 'fadeUp 280ms var(--ease) both' : 'none',
          }}>
            {showSpeaker && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 4,
                  background: speaker.color, opacity: 0.25,
                  border: `1px solid ${speaker.color}`,
                  display: 'grid', placeItems: 'center',
                  fontSize: 9, fontWeight: 600, color: speaker.color,
                  fontFamily: 'var(--font-mono)',
                }}>{speaker.initials}</span>
                <span style={{
                  fontSize: 11.5, fontWeight: 600, color: isYou ? 'var(--ink-0)' : 'var(--ink-1)',
                }}>{speaker.name}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                  {MeetingData.fmtTime(l.t)}
                </span>
                {l.interrupted && (
                  <Chip tone="rose" size="sm">interrupted</Chip>
                )}
              </div>
            )}
            <div style={{
              fontSize: 13, lineHeight: 1.55,
              color: isYou ? 'var(--ink-0)' : 'var(--ink-1)',
              paddingLeft: 25,
              textWrap: 'pretty',
            }}>
              {l.txt}
              {isCurrent && <TypingCaret />}
            </div>
          </div>
        );
      })}
      {transcript.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
          Waiting for audio…
        </div>
      )}
    </div>
  );
}

function TypingCaret() {
  return (
    <span style={{
      display: 'inline-block', width: 2, height: '1em',
      background: 'currentColor', marginLeft: 2,
      verticalAlign: 'text-bottom',
      animation: 'breathe 1.2s ease-in-out infinite',
    }} />
  );
}

function LevelBars({ active = true, count = 5, color = 'var(--rose)' }) {
  return (
    <div style={{ display: 'inline-flex', gap: 2, alignItems: 'center', height: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{
          width: 2, height: 10, background: color, borderRadius: 1,
          transformOrigin: 'center',
          animation: active ? `levelBar ${0.6 + i * 0.13}s ease-in-out infinite` : 'none',
          opacity: active ? 1 : 0.3,
          animationDelay: `${i * 0.08}s`,
        }}/>
      ))}
    </div>
  );
}

function TalkRatioBar({ participants }) {
  return (
    <div>
      <div style={{
        display: 'flex', height: 22, borderRadius: 5, overflow: 'hidden',
        border: '1px solid var(--line)', background: 'var(--bg-inset)',
      }}>
        {participants.map(p => p.pct > 0 && (
          <div key={p.id} style={{
            width: `${p.pct}%`, background: p.color, opacity: 0.75,
            transition: 'width 600ms var(--ease)',
            display: 'grid', placeItems: 'center',
            fontSize: 10, color: 'var(--bg-0)', fontWeight: 600,
            minWidth: p.pct > 6 ? 20 : 0,
            fontFamily: 'var(--font-mono)',
          }}>{p.pct > 8 ? `${p.pct}%` : ''}</div>
        ))}
      </div>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {participants.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
            <span style={{ flex: 1, color: p.id === 'you' ? 'var(--ink-0)' : 'var(--ink-1)' }}>
              {p.name}
            </span>
            <span className="mono" style={{ color: 'var(--ink-2)' }}>
              {Math.floor(p.seconds)}s
            </span>
            <span className="mono" style={{
              color: p.id === 'you' && p.pct > 60 ? 'var(--amber)' : 'var(--ink-1)',
              width: 28, textAlign: 'right', fontWeight: 500,
            }}>{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SentimentGauge({ value }) {
  // value 0 (tense) to 1 (calm)
  const label = value > 0.7 ? 'Calm' : value > 0.5 ? 'Neutral' : value > 0.3 ? 'Focused' : 'Tense';
  const color = value > 0.6 ? 'var(--green)' : value > 0.4 ? 'var(--blue)' : value > 0.25 ? 'var(--amber)' : 'var(--rose)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--ink-2)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
        <span>Tense</span><span>Calm</span>
      </div>
      <div style={{
        position: 'relative', height: 6, borderRadius: 3,
        background: 'linear-gradient(to right, var(--rose-soft), var(--amber-soft), var(--blue-soft), var(--green-soft))',
        border: '1px solid var(--line-soft)',
      }}>
        <div style={{
          position: 'absolute', top: -3, left: `${value * 100}%`,
          transform: 'translateX(-50%)',
          width: 10, height: 10, borderRadius: '50%',
          background: color, border: '2px solid var(--bg-1)',
          boxShadow: '0 0 0 1px ' + color,
          transition: 'left 600ms var(--ease), background 600ms var(--ease)',
        }}/>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function MetricTile({ label, value, suffix, trend, hint, color = 'var(--ink-0)' }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: 'var(--bg-2)',
      border: '1px solid var(--line-soft)',
      borderRadius: 8,
    }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="mono" style={{ fontSize: 20, fontWeight: 600, color, letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {suffix && <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{suffix}</span>}
      </div>
      {hint && <div style={{ fontSize: 10.5, color: 'var(--ink-2)', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function GuidanceStream({ active, history, onDismiss, onSnooze, variant, muted }) {
  if (muted) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 30, color: 'var(--ink-2)', textAlign: 'center', gap: 10,
      }}>
        <div style={{ opacity: 0.5 }}>{I('bellOff', { size: 22 })}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 }}>Coaching muted</div>
        <div style={{ fontSize: 12, maxWidth: 240 }}>
          Still recording & analyzing. Review insights after the meeting.
        </div>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Active region */}
      <div style={{
        padding: '14px 14px 10px',
        flexShrink: 0,
        minHeight: active.length ? 0 : 100,
      }}>
        {active.length === 0 ? (
          <div style={{
            padding: '20px 14px',
            background: 'var(--bg-inset)',
            border: '1px dashed var(--line)',
            borderRadius: 'var(--radius)',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--bg-2)', border: '1px solid var(--line)',
              display: 'grid', placeItems: 'center',
              color: 'var(--ink-2)',
              animation: 'breathe 2.4s ease-in-out infinite',
            }}>{I('pulse', { size: 13 })}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-1)', fontWeight: 500 }}>Listening</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>No active cues</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {active.map(n => (
              <Nudge key={n.id} nudge={n} onDismiss={onDismiss} onSnooze={onSnooze} variant={variant}/>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div style={{
        padding: '10px 14px 4px',
        borderTop: '1px solid var(--line-soft)',
        display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0,
      }}>
        <span className="eyebrow">History</span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
          {history.length} in this meeting
        </span>
      </div>
      <div className="scroll" style={{
        flex: 1, overflowY: 'auto', padding: '4px 14px 14px',
        display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0,
      }}>
        {history.filter(n => !active.find(a => a.id === n.id)).map(n => (
          <HistoryItem key={n.id} nudge={n} />
        ))}
        {history.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', padding: '8px 0' }}>
            Dismissed and completed cues will appear here.
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryItem({ nudge }) {
  const tone = nudge.tone;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '6px 8px', borderRadius: 6,
      transition: 'background var(--speed)',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: `var(--${tone})`, marginTop: 7, flexShrink: 0, opacity: 0.6,
      }}/>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11.5, color: 'var(--ink-1)', lineHeight: 1.35 }}>{nudge.title}</div>
      </div>
      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
        {MeetingData.fmtTime(nudge.t)}
      </span>
    </div>
  );
}

// High-alert edge pulse — ambient peripheral cue
function HighAlertFrame({ active }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none',
      boxShadow: active ? 'inset 0 0 0 2px var(--rose), inset 0 0 40px 0 oklch(0.7 0.18 18 / 0.15)' : 'none',
      transition: 'box-shadow 400ms var(--ease)',
      animation: active ? 'pulseEdge 2s ease-in-out infinite' : 'none',
      borderRadius: 'inherit', zIndex: 5,
    }}/>
  );
}

function LiveDashboard({ sim, running, onToggleRun, muted, onToggleMute, variant, speed, onSpeed }) {
  const highAlert = sim.activeNudges.some(n => n.tone === 'rose');

  return (
    <div style={{
      flex: 1, display: 'grid',
      gridTemplateColumns: '1.2fr 1.4fr 1fr',
      gap: 14, padding: 14, minHeight: 0, position: 'relative',
    }}>
      <HighAlertFrame active={highAlert && !muted} />

      {/* LEFT — Transcript */}
      <Panel
        eyebrow="Transcript"
        title="Live"
        dense
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {running ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LevelBars active />
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-2)' }}>
                  {sim.participants.find(p => p.id === sim.transcript[sim.transcript.length-1]?.s)?.name || '—'}
                </span>
              </div>
            ) : (
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>Paused</span>
            )}
          </div>
        }
      >
        <Transcript transcript={sim.transcript} participants={sim.participants} t={sim.t}/>
      </Panel>

      {/* CENTER — Guidance, from the head coach */}
      <Panel
        eyebrow="Guidance"
        title="Head coach"
        dense
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconButton tip={running ? 'Pause (Space)' : 'Resume (Space)'} onClick={onToggleRun}>
              {running ? I('pause', { size: 12 }) : I('play', { size: 12 })}
            </IconButton>
            <button onClick={() => onSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1)}
              className="mono"
              style={{
                border: '1px solid var(--line)', background: 'var(--bg-inset)',
                color: 'var(--ink-1)', fontSize: 10.5, padding: '3px 6px',
                borderRadius: 5, cursor: 'pointer', minWidth: 28,
              }}>{speed}×</button>
            <IconButton tip="Mute coaching (⌘M)" onClick={onToggleMute} active={muted} danger={muted}>
              {muted ? I('bellOff', { size: 12 }) : I('bell', { size: 12 })}
            </IconButton>
          </div>
        }
      >
        <GuidanceStream
          active={sim.activeNudges}
          history={sim.nudgeHistory}
          onDismiss={sim.dismissNudge}
          onSnooze={sim.dismissNudge}
          variant={variant}
          muted={muted}
        />
      </Panel>

      {/* RIGHT — Dynamics */}
      <Panel eyebrow="Dynamics" title="Live" dense
        right={sim.metrics.audioQuality < 0.6 ? (
          <span style={{
            fontSize: 10.5, padding: '3px 7px',
            background: 'var(--bg-inset)', border: '1px dashed var(--line)',
            borderRadius: 999, color: 'var(--ink-2)',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--amber)' }}/>
            low audio
          </span>
        ) : null}
      >
        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 18, minHeight: 0 }}>
          {/* Listening coach — your talk/silence balance */}
          <CoachBlock name="Listening coach" scope="watching you">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span className="eyebrow">Speaking time</span>
                <div style={{ flex: 1 }}/>
                {sim.metrics.yourTalkPct > 60 && (
                  <Chip tone="amber" size="sm">above balance</Chip>
                )}
              </div>
              <TalkRatioBar participants={sim.metrics.talkRatio}/>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', marginBottom: 6 }}>
                <span className="eyebrow">Silence after points</span>
                <div style={{flex:1}}/>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-2)' }}>
                  {sim.metrics.silenceContext}
                </span>
              </div>
              <SilenceBar gap={sim.metrics.silenceGap} context={sim.metrics.silenceContext}/>
            </div>
          </CoachBlock>

          {/* Team dynamics coach — group health */}
          <CoachBlock name="Team dynamics coach" scope="watching the group">
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Who's talking over whom</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <InterruptCell
                  label="you → others"
                  value={sim.metrics.youInterruptedOthers}
                  tone={sim.metrics.youInterruptedOthers > 0 ? 'rose' : 'neutral'}
                />
                <InterruptCell
                  label="others → you"
                  value={sim.metrics.othersInterruptedYou}
                  tone="neutral"
                />
              </div>
            </div>
            <MetricTile
              label="Engagement"
              value={Math.round(sim.metrics.engagement * 100)}
              suffix="/100"
              hint="3 speakers · active"
              color={sim.metrics.engagement > 0.6 ? 'var(--green)' : 'var(--ink-0)'}
            />
          </CoachBlock>

          {/* Tone coach — room temperature + alignment */}
          <CoachBlock name="Tone coach" scope="watching the room">
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Room temperature</div>
              <SentimentGauge value={sim.metrics.sentiment}/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{
                padding: '10px 11px', background: 'var(--bg-2)',
                border: '1px solid var(--line-soft)', borderRadius: 8,
              }}>
                <div className="eyebrow" style={{ marginBottom: 4 }}>Alignment</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span className="mono" style={{ fontSize: 18, fontWeight: 600,
                    color: sim.metrics.lsm < 0.55 ? 'var(--rose)' : sim.metrics.lsm > 0.75 ? 'var(--green)' : 'var(--ink-0)',
                    letterSpacing:'-0.02em',
                  }}>{sim.metrics.lsm.toFixed(2)}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <Meter value={sim.metrics.lsm * 100} color={sim.metrics.lsm < 0.55 ? 'var(--rose)' : 'var(--blue)'} height={3}/>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-2)', marginTop: 5 }}>
                  {sim.metrics.lsm < 0.55 ? 'misaligned' : sim.metrics.lsm > 0.75 ? 'in sync' : 'matching'}
                </div>
              </div>
              <MetricTile
                label="Pace"
                value={Math.round(142 + sim.metrics.tension * 26)}
                suffix="wpm"
                hint="baseline 142"
                color={sim.metrics.tension > 0.5 ? 'var(--amber)' : 'var(--ink-0)'}
              />
            </div>
          </CoachBlock>

          {/* Outcomes coach — meeting arc */}
          <CoachBlock name="Outcomes coach" scope="watching the arc">
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Meeting goals</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <GoalRow label="Speak less than 50%" current={sim.metrics.yourTalkPct} target={50} invert/>
                <GoalRow label="Ask ≥ 3 questions" current={Math.floor(sim.t / 60)} target={3}/>
                <GoalRow label="Acknowledge objections" current={sim.t > 102 ? 1 : 0} target={2}/>
              </div>
            </div>
          </CoachBlock>

          {/* Head coach — graceful degradation */}
          {sim.metrics.audioQuality < 0.6 && (
            <div style={{
              padding: '9px 11px', background: 'var(--bg-inset)',
              border: '1px dashed var(--amber-line)', borderRadius: 6,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ color: 'var(--amber)', marginTop: 1 }}>{I('info', { size: 12 })}</span>
              <div style={{ fontSize: 11, color: 'var(--ink-1)', lineHeight: 1.4 }}>
                <div style={{ fontWeight: 600, color: 'var(--ink-0)', marginBottom: 2 }}>Head coach paused the team</div>
                Low audio quality — multi-speaker overlap detected. Cues resume once signal stabilizes.
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function GoalRow({ label, current, target, invert = false }) {
  const ratio = invert
    ? Math.max(0, 1 - current / target)
    : Math.min(1, current / target);
  const done = invert ? current <= target : current >= target;
  return (
    <div>
      <div style={{ display: 'flex', fontSize: 11.5, marginBottom: 3 }}>
        <span style={{ flex: 1, color: 'var(--ink-1)' }}>{label}</span>
        <span className="mono" style={{ color: done ? 'var(--green)' : 'var(--ink-2)' }}>
          {current}{invert ? '%' : ''} / {target}{invert ? '%' : ''}
        </span>
      </div>
      <Meter value={ratio * 100} color={done ? 'var(--green)' : 'var(--blue)'} height={3}/>
    </div>
  );
}

// Groups a set of dynamics metrics under a named coach persona.
function CoachBlock({ name, scope, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 8,
        paddingBottom: 6, borderBottom: '1px solid var(--line-soft)',
      }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-0)', letterSpacing: '-0.01em' }}>
          {name}
        </span>
        <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
          {scope}
        </span>
      </div>
      {children}
    </div>
  );
}

function InterruptCell({ label, value, tone }) {
  const color = tone === 'rose' ? 'var(--rose)' : 'var(--ink-0)';
  return (
    <div style={{
      padding: '8px 10px', background: 'var(--bg-2)',
      border: '1px solid var(--line-soft)', borderRadius: 7,
    }}>
      <div style={{ fontSize: 10, color: 'var(--ink-2)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="mono" style={{
          fontSize: 18, fontWeight: 600, color, letterSpacing: '-0.02em',
        }}>{value}</span>
        <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{value === 1 ? 'event' : 'events'}</span>
      </div>
    </div>
  );
}

function SilenceBar({ gap, context }) {
  // 0–6s visual; color by context
  const pct = Math.min(100, (gap / 6) * 100);
  const color =
    context === 'dead-air' ? 'var(--amber)' :
    context === 'stalled'  ? 'var(--amber)' :
    context === 'thinking' ? 'var(--blue)' :
    context === 'pause'    ? 'var(--ink-2)' :
                             'var(--ink-3)';
  return (
    <div>
      <div style={{
        position: 'relative', height: 6, borderRadius: 3, overflow: 'hidden',
        background: 'var(--bg-inset)', border: '1px solid var(--line-soft)',
      }}>
        <div style={{
          position: 'absolute', inset: 0, width: pct + '%', background: color,
          transition: 'width 300ms var(--ease), background 300ms var(--ease)',
        }}/>
      </div>
      <div style={{ display: 'flex', marginTop: 4, fontSize: 10, color: 'var(--ink-2)' }} className="mono">
        <span>{gap.toFixed(1)}s</span>
        <div style={{ flex: 1 }}/>
        <span>dead-air &gt; 4s</span>
      </div>
    </div>
  );
}

window.LiveDashboard = LiveDashboard;
