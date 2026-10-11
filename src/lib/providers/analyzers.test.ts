// Per-analyzer checks (email, URL, screenshot, QR) using mocked providers/network only — no usage charges.
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { runProviderChain } from "./index.server";
import { featherlessProvider } from "./featherless.server";
import { ProviderError } from "./lovable-ai.server";
import type { AnalysisProvider, NormalizedInput } from "./types";
import { assess } from "../engine/risk-engine";
import { validateUrl } from "../validation";

const valid = {
  risk_score: 75, confidence: 70, primary_threat: "phishing", secondary_threats: [], summary: "Likely phishing.",
  why_flagged: [{ title: "Spoofed sender", severity: "high", evidence: "reply-to mismatch", explanation: "Different domain." }],
  social_engineering_tactics: ["Urgency"], suspicious_entities: [], claimed_identity: "Bank",
  sender_analysis: { observed_sender: "", observed_domain: "", notes: "" }, url_analysis: { notes: "" },
  recommended_actions: ["Open your bank's official app directly", "Reply to the sender with your details"],
  verification_steps: [], do_not_do: [], limitations: [],
};
const fake = (id: string, impl: () => Promise<unknown>, extra: Partial<AnalysisProvider> = {}) => {
  const analyze = vi.fn(impl);
  return { p: { id, model: `${id}-m`, isAvailable: () => true, analyze, ...extra } as AnalysisProvider, analyze };
};
const SECRET = "fl-test-secret-value-123456";
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Email analyzer", () => {
  const email: NormalizedInput = { type: "email", text: "Subject: Account locked\n\nVerify now", sender: "alerts@bank-secure.top", replyTo: "x@mail.ru", subject: "Account locked" };
  it("primary first; backup only on recoverable failure; unsafe reply advice filtered", async () => {
    const a = fake("primary", async () => { throw new ProviderError("credits"); }), b = fake("backup", async () => valid);
    const r = await runProviderChain(email, [a.p, b.p]);
    expect(a.analyze).toHaveBeenCalledTimes(1);
    expect(b.analyze).toHaveBeenCalledWith(expect.objectContaining({ type: "email", replyTo: "x@mail.ru" }));
    expect(r.provider).toBe("backup");
    const out = assess(email, r.output);
    expect(out.recommended_actions.join(" ")).not.toMatch(/reply to the sender/i);
  });
  it("non-recoverable refusal does not fall through to backup", async () => {
    const a = fake("primary", async () => { throw new ProviderError("refused"); }), b = fake("backup", async () => valid);
    const r = await runProviderChain(email, [a.p, b.p]);
    expect(b.analyze).not.toHaveBeenCalled();
    expect(r.provider).toBe("fraudshield-rules");
  });
});

describe("URL analyzer", () => {
  it("never fetches/opens the submitted URL (rules-only path)", () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    const check = validateUrl("http://paypa1-login.example.top/verify?x=1");
    expect(check.ok).toBe(true);
    const url = check.ok ? check.url.toString() : "";
    const res = assess({ type: "url", text: url, url }, null);
    expect(f).not.toHaveBeenCalled();
    expect(res.risk_score).toBeGreaterThan(0);
  });
  it("Featherless request goes only to its API host, never to the analyzed URL", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", SECRET);
    const f = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(valid) } }] }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const url = "http://evil.example.top/login";
    await featherlessProvider.analyze({ type: "url", text: url, url });
    expect(f).toHaveBeenCalledTimes(1);
    expect(String((f.mock.calls[0] as unknown[])[0])).toMatch(/^https:\/\/api\.featherless\.ai\/v1\//);
  });
  it("rejects non-web schemes", () => {
    for (const u of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd"]) expect(validateUrl(u).ok).toBe(false);
  });
});

describe("Screenshot analyzer", () => {
  const shot: NormalizedInput = { type: "screenshot", text: "", image: { mime: "image/png", base64: "AAAA" } };
  it("fails closed when vision provider is unavailable and never calls Featherless", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", SECRET);
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    const a = fake("primary", async () => { throw new ProviderError("credits"); });
    const r = await runProviderChain(shot, [a.p, featherlessProvider]);
    expect(r.output).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
  it("orchestration refuses image-only results without AI and releases the reservation", () => {
    const src = readFileSync(path.resolve(__dirname, "../analysis.functions.ts"), "utf8");
    const block = src.slice(src.indexOf("if (!chain.output && image && !url)"), src.indexOf("const a = chain.output"));
    expect(block).toMatch(/await release\(\)/);
    expect(block).toMatch(/AI_UNAVAILABLE/);
  });
});

describe("QR analyzer", () => {
  it("decoded link is sent as text only; image is not sent when a valid link exists", () => {
    const src = readFileSync(path.resolve(__dirname, "../analysis.functions.ts"), "utf8");
    expect(src).toMatch(/data\.type === "url" \|\| \(data\.type === "qr" && data\.url\)/);
  });
  it("decoder is local and the analyzer never auto-navigates to decoded content", () => {
    const dec = readFileSync(path.resolve(__dirname, "../qr-decode.ts"), "utf8");
    expect(dec).not.toMatch(/fetch\(|window\.open|location\./);
    const ui = readFileSync(path.resolve(__dirname, "../../routes/_authenticated/analyze.tsx"), "utf8");
    expect(ui).not.toMatch(/window\.open|location\.(href|assign|replace)/);
    expect(ui).not.toMatch(/href=\{qrUrl/);
  });
  it("undecodable QR image is fail-closed like screenshots (no Featherless)", async () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f); vi.stubEnv("FEATHERLESS_API_KEY", SECRET);
    const r = await runProviderChain({ type: "qr", text: "", image: { mime: "image/png", base64: "AAAA" } }, [featherlessProvider]);
    expect(r.output).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});

describe("Safe logging", () => {
  it("provider failures never log the API key", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", SECRET);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unauthorized", { status: 401 })));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await runProviderChain({ type: "message", text: "hello verify now please" }, [featherlessProvider]);
    expect(r.output).toBeNull();
    expect(JSON.stringify(warn.mock.calls)).not.toContain(SECRET);
  });
});
