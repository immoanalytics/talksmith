// MeetingData.jsx — Simulated live meeting: script, nudges, metrics
// Drives the live dashboard. Exposes a useMeetingSim() hook.

const PARTICIPANTS = [
  { id: 'you', name: 'You',            color: 'oklch(0.72 0.14 250)', initials: 'YA', role: 'Host' },
  { id: 'pri', name: 'Priya Shanmugam', color: 'oklch(0.78 0.13 150)', initials: 'PS', role: 'PM' },
  { id: 'dan', name: 'Daniela Rojas',   color: 'oklch(0.78 0.13 30)',  initials: 'DR', role: 'Design' },
  { id: 'mar', name: 'Marcus Bell',     color: 'oklch(0.75 0.12 310)', initials: 'MB', role: 'Eng' },
];

// The coaching team. Six specialists plus a head coach that picks which
// specialist gets the floor. Each nudge is attributed to one specialist.
const COACHES = {
  listening: { id: 'listening', name: 'Listening coach',     watches: 'You — talk/listen ratio, silence after points, whether you jump in.' },
  clarity:   { id: 'clarity',   name: 'Clarity coach',       watches: 'You — filler words, sentence structure, whether your point lands.' },
  influence: { id: 'influence', name: 'Influence coach',     watches: 'You — whether your contributions shape what comes next.' },
  team:      { id: 'team',      name: 'Team dynamics coach', watches: 'The group — who is quiet, who is being talked over, safety signals.' },
  tone:      { id: 'tone',      name: 'Tone coach',          watches: 'The room — emotional temperature, sentiment, linguistic synchrony.' },
  outcomes:  { id: 'outcomes',  name: 'Outcomes coach',      watches: 'The arc — goal → reality → options → will, drift, time pressure.' },
  head:      { id: 'head',      name: 'Head coach',          watches: 'The coaches — picks the 1–2 cues that matter, enforces your goal weights.' },
};

// Head coach applies these weights based on your active goal. +1 = this
// coach gets louder (its cues score higher in the head coach's pick-2);
// −1 = quieter. This is how "Improve listening" turns up the listening
// coach and turns down the influence coach.
const GOAL_COACH_WEIGHTS = {
  listen:    { listening: +1, team: +0.5, influence: -0.5 },
  assertive: { influence: +1, outcomes: +0.5, listening: -0.3 },
  clarity:   { clarity:   +1, outcomes: +0.3 },
  balance:   { listening: +1, team: +0.8, influence: -0.3 },
};

// Transcript script — (speakerId, text, t in seconds, optionalTags)
const SCRIPT = [
  { t: 0,    s: 'you', txt: "Okay — let's walk through the Q2 roadmap. I've been thinking about this for a while and I want to share where my head's at before we open it up." },
  { t: 12,   s: 'you', txt: "The core thesis is that we've been shipping too many small features and the north-star metric hasn't moved. So I'm proposing we consolidate onto two bets this quarter." },
  { t: 26,   s: 'you', txt: "The first one is the onboarding rework — which I think is obvious, the funnel data is clear. The second is the search rebuild, and I know that's going to be more contentious." },
  { t: 42,   s: 'pri', txt: "Can I jump in for a—" , interrupted: true },
  { t: 43,   s: 'you', txt: "—let me just finish this thought. The reason search matters is that retention at week four is gated by discovery, and we've seen that in every cohort study since January." },
  { t: 60,   s: 'pri', txt: "Got it. I do want to push back a little on the framing though. The cohort studies you're referencing — those were run before the feed redesign shipped." },
  { t: 74,   s: 'dan', txt: "Yeah, and honestly the qualitative work we did last sprint suggests discovery isn't the top friction anymore. It's trust signals on individual items." },
  { t: 88,   s: 'mar', txt: "From an engineering standpoint, a full search rebuild is probably eight to ten weeks. That's the whole quarter for two engineers." },
  { t: 102,  s: 'you', txt: "That's fair. I hear you. Let me think about that." },
  { t: 110,  s: 'pri', txt: "Could we maybe scope it down? Like — what's the smallest version of the search bet that would tell us if it's worth doing the full rebuild next quarter?" },
  { t: 126,  s: 'dan', txt: "A two-week spike on ranking alone would answer most of the open questions I have." },
  { t: 138,  s: 'you', txt: "Okay, I like that. So what if we do onboarding as the big bet, and a two-week search ranking spike as the exploration?" },
  { t: 154,  s: 'mar', txt: "That works for capacity. I can have Rohan on the spike." },
  { t: 162,  s: 'pri', txt: "I'm in. Who's writing this up?" },
];

// Nudges, timed. Each nudge has id, type, t (s), title, detail, confidence, action
const NUDGE_SCRIPT = [
  { t: 18, id: 'n1',
    type: 'suggest',
    coach: 'listening',
    title: "You've been speaking for 18s",
    detail: "You're framing the decision before hearing input. Consider opening the floor.",
    confidence: 0.78,
    tone: 'amber',
    signals: ['Talk ratio 92%', 'No questions asked yet', 'Pace +14% vs baseline'],
    why: "Three people haven't spoken yet. An open question now gets you their read before you're committed to a position.",
    action: { label: 'Suggest phrase', phrase: '"Before I go further — what are you each seeing?"' },
    duration: 14,
  },
  { t: 43, id: 'n2',
    type: 'critical',
    coach: 'listening',
    title: "You cut Priya off — pause",
    detail: "You cut Priya off 0.4s in. This is the 3rd competitive overlap this week.",
    confidence: 0.94,
    tone: 'rose',
    signals: ['Competitive overlap (not backchannel)', 'Priya floor-time 0.4s', 'Pattern: 3× this week'],
    why: "Psychological-safety risk. Repair now costs less than letting it compound across meetings.",
    action: { label: 'Suggest repair', phrase: '"Sorry Priya — you were about to say something. Go ahead."' },
    duration: 12,
  },
  { t: 72, id: 'n3',
    type: 'insight',
    coach: 'tone',
    title: "Alignment is slipping",
    detail: "The room stopped mirroring your phrasing — a sign objections are landing but not being addressed.",
    confidence: 0.58,
    tone: 'blue',
    signals: ['Style match 0.72 → 0.50', 'Pronoun mirroring ↓', 'Shared-word overlap weak'],
    why: "When people stop adopting each other's language, disagreement is hardening. Paraphrase the last objection to re-anchor.",
    action: { label: 'Suggest phrase', phrase: '"So what I\'m hearing is the framing — not the bet itself — is the issue?"' },
    duration: 10,
  },
  { t: 98, id: 'n4',
    type: 'suggest',
    coach: 'influence',
    title: "Acknowledge Marcus's constraint",
    detail: "Capacity objection unacknowledged for 6s. Acknowledge before redirecting.",
    confidence: 0.71,
    tone: 'amber',
    signals: ['Concrete objection raised', 'Unacknowledged 6s', 'Stacking new points on top'],
    why: "Naming a constraint before pivoting shows you heard it. Skipping that step makes people repeat themselves or go quiet.",
    action: { label: 'Suggest phrase', phrase: '"That\'s a real constraint — thanks for flagging."' },
    duration: 8,
  },
  { t: 130, id: 'n5',
    type: 'insight',
    coach: 'outcomes',
    title: "Opportunity to summarize",
    detail: "Discussion has converged. A quick summary will lock in the decision.",
    confidence: 0.83,
    tone: 'blue',
    signals: ['Convergence detected', 'No new arguments 20s', 'Ready to commit'],
    why: "You've moved through goal, reality, and options. Name the decision now before the moment passes.",
    action: { label: 'Summarize', phrase: '"So — onboarding as the big bet, two-week search spike. Everyone aligned?"' },
    duration: 12,
  },
  { t: 155, id: 'n6',
    type: 'insight',
    coach: 'listening',
    title: "Good recovery",
    detail: "You acknowledged the capacity point and folded it in. Talk ratio balanced.",
    confidence: 0.88,
    tone: 'green',
    signals: ['Talk ratio 48%', 'Alignment recovered to 0.81', 'Positive tone shift'],
    why: "Reinforcement — this pattern helps your 'Improve listening' goal.",
    action: null,
    duration: 8,
    positive: true,
  },
];

// Global timeline of key events for the Review screen
const TIMELINE_EVENTS = [
  { t: 18,  type: 'dominance', label: 'Dominance spike', tone: 'amber' },
  { t: 42,  type: 'interrupt', label: 'Interruption',     tone: 'rose' },
  { t: 72,  type: 'tone',      label: 'Tone shift · tense', tone: 'blue' },
  { t: 98,  type: 'objection', label: 'Objection raised', tone: 'amber' },
  { t: 130, type: 'converge',  label: 'Convergence',      tone: 'blue' },
  { t: 155, type: 'recovery',  label: 'Good recovery',    tone: 'green' },
];

// Scenario library. Each scenario is a self-contained synthetic meeting that
// exercises a different mix of coaches. Useful for both demoing the product
// and as test fixtures — a Playwright smoke test can switch between scenarios
// to verify the head coach surfaces the right specialist.
//
// To add a scenario: copy one of these blocks, give it a unique id, and add
// at least 6 script lines + 1 nudge so the dynamics panel has data to read.
const SCENARIOS = {
  q2_roadmap: {
    id: 'q2_roadmap',
    name: 'Q2 roadmap sync',
    summary: 'Pushback on a quarter; recovery after concessions',
    duration: 175,
    startAt: 48,
    pplCount: 4,
    participants: PARTICIPANTS,
    script: SCRIPT,
    nudges: NUDGE_SCRIPT,
    timeline: TIMELINE_EVENTS,
  },

  tense_1on1: {
    id: 'tense_1on1',
    name: 'Skip-level feedback',
    summary: 'Hard feedback delivered in person; tone coach is busy',
    duration: 180,
    startAt: 0,
    pplCount: 2,
    participants: [
      { id: 'you', name: 'You',         color: 'oklch(0.72 0.14 250)', initials: 'YA', role: 'Director' },
      { id: 'mar', name: 'Marcus Bell', color: 'oklch(0.75 0.12 310)', initials: 'MB', role: 'Eng' },
    ],
    script: [
      { t: 0,    s: 'you', txt: "Hey Marcus — thanks for making time. I want to walk through the Q1 review feedback in person." },
      { t: 12,   s: 'mar', txt: "Yeah. I read it last night. Some of it was hard to take." },
      { t: 22,   s: 'you', txt: "I figured. I want to be honest with you — that's why I asked for the conversation, not Slack." },
      { t: 36,   s: 'mar', txt: "I just don't agree with the read on the platform launch. We hit the dates. We hit the metrics." },
      { t: 51,   s: 'you', txt: "You did. The feedback wasn't about the outcome — it was about how the team felt during the run-up." },
      { t: 67,   s: 'mar', txt: "So because people felt stressed, that's a performance issue?" },
      { t: 78,   s: 'you', txt: "It's a leadership signal. When good people stop wanting to be on a project, that's something we have to look at." },
      { t: 98,   s: 'mar', txt: "I push hard because I care about the work. I don't really know how to do this differently." },
      { t: 118,  s: 'you', txt: "I know, and I'm not asking you to care less. I'm asking you to read the room when the room is signaling." },
      { t: 138,  s: 'mar', txt: "Okay. I can try that." },
      { t: 152,  s: 'you', txt: "Let's not leave it at 'try'. Want to set a check-in two weeks out — agree on what reading the room looks like in practice?" },
      { t: 170,  s: 'mar', txt: "Yeah, that'd help." },
    ],
    nudges: [
      { t: 22, id: 'tn1', coach: 'listening', type: 'suggest',
        title: "Pause — let it land",
        detail: "He just said it was hard to read. Don't rush to reframe.",
        confidence: 0.82, tone: 'amber',
        signals: ['Acknowledgement gap < 1s', 'High-stakes opener'],
        why: "When someone admits something cost them, silence is more validating than reassurance.",
        action: { label: 'Suggest phrase', phrase: '"Yeah. I want you to know I get that — and that\'s why we\'re doing this here."' },
        duration: 12,
      },
      { t: 67, id: 'tn2', coach: 'tone', type: 'critical',
        title: "Tension just spiked",
        detail: "Marcus moved from defending to challenging. Acknowledge before answering.",
        confidence: 0.91, tone: 'rose',
        signals: ['Pace +18%', 'Pitch variance ↑', 'Frame shifted to confrontation'],
        why: "Answering a heated framing literally tends to escalate. Naming the temperature first usually de-escalates.",
        action: { label: 'Suggest phrase', phrase: '"That\'s a fair pushback. Let me try to be more precise."' },
        duration: 12,
      },
      { t: 98, id: 'tn3', coach: 'influence', type: 'insight',
        title: "He just opened a door",
        detail: "\"I don't know how to do this differently\" is a request, not a defense.",
        confidence: 0.76, tone: 'blue',
        signals: ['Self-disclosure marker', 'Affect softened'],
        why: "Treating self-disclosure as an opening to coach (not an opportunity to win) is what turns a hard conversation into a productive one.",
        action: { label: 'Suggest phrase', phrase: '"That\'s actually what I want us to figure out together."' },
        duration: 14,
      },
      { t: 152, id: 'tn4', coach: 'outcomes', type: 'insight',
        title: "Lock in the next step",
        detail: "Don't let \"I'll try\" be the conclusion. Concrete commitment now.",
        confidence: 0.84, tone: 'blue',
        signals: ['Vague commitment detected', 'No follow-up scheduled'],
        why: "Hard conversations fail at the close, not the middle. Pinning a date is what makes the change stick.",
        action: { label: 'Summarize', phrase: '"Two weeks from today, 30 mins, three specific moments. Sound good?"' },
        duration: 12,
      },
    ],
    timeline: [
      { t: 22,  type: 'pause',    label: 'Acknowledgement gap', tone: 'amber' },
      { t: 67,  type: 'tone',     label: 'Tension spike',       tone: 'rose'  },
      { t: 98,  type: 'opening',  label: 'Self-disclosure',     tone: 'blue'  },
      { t: 152, type: 'commit',   label: 'Vague commitment',    tone: 'amber' },
    ],
  },

  clear_decision: {
    id: 'clear_decision',
    name: 'Eng standup decision',
    summary: 'Crisp decision; coach is mostly silent (empty-state demo)',
    duration: 100,
    startAt: 0,
    pplCount: 4,
    participants: PARTICIPANTS,
    script: [
      { t: 0,   s: 'you', txt: "Quick one — we need to decide on rollout cadence for the search rebuild." },
      { t: 9,   s: 'mar', txt: "I'd suggest 5%, 25%, 50%, 100% — staged over two weeks." },
      { t: 22,  s: 'pri', txt: "Two weeks gives us enough metric signal at each step." },
      { t: 35,  s: 'dan', txt: "Works for design — I just need it landing before the design system migration." },
      { t: 50,  s: 'you', txt: "Locked. Marcus owns the staging plan. Priya owns the metric checks at each step." },
      { t: 68,  s: 'pri', txt: "Sounds good." },
      { t: 74,  s: 'mar', txt: "I'll have the rollout plan in the doc by EOD." },
    ],
    nudges: [
      { t: 70, id: 'cd1', coach: 'outcomes', type: 'insight',
        title: "Clean meeting",
        detail: "Decision committed in 60s. No drift, no circularity. This is the pattern.",
        confidence: 0.92, tone: 'green',
        signals: ['Decision in 60s', 'Owners assigned', 'Talk ratio balanced'],
        why: "Reinforcement — short crisp meetings are a feature, not an absence of one.",
        action: null,
        duration: 14,
        positive: true,
      },
    ],
    timeline: [
      { t: 50, type: 'decide', label: 'Decision committed', tone: 'green' },
      { t: 68, type: 'align',  label: 'All aligned',        tone: 'green' },
    ],
  },
};

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// Hook — returns current meeting simulation state.
// Heavy derivations (transcript slice, nudge windows, metrics) are memoized
// on boundary indices so they only recompute when something actually changed —
// not on every 100ms tick. This keeps each tick at near-zero CPU outside of
// transcript/nudge transitions.
function useMeetingSim({ running, speed = 1, startAt, activeGoal = 'listen', scenarioId = 'q2_roadmap' }) {
  // Resolve the scenario once per render. The inner names shadow the
  // module-level defaults so the existing references inside this hook
  // (SCRIPT, NUDGE_SCRIPT, PARTICIPANTS) keep working without rewrite.
  const scenario = SCENARIOS[scenarioId] || SCENARIOS.q2_roadmap;
  const SCRIPT = scenario.script;
  const NUDGE_SCRIPT = scenario.nudges;
  const PARTICIPANTS = scenario.participants;
  const TIMELINE_EVENTS = scenario.timeline;
  const totalDuration = scenario.duration;
  const effectiveStartAt = startAt != null ? startAt : (scenario.startAt ?? 0);

  const [t, setT] = React.useState(effectiveStartAt);
  // suppressed: id -> { mode: 'dismiss' } | { mode: 'snooze', until: number }.
  // Dismiss is permanent for the meeting; snooze hides the cue until t passes
  // `until`, then it becomes eligible to surface again.
  const [suppressed, setSuppressed] = React.useState(() => new Map());

  // Reset the clock and clear suppressed cues whenever the user picks a
  // different scenario. The stale-array fix lives in the memo deps below
  // (scenarioId is included so SCRIPT/NUDGE_SCRIPT changes are picked up);
  // this effect just snaps t back to the new scenario's startAt.
  const lastScenario = React.useRef(scenarioId);
  React.useEffect(() => {
    if (lastScenario.current !== scenarioId) {
      lastScenario.current = scenarioId;
      setT(effectiveStartAt);
      setSuppressed(new Map());
    }
  }, [scenarioId, effectiveStartAt]);

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setT(prev => {
        const next = prev + 0.1 * speed;
        if (next > totalDuration) {
          // Meeting looped — let suppressed cues come back so a re-watch isn't muted.
          setSuppressed(new Map());
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [running, speed, totalDuration]);

  // Transcript: stable until we cross a script line boundary OR the user
  // swaps scenarios (which changes SCRIPT under our feet).
  const transcriptCount = React.useMemo(() => {
    let i = 0;
    while (i < SCRIPT.length && SCRIPT[i].t <= t) i++;
    return i;
  }, [t, scenarioId]);
  const transcript = React.useMemo(
    () => SCRIPT.slice(0, transcriptCount),
    [transcriptCount, scenarioId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Candidate cues: window membership only changes at nudge t / t+duration
  // boundaries — and when the scenario changes (different nudge set).
  const candidateIds = React.useMemo(
    () => NUDGE_SCRIPT
      .filter(n => t >= n.t && t <= n.t + n.duration)
      .map(n => n.id)
      .join(','),
    [t, scenarioId]
  );
  const candidates = React.useMemo(
    () => NUDGE_SCRIPT.filter(n => {
      if (!(t >= n.t && t <= n.t + n.duration)) return false;
      const s = suppressed.get(n.id);
      if (!s) return true;
      if (s.mode === 'dismiss') return false;
      if (s.mode === 'snooze') return s.until <= t;
      return true;
    }),
    [candidateIds, suppressed, t, scenarioId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Head coach: hard cap of 2 simultaneous cues. Priority blends urgency tier
  // (rose > amber > blue > green), the cue's projected impact (impact over
  // frequency, per the research), confidence, and the active-goal weight so
  // the coach tied to your goal gets louder. It also surfaces at most one cue
  // per specialist coach at a time, so the stream stays varied rather than
  // letting a single noisy coach take both slots.
  const activeNudges = React.useMemo(() => {
    const toneRank = { rose: 300, amber: 200, blue: 100, green: 50 };
    const goalWeights = GOAL_COACH_WEIGHTS[activeGoal] || {};
    const ranked = candidates
      .map(n => ({
        n,
        score: (toneRank[n.tone] || 0)
             + nudgeImpact(n) * 120
             + n.confidence * 100
             + (goalWeights[n.coach] || 0) * 40,
      }))
      .sort((a, b) => b.score - a.score);

    const picked = [];
    const coachesSeen = new Set();
    for (const { n } of ranked) {
      if (picked.length >= 2) break;
      if (coachesSeen.has(n.coach)) continue; // one cue per coach
      coachesSeen.add(n.coach);
      picked.push(n);
    }
    return picked;
  }, [candidates, activeGoal]);

  // History grows only when t crosses a nudge's start time, or when the
  // scenario itself changes (different nudge set).
  const historyCount = React.useMemo(
    () => NUDGE_SCRIPT.filter(n => t >= n.t).length,
    [t, scenarioId]
  );
  const nudgeHistory = React.useMemo(
    () => NUDGE_SCRIPT.filter(n => t >= n.t).slice().reverse(),
    [historyCount, scenarioId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Metrics: split heavy work. The text analysis only re-runs when the
  // transcript actually grows; t-dependent curves recompute every tick but
  // are cheap arithmetic. analyzeTranscript also backs the post-meeting
  // scores, so the live readouts and the Review screen stay consistent.
  const analysis = React.useMemo(
    () => analyzeTranscript(transcript, PARTICIPANTS, 'you'),
    [transcript, PARTICIPANTS]
  );

  const metrics = React.useMemo(
    () => deriveMetrics(transcript, t, analysis, PARTICIPANTS),
    [transcript, t, analysis, PARTICIPANTS]
  );

  // Default snooze: 2 minutes of meeting time, matching the head-coach
  // policy that no cue should re-fire faster than the user can change behavior.
  const SNOOZE_SECS = 120;

  return {
    t, setT,
    transcript,
    activeNudges,
    nudgeHistory,
    metrics,
    dismissNudge: (id) => setSuppressed(prev => {
      const next = new Map(prev); next.set(id, { mode: 'dismiss' }); return next;
    }),
    snoozeNudge: (id) => setSuppressed(prev => {
      const next = new Map(prev); next.set(id, { mode: 'snooze', until: t + SNOOZE_SECS }); return next;
    }),
    participants: PARTICIPANTS,
    timelineEvents: TIMELINE_EVENTS,
    totalDuration,
    scenario,
    tc: fmtTime(t),
  };
}

function deriveMetrics(transcript, t, analysis, participants = PARTICIPANTS) {
  // Talk time per participant. Estimate seconds from a speaking-rate constant
  // (words / wpm) rather than a flat per-word factor, which tracks real
  // delivery better and keeps the live bar consistent with the score engine.
  const times = {};
  participants.forEach(p => times[p.id] = 0);
  transcript.forEach(l => {
    const secs = (l.txt.trim().split(/\s+/).filter(Boolean).length / SPEAK_WPM) * 60;
    times[l.s] = (times[l.s] || 0) + secs;
  });
  const total = Object.values(times).reduce((a, b) => a + b, 0) || 1;
  const talkRatio = participants.map(p => ({
    ...p,
    seconds: times[p.id],
    pct: Math.round((times[p.id] / total) * 100),
  }));

  // Interruption matrix — you→others and others→you
  // From the script, t=42 you cut Priya off at 43 (you→priya).
  let youInterruptedOthers = transcript.filter(l => l.interrupted && l.s !== 'you').length;
  let othersInterruptedYou = transcript.filter(l => l.interrupted && l.s === 'you').length;
  const interruptions = youInterruptedOthers + othersInterruptedYou;

  // Sentiment curve (synthetic but meeting-shaped)
  const sentiment = Math.max(0, Math.min(1,
    0.5
    + (t > 18 && t < 44 ? -0.1 : 0)
    + (t > 42 && t < 74 ? -0.18 : 0)
    + (t > 72 && t < 100 ? -0.22 : 0)
    + (t > 130 ? 0.2 : 0)
  ));

  // Engagement
  const recent = transcript.filter(l => l.t > t - 45);
  const uniqueSpeakers = new Set(recent.map(l => l.s)).size;
  const questions = recent.filter(l => l.txt.includes('?')).length;
  const engagement = Math.min(1, 0.3 + uniqueSpeakers * 0.15 + questions * 0.12);

  // Silence — gap since last line + contextual classification
  const last = transcript[transcript.length - 1];
  const silenceGap = last ? Math.max(0, t - last.t - last.txt.split(/\s+/).length * 0.35) : 0;
  // Context: if last line was a question, silence is "thinking" — healthy up to 6s
  const lastWasQuestion = last?.txt?.includes('?');
  const silenceContext = silenceGap < 1.5 ? 'flow'
    : lastWasQuestion ? (silenceGap < 6 ? 'thinking' : 'stalled')
    : (silenceGap < 3 ? 'pause' : 'dead-air');

  // Task vs relational utterance balance — approximated from acknowledgement
  // density in the analysis (relational markers) vs. everything else.
  const socio = analysis ? Math.round(analysis.acknowledged + analysis.ackRatio * 2) : 0;
  const task = Math.max(0, transcript.length - socio);
  const ipaTaskRatio = transcript.length ? task / transcript.length : 0.5;
  const ipaDeviation = Math.abs(ipaTaskRatio - 0.65);

  // Live clarity / assertiveness readouts straight from the text analysis.
  const fillerCount = analysis ? analysis.fillers : 0;
  const fillerRate = analysis ? analysis.fillerRate : 0;
  const hedgeCount = analysis ? analysis.hedges : 0;
  const openQuestions = analysis ? analysis.openQuestions : 0;
  const questionCount = analysis ? analysis.questionCount : 0;
  const longestMonologueSec = analysis ? analysis.longestMonologueSec : 0;

  // Psychological-safety read from interruption asymmetry: being talked over
  // repeatedly (others→you) or doing the talking-over (you→others) both erode
  // it. Balanced / quiet meetings read "healthy".
  const intrDelta = (analysis ? analysis.youInterruptedOthers + analysis.othersInterruptedYou : 0);
  const psychSafety = intrDelta === 0 ? 'healthy' : intrDelta === 1 ? 'watch' : 'at risk';

  // LSM (Linguistic Style Matching) — function-word overlap between You and others
  // Simulated smooth curve: high at start (monologue inflates), drops at 42 interrupt,
  // recovers at 102+ when you concede.
  const lsmBase = 0.72;
  const lsm = Math.max(0.42, Math.min(0.92,
    lsmBase
    + (t > 42 && t < 74 ? -0.22 : 0)
    + (t > 72 && t < 102 ? -0.15 : 0)
    + (t > 102 ? 0.12 : 0)
    + (t > 138 ? 0.05 : 0)
  ));

  // Audio quality — simulated dip around t=66–72 to demo low-confidence state
  const audioQuality = (t > 66 && t < 72) ? 0.38 : 0.94;

  // Acoustic tension (jitter/shimmer proxy) — spikes during interrupt + tense stretch
  const tension = Math.max(0, Math.min(1,
    0.22
    + (t > 42 && t < 50 ? 0.55 : 0)
    + (t > 72 && t < 92 ? 0.38 : 0)
    + (t > 130 ? -0.1 : 0)
  ));

  return {
    talkRatio, interruptions, sentiment, engagement, silenceGap, silenceContext,
    youInterruptedOthers, othersInterruptedYou,
    ipaTaskRatio, ipaDeviation,
    lsm,
    audioQuality,
    tension,
    fillerCount, fillerRate, hedgeCount,
    openQuestions, questionCount,
    longestMonologueSec, psychSafety,
    yourTalkPct: talkRatio.find(p => p.id === 'you')?.pct ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Scoring engine — turns a meeting transcript into explainable results.
//
// Everything here is deterministic and derived from the script text, so the
// post-meeting scores genuinely change per scenario instead of being canned.
// The same primitives back the live metrics, so live and review agree.
// ─────────────────────────────────────────────────────────────────────────

// Words that dilute clarity when over-used.
const RE_FILLER = /\b(um+|uh+|er+|ah+|like|you know|sort of|kinda|kind of|basically|literally|i mean|right\?)\b/gi;
// Qualifiers that soften / hedge a statement (lower assertiveness).
const RE_HEDGE  = /\b(maybe|perhaps|i think|i guess|i suppose|probably|possibly|might|just|a little|somewhat|kind of|sort of)\b/gi;
// Markers that acknowledge another person's point.
const RE_ACK    = /\b(thanks|that'?s fair|fair|good point|got it|i hear you|makes sense|i see|understood|appreciate|you'?re right|valid|sorry|hear you)\b/i;
// Markers that signal an objection / pushback from another speaker.
const RE_OBJECT = /\b(but |however|push ?back|disagree|not sure|concern|the issue|i'?d argue|that said|the problem|too (long|much|risky|big)|can'?t|won'?t|don'?t (agree|think))\b/i;
// Markers that a decision / commitment is being made.
const RE_DECIDE = /\b(let'?s|we'?ll|i'?ll (have|own|take)|owns?|locked|go with|decision|aligned|sounds good|works for|ship it|agree|i'?m in)\b/i;
// Open question stems (invite elaboration) vs. closed (yes/no).
const RE_OPEN_Q = /\b(what|how|why|tell me|walk me|help me understand|what if|which)\b/i;

const SPEAK_WPM = 145; // average speaking rate, for word→seconds estimates

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function countMatches(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}
function clamp(v, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

// Analyze a full transcript for one speaker (default "you") and the group.
// Returns a flat bag of structured signals other functions turn into scores.
function analyzeTranscript(script, participants, meId = 'you') {
  const lines = script || [];
  const mine = lines.filter(l => l.s === meId);
  const others = lines.filter(l => l.s !== meId);

  const wordsBySpeaker = {};
  for (const p of participants) wordsBySpeaker[p.id] = 0;
  for (const l of lines) wordsBySpeaker[l.s] = (wordsBySpeaker[l.s] || 0) + wordCount(l.txt);

  const yourWords = wordsBySpeaker[meId] || 0;
  const totalWords = Object.values(wordsBySpeaker).reduce((a, b) => a + b, 0) || 1;
  const talkPct = Math.round((yourWords / totalWords) * 100);

  // Clarity inputs (your speech only).
  const yourText = mine.map(l => l.txt).join(' ');
  const fillers = countMatches(yourText, RE_FILLER);
  const hedges = countMatches(yourText, RE_HEDGE);
  const fillerRate = (fillers / Math.max(1, yourWords)) * 100; // per 100 words
  const hedgeRate = (hedges / Math.max(1, yourWords)) * 100;
  const avgTurnWords = mine.length ? yourWords / mine.length : 0;

  // Questions you asked, split open vs. closed.
  const yourQuestions = mine.filter(l => l.txt.includes('?'));
  const openQuestions = yourQuestions.filter(l => RE_OPEN_Q.test(l.txt)).length;
  const questionCount = yourQuestions.length;

  // Objections raised by others, and whether you acknowledged within 2 turns.
  let objections = 0, acknowledged = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].s !== meId && RE_OBJECT.test(lines[i].txt)) {
      objections++;
      for (let j = i + 1; j <= i + 3 && j < lines.length; j++) {
        if (lines[j].s === meId && RE_ACK.test(lines[j].txt)) { acknowledged++; break; }
      }
    }
  }
  const ackRatio = objections ? acknowledged / objections : 1;

  // Interruption asymmetry. An `interrupted` line was cut off (the victim);
  // the next line's speaker is the interrupter.
  let youInterruptedOthers = 0, othersInterruptedYou = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].interrupted) continue;
    const victim = lines[i].s;
    const interrupter = lines[i + 1] && lines[i + 1].s;
    if (interrupter === meId && victim !== meId) youInterruptedOthers++;
    if (victim === meId && interrupter && interrupter !== meId) othersInterruptedYou++;
  }

  // Longest unbroken stretch of you talking, in estimated seconds.
  let runWords = 0, longestRunWords = 0;
  for (const l of lines) {
    if (l.s === meId) { runWords += wordCount(l.txt); longestRunWords = Math.max(longestRunWords, runWords); }
    else runWords = 0;
  }
  const longestMonologueSec = Math.round((longestRunWords / SPEAK_WPM) * 60);

  // Influence: decisions that land after you've spoken, and how often others
  // pick up the thread right after your turns.
  let decisions = 0, decisionsAfterYou = 0, responsesToYou = 0;
  for (let i = 0; i < lines.length; i++) {
    if (RE_DECIDE.test(lines[i].txt)) {
      decisions++;
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        if (lines[j].s === meId) { decisionsAfterYou++; break; }
      }
    }
    if (i > 0 && lines[i - 1].s === meId && lines[i].s !== meId) responsesToYou++;
  }
  const adoptedRatio = decisions ? decisionsAfterYou / decisions : 0;
  const responseRate = mine.length ? Math.min(1, responsesToYou / mine.length) : 0;

  // Group speaking balance — normalized entropy across speakers who spoke.
  const shares = participants
    .map(p => (wordsBySpeaker[p.id] || 0) / totalWords)
    .filter(s => s > 0);
  let entropy = 0;
  for (const s of shares) entropy -= s * Math.log(s);
  const maxEntropy = Math.log(Math.max(2, shares.length));
  const speakerBalance = maxEntropy ? entropy / maxEntropy : 0;
  const spokeCount = shares.length;

  const durationSec = lines.length ? lines[lines.length - 1].t + 8 : 0;
  const questionRate = durationSec ? questionCount / (durationSec / 60) : 0;

  return {
    meId, talkPct, yourWords, totalWords,
    fillers, hedges, fillerRate, hedgeRate, avgTurnWords,
    questionCount, openQuestions,
    objections, acknowledged, ackRatio,
    youInterruptedOthers, othersInterruptedYou,
    longestMonologueSec,
    decisions, decisionsAfterYou, adoptedRatio, responseRate,
    speakerBalance, spokeCount, questionRate,
    participantCount: participants.length,
  };
}

// Turn an analysis into the four user-facing scores plus a composite grade.
// Each score carries the concrete signals that produced it (explainability).
function scoreFromAnalysis(a) {
  const round = Math.round;

  // Talk ratio is reported as-is; lower is better (target < 50%).
  const talkRatio = a.talkPct;
  const talkTone = talkRatio > 70 ? 'rose' : talkRatio > 55 ? 'amber' : 'green';

  const clarity = round(clamp(
    100 - a.fillerRate * 6 - a.hedgeRate * 3 - Math.max(0, a.avgTurnWords - 24) * 1.4
  ));
  const listening = round(clamp(
    55 + a.ackRatio * 25 + (a.questionCount ? (a.openQuestions / a.questionCount) * 10 : 0)
    - Math.max(0, a.talkPct - 50) * 0.8 - a.youInterruptedOthers * 10
    - (a.objections - a.acknowledged) * 4
  ));
  const influence = round(clamp(
    45 + a.adoptedRatio * 30 + a.responseRate * 18 - a.hedgeRate * 2.5
    + (a.decisions ? 7 : 0)
  ));
  const engagement = round(clamp(
    38 + a.speakerBalance * 38 + Math.min(1, a.questionRate / 2) * 14
    + (a.spokeCount >= a.participantCount ? 10 : 0)
  ));

  // Composite: balance (from talk ratio) + the three skill scores.
  const balance = clamp(100 - Math.max(0, a.talkPct - 50) * 2);
  const overall = round(0.18 * balance + 0.27 * clarity + 0.27 * influence + 0.28 * listening);
  const grade = overall >= 85 ? 'A' : overall >= 75 ? 'B' : overall >= 65 ? 'C' : overall >= 55 ? 'D' : 'E';

  const pct = (x) => `${Math.round(x * 100)}%`;
  return {
    talkRatio, clarity, influence, listening, engagement, overall, grade,
    tones: {
      talkRatio: talkTone,
      clarity: clarity >= 75 ? 'green' : clarity >= 60 ? 'amber' : 'rose',
      influence: influence >= 70 ? 'green' : influence >= 55 ? 'amber' : 'rose',
      listening: listening >= 70 ? 'green' : listening >= 55 ? 'amber' : 'rose',
    },
    signals: {
      talkRatio: [
        `You spoke ${a.talkPct}% (${a.spokeCount} of ${a.participantCount} spoke)`,
        a.longestMonologueSec > 25 ? `Longest stretch ${a.longestMonologueSec}s uninterrupted` : `No long monologues`,
      ],
      clarity: [
        `${a.fillers} filler${a.fillers === 1 ? '' : 's'} (${a.fillerRate.toFixed(1)}/100 words)`,
        `${a.hedges} hedge${a.hedges === 1 ? '' : 's'}`,
        `Avg ${Math.round(a.avgTurnWords)} words/turn`,
      ],
      influence: [
        a.decisions ? `${a.decisionsAfterYou}/${a.decisions} decisions followed your turn` : `No decisions reached`,
        `Others built on you ${pct(a.responseRate)} of your turns`,
      ],
      listening: [
        a.objections ? `Acknowledged ${a.acknowledged}/${a.objections} objections` : `No objections raised`,
        `${a.questionCount} question${a.questionCount === 1 ? '' : 's'} (${a.openQuestions} open)`,
        a.youInterruptedOthers ? `You interrupted ${a.youInterruptedOthers}×` : `No interruptions by you`,
      ],
    },
  };
}

// Convenience: score a whole scenario object.
function scoreScenario(scenario) {
  const a = analyzeTranscript(scenario.script, scenario.participants, 'you');
  return { ...scoreFromAnalysis(a), analysis: a };
}

// Projected impact of a cue, 0–1. The head coach prioritizes impact over
// frequency, so a high-impact critical cue outranks a stream of low-impact
// ones. An explicit `impact` on the nudge wins; otherwise we infer from type.
function nudgeImpact(n) {
  if (typeof n.impact === 'number') return n.impact;
  if (n.positive) return 0.3;            // reinforcement is nice-to-have
  return { critical: 1, suggest: 0.65, insight: 0.5 }[n.type] ?? 0.5;
}

// Personal learning model — aggregates the user's recent meetings (the
// scenario library, treated as meeting history) into the numbers the Profile
// screen shows. Derived from the same scoring engine, so Profile agrees with
// Live and Review instead of inventing its own figures.
function profileModel() {
  const scored = Object.values(SCENARIOS).map(s => ({ scenario: s, ...scoreScenario(s) }));
  const n = scored.length || 1;
  const avg = (sel) => scored.reduce((a, x) => a + sel(x), 0) / n;

  const avgTalk = Math.round(avg(x => x.talkRatio));
  const avgClarity = Math.round(avg(x => x.clarity));
  const avgListening = Math.round(avg(x => x.listening));
  const avgInfluence = Math.round(avg(x => x.influence));
  const avgEngagement = Math.round(avg(x => x.engagement));
  const avgOverall = Math.round(avg(x => x.overall));
  const overallGrade = avgOverall >= 85 ? 'A' : avgOverall >= 75 ? 'B' : avgOverall >= 65 ? 'C' : avgOverall >= 55 ? 'D' : 'E';

  const totalInterruptions = scored.reduce((a, x) => a + x.analysis.youInterruptedOthers, 0);
  const interruptionsPerMtg = +(totalInterruptions / n).toFixed(1);
  const avgFillerRate = +avg(x => x.analysis.fillerRate).toFixed(1);

  const skills = [
    { key: 'Clarity', v: avgClarity },
    { key: 'Influence', v: avgInfluence },
    { key: 'Listening', v: avgListening },
  ].sort((a, b) => b.v - a.v);
  const strongest = skills[0], weakest = skills[skills.length - 1];

  const byInterrupt = scored.slice().sort((a, b) => b.analysis.youInterruptedOthers - a.analysis.youInterruptedOthers)[0];

  // Sign of the turn-length ↔ clarity relationship across meetings, so the
  // "what the model learned" note is actually backed by the data on screen.
  const meanTurn = avg(x => x.analysis.avgTurnWords);
  const meanClarity = avgClarity;
  let cov = 0;
  for (const x of scored) cov += (x.analysis.avgTurnWords - meanTurn) * (x.clarity - meanClarity);
  const shorterTurnsClearer = cov <= 0;

  const goalProgress = {
    listen: avgListening,
    assertive: avgInfluence,
    clarity: avgClarity,
    balance: Math.round(clamp(100 - Math.max(0, avgTalk - 50) * 2)),
  };

  return {
    n, avgTalk, avgClarity, avgListening, avgInfluence, avgEngagement,
    avgOverall, overallGrade, totalInterruptions, interruptionsPerMtg,
    avgFillerRate, strongest, weakest, byInterrupt, shorterTurnsClearer,
    goalProgress, scored,
  };
}

window.MeetingData = {
  PARTICIPANTS, SCRIPT, NUDGE_SCRIPT, TIMELINE_EVENTS,
  COACHES, GOAL_COACH_WEIGHTS, SCENARIOS,
  fmtTime, useMeetingSim, deriveMetrics,
  analyzeTranscript, scoreFromAnalysis, scoreScenario, nudgeImpact, profileModel,
};
