import type {
  AbortChatRequest,
  AbortChatResponse,
  AnySseEvent,
  ChatHistoryResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  ListSessionsResponse,
  PatchSessionRequest,
  PatchSessionResponse,
  SendChatRequest,
  SendChatResponse,
} from "@contracts";
import { useEffect, useEffectEvent, useRef } from "react";
import { ChatCanvas } from "../../components/layout/chat-canvas";
import { Composer } from "../../components/layout/composer";
import { TopBar } from "../../components/layout/top-bar";
import { NewSessionDialog } from "./components/new-session-dialog";
import { SessionSettingsSheet } from "./components/session-settings-sheet";
import { SessionsSheet } from "./components/sessions-sheet";
import { useWorkbench } from "./workbench-provider";

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unexpected request failure";
}

function createClientRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function handleStreamEvent(event: AnySseEvent, dispatch: ReturnType<typeof useWorkbench>["dispatch"]) {
  switch (event.event) {
    case "agent.event":
      dispatch({ type: "agent/event", event: event.data });
      return;

    case "message.delta":
      dispatch({
        type: "live/update",
        createdAt: event.data.createdAt,
        delta: event.data.delta,
        runId: event.data.runId,
        sessionId: event.data.sessionId,
      });
      return;

    case "message.final":
      dispatch({
        type: "run/final",
        message: event.data.message,
        runId: event.data.runId,
      });
      return;

    case "run.aborted":
      dispatch({
        type: "run/aborted",
        createdAt: event.data.createdAt,
        runId: event.data.runId,
      });
      return;

    case "run.error":
      dispatch({
        type: "run/error",
        createdAt: event.data.createdAt,
        error: event.data.error,
        runId: event.data.runId,
      });
      dispatch({ type: "connection/setStatus", status: "error" });
      return;

    default:
      return;
  }
}

export function WorkbenchPage() {
  const { apiClient, dispatch, state, streamClient } = useWorkbench();
  const reloadGenerationRef = useRef(0);
  const currentSession =
    state.sessions.data.find((session) => session.id === state.selectedSessionId) ??
    null;

  const loadHistoryForSession = useEffectEvent(async (sessionId: string) => {
    const response = await apiClient.get<ChatHistoryResponse>(
      `/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`,
    );

    dispatch({ type: "history/success", messages: response.messages });
    return response.messages;
  });

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      dispatch({ type: "sessions/request" });

      try {
        const response =
          await apiClient.get<ListSessionsResponse>("/api/sessions");

        if (cancelled) {
          return;
        }

        dispatch({ type: "sessions/success", sessions: response.sessions });
        dispatch({
          type: "session/select",
          sessionId: response.sessions[0]?.id ?? null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        dispatch({
          type: "sessions/error",
          error: toErrorMessage(error),
        });
      }
    };

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [apiClient, dispatch]);

  useEffect(() => {
    if (!state.selectedSessionId) {
      dispatch({ type: "connection/setStatus", status: "closed" });
      return;
    }

    const sessionId = state.selectedSessionId;
    let cancelled = false;

    dispatch({ type: "history/request" });
    dispatch({ type: "diagnostics/setError", error: null });
    dispatch({ type: "connection/setStatus", status: "connecting" });

    const disconnect = streamClient.connect(sessionId, {
      onError: () => {
        if (cancelled) {
          return;
        }

        dispatch({ type: "connection/setStatus", status: "reconnecting" });
        dispatch({
          type: "diagnostics/setError",
          error: "SSE connection interrupted",
        });
      },
      onOpen: () => {
        if (cancelled) {
          return;
        }

        dispatch({ type: "diagnostics/setError", error: null });
        dispatch({ type: "connection/setStatus", status: "open" });
      },
      onEvent: (event) => {
        if (cancelled) {
          return;
        }

        handleStreamEvent(event, dispatch);
      },
    });

    const loadSelectedSessionHistory = async () => {
      try {
        if (cancelled) {
          return;
        }

        await loadHistoryForSession(sessionId);
      } catch (error) {
        if (cancelled) {
          return;
        }

        dispatch({
          type: "history/error",
          error: toErrorMessage(error),
        });
      }
    };

    void loadSelectedSessionHistory();

    return () => {
      cancelled = true;
      disconnect();
      dispatch({ type: "connection/setStatus", status: "closed" });
    };
  }, [apiClient, dispatch, state.selectedSessionId, streamClient]);

  useEffect(() => {
  if (!state.selectedSessionId || !state.activeRun.runId) {
      return;
    }

    const runId = state.activeRun.runId;
    const generation = ++reloadGenerationRef.current;
    const shouldBackfill =
      state.connectionStatus === "reconnecting" ||
      state.activeRun.status !== "idle";

    if (!shouldBackfill) {
      return;
    }

    const timer = window.setTimeout(async () => {
      if (reloadGenerationRef.current !== generation) {
        return;
      }

      try {
        const messages = await loadHistoryForSession(state.selectedSessionId!);
        const latestAssistantMessage = [...messages]
          .reverse()
          .find((message) => message.role === "assistant");

        if (latestAssistantMessage) {
          dispatch({
            type: "run/final",
            message: latestAssistantMessage,
            runId,
          });
        }
      } catch (error) {
        dispatch({
          type: "diagnostics/setError",
          error: `History backfill failed: ${toErrorMessage(error)}`,
        });
      }
    }, 4500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    dispatch,
    state.activeRun.runId,
    state.activeRun.status,
    state.connectionStatus,
    state.liveMessage,
    state.selectedSessionId,
  ]);

  const handleSelectSession = (sessionId: string) => {
    dispatch({
      type: "session/select",
      sessionId,
    });
    dispatch({ type: "ui/setSheet", sheet: "sessions", open: false });
  };

  const handleCreateSession = async (name: string) => {
    const session = await apiClient.post<CreateSessionResponse, CreateSessionRequest>(
      "/api/sessions",
      { name },
    );

    dispatch({ type: "sessions/upsert", session });
    dispatch({ type: "session/select", sessionId: session.id });
    dispatch({ type: "ui/setSheet", sheet: "newSession", open: false });
    dispatch({ type: "ui/setSheet", sheet: "sessions", open: false });
  };

  const handleSaveSession = async (input: PatchSessionRequest) => {
    if (!currentSession) {
      return;
    }

    const session = await apiClient.patch<PatchSessionResponse, PatchSessionRequest>(
      `/api/sessions/${currentSession.id}`,
      input,
    );

    dispatch({ type: "sessions/upsert", session });
  };

  const handleSend = async () => {
    if (!currentSession) {
      return;
    }

    const message = state.draft.trim();

    if (!message || state.activeRun.status !== "idle") {
      return;
    }

    const clientRequestId = createClientRequestId();
    const createdAt = new Date().toISOString();

    dispatch({
      type: "history/appendMessage",
      message: {
        createdAt,
        id: `local-user-${clientRequestId}`,
        role: "user",
        text: message,
      },
    });
    dispatch({ type: "composer/setDraft", draft: "" });

    try {
      const response = await apiClient.post<SendChatResponse, SendChatRequest>(
        "/api/chat/send",
        {
          clientRequestId,
          message,
          sessionId: currentSession.id,
        },
      );

      dispatch({ type: "run/start", runId: response.runId });
    } catch (error) {
      dispatch({
        type: "diagnostics/setError",
        error: toErrorMessage(error),
      });
      dispatch({
        type: "history/appendMessage",
        message: {
          createdAt: new Date().toISOString(),
          id: `send-error-${clientRequestId}`,
          role: "system",
          text: `Send failed: ${toErrorMessage(error)}`,
        },
      });
      dispatch({ type: "run/setStatus", runId: null, status: "idle" });
      dispatch({ type: "composer/setDraft", draft: message });
    }
  };

  const handleStop = async () => {
    if (!currentSession || !state.activeRun.runId) {
      return;
    }

    dispatch({
      type: "run/setStatus",
      runId: state.activeRun.runId,
      status: "stopping",
    });

    try {
      await apiClient.post<AbortChatResponse, AbortChatRequest>("/api/chat/abort", {
        runId: state.activeRun.runId,
        sessionId: currentSession.id,
      });
    } catch (error) {
      dispatch({
        type: "diagnostics/setError",
        error: toErrorMessage(error),
      });
      dispatch({
        type: "history/appendMessage",
        message: {
          createdAt: new Date().toISOString(),
          id: `abort-error-${state.activeRun.runId}`,
          role: "system",
          text: `Abort request failed: ${toErrorMessage(error)}`,
        },
      });
      dispatch({
        type: "run/setStatus",
        runId: state.activeRun.runId,
        status: "active",
      });
    }
  };

  const canSend =
    Boolean(currentSession) &&
    state.history.status !== "loading" &&
    state.draft.trim().length > 0 &&
    state.activeRun.status === "idle";
  const canStop =
    Boolean(currentSession) &&
    state.activeRun.runId !== null &&
    state.activeRun.status === "active";

  return (
    <div className="min-h-screen px-5 py-5 text-ink-50 sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1480px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-canvas-900/85 shadow-workbench backdrop-blur">
        <TopBar
          currentSession={currentSession}
          connectionStatus={state.connectionStatus}
          lastError={state.diagnostics.lastError}
          runId={state.activeRun.runId}
          onOpenSessions={() =>
            dispatch({ type: "ui/setSheet", sheet: "sessions", open: true })
          }
          onOpenSettings={() =>
            dispatch({ type: "ui/setSheet", sheet: "settings", open: true })
          }
        />

        <main className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-5 sm:px-6 sm:pb-6">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[28px] border border-white/8 bg-canvas-950/80 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-accent-300/25 bg-accent-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-accent-300">
                  Active Session
                </span>
                {currentSession ? (
                  <>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-300">
                      {currentSession.id}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-300">
                      agentId {currentSession.agentId ?? "null"}
                    </span>
                  </>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-300">
                    no session selected
                  </span>
                )}
              </div>
            </div>

            <div className="hidden rounded-[28px] border border-white/8 bg-canvas-950/70 px-5 py-4 xl:block">
              <p className="font-display text-sm uppercase tracking-[0.28em] text-ink-300">
                Infrastructure Ready
              </p>
              <p className="mt-3 text-sm leading-7 text-ink-200">
                路由入口、统一状态模型、HTTP/SSE 客户端与 Drawer / Dialog / Popover 原语已经接入。后续里程碑只需要往里填真实业务。
              </p>
            </div>
          </section>

          <ChatCanvas
            activeRunStatus={state.activeRun.status}
            historyError={state.history.error}
            historyStatus={state.history.status}
            messages={state.history.data}
            liveMessage={state.liveMessage}
            agentEvents={state.agentEvents}
            sessionId={state.selectedSessionId}
          />

          <Composer
            activeRunStatus={state.activeRun.status}
            draft={state.draft}
            canSend={canSend}
            canStop={canStop}
            onDraftChange={(draft) =>
              dispatch({ type: "composer/setDraft", draft })
            }
            onSend={() => void handleSend()}
            onStop={() => void handleStop()}
          />
        </main>
      </div>

      <SessionsSheet
        error={state.sessions.error}
        open={state.ui.sessions}
        sessions={state.sessions.data}
        status={state.sessions.status}
        selectedSessionId={state.selectedSessionId}
        onOpenChange={(open) =>
          dispatch({ type: "ui/setSheet", sheet: "sessions", open })
        }
        onCreateSession={() =>
          dispatch({ type: "ui/setSheet", sheet: "newSession", open: true })
        }
        onSelectSession={handleSelectSession}
      />

      <SessionSettingsSheet
        open={state.ui.settings}
        session={currentSession}
        onOpenChange={(open) =>
          dispatch({ type: "ui/setSheet", sheet: "settings", open })
        }
        onSave={handleSaveSession}
      />

      <NewSessionDialog
        open={state.ui.newSession}
        onOpenChange={(open) =>
          dispatch({ type: "ui/setSheet", sheet: "newSession", open })
        }
        onCreateSession={handleCreateSession}
      />
    </div>
  );
}
