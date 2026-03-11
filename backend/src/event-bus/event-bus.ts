import type { AnySseEvent } from "@contracts";

import { SessionService } from "../sessions/session-service.js";
import type { BackendEventSource, EventBusListener } from "./types.js";

interface SessionSubscription {
  listeners: Set<EventBusListener>;
  closeConnections: Set<() => void>;
  teardown: (() => void) | null;
  sessionKey: string;
}

interface EventBusOptions {
  sessionService: SessionService;
  eventSource: BackendEventSource;
}

export class EventBus {
  private readonly sessionService: SessionService;
  private readonly eventSource: BackendEventSource;
  private readonly subscriptions = new Map<string, SessionSubscription>();

  constructor(options: EventBusOptions) {
    this.sessionService = options.sessionService;
    this.eventSource = options.eventSource;
  }

  disconnectSession(sessionId: string): void {
    const subscription = this.subscriptions.get(sessionId);
    if (!subscription) {
      return;
    }
    subscription.teardown?.();
    this.subscriptions.delete(sessionId);
    for (const close of subscription.closeConnections) {
      close();
    }
  }

  async subscribe(sessionId: string, listener: EventBusListener, closeConnection?: () => void): Promise<() => void> {
    const session = await this.sessionService.getSessionRecord(sessionId);
    let subscription = this.subscriptions.get(session.id);

    if (!subscription) {
      subscription = {
        listeners: new Set(),
        closeConnections: new Set(),
        teardown: null,
        sessionKey: session.sessionKey
      };
      subscription.teardown = this.eventSource.subscribe(session.id, (event) => {
        this.emitToSession(session.id, event);
      });
      this.subscriptions.set(session.id, subscription);
    }

    subscription.listeners.add(listener);
    if (closeConnection) {
      subscription.closeConnections.add(closeConnection);
    }

    return () => {
      const current = this.subscriptions.get(session.id);
      if (!current) {
        return;
      }

      current.listeners.delete(listener);
      if (closeConnection) {
        current.closeConnections.delete(closeConnection);
      }
      if (current.listeners.size > 0) {
        return;
      }

      current.teardown?.();
      this.subscriptions.delete(session.id);
    };
  }

  private emitToSession(sessionId: string, event: AnySseEvent): void {
    const subscription = this.subscriptions.get(sessionId);
    if (!subscription) {
      return;
    }

    for (const listener of subscription.listeners) {
      listener(event);
    }
  }
}

