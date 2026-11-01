import { expect, it } from 'vitest';
import { COURT, NET, netHeightAt } from './court';
import { advanceFlyingBall } from './ball-motion';

it('anchors the net at half court and lowers its center symmetrically', () => {
  expect(NET.y).toBe(COURT.length / 2);
  expect(netHeightAt(500)).toBe(NET.height);
  expect(netHeightAt(NET.left)).toBe(NET.postHeight);
  expect(netHeightAt(NET.right)).toBe(NET.postHeight);
  let previous: number = NET.height;
  for (let distance = 0; distance <= 560; distance += 10) {
    const height = netHeightAt(500 + distance);
    expect(height).toBe(netHeightAt(500 - distance));
    expect(Number.isInteger(height)).toBe(true);
    expect(height).toBeGreaterThanOrEqual(previous);
    previous = height;
  }
});

it.each([1, -1])('uses the local tape height for balls travelling in direction %i', (direction) => {
  const ball = { x: 500, y: NET.y - 20 * direction, height: 115, velocityX: 0, velocityY: 40 * direction, velocityZ: 1 };
  expect(advanceFlyingBall(ball).contact).toBeNull();
  const postBall = advanceFlyingBall({ ...ball, x: NET.right });
  expect(postBall.contact?.kind).toBe('tape');
  expect(postBall.ball.height).toBe(NET.postHeight + NET.ballRadius);
  expect(advanceFlyingBall({ ...ball, height: 100 }).contact?.kind).toBe('tape');
  expect(advanceFlyingBall({ ...ball, x: NET.right, height: 100 }).contact?.kind).toBe('mesh');
});

it('places singles sticks in the alleys and keeps the outer tape level', () => {
  expect(NET.singlesLeft).toBeGreaterThan(0);
  expect(NET.singlesLeft).toBeLessThan(125);
  expect(NET.singlesRight).toBeGreaterThan(875);
  expect(NET.singlesRight).toBeLessThan(COURT.width);
  expect(NET.singlesRight).toBe(COURT.width - NET.singlesLeft);
  for (let x = NET.left; x <= NET.singlesLeft; x++) {
    expect(netHeightAt(x, true)).toBe(NET.postHeight);
    expect(netHeightAt(COURT.width - x, true)).toBe(NET.postHeight);
  }
  expect(netHeightAt(500, true)).toBe(NET.height);
  expect(netHeightAt(250, true)).toBeLessThan(NET.postHeight);
  expect(netHeightAt(NET.singlesLeft, false)).toBeLessThan(NET.postHeight);
});

it.each([1, -1])('uses the supported singles net height for collision in direction %i', (direction) => {
  const ball = { x: NET.singlesLeft, y: NET.y - 20 * direction, height: 105, velocityX: 0, velocityY: 40 * direction, velocityZ: 1 };
  expect(advanceFlyingBall(ball, false).contact?.kind).toBe('tape');
  expect(advanceFlyingBall(ball, true).contact?.kind).toBe('mesh');
});