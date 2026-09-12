import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy`.
 *
 * Its main job is refreshing the Supabase session cookie on every request.
 * Server Components cannot write cookies, so if this does not run, an expired
 * access token can never be replaced and the user is silently signed out.
 *
 * The previous version gated all of this behind a check for cookies named
 * `sb-access-token` / `sb-refresh-token` — supabase-js v1 names that
 * @supabase/ssr never writes (it uses `sb-<project-ref>-auth-token`, and
 * chunked `.0` / `.1` variants). That check was always false, so the refresh
 * below never ran.
 */

// Routes that require a signed-in user. Checked as prefixes.
const PROTECTED_PREFIXES = [
  "/chat",
  "/history",
  "/notifications",
  "/playground",
  "/profile",
  "/settings",
  "/starred",
  "/submissions",
];

// Routes a signed-in user should not see.
const AUTH_ROUTES = ["/login", "/signup"];

function hasSupabaseAuthCookie(request) {
  // Matches `sb-<ref>-auth-token` plus its chunked `.0` / `.1` variants.
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

export async function proxy(request) {
  const { pathname, searchParams } = request.nextUrl;

  let supabaseResponse = NextResponse.next({ request });

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Anonymous request to a public page: nothing to refresh, nothing to guard.
  if (!hasSupabaseAuthCookie(request)) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?returnTo=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() revalidates the JWT against the auth server and triggers the
  // refresh that writes new cookies. getSession() only reads local storage and
  // must not be trusted on the server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?returnTo=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = searchParams.get("returnTo") || "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Send signed-in users from the marketing landing page to the app, but let
  // the PWA start_url (?source=pwa) through.
  if (user && pathname === "/" && searchParams.get("source") !== "pwa") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Every path except static assets, image optimization, and PWA files.
     * API routes are excluded: each one does its own getUser() check, and
     * running a Supabase round-trip in front of all of them adds latency
     * without adding protection.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff|woff2|ttf|eot)$).*)",
  ],
};
