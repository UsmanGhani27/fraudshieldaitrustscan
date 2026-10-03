import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { user: User | null; session: Session | null; loading: boolean };
const AuthContext = createContext<AuthState>({ user: null, session: null, loading: true });

export function AuthProvider({ children, onIdentityChange }: { children: ReactNode; onIdentityChange?: (event: string) => void }) {
  const [state, setState] = useState<AuthState>({ user: null, session: null, loading: true });
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ user: session?.user ?? null, session, loading: false });
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") onIdentityChange?.(event);
    });
    supabase.auth.getSession().then(({ data }) => setState({ user: data.session?.user ?? null, session: data.session, loading: false }));
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
