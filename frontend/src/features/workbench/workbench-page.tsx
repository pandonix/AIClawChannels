import { ChatCanvas } from "../../components/layout/chat-canvas";
import { Composer } from "../../components/layout/composer";
import { TopBar } from "../../components/layout/top-bar";
import { getPreviewSessionData } from "../../app/workbench-seed";
import {
  NewSessionDialog,
} from "./components/new-session-dialog";
import { SessionSettingsSheet } from "./components/session-settings-sheet";
import { SessionsSheet } from "./components/sessions-sheet";
import { useWorkbench } from "./workbench-provider";

export function WorkbenchPage() {
  const { state, dispatch } = useWorkbench();
  const currentSession =
    state.sessions.data.find((session) => session.id === state.selectedSessionId) ??
    state.sessions.data[0]!;

  const handleSelectSession = (sessionId: string) => {
    const preview = getPreviewSessionData(sessionId);

    dispatch({
      type: "session/select",
      sessionId,
      history: preview.history,
      agentEvents: preview.agentEvents,
      liveMessage: preview.liveMessage,
      draft: preview.sendRequest.message,
    });
    dispatch({ type: "ui/setSheet", sheet: "sessions", open: false });
  };

  return (
    <div className="min-h-screen px-5 py-5 text-ink-50 sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1480px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-canvas-900/85 shadow-workbench backdrop-blur">
        <TopBar
          currentSession={currentSession}
          connectionStatus={state.connectionStatus}
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
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-300">
                  {currentSession.id}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-300">
                  agentId {currentSession.agentId ?? "null"}
                </span>
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
            messages={state.history.data}
            liveMessage={state.liveMessage}
            agentEvents={state.agentEvents}
          />

          <Composer
            draft={state.draft}
            canSend={false}
            canStop={false}
            onDraftChange={(draft) =>
              dispatch({ type: "composer/setDraft", draft })
            }
          />
        </main>
      </div>

      <SessionsSheet
        open={state.ui.sessions}
        sessions={state.sessions.data}
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
      />

      <NewSessionDialog
        open={state.ui.newSession}
        onOpenChange={(open) =>
          dispatch({ type: "ui/setSheet", sheet: "newSession", open })
        }
      />
    </div>
  );
}
