import { describe, expect, it } from 'vitest';
import { createState, type BallState } from '../core/simulation';
import { PlayerFacing, strokePose } from './player-facing';
import { visualSwingTicks } from './swing-animation';

const ball: BallState = { x: 700, y: 1000, height: 100, velocityX: 0, velocityY: 24, velocityZ: 0 };

describe('forehand and backhand orientation', () => {
  it.each([0, 1])('holds the finish, returns to neutral and prepares only for returning balls for player %i', (id) => {
    const facing = new PlayerFacing();
    const state = createState(2);
    const player = state.players[id]!;
    const direction = id === 0 ? 24 : -24;
    state.ball = { ...ball, y: 900, velocityY: direction };
    state.tick = 10;
    const original = facing.sample(player, state);
    for (let age = 0; age < 26; age++) {
      state.tick = 11 + age;
      player.hitCooldownTicks = 30 - age;
      player.swingTicks = Math.max(0, 12 - age);
      if (age > 0) state.ball.velocityY = -direction;
      expect(facing.sample({ ...player, swingTicks: visualSwingTicks(player) }, state)).toEqual(original);
    }
    for (let age = 26; age <= 60; age++) {
      state.tick = 11 + age;
      player.hitCooldownTicks = Math.max(0, 30 - age);
      expect(facing.sample({ ...player, swingTicks: visualSwingTicks(player) }, state).stroke).toBe('ready');
    }
    state.ball.velocityY = direction;
    state.tick++;
    expect(facing.sample(player, state)).toEqual(original);
    state.ball.x = 300;
    state.tick++;
    expect(facing.sample(player, state).stroke).not.toBe(original.stroke);
  });

  it.each([0, 1, 2, 3])('uses the right hand relative to the court side for player %i', (id) => {
    const near = id % 2 === 0;
    const player = { id, x: 500, y: near ? 1500 : 300, swingTicks: 0, hitCooldownTicks: 0, hitHeld: false, chargeTicks: 0, shotChargeTicks: 0 };
    const incoming = { ...ball, y: near ? 1000 : 800, velocityY: near ? 24 : -24 };
    expect(strokePose(player, incoming)).toMatchObject({ side: 1, stroke: near ? 'forehand' : 'backhand' });
    expect(strokePose(player, { ...incoming, x: 300 })).toMatchObject({ side: -1, stroke: near ? 'backhand' : 'forehand' });
  });

  it('stays neutral near the center and ignores stationary, outgoing or passed balls', () => {
    const player = { id: 0, x: 500, y: 1500, swingTicks: 0, hitCooldownTicks: 0, hitHeld: false, chargeTicks: 0, shotChargeTicks: 0 };
    for (const target of [null, { ...ball, x: 525 }, { ...ball, x: 475 }, { ...ball, velocityY: 0 }, { ...ball, velocityY: -24 }, { ...ball, y: 1700 }]) {
      expect(strokePose(player, target).stroke).toBe('ready');
    }
  });

  it.each([0, 1, 2, 3])('anticipates a diagonal ball crossing the body line for player %i', (id) => {
    const player = createState(4).players[id]!;
    player.x = 500;
    const near = id % 2 === 0;
    const diagonal = { ...ball, x: 650, y: 900, velocityX: -10, velocityY: near ? 20 : -20 };
    expect(strokePose(player, diagonal)).toMatchObject({ side: -1, stroke: near ? 'backhand' : 'forehand' });
    expect(strokePose(player, { ...diagonal, x: 350, velocityX: 10 }))
      .toMatchObject({ side: 1, stroke: near ? 'forehand' : 'backhand' });
    expect(strokePose(player, { ...diagonal, x: 500, velocityX: -10 }).side).toBe(-1);
  });

  it('keeps the same preparation while a diagonal ball crosses the current player x', () => {
    const player = createState(1).players[0]!;
    for (const elapsed of [0, 10, 15, 20, 30]) {
      const diagonal = { ...ball, x: 650 - 10 * elapsed, y: 900 + 20 * elapsed, velocityX: -10, velocityY: 20 };
      expect(strokePose(player, diagonal).stroke).toBe('backhand');
    }
  });

  it('uses a neutral pose for a trajectory arriving at the center, not its current side', () => {
    const player = createState(1).players[0]!;
    expect(strokePose(player, { ...ball, x: 650, y: 900, velocityX: -5, velocityY: 20 }).side).toBe(0);
  });

  it('reevaluates changed trajectories and player positions before a swing', () => {
    const player = createState(1).players[0]!;
    const diagonal = { ...ball, x: 650, y: 900, velocityX: -10, velocityY: 20 };
    expect(strokePose(player, diagonal).stroke).toBe('backhand');
    expect(strokePose(player, { ...diagonal, velocityX: 10 }).stroke).toBe('forehand');
    expect(strokePose({ ...player, x: 200 }, diagonal).stroke).toBe('forehand');
  });

  it('does not project backwards for a ball already just past the player', () => {
    const player = createState(1).players[0]!;
    expect(strokePose(player, { ...ball, x: 650, y: 1550, velocityX: 100, velocityY: 20 }).side).toBe(1);
  });

  it('holds the pose through contact and releases it after the swing', () => {
    const facing = new PlayerFacing();
    const state = createState(1);
    const player = state.players[0]!;
    state.training!.phase = 'incoming';
    state.tick = 10;
    state.ball = { ...ball, x: 300 };
    expect(facing.sample(player, state).stroke).toBe('backhand');
    player.swingTicks = 12;
    state.tick++;
    expect(facing.sample(player, state).stroke).toBe('backhand');
    player.swingTicks = 8;
    state.tick += 4;
    state.ball = { ...ball, velocityY: -24 };
    const snapshot = JSON.stringify(state);
    expect(facing.sample(player, state).stroke).toBe('backhand');
    expect(facing.sample(player, state).stroke).toBe('backhand');
    expect(JSON.stringify(state)).toBe(snapshot);
    player.swingTicks = 0;
    state.tick += 8;
    expect(facing.sample(player, state).stroke).toBe('ready');
  });

  it('ignores balls in the machine and resets the pose on a new timeline', () => {
    const facing = new PlayerFacing();
    const state = createState(1);
    state.tick = 5;
    state.ball = { ...ball };
    const player = state.players[0]!;
    expect(facing.sample(player, state).stroke).toBe('ready');
    state.training!.phase = 'incoming';
    state.tick++;
    expect(facing.sample(player, state).stroke).toBe('forehand');
    const reset = createState(1);
    expect(facing.sample(reset.players[0]!, reset).stroke).toBe('ready');
  });
});