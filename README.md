# Talksmith

A real-time meeting coach UI prototype. Self-contained `Talksmith.html` runs in
any modern browser — React 18 and Babel are loaded from a CDN at runtime, no
build step.

## Run it

Open `Talksmith.html` (or `index.html`) in a browser. That's it.

## Scenarios

The simulated meeting can be swapped from the **Tweaks** panel (gear icon in
the top right → Scenario). Three are bundled:

- **Q2 roadmap sync** — pushback on a quarter, recovery after concessions.
- **Skip-level feedback** — hard 1:1 feedback; tone coach is busy.
- **Eng standup decision** — crisp decision; coach is mostly silent.

Add more in `Talksmith.html` under the `SCENARIOS` block (or the mirrored
copy in `components/MeetingData.jsx`). Each entry needs `participants`,
`script`, `nudges`, `timeline`, and `duration`.

## Tests

A small Playwright smoke suite lives under `tests/`. It covers the seams a PR
is most likely to break: app boot, screen navigation, scenario data wiring,
the head-coach max-2-cue contract, and persistence.

```sh
npm install
npm run test:install   # one-time: download Chromium
npm test
```

The same suite runs in CI on every PR via `.github/workflows/ci.yml`.

When adding tests, target `[data-testid]` selectors over copy/style — the
existing seams are documented in `tests/smoke.spec.js`.

## Layout

- `Talksmith.html` / `index.html` — the runnable prototype.
- `components/` — JSX source files (reference; identical to the inline
  versions inside `Talksmith.html`).
- `styles.css` — extracted version of the inline stylesheet.
- `tests/` — Playwright smoke tests.
- `playwright.config.js` — test config.
- `.github/workflows/ci.yml` — runs the smoke suite on PR and on push to
  `main`.
