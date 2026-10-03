import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, FileDown, Plus, Trash2, FileX2, ArrowLeft } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { ResultView } from "@/components/result-view";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { analysisDetailQuery, type AnalysisDetail } from "@/lib/queries";
import { getScreenshotUrl } from "@/lib/analysis.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { INPUT_LABEL, type InputType, type RiskLevel } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/analysis/$id")({
  head: () => ({ meta: [{ title: "Analysis result — FraudShield AI" }, { name: "description", content: "Structured threat assessment." }] }),
  component: AnalysisPage,
});

const asStrings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function toResultData(a: AnalysisDetail) {
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

function AnalysisPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: a, isLoading, error } = useQuery(analysisDetailQuery(id));
  const shotFn = useServerFn(getScreenshotUrl);
  const { data: shot } = useQuery({ queryKey: ["shot", id], queryFn: () => shotFn({ data: { analysisId: id } }), enabled: !!a?.screenshot_storage_path });

  if (isLoading) return <div className="space-y-4"><div className="h-10 w-64 animate-pulse rounded bg-card" /><div className="h-48 animate-pulse rounded-xl bg-card" /><div className="h-72 animate-pulse rounded-xl bg-card" /></div>;
  if (error || !a)
    return <EmptyState icon={FileX2} title="Analysis not found" description="This analysis may have been deleted, removed by your retention settings, or belongs to another account." action={<Button asChild variant="hero"><Link to="/history">Back to history</Link></Button>} />;

  const toggleSave = async () => {
    const { error } = await supabase.from("analyses").update({ is_saved: !a.is_saved }).eq("id", a.id);
    if (error) return toast.error("Couldn't update. Please try again.");
    toast.success(a.is_saved ? "Removed from saved" : "Saved to your history");
    qc.invalidateQueries({ queryKey: ["analysis", id] });
    qc.invalidateQueries({ queryKey: ["analyses"] });
  };

  const exportReport = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("reports").insert({ user_id: user.id, analysis_id: a.id, report_title: `Security report — ${a.title}` }).select("id").single();
    if (error || !data) return toast.error("Couldn't create the report. Please try again.");
    qc.invalidateQueries({ queryKey: ["reports"] });
    navigate({ to: "/report/$id", params: { id: data.id } });
  };

  const remove = async () => {
    const { error } = await supabase.from("analyses").delete().eq("id", a.id);
    if (error) return toast.error("Couldn't delete. Please try again.");
    qc.invalidateQueries({ queryKey: ["analyses"] });
    qc.removeQueries({ queryKey: ["analysis", id] });
    toast.success("Analysis deleted");
    navigate({ to: "/history" });
  };

  return (
    <div>
      <Link to="/history" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />History</Link>
      <PageHeader
        title={a.title}
        description={`${INPUT_LABEL[a.input_type as InputType]} · ${new Date(a.created_at).toLocaleString()} · ID ${a.id.slice(0, 8)}`}
        actions={
          <>
            <Button variant="outline" onClick={toggleSave}>{a.is_saved ? <BookmarkCheck className="text-cyan" /> : <Bookmark />}{a.is_saved ? "Saved" : "Save"}</Button>
            <Button variant="outline" onClick={exportReport}><FileDown /> Export report</Button>
            <Button asChild variant="hero"><Link to="/analyze"><Plus /> Analyze another</Link></Button>
          </>
        }
      />
      {(a.source_url || shot?.url || a.raw_input_text) && (
        <details className="mb-4 rounded-xl border border-border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-medium">Submitted content</summary>
          <div className="mt-3 space-y-2">
            {a.sender_label && <p><span className="text-muted-foreground">Sender:</span> {a.sender_label}</p>}
            {a.source_url && <p className="break-all font-mono text-xs">{a.source_url}</p>}
            {a.raw_input_text && <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-surface-2 p-3 font-mono text-xs">{a.raw_input_text}</pre>}
            {shot?.url && <img src={shot.url} alt="Submitted screenshot" className="max-h-80 rounded border border-border" />}
          </div>
        </details>
      )}
      <ResultView data={toResultData(a)} />
      <div className="mt-6 flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="ghost" className="text-destructive hover:text-destructive"><Trash2 /> Delete analysis</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete this analysis?</AlertDialogTitle><AlertDialogDescription>This permanently removes the result and any reports generated from it.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove}>Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
