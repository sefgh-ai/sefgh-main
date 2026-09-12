"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/components/ui/auth-page";

// Errors handed back by /auth/callback as ?error=<code>.
const CALLBACK_ERRORS = {
  authentication_failed:
    "We could not complete that sign-in. Please try again.",
  exchange_failed:
    "That sign-in link has expired or was already used. Request a new one.",
  invalid_link:
    "That link is not valid. Request a new sign-in or confirmation email.",
};

function safeReturnTo(value) {
  // Only same-origin paths, so ?returnTo= can't be used as an open redirect.
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("://")
    ? value
    : "/search";
}

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const returnTo = safeReturnTo(searchParams.get("returnTo"));

  // Surface failures bounced here from the OAuth / email-confirmation callback.
  // Previously /auth/callback redirected to ?error=... and nothing ever read it,
  // so every OAuth failure looked like a blank login form.
  useEffect(() => {
    const code = searchParams.get("error");
    if (!code) return;

    const message = CALLBACK_ERRORS[code] || "Sign-in failed. Please try again.";
    setError(message);
    toast.error("Sign-in failed", { description: message });
  }, [searchParams]);

  // Fallback for client navigations; proxy.js already redirects signed-in
  // users away from /login on the server.
  useEffect(() => {
    if (!authLoading && user) router.replace(returnTo);
  }, [user, authLoading, router, returnTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const userName =
        data.user?.user_metadata?.full_name ||
        data.user?.email?.split("@")[0] ||
        "there";

      toast.success(`Welcome back, ${userName}`, { duration: 2000 });
      router.replace(returnTo);
    } catch (err) {
      setError(err.message);

      if (err.message === "Invalid login credentials") {
        toast.error("Invalid credentials", {
          description: "That email and password don't match an account.",
        });
      } else if (err.message.includes("Email not confirmed")) {
        toast.error("Email not verified", {
          description: "Check your inbox for the confirmation link.",
        });
      } else {
        toast.error("Sign-in failed", { description: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (email) => {
    if (!email) {
      toast.error("Enter your email first", {
        description: "We'll send the reset link there.",
      });
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/auth/update-password` }
      );
      if (resetError) throw resetError;

      toast.success("Reset link sent", {
        description: `Check ${email} for a link to set a new password.`,
      });
    } catch (err) {
      toast.error("Could not send reset link", { description: err.message });
    }
  };

  const signInWithProvider = async (provider, label) => {
    setLoading(true);
    setError("");

    try {
      const next = encodeURIComponent(returnTo);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
        },
      });
      if (oauthError) throw oauthError;
      // Browser navigates away; leave `loading` set.
    } catch (err) {
      setError(err.message);
      toast.error(`${label} sign-in failed`, { description: err.message });
      setLoading(false);
    }
  };

  return (
    <AuthPage
      mode="signin"
      brandName="SEFGH-AI"
      homeLink="/"
      onSubmit={handleSubmit}
      onGoogleAuth={() => signInWithProvider("google", "Google")}
      onGithubAuth={() => signInWithProvider("github", "GitHub")}
      onResetPassword={handleResetPassword}
      loading={loading}
      error={error}
      testimonial={{
        text: "SEFGH-AI has transformed how I search for GitHub repos. The AI-powered search is a game changer!",
        author: "Adeel, Developer",
      }}
    />
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary so the route can still prerender.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
