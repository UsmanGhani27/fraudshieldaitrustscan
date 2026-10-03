import type { AnalysisProvider, NormalizedInput } from "./types";
import { lovableAiProvider } from "./lovable-ai.server";
import { sanitizeModelOutput, type ModelOutput } from "../validation";

// Ordered provider chain. Future adapters (e.g. Featherless) slot in here behind isAvailable().
const PROVIDERS: AnalysisProvider[] = [lovableAiProvider];

export type ChainResult = { output: ModelOutput | null; provider: string; model: string; failure: string | null };

export async function runProviderChain(input: NormalizedInput): Promise<ChainResult> {
  let failure: string | null = "no_provider";
  for (const p of PROVIDERS) {
    if (!p.isAvailable()) continue;
    try {
      const out = sanitizeModelOutput(await p.analyze(input));
      if (out) return { output: out, provider: p.id, model: p.model, failure: null };
      failure = "malformed_output";
      console.warn("[analysis] provider output failed validation", p.id);
    } catch (e) {
      failure = e instanceof Error ? e.message : "unknown";
      console.warn("[analysis] provider failed", p.id, failure);
    }
  }
  return { output: null, provider: "fraudshield-rules", model: "rules-v2", failure };
}
