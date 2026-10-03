import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site-chrome";
import { PricingGrid, PricingPreviewNote } from "@/components/pricing-grid";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — FraudShield AI" },
      { name: "description", content: "Free, Personal, Pro, Team and Business plans for FraudShield AI scam and phishing analysis." },
      { property: "og:title", content: "FraudShield AI pricing" },
      { property: "og:description", content: "Start free with 10 analyses per month. Proposed plans for the hackathon MVP preview." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-center text-4xl font-semibold">Pricing</h1>
        <p className="mt-3 text-center text-muted-foreground">Start free. Upgrade when you need more analyses.</p>
        <div className="mt-6"><PricingPreviewNote /></div>
        <div className="mt-10">
          <PricingGrid
            renderAction={(p) =>
              p.code === "free" ? (
                <Button asChild variant="hero" className="w-full"><Link to="/signup">Start free</Link></Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>{p.code === "business" ? "Contact (coming soon)" : "Coming soon"}</Button>
              )
            }
          />
        </div>
      </div>
    </PublicLayout>
  );
}
