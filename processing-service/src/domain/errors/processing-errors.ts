export class FileNotFoundError extends Error {
  constructor(
    readonly filePath: string,
    cause?: unknown,
  ) {
    super(`File not found: ${filePath}`);
    this.name = "FileNotFoundError";
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

export class InvalidAiResponseError extends Error {
  constructor(
    message: string,
    readonly jobId: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "InvalidAiResponseError";
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

export class ReportPublishError extends Error {
  constructor(
    message: string,
    readonly jobId: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "ReportPublishError";
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}
