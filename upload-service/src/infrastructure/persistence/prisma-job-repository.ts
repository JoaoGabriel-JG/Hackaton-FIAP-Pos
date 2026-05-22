import type { JobRepository } from "../../application/ports/job-repository.js";
import type {
  CreateUploadJobInput,
  UploadJob,
} from "../../domain/upload-job.js";
import type { JobStatusValue } from "../../domain/job-status.js";
import { prisma } from "./prisma-client.js";

function toDomain(record: {
  id: string;
  originalName: string;
  filePath: string;
  status: string;
  createdAt: Date;
}): UploadJob {
  return {
    id: record.id,
    originalName: record.originalName,
    filePath: record.filePath,
    status: record.status as JobStatusValue,
    createdAt: record.createdAt,
  };
}

export class PrismaJobRepository implements JobRepository {
  async create(input: CreateUploadJobInput): Promise<UploadJob> {
    const record = await prisma.uploadJob.create({
      data: {
        originalName: input.originalName,
        filePath: input.filePath,
        status: input.status,
      },
    });
    return toDomain(record);
  }

  async updateStatus(id: string, status: JobStatusValue): Promise<UploadJob> {
    const record = await prisma.uploadJob.update({
      where: { id },
      data: { status },
    });
    return toDomain(record);
  }
}
