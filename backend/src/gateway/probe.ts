import { loadEnv } from "../config/env.js";
import { GatewayConnectionManager } from "./connection-manager.js";

async function main(): Promise<void> {
  const env = loadEnv();
  const gateway = new GatewayConnectionManager({
    url: env.gatewayWsUrl,
    token: env.gatewayOperatorToken,
    password: env.gatewayOperatorPassword,
    deviceToken: env.gatewayDeviceToken,
    tlsFingerprint: env.gatewayTlsFingerprint,
    scopes: env.gatewayScopes,
    clientId: "gateway-client",
    clientVersion: "0.1.0",
    clientMode: "probe",
    platform: process.platform,
    deviceIdentityPath: env.gatewayDeviceIdentityPath
  });

  gateway.on("state", (state) => {
    console.log(`[gateway:state] ${state.phase} attempt=${state.attempt}`);
  });

  gateway.on("event", (event) => {
    if (event.event === "tick") {
      return;
    }
    console.log(`[gateway:event] ${event.event}`);
  });

  try {
    const hello = await gateway.connect();
    console.log(
      JSON.stringify(
        {
          protocol: hello.protocol,
          type: hello.type,
          tickIntervalMs: hello.policy?.tickIntervalMs ?? null,
          auth: {
            role: hello.auth?.role ?? "operator",
            scopes: hello.auth?.scopes ?? env.gatewayScopes,
            issuedDeviceToken: Boolean(hello.auth?.deviceToken)
          }
        },
        null,
        2
      )
    );

    const health = await gateway.request<unknown>("health", {});
    console.log(JSON.stringify(health, null, 2));
  } finally {
    await gateway.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
