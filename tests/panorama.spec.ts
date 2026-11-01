import { expect, test } from '@playwright/test';

test('panorama widens the stadium, fits remaining fullscreen height and preserves paused state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#player-count').selectOption('1');
  const canvas = page.locator('#court canvas');
  const toggle = page.locator('#panoramic');
  await expect(canvas).toHaveAttribute('width', '320');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(canvas).toHaveAttribute('width', '448');
  await expect(canvas).toBeFocused();
  await page.locator('#fullscreen').click();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1920, height: 1080 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => {
      const court = (await page.locator('#court').boundingBox())!;
      const image = (await canvas.boundingBox())!;
      return Math.abs(court.height - image.height) < 1 && image.width <= court.width + 0.1 && court.width - image.width < 5;
    }).toBe(true);
    const image = (await canvas.boundingBox())!;
    expect(Math.abs(image.x + image.width / 2 - viewport.width / 2)).toBeLessThan(1);
    await expect(page.locator('#tick')).toHaveText('000000');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => {
    const court = (await page.locator('#court').boundingBox())!;
    const image = (await canvas.boundingBox())!;
    return image.height <= court.height + 0.1 && image.width <= court.width + 0.1;
  }).toBe(true);
  await expect(toggle).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect.poll(async () => Number(await canvas.getAttribute('width'))).toBeGreaterThan(320);
  await canvas.screenshot({ path: test.info().outputPath('panoramic-stadium.png') });
  await toggle.click();
  await expect(canvas).toHaveAttribute('width', '320');
  await expect.poll(async () => {
    const court = (await page.locator('#court').boundingBox())!;
    const image = (await canvas.boundingBox())!;
    return Math.abs(court.height - image.height) < 1;
  }).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#fullscreen')).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#tick')).toHaveText('000000');
});