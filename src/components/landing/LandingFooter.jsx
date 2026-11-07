"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUp, GithubLogo, InstagramLogo, MagnifyingGlass, XLogo } from "@phosphor-icons/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { CookieSettingsButton } from "@/components/CookieBar";
import { Scout } from "@/components/brand/SefghMark";
import SpinBorder from "./SpinBorder";
import useMagnetic from "./useMagnetic";
import { SCOUT_PURPLE } from "./palette";
import styles from "./landing.module.css";

// The landing page's own footer (LANDING-001), inspired by a "cinematic"
// footer: aurora glow, faint grid, giant outlined wordmark, tilted marquee,
// magnetic glass pills. Other pages keep AppFooter.

const LINKS = [
  ["Trending", "/trending"],
  ["Docs", "/docs"],
  ["API reference", "/api-reference"],
  ["Pricing", "/pricing"],
  ["Downloads", "/download"],
  ["Blog", "/blog"],
  ["About", "/about"],
  ["Careers", "/careers"],
  ["Contact", "/contact"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
];

const SOCIAL = [
  { label: "GitHub", href: "https://github.com/sefgh-ai", Icon: GithubLogo },
  { label: "X (Twitter)", href: "https://twitter.com/sefghai", Icon: XLogo },
  { label: "Instagram", href: "https://instagram.com/sefgh", Icon: InstagramLogo },
];

function Pill({ href, external, className = "", children, ...rest }) {
  const ref = useMagnetic();
  const cls = `${styles.pill} ${styles.focusRing} ${className}`;
  if (external) {
    return (
      <a ref={ref} href={href} target="_blank" rel="noopener noreferrer" className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link ref={ref} href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

function BackToTop({ label }) {
  const ref = useMagnetic();
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      // The page scrolls inside PageWrapper, not the window, so bring the
      // landing page's top into view instead of calling window.scrollTo.
      onClick={(e) =>
        e.currentTarget.closest("main")?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        })
      }
      className={`${styles.pill} ${styles.focusRing} p-3`}
    >
      <ArrowUp className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  );
}

function Insider() {
  const { t } = useLanguage();
  return (
    <SpinBorder radius={18}>
      <div className="relative grid items-center gap-8 rounded-[18px] bg-[var(--l-surface)] p-7 sm:p-10 lg:grid-cols-[1fr_420px] lg:gap-12 lg:px-12 lg:py-11">
        <div>
          <p className={`text-[13px] uppercase tracking-[0.06em] text-[var(--l-green)] ${styles.mono}`}>{t("landing.footer.newsletter")}</p>
          <h2 className={`mb-3 mt-3 text-[28px] font-bold leading-tight tracking-[-0.035em] sm:text-4xl ${styles.display}`}>
            {t("landing.footer.insiderLead")} <span className={styles.gradientText}>{t("landing.footer.insiderEmphasis")}</span>
          </h2>
          <p className="max-w-[440px] text-base leading-relaxed text-[var(--l-muted)]">{t("landing.footer.insiderBody")}</p>
        </div>
        {/* R-002 (owner, 2026-10-28): the subscribe control stays visible but is not wired up yet. */}
        <div className="flex flex-col gap-3">
          <label htmlFor="insider-email" className={`text-[13px] text-[var(--l-muted)] ${styles.mono}`}>
            {t("landing.footer.email")} <span className="text-[var(--l-green)]">*</span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="insider-email"
              type="email"
              placeholder="you@company.com"
              className={`h-11 min-w-0 flex-1 rounded-[var(--l-radius-sm)] border border-[var(--l-line)] bg-[var(--l-bg)] px-3.5 text-sm text-[var(--l-ink)] outline-none placeholder:text-[var(--l-muted)] focus:border-[var(--l-blue)] ${styles.mono}`}
            />
            <button
              type="button"
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-[var(--l-radius-sm)] border border-white/10 bg-[var(--l-accent)] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--l-accent-hover)] ${styles.focusRing}`}
            >
              {t("landing.footer.subscribe")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--l-muted)]">
            <input id="insider-consent" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--l-accent)]" />
            <label htmlFor="insider-consent">
              {t("landing.footer.consent")}{" "}
              <Link href="/privacy" className="text-[var(--l-blue)] hover:underline">
                {t("landing.footer.privacyStatement")}
              </Link>
              .
            </label>
          </div>
        </div>
      </div>
    </SpinBorder>
  );
}

export default function LandingFooter() {
  const { t, messages } = useLanguage();
  const { user } = useAuth();
  const marquee = messages?.landing?.footer?.marquee ?? [];
  const items = [...marquee, ...marquee, ...marquee, ...marquee];

  return (
    // No border and the page's own ground: the rain collapses where the footer
    // starts, so the page flows into it without a dividing line.
    <footer className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(1,4,9,0.6)] to-[var(--l-bg-deep)]"
        aria-hidden="true"
      />
      <div className={styles.aurora} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />
      <div className={`${styles.giant} ${styles.display}`} aria-hidden="true">SEFGH</div>

      <div className="relative z-10 mx-auto max-w-[1080px] px-4 pt-4 sm:px-6 sm:pt-6 lg:px-0">
        <Insider />
      </div>

      <div className={`relative z-10 -mx-16 mt-12 overflow-hidden py-4 ${styles.band}`} aria-hidden="true">
        <div className={`${styles.track} text-[13px] uppercase tracking-[0.28em] text-[var(--l-muted)] ${styles.mono}`}>
          {items.map((item, i) => (
            <span key={i} className="flex items-center">
              <span className="px-[22px]">{item}</span>
              <span className={i % 2 ? "text-[var(--l-purple)]" : "text-[var(--l-green)]"}>✦</span>
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1080px] px-4 pt-14 text-center sm:px-6 sm:pt-16 lg:px-0">
        <p className={`text-5xl font-bold leading-none tracking-[-0.06em] sm:text-7xl lg:text-[88px] ${styles.display} ${styles.metallic}`}>
          {t("landing.footer.title")}
        </p>
        <div className="mt-11 flex flex-wrap justify-center gap-3.5">
          <Pill href="/search" className={`${styles.pillGo} px-8 py-[18px] text-base font-semibold`}>
            <MagnifyingGlass className="h-5 w-5" aria-hidden="true" /> {t("landing.footer.start")}
          </Pill>
          {!user && (
            <Pill href="/login" className="px-8 py-[18px] text-base font-semibold text-[var(--l-ink)]">
              <GithubLogo className="h-5 w-5" aria-hidden="true" /> {t("landing.footer.github")}
            </Pill>
          )}
        </div>
        <nav aria-label="Footer" className="mx-auto mt-7 flex max-w-[860px] flex-wrap justify-center gap-3">
          {LINKS.map(([label, href]) => (
            <Pill key={href} href={href} className="px-[22px] py-3 text-sm">
              {label}
            </Pill>
          ))}
          <Pill href="https://status.sefgh.org" external className="px-[22px] py-3 text-sm">
            Status
          </Pill>
          <CookieSettingsButton className={`${styles.pill} ${styles.focusRing} px-[22px] py-3 text-sm`} />
        </nav>
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1080px] flex-col items-center gap-6 px-4 pb-8 pt-20 sm:px-6 md:flex-row md:justify-between md:pt-24 lg:px-0">
        <span className={`order-2 text-xs uppercase tracking-[0.14em] text-[var(--l-muted)] md:order-1 ${styles.mono}`}>
          © {new Date().getFullYear()} SEFGH · {t("landing.footer.rights")}
        </span>
        <span className={`${styles.pill} order-1 cursor-default py-2 pl-3.5 pr-[18px] md:order-2`}>
          <Scout width={44} body={SCOUT_PURPLE} title="" className="text-[#9198a1]" />
          <span className={`text-xs uppercase tracking-[0.12em] ${styles.mono}`}>
            {t("landing.footer.dugUpBy")} <b className="text-[var(--l-ink)]">Scout</b>
          </span>
        </span>
        <div className="order-3 flex items-center gap-2.5">
          {SOCIAL.map(({ label, href, Icon }) => (
            <Pill key={href} href={href} external aria-label={label} className="p-3">
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </Pill>
          ))}
          <Pill href="https://huggingface.co/sefgh" external aria-label="Hugging Face" className="p-3">
            <Image src="/hf-logo.svg" alt="" width={18} height={18} className="h-[18px] w-[18px]" />
          </Pill>
          <BackToTop label={t("landing.footer.backToTop")} />
        </div>
      </div>
    </footer>
  );
}
