import { expect, test } from '@playwright/test';

test('prepared footwork turns the legs on both court halves and uses distinct adjustment steps', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 720 });
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  await page.evaluate(async () => {
    const pixiPath = performance.getEntriesByType('resource').find((entry) => new URL(entry.name).pathname.endsWith('/pixi__js.js'))?.name;
    if (!pixiPath) throw new Error('The application has not loaded PixiJS');
    const drawPath = '/src/render/draw-player.ts';
    const projectionPath = '/src/render/court-projection.ts';
    const simulationPath = '/src/core/simulation.ts';
    const { Application, Graphics } = await import(pixiPath);
    const { drawPlayer } = await import(drawPath);
    const { project } = await import(projectionPath);
    const { createState } = await import(simulationPath);
    const app = new Application();
    await app.init({ width: 360, height: 228, resolution: 1, antialias: false, autoStart: false, background: 0xb96542, preference: 'webgl' });
    app.canvas.id = 'footwork-preview';
    app.canvas.style.cssText = 'position:fixed;left:0;top:0;width:1080px;height:684px;z-index:100;image-rendering:pixelated';
    document.body.append(app.canvas);
    const players = createState(2).players;
    for (let row = 0; row < 6; row++) {
      const player = players[Math.floor(row / 3)];
      const handSide = player.id === 0 ? 1 : -1;
      const side = row % 3 === 0 ? 0 : row % 3 === 1 ? handSide : -handSide;
      const pose = { side, handSide, stroke: side === 0 ? 'ready' : side === handSide ? 'forehand' : 'backhand' };
      const position = project(player.x, player.y);
      for (let column = 0; column < 9; column++) {
        const phase = column - 1;
        const run = column === 0 ? { stride: 0, bob: 0, lean: 0 } : {
          stride: [0, 1, 2, 1, 0, -1, -2, -1][phase], bob: [0, 1, 1, 0, 0, 1, 1, 0][phase], lean: 1,
          gait: { phase, directionX: 1, directionY: 0 },
        };
        const graphics = new Graphics();
        graphics.position.set(column * 40 + 18 - position.x, row * 38 + 29 - position.y);
        drawPlayer(graphics, player, run, pose, player.id === 0 ? 0xffd36b : 0x7ad1db);
        app.stage.addChild(graphics);
      }
    }
    app.render();
    Reflect.set(window, 'footworkPreview', app);
  });
  const feet = (row: number, column: number) => page.screenshot({ clip: {
    x: (column * 40 + 8) * 3, y: (row * 38 + 20) * 3, width: 60, height: 39,
  } });
  for (const base of [0, 3]) {
    const ready = await feet(base, 0);
    const forehand = await feet(base + 1, 0);
    const backhand = await feet(base + 2, 0);
    expect(forehand.equals(ready)).toBe(false);
    expect(backhand.equals(ready)).toBe(false);
    expect(backhand.equals(forehand)).toBe(false);
    for (const row of [base + 1, base + 2]) {
      const frames = await Promise.all([1, 3, 5, 7].map((column) => feet(row, column)));
      expect(new Set(frames.map((frame) => frame.toString('base64'))).size).toBe(4);
      expect(frames[1]!.equals(await feet(base, 3))).toBe(false);
    }
  }
  await page.locator('#footwork-preview').screenshot({ path: testInfo.outputPath('prepared-footwork.png') });
  await page.evaluate(() => {
    Reflect.get(window, 'footworkPreview').destroy(true, { children: true });
    Reflect.deleteProperty(window, 'footworkPreview');
  });
});