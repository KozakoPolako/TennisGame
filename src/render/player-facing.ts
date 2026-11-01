import type { BallState, GameState, PlayerState } from '../core/simulation';
import { VISUAL_SWING_TICKS } from './swing-animation';

export interface StrokePose {
  side: -1 | 0 | 1;
  stroke: 'ready' | 'forehand' | 'backhand';
  handSide: -1 | 1;
}

export function strokePose(player: PlayerState, ball: BallState | null): StrokePose {
  const handSide = player.id % 2 === 0 ? 1 : -1;
  const incoming = ball && ball.velocityY * handSide > 0 && (ball.y - player.y) * handSide <= 130;
  const arrivalTicks = incoming ? Math.max(0, (player.y - ball.y) / ball.velocityY) : 0;
  const offset = incoming ? ball.x + ball.velocityX * arrivalTicks - player.x : 0;
  const side = Math.abs(offset) <= 32 ? 0 : offset < 0 ? -1 : 1;
  return { side, handSide, stroke: side === 0 ? 'ready' : side === handSide ? 'forehand' : 'backhand' };
}

export class PlayerFacing {
  private readonly samples = new Map<number, { tick: number; swingTicks: number; pose: StrokePose }>();

  sample(player: PlayerState, state: GameState): StrokePose {
    const previous = this.samples.get(player.id);
    const continuous = previous && state.tick >= previous.tick && state.tick > 0;
    const target = strokePose(player, state.training?.phase === 'ready' ? null : state.ball);
    const sameSwing = previous && previous.swingTicks > 0 && player.swingTicks <= previous.swingTicks && state.tick - previous.tick < VISUAL_SWING_TICKS;
    const pose = continuous && player.swingTicks > 0 && (sameSwing || target.side === 0)
      ? previous.pose : target;
    this.samples.set(player.id, { tick: state.tick, swingTicks: player.swingTicks, pose });
    return pose;
  }
}