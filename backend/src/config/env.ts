export interface AppEnv {
  nodeEnv: string;
  port: number;
  mockGateway: boolean;
  gatewayWsUrl: string;
}

export function loadEnv(): AppEnv {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 3001),
    mockGateway: (process.env.MOCK_GATEWAY ?? "true") === "true",
    gatewayWsUrl: process.env.GATEWAY_WS_URL ?? "ws://127.0.0.1:18789"
  };
}

