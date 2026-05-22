import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });

export const env = {
  port: Number(process.env.PORT ?? 3003),
};
