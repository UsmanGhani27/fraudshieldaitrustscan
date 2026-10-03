import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { ShieldQuestion } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-glow px-4">
      <div className="max-w-md text-center">
        <ShieldQuestion className="mx-auto size-10 text-cyan" />
        <h1 className="mt-4 text-6xl font-semibold">404</h1>
        <h2 className="mt-2 text-xl font-semibold">This page doesn't exist</h2>
        <p className="mt-2 text-sm text-muted-foreground">The link may be outdated, or the item may have been deleted.</p>
        <Button asChild variant="hero" className="mt-6"><Link to="/">Go home</Link></Button>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong on our end. You can try again or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => { router.invalidate(); reset(); }}>Try again</Button>
          <Button asChild variant="outline"><a href="/">Go home</a></Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FraudShield AI — Scam & phishing analysis" },
      { name: "description", content: "Analyze suspicious messages, emails, links and screenshots for phishing, impersonation and fraud signals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Sora:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        onIdentityChange={(event) => {
          router.invalidate();
          if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
          else queryClient.clear();
        }}
      >
        <Outlet />
        <Toaster richColors theme="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
