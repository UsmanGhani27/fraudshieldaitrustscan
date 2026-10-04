import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, FileDown, Plus, Trash2, FileX2, ArrowLeft, ImageOff } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { ResultView } from "@/components/result-view";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { analysisDetailQuery } from "@/lib/queries";
import { toResultData } from "@/lib/result-mapper";
import { getEvidenceUrl, deleteAnalysis, deleteEvidence } from "@/lib/analysis.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { INPUT_LABEL, type InputType } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/analysis/$id")({
  head: () => ({ meta: [{ title: "Analysis result — FraudShield AI" }, { name: "description", content: "Explained threat assessment with safe next steps." }] }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: a, isLoading, isError, refetch } = useQuery(analysisDetailQuery(id));
  const shotFn = useServerFn(getEvidenceUrl);
  const delFn = useServerFn(deleteAnalysis);
  const delEvFn = useServerFn(deleteEvidence);
  const { data: shot } = useQuery({ queryKey: ["shot", id, a?.screenshot_storage_path], queryFn: () => shotFn({ data: { analysisId: id } }), enabled: !!a?.screenshot_storage_path, staleTime: 240_000 });

  if (isLoading) return <div className="space-y-4" aria-busy="true"><div className="h-10 w-64 animate-pulse rounded bg-card" /><div className="h-48 animate-pulse rounded-xl bg-card" /><div className="h-72 animate-pulse rounded-xl bg-card" /></div>;
  if (isError) return <EmptyState icon={FileX2} title="Couldn't load this analysis" description="Check your connection and try again." action={<Button onClick={() => refetch()}>Retry</Button>} />;
  if (!a) return <EmptyState icon={FileX2} title="Analysis not found" description="It may have been deleted, removed by your retention settings, or belong to another account." action={<Button asChild variant="hero"><Link to="/history">Back to history</Link></Button>} />;

  const toggleSave = async () => {
    const { error } = await supabase.from("analyses").update({ is_saved: !a.is_saved }).eq("id", a.id);
    if (error) { toast.error("Couldn't update. Please try again."); return; }
    toast.success(a.is_saved ? "Removed from saved" : "Saved");
    qc.invalidateQueries({ queryKey: ["analysis", id] });
    qc.invalidateQueries({ queryKey: ["analyses"] });
  };

  const exportReport = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("reports").insert({ user_id: user.id, analysis_id: a.id, report_title: `Security report — ${a.title}` }).select("id").single();
    if (error || !data) { toast.error("Couldn't create the report. Please try again."); return; }
    qc.invalidateQueries({ queryKey: ["reports"] });
    navigate({ to: "/report/$id", params: { id: data.id } });
  };

  const remove = async () => {
    const r = await delFn({ data: { analysisId: a.id } });
    if (!r.ok) { toast.error("Couldn't delete. Please try again."); return; }
    qc.invalidateQueries({ queryKey: ["analyses"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["evidence"] });
    qc.removeQueries({ queryKey: ["analysis", id] });
    toast.success("Analysis deleted");
    navigate({ to: "/history" });
  };

  const removeEvidence = async () => {
    const r = await delEvFn({ data: { analysisId: a.id } });
    if (!r.ok) { toast.error("Couldn't delete the evidence."); return; }
    toast.success("Submitted content deleted. The assessment was kept.");
    qc.invalidateQueries({ queryKey: ["analysis", id] });
    qc.invalidateQueries({ queryKey: ["evidence"] });
  };

  const hasEvidence = !!(a.raw_input_text || a.screenshot_storage_path);

  return (
    <div>
      <Link to="/history" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />History</Link>
      <PageHeader
        title={a.title}
        description={`${INPUT_LABEL[a.input_type as InputType]} · ${new Date(a.created_at).toLocaleString()} · Analysis ID ${a.id.slice(0, 8)}`}
        actions={
          <>
            <Button variant="outline" onClick={toggleSave} aria-pressed={a.is_saved}>{a.is_saved ? <BookmarkCheck className="text-cyan" /> : <Bookmark />}{a.is_saved ? "Saved" : "Save"}</Button>
            <Button variant="outline" onClick={exportReport}><FileDown /> Export report</Button>
            <Button asChild variant="hero"><Link to="/analyze"><Plus /> Analyze another</Link></Button>
          </>
        }
      />
      {typeof (a.details as Record<string, unknown> | null)?.["synthetic_demo"] === "string" && (
        <p className="mb-4 rounded-lg border border-cyan/30 bg-cyan/10 px-4 py-2 text-sm">Synthetic demo: <strong>{String((a.details as Record<string, unknown>)["synthetic_demo"])}</strong>. This example is made up for demonstration — not real data.</p>
      )}
      {(a.source_url || hasEvidence || a.evidence_deleted_at) && (
        <details className="mb-4 rounded-xl border border-border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-medium">Submitted content</summary>
          <div className="mt-3 space-y-2">
            {a.sender_label && <p><span className="text-muted-foreground">Sender:</span> {a.sender_label}</p>}
            {a.source_url && <p className="break-all font-mono text-xs"><span className="font-sans text-muted-foreground">Link (not opened): </span>{a.source_url}</p>}
            {a.raw_input_text && <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-surface-2 p-3 font-mono text-xs">{a.raw_input_text}</pre>}
            {shot?.url && <img src={shot.url} alt="Submitted screenshot" className="max-h-80 rounded border border-border" />}
            {a.evidence_deleted_at && !hasEvidence && <p className="flex items-center gap-2 text-muted-foreground"><ImageOff className="size-4" />Submitted content was deleted on {new Date(a.evidence_deleted_at).toLocaleDateString()}.</p>}
            {hasEvidence && (
              <ConfirmDialog title="Delete submitted content?" description="The stored text or image will be permanently deleted. The assessment stays in your history." confirmLabel="Delete content" onConfirm={removeEvidence}>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 /> Delete submitted content</Button>
              </ConfirmDialog>
            )}
          </div>
        </details>
      )}
      <ResultView data={toResultData(a)} />
      <div className="mt-6 flex justify-end">
        <ConfirmDialog title="Delete this analysis?" description="This permanently removes the result, its evidence, and any reports generated from it." confirmLabel="Delete analysis" onConfirm={remove}>
          <Button variant="ghost" className="text-destructive hover:text-destructive"><Trash2 /> Delete analysis</Button>
        </ConfirmDialog>
      </div>
    </div>
  );
}
