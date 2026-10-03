import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/risk";
import { RISK_LABEL } from "@/lib/risk";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-display font-semibold tracking-tight", className)} aria-label="FraudShield AI home">
      <span className="grid size-8 place-items-center rounded-lg bg-brand shadow-glow">
        <ShieldCheck className="size-4.5 text-primary-foreground" aria-hidden />
      </span>
      <span>
        FraudShield <span className="text-cyan">AI</span>
      </span>
    </Link>
  );
}

const RISK_STYLES: Record<RiskLevel, string> = {
  low: "bg-risk-low/15 text-risk-low ring-risk-low/40",
  medium: "bg-risk-medium/15 text-risk-medium ring-risk-medium/40",
  high: "bg-risk-high/15 text-risk-high ring-risk-high/40",
  critical: "bg-risk-critical/15 text-risk-critical ring-risk-critical/40",
};
export const RISK_TEXT: Record<RiskLevel, string> = {
  low: "text-risk-low",
  medium: "text-risk-medium",
  high: "text-risk-high",
  critical: "text-risk-critical",
};
export const RISK_BG: Record<RiskLevel, string> = {
  low: "bg-risk-low",
  medium: "bg-risk-medium",
  high: "bg-risk-high",
  critical: "bg-risk-critical",
};

export function RiskBadge({ level, size = "sm" }: { level: RiskLevel; size?: "sm" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full font-mono font-semibold uppercase tracking-wider ring-1", RISK_STYLES[level], size === "lg" ? "px-4 py-1.5 text-sm" : "px-2.5 py-0.5 text-[11px]")}>
      <span className={cn("size-1.5 rounded-full", RISK_BG[level])} aria-hidden />
      {RISK_LABEL[level]}
    </span>
  );
}

export function Disclaimer({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <p className={cn("rounded-lg border border-border bg-surface-2/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground", className)}>
      {children ?? "This is an automated, AI-assisted assessment — not a guarantee of safety. Always verify independently through official channels before making high-impact decisions."}
    </p>
  );
}
