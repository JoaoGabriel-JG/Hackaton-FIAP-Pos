import cors from "cors";
import express, { type Express } from "express";
import type { Logger } from "pino";
import pinoHttpImport from "pino-http";
import type { RequestHandler } from "express";
import { prisma } from "../persistence/prisma-client.js";

type PinoHttpFn = (opts?: {
  logger: Logger;
  customProps?: () => Record<string, string>;
}) => RequestHandler;

const pinoHttp = pinoHttpImport as unknown as PinoHttpFn;

function toApiStatus(
  status: string | null,
): "Recebido" | "Em processamento" | "Analisado" | "Erro" {
  if (status === "Analisado") {
    return "Analisado";
  }
  if (status === "Erro") {
    return "Erro";
  }
  if (status === "Em processamento") {
    return "Em processamento";
  }
  return "Recebido";
}

function parseJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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

  app.get("/reports/:jobId/status", async (req, res) => {
    const result = await prisma.analysisResult.findUnique({
      where: { jobId: req.params.jobId },
    });

    res.json({
      jobId: req.params.jobId,
      status: toApiStatus(result?.status ?? null),
    });
  });

  app.get("/reports/:jobId", async (req, res) => {
    const result = await prisma.analysisResult.findUnique({
      where: { jobId: req.params.jobId },
    });

    const apiStatus = toApiStatus(result?.status ?? null);
    const components = parseJsonArray(result?.components ?? "[]");
    const risks = parseJsonArray(result?.riscos ?? "[]");
    const recommendations = parseJsonArray(result?.recommendations ?? "[]");

    res.json({
      jobId: req.params.jobId,
      status: apiStatus,
      summary:
        apiStatus === "Analisado"
          ? "Relatorio gerado com sucesso"
          : apiStatus === "Erro"
            ? "Falha ao gerar relatorio"
            : "Relatorio ainda nao gerado",
      components,
      risks,
      recommendations,
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
