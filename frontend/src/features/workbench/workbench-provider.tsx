import { createContext, useContext, useReducer, type Dispatch, type PropsWithChildren } from "react";
import { env } from "../../config/env";
import { createApiClient } from "../../lib/http/client";
import { ChatStreamClient } from "../../lib/sse/chat-stream";
import {
  createInitialWorkbenchState,
  type WorkbenchAction,
  type WorkbenchState,
  workbenchReducer,
} from "./workbench-state";

interface WorkbenchContextValue {
  apiClient: ReturnType<typeof createApiClient>;
  dispatch: Dispatch<WorkbenchAction>;
  state: WorkbenchState;
  streamClient: ChatStreamClient;
}

const WorkbenchContext = createContext<WorkbenchContextValue | null>(null);

const apiClient = createApiClient(env.apiBaseUrl);
const streamClient = new ChatStreamClient(env.apiBaseUrl);

export function WorkbenchProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(
    workbenchReducer,
    createInitialWorkbenchState({
      apiBaseUrl: env.apiBaseUrl,
      sessions: [],
      selectedSessionId: null,
      history: [],
      agentEvents: [],
      liveMessage: null,
      draft: "",
    }),
  );

  return (
    <WorkbenchContext.Provider
      value={{
        apiClient,
        dispatch,
        state,
        streamClient,
      }}
    >
      {children}
    </WorkbenchContext.Provider>
  );
}

export function useWorkbench() {
  const context = useContext(WorkbenchContext);

  if (!context) {
    throw new Error("useWorkbench must be used within WorkbenchProvider");
  }

  return context;
}
