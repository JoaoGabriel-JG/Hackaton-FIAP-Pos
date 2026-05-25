import { createProxyMiddleware } from "http-proxy-middleware";
import { Router, type Response } from "express";
import type { Logger } from "pino";

export type ProxyRoutesDeps = {
  logger: Logger;
  uploadServiceUrl: string;
  reportServiceUrl: string;
};

export function createProxyRoutes(deps: ProxyRoutesDeps): Router {
  const router = Router();

  const onProxyError = (route: string) => (err: Error, req: unknown, res: unknown) => {
    const request = req as { method?: string; originalUrl?: string; headers?: Record<string, unknown> };
    const response = res as Response;
    deps.logger.error(
      {
        service: "api-gateway",
        route,
        correlationId: request.headers?.["x-correlation-id"],
        method: request.method,
        path: request.originalUrl,
        message: err.message,
      },
      "proxy request failed",
    );

    if (!response.headersSent) {
      response.status(502).json({ error: "Bad gateway" });
    }
  };

  router.post(
    "/api/uploads",
    createProxyMiddleware({
      target: deps.uploadServiceUrl,
      changeOrigin: true,
      proxyTimeout: 2000,
      timeout: 2000,
      pathRewrite: { "^/api/uploads$": "/uploads" },
      on: {
        error: onProxyError("upload"),
      },
    }),
  );

  router.get(
    "/api/reports/:jobId/status",
    createProxyMiddleware({
      target: deps.reportServiceUrl,
      changeOrigin: true,
      proxyTimeout: 2000,
      timeout: 2000,
      pathRewrite: { "^/api/reports/": "/reports/" },
      on: {
        error: onProxyError("report-status"),
      },
    }),
  );

  router.get(
    "/api/reports/:jobId",
    createProxyMiddleware({
      target: deps.reportServiceUrl,
      changeOrigin: true,
      proxyTimeout: 2000,
      timeout: 2000,
      pathRewrite: { "^/api/reports/": "/reports/" },
      on: {
        error: onProxyError("report"),
      },
    }),
  );

  return router;
}
