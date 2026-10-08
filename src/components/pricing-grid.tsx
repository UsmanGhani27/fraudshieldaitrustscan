import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlanCard = { code: string; name: string; price: string; period?: string; tagline: string; features: string[]; highlight?: boolean };

export const PLANS: PlanCard[] = [
  { code: "free", name: "Free", price: "$0", period: "/month", tagline: "Try it out", features: ["10 analyses/month", "Message + URL analysis", "Basic reports", "7-day history"] },
  { code: "personal", name: "Personal", price: "$4.99", period: "/month", tagline: "For everyday protection", highlight: true, features: ["150 analyses/month", "All core analysis types", "Screenshot analysis", "Print-friendly security reports", "30-day history", "Priority processing"] },
  { code: "pro", name: "Pro", price: "$9.99", period: "/month", tagline: "For power users", features: ["500 analyses/month", "All analysis types including QR", "Advanced reports", "Extended history", "Risk analytics", "Priority processing"] },
  { code: "team", name: "Team", price: "$29", period: "/month", tagline: "For small teams", features: ["Up to 5 users", "2,000 analyses/month", "Shared dashboard", "Team activity", "Centralized reports", "Admin-ready controls"] },
  { code: "business", name: "Business", price: "Custom", tagline: "For organizations", features: ["Larger teams", "API access", "SSO/advanced controls", "Custom retention", "Custom limits"] },
];

export function PricingGrid({ currentPlan, renderAction }: { currentPlan?: string | undefined; renderAction?: (p: PlanCard) => React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {PLANS.map((p) => (
        <div key={p.code} className={cn("relative flex flex-col rounded-xl border bg-card p-5", p.highlight ? "border-primary/60 shadow-glow" : "border-border", currentPlan === p.code && "ring-2 ring-cyan")}>
          {p.highlight && <span className="absolute -top-2.5 left-5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">Planned personal tier</span>}
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{p.name}</h3>
          <p className="mt-2 font-display text-3xl font-semibold">{p.price}<span className="text-sm font-normal text-muted-foreground">{p.period}</span></p>
          <p className="text-xs text-muted-foreground">{p.tagline}</p>
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
      Paid-tier features and prices are proposed, not active — billing isn't enabled and no payment information is collected. During the hackathon preview, every analyzer is unlocked on the Free plan; monthly usage limits still apply. Image analysis requires AI availability. PDF export uses your browser's print/save option.
    </p>
  );
}
