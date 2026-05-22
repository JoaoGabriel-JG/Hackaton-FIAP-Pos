export type DiagramReportMessage = {
  jobId: string;
  components: string[];
  riscos: string[];
  recommendations: string[];
  schemaVersion?: number;
};

export type ReportQueuePublisher = {
  publish(message: DiagramReportMessage): Promise<void>;
};
