import { expect, test } from '@playwright/test';
import { openApp } from './support/app';

test('training keeps old balls through successive machine feeds until reset', async ({ page }) => {
  await openApp(page);
  await page.locator('#player-count').selectOption('1');
  await page.locator('#start').click();
  await expect(page.locator('#training-status')).toContainText('Piłki na korcie: 2', { timeout: 15000 });
  await page.locator('#start').click();
  await expect(page.locator('#training-status')).toContainText('Piłki na korcie: 2');
  await page.locator('#reset').click();
  await expect(page.locator('#training-status')).toContainText('Piłki na korcie: 0');
});

test('net visibly deforms on contact and restores its resting shape', async ({ page }) => {
  await openApp(page);
  await page.evaluate(async () => {
    const preview = await window.__tennis!.openPreview({ id: 'net-preview', players: 1 });
    preview.draw();
  });
  const canvas = page.locator('#net-preview canvas');
  const resting = await canvas.screenshot();
  await page.evaluate(() => {
    const preview = window.__tennis!.preview!;
    preview.state.tick = 1;
    preview.state.netImpact = { tick: 1, x: 500, kind: 'mesh' };
    preview.draw();
  });
  expect((await canvas.screenshot()).equals(resting)).toBe(false);
  await page.evaluate(() => {
    const preview = window.__tennis!.preview!;
    preview.state.tick = 37;
    preview.draw();
  });
  expect((await canvas.screenshot()).equals(resting)).toBe(true);
  await page.evaluate(() => window.__tennis!.closePreview());
});