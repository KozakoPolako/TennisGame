import { expect, test } from '@playwright/test';
import { openApp } from './support/app';

for (const id of [0, 1]) {
  for (const ballX of [300, 700]) {
    test(`player ${id + 1} holds the finish from ${ballX}, centers the racket and waits for a returning ball`, async ({ page }) => {
      await openApp(page);
      const position = await page.evaluate(async ({ id, ballX }) => {
        const tennis = window.__tennis!;
        const preview = await tennis.openPreview({ id: 'stroke-preview', players: 2 });
        const { state } = preview;
        state.tick = 1;
        state.ball = { x: ballX, y: 900, height: 100, velocityX: 0, velocityY: id === 0 ? -24 : 24, velocityZ: 0 };
        preview.draw();
        const player = state.players[id]!;
        return tennis.project(player.x, player.y);
      }, { id, ballX });
      const canvas = page.locator('#stroke-preview canvas');
      await expect(canvas).toHaveCSS('width', '640px');
      const bounds = (await canvas.boundingBox())!;
      const clip = { x: bounds.x + (position.x - 22) * 2, y: bounds.y + (position.y - 32) * 2, width: 88, height: 80 };
      const ready = await page.screenshot({ clip });
      const incoming = async (velocityY: number): Promise<void> => {
        await page.evaluate((velocityY) => {
          const preview = window.__tennis!.preview!;
          preview.state.ball.velocityY = velocityY;
          preview.state.tick++;
          preview.draw();
        }, velocityY);
      };
      const direction = id === 0 ? 24 : -24;
      await incoming(direction);
      const prepared = await page.screenshot({ clip });
      expect(prepared.equals(ready)).toBe(false);
      const age = async (age: number): Promise<void> => {
        await page.evaluate(({ id, age, direction }) => {
          const preview = window.__tennis!.preview!;
          const player = preview.state.players[id]!;
          preview.state.tick = 10 + age;
          player.swingTicks = Math.max(0, 12 - age);
          player.hitCooldownTicks = Math.max(0, 30 - age);
          preview.state.ball.velocityY = age === 0 ? direction : -direction;
          preview.draw();
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
      await page.evaluate(() => window.__tennis!.closePreview());
    });
  }
}