"use client";

import type { User, Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/utils/supabase/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      setSession(null);
      setUser(null);
      setStatus("unauthenticated");
      return;
    }
    setSession(data.session);
    setUser(data.session.user);
    setStatus("authenticated");
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setStatus(nextSession ? "authenticated" : "unauthenticated");
    });
    return () => {
      window.clearTimeout(id);
      subscription.unsubscribe();
    };
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      session,
      refresh,
    }),
    [status, user, session, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
