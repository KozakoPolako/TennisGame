import { COURT } from '../core/court';

export const VIEW = { width: 320, height: 280 } as const;
export const COURT_ZOOM = 1.2;

function compressRunoff(value: number, boundary: number, scale: number): number {
  if (value < 0) return value * scale;
  if (value > boundary) return boundary + (value - boundary) * scale;
  return value;
}

export function project(x: number, y: number, height = 0): { x: number; y: number } {
  const courtX = compressRunoff(x, COURT.width, 0.65);
  const depth = compressRunoff(y, COURT.length, 0.85) / COURT.length;
  const perspective = 112 / (140 - 28 * depth);
  return {
    x: Math.round(VIEW.width / 2 + (courtX / COURT.width - 0.5) * 140 * COURT_ZOOM * perspective),
    y: Math.round(100 + depth * 96 * COURT_ZOOM * perspective) - Math.round(height / 10),
  };
}