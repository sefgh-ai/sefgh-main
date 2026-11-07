"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CaretUpIcon,
  CircleNotchIcon,
  MedalIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { MobileBottomNav } from "@/components/search/MobileBottomNav";
import { Scout } from "@/components/brand/SefghMark";
import HomeShell from "@/components/home/HomeShell";
import { SCOUT_PURPLE } from "@/components/landing/palette";
import { useStoredChoice } from "@/hooks/home/useStoredChoice";
import { useTrendingData } from "@/hooks/trending/useTrendingData";
import { SPOKEN_LANGUAGES, SORT_OPTIONS, sortRepositories } from "@/lib/utils/trending/trendingHelpers";
import { popularRepositoryPath } from "@/lib/utils/trending/feedback";
import { formatCompactNumber, formatNumber, formatRelativeTime } from "@/lib/utils/formatters";
import { editorsChoice } from "@/data/editorsChoice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import styles from "@/components/home/home.module.css";

const PERIODS = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
];
const FALLBACK_LANGUAGES = ["any", "javascript", "python", "java", "typescript", "go", "rust", "c++", "c#", "php", "ruby", "swift", "kotlin"];
const cap = (s) => (s === "any" ? "Any" : s.charAt(0).toUpperCase() + s.slice(1));
const TOPIC_COLORS = ["#a371f7", "#58a6ff", "#3fb950", "#ffa657"];

// The programming-language list, as the old page loaded it.
function useProgrammingLanguages() {
  const [list, setList] = useState(FALLBACK_LANGUAGES);
  useEffect(() => {
    let alive = true;
    fetch("/api/github/languages")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && Array.isArray(d) && setList(["any", ...d]))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return list;
}

function Segmented({ options, value, onChange, label }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`${styles.tab} ${value === o.value ? styles.tabOn : ""} ${styles.focusRing}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Chip({ label, value, options, onChange }) {
  const current = options.find((o) => o.value === value);
  const active = value !== options[0]?.value;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex h-[34px] items-center gap-1.5 rounded-[var(--l-radius-sm)] border px-3 text-[13px] ${styles.mono} ${styles.focusRing} ${
          active
            ? "border-[rgba(88,166,255,0.5)] bg-[rgba(56,139,253,0.1)] text-[var(--l-ink)]"
            : "border-[var(--l-line)] bg-[var(--l-surface)] text-[var(--l-muted)] hover:text-[var(--l-ink)]"
        }`}
      >
        {label}: {current?.label}
        <CaretDownIcon className="h-3 w-3" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="dark max-h-72 overflow-y-auto">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** E2, collapsible to E3: the spotlight pick with Scout, or a slim strip. */
function EditorsChoice({ items }) {
  const [stored, setStored] = useStoredChoice("sefgh.trendingEditors");
  const open = stored !== "closed";
  if (!items?.length) return null;
  const [first, ...rest] = items;
  const toggle = (
    <button
      type="button"
      onClick={() => setStored(open ? "closed" : "open")}
      aria-expanded={open}
      aria-label={open ? "Collapse Editors' Choice" : "Expand Editors' Choice"}
      title={open ? "Collapse" : "Expand"}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-[var(--l-radius-sm)] border border-[var(--l-line)] text-[var(--l-muted)] hover:text-[var(--l-ink)] ${styles.focusRing}`}
    >
      {open ? <CaretUpIcon className="h-4 w-4" /> : <CaretDownIcon className="h-4 w-4" />}
    </button>
  );
  const href = (r) => `/repo/${r.author}/${r.name}`;
  const meta = (r) => (
    <span className={`flex items-center gap-3 text-xs text-[var(--l-muted)] ${styles.mono}`}>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: r.languageColor }} aria-hidden="true" />
        {r.language}
      </span>
      <span className="flex items-center gap-1"><StarIcon className="h-3 w-3" aria-hidden="true" />{formatCompactNumber(r.stars)}</span>
    </span>
  );

  return (
    <section aria-labelledby="editors-choice" className="mb-3.5">
      <div className={`flex items-center gap-3 ${open ? "mb-2.5" : ""}`}>
        <h2 id="editors-choice" className={`flex shrink-0 items-center gap-2 ${styles.eyebrow}`}>
          <MedalIcon className="h-3.5 w-3.5" aria-hidden="true" /> Editors&apos; Choice
        </h2>
        {open ? (
          <span className="ml-auto">{toggle}</span>
        ) : (
          <>
            <ul className="flex min-w-0 flex-1 gap-2.5 overflow-x-auto [scrollbar-width:none]">
              {items.map((r) => (
                <li key={r.id} className="shrink-0">
                  <Link href={href(r)} className={`${styles.card} flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--l-blue)] hover:border-[var(--l-muted)] ${styles.mono} ${styles.focusRing}`}>
                    <span className="h-2 w-2 rounded-full" style={{ background: r.languageColor }} aria-hidden="true" />
                    {r.author}/{r.name}
                  </Link>
                </li>
              ))}
            </ul>
            {toggle}
          </>
        )}
      </div>
      {open && (
        <div className="grid gap-3 md:grid-cols-[1.6fr_1fr]">
          <div className={`${styles.card} relative overflow-hidden px-5 py-4`}>
            <div className="relative pr-0 sm:pr-24">
              <div className="flex flex-wrap items-baseline gap-3">
                <Link href={href(first)} className={`text-lg font-bold text-[var(--l-blue)] hover:underline ${styles.display} ${styles.focusRing}`}>
                  {first.author}/{first.name}
                </Link>
                {meta(first)}
              </div>
              {first.highlight && (
                <p className="my-2 border-l-2 border-[var(--l-green)] pl-2.5 text-[13px] text-[var(--l-ink)]">“{first.highlight}”</p>
              )}
              <Link
                href={href(first)}
                className={`mt-1 inline-flex h-[34px] items-center rounded-[var(--l-radius-sm)] bg-[var(--l-accent)] px-3.5 text-[13px] font-semibold text-white hover:bg-[var(--l-accent-hover)] ${styles.focusRing}`}
              >
                View repository
              </Link>
            </div>
            <Scout width={64} body={SCOUT_PURPLE} title="" className="pointer-events-none absolute bottom-3.5 right-5 hidden text-[#9198a1] sm:block" />
          </div>
          <ul className="flex flex-col gap-3">
            {rest.slice(0, 2).map((r) => (
              <li key={r.id} className="flex-1">
                <Link href={href(r)} className={`${styles.card} flex h-full items-center gap-2.5 px-3.5 py-3 hover:border-[var(--l-muted)] ${styles.focusRing}`}>
                  <span className={`min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--l-blue)] ${styles.mono}`}>{r.author}/{r.name}</span>
                  {meta(r)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const GRID = "md:grid-cols-[40px_minmax(0,2.4fr)_minmax(0,1fr)_80px_80px_minmax(0,1.4fr)]";

/** R2: the leaderboard, with a bar for stars gained per day. */
function Leaderboard({ repos }) {
  const max = Math.max(1, ...repos.map((r) => r.starsPerDay || 0));
  return (
    <div className={`${styles.card} overflow-hidden`} role="table" aria-label="Trending repositories">
      <div role="row" className={`hidden gap-3.5 border-b border-[var(--l-line)] bg-[var(--l-bg-deep)] px-[18px] py-3 text-[11px] uppercase tracking-[0.06em] text-[var(--l-muted)] md:grid ${GRID} ${styles.mono}`}>
        <span role="columnheader">#</span>
        <span role="columnheader">Repository</span>
        <span role="columnheader">Language</span>
        <span role="columnheader">Stars</span>
        <span role="columnheader">Forks</span>
        <span role="columnheader">Stars / day</span>
      </div>
      {repos.map((r, i) => (
        <Link
          key={r.id ?? `${r.author}/${r.name}`}
          href={`/repo/${r.author}/${r.name}`}
          role="row"
          className={`${styles.row} grid grid-cols-[32px_1fr_auto] items-center gap-x-3.5 gap-y-1.5 px-[18px] py-3.5 md:gap-y-0 ${GRID} ${i ? "border-t border-[var(--l-line)]" : ""} ${styles.focusRing}`}
        >
          <span className={`text-lg font-bold ${styles.display} ${i < 3 ? "text-[var(--l-green)]" : "text-[var(--l-muted)]"}`}>{i + 1}</span>
          <span className="min-w-0">
            <span className={`block truncate text-sm font-semibold text-[var(--l-blue)] ${styles.mono}`}>{r.author}/{r.name}</span>
            <span className="block truncate text-[13px] text-[var(--l-muted)]">{r.description}</span>
          </span>
          <span className={`flex items-center gap-1.5 text-xs text-[var(--l-muted)] ${styles.mono}`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.languageColor }} aria-hidden="true" />
            <span className="hidden sm:inline">{r.language}</span>
          </span>
          <span className={`hidden text-xs text-[var(--l-muted)] md:block ${styles.mono}`}>{formatCompactNumber(r.stars)}</span>
          <span className={`hidden text-xs text-[var(--l-muted)] md:block ${styles.mono}`}>{formatCompactNumber(r.forks)}</span>
          <span className="col-span-3 flex items-center gap-2.5 md:col-span-1">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#161b22]">
              <i className="block h-full bg-gradient-to-r from-[#26a641] to-[#39d353]" style={{ width: `${Math.round(((r.starsPerDay || 0) / max) * 100)}%` }} />
            </span>
            <span className={`whitespace-nowrap text-xs font-semibold text-[var(--l-green)] ${styles.mono}`}>
              {r.starsPerDay == null ? "—" : `+${formatNumber(Math.round(r.starsPerDay))}`}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/** D2: ranked developer rows. Name and Follow open the GitHub profile (R-222). */
function DeveloperRows({ devs }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {devs.map((d, i) => {
        const repoPath = popularRepositoryPath(d);
        const profile = d.username ? `https://github.com/${d.username}` : null;
        return (
          <li key={d.id ?? d.username ?? i} className={`${styles.card} flex items-center gap-4 px-5 py-4`}>
            <span className={`w-8 shrink-0 text-right text-2xl font-bold ${styles.display} ${i < 3 ? "text-[var(--l-green)]" : "text-[var(--l-muted)]"}`}>{d.rank || i + 1}</span>
            {/^https?:\/\//.test(d.avatar) ? (
              // eslint-disable-next-line @next/next/no-img-element -- GitHub avatars from any host; next/image would need every host configured.
              <img src={d.avatar} alt="" width={42} height={42} className="h-[42px] w-[42px] shrink-0 rounded-full border border-[var(--l-line)]" />
            ) : (
              <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#a371f7] to-[#6e40c9] text-sm font-semibold text-[#0d1117]">
                {d.name?.[0] || "?"}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                {profile ? (
                  <a href={profile} target="_blank" rel="noopener noreferrer" className={`font-bold hover:underline ${styles.display} ${styles.focusRing}`}>
                    {d.name}
                  </a>
                ) : (
                  <span className={`font-bold ${styles.display}`}>{d.name}</span>
                )}
                {d.username && <span className={`text-xs text-[var(--l-muted)] ${styles.mono}`}>@{d.username}</span>}
              </div>
              <p className={`mt-1.5 truncate text-xs text-[var(--l-muted)] ${styles.mono}`}>
                Popular repo ·{" "}
                {repoPath ? (
                  <Link href={repoPath} className="text-[var(--l-blue)] hover:underline">{d.username}/{d.popularRepo.name}</Link>
                ) : (
                  <span>{d.popularRepo?.name}</span>
                )}
              </p>
            </div>
            {profile && (
              <a
                href={profile}
                target="_blank"
                rel="noopener noreferrer"
                className={`hidden h-[34px] shrink-0 items-center rounded-[var(--l-radius-sm)] border border-[var(--l-line)] px-3.5 text-[13px] font-semibold hover:border-[var(--l-muted)] sm:inline-flex ${styles.focusRing}`}
              >
                Follow
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** T2: the last 30 days' new repositories, grouped by their topic. */
function TopicHighlights({ repos }) {
  const groups = useMemo(() => {
    const by = new Map();
    for (const r of repos) {
      const t = r.topic || "Other";
      if (!by.has(t)) by.set(t, []);
      by.get(t).push(r);
    }
    return [...by.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 4);
  }, [repos]);
  if (!groups.length) return null;
  return (
    <section aria-labelledby="topic-highlights" className="mt-9">
      <p className={styles.eyebrow}>New this month</p>
      <h2 id="topic-highlights" className={`mb-1.5 mt-2 text-xl font-bold ${styles.display}`}>Topic highlights</h2>
      <p className={`mb-4 text-xs text-[var(--l-muted)] ${styles.mono}`}>Repositories created in the last 30 days, across all languages.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {groups.map(([topic, list], gi) => (
          <div key={topic} className={`${styles.card} p-4`}>
            <p className={`mb-3 text-xs ${styles.mono}`} style={{ color: TOPIC_COLORS[gi % 4] }}># {topic}</p>
            <ul>
              {list.slice(0, 3).map((r, i) => (
                <li key={r.id ?? `${r.author}/${r.name}`} className={i ? "border-t border-[var(--l-line)]" : ""}>
                  <Link href={`/repo/${r.author}/${r.name}`} className={`block rounded py-2 ${styles.focusRing}`}>
                    <span className={`block truncate text-[13px] font-medium text-[var(--l-blue)] ${styles.mono}`}>{r.author}/{r.name}</span>
                    <span className={`mt-1 flex items-center gap-1 text-xs text-[var(--l-muted)] ${styles.mono}`}>
                      <StarIcon className="h-3 w-3" aria-hidden="true" />{formatCompactNumber(r.stars)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Trending (/trending), redesigned in TRENDING-001 inside the app rail. The
 * data is unchanged: useTrendingData (trending repositories or developers per
 * language, spoken language and period; topic highlights; refresh), the live
 * language list, the old sort options, and the curated editorsChoice file.
 */
export default function TrendingView({ fontClassName = "" }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("repositories");
  const [spoken, setSpoken] = useState("english");
  const [language, setLanguage] = useState("any");
  const [period, setPeriod] = useState("daily");
  const [sortBy, setSortBy] = useState("stars");
  const languages = useProgrammingLanguages();

  const { loading, repositories, developers, isRefreshing, lastRefresh, loadError, handleRefreshTrending, topicRepos } =
    useTrendingData(tab, language, spoken, period);
  const repos = useMemo(() => sortRepositories(repositories, sortBy), [repositories, sortBy]);

  return (
    <div className={`dark min-h-screen shrink-0 ${styles.root} ${fontClassName}`}>
      <HomeShell user={user} showSearch={false} title="Trending">
        <div className="w-full max-w-[1240px] px-4 pb-28 pt-6 sm:px-8 md:pb-12 lg:px-10">
          <EditorsChoice items={editorsChoice} />

          <div className="mb-3.5 flex flex-wrap items-center gap-2.5" role="group" aria-label="Filters">
            <Segmented
              label="Show"
              value={tab}
              onChange={setTab}
              options={[
                { value: "repositories", label: "Repositories" },
                { value: "developers", label: "Developers" },
              ]}
            />
            <Segmented label="Period" value={period} onChange={setPeriod} options={PERIODS} />
            {tab === "repositories" && (
              <>
                <Chip label="Language" value={language} onChange={setLanguage} options={languages.map((l) => ({ value: l, label: cap(l) }))} />
                <Chip label="Spoken" value={spoken} onChange={setSpoken} options={SPOKEN_LANGUAGES.map((l) => ({ value: l, label: cap(l) }))} />
                <Chip label="Sort" value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
              </>
            )}
            <span className="ml-auto flex items-center gap-2.5">
              {lastRefresh && (
                <span className={`hidden text-xs text-[var(--l-muted)] sm:inline ${styles.mono}`}>
                  updated {formatRelativeTime(lastRefresh).toLowerCase()}
                </span>
              )}
              <button
                type="button"
                onClick={handleRefreshTrending}
                disabled={isRefreshing}
                aria-label="Refresh trending"
                title="Refresh"
                className={`grid h-[34px] w-[34px] place-items-center rounded-[var(--l-radius-sm)] border border-[var(--l-line)] text-[var(--l-muted)] hover:text-[var(--l-ink)] disabled:opacity-60 ${styles.focusRing}`}
              >
                {isRefreshing ? <CircleNotchIcon className="h-4 w-4 animate-spin" /> : <ArrowsClockwiseIcon className="h-4 w-4" />}
              </button>
            </span>
          </div>

          {!loading && loadError && (
            <p role="status" className={`${styles.card} mb-3 p-5 text-sm text-[var(--l-muted)]`}>{loadError}</p>
          )}
          {loading ? (
            <div className={`${styles.card} space-y-0 overflow-hidden`} aria-busy="true" aria-label="Loading trending">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`flex items-center gap-4 px-5 py-4 ${i ? "border-t border-[var(--l-line)]" : ""}`}>
                  <div className="h-5 w-6 animate-pulse rounded bg-[#161b22]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/3 animate-pulse rounded bg-[#161b22]" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-[#161b22]" />
                  </div>
                </div>
              ))}
            </div>
          ) : tab === "repositories" && repos.length > 0 ? (
            <Leaderboard repos={repos} />
          ) : tab === "developers" && developers.length > 0 ? (
            <DeveloperRows devs={developers} />
          ) : (
            !loadError && (
              <p role="status" className={`${styles.card} p-8 text-center text-sm text-[var(--l-muted)]`}>
                Nothing trending here right now. Try another period or language, or refresh.
              </p>
            )
          )}

          {tab === "repositories" && <TopicHighlights repos={topicRepos} />}
        </div>
      </HomeShell>
      <MobileBottomNav user={user} />
    </div>
  );
}
