import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: required("DATABASE_URL"),
  rabbitmqUrl: required("RABBITMQ_URL"),
  rabbitmqQueueProcessing:
    process.env.RABBITMQ_QUEUE_PROCESSING ?? "diagram_processing",
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
};
