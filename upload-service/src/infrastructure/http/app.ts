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
import type { UploadRoutesDeps } from "./routes/upload.routes.js";
import { createUploadRoutes } from "./routes/upload.routes.js";

export type AppDeps = UploadRoutesDeps & {
  logger: Logger;
};

export function createApp(deps: AppDeps): Express {
  const app = express();

  app.use(cors());
  app.use(
    pinoHttp({
      logger: deps.logger,
      customProps: () => ({ service: "upload-service" }),
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(createUploadRoutes(deps));

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction, // eslint-disable-line @typescript-eslint/no-unused-vars
    ) => {
      if (err.message.includes("Invalid file type")) {
        res.status(422).json({ error: err.message });
        return;
      }
      deps.logger.error(
        { service: "upload-service", message: err.message },
        "unhandled error",
      );
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
}
