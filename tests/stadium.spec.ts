import { expect, test } from '@playwright/test';
import { openApp } from './support/app';

test('training has empty seats, match spectators react only to an explicit point, and reset clears the reaction', async ({ page }) => {
  await openApp(page);
  await page.evaluate(async () => {
    const preview = await window.__tennis!.openPreview({ id: 'stadium-preview', players: 1 });
    preview.draw();
  });
  const canvas = page.locator('#stadium-preview canvas');
  await expect(canvas).toHaveCSS('width', '640px');
  const bounds = (await canvas.boundingBox())!;
  const clip = { x: bounds.x, y: bounds.y, width: 640, height: 104 };
  const empty = await page.screenshot({ clip });
  await page.evaluate(() => {
    const preview = window.__tennis!.preview!;
    preview.state.tick = 10;
    preview.draw({ tick: 10 });
  });
  expect((await page.screenshot({ clip })).equals(empty)).toBe(true);
  await page.evaluate(() => {
    const tennis = window.__tennis!;
    tennis.preview!.state = tennis.createState(2);
    tennis.preview!.draw();
  });
  const seated = await page.screenshot({ clip });
  expect(seated.equals(empty)).toBe(false);
  await page.evaluate(() => {
    const preview = window.__tennis!.preview!;
    preview.state.tick = 10;
    preview.draw();
  });
  expect((await page.screenshot({ clip })).equals(seated)).toBe(true);
  await page.evaluate(() => {
    const preview = window.__tennis!.preview!;
    const before = JSON.stringify(preview.state);
    preview.draw({ tick: 10 });
    if (JSON.stringify(preview.state) !== before) throw new Error('Crowd changed simulation state');
  });
  const applause = await page.screenshot({ clip });
  expect(applause.equals(seated)).toBe(false);
  await page.evaluate(() => window.__tennis!.preview!.draw({ tick: 10 }));
  expect((await page.screenshot({ clip })).equals(applause)).toBe(true);
  await page.evaluate(() => {
    const preview = window.__tennis!.preview!;
    preview.state.tick = 16;
    preview.draw({ tick: 10 });
  });
  expect((await page.screenshot({ clip })).equals(applause)).toBe(false);
  await page.evaluate(() => {
    const preview = window.__tennis!.preview!;
    preview.state.tick = 200;
    preview.draw({ tick: 10 });
  });
  expect((await page.screenshot({ clip })).equals(seated)).toBe(true);
  await page.evaluate(() => {
    const tennis = window.__tennis!;
    tennis.preview!.state = tennis.createState(1);
    tennis.preview!.draw();
  });
  expect((await page.screenshot({ clip })).equals(empty)).toBe(true);
  await canvas.screenshot({ path: test.info().outputPath('empty-stadium.png') });
  await page.evaluate(() => window.__tennis!.closePreview());
});