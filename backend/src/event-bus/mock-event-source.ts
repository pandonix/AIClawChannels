import type { MockGateway } from "../mock/mock-gateway.js";
import type { BackendEventSource, EventBusListener } from "./types.js";

export class MockGatewayEventSource implements BackendEventSource {
  constructor(private readonly mockGateway: MockGateway) {}

  subscribe(sessionId: string, listener: EventBusListener): () => void {
    return this.mockGateway.subscribe(sessionId, listener);
  }
}

