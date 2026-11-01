import { expect, it } from 'vitest';
import { viewportLayout } from './viewport';
import { stadiumSeats, STADIUM_SEATS } from './stadium';

it('keeps integer pixel scaling in the normal layout', () => {
  expect(viewportLayout(1100, 900, false, false)).toMatchObject({ logicalWidth: 320, width: 960, height: 840, offset: 0 });
  expect(viewportLayout(1100, 900, false, true)).toMatchObject({ logicalWidth: 448, width: 896, height: 560, offset: 64 });
});

it('uses all available fullscreen height without integer-scale gaps', () => {
  const result = viewportLayout(1440, 853, true, false);
  expect(result.height).toBe(853);
  expect(result.width / result.height).toBeCloseTo(320 / 280);
});

it('widens the panoramic camera instead of stretching or cropping the court', () => {
  const result = viewportLayout(1920, 901, true, true);
  expect(result.height).toBe(901);
  expect(result.width).toBeLessThanOrEqual(1920);
  expect(1920 - result.width).toBeLessThan(4);
  expect(result.logicalWidth).toBeGreaterThan(448);
  expect(result.offset + 160).toBe(result.logicalWidth / 2);
});

it('fits portrait, tiny and changing viewports without overflow', () => {
  for (const [width, height] of [[390, 670], [844, 277], [320, 150], [1, 1], [0, 0]]) {
    for (const panoramic of [true, false]) {
      const result = viewportLayout(width!, height!, true, panoramic);
      expect(result.width).toBeLessThanOrEqual(Math.max(1, width!));
      expect(result.height).toBeLessThanOrEqual(Math.max(1, height!));
      expect(result.width).toBeGreaterThan(0);
    }
  }
});

it('adds side sectors while preserving existing seat identities for crowd animation', () => {
  const seats = stadiumSeats(640);
  expect(seats.slice(0, STADIUM_SEATS.length)).toEqual(STADIUM_SEATS);
  expect(seats.length).toBeGreaterThan(STADIUM_SEATS.length);
  for (const seat of seats) {
    expect(seat.x).toBeGreaterThanOrEqual(-160);
    expect(seat.x + 5).toBeLessThanOrEqual(480);
  }
});