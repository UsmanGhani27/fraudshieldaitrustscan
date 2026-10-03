import { describe, it, expect } from "vitest";
import { validateUrl, redactSecrets, sanitizeModelOutput, normalizeText } from "./validation";
import { scoreToLevel } from "./risk";
import { analyzeUrl } from "./engine/url-analysis";
import { assess } from "./engine/risk-engine";

describe("risk mapping", () => {
  it("maps scores to levels", () => {
    expect(scoreToLevel(0)).toBe("low");
    expect(scoreToLevel(24)).toBe("low");
    expect(scoreToLevel(25)).toBe("medium");
    expect(scoreToLevel(50)).toBe("high");
    expect(scoreToLevel(75)).toBe("critical");
    expect(scoreToLevel(140)).toBe("critical");
  });
});

describe("validateUrl", () => {
  it("accepts bare domains", () => expect(validateUrl("example.com").ok).toBe(true));
  it("rejects javascript:", () => expect(validateUrl("javascript:alert(1)").ok).toBe(false));
  it("rejects empty", () => expect(validateUrl(" ").ok).toBe(false));
});

describe("redactSecrets", () => {
  it("redacts passwords and cards", () => {
    const r = redactSecrets("password: hunter2 card 4111 1111 1111 1111");
    expect(r).not.toContain("hunter2");
    expect(r).not.toContain("4111 1111");
  });
});

describe("sanitizeModelOutput", () => {
  it("clamps, strips html and drops unknown categories", () => {
    const a = sanitizeModelOutput({ risk_score: 180, confidence: -5, summary: "<b>Bad</b> link", primary_threat: "Phishing", secondary_threats: ["aliens", "job scam"], why_flagged: [{ title: "x", severity: "extreme" }] });
    expect(a?.risk_score).toBe(100);
    expect(a?.confidence).toBe(0);
    expect(a?.summary).toBe("Bad link");
    expect(a?.primary_threat).toBe("phishing");
    expect(a?.secondary_threats).toEqual(["job_scam"]);
    expect(a?.why_flagged[0]?.severity).toBe("medium");
  });
  it("rejects empty output", () => expect(sanitizeModelOutput({})).toBeNull());
  it("normalizes text", () => expect(normalizeText("  a   b\n\n\n\nc ")).toBe("a b\n\nc"));
});

describe("url analysis", () => {
  it("flags look-alike brand domains", () => {
    const u = analyzeUrl("https://paypa1.com/login");
    expect(u?.lookalike_of).toBe("paypal");
  });
  it("does not flag official domains", () => {
    const u = analyzeUrl("https://www.paypal.com/signin");
    expect(u?.lookalike_of).toBeNull();
  });
});

describe("risk engine", () => {
  it("detects impersonation without a model", () => {
    const a = assess({ type: "message", text: "Chase: account locked. Verify now at https://chase-secure-verify.co/login", claimedBrand: "Chase" }, null);
    expect(a.verification.status).toBe("high_risk_impersonation");
    expect(a.risk_score).toBeGreaterThanOrEqual(70);
    expect(a.safe_to_proceed).toBe(false);
  });
  it("filters unsafe advice from the model", () => {
    const model = sanitizeModelOutput({ risk_score: 60, confidence: 70, summary: "s", recommended_actions: ["Click the link to verify", "Call your bank using the number on your card"] });
    const a = assess({ type: "message", text: "hello there friend" }, model);
    expect(a.recommended_actions.some((x) => /click the link/i.test(x))).toBe(false);
  });
});
