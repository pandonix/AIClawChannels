import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listSessions } from "../api/client";
import { ChatShell } from "../components/chat-shell";
import { SessionSidebar } from "../components/session-sidebar";

export function WorkspacePage() {
  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: listSessions
  });
  const sessions = sessionsQuery.data?.sessions ?? [];
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

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
  const errorMessage = sessionsQuery.isError
    ? (sessionsQuery.error as Error).message
    : null;

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
          errorMessage={errorMessage}
        />
        <ChatShell session={selectedSession} />
      </div>
    </main>
  );
}
