import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * OAuth and email-link landing point.
 *
 * Handles both Supabase flows:
 *   - ?code=...                    OAuth / PKCE  -> exchangeCodeForSession
 *   - ?token_hash=...&type=...     email links   -> verifyOtp
 *
 * The email-link branch used to be missing entirely, so every confirmation,
 * magic-link and recovery email landed here, found no `code`, and bounced to
 * /login?error=... — which the login page then never displayed.
 */

async function sendWelcomeNotification(supabase, userId, userName) {
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Welcome to SEFGH",
      message: `Hey ${
        userName || "there"
      }! Start exploring AI-powered GitHub search and discover great repositories.`,
      type: "success",
      link: "/search",
    });
  } catch (error) {
    // Never fail auth because a notification failed.
    console.error("[auth/callback] welcome notification failed:", error);
  }
}

function isNewUser(user) {
  if (!user?.created_at) return false;
  return new Date(user.created_at) > new Date(Date.now() - 5 * 60 * 1000);
}

// Only same-origin paths, so `next` can't be used as an open redirect.
function safeInternalPath(value) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("://")
    ? value
    : null;
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const baseOrigin = process.env.NEXT_PUBLIC_SITE_URL || origin;
  const next = safeInternalPath(searchParams.get("next")) ?? "/home";

  const fail = (reason) =>
    NextResponse.redirect(
      new URL(`/login?error=${reason}`, baseOrigin).toString()
    );

  if (!code && !tokenHash) return fail("invalid_link");

  const supabase = await createClient();

  let authError = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
  } else {
    // Email confirmation, magic link, recovery, email change.
    const { error } = await supabase.auth.verifyOtp({
      type: type || "email",
      token_hash: tokenHash,
    });
    authError = error;
  }

  if (authError) {
    console.error("[auth/callback] verification failed:", authError.message);
    return fail("exchange_failed");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return fail("authentication_failed");

  if (isNewUser(user)) {
    const userName =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0];
    await sendWelcomeNotification(supabase, user.id, userName);
  }

  // A recovery link must land on the password form, not the app.
  const destination = type === "recovery" ? "/auth/update-password" : next;

  return NextResponse.redirect(new URL(destination, baseOrigin).toString());
}
