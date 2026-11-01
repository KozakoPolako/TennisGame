import { expect, test } from '@playwright/test';

test('training keeps old balls through successive machine feeds until reset', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#player-count').selectOption('1');
  await page.locator('#start').click();
  await expect(page.locator('#training-status')).toContainText('Piłki na korcie: 2', { timeout: 15000 });
  await page.locator('#start').click();
  await expect(page.locator('#training-status')).toContainText('Piłki na korcie: 2');
  await page.locator('#reset').click();
  await expect(page.locator('#training-status')).toContainText('Piłki na korcie: 0');
});

test('net visibly deforms on contact and restores its resting shape', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  await page.evaluate(async () => {
    const simulationPath = '/src/core/simulation.ts';
    const rendererPath = '/src/render/court-renderer.ts';
    const { createState } = await import(simulationPath);
    const { CourtRenderer } = await import(rendererPath);
    const container = document.createElement('div');
    container.id = 'net-preview';
    container.style.cssText = 'position:fixed;inset:0;width:640px;height:560px;z-index:100;background:#1b3635';
    document.body.append(container);
    const renderer = new CourtRenderer();
    await renderer.init(container);
    const state = createState(1);
    renderer.draw(state);
    Reflect.set(window, 'netPreview', { renderer, state });
  });
  const canvas = page.locator('#net-preview canvas');
  const resting = await canvas.screenshot();
  await page.evaluate(() => {
    const { renderer, state } = Reflect.get(window, 'netPreview');
    state.tick = 1;
    state.netImpact = { tick: 1, x: 500, kind: 'mesh' };
    renderer.draw(state);
  });
  expect((await canvas.screenshot()).equals(resting)).toBe(false);
  await page.evaluate(() => {
    const { renderer, state } = Reflect.get(window, 'netPreview');
    state.tick = 37;
    renderer.draw(state);
  });
  expect((await canvas.screenshot()).equals(resting)).toBe(true);
  await page.evaluate(() => {
    Reflect.get(window, 'netPreview').renderer.dispose();
    document.querySelector('#net-preview')?.remove();
    Reflect.deleteProperty(window, 'netPreview');
  });
});