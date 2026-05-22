import type { ErrorRequestHandler } from "express";
import type { Logger } from "pino";

export function createErrorMiddleware(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    logger.error(
      {
        service: "api-gateway",
        correlationId: req.header("x-correlation-id"),
        method: req.method,
        path: req.originalUrl,
        message: err.message,
      },
      "unhandled error",
    );

    res.status(500).json({ error: "Internal server error" });
  };
}
