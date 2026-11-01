import { expect, it } from 'vitest';
import { COURT, NET, netHeightAt } from '../core/court';
import { createState } from '../core/simulation';
import { project } from './court-projection';
import { netProfile } from './net-profile';

it.each([1, 2, 4] as const)('matches the physical net profile for %i players', (count) => {
  const points = netProfile(createState(count));
  for (const point of points) {
    expect(point.y).toBe(project(point.worldX, NET.y, netHeightAt(point.worldX, count !== 4)).y);
  }
  expect(points.some((point) => point.worldX === COURT.width / 2)).toBe(true);
  expect(points.some((point) => point.worldX === NET.singlesLeft)).toBe(count !== 4);
  expect(points.some((point) => point.worldX === NET.singlesRight)).toBe(count !== 4);
});

it('keeps the sticks and outer tape fixed even during a nearby impact', () => {
  const state = createState(1);
  const resting = netProfile(state);
  state.tick = 10;
  state.netImpact = { tick: 10, x: NET.singlesLeft + 30, kind: 'mesh' };
  const vibrating = netProfile(state);
  for (const point of vibrating) {
    if (point.worldX <= NET.singlesLeft || point.worldX >= NET.singlesRight) {
      expect(point).toEqual(resting.find((other) => other.worldX === point.worldX));
    }
  }
  expect(vibrating.some((point, index) => point.y !== resting[index]?.y)).toBe(true);
});