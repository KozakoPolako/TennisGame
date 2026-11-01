import { describe, expect, it } from 'vitest';
import { advanceFlyingBall, settleBall } from './ball-motion';
import { COURT, NET, RUNOFF } from './court';
import type { BallState } from './simulation';

const ball: BallState = { x: 500, y: 880, height: 50, velocityX: 0, velocityY: 40, velocityZ: 0 };

it('settles loose balls within the expanded runoffs', () => {
  for (const x of [-RUNOFF.side, COURT.width + RUNOFF.side]) {
    for (const y of [-RUNOFF.baseline, COURT.length + RUNOFF.baseline]) {
      const settled = settleBall({ ...ball, x, y, height: 0, velocityX: x < 0 ? -20 : 20, velocityY: y < 0 ? -20 : 20 });
      expect(settled.x).toBe(x);
      expect(settled.y).toBe(y);
      expect(settled.velocityX * (x < 0 ? -1 : 1)).toBeLessThan(0);
      expect(settled.velocityY * (y < 0 ? -1 : 1)).toBeLessThan(0);
    }
  }
});

describe('net collision', () => {
  it.each([1, -1])('stops a low ball on its original side (%i)', (direction) => {
    const result = advanceFlyingBall({ ...ball, y: NET.y - 20 * direction, velocityY: 40 * direction });
    expect(result.contact?.kind).toBe('mesh');
    expect((result.ball.y - NET.y) * direction).toBeLessThan(0);
    expect(result.ball.velocityY * direction).toBeLessThan(0);
  });

  it('uses the height at the crossing rather than at the end of a fast tick', () => {
    const result = advanceFlyingBall({ ...ball, y: 899, height: 140, velocityZ: -80 });
    expect(result.contact).toBeNull();
    expect(result.ball.height).toBeLessThan(NET.height);
  });

  it('slows a ball clipping the tape without stopping the rally', () => {
    const result = advanceFlyingBall({ ...ball, height: NET.height + 5 });
    expect(result.contact?.kind).toBe('tape');
    expect(result.ball.y).toBeGreaterThan(NET.y);
    expect(result.ball.velocityY).toBeGreaterThan(0);
    expect(result.ball.velocityY).toBeLessThan(ball.velocityY);
    expect(advanceFlyingBall(result.ball).contact).toBeNull();
  });

  it('does not collide outside the actual net width', () => {
    expect(advanceFlyingBall({ ...ball, x: NET.right + 50 }).contact).toBeNull();
  });

  it('settles a netted ball without teleporting or disappearing', () => {
    let current = advanceFlyingBall(ball).ball;
    for (let tick = 0; tick < 200; tick++) current = settleBall(current);
    expect(current.height).toBe(0);
    expect(current.velocityX).toBe(0);
    expect(current.velocityY).toBe(0);
    expect(current.velocityZ).toBe(0);
    expect(current.y).toBeLessThan(NET.y);
    expect(settleBall(current)).toEqual(current);
  });
});