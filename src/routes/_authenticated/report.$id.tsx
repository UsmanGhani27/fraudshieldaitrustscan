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

const VLABEL: Record<string, string> = { verified: "Verified", likely_match: "Likely match", unverified: "Unverified", suspicious: "Suspicious", high_risk_impersonation: "High-risk impersonation" };

function ReportPage() {
  const { id } = Route.useParams();
  const { data: report, isLoading: rl } = useQuery({
    queryKey: ["report", id],
    queryFn: async () => (await supabase.from("reports").select("*").eq("id", id).maybeSingle()).data,
  });
  const { data: a, isLoading: al } = useQuery({ ...analysisDetailQuery(report?.analysis_id ?? "00000000-0000-0000-0000-000000000000"), enabled: !!report?.analysis_id });

  if (rl || (report && al)) return <div className="h-96 animate-pulse rounded-xl bg-card" />;
  if (!report || !a) return <EmptyState icon={FileX2} title="Report unavailable" description="This report or its analysis was deleted." action={<Button asChild variant="hero"><Link to="/reports">Back to reports</Link></Button>} />;

  const d = toResultData(a);
  const r = (s: string) => redactSecrets(s);
  const primary = d.primary_threat && isThreatCategory(d.primary_threat) ? CATEGORY_INFO[d.primary_threat].label : null;
  const cats = d.categories.filter(isThreatCategory).map((c) => CATEGORY_INFO[c].label);
  const v = d.verification;

  const download = () => {
    const lines = [
      "FRAUDSHIELD AI — SECURITY REPORT", "",
      `Report ID: ${report.id}`, `Analysis ID: ${a.id}`, `Input type: ${INPUT_LABEL[a.input_type as InputType]}`, `Analyzed: ${new Date(a.created_at).toLocaleString()}`, `Generated: ${new Date(report.generated_at).toLocaleString()}`,
      `Risk: ${RISK_LABEL[d.risk_level]} (${d.risk_score}/100)`, `Confidence: ${d.confidence}%`, "",
      "SUMMARY", r(d.summary), "", "THREATS", `Primary: ${primary ?? "None"}`, `All: ${cats.join(", ") || "None"}`, "",
      "WHY FLAGGED", ...d.signals.map((s) => `- [${s.severity.toUpperCase()}] ${r(s.title)}: ${r(s.explanation)} Evidence: ${r(s.evidence)}`), "",
      "IDENTITY VERIFICATION", v ? `${VLABEL[v.status]} — claims: ${v.claimed || "n/a"}; observed domain: ${v.observed_domain || "n/a"}. ${v.reason}` : "n/a", "",
      "RECOMMENDED ACTIONS", ...d.actions.map((x, i) => `${i + 1}. ${r(x)}`), "",
      "WHAT NOT TO DO", ...d.do_not_do.map((x) => `- ${r(x)}`), "",
      "VERIFICATION STEPS", ...d.steps.map((x) => `[ ] ${r(x)}`), "",
      "LIMITATIONS", ...d.limitations.map(r), "This is an automated, AI-assisted assessment — not a guarantee of safety. Verify independently through official channels.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url; el.download = `fraudshield-report-${report.id.slice(0, 8)}.txt`; el.click();
    URL.revokeObjectURL(url);
  };

  const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-6 border-b border-border pb-1 text-base font-semibold">{children}</h2>;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to="/reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />Reports</Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={download}><Download /> Download .txt</Button>
          <Button variant="hero" onClick={() => window.print()}><Printer /> Print / Save as PDF</Button>
        </div>
      </div>
      <article className="print-sheet mx-auto max-w-3xl rounded-xl border border-border bg-card p-8 text-sm">
        <header className="flex items-start justify-between border-b border-border pb-5">
          <div className="flex items-center gap-2 font-display text-lg font-semibold"><ShieldCheck className="size-5 text-cyan" />FraudShield AI</div>
          <div className="text-right text-xs text-muted-foreground"><div>Security report</div><div>Report ID {report.id.slice(0, 8)}</div><div>{new Date(report.generated_at).toLocaleString()}</div></div>
        </header>
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[["Analysis ID", a.id.slice(0, 8)], ["Input type", INPUT_LABEL[a.input_type as InputType]], ["Analyzed", new Date(a.created_at).toLocaleString()], ["Risk", `${RISK_LABEL[d.risk_level]} · ${d.risk_score}/100`], ["Confidence", `${d.confidence}%`], ["Primary threat", primary ?? "None"]].map(([k, val]) => (
            <div key={k}><dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium">{val}</dd></div>
          ))}
        </dl>
        <H>Summary</H><p className="mt-2">{r(d.summary)}</p>
        <H>Threats</H><p className="mt-2">{cats.join(", ") || "None identified"}</p>
        <H>Why this was flagged</H>
        <ul className="mt-2 space-y-2">{d.signals.map((s, i) => <li key={i}><strong>[{s.severity.toUpperCase()}] {r(s.title)}</strong> — {r(s.explanation)} {s.evidence && <span className="font-mono text-xs text-muted-foreground">{r(s.evidence)}</span>}</li>)}</ul>
        {v && <><H>Identity verification</H><p className="mt-2"><strong>{VLABEL[v.status]}</strong> · Claims: {v.claimed || "n/a"} · Observed domain: <span className="font-mono text-xs">{v.observed_domain || "n/a"}</span></p><p className="mt-1 text-muted-foreground">{v.reason}</p></>}
        <H>Recommended actions</H>
        <ol className="mt-2 list-decimal space-y-1 pl-5">{d.actions.map((x, i) => <li key={i}>{r(x)}</li>)}</ol>
        {d.do_not_do.length > 0 && <><H>What not to do</H><ul className="mt-2 list-disc space-y-1 pl-5">{d.do_not_do.map((x, i) => <li key={i}>{r(x)}</li>)}</ul></>}
        <H>Verification steps</H>
        <ul className="mt-2 space-y-1">{d.steps.map((x, i) => <li key={i}>☐ {r(x)}</li>)}</ul>
        <footer className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
          <strong>Limitations:</strong> {d.limitations.map(r).join(" ")} This report contains no raw submitted content. It is an automated, AI-assisted assessment — not a guarantee of safety. Verify independently through official channels.
        </footer>
      </article>
    </div>
  );
}
