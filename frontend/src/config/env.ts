const DEFAULT_API_BASE_URL = "http://localhost:3001";

function readStringEnv(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

export const env = {
  appName: "AIClaw Channels",
  apiBaseUrl: readStringEnv(
    import.meta.env.VITE_API_BASE_URL,
    DEFAULT_API_BASE_URL,
  ),
  isDev: import.meta.env.DEV,
} as const;
