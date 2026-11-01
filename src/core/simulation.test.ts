import { describe, expect, it } from 'vitest';
import { checksum, COURT, createState, NEUTRAL_INPUT, RUNOFF, step, type Axis, type GameState } from './simulation';

function move(state: GameState, moveX: Axis, nearY: Axis, farY: Axis): GameState {
  for (let tick = 0; tick < 400; tick++) {
    state = step(state, state.players.map((player) => ({ moveX, moveY: player.id % 2 === 0 ? nearY : farY, hit: false })));
  }
  return state;
}

describe('player runoffs', () => {
  it.each([2, 4] as const)('allows %i players beyond sidelines and baselines, but not beyond runoffs', (count) => {
    const left = move(createState(count), -1, 1, -1);
    const right = move(createState(count), 1, 1, -1);
    for (const player of left.players) {
      expect(player.x).toBe(-RUNOFF.side);
      expect(player.y).toBe(player.id % 2 === 0 ? COURT.length + RUNOFF.baseline : -RUNOFF.baseline);
    }
    for (const player of right.players) expect(player.x).toBe(COURT.width + RUNOFF.side);
  });

  it('still prevents crossing the net', () => {
    const state = move(createState(4), 0, -1, 1);
    for (const player of state.players) expect(player.y).toBe(player.id % 2 === 0 ? 970 : 830);
  });

  it('replays identically after serialization without mutating the input state', () => {
    const initial = createState(4);
    const snapshot = JSON.stringify(initial);
    const first = move(initial, 1, 1, -1);
    const restored = JSON.parse(snapshot) as GameState;
    expect(checksum(move(restored, 1, 1, -1))).toBe(checksum(first));
    expect(JSON.stringify(initial)).toBe(snapshot);
    expect(step(first, first.players.map(() => NEUTRAL_INPUT)).players).toEqual(first.players);
  });
});