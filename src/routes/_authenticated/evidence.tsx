import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Archive, Eye, Trash2, Lock, Loader2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { ReportsTabs } from "@/components/reports-tabs";
import { RiskBadge } from "@/components/brand";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { evidenceQuery, profileQuery } from "@/lib/queries";
import { deleteEvidence, getEvidenceUrl } from "@/lib/analysis.functions";
import { useAuth } from "@/hooks/use-auth";
import { PLAN_HISTORY_DAYS, INPUT_LABEL, type InputType, type PlanCode, type RiskLevel } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/evidence")({
  head: () => ({ meta: [{ property: "og:title", content: "Evidence vault — FraudShield AI" }, { property: "og:description", content: "Your privately stored screenshots and QR images." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Evidence vault — FraudShield AI" }, { name: "description", content: "Your privately stored screenshots and QR images." }] }),
  component: EvidencePage,
});

function EvidencePage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery(evidenceQuery());
  const { data: prof } = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user });
  const qc = useQueryClient();
  const getUrl = useServerFn(getEvidenceUrl);
  const del = useServerFn(deleteEvidence);
  const [view, setView] = useState<{ title: string; url: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const plan = (prof?.profile?.plan_code ?? "free") as PlanCode;
  const days = [prof?.prefs?.retention_days ?? null, PLAN_HISTORY_DAYS[plan]].filter((x): x is number => typeof x === "number");
  const retention = days.length ? `Kept for ${Math.min(...days)} days, then deleted automatically.` : "Kept until you delete it.";

  const open = async (id: string, title: string) => {
    setLoadingId(id);
    try {
      const r = await getUrl({ data: { analysisId: id } });
      if (!r.url) throw new Error();
      setView({ title, url: r.url });
    } catch { toast.error("Couldn't open this file. It may have been deleted."); }
    finally { setLoadingId(null); }
  };
  const remove = async (id: string) => {
    const r = await del({ data: { analysisId: id } });
    if (!r.ok) { toast.error("Couldn't delete the evidence."); return; }
    toast.success("Evidence deleted. The assessment itself was kept.");
    qc.invalidateQueries({ queryKey: ["evidence"] });
    qc.invalidateQueries({ queryKey: ["analysis", id] });
  };

  return (
    <div>
      <PageHeader title="Reports & evidence" description="Private screenshots and QR images you submitted. Only you can access them." />
      <ReportsTabs />
      <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4 text-cyan" />Stored privately · {retention}</p>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />)}</div>
      ) : !data?.length ? (
        <EmptyState icon={Archive} title="No evidence stored" description="When you analyze a screenshot or QR image with history on, a private copy is kept here so you can refer to it or report it later." action={<Button asChild variant="hero"><Link to="/analyze" search={{ type: "screenshot" }}>Analyze a screenshot</Link></Button>} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <RiskBadge level={e.risk_level as RiskLevel} />
              <Link to="/analysis/$id" params={{ id: e.id }} className="min-w-0 flex-1 hover:underline">
                <p className="truncate text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">{INPUT_LABEL[e.input_type as InputType]} · {new Date(e.created_at).toLocaleDateString()}</p>
              </Link>
              <Button variant="ghost" size="icon" aria-label="View evidence" onClick={() => open(e.id, e.title)} disabled={loadingId === e.id}>{loadingId === e.id ? <Loader2 className="animate-spin" /> : <Eye />}</Button>
              <ConfirmDialog title="Delete this evidence?" description="The stored image will be permanently deleted. The assessment stays in your history." confirmLabel="Delete evidence" onConfirm={() => remove(e.id)}>
                <Button variant="ghost" size="icon" aria-label="Delete evidence"><Trash2 /></Button>
              </ConfirmDialog>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{view?.title}</DialogTitle><DialogDescription>Private link expires in 5 minutes.</DialogDescription></DialogHeader>
          {view && <img src={view.url} alt={`Evidence for ${view.title}`} className="max-h-[70vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
