export type DiagramProcessingMessage = {
  jobId: string;
  filePath: string;
  schemaVersion?: number;
};

export type QueuePublisher = {
  publishDiagramProcessing(message: DiagramProcessingMessage): Promise<void>;
};
