import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const correlationIdMiddleware: RequestHandler = (req, res, next) => {
  const incoming = req.header("x-correlation-id");
  const correlationId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();

  req.headers["x-correlation-id"] = correlationId;
  res.setHeader("x-correlation-id", correlationId);

  next();
};
