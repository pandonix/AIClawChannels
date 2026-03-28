import type { Plugin } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function healthcheckPlugin(): Plugin {
  return {
    name: "dev-healthcheck",
    configureServer(server) {
      server.middlewares.use("/__health", (req, res) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
          res.statusCode = 405;
          res.end();
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("ok");
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), healthcheckPlugin()],
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
