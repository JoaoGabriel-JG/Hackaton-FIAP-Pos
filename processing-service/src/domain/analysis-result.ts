import type { AnalysisStatusValue } from "./analysis-status.js";

export type AnalysisResult = {
  id: string;
  jobId: string;
  status: AnalysisStatusValue;
  components: string;
  riscos: string;
  recommendations: string;
  createdAt: Date;
};
