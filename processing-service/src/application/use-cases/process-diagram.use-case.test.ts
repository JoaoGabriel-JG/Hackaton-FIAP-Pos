import { describe, expect, it, jest } from "@jest/globals";
import { AnalysisStatus } from "../../domain/analysis-status.js";
import type { AnalysisResult } from "../../domain/analysis-result.js";
import {
  FileNotFoundError,
  InvalidAiResponseError,
} from "../../domain/errors/processing-errors.js";
import { ReportPublishError } from "../../domain/errors/processing-errors.js";
import type { AnalysisRepository } from "../ports/analysis-repository.js";
import type { DiagramAnalyzer } from "../ports/diagram-analyzer.js";
import type { FileReader } from "../ports/file-reader.js";
import type { ReportQueuePublisher } from "../ports/report-queue-publisher.js";
import { ProcessDiagramUseCase } from "./process-diagram.use-case.js";

const createdAt = new Date("2026-05-18T12:00:00.000Z");

const analysis = {
  components: ["API Gateway", "PostgreSQL"],
  risks: ["Single point of failure"],
  recommendations: ["Add cache layer"],
};

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    id: "analysis-1",
    jobId: "job-1",
    status: AnalysisStatus.ANALISADO,
    components: JSON.stringify(analysis.components),
    riscos: JSON.stringify(analysis.risks),
    recommendations: JSON.stringify(analysis.recommendations),
    createdAt,
    ...overrides,
  };
}

function createMocks() {
  const analysisRepository: jest.Mocked<AnalysisRepository> = {
    upsertProcessing: jest.fn(),
    markAnalyzed: jest.fn(),
    markError: jest.fn(),
  };
  const fileReader: jest.Mocked<FileReader> = {
    read: jest.fn(),
  };
  const diagramAnalyzer: jest.Mocked<DiagramAnalyzer> = {
    analyze: jest.fn(),
  };
  const reportQueuePublisher: jest.Mocked<ReportQueuePublisher> = {
    publish: jest.fn(),
  };
  return { analysisRepository, fileReader, diagramAnalyzer, reportQueuePublisher };
}

function createUseCase(
  mocks: ReturnType<typeof createMocks>,
  resolveFilePath = (path: string) => path,
) {
  return new ProcessDiagramUseCase({
    ...mocks,
    resolveFilePath,
  });
}

describe("ProcessDiagramUseCase", () => {
  it("processes diagram and publishes report", async () => {
    const mocks = createMocks();
    const processing = buildResult({ status: AnalysisStatus.EM_PROCESSAMENTO });
    const analyzed = buildResult();

    mocks.analysisRepository.upsertProcessing.mockResolvedValue(processing);
    mocks.fileReader.read.mockResolvedValue({
      buffer: Buffer.from("fake"),
      mimeType: "image/png",
    });
    mocks.diagramAnalyzer.analyze.mockResolvedValue(analysis);
    mocks.analysisRepository.markAnalyzed.mockResolvedValue(analyzed);
    mocks.reportQueuePublisher.publish.mockResolvedValue();

    const useCase = createUseCase(mocks);
    const result = await useCase.execute({
      jobId: "job-1",
      filePath: "/uploads/diagram.png",
    });

    expect(mocks.analysisRepository.upsertProcessing).toHaveBeenCalledWith(
      "job-1",
    );
    expect(mocks.fileReader.read).toHaveBeenCalledWith("/uploads/diagram.png");
    expect(mocks.diagramAnalyzer.analyze).toHaveBeenCalled();
    expect(mocks.analysisRepository.markAnalyzed).toHaveBeenCalledWith(
      "job-1",
      analysis,
    );
    expect(mocks.reportQueuePublisher.publish).toHaveBeenCalledWith({
      jobId: "job-1",
      components: analysis.components,
      riscos: analysis.risks,
      recommendations: analysis.recommendations,
      schemaVersion: 1,
    });
    expect(result).toEqual(analyzed);
  });

  it("marks error when file is not found and does not publish", async () => {
    const mocks = createMocks();
    const processing = buildResult({ status: AnalysisStatus.EM_PROCESSAMENTO });
    const errored = buildResult({ status: AnalysisStatus.ERRO });

    mocks.analysisRepository.upsertProcessing.mockResolvedValue(processing);
    mocks.fileReader.read.mockRejectedValue(
      new FileNotFoundError("/uploads/missing.png"),
    );
    mocks.analysisRepository.markError.mockResolvedValue(errored);

    const useCase = createUseCase(mocks);

    await expect(
      useCase.execute({ jobId: "job-1", filePath: "/uploads/missing.png" }),
    ).rejects.toBeInstanceOf(FileNotFoundError);

    expect(mocks.analysisRepository.markError).toHaveBeenCalledWith("job-1");
    expect(mocks.reportQueuePublisher.publish).not.toHaveBeenCalled();
  });

  it("marks error when report publish fails", async () => {
    const mocks = createMocks();
    const processing = buildResult({ status: AnalysisStatus.EM_PROCESSAMENTO });
    const analyzed = buildResult();
    const errored = buildResult({ status: AnalysisStatus.ERRO });

    mocks.analysisRepository.upsertProcessing.mockResolvedValue(processing);
    mocks.fileReader.read.mockResolvedValue({
      buffer: Buffer.from("fake"),
      mimeType: "application/pdf",
    });
    mocks.diagramAnalyzer.analyze.mockResolvedValue(analysis);
    mocks.analysisRepository.markAnalyzed.mockResolvedValue(analyzed);
    mocks.reportQueuePublisher.publish.mockRejectedValue(
      new Error("broker down"),
    );
    mocks.analysisRepository.markError.mockResolvedValue(errored);

    const useCase = createUseCase(mocks);

    await expect(
      useCase.execute({ jobId: "job-1", filePath: "/uploads/diagram.pdf" }),
    ).rejects.toBeInstanceOf(ReportPublishError);

    expect(mocks.analysisRepository.markError).toHaveBeenCalledWith("job-1");
  });

  it("uses fallback analysis when AI provider is unavailable", async () => {
    const mocks = createMocks();
    const processing = buildResult({ status: AnalysisStatus.EM_PROCESSAMENTO });
    const analyzed = buildResult({
      components: JSON.stringify(["Componente nao identificado pela IA"]),
      riscos: JSON.stringify([
        "Analise automatica indisponivel no momento (fallback aplicado)",
      ]),
      recommendations: JSON.stringify([
        "Reprocessar o job quando a cota/servico de IA estiver disponivel",
        "Revisar manualmente o diagrama para validacao complementar",
      ]),
    });

    mocks.analysisRepository.upsertProcessing.mockResolvedValue(processing);
    mocks.fileReader.read.mockResolvedValue({
      buffer: Buffer.from("fake"),
      mimeType: "application/pdf",
    });
    mocks.diagramAnalyzer.analyze.mockRejectedValue(
      new InvalidAiResponseError("quota", "job-1"),
    );
    mocks.analysisRepository.markAnalyzed.mockResolvedValue(analyzed);
    mocks.reportQueuePublisher.publish.mockResolvedValue();

    const useCase = createUseCase(mocks);
    const result = await useCase.execute({
      jobId: "job-1",
      filePath: "/uploads/diagram.pdf",
    });

    expect(mocks.analysisRepository.markAnalyzed).toHaveBeenCalledWith(
      "job-1",
      expect.objectContaining({
        components: ["Componente nao identificado pela IA"],
      }),
    );
    expect(result).toEqual(analyzed);
    expect(mocks.analysisRepository.markError).not.toHaveBeenCalled();
  });

  it("resolves relative file paths", async () => {
    const mocks = createMocks();
    const processing = buildResult({ status: AnalysisStatus.EM_PROCESSAMENTO });
    const analyzed = buildResult();

    mocks.analysisRepository.upsertProcessing.mockResolvedValue(processing);
    mocks.fileReader.read.mockResolvedValue({
      buffer: Buffer.from("fake"),
      mimeType: "image/png",
    });
    mocks.diagramAnalyzer.analyze.mockResolvedValue(analysis);
    mocks.analysisRepository.markAnalyzed.mockResolvedValue(analyzed);
    mocks.reportQueuePublisher.publish.mockResolvedValue();

    const useCase = createUseCase(
      mocks,
      (path) => `/base/${path}`,
    );

    await useCase.execute({ jobId: "job-1", filePath: "diagram.png" });

    expect(mocks.fileReader.read).toHaveBeenCalledWith("/base/diagram.png");
  });
});
