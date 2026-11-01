import { expect, test } from '@playwright/test';
import { openApp } from './support/app';

for (const playerId of [0, 1]) {
  test(`player ${playerId + 1} visibly turns between forehand and backhand`, async ({ page }) => {
    await openApp(page);
    const position = await page.evaluate(async (id) => {
      const tennis = window.__tennis!;
      const preview = await tennis.openPreview({ id: 'facing-preview', players: 2 });
      const { state } = preview;
      state.ball = { x: 700, y: 900, height: 100, velocityX: 0, velocityY: id === 0 ? 24 : -24, velocityZ: 0 };
      state.tick = 1;
      preview.draw();
      const player = state.players[id]!;
      return tennis.project(player.x, player.y);
    }, playerId);
    const canvas = page.locator('#facing-preview canvas');
    await expect(canvas).toHaveCSS('width', '640px');
    const bounds = (await canvas.boundingBox())!;
    const clip = { x: bounds.x + (position.x - 20) * 2, y: bounds.y + (position.y - 32) * 2, width: 80, height: 84 };
    const right = await page.screenshot({ clip });
    await page.evaluate(() => {
      const preview = window.__tennis!.preview!;
      preview.state.ball.x = 300;
      preview.state.tick++;
      preview.draw();
    });
    const left = await page.screenshot({ clip });
    expect(left.equals(right)).toBe(false);
    for (const trajectory of [{ x: 700, velocityX: -16 }, { x: 300, velocityX: 16 }]) {
      await page.evaluate((trajectory) => {
        const preview = window.__tennis!.preview!;
        Object.assign(preview.state.ball, trajectory);
        preview.state.tick++;
        preview.draw();
      }, trajectory);
      expect((await page.screenshot({ clip })).equals(trajectory.velocityX < 0 ? left : right)).toBe(true);
    }
    await page.evaluate(() => {
      const preview = window.__tennis!.preview!;
      preview.state.ball.x = 700;
      preview.state.ball.velocityX = 0;
      preview.state.tick++;
      preview.draw();
    });
    expect((await page.screenshot({ clip })).equals(right)).toBe(true);
    for (const ballX of [700, 300]) {
      await page.evaluate(({ id, ballX }) => {
        const preview = window.__tennis!.preview!;
        preview.state.players[id]!.swingTicks = 0;
        preview.state.ball.x = ballX;
        preview.state.tick++;
        preview.draw();
      }, { id: playerId, ballX });
      const frames: Buffer[] = [];
      const footFrames: Buffer[] = [];
      for (const ticks of [12, 9, 7, 4, 2]) {
        await page.evaluate(({ id, ticks }) => {
          const preview = window.__tennis!.preview!;
          preview.state.players[id]!.swingTicks = ticks;
          preview.state.tick++;
          preview.draw();
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
        const preview = window.__tennis!.preview!;
        preview.state.players[id]!.swingTicks = 0;
        preview.state.tick++;
        preview.draw();
      }, playerId);
      expect((await page.screenshot({ clip })).equals(ballX === 700 ? right : left)).toBe(true);
    }
    await page.evaluate(() => window.__tennis!.closePreview());
  });
}