import amqp, { type Channel, type ConsumeMessage } from "amqplib";
import type { Logger } from "pino";
import type { ProcessDiagramUseCase } from "../../application/use-cases/process-diagram.use-case.js";
import { env } from "../config/env.js";

export type DiagramProcessingMessage = {
  jobId: string;
  filePath: string;
  schemaVersion?: number;
};

export type RabbitMqWorkerDeps = {
  processDiagramUseCase: ProcessDiagramUseCase;
  logger: Logger;
};

export class RabbitMqWorker {
  private connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  private channel: Channel | null = null;
  private consumerTag: string | null = null;

  constructor(private readonly deps: RabbitMqWorkerDeps) {}

  async start(): Promise<void> {
    const connection = await amqp.connect(env.rabbitmqUrl);
    this.connection = connection;
    const channel = await connection.createChannel();
    this.channel = channel;

    await channel.assertQueue(env.rabbitmqQueueProcessing, { durable: true });
    await channel.prefetch(1);

    const { consumerTag } = await channel.consume(
      env.rabbitmqQueueProcessing,
      (message) => void this.handleMessage(message),
      { noAck: false },
    );
    this.consumerTag = consumerTag;

    this.deps.logger.info(
      {
        service: "processing-service",
        queue: env.rabbitmqQueueProcessing,
        message: "Worker started",
      },
      "rabbitmq worker ready",
    );
  }

  private async handleMessage(message: ConsumeMessage | null): Promise<void> {
    if (!message || !this.channel) {
      return;
    }

    let jobId: string | undefined;

    try {
      const payload = JSON.parse(
        message.content.toString(),
      ) as DiagramProcessingMessage;

      jobId = payload.jobId;
      if (!payload.jobId || !payload.filePath) {
        throw new Error("Invalid message: jobId and filePath are required");
      }

      this.deps.logger.info(
        {
          service: "processing-service",
          jobId: payload.jobId,
          message: "Processing diagram",
        },
        "diagram processing started",
      );

      await this.deps.processDiagramUseCase.execute({
        jobId: payload.jobId,
        filePath: payload.filePath,
      });

      this.channel.ack(message);

      this.deps.logger.info(
        {
          service: "processing-service",
          jobId: payload.jobId,
          message: "Diagram processed successfully",
        },
        "diagram processing completed",
      );
    } catch (error) {
      this.deps.logger.error(
        {
          service: "processing-service",
          jobId,
          err: error,
          message: "Diagram processing failed",
        },
        "diagram processing error",
      );
      this.channel.ack(message);
    }
  }

  async stop(): Promise<void> {
    if (this.channel && this.consumerTag) {
      await this.channel.cancel(this.consumerTag);
    }
    await this.channel?.close();
    await this.connection?.close();
    this.channel = null;
    this.connection = null;
    this.consumerTag = null;
  }
}
