import type { RunPose } from './player-animation';
import type { StrokePose } from './player-facing';
import { PLAYER_LEG_EXTENSION } from './stroke-body';

interface Point { x: number; y: number }

export interface RunLeg {
  side: -1 | 1;
  hip: Point;
  knee: Point;
  ankle: Point;
  groundY: number;
  lift: number;
  toe: number;
}

const STEPS = [
  { reach: 3, lift: 0, bend: 1 },
  { reach: 2, lift: 0, bend: 1 },
  { reach: 0, lift: 0, bend: 0 },
  { reach: -2, lift: 0, bend: 1 },
  { reach: -3, lift: 1, bend: 2 },
  { reach: -1, lift: 3, bend: 3 },
  { reach: 1, lift: 4, bend: 3 },
  { reach: 3, lift: 2, bend: 2 },
] as const;

const SHUFFLE_STEPS = [
  { reach: 1, lift: 0 },
  { reach: 0, lift: 0 },
  { reach: -1, lift: 0 },
  { reach: -1, lift: 0 },
  { reach: -1, lift: 1 },
  { reach: 0, lift: 2 },
  { reach: 1, lift: 2 },
  { reach: 1, lift: 1 },
] as const;

function preparedLegs(run: RunPose, handSide: -1 | 1, facing: -1 | 1): RunLeg[] {
  const dx = run.gait?.directionX ?? 0;
  const dy = run.gait?.directionY ?? 0;
  const leadingDepth = dy || -dx * facing || -handSide;
  return ([-1, 1] as const).map((side) => {
    const depth = side * handSide;
    const phase = ((run.gait?.phase ?? 0) + (depth === leadingDepth ? 0 : 4)) % SHUFFLE_STEPS.length;
    const step = run.gait ? SHUFFLE_STEPS[phase]! : { reach: 0, lift: 0 };
    const hip = { x: run.lean - depth * facing, y: -4 - PLAYER_LEG_EXTENSION - run.bob + depth };
    const groundY = depth * 3 + dy * step.reach;
    const ankle = { x: -depth * facing * 2 + dx * step.reach, y: groundY - step.lift - 1 };
    const knee = {
      x: Math.trunc((hip.x + ankle.x) / 2) + facing * 2,
      y: Math.round((hip.y + ankle.y) / 2),
    };
    return { side, hip, knee, ankle, groundY, lift: step.lift, toe: facing };
  });
}

export function runLegs(run: RunPose, handSide: -1 | 1, pose?: StrokePose): RunLeg[] {
  if (pose && pose.stroke !== 'ready' && pose.side !== 0) return preparedLegs(run, handSide, pose.side);
  return ([-1, 1] as const).map((side) => {
    const gait = run.gait;
    const step = gait ? STEPS[(gait.phase + (side === 1 ? 4 : 0)) % STEPS.length]! : { reach: 0, lift: 0, bend: 1 };
    const dx = gait?.directionX ?? 0;
    const dy = gait?.directionY ?? 0;
    const hip = { x: run.lean + side * 2, y: -5 - PLAYER_LEG_EXTENSION - run.bob };
    const groundY = Math.round(dy * step.reach / 2);
    const ankle = { x: side * 3 + dx * step.reach, y: groundY - step.lift - 1 };
    const knee = {
      x: Math.round((hip.x + ankle.x) / 2) + (dx || side) * step.bend,
      y: Math.round((hip.y + ankle.y) / 2) - (dy || handSide) * Math.min(1, step.bend),
    };
    return { side, hip, knee, ankle, groundY, lift: step.lift, toe: dx || side };
  });
}