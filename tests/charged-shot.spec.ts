import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 1600 } });

async function playerClip(page: Page) {
  const point = await page.evaluate(() => window.__tennis!.project(500, 1500));
  const bounds = (await page.locator('#court canvas').boundingBox())!;
  const scale = bounds.width / 320;
  return { x: bounds.x + (point.x - 20) * scale, y: bounds.y + (point.y - 32) * scale, width: 40 * scale, height: 45 * scale };
}

test('holding charges without moving; release completes the shot and restores movement', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await page.keyboard.down('KeyF');
  const tick = () => page.locator('#tick').textContent().then(Number);
  const start = await tick();
  await expect.poll(tick).toBeGreaterThanOrEqual(start + 65);
  const clip = await playerClip(page);
  const charged = await page.screenshot({ clip });
  await page.keyboard.down('KeyD');
  const movingStart = await tick();
  await expect.poll(tick).toBeGreaterThanOrEqual(movingStart + 20);
  expect((await page.screenshot({ clip })).equals(charged)).toBe(true);
  await page.keyboard.up('KeyF');
  const release = await tick();
  await expect.poll(tick).toBeGreaterThanOrEqual(release + 35);
  await page.keyboard.up('KeyD');
  expect((await page.screenshot({ clip })).equals(charged)).toBe(false);
  await page.locator('#reset').click();
});

test('focus loss cancels charging without firing on resume', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await page.keyboard.down('KeyF');
  const tick = () => page.locator('#tick').textContent().then(Number);
  const start = await tick();
  await expect.poll(tick).toBeGreaterThanOrEqual(start + 20);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#session-status')).toContainText('Pauza');
  await page.keyboard.up('KeyF');
  const clip = await playerClip(page);
  const paused = await page.screenshot({ clip });
  await page.locator('#start').click();
  const resumed = await tick();
  await expect.poll(tick, { intervals: [16] }).toBeGreaterThanOrEqual(resumed + 5);
  expect((await page.screenshot({ clip })).equals(paused)).toBe(true);
});