import { expect, test } from '@playwright/test';

for (const width of [1440, 1280, 768, 390, 320]) {
  test(`settings stay above a centered court at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.locator('#start')).toBeEnabled();
    for (const count of ['1', '2', '4']) {
      await page.locator('#player-count').selectOption(count);
      await expect(page.locator('.player-slot')).toHaveCount(Number(count));
      const settings = (await page.locator('.setup-panel').boundingBox())!;
      const panel = (await page.locator('.court-panel').boundingBox())!;
      const canvas = (await page.locator('#court canvas').boundingBox())!;
      expect(settings.y + settings.height).toBeLessThanOrEqual(panel.y);
      expect(Math.abs(canvas.x + canvas.width / 2 - width / 2)).toBeLessThanOrEqual(1);
      expect(canvas.width / canvas.height).toBeCloseTo(256 / 224, 2);
      if (width >= 1280) expect(canvas.width).toBeGreaterThanOrEqual(960);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await page.getByText('Sterowanie i informacje o kontrolerach', { exact: true }).click();
    await expect(page.locator('#device-status')).toBeVisible();
  });
}