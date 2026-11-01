import { NET } from './court';
import { canHitFlat } from './flat-shot';
import type { BallState, PlayerState } from './simulation';

export const PLAYER_BODY = { halfWidth: 30, halfDepth: 28, height: 190 } as const;

export interface PlayerContact {
  kind: 'body' | 'racket';
  ball: BallState;
  player: PlayerState;
}

export function findPlayerContact(previousBall: BallState, ball: BallState, previousPlayer: PlayerState,
  player: PlayerState, allowHit: boolean): PlayerContact | null {
  const dx = ball.x - previousBall.x - (player.x - previousPlayer.x);
  const dy = ball.y - previousBall.y - (player.y - previousPlayer.y);
  const dz = ball.height - previousBall.height;
  const samples = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / 4));
  for (let sample = 0; sample <= samples; sample++) {
    const interpolate = (from: number, to: number): number => from + Math.trunc((to - from) * sample / samples);
    const contactBall = { ...ball, x: interpolate(previousBall.x, ball.x), y: interpolate(previousBall.y, ball.y),
      height: interpolate(previousBall.height, ball.height) };
    const contactPlayer = { ...player, x: interpolate(previousPlayer.x, player.x), y: interpolate(previousPlayer.y, player.y) };
    const body = Math.abs(contactBall.x - contactPlayer.x) <= PLAYER_BODY.halfWidth + NET.ballRadius
      && Math.abs(contactBall.y - contactPlayer.y) <= PLAYER_BODY.halfDepth + NET.ballRadius
      && contactBall.height >= 0 && contactBall.height <= PLAYER_BODY.height + NET.ballRadius;
    if (body) return { kind: 'body', ball: contactBall, player: contactPlayer };
    if (allowHit && canHitFlat(contactPlayer, contactBall)) return { kind: 'racket', ball: contactBall, player: contactPlayer };
  }
  return null;
}

export function deflectBodyBall(contact: PlayerContact): BallState {
  const { ball, player } = contact;
  const sideHit = Math.abs(ball.x - player.x) * PLAYER_BODY.halfDepth > Math.abs(ball.y - player.y) * PLAYER_BODY.halfWidth;
  return {
    ...ball,
    velocityX: (sideHit ? -Math.trunc(ball.velocityX / 4) : Math.trunc(ball.velocityX / 4)) || 0,
    velocityY: (sideHit ? Math.trunc(ball.velocityY / 4) : -Math.trunc(ball.velocityY / 4)) || 0,
    velocityZ: Math.min(0, ball.velocityZ),
  };
}