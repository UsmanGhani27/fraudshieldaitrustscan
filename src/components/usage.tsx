import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getUsage } from "@/lib/analysis.functions";
import { cn } from "@/lib/utils";

export function useUsage() {
  const fn = useServerFn(getUsage);
  return useQuery({ queryKey: ["usage"], queryFn: () => fn(), staleTime: 15_000 });
}

export function UsageMeter({ compact, className }: { compact?: boolean; className?: string }) {
  const { data, isLoading } = useUsage();
  if (isLoading || !data) return <div className={cn("h-8 w-40 animate-pulse rounded-md bg-muted", className)} aria-label="Loading usage" />;
  const pct = Math.min(100, Math.round((data.used / Math.max(1, data.limit)) * 100));
  const tone = pct >= 100 ? "bg-risk-critical" : pct >= 80 ? "bg-risk-medium" : "bg-brand";
  return (
    <Link to="/billing" className={cn("group block rounded-lg", className)} aria-label={`${data.used} of ${data.limit} analyses used this month`}>
      <div className={cn("flex items-center justify-between gap-3 text-xs", compact && "gap-2")}>
        <span className="text-muted-foreground group-hover:text-foreground">{compact ? "Usage" : "Monthly analyses"}</span>
        <span className="font-mono text-foreground">{data.used}/{data.limit}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}
