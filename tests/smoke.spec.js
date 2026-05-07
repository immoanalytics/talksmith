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

const APP_URL = 'file://' + path.resolve(__dirname, '..', 'Talksmith.html');

// React/Babel load from CDN. Wait until React has actually rendered the
// chrome before each test so we don't race the boot skeleton.
async function bootApp(page) {
  await page.goto(APP_URL);
  await page.locator('[data-testid="title-bar"]').waitFor({ timeout: 15_000 });
  // Clear localStorage so each test starts from defaults (theme, scenario,
  // dismissed cues etc). file:// URLs share storage between runs otherwise.
  await page.evaluate(() => {
    try { Object.keys(localStorage).filter(k => k.startsWith('talksmith.')).forEach(k => localStorage.removeItem(k)); } catch {}
  });
  await page.reload();
  await page.locator('[data-testid="title-bar"]').waitFor({ timeout: 15_000 });
}

test.describe('boot', () => {
  test('replaces the boot skeleton with the app chrome', async ({ page }) => {
    await page.goto(APP_URL);
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
