import { expect, it } from 'vitest';
import { deflectBodyBall, findPlayerContact, PLAYER_BODY } from './player-contact';
import { createState, type BallState } from './simulation';
import { NET } from './court';

const player = { ...createState(1).players[0]!, swingTicks: 7 };
const ball: BallState = { x: 500, y: 1400, height: 100, velocityX: 0, velocityY: 200, velocityZ: 0 };

it('detects a ball crossing the entire body within one tick even during a swing', () => {
  const hit = findPlayerContact(ball, { ...ball, y: 1600 }, player, player, true);
  expect(hit?.kind).toBe('body');
  expect(hit!.ball.y).toBeLessThan(player.y);
  expect(deflectBodyBall(hit!).velocityY).toBe(-50);
});

it('sweeps player movement as well as the ball trajectory', () => {
  const still = { ...ball, y: player.y, velocityY: 0 };
  const hit = findPlayerContact(still, still, { ...player, x: 400 }, { ...player, x: 600 }, false);
  expect(hit?.kind).toBe('body');
  expect(hit!.player.x).toBeLessThan(500);
});

it('lets a ball pass outside the body or above the head without a swing', () => {
  for (const side of [-1, 1]) {
    const outside = { ...ball, x: player.x + side * (PLAYER_BODY.halfWidth + NET.ballRadius + 1) };
    expect(findPlayerContact(outside, { ...outside, y: 1600 }, player, player, false)).toBeNull();
  }
  const high = { ...ball, height: PLAYER_BODY.height + NET.ballRadius + 1 };
  expect(findPlayerContact(high, { ...high, y: 1600 }, player, player, true)).toBeNull();
});

it('detects a swept racket contact but never returns twice or catches a central ball', () => {
  const wide = { ...ball, x: 670, y: 1200 };
  expect(findPlayerContact(wide, { ...wide, y: 1800 }, player, player, true)?.kind).toBe('racket');
  expect(findPlayerContact(wide, { ...wide, y: 1800 }, player, player, false)).toBeNull();
  expect(findPlayerContact(ball, { ...ball, y: 1430 }, player, player, true)).toBeNull();
});