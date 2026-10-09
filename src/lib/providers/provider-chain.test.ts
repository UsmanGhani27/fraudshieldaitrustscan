import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { runProviderChain } from "./index.server";
import { featherlessProvider, FEATHERLESS_MODEL } from "./featherless.server";
import { ProviderError } from "./lovable-ai.server";
import type { AnalysisProvider, NormalizedInput } from "./types";
import { assess } from "../engine/risk-engine";

const valid = {
  risk_score: 80, confidence: 70, primary_threat: "phishing", secondary_threats: [], summary: "Likely phishing.",
  why_flagged: [{ title: "Urgent link", severity: "high", evidence: "verify now", explanation: "Pressure tactic." }],
  social_engineering_tactics: ["Urgency"], suspicious_entities: [], claimed_identity: "Bank",
  sender_analysis: { observed_sender: "", observed_domain: "", notes: "" }, url_analysis: { notes: "" },
  recommended_actions: ["Open your bank's official app directly", "Click the link in the message to verify your account"],
  verification_steps: ["Call the number on the back of your card"], do_not_do: ["Do not enter your password"], limitations: [],
};
const text: NormalizedInput = { type: "message", text: "Your bank account is locked, verify now at http://bank-secure.example.top" };

function fake(id: string, impl: () => Promise<unknown>, extra: Partial<AnalysisProvider> = {}) {
  const analyze = vi.fn(impl);
  return { p: { id, model: `${id}-m`, isAvailable: () => true, analyze, ...extra } as AnalysisProvider, analyze };
}
const reply = (status: number, body: unknown) => new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("provider chain with Featherless backup", () => {
  it("primary success: backup is not called", async () => {
    const a = fake("primary", async () => valid), b = fake("backup", async () => valid);
    const r = await runProviderChain(text, [a.p, b.p]);
    expect(r.provider).toBe("primary");
    expect(b.analyze).not.toHaveBeenCalled();
  });

  it.each(["credits", "rate_limited", "upstream", "denied", "timeout", "malformed", "unconfigured"] as const)("primary %s -> backup succeeds once", async (code) => {
    const a = fake("primary", async () => { throw new ProviderError(code); }), b = fake("backup", async () => valid);
    const r = await runProviderChain(text, [a.p, b.p]);
    expect(r.provider).toBe("backup");
    expect(a.analyze).toHaveBeenCalledTimes(1);
    expect(b.analyze).toHaveBeenCalledTimes(1);
  });

  it("does not route around a safety refusal or a rejected request", async () => {
    for (const code of ["refused", "bad_request"] as const) {
      const a = fake("primary", async () => { throw new ProviderError(code); }), b = fake("backup", async () => valid);
      const r = await runProviderChain(text, [a.p, b.p]);
      expect(r.output).toBeNull();
      expect(r.provider).toBe("fraudshield-rules");
      expect(b.analyze).not.toHaveBeenCalled();
    }
  });

  it("both fail -> rule-only fallback, labeled, no AI output", async () => {
    const a = fake("primary", async () => { throw new ProviderError("credits"); }), b = fake("backup", async () => { throw new ProviderError("upstream"); });
    const r = await runProviderChain(text, [a.p, b.p]);
    expect(r).toMatchObject({ output: null, provider: "fraudshield-rules", failure: "upstream" });
  });

  it("malformed backup output is rejected", async () => {
    const a = fake("primary", async () => { throw new ProviderError("credits"); }), b = fake("backup", async () => "not an object");
    const r = await runProviderChain(text, [a.p, b.p]);
    expect(r.output).toBeNull();
    expect(r.provider).toBe("fraudshield-rules");
  });

  it("screenshots never route to a text-only provider", async () => {
    const a = fake("primary", async () => { throw new ProviderError("credits"); });
    const r = await runProviderChain({ type: "screenshot", text: "", image: { mime: "image/png", base64: "AAAA" } }, [a.p, featherlessProvider]);
    expect(r.output).toBeNull();
  });
});

describe("Featherless adapter", () => {
  const original = process.env["FEATHERLESS_API_KEY"];
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { process.env["FEATHERLESS_API_KEY"] = "test-key-not-real"; fetchSpy = vi.spyOn(globalThis, "fetch"); });
  afterEach(() => { fetchSpy.mockRestore(); if (original === undefined) delete process.env["FEATHERLESS_API_KEY"]; else process.env["FEATHERLESS_API_KEY"] = original; });

  it("sends one bounded request with the configured model and parses JSON", async () => {
    fetchSpy.mockResolvedValue(reply(200, { choices: [{ message: { content: "```json\n" + JSON.stringify(valid) + "\n```" } }] }));
    const r = await runProviderChain(text, [featherlessProvider]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.featherless.ai/v1/chat/completions");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe(FEATHERLESS_MODEL);
    expect(body.max_tokens).toBeLessThanOrEqual(2000);
    expect(body.tools).toBeUndefined();
    expect(body.messages[1].content).toContain("<user_content>");
    expect(r.provider).toBe("featherless");
  });

  it("unsafe advice from Featherless is still filtered", async () => {
    fetchSpy.mockResolvedValue(reply(200, { choices: [{ message: { content: JSON.stringify(valid) } }] }));
    const r = await runProviderChain(text, [featherlessProvider]);
    const a = assess({ type: "message", text: text.text }, r.output);
    expect(a.recommended_actions.some((x) => /click the link/i.test(x))).toBe(false);
  });

  it.each([[401, "denied"], [403, "denied"], [429, "rate_limited"], [503, "upstream"]])("HTTP %i -> safe %s failure, one attempt", async (status, code) => {
    fetchSpy.mockResolvedValue(reply(status, { error: "x" }));
    const r = await runProviderChain(text, [featherlessProvider]);
    expect(r).toMatchObject({ output: null, provider: "fraudshield-rules", failure: code });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("timeout -> safe failure", async () => {
    fetchSpy.mockRejectedValue(Object.assign(new Error("t"), { name: "TimeoutError" }));
    expect((await runProviderChain(text, [featherlessProvider])).failure).toBe("timeout");
  });

  it("non-JSON reply -> malformed", async () => {
    fetchSpy.mockResolvedValue(reply(200, { choices: [{ message: { content: "I think it's a scam." } }] }));
    expect((await runProviderChain(text, [featherlessProvider])).failure).toBe("malformed");
  });

  it("missing secret -> skipped without a network call", async () => {
    delete process.env["FEATHERLESS_API_KEY"];
    const r = await runProviderChain(text, [featherlessProvider]);
    expect(r).toMatchObject({ output: null, failure: "unconfigured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses image input even if called directly", async () => {
    await expect(featherlessProvider.analyze({ type: "screenshot", text: "", image: { mime: "image/png", base64: "AA" } })).rejects.toThrow("unsupported");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("quota is reserved once around the whole chain", () => {
  // Static check of the orchestration: one reservation and one chain call per analysis,
  // so provider fallback happens inside a single reservation (no double charge).
  const src = readFileSync(path.resolve(__dirname, "../analysis.functions.ts"), "utf8");
  const body = src.slice(src.indexOf("export const runAnalysis"), src.indexOf("type Admin ="));
  it("calls reserve_analysis_usage and runProviderChain exactly once", () => {
    expect(body.match(/rpc\("reserve_analysis_usage"/g)?.length).toBe(1);
    expect(body.match(/runProviderChain\(/g)?.length).toBe(1);
    expect(body.indexOf("reserve_analysis_usage")).toBeLessThan(body.indexOf("runProviderChain("));
  });
});
