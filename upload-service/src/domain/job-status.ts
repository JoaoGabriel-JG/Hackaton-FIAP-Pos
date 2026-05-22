export const JobStatus = {
  RECEBIDO: "Recebido",
  FALHA: "Falha",
} as const;

export type JobStatusValue = (typeof JobStatus)[keyof typeof JobStatus];
