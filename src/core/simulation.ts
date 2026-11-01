import { advanceFlyingBall, settleBall } from './ball-motion';
import { COURT, RUNOFF } from './court';
import { advanceBallKids, createBallKids, type BallKid } from './court-staff';
import { flatShot } from './flat-shot';
import { deflectBodyBall, findPlayerContact } from './player-contact';
import { BALL_MACHINE, collideMachine, DEFAULT_MACHINE_SETTINGS, MACHINE_SEED, machineFeed, type MachineSettings } from './ball-machine';

export { BALL_MACHINE } from './ball-machine';

export { COURT, RUNOFF } from './court';
export const TICK_RATE = 60;
export const HIT_INTERVAL_TICKS = 30;
export const SWING_DURATION_TICKS = 12;
export const MAX_CHARGE_TICKS = 30;
export const SHOT_MOVEMENT_LOCK_TICKS = 26;
export type Axis = -1 | 0 | 1;
export type PlayerCount = 1 | 2 | 4;

export interface PlayerInput {
  moveX: Axis;
  moveY: Axis;
  hit: boolean;
}

export interface PlayerState {
  id: number;
  x: number;
  y: number;
  swingTicks: number;
  hitCooldownTicks: number;
  hitHeld: boolean;
  chargeTicks: number;
  shotChargeTicks: number;
}

export interface BallState {
  x: number;
  y: number;
  height: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
}

export interface TrainingState {
  phase: 'ready' | 'incoming' | 'returned';
  countdown: number;
  flightTicks: number;
  bounces: number;
  launches: number;
  returns: number;
  bodyHits: number;
  machineSettings: MachineSettings;
  randomSeed: number;
  machineHits: number;
}

export interface GameState {
  tick: number;
  players: PlayerState[];
  ball: BallState;
  training: TrainingState | null;
  looseBalls: LooseBall[];
  ballKids: BallKid[];
  netImpact: { tick: number; x: number; kind: 'mesh' | 'tape' } | null;
}

export interface LooseBall extends BallState { id: number }

export const NEUTRAL_INPUT: Readonly<PlayerInput> = { moveX: 0, moveY: 0, hit: false };

export function createState(count: PlayerCount, machineSettings: MachineSettings = DEFAULT_MACHINE_SETTINGS): GameState {
  return {
    tick: 0,
    players: Array.from({ length: count }, (_, id) => ({
      id,
      x: count !== 4 ? 500 : id < 2 ? 300 : 700,
      y: id % 2 === 0 ? 1500 : 300,
      swingTicks: 0,
      hitCooldownTicks: 0,
      hitHeld: false,
      chargeTicks: 0,
      shotChargeTicks: 0,
    })),
    ball: count === 1 ? loadedBall() : { x: 500, y: 900, height: 50, velocityX: 0, velocityY: 0, velocityZ: 0 },
    training: count === 1 ? {
      phase: 'ready', countdown: BALL_MACHINE.reloadTicks, flightTicks: 0, bounces: 0, launches: 0, returns: 0, bodyHits: 0,
      machineSettings: { ...machineSettings }, randomSeed: MACHINE_SEED, machineHits: 0,
    } : null,
    looseBalls: [],
    ballKids: count === 1 ? [] : createBallKids(),
    netImpact: null,
  };
}

export function step(state: GameState, inputs: readonly PlayerInput[]): GameState {
  const next: GameState = {
    tick: state.tick + 1,
    players: state.players.map((player, index) => {
      const input = inputs[index] ?? NEUTRAL_INPUT;
      const speed = input.moveX !== 0 && input.moveY !== 0 ? 9 : 13;
      const nearSide = player.id % 2 === 0;
      const cooldown = Math.max(0, player.hitCooldownTicks - 1);
      const canCharge = cooldown === 0 && player.swingTicks === 0;
      const startCharge = input.hit && !player.hitHeld && canCharge;
      const chargeTicks = input.hit && (startCharge || player.chargeTicks > 0)
        ? Math.min(MAX_CHARGE_TICKS, player.chargeTicks + 1) : 0;
      const startSwing = !input.hit && player.hitHeld && player.chargeTicks > 0 && canCharge;
      const movementLocked = chargeTicks > 0 || startSwing || player.swingTicks > 0
        || cooldown > HIT_INTERVAL_TICKS - SHOT_MOVEMENT_LOCK_TICKS;
      const movementSpeed = movementLocked ? 0 : speed;
      return {
        ...player,
        x: clamp(player.x + input.moveX * movementSpeed, -RUNOFF.side, COURT.width + RUNOFF.side),
        y: clamp(player.y + input.moveY * movementSpeed, nearSide ? 970 : -RUNOFF.baseline, nearSide ? COURT.length + RUNOFF.baseline : 830),
        swingTicks: startSwing ? SWING_DURATION_TICKS : Math.max(0, player.swingTicks - 1),
        hitCooldownTicks: startSwing ? HIT_INTERVAL_TICKS : cooldown,
        hitHeld: input.hit,
        chargeTicks,
        shotChargeTicks: startSwing ? player.chargeTicks : player.shotChargeTicks,
      };
    }),
    ball: { ...state.ball },
    training: state.training ? { ...state.training, machineSettings: { ...state.training.machineSettings } } : null,
    looseBalls: state.looseBalls.map((ball) => {
      const settled = settleBall(ball, state.players.length !== 4);
      return { ...(state.training ? collideMachine(ball, settled) ?? settled : settled), id: ball.id };
    }),
    ballKids: state.ballKids.map((kid) => ({ ...kid })),
    netImpact: state.netImpact ? { ...state.netImpact } : null,
  };
  if (next.training) advanceTraining(next, state.players[0]);
  else next.looseBalls = advanceBallKids(next.ballKids, next.looseBalls, true);
  return next;
}

function loadedBall(): BallState {
  return { x: BALL_MACHINE.x, y: BALL_MACHINE.y, height: BALL_MACHINE.height, velocityX: 0, velocityY: 0, velocityZ: 0 };
}

function advanceTraining(state: GameState, previousPlayer: PlayerState | undefined): void {
  const training = state.training;
  if (!training) return;
  if (training.phase === 'ready') {
    if (training.launches >= BALL_MACHINE.capacity) return;
    training.countdown--;
    if (training.countdown > 0) return;
    const feed = machineFeed(training.machineSettings, training.launches, training.randomSeed);
    state.ball = feed.ball;
    training.randomSeed = feed.seed;
    training.phase = 'incoming';
    training.launches++;
    return;
  }

  const previousBall = state.ball;
  const { ball, contact } = advanceFlyingBall(previousBall, state.players.length !== 4);
  state.ball = ball;
  training.flightTicks++;
  if (contact) {
    state.netImpact = { tick: state.tick, ...contact };
    if (contact.kind === 'mesh') { reloadMachine(state); return; }
  }
  const machineContact = collideMachine(previousBall, ball);
  if (machineContact) {
    state.ball = machineContact;
    training.machineHits++;
    reloadMachine(state);
    return;
  }
  const player = state.players[0];
  const playerContact = player && previousPlayer
    ? findPlayerContact(previousBall, ball, previousPlayer, player, training.phase === 'incoming') : null;
  if (playerContact?.kind === 'body') {
    state.ball = deflectBodyBall(playerContact);
    training.bodyHits++;
    reloadMachine(state);
    return;
  }
  if (playerContact?.kind === 'racket') {
    state.ball = flatShot(playerContact.player, playerContact.ball, state.players.length !== 4);
    training.phase = 'returned';
    training.bounces = 0;
    training.returns++;
    return;
  }
  const outside = ball.x < -RUNOFF.side || ball.x > COURT.width + RUNOFF.side
    || ball.y < -RUNOFF.baseline || ball.y > COURT.length + RUNOFF.baseline;
  if (outside || training.flightTicks >= BALL_MACHINE.ballLifetimeTicks) {
    reloadMachine(state);
    return;
  }
  if (ball.height <= 0) {
    training.bounces++;
    if (training.bounces >= 2) {
      reloadMachine(state);
      return;
    }
    ball.height = 0;
    ball.velocityZ = Math.floor(-ball.velocityZ * 3 / 4);
  }

}

function reloadMachine(state: GameState): void {
  if (!state.training) return;
  state.looseBalls.push({ ...state.ball, height: Math.max(0, state.ball.height), id: state.training.launches });
  state.ball = loadedBall();
  state.training.phase = 'ready';
  state.training.countdown = BALL_MACHINE.reloadTicks;
  state.training.flightTicks = 0;
  state.training.bounces = 0;
}

export function checksum(state: GameState): string {
  const serialized = JSON.stringify(state);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index++) {
    hash = Math.imul(hash ^ serialized.charCodeAt(index), 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}