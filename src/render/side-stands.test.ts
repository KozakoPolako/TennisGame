import { expect, it } from 'vitest';
import { sideStandPoint } from './side-stands';
import { stadiumSeats } from './stadium';
import { VIEW } from './court-projection';

it('mirrors side sectors and converges their rows toward the far end', () => {
  for (const tier of [0, 3, 8, 14]) {
    const far = sideStandPoint(-1, tier, 0.1);
    const near = sideStandPoint(-1, tier, 0.9);
    expect(near.x).toBeLessThan(far.x);
    expect(near.y).toBeGreaterThan(far.y);
    expect(near.scale).toBeGreaterThan(far.scale);
    for (const depth of [0, 0.25, 0.5, 0.75, 1]) {
      const left = sideStandPoint(-1, tier, depth);
      const right = sideStandPoint(1, tier, depth);
      expect(left.x + right.x).toBe(VIEW.width);
      expect(left.y).toBe(right.y);
    }
  }
});

it('raises outer terraces and spaces near rows wider than distant ones', () => {
  const farGap = sideStandPoint(-1, 1, 0).x - sideStandPoint(-1, 2, 0).x;
  const nearGap = sideStandPoint(-1, 1, 1).x - sideStandPoint(-1, 2, 1).x;
  expect(nearGap).toBeGreaterThan(farGap);
  expect(sideStandPoint(-1, 4, 0.5).y).toBeLessThan(sideStandPoint(-1, 0, 0.5).y);
});

it('faces every lateral seat inward in both standard and panoramic views', () => {
  for (const width of [320, 448, 640, 900]) {
    const seats = stadiumSeats(width);
    expect(new Set(seats.map((seat) => seat.id)).size).toBe(seats.length);
    const sides = seats.filter((seat) => seat.facing !== 0);
    expect(sides.length).toBeGreaterThan(0);
    for (const seat of sides) {
      expect(seat.facing).toBe(seat.x < VIEW.width / 2 ? 1 : -1);
      const mirror = sides.find((other) => other.row === seat.row && other.column === seat.column && other.facing === -seat.facing);
      expect(mirror).toBeDefined();
      expect(seat.x + mirror!.x).toBe(VIEW.width);
      expect(seat.y).toBe(mirror!.y);
      expect([0.25, 0.55, 0.85].every((depth) => Math.abs((seat.column + 0.5) / 26 - depth) >= 0.028)).toBe(true);
    }
  }
});