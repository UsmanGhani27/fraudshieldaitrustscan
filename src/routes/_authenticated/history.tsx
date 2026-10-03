import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { History as HistoryIcon, Search, SearchX } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { AnalysisList } from "@/components/analysis-list";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { analysesListQuery } from "@/lib/queries";
import { CATEGORY_INFO, INPUT_LABEL, RISK_LABEL, THREAT_CATEGORIES } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "History — FraudShield AI" }, { name: "description", content: "Search and filter your past analyses." }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data, isLoading } = useQuery(analysesListQuery());
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState("all");
  const [type, setType] = useState("all");
  const [cat, setCat] = useState("all");
  const [savedOnly, setSavedOnly] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((a) =>
      (risk === "all" || a.risk_level === risk) &&
      (type === "all" || a.input_type === type) &&
      (cat === "all" || a.analysis_categories.some((c) => c.category === cat)) &&
      (!savedOnly || a.is_saved) &&
      (!term || a.title.toLowerCase().includes(term) || a.summary.toLowerCase().includes(term)),
    );
  }, [data, q, risk, type, cat, savedOnly]);

  return (
    <div>
      <PageHeader title="Analysis history" description="Every analysis you've run, newest first." />
      {!isLoading && (data ?? []).length === 0 ? (
        <EmptyState icon={HistoryIcon} title="No history yet" description="Your analyses will appear here. If history is turned off in Settings, results are still kept but raw content isn't stored." action={<Button asChild variant="hero"><Link to="/analyze">Start an analysis</Link></Button>} />
      ) : (
        <>
          <div className="mb-4 grid gap-2 md:grid-cols-[1fr_repeat(3,160px)_auto]">
            <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search history" placeholder="Search title or summary" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" /></div>
            <Select value={risk} onValueChange={setRisk}><SelectTrigger aria-label="Filter by risk"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All risk levels</SelectItem>{Object.entries(RISK_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
            <Select value={type} onValueChange={setType}><SelectTrigger aria-label="Filter by type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem>{Object.entries(INPUT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
            <Select value={cat} onValueChange={setCat}><SelectTrigger aria-label="Filter by category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{THREAT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_INFO[c].label}</SelectItem>)}</SelectContent></Select>
            <Button variant={savedOnly ? "secondary" : "outline"} onClick={() => setSavedOnly(!savedOnly)} aria-pressed={savedOnly}>Saved only</Button>
          </div>
          {isLoading ? (
            <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-card" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={SearchX} title="No matches" description="Try a different search term or clear your filters." />
          ) : (
            <AnalysisList items={filtered} />
          )}
        </>
      )}
    </div>
  );
}
