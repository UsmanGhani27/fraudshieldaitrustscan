import { Link } from "@tanstack/react-router";
import { RiskBadge } from "./brand";
import { INPUT_LABEL, type InputType, type RiskLevel } from "@/lib/risk";

export function AnalysisList({ items }: { items: { id: string; title: string; input_type: string; risk_level: string; risk_score: number; created_at: string }[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {items.map((a) => (
        <li key={a.id}>
          <Link to="/analysis/$id" params={{ id: a.id }} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2">
            <RiskBadge level={a.risk_level as RiskLevel} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.title}</p>
              <p className="text-xs text-muted-foreground">{INPUT_LABEL[a.input_type as InputType]} · {new Date(a.created_at).toLocaleString()}</p>
            </div>
            <span className="font-mono text-sm text-muted-foreground">{a.risk_score}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
