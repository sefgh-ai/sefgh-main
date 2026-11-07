"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "./button";
import { AtIcon, CaretLeftIcon, SquaresFourIcon, EyeIcon, EyeSlashIcon, LockIcon, UserIcon } from "@phosphor-icons/react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export function AuthPage({
  mode = "signin", // 'signin' or 'signup'
  onSubmit,
  onGoogleAuth,
  onGithubAuth,
  onAppleAuth,
  onResetPassword,
  loading = false,
  error = null,
  homeLink = "/",
  brandName = "SEFGH-AI",
  testimonial = {
    text: "This Platform has helped me to save time and serve my clients faster than ever before.",
    author: "Ali Hassan",
  },
}) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const formRef = React.useRef(null);

  // "Forgot password?" sits inside the form, so read the email straight from it
  // rather than making the field controlled.
  const handleResetClick = () => {
    if (!onResetPassword) return;
    const email = formRef.current?.elements?.email?.value?.trim() || "";
    onResetPassword(email);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <main className="relative min-h-screen lg:h-screen lg:overflow-hidden lg:grid lg:grid-cols-2">
      <div className="bg-muted/60 relative hidden h-full flex-col border-r p-8 xl:p-10 lg:flex">
        <div className="from-background absolute inset-0 z-10 bg-gradient-to-t to-transparent" />
        <div className="z-10 flex items-center gap-2">
          <SquaresFourIcon className="size-6" />
          <p className="text-xl font-semibold">{brandName}</p>
        </div>
        <div className="z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg xl:text-xl leading-relaxed">
              &ldquo;{testimonial.text}&rdquo;
            </p>
            <footer className="font-mono text-sm font-semibold">
              ~ {testimonial.author}
            </footer>
          </blockquote>
        </div>
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>
      <div className="relative flex min-h-screen lg:min-h-0 lg:h-full flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 lg:py-0 overflow-y-auto">
        <div
          aria-hidden
          className="absolute inset-0 isolate contain-strict -z-10 opacity-60"
        >
          <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)] absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full" />
          <div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 right-0 h-320 w-60 [translate:5%_-50%] rounded-full" />
          <div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 right-0 h-320 w-60 -translate-y-87.5 rounded-full" />
        </div>
        <Button
          variant="ghost"
          className="absolute top-4 left-4 sm:top-7 sm:left-5 z-20"
          asChild
        >
          <Link href={homeLink}>
            <CaretLeftIcon className="size-4 me-2" />
            Home
          </Link>
        </Button>
        <div className="mx-auto w-full max-w-sm space-y-4 lg:max-w-md">
          <div className="flex items-center justify-center gap-2 lg:hidden mb-2">
            <SquaresFourIcon className="size-6" />
            <p className="text-xl font-semibold">{brandName}</p>
          </div>
          <div className="flex flex-col space-y-1 text-center lg:text-left">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-wide">
              {mode === "signin" ? "Welcome Back!" : "Create Your Account"}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {mode === "signin"
                ? `Sign in to your ${brandName} account.`
                : `Join ${brandName} and start exploring.`}
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full"
              onClick={onGoogleAuth}
              disabled={loading}
            >
              <Image
                src="/google.svg"
                alt="Google"
                width={16}
                height={16}
                className="size-4 me-2"
              />
              Continue with Google
            </Button>
            {onAppleAuth && (
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full"
                onClick={onAppleAuth}
                disabled={loading}
              >
                <AppleIcon className="size-4 me-2" />
                Continue with Apple
              </Button>
            )}
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full"
              onClick={onGithubAuth}
              disabled={loading}
            >
              <Image
                src="/github-mark.svg"
                alt="GitHub"
                width={16}
                height={16}
                className="size-4 me-2"
              />
              Continue with GitHub
            </Button>
          </div>

          <AuthSeparator />

          <form ref={formRef} className="space-y-3" onSubmit={handleFormSubmit}>
            {/* Name field (signup only) */}
            {mode === "signup" && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Full Name
                </label>
                <div className="relative">
                  <Input
                    placeholder="John Doe"
                    className="peer ps-9"
                    type="text"
                    name="name"
                    required
                    disabled={loading}
                  />
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                    <UserIcon className="size-4" aria-hidden="true" />
                  </div>
                </div>
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Email Address
              </label>
              <div className="relative">
                <Input
                  placeholder="your.email@example.com"
                  className="peer ps-9"
                  type="email"
                  name="email"
                  required
                  disabled={loading}
                />
                <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                  <AtIcon className="size-4" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Input
                  placeholder="••••••••"
                  className="peer ps-9 pe-9"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  disabled={loading}
                />
                <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                  <LockIcon className="size-4" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 end-0 flex items-center justify-center pe-3 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="size-4" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password field (signup only) */}
            {mode === "signup" && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    placeholder="••••••••"
                    className="peer ps-9 pe-9"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    required
                    disabled={loading}
                  />
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                    <LockIcon className="size-4" aria-hidden="true" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 end-0 flex items-center justify-center pe-3 transition-colors"
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="size-4" aria-hidden="true" />
                    ) : (
                      <EyeIcon className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot Password (signin only) */}
            {mode === "signin" && onResetPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleResetClick}
                  className="text-sm text-primary hover:underline"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              <span>
                {loading
                  ? "Processing..."
                  : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
              </span>
            </Button>
          </form>

          {/* Toggle between Sign In and Sign Up */}
          <div className="text-center text-sm">
            <p className="text-muted-foreground">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/signup"
                    className="text-primary hover:underline font-semibold"
                  >
                    Sign up
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-primary hover:underline font-semibold"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </div>

          <p className="text-muted-foreground mt-4 text-xs text-center">
            By continuing, you agree to our{" "}
            <Link
              href="/terms"
              className="hover:text-primary underline underline-offset-4"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="hover:text-primary underline underline-offset-4"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

function FloatingPaths({ position }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    color: `rgba(15,23,42,${0.1 + i * 0.03})`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full text-slate-950 dark:text-foreground"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + (path.id % 10),
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

const AppleIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const AuthSeparator = () => {
  return (
    <div className="flex w-full items-center justify-center">
      <div className="bg-border h-px w-full" />
      <span className="text-muted-foreground px-2 text-xs">OR</span>
      <div className="bg-border h-px w-full" />
    </div>
  );
};
