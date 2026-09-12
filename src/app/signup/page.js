"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/components/ui/auth-page";

const MIN_PASSWORD_LENGTH = 8;

function safeReturnTo(value) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("://")
    ? value
    : "/home";
}

function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const returnTo = safeReturnTo(searchParams.get("returnTo"));

  useEffect(() => {
    if (!authLoading && user) router.replace(returnTo);
  }, [user, authLoading, router, returnTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (password.length < MIN_PASSWORD_LENGTH) {
      const message = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      setError(message);
      toast.error("Password too short", { description: message });
      return;
    }

    if (password !== confirmPassword) {
      const message = "Those passwords don't match.";
      setError(message);
      toast.error("Passwords don't match", { description: message });
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
        },
      });
      if (signUpError) throw signUpError;

      // When email confirmation is off, Supabase returns a live session and
      // AuthContext picks it up — don't send the user to /login in that case.
      if (data.session) {
        toast.success("Welcome to SEFGH");
        router.replace(returnTo);
        return;
      }

      toast.success("Check your email", {
        description: `We sent a confirmation link to ${email}.`,
        duration: 6000,
      });
      router.replace("/login?checkEmail=1");
    } catch (err) {
      setError(err.message);
      toast.error("Sign-up failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const signUpWithProvider = async (provider, label) => {
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
    } catch (err) {
      setError(err.message);
      toast.error(`${label} sign-up failed`, { description: err.message });
      setLoading(false);
    }
  };

  return (
    <AuthPage
      mode="signup"
      brandName="SEFGH-AI"
      homeLink="/"
      onSubmit={handleSubmit}
      onGoogleAuth={() => signUpWithProvider("google", "Google")}
      onGithubAuth={() => signUpWithProvider("github", "GitHub")}
      loading={loading}
      error={error}
      testimonial={{
        text: "Finding the right repository used to take hours. Now it takes one search.",
        author: "Adeel, Developer",
      }}
    />
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
