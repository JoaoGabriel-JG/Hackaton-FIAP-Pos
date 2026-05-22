import type { DiagramAnalysis } from "../../domain/diagram-analysis.js";

export type DiagramAnalyzer = {
  analyze(buffer: Buffer, mimeType: string): Promise<DiagramAnalysis>;
};
