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
import { NavigationRail } from "../components/navigation-rail";
import { SessionPanel } from "../components/session-panel";
import { WorkspaceDrawer } from "../components/workspace-drawer";
import { useChatStream } from "../hooks/use-chat-stream";

interface ActiveRunState {
  runId: string;
  sessionId: string;
  startedAt: string;
}

function buildClientRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function mergeMessages(historyMessages: ChatMessage[], streamedMessages: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  const byTimestamp = new Map<string, ChatMessage>();

  for (const message of historyMessages) {
    byId.set(message.id, message);
    // Use timestamp + role as secondary key for deduplication
    const timestampKey = `${message.createdAt}:${message.role}`;
    byTimestamp.set(timestampKey, message);
  }

  for (const message of streamedMessages) {
    const timestampKey = `${message.createdAt}:${message.role}`;
    // Skip if we already have a message with the same timestamp and role from history
    if (byTimestamp.has(timestampKey)) {
      continue;
    }
    byId.set(message.id, message);
  }

  return [...byId.values()]
    .filter((message) => message.role === "user" || message.role === "assistant")
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
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
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const historyQuery = useQuery({
    queryKey: ["chat-history", selectedSessionId],
    queryFn: () => getChatHistory(selectedSessionId ?? ""),
    enabled: Boolean(selectedSessionId)
  });

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
    onSuccess: async (_, variables) => {
      setChatUiError("Current run aborted.");
      if (activeRun?.runId === variables.runId) {
        setActiveRun(null);
      }
      await queryClient.invalidateQueries({
        queryKey: ["sessions"]
      });
      await queryClient.invalidateQueries({
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

  const streamState = useChatStream(selectedSessionId);

  useEffect(() => {
    if (!activeRun || activeRun.sessionId !== selectedSessionId) {
      return;
    }

    const hasFinalMessage = streamState.finalMessages.some((message) => {
      return new Date(message.createdAt).getTime() >= new Date(activeRun.startedAt).getTime();
    });

    if (hasFinalMessage) {
      setActiveRun(null);
      setChatUiError(null);
      void queryClient.invalidateQueries({
        queryKey: ["sessions"]
      });
      void queryClient.invalidateQueries({
        queryKey: ["chat-history", selectedSessionId]
      });
    }
  }, [
    activeRun,
    queryClient,
    selectedSessionId,
    streamState.finalMessages
  ]);

  useEffect(() => {
    if (!activeRun || activeRun.sessionId !== selectedSessionId) {
      return;
    }

    const latestNotice = streamState.notices.at(-1);
    if (!latestNotice || latestNotice.runId !== activeRun.runId) {
      return;
    }

    setActiveRun(null);
    setChatUiError(latestNotice.message);
    void queryClient.invalidateQueries({
      queryKey: ["sessions"]
    });
    void queryClient.invalidateQueries({
      queryKey: ["chat-history", selectedSessionId]
    });
  }, [activeRun, queryClient, selectedSessionId, streamState.notices]);

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
  const historyMessages = historyQuery.data?.messages ?? [];
  const currentSessionActiveRun =
    activeRun && activeRun.sessionId === selectedSessionId ? activeRun : null;
  const visibleMessages = mergeMessages(historyMessages, streamState.finalMessages);
  const runStateLabel = currentSessionActiveRun
    ? `Run ${currentSessionActiveRun.runId} is generating`
    : chatUiError;

  useEffect(() => {
    if (!currentSessionActiveRun || streamState.connectionState !== "open") {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: ["sessions"]
    });
    void queryClient.invalidateQueries({
      queryKey: ["chat-history", currentSessionActiveRun.sessionId]
    });
  }, [currentSessionActiveRun, queryClient, streamState.connectionState]);

  useEffect(() => {
    if (!currentSessionActiveRun) {
      return;
    }

    const runStartedAt = new Date(currentSessionActiveRun.startedAt).getTime();
    const hasPersistedAssistantMessage = historyMessages.some((message) => {
      return (
        message.role === "assistant" &&
        new Date(message.createdAt).getTime() >= runStartedAt
      );
    });

    if (!hasPersistedAssistantMessage) {
      return;
    }

    setActiveRun(null);
    setChatUiError(null);
    void queryClient.invalidateQueries({
      queryKey: ["sessions"]
    });
  }, [currentSessionActiveRun, historyMessages, queryClient]);

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
    if (!currentSessionActiveRun) {
      return;
    }

    await abortChatMutation.mutateAsync({
      sessionId: currentSessionActiveRun.sessionId,
      runId: currentSessionActiveRun.runId
    });
  }

  return (
    <main className="workspace-frame">
      <div className="workspace-glow workspace-glow--left" />
      <div className="workspace-glow workspace-glow--right" />
      <div className="workspace-grid">
        <NavigationRail
          onNewChat={() => {
            setHistoryPanelOpen(true);
          }}
          onToggleHistory={() => setHistoryPanelOpen((prev) => !prev)}
          onOpenSettings={() => setDrawerOpen(true)}
          historyOpen={historyPanelOpen}
        />
        <ChatShell
          session={selectedSession}
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
          streamState={streamState}
          onOpenSettings={() => setDrawerOpen(true)}
        />
      </div>

      <SessionPanel
        isOpen={historyPanelOpen}
        onClose={() => setHistoryPanelOpen(false)}
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

      <WorkspaceDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        session={selectedSession}
        titleDraft={titleDraft}
        onTitleDraftChange={setTitleDraft}
        onRenameSession={() => {
          void handleRenameSession();
        }}
        isRenamingSession={renameSessionMutation.isPending}
        streamState={streamState}
      />
    </main>
  );
}
