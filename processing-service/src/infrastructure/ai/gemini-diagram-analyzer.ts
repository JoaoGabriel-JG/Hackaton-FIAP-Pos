import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DiagramAnalyzer } from "../../application/ports/diagram-analyzer.js";
import {
  DIAGRAM_ANALYSIS_PROMPT,
  parseDiagramAnalysis,
} from "../../domain/diagram-analysis.js";
import { InvalidAiResponseError } from "../../domain/errors/processing-errors.js";
import { env } from "../config/env.js";

export class GeminiDiagramAnalyzer implements DiagramAnalyzer {
  private readonly client = new GoogleGenerativeAI(env.geminiApiKey);

  async analyze(buffer: Buffer, mimeType: string) {
    try {
      const model = this.client.getGenerativeModel({ model: env.geminiModel });
      const result = await model.generateContent([
        { text: DIAGRAM_ANALYSIS_PROMPT },
        {
          inlineData: {
            data: buffer.toString("base64"),
            mimeType,
          },
        },
      ]);

      const text = result.response.text();
      if (!text) {
        throw new InvalidAiResponseError(
          "Empty response from Gemini",
          "unknown",
        );
      }

      return parseDiagramAnalysis(text);
    } catch (error) {
      if (error instanceof InvalidAiResponseError) {
        throw error;
      }
      throw new InvalidAiResponseError(
        "Failed to analyze diagram with Gemini",
        "unknown",
        error,
      );
    }
  }
}
