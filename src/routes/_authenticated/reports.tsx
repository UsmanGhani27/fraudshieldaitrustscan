import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { RiskBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { reportsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import type { RiskLevel } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Saved reports — FraudShield AI" }, { name: "description", content: "Your exported security reports." }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data, isLoading } = useQuery(reportsQuery());
  const qc = useQueryClient();
  const remove = async (id: string) => {
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) return toast.error("Couldn't delete the report.");
    qc.invalidateQueries({ queryKey: ["reports"] });
    toast.success("Report deleted");
  };
  return (
    <div>
      <PageHeader title="Saved reports" description="Printable security reports generated from your analyses." />
      {isLoading ? (
        <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-card" />)}</div>
      ) : !data?.length ? (
        <EmptyState icon={FileText} title="No reports yet" description="Open any analysis and choose “Export report” to create a printable security report." action={<Button asChild variant="hero"><Link to="/history">Go to history</Link></Button>} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {data.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              {r.analyses && <RiskBadge level={r.analyses.risk_level as RiskLevel} />}
              <Link to="/report/$id" params={{ id: r.id }} className="min-w-0 flex-1 hover:underline">
                <p className="truncate text-sm font-medium">{r.report_title}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.generated_at).toLocaleString()}</p>
              </Link>
              <Button variant="ghost" size="icon" aria-label="Delete report" onClick={() => remove(r.id)}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
