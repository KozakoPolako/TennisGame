import { COURT, NET, RUNOFF, netHeightAt } from './court';
import type { BallState } from './simulation';

export interface NetContact {
  x: number;
  kind: 'mesh' | 'tape';
}

export function advanceFlyingBall(previous: BallState, singlesSticks = false): { ball: BallState; contact: NetContact | null } {
  const ball = {
    ...previous,
    x: previous.x + previous.velocityX,
    y: previous.y + previous.velocityY,
    height: previous.height + previous.velocityZ - 1,
    velocityZ: previous.velocityZ - 1,
  };
  const direction = Math.sign(previous.velocityY);
  const crossed = direction !== 0 && (previous.y - NET.y) * direction < 0 && (ball.y - NET.y) * direction >= 0;
  if (!crossed) return { ball, contact: null };
  const distance = Math.abs(NET.y - previous.y);
  const speed = Math.abs(previous.velocityY);
  const x = previous.x + Math.trunc((ball.x - previous.x) * distance / speed);
  const height = previous.height + Math.trunc((ball.height - previous.height) * distance / speed);
  const netHeight = netHeightAt(x, singlesSticks);
  if (x < NET.left - NET.ballRadius || x > NET.right + NET.ballRadius || height > netHeight + NET.ballRadius) {
    return { ball, contact: null };
  }
  const kind = height >= netHeight - NET.ballRadius ? 'tape' : 'mesh';
  ball.x = x;
  ball.height = Math.max(0, height);
  ball.velocityX = Math.trunc(ball.velocityX / 2);
  if (kind === 'mesh') {
    ball.y = NET.y - direction * (NET.ballRadius + 1);
    ball.velocityY = -Math.trunc(previous.velocityY / 4);
    ball.velocityZ = Math.min(0, ball.velocityZ);
  } else {
    ball.y = NET.y + direction * (NET.ballRadius + 1);
    ball.height = netHeight + NET.ballRadius;
    ball.velocityY = Math.trunc(previous.velocityY * 3 / 4);
    ball.velocityZ = Math.max(2, Math.trunc(ball.velocityZ / 2));
  }
  return { ball, contact: { x, kind } };
}

export function settleBall(previous: BallState, singlesSticks = false): BallState {
  if (previous.height === 0 && previous.velocityZ === 0 && previous.velocityX === 0 && previous.velocityY === 0) return { ...previous };
  const { ball } = advanceFlyingBall(previous, singlesSticks);
  if (ball.height <= 0) {
    ball.height = 0;
    ball.velocityZ = ball.velocityZ < -3 ? Math.floor(-ball.velocityZ / 3) : 0;
    ball.velocityX = slow(ball.velocityX);
    ball.velocityY = slow(ball.velocityY);
  }
  const x = Math.max(-RUNOFF.side, Math.min(COURT.width + RUNOFF.side, ball.x));
  const y = Math.max(-RUNOFF.baseline, Math.min(COURT.length + RUNOFF.baseline, ball.y));
  if (x !== ball.x) ball.velocityX = -Math.trunc(ball.velocityX / 3);
  if (y !== ball.y) ball.velocityY = -Math.trunc(ball.velocityY / 3);
  ball.x = x;
  ball.y = y;
  return ball;
}

function slow(speed: number): number {
  return Math.abs(speed) <= 2 ? 0 : Math.sign(speed) * (Math.abs(speed) - 2);
}