import { expect, it } from 'vitest';
import { BALL_MACHINE, collideMachine, DEFAULT_MACHINE_SETTINGS, MACHINE_SEED, machineFeed, type MachineSettings } from './ball-machine';
import { advanceFlyingBall } from './ball-motion';
import { checksum, createState, step, type GameState } from './simulation';

it('preserves the original standard feeds and does not consume randomness', () => {
  for (let launch = 0; launch < 9; launch++) {
    const feed = machineFeed(DEFAULT_MACHINE_SETTINGS, launch, MACHINE_SEED);
    expect(feed.seed).toBe(MACHINE_SEED);
    expect(feed.ball).toEqual({ x: 500, y: 180, height: 90, velocityX: [0, -3, 3][launch % 3], velocityY: 24, velocityZ: 22 });
  }
});

it.each<MachineSettings>([
  { power: 'random', direction: 'standard' },
  { power: 'standard', direction: 'random' },
  { power: 'random', direction: 'random' },
])('varies only selected feed parameters: $power / $direction', (settings) => {
  let seed = MACHINE_SEED;
  const speeds = new Set<number>();
  const directions = new Set<number>();
  for (let launch = 0; launch < 100; launch++) {
    const feed = machineFeed(settings, launch, seed);
    expect(machineFeed(settings, launch, seed)).toEqual(feed);
    seed = feed.seed;
    speeds.add(feed.ball.velocityY);
    directions.add(feed.ball.velocityX);
    expect(feed.ball.velocityY).toBeGreaterThanOrEqual(21);
    expect(feed.ball.velocityY).toBeLessThanOrEqual(27);
    expect(Math.abs(feed.ball.velocityX)).toBeLessThanOrEqual(4);
    if (settings.power === 'standard') expect(feed.ball.velocityY).toBe(24);
    if (settings.direction === 'standard') expect(feed.ball.velocityX).toBe([0, -3, 3][launch % 3]);
    let ball = feed.ball;
    do {
      const next = advanceFlyingBall(ball, true);
      expect(next.contact).toBeNull();
      ball = next.ball;
    } while (ball.height > 0);
    expect(ball.y).toBeGreaterThan(900);
    expect(ball.y).toBeLessThan(1800);
    expect(ball.x).toBeGreaterThan(0);
    expect(ball.x).toBeLessThan(1000);
  }
  expect(speeds.size).toBe(settings.power === 'random' ? 7 : 1);
  expect(directions.size).toBe(settings.direction === 'random' ? 9 : 3);
});

it('replays random training across serialization and resets to the same seed', () => {
  const settings: MachineSettings = { power: 'random', direction: 'random' };
  let state = createState(1, settings);
  for (let i = 0; i < 400; i++) state = step(state, []);
  const snapshot = JSON.stringify(state);
  let replay = JSON.parse(snapshot) as GameState;
  const previous = state;
  for (let i = 0; i < 800; i++) {
    state = step(state, []);
    replay = step(replay, []);
    expect(checksum(state)).toBe(checksum(replay));
  }
  expect(JSON.stringify(previous)).toBe(snapshot);
  expect(createState(1, settings).training!.randomSeed).toBe(MACHINE_SEED);
  settings.power = 'standard';
  expect(state.training!.machineSettings.power).toBe('random');
});

const ball = { x: 500, y: 300, height: 100, velocityX: 0, velocityY: -240, velocityZ: 0 };

it('detects a fast ball passing through the machine and reflects it outside the body', () => {
  const hit = collideMachine(ball, { ...ball, y: 60 });
  expect(hit!.velocityY).toBe(120);
  expect(hit!.y).toBeGreaterThan(BALL_MACHINE.y + BALL_MACHINE.halfDepth);
  expect(collideMachine(hit!, advanceFlyingBall(hit!).ball)).toBeNull();
});

it('handles side and basket impacts but lets high and wide balls pass', () => {
  const side = { ...ball, x: 350, y: 180, velocityX: 200, velocityY: 0 };
  expect(collideMachine(side, { ...side, x: 550 })!.velocityX).toBe(-100);
  const top = { ...ball, y: 180, height: 300, velocityY: 0, velocityZ: -120 };
  expect(collideMachine(top, { ...top, height: 180 })!.velocityZ).toBe(60);
  expect(collideMachine({ ...ball, height: 250 }, { ...ball, height: 250, y: 60 })).toBeNull();
  expect(collideMachine({ ...ball, x: 570 }, { ...ball, x: 570, y: 60 })).toBeNull();
});

it('lets feeds exit their own barrel without collision', () => {
  let current = machineFeed(DEFAULT_MACHINE_SETTINGS, 0, MACHINE_SEED).ball;
  for (let tick = 0; tick < 10; tick++) {
    const next = advanceFlyingBall(current).ball;
    expect(collideMachine(current, next)).toBeNull();
    current = next;
  }
});

it('retires an active machine hit, keeps its deflection and also collides loose balls', () => {
  const state = createState(1);
  Object.assign(state.training!, { phase: 'returned', launches: 1 });
  state.ball = ball;
  const next = step(state, []);
  expect(next.training).toMatchObject({ phase: 'ready', machineHits: 1 });
  expect(next.looseBalls[0]!.velocityY).toBe(120);
  expect(next.looseBalls[0]!.y).toBeGreaterThan(180);
  const rolling = { ...ball, height: 0, velocityZ: 0, id: 2 };
  state.training!.phase = 'ready';
  state.looseBalls = [rolling];
  expect(step(state, []).looseBalls[0]!.velocityY).toBeGreaterThan(0);
  const multiplayer = createState(2);
  multiplayer.looseBalls = [rolling];
  expect(step(multiplayer, []).looseBalls[0]!.velocityY).toBeLessThan(0);
});