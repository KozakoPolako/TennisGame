import type { LooseBall } from './simulation';

export interface BallKid {
  id: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  phase: 'waiting' | 'fetching' | 'pickup' | 'returning';
  targetId: number | null;
  pickupTicks: number;
  carrying: boolean;
}

export function createBallKids(): BallKid[] {
  return [{ x: -170, y: -120 }, { x: 1170, y: 1920 }].map(({ x, y }, id) => ({
    id, x, y, homeX: x, homeY: y, phase: 'waiting', targetId: null, pickupTicks: 0, carrying: false,
  }));
}

export function advanceBallKids(kids: BallKid[], balls: LooseBall[], canCollect: boolean): LooseBall[] {
  let remaining = balls;
  for (const kid of kids) {
    if (!canCollect) continue;
    if (kid.phase === 'waiting') {
      const target = remaining.find((ball) => ball.height === 0 && ball.velocityX === 0 && ball.velocityY === 0 && ball.velocityZ === 0
        && (ball.y < 900 ? 0 : 1) === kid.id);
      if (target) { kid.targetId = target.id; kid.phase = 'fetching'; }
    }
    if (kid.phase === 'fetching') {
      const target = remaining.find((ball) => ball.id === kid.targetId);
      if (!target) kid.phase = 'returning';
      else if (moveTo(kid, target.x, target.y)) { kid.phase = 'pickup'; kid.pickupTicks = 18; }
    } else if (kid.phase === 'pickup') {
      if (--kid.pickupTicks <= 0) {
        remaining = remaining.filter((ball) => ball.id !== kid.targetId);
        kid.carrying = true;
        kid.phase = 'returning';
        kid.targetId = null;
      }
    } else if (kid.phase === 'returning' && moveTo(kid, kid.homeX, kid.homeY)) {
      kid.phase = 'waiting';
      kid.carrying = false;
    }
  }
  return remaining;
}

function moveTo(kid: BallKid, x: number, y: number): boolean {
  kid.x += Math.sign(x - kid.x) * Math.min(12, Math.abs(x - kid.x));
  kid.y += Math.sign(y - kid.y) * Math.min(12, Math.abs(y - kid.y));
  return kid.x === x && kid.y === y;
}