import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Fingerprint, ListChecks, ShieldAlert, Sparkles, Info, Ban, Brain, Link2, ChevronDown, Wrench, BadgeCheck, ShieldQuestion, ShieldX } from "lucide-react";
import { RiskBadge, RISK_TEXT, RISK_BG, Disclaimer } from "./brand";
import { CATEGORY_INFO, isThreatCategory, type RiskLevel } from "@/lib/risk";
import type { ResultData } from "@/lib/result-mapper";
import type { VerificationStatus } from "@/lib/engine/risk-engine";
import { cn } from "@/lib/utils";

export type { ResultData };

const SEV: Record<string, string> = { low: "border-l-risk-low", medium: "border-l-risk-medium", high: "border-l-risk-critical" };

export function ScoreDial({ score, level }: { score: number; level: RiskLevel }) {
  const r = 42, c = 2 * Math.PI * r;
  return (
    <div className="relative size-28 shrink-0" role="img" aria-label={`Risk score ${score} out of 100`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} className={RISK_TEXT[level]} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><div className="font-display text-3xl font-semibold">{score}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">risk / 100</div></div>
      </div>
    </div>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const label = value >= 75 ? "High" : value >= 45 ? "Moderate" : "Low";
  return (
    <div className="min-w-36">
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Confidence</span><span className="font-mono">{value}% · {label}</span></div>
      <div className="mt-1 h-1.5 rounded-full bg-muted" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Confidence"><div className="h-full rounded-full bg-cyan" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

const VERIFY: Record<VerificationStatus, { label: string; cls: string; icon: typeof BadgeCheck }> = {
  verified: { label: "Verified", cls: "text-risk-low bg-risk-low/10 ring-risk-low/40", icon: BadgeCheck },
  likely_match: { label: "Likely match", cls: "text-risk-low bg-risk-low/10 ring-risk-low/40", icon: BadgeCheck },
  unverified: { label: "Unverified", cls: "text-muted-foreground bg-muted ring-border", icon: ShieldQuestion },
  suspicious: { label: "Suspicious", cls: "text-risk-high bg-risk-high/10 ring-risk-high/40", icon: ShieldAlert },
  high_risk_impersonation: { label: "High-risk impersonation", cls: "text-risk-critical bg-risk-critical/10 ring-risk-critical/40", icon: ShieldX },
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const v = VERIFY[status] ?? VERIFY.unverified;
  const Icon = v.icon;
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ring-1", v.cls)}><Icon className="size-3.5" />{v.label}</span>;
}

export function Section({ icon: Icon, title, children, className, tone }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode; className?: string; tone?: "danger" }) {
  return (
    <section className={cn("rounded-xl border bg-card p-5", tone === "danger" ? "border-risk-critical/30" : "border-border", className)} aria-labelledby={`h-${title}`}>
      <h2 id={`h-${title}`} className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Icon className={cn("size-4", tone === "danger" ? "text-risk-critical" : "text-cyan")} />{title}</h2>
      {children}
    </section>
  );
}

export function SignalCard({ s }: { s: ResultData["signals"][number] }) {
  return (
    <li className={cn("rounded-lg border border-border border-l-4 bg-surface-2/50 p-4", SEV[s.severity])}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">{s.title}</h3>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.severity}</span>
      </div>
      {s.evidence && <p className="mt-2 break-words rounded bg-background/60 px-2 py-1 font-mono text-xs text-cyan">{s.evidence}</p>}
      {s.explanation && <p className="mt-2 text-sm text-muted-foreground">{s.explanation}</p>}
    </li>
  );
}

export function ResultView({ data, linkCategories = true, meta }: { data: ResultData; linkCategories?: boolean; meta?: React.ReactNode }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const fallback = data.provider === "fraudshield-rules";
  const primary = data.primary_threat && isThreatCategory(data.primary_threat) ? data.primary_threat : null;
  const secondary = data.categories.filter(isThreatCategory).filter((c) => c !== primary);
  const v = data.verification;

  const catChip = (c: (typeof secondary)[number], strong?: boolean) =>
    linkCategories ? (
      <Link key={c} to="/threats/$category" params={{ category: c }} className={cn("rounded-md border px-2.5 py-1 text-xs hover:border-primary/60", strong ? "border-primary/50 bg-primary/15 font-medium" : "border-border bg-secondary")}>{CATEGORY_INFO[c].label}</Link>
    ) : (
      <span key={c} className={cn("rounded-md border px-2.5 py-1 text-xs", strong ? "border-primary/50 bg-primary/15 font-medium" : "border-border bg-secondary")}>{CATEGORY_INFO[c].label}</span>
    );

  return (
    <div className="space-y-4">
      {fallback && (
        <div role="status" className="flex gap-3 rounded-xl border border-risk-medium/40 bg-risk-medium/10 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-risk-medium" />
          <p><strong>AI analysis was unavailable.</strong> This result comes from our deterministic rule checks only and may miss subtle threats. Re-run later for a full assessment.</p>
        </div>
      )}

      {/* Verdict */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
        <div className={cn("absolute inset-x-0 top-0 h-1", RISK_BG[data.risk_level])} />
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <ScoreDial score={data.risk_score} level={data.risk_level} />
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <RiskBadge level={data.risk_level} size="lg" />
              <ConfidenceBar value={data.confidence} />
              {data.safe_to_proceed ? (
                <span className="inline-flex items-center gap-1 text-sm text-risk-low"><CheckCircle2 className="size-4" />No major warning signs — still verify</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm text-risk-high"><AlertTriangle className="size-4" />Don't act until you've verified</span>
              )}
            </div>
            <p className="text-base leading-relaxed">{data.summary}</p>
            {(primary || secondary.length > 0) && (
              <div className="flex flex-wrap items-center gap-2">
                {primary && <><span className="text-xs text-muted-foreground">Primary threat</span>{catChip(primary, true)}</>}
                {secondary.length > 0 && <span className="ml-1 text-xs text-muted-foreground">Also</span>}
                {secondary.map((c) => catChip(c))}
              </div>
            )}
            {meta}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Section icon={ShieldAlert} title="Why we flagged this">
          {data.signals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No specific warning signs were identified. That doesn't guarantee it's safe.</p>
          ) : (
            <ul className="space-y-3">{data.signals.map((s, i) => <SignalCard key={i} s={s} />)}</ul>
          )}
          {data.tactics.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Brain className="size-3.5" />Social-engineering tactics</h3>
              <div className="flex flex-wrap gap-2">{data.tactics.map((t) => <span key={t} className="rounded-full bg-risk-medium/10 px-2.5 py-1 text-xs text-risk-medium ring-1 ring-risk-medium/30">{t}</span>)}</div>
            </div>
          )}
        </Section>

        <div className="space-y-4">
          <Section icon={Fingerprint} title="Identity check">
            {v ? (
              <div className="space-y-3 text-sm">
                <VerificationBadge status={v.status} />
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                  <dt className="text-muted-foreground">Claims to be</dt><dd className="font-medium">{v.claimed || "Nobody specific"}</dd>
                  {v.observed_sender && <><dt className="text-muted-foreground">Sender</dt><dd className="break-all font-mono text-xs">{v.observed_sender}</dd></>}
                  <dt className="text-muted-foreground">Observed domain</dt><dd className="break-all font-mono text-xs">{v.observed_domain || "None found"}</dd>
                  {v.official_domains.length > 0 && <><dt className="text-muted-foreground">Official</dt><dd className="break-all font-mono text-xs">{v.official_domains.slice(0, 3).join(", ")}</dd></>}
                </dl>
                <p className="text-xs text-muted-foreground">{v.reason}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Claims to be: {data.claimed_identity || "Nobody specific"}</p>
            )}
          </Section>
          <Section icon={Sparkles} title="What to do next">
            <ol className="list-decimal space-y-2 pl-5 text-sm">{data.actions.map((a, i) => <li key={i}>{a}</li>)}</ol>
          </Section>
          {data.do_not_do.length > 0 && (
            <Section icon={Ban} title="What not to do" tone="danger">
              <ul className="space-y-2 text-sm">{data.do_not_do.map((a, i) => <li key={i} className="flex gap-2"><Ban className="mt-0.5 size-3.5 shrink-0 text-risk-critical" />{a}</li>)}</ul>
            </Section>
          )}
        </div>
      </div>

      <Section icon={ListChecks} title="Verify independently">
        <ul className="grid gap-2 md:grid-cols-2">
          {data.steps.map((s, i) => (
            <li key={i}>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-border bg-surface-2/40 p-3 text-sm hover:border-primary/50 focus-within:ring-2 focus-within:ring-ring">
                <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={!!checked[i]} onChange={(e) => setChecked({ ...checked, [i]: e.target.checked })} />
                <span className={cn(checked[i] && "text-muted-foreground line-through")}>{s}</span>
              </label>
            </li>
          ))}
        </ul>
      </Section>

      {data.url_analysis.length > 0 && (
        <Section icon={Link2} title="Link analysis">
          <p className="mb-3 text-xs text-muted-foreground">Links were inspected as text only. We never open or visit them.</p>
          <ul className="space-y-3">
            {data.url_analysis.map((u) => (
              <li key={u.normalized_url} className="rounded-lg border border-border bg-surface-2/40 p-3">
                <p className="break-all font-mono text-xs">{u.normalized_url}</p>
                <p className="mt-1 text-xs text-muted-foreground">Domain: <span className="font-mono text-foreground">{u.registrable_domain}</span> · Protocol: {u.protocol}{u.lookalike_of ? ` · Imitates ${u.lookalike_of}` : ""}</p>
                {u.findings.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm">{u.findings.map((f) => <li key={f.code} className="flex gap-2"><span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", f.severity === "high" ? "bg-risk-critical" : f.severity === "medium" ? "bg-risk-medium" : "bg-risk-low")} /><span><strong className="font-medium">{f.title}.</strong> <span className="text-muted-foreground">{f.detail}</span></span></li>)}</ul>
                ) : <p className="mt-2 text-sm text-muted-foreground">No structural warning signs in this link.</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <details className="group rounded-xl border border-border bg-card p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-2"><Wrench className="size-4 text-cyan" />Technical details</span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            <dt className="text-muted-foreground">Engine</dt><dd className="font-mono text-xs">{data.provider} · {data.model}</dd>
            <dt className="text-muted-foreground">Version</dt><dd className="font-mono text-xs">{data.version}</dd>
            {data.scoring && <>
              <dt className="text-muted-foreground">Scoring</dt><dd className="font-mono text-xs">{data.scoring.method}</dd>
              <dt className="text-muted-foreground">AI score</dt><dd className="font-mono text-xs">{data.scoring.model_score ?? "n/a"}</dd>
              <dt className="text-muted-foreground">Rules score</dt><dd className="font-mono text-xs">{data.scoring.rules_score}</dd>
            </>}
          </dl>
          <div className="space-y-3">
            {data.observed_indicators.length > 0 && <div><p className="text-xs text-muted-foreground">Observed indicators</p><ul className="mt-1 space-y-0.5">{data.observed_indicators.map((o) => <li key={o} className="break-all font-mono text-xs">{o}</li>)}</ul></div>}
            {data.suspicious_entities.length > 0 && <div><p className="text-xs text-muted-foreground">Suspicious entities</p><ul className="mt-1 space-y-1">{data.suspicious_entities.map((e, i) => <li key={i} className="text-xs"><span className="font-mono">{e.type}: {e.value}</span> <span className="text-muted-foreground">— {e.reason}</span></li>)}</ul></div>}
          </div>
        </div>
      </details>

      <Disclaimer>
        <strong className="text-foreground">This is an automated assessment, not a guarantee of safety.</strong>{" "}
        {data.limitations.join(" ")}
      </Disclaimer>
    </div>
  );
}
