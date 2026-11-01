import { expect, it } from 'vitest';
import { BALL_MACHINE, createState, NEUTRAL_INPUT } from '../core/simulation';
import { createBindings, LocalSession } from './local-session';

it('uses one device slot for solo and clears training when changing mode', () => {
  expect(createBindings(1)).toEqual([{ kind: 'keyboard', profile: 0 }]);
  const session = new LocalSession(1);
  for (let frame = 0; frame < 40; frame++) session.advance(50, () => [NEUTRAL_INPUT]);
  expect(session.state.training?.launches).toBe(1);
  const snapshot = JSON.stringify(session.state);
  session.clearTiming();
  expect(JSON.stringify(session.state)).toBe(snapshot);
  session.reset(1);
  expect(session.state).toEqual(createState(1));
  expect(session.state.training?.countdown).toBe(BALL_MACHINE.reloadTicks);
  session.reset(4);
  expect(session.state.training).toBeNull();
  expect(session.state.players).toHaveLength(4);
});