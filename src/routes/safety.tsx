import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert, Lock, EyeOff, Trash2, Brain, KeyRound } from "lucide-react";
import { PublicLayout } from "@/components/site-chrome";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety & Privacy — FraudShield AI" },
      { name: "description", content: "What FraudShield AI is and isn't, how your data is processed, and the privacy controls you have." },
      { property: "og:title", content: "Safety & Privacy — FraudShield AI" },
      { property: "og:description", content: "Transparent limits, privacy-first controls, and how we handle your data." },
    ],
  }),
  component: Safety,
});

const ITEMS = [
  { icon: ShieldAlert, t: "Not a guarantee", d: "FraudShield AI is an AI-assisted analysis tool. It is not an antivirus, legal service, or financial advisor. Results can be wrong — always verify independently before high-impact decisions." },
  { icon: Brain, t: "No definitive AI-detection claims", d: "We may flag possible AI-manipulation indicators, but we never claim content is definitively AI-generated." },
  { icon: KeyRound, t: "Don't share secrets", d: "Avoid uploading passwords, recovery codes, or full card numbers. We automatically redact common password-like strings and long numbers before analysis and storage." },
  { icon: EyeOff, t: "History controls", d: "Turn off history in Settings and we won't store the raw text or screenshots you submit — only the assessment itself." },
  { icon: Trash2, t: "Retention & deletion", d: "Choose an automatic retention period, or delete all your analyses, reports and screenshots at any time." },
  { icon: Lock, t: "Security by design", d: "Each account's data is isolated at the database level. AI calls run server-side; no provider keys ever reach your browser. Raw content is never written to server logs." },
];

function Safety() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-semibold">Safety & Privacy</h1>
        <p className="mt-3 text-muted-foreground">Trust is earned through transparency. Here's exactly what FraudShield AI does — and doesn't do.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {ITEMS.map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-border bg-card p-6">
              <Icon className="size-5 text-cyan" />
              <h2 className="mt-3 text-lg font-semibold">{t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
