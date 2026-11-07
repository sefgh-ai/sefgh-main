"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import LanguageDropdown from "@/components/LanguageDropdown";
import { Scout, SefghGlyph } from "@/components/brand/SefghMark";
import SpinBorder from "./SpinBorder";
import styles from "./landing.module.css";

import { SCOUT_PURPLE } from "./palette";

function initials(user) {
  const name = user?.user_metadata?.full_name;
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return user?.email?.[0]?.toUpperCase() || "U";
}

function LandingNav() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <header className="relative z-20">
      <nav className="mx-auto flex h-[76px] max-w-[1080px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-0">
        <Link
          href="/"
          aria-label={`${t("header.logo")} — home`}
          className={`flex items-center gap-2.5 text-xl font-bold tracking-[-0.03em] ${styles.display} ${styles.focusRing} rounded-md`}
        >
          <SefghGlyph size={28} />
          {t("header.logo")}
        </Link>

        {/* The site-wide DynamicIslandNav is hidden on "/"; page links live in the footer. */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageDropdown />
          {user ? (
            <Link
              href="/profile"
              className={`flex h-10 items-center gap-2 rounded-[var(--l-radius-sm)] border border-[var(--l-line)] px-3 text-sm font-medium ${styles.focusRing}`}
            >
              {user.user_metadata?.avatar_url ? (
                <Image src={user.user_metadata.avatar_url} alt="" width={24} height={24} className="h-6 w-6 rounded-full" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--l-purple)] text-[11px] font-semibold text-[#0d1117]">
                  {initials(user)}
                </span>
              )}
              <span className="hidden sm:inline">{name}</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={`hidden h-10 items-center rounded-[var(--l-radius-sm)] border border-[var(--l-line)] px-4 text-sm font-semibold transition-colors hover:border-[var(--l-muted)] sm:inline-flex ${styles.focusRing}`}
              >
                {t("landing.nav.login")}
              </Link>
              <Link
                href="/signup"
                className={`inline-flex h-10 items-center rounded-[var(--l-radius-sm)] border border-white/10 bg-[var(--l-accent)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--l-accent-hover)] ${styles.focusRing}`}
              >
                {t("landing.nav.signup")}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default function LandingHero() {
  const { t, messages } = useLanguage();
  const router = useRouter();
  const placeholders = messages?.hero?.searchPlaceholders;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!Array.isArray(placeholders) || placeholders.length < 2) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 3000);
    return () => clearInterval(id);
  }, [placeholders]);

  const list = Array.isArray(placeholders) ? placeholders : [];
  const placeholder = list.length ? list[tick % list.length] : "";
  // The first three placeholders double as one-click example searches.
  const examples = list.slice(1, 4).map((q) => q.replace(/\.{3}$|…$/, ""));

  const go = (query) => {
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="relative overflow-hidden">
      <a
        href="#main-content"
        className="sr-only z-50 rounded bg-[var(--l-surface)] px-4 py-2 text-[var(--l-ink)] focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {/* The rain itself is page-wide (Landing.jsx); this only darkens the hero's centre for reading. */}
      <div className={`pointer-events-none absolute inset-0 ${styles.heroShade}`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-[#0d1117] to-transparent" />

      <LandingNav />

      <section id="main-content" className="relative z-10 mx-auto max-w-[1080px] px-4 pb-16 pt-10 text-center sm:px-6 sm:pb-20 sm:pt-16 lg:px-0">
        <span className={`inline-flex items-center gap-2 rounded-full border border-[var(--l-line)] bg-[rgba(56,139,253,0.1)] px-3.5 py-1.5 text-[13px] ${styles.mono}`}>
          <b className="font-semibold text-[var(--l-green)]">{t("landing.badgeNew")}</b>
          {t("landing.badge")}
        </span>

        <h1 className={`mx-auto mb-[18px] mt-6 max-w-[900px] text-[38px] font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-[58px] ${styles.display}`}>
          {t("landing.headlineLead")} <span className={styles.gradientText}>{t("landing.headlineEmphasis")}</span>
        </h1>
        <p className="mx-auto max-w-[600px] text-base leading-relaxed text-[var(--l-muted)] sm:text-[19px]">
          {t("hero.subtitle")}
        </p>

        <div className="relative mx-auto mt-14 max-w-[720px]">
          <Scout
            width={76}
            body={SCOUT_PURPLE}
            title=""
            className="pointer-events-none absolute -top-[37px] right-7 z-10 text-[#9198a1]"
          />
          <SpinBorder radius={12}>
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                go(new FormData(e.currentTarget).get("q") || "");
              }}
              className="relative flex h-14 items-center gap-3 rounded-[var(--l-radius)] bg-[var(--l-surface)] pl-4 pr-2 sm:h-16 sm:pl-[22px]"
            >
              <MagnifyingGlass className="h-5 w-5 shrink-0 text-[var(--l-muted)]" aria-hidden="true" />
              <input
                name="q"
                type="search"
                autoComplete="off"
                aria-label={t("landing.searchLabel")}
                placeholder={placeholder}
                className={`h-full min-w-0 flex-1 bg-transparent text-[15px] text-[var(--l-ink)] outline-none placeholder:text-[var(--l-muted)] sm:text-base ${styles.mono}`}
              />
              <button
                type="submit"
                className={`h-[38px] shrink-0 rounded-[var(--l-radius-sm)] border border-white/10 bg-[var(--l-accent)] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--l-accent-hover)] ${styles.focusRing}`}
              >
                {t("landing.searchButton")}
              </button>
            </form>
          </SpinBorder>
        </div>

        {examples.length > 0 && (
          <div className="mt-[18px] flex flex-wrap justify-center gap-2" aria-label={t("landing.examples")} role="group">
            {examples.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => go(q)}
                className={`rounded-full border border-[var(--l-line)] bg-[rgba(56,139,253,0.1)] px-3.5 py-[7px] text-[13px] transition-colors hover:border-[var(--l-muted)] ${styles.mono} ${styles.focusRing}`}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
