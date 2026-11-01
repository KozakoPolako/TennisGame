export const PROTOCOL_VERSION = 1;

export function createPeerConfiguration(): RTCConfiguration {
  return { iceServers: [] };
}

export interface SignalingPacket {
  version: typeof PROTOCOL_VERSION;
  negotiationId: string;
  type: 'offer' | 'answer';
  sdp: string;
}

export const ONLINE_STATUS = {
  implemented: false,
  label: 'W przygotowaniu',
  description: 'Docelowo: zaproszenie → odpowiedź → połączenie WebRTC. Bez własnego serwera signalingowego.',
} as const;