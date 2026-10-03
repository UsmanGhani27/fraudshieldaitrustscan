import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, Download, ArrowLeft, FileX2, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { analysisDetailQuery } from "@/lib/queries";
import { toResultData } from "@/lib/result-mapper";
import { CATEGORY_INFO, INPUT_LABEL, RISK_LABEL, isThreatCategory, type InputType } from "@/lib/risk";
import { redactSecrets } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/report/$id")({
  head: () => ({ meta: [{ title: "Security report — FraudShield AI" }, { name: "description", content: "Printable security report." }] }),
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  const { data: report, isLoading: rl } = useQuery({
    queryKey: ["report", id],
    queryFn: async () => (await supabase.from("reports").select("*").eq("id", id).maybeSingle()).data,
  });
  const { data: a, isLoading: al } = useQuery({ ...analysisDetailQuery(report?.analysis_id ?? ""), enabled: !!report?.analysis_id });

  if (rl || (report && al)) return <div className="h-96 animate-pulse rounded-xl bg-card" />;
  if (!report || !a) return <EmptyState icon={FileX2} title="Report unavailable" description="This report or its analysis was deleted." action={<Button asChild variant="hero"><Link to="/reports">Back to reports</Link></Button>} />;

  const d = toResultData(a);
  const r = (s: string) => redactSecrets(s);
  const cats = d.categories.filter(isThreatCategory).map((c) => CATEGORY_INFO[c].label);

  const download = () => {
    const lines = [
      "FRAUDSHIELD AI — SECURITY REPORT", "",
      `Analysis ID: ${a.id}`, `Input type: ${INPUT_LABEL[a.input_type as InputType]}`, `Date/time: ${new Date(a.created_at).toLocaleString()}`,
      `Risk: ${RISK_LABEL[d.risk_level]} (${d.risk_score}/100)`, `Confidence: ${d.confidence}%`, "",
      "SUMMARY", r(d.summary), "", "THREAT CATEGORIES", cats.join(", ") || "None", "",
      "SIGNALS", ...d.signals.map((s) => `- [${s.severity.toUpperCase()}] ${r(s.title)}: ${r(s.explanation)} Evidence: ${r(s.evidence)}`), "",
      "RECOMMENDED ACTIONS", ...d.actions.map((x, i) => `${i + 1}. ${r(x)}`), "",
      "VERIFICATION STEPS", ...d.steps.map((x) => `[ ] ${r(x)}`), "",
      "SAFETY NOTE", "This is an automated, AI-assisted assessment — not a guarantee of safety. Verify independently through official channels.", ...d.uncertainty.map(r),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url; el.download = `fraudshield-report-${a.id.slice(0, 8)}.txt`; el.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to="/reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />Reports</Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={download}><Download /> Download .txt</Button>
          <Button variant="hero" onClick={() => window.print()}><Printer /> Print / Save PDF</Button>
        </div>
      </div>
      <article className="print-sheet mx-auto max-w-3xl rounded-xl border border-border bg-card p-8 text-sm">
        <header className="flex items-start justify-between border-b border-border pb-5">
          <div className="flex items-center gap-2 font-display text-lg font-semibold"><ShieldCheck className="size-5 text-cyan" />FraudShield AI</div>
          <div className="text-right text-xs text-muted-foreground"><div>Security report</div><div>{new Date(report.generated_at).toLocaleString()}</div></div>
        </header>
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[["Analysis ID", a.id.slice(0, 8)], ["Input type", INPUT_LABEL[a.input_type as InputType]], ["Analyzed", new Date(a.created_at).toLocaleString()], ["Risk level", `${RISK_LABEL[d.risk_level]} · ${d.risk_score}/100`], ["Confidence", `${d.confidence}%`], ["Engine", `${d.provider}`]].map(([k, v]) => (
            <div key={k}><dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
          ))}
        </dl>
        <h2 className="mt-6 text-base font-semibold">Summary</h2><p className="mt-1">{r(d.summary)}</p>
        <h2 className="mt-5 text-base font-semibold">Threat categories</h2><p className="mt-1">{cats.join(", ") || "None identified"}</p>
        <h2 className="mt-5 text-base font-semibold">Signals & evidence</h2>
        <ul className="mt-2 space-y-2">{d.signals.map((s, i) => <li key={i}><strong>[{s.severity.toUpperCase()}] {r(s.title)}</strong> — {r(s.explanation)} <span className="font-mono text-xs text-muted-foreground">“{r(s.evidence)}”</span></li>)}</ul>
        <h2 className="mt-5 text-base font-semibold">Recommended actions</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">{d.actions.map((x, i) => <li key={i}>{r(x)}</li>)}</ol>
        <h2 className="mt-5 text-base font-semibold">Verification steps</h2>
        <ul className="mt-2 space-y-1">{d.steps.map((x, i) => <li key={i}>☐ {r(x)}</li>)}</ul>
        <footer className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
          <strong>Uncertainty & safety note:</strong> This is an automated, AI-assisted assessment — not a guarantee of safety. {d.uncertainty.map(r).join(" ")} Verify independently through official channels before making high-impact decisions.
        </footer>
      </article>
    </div>
  );
}
