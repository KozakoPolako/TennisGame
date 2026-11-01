import { NET, netHeightAt } from './court';
import { MAX_CHARGE_TICKS, type BallState, type PlayerState } from './simulation';

export const FLAT_SHOT = {
  speed: 44,
  minSpeed: 20,
  maxSpeed: 68,
  maxSideSpeed: 22,
  minReach: 60,
  maxReach: 190,
  depthReach: 180,
  minHeight: 24,
  maxHeight: 230,
  firstContactTick: 12,
  lastContactTick: 5,
  netClearance: 18,
  minLift: -20,
  maxLift: 24,
} as const;

export function canHitFlat(player: PlayerState, ball: BallState): boolean {
  const incoming = player.id % 2 === 0 ? 1 : -1;
  const distance = Math.abs(ball.x - player.x);
  return ball.velocityY * incoming > 0
    && (ball.y - NET.y) * incoming > NET.ballRadius
    && player.swingTicks <= FLAT_SHOT.firstContactTick && player.swingTicks >= FLAT_SHOT.lastContactTick
    && distance >= FLAT_SHOT.minReach && distance <= FLAT_SHOT.maxReach
    && Math.abs(ball.y - player.y) <= FLAT_SHOT.depthReach
    && ball.height >= FLAT_SHOT.minHeight && ball.height <= FLAT_SHOT.maxHeight;
}

export function flatShot(player: PlayerState, contact: BallState, singlesSticks = false): BallState {
  const incoming = player.id % 2 === 0 ? 1 : -1;
  const side = Math.sign(contact.x - player.x);
  const timing = (contact.y - player.y) * incoming;
  const spacing = Math.abs(contact.x - player.x) - 120;
  const speed = FLAT_SHOT.minSpeed + Math.trunc((FLAT_SHOT.maxSpeed - FLAT_SHOT.minSpeed)
    * Math.max(0, Math.min(MAX_CHARGE_TICKS, player.shotChargeTicks)) / MAX_CHARGE_TICKS);
  const aim = Math.max(-FLAT_SHOT.maxSideSpeed, Math.min(FLAT_SHOT.maxSideSpeed,
    Math.trunc(side * (timing * 12 / FLAT_SHOT.depthReach + spacing * 8 / 70)))) || 0;
  const velocityX = Math.trunc(aim * speed / FLAT_SHOT.speed) || 0;
  const velocityY = -incoming * speed;
  const distance = Math.abs(contact.y - NET.y);
  const ticks = Math.max(1, Math.ceil(distance / speed));
  const wholeTicks = ticks - 1;
  const remainder = distance - wholeTicks * speed;
  const netX = contact.x + wholeTicks * velocityX + Math.trunc(velocityX * remainder / speed);
  const targetHeight = netHeightAt(netX, singlesSticks) + NET.ballRadius + FLAT_SHOT.netClearance;
  let velocityZ: number = FLAT_SHOT.minLift;
  // Match the discrete gravity and swept net-height interpolation used by ball-motion.
  while (velocityZ < FLAT_SHOT.maxLift && contact.height + wholeTicks * velocityZ
    - wholeTicks * (wholeTicks + 1) / 2 + Math.trunc((velocityZ - ticks) * remainder / speed) < targetHeight) velocityZ++;
  return { ...contact, velocityX, velocityY, velocityZ };
}