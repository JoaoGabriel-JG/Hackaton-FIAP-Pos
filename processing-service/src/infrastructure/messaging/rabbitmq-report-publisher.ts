import amqp, { type Channel } from "amqplib";
import type {
  DiagramReportMessage,
  ReportQueuePublisher,
} from "../../application/ports/report-queue-publisher.js";
import { env } from "../config/env.js";

export class RabbitMqReportPublisher implements ReportQueuePublisher {
  private connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  private channel: Channel | null = null;

  async connect(): Promise<void> {
    if (this.channel) {
      return;
    }
    const connection = await amqp.connect(env.rabbitmqUrl);
    this.connection = connection;
    const channel = await connection.createChannel();
    this.channel = channel;
    await channel.assertQueue(env.rabbitmqQueueReport, { durable: true });
  }

  async publish(message: DiagramReportMessage): Promise<void> {
    await this.connect();
    if (!this.channel) {
      throw new Error("RabbitMQ channel is not available");
    }
    const payload = Buffer.from(JSON.stringify(message));
    const sent = this.channel.sendToQueue(env.rabbitmqQueueReport, payload, {
      persistent: true,
      contentType: "application/json",
    });
    if (!sent) {
      throw new Error("Failed to enqueue diagram report message");
    }
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.channel = null;
    this.connection = null;
  }
}
