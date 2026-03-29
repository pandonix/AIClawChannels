export class ApiError extends Error {
  readonly payload?: unknown;
  readonly status: number;

  constructor(
    message: string,
    status: number,
    payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.payload = payload;
    this.status = status;
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

async function parseResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function request<TResponse>(
  baseUrl: string,
  path: string,
  init: RequestInit,
) {
  const response = await fetch(new URL(path, normalizeBaseUrl(baseUrl)), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(
      typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}`,
      response.status,
      payload,
    );
  }

  return payload as TResponse;
}

export function createApiClient(baseUrl: string) {
  return {
    get<TResponse>(path: string, init?: Omit<RequestInit, "body" | "method">) {
      return request<TResponse>(baseUrl, path, {
        ...init,
        method: "GET",
      });
    },
    patch<TResponse, TBody>(path: string, body: TBody, init?: RequestInit) {
      return request<TResponse>(baseUrl, path, {
        ...init,
        body: JSON.stringify(body),
        method: "PATCH",
      });
    },
    post<TResponse, TBody>(path: string, body: TBody, init?: RequestInit) {
      return request<TResponse>(baseUrl, path, {
        ...init,
        body: JSON.stringify(body),
        method: "POST",
      });
    },
  };
}
