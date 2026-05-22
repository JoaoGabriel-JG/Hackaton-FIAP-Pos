import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });

export const env = {
  port: Number(process.env.PORT ?? 3000),
  uploadServiceUrl: process.env.UPLOAD_SERVICE_URL ?? "http://localhost:3001",
  reportServiceUrl: process.env.REPORT_SERVICE_URL ?? "http://localhost:3003",
};
