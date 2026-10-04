import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { MessageSquareText, Mail, Link2, Image as ImageIcon, QrCode, Loader2, Upload, X, FlaskConical, ShieldAlert, Lock, RotateCcw, Check, Circle, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { UsageMeter, useUsage } from "@/components/usage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { runAnalysis, type AnalyzeResult } from "@/lib/analysis.functions";
import { DEMO_EXAMPLES } from "@/lib/demo-examples";
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES, MAX_TEXT_LENGTH, MIN_TEXT_LENGTH, PREVIEW_UNLOCK_ANALYZERS, USAGE_WARN_RATIO, type InputType } from "@/lib/risk";
import { validateUrl, safeFilename } from "@/lib/validation";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ type: z.enum(["message", "email", "url", "screenshot", "qr"]).optional().catch(undefined) });

export const Route = createFileRoute("/_authenticated/analyze")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Analyze — FraudShield AI" }, { name: "description", content: "Analyze a suspicious message, email, link, screenshot or QR code." }] }),
  component: Analyze,
});

const TABS: { id: InputType; label: string; icon: typeof Mail }[] = [
  { id: "message", label: "Message", icon: MessageSquareText },
  { id: "email", label: "Email", icon: Mail },
  { id: "url", label: "URL", icon: Link2 },
  { id: "screenshot", label: "Screenshot", icon: ImageIcon },
  { id: "qr", label: "QR code", icon: QrCode },
];

const PROCESSED: Record<InputType, string> = {
  message: "The message text, plus the sender, claimed brand/person and context you add.",
  email: "Sender, reply-to, subject, body, claimed company and attachment names. Attachments themselves aren't uploaded.",
  url: "Only the link text. We never visit, open or download the page.",
  screenshot: "The image you upload and any context you add. With history on, it's stored privately so you can view or delete it later.",
  qr: "The QR image is decoded on your device. Only the decoded link is sent for analysis — we never open it.",
};

const STAGES = ["Reading input", "Checking signals", "Building risk assessment", "Preparing recommendations"];

type FileState = { name: string; mime: string; base64: string; preview: string };

function Analyze() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const analyze = useServerFn(runAnalysis);
  const { data: usage } = useUsage();
  const [type, setType] = useState<InputType>(search.type ?? "message");
  const [f, setF] = useState({ text: "", sender: "", replyTo: "", subject: "", attachments: "", brand: "", context: "", url: "" });
  const [file, setFile] = useState<FileState | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrState, setQrState] = useState<"idle" | "decoding" | "found" | "none">("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [failure, setFailure] = useState<Extract<AnalyzeResult, { ok: false }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [demo, setDemo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (search.type) setType(search.type); }, [search.type]);
  useEffect(() => {
    if (!busy) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(STAGES.length - 1, s + 1)), 3500);
    return () => clearInterval(t);
  }, [busy]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const limitReached = usage ? usage.used >= usage.limit : false;
  const nearLimit = usage ? !limitReached && usage.used >= Math.ceil(usage.limit * USAGE_WARN_RATIO) : false;
  const isImage = type === "screenshot" || type === "qr";

  const reset = () => {
    setF({ text: "", sender: "", replyTo: "", subject: "", attachments: "", brand: "", context: "", url: "" });
    setFile(null); setQrUrl(null); setQrState("idle"); setFieldError(null); setFailure(null); setDemo(null);
  };
  const switchType = (t: InputType) => { setType(t); setFieldError(null); setFailure(null); setFile(null); setQrUrl(null); setQrState("idle"); };

  const loadDemo = (id: string) => {
    const ex = DEMO_EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    reset();
    setType(ex.type);
    setF({ text: ex.text ?? "", sender: ex.sender ?? "", replyTo: ex.replyTo ?? "", subject: ex.subject ?? "", attachments: ex.attachments ?? "", brand: ex.claimedBrand ?? "", context: "", url: ex.url ?? "" });
    setDemo(ex.label);
  };

  const onFile = (file: File | undefined) => {
    setFieldError(null); setFailure(null);
    if (!file) return;
    if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(file.type)) { setFieldError("That file type isn't supported. Please choose a PNG, JPG or WebP image."); return; }
    if (file.size > MAX_IMAGE_BYTES) { setFieldError("That image is larger than 4 MB. Try a cropped screenshot."); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const result = String(reader.result);
      setFile({ name: safeFilename(file.name), mime: file.type, base64: result.split(",")[1] ?? "", preview: result });
      if (type === "qr") {
        setQrState("decoding");
        try {
          const { decodeQrFromDataUrl } = await import("@/lib/qr-decode");
          const decoded = await decodeQrFromDataUrl(result);
          setQrUrl(decoded); setQrState(decoded ? "found" : "none");
        } catch { setQrUrl(null); setQrState("none"); }
      }
    };
    reader.onerror = () => setFieldError("We couldn't read that file. Please try again.");
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null); setFailure(null);
    if (type === "url") {
      const c = validateUrl(f.url);
      if (!c.ok) { setFieldError(c.reason); return; }
    } else if (isImage) {
      if (!file) { setFieldError("Please upload an image to analyze."); return; }
      if (type === "qr" && qrState === "decoding") { setFieldError("Still reading the QR code — one moment."); return; }
    } else if (f.text.trim().length < MIN_TEXT_LENGTH) {
      setFieldError("Please paste a bit more of the content — at least a full sentence helps."); return;
    }
    setBusy(true);
    try {
      const useQrUrl = type === "qr" && qrUrl && validateUrl(qrUrl).ok;
      const res = await analyze({
        data: {
          type,
          ...(demo ? { demo } : {}),
          text: type === "message" || type === "email" ? f.text : undefined,
          sender: f.sender || undefined,
          replyTo: type === "email" ? f.replyTo || undefined : undefined,
          subject: type === "email" ? f.subject || undefined : undefined,
          attachments: type === "email" ? f.attachments || undefined : undefined,
          claimedBrand: f.brand || undefined,
          context: f.context || undefined,
          url: type === "url" ? f.url : useQrUrl ? qrUrl! : undefined,
          image: isImage && file && !useQrUrl ? { mime: file.mime, base64: file.base64 } : undefined,
        },
      });
      if (!res.ok) {
        setFailure(res);
        if (res.code === "LIMIT_REACHED") qc.invalidateQueries({ queryKey: ["usage"] });
        return;
      }
      qc.invalidateQueries({ queryKey: ["usage"] });
      qc.invalidateQueries({ queryKey: ["analyses"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["evidence"] });
      if (res.usedFallback) toast.warning("AI analysis was unavailable — showing results from our rule checks only.");
      navigate({ to: "/analysis/$id", params: { id: res.id } });
    } catch {
      setFailure({ ok: false, code: "SERVER_ERROR", message: "We couldn't reach FraudShield. Check your connection — if you've been away a while, your session may have expired, so try signing in again." });
    } finally {
      setBusy(false);
    }
  };

  const textArea = (label: string, placeholder: string) => (
    <div className="space-y-1.5">
      <Label htmlFor="content">{label}</Label>
      <Textarea id="content" value={f.text} onChange={set("text")} maxLength={MAX_TEXT_LENGTH} rows={9} placeholder={placeholder} className="font-mono text-sm" aria-describedby="content-count" />
      <p id="content-count" className={cn("text-right text-xs", f.text.length > MAX_TEXT_LENGTH * 0.9 ? "text-risk-medium" : "text-muted-foreground")}>{f.text.length.toLocaleString()}/{MAX_TEXT_LENGTH.toLocaleString()}</p>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Analyze"
        description="Check something suspicious. You'll get an explained risk assessment and safe next steps."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline"><FlaskConical /> Load demo example</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Synthetic examples for demonstration</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DEMO_EXAMPLES.map((d) => <DropdownMenuItem key={d.id} onSelect={() => loadDemo(d.id)}>{d.label}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {busy ? (
          <div className="rounded-xl border border-border bg-card p-8" role="status" aria-live="polite">
            <div className="mx-auto max-w-sm">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand shadow-glow"><Sparkles className="size-6 animate-pulse text-primary-foreground" /></div>
              <h2 className="mt-5 text-center text-lg font-semibold">Analyzing safely…</h2>
              <ol className="mt-6 space-y-3">
                {STAGES.map((s, i) => (
                  <li key={s} className={cn("flex items-center gap-3 text-sm", i > stage && "text-muted-foreground")}>
                    {i < stage ? <Check className="size-4 text-risk-low" /> : i === stage ? <Loader2 className="size-4 animate-spin text-cyan" /> : <Circle className="size-4" />}
                    {s}
                  </li>
                ))}
              </ol>
              <p className="mt-6 text-center text-xs text-muted-foreground">Usually 10–25 seconds. Links are never opened.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 md:p-6" noValidate>
            <div role="tablist" aria-label="What do you want to check?" className="grid grid-cols-5 gap-1 rounded-lg bg-surface-2 p-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" role="tab" aria-selected={type === id} onClick={() => switchType(id)}
                  className={cn("flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:justify-center sm:text-sm", type === id ? "bg-background text-foreground shadow ring-1 ring-border" : "text-muted-foreground hover:text-foreground")}>
                  <Icon className="size-4" />{label}
                </button>
              ))}
            </div>

            {demo && (
              <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-2 text-sm">
                <span><FlaskConical className="mr-1.5 inline size-4 text-cyan" />Synthetic demo: <strong>{demo}</strong>. Not real data.</span>
                <button type="button" onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
              </div>
            )}

            <div className="mt-5 space-y-4">
              {type === "message" && (
                <>
                  {textArea("Message", "Paste the suspicious text, DM or chat message")}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5"><Label htmlFor="sender">Sender (optional)</Label><Input id="sender" value={f.sender} onChange={set("sender")} maxLength={300} placeholder="Number, handle or name shown" /></div>
                    <div className="space-y-1.5"><Label htmlFor="brand">Claims to be (optional)</Label><Input id="brand" value={f.brand} onChange={set("brand")} maxLength={120} placeholder="Company or person" /></div>
                  </div>
                  <div className="space-y-1.5"><Label htmlFor="ctx">Context (optional)</Label><Input id="ctx" value={f.context} onChange={set("context")} maxLength={500} placeholder="e.g. Got this by SMS, I wasn't expecting a package" /></div>
                </>
              )}

              {type === "email" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5"><Label htmlFor="sender">From</Label><Input id="sender" value={f.sender} onChange={set("sender")} maxLength={300} placeholder="Name <address@domain.com>" /></div>
                    <div className="space-y-1.5"><Label htmlFor="reply">Reply-to (optional)</Label><Input id="reply" value={f.replyTo} onChange={set("replyTo")} maxLength={300} placeholder="If different from sender" /></div>
                  </div>
                  <div className="space-y-1.5"><Label htmlFor="subject">Subject</Label><Input id="subject" value={f.subject} onChange={set("subject")} maxLength={300} /></div>
                  {textArea("Body", "Paste the email body")}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5"><Label htmlFor="brand">Claimed company (optional)</Label><Input id="brand" value={f.brand} onChange={set("brand")} maxLength={120} /></div>
                    <div className="space-y-1.5"><Label htmlFor="att">Attachment names (optional)</Label><Input id="att" value={f.attachments} onChange={set("attachments")} maxLength={500} placeholder="invoice.html, label.zip" /></div>
                  </div>
                </>
              )}

              {type === "url" && (
                <div className="space-y-1.5">
                  <Label htmlFor="url">Link to check</Label>
                  <Input id="url" value={f.url} onChange={set("url")} placeholder="https://example.com/login" inputMode="url" autoComplete="off" spellCheck={false} className="font-mono" aria-invalid={!!fieldError} />
                  <p className="text-xs text-muted-foreground">We inspect the domain, spelling and structure. We never open the link.</p>
                </div>
              )}

              {isImage && (
                <div className="space-y-3">
                  {file ? (
                    <div className="overflow-hidden rounded-lg border border-border bg-surface-2">
                      <img src={file.preview} alt="Upload preview" className="mx-auto max-h-72 object-contain" />
                      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs">
                        <span className="truncate text-muted-foreground">{file.name}</span>
                        <div className="flex gap-1">
                          <Button type="button" size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>Replace</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => { setFile(null); setQrUrl(null); setQrState("idle"); }}><X /> Remove</Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
                      className="flex w-full flex-col items-center rounded-lg border-2 border-dashed border-border bg-surface-2/50 px-6 py-12 text-center transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {type === "qr" ? <QrCode className="size-6 text-cyan" /> : <Upload className="size-6 text-cyan" />}
                      <span className="mt-3 text-sm font-medium">{type === "qr" ? "Upload a photo or screenshot of the QR code" : "Click or drop a screenshot"}</span>
                      <span className="mt-1 text-xs text-muted-foreground">PNG, JPG or WebP · up to 4 MB</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept={ALLOWED_IMAGE_MIME.join(",")} className="sr-only" aria-label="Upload image" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
                  {type === "qr" && qrState !== "idle" && (
                    <div className={cn("rounded-lg border p-3 text-sm", qrState === "found" ? "border-cyan/30 bg-cyan/10" : "border-border bg-surface-2/60")} role="status">
                      {qrState === "decoding" && <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Reading QR code on your device…</span>}
                      {qrState === "found" && <>
                        <p className="text-xs text-muted-foreground">This QR code points to (not opened):</p>
                        <p className="mt-1 break-all font-mono text-xs">{qrUrl}</p>
                        {!validateUrl(qrUrl ?? "").ok && <p className="mt-1 text-xs text-risk-medium">This isn't a web link, so the image will be analyzed instead.</p>}
                      </>}
                      {qrState === "none" && <p>We couldn't decode a QR code in this image. You can still analyze it — the AI will look at the image instead, with lower confidence.</p>}
                    </div>
                  )}
                  {type === "screenshot" && <div className="space-y-1.5"><Label htmlFor="ctx">Context (optional)</Label><Input id="ctx" value={f.context} onChange={set("context")} maxLength={500} placeholder="Where did you see this?" /></div>}
                </div>
              )}

              {PREVIEW_UNLOCK_ANALYZERS && isImage && <p className="text-xs text-muted-foreground">Hackathon preview: {type === "qr" ? "QR" : "screenshot"} analysis is unlocked on all plans for now.</p>}

              {fieldError && <p role="alert" className="text-sm text-destructive">{fieldError}</p>}

              {failure && (
                <div role="alert" className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div className="space-y-2">
                    <p>{failure.message}</p>
                    {(failure.code === "LIMIT_REACHED" || failure.code === "PLAN_LOCKED") && <Button asChild size="sm" variant="hero"><Link to="/billing">See plans</Link></Button>}
                  </div>
                </div>
              )}

              {nearLimit && <p className="rounded-lg border border-risk-medium/30 bg-risk-medium/10 px-3 py-2 text-sm">You've used over 80% of this month's analyses.</p>}
              {limitReached && (
                <div className="rounded-lg border border-risk-medium/40 bg-risk-medium/10 p-4 text-sm">
                  <p className="font-medium">You've reached this month's limit.</p>
                  <p className="mt-1 text-muted-foreground">Your allowance resets on the 1st. Past results stay available in History.</p>
                  <Button asChild size="sm" variant="outline" className="mt-3"><Link to="/billing">View plans</Link></Button>
                </div>
              )}

              <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <UsageMeter className="sm:w-56" />
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={reset}><RotateCcw /> Clear</Button>
                  <Button type="submit" variant="hero" size="lg" disabled={limitReached}>Analyze</Button>
                </div>
              </div>
            </div>
          </form>
        )}

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">What will be processed</h2>
            <p className="mt-2 text-sm text-muted-foreground">{PROCESSED[type]}</p>
          </div>
          <div className="rounded-xl border border-risk-medium/30 bg-risk-medium/5 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Lock className="size-4 text-risk-medium" />Protect your secrets</h2>
            <p className="mt-2 text-sm text-muted-foreground">Don't include passwords, recovery codes or full card numbers. Common password-like strings and long numbers are redacted automatically before analysis and storage.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">
            Results are AI-assisted and can be wrong. Always verify through official channels before acting. Control what's saved in <Link to="/settings" className="text-primary hover:underline">Settings</Link>.
          </div>
        </aside>
      </div>
    </div>
  );
}
