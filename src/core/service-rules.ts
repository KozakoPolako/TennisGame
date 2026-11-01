import { COURT } from './court';

export interface ServiceAttempt {
  serverSide: 'near' | 'far';
  serviceCourt: 'deuce' | 'ad';
  attempt: 1 | 2;
  touchedNet: boolean;
}

export interface ServiceDecision {
  call: 'good' | 'let' | 'fault' | 'double-fault';
  nextAttempt: 1 | 2;
}

export function judgeServiceBounce(service: ServiceAttempt, x: number, y: number): ServiceDecision {
  const targetLeft = (service.serverSide === 'near') === (service.serviceCourt === 'deuce');
  const insideX = targetLeft ? x >= 125 && x <= COURT.width / 2 : x >= COURT.width / 2 && x <= 875;
  const insideY = service.serverSide === 'near' ? y >= 450 && y < COURT.length / 2 : y > COURT.length / 2 && y <= 1350;
  if (!insideX || !insideY) return { call: service.attempt === 1 ? 'fault' : 'double-fault', nextAttempt: 2 };
  return { call: service.touchedNet ? 'let' : 'good', nextAttempt: service.attempt };
}