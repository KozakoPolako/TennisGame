import { expect, test } from '@playwright/test';

for (const playerId of [0, 1]) {
  test(`player ${playerId + 1} visibly turns between forehand and backhand`, async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#start')).toBeEnabled();
    const position = await page.evaluate(async (id) => {
      const simulationPath = '/src/core/simulation.ts';
      const rendererPath = '/src/render/court-renderer.ts';
      const projectionPath = '/src/render/court-projection.ts';
      const { createState } = await import(simulationPath);
      const { CourtRenderer } = await import(rendererPath);
      const { project } = await import(projectionPath);
      const container = document.createElement('div');
      container.id = 'facing-preview';
      container.style.cssText = 'position:fixed;inset:0;width:640px;height:560px;z-index:100;background:#1b3635';
      document.body.append(container);
      const renderer = new CourtRenderer();
      await renderer.init(container);
      const state = createState(2);
      state.ball = { x: 700, y: 900, height: 100, velocityX: 0, velocityY: id === 0 ? 24 : -24, velocityZ: 0 };
      state.tick = 1;
      renderer.draw(state);
      Reflect.set(window, 'facingPreview', { renderer, state });
      return project(state.players[id].x, state.players[id].y) as { x: number; y: number };
    }, playerId);
    const canvas = page.locator('#facing-preview canvas');
    await expect(canvas).toHaveCSS('width', '640px');
    const bounds = (await canvas.boundingBox())!;
    const clip = { x: bounds.x + (position.x - 20) * 2, y: bounds.y + (position.y - 32) * 2, width: 80, height: 84 };
    const right = await page.screenshot({ clip });
    await page.evaluate(() => {
      const { state, renderer } = Reflect.get(window, 'facingPreview');
      state.ball.x = 300;
      state.tick++;
      renderer.draw(state);
    });
    const left = await page.screenshot({ clip });
    expect(left.equals(right)).toBe(false);
    for (const trajectory of [{ x: 700, velocityX: -16 }, { x: 300, velocityX: 16 }]) {
      await page.evaluate((trajectory) => {
        const { state, renderer } = Reflect.get(window, 'facingPreview');
        Object.assign(state.ball, trajectory);
        state.tick++;
        renderer.draw(state);
      }, trajectory);
      expect((await page.screenshot({ clip })).equals(trajectory.velocityX < 0 ? left : right)).toBe(true);
    }
    await page.evaluate(() => {
      const { state, renderer } = Reflect.get(window, 'facingPreview');
      state.ball.x = 700;
      state.ball.velocityX = 0;
      state.tick++;
      renderer.draw(state);
    });
    expect((await page.screenshot({ clip })).equals(right)).toBe(true);
    for (const ballX of [700, 300]) {
      await page.evaluate(({ id, ballX }) => {
        const { state, renderer } = Reflect.get(window, 'facingPreview');
        state.players[id].swingTicks = 0;
        state.ball.x = ballX;
        state.tick++;
        renderer.draw(state);
      }, { id: playerId, ballX });
      const frames: Buffer[] = [];
      const footFrames: Buffer[] = [];
      for (const ticks of [12, 9, 7, 4, 2]) {
        await page.evaluate(({ id, ticks }) => {
          const { state, renderer } = Reflect.get(window, 'facingPreview');
          state.players[id].swingTicks = ticks;
          state.tick++;
          renderer.draw(state);
        }, { id: playerId, ticks });
        const frame = await page.screenshot({ clip });
        expect(frame.equals(ballX === 700 ? right : left)).toBe(false);
        for (const previous of frames) expect(frame.equals(previous)).toBe(false);
        frames.push(frame);
        if ([12, 7, 4].includes(ticks)) {
          const feet = await page.screenshot({ clip: { x: bounds.x + (position.x - 10) * 2, y: bounds.y + (position.y - 3) * 2, width: 40, height: 12 } });
          for (const previous of footFrames) expect(feet.equals(previous)).toBe(false);
          footFrames.push(feet);
        }
      }
      await page.evaluate((id) => {
        const { state, renderer } = Reflect.get(window, 'facingPreview');
        state.players[id].swingTicks = 0;
        state.tick++;
        renderer.draw(state);
      }, playerId);
      expect((await page.screenshot({ clip })).equals(ballX === 700 ? right : left)).toBe(true);
    }
    await page.evaluate(() => {
      Reflect.get(window, 'facingPreview').renderer.dispose();
      document.querySelector('#facing-preview')?.remove();
      Reflect.deleteProperty(window, 'facingPreview');
    });
  });
}