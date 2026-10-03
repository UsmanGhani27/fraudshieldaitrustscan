import { describe, it, expect } from "vitest";
import { validateUrl, redactSecrets, sanitizeAssessment, normalizeText } from "./validation";
import { scoreToLevel } from "./risk";

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

describe("sanitizeAssessment", () => {
  it("clamps and strips html, drops unknown categories", () => {
    const a = sanitizeAssessment(
      { risk_score: 180, confidence: -5, summary: "<b>Bad</b> link", threat_categories: ["Phishing", "aliens"], signals: [{ title: "x", severity: "extreme" }], safe_to_proceed: true },
      { provider: "p", model: "m", analysis_version: "v" },
    )!;
    expect(a.risk_score).toBe(100);
    expect(a.confidence).toBe(0);
    expect(a.summary).toBe("Bad link");
    expect(a.threat_categories).toEqual(["phishing"]);
    expect(a.signals[0].severity).toBe("medium");
    expect(a.safe_to_proceed).toBe(false);
    expect(a.risk_level).toBe("critical");
  });
  it("normalizes text", () => expect(normalizeText("  a   b\n\n\n\nc ")).toBe("a b\n\nc"));
});
