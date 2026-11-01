import type { RacketAngle } from './racket-sprite';
import { HIT_INTERVAL_TICKS, SHOT_MOVEMENT_LOCK_TICKS, type PlayerState } from '../core/simulation';

export const VISUAL_SWING_TICKS = SHOT_MOVEMENT_LOCK_TICKS;

export function visualSwingTicks(player: PlayerState): number {
  if (player.chargeTicks > 0) return 12;
  if (player.hitCooldownTicks <= 0) return player.swingTicks;
  const age = HIT_INTERVAL_TICKS - player.hitCooldownTicks;
  if (age < 8) return Math.max(5, 7 - Math.floor(age / 3));
  if (age < 18) return 4;
  if (age < 22) return 2;
  return age < VISUAL_SWING_TICKS ? 1 : 0;
}

export interface SwingFrame {
  phase: 'ready' | 'prepare' | 'accelerate' | 'contact' | 'follow' | 'recover';
  gripX: number;
  gripY: number;
  angle: RacketAngle;
  shoulder: number;
  trail: boolean;
}

export function swingFrame(ticks: number): SwingFrame {
  if (ticks <= 0) return { phase: 'ready', gripX: 0, gripY: -6, angle: 'ready', shoulder: 0, trail: false };
  if (ticks >= 10) return { phase: 'prepare', gripX: 7, gripY: -9, angle: 'upright', shoulder: -1, trail: false };
  if (ticks >= 8) return { phase: 'accelerate', gripX: 6, gripY: -10, angle: 'diagonal', shoulder: 0, trail: true };
  if (ticks >= 5) return { phase: 'contact', gripX: 5, gripY: -11, angle: 'flat', shoulder: 1, trail: true };
  if (ticks >= 3) return { phase: 'follow', gripX: -3, gripY: -12, angle: 'diagonal', shoulder: 1, trail: false };
  return { phase: 'recover', gripX: ticks === 1 ? 0 : -1, gripY: ticks === 1 ? -6 : -8, angle: ticks === 1 ? 'ready' : 'upright', shoulder: 0, trail: false };
}