import { expect, test } from '@playwright/test';

for (const id of [0, 1]) {
  for (const ballX of [300, 700]) {
    test(`player ${id + 1} holds the finish from ${ballX}, centers the racket and waits for a returning ball`, async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#start')).toBeEnabled();
      const position = await page.evaluate(async ({ id, ballX }) => {
        const rendererPath = '/src/render/court-renderer.ts';
        const simulationPath = '/src/core/simulation.ts';
        const projectionPath = '/src/render/court-projection.ts';
        const { CourtRenderer } = await import(rendererPath);
        const { createState } = await import(simulationPath);
        const { project } = await import(projectionPath);
        const container = document.createElement('div');
        container.id = 'stroke-preview';
        container.style.cssText = 'position:fixed;inset:0;width:640px;height:560px;z-index:100;background:#1b3635';
        document.body.append(container);
        const renderer = new CourtRenderer();
        await renderer.init(container);
        const state = createState(2);
        state.tick = 1;
        state.ball = { x: ballX, y: 900, height: 100, velocityX: 0, velocityY: id === 0 ? -24 : 24, velocityZ: 0 };
        renderer.draw(state);
        Reflect.set(window, 'strokePreview', { state, renderer });
        return project(state.players[id].x, state.players[id].y) as { x: number; y: number };
      }, { id, ballX });
      const canvas = page.locator('#stroke-preview canvas');
      await expect(canvas).toHaveCSS('width', '640px');
      const bounds = (await canvas.boundingBox())!;
      const clip = { x: bounds.x + (position.x - 22) * 2, y: bounds.y + (position.y - 32) * 2, width: 88, height: 80 };
      const ready = await page.screenshot({ clip });
      const incoming = async (velocityY: number): Promise<void> => {
        await page.evaluate((velocityY) => {
          const { state, renderer } = Reflect.get(window, 'strokePreview');
          state.ball.velocityY = velocityY;
          state.tick++;
          renderer.draw(state);
        }, velocityY);
      };
      const direction = id === 0 ? 24 : -24;
      await incoming(direction);
      const prepared = await page.screenshot({ clip });
      expect(prepared.equals(ready)).toBe(false);
      const age = async (age: number): Promise<void> => {
        await page.evaluate(({ id, age, direction }) => {
          const { state, renderer } = Reflect.get(window, 'strokePreview');
          state.tick = 10 + age;
          state.players[id].swingTicks = Math.max(0, 12 - age);
          state.players[id].hitCooldownTicks = Math.max(0, 30 - age);
          state.ball.velocityY = age === 0 ? direction : -direction;
          renderer.draw(state);
        }, { id, age, direction });
      };
      await age(0);
      await age(8);
      const finish = await page.screenshot({ clip });
      await age(17);
      expect((await page.screenshot({ clip })).equals(finish)).toBe(true);
      await age(18);
      const recovering = await page.screenshot({ clip });
      expect(recovering.equals(finish)).toBe(false);
      await age(22);
      expect((await page.screenshot({ clip })).equals(recovering)).toBe(false);
      await age(26);
      expect((await page.screenshot({ clip })).equals(ready)).toBe(true);
      await age(45);
      expect((await page.screenshot({ clip })).equals(ready)).toBe(true);
      await incoming(direction);
      expect((await page.screenshot({ clip })).equals(prepared)).toBe(true);
      await page.evaluate(() => {
        Reflect.get(window, 'strokePreview').renderer.dispose();
        document.querySelector('#stroke-preview')?.remove();
        Reflect.deleteProperty(window, 'strokePreview');
      });
    });
  }
}