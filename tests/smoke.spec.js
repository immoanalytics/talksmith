// Smoke tests for Talksmith.
//
// These exercise the seams a PR is most likely to break: app boot, screen
// navigation, scenario data wiring, the head-coach max-2 cue contract, and
// the suppress (dismiss/snooze) flow. They're deliberately light — the goal
// is "every big PR can prove the prototype still mounts and behaves" rather
// than full coverage.
//
// To add a test: pick a [data-testid] selector that already exists or add a
// new one in Talksmith.html. Avoid asserting on visual styles or copy that
// designers iterate on.

const { test, expect } = require('@playwright/test');

const path = require('path');

// Dev page by default; `npm run test:dist` runs the same suite against the
// production build (TALKSMITH_APP=/dist/index.html).
const APP_PATH = process.env.TALKSMITH_APP || '/Talksmith.html';
const NODE_MODULES = path.resolve(__dirname, '..', 'node_modules');

// Serve the CDN scripts from node_modules so the suite is hermetic: no
// dependence on unpkg uptime, and it runs in sandboxes without internet.
// Versions are pinned in package.json to match the <script> tags (and the
// Babel SRI hash), so what we test is byte-identical to what ships.
const CDN_TO_LOCAL = {
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js': 'react/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js': 'react-dom/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js': '@babel/standalone/babel.min.js',
};

test.beforeEach(async ({ context }) => {
  for (const [url, local] of Object.entries(CDN_TO_LOCAL)) {
    await context.route(url, (route) => route.fulfill({
      path: path.join(NODE_MODULES, local),
      contentType: 'application/javascript; charset=utf-8',
      headers: { 'Access-Control-Allow-Origin': '*' },
    }));
  }
  // Web fonts are cosmetic; stub them so a blocked network can't stall load.
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.fulfill({ status: 200, body: '' }));
});

// React/Babel load from CDN. Wait until React has actually rendered the
// chrome before each test so we don't race the boot skeleton.
async function bootApp(page) {
  await page.goto(APP_PATH);
  await page.locator('[data-testid="title-bar"]').waitFor({ timeout: 15_000 });
  // Clear localStorage so each test starts from defaults (theme, scenario,
  // dismissed cues, etc). The static server gives every test the same origin
  // so storage would otherwise leak between runs.
  await page.evaluate(() => {
    try { Object.keys(localStorage).filter(k => k.startsWith('talksmith.')).forEach(k => localStorage.removeItem(k)); } catch {}
  });
  await page.reload();
  await page.locator('[data-testid="title-bar"]').waitFor({ timeout: 15_000 });
}

test.describe('boot', () => {
  test('replaces the boot skeleton with the app chrome', async ({ page }) => {
    await page.goto(APP_PATH);
    await page.locator('[data-testid="title-bar"]').waitFor({ timeout: 15_000 });
    await expect(page.locator('.ts-boot')).toHaveCount(0);
    await expect(page.locator('[data-testid="title-bar"]')).toBeVisible();
  });
});

test.describe('navigation', () => {
  test('all four screens are reachable via tabs', async ({ page }) => {
    await bootApp(page);
    for (const id of ['live', 'overlay', 'review', 'profile']) {
      await page.locator(`[data-testid="screen-tab-${id}"]`).click();
      await expect(page.locator(`[data-testid="screen-tab-${id}"]`)).toHaveAttribute('aria-pressed', 'true');
    }
  });
});

test.describe('live simulation', () => {
  test('timecode advances while on the Live screen', async ({ page }) => {
    await bootApp(page);
    await page.locator('[data-testid="screen-tab-live"]').click();
    const timecode = page.locator('[data-testid="timecode"]');
    await expect(timecode).toBeVisible();
    const t1 = await timecode.textContent();
    await page.waitForTimeout(1500);
    const t2 = await timecode.textContent();
    expect(t1).not.toEqual(t2);
  });

  test('head coach surfaces at most 2 cues at once', async ({ page }) => {
    await bootApp(page);
    await page.locator('[data-testid="screen-tab-live"]').click();
    // Wait long enough for at least one cue window to open.
    await page.waitForTimeout(2000);
    const count = await page.locator('[data-testid="active-cue"]').count();
    expect(count).toBeLessThanOrEqual(2);
  });

  test('switching to Profile pauses the timecode', async ({ page }) => {
    await bootApp(page);
    await page.locator('[data-testid="screen-tab-live"]').click();
    const liveT = await page.locator('[data-testid="timecode"]').textContent();
    await page.locator('[data-testid="screen-tab-profile"]').click();
    // The timecode is only rendered on screens that show the meeting state,
    // so on Profile it disappears entirely. Returning to Live should resume
    // from approximately where we left off (not from t=0).
    await page.waitForTimeout(800);
    await page.locator('[data-testid="screen-tab-live"]').click();
    const resumedT = await page.locator('[data-testid="timecode"]').textContent();
    expect(resumedT).not.toEqual('00:00');
    // Sanity: the resumed time is within ~5 seconds of where we paused.
    const toSecs = (s) => { const [m, sec] = s.split(':').map(Number); return m * 60 + sec; };
    expect(Math.abs(toSecs(resumedT) - toSecs(liveT))).toBeLessThan(5);
  });
});

test.describe('scenarios', () => {
  test('picker swaps the active meeting and resets the clock', async ({ page }) => {
    await bootApp(page);
    await page.locator('[data-testid="screen-tab-live"]').click();
    await expect(page.locator('[data-testid="active-scenario-name"]')).toContainText('Q2 roadmap');

    await page.locator('[data-testid="settings-button"] button').click();
    await page.locator('[data-testid="scenario-picker"]').selectOption('tense_1on1');

    await expect(page.locator('[data-testid="active-scenario-name"]')).toContainText('Skip-level feedback');
    // Tense 1:1 starts at t=0, unlike Q2 which starts at t=48.
    await expect(page.locator('[data-testid="timecode"]')).toHaveText(/^00:0\d$/);
  });

  test('picker choice survives a reload', async ({ page }) => {
    await bootApp(page);
    await page.locator('[data-testid="screen-tab-live"]').click();
    await page.locator('[data-testid="settings-button"] button').click();
    await page.locator('[data-testid="scenario-picker"]').selectOption('clear_decision');
    await expect(page.locator('[data-testid="active-scenario-name"]')).toContainText('Eng standup');
    await page.reload();
    await page.locator('[data-testid="title-bar"]').waitFor();
    await page.locator('[data-testid="screen-tab-live"]').click();
    await expect(page.locator('[data-testid="active-scenario-name"]')).toContainText('Eng standup');
  });
});

test.describe('data integrity', () => {
  // Lightweight check on the scenario data exposed via window.MeetingData,
  // so a typo in a script (missing `t`, broken nudge id) fails fast.
  test('every scenario has at least one nudge attributed to a real coach', async ({ page }) => {
    await bootApp(page);
    const issues = await page.evaluate(() => {
      const md = window.MeetingData;
      const out = [];
      for (const s of Object.values(md.SCENARIOS)) {
        if (!Array.isArray(s.script) || s.script.length < 1) out.push(`${s.id}: empty script`);
        if (!Array.isArray(s.nudges)  || s.nudges.length  < 1) out.push(`${s.id}: empty nudges`);
        for (const n of s.nudges || []) {
          if (!md.COACHES[n.coach]) out.push(`${s.id}/${n.id}: unknown coach "${n.coach}"`);
          if (!['suggest','critical','insight'].includes(n.type)) out.push(`${s.id}/${n.id}: bad type "${n.type}"`);
          if (typeof n.confidence !== 'number' || n.confidence < 0 || n.confidence > 1) out.push(`${s.id}/${n.id}: bad confidence`);
        }
      }
      return out;
    });
    expect(issues).toEqual([]);
  });
});

test.describe('scoring engine', () => {
  // The post-meeting scores must be real (derived from the transcript), not
  // canned. These guard the headline "quality of results" behavior.
  test('every scenario scores in range with explainable signals', async ({ page }) => {
    await bootApp(page);
    const issues = await page.evaluate(() => {
      const md = window.MeetingData;
      const out = [];
      const inRange = (v) => typeof v === 'number' && v >= 0 && v <= 100;
      for (const s of Object.values(md.SCENARIOS)) {
        const r = md.scoreScenario(s);
        for (const k of ['talkRatio', 'clarity', 'influence', 'listening', 'engagement', 'overall']) {
          if (!inRange(r[k])) out.push(`${s.id}.${k} out of range: ${r[k]}`);
        }
        if (!'ABCDE'.includes(r.grade)) out.push(`${s.id}: bad grade ${r.grade}`);
        for (const k of ['talkRatio', 'clarity', 'influence', 'listening']) {
          if (!Array.isArray(r.signals[k]) || r.signals[k].length === 0) {
            out.push(`${s.id}.${k}: missing explainability signals`);
          }
        }
      }
      return out;
    });
    expect(issues).toEqual([]);
  });

  test('scores are scenario-dependent, not hardcoded', async ({ page }) => {
    await bootApp(page);
    const { q2, decision } = await page.evaluate(() => {
      const md = window.MeetingData;
      return {
        q2: md.scoreScenario(md.SCENARIOS.q2_roadmap),
        decision: md.scoreScenario(md.SCENARIOS.clear_decision),
      };
    });
    // A crisp, balanced decision meeting should out-score the contentious Q2
    // roadmap on talk balance and overall — proving the numbers track content.
    expect(decision.talkRatio).toBeLessThan(q2.talkRatio);
    expect(decision.overall).toBeGreaterThan(q2.overall);
    expect(q2.overall).not.toEqual(decision.overall);
  });
});

test.describe('review screen', () => {
  test('shows a computed grade and scenario-derived scores', async ({ page }) => {
    await bootApp(page);
    await page.locator('[data-testid="screen-tab-review"]').click();
    await expect(page.locator('[data-testid="score-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="meeting-grade"]')).toHaveText(/^[ABCDE]$/);
    // Talk-ratio score should be a plausible percentage, not blank.
    await expect(page.locator('[data-testid="score-value-talk-ratio"]')).toHaveText(/^\d{1,3}$/);
  });

  test('review reflects the selected scenario', async ({ page }) => {
    await bootApp(page);
    // Switch to the clean-decision scenario, then open Review.
    await page.locator('[data-testid="screen-tab-live"]').click();
    await page.locator('[data-testid="settings-button"] button').click();
    await page.locator('[data-testid="scenario-picker"]').selectOption('clear_decision');
    await page.locator('[data-testid="screen-tab-review"]').click();
    await expect(page.locator('[data-testid="score-bar"]')).toContainText('Eng standup');
  });
});

test.describe('profile learning model', () => {
  test('renders and is derived from the scoring engine', async ({ page }) => {
    await bootApp(page);
    await page.locator('[data-testid="screen-tab-profile"]').click();
    await expect(page.locator('[data-testid="profile-screen"]')).toBeVisible();
    // The headline numbers must match profileModel(), proving they aren't
    // hand-written into the JSX.
    const { model, ok } = await page.evaluate(() => {
      const m = window.MeetingData.profileModel();
      const grades = 'ABCDE';
      const ok = grades.includes(m.overallGrade)
        && m.avgTalk >= 0 && m.avgTalk <= 100
        && ['Clarity', 'Influence', 'Listening'].includes(m.strongest.key)
        && m.goalProgress.listen === m.avgListening;
      return { model: m, ok };
    });
    expect(ok).toBe(true);
    // The avg grade from the model should appear in the profile UI.
    await expect(page.locator('[data-testid="profile-screen"]')).toContainText(
      `${model.strongest.key} is your strongest skill`
    );
  });
});

test.describe('data integrity: scenario shape', () => {
  // A speaker id missing from `participants` crashes the transcript render;
  // out-of-range times silently never show. Catch both at the data layer.
  test('script speakers, nudges and moments are consistent with the scenario', async ({ page }) => {
    await bootApp(page);
    const issues = await page.evaluate(() => {
      const out = [];
      for (const s of Object.values(window.MeetingData.SCENARIOS)) {
        const ids = new Set(s.participants.map(p => p.id));
        if (!ids.has('you')) out.push(`${s.id}: no "you" participant`);
        let prevT = -1;
        for (const l of s.script) {
          if (!ids.has(l.s)) out.push(`${s.id}: script speaker "${l.s}" not in participants`);
          if (!(l.t >= prevT)) out.push(`${s.id}: script not sorted at t=${l.t}`);
          if (l.t > s.duration) out.push(`${s.id}: script line past duration at t=${l.t}`);
          prevT = l.t;
        }
        for (const n of s.nudges) if (n.t > s.duration) out.push(`${s.id}/${n.id}: nudge past duration`);
        for (const e of s.timeline) if (e.t > s.duration) out.push(`${s.id}: moment "${e.label}" past duration`);
      }
      return out;
    });
    expect(issues).toEqual([]);
  });
});

test.describe('live metrics are scenario-derived', () => {
  test('room mood follows each scenario\'s own moments', async ({ page }) => {
    await bootApp(page);
    const r = await page.evaluate(() => {
      const md = window.MeetingData;
      const q2 = md.SCENARIOS.q2_roadmap, cd = md.SCENARIOS.clear_decision;
      return {
        q2Interrupt: md.moodAt(45, q2.timeline).tension,
        cdSameTime: md.moodAt(45, cd.timeline).tension,
        q2End: md.moodAt(170, q2.timeline).sentiment,
        q2Tense: md.moodAt(80, q2.timeline).sentiment,
        cdAudio: md.deriveMetrics([], 68, null, cd.participants, cd).audioQuality,
        q2Audio: md.deriveMetrics([], 68, null, q2.participants, q2).audioQuality,
      };
    });
    // Q2 has an interruption at 42s; the crisp standup has nothing tense there.
    expect(r.q2Interrupt).toBeGreaterThan(0.5);
    expect(r.cdSameTime).toBeLessThanOrEqual(0.22);
    // Q2 recovers: the room ends calmer than it was mid-tension.
    expect(r.q2End).toBeGreaterThan(r.q2Tense);
    // The low-audio demo belongs to Q2 only.
    expect(r.q2Audio).toBeLessThan(0.6);
    expect(r.cdAudio).toBeGreaterThan(0.6);
  });

  test('outcome goals count real questions and acknowledgements', async ({ page }) => {
    await bootApp(page);
    const r = await page.evaluate(() => {
      const md = window.MeetingData;
      const s = md.SCENARIOS.q2_roadmap;
      const a = md.analyzeTranscript(s.script, s.participants, 'you');
      const m = md.deriveMetrics(s.script, s.duration, a, s.participants, s);
      return { m, a };
    });
    expect(r.m.questionCount).toBe(r.a.questionCount);
    expect(r.m.objections).toBe(r.a.objections);
    expect(r.m.acknowledged).toBe(r.a.acknowledged);
  });
});

test.describe('keyboard & controls', () => {
  test('Space activates a focused button instead of pausing the meeting', async ({ page }) => {
    await bootApp(page);
    await page.locator('[data-testid="screen-tab-live"]').click();
    await page.locator('[data-testid="screen-tab-review"]').focus();
    await page.keyboard.press('Space');
    await expect(page.locator('[data-testid="screen-tab-review"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('title-bar bell mutes coaching', async ({ page }) => {
    await bootApp(page);
    await page.locator('[data-testid="screen-tab-live"]').click();
    await page.locator('[data-testid="titlebar-mute"] button').click();
    await expect(page.getByText('Coaching muted')).toBeVisible();
    await page.locator('[data-testid="titlebar-mute"] button').click();
    await expect(page.getByText('Coaching muted')).toHaveCount(0);
  });

  test('Ctrl+, toggles settings and Escape closes them', async ({ page }) => {
    await bootApp(page);
    await page.locator('body').click();
    await page.keyboard.press('Control+Comma');
    await expect(page.locator('[data-testid="tweaks-panel"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="tweaks-panel"]')).toHaveCount(0);
  });

  test('compact overlay: X dismisses the top cue', async ({ page }) => {
    await bootApp(page);
    await page.locator('[data-testid="screen-tab-overlay"]').click();
    const top = page.locator('[data-testid="overlay-top-cue"]');
    // Q2 opens at 0:48, inside the "you cut Priya off" cue window.
    await expect(top).toHaveAttribute('data-cue-id', 'n2');
    await page.locator('body').click();
    await page.keyboard.press('x');
    await expect(top).not.toHaveAttribute('data-cue-id', 'n2');
  });

  test('an invalid saved screen falls back to Live', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => localStorage.setItem('talksmith.screen', 'bogus'));
    await page.reload();
    await expect(page.locator('[data-testid="screen-tab-live"]')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('review actions', () => {
  test('Export notes downloads a Markdown review of the active scenario', async ({ page }) => {
    await bootApp(page);
    await page.locator('[data-testid="screen-tab-review"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="export-notes"]').click(),
    ]);
    expect(download.suggestedFilename()).toBe('talksmith-q2_roadmap-review.md');
    const text = require('fs').readFileSync(await download.path(), 'utf8');
    const grade = await page.locator('[data-testid="meeting-grade"]').textContent();
    expect(text).toContain('# Q2 roadmap sync — meeting review');
    expect(text).toContain(`grade **${grade}**`);
    expect(text).toContain('## Transcript');
  });
});

test.describe('profile trend charts', () => {
  // Gradient ids built from titles with spaces made url(#…) invalid, so the
  // chart areas painted solid black.
  test('area fills resolve to their gradients', async ({ page }) => {
    await bootApp(page);
    await page.locator('[data-testid="screen-tab-profile"]').click();
    const fills = await page.$$eval('[data-testid="profile-screen"] svg polygon',
      els => els.map(e => getComputedStyle(e).fill));
    expect(fills.length).toBeGreaterThan(0);
    for (const f of fills) expect(f).toMatch(/^url\(/);
  });
});

test.describe('boot resilience', () => {
  test('a CDN failure replaces the spinner with a clear message', async ({ page, context }) => {
    // Registered after the beforeEach routes, so it takes precedence. Matches
    // the CDN URL (dev page) and the vendored file (build) alike.
    await context.route(/\/react(@[\d.]+\/umd\/react|-[\d.]+\.[0-9a-f]+)\.(production\.)?min\.js$/, r => r.abort());
    await page.goto(APP_PATH);
    await expect(page.locator('.ts-boot--failed')).toBeVisible();
    await expect(page.locator('.ts-boot__hint')).toContainText("Couldn't load");
  });
});
