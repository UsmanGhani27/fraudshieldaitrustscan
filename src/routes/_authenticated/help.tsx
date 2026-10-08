import { createFileRoute, Link } from "@tanstack/react-router";
import { LifeBuoy, ScanSearch, ShieldCheck, Phone, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { FaqList } from "@/components/faq-list";
import { CATEGORY_INFO, THREAT_CATEGORIES } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({ meta: [{ property: "og:title", content: "Help — FraudShield AI" }, { property: "og:description", content: "How to use FraudShield AI and what to do if you've been scammed." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Help — FraudShield AI" }, { name: "description", content: "How to use FraudShield AI and what to do if you've been scammed." }] }),
  component: Help,
});

function Help() {
  return (
    <div className="space-y-8">
      <PageHeader title="Help" description="Getting the most from FraudShield AI — and what to do if something already went wrong." />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: ScanSearch, t: "1. Submit", d: "Paste the message, email or link, or upload a screenshot. Add the sender and claimed company if you know them — it improves the identity check." },
          { icon: ShieldCheck, t: "2. Read the why", d: "Start with the summary and identity check. Each warning sign quotes the exact evidence so you can judge it yourself." },
          { icon: BookOpen, t: "3. Verify & act", d: "Follow the checklist using official channels you find yourself. Save a report if you want to report the scam." },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="rounded-xl border border-border bg-card p-5"><Icon className="size-5 text-cyan" /><h2 className="mt-3 font-semibold">{t}</h2><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>
        ))}
      </div>
      <section className="rounded-xl border border-risk-critical/30 bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Phone className="size-5 text-risk-critical" />If you already clicked, paid or shared details</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
          <li>Contact your bank or card provider immediately using the number on your card or official app.</li>
          <li>Change passwords for affected accounts from the official site, and turn on two-step verification.</li>
          <li>If you shared a one-time code, sign out of all sessions from the official app.</li>
          <li>Report the scam to your local consumer-protection or fraud-reporting authority. A FraudShield report can help document what happened.</li>
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Threat categories</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {THREAT_CATEGORIES.map((c) => (
            <Link key={c} to="/threats/$category" params={{ category: c }} className="rounded-lg border border-border bg-card p-3 hover:border-primary/50">
              <p className="text-sm font-medium">{CATEGORY_INFO[c].label}</p>
              <p className="text-xs text-muted-foreground">{CATEGORY_INFO[c].description}</p>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><LifeBuoy className="size-5 text-cyan" />FAQ</h2>
        <FaqList />
      </section>
    </div>
  );
}
