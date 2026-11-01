import type { StrokePose } from './player-facing';
import { swingFrame, type SwingFrame } from './swing-animation';

export const PLAYER_LEG_EXTENSION = 4;

interface Point { x: number; y: number }

interface BodyKeyframe {
  weight: number;
  coil: number;
  crouch: number;
  shoulderWidth: number;
  hipWidth: number;
  tilt: number;
  step: number;
  pivot: number;
  freeHand: Point;
}

export interface StrokeBody {
  hip: Point;
  shoulder: Point;
  head: Point;
  shoulderWidth: number;
  hipWidth: number;
  tilt: number;
  leadFoot: Point;
  rearFoot: Point;
  leadKnee: Point;
  rearKnee: Point;
  heelLift: number;
  freeHand: Point;
}

type ActivePhase = Exclude<SwingFrame['phase'], 'ready'>;

const FOREHAND: Record<ActivePhase, BodyKeyframe> = {
  prepare: { weight: -1, coil: 2, crouch: 2, shoulderWidth: 2, hipWidth: 3, tilt: 1, step: 0, pivot: 0, freeHand: { x: -7, y: -12 } },
  accelerate: { weight: 0, coil: 1, crouch: 1, shoulderWidth: 3, hipWidth: 4, tilt: 1, step: 2, pivot: 0, freeHand: { x: -6, y: -13 } },
  contact: { weight: 1, coil: 0, crouch: 0, shoulderWidth: 4, hipWidth: 4, tilt: 0, step: 3, pivot: 1, freeHand: { x: -5, y: -11 } },
  follow: { weight: 2, coil: -2, crouch: 0, shoulderWidth: 3, hipWidth: 3, tilt: -1, step: 3, pivot: 2, freeHand: { x: -3, y: -10 } },
  recover: { weight: 1, coil: -1, crouch: 1, shoulderWidth: 3, hipWidth: 3, tilt: 0, step: 1, pivot: 1, freeHand: { x: -5, y: -8 } },
};

const BACKHAND: Record<ActivePhase, BodyKeyframe> = {
  prepare: { weight: -1, coil: 2, crouch: 2, shoulderWidth: 2, hipWidth: 2, tilt: 1, step: 1, pivot: 0, freeHand: { x: 0, y: 0 } },
  accelerate: { weight: 0, coil: 1, crouch: 2, shoulderWidth: 2, hipWidth: 3, tilt: 1, step: 3, pivot: 0, freeHand: { x: 0, y: 0 } },
  contact: { weight: 1, coil: -1, crouch: 0, shoulderWidth: 3, hipWidth: 3, tilt: 0, step: 4, pivot: 1, freeHand: { x: 0, y: 0 } },
  follow: { weight: 2, coil: -3, crouch: 0, shoulderWidth: 4, hipWidth: 4, tilt: -1, step: 4, pivot: 2, freeHand: { x: 0, y: 0 } },
  recover: { weight: 1, coil: -1, crouch: 1, shoulderWidth: 3, hipWidth: 3, tilt: 0, step: 2, pivot: 1, freeHand: { x: 0, y: 0 } },
};

export function strokeBody(ticks: number, pose: StrokePose): StrokeBody | null {
  const phase = swingFrame(ticks).phase;
  if (phase === 'ready') return null;
  const frame = ticks === 1
    ? { weight: 0, coil: 0, crouch: 0, shoulderWidth: 4, hipWidth: 4, tilt: 0, step: 0, pivot: 0, freeHand: { x: 0, y: -6 } }
    : (pose.stroke === 'backhand' ? BACKHAND : FOREHAND)[phase];
  const side = pose.side || pose.handSide;
  const leadSide = pose.stroke === 'backhand' ? side : -side;
  const hip = { x: leadSide * frame.weight, y: -7 - PLAYER_LEG_EXTENSION + frame.crouch };
  const shoulder = { x: hip.x + side * frame.coil, y: -14 - PLAYER_LEG_EXTENSION + frame.crouch };
  const leadFoot = { x: leadSide * (ticks === 1 ? 2 : 4 + (frame.step > 0 ? 1 : 0)), y: -pose.handSide * frame.step };
  const rearFoot = { x: -leadSide * (ticks === 1 ? 2 : 4 - frame.pivot), y: ticks === 1 ? 0 : pose.handSide - frame.pivot };
  return {
    hip, shoulder,
    head: { x: hip.x + (ticks === 1 ? 0 : side), y: -20 - PLAYER_LEG_EXTENSION + frame.crouch },
    shoulderWidth: frame.shoulderWidth,
    hipWidth: frame.hipWidth,
    tilt: side * frame.tilt,
    leadFoot, rearFoot,
    leadKnee: { x: leadFoot.x + leadSide * frame.crouch, y: Math.round((hip.y + leadFoot.y) / 2) },
    rearKnee: { x: Math.trunc((hip.x + rearFoot.x) / 2) - leadSide * frame.crouch, y: Math.round((hip.y + rearFoot.y) / 2) },
    heelLift: frame.pivot,
    freeHand: { x: hip.x + side * frame.freeHand.x, y: frame.freeHand.y - PLAYER_LEG_EXTENSION + frame.crouch },
  };
}