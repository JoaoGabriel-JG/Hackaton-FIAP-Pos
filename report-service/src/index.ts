import pino from "pino";
import { env } from "./infrastructure/config/env.js";
import { createApp } from "./infrastructure/http/app.js";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "report-service" },
});

async function main() {
  const app = createApp(logger);

  const server = app.listen(env.port, () => {
    logger.info({ port: env.port, message: "Report service started" });
  });

  const shutdown = async () => {
    logger.info({ message: "Shutting down report service" });
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error: unknown) => {
  logger.fatal({ err: error, message: "Failed to start report service" });
  process.exit(1);
});
