import { Router } from "express";
import {
  createUploadHandler,
  type UploadHandlerDeps,
} from "../handlers/upload.handler.js";
import { createUploadMiddleware } from "../middleware/multer.js";

type UploadMiddleware = ReturnType<typeof createUploadMiddleware>;

export type UploadRoutesDeps = UploadHandlerDeps & {
  uploadMiddleware: UploadMiddleware;
};

export function createUploadRoutes(deps: UploadRoutesDeps): Router {
  const router = Router();
  const handler = createUploadHandler(deps);

  router.post(
    "/uploads",
    deps.uploadMiddleware.single("file"),
    handler,
  );

  return router;
}
