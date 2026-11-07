"use client";

import { CaretLeftIcon, CaretRightIcon, GitForkIcon, ListIcon, RowsIcon, SquaresFourIcon, StarIcon } from "@phosphor-icons/react";
import { formatCompactNumber, formatRelativeTime } from "@/lib/utils/formatters";
import { GITHUB_SEARCH_RESULT_LIMIT, lastSearchPage } from "@/lib/github/search-pages";
import styles from "@/components/home/home.module.css";

const PER_PAGE = 30;

// GitHub's language colours for the common ones; others get the muted dot.
const LANG_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572a5", Java: "#b07219", Go: "#00add8", Rust: "#dea584",
  "C++": "#f34b7d", "C#": "#178600", Ruby: "#701516", PHP: "#4f5d95", Swift: "#f05138", Kotlin: "#a97bff", C: "#555555",
};
const TINTS = ["#a371f7", "#58a6ff", "#3fb950", "#ffa657", "#f778ba"];
function tint(name = "") {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}
const mono2 = (repo) => (repo.name || repo.full_name?.split("/")[1] || "?").slice(0, 2).toUpperCase();
const ago = (iso) => (iso ? formatRelativeTime(iso).toLowerCase() : "—");

export const VIEWS = [
  { value: "rows", label: "Rows", Icon: ListIcon },
  { value: "cards", label: "Cards", Icon: SquaresFourIcon },
  { value: "table", label: "Table", Icon: RowsIcon },
];

export function ViewSwitch({ view, onChange }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Result view">
      {VIEWS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={view === value}
          aria-label={label}
          title={label}
          onClick={() => onChange(value)}
          className={`${styles.tab} flex items-center gap-1.5 ${view === value ? styles.tabOn : ""} ${styles.focusRing}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {view === value && <span className="hidden sm:inline">{label}</span>}
        </button>
      ))}
    </div>
  );
}

function Lang({ repo }) {
  if (!repo.language) return <span>—</span>;
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: LANG_COLORS[repo.language] || "var(--l-muted)" }} aria-hidden="true" />
      {repo.language}
    </span>
  );
}

function Tile({ repo, size = 40 }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-[var(--l-radius-sm)] font-bold text-[#0d1117] ${styles.display}`}
      style={{ width: size, height: size, background: tint(repo.full_name), fontSize: size > 34 ? 13 : 12 }}
      aria-hidden="true"
    >
      {mono2(repo)}
    </span>
  );
}

const meta = `flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--l-muted)] ${styles.mono}`;

function Rows({ repos, onOpen }) {
  return (
    <ul className="flex flex-col gap-3">
      {repos.map((r) => (
        <li key={r.id || r.full_name}>
          <button type="button" onClick={() => onOpen(r)} className={`${styles.card} ${styles.row} flex w-full gap-4 p-[18px] text-left ${styles.focusRing}`}>
            <Tile repo={r} />
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className={`truncate text-[15px] font-semibold text-[var(--l-blue)] ${styles.mono}`}>{r.full_name}</span>
              <span className="text-sm text-[var(--l-muted)]">{r.description || "No description"}</span>
              <span className={meta}>
                <Lang repo={r} />
                <span className="flex items-center gap-1"><StarIcon className="h-3.5 w-3.5" aria-hidden="true" />{formatCompactNumber(r.stargazers_count || 0)}</span>
                <span className="flex items-center gap-1"><GitForkIcon className="h-3.5 w-3.5" aria-hidden="true" />{formatCompactNumber(r.forks_count || 0)}</span>
                <span>updated {ago(r.updated_at)}</span>
              </span>
              {r.topics?.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {r.topics.slice(0, 5).map((t) => (
                    <span key={t} className={`rounded-full bg-[rgba(56,139,253,0.1)] px-2.5 py-1 text-[11px] text-[var(--l-blue)] ${styles.mono}`}>{t}</span>
                  ))}
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Cards({ repos, onOpen }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {repos.map((r) => (
        <li key={r.id || r.full_name}>
          <button type="button" onClick={() => onOpen(r)} className={`${styles.card} ${styles.row} flex h-full w-full flex-col overflow-hidden text-left ${styles.focusRing}`}>
            <span className="h-[3px] w-full" style={{ background: LANG_COLORS[r.language] || "var(--l-line)" }} aria-hidden="true" />
            <span className="flex flex-1 flex-col gap-2.5 p-[18px]">
              <span className="flex items-center gap-3">
                <Tile repo={r} size={34} />
                <span className={`min-w-0 flex-1 truncate text-sm font-semibold text-[var(--l-blue)] ${styles.mono}`}>{r.full_name}</span>
              </span>
              <span className="line-clamp-2 min-h-[40px] text-sm text-[var(--l-muted)]">{r.description || "No description"}</span>
              <span className={`${meta} mt-auto`}>
                <Lang repo={r} />
                <span className="flex items-center gap-1"><StarIcon className="h-3.5 w-3.5" aria-hidden="true" />{formatCompactNumber(r.stargazers_count || 0)}</span>
                <span className="flex items-center gap-1"><GitForkIcon className="h-3.5 w-3.5" aria-hidden="true" />{formatCompactNumber(r.forks_count || 0)}</span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const GRID = "md:grid-cols-[minmax(0,2.6fr)_minmax(0,1fr)_80px_80px_110px]";

function Table({ repos, onOpen }) {
  return (
    <div className={`${styles.card} overflow-hidden`} role="table" aria-label="Results">
      <div role="row" className={`hidden gap-3.5 border-b border-[var(--l-line)] bg-[var(--l-bg-deep)] px-[18px] py-3 text-[11px] uppercase tracking-[0.06em] text-[var(--l-muted)] md:grid ${GRID} ${styles.mono}`}>
        <span role="columnheader">Repository</span>
        <span role="columnheader">Language</span>
        <span role="columnheader">Stars</span>
        <span role="columnheader">Forks</span>
        <span role="columnheader">Updated</span>
      </div>
      {repos.map((r, i) => (
        <button
          key={r.id || r.full_name}
          type="button"
          role="row"
          onClick={() => onOpen(r)}
          className={`${styles.row} grid w-full grid-cols-[1fr_auto_auto] items-center gap-x-3.5 gap-y-1.5 px-[18px] py-3.5 text-left md:gap-y-0 ${GRID} ${i ? "border-t border-[var(--l-line)]" : ""} [&>*:first-child]:col-span-3 md:[&>*:first-child]:col-span-1 ${styles.focusRing}`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <Tile repo={r} size={30} />
            <span className="min-w-0">
              <span className={`block truncate text-sm font-semibold text-[var(--l-blue)] ${styles.mono}`}>{r.full_name}</span>
              <span className="block truncate text-[13px] text-[var(--l-muted)]">{r.description || "No description"}</span>
            </span>
          </span>
          <span className={meta}><Lang repo={r} /></span>
          <span className={meta}>★ {formatCompactNumber(r.stargazers_count || 0)}</span>
          <span className={`${meta} hidden md:flex`}>{formatCompactNumber(r.forks_count || 0)}</span>
          <span className={`${meta} hidden md:flex`}>{ago(r.updated_at)}</span>
        </button>
      ))}
    </div>
  );
}

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(2, current - 1);
  let end = Math.min(total - 1, current + 1);
  if (current <= 3) end = Math.min(5, total - 1);
  else if (current >= total - 2) start = Math.max(2, total - 4);
  return [1, ...(start > 2 ? ["…"] : []), ...Array.from({ length: end - start + 1 }, (_, i) => start + i), ...(end < total - 1 ? ["…"] : []), total];
}

function Pagination({ currentPage, totalCount, onPageChange, pending = false }) {
  const total = lastSearchPage(totalCount, PER_PAGE);
  if (total <= 1) return null;
  const btn = `grid h-9 min-w-9 place-items-center rounded-[var(--l-radius-sm)] px-2 text-[13px] ${styles.mono} ${styles.focusRing}`;
  return (
    <nav aria-label="Pages" aria-busy={pending} className="mt-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-1">
        <button type="button" className={`${btn} text-[var(--l-muted)] hover:text-[var(--l-ink)] disabled:opacity-40`} disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous page">
          <CaretLeftIcon className="h-4 w-4" />
        </button>
        {pageNumbers(currentPage, total).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-[var(--l-muted)]">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === currentPage ? "page" : undefined}
              className={`${btn} ${p === currentPage ? "border border-[var(--l-line)] bg-[var(--l-surface)] text-[var(--l-ink)]" : "text-[var(--l-muted)] hover:text-[var(--l-ink)]"}`}
            >
              {p}
            </button>
          )
        )}
        <button type="button" className={`${btn} text-[var(--l-muted)] hover:text-[var(--l-ink)] disabled:opacity-40`} disabled={currentPage >= total} onClick={() => onPageChange(currentPage + 1)} aria-label="Next page">
          <CaretRightIcon className="h-4 w-4" />
        </button>
      </div>
      {/* A page change shows that it is loading; before, a slow page looked
          like a click that did nothing (R-227, not reproduced locally). */}
      <p className={`text-xs text-[var(--l-muted)] ${styles.mono}`} aria-live="polite">
        {pending ? "Loading page…" : ""}
      </p>
      {totalCount > GITHUB_SEARCH_RESULT_LIMIT && (
        <p className={`text-xs text-[var(--l-muted)] ${styles.mono}`}>GitHub shows the first 1,000 results</p>
      )}
    </nav>
  );
}

/** R1 rows, R2 cards, R3 table behind one switch, then pagination (as before). */
export default function SearchResultsViews({ view, repos, loading, pagePending = false, totalCount, currentPage, onPageChange, onOpen }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading results">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${styles.card} flex gap-4 p-[18px]`}>
            <div className="h-10 w-10 animate-pulse rounded-[var(--l-radius-sm)] bg-[#161b22]" />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 w-1/3 animate-pulse rounded bg-[#161b22]" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-[#161b22]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[#161b22]" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  const View = view === "cards" ? Cards : view === "table" ? Table : Rows;
  return (
    <>
      <View repos={repos} onOpen={onOpen} />
      <Pagination currentPage={currentPage} totalCount={totalCount} onPageChange={onPageChange} pending={pagePending} />
    </>
  );
}
