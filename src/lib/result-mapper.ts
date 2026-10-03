import type { AnalysisDetail } from "./queries";
import type { RiskLevel } from "./risk";
import type { ResultData } from "@/components/result-view";

const asStrings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function toResultData(a: AnalysisDetail): ResultData {
  return {
    risk_level: a.risk_level as RiskLevel,
    risk_score: a.risk_score,
    confidence: a.confidence,
    summary: a.summary,
    categories: a.analysis_categories.map((c) => c.category),
    claimed_identity: a.claimed_identity,
    observed_indicators: asStrings(a.observed_indicators),
    signals: a.analysis_signals,
    actions: [...a.analysis_actions].sort((x, y) => x.sort_order - y.sort_order).map((x) => x.action_text),
    steps: [...a.verification_steps].sort((x, y) => x.sort_order - y.sort_order).map((x) => x.step_text),
    uncertainty: asStrings(a.uncertainty_notes),
    safe_to_proceed: a.safe_to_proceed,
    provider: a.provider,
    model: a.model,
  };
}

