import { expect, it } from 'vitest';
import { netDisplacement } from './net-animation';

it('animates a net contact by tick and decays to rest without render-side effects', () => {
  const impact = { tick: 100, x: 500, kind: 'mesh' as const };
  expect(netDisplacement(100, impact, 0)).toBe(1);
  expect(netDisplacement(104, impact, 0)).toBe(-1);
  expect(netDisplacement(100, impact, 0)).toBe(1);
  expect(netDisplacement(118, impact, 0)).toBe(0);
  expect(netDisplacement(99, impact, 0)).toBe(0);
  expect(netDisplacement(100, null, 0)).toBe(0);
  expect(netDisplacement(100, impact, 1000)).toBe(0);
});

it.each(['mesh', 'tape'] as const)('keeps %s vibrations local and within one logical pixel', (kind) => {
  const impact = { tick: 100, x: 500, kind };
  for (let age = 0; age <= 36; age++) {
    for (const distance of [-1000, -260, -80, 0, 80, 260, 1000]) {
      const displacement = netDisplacement(100 + age, impact, distance);
      expect(Math.abs(displacement)).toBeLessThanOrEqual(1);
      if (Math.abs(distance) >= 260 || age >= (kind === 'mesh' ? 18 : 12)) expect(displacement).toBe(0);
    }
  }
});