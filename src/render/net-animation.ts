import type { GameState } from '../core/simulation';

export function netDisplacement(tick: number, impact: GameState['netImpact'], distance: number): number {
  if (!impact) return 0;
  const age = tick - impact.tick;
  const duration = impact.kind === 'mesh' ? 18 : 12;
  if (age < 0 || age >= duration) return 0;
  const wave = [1, 0, -1, 0][Math.floor(age / 2) % 4] ?? 0;
  return Math.round(wave * (1 - age / duration) * Math.max(0, 1 - Math.abs(distance) / 260)) || 0;
}