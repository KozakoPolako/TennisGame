import { describe, expect, it } from 'vitest';
import { advanceFlyingBall } from './ball-motion';
import { COURT, NET, netHeightAt } from './court';
import { canHitFlat, flatShot, FLAT_SHOT } from './flat-shot';
import { createState, type BallState } from './simulation';

const player = { ...createState(1).players[0]!, swingTicks: 7, shotChargeTicks: 15 };
const ball: BallState = { x: 620, y: 1500, height: 90, velocityX: 0, velocityY: 24, velocityZ: -4 };

describe('FLAT contact', () => {
  it('expands reach on either side without allowing a hit through the body', () => {
    for (const side of [-1, 1]) {
      for (const dx of [60, 120, 190]) {
        for (const dy of [-180, 0, 180]) {
          expect(canHitFlat(player, { ...ball, x: player.x + side * dx, y: player.y + dy })).toBe(true);
        }
      }
    }
    for (const dx of [0, 38, 59, 191, -191]) expect(canHitFlat(player, { ...ball, x: player.x + dx })).toBe(false);
    for (const dy of [-181, 181]) expect(canHitFlat(player, { ...ball, y: player.y + dy })).toBe(false);
  });

  it('only contacts during the forward swing and within the height limits', () => {
    for (let swingTicks = 0; swingTicks <= 12; swingTicks++) {
      expect(canHitFlat({ ...player, swingTicks }, ball)).toBe(swingTicks >= 5 && swingTicks <= 12);
    }
    for (const height of [0, 23, 231, 300]) expect(canHitFlat(player, { ...ball, height })).toBe(false);
    for (const height of [24, 230]) expect(canHitFlat(player, { ...ball, height })).toBe(true);
    expect(canHitFlat(player, { ...ball, velocityY: -24 })).toBe(false);
    expect(canHitFlat(player, { ...ball, velocityY: 0 })).toBe(false);
    expect(canHitFlat({ ...player, y: 970 }, { ...ball, y: 880 })).toBe(false);
  });
});

describe('FLAT direction and flight', () => {
  it('extends full-charge landing depth beyond the previous maximum power on either court half', () => {
    for (const id of [0, 1]) {
      const near = id === 0;
      const y = near ? 1800 : 0;
      const land = (shotChargeTicks: number): number => {
        const hitter = { ...player, id, y, shotChargeTicks };
        let current = flatShot(hitter, { ...ball, y, height: 180, velocityY: near ? 24 : -24 }, true);
        expect(Math.abs(current.velocityY)).toBe(shotChargeTicks === 30 ? 68 : 60);
        for (let tick = 0; tick < 120 && current.height > 0; tick++) {
          const next = advanceFlyingBall(current, true);
          expect(next.contact).toBeNull();
          current = next.ball;
        }
        expect(current.height).toBeLessThanOrEqual(0);
        const depth = near ? NET.y - current.y : current.y - NET.y;
        expect(depth).toBeGreaterThan(0);
        expect(depth).toBeLessThan(NET.y);
        return depth;
      };
      expect(land(30)).toBeGreaterThan(land(25) + 100);
    }
  });
  it('keeps charged trajectories low and deterministic at every power level', () => {
    for (const shotChargeTicks of [1, 15, 30, 60]) {
      for (const height of [40, 90, 180]) {
        let current = flatShot({ ...player, shotChargeTicks }, { ...ball, height }, true);
        const initial = { ...current };
        expect(flatShot({ ...player, shotChargeTicks }, { ...ball, height }, true)).toEqual(initial);
        while (current.y > NET.y) {
          const previous = current;
          const next = advanceFlyingBall(previous, true);
          expect(next.contact).toBeNull();
          current = next.ball;
          expect(current.velocityY).toBe(initial.velocityY);
          if (current.y <= NET.y) {
            const crossingHeight = previous.height + Math.trunc((current.height - previous.height)
              * (previous.y - NET.y) / Math.abs(initial.velocityY));
            expect(crossingHeight - netHeightAt(current.x, true)).toBeGreaterThanOrEqual(26);
            expect(crossingHeight - netHeightAt(current.x, true)).toBeLessThanOrEqual(60);
          }
        }
      }
    }
  });
  it('sends an early backhand right and a late backhand left, with forehand reversed', () => {
    for (const side of [-1, 1]) {
      const shot = (dy: number) => flatShot(player, { ...ball, x: player.x + side * 120, y: player.y + dy });
      expect(shot(-150).velocityX * side).toBeLessThan(0);
      expect(shot(0).velocityX).toBe(0);
      expect(shot(150).velocityX * side).toBeGreaterThan(0);
      expect(Math.abs(shot(-150).velocityX - shot(150).velocityX)).toBeGreaterThan(10);
    }
  });

  it('uses lateral spacing as well as timing and bounds extreme angles', () => {
    expect(flatShot(player, { ...ball, x: player.x + 70 }).velocityX).toBeLessThan(flatShot(player, { ...ball, x: player.x + 180 }).velocityX);
    for (const dx of [-190, -60, 60, 190]) {
      for (const dy of [-180, 180]) {
        const shot = flatShot(player, { ...ball, x: player.x + dx, y: player.y + dy });
        expect(Math.abs(shot.velocityX)).toBeLessThanOrEqual(FLAT_SHOT.maxSideSpeed);
        expect(shot.velocityY).toBe(-44);
        expect(Object.values(shot).every(Number.isInteger)).toBe(true);
      }
    }
  });

  it('mirrors shot velocities and contact rules across court halves', () => {
    const farPlayer = { ...player, id: 1, x: COURT.width - player.x, y: COURT.length - player.y };
    const nearBall = { ...ball, y: 1380 };
    const farBall = { ...nearBall, x: COURT.width - nearBall.x, y: COURT.length - nearBall.y, velocityY: -24 };
    expect(canHitFlat(farPlayer, farBall)).toBe(true);
    const near = flatShot(player, nearBall, true);
    const far = flatShot(farPlayer, farBall, true);
    expect(far.velocityX).toBe(-near.velocityX);
    expect(far.velocityY).toBe(-near.velocityY);
    expect(far.velocityZ).toBe(near.velocityZ);
  });

  it.each([1200, 1500, 1800, 2100])('clears the net low and lands inside the far court from y=%i', (y) => {
    for (const height of y === 1200 ? [90, 180, 230] : [40, 90, 180, 230]) {
      let current = flatShot({ ...player, y }, { ...ball, y, height }, true);
      const original = { ...current };
      let crossed = false;
      let peak = height;
      for (let tick = 0; tick < 100; tick++) {
        const previous = current;
        const next = advanceFlyingBall(previous, true);
        expect(next.contact).toBeNull();
        current = next.ball;
        expect(current.velocityX).toBe(original.velocityX);
        expect(current.velocityY).toBe(original.velocityY);
        peak = Math.max(peak, current.height);
        if (previous.y > NET.y && current.y <= NET.y) {
          crossed = true;
          const clearance = previous.height + Math.trunc((current.height - previous.height) * (previous.y - NET.y) / 44) - netHeightAt(current.x, true);
          expect(clearance).toBeGreaterThanOrEqual(NET.ballRadius + FLAT_SHOT.netClearance);
          expect(clearance).toBeLessThanOrEqual(60);
        }
        if (current.height <= 0) {
          expect(crossed).toBe(true);
          expect(current.y).toBeGreaterThanOrEqual(0);
          expect(current.y).toBeLessThan(NET.y);
          break;
        }
      }
      expect(current.height).toBeLessThanOrEqual(0);
      expect(peak).toBeLessThanOrEqual(300);
    }
  });

  it('does not force an impossible very low close-net shot over the net', () => {
    let current = flatShot({ ...player, y: 970 }, { ...ball, y: 970, height: 24 }, true);
    expect(current.velocityZ).toBe(FLAT_SHOT.maxLift);
    let contact = false;
    for (let tick = 0; tick < 3; tick++) {
      const next = advanceFlyingBall(current, true);
      current = next.ball;
      contact ||= next.contact !== null;
    }
    expect(contact).toBe(true);
  });

  it('allows a low short ball at reference speed to go long rather than adding artificial topspin', () => {
    let current = flatShot({ ...player, y: 1200 }, { ...ball, y: 1200, height: 40 }, true);
    for (let tick = 0; tick < 100 && current.height > 0; tick++) current = advanceFlyingBall(current, true).ball;
    expect(current.height).toBeLessThanOrEqual(0);
    expect(current.y).toBeLessThan(0);
    expect(current.velocityY).toBe(-FLAT_SHOT.speed);
  });
});