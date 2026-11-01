import { describe, expect, it } from 'vitest';
import { judgeServiceBounce, type ServiceAttempt } from './service-rules';

const service: ServiceAttempt = { serverSide: 'near', serviceCourt: 'deuce', attempt: 1, touchedNet: true };

describe('tennis service let', () => {
  it.each([1, 2] as const)('repeats the same service attempt %i after a net touch and legal bounce', (attempt) => {
    expect(judgeServiceBounce({ ...service, attempt }, 300, 600)).toEqual({ call: 'let', nextAttempt: attempt });
  });

  it('does not call let before a legal bounce or for an untouched service', () => {
    expect(judgeServiceBounce({ ...service, touchedNet: false }, 300, 600).call).toBe('good');
    expect(judgeServiceBounce(service, 700, 600).call).toBe('fault');
    expect(judgeServiceBounce({ ...service, attempt: 2 }, 300, 1000).call).toBe('double-fault');
    expect(judgeServiceBounce(service, 300, 400).call).toBe('fault');
  });

  it.each([
    ['near', 'deuce', 300, 600], ['near', 'ad', 700, 600],
    ['far', 'deuce', 700, 1200], ['far', 'ad', 300, 1200],
  ] as const)('uses the diagonal box for %s / %s', (serverSide, serviceCourt, x, y) => {
    expect(judgeServiceBounce({ ...service, serverSide, serviceCourt }, x, y).call).toBe('let');
    expect(judgeServiceBounce({ ...service, serverSide, serviceCourt }, 1000 - x, y).call).toBe('fault');
  });

  it('counts service lines as in, but not the net line', () => {
    expect(judgeServiceBounce(service, 125, 450).call).toBe('let');
    expect(judgeServiceBounce(service, 500, 450).call).toBe('let');
    expect(judgeServiceBounce(service, 124, 450).call).toBe('fault');
    expect(judgeServiceBounce(service, 300, 900).call).toBe('fault');
  });
});