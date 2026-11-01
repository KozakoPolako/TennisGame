import { expect, it } from 'vitest';
import { APPLAUSE_TICKS, spectatorFrame } from './crowd-animation';

it('keeps the machine training stands empty even when given a point event', () => {
  for (let tick = 0; tick < 200; tick++) {
    expect(spectatorFrame(tick, { tick: 10 }, 3, true)).toEqual({ visible: false, raised: false, clap: false });
  }
});

it('keeps spectators still without a point and before its tick', () => {
  for (const tick of [0, 30, 600]) {
    expect(spectatorFrame(tick, null, 0, false)).toEqual({ visible: true, raised: false, clap: false });
    expect(spectatorFrame(tick, { tick: 700 }, 0, false)).toEqual({ visible: true, raised: false, clap: false });
  }
});

it('claps in staggered groups and returns to idle after a bounded celebration', () => {
  const event = { tick: 100 };
  expect(spectatorFrame(100, event, 0, false)).toEqual({ visible: true, raised: true, clap: true });
  expect(spectatorFrame(106, event, 0, false).clap).toBe(false);
  expect(spectatorFrame(100, event, 3, false).raised).toBe(false);
  expect(spectatorFrame(109, event, 3, false).raised).toBe(true);
  for (let seat = 0; seat < 180; seat++) {
    expect(spectatorFrame(100 + APPLAUSE_TICKS + 12, event, seat, false)).toEqual({ visible: true, raised: false, clap: false });
  }
});

it('is replayable and repeated point rendering does not restart applause', () => {
  const event = Object.freeze({ tick: 10 });
  const frames = [10, 16, 30, 90, 150].map((tick) => spectatorFrame(tick, event, 0, false));
  for (const [index, tick] of [10, 16, 30, 90, 150].entries()) {
    expect(spectatorFrame(tick, { ...event }, 0, false)).toEqual(frames[index]);
  }
  expect(spectatorFrame(10, event, 0, false)).toEqual(frames[0]);
});