import { createState, step, TICK_RATE, type GameState, type PlayerCount, type PlayerInput } from '../core/simulation';
import type { MachineSettings } from '../core/ball-machine';

export type DeviceBinding = { kind: 'keyboard'; profile: number } | { kind: 'gamepad'; index: number };

export function createBindings(count: PlayerCount): DeviceBinding[] {
  return Array.from({ length: count }, (_, profile) => ({ kind: 'keyboard', profile }));
}

export class LocalSession {
  state: GameState;
  private accumulator = 0;

  constructor(count: PlayerCount = 2) {
    this.state = createState(count);
  }

  reset(count: PlayerCount, machineSettings?: MachineSettings): void {
    this.state = createState(count, machineSettings);
    this.clearTiming();
  }

  clearTiming(): void {
    this.accumulator = 0;
  }

  cancelCharges(): void {
    this.state = { ...this.state, players: this.state.players.map((player) => ({ ...player, chargeTicks: 0, hitHeld: false })) };
  }

  advance(elapsedMs: number, sample: () => readonly PlayerInput[]): void {
    const tickMs = 1000 / TICK_RATE;
    this.accumulator += Math.max(0, Math.min(elapsedMs, tickMs * 5));
    let steps = 0;
    while (this.accumulator >= tickMs && steps < 5) {
      this.state = step(this.state, sample());
      this.accumulator -= tickMs;
      steps++;
    }
  }
}