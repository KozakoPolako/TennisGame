import type { Graphics } from 'pixi.js';
import type { BallState } from '../core/simulation';
import { project } from './court-projection';

export function ballAppearance(ball: BallState, tick: number): { lift: number; shadowAlpha: number; shadowRadius: number; seam: number } {
  const height = Math.max(0, ball.height);
  const moving = ball.velocityX !== 0 || ball.velocityY !== 0 || ball.velocityZ !== 0;
  return {
    lift: Math.round(height / 10),
    shadowAlpha: Math.max(0.16, 0.45 - height / 1800),
    shadowRadius: Math.max(1, 3 - Math.floor(height / 180)),
    seam: moving ? Math.floor(tick / 4) % 2 : 0,
  };
}

export function drawBallSprite(graphics: Graphics, x: number, y: number, seam = 0): void {
  graphics.rect(x - 1, y - 2, 3, 5).rect(x - 2, y - 1, 5, 3).fill(0x6b7935);
  graphics.rect(x - 1, y - 1, 3, 3).rect(x - 1, y - 2, 2, 1).rect(x - 2, y - 1, 1, 2).fill(0xd6e866);
  graphics.rect(x - 1, y - 1, 1, 1).fill(0xf9f4c8);
  const side = seam === 0 ? 1 : -1;
  graphics.rect(x + side, y - 1, 1, 1).rect(x, y, 1, 1).rect(x + side, y + 1, 1, 1).fill(0xeef0b3);
}

export function drawBall(graphics: Graphics, ball: BallState, tick: number): void {
  const point = project(ball.x, ball.y);
  const appearance = ballAppearance(ball, tick);
  graphics.ellipse(point.x + 1, point.y + 1, appearance.shadowRadius, 1).fill({ color: 0x2d3428, alpha: appearance.shadowAlpha });
  drawBallSprite(graphics, point.x, point.y - appearance.lift - 2, appearance.seam);
}