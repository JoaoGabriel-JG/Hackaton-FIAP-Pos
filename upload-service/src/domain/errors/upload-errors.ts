export class QueuePublishError extends Error {
  constructor(
    message: string,
    readonly jobId: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "QueuePublishError";
  }
}
