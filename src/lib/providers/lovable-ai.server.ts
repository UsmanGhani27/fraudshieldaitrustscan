import type { AnalysisProvider, NormalizedInput } from "./types";
import { ASSESSMENT_TOOL, SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

const MODEL = "google/gemini-3-flash-preview";

export const lovableAiProvider: AnalysisProvider = {
  id: "lovable-ai",
  model: MODEL,
  isAvailable: () => Boolean(process.env["LOVABLE_API_KEY"]),
  async analyze(input: NormalizedInput) {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("provider_unconfigured");
    const userContent: unknown[] = [{ type: "text", text: buildUserPrompt(input) }];
    if (input.image) {
      userContent.push({ type: "image_url", image_url: { url: `data:${input.image.mime};base64,${input.image.base64}` } });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          tools: [ASSESSMENT_TOOL],
          tool_choice: { type: "function", function: { name: "report_assessment" } },
        }),
      });
      if (!res.ok) {
        // Log status only — never request/response bodies containing user content.
        console.warn("[analysis] provider http status", res.status);
        throw new Error(res.status === 429 ? "provider_rate_limited" : res.status === 402 ? "provider_credits" : "provider_error");
      }
      const json = (await res.json()) as {
        choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
      };
      const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) throw new Error("provider_empty");
      return JSON.parse(args);
    } finally {
      clearTimeout(timer);
    }
  },
};
