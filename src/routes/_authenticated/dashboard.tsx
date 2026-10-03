import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ShieldCheck, ScanSearch, AlertOctagon, Activity, MessageSquareText, Link2, Image, Mail, Lightbulb, ArrowRight } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { useUsage } from "@/components/usage";
import { RiskBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { analysesListQuery } from "@/lib/queries";
import { INPUT_LABEL, type InputType, type RiskLevel } from "@/lib/risk";

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

function Stat({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Icon className="size-4 text-cyan" />{label}</div>
      <div className="mt-3 font-display text-3xl font-semibold">{value}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Dashboard() {
  const { data: analyses, isLoading } = useQuery(analysesListQuery());
  const { data: usage } = useUsage();
  const tip = TIPS[new Date().getDate() % TIPS.length];

  const stats = useMemo(() => {
    const list = analyses ?? [];
    const highCrit = list.filter((a) => a.risk_level === "high" || a.risk_level === "critical").length;
    const days: { day: string; avg: number | null; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const items = list.filter((a) => a.created_at.slice(0, 10) === key);
      days.push({ day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), avg: items.length ? Math.round(items.reduce((s, a) => s + a.risk_score, 0) / items.length) : null, count: items.length });
    }
    return { total: list.length, highCrit, days, hasTrend: days.some((d) => d.count > 0) };
  }, [analyses]);

  const limitReached = usage ? usage.used >= usage.limit : false;

  return (
    <div>
      <PageHeader title="Dashboard" description="Your protection overview, based only on analyses you've run." actions={<Button asChild variant="hero"><Link to="/analyze"><ScanSearch /> New analysis</Link></Button>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-primary/40 bg-card p-5 shadow-glow">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><ShieldCheck className="size-4 text-risk-low" />Protection status</div>
          <div className="mt-3 text-lg font-semibold">{limitReached ? "Monthly limit reached" : "Ready to analyze"}</div>
          <p className="mt-1 text-xs text-muted-foreground">{usage ? `${usage.plan[0].toUpperCase()}${usage.plan.slice(1)} plan` : "Loading plan…"}</p>
        </div>
        <Stat icon={Activity} label="Analyses this month" value={usage ? <>{usage.used}<span className="text-base text-muted-foreground"> / {usage.limit}</span></> : "—"} />
        <Stat icon={ScanSearch} label="Threats analyzed" value={isLoading ? "—" : stats.total} hint="All-time, in your history" />
        <Stat icon={AlertOctagon} label="High / critical" value={isLoading ? "—" : stats.highCrit} hint="Findings that need caution" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Risk trend · last 14 days</h2>
          {stats.hasTrend ? (
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.days} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [v ?? "—", "Avg risk"]} />
                  <Area type="monotone" dataKey="avg" connectNulls stroke="var(--chart-1)" fill="url(#riskFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-10 pb-10 text-center text-sm text-muted-foreground">Your trend will appear after your first analysis.</p>
          )}
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {([["message", MessageSquareText], ["email", Mail], ["url", Link2], ["screenshot", Image]] as [InputType, typeof Mail][]).map(([t, Icon]) => (
                <Button key={t} asChild variant="outline" className="justify-start"><Link to="/analyze" search={{ type: t }}><Icon className="text-cyan" />{INPUT_LABEL[t]}</Link></Button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface-2 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4 text-risk-medium" />Stay safe</div>
            <p className="mt-2 text-sm text-muted-foreground">{tip}</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent analyses</h2>
          {stats.total > 0 && <Link to="/history" className="flex items-center gap-1 text-sm text-primary hover:underline">View all <ArrowRight className="size-3.5" /></Link>}
        </div>
        {isLoading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-card" />)}</div>
        ) : stats.total === 0 ? (
          <EmptyState icon={ScanSearch} title="No analyses yet" description="Paste a suspicious message or link — or load a synthetic demo example — to see your first threat assessment." action={<Button asChild variant="hero"><Link to="/analyze">Run your first analysis</Link></Button>} />
        ) : (
          <AnalysisList items={(analyses ?? []).slice(0, 5)} />
        )}
      </div>
    </div>
  );
}

export function AnalysisList({ items }: { items: { id: string; title: string; input_type: string; risk_level: string; risk_score: number; created_at: string }[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {items.map((a) => (
        <li key={a.id}>
          <Link to="/analysis/$id" params={{ id: a.id }} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2">
            <RiskBadge level={a.risk_level as RiskLevel} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.title}</p>
              <p className="text-xs text-muted-foreground">{INPUT_LABEL[a.input_type as InputType]} · {new Date(a.created_at).toLocaleString()}</p>
            </div>
            <span className="font-mono text-sm text-muted-foreground">{a.risk_score}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
