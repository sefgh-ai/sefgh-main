"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Client-side guard for authenticated routes.
 *
 * Server-side protection lives in `src/proxy.js`; this is the second layer that
 * handles client navigations and sign-out while a protected page is open.
 *
 * Callers must not render protected content until `isReady` is true — the hook
 * can only redirect from an effect, which runs after the first paint.
 *
 * @param {Object}  [options]
 * @param {string}  [options.redirectTo="/login"]
 * @returns {{ isAuthenticated: boolean, isLoading: boolean, isReady: boolean }}
 */
export function useAuthGuard(options = {}) {
  const { user, loading } = useAuth();
  const { redirectTo = "/login" } = options;

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || user) return;

    // `replace`, not `push`: the guarded page must not stay in history, or
    // Back lands on a page that immediately bounces again.
    const target = pathname
      ? `${redirectTo}?returnTo=${encodeURIComponent(pathname)}`
      : redirectTo;
    router.replace(target);
  }, [user, loading, router, redirectTo, pathname]);

  return {
    isAuthenticated: !!user,
    isLoading: loading,
    // True only when it is safe to render protected content.
    isReady: !loading && !!user,
  };
}
