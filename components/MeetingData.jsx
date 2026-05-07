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

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// Hook — returns current meeting simulation state
function useMeetingSim({ running, speed = 1, startAt = 0, activeGoal = 'listen' }) {
  const [t, setT] = React.useState(startAt);
  const [dismissed, setDismissed] = React.useState(new Set());
  const rafRef = React.useRef();
  const lastRef = React.useRef();

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setT(prev => {
        const next = prev + 0.1 * speed;
        return next > 175 ? 0 : next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [running, speed]);

  // transcript up to t
  const transcript = SCRIPT.filter(l => l.t <= t);

  // Candidate cues inside the current time window and not dismissed.
  const candidates = NUDGE_SCRIPT.filter(n =>
    t >= n.t && t <= n.t + n.duration && !dismissed.has(n.id)
  );

  // Head coach: hard cap of 2 simultaneous cues. Priority = urgency tier
  // (rose > amber > blue > green) + confidence, modulated by active-goal
  // weights so the coach tied to your goal gets louder.
  const toneRank = { rose: 300, amber: 200, blue: 100, green: 50 };
  const goalWeights = GOAL_COACH_WEIGHTS[activeGoal] || {};
  const activeNudges = candidates
    .map(n => ({
      n,
      score: (toneRank[n.tone] || 0)
           + n.confidence * 100
           + (goalWeights[n.coach] || 0) * 40,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(x => x.n);

  // recent history of nudges (for feed)
  const nudgeHistory = NUDGE_SCRIPT.filter(n => t >= n.t).slice().reverse();

  // live metrics — derived from transcript up to t
  const metrics = deriveMetrics(transcript, t);

  return {
    t, setT,
    transcript,
    activeNudges,
    nudgeHistory,
    metrics,
    dismissNudge: (id) => setDismissed(prev => new Set(prev).add(id)),
    participants: PARTICIPANTS,
    timelineEvents: TIMELINE_EVENTS,
    totalDuration: 175,
    tc: fmtTime(t),
  };
}

function deriveMetrics(transcript, t) {
  // Talk time per participant (approximated by words in their lines)
  const times = {};
  PARTICIPANTS.forEach(p => times[p.id] = 0);
  transcript.forEach(l => {
    times[l.s] = (times[l.s] || 0) + l.txt.split(/\s+/).length * 0.35;
  });
  const total = Object.values(times).reduce((a, b) => a + b, 0) || 1;
  const talkRatio = PARTICIPANTS.map(p => ({
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

  // IPA equilibrium (Bales) — task vs socio-emotional
  // Heuristic: questions + agreement markers ("yeah","got it","fair","thanks") = socio
  // declaratives / directives = task
  const lower = transcript.map(l => l.txt.toLowerCase());
  const socio = lower.filter(x => /\b(thanks|fair|got it|i hear you|yeah|i'm in|works for|sorry)\b/.test(x)).length;
  const task = transcript.length - socio;
  const ipaTaskRatio = transcript.length ? task / transcript.length : 0.5;
  // optimal ~0.65 task, 0.35 socio
  const ipaDeviation = Math.abs(ipaTaskRatio - 0.65);

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
    yourTalkPct: talkRatio.find(p => p.id === 'you')?.pct ?? 0,
  };
}

window.MeetingData = {
  PARTICIPANTS, SCRIPT, NUDGE_SCRIPT, TIMELINE_EVENTS, COACHES, GOAL_COACH_WEIGHTS,
  fmtTime, useMeetingSim,
};
