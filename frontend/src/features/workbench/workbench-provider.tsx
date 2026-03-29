import { createContext, useContext, useReducer, type Dispatch, type PropsWithChildren } from "react";
import { defaultSessionId, getPreviewSessionData, previewSessions } from "../../app/workbench-seed";
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

const initialPreview = getPreviewSessionData(defaultSessionId);

export function WorkbenchProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(
    workbenchReducer,
    createInitialWorkbenchState({
      apiBaseUrl: env.apiBaseUrl,
      sessions: previewSessions,
      selectedSessionId: defaultSessionId,
      history: initialPreview.history,
      agentEvents: initialPreview.agentEvents,
      liveMessage: initialPreview.liveMessage,
      draft: initialPreview.sendRequest.message,
    }),
  );

  return (
    <WorkbenchContext.Provider
      value={{
        apiClient: createApiClient(env.apiBaseUrl),
        dispatch,
        state,
        streamClient: new ChatStreamClient(env.apiBaseUrl),
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
