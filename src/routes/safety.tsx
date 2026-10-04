import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert, Lock, EyeOff, Trash2, Brain, KeyRound, Link2Off, FileText, CheckCircle2 } from "lucide-react";
import { PublicLayout } from "@/components/site-chrome";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Security & Privacy — FraudShield AI" },
      { name: "description", content: "What FraudShield AI processes, what it stores, your retention and deletion controls, and the limits of automated analysis." },
      { property: "og:title", content: "Security & Privacy — FraudShield AI" },
      { property: "og:description", content: "Transparent limits, privacy-first controls, and how we handle your data." },
    ],
  }),
  component: Safety,
});

const SECTIONS = [
  { icon: FileText, t: "What may be processed", d: "The text, sender details, links, screenshots or decoded QR destinations you choose to submit. Content is sent server-side to our AI provider for analysis. QR codes are decoded on your device and attachments are never uploaded — only their names, if you enter them." },
  { icon: KeyRound, t: "Automatic redaction", d: "Before analysis and storage we redact common password-like strings, one-time codes written as “code: …”, long card-like numbers and API-key patterns. Please still avoid submitting secrets." },
  { icon: EyeOff, t: "What can be saved", d: "With history on, the redacted text or image is stored privately in your account alongside the assessment. With history off, only the assessment is kept — not the full text or image. The assessment can still quote short, redacted snippets as evidence for its findings." },
  { icon: Trash2, t: "Retention & deletion", d: "Choose automatic deletion after 7, 30, 90 or 365 days (plans also cap history length). Delete a single analysis, just its stored evidence, or all your analysis data at any time from Settings. A usage count is kept for the current month so limits stay fair. Full account deletion isn't self-serve yet." },
  { icon: Link2Off, t: "We never open your links", d: "Links and QR destinations are analyzed as text — domain, spelling and structure. FraudShield never visits, downloads or executes them." },
  { icon: Lock, t: "Security by design", d: "Each account's data is isolated at the database level, uploads are private, AI calls run server-side, and no provider keys reach your browser. Raw submissions aren't written to server logs. Usage limits and rate limits are enforced on our servers." },
  { icon: Brain, t: "Limits of automated analysis", d: "Results are AI-assisted and can be wrong. We don't use live threat-intelligence feeds yet, and we never claim content is definitively AI-generated. FraudShield is not an antivirus, legal service or financial advisor." },
  { icon: ShieldAlert, t: "Not a guarantee", d: "A low score doesn't mean something is safe, and a high score doesn't prove fraud. For anything involving money, codes or account access, verify independently." },
];

const VERIFY = [
  "Open the organization's official app, or type its website address yourself.",
  "Use contact details from your card, statement or the official site — never from the suspicious message.",
  "Check the sender's domain carefully for look-alike spelling.",
  "Never share passwords or one-time codes, and don't pay with gift cards or crypto on request.",
  "When in doubt, pause and ask someone you trust.",
];

function Safety() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-semibold">Security & Privacy</h1>
        <p className="mt-3 text-muted-foreground">Trust is earned through transparency. Here's exactly what FraudShield AI does with your data — and what it can't do.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {SECTIONS.map(({ icon: Icon, t, d }) => (
            <section key={t} className="rounded-xl border border-border bg-card p-6">
              <Icon className="size-5 text-cyan" />
              <h2 className="mt-3 text-lg font-semibold">{t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </section>
          ))}
        </div>
        <section className="mt-10 rounded-xl border border-primary/30 bg-card p-6">
          <h2 className="text-lg font-semibold">How to verify suspicious content yourself</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {VERIFY.map((v) => <li key={v} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-risk-low" />{v}</li>)}
          </ul>
        </section>
      </div>
    </PublicLayout>
  );
}
