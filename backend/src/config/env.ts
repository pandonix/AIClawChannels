export interface AppEnv {
  nodeEnv: string;
  port: number;
  mockGateway: boolean;
  gatewayWsUrl: string;
  gatewayOperatorToken: string | undefined;
  gatewayOperatorPassword: string | undefined;
  gatewayDeviceToken: string | undefined;
  gatewayScopes: string[];
  gatewayTlsFingerprint: string | undefined;
  gatewayDeviceIdentityPath: string | undefined;
}

export function loadEnv(): AppEnv {
  const rawScopes = (process.env.GATEWAY_SCOPES ?? "operator.read,operator.write")
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);

  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 3001),
    mockGateway: (process.env.MOCK_GATEWAY ?? "true") === "true",
    gatewayWsUrl: process.env.GATEWAY_WS_URL ?? "ws://127.0.0.1:18789",
    gatewayOperatorToken: process.env.GATEWAY_OPERATOR_TOKEN?.trim() || undefined,
    gatewayOperatorPassword: process.env.GATEWAY_OPERATOR_PASSWORD?.trim() || undefined,
    gatewayDeviceToken: process.env.GATEWAY_DEVICE_TOKEN?.trim() || undefined,
    gatewayScopes: rawScopes.length > 0 ? rawScopes : ["operator.read", "operator.write"],
    gatewayTlsFingerprint: process.env.GATEWAY_TLS_FINGERPRINT?.trim() || undefined,
    gatewayDeviceIdentityPath: process.env.GATEWAY_DEVICE_IDENTITY_PATH?.trim() || undefined
  };
}
