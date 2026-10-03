import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site-chrome";
import { PricingGrid, PricingPreviewNote } from "@/components/pricing-grid";
import { Button } from "@/components/ui/button";
import { EarlyAccessButton } from "@/components/early-access";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — FraudShield AI" },
      { name: "description", content: "Free, Personal, Pro, Team and Business plans for FraudShield AI scam and phishing analysis." },
      { property: "og:title", content: "FraudShield AI pricing" },
      { property: "og:description", content: "Start free with 10 analyses per month. Paid plans coming soon." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-center text-4xl font-semibold">Simple, honest pricing</h1>
        <p className="mt-3 text-center text-muted-foreground">Start free. Upgrade only when you need more.</p>
        <div className="mt-6"><PricingPreviewNote /></div>
        <div className="mt-10">
          <PricingGrid
            renderAction={(p) =>
              p.code === "free" ? (
                <Button asChild variant="hero" className="w-full"><Link to="/signup">Start free</Link></Button>
              ) : (
                <EarlyAccessButton plan={p.name} />
              )
            }
          />
        </div>
      </div>
    </PublicLayout>
  );
}
