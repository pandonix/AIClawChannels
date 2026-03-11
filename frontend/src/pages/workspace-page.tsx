import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChatMessage, ListSessionsResponse } from "@contracts";

import {
  abortChat,
  createSession,
  getChatHistory,
  listSessions,
  patchSession,
  sendChat
} from "../api/client";
import { ChatShell } from "../components/chat-shell";
import { SessionSidebar } from "../components/session-sidebar";

interface ActiveRunState {
  runId: string;
  sessionId: string;
  startedAt: string;
}

function buildClientRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function WorkspacePage() {
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: listSessions
  });
  const sessions = sessionsQuery.data?.sessions ?? [];
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [newSessionName, setNewSessionName] = useState("默认会话");
  const [titleDraft, setTitleDraft] = useState("");
  const [composerValue, setComposerValue] = useState("");
  const [activeRun, setActiveRun] = useState<ActiveRunState | null>(null);
  const [chatUiError, setChatUiError] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ["chat-history", selectedSessionId],
    queryFn: () => getChatHistory(selectedSessionId ?? ""),
    enabled: Boolean(selectedSessionId),
    refetchInterval: () => (activeRun && activeRun.sessionId === selectedSessionId ? 700 : false)
  });
  const messages = historyQuery.data?.messages ?? [];

  const createSessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (session) => {
      queryClient.setQueryData<ListSessionsResponse>(["sessions"], (current) => ({
        sessions: current ? [session, ...current.sessions] : [session]
      }));
      setSelectedSessionId(session.id);
      setNewSessionName("默认会话");
      setComposerValue("");
    }
  });

  const renameSessionMutation = useMutation({
    mutationFn: ({
      sessionId,
      title
    }: {
      sessionId: string;
      title: string;
    }) =>
      patchSession(sessionId, {
        title
      }),
    onSuccess: (updatedSession) => {
      queryClient.setQueryData<ListSessionsResponse>(["sessions"], (current) => ({
        sessions:
          current?.sessions.map((session) =>
            session.id === updatedSession.id ? updatedSession : session
          ) ?? [updatedSession]
      }));
      setTitleDraft(updatedSession.title);
    }
  });

  const sendChatMutation = useMutation({
    mutationFn: sendChat,
    onSuccess: (result, variables) => {
      setActiveRun({
        runId: result.runId,
        sessionId: variables.sessionId,
        startedAt: new Date().toISOString()
      });
      setComposerValue("");
      setChatUiError(null);
      void queryClient.invalidateQueries({
        queryKey: ["sessions"]
      });
      void queryClient.invalidateQueries({
        queryKey: ["chat-history", variables.sessionId]
      });
    },
    onError: (error) => {
      setChatUiError((error as Error).message);
    }
  });

  const abortChatMutation = useMutation({
    mutationFn: abortChat,
    onSuccess: (_, variables) => {
      setActiveRun(null);
      setChatUiError("Current run aborted.");
      void queryClient.invalidateQueries({
        queryKey: ["chat-history", variables.sessionId]
      });
    },
    onError: (error) => {
      setChatUiError((error as Error).message);
    }
  });

  useEffect(() => {
    if (!sessions.length) {
      setSelectedSessionId(null);
      return;
    }

    const hasSelectedSession = sessions.some((session) => session.id === selectedSessionId);
    if (!hasSelectedSession) {
      const firstSession = sessions[0];
      if (firstSession) {
        setSelectedSessionId(firstSession.id);
      }
    }
  }, [selectedSessionId, sessions]);

  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null;

  useEffect(() => {
    setTitleDraft(selectedSession?.title ?? "");
    setComposerValue("");
    setChatUiError(null);
  }, [selectedSession?.id, selectedSession?.title]);

  useEffect(() => {
    if (!activeRun || activeRun.sessionId !== selectedSessionId) {
      return;
    }

    const hasAssistantMessageAfterRun = messages.some(
      (message) =>
        message.role === "assistant" &&
        new Date(message.createdAt).getTime() >= new Date(activeRun.startedAt).getTime()
    );

    if (hasAssistantMessageAfterRun) {
      setActiveRun(null);
      setChatUiError(null);
      void queryClient.invalidateQueries({
        queryKey: ["sessions"]
      });
    }
  }, [activeRun, messages, queryClient, selectedSessionId]);

  const errorMessage = sessionsQuery.isError
    ? (sessionsQuery.error as Error).message
    : null;
  const mutationErrorMessage =
    (createSessionMutation.error as Error | null)?.message ??
    (renameSessionMutation.error as Error | null)?.message ??
    null;
  const historyErrorMessage = historyQuery.isError
    ? (historyQuery.error as Error).message
    : null;
  const currentSessionActiveRun =
    activeRun && activeRun.sessionId === selectedSessionId ? activeRun : null;

  async function handleCreateSession(): Promise<void> {
    const name = newSessionName.trim();
    if (!name) {
      return;
    }

    await createSessionMutation.mutateAsync({
      name
    });
  }

  async function handleRenameSession(): Promise<void> {
    if (!selectedSessionId) {
      return;
    }

    const title = titleDraft.trim();
    if (!title) {
      return;
    }

    await renameSessionMutation.mutateAsync({
      sessionId: selectedSessionId,
      title
    });
  }

  async function handleSendMessage(): Promise<void> {
    if (!selectedSessionId) {
      return;
    }

    const message = composerValue.trim();
    if (!message) {
      return;
    }

    await sendChatMutation.mutateAsync({
      sessionId: selectedSessionId,
      message,
      clientRequestId: buildClientRequestId()
    });
  }

  async function handleAbortRun(): Promise<void> {
    if (!activeRun) {
      return;
    }

    await abortChatMutation.mutateAsync({
      sessionId: activeRun.sessionId,
      runId: activeRun.runId
    });
  }

  const runStateLabel = currentSessionActiveRun
    ? `Run ${currentSessionActiveRun.runId} is generating`
    : chatUiError;

  const visibleMessages: ChatMessage[] = messages.filter(
    (message) => message.role === "user" || message.role === "assistant"
  );

  return (
    <main className="workspace-frame">
      <div className="workspace-glow workspace-glow--left" />
      <div className="workspace-glow workspace-glow--right" />
      <div className="workspace-grid">
        <SessionSidebar
          isLoading={sessionsQuery.isPending}
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={setSelectedSessionId}
          onRefresh={() => {
            void sessionsQuery.refetch();
          }}
          errorMessage={mutationErrorMessage ?? errorMessage}
          newSessionName={newSessionName}
          onNewSessionNameChange={setNewSessionName}
          onCreateSession={() => {
            void handleCreateSession();
          }}
          isCreatingSession={createSessionMutation.isPending}
        />
        <ChatShell
          session={selectedSession}
          titleDraft={titleDraft}
          onTitleDraftChange={setTitleDraft}
          onRenameSession={() => {
            void handleRenameSession();
          }}
          isRenamingSession={renameSessionMutation.isPending}
          messages={visibleMessages}
          isLoadingHistory={historyQuery.isPending}
          historyErrorMessage={historyErrorMessage}
          composerValue={composerValue}
          onComposerChange={setComposerValue}
          onSendMessage={() => {
            void handleSendMessage();
          }}
          isSendingMessage={sendChatMutation.isPending}
          activeRunId={currentSessionActiveRun?.runId ?? null}
          runStateLabel={runStateLabel}
          onAbortRun={() => {
            void handleAbortRun();
          }}
          isAbortingRun={abortChatMutation.isPending}
        />
      </div>
    </main>
  );
}
