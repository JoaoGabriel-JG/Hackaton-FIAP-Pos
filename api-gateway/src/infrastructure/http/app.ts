import cors from "cors";
import express, { type Express } from "express";
import pinoHttpImport from "pino-http";
import type { RequestHandler } from "express";
import type { Logger } from "pino";
import { correlationIdMiddleware } from "./middleware/correlation-id.js";
import { createErrorMiddleware } from "./middleware/error.js";
import { createProxyRoutes } from "./routes/proxy.routes.js";

type PinoHttpFn = (opts?: {
  logger: Logger;
  customProps?: (req: express.Request) => Record<string, string | undefined>;
}) => RequestHandler;

const pinoHttp = pinoHttpImport as unknown as PinoHttpFn;

export type AppDeps = {
  logger: Logger;
  uploadServiceUrl: string;
  reportServiceUrl: string;
};

export function createApp(deps: AppDeps): Express {
  const app = express();

  app.use(cors());
  app.use(correlationIdMiddleware);
  app.use(
    pinoHttp({
      logger: deps.logger,
      customProps: (req) => ({
        service: "api-gateway",
        correlationId: req.header("x-correlation-id"),
      }),
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(createProxyRoutes(deps));
  app.use(createErrorMiddleware(deps.logger));

  return app;
}
