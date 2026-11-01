import { expect, it } from 'vitest';
import { advanceBallKids, createBallKids } from './court-staff';
import { createState, step, type LooseBall } from './simulation';

const ball: LooseBall = { id: 1, x: 300, y: 300, height: 0, velocityX: 0, velocityY: 0, velocityZ: 0 };

it('only removes a ball after a kid reaches it and finishes picking it up', () => {
  const kids = createBallKids();
  let balls = advanceBallKids(kids, [ball], true);
  expect(balls).toHaveLength(1);
  expect(kids[0]?.phase).toBe('fetching');
  for (let tick = 0; tick < 100 && kids[0]?.phase !== 'pickup'; tick++) balls = advanceBallKids(kids, balls, true);
  expect(balls).toHaveLength(1);
  expect(kids[0]).toMatchObject({ x: ball.x, y: ball.y, phase: 'pickup' });
  for (let tick = 0; tick < 18; tick++) balls = advanceBallKids(kids, balls, true);
  expect(balls).toHaveLength(0);
  expect(kids[0]).toMatchObject({ carrying: true, phase: 'returning' });
  for (let tick = 0; tick < 100; tick++) balls = advanceBallKids(kids, balls, true);
  expect(kids[0]).toMatchObject({ carrying: false, phase: 'waiting', x: -170, y: -120 });
});

it('does not collect during a rally or chase airborne balls', () => {
  const kids = createBallKids();
  const initial = JSON.stringify(kids);
  expect(advanceBallKids(kids, [ball], false)).toEqual([ball]);
  expect(JSON.stringify(kids)).toBe(initial);
  advanceBallKids(kids, [{ ...ball, height: 100 }], true);
  expect(JSON.stringify(kids)).toBe(initial);
});

it('preserves previous simulation snapshots while moving the staff', () => {
  const state = createState(2);
  state.looseBalls.push(ball);
  const snapshot = JSON.stringify(state);
  expect(step(state, []).ballKids[0]?.phase).toBe('fetching');
  expect(JSON.stringify(state)).toBe(snapshot);
});