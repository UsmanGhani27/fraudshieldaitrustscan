import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, AlertOctagon, Gauge, Info, Check, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { alertsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({ meta: [{ property: "og:title", content: "Alerts — FraudShield AI" }, { property: "og:description", content: "Notifications about high-risk results and usage." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Alerts — FraudShield AI" }, { name: "description", content: "Notifications about high-risk results and usage." }] }),
  component: AlertsPage,
});

const ICON = { high_risk: AlertOctagon, usage: Gauge, system: Info } as Record<string, typeof Bell>;

function AlertsPage() {
  const { data, isLoading, isError, refetch } = useQuery(alertsQuery());
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["alerts"] });
  const unread = (data ?? []).filter((a) => !a.read_at);

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    const { error } = await supabase.from("alerts").update({ read_at: new Date().toISOString() }).in("id", ids);
    if (error) { toast.error("Couldn't update alerts."); return; }
    refresh();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("alerts").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete the alert."); return; }
    refresh();
  };

  return (
    <div>
      <PageHeader
        title="Alerts"
        description="Notifications created when you run analyses. FraudShield doesn't monitor your accounts in the background."
        actions={unread.length > 0 ? <Button variant="outline" onClick={() => markRead(unread.map((a) => a.id))}><Check /> Mark all read</Button> : undefined}
      />
      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />)}</div>
      ) : isError ? (
        <EmptyState icon={Info} title="Couldn't load alerts" description="Check your connection and try again." action={<Button onClick={() => refetch()}>Retry</Button>} />
      ) : !data?.length ? (
        <EmptyState icon={Bell} title="You're all caught up" description="We'll let you know here when an analysis comes back high or critical risk, or when you're close to your monthly limit." />
      ) : (
        <ul className="space-y-2">
          {data.map((a) => {
            const Icon = ICON[a.kind] ?? Info;
            return (
              <li key={a.id} className={cn("flex gap-4 rounded-xl border bg-card p-4", a.read_at ? "border-border opacity-75" : "border-primary/40")}>
                <div className={cn("grid size-9 shrink-0 place-items-center rounded-lg", a.severity === "critical" ? "bg-risk-critical/15 text-risk-critical" : a.severity === "high" ? "bg-risk-high/15 text-risk-high" : "bg-risk-medium/15 text-risk-medium")}><Icon className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{a.title}{!a.read_at && <span className="ml-2 inline-block size-2 rounded-full bg-primary align-middle" aria-label="Unread" />}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{a.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                    {a.analysis_id && <Link to="/analysis/$id" params={{ id: a.analysis_id }} onClick={() => markRead([a.id])} className="text-primary hover:underline">View result</Link>}
                    {a.kind === "usage" && <Link to="/billing" className="text-primary hover:underline">View usage</Link>}
                    {!a.read_at && <button className="hover:text-foreground" onClick={() => markRead([a.id])}>Mark read</button>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" aria-label="Delete alert" onClick={() => remove(a.id)}><Trash2 /></Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
