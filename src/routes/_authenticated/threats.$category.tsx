import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldQuestion, BookOpen } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { AnalysisList } from "@/components/analysis-list";
import { Button } from "@/components/ui/button";
import { analysesListQuery } from "@/lib/queries";
import { CATEGORY_INFO, isThreatCategory } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/threats/$category")({
  head: () => ({ meta: [{ property: "og:title", content: "Threat detail — FraudShield AI" }, { property: "og:description", content: "Learn about a threat category and see related analyses." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Threat detail — FraudShield AI" }, { name: "description", content: "Learn about a threat category and see related analyses." }] }),
  component: ThreatDetail,
});

function ThreatDetail() {
  const { category } = Route.useParams();
  const { data } = useQuery(analysesListQuery());
  if (!isThreatCategory(category)) return <EmptyState icon={ShieldQuestion} title="Unknown threat category" description="This category doesn't exist." action={<Button asChild variant="hero"><Link to="/dashboard">Back to dashboard</Link></Button>} />;
  const info = CATEGORY_INFO[category];
  const related = (data ?? []).filter((a) => a.analysis_categories.some((c) => c.category === category));
  return (
    <div>
      <Link to="/history" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />History</Link>
      <PageHeader title={info.label} description="Threat category" />
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><BookOpen className="size-4 text-cyan" />What it is</h2>
        <p className="mt-2">{info.description}</p>
        <p className="mt-4 text-sm text-muted-foreground">General defense: slow down, verify through official channels you find yourself, and never share passwords, one-time codes or payment details with unsolicited contacts.</p>
      </div>
      <h2 className="mb-3 mt-8 text-lg font-semibold">Your analyses in this category ({related.length})</h2>
      {related.length ? <AnalysisList items={related} /> : <p className="text-sm text-muted-foreground">None of your analyses have been flagged with this category.</p>}
    </div>
  );
}
