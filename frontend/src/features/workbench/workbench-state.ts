import type {
  AgentEvent,
  ChatMessage,
  MessageDeltaEvent,
  SessionSummary,
} from "@contracts";

export type ResourceStatus = "idle" | "loading" | "ready" | "empty" | "error";
export type ConnectionStatus =
  | "connecting"
  | "open"
  | "reconnecting"
  | "closed"
  | "error";
export type ActiveRunStatus = "idle" | "active" | "stopping";
export type WorkbenchSheet = "sessions" | "settings" | "newSession";

export interface ResourceState<T> {
  data: T;
  error: string | null;
  status: ResourceStatus;
}

export interface WorkbenchState {
  activeRun: {
    runId: string | null;
    status: ActiveRunStatus;
  };
  agentEvents: AgentEvent[];
  connectionStatus: ConnectionStatus;
  diagnostics: {
    apiBaseUrl: string;
    lastError: string | null;
    sessionId: string | null;
  };
  draft: string;
  history: ResourceState<ChatMessage[]>;
  liveMessage: MessageDeltaEvent | null;
  selectedSessionId: string | null;
  sessions: ResourceState<SessionSummary[]>;
  ui: Record<WorkbenchSheet, boolean>;
}

interface CreateInitialWorkbenchStateArgs {
  apiBaseUrl: string;
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  history: ChatMessage[];
  agentEvents: AgentEvent[];
  liveMessage: MessageDeltaEvent | null;
  draft: string;
}

function toResourceState<T>(data: T[], fallback: T[]): ResourceState<T[]> {
  return {
    data,
    error: null,
    status: data.length > 0 ? "ready" : fallback.length > 0 ? "ready" : "empty",
  };
}

function upsertMessages(
  currentMessages: ChatMessage[],
  nextMessages: ChatMessage[],
) {
  const messageById = new Map<string, ChatMessage>();

  for (const message of currentMessages) {
    messageById.set(message.id, message);
  }

  for (const message of nextMessages) {
    messageById.set(message.id, message);
  }

  return [...messageById.values()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

export type WorkbenchAction =
  | {
      type: "agent/event";
      event: AgentEvent;
    }
  | {
      type: "composer/setDraft";
      draft: string;
    }
  | {
      type: "connection/setStatus";
      status: ConnectionStatus;
    }
  | {
      type: "diagnostics/setError";
      error: string | null;
    }
  | {
      type: "history/appendMessage";
      message: ChatMessage;
    }
  | {
      type: "history/error";
      error: string;
    }
  | {
      type: "history/request";
    }
  | {
      type: "history/success";
      messages: ChatMessage[];
    }
  | {
      type: "live/reset";
    }
  | {
      type: "live/update";
      createdAt: string;
      delta: string;
      runId: string;
      sessionId: string;
    }
  | {
      type: "run/aborted";
      createdAt: string;
      runId: string;
    }
  | {
      type: "run/error";
      createdAt: string;
      error: string;
      runId: string;
    }
  | {
      type: "run/final";
      message: ChatMessage;
      runId: string;
    }
  | {
      type: "run/setStatus";
      runId: string | null;
      status: ActiveRunStatus;
    }
  | {
      type: "run/start";
      runId: string;
    }
  | {
      type: "session/select";
      sessionId: string | null;
    }
  | {
      type: "sessions/error";
      error: string;
    }
  | {
      type: "sessions/request";
    }
  | {
      type: "sessions/success";
      sessions: SessionSummary[];
    }
  | {
      type: "sessions/upsert";
      session: SessionSummary;
    }
  | {
      type: "ui/setSheet";
      sheet: WorkbenchSheet;
      open: boolean;
    };

export function createInitialWorkbenchState({
  apiBaseUrl,
  sessions,
  selectedSessionId,
  history,
  agentEvents,
  liveMessage,
  draft,
}: CreateInitialWorkbenchStateArgs): WorkbenchState {
  return {
    activeRun: {
      runId: liveMessage?.runId ?? null,
      status: liveMessage ? "active" : "idle",
    },
    agentEvents,
    connectionStatus: "open",
    diagnostics: {
      apiBaseUrl,
      lastError: null,
      sessionId: selectedSessionId,
    },
    draft,
    history: toResourceState(history, history),
    liveMessage,
    selectedSessionId,
    sessions: toResourceState(sessions, sessions),
    ui: {
      newSession: false,
      sessions: false,
      settings: false,
    },
  };
}

export function workbenchReducer(
  state: WorkbenchState,
  action: WorkbenchAction,
): WorkbenchState {
  switch (action.type) {
    case "agent/event":
      return {
        ...state,
        activeRun: {
          runId: action.event.runId,
          status: state.activeRun.status === "stopping" ? "stopping" : "active",
        },
        agentEvents: [...state.agentEvents, action.event].sort((left, right) =>
          left.createdAt.localeCompare(right.createdAt),
        ),
      };

    case "composer/setDraft":
      return {
        ...state,
        draft: action.draft,
      };

    case "connection/setStatus":
      return {
        ...state,
        connectionStatus: action.status,
      };

    case "diagnostics/setError":
      return {
        ...state,
        diagnostics: {
          ...state.diagnostics,
          lastError: action.error,
        },
      };

    case "history/appendMessage":
      return {
        ...state,
        history: {
          data: upsertMessages(state.history.data, [action.message]),
          error: null,
          status: "ready",
        },
      };

    case "history/error":
      return {
        ...state,
        history: {
          ...state.history,
          error: action.error,
          status: "error",
        },
      };

    case "history/request":
      return {
        ...state,
        history: {
          data: [],
          error: null,
          status: "loading",
        },
      };

    case "history/success":
      return {
        ...state,
        history: {
          data: action.messages,
          error: null,
          status: action.messages.length > 0 ? "ready" : "empty",
        },
      };

    case "live/reset":
      return {
        ...state,
        agentEvents: [],
        liveMessage: null,
      };

    case "live/update": {
      const previousText =
        state.liveMessage?.runId === action.runId ? state.liveMessage.delta : "";

      return {
        ...state,
        activeRun: {
          runId: action.runId,
          status: state.activeRun.status === "stopping" ? "stopping" : "active",
        },
        liveMessage: {
          createdAt: action.createdAt,
          delta: `${previousText}${action.delta}`,
          runId: action.runId,
          sessionId: action.sessionId,
        },
      };
    }

    case "run/aborted":
      return {
        ...state,
        activeRun: {
          runId: null,
          status: "idle",
        },
        agentEvents: [],
        diagnostics: {
          ...state.diagnostics,
          lastError: null,
        },
        history: {
          data: upsertMessages(state.history.data, [
            {
              createdAt: action.createdAt,
              id: `run-aborted-${action.runId}`,
              role: "system",
              text: "Run aborted.",
            },
          ]),
          error: null,
          status: "ready",
        },
        liveMessage: null,
      };

    case "run/error":
      return {
        ...state,
        activeRun: {
          runId: null,
          status: "idle",
        },
        agentEvents: [],
        diagnostics: {
          ...state.diagnostics,
          lastError: action.error,
        },
        history: {
          data: upsertMessages(state.history.data, [
            {
              createdAt: action.createdAt,
              id: `run-error-${action.runId}`,
              role: "system",
              text: `Run failed: ${action.error}`,
            },
          ]),
          error: null,
          status: "ready",
        },
        liveMessage: null,
      };

    case "run/final":
      return {
        ...state,
        activeRun: {
          runId: null,
          status: "idle",
        },
        agentEvents: [],
        diagnostics: {
          ...state.diagnostics,
          lastError: null,
        },
        history: {
          data: upsertMessages(state.history.data, [action.message]),
          error: null,
          status: "ready",
        },
        liveMessage: null,
      };

    case "run/setStatus":
      return {
        ...state,
        activeRun: {
          runId: action.runId,
          status: action.status,
        },
      };

    case "run/start":
      return {
        ...state,
        activeRun: {
          runId: action.runId,
          status: "active",
        },
        agentEvents: [],
        diagnostics: {
          ...state.diagnostics,
          lastError: null,
        },
        liveMessage: null,
      };

    case "session/select":
      return {
        ...state,
        activeRun: {
          runId: null,
          status: "idle",
        },
        agentEvents: [],
        diagnostics: {
          ...state.diagnostics,
          sessionId: action.sessionId,
        },
        draft: "",
        history: {
          data: [],
          error: null,
          status: action.sessionId ? "loading" : "empty",
        },
        liveMessage: null,
        selectedSessionId: action.sessionId,
      };

    case "sessions/error":
      return {
        ...state,
        diagnostics: {
          ...state.diagnostics,
          lastError: action.error,
        },
        sessions: {
          ...state.sessions,
          error: action.error,
          status: "error",
        },
      };

    case "sessions/request":
      return {
        ...state,
        sessions: {
          ...state.sessions,
          error: null,
          status: "loading",
        },
      };

    case "sessions/success":
      return {
        ...state,
        sessions: {
          data: action.sessions,
          error: null,
          status: action.sessions.length > 0 ? "ready" : "empty",
        },
      };

    case "sessions/upsert": {
      const existing = state.sessions.data.findIndex(
        (session) => session.id === action.session.id,
      );
      const nextSessions =
        existing >= 0
          ? state.sessions.data.map((session) =>
              session.id === action.session.id ? action.session : session,
            )
          : [action.session, ...state.sessions.data];

      nextSessions.sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      );

      return {
        ...state,
        sessions: {
          data: nextSessions,
          error: null,
          status: "ready",
        },
      };
    }

    case "ui/setSheet":
      return {
        ...state,
        ui: {
          ...state.ui,
          [action.sheet]: action.open,
        },
      };

    default:
      return state;
  }
}
