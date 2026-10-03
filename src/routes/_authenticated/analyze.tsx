import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { MessageSquareText, Mail, Link2, Image as ImageIcon, QrCode, Loader2, Upload, X, FlaskConical, ShieldAlert, Info, Lock } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { UsageMeter, useUsage } from "@/components/usage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { runAnalysis, type AnalyzeResult } from "@/lib/analysis.functions";
import { DEMO_EXAMPLES } from "@/lib/demo-examples";
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES, MAX_TEXT_LENGTH, type InputType } from "@/lib/risk";
import { validateUrl } from "@/lib/validation";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ type: z.enum(["message", "email", "url", "screenshot", "qr"]).optional().catch(undefined) });

export const Route = createFileRoute("/_authenticated/analyze")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Analyze — FraudShield AI" }, { name: "description", content: "Analyze a suspicious message, email, link or screenshot." }] }),
  component: Analyze,
});

const TABS: { id: InputType; label: string; icon: typeof Mail }[] = [
  { id: "message", label: "Message", icon: MessageSquareText },
  { id: "email", label: "Email", icon: Mail },
  { id: "url", label: "URL", icon: Link2 },
  { id: "screenshot", label: "Screenshot", icon: ImageIcon },
  { id: "qr", label: "QR", icon: QrCode },
];

const PROCESSED: Record<InputType, string> = {
  message: "The message text, plus sender and claimed brand if provided.",
  email: "The email text (including subject), sender address and claimed brand if provided.",
  url: "The link you enter. We do not visit or download the page.",
  screenshot: "The image you upload and any optional context you add.",
  qr: "The QR image you upload. The AI reads the visible code — no dedicated decoder yet.",
};

function Analyze() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const analyze = useServerFn(runAnalysis);
  const { data: usage } = useUsage();
  const [type, setType] = useState<InputType>(search.type ?? "message");
  const [text, setText] = useState("");
  const [sender, setSender] = useState("");
  const [brand, setBrand] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<{ name: string; mime: string; base64: string; preview: string } | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [failure, setFailure] = useState<Extract<AnalyzeResult, { ok: false }> | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const limitReached = usage ? usage.used >= usage.limit : false;
  const isImage = type === "screenshot" || type === "qr";

  const switchType = (t: InputType) => { setType(t); setFieldError(null); setFailure(null); };

  const loadDemo = (id: string) => {
    const ex = DEMO_EXAMPLES.find((e) => e.id === id)!;
    switchType(ex.type);
    setText(ex.text ?? ""); setSender(ex.sender ?? ""); setBrand(ex.claimedBrand ?? ""); setUrl(ex.url ?? "");
    toast.success(`Loaded synthetic example: ${ex.label}`);
  };

  const onFile = (f: File | undefined) => {
    setFieldError(null);
    if (!f) return;
    if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(f.type)) return setFieldError("Upload failed: please choose a PNG, JPG or WebP image.");
    if (f.size > MAX_IMAGE_BYTES) return setFieldError("Upload failed: image must be 4 MB or smaller.");
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      setFile({ name: f.name, mime: f.type, base64: result.split(",")[1] ?? "", preview: result });
    };
    reader.onerror = () => setFieldError("Upload failed: we couldn't read that file. Please try again.");
    reader.readAsDataURL(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null); setFailure(null);
    if (type === "url") {
      const c = validateUrl(url);
      if (!c.ok) return setFieldError(c.reason);
    } else if (isImage) {
      if (!file) return setFieldError("Please upload an image to analyze.");
    } else if (text.trim().length < 8) {
      return setFieldError("Please paste a bit more of the content to analyze.");
    }
    setBusy(true);
    try {
      const res = await analyze({
        data: {
          type,
          text: isImage ? text || undefined : type === "url" ? undefined : text,
          sender: sender || undefined,
          claimedBrand: brand || undefined,
          url: type === "url" ? url : undefined,
          image: isImage && file ? { mime: file.mime, base64: file.base64 } : undefined,
        },
      });
      if (!res.ok) {
        setFailure(res);
        if (res.code === "LIMIT_REACHED") qc.invalidateQueries({ queryKey: ["usage"] });
        return;
      }
      qc.invalidateQueries({ queryKey: ["usage"] });
      qc.invalidateQueries({ queryKey: ["analyses"] });
      if (res.usedFallback) toast.warning("AI was unavailable — showing the rule-based fallback result.");
      navigate({ to: "/analysis/$id", params: { id: res.id } });
    } catch {
      setFailure({ ok: false, code: "SERVER_ERROR", message: "We couldn't reach the analysis service. Check your connection, or sign in again if your session expired." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Analyze"
        description="Choose what you want to check. Results are AI-assisted and should be verified independently."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline"><FlaskConical /> Load Demo Example</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {DEMO_EXAMPLES.map((d) => <DropdownMenuItem key={d.id} onSelect={() => loadDemo(d.id)}>{d.label} <span className="ml-auto pl-3 text-[10px] uppercase text-muted-foreground">synthetic</span></DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 md:p-6" aria-busy={busy}>
          <div role="tablist" aria-label="Analyzer type" className="grid grid-cols-5 gap-1 rounded-lg bg-surface-2 p-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" role="tab" aria-selected={type === id} onClick={() => switchType(id)}
                className={cn("flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:flex-row sm:justify-center sm:text-sm", type === id ? "bg-background text-foreground shadow ring-1 ring-border" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="size-4" />{label}
              </button>
            ))}
          </div>

          {type === "qr" && (
            <div className="mt-4 flex gap-2 rounded-lg border border-cyan/30 bg-cyan/10 p-3 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-cyan" />
              <p><strong>MVP preview.</strong> QR analysis uses the AI's visual reading of the image; a dedicated QR decoder isn't implemented yet, so results may be less reliable.</p>
            </div>
          )}

          <div className="mt-5 space-y-4">
            {(type === "message" || type === "email") && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="content">{type === "email" ? "Email content (include subject if possible)" : "Message content"}</Label>
                  <Textarea id="content" value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_TEXT_LENGTH} rows={10} placeholder={type === "email" ? "Subject: …\n\nPaste the email body here" : "Paste the suspicious message here"} className="font-mono text-sm" />
                  <p className="text-right text-xs text-muted-foreground">{text.length}/{MAX_TEXT_LENGTH}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label htmlFor="sender">Sender (optional)</Label><Input id="sender" value={sender} onChange={(e) => setSender(e.target.value)} maxLength={200} placeholder={type === "email" ? "name@domain.com" : "Number or name shown"} /></div>
                  <div className="space-y-1.5"><Label htmlFor="brand">Claimed brand/service (optional)</Label><Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={100} placeholder="e.g. your bank" /></div>
                </div>
              </>
            )}

            {type === "url" && (
              <div className="space-y-1.5">
                <Label htmlFor="url">Link to check</Label>
                <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/login" inputMode="url" autoComplete="off" className="font-mono" aria-invalid={!!fieldError} />
                <p className="text-xs text-muted-foreground">We analyze the link text and structure only — we never open it.</p>
              </div>
            )}

            {isImage && (
              <div className="space-y-3">
                {file ? (
                  <div className="relative overflow-hidden rounded-lg border border-border bg-surface-2">
                    <img src={file.preview} alt="Upload preview" className="mx-auto max-h-80 object-contain" />
                    <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs">
                      <span className="truncate text-muted-foreground">{file.name}</span>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>Replace</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setFile(null)} aria-label="Remove image"><X /> Remove</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
                    className="flex w-full flex-col items-center rounded-lg border-2 border-dashed border-border bg-surface-2/50 px-6 py-12 text-center transition-colors hover:border-primary/60">
                    <Upload className="size-6 text-cyan" />
                    <span className="mt-3 text-sm font-medium">Click or drop an image</span>
                    <span className="mt-1 text-xs text-muted-foreground">PNG, JPG or WebP · up to 4 MB</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept={ALLOWED_IMAGE_MIME.join(",")} className="sr-only" aria-label="Upload image" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
                <div className="space-y-1.5"><Label htmlFor="ctx">Context (optional)</Label><Input id="ctx" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Where did you see this?" /></div>
              </div>
            )}

            {fieldError && <p role="alert" className="text-sm text-destructive">{fieldError}</p>}

            {failure && (
              <div role="alert" className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="space-y-2">
                  <p>{failure.message}</p>
                  {failure.code === "LIMIT_REACHED" && <Button asChild size="sm" variant="hero"><Link to="/billing">See plans</Link></Button>}
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <UsageMeter className="sm:w-56" />
              <Button type="submit" variant="hero" size="lg" disabled={busy || limitReached}>
                {busy ? <><Loader2 className="animate-spin" /> Analyzing…</> : limitReached ? "Monthly limit reached" : "Analyze"}
              </Button>
            </div>
            {busy && <p className="text-center text-xs text-muted-foreground" aria-live="polite">Checking for phishing, impersonation and fraud signals. This usually takes 5–15 seconds.</p>}
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">What will be processed</h2>
            <p className="mt-2 text-sm text-muted-foreground">{PROCESSED[type]}</p>
          </div>
          <div className="rounded-xl border border-risk-medium/30 bg-risk-medium/5 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Lock className="size-4 text-risk-medium" />Protect your secrets</h2>
            <p className="mt-2 text-sm text-muted-foreground">Don't include passwords, recovery codes, or full card numbers unless necessary. Common password-like strings and long numbers are redacted automatically.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">
            Results are AI-assisted and may be wrong. Always verify through official channels before acting.
          </div>
        </aside>
      </div>
    </div>
  );
}
