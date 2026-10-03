import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquareText, Mail, Link2, Image, QrCode, Brain, BadgeCheck, Lock, ArrowRight, ScanSearch, Lightbulb, ListChecks, ShieldCheck, Inbox } from "lucide-react";
import { PublicLayout } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { ResultView, type ResultData } from "@/components/result-view";
import { PricingGrid, PricingPreviewNote } from "@/components/pricing-grid";
import { Disclaimer } from "@/components/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FraudShield AI — Understand suspicious messages. Verify what's real." },
      { name: "description", content: "Analyze suspicious messages, emails, links, and screenshots for phishing, impersonation, and fraud signals — with clear explanations and safer next steps." },
      { property: "og:title", content: "FraudShield AI — Understand suspicious messages. Verify what's real. Act safely." },
      { property: "og:description", content: "AI-assisted scam, phishing and impersonation analysis with explainable results and verification checklists." },
    ],
  }),
  component: Landing,
});

const SAMPLE_RESULT: ResultData = {
  risk_level: "critical",
  risk_score: 88,
  confidence: 82,
  summary: "This text claims to be from a parcel service but links to an unrelated domain and asks for a small fee under time pressure — a common delivery-scam pattern.",
  primary_threat: "delivery_scam",
  categories: ["delivery_scam", "phishing", "payment_scam"],
  claimed_identity: "ParcelPost Express",
  observed_indicators: ["Link domain: parcelpost-redelivery.top"],
  signals: [
    { title: "Domain doesn't match claimed brand", severity: "high", evidence: "parcelpost-redelivery.top", explanation: "The link isn't on the company's official website." },
    { title: "Small unexpected fee", severity: "medium", evidence: "“customs fee of $1.99”", explanation: "Tiny fees are used to collect card details." },
    { title: "Urgency pressure", severity: "medium", evidence: "“within 24 hours”", explanation: "Deadlines push you to act before verifying." },
  ],
  tactics: ["Urgency", "Payment request"],
  suspicious_entities: [],
  verification: { status: "suspicious", claimed: "ParcelPost Express", observed_sender: "+1 (555) 010-0199", observed_domain: "parcelpost-redelivery.top", official_domains: [], reason: "The link domain is unrelated to the claimed company." },
  url_analysis: [],
  actions: ["Track the parcel in the carrier's official app, opened yourself.", "Report the message as spam and delete it."],
  do_not_do: ["Don't open the link or pay the fee.", "Don't enter card details from a text message link."],
  steps: ["Check your recent orders for an expected delivery", "Look up the carrier's official website yourself"],
  limitations: ["Synthetic example for illustration."],
  safe_to_proceed: false,
  provider: "example",
  model: "illustrative",
  scoring: null,
  version: "example",
};

const INPUTS = [
  { icon: MessageSquareText, label: "Messages", desc: "SMS, WhatsApp, DMs" },
  { icon: Mail, label: "Emails", desc: "Body, sender & claimed brand" },
  { icon: Link2, label: "Links", desc: "Suspicious URLs" },
  { icon: Image, label: "Screenshots", desc: "PNG, JPG, WebP" },
  { icon: QrCode, label: "QR codes", desc: "Decoded safely, never opened" },
];

const STEPS = [
  { icon: Inbox, t: "Input", d: "Paste a message, email, link, or upload a screenshot." },
  { icon: ScanSearch, t: "Analyze", d: "AI checks for phishing, impersonation and fraud signals." },
  { icon: Lightbulb, t: "Explain", d: "See evidence and why each signal matters." },
  { icon: ListChecks, t: "Verify", d: "Follow a checklist to confirm independently." },
  { icon: ShieldCheck, t: "Act", d: "Take safer next steps with confidence." },
];

function Landing() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-glow" aria-hidden />
        <div className="absolute inset-0 grid-faint [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 text-center md:pt-28">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-cyan" /> AI + Cybersecurity · Explainable fraud analysis
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-semibold leading-[1.08] md:text-6xl">
            Understand suspicious messages. <span className="text-brand">Verify what's real.</span> Act safely.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
            FraudShield AI analyzes suspicious messages, emails, links, screenshots, and QR codes to explain risk and help you respond safely.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="hero" size="lg"><Link to="/analyze">Analyze Something <ArrowRight /></Link></Button>
            <Button asChild variant="outline" size="lg"><Link to="/how-it-works">See How It Works</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold md:text-3xl">One place to check suspicious content</h2>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
          {INPUTS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5">
              <Icon className="size-5 text-cyan" />
              <h3 className="mt-3 text-sm font-semibold">{label}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-3">
        {[
          { icon: Brain, t: "Explainable AI", d: "Every result shows the evidence behind it — quoted snippets, severity, and plain-language reasoning. No black-box verdicts." },
          { icon: BadgeCheck, t: "Verify before you trust", d: "Compare who a message claims to be with what's actually observed, then follow a verification checklist." },
          { icon: Lock, t: "Privacy-first controls", d: "Turn off history, set retention, and delete all your data at any time. Password-like strings are redacted." },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="rounded-xl border border-border bg-card p-6">
            <div className="grid size-10 place-items-center rounded-lg bg-secondary"><Icon className="size-5 text-primary" /></div>
            <h3 className="mt-4 text-lg font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold md:text-3xl">How it works</h2>
        <ol className="mt-8 grid gap-3 md:grid-cols-5">
          {STEPS.map(({ icon: Icon, t, d }, i) => (
            <li key={t} className="relative rounded-xl border border-border bg-card p-5">
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              <Icon className="mt-2 size-5 text-cyan" />
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold md:text-3xl">Example threat report</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">Synthetic example — what you'll see after an analysis.</p>
        <div className="mt-8"><ResultView data={SAMPLE_RESULT} linkCategories={false} /></div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold md:text-3xl">Simple pricing</h2>
        <div className="mt-8"><PricingGrid /></div>
        <div className="mt-6"><PricingPreviewNote /></div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20">
        <Disclaimer className="text-center">
          <strong className="text-foreground">Safety disclaimer:</strong> FraudShield AI provides automated, AI-assisted assessments that can be wrong. It is not an antivirus, legal service, or financial advisor, and cannot guarantee safety or definitively determine whether content is AI-generated. Always verify through official channels before acting on high-impact decisions.
        </Disclaimer>
      </section>
    </PublicLayout>
  );
}
