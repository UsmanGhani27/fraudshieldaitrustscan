import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo } from "react";
import { ShieldCheck, ScanSearch, AlertOctagon, Activity, MessageSquareText, Link2, Image, Mail, QrCode, Lightbulb, ArrowRight, FileText, Siren, Gauge } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { useUsage } from "@/components/usage";
import { AnalysisList } from "@/components/analysis-list";
import { Button } from "@/components/ui/button";
import { analysesListQuery, reportsQuery } from "@/lib/queries";
import { CATEGORY_INFO, INPUT_LABEL, USAGE_WARN_RATIO, isThreatCategory, type InputType, type ThreatCategory } from "@/lib/risk";
import { cn } from "@/lib/utils";

const RiskTrendChart = lazy(() => import("@/components/risk-trend-chart"));

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — FraudShield AI" }, { name: "description", content: "Your protection overview and recent analyses." }] }),
  component: Dashboard,
});

const TIPS = [
  "Real banks never ask for your one-time code. Anyone who does is trying to take over your account.",
  "Open the company's app or type its website yourself instead of using links in messages.",
  "Urgency is a tactic. A legitimate organization will still be there after you take a minute to verify.",
  "Gift cards, crypto and wire transfers are almost impossible to reverse — scammers love them.",
];

const QUICK: [InputType, typeof Mail, string][] = [
  ["message", MessageSquareText, "Texts & DMs"],
  ["email", Mail, "Suspicious emails"],
  ["url", Link2, "Links"],
  ["screenshot", Image, "Screenshots"],
  ["qr", QrCode, "QR codes"],
];

function Stat({ icon: Icon, label, value, hint, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; hint?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground"><Icon className={cn("size-4", tone ?? "text-cyan")} />{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Dashboard() {
  const { data: analyses, isLoading } = useQuery(analysesListQuery());
  const { data: reports } = useQuery(reportsQuery());
  const { data: usage } = useUsage();
  const tip = TIPS[new Date().getDate() % TIPS.length] ?? TIPS[0];

  const stats = useMemo(() => {
    const list = analyses ?? [];
    const high = list.filter((a) => a.risk_level === "high").length;
    const critical = list.filter((a) => a.risk_level === "critical").length;
    const days: { day: string; avg: number | null; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const items = list.filter((a) => new Date(a.created_at).toDateString() === key);
      days.push({ day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), avg: items.length ? Math.round(items.reduce((s, a) => s + a.risk_score, 0) / items.length) : null, count: items.length });
    }
    const catCounts = new Map<ThreatCategory, number>();
    list.forEach((a) => a.analysis_categories.forEach((c) => { if (isThreatCategory(c.category)) catCounts.set(c.category, (catCounts.get(c.category) ?? 0) + 1); }));
    const cats = [...catCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { total: list.length, high, critical, days, cats, hasTrend: days.some((d) => d.count > 0) };
  }, [analyses]);

  const remaining = usage ? Math.max(0, usage.limit - usage.used) : null;
  const limitReached = usage ? usage.used >= usage.limit : false;
  const nearLimit = usage ? !limitReached && usage.used >= Math.ceil(usage.limit * USAGE_WARN_RATIO) : false;
  const maxCat = stats.cats[0]?.[1] ?? 1;

  if (!isLoading && stats.total === 0) {
    return (
      <div>
        <PageHeader title="Welcome to FraudShield AI" description="Got a message, email, link or QR code that feels off? Check it here." />
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card p-8 md:p-10">
          <div className="absolute inset-0 bg-glow" aria-hidden />
          <div className="relative max-w-xl">
            <ShieldCheck className="size-8 text-cyan" />
            <h2 className="mt-4 text-2xl font-semibold">Run your first analysis</h2>
            <p className="mt-2 text-muted-foreground">Paste something suspicious, or load a synthetic demo example to see how FraudShield explains risk and what to do next.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg"><Link to="/analyze">Analyze something <ArrowRight /></Link></Button>
              <Button asChild variant="outline" size="lg"><Link to="/help">How it works</Link></Button>
            </div>
            {usage && <p className="mt-6 text-xs text-muted-foreground">{usage.limit} analyses included this month on the {usage.plan} plan.</p>}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {QUICK.map(([t, Icon, d]) => (
            <Link key={t} to="/analyze" search={{ type: t }} className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50">
              <Icon className="size-5 text-cyan" /><p className="mt-2 text-sm font-medium">{INPUT_LABEL[t]}</p><p className="text-xs text-muted-foreground">{d}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Your protection overview — based only on analyses you've run." actions={<Button asChild variant="hero"><Link to="/analyze"><ScanSearch /> New analysis</Link></Button>} />

      {(nearLimit || limitReached) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-risk-medium/40 bg-risk-medium/10 px-4 py-3 text-sm" role="status">
          <span>{limitReached ? "You've used all analyses for this month. Your allowance resets on the 1st." : `You've used ${usage?.used} of ${usage?.limit} analyses this month.`}</span>
          <Link to="/billing" className="font-medium text-primary hover:underline">View plan</Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-xl border border-primary/40 bg-card p-4 shadow-glow sm:col-span-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground"><ShieldCheck className="size-4 text-risk-low" />Protection status</div>
          <div className="mt-2 text-lg font-semibold">{limitReached ? "Paused — monthly limit reached" : "Ready to analyze"}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{usage ? <><span className="capitalize">{usage.plan}</span> plan · {remaining} analyses remaining</> : "Loading plan…"}</p>
          {usage && <div className="mt-3 h-1.5 rounded-full bg-muted" role="progressbar" aria-valuenow={usage.used} aria-valuemax={usage.limit} aria-label="Monthly usage"><div className={cn("h-full rounded-full", limitReached ? "bg-risk-critical" : nearLimit ? "bg-risk-medium" : "bg-brand")} style={{ width: `${Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100)}%` }} /></div>}
        </div>
        <Stat icon={Activity} label="Total analyses" value={isLoading ? "—" : stats.total} />
        <Stat icon={AlertOctagon} label="High risk" value={isLoading ? "—" : stats.high} tone="text-risk-high" />
        <Stat icon={Siren} label="Critical" value={isLoading ? "—" : stats.critical} tone="text-risk-critical" />
        <Stat icon={FileText} label="Reports" value={reports?.length ?? "—"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Average risk · last 14 days</h2>
          {stats.hasTrend ? (
            <div className="mt-4 h-48"><Suspense fallback={<div className="h-full animate-pulse rounded bg-muted/40" />}><RiskTrendChart data={stats.days} /></Suspense></div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No analyses in the last 14 days.</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Threat categories</h2>
          {stats.cats.length ? (
            <ul className="mt-4 space-y-3">
              {stats.cats.map(([c, n]) => (
                <li key={c}>
                  <Link to="/threats/$category" params={{ category: c }} className="group block">
                    <div className="flex justify-between text-sm"><span className="group-hover:text-primary">{CATEGORY_INFO[c].label}</span><span className="font-mono text-muted-foreground">{n}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-cyan/70" style={{ width: `${(n / maxCat) * 100}%` }} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="py-12 text-center text-sm text-muted-foreground">No threat categories detected yet.</p>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {QUICK.map(([t, Icon, d]) => (
          <Link key={t} to="/analyze" search={{ type: t }} className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Icon className="size-5 text-cyan" /><p className="mt-2 text-sm font-medium">Analyze {INPUT_LABEL[t].toLowerCase()}</p><p className="text-xs text-muted-foreground">{d}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent analyses</h2>
            <Link to="/history" className="flex items-center gap-1 text-sm text-primary hover:underline">View all <ArrowRight className="size-3.5" /></Link>
          </div>
          {isLoading ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-card" />)}</div> : <AnalysisList items={(analyses ?? []).slice(0, 5)} />}
        </div>
        <div className="space-y-4 lg:pt-10">
          <div className="rounded-xl border border-border bg-surface-2 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4 text-risk-medium" />Stay safe</div>
            <p className="mt-2 text-sm text-muted-foreground">{tip}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><Gauge className="size-4 text-cyan" />This month</div>
            <p className="mt-2 text-sm text-muted-foreground">{usage ? `${usage.used} used · ${remaining} remaining of ${usage.limit}` : "Loading…"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
