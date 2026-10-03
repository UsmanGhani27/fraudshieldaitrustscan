import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Fingerprint, Eye, ListChecks, ShieldAlert, Sparkles, Info } from "lucide-react";
import { RiskBadge, RISK_TEXT, RISK_BG, Disclaimer } from "./brand";
import { CATEGORY_INFO, isThreatCategory, type RiskLevel } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { useState } from "react";

export type ResultData = {
  risk_level: RiskLevel;
  risk_score: number;
  confidence: number;
  summary: string;
  categories: string[];
  claimed_identity: string | null;
  observed_indicators: string[];
  signals: { title: string; severity: "low" | "medium" | "high"; evidence: string; explanation: string }[];
  actions: string[];
  steps: string[];
  uncertainty: string[];
  safe_to_proceed: boolean;
  provider: string;
  model: string;
};

const SEV: Record<string, string> = {
  low: "border-l-risk-low",
  medium: "border-l-risk-medium",
  high: "border-l-risk-critical",
};

export function ScoreDial({ score, level }: { score: number; level: RiskLevel }) {
  const r = 42, c = 2 * Math.PI * r;
  return (
    <div className="relative size-28 shrink-0" aria-label={`Risk score ${score} of 100`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} className={RISK_TEXT[level]} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><div className="font-display text-3xl font-semibold">{score}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">risk / 100</div></div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children, className }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="size-4 text-cyan" />{title}</h2>
      {children}
    </section>
  );
}

export function ResultView({ data, linkCategories = true }: { data: ResultData; linkCategories?: boolean }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const fallback = data.provider === "fraudshield-heuristic";
  return (
    <div className="space-y-4">
      {fallback && (
        <div className="flex gap-3 rounded-xl border border-risk-medium/40 bg-risk-medium/10 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-risk-medium" />
          <p><strong>AI analysis was unavailable.</strong> This result was produced by our transparent rule-based fallback analyzer and may miss subtle threats. Re-run later for a full AI-assisted assessment.</p>
        </div>
      )}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
        <div className={cn("absolute inset-x-0 top-0 h-1", RISK_BG[data.risk_level])} />
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <ScoreDial score={data.risk_score} level={data.risk_level} />
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <RiskBadge level={data.risk_level} size="lg" />
              <span className="font-mono text-sm text-muted-foreground">Confidence {data.confidence}%</span>
              {data.safe_to_proceed ? (
                <span className="inline-flex items-center gap-1 text-sm text-risk-low"><CheckCircle2 className="size-4" />Likely safe — still verify</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm text-risk-high"><AlertTriangle className="size-4" />Do not proceed until verified</span>
              )}
            </div>
            <p className="leading-relaxed">{data.summary}</p>
            {data.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.categories.filter(isThreatCategory).map((c) =>
                  linkCategories ? (
                    <Link key={c} to="/threats/$category" params={{ category: c }} className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs hover:border-primary/60">{CATEGORY_INFO[c].label}</Link>
                  ) : (
                    <span key={c} className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs">{CATEGORY_INFO[c].label}</span>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Section icon={ShieldAlert} title="Why we flagged it">
          {data.signals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No specific risk signals were identified.</p>
          ) : (
            <ul className="space-y-3">
              {data.signals.map((s, i) => (
                <li key={i} className={cn("rounded-lg border border-border border-l-4 bg-surface-2/50 p-4", SEV[s.severity])}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold">{s.title}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.severity}</span>
                  </div>
                  {s.evidence && <p className="mt-2 break-words rounded bg-background/60 px-2 py-1 font-mono text-xs text-cyan">{s.evidence}</p>}
                  {s.explanation && <p className="mt-2 text-sm text-muted-foreground">{s.explanation}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>
        <div className="space-y-4">
          <Section icon={Fingerprint} title="Claimed vs observed">
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Claims to be</dt><dd className="mt-0.5 font-medium">{data.claimed_identity || "No identity claimed"}</dd></div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="size-3" />Observed indicators</dt>
                {data.observed_indicators.length ? (
                  <ul className="mt-1 space-y-1">{data.observed_indicators.map((o, i) => <li key={i} className="break-words font-mono text-xs">{o}</li>)}</ul>
                ) : <dd className="mt-0.5 text-muted-foreground">None recorded</dd>}
              </div>
            </dl>
          </Section>
          <Section icon={Sparkles} title="Recommended next steps">
            <ol className="list-decimal space-y-2 pl-5 text-sm">{data.actions.map((a, i) => <li key={i}>{a}</li>)}</ol>
          </Section>
        </div>
      </div>

      <Section icon={ListChecks} title="Verification checklist">
        <ul className="grid gap-2 md:grid-cols-2">
          {data.steps.map((s, i) => (
            <li key={i}>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-border bg-surface-2/40 p-3 text-sm hover:border-primary/50">
                <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" checked={!!checked[i]} onChange={(e) => setChecked({ ...checked, [i]: e.target.checked })} />
                <span className={cn(checked[i] && "text-muted-foreground line-through")}>{s}</span>
              </label>
            </li>
          ))}
        </ul>
      </Section>

      <Disclaimer>
        <strong className="text-foreground">This is an automated assessment, not a guarantee of safety.</strong>{" "}
        {data.uncertainty.join(" ")} Analyzed by {data.provider} · {data.model}.
      </Disclaimer>
    </div>
  );
}
