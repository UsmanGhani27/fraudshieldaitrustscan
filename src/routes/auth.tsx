import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { AuthCard } from "@/components/auth-card";
import { safeReturnPath, takeReturnPath } from "@/lib/return-path";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => { const r = safeReturnPath(s["redirect"]); return r ? { redirect: r } : {}; },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sign in — FraudShield AI" },
      { name: "description", content: "Sign in to FraudShield AI to analyze suspicious content and review your history." },
      { property: "og:title", content: "Sign in — FraudShield AI" },
      { property: "og:description", content: "Sign in to analyze suspicious messages, emails and links." },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const onDone = useCallback(() => {
    const to = redirect ?? takeReturnPath() ?? "/dashboard";
    navigate({ to, replace: true });
  }, [redirect, navigate]);
  return (
    <AuthCard
      mode="signin"
      returnPath={redirect}
      onDone={onDone}
      footer={<>New to FraudShield? <Link to="/signup" className="text-primary hover:underline">Create an account</Link></>}
    />
  );
}
