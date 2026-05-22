import type {
  CreateUploadJobInput,
  UploadJob,
} from "../../domain/upload-job.js";
import type { JobStatusValue } from "../../domain/job-status.js";

export type JobRepository = {
  create(input: CreateUploadJobInput): Promise<UploadJob>;
  updateStatus(id: string, status: JobStatusValue): Promise<UploadJob>;
};
