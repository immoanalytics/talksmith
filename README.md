# Talksmith

A real-time meeting coach UI prototype. Self-contained `Talksmith.html` runs in
any modern browser — React 18 and Babel are loaded from a CDN at runtime, no
build step.

## Run it

Open `Talksmith.html` (or `index.html`) in a browser. That's it — this dev
page loads React and Babel from a CDN and compiles the JSX in the browser, so
edits need no build step.

For the fast, deployable version:

```sh
npm install
npm run build   # → dist/: precompiled + minified JSX, React vendored locally
npm start       # serves dist/ on $PORT (default 4321)
```

The build drops the ~3 MB Babel download and in-browser compile and has no
runtime CDN dependency. It is deployed on Railway with `railway.json`.

If React/Babel can't be fetched (offline, CDN blocked) the loading screen says
so instead of spinning forever.

## Keyboard

| Keys | Action |
| --- | --- |
| ⌘/Ctrl 1–4 | Live · Compact · Review · Profile |
| Space | Pause/resume the meeting (Review: play/pause) |
| ⌘/Ctrl M | Mute coaching |
| ⌘/Ctrl , · Esc | Toggle / close settings |
| ⌘/Ctrl E | Compact → expand to Live |
| S · X | Compact: snooze · dismiss the top cue |

Review → **Export notes** downloads a Markdown summary (scores, key moments,
rewrites, transcript); **Share review** copies it to the clipboard.

## Live mic practice

Tweaks → Scenario → **Live mic (practice)**, then **Start mic**. Your own speech
becomes the transcript (the browser's Web Speech API: Chrome, Edge, Safari —
in Chrome the audio is sent to Google for recognition; nothing is stored).
Coaching cues come from what you actually said (`deriveCoaching`: filler
words, hedging, long sentences, pace, open questions, clean delivery), and
Review, scores and Export notes work on your session. Group-only readouts
(talk balance, interruptions, room mood) are hidden since you're the only
speaker. Needs HTTPS or localhost for microphone access.

## Profile

Each meeting has a date (`daysAgo`); the 7d / 30d / 90d / All buttons filter
everything on the screen through `profileModel({ rangeDays })`, and the trend
charts plot one point per real meeting. **Edit targets** sets per-goal
targets (saved locally). **Explain model** shows the scoring rules, the
engine's composite weights and each meeting's scores.

## Scenarios

The simulated meeting can be swapped from the **Tweaks** panel (gear icon in
the top right → Scenario). Three are bundled:

- **Q2 roadmap sync** — pushback on a quarter, recovery after concessions.
- **Skip-level feedback** — hard 1:1 feedback; tone coach is busy.
- **Eng standup decision** — crisp decision; coach is mostly silent.

Add more in `Talksmith.html` under the `SCENARIOS` block. Each entry needs
`participants`, `script`, `nudges`, `timeline`, `duration` and `daysAgo`.

## How results are scored

Scores are **derived from the transcript**, not hardcoded — so they genuinely
change per scenario. The engine lives in the `MeetingData` section of
`Talksmith.html`:

- `analyzeTranscript(script, participants)` extracts structured signals: talk
  share, filler/hedge rates, open vs. closed questions, objections raised and
  acknowledged, interruption asymmetry, longest monologue, decisions reached
  after your turns, and group speaking balance.
- `scoreFromAnalysis(a)` turns those into the four user-facing scores
  (Talk ratio, Clarity, Influence, Listening) plus an overall composite and a
  letter grade. Every score carries the concrete `signals` that produced it,
  so the Review screen can explain each number.
- The same `analyzeTranscript` backs the **live** dynamics readouts (filler
  count, hedging, questions, longest run, psychological-safety, objections
  acknowledged), so live and post-meeting views stay consistent.
- Live room mood (tension, sentiment, alignment) comes from `moodAt(t,
  timeline)`, driven by each scenario's own flagged moments (`EVENT_MOOD`), so
  a calm standup never shows the Q2 meeting's tension spikes. Scenarios can
  declare `audioDips: [[start, end]]` to demo the low-audio state.

The head coach prioritizes cues by projected **impact over frequency**
(`nudgeImpact`) and surfaces at most one cue per specialist coach at a time,
capped at two simultaneously.

## Derived files stay in sync

`Talksmith.html` is the source of truth. `components/*.jsx`, `index.html` and
`styles.css` are generated from it — edit `Talksmith.html`, then:

```sh
npm run components:sync    # regenerate components/, index.html, styles.css
npm run components:check   # fail if any have drifted (runs in CI)
```

## Tests

A small Playwright smoke suite lives under `tests/`. It covers the seams a PR
is most likely to break: app boot, screen navigation, scenario data wiring,
the head-coach max-2-cue contract, and persistence.

```sh
npm install
npm run test:install   # one-time: download Chromium
npm test
```

The suite is hermetic: the CDN scripts are served from `node_modules` (same
pinned versions as the `<script>` tags), so it needs no internet. To use an
already-installed Chromium instead of downloading one:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome npm test
```

`npm run test:dist` builds and runs the same suite against `dist/`. Both run
in CI on every PR via `.github/workflows/ci.yml`.

When adding tests, target `[data-testid]` selectors over copy/style — the
existing seams are documented in `tests/smoke.spec.js`.

## Layout

- `Talksmith.html` / `index.html` — the runnable prototype (source of truth).
- `components/` — JSX reference copies, auto-extracted from `Talksmith.html`
  (kept in sync by `scripts/extract-components.cjs`).
- `styles.css` — generated copy of the inline stylesheet.
- `scripts/build.cjs` — production build into `dist/`.
- `scripts/serve.cjs` — static server (tests; `npm start` serves `dist/`).
- `scripts/extract-components.cjs` — keeps `components/` faithful.
- `tests/` — Playwright smoke + scoring tests.
- `playwright.config.js` — test config.
- `.github/workflows/ci.yml` — runs component-sync check + smoke suite on PR
  and on push to `main`.
