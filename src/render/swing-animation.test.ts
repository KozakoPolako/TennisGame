import { expect, it } from 'vitest';
import { RACKET_SPRITES, readyRacketPose } from './racket-sprite';
import { swingFrame, visualSwingTicks, VISUAL_SWING_TICKS } from './swing-animation';
import { createState, step, HIT_INTERVAL_TICKS } from '../core/simulation';
import { project, VIEW } from './court-projection';
import { COURT, RUNOFF } from '../core/court';
import { PLAYER_LEG_EXTENSION, strokeBody } from './stroke-body';

it('extends only the visual follow-through and finishes recovery before the next permitted hit', () => {
  let state = createState(2);
  state = step(state, [{ moveX: 0, moveY: 0, hit: true }]);
  expect(swingFrame(visualSwingTicks(state.players[0]!)).phase).toBe('prepare');
  const phases: string[] = [];
  const snapshots = [];
  for (let age = 0; age <= HIT_INTERVAL_TICKS; age++) {
    state = step(state, [{ moveX: 0, moveY: 0, hit: false }]);
    const player = state.players[0]!;
    const snapshot = JSON.stringify(state);
    const visual = visualSwingTicks(player);
    phases.push(swingFrame(visual).phase);
    snapshots.push({ ...player });
    expect(JSON.stringify(state)).toBe(snapshot);
    if (age >= 12) expect(player.swingTicks).toBe(0);
  }
  expect(phases.slice(8, 18)).toEqual(Array(10).fill('follow'));
  expect(phases.slice(18, VISUAL_SWING_TICKS)).toEqual(Array(8).fill('recover'));
  expect(phases[VISUAL_SWING_TICKS]).toBe('ready');
  expect(VISUAL_SWING_TICKS).toBeLessThan(HIT_INTERVAL_TICKS);
  for (const player of snapshots.reverse()) {
    expect(swingFrame(visualSwingTicks(player)).phase).toBe(phases.pop());
  }
});

it('brings the racket grip and body back to the centered ready position', () => {
  expect([4, 2, 1, 0].map((tick) => swingFrame(tick).gripX)).toEqual([-3, -1, 0, 0]);
  expect(swingFrame(1).gripY).toBe(swingFrame(0).gripY);
  for (const side of [-1, 1] as const) {
    const body = strokeBody(1, { side, handSide: 1, stroke: side === 1 ? 'forehand' : 'backhand' })!;
    expect(body.hip.x === 0).toBe(true);
    expect(body.shoulder.x === 0).toBe(true);
    expect(body.head.x === 0).toBe(true);
    expect(body.leadFoot.y === 0).toBe(true);
    expect(body.rearFoot.y === 0).toBe(true);
  }
});

it('progresses through preparation, acceleration, contact and recovery', () => {
  expect([12, 9, 7, 4, 2, 0].map((tick) => swingFrame(tick).phase))
    .toEqual(['prepare', 'accelerate', 'contact', 'follow', 'recover', 'ready']);
  expect([12, 9, 7, 4, 2, 0].map((tick) => swingFrame(tick).trail))
    .toEqual([false, true, true, false, false, false]);
  expect(swingFrame(7)).toEqual(swingFrame(7));
});

it('defines rectangular pixel sprites with a grip anchor and strings only on visible faces', () => {
  for (const [angle, sprite] of Object.entries(RACKET_SPRITES)) {
    expect(new Set(sprite.pixels.map((row) => row.length)).size).toBe(1);
    expect(sprite.pixels[sprite.gripY]?.[sprite.gripX]).toBe('g');
    if (angle !== 'ready') expect(sprite.pixels.join('')).toContain('s');
    expect(sprite.pixels.join('')).toContain('w');
  }
});

it('keeps bright grip wrapping out of the transparent string bed', () => {
  for (const [angle, sprite] of Object.entries(RACKET_SPRITES)) {
    sprite.pixels.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === 'w') {
          expect(Math.abs(x - sprite.gripX)).toBeLessThanOrEqual(3);
          expect(Math.abs(y - sprite.gripY)).toBeLessThanOrEqual(3);
        }
      }
    });
    if (angle !== 'ready') expect(sprite.pixels.some((row) => /s\.s/.test(row))).toBe(true);
  }
});

it('shows an edge-on I silhouette rather than an open string bed when ready', () => {
  const sprite = RACKET_SPRITES.ready;
  expect(sprite.pixels[0].length).toBe(3);
  expect(sprite.pixels.length).toBeGreaterThanOrEqual(sprite.pixels[0].length * 3);
  expect(sprite.pixels.join('')).not.toContain('s');
  for (const row of sprite.pixels.slice(1, 6)) expect(row.replaceAll('.', '').length).toBe(1);
  expect(readyRacketPose(1).gripY - sprite.gripY).toBeGreaterThan(-20);
  expect(readyRacketPose(-1).gripY - sprite.gripY).toBeGreaterThan(-14);
});

it('keeps the whole racket in frame during either swing at runoff corners', () => {
  for (const x of [-RUNOFF.side, COURT.width + RUNOFF.side]) {
    for (const y of [-RUNOFF.baseline, COURT.length + RUNOFF.baseline]) {
      const point = project(x, y);
      for (const stroke of ['forehand', 'backhand'] as const) {
        for (const side of [-1, 1] as const) {
          for (let tick = 0; tick <= 12; tick++) {
            const frame = swingFrame(tick);
            const body = strokeBody(tick, { side, handSide: y < 900 ? -1 : 1, stroke });
            const sprite = RACKET_SPRITES[frame.angle];
            const headSide = frame.phase === 'follow' ? -side : side;
            const gripY = frame.angle === 'ready' ? readyRacketPose(y < 900 ? -1 : 1).gripY : frame.gripY;
            sprite.pixels.forEach((row, rowIndex) => {
              for (let column = 0; column < row.length; column++) {
                if (row[column] === '.') continue;
                const pixelX = point.x + (body?.hip.x ?? 0) + side * frame.gripX + headSide * (column - sprite.gripX);
                const pixelY = point.y + (body ? body.hip.y + 7 : -PLAYER_LEG_EXTENSION) + gripY + rowIndex - sprite.gripY;
                expect(pixelX - 1).toBeGreaterThanOrEqual(0);
                expect(pixelX + 2).toBeLessThanOrEqual(VIEW.width);
                expect(pixelY - 1).toBeGreaterThanOrEqual(32);
                expect(pixelY + 1).toBeLessThan(VIEW.height);
              }
            });
          }
        }
      }
    }
  }
});