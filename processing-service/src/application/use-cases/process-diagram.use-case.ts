import type { AnalysisResult } from "../../domain/analysis-result.js";
import { ReportPublishError } from "../../domain/errors/processing-errors.js";
import type { AnalysisRepository } from "../ports/analysis-repository.js";
import type { DiagramAnalyzer } from "../ports/diagram-analyzer.js";
import type { FileReader } from "../ports/file-reader.js";
import type { ReportQueuePublisher } from "../ports/report-queue-publisher.js";

export type ProcessDiagramInput = {
  jobId: string;
  filePath: string;
};

export type ProcessDiagramUseCaseDeps = {
  analysisRepository: AnalysisRepository;
  fileReader: FileReader;
  diagramAnalyzer: DiagramAnalyzer;
  reportQueuePublisher: ReportQueuePublisher;
  resolveFilePath: (filePath: string) => string;
};

export class ProcessDiagramUseCase {
  constructor(private readonly deps: ProcessDiagramUseCaseDeps) {}

  async execute(input: ProcessDiagramInput): Promise<AnalysisResult> {
    await this.deps.analysisRepository.upsertProcessing(input.jobId);

    try {
      const resolvedPath = this.deps.resolveFilePath(input.filePath);
      const file = await this.deps.fileReader.read(resolvedPath);
      const analysis = await this.deps.diagramAnalyzer.analyze(
        file.buffer,
        file.mimeType,
      );

      const result = await this.deps.analysisRepository.markAnalyzed(
        input.jobId,
        analysis,
      );

      try {
        await this.deps.reportQueuePublisher.publish({
          jobId: input.jobId,
          components: analysis.components,
          riscos: analysis.risks,
          recommendations: analysis.recommendations,
          schemaVersion: 1,
        });
      } catch (error) {
        await this.deps.analysisRepository.markError(input.jobId);
        throw new ReportPublishError(
          "Failed to publish diagram report message",
          input.jobId,
          error,
        );
      }

      return result;
    } catch (error) {
      if (!(error instanceof ReportPublishError)) {
        await this.deps.analysisRepository.markError(input.jobId);
      }
      throw error;
    }
  }
}
