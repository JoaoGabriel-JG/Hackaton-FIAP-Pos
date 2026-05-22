export const AnalysisStatus = {
  EM_PROCESSAMENTO: "Em processamento",
  ANALISADO: "Analisado",
  ERRO: "Erro",
} as const;

export type AnalysisStatusValue =
  (typeof AnalysisStatus)[keyof typeof AnalysisStatus];
