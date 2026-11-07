"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { BookOpenIcon, ClockIcon, PlusIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { Scout } from "@/components/brand/SefghMark";
import { useStoredChoice } from "@/hooks/home/useStoredChoice";
import { getRecentRepos } from "@/lib/home/recentRepos";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { SCOUT_PURPLE } from "@/components/landing/palette";
import styles from "./home.module.css";

const TOPIC_GOAL = 5;

const ago = (iso) => formatRelativeTime(iso).toLowerCase();

// Recently opened repositories live in localStorage; read them through an
// external store so the server render (empty) and the client agree.
const emptyRepos = [];
let cachedRaw = null;
let cachedRepos = emptyRepos;
function reposSnapshot() {
  let raw = null;
  try {
    raw = window.localStorage.getItem("sefgh.recentRepos");
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedRepos = getRecentRepos();
  }
  return cachedRepos;
}
function subscribeRepos(onChange) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function Stat({ value, label, accent }) {
  return (
    <div>
      <b className={`block text-xl font-bold leading-none ${styles.display} ${accent ? "text-[var(--l-green)]" : ""}`}>
        {value ?? "—"}
      </b>
      <span className={`text-xs text-[var(--l-muted)] ${styles.mono}`}>{label}</span>
    </div>
  );
}

function Switch({ side, onChange }) {
  const btn = (key, label, Icon) => (
    <button
      type="button"
      role="tab"
      aria-selected={side === key}
      aria-label={label}
      title={label}
      onClick={() => onChange(key)}
      className={`${styles.segBtn} ${side === key ? styles.segOn : ""} ${styles.focusRing}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
  return (
    <span className={styles.seg} role="tablist" aria-label="Choose panel">
      {btn("continue", "Continue where you left off", ClockIcon)}
      {btn("sharpen", "Sharpen your feed", SlidersHorizontalIcon)}
    </span>
  );
}

function ContinuePanel({ repos, searches, side, onSide }) {
  const items = [
    ...repos.slice(0, 3).map((r) => ({ kind: "repo", label: r.name, href: `/repo/${r.name}`, meta: `opened ${ago(r.at)}`, at: r.at })),
    ...searches.map((s) => ({
      kind: "search",
      label: s.query,
      href: `/search?q=${encodeURIComponent(s.query)}`,
      meta: ago(s.created_at),
      at: s.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 3);

  return (
    <div className={`${styles.card} p-[18px]`}>
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className={styles.eyebrow}>Continue where you left off</span>
        <Link href="/history" className={`ml-auto text-xs text-[var(--l-blue)] hover:underline ${styles.mono}`}>
          History →
        </Link>
        <Switch side={side} onChange={onSide} />
      </div>
      {items.length === 0 ? (
        <p className="py-3 text-sm text-[var(--l-muted)]">Nothing yet. Open a repository or run a search and it will show up here.</p>
      ) : (
        <ul>
          {items.map((it, i) => (
            <li key={`${it.kind}-${it.label}`} className={i ? "border-t border-[var(--l-line)]" : ""}>
              <Link href={it.href} className={`flex items-center gap-3 rounded py-2.5 ${styles.focusRing}`}>
                <span className={`grid w-[18px] place-items-center ${it.kind === "repo" ? "text-[var(--l-blue)]" : "text-[var(--l-green)]"}`} aria-hidden="true">
                  {it.kind === "repo" ? <BookOpenIcon className="h-4 w-4" /> : <span className={styles.mono}>❯</span>}
                </span>
                <span className={`min-w-0 flex-1 truncate text-sm ${styles.mono} ${it.kind === "repo" ? "font-semibold text-[var(--l-blue)]" : ""}`}>
                  {it.label}
                </span>
                <span className={`shrink-0 text-xs text-[var(--l-muted)] ${styles.mono}`}>{it.meta}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SharpenPanel({ topicCount, side, onSide, onAddTopics }) {
  const pct = Math.min(100, Math.round((topicCount / TOPIC_GOAL) * 100));
  const remaining = Math.max(0, TOPIC_GOAL - topicCount);
  return (
    <div className={`${styles.card} px-5 py-[18px]`}>
      <div className="mb-1.5 flex items-center">
        <span className={styles.eyebrow}>Sharpen your feed</span>
        <span className="ml-auto">
          <Switch side={side} onChange={onSide} />
        </span>
      </div>
      <div className="flex items-center gap-[18px]">
        <Scout width={84} body={SCOUT_PURPLE} title="" className="hidden shrink-0 text-[#9198a1] sm:block" />
        <div className="flex-1">
          <p className="mb-3 text-sm text-[var(--l-muted)]">
            {remaining > 0
              ? `You follow ${topicCount} ${topicCount === 1 ? "topic" : "topics"}. Add ${remaining} more and Scout can dig up better matches.`
              : `You follow ${topicCount} topics. Your feed is tuned; adjust it any time.`}
          </p>
          <div className="flex items-center gap-2">
            <div className={`${styles.bar} flex-1`}>
              <i style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs text-[var(--l-muted)] ${styles.mono}`}>
              {Math.min(topicCount, TOPIC_GOAL)} / {TOPIC_GOAL}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onAddTopics}
              className={`inline-flex h-[34px] items-center gap-1.5 rounded-[var(--l-radius-sm)] bg-[var(--l-accent)] px-3.5 text-[13px] font-semibold text-white hover:bg-[var(--l-accent-hover)] ${styles.focusRing}`}
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" /> {remaining > 0 ? "Add topics" : "Edit topics"}
            </button>
            <button
              type="button"
              onClick={() => onSide("continue")}
              className={`inline-flex h-[34px] items-center rounded-[var(--l-radius-sm)] border border-[var(--l-line)] px-3.5 text-[13px] font-semibold hover:border-[var(--l-muted)] ${styles.focusRing}`}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * "Welcome back" with three numbers for the week, and one card that switches
 * between "Continue where you left off" and "Sharpen your feed" (HOME-001).
 * Default: Sharpen until this browser has opened a repository, then Continue.
 * A manual flip is remembered in this browser and wins over the default.
 */
export default function HomeWelcome({ user, activity, topicCount, onAddTopics }) {
  const repos = useSyncExternalStore(subscribeRepos, reposSnapshot, () => emptyRepos);
  const [stored, setStored] = useStoredChoice("sefgh.homePanel");
  const side = stored === "continue" || stored === "sharpen" ? stored : repos.length > 0 ? "continue" : "sharpen";

  const first = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0];

  return (
    <section className="grid items-center gap-6 px-4 pb-2 pt-7 sm:px-8 xl:grid-cols-[1fr_520px] xl:gap-10">
      <div>
        <h1 className={`text-[26px] font-bold leading-tight tracking-[-0.035em] sm:text-[30px] ${styles.display}`}>
          {first ? (
            <>
              Welcome back, <span className={styles.gradientText}>{first}.</span>
            </>
          ) : (
            <>
              Discover <span className={styles.gradientText}>projects.</span>
            </>
          )}
        </h1>
        <p className="mt-2 text-[15px] text-[var(--l-muted)]">Here is what moved in your topics this week.</p>
        <div className="mt-5 flex gap-10">
          <Stat value={activity.newThisWeek} label="new this week" accent />
          {user && <Stat value={activity.starred} label="starred" />}
          {user && <Stat value={activity.searchTotal} label="searches" />}
        </div>
      </div>
      {side === "continue" ? (
        <ContinuePanel repos={repos} searches={activity.recentSearches} side={side} onSide={setStored} />
      ) : (
        <SharpenPanel topicCount={topicCount} side={side} onSide={setStored} onAddTopics={onAddTopics} />
      )}
    </section>
  );
}
