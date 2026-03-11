import type { AnySseEvent } from "@contracts";

export type EventBusListener = (event: AnySseEvent) => void;

export interface BackendEventSource {
  subscribe(sessionId: string, listener: EventBusListener): () => void;
}

