import { expect, it } from 'vitest';
import { checksum, createState, HIT_INTERVAL_TICKS, MAX_CHARGE_TICKS, NEUTRAL_INPUT, SHOT_MOVEMENT_LOCK_TICKS, step, SWING_DURATION_TICKS, type GameState } from './simulation';
import { flatShot } from './flat-shot';
import { LocalSession } from '../session/local-session';

const HELD = { ...NEUTRAL_INPUT, hit: true };

function charge(ticks: number): GameState {
  let state = createState(2);
  for (let tick = 0; tick < ticks; tick++) state = step(state, [HELD]);
  return state;
}

it('charges without swinging, caps power and fires once on release', () => {
  const held = charge(180);
  expect(held.players[0]).toMatchObject({ chargeTicks: MAX_CHARGE_TICKS, swingTicks: 0, hitCooldownTicks: 0 });
  const released = step(held, []);
  expect(released.players[0]).toMatchObject({ chargeTicks: 0, shotChargeTicks: MAX_CHARGE_TICKS, swingTicks: SWING_DURATION_TICKS, hitCooldownTicks: HIT_INTERVAL_TICKS });
  let state = released;
  for (let tick = 0; tick < 100; tick++) {
    state = step(state, []);
    expect(state.players[0]!.swingTicks).toBeLessThan(SWING_DURATION_TICKS);
  }
});

it('does not queue a press or release during cooldown', () => {
  let state = step(charge(1), []);
  for (let tick = 0; tick < 60; tick++) state = step(state, [HELD]);
  expect(state.players[0]).toMatchObject({ chargeTicks: 0, swingTicks: 0, hitCooldownTicks: 0, hitHeld: true });
  state = step(state, []);
  expect(state.players[0]!.swingTicks).toBe(0);
  state = step(state, [HELD]);
  expect(step(state, []).players[0]!.swingTicks).toBe(SWING_DURATION_TICKS);
});

it('locks movement throughout charging, release and animation but not another player', () => {
  const initial = createState(2);
  let state = initial;
  const move = { moveX: 1, moveY: 1, hit: false } as const;
  for (let tick = 0; tick < 10; tick++) state = step(state, [{ ...move, hit: true }, move]);
  const player = initial.players[0]!;
  expect(state.players[0]).toMatchObject({ x: player.x, y: player.y });
  expect(state.players[1]!.x).toBe(initial.players[1]!.x + 90);
  state = step(state, [move]);
  for (let age = 1; age < SHOT_MOVEMENT_LOCK_TICKS; age++) {
    state = step(state, [move]);
    expect(state.players[0]).toMatchObject({ x: player.x, y: player.y });
  }
  state = step(state, [move]);
  expect(state.players[0]).toMatchObject({ x: player.x + 9, y: player.y + 9 });
});

it('increases FLAT speed with charge and freezes the chosen power after release', () => {
  const speeds: number[] = [];
  for (const ticks of [1, 15, 30, 60, 120]) {
    const state = step(charge(ticks), []);
    const player = state.players[0]!;
    const shot = flatShot(player, { x: 620, y: 1500, height: 90, velocityX: 0, velocityY: 24, velocityZ: 0 }, true);
    speeds.push(Math.abs(shot.velocityY));
    expect(step(state, [HELD]).players[0]!.shotChargeTicks).toBe(player.shotChargeTicks);
  }
  expect(speeds).toEqual([21, 44, 68, 68, 68]);
});

it('hits a nearby ball on the release tick, never while charging', () => {
  let state = createState(1);
  state.training!.phase = 'incoming';
  state.training!.launches = 1;
  state.ball = { x: 620, y: 1400, height: 100, velocityX: 0, velocityY: 24, velocityZ: 0 };
  state = step(state, [HELD]);
  expect(state.training!.returns).toBe(0);
  const released = step(state, []);
  expect(released.training!.returns).toBe(1);
  expect(released.ball.velocityY).toBe(-21);
});

it('cancels a pending charge on pause without interpreting cleared inputs as a release', () => {
  const session = new LocalSession(2);
  session.state = charge(30);
  const previous = JSON.stringify(session.state);
  session.cancelCharges();
  expect(session.state.players[0]!.chargeTicks).toBe(0);
  expect(step(session.state, []).players[0]!.swingTicks).toBe(0);
  expect(JSON.parse(previous).players[0].chargeTicks).toBe(30);
  session.reset(2);
  expect(session.state.players[0]).toMatchObject({ chargeTicks: 0, shotChargeTicks: 0 });
});

it('replays an in-progress charge and release after serialization', () => {
  const state = charge(20);
  const snapshot = JSON.stringify(state);
  let first = state;
  let restored = JSON.parse(snapshot) as GameState;
  for (let tick = 0; tick < 100; tick++) {
    const inputs = [tick < 20 ? HELD : NEUTRAL_INPUT];
    first = step(first, inputs);
    restored = step(restored, inputs);
    expect(checksum(restored)).toBe(checksum(first));
  }
  expect(JSON.stringify(state)).toBe(snapshot);
});