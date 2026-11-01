import { describe, expect, it } from 'vitest';
import { BALL_MACHINE, checksum, COURT, createState, NEUTRAL_INPUT, RUNOFF, step, type GameState, type PlayerInput } from './simulation';

function advance(state: GameState, ticks: number, input: PlayerInput = NEUTRAL_INPUT): GameState {
  for (let tick = 0; tick < ticks; tick++) state = step(state, [input]);
  return state;
}

function incomingBall(): GameState {
  return advance(createState(1), BALL_MACHINE.reloadTicks);
}

describe('solo ball machine', () => {
  it('creates one centered human and a loaded machine without a second input slot', () => {
    const state = createState(1);
    expect(state.players).toEqual([{ id: 0, x: 500, y: 1500, swingTicks: 0, hitCooldownTicks: 0, hitHeld: false, chargeTicks: 0, shotChargeTicks: 0 }]);
    expect(state.training?.phase).toBe('ready');
    expect(state.ball).toMatchObject({ x: BALL_MACHINE.x, y: BALL_MACHINE.y, velocityY: 0 });
    expect(step(state, [NEUTRAL_INPUT, { moveX: 1, moveY: 1, hit: true }]).players).toEqual(state.players);
  });

  it('launches only after the countdown and clears the net', () => {
    const waiting = advance(createState(1), BALL_MACHINE.reloadTicks - 1);
    expect(waiting.training).toMatchObject({ phase: 'ready', launches: 0, countdown: 1 });
    const launched = step(waiting, []);
    expect(launched.training).toMatchObject({ phase: 'incoming', launches: 1 });
    const net = advance(launched, 30);
    expect(net.ball.y).toBe(COURT.length / 2);
    expect(net.ball.height).toBeGreaterThan(BALL_MACHINE.netHeight);
  });

  it('bounces on the receiving court and reloads a missed ball', () => {
    let state = incomingBall();
    while (state.training?.bounces === 0 && state.training.phase === 'incoming') state = step(state, []);
    expect(state.ball.y).toBeGreaterThan(COURT.length / 2);
    expect(state.ball.y).toBeLessThan(COURT.length);
    expect(state.ball.height).toBe(0);
    expect(state.ball.velocityZ).toBeGreaterThan(0);
    state = advance(state, 40);
    expect(state.training).toMatchObject({ phase: 'ready', returns: 0, launches: 1 });
    expect(state.ball.y).toBe(BALL_MACHINE.y);
  });

  it('allows a nearby swing to return a ball exactly once', () => {
    let state = advance(incomingBall(), 45);
    state.players[0]!.x = 380;
    for (let tick = 0; tick < 80 && state.training?.returns === 0; tick++) {
      state = step(state, [{ ...NEUTRAL_INPUT, hit: tick < 3 }]);
    }
    expect(state.training).toMatchObject({ phase: 'returned', returns: 1, bounces: 0 });
    expect(state.ball.velocityY).toBeLessThan(0);
    expect(advance(state, 10, { ...NEUTRAL_INPUT, hit: true }).training?.returns).toBe(1);
  });

  it.each(['distant', 'too high', 'no swing'] as const)('does not return a ball when %s', (reason) => {
    const state = incomingBall();
    state.ball = { x: reason === 'distant' ? 900 : 620, y: 1450, height: reason === 'too high' ? 300 : 100, velocityX: 0, velocityY: 24, velocityZ: 0 };
    state.players[0]!.swingTicks = reason === 'no swing' ? 0 : 8;
    const next = step(state, [{ ...NEUTRAL_INPUT, hit: reason !== 'no swing' }]);
    expect(next.training?.returns).toBe(0);
    expect(next.ball.velocityY).toBeGreaterThan(0);
  });

  it.each(['net', 'boundary', 'second bounce', 'timeout'] as const)('reloads after %s', (reason) => {
    const state = incomingBall();
    if (!state.training) throw new Error('Missing training state');
    if (reason === 'net') state.ball = { ...state.ball, y: 890, height: 50, velocityZ: 0 };
    if (reason === 'boundary') state.ball = { ...state.ball, x: COURT.width + RUNOFF.side, velocityX: 3 };
    if (reason === 'second bounce') {
      state.ball = { ...state.ball, height: 1, velocityZ: -2 };
      state.training.bounces = 1;
    }
    if (reason === 'timeout') state.training.flightTicks = BALL_MACHINE.ballLifetimeTicks - 1;
    expect(step(state, []).training).toMatchObject({ phase: 'ready', countdown: BALL_MACHINE.reloadTicks });
  });

  it('cycles center, left and right from the same stationary launch point', () => {
    let state = createState(1);
    const directions: number[] = [];
    for (let tick = 0; tick < 800 && directions.length < 4; tick++) {
      const next = step(state, []);
      if (next.training?.launches !== state.training?.launches) {
        expect(next.ball).toMatchObject({ x: BALL_MACHINE.x, y: BALL_MACHINE.y });
        directions.push(next.ball.velocityX);
      }
      state = next;
    }
    expect(directions).toEqual([0, -3, 3, 0]);
  });

  it('keeps missed balls across subsequent launches and stops only when the basket is empty', () => {
    let state = advance(createState(1), 600);
    expect(state.looseBalls.length).toBeGreaterThanOrEqual(3);
    expect(state.ballKids).toHaveLength(0);
    const firstBall = { ...state.looseBalls[0] };
    state = advance(state, 300);
    expect(state.looseBalls[0]).toEqual(firstBall);
    if (!state.training) throw new Error('Missing training');
    state.training.phase = 'ready';
    state.training.launches = BALL_MACHINE.capacity;
    const count = state.looseBalls.length;
    state = advance(state, 300);
    expect(state.training?.launches).toBe(BALL_MACHINE.capacity);
    expect(state.looseBalls).toHaveLength(count);
  });

  it('preserves a mesh-hit ball on the original side and records a replay-safe net impact', () => {
    const state = incomingBall();
    state.ball = { ...state.ball, y: 890, height: 50, velocityZ: 0 };
    const next = step(state, []);
    expect(next.netImpact).toMatchObject({ tick: next.tick, kind: 'mesh' });
    expect(next.looseBalls).toHaveLength(1);
    expect(next.looseBalls[0]?.y).toBeLessThan(900);
    expect(next.looseBalls[0]?.height).toBeGreaterThan(0);
    expect(advance(next, 90).looseBalls[0]?.height).toBe(0);
    expect(state.netImpact).toBeNull();
  });

  it('continues machine feeds touching the tape instead of calling a service let', () => {
    const state = incomingBall();
    state.ball = { ...state.ball, y: 890, height: 105, velocityZ: 0 };
    const next = step(state, []);
    expect(next.netImpact?.kind).toBe('tape');
    expect(next.training?.phase).toBe('incoming');
    expect(next.ball.y).toBeGreaterThan(900);
    expect(next.looseBalls).toHaveLength(0);
  });

  it('restores and replays an active flight without mutating the old state', () => {
    const state = advance(incomingBall(), 50);
    const snapshot = JSON.stringify(state);
    const restored = JSON.parse(snapshot) as GameState;
    const input = { ...NEUTRAL_INPUT, hit: true };
    expect(checksum(advance(state, 1000, input))).toBe(checksum(advance(restored, 1000, input)));
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('ends a feed on a body collision instead of returning through the player', () => {
    const state = incomingBall();
    state.players[0]!.swingTicks = 8;
    state.ball = { x: 500, y: 1450, height: 100, velocityX: 0, velocityY: 100, velocityZ: 0 };
    const original = JSON.stringify(state);
    const next = step(state, []);
    expect(next.training).toMatchObject({ phase: 'ready', bodyHits: 1, returns: 0 });
    expect(next.looseBalls).toHaveLength(1);
    expect(next.looseBalls[0]!.y).toBeLessThan(1500);
    expect(next.looseBalls[0]!.velocityY).toBe(-25);
    expect(JSON.stringify(state)).toBe(original);
    expect(checksum(step(JSON.parse(original) as GameState, []))).toBe(checksum(next));
    expect(advance(next, 10).training?.bodyHits).toBe(1);
    expect(createState(1).training?.bodyHits).toBe(0);
  });

  it('serializes and replays a successful FLAT flight through its first bounce', () => {
    let state = incomingBall();
    state.players[0]!.swingTicks = 8;
    state.ball = { x: 620, y: 1500, height: 90, velocityX: 0, velocityY: 24, velocityZ: 0 };
    state = step(state, []);
    expect(state.training?.returns).toBe(1);
    expect(state.ball.velocityY).toBe(-20);
    const snapshot = JSON.stringify(state);
    let replay = JSON.parse(snapshot) as GameState;
    for (let tick = 0; tick < 40; tick++) {
      state = step(state, []);
      replay = step(replay, []);
      expect(checksum(state)).toBe(checksum(replay));
    }
    expect(state.netImpact).toBeNull();
    expect(state.training?.returns).toBe(1);
  });

  it.each([2, 4] as const)('preserves the static ball demo for %i players', (count) => {
    const state = createState(count);
    const next = advance(state, 300, { ...NEUTRAL_INPUT, hit: true });
    expect(next.training).toBeNull();
    expect(next.ball).toEqual(state.ball);
  });
});