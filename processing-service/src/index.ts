import pino from "pino";
import { ProcessDiagramUseCase } from "./application/use-cases/process-diagram.use-case.js";
import { GeminiDiagramAnalyzer } from "./infrastructure/ai/gemini-diagram-analyzer.js";
import { resolveUploadFilePath } from "./infrastructure/config/env.js";
import { LocalFileReader } from "./infrastructure/files/local-file-reader.js";
import { RabbitMqReportPublisher } from "./infrastructure/messaging/rabbitmq-report-publisher.js";
import { RabbitMqWorker } from "./infrastructure/messaging/rabbitmq-worker.js";
import { PrismaAnalysisRepository } from "./infrastructure/persistence/prisma-analysis-repository.js";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "processing-service" },
});

async function main() {
  const analysisRepository = new PrismaAnalysisRepository();
  const fileReader = new LocalFileReader();
  const diagramAnalyzer = new GeminiDiagramAnalyzer();
  const reportQueuePublisher = new RabbitMqReportPublisher();

  const processDiagramUseCase = new ProcessDiagramUseCase({
    analysisRepository,
    fileReader,
    diagramAnalyzer,
    reportQueuePublisher,
    resolveFilePath: resolveUploadFilePath,
  });

  const worker = new RabbitMqWorker({
    processDiagramUseCase,
    logger,
  });

  await worker.start();

  const shutdown = async () => {
    logger.info({ message: "Shutting down processing service" });
    await worker.stop();
    await reportQueuePublisher.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error: unknown) => {
  logger.fatal({ err: error, message: "Failed to start processing service" });
  process.exit(1);
});
