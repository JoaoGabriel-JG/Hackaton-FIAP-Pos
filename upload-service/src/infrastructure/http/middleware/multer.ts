import multer from "multer";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";

export function createUploadMiddleware(uploadDir: string) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const extension = extname(file.originalname);
      cb(null, `${randomUUID()}${extension}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed =
        file.mimetype.startsWith("image/") ||
        file.mimetype === "application/pdf";
      if (!allowed) {
        cb(new Error("Invalid file type. Only images and PDF are allowed."));
        return;
      }
      cb(null, true);
    },
  });
}
