import { expect, it } from 'vitest';
import type { Graphics } from 'pixi.js';
import { createState } from '../core/simulation';
import { drawPlayer } from './draw-player';

for (const id of [0, 1, 2, 3]) {
  for (const swingTicks of [0, 1]) {
    it(`renders the ready racket on the front side of player ${id + 1} at visual tick ${swingTicks}`, () => {
      const calls: { method: string; args: unknown[] }[] = [];
      const graphics = Object.fromEntries(['rect', 'poly', 'ellipse', 'moveTo', 'lineTo', 'fill', 'stroke'].map((method) => [
        method, (...args: unknown[]) => { calls.push({ method, args }); return graphics; },
      ])) as unknown as Graphics;
      const player = { ...createState(4).players[id]!, swingTicks };
      const handSide = id % 2 === 0 ? 1 : -1;
      drawPlayer(graphics, player, { stride: 0, bob: 0, lean: 0 }, { side: 0, stroke: 'ready', handSide }, 0xff00ff);
      const torso = calls.findIndex((call, index) => call.method === 'fill' && call.args[0] === 0xff00ff && calls[index - 1]?.method === 'poly');
      const rim = calls.findIndex((call) => call.method === 'fill' && (call.args[0] as { color?: number })?.color === 0xc9dce2);
      const arms = calls.map((call, index) => call.method === 'stroke' ? index : -1).filter((index) => index >= 0);
      expect(torso).toBeGreaterThanOrEqual(0);
      expect(rim).toBeGreaterThanOrEqual(0);
      expect(arms).toHaveLength(2);
      for (const part of [rim, ...arms]) {
        if (handSide === 1) expect(part).toBeLessThan(torso);
        else expect(part).toBeGreaterThan(torso);
      }
    });
  }
}