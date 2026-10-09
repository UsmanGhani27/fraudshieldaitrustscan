import type { AnalysisProvider, NormalizedInput } from "./types";
import { ASSESSMENT_SCHEMA, SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { ProviderError } from "./lovable-ai.server";

/** Backup text-only provider. Verified model on Featherless's official model list. */
export const FEATHERLESS_MODEL = "Qwen/Qwen2.5-7B-Instruct";
const ENDPOINT = "https://api.featherless.ai/v1/chat/completions";
const TIMEOUT_MS = 30_000;
const MAX_PROMPT_CHARS = 12_000;
const MAX_OUTPUT_TOKENS = 1_500;

const JSON_RULES = `\nOutput format: respond with ONE JSON object only (no markdown, no prose) matching this JSON Schema exactly:\n${JSON.stringify(ASSESSMENT_SCHEMA)}`;

/** Extracts the single JSON object from a chat reply; tolerates a ```json fence. */
export function extractJson(text: string): unknown {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s === -1 || e <= s) throw new ProviderError("malformed");
  try { return JSON.parse(text.slice(s, e + 1)); } catch { throw new ProviderError("malformed"); }
}

export const featherlessProvider: AnalysisProvider = {
  id: "featherless",
  model: FEATHERLESS_MODEL,
  supportsImages: false,
  isAvailable: () => Boolean(process.env["FEATHERLESS_API_KEY"]),
  async analyze(input: NormalizedInput) {
    if (input.image) throw new ProviderError("unsupported"); // never send images here
    const key = process.env["FEATHERLESS_API_KEY"];
    if (!key) throw new ProviderError("unconfigured");
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
          model: FEATHERLESS_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT + JSON_RULES },
            { role: "user", content: buildUserPrompt(input).slice(0, MAX_PROMPT_CHARS) },
          ],
          max_tokens: MAX_OUTPUT_TOKENS,
          temperature: 0.2,
        }),
      });
    } catch (e) {
      throw new ProviderError(e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError") ? "timeout" : "upstream");
    }
    if (!res.ok) {
      // Status only — never log bodies or headers.
      console.warn("[analysis] backup provider http status", res.status);
      throw new ProviderError(res.status === 429 ? "rate_limited" : res.status === 402 ? "credits" : res.status === 401 || res.status === 403 ? "denied" : res.status === 400 ? "bad_request" : "upstream");
    }
    let body: { choices?: { message?: { content?: unknown }; finish_reason?: string }[] };
    try { body = await res.json(); } catch { throw new ProviderError("malformed"); }
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new ProviderError("empty");
    return extractJson(content.slice(0, 40_000));
  },
};
