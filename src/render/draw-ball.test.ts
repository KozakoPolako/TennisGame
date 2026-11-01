import { expect, it } from 'vitest';
import type { BallState } from '../core/simulation';
import { ballAppearance } from './draw-ball';

const ball: BallState = { x: 500, y: 1200, height: 0, velocityX: 0, velocityY: 0, velocityZ: 0 };

it('keeps settled balls visually stationary across ticks', () => {
  expect(ballAppearance(ball, 4)).toEqual(ballAppearance(ball, 0));
  expect(ballAppearance(ball, 999)).toEqual(ballAppearance(ball, 0));
});

it('raises the ball and reduces its shadow according to its height', () => {
  const ground = ballAppearance(ball, 0);
  const airborne = ballAppearance({ ...ball, height: 360 }, 0);
  expect(airborne.lift).toBe(36);
  expect(airborne.shadowAlpha).toBeLessThan(ground.shadowAlpha);
  expect(airborne.shadowRadius).toBeLessThan(ground.shadowRadius);
  expect(ballAppearance({ ...ball, height: -10 }, 0)).toEqual(ground);
});

it('animates the seam only for moving balls without modifying their state', () => {
  const moving = { ...ball, velocityY: 24 };
  const snapshot = JSON.stringify(moving);
  expect(ballAppearance(moving, 0).seam).not.toBe(ballAppearance(moving, 4).seam);
  expect(ballAppearance(moving, 8).seam).toBe(ballAppearance(moving, 0).seam);
  expect(JSON.stringify(moving)).toBe(snapshot);
});