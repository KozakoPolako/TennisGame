import { expect, it } from 'vitest';
import { runLegs } from './run-legs';
import { PlayerAnimation, type RunPose } from './player-animation';
import { createState } from '../core/simulation';
import type { StrokePose } from './player-facing';

const IDLE: RunPose = { stride: 0, bob: 0, lean: 0 };
const PREPARED_POSES: StrokePose[] = [-1, 1].flatMap((handSide) => ([-1, 1] as const).map((side) => ({
  side, handSide: handSide as -1 | 1, stroke: side === handSide ? 'forehand' as const : 'backhand' as const,
})));

it.each(PREPARED_POSES)('turns both knees and shoes sideways for $stroke with handSide $handSide', (pose) => {
  const legs = runLegs(IDLE, pose.handSide, pose);
  expect(legs.every((leg) => leg.lift === 0 && leg.toe === pose.side)).toBe(true);
  expect(Math.abs(legs[0]!.groundY - legs[1]!.groundY)).toBe(6);
  expect(Math.abs(legs[0]!.ankle.x - legs[1]!.ankle.x)).toBe(4);
  for (const leg of legs) {
    expect((leg.knee.x - (leg.hip.x + leg.ankle.x) / 2) * pose.side).toBeGreaterThan(0);
  }
  expect(legs).not.toEqual(runLegs(IDLE, pose.handSide));
});

it.each(PREPARED_POSES)('uses low non-crossing adjustment steps for $stroke with handSide $handSide', (pose) => {
  for (const directionX of [-1, 0, 1]) {
    for (const directionY of [-1, 0, 1]) {
      if (!directionX && !directionY) continue;
      for (let phase = 0; phase < 8; phase++) {
        const run: RunPose = { stride: 0, bob: phase % 2, lean: directionX, gait: { phase, directionX, directionY } };
        const legs = runLegs(run, pose.handSide, pose);
        expect(legs.filter((leg) => leg.lift === 0)).toHaveLength(1);
        expect((legs[1]!.groundY - legs[0]!.groundY) * pose.handSide).toBeGreaterThanOrEqual(4);
        for (const leg of legs) {
          expect(leg.toe).toBe(pose.side);
          expect(leg.lift).toBeLessThanOrEqual(2);
          expect(leg.knee.y).toBeGreaterThan(leg.hip.y);
          expect(leg.knee.y).toBeLessThan(leg.ankle.y);
        }
        expect(legs).not.toEqual(runLegs(run, pose.handSide));
        expect(runLegs(run, pose.handSide, pose)).toEqual(legs);
      }
    }
  }
});

it('mirrors preparation and returns to the original neutral gait without retaining a stance', () => {
  const forehand: StrokePose = { side: 1, handSide: 1, stroke: 'forehand' };
  const backhand: StrokePose = { side: -1, handSide: 1, stroke: 'backhand' };
  const right = runLegs(IDLE, 1, forehand);
  const left = runLegs(IDLE, 1, backhand);
  right.forEach((leg, index) => {
    for (const joint of ['hip', 'knee', 'ankle'] as const) {
      expect(left[index]![joint].x + leg[joint].x).toBe(0);
      expect(left[index]![joint].y).toBe(leg[joint].y);
    }
  });
  expect(runLegs(IDLE, 1, { side: 0, handSide: 1, stroke: 'ready' })).toEqual(runLegs(IDLE, 1));
});

it('alternates supporting legs while lifting the other foot with a bent knee', () => {
  for (const directionX of [-1, 0, 1]) {
    for (const directionY of [-1, 0, 1]) {
      if (!directionX && !directionY) continue;
      for (let phase = 0; phase < 8; phase++) {
        const pose: RunPose = { stride: 0, bob: 0, lean: directionX, gait: { phase, directionX, directionY } };
        const legs = runLegs(pose, 1);
        expect(legs.filter((leg) => leg.lift === 0)).toHaveLength(1);
        expect(legs.filter((leg) => leg.lift > 0)).toHaveLength(1);
        for (const leg of legs) {
          expect(leg.knee.y).toBeGreaterThan(leg.hip.y);
          expect(leg.knee.y).toBeLessThan(leg.ankle.y);
          if (leg.lift >= 3) {
            const cross = (leg.knee.x - leg.hip.x) * (leg.ankle.y - leg.hip.y)
              - (leg.knee.y - leg.hip.y) * (leg.ankle.x - leg.hip.x);
            expect(Math.abs(cross)).toBeGreaterThan(0);
          }
          for (const point of [leg.hip, leg.knee, leg.ankle]) {
            expect(Number.isInteger(point.x)).toBe(true);
            expect(Number.isInteger(point.y)).toBe(true);
          }
        }
      }
    }
  }
});

it('keeps both feet grounded when idle and is independent of render calls', () => {
  const animation = new PlayerAnimation();
  const player = createState(2).players[0]!;
  animation.sample(player, 0);
  const moved = { ...player, x: player.x + 30 };
  const pose = animation.sample(moved, 1);
  const first = runLegs(pose, 1);
  expect(runLegs(animation.sample(moved, 1), 1)).toEqual(first);
  expect(runLegs(animation.sample(moved, 2), 1).every((leg) => leg.lift === 0)).toBe(true);
  expect(runLegs(animation.sample(player, 0), 1).every((leg) => leg.lift === 0)).toBe(true);
});

it('produces eight distinct steps for horizontal and vertical movement on either court half', () => {
  for (const handSide of [-1, 1] as const) {
    for (const direction of [{ directionX: 1, directionY: 0 }, { directionX: 0, directionY: 1 }]) {
      const frames = Array.from({ length: 8 }, (_, phase) => runLegs({ stride: 0, bob: 0, lean: direction.directionX, gait: { phase, ...direction } }, handSide));
      expect(new Set(frames.map((frame) => JSON.stringify(frame))).size).toBe(8);
    }
  }
});