"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MIN_PASSWORD_LENGTH = 8;

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // A recovery link signs the user in before landing here. Without a session
  // there is nothing to update.
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setHasSession(Boolean(data?.user));
      setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;

      toast.success("Password updated", {
        description: "You're signed in with your new password.",
      });
      router.replace("/home");
    } catch (err) {
      setError(err.message);
      toast.error("Could not update password", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Set a new password
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose a password you haven&apos;t used before.
          </p>
        </header>

        {checking ? (
          <p className="text-sm text-muted-foreground text-center">
            Checking your link…
          </p>
        ) : !hasSession ? (
          <div
            role="alert"
            className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm"
          >
            <p className="font-medium text-foreground">
              This reset link has expired
            </p>
            <p className="text-muted-foreground">
              Reset links can only be used once. Request a new one to continue.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="new-password"
                className="text-sm font-medium text-foreground"
              >
                New password
              </label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                disabled={saving}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm-password"
                className="text-sm font-medium text-foreground"
              >
                Confirm password
              </label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={saving}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive-foreground bg-destructive/90 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
