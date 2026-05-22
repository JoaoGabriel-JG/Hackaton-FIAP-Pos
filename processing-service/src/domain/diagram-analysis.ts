import { z } from "zod";

export const diagramAnalysisSchema = z.object({
  components: z.array(z.string()),
  risks: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export type DiagramAnalysis = z.infer<typeof diagramAnalysisSchema>;

export const DIAGRAM_ANALYSIS_PROMPT =
  'Você é um Arquiteto de Software. Analise o diagrama anexo e retorne um JSON estrito, sem markdown ou texto extra, com 3 arrays de strings: "components" (tecnologias identificadas), "risks" (gargalos ou falhas de segurança), "recommendations" (melhorias)';

export function parseDiagramAnalysis(raw: string): DiagramAnalysis {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed: unknown = JSON.parse(withoutFence);
  return diagramAnalysisSchema.parse(parsed);
}
