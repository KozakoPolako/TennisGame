export interface PointCelebration {
  tick: number;
}

export const APPLAUSE_TICKS = 120;

export function spectatorFrame(tick: number, celebration: PointCelebration | null, seat: number, training: boolean) {
  if (training) return { visible: false, raised: false, clap: false };
  const age = celebration ? tick - celebration.tick - seat % 5 * 3 : -1;
  const active = age >= 0 && age < APPLAUSE_TICKS;
  return {
    visible: true,
    raised: active && age < 72 && seat % 3 === 0,
    clap: active && Math.floor(age / 6) % 2 === 0,
  };
}