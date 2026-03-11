import type {
  AbortChatRequest,
  AbortChatResponse,
  ChatHistoryResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  ListSessionsResponse,
  PatchSessionRequest,
  PatchSessionResponse,
  SendChatRequest,
  SendChatResponse
} from "@contracts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

async function readJson<TResponse>(response: Response, errorPrefix: string): Promise<TResponse> {
  if (!response.ok) {
    throw new Error(`${errorPrefix}: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export async function listSessions(): Promise<ListSessionsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/sessions`);
  return readJson<ListSessionsResponse>(response, "Failed to load sessions");
}

export async function createSession(
  payload: CreateSessionRequest
): Promise<CreateSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return readJson<CreateSessionResponse>(response, "Failed to create session");
}

export async function patchSession(
  sessionId: string,
  payload: PatchSessionRequest
): Promise<PatchSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return readJson<PatchSessionResponse>(response, "Failed to update session");
}

export async function getChatHistory(sessionId: string): Promise<ChatHistoryResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`
  );
  return readJson<ChatHistoryResponse>(response, "Failed to load chat history");
}

export async function sendChat(payload: SendChatRequest): Promise<SendChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return readJson<SendChatResponse>(response, "Failed to send chat message");
}

export async function abortChat(payload: AbortChatRequest): Promise<AbortChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat/abort`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return readJson<AbortChatResponse>(response, "Failed to abort chat run");
}

export { API_BASE_URL };
