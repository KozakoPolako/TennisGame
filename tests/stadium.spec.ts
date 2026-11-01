import { expect, test } from '@playwright/test';

test('training has empty seats, match spectators react only to an explicit point, and reset clears the reaction', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  await page.evaluate(async () => {
    const rendererPath = '/src/render/court-renderer.ts';
    const simulationPath = '/src/core/simulation.ts';
    const { CourtRenderer } = await import(rendererPath);
    const { createState } = await import(simulationPath);
    const container = document.createElement('div');
    container.id = 'stadium-preview';
    container.style.cssText = 'position:fixed;inset:0;width:640px;height:560px;z-index:100;background:#1b3635';
    document.body.append(container);
    const renderer = new CourtRenderer();
    await renderer.init(container);
    const state = createState(1);
    renderer.draw(state);
    Reflect.set(window, 'stadiumPreview', { renderer, state, createState });
  });
  const canvas = page.locator('#stadium-preview canvas');
  await expect(canvas).toHaveCSS('width', '640px');
  const bounds = (await canvas.boundingBox())!;
  const clip = { x: bounds.x, y: bounds.y, width: 640, height: 104 };
  const empty = await page.screenshot({ clip });
  await page.evaluate(() => {
    const { state, renderer } = Reflect.get(window, 'stadiumPreview');
    state.tick = 10;
    renderer.draw(state, { tick: 10 });
  });
  expect((await page.screenshot({ clip })).equals(empty)).toBe(true);
  await page.evaluate(() => {
    const preview = Reflect.get(window, 'stadiumPreview');
    preview.state = preview.createState(2);
    preview.renderer.draw(preview.state);
  });
  const seated = await page.screenshot({ clip });
  expect(seated.equals(empty)).toBe(false);
  await page.evaluate(() => {
    const { state, renderer } = Reflect.get(window, 'stadiumPreview');
    state.tick = 10;
    renderer.draw(state);
  });
  expect((await page.screenshot({ clip })).equals(seated)).toBe(true);
  await page.evaluate(() => {
    const { state, renderer } = Reflect.get(window, 'stadiumPreview');
    const before = JSON.stringify(state);
    renderer.draw(state, { tick: 10 });
    if (JSON.stringify(state) !== before) throw new Error('Crowd changed simulation state');
  });
  const applause = await page.screenshot({ clip });
  expect(applause.equals(seated)).toBe(false);
  await page.evaluate(() => {
    const { state, renderer } = Reflect.get(window, 'stadiumPreview');
    renderer.draw(state, { tick: 10 });
  });
  expect((await page.screenshot({ clip })).equals(applause)).toBe(true);
  await page.evaluate(() => {
    const { state, renderer } = Reflect.get(window, 'stadiumPreview');
    state.tick = 16;
    renderer.draw(state, { tick: 10 });
  });
  expect((await page.screenshot({ clip })).equals(applause)).toBe(false);
  await page.evaluate(() => {
    const { state, renderer } = Reflect.get(window, 'stadiumPreview');
    state.tick = 200;
    renderer.draw(state, { tick: 10 });
  });
  expect((await page.screenshot({ clip })).equals(seated)).toBe(true);
  await page.evaluate(() => {
    const preview = Reflect.get(window, 'stadiumPreview');
    preview.state = preview.createState(1);
    preview.renderer.draw(preview.state);
  });
  expect((await page.screenshot({ clip })).equals(empty)).toBe(true);
  await canvas.screenshot({ path: test.info().outputPath('empty-stadium.png') });
  await page.evaluate(() => {
    Reflect.get(window, 'stadiumPreview').renderer.dispose();
    document.querySelector('#stadium-preview')?.remove();
    Reflect.deleteProperty(window, 'stadiumPreview');
  });
});