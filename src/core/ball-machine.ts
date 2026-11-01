import { NET } from './court';
import type { BallState } from './simulation';

export const BALL_MACHINE = {
  x: 500, y: 180, height: 90, reloadTicks: 90, ballLifetimeTicks: 240,
  netHeight: NET.height, capacity: 100, halfWidth: 60, halfDepth: 36, bodyHeight: 230,
} as const;

export interface MachineSettings {
  power: 'standard' | 'random';
  direction: 'standard' | 'random';
}

export const DEFAULT_MACHINE_SETTINGS: Readonly<MachineSettings> = { power: 'standard', direction: 'standard' };
export const MACHINE_SEED = 0x51a7cafe;

export function machineFeed(settings: MachineSettings, launches: number, seed: number): { ball: BallState; seed: number } {
  const random = (range: number): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor(seed / 4294967296 * range);
  };
  const speed = settings.power === 'random' ? 21 + random(7) : 24;
  const direction = settings.direction === 'random' ? random(9) - 4 : [0, -3, 3][launches % 3] ?? 0;
  return {
    ball: { x: BALL_MACHINE.x, y: BALL_MACHINE.y, height: BALL_MACHINE.height,
      velocityX: direction, velocityY: speed, velocityZ: 22 },
    seed,
  };
}

export function collideMachine(previous: BallState, next: BallState): BallState | null {
  const width = BALL_MACHINE.halfWidth + NET.ballRadius;
  const depth = BALL_MACHINE.halfDepth + NET.ballRadius;
  const top = BALL_MACHINE.bodyHeight + NET.ballRadius;
  const inside = (ball: BallState): boolean => Math.abs(ball.x - BALL_MACHINE.x) <= width
    && Math.abs(ball.y - BALL_MACHINE.y) <= depth && ball.height <= top && ball.height >= 0;
  // A feed starts inside the barrel and must be allowed to leave it.
  if (inside(previous)) return null;
  const samples = Math.max(1, Math.ceil(Math.max(Math.abs(next.x - previous.x), Math.abs(next.y - previous.y), Math.abs(next.height - previous.height)) / 2));
  for (let i = 1; i <= samples; i++) {
    const at = { ...next,
      x: previous.x + Math.trunc((next.x - previous.x) * i / samples),
      y: previous.y + Math.trunc((next.y - previous.y) * i / samples),
      height: previous.height + Math.trunc((next.height - previous.height) * i / samples) };
    if (!inside(at)) continue;
    const before = {
      x: previous.x + Math.trunc((next.x - previous.x) * (i - 1) / samples),
      y: previous.y + Math.trunc((next.y - previous.y) * (i - 1) / samples),
      height: previous.height + Math.trunc((next.height - previous.height) * (i - 1) / samples),
    };
    if (before.height > top) {
      at.height = top + 1;
      at.velocityZ = Math.max(1, -Math.trunc(next.velocityZ / 2));
    } else if (Math.abs(before.x - BALL_MACHINE.x) > width) {
      at.x = BALL_MACHINE.x + Math.sign(before.x - BALL_MACHINE.x) * (width + 1);
      at.velocityX = -Math.trunc(next.velocityX / 2) || 0;
    } else {
      at.y = BALL_MACHINE.y + Math.sign(before.y - BALL_MACHINE.y) * (depth + 1);
      at.velocityY = -Math.trunc(next.velocityY / 2) || 0;
    }
    return at;
  }
  return null;
}