export interface GatewayErrorPayload {
  message?: string;
  details?: unknown;
}

export interface GatewayEventFrame<TPayload = unknown> {
  type: "event";
  event: string;
  payload?: TPayload;
  seq?: number;
  stateVersion?: number;
}

export interface GatewayResponseFrame<TPayload = unknown> {
  type: "res";
  id: string;
  ok: boolean;
  payload?: TPayload;
  error?: GatewayErrorPayload;
}

export interface GatewayRequestFrame<TParams = unknown> {
  type: "req";
  id: string;
  method: string;
  params?: TParams;
}

export interface GatewayConnectChallengePayload {
  nonce: string;
  ts?: number;
}

export interface GatewayHelloOk {
  type: "hello-ok";
  protocol: number;
  policy?: {
    tickIntervalMs?: number;
  };
  auth?: {
    deviceToken?: string;
    role?: string;
    scopes?: string[];
  };
}

export interface GatewayDeviceIdentity {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

export interface GatewayClientOptions {
  url: string;
  token?: string | undefined;
  password?: string | undefined;
  deviceToken?: string | undefined;
  tlsFingerprint?: string | undefined;
  role?: "operator" | "node" | undefined;
  scopes: string[];
  clientId: string;
  clientVersion: string;
  clientMode: "backend" | "probe" | "ui";
  platform?: string | undefined;
  deviceFamily?: string | undefined;
  instanceId?: string | undefined;
  connectTimeoutMs?: number | undefined;
  deviceIdentityPath?: string | undefined;
}
