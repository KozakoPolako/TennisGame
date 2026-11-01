import type { PlayerState } from '../core/simulation';

export interface RunPose {
  stride: number;
  bob: number;
  lean: number;
  gait?: { phase: number; directionX: number; directionY: number };
}

interface AnimationSample {
  tick: number;
  x: number;
  y: number;
  distance: number;
  pose: RunPose;
}

const STRIDES = [0, 1, 2, 1, 0, -1, -2, -1] as const;
const BOBS = [0, 1, 1, 0, 0, 1, 1, 0] as const;

export class PlayerAnimation {
  private readonly samples = new Map<number, AnimationSample>();

  sample(player: PlayerState, tick: number): RunPose {
    const previous = this.samples.get(player.id);
    if (previous?.tick === tick && previous.x === player.x && previous.y === player.y) return previous.pose;
    const dx = previous && tick > previous.tick ? player.x - previous.x : 0;
    const dy = previous && tick > previous.tick ? player.y - previous.y : 0;
    const moving = dx !== 0 || dy !== 0;
    const distance = moving ? (previous?.distance ?? 0) + Math.hypot(dx, dy) : 0;
    const frame = Math.floor(distance / 30) % STRIDES.length;
    const pose: RunPose = {
      stride: moving ? STRIDES[frame] ?? 0 : 0,
      bob: moving ? BOBS[frame] ?? 0 : 0,
      lean: Math.sign(dx),
    };
    if (moving) pose.gait = { phase: frame, directionX: Math.sign(dx), directionY: Math.sign(dy) };
    this.samples.set(player.id, { tick, x: player.x, y: player.y, distance, pose });
    return pose;
  }
}