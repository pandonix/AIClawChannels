import { useQuery } from "@tanstack/react-query";

import { API_BASE_URL, listSessions } from "./api/client";

function App() {
  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: listSessions
  });

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Bootstrap Contract</p>
        <h1>AIClawChannels scaffold is ready for parallel development.</h1>
        <p className="lede">
          This branch freezes the project skeleton, shared API contract, and mock strategy. Follow-up
          worktrees should build on top of these boundaries rather than redefining them.
        </p>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <h2>Environment</h2>
          <ul>
            <li>Frontend: Vite + React + TypeScript</li>
            <li>Backend: Fastify + TypeScript</li>
            <li>Contract source: `packages/contracts/src/index.ts`</li>
            <li>Backend API base: {API_BASE_URL}</li>
          </ul>
        </article>

        <article className="panel">
          <h2>Prerequisite Output</h2>
          <ul>
            <li>T0.1 project skeleton</li>
            <li>T0.2 typed HTTP/SSE contract</li>
            <li>T0.3 in-memory mock gateway</li>
          </ul>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Session Smoke Test</h2>
          <button type="button" onClick={() => sessionsQuery.refetch()}>
            Refresh
          </button>
        </div>
        {sessionsQuery.isPending ? <p>Loading sessions...</p> : null}
        {sessionsQuery.isError ? (
          <p className="error">{(sessionsQuery.error as Error).message}</p>
        ) : null}
        {sessionsQuery.data ? (
          <ul className="session-list">
            {sessionsQuery.data.sessions.map((session) => (
              <li key={session.id}>
                <strong>{session.title}</strong>
                <span>{session.id}</span>
                <span>{session.lastMessagePreview ?? "No messages yet"}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}

export default App;

