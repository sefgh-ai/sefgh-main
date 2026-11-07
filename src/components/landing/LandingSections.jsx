"use client";

import Link from "next/link";
import { ArrowRight, BookmarkSimple, Fire, ChatCircleDots, Star } from "@phosphor-icons/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Scout } from "@/components/brand/SefghMark";
import { SCOUT_PURPLE } from "./palette";
import styles from "./landing.module.css";

// Illustration only: a static example of what a result list looks like.
const EXAMPLE_RESULTS = [
  { name: "bevyengine/bevy", about: "A refreshingly simple data-driven game engine built in Rust", lang: "Rust", color: "#dea584", stars: "38.1k" },
  { name: "gfx-rs/wgpu", about: "Cross-platform, safe, pure-Rust graphics API", lang: "Rust", color: "#dea584", stars: "13.2k" },
];

const LANGUAGES = [
  ["Rust", "#dea584"],
  ["TypeScript", "#3178c6"],
  ["Python", "#3572a5"],
  ["Go", "#00add8"],
  ["Swift", "#f05138"],
  ["C++", "#f34b7d"],
];

const card = "rounded-[var(--l-radius)] border border-[var(--l-line)] bg-[var(--l-surface)] p-6 sm:p-7";
const iconTile = "grid h-11 w-11 place-items-center rounded-[var(--l-radius-sm)] bg-[rgba(56,139,253,0.1)] text-[var(--l-green)]";

function Eyebrow({ children }) {
  return <p className={`text-[13px] uppercase tracking-[0.06em] text-[var(--l-green)] ${styles.mono}`}>{children}</p>;
}

export function LandingFeatures() {
  const { t } = useLanguage();
  return (
    <section className="mx-auto max-w-[1080px] px-4 py-12 sm:px-6 sm:py-16 lg:px-0">
      <div className={`mb-10 w-fit ${styles.readable}`}>
        <Eyebrow>{t("landing.features.eyebrow")}</Eyebrow>
        <h2 className={`mt-3.5 text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl ${styles.display}`}>
          {t("landing.features.titleLead")} <span className={styles.gradientText}>{t("landing.features.titleEmphasis")}</span>
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-[1.35fr_1fr]">
        <div className={`${card} flex flex-col gap-3.5 md:row-span-2`}>
          <div className={iconTile}><ChatCircleDots className="h-5 w-5" aria-hidden="true" /></div>
          <h3 className={`text-lg font-bold tracking-[-0.02em] ${styles.display}`}>{t("landing.features.askTitle")}</h3>
          <p className="text-[15px] leading-relaxed text-[var(--l-muted)]">{t("landing.features.askBody")}</p>
          <div className="mt-auto overflow-hidden rounded-[var(--l-radius-sm)] border border-[var(--l-line)] bg-[var(--l-bg-deep)]" aria-hidden="true">
            <div className={`border-b border-[var(--l-line)] px-4 py-3.5 text-[13px] ${styles.mono}`}>
              <span className="text-[var(--l-green)]">❯</span> {t("landing.features.askQuery")}
            </div>
            {EXAMPLE_RESULTS.map((r, i) => (
              <div key={r.name} className={`flex flex-col gap-1.5 px-[18px] py-4 ${i ? "border-t border-[var(--l-line)]" : ""}`}>
                <span className={`text-[15px] font-semibold text-[var(--l-blue)] ${styles.mono}`}>{r.name}</span>
                <span className="text-sm text-[var(--l-muted)]">{r.about}</span>
                <span className={`flex items-center gap-4 text-xs text-[var(--l-muted)] ${styles.mono}`}>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />{r.lang}</span>
                  <span className="flex items-center gap-1"><Star className="h-3 w-3" weight="fill" />{r.stars}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <Link href="/trending" className={`${card} block transition-colors hover:border-[var(--l-muted)] ${styles.focusRing}`}>
          <div className={iconTile}><Fire className="h-5 w-5" aria-hidden="true" /></div>
          <h3 className={`mb-2 mt-4 text-lg font-bold tracking-[-0.02em] ${styles.display}`}>{t("landing.features.trendingTitle")}</h3>
          <p className="text-[15px] leading-relaxed text-[var(--l-muted)]">{t("landing.features.trendingBody")}</p>
        </Link>

        <Link href="/starred" className={`${card} block transition-colors hover:border-[var(--l-muted)] ${styles.focusRing}`}>
          <div className={iconTile}><BookmarkSimple className="h-5 w-5" aria-hidden="true" /></div>
          <h3 className={`mb-2 mt-4 text-lg font-bold tracking-[-0.02em] ${styles.display}`}>{t("landing.features.saveTitle")}</h3>
          <p className="text-[15px] leading-relaxed text-[var(--l-muted)]">{t("landing.features.saveBody")}</p>
        </Link>

        <div className={`${card} flex flex-col gap-5 md:col-span-2 md:flex-row md:items-center md:justify-between md:py-[22px]`}>
          <div>
            <h3 className={`text-lg font-bold tracking-[-0.02em] ${styles.display}`}>{t("landing.features.languagesTitle")}</h3>
            <p className="mt-1.5 text-[15px] text-[var(--l-muted)]">{t("landing.features.languagesBody")}</p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {LANGUAGES.map(([lang, color]) => (
              <li key={lang}>
                <Link
                  href={`/search?q=${encodeURIComponent(`popular ${lang} projects`)}`}
                  className={`flex items-center gap-1.5 rounded-full border border-[var(--l-line)] bg-[rgba(56,139,253,0.1)] px-3.5 py-[7px] text-[13px] transition-colors hover:border-[var(--l-muted)] ${styles.mono} ${styles.focusRing}`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
                  {lang}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function LandingCta() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const primary = user
    ? { href: "/search", label: t("landing.cta.start") }
    : { href: "/signup", label: t("landing.cta.getStarted") };

  return (
    // Extra bottom padding leaves room for the rain to fade and collapse before the footer.
    <section className="mx-auto grid max-w-[1080px] items-center gap-12 px-4 pb-24 pt-8 sm:px-6 lg:grid-cols-[1fr_560px] lg:gap-14 lg:px-0">
      <div className={styles.readable}>
        <h2 className={`text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl ${styles.display}`}>
          {t("landing.cta.titleLead")} <span className={styles.gradientText}>{t("landing.cta.titleEmphasis")}</span>
        </h2>
        <p className="mb-7 mt-3 text-[17px] text-[var(--l-muted)]">{t("landing.cta.subtitle")}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={primary.href}
            className={`inline-flex h-[52px] items-center gap-2 rounded-[var(--l-radius-sm)] border border-white/10 bg-[var(--l-accent)] px-[26px] font-semibold text-white transition-colors hover:bg-[var(--l-accent-hover)] ${styles.focusRing}`}
          >
            {primary.label} <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
          </Link>
          <Link
            href="/docs"
            className={`inline-flex h-[52px] items-center rounded-[var(--l-radius-sm)] border border-[var(--l-line)] bg-white/[0.02] px-[26px] font-semibold transition-colors hover:border-[var(--l-muted)] ${styles.focusRing}`}
          >
            {t("landing.cta.docs")}
          </Link>
        </div>
      </div>

      <div className="relative" aria-hidden="true">
        <Scout width={84} body={SCOUT_PURPLE} title="" className="absolute -top-10 right-6 z-10 text-[#9198a1]" />
        <div className="overflow-hidden rounded-[var(--l-radius)] border border-[var(--l-line)] bg-[var(--l-bg-deep)]">
          <div className={`flex h-10 items-center gap-2 border-b border-[var(--l-line)] bg-[var(--l-surface)] px-4 text-xs text-[var(--l-muted)] ${styles.mono}`}>
            <i className="h-[11px] w-[11px] rounded-full bg-[#30363d]" />
            <i className="h-[11px] w-[11px] rounded-full bg-[#30363d]" />
            <i className="h-[11px] w-[11px] rounded-full bg-[#30363d]" />
            <span className="ml-2.5">sefgh</span>
          </div>
          <div className={`px-6 py-[26px] text-[15px] leading-[1.9] sm:text-base ${styles.mono}`}>
            <div className="text-[var(--l-muted)]">{t("landing.cta.comment")}</div>
            <div>
              <span className="text-[var(--l-green)]">❯</span> <span className="text-[var(--l-purple)]">find</span> &quot;{t("landing.cta.query")}&quot;
              <span className={styles.cursor} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
