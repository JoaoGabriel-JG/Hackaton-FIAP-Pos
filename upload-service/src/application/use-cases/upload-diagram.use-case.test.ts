import { describe, expect, it, jest } from "@jest/globals";
import { JobStatus } from "../../domain/job-status.js";
import { QueuePublishError } from "../../domain/errors/upload-errors.js";
import type { UploadJob } from "../../domain/upload-job.js";
import type { JobRepository } from "../ports/job-repository.js";
import type { QueuePublisher } from "../ports/queue-publisher.js";
import { UploadDiagramUseCase } from "./upload-diagram.use-case.js";

const createdAt = new Date("2026-05-18T12:00:00.000Z");

function buildJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: "job-1",
    originalName: "diagram.png",
    filePath: "/uploads/job-1.png",
    status: JobStatus.RECEBIDO,
    createdAt,
    ...overrides,
  };
}

function createMocks() {
  const jobRepository: jest.Mocked<JobRepository> = {
    create: jest.fn(),
    updateStatus: jest.fn(),
  };
  const queuePublisher: jest.Mocked<QueuePublisher> = {
    publishDiagramProcessing: jest.fn(),
  };
  return { jobRepository, queuePublisher };
}

describe("UploadDiagramUseCase", () => {
  it("persists job as Recebido and publishes to queue", async () => {
    const { jobRepository, queuePublisher } = createMocks();
    const job = buildJob();
    jobRepository.create.mockResolvedValue(job);
    queuePublisher.publishDiagramProcessing.mockResolvedValue();

    const useCase = new UploadDiagramUseCase({
      jobRepository,
      queuePublisher,
    });

    const result = await useCase.execute({
      originalName: "diagram.png",
      filePath: "/uploads/job-1.png",
    });

    expect(jobRepository.create).toHaveBeenCalledWith({
      originalName: "diagram.png",
      filePath: "/uploads/job-1.png",
      status: JobStatus.RECEBIDO,
    });
    expect(queuePublisher.publishDiagramProcessing).toHaveBeenCalledWith({
      jobId: "job-1",
      filePath: "/uploads/job-1.png",
      schemaVersion: 1,
    });
    expect(result).toEqual(job);
  });

  it("marks job as Falha when queue publish fails", async () => {
    const { jobRepository, queuePublisher } = createMocks();
    const job = buildJob();
    jobRepository.create.mockResolvedValue(job);
    jobRepository.updateStatus.mockResolvedValue({
      ...job,
      status: JobStatus.FALHA,
    });
    queuePublisher.publishDiagramProcessing.mockRejectedValue(
      new Error("broker down"),
    );

    const useCase = new UploadDiagramUseCase({
      jobRepository,
      queuePublisher,
    });

    await expect(
      useCase.execute({
        originalName: "diagram.png",
        filePath: "/uploads/job-1.png",
      }),
    ).rejects.toBeInstanceOf(QueuePublishError);

    expect(jobRepository.updateStatus).toHaveBeenCalledWith(
      "job-1",
      JobStatus.FALHA,
    );
  });
});
