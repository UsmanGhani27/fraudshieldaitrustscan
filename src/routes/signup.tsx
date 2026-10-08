import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthCard } from "@/components/auth-card";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Create account — FraudShield AI" },
      { name: "description", content: "Create a free FraudShield AI account with 10 analyses per month." },
      { property: "og:title", content: "Create account — FraudShield AI" },
      { property: "og:description", content: "Start analyzing suspicious content for free." },
    ],
  }),
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  return (
    <AuthCard
      mode="signup"
      onDone={() => navigate({ to: "/dashboard" })}
      footer={<>Already have an account? <Link to="/auth" className="text-primary hover:underline">Sign in</Link></>}
    />
  );
}
