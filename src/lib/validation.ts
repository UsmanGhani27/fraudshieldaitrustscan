// Pure, client-safe validation/sanitization helpers.
import { z } from "zod";
import { isThreatCategory, MAX_TEXT_LENGTH, type ThreatCategory } from "./risk";

export function normalizeText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

export function validateUrl(raw: string): UrlCheck {
  const v = raw.trim();
  if (!v) return { ok: false, reason: "Please enter a link." };
  if (v.length > 2048) return { ok: false, reason: "That link is too long to analyze." };
  if (/\s/.test(v)) return { ok: false, reason: "Links can't contain spaces." };
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`);
  } catch {
    return { ok: false, reason: "That doesn't look like a valid link." };
  }
  if (!["http:", "https:"].includes(url.protocol)) return { ok: false, reason: "Only http and https links can be analyzed." };
  if (!url.hostname.includes(".")) return { ok: false, reason: "That link is missing a valid domain." };
  return { ok: true, url };
}

/** Redact password-like strings, one-time codes and card numbers. */
export function redactSecrets(text: string): string {
  return text
    .replace(/\b(?:\d[ -]?){13,19}\b/g, "[REDACTED-NUMBER]")
    .replace(/((?:password|passcode|pwd|pin|otp|recovery code|seed phrase|cvv)\s*[:=]\s*)\S+/gi, "$1[REDACTED]")
    .replace(/\b(sk|pk|api|key|token)[-_][A-Za-z0-9_-]{12,}\b/g, "[REDACTED-KEY]");
}

export const safeFilename = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);

// ---------- Untrusted model output ----------
const clampInt = (v: unknown, fallback: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
};
const cleanStr = (v: unknown, max: number) => (typeof v === "string" ? v : v == null ? "" : String(v)).replace(/<[^>]*>/g, "").replace(/[\u0000-\u001F]/g, " ").trim().slice(0, max);
const cleanList = (v: unknown, maxItems: number, maxLen: number) => (Array.isArray(v) ? v : []).map((x) => cleanStr(x, maxLen)).filter(Boolean).slice(0, maxItems);
const sev = (v: unknown): "low" | "medium" | "high" => {
  const s = String(v).toLowerCase();
  return s === "low" || s === "high" ? s : "medium";
};
const cat = (v: unknown): ThreatCategory | null => {
  const s = String(v ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  return isThreatCategory(s) ? s : null;
};

export type Signal = { title: string; severity: "low" | "medium" | "high"; evidence: string; explanation: string; source: "model" | "rules" | "url" };
export type SuspiciousEntity = { type: string; value: string; reason: string };

export type ModelOutput = {
  risk_score: number;
  confidence: number;
  primary_threat: ThreatCategory | null;
  secondary_threats: ThreatCategory[];
  summary: string;
  why_flagged: Signal[];
  social_engineering_tactics: string[];
  suspicious_entities: SuspiciousEntity[];
  claimed_identity: string;
  observed_sender: string;
  observed_domain: string;
  sender_notes: string;
  url_notes: string;
  recommended_actions: string[];
  verification_steps: string[];
  do_not_do: string[];
  limitations: string[];
};

/** Validate, clamp and strip markup from untrusted provider JSON. Returns null when unusable. */
export function sanitizeModelOutput(raw: unknown): ModelOutput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const summary = cleanStr(r["summary"], 1200);
  if (!summary) return null;
  const sender = (r["sender_analysis"] ?? {}) as Record<string, unknown>;
  const urlA = (r["url_analysis"] ?? {}) as Record<string, unknown>;
  const primary = cat(r["primary_threat"]);
  const secondary = Array.from(new Set((Array.isArray(r["secondary_threats"]) ? r["secondary_threats"] : []).map(cat).filter((c): c is ThreatCategory => !!c && c !== primary))).slice(0, 6);
  return {
    risk_score: clampInt(r["risk_score"], 50),
    confidence: clampInt(r["confidence"], 50),
    primary_threat: primary,
    secondary_threats: secondary,
    summary,
    why_flagged: (Array.isArray(r["why_flagged"]) ? r["why_flagged"] : [])
      .map((s) => {
        const o = (s ?? {}) as Record<string, unknown>;
        return { title: cleanStr(o["title"], 140), severity: sev(o["severity"]), evidence: cleanStr(o["evidence"], 400), explanation: cleanStr(o["explanation"], 500), source: "model" as const };
      })
      .filter((s) => s.title)
      .slice(0, 10),
    social_engineering_tactics: cleanList(r["social_engineering_tactics"], 8, 80),
    suspicious_entities: (Array.isArray(r["suspicious_entities"]) ? r["suspicious_entities"] : [])
      .map((e) => {
        const o = (e ?? {}) as Record<string, unknown>;
        return { type: cleanStr(o["type"], 30), value: cleanStr(o["value"], 200), reason: cleanStr(o["reason"], 300) };
      })
      .filter((e) => e.value)
      .slice(0, 10),
    claimed_identity: cleanStr(r["claimed_identity"], 120),
    observed_sender: cleanStr(sender["observed_sender"], 200),
    observed_domain: cleanStr(sender["observed_domain"], 200),
    sender_notes: cleanStr(sender["notes"], 500),
    url_notes: cleanStr(urlA["notes"], 500),
    recommended_actions: cleanList(r["recommended_actions"], 8, 300),
    verification_steps: cleanList(r["verification_steps"], 8, 300),
    do_not_do: cleanList(r["do_not_do"], 8, 300),
    limitations: cleanList(r["limitations"], 6, 300),
  };
}
