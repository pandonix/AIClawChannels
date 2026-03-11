import type {
  CreateSessionRequest,
  PatchSessionRequest,
  SessionSummary
} from "@contracts";

import type { BackendRuntime } from "../runtime/types.js";

export interface SessionRecord extends SessionSummary {
  sessionKey: string;
}

interface SessionServiceOptions {
  runtime: BackendRuntime;
  sessionKeyFactory?: (sessionId: string) => string;
}

function defaultSessionKeyFactory(sessionId: string): string {
  return `web:user_001:${sessionId}`;
}

export class SessionService {
  private readonly runtime: BackendRuntime;
  private readonly sessionKeyFactory: (sessionId: string) => string;
  private readonly sessions = new Map<string, SessionRecord>();
  private hydrated = false;

  constructor(options: SessionServiceOptions) {
    this.runtime = options.runtime;
    this.sessionKeyFactory = options.sessionKeyFactory ?? defaultSessionKeyFactory;
  }

  async hydrate(): Promise<void> {
    if (this.hydrated) {
      return;
    }

    const sessions = await this.runtime.listSessions();
    for (const session of sessions) {
      this.sessions.set(session.id, this.toRecord(session));
    }
    this.hydrated = true;
  }

  async listSessions(): Promise<SessionSummary[]> {
    await this.hydrate();
    return [...this.sessions.values()]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(({ sessionKey: _sessionKey, ...session }) => session);
  }

  async createSession(input: CreateSessionRequest): Promise<SessionSummary> {
    await this.hydrate();
    const created = await this.runtime.createSession(input);
    const record = this.toRecord(created);
    this.sessions.set(record.id, record);
    return this.toSummary(record);
  }

  async patchSession(sessionId: string, input: PatchSessionRequest): Promise<SessionSummary> {
    await this.hydrate();
    this.requireSession(sessionId);
    const updated = await this.runtime.patchSession(sessionId, input);
    const record = this.toRecord(updated);
    this.sessions.set(sessionId, record);
    return this.toSummary(record);
  }

  async getSessionRecord(sessionId: string): Promise<SessionRecord> {
    await this.hydrate();
    return this.requireSession(sessionId);
  }

  private requireSession(sessionId: string): SessionRecord {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown session: ${sessionId}`);
    }
    return session;
  }

  private toRecord(session: SessionSummary): SessionRecord {
    const existing = this.sessions.get(session.id);
    return {
      ...session,
      sessionKey: existing?.sessionKey ?? this.sessionKeyFactory(session.id)
    };
  }

  private toSummary(record: SessionRecord): SessionSummary {
    const { sessionKey: _sessionKey, ...summary } = record;
    return summary;
  }
}

