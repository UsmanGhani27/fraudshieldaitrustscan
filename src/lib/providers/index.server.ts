import type { AnalysisProvider, NormalizedInput } from "./types";
import { lovableAiProvider } from "./lovable-ai.server";
import { heuristicProvider } from "./heuristic.server";
import { sanitizeAssessment, type Assessment } from "../validation";
import { ANALYSIS_VERSION } from "./prompt";

// Ordered provider chain. Future providers (e.g. Featherless) slot in here behind isAvailable().
const PRIMARY: AnalysisProvider[] = [lovableAiProvider];

export async function runProviderChain(input: NormalizedInput): Promise<{ assessment: Assessment; usedFallback: boolean } | null> {
  for (const p of PRIMARY) {
    if (!p.isAvailable()) continue;
    try {
      const raw = await p.analyze(input);
      const a = sanitizeAssessment(raw, { provider: p.id, model: p.model, analysis_version: ANALYSIS_VERSION });
      if (a) return { assessment: a, usedFallback: false };
      console.warn("[analysis] provider output failed validation", p.id);
    } catch (e) {
      console.warn("[analysis] provider failed", p.id, e instanceof Error ? e.message : "unknown");
    }
  }
  const raw = await heuristicProvider.analyze(input);
  const a = sanitizeAssessment(raw, { provider: heuristicProvider.id, model: heuristicProvider.model, analysis_version: ANALYSIS_VERSION });
  return a ? { assessment: a, usedFallback: true } : null;
}
