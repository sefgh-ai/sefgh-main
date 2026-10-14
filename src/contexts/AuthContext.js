"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const AuthContext = createContext(null);

/**
 * Auth state is driven entirely by `onAuthStateChange`.
 *
 * Supabase emits INITIAL_SESSION immediately on subscribe with the restored
 * session (or null), then SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED /
 * USER_UPDATED as they happen. Handling all of them in one place means
 * `loading` only ever clears once we actually know who the user is.
 *
 * Previously this file also called getSession() in parallel and had no
 * INITIAL_SESSION branch, so the listener cleared `loading` while `user` was
 * still null — route guards read that as "signed out" and bounced to /login.
 *
 * Note: the client trusts the locally stored session for UI purposes only.
 * Authorization is revalidated server-side in proxy.js via getUser().
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      const nextUser = session?.user ?? null;

      // Keep the previous object when nothing meaningful changed, so token
      // refreshes don't re-render every consumer. Comparing updated_at as well
      // as id means user_metadata changes (e.g. a new avatar) still propagate.
      setUser((prev) =>
        prev?.id === nextUser?.id && prev?.updated_at === nextUser?.updated_at
          ? prev
          : nextUser
      );

      if (event === "SIGNED_IN" && nextUser) {
        // Let onboarding reappear for users who never finished it.
        sessionStorage.removeItem(`onboarding_dismissed_session_${nextUser.id}`);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const refreshUser = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error("[auth] refreshSession failed:", error.message);
      return null;
    }
    const refreshed = data?.session?.user ?? null;
    if (refreshed) setUser(refreshed);
    return refreshed;
  }, [supabase]);

  // Read the id outside the callback so the dependency is a primitive; the
  // React Compiler cannot preserve a `user?.id` dep against an inferred `user`.
  const userId = user?.id;

  // scope "local" ends this browser's session only (Supabase revokes it on
  // the server too); "global" ends every session of the account, on every
  // device. Supabase's own default is "global", which made the ordinary
  // "Sign out" button sign people out everywhere (bug register R-058).
  const signOut = useCallback(async ({ scope = "local" } = {}) => {
    if (userId) {
      sessionStorage.removeItem(`onboarding_dismissed_session_${userId}`);
    }

    const { error } = await supabase.auth.signOut({ scope });
    if (error) {
      // Surface it rather than navigating away while the session survives.
      console.error("[auth] signOut failed:", error.message);
      throw error;
    }

    router.replace("/");
    router.refresh();
  }, [supabase, router, userId]);

  const value = useMemo(
    () => ({ user, loading, refreshUser, signOut }),
    [user, loading, refreshUser, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
};
