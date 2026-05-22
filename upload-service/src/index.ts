import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import pino from "pino";
import { UploadDiagramUseCase } from "./application/use-cases/upload-diagram.use-case.js";
import { env } from "./infrastructure/config/env.js";
import { createApp } from "./infrastructure/http/app.js";
import { createUploadMiddleware } from "./infrastructure/http/middleware/multer.js";
import { RabbitMqPublisher } from "./infrastructure/messaging/rabbitmq-publisher.js";
import { PrismaJobRepository } from "./infrastructure/persistence/prisma-job-repository.js";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "upload-service" },
});

async function main() {
  const uploadDir = resolve(process.cwd(), env.uploadDir);
  await mkdir(uploadDir, { recursive: true });

  const jobRepository = new PrismaJobRepository();
  const queuePublisher = new RabbitMqPublisher();
  await queuePublisher.connect();

  const uploadDiagramUseCase = new UploadDiagramUseCase({
    jobRepository,
    queuePublisher,
  });

  const uploadMiddleware = createUploadMiddleware(uploadDir);
  const app = createApp({
    logger,
    uploadDiagramUseCase,
    uploadMiddleware,
  });

  const server = app.listen(env.port, () => {
    logger.info({ port: env.port, message: "Upload service started" });
  });

  const shutdown = async () => {
    logger.info({ message: "Shutting down upload service" });
    server.close();
    await queuePublisher.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error: unknown) => {
  logger.fatal({ err: error, message: "Failed to start upload service" });
  process.exit(1);
});
