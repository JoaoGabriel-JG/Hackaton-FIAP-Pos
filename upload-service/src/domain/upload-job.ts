import type { JobStatusValue } from "./job-status.js";

export type UploadJob = {
  id: string;
  originalName: string;
  filePath: string;
  status: JobStatusValue;
  createdAt: Date;
};

export type CreateUploadJobInput = {
  originalName: string;
  filePath: string;
  status: JobStatusValue;
};
