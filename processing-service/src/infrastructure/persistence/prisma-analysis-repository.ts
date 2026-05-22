import type { AnalysisRepository } from "../../application/ports/analysis-repository.js";
import type { AnalysisResult } from "../../domain/analysis-result.js";
import { AnalysisStatus } from "../../domain/analysis-status.js";
import type { DiagramAnalysis } from "../../domain/diagram-analysis.js";
import { prisma } from "./prisma-client.js";

function toDomain(record: {
  id: string;
  jobId: string;
  status: string;
  components: string;
  riscos: string;
  recommendations: string;
  createdAt: Date;
}): AnalysisResult {
  return {
    id: record.id,
    jobId: record.jobId,
    status: record.status as AnalysisResult["status"],
    components: record.components,
    riscos: record.riscos,
    recommendations: record.recommendations,
    createdAt: record.createdAt,
  };
}

export class PrismaAnalysisRepository implements AnalysisRepository {
  async upsertProcessing(jobId: string): Promise<AnalysisResult> {
    const record = await prisma.analysisResult.upsert({
      where: { jobId },
      create: {
        jobId,
        status: AnalysisStatus.EM_PROCESSAMENTO,
        components: "[]",
        riscos: "[]",
        recommendations: "[]",
      },
      update: {
        status: AnalysisStatus.EM_PROCESSAMENTO,
        components: "[]",
        riscos: "[]",
        recommendations: "[]",
      },
    });
    return toDomain(record);
  }

  async markAnalyzed(
    jobId: string,
    analysis: DiagramAnalysis,
  ): Promise<AnalysisResult> {
    const record = await prisma.analysisResult.update({
      where: { jobId },
      data: {
        status: AnalysisStatus.ANALISADO,
        components: JSON.stringify(analysis.components),
        riscos: JSON.stringify(analysis.risks),
        recommendations: JSON.stringify(analysis.recommendations),
      },
    });
    return toDomain(record);
  }

  async markError(jobId: string): Promise<AnalysisResult> {
    const record = await prisma.analysisResult.update({
      where: { jobId },
      data: { status: AnalysisStatus.ERRO },
    });
    return toDomain(record);
  }
}
