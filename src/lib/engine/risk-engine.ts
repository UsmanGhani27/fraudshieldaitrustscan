// Central risk engine: blends deterministic heuristics, URL analysis and (optional) model output.
// Final risk level is always recomputed here via scoreToLevel.
import { scoreToLevel, type InputType, type RiskLevel, type ThreatCategory } from "../risk";
import type { ModelOutput, Signal, SuspiciousEntity } from "../validation";
import { runHeuristics, URL_FINDING_WEIGHT } from "./heuristics";
import { analyzeUrl, extractUrls, isOfficialDomain, registrableDomain, type UrlAnalysis } from "./url-analysis";
import { KNOWN_BRANDS, normalizeBrand, findBrand } from "./brands";

export const ENGINE_WEIGHTS = {
  model: 0.65, // share of the model score when a model result exists
  rules: 0.35,
  impersonationFloor: 70, // minimum score when high-risk impersonation is detected deterministically
  noModelConfidenceCap: 60,
};

export type VerificationStatus = "verified" | "likely_match" | "unverified" | "suspicious" | "high_risk_impersonation";

export type Verification = {
  status: VerificationStatus;
  claimed: string;
  observed_sender: string;
  observed_domain: string;
  official_domains: string[];
  reason: string;
};

export type EngineInput = {
  type: InputType;
  text: string;
  sender?: string | undefined;
  replyTo?: string | undefined;
  claimedBrand?: string | undefined;
  url?: string | undefined;
};

export type FinalAssessment = {
  risk_score: number;
  risk_level: RiskLevel;
  confidence: number;
  primary_threat: ThreatCategory | null;
  threat_categories: ThreatCategory[];
  summary: string;
  signals: Signal[];
  tactics: string[];
  suspicious_entities: SuspiciousEntity[];
  claimed_identity: string;
  observed_indicators: string[];
  verification: Verification;
  url_analysis: UrlAnalysis[];
  recommended_actions: string[];
  verification_steps: string[];
  do_not_do: string[];
  limitations: string[];
  safe_to_proceed: boolean;
  scoring: { model_score: number | null; rules_score: number; final: number; method: string };
};

const domainOf = (s: string | undefined) => {
  if (!s) return "";
  const m = s.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  return m ? m[1]!.toLowerCase() : "";
};

const SAFE_ACTIONS = [
  "Don't click links, scan codes, or call numbers from this content until you've verified it.",
  "Open the organization's official app or type its website address yourself.",
  "Contact them through a trusted method you already have (card, statement, official site).",
];
const SAFE_STEPS = [
  "Look up the organization's official contact details independently — not from this message.",
  "Check whether the sender address or domain matches the organization's official domain.",
  "Ask a trusted person for a second opinion if money, codes or account access are involved.",
];
const DO_NOT = [
  "Don't share passwords, one-time codes, or recovery codes.",
  "Don't pay with gift cards, crypto or wire transfers on request.",
  "Don't install remote-access apps for someone who contacted you.",
];

// Never recommend contacting via data contained in the suspicious content.
const UNSAFE_ADVICE = /\b(click|tap|follow|open|visit|use) (on )?(the|this|that) (link|url|button)\b|\b(call|text|contact|reply to) (the|this) (number|sender|phone)\b|\bnumber (provided|listed|given|in the (message|email))\b|\breply to (this|the) (message|email|text)\b|\bscan (the|this) (qr|code)\b(?! with caution)|\blink provided\b/i;
const URLISH = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|co|io|info|biz|xyz|top|online|site|app)\b/gi;
const PHONEISH = /\+?\d[\d\s().-]{7,}\d/g;

export function assess(input: EngineInput, model: ModelOutput | null): FinalAssessment {
  const corpus = [input.text, input.sender, input.replyTo, input.url].filter(Boolean).join("\n");
  const hits = runHeuristics(corpus);
  const urls = Array.from(new Set([...(input.url ? [input.url] : []), ...extractUrls(input.text)]));
  const urlAnalyses = urls.map(analyzeUrl).filter((u): u is UrlAnalysis => !!u).slice(0, 4);

  // --- identity verification (deterministic) ---
  const brand = normalizeBrand(input.claimedBrand) ?? normalizeBrand(model?.claimed_identity) ?? findBrand(corpus);
  const senderDomain = domainOf(input.sender);
  const replyDomain = domainOf(input.replyTo);
  const linkDomains = urlAnalyses.map((u) => u.hostname);
  const observedDomain = senderDomain || linkDomains[0] || model?.observed_domain || "";
  const official = brand ? KNOWN_BRANDS[brand] ?? [] : [];
  let verification: Verification;
  const lookalike = urlAnalyses.find((u) => u.lookalike_of);
  const claimedLabel = input.claimedBrand || model?.claimed_identity || brand || "";
  const allDomains = [senderDomain, replyDomain, ...linkDomains].filter(Boolean);
  if (lookalike || (brand && allDomains.some((d) => !isOfficialDomain(d, brand) && d.replace(/[-.]/g, "").includes(brand.replace(/\s+/g, ""))))) {
    verification = { status: "high_risk_impersonation", claimed: claimedLabel || lookalike?.lookalike_of || "", observed_sender: input.sender ?? "", observed_domain: lookalike?.registrable_domain ?? observedDomain, official_domains: KNOWN_BRANDS[lookalike?.lookalike_of ?? brand ?? ""] ?? official, reason: "A domain imitates a known brand but is not one of its official domains." };
  } else if (brand && allDomains.length) {
    const allOfficial = allDomains.every((d) => isOfficialDomain(d, brand));
    const anyOfficial = allDomains.some((d) => isOfficialDomain(d, brand));
    verification = allOfficial
      ? { status: senderDomain ? "likely_match" : "likely_match", claimed: claimedLabel, observed_sender: input.sender ?? "", observed_domain: observedDomain, official_domains: official, reason: "Observed domains match the brand's known official domains. Display names and domains can still be spoofed — verify independently for high-impact actions." }
      : { status: anyOfficial ? "suspicious" : "suspicious", claimed: claimedLabel, observed_sender: input.sender ?? "", observed_domain: allDomains.find((d) => !isOfficialDomain(d, brand)) ?? observedDomain, official_domains: official, reason: `Claims to be ${claimedLabel} but uses a domain that isn't an official ${brand} domain.` };
  } else if (claimedLabel && allDomains.length) {
    verification = { status: "unverified", claimed: claimedLabel, observed_sender: input.sender ?? "", observed_domain: observedDomain, official_domains: [], reason: "We don't have official domain data for this organization. Check its official website yourself." };
  } else {
    verification = { status: "unverified", claimed: claimedLabel, observed_sender: input.sender ?? "", observed_domain: observedDomain, official_domains: official, reason: claimedLabel ? "No sender domain or link was available to compare against the claimed identity." : "No identity was claimed and no domain was available to check." };
  }
  if (replyDomain && senderDomain && registrableDomain(replyDomain) !== registrableDomain(senderDomain)) {
    if (verification.status === "likely_match" || verification.status === "unverified") verification = { ...verification, status: "suspicious", reason: `Replies would go to ${replyDomain}, a different domain than the sender (${senderDomain}).` };
  }

  // --- rules score ---
  let rules = hits.reduce((s, h) => s + h.rule.weight, 0);
  urlAnalyses.forEach((u) => u.findings.forEach((f) => (rules += URL_FINDING_WEIGHT[f.severity])));
  if (verification.status === "high_risk_impersonation") rules += 25;
  if (verification.status === "suspicious") rules += 15;
  rules = Math.min(100, rules);

  // --- signals (rules + url + model), deduped by title ---
  const ruleSignals: Signal[] = hits.map((h) => ({ title: h.rule.title, severity: h.rule.severity, evidence: `“${h.match}”`, explanation: h.rule.explanation, source: "rules" }));
  const urlSignals: Signal[] = urlAnalyses.flatMap((u) => u.findings.map((f) => ({ title: f.title, severity: f.severity, evidence: u.hostname, explanation: f.detail, source: "url" as const })));
  if (verification.status === "suspicious" || verification.status === "high_risk_impersonation") {
    urlSignals.unshift({ title: "Claimed identity doesn't match observed domain", severity: "high", evidence: `${verification.claimed || "Brand"} vs ${verification.observed_domain}`, explanation: verification.reason, source: "url" });
  }
  const seen = new Set<string>();
  // Skip rule signals whose matched text is already quoted as evidence by the model (avoids near-duplicate cards).
  const modelEvidence = (model?.why_flagged ?? []).map((s) => s.evidence.toLowerCase()).join(" | ");
  const freshRuleSignals = ruleSignals.filter((s, i) => !modelEvidence.includes((hits[i]?.match ?? "").toLowerCase()));
  const signals = [...(model?.why_flagged ?? []), ...urlSignals, ...freshRuleSignals].filter((s) => {
    const k = s.title.toLowerCase().slice(0, 40);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 14);

  // --- categories ---
  const cats = new Set<ThreatCategory>();
  if (model?.primary_threat) cats.add(model.primary_threat);
  model?.secondary_threats.forEach((c) => cats.add(c));
  hits.forEach((h) => h.rule.cats.forEach((c) => cats.add(c)));
  if (verification.status === "high_risk_impersonation" || verification.status === "suspicious") cats.add("brand_impersonation");
  if (input.type === "qr" && rules + (model?.risk_score ?? 0) > 30) cats.add("qr_phishing");
  if (urlAnalyses.some((u) => u.findings.some((f) => f.code === "bait_path"))) cats.add("phishing");
  const ruleCatCounts = new Map<ThreatCategory, number>();
  hits.forEach((h) => h.rule.cats.forEach((c) => ruleCatCounts.set(c, (ruleCatCounts.get(c) ?? 0) + h.rule.weight)));
  const primary = model?.primary_threat ?? (verification.status === "high_risk_impersonation" ? "brand_impersonation" : [...ruleCatCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null);

  // --- final score ---
  let final: number;
  let method: string;
  if (model) {
    final = Math.round(model.risk_score * ENGINE_WEIGHTS.model + rules * ENGINE_WEIGHTS.rules);
    // Strong deterministic evidence should not be overridden by an optimistic model.
    if (rules >= 60) final = Math.max(final, Math.round((model.risk_score + rules) / 2));
    method = "model+rules";
  } else {
    final = rules;
    method = "rules-only (AI unavailable)";
  }
  if (verification.status === "high_risk_impersonation") final = Math.max(final, ENGINE_WEIGHTS.impersonationFloor);
  final = Math.max(0, Math.min(100, final));

  // Evidence quality: more corroborating signals → higher confidence.
  const evidenceBoost = Math.min(15, (ruleSignals.length + urlSignals.length) * 3);
  const agreement = model ? 100 - Math.abs(model.risk_score - rules) : 0;
  let confidence = model ? Math.round(model.confidence * 0.7 + agreement * 0.15 + evidenceBoost) : Math.min(ENGINE_WEIGHTS.noModelConfidenceCap, 25 + evidenceBoost * 2);
  if (input.type === "screenshot" && !model) confidence = Math.min(confidence, 20);
  confidence = Math.max(5, Math.min(95, confidence));

  const level = scoreToLevel(final);
  // Drop model advice that points at contact details (links, domains, phone numbers) taken from the suspicious content.
  const inputContacts = new Set([...(corpus.match(URLISH) ?? []), ...(corpus.match(PHONEISH) ?? [])].map((x) => x.toLowerCase().replace(/[^a-z0-9.]/g, "")).filter((x) => x.length >= 6));
  const reusesContact = (x: string) => [...(x.match(URLISH) ?? []), ...(x.match(PHONEISH) ?? [])].some((c) => inputContacts.has(c.toLowerCase().replace(/[^a-z0-9.]/g, "")));
  const filterUnsafe = (l: string[]) => l.filter((x) => !UNSAFE_ADVICE.test(x) && !reusesContact(x));
  const merge = (a: string[], b: string[], n: number) => Array.from(new Set([...filterUnsafe(a), ...b])).slice(0, n);

  const observed = [
    ...(senderDomain ? [`Sender domain: ${senderDomain}`] : []),
    ...(replyDomain && replyDomain !== senderDomain ? [`Reply-to domain: ${replyDomain}`] : []),
    ...urlAnalyses.map((u) => `Link domain: ${u.registrable_domain}`),
  ];

  const summary = model?.summary
    ?? (hits.length || urlSignals.length
      ? `Our rule-based checks found ${hits.length + urlSignals.length} warning sign${hits.length + urlSignals.length === 1 ? "" : "s"}. AI analysis was unavailable, so this assessment is less nuanced than usual.`
      : "Our rule-based checks didn't find common scam patterns. AI analysis was unavailable, so subtle threats may be missed.");

  return {
    risk_score: final,
    risk_level: level,
    confidence,
    primary_threat: primary,
    threat_categories: Array.from(cats).slice(0, 8),
    summary,
    signals,
    tactics: Array.from(new Set([...(model?.social_engineering_tactics ?? []), ...hits.map((h) => h.rule.tactic).filter((t): t is string => !!t)])).slice(0, 8),
    suspicious_entities: model?.suspicious_entities ?? [],
    claimed_identity: claimedLabel,
    observed_indicators: Array.from(new Set(observed)).slice(0, 10),
    verification,
    url_analysis: urlAnalyses,
    recommended_actions: merge(model?.recommended_actions ?? [], level === "low" ? SAFE_ACTIONS.slice(1) : SAFE_ACTIONS, 7),
    verification_steps: merge(model?.verification_steps ?? [], SAFE_STEPS, 7),
    do_not_do: merge(model?.do_not_do ?? [], DO_NOT, 6),
    limitations: Array.from(new Set([
      ...(model?.limitations ?? []),
      ...(model ? [] : ["AI analysis was unavailable; this result comes from deterministic rules only. Re-run later for a fuller assessment."]),
      "Automated, AI-assisted assessment. It can be wrong and does not use live threat-intelligence feeds or visit links.",
    ])).slice(0, 6),
    safe_to_proceed: level === "low" && verification.status !== "suspicious" && verification.status !== "high_risk_impersonation",
    scoring: { model_score: model?.risk_score ?? null, rules_score: rules, final, method },
  };
}
