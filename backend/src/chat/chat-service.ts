import type {
  AbortChatRequest,
  AbortChatResponse,
  ChatHistoryResponse,
  SendChatRequest,
  SendChatResponse
} from "@contracts";

import type { BackendRuntime } from "../runtime/types.js";
import { SessionService } from "../sessions/session-service.js";

interface RunRecord {
  runId: string;
  sessionId: string;
  sessionKey: string;
  clientRequestId: string;
  createdAt: string;
  status: "started" | "aborted" | "completed";
}

interface ChatServiceOptions {
  runtime: BackendRuntime;
  sessionService: SessionService;
}

export class ChatService {
  private readonly runtime: BackendRuntime;
  private readonly sessionService: SessionService;
  private readonly runsById = new Map<string, RunRecord>();
  private readonly runsByClientRequestId = new Map<string, RunRecord>();

  constructor(options: ChatServiceOptions) {
    this.runtime = options.runtime;
    this.sessionService = options.sessionService;
  }

  async getHistory(sessionId: string): Promise<ChatHistoryResponse> {
    const session = await this.sessionService.getSessionRecord(sessionId);
    return this.runtime.getHistory({
      sessionId: session.id,
      sessionKey: session.sessionKey
    });
  }

  async sendMessage(input: SendChatRequest): Promise<SendChatResponse> {
    const session = await this.sessionService.getSessionRecord(input.sessionId);
    const existingRun = this.runsByClientRequestId.get(input.clientRequestId);
    if (existingRun?.sessionId === input.sessionId) {
      return {
        accepted: true,
        runId: existingRun.runId
      };
    }

    const response = await this.runtime.sendMessage({
      sessionId: session.id,
      sessionKey: session.sessionKey,
      message: input.message,
      clientRequestId: input.clientRequestId
    });

    const run: RunRecord = {
      runId: response.runId,
      sessionId: session.id,
      sessionKey: session.sessionKey,
      clientRequestId: input.clientRequestId,
      createdAt: new Date().toISOString(),
      status: "started"
    };
    this.runsById.set(run.runId, run);
    this.runsByClientRequestId.set(run.clientRequestId, run);

    return response;
  }

  async abortRun(input: AbortChatRequest): Promise<AbortChatResponse> {
    const session = await this.sessionService.getSessionRecord(input.sessionId);
    const response = await this.runtime.abortRun({
      sessionId: session.id,
      sessionKey: session.sessionKey,
      runId: input.runId
    });
    const run = this.runsById.get(input.runId);
    if (run) {
      run.status = "aborted";
    }
    return response;
  }
}

