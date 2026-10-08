import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Set a new password — FraudShield AI" },
      { name: "description", content: "Choose a new password for your FraudShield AI account." },
      { property: "og:title", content: "Set a new password — FraudShield AI" },
      { property: "og:description", content: "Reset your FraudShield AI password." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => setReady((r) => r ?? (data.session ? true : null)));
    const t = setTimeout(() => setReady((r) => r ?? false), 2500);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError("Password must be at least 8 characters.");
    if (pw !== pw2) return setError("The passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(/weak|pwned|leaked/i.test(error.message) ? "That password is too common or has appeared in a data breach. Please choose another." : "Couldn't update your password. The reset link may have expired — request a new one.");
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-glow px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <h1 className="text-xl font-semibold">Set a new password</h1>
          {ready === false ? (
            <p className="mt-3 text-sm text-muted-foreground">This reset link is invalid or has expired. <Link to="/auth" className="text-primary hover:underline">Back to sign in</Link> and use “Forgot password?” to get a new one.</p>
          ) : ready === null ? (
            <div className="mt-6 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" aria-label="Checking link" /></div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="space-y-1.5"><Label htmlFor="pw">New password</Label><Input id="pw" type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
              <div className="space-y-1.5"><Label htmlFor="pw2">Confirm password</Label><Input id="pw2" type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" variant="hero" className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Update password</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
