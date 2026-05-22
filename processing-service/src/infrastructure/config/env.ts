import { config } from "dotenv";
import { isAbsolute, resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const uploadFilesRootRaw =
  process.env.UPLOAD_FILES_ROOT ?? "../upload-service/uploads";

export const env = {
  databaseUrl: required("DATABASE_URL"),
  rabbitmqUrl: required("RABBITMQ_URL"),
  rabbitmqQueueProcessing:
    process.env.RABBITMQ_QUEUE_PROCESSING ?? "diagram_processing",
  rabbitmqQueueReport: process.env.RABBITMQ_QUEUE_REPORT ?? "diagram_report",
  uploadFilesRoot: isAbsolute(uploadFilesRootRaw)
    ? uploadFilesRootRaw
    : resolve(process.cwd(), uploadFilesRootRaw),
  geminiApiKey: required("GEMINI_API_KEY"),
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
};

export function resolveUploadFilePath(filePath: string): string {
  if (isAbsolute(filePath)) {
    return filePath;
  }
  return resolve(env.uploadFilesRoot, filePath);
}
