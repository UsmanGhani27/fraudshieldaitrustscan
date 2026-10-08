import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { UsageMeter, useUsage } from "@/components/usage";
import { PricingGrid, PricingPreviewNote } from "@/components/pricing-grid";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { profileQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ property: "og:title", content: "Plan & usage — FraudShield AI" }, { property: "og:description", content: "Your plan, monthly usage and available upgrades." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Plan & usage — FraudShield AI" }, { name: "description", content: "Your plan, monthly usage and available upgrades." }] }),
  component: Billing,
});

function Billing() {
  const { user } = useAuth();
  const { data: usage } = useUsage();
  const { data } = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user });
  const sub = data?.subscription;
  return (
    <div>
      <PageHeader title="Plan & usage" description="Usage limits are enforced on our servers and reset monthly." />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</p>
          <p className="mt-2 font-display text-2xl font-semibold capitalize">{usage?.plan ?? "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Status: {sub?.status ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 md:col-span-2">
          <UsageMeter />
          {sub && <p className="mt-3 text-xs text-muted-foreground">Usage resets on {new Date(sub.current_period_end).toLocaleDateString()}.</p>}
          {usage && usage.used >= usage.limit && <p className="mt-2 text-sm text-risk-medium">You've reached this month's limit. Upgrades will be available when billing launches.</p>}
        </div>
      </div>
      <div className="mt-8">
        <PricingPreviewNote />
        <div className="mt-6">
          <PricingGrid currentPlan={usage?.plan} renderAction={(p) => p.code === usage?.plan ? <Button variant="secondary" className="w-full" disabled>Current plan</Button> : <Button variant="outline" className="w-full" disabled><Lock /> Coming soon</Button>} />
        </div>
      </div>
    </div>
  );
}
