import type { AnalysisProvider, NormalizedInput } from "./types";
import { lovableAiProvider } from "./lovable-ai.server";
import { featherlessProvider } from "./featherless.server";
import { sanitizeModelOutput, type ModelOutput } from "../validation";

// Ordered provider chain: primary first, Featherless as text-only backup.
const PROVIDERS: AnalysisProvider[] = [lovableAiProvider, featherlessProvider];

/** Failures where trying the next provider is appropriate. Safety refusals and request
 *  rejections stop the chain so we never silently route around them. */
const RECOVERABLE = new Set(["unconfigured", "rate_limited", "credits", "denied", "upstream", "empty", "timeout", "malformed", "malformed_output"]);

export type ChainResult = { output: ModelOutput | null; provider: string; model: string; failure: string | null };

export async function runProviderChain(input: NormalizedInput, providers: AnalysisProvider[] = PROVIDERS): Promise<ChainResult> {
  let failure: string | null = "no_provider";
  for (const p of providers) {
    if (input.image && p.supportsImages === false) continue; // images never go to text-only providers
    if (!p.isAvailable()) { if (failure === "no_provider") failure = "unconfigured"; continue; }
    try {
      // Exactly one attempt per provider; no retries.
      const out = sanitizeModelOutput(await p.analyze(input));
      if (out) return { output: out, provider: p.id, model: p.model, failure: null };
      failure = "malformed_output";
      console.warn("[analysis] provider output failed validation", p.id);
    } catch (e) {
      failure = e instanceof Error ? e.message : "unknown";
      console.warn("[analysis] provider failed", p.id, failure);
    }
    if (!RECOVERABLE.has(failure)) break;
  }
  return { output: null, provider: "fraudshield-rules", model: "rules-v2", failure };
}
