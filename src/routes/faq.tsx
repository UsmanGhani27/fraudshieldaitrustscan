import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site-chrome";
import { FaqList } from "@/components/faq-list";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "FAQ — FraudShield AI" },
      { name: "description", content: "Answers about how FraudShield AI analyzes scams, what it can't do, and how your data is handled." },
      { property: "og:title", content: "FraudShield AI — Frequently asked questions" },
      { property: "og:description", content: "How the risk score works, what we store, and the limits of automated scam analysis." },
    ],
  }),
  component: Faq,
});

function Faq() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-semibold">Frequently asked questions</h1>
        <p className="mt-3 text-muted-foreground">Straight answers about what FraudShield AI does — and doesn't do.</p>
        <div className="mt-10"><FaqList /></div>
        <Button asChild variant="hero" className="mt-10"><Link to="/analyze">Analyze Something</Link></Button>
      </div>
    </PublicLayout>
  );
}
