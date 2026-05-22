import { JobStatus } from "../../domain/job-status.js";
import { QueuePublishError } from "../../domain/errors/upload-errors.js";
import type { UploadJob } from "../../domain/upload-job.js";
import type { JobRepository } from "../ports/job-repository.js";
import type { QueuePublisher } from "../ports/queue-publisher.js";

export type UploadDiagramInput = {
  originalName: string;
  filePath: string;
};

export type UploadDiagramUseCaseDeps = {
  jobRepository: JobRepository;
  queuePublisher: QueuePublisher;
};

export class UploadDiagramUseCase {
  constructor(private readonly deps: UploadDiagramUseCaseDeps) {}

  async execute(input: UploadDiagramInput): Promise<UploadJob> {
    const job = await this.deps.jobRepository.create({
      originalName: input.originalName,
      filePath: input.filePath,
      status: JobStatus.RECEBIDO,
    });

    try {
      await this.deps.queuePublisher.publishDiagramProcessing({
        jobId: job.id,
        filePath: job.filePath,
        schemaVersion: 1,
      });
    } catch (error) {
      await this.deps.jobRepository.updateStatus(job.id, JobStatus.FALHA);
      throw new QueuePublishError(
        "Failed to publish diagram processing message",
        job.id,
        error,
      );
    }

    return job;
  }
}
