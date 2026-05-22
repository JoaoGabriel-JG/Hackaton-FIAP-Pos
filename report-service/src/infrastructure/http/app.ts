import cors from "cors";
import express, { type Express } from "express";
import type { Logger } from "pino";
import pinoHttpImport from "pino-http";
import type { RequestHandler } from "express";

type PinoHttpFn = (opts?: {
  logger: Logger;
  customProps?: () => Record<string, string>;
}) => RequestHandler;

const pinoHttp = pinoHttpImport as unknown as PinoHttpFn;

export function createApp(logger: Logger): Express {
  const app = express();

  app.use(cors());
  app.use(
    pinoHttp({
      logger,
      customProps: () => ({ service: "report-service" }),
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/reports/:jobId/status", (req, res) => {
    res.json({
      jobId: req.params.jobId,
      status: "processing",
    });
  });

  app.get("/reports/:jobId", (req, res) => {
    res.json({
      jobId: req.params.jobId,
      summary: "Report not generated yet",
      findings: [],
      recommendations: [],
    });
  });

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction, // eslint-disable-line @typescript-eslint/no-unused-vars
    ) => {
      logger.error({ service: "report-service", message: err.message }, "unhandled error");
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
}
