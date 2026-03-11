import type { ListSessionsResponse } from "@contracts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export async function listSessions(): Promise<ListSessionsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/sessions`);
  if (!response.ok) {
    throw new Error(`Failed to load sessions: ${response.status}`);
  }
  return response.json() as Promise<ListSessionsResponse>;
}

export { API_BASE_URL };

