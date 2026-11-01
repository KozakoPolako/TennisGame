import { NEUTRAL_INPUT, type Axis, type PlayerInput } from '../core/simulation';
import type { DeviceBinding } from '../session/local-session';

export interface KeyboardMapping {
  up: string;
  down: string;
  left: string;
  right: string;
  hit: string;
}

export const DEFAULT_MAPPINGS: readonly KeyboardMapping[] = [
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', hit: 'KeyF' },
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', hit: 'Slash' },
  { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', hit: 'KeyO' },
  { up: 'Numpad8', down: 'Numpad5', left: 'Numpad4', right: 'Numpad6', hit: 'Numpad0' },
];

export function mappingConflicts(mappings: readonly KeyboardMapping[]): string[] {
  const seen = new Set<string>();
  const conflicts = new Set<string>();
  for (const mapping of mappings) {
    for (const code of Object.values(mapping)) {
      if (seen.has(code)) conflicts.add(code);
      seen.add(code);
    }
  }
  return [...conflicts];
}

export function quantizeAxis(value: number, deadZone = 0.25): Axis {
  return !Number.isFinite(value) || Math.abs(value) <= deadZone ? 0 : value < 0 ? -1 : 1;
}

export function readGamepad(pad: Gamepad | null | undefined): PlayerInput {
  if (!pad?.connected || pad.mapping !== 'standard') return { ...NEUTRAL_INPUT };
  const horizontal = Number(pad.buttons[15]?.pressed ?? false) - Number(pad.buttons[14]?.pressed ?? false);
  const vertical = Number(pad.buttons[13]?.pressed ?? false) - Number(pad.buttons[12]?.pressed ?? false);
  return {
    moveX: quantizeAxis(horizontal || (pad.axes[0] ?? 0)),
    moveY: quantizeAxis(vertical || (pad.axes[1] ?? 0)),
    hit: pad.buttons[0]?.pressed ?? false,
  };
}

export class InputDevices {
  readonly mappings = DEFAULT_MAPPINGS.map((mapping) => ({ ...mapping }));
  private pressed = new Set<string>();
  private active = false;
  private readonly abort = new AbortController();

  constructor() {
    const options = { signal: this.abort.signal };
    window.addEventListener('keydown', this.onKeyDown, options);
    window.addEventListener('keyup', this.onKeyUp, options);
    window.addEventListener('blur', this.clear, options);
    document.addEventListener('visibilitychange', this.clear, options);
    document.addEventListener('focusin', this.clear, options);
  }

  setActive(active: boolean): void {
    this.active = active;
    this.clear();
  }

  sample(bindings: readonly DeviceBinding[]): PlayerInput[] {
    if (!this.active || isFormTarget(document.activeElement)) return bindings.map(() => ({ ...NEUTRAL_INPUT }));
    const pads = navigator.getGamepads?.() ?? [];
    return bindings.map((binding) => {
      if (binding.kind === 'gamepad') return readGamepad(pads[binding.index]);
      const mapping = this.mappings[binding.profile];
      if (!mapping) return { ...NEUTRAL_INPUT };
      return {
        moveX: quantizeAxis(Number(this.pressed.has(mapping.right)) - Number(this.pressed.has(mapping.left))),
        moveY: quantizeAxis(Number(this.pressed.has(mapping.down)) - Number(this.pressed.has(mapping.up))),
        hit: this.pressed.has(mapping.hit),
      };
    });
  }

  dispose(): void {
    this.abort.abort();
    this.clear();
  }

  private clear = (): void => { this.pressed.clear(); };

  private isGameKey(code: string): boolean {
    return this.mappings.some((mapping) => Object.values(mapping).includes(code));
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.active || isFormTarget(event.target) || !this.isGameKey(event.code)) return;
    event.preventDefault();
    this.pressed.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
    if (this.active && !isFormTarget(event.target) && this.isGameKey(event.code)) event.preventDefault();
  };
}

function isFormTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || !!target.closest('input, textarea, select, button'));
}