import type {
  CreateSessionRequest,
  CreateSessionResponse,
  ListSessionsResponse,
  PatchSessionRequest,
  PatchSessionResponse
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

export { API_BASE_URL };
