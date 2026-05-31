export interface SyncEventEnvelope<TPayload> {
  eventId: string;
  deviceId: string;
  createdAt: string;
  type: string;
  payload: TPayload;
}
