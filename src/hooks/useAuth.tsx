import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Local-only sign out avoids 403s when the server session is already stale
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.log("Sign out error (ignored):", error);
    } finally {
      // Always clear local UI state
      setUser(null);
      setSession(null);
      setLoading(false);
      // Force navigation to auth page (hard redirect clears all state)
      window.location.href = "/auth";
    }
  };

  return { user, session, loading, signOut };
}

