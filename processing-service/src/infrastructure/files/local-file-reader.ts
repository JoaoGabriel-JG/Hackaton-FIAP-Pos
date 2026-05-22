import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { FileReader } from "../../application/ports/file-reader.js";
import { FileNotFoundError } from "../../domain/errors/processing-errors.js";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

function inferMimeType(filePath: string): string {
  const extension = extname(filePath).toLowerCase();
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!mimeType) {
    throw new Error(`Unsupported file extension: ${extension}`);
  }
  return mimeType;
}

export class LocalFileReader implements FileReader {
  async read(filePath: string) {
    try {
      const buffer = await readFile(filePath);
      return {
        buffer,
        mimeType: inferMimeType(filePath),
      };
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        throw new FileNotFoundError(filePath, error);
      }
      throw error;
    }
  }
}
