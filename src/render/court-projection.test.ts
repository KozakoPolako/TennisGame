import { expect, it } from 'vitest';
import { COURT, RUNOFF } from '../core/simulation';
import { project, VIEW } from './court-projection';
import { NET, netHeightAt } from '../core/court';
import { STADIUM } from './stadium';

it('provides wider visible and playable runoffs without shrinking the court', () => {
  expect(RUNOFF.side).toBe(320);
  expect(RUNOFF.baseline).toBe(560);
  expect(project(0, 900).x - project(-RUNOFF.side, 900).x).toBeGreaterThan(25);
  expect(project(500, 0).y - project(500, -RUNOFF.baseline).y).toBeGreaterThan(20);
  expect(project(500, COURT.length + RUNOFF.baseline).y - project(500, COURT.length).y).toBeGreaterThan(30);
});

it('places walls outside player movement and leaves the foreground below their feet', () => {
  expect(STADIUM.left).toBeLessThan(-RUNOFF.side);
  expect(STADIUM.right).toBeGreaterThan(COURT.width + RUNOFF.side);
  expect(STADIUM.far).toBeLessThan(-RUNOFF.baseline);
  expect(STADIUM.near).toBeGreaterThan(COURT.length + RUNOFF.baseline);
  expect(project(500, STADIUM.near).y).toBeGreaterThan(project(500, COURT.length + RUNOFF.baseline).y + 7);
  expect(project(500, STADIUM.near).y).toBeLessThan(VIEW.height);
});

it('enlarges both court dimensions by twenty percent within pixel rounding', () => {
  expect(project(COURT.width, COURT.length).x - project(0, COURT.length).x).toBe(168);
  expect(Math.abs(project(COURT.width, 0).x - project(0, 0).x - 112 * 1.2)).toBeLessThanOrEqual(1);
  expect(Math.abs(project(500, COURT.length).y - project(500, 0).y - 96 * 1.2)).toBeLessThanOrEqual(1);
});

it('keeps the compressed runoffs continuous and ordered on either side of the court', () => {
  for (const y of [-RUNOFF.baseline, 0, 900, COURT.length, COURT.length + RUNOFF.baseline]) {
    const xs = [-RUNOFF.side, -60, 0, 125, 500, 875, COURT.width, COURT.width + 60, COURT.width + RUNOFF.side]
      .map((x) => project(x, y).x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(new Set(xs).size).toBe(xs.length);
  }
  for (const boundary of [0, COURT.length]) {
    expect(Math.abs(project(500, boundary - 1).y - project(500, boundary + 1).y)).toBeLessThanOrEqual(1);
  }
});

it('keeps players and their rackets visible at every runoff corner', () => {
  for (const x of [-RUNOFF.side, COURT.width + RUNOFF.side]) {
    for (const y of [-RUNOFF.baseline, COURT.length + RUNOFF.baseline]) {
      const point = project(x, y);
      expect(point.x - 9).toBeGreaterThanOrEqual(0);
      expect(point.x + 18).toBeLessThan(VIEW.width);
      expect(point.y - 26).toBeGreaterThanOrEqual(32);
      expect(point.y + 7).toBeLessThan(VIEW.height);
    }
  }
});

it('places the net base at the intersection of court diagonals in perspective', () => {
  const farLeft = project(0, 0);
  const farRight = project(COURT.width, 0);
  const nearLeft = project(0, COURT.length);
  const nearRight = project(COURT.width, COURT.length);
  const farWidth = farRight.x - farLeft.x;
  const nearWidth = nearRight.x - nearLeft.x;
  const diagonalIntersectionY = (farLeft.y * nearWidth + nearLeft.y * farWidth) / (farWidth + nearWidth);
  expect(project(500, NET.y)).toEqual({ x: VIEW.width / 2, y: Math.round(diagonalIntersectionY) });
  expect(project(500, NET.y).y - farLeft.y).toBeLessThan(nearLeft.y - project(500, NET.y).y);
});

it('draws the tape lower at the middle while keeping the feet of both posts level', () => {
  const left = project(NET.left, NET.y, netHeightAt(NET.left));
  const center = project(500, NET.y, netHeightAt(500));
  const right = project(NET.right, NET.y, netHeightAt(NET.right));
  expect(center.y).toBeGreaterThan(left.y);
  expect(center.y - left.y).toBe(1);
  expect(left.y).toBe(right.y);
  expect(project(NET.left, NET.y).y).toBe(project(NET.right, NET.y).y);
});