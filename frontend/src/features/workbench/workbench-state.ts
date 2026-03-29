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

export type WorkbenchAction =
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
      type: "run/setStatus";
      runId: string | null;
      status: ActiveRunStatus;
    }
  | {
      type: "session/select";
      sessionId: string;
      history: ChatMessage[];
      agentEvents: AgentEvent[];
      liveMessage: MessageDeltaEvent | null;
      draft: string;
    }
  | {
      type: "ui/setSheet";
      sheet: WorkbenchSheet;
      open: boolean;
    };

function toResourceState<T>(data: T[], fallback: T[]): ResourceState<T[]> {
  return {
    data,
    error: null,
    status: data.length > 0 ? "ready" : fallback.length > 0 ? "ready" : "empty",
  };
}

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

    case "run/setStatus":
      return {
        ...state,
        activeRun: {
          runId: action.runId,
          status: action.status,
        },
      };

    case "session/select":
      return {
        ...state,
        activeRun: {
          runId: action.liveMessage?.runId ?? null,
          status: action.liveMessage ? "active" : "idle",
        },
        agentEvents: action.agentEvents,
        diagnostics: {
          ...state.diagnostics,
          sessionId: action.sessionId,
        },
        draft: action.draft,
        history: {
          data: action.history,
          error: null,
          status: action.history.length > 0 ? "ready" : "empty",
        },
        liveMessage: action.liveMessage,
        selectedSessionId: action.sessionId,
      };

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
