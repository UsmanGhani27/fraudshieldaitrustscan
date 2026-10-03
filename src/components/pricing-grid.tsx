import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlanCard = { code: string; name: string; price: string; period?: string; features: string[]; highlight?: boolean };

export const PLANS: PlanCard[] = [
  { code: "free", name: "Free", price: "$0", period: "/month", features: ["10 analyses/month", "Message + URL analysis", "Basic history", "Basic risk report"] },
  { code: "personal", name: "Personal", price: "$4.99", period: "/month", highlight: true, features: ["150 analyses/month", "All MVP analyzers including screenshot", "Full history", "Exportable reports", "Advanced explanations"] },
  { code: "pro", name: "Pro", price: "$9.99", period: "/month", features: ["500 analyses/month", "Advanced analysis", "Priority processing", "Extended reports", "Risk analytics", "Future integrations/agent features"] },
  { code: "team", name: "Team", price: "$29", period: "/month", features: ["Up to 5 users", "2,000 analyses/month", "Team dashboard", "Shared reports", "Admin controls", "Future email-agent integrations"] },
  { code: "business", name: "Business", price: "Custom", features: ["Larger usage", "SSO / organization controls", "API/integrations", "Custom retention and support"] },
];

export function PricingGrid({ currentPlan, renderAction }: { currentPlan?: string; renderAction?: (p: PlanCard) => React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {PLANS.map((p) => (
        <div key={p.code} className={cn("relative flex flex-col rounded-xl border bg-card p-5", p.highlight ? "border-primary/60 shadow-glow" : "border-border", currentPlan === p.code && "ring-2 ring-cyan")}>
          {p.highlight && <span className="absolute -top-2.5 left-5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">Popular</span>}
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{p.name}</h3>
          <p className="mt-2 font-display text-3xl font-semibold">{p.price}<span className="text-sm font-normal text-muted-foreground">{p.period}</span></p>
          <ul className="mt-4 flex-1 space-y-2 text-sm">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden /><span>{f}</span></li>
            ))}
          </ul>
          {renderAction && <div className="mt-5">{renderAction(p)}</div>}
        </div>
      ))}
    </div>
  );
}

export function PricingPreviewNote() {
  return (
    <p className="mx-auto max-w-2xl text-center text-xs text-muted-foreground">
      Proposed plans — hackathon MVP preview. Live billing is not enabled and no payment information is collected. During the preview, screenshot and QR analysis are available on all plans.
    </p>
  );
}
