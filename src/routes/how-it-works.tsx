import { createFileRoute, Link } from "@tanstack/react-router";
import { Inbox, ScanSearch, Lightbulb, ListChecks, ShieldCheck, ArrowRight } from "lucide-react";
import { PublicLayout } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { RISK_THRESHOLDS, RISK_LABEL } from "@/lib/risk";
import { RiskBadge } from "@/components/brand";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — FraudShield AI" },
      { name: "description", content: "Input, analyze, explain, verify, act: how FraudShield AI assesses suspicious content and how its risk score works." },
      { property: "og:title", content: "How FraudShield AI works" },
      { property: "og:description", content: "A transparent, AI-assisted process for checking scams, phishing and impersonation." },
    ],
  }),
  component: HowItWorks,
});

const STEPS = [
  { icon: Inbox, t: "1. Input", d: "Choose an analyzer — message, email, URL, screenshot or QR (preview). Add the sender and claimed brand if you have them. We show exactly what will be processed." },
  { icon: ScanSearch, t: "2. Analyze", d: "Your input is normalized, password-like strings and card numbers are redacted, deterministic checks look for known scam patterns and look-alike domains, and an AI model assesses the content. Links are never opened; QR codes are decoded on your device. If AI is unavailable, a clearly labeled rule-only result is shown." },
  { icon: Lightbulb, t: "3. Explain", d: "You get a risk score, confidence, threat categories and signal cards that quote the evidence and explain why it matters." },
  { icon: ListChecks, t: "4. Verify", d: "Compare the claimed identity with observed indicators, then work through a verification checklist using official channels." },
  { icon: ShieldCheck, t: "5. Act", d: "Follow recommended safe actions, save the result, or export a printable security report." },
];

function HowItWorks() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-semibold">How it works</h1>
        <p className="mt-3 text-muted-foreground">Input → Analyze → Explain → Verify → Act. An AI-assisted assessment designed to help you think clearly — not to make decisions for you.</p>
        <ol className="mt-10 space-y-4">
          {STEPS.map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex gap-4 rounded-xl border border-border bg-card p-5">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary"><Icon className="size-5 text-cyan" /></div>
              <div><h2 className="font-semibold">{t}</h2><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>
            </li>
          ))}
        </ol>
        <h2 className="mt-14 text-2xl font-semibold">The risk score</h2>
        <p className="mt-2 text-sm text-muted-foreground">A 0–100 score blending deterministic rule checks with the AI model's assessment, plus a separate confidence value that reflects evidence quality and agreement. It's an estimate, not a precise measurement.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[...RISK_THRESHOLDS].reverse().map((t, i, arr) => (
            <div key={t.level} className="rounded-xl border border-border bg-card p-4">
              <RiskBadge level={t.level} />
              <p className="mt-3 font-mono text-sm">{t.min}–{i < arr.length - 1 ? (arr[i + 1]?.min ?? 101) - 1 : 100}</p>
              <p className="text-xs text-muted-foreground">{RISK_LABEL[t.level]} risk</p>
            </div>
          ))}
        </div>
        <Button asChild variant="hero" size="lg" className="mt-12"><Link to="/analyze">Analyze Something <ArrowRight /></Link></Button>
      </div>
    </PublicLayout>
  );
}
