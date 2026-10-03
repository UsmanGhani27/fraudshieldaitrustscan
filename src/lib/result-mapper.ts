import type { AnalysisDetail } from "./queries";
import type { RiskLevel, ThreatCategory } from "./risk";
import type { Verification } from "./engine/risk-engine";
import type { UrlAnalysis } from "./engine/url-analysis";
import type { SuspiciousEntity } from "./validation";

export type ResultData = {
  risk_level: RiskLevel;
  risk_score: number;
  confidence: number;
  summary: string;
  primary_threat: ThreatCategory | null;
  categories: string[];
  claimed_identity: string | null;
  observed_indicators: string[];
  signals: { title: string; severity: "low" | "medium" | "high"; evidence: string; explanation: string }[];
  tactics: string[];
  suspicious_entities: SuspiciousEntity[];
  verification: Verification | null;
  url_analysis: UrlAnalysis[];
  actions: string[];
  do_not_do: string[];
  steps: string[];
  limitations: string[];
  safe_to_proceed: boolean;
  provider: string;
  model: string;
  scoring: { model_score: number | null; rules_score: number; final: number; method: string } | null;
  version: string;
};

const asStrings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const asArr = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);

export function toResultData(a: AnalysisDetail): ResultData {
  const d = (a.details ?? {}) as Record<string, unknown>;
  const acts = [...a.analysis_actions].sort((x, y) => x.sort_order - y.sort_order);
  return {
    risk_level: a.risk_level as RiskLevel,
    risk_score: a.risk_score,
    confidence: a.confidence,
    summary: a.summary,
    primary_threat: (a.primary_threat as ThreatCategory | null) ?? null,
    categories: a.analysis_categories.map((c) => c.category),
    claimed_identity: a.claimed_identity,
    observed_indicators: asStrings(a.observed_indicators),
    signals: a.analysis_signals,
    tactics: asStrings(d["tactics"]),
    suspicious_entities: asArr<SuspiciousEntity>(d["suspicious_entities"]),
    verification: (d["verification"] as Verification | undefined) ?? null,
    url_analysis: asArr<UrlAnalysis>(d["url_analysis"]),
    actions: acts.filter((x) => x.action_type !== "avoid").map((x) => x.action_text),
    do_not_do: acts.filter((x) => x.action_type === "avoid").map((x) => x.action_text),
    steps: [...a.verification_steps].sort((x, y) => x.sort_order - y.sort_order).map((x) => x.step_text),
    limitations: asStrings(a.uncertainty_notes),
    safe_to_proceed: a.safe_to_proceed,
    provider: a.provider,
    model: a.model,
    scoring: (d["scoring"] as ResultData["scoring"] | undefined) ?? null,
    version: a.analysis_version,
  };
}
