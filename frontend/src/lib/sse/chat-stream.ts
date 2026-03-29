import type { AnySseEvent, SseEventName, SseEventPayloadMap } from "@contracts";

const eventNames: SseEventName[] = [
  "message.delta",
  "message.final",
  "agent.event",
  "run.aborted",
  "run.error",
];

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function createStreamUrl(baseUrl: string, sessionId: string) {
  const url = new URL("/api/chat/stream", normalizeBaseUrl(baseUrl));
  url.searchParams.set("sessionId", sessionId);
  return url.toString();
}

export interface ChatStreamHandlers {
  onError?: (event: Event) => void;
  onEvent?: (event: AnySseEvent) => void;
  onOpen?: () => void;
}

export class ChatStreamClient {
  private readonly baseUrl: string;
  private source: EventSource | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  connect(sessionId: string, handlers: ChatStreamHandlers) {
    this.close();
    this.source = new EventSource(createStreamUrl(this.baseUrl, sessionId));
    this.source.onopen = () => {
      handlers.onOpen?.();
    };
    this.source.onerror = (event) => {
      handlers.onError?.(event);
    };

    for (const eventName of eventNames) {
      this.source.addEventListener(eventName, (event) => {
        const parsedEvent = event as MessageEvent<string>;

        if (!handlers.onEvent) {
          return;
        }

        handlers.onEvent({
          data: JSON.parse(parsedEvent.data) as SseEventPayloadMap[typeof eventName],
          event: eventName,
        } as AnySseEvent);
      });
    }

    return () => {
      this.close();
    };
  }

  close() {
    this.source?.close();
    this.source = null;
  }
}
