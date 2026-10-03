import { Link } from "@tanstack/react-router";

export function ReportsTabs() {
  const cls = "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground";
  return (
    <nav className="mb-5 inline-flex gap-1 rounded-lg bg-surface-2 p-1" aria-label="Reports sections">
      <Link to="/reports" className={cls} activeProps={{ className: "bg-background !text-foreground shadow ring-1 ring-border" }}>Reports</Link>
      <Link to="/evidence" className={cls} activeProps={{ className: "bg-background !text-foreground shadow ring-1 ring-border" }}>Evidence vault</Link>
    </nav>
  );
}
