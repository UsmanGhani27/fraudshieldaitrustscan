import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { RiskBadge } from "./brand";
import { CATEGORY_INFO, INPUT_LABEL, isThreatCategory, type InputType, type RiskLevel } from "@/lib/risk";

type Item = { id: string; title: string; input_type: string; risk_level: string; risk_score: number; created_at: string; summary?: string; primary_threat?: string | null };

export function AnalysisList({ items }: { items: Item[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {items.map((a) => (
        <li key={a.id}>
          <Link to="/analysis/$id" params={{ id: a.id }} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none">
            <div className="w-20 shrink-0"><RiskBadge level={a.risk_level as RiskLevel} /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.title}</p>
              {a.summary && <p className="hidden truncate text-xs text-muted-foreground sm:block">{a.summary}</p>}
              <p className="text-xs text-muted-foreground">
                {INPUT_LABEL[a.input_type as InputType]}
                {a.primary_threat && isThreatCategory(a.primary_threat) ? ` · ${CATEGORY_INFO[a.primary_threat].label}` : ""}
                {" · "}{new Date(a.created_at).toLocaleString()}
              </p>
            </div>
            <span className="font-mono text-sm text-muted-foreground" aria-label={`Risk score ${a.risk_score}`}>{a.risk_score}</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
