import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ListSessionsResponse } from "@contracts";

import { createSession, listSessions, patchSession } from "../api/client";
import { ChatShell } from "../components/chat-shell";
import { useChatStream } from "../hooks/use-chat-stream";
import { SessionSidebar } from "../components/session-sidebar";

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

  const createSessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (session) => {
      queryClient.setQueryData<ListSessionsResponse>(["sessions"], (current) => ({
        sessions: current ? [session, ...current.sessions] : [session]
      }));
      setSelectedSessionId(session.id);
      setNewSessionName("默认会话");
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
  }, [selectedSession?.id, selectedSession?.title]);
  const streamState = useChatStream(selectedSessionId);
  const errorMessage = sessionsQuery.isError
    ? (sessionsQuery.error as Error).message
    : null;
  const mutationErrorMessage =
    (createSessionMutation.error as Error | null)?.message ??
    (renameSessionMutation.error as Error | null)?.message ??
    null;

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
          streamState={streamState}
        />
      </div>
    </main>
  );
}
