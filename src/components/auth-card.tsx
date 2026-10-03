import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "./brand";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAuth } from "@/hooks/use-auth";

export function AuthCard({ mode, onDone, footer }: { mode: "signin" | "signup"; onDone: () => void; footer: React.ReactNode }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (user) onDone(); }, [user, onDone]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: name.trim() || undefined } },
        });
        if (error) throw error;
        if (!data.session) setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(/invalid login/i.test(msg) ? "Email or password is incorrect." : /already registered/i.test(msg) ? "An account with this email already exists." : msg || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error("Google sign-in failed. Please try again.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-glow px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          {sent ? (
            <div className="py-6 text-center">
              <MailCheck className="mx-auto size-10 text-cyan" />
              <h1 className="mt-4 text-xl font-semibold">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Open it to activate your account.</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{mode === "signup" ? "Free plan includes 10 analyses per month." : "Sign in to continue analyzing."}</p>
              <Button type="button" variant="outline" className="mt-6 w-full" onClick={google}>
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.95S8.78 6.28 12 6.28c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.68 3.72 14.55 2.8 12 2.8 6.92 2.8 2.8 6.92 2.8 12s4.12 9.2 9.2 9.2c5.31 0 8.83-3.73 8.83-8.99 0-.6-.07-1.06-.15-1.51z" /></svg>
                Continue with Google
              </Button>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
              <form onSubmit={submit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5"><Label htmlFor="name">Name (optional)</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" /></div>
                )}
                <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
                <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {mode === "signup" ? "Create account" : "Sign in"}
                </Button>
              </form>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}
