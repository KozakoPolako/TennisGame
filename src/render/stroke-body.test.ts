import { expect, it } from 'vitest';
import type { StrokePose } from './player-facing';
import { PLAYER_LEG_EXTENSION, strokeBody } from './stroke-body';

it('lengthens the legs without stretching the torso, head or moving planted feet', () => {
  const body = strokeBody(1, { side: 0, handSide: 1, stroke: 'ready' })!;
  expect(PLAYER_LEG_EXTENSION).toBe(4);
  expect(body.hip.y).toBe(-11);
  expect(body.shoulder.y - body.hip.y).toBe(-7);
  expect(body.head.y - body.shoulder.y).toBe(-6);
  for (const [knee, foot] of [[body.leadKnee, body.leadFoot], [body.rearKnee, body.rearFoot]]) {
    expect(foot!.y === 0).toBe(true);
    expect(knee!.y).toBeGreaterThan(body.hip.y);
    expect(knee!.y).toBeLessThan(foot!.y);
  }
});

for (const stroke of ['forehand', 'backhand'] as const) {
  const pose: StrokePose = { side: stroke === 'forehand' ? 1 : -1, handSide: 1, stroke };

  it(`${stroke} loads the knees, steps forward, transfers weight and uncoils`, () => {
    const prepare = strokeBody(12, pose)!;
    const contact = strokeBody(7, pose)!;
    const follow = strokeBody(4, pose)!;
    expect(prepare.hip.y).toBeGreaterThan(contact.hip.y);
    expect(prepare.head.y).toBeGreaterThan(contact.head.y);
    expect(contact.leadFoot.y).toBeLessThan(prepare.leadFoot.y);
    expect(Math.abs(follow.hip.x - follow.leadFoot.x)).toBeLessThan(Math.abs(prepare.hip.x - prepare.leadFoot.x));
    expect((prepare.shoulder.x - prepare.hip.x) * pose.side).toBeGreaterThan(0);
    expect((follow.shoulder.x - follow.hip.x) * pose.side).toBeLessThan(0);
    expect(follow.shoulderWidth).toBeGreaterThan(prepare.shoulderWidth);
    expect(follow.heelLift).toBeGreaterThan(prepare.heelLift);
    expect(follow.rearKnee).not.toEqual(prepare.rearKnee);
    expect(strokeBody(0, pose)).toBeNull();
  });

  it(`${stroke} mirrors its body and steps toward the net on either court half`, () => {
    const opposite: StrokePose = { ...pose, side: pose.side === 1 ? -1 : 1, handSide: -1 };
    for (const tick of [12, 9, 7, 4, 2]) {
      const near = strokeBody(tick, pose)!;
      const far = strokeBody(tick, opposite)!;
      for (const key of ['hip', 'shoulder', 'head', 'leadFoot', 'rearFoot', 'leadKnee', 'rearKnee', 'freeHand'] as const) {
        expect(near[key].x + far[key].x).toBe(0);
      }
      expect(near.leadFoot.y + far.leadFoot.y).toBe(0);
      expect(near.hip.y).toBe(far.hip.y);
      expect(near.shoulder.y).toBe(far.shoulder.y);
    }
  });

  it(`${stroke} is repeatable after rewind and does not mutate facing`, () => {
    const frozen = Object.freeze({ ...pose });
    const frames = [12, 9, 7, 4, 2].map((tick) => strokeBody(tick, frozen));
    expect(new Set(frames.map((frame) => JSON.stringify(frame))).size).toBe(5);
    expect([12, 9, 7, 4, 2].map((tick) => strokeBody(tick, frozen))).toEqual(frames);
    expect(frozen).toEqual(pose);
    for (const frame of frames) {
      for (const value of Object.values(frame!)) {
        for (const coordinate of typeof value === 'number' ? [value] : Object.values(value)) {
          expect(Number.isInteger(coordinate)).toBe(true);
        }
      }
    }
  });
}

it('uses a forehand body for an untargeted swing and a distinct closed backhand stance', () => {
  for (const handSide of [-1, 1] as const) {
    expect(strokeBody(12, { side: 0, handSide, stroke: 'ready' }))
      .toEqual(strokeBody(12, { side: handSide, handSide, stroke: 'forehand' }));
  }
  const forehand = strokeBody(7, { side: 1, handSide: 1, stroke: 'forehand' })!;
  const backhand = strokeBody(7, { side: 1, handSide: -1, stroke: 'backhand' })!;
  expect(forehand.leadFoot.x).toBeLessThan(0);
  expect(backhand.leadFoot.x).toBeGreaterThan(0);
  expect(forehand.shoulderWidth).not.toBe(backhand.shoulderWidth);
});