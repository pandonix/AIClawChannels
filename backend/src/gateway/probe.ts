import { loadEnv } from "../config/env.js";
import { GatewayClient } from "./client.js";

async function main(): Promise<void> {
  const env = loadEnv();
  const client = new GatewayClient({
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

  client.on("event", (event) => {
    if (event.event === "tick") {
      return;
    }
    console.log(`[gateway:event] ${event.event}`);
  });

  try {
    const hello = await client.connect();
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

    const health = await client.request<unknown>("health", {});
    console.log(JSON.stringify(health, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

