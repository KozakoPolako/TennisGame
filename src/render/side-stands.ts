import type { Graphics } from 'pixi.js';
import { COURT, RUNOFF } from '../core/court';
import { project, VIEW } from './court-projection';

export type StandSide = -1 | 1;

export function sideStandPoint(side: StandSide, tier: number, depth: number) {
  const worldY = -RUNOFF.baseline - 100 + depth * (COURT.length + 2 * (RUNOFF.baseline + 100));
  const edge = project(-RUNOFF.side - 100, worldY);
  const perspectiveDepth = worldY < 0 ? worldY * 0.85 : worldY > COURT.length ? COURT.length + (worldY - COURT.length) * 0.85 : worldY;
  const scale = 112 / (140 - 28 * perspectiveDepth / COURT.length);
  const leftX = Math.round(edge.x - (12 + tier * 10) * scale);
  return { x: side === -1 ? leftX : VIEW.width - leftX, y: Math.round(edge.y - 8 - tier * 2 * scale), scale };
}

export function sideStandTiers(width: number): number {
  return Math.ceil(((width - VIEW.width) / 2 + 72) / 7);
}

export function drawSideStands(graphics: Graphics, width: number): void {
  const tiers = sideStandTiers(width);
  for (const side of [-1, 1] as const) {
    for (let tier = tiers; tier >= 0; tier--) {
      const a = sideStandPoint(side, tier, 0);
      const b = sideStandPoint(side, tier, 1);
      const c = sideStandPoint(side, tier + 1, 1);
      const d = sideStandPoint(side, tier + 1, 0);
      graphics.poly([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y]).fill(tier % 2 ? 0xb8b29c : 0xc9c0a6);
      graphics.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0xe9dfc8 });
      graphics.moveTo(a.x, a.y + 2).lineTo(b.x, b.y + 2).stroke({ width: 1, color: 0x8a9383 });
    }
    for (const depth of [0.25, 0.55, 0.85]) {
      for (let tier = 0; tier < tiers; tier++) {
        const a = sideStandPoint(side, tier, depth - 0.018);
        const b = sideStandPoint(side, tier + 1, depth - 0.018);
        const c = sideStandPoint(side, tier + 1, depth + 0.018);
        const d = sideStandPoint(side, tier, depth + 0.018);
        graphics.poly([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y]).fill(0xa5a58f);
        graphics.moveTo(a.x, a.y).lineTo(d.x, d.y).stroke({ width: 1, color: 0xf2e6ce });
      }
      const inner = sideStandPoint(side, 0, depth);
      const outer = sideStandPoint(side, tiers, depth);
      graphics.moveTo(inner.x, inner.y - 4).lineTo(outer.x, outer.y - 4).stroke({ width: 1, color: 0x587163 });
      for (let tier = 0; tier < tiers; tier += 2) {
        const p = sideStandPoint(side, tier, depth);
        graphics.rect(p.x, p.y - 4, 1, 5).fill(0x698071);
      }
    }
    for (const tier of [0, 6, 12, 18]) {
      if (tier >= tiers) continue;
      const a = sideStandPoint(side, tier, 0);
      const b = sideStandPoint(side, tier, 1);
      graphics.moveTo(a.x, a.y - 4).lineTo(b.x, b.y - 4).stroke({ width: 1, color: 0x668071 });
      for (let depth = 0; depth <= 1; depth += 0.1) {
        const p = sideStandPoint(side, tier, depth);
        graphics.rect(p.x, p.y - 4, 1, 5).fill(0x718878);
      }
    }
  }
}