import type { Request, Response, NextFunction } from "express";
import type { Logger } from "pino";
import { QueuePublishError } from "../../../domain/errors/upload-errors.js";
import type { UploadDiagramUseCase } from "../../../application/use-cases/upload-diagram.use-case.js";

export type UploadHandlerDeps = {
  uploadDiagramUseCase: UploadDiagramUseCase;
  logger: Logger;
};

export function createUploadHandler(deps: UploadHandlerDeps) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "File is required (field: file)" });
        return;
      }

      const job = await deps.uploadDiagramUseCase.execute({
        originalName: req.file.originalname,
        filePath: req.file.path,
      });

      deps.logger.info(
        {
          service: "upload-service",
          jobId: job.id,
          message: "Upload received and enqueued",
        },
        "upload completed",
      );

      res.status(201).json({
        id: job.id,
        status: job.status,
        filePath: job.filePath,
        createdAt: job.createdAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof QueuePublishError) {
        deps.logger.error(
          {
            service: "upload-service",
            jobId: error.jobId,
            message: "Queue publish failed",
          },
          "upload queue error",
        );
        res.status(503).json({
          error: "Failed to enqueue processing",
          jobId: error.jobId,
        });
        return;
      }
      next(error);
    }
  };
}
