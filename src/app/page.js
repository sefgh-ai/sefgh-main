"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import LanguageDropdown from "@/components/LanguageDropdown";
import { useTheme } from "next-themes";
import {
  Search,
  Sparkles,
  Code,
  Gem,
  Brain,
  Twitter,
  Sun,
  Moon,
  User,
  Home as HomeIcon,
} from "lucide-react";
import SearchComponent from "@/components/ui/animated-glowing-search-bar";
import AppFooter from "@/components/ui/app-footer";
import { AnimatedNavbar } from "@/components/AnimatedNavbar";
import LogoMarquee from "@/components/marketing/LogoMarquee";

// Dynamically import ParticleText with no SSR (canvas needs browser)
const ParticleText = dynamic(
  () => import("@/components/ui/particle-text-canvas"),
  { ssr: false }
);

// Dynamically import Three.js background with no SSR (Three.js needs browser)
const ThreeBackground = dynamic(
  () => import("@/components/3d/ThreeBackground"),
  { ssr: false }
);

export default function Home() {
  const router = useRouter();
  const { t, messages, locale, changeLanguage, languages } = useLanguage();
  const { user } = useAuth();
  const [searchPlaceholder, setSearchPlaceholder] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [effectsReady, setEffectsReady] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { theme, setTheme } = useTheme();
  const [allowMotion, setAllowMotion] = useState(true);
  const reducedMotionQuery = useRef(null);

  const getUserInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(" ");
      return names
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  const getUserDisplayName = () => {
    return (
      user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"
    );
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      reducedMotionQuery.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );
      const onChange = () =>
        setAllowMotion(!reducedMotionQuery.current.matches);
      onChange();
      reducedMotionQuery.current.addEventListener?.("change", onChange);
      return () =>
        reducedMotionQuery.current?.removeEventListener?.("change", onChange);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  // Defer heavy visual effects until after paint/idle to improve first render
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const enableFx = () => setEffectsReady(true);
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(enableFx, { timeout: 1500 });
      return () => window.cancelIdleCallback?.(idleId);
    }
    const timeoutId = setTimeout(enableFx, 1200);
    return () => clearTimeout(timeoutId);
  }, [mounted]);

  // Rotate search placeholders
  useEffect(() => {
    if (!messages) return;
    const interval = setInterval(() => {
      setSearchPlaceholder(
        (prev) => (prev + 1) % messages.hero.searchPlaceholders.length
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [messages]);

  if (!messages || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-blue-400">Loading...</div>
      </div>
    );
  }

  const shouldRenderFx = mounted && allowMotion && effectsReady && isDesktop;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Skip to content for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-black/80 text-white px-4 py-2 rounded"
      >
        Skip to content
      </a>
      {/* Three.js 3D Background */}
      {shouldRenderFx && <ThreeBackground />}

      {/* Top Bar - Logo and Actions */}
      <header className="relative z-10 bg-transparent">
        <div className="w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3 flex-shrink-0"
          >
            {shouldRenderFx && <ParticleText text={t("header.logo")} />}
            <span className="hidden sm:inline-block px-2.5 py-1 glass-premium rounded-md text-blue-400/80 text-xs font-medium border border-blue-500/20">
              v2.8.5
            </span>
          </Link>

          {/* Animated Navbar - Hidden on mobile, centered on desktop */}
          <div className="hidden md:flex flex-1 justify-center max-w-5xl mx-auto">
            {mounted && <AnimatedNavbar />}
          </div>

          <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
            {/* Language Selector (Dropdown) */}
            <LanguageDropdown />

            {/* Show Profile or Sign Up based on auth status */}
            {user ? (
              <button
                onClick={() => router.push("/profile")}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 glass-premium text-white rounded-md transition-colors hover:shadow-glow-blue"
              >
                {user?.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt={getUserDisplayName()}
                    width={24}
                    height={24}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-blue-600 to-teal-600 flex items-center justify-center text-white text-xs font-semibold">
                    {getUserInitials()}
                  </div>
                )}
                <span className="hidden sm:inline font-medium">
                  {getUserDisplayName()}
                </span>
              </button>
            ) : (
              <button
                onClick={() => router.push("/signup")}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm sm:text-base font-medium rounded-md transition-all shadow-glow-blue"
              >
                Sign up
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        id="main-content"
        className="relative px-3 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16 sm:pb-32"
      >
        <div className="max-w-6xl mx-auto text-center">
          {/* Search Box */}
          <div className="max-w-3xl mx-auto mb-8 sm:mb-12 px-2 sm:px-0">
            <SearchComponent
              placeholder={messages.hero.searchPlaceholders[searchPlaceholder]}
              onSearch={(query) =>
                router.push(`/search?q=${encodeURIComponent(query)}`)
              }
            />
          </div>
          {/* Action Buttons - Conditional based on auth status */}
          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center items-center px-2">
            {!user ? (
              /* Not logged in: Show large centered signup button */
              <button
                onClick={() => router.push("/signup")}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-base sm:text-lg font-semibold rounded-lg transition-all shadow-glow-blue hover:shadow-premium-lg transform hover:scale-105"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 inline-block mr-2" />
                Get Started Free
              </button>
            ) : (
              /* Logged in: Show Home and Explore Search buttons */
              <>
                <button
                  onClick={() => router.push("/home")}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 glass-premium text-white font-medium rounded-md transition-all hover:shadow-glow-blue"
                >
                  <HomeIcon className="w-4 h-4 inline-block mr-2" />
                  Home
                </button>
                <button
                  onClick={() => router.push("/search")}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 glass-premium text-white font-medium rounded-md transition-all hover:shadow-glow-blue"
                >
                  <Search className="w-4 h-4 inline-block mr-2" />
                  Explore Search
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Logo Marquee - Trusted Companies */}
      <LogoMarquee />

      {/* CTA Section */}
      <section className="relative px-3 sm:px-6 lg:px-8 py-16 sm:py-32 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            {t("cta.title")}
          </h2>
          <p className="text-base sm:text-xl text-slate-400 mb-6 sm:mb-10 px-2">
            {t("cta.subtitle")}
          </p>
          {!user && (
            <button
              onClick={() => router.push("/signup")}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-base sm:text-lg font-semibold rounded-lg transition-all shadow-glow-blue hover:shadow-premium-lg"
            >
              Sign up free
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <AppFooter />
    </main>
  );
}
