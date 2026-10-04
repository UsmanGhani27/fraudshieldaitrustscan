import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, Plug } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { profileQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { deleteAllData } from "@/lib/analysis.functions";
import { PLANNED_INTEGRATIONS } from "@/lib/providers/types";
import { PLAN_HISTORY_DAYS, type PlanCode } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — FraudShield AI" }, { name: "description", content: "Profile, privacy and account settings." }] }),
  component: Settings,
});

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Settings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const del = useServerFn(deleteAllData);
  const { data } = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user });
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (data?.profile) setName(data.profile.full_name ?? ""); }, [data?.profile]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["profile"] });

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim().slice(0, 80) || null }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error("Couldn't save your profile."); return; }
    toast.success("Profile saved");
    refresh();
  };

  const updatePrefs = async (patch: { history_enabled?: boolean; retention_days?: number | null }) => {
    if (!user) return;
    const { error } = await supabase.from("data_preferences").update(patch).eq("user_id", user.id);
    if (error) { toast.error("Couldn't update preferences."); return; }
    toast.success("Privacy preferences updated");
    refresh();
  };

  const deleteAll = async () => {
    setDeleting(true);
    try {
      const res = await del();
      if (!res.ok) throw new Error();
      qc.invalidateQueries();
      toast.success("All analyses, reports and screenshots were deleted.");
    } catch {
      toast.error("Deletion failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const signOut = async () => { await supabase.auth.signOut(); qc.clear(); navigate({ to: "/" }); };

  const prefs = data?.prefs;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your profile, privacy and account." />

      <Card title="Profile">
        <form onSubmit={saveProfile} className="grid gap-4 sm:max-w-md">
          <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" value={user?.email ?? ""} disabled /></div>
          <div className="space-y-1.5"><Label htmlFor="fname">Full name</Label><Input id="fname" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
          <Button type="submit" className="w-fit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Save profile</Button>
        </form>
      </Card>

      <Card title="Privacy & data retention" description="Control what FraudShield AI keeps about your analyses.">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-6">
            <div><Label htmlFor="hist" className="text-sm font-medium">Store submitted content in history</Label><p className="mt-1 text-sm text-muted-foreground">When off, we keep only the assessment — not the full text or screenshots you submit. The assessment may still quote short, redacted snippets as evidence.</p></div>
            <Switch id="hist" checked={prefs?.history_enabled ?? true} disabled={!prefs} onCheckedChange={(v) => updatePrefs({ history_enabled: v })} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div><p className="text-sm font-medium">Automatic deletion</p><p className="mt-1 text-sm text-muted-foreground">Analyses (and their evidence) older than this are removed automatically.{PLAN_HISTORY_DAYS[(data?.profile?.plan_code ?? "free") as PlanCode] ? ` Your plan keeps history for up to ${PLAN_HISTORY_DAYS[(data?.profile?.plan_code ?? "free") as PlanCode]} days.` : ""}</p></div>
            <Select value={prefs?.retention_days ? String(prefs.retention_days) : "never"} disabled={!prefs} onValueChange={(v) => updatePrefs({ retention_days: v === "never" ? null : Number(v) })}>
              <SelectTrigger className="w-48" aria-label="Retention period"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Keep until I delete</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card title="Integrations" description="Optional future connections. None are connected — FraudShield works fully without them.">
        <ul className="grid gap-3 md:grid-cols-3">
          {PLANNED_INTEGRATIONS.map((i) => (
            <li key={i.id} className="rounded-lg border border-border bg-surface-2/50 p-4">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 font-medium"><Plug className="size-4 text-muted-foreground" />{i.name}</span><span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Planned / Optional</span></div>
              <p className="mt-2 text-xs text-muted-foreground">{i.purpose}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Account">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={signOut}>Sign out</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive" disabled={deleting}>{deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}Delete all my data</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all analysis data?</AlertDialogTitle>
                <AlertDialogDescription>This permanently removes all your analyses, signals, reports, alerts and stored evidence. Your account, settings and this month's usage count remain (so the monthly limit can't be reset this way). This can't be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteAll}>Delete everything</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </div>
  );
}
