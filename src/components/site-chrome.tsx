import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./brand";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/use-auth";

const NAV = [
  { to: "/", label: "Product" },
  { to: "/how-it-works", label: "How it Works" },
  { to: "/safety", label: "Safety" },
  { to: "/pricing", label: "Pricing" },
] as const;

export function SiteHeader() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button asChild variant="hero" size="sm"><Link to="/dashboard">Open dashboard</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign In</Link></Button>
              <Button asChild variant="hero" size="sm"><Link to="/signup">Get started</Link></Button>
            </>
          )}
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <nav className="border-t border-border px-4 py-3 md:hidden" aria-label="Mobile">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block rounded-md px-2 py-2 text-sm text-muted-foreground hover:text-foreground">{n.label}</Link>
          ))}
          <Link to={user ? "/dashboard" : "/auth"} onClick={() => setOpen(false)} className="block rounded-md px-2 py-2 text-sm font-medium text-primary">{user ? "Dashboard" : "Sign In"}</Link>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-muted-foreground md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <Logo className="text-foreground" />
          <p className="max-w-md text-xs leading-relaxed">
            FraudShield AI is an AI-assisted analysis tool. It is not an antivirus, legal service, or financial advisor, and does not guarantee safety. Built for ForgeHacks 2026 — AI + Cybersecurity.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link to="/how-it-works" className="hover:text-foreground">How it Works</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/safety" className="hover:text-foreground">Safety & Privacy</Link>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
