import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 480 }]) {
  test(`full-window court fits ${viewport.width}×${viewport.height} and restores controls`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('#start')).toBeEnabled();
    const panel = page.locator('#court-panel');
    const toggle = page.locator('#fullscreen');
    await toggle.click();
    await expect(panel).toHaveAttribute('aria-modal', 'true');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#court canvas')).toBeFocused();
    await expect(panel.locator('#start')).toBeVisible();
    await expect(panel.locator('#reset')).toBeVisible();
    await expect(panel.locator('#audio')).toBeVisible();
    await expect.poll(async () => {
      const canvas = (await page.locator('#court canvas').boundingBox())!;
      const court = (await page.locator('#court').boundingBox())!;
      return canvas.width <= court.width && canvas.height <= court.height;
    }).toBe(true);
    const bounds = (await panel.boundingBox())!;
    expect(bounds).toEqual({ x: 0, y: 0, ...viewport });
    const canvas = (await page.locator('#court canvas').boundingBox())!;
    expect(canvas.width / canvas.height).toBeCloseTo(256 / 224, 2);
    expect(Math.abs(canvas.x + canvas.width / 2 - viewport.width / 2)).toBeLessThan(1);
    expect(canvas.y).toBeGreaterThanOrEqual(0);
    expect(canvas.y + canvas.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press('Tab');
    await expect(panel.locator('#start')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#court canvas')).toBeFocused();
    await panel.locator('#start').click();
    await expect.poll(() => page.locator('#tick').textContent()).not.toBe('000000');
    await panel.locator('#start').click();
    const tick = await page.locator('#tick').textContent();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toBeFocused();
    await expect(page.locator('.setup-panel #start')).toBeVisible();
    await expect(panel).not.toHaveAttribute('aria-modal');
    await expect(page.locator('#tick')).toHaveText(tick!);
    expect(await page.locator('.setup-panel').evaluate((element) => (element as HTMLElement).inert)).toBe(false);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
    await toggle.click();
    await page.setViewportSize({ width: viewport.height, height: viewport.width });
    await expect.poll(async () => {
      const canvas = (await page.locator('#court canvas').boundingBox())!;
      const court = (await page.locator('#court').boundingBox())!;
      return canvas.width <= court.width && canvas.height <= court.height;
    }).toBe(true);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.setup-panel #reset')).toBeVisible();
  });
}

test('court markings are two logical pixels thick without changing the simulation', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  const widths = await page.evaluate(async () => {
    const rendererPath = '/src/render/court-renderer.ts';
    const simulationPath = '/src/core/simulation.ts';
    const projectionPath = '/src/render/court-projection.ts';
    const { CourtRenderer } = await import(rendererPath);
    const { createState } = await import(simulationPath);
    const { project, VIEW } = await import(projectionPath);
    const container = document.createElement('div');
    container.style.width = `${VIEW.width}px`;
    document.body.append(container);
    const renderer = new CourtRenderer();
    await renderer.init(container);
    const state = createState(2);
    const snapshot = JSON.stringify(state);
    renderer.draw(state);
    const copy = document.createElement('canvas');
    copy.width = VIEW.width;
    copy.height = VIEW.height;
    const context = copy.getContext('2d')!;
    context.drawImage(container.querySelector('canvas')!, 0, 0);
    const result = [0, 450, 1350, 1800].map((y) => {
      const point = project(350, y);
      const pixels = context.getImageData(point.x, point.y - 3, 1, 7).data;
      let count = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] === 249 && pixels[index + 1] === 232 && pixels[index + 2] === 199) count++;
      }
      return count;
    });
    if (snapshot !== JSON.stringify(state)) throw new Error('Renderer mutated the simulation');
    renderer.dispose();
    container.remove();
    return result;
  });
  expect(widths).toEqual([2, 2, 2, 2]);
});