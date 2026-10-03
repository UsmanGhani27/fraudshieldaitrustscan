// Pure, client-safe validation/sanitization helpers.
import { z } from "zod";
import { isThreatCategory, scoreToLevel, MAX_TEXT_LENGTH, type ThreatCategory } from "./risk";

export function normalizeText(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_TEXT_LENGTH);
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

export function validateUrl(raw: string): UrlCheck {
  const v = raw.trim();
  if (!v) return { ok: false, reason: "Please enter a link." };
  if (v.length > 2048) return { ok: false, reason: "That link is too long to analyze." };
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`);
  } catch {
    return { ok: false, reason: "That doesn't look like a valid link." };
  }
  if (!["http:", "https:"].includes(url.protocol)) return { ok: false, reason: "Only http and https links can be analyzed." };
  if (!url.hostname.includes(".") && url.hostname !== "localhost") return { ok: false, reason: "That link is missing a valid domain." };
  return { ok: true, url };
}

/** Redact password-like strings, one-time codes and card numbers. */
export function redactSecrets(text: string): string {
  return text
    .replace(/\b(?:\d[ -]?){13,19}\b/g, "[REDACTED-NUMBER]")
    .replace(/((?:password|passcode|pwd|pin|otp|code|recovery|seed phrase)\s*[:=]\s*)\S+/gi, "$1[REDACTED]")
    .replace(/\b(sk|pk|api|key|token)[-_][A-Za-z0-9_-]{12,}\b/g, "[REDACTED-KEY]");
}

const clampInt = (n: unknown, fallback: number) => {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : fallback;
};
const str = (max: number) => z.preprocess((v) => (typeof v === "string" ? v : v == null ? "" : String(v)), z.string()).transform((s) => s.replace(/<[^>]*>/g, "").trim().slice(0, max));
const strList = (maxItems: number, maxLen: number) =>
  z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown())).transform((arr) =>
    arr.map((x) => (typeof x === "string" ? x.replace(/<[^>]*>/g, "").trim().slice(0, maxLen) : "")).filter(Boolean).slice(0, maxItems),
  );

const signalSchema = z.object({
  title: str(140),
  severity: z.preprocess((v) => (["low", "medium", "high"].includes(String(v).toLowerCase()) ? String(v).toLowerCase() : "medium"), z.enum(["low", "medium", "high"])),
  evidence: str(500),
  explanation: str(600),
});

export const assessmentSchema = z.object({
  risk_score: z.unknown().transform((v) => clampInt(v, 50)),
  confidence: z.unknown().transform((v) => clampInt(v, 50)),
  summary: str(1200),
  threat_categories: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown())).transform((arr) =>
    Array.from(new Set(arr.map((x) => String(x).toLowerCase().trim().replace(/[\s-]+/g, "_")).filter(isThreatCategory))) as ThreatCategory[],
  ),
  claimed_identity: str(200),
  observed_indicators: strList(12, 300),
  signals: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown())).transform((arr) =>
    arr.map((s) => signalSchema.safeParse(s)).filter((r) => r.success && r.data.title).map((r) => (r as { data: z.infer<typeof signalSchema> }).data).slice(0, 12),
  ),
  recommended_actions: strList(10, 300),
  verification_steps: strList(10, 300),
  uncertainty_notes: strList(6, 300),
  safe_to_proceed: z.unknown().transform((v) => v === true),
});

export type Assessment = z.infer<typeof assessmentSchema> & {
  risk_level: ReturnType<typeof scoreToLevel>;
  provider: string;
  model: string;
  analysis_version: string;
};

/** Treat model output as untrusted: validate, clamp, sanitize, and recompute level centrally. */
export function sanitizeAssessment(raw: unknown, meta: { provider: string; model: string; analysis_version: string }): Assessment | null {
  const parsed = assessmentSchema.safeParse(raw ?? {});
  if (!parsed.success || !parsed.data.summary) return null;
  const d = parsed.data;
  const level = scoreToLevel(d.risk_score);
  return {
    ...d,
    safe_to_proceed: d.safe_to_proceed && (level === "low"),
    uncertainty_notes: d.uncertainty_notes.length ? d.uncertainty_notes : ["This is an automated, AI-assisted assessment and may be wrong. Verify independently before acting."],
    risk_level: level,
    ...meta,
  };
}
