import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthCard } from "@/components/auth-card";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
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
  return (
    <AuthCard
      mode="signin"
      onDone={() => navigate({ to: "/dashboard" })}
      footer={<>New to FraudShield? <Link to="/signup" className="text-primary hover:underline">Create an account</Link></>}
    />
  );
}
