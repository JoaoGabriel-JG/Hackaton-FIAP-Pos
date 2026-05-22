import type { AnalysisResult } from "../../domain/analysis-result.js";
import type { DiagramAnalysis } from "../../domain/diagram-analysis.js";

export type AnalysisRepository = {
  upsertProcessing(jobId: string): Promise<AnalysisResult>;
  markAnalyzed(jobId: string, analysis: DiagramAnalysis): Promise<AnalysisResult>;
  markError(jobId: string): Promise<AnalysisResult>;
};
