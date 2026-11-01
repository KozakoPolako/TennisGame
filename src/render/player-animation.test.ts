import { describe, expect, it } from 'vitest';
import { PlayerAnimation } from './player-animation';

const player = { id: 0, x: 500, y: 1500, swingTicks: 0, hitCooldownTicks: 0, hitHeld: false, chargeTicks: 0, shotChargeTicks: 0 };

describe('running animation', () => {
  it('alternates steps and bobs while moving', () => {
    const animation = new PlayerAnimation();
    animation.sample(player, 0);
    expect(animation.sample({ ...player, x: 560 }, 5)).toMatchObject({ stride: 2, bob: 1, lean: 1, gait: { phase: 2, directionX: 1, directionY: 0 } });
    expect(animation.sample({ ...player, x: 680 }, 15)).toMatchObject({ stride: -2, bob: 1, lean: 1, gait: { phase: 6 } });
  });

  it('animates vertical motion and leans left for leftward motion', () => {
    const animation = new PlayerAnimation();
    animation.sample(player, 0);
    expect(animation.sample({ ...player, y: 1560 }, 5)).toMatchObject({ stride: 2, bob: 1, lean: 0, gait: { directionX: 0, directionY: 1 } });
    expect(animation.sample({ ...player, x: 440, y: 1560 }, 10).lean).toBe(-1);
  });

  it('does not advance on extra renders and stops when blocked or idle', () => {
    const animation = new PlayerAnimation();
    animation.sample(player, 0);
    const moved = { ...player, x: 560 };
    const pose = animation.sample(moved, 5);
    expect(animation.sample(moved, 5)).toEqual(pose);
    expect(animation.sample(moved, 6)).toEqual({ stride: 0, bob: 0, lean: 0 });
  });

  it('resets on a new timeline and keeps player cycles independent', () => {
    const animation = new PlayerAnimation();
    animation.sample(player, 0);
    animation.sample({ ...player, x: 560 }, 5);
    expect(animation.sample({ ...player, id: 1 }, 5)).toEqual({ stride: 0, bob: 0, lean: 0 });
    expect(animation.sample(player, 0)).toEqual({ stride: 0, bob: 0, lean: 0 });
  });
});