import type { AnalysisProvider, NormalizedInput } from "./types";
import { ASSESSMENT_SCHEMA, SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

const MODEL = "openai/gpt-6-astra";
const BASE = "https://ai.gateway.lovable.dev/v1/responses";

export class ProviderError extends Error {
  constructor(public code: "unconfigured" | "rate_limited" | "credits" | "denied" | "bad_request" | "upstream" | "empty" | "refused") {
    super(code);
  }
}

/** Reads a Responses SSE stream and returns the accumulated output text. */
async function readStream(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let completedText = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const data = frame.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
      if (!data || data === "[DONE]") continue;
      let evt: { type?: string; delta?: string; response?: { output?: { type?: string; content?: { type?: string; text?: string }[] }[] }; error?: unknown };
      try { evt = JSON.parse(data); } catch { continue; }
      if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") text += evt.delta;
      else if (evt.type === "response.refusal.delta" || evt.type === "response.refusal.done") throw new ProviderError("refused");
      else if (evt.type === "response.failed" || evt.type === "error") throw new ProviderError("upstream");
      else if (evt.type === "response.completed") {
        completedText = (evt.response?.output ?? []).filter((o) => o.type === "message").flatMap((o) => o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("");
      }
    }
  }
  return text || completedText;
}

export const lovableAiProvider: AnalysisProvider = {
  id: "lovable-ai",
  model: MODEL,
  isAvailable: () => Boolean(process.env["LOVABLE_API_KEY"]),
  async analyze(input: NormalizedInput) {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new ProviderError("unconfigured");
    const content: Record<string, unknown>[] = [{ type: "input_text", text: buildUserPrompt(input) }];
    if (input.image) content.push({ type: "input_image", image_url: `data:${input.image.mime};base64,${input.image.base64}` });

    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: MODEL,
        instructions: SYSTEM_PROMPT,
        input: [{ role: "user", content }],
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "threat_assessment", strict: true, schema: ASSESSMENT_SCHEMA } },
      }),
    });
    if (!res.ok || !res.body) {
      // Log status only — never request/response bodies that could contain user content.
      console.warn("[analysis] provider http status", res.status);
      throw new ProviderError(res.status === 429 ? "rate_limited" : res.status === 402 ? "credits" : res.status === 403 ? "denied" : res.status === 400 ? "bad_request" : "upstream");
    }
    const text = await readStream(res);
    if (!text.trim()) throw new ProviderError("empty");
    return JSON.parse(text);
  },
};
