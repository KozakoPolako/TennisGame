import { COURT, NET, netHeightAt } from '../core/court';
import type { GameState } from '../core/simulation';
import { project } from './court-projection';
import { netDisplacement } from './net-animation';

export function netProfile(state: GameState): { x: number; y: number; worldX: number }[] {
  const singles = state.players.length !== 4;
  const supportLeft = singles ? NET.singlesLeft : NET.left;
  const supportRight = singles ? NET.singlesRight : NET.right;
  const samples = new Set(Array.from({ length: 29 }, (_, i) => NET.left + (NET.right - NET.left) * i / 28));
  samples.add(supportLeft).add(supportRight).add(COURT.width / 2);
  return [...samples].sort((a, b) => a - b).map((worldX) => {
    const top = project(worldX, NET.y, netHeightAt(worldX, singles));
    const freeSpan = Math.max(0, Math.min(1, (worldX - supportLeft) / 80, (supportRight - worldX) / 80));
    const offset = Math.round(netDisplacement(state.tick, state.netImpact, worldX - (state.netImpact?.x ?? 0)) * freeSpan);
    return { worldX, x: top.x, y: top.y + offset };
  });
}