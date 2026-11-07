"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { formatCompactNumber } from "@/lib/utils/formatters";
import styles from "./home.module.css";

// Same rule as the old ProjectCard: an internal repo page when the GitHub URL
// parses, otherwise the URL itself (opened in a new tab), otherwise nothing.
function projectHref(project) {
  const m = project.github_url?.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (m) return { href: `/repo/${m[1]}/${m[2].replace(/\.git$/, "")}`, external: false };
  if (project.github_url) return { href: project.github_url, external: true };
  return null;
}

function ageDays(project) {
  if (typeof project.daysAgo === "number") return project.daysAgo;
  if (!project.created_at) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(project.created_at).getTime()) / 86400000));
}

const num = (v) => (typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.]/g, "")) || 0);

// Tile colour from the name, so a project keeps its colour across visits.
const TINTS = ["#a371f7", "#58a6ff", "#3fb950", "#ffa657", "#f778ba"];
function tint(name = "") {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}
function monogram(project) {
  const base = (project.title || "").replace(/^.*\//, "");
  return base.slice(0, 2).toUpperCase() || "?";
}

const COLUMNS = [
  { key: "stars", label: "Stars", get: (p) => num(p.stars) },
  { key: "views", label: "Views", get: (p) => num(p.views) },
  { key: "age", label: "Age", get: (p) => -(ageDays(p) ?? 1e9) },
];

const GRID = "lg:grid-cols-[minmax(0,2.6fr)_minmax(0,1fr)_74px_74px_56px]";

/**
 * The project feed as a dense table (P3, HOME-001). Rows keep the feed's
 * order (newest first, per the time tab) until a column header is clicked;
 * sorting applies to the rows loaded so far. Below lg the rows stack.
 */
export default function HomeProjectTable({ projects, loading, loadingMore, hasMore, onLoadMore, filtered, onClearFilters }) {
  const [sort, setSort] = useState(null); // { key, dir: 1 | -1 }

  const rows = useMemo(() => {
    if (!sort) return projects;
    const col = COLUMNS.find((c) => c.key === sort.key);
    return [...projects].sort((a, b) => (col.get(b) - col.get(a)) * sort.dir);
  }, [projects, sort]);

  const toggle = (key) =>
    setSort((s) => (!s || s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));

  const header = (
    <div
      className={`hidden gap-3.5 border-b border-[var(--l-line)] bg-[var(--l-bg-deep)] px-[18px] py-3 text-[11px] uppercase tracking-[0.06em] text-[var(--l-muted)] lg:grid ${GRID} ${styles.mono}`}
      role="row"
    >
      <span role="columnheader">Project</span>
      <span role="columnheader">Language</span>
      {COLUMNS.map((c) => (
        <button
          key={c.key}
          type="button"
          role="columnheader"
          aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "descending" : "ascending") : "none"}
          onClick={() => toggle(c.key)}
          className={`flex items-center gap-1 text-left uppercase hover:text-[var(--l-ink)] ${styles.focusRing} ${sort?.key === c.key ? "text-[var(--l-ink)]" : ""}`}
        >
          {c.label}
          {sort?.key === c.key && (sort.dir === 1 ? <CaretDownIcon className="h-3 w-3" /> : <CaretUpIcon className="h-3 w-3" />)}
        </button>
      ))}
    </div>
  );

  let body;
  if (loading) {
    body = Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className={`flex items-center gap-3 px-[18px] py-4 ${i ? "border-t border-[var(--l-line)]" : ""}`}>
        <div className="h-[30px] w-[30px] animate-pulse rounded-[var(--l-radius-sm)] bg-[#161b22]" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-[#161b22]" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-[#161b22]" />
        </div>
      </div>
    ));
  } else if (rows.length === 0) {
    body = (
      <div className="px-6 py-14 text-center">
        <p className={`text-base font-bold ${styles.display}`}>No projects here yet</p>
        <p className="mt-1.5 text-sm text-[var(--l-muted)]">
          {filtered ? "Nothing matches these topics in this time range." : "Try a longer time range."}
        </p>
        {filtered && (
          <button
            type="button"
            onClick={onClearFilters}
            className={`mt-4 rounded-[var(--l-radius-sm)] border border-[var(--l-line)] px-4 py-2 text-sm font-semibold hover:border-[var(--l-muted)] ${styles.focusRing}`}
          >
            Clear filters
          </button>
        )}
      </div>
    );
  } else {
    body = rows.map((p, i) => {
      const link = projectHref(p);
      const days = ageDays(p);
      const cells = (
        <>
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[var(--l-radius-sm)] text-xs font-bold text-[#0d1117] ${styles.display}`}
              style={{ background: tint(p.title) }}
              aria-hidden="true"
            >
              {monogram(p)}
            </span>
            <div className="min-w-0">
              <div className={`flex items-center gap-2 text-sm font-semibold text-[var(--l-blue)] ${styles.mono}`}>
                <span className="truncate">{p.title}</span>
                {p.trending && <span className={styles.hot}>Hot</span>}
              </div>
              <div className="truncate text-[13px] text-[var(--l-muted)]">{p.description}</div>
            </div>
          </div>
          <span className={`flex items-center gap-1.5 text-xs text-[var(--l-muted)] ${styles.mono}`}>
            {p.language ? (
              <>
                <span className="h-2 w-2 rounded-full bg-[var(--l-muted)]" aria-hidden="true" />
                {p.language}
              </>
            ) : (
              "—"
            )}
          </span>
          <span className={`text-xs text-[var(--l-muted)] ${styles.mono}`}>
            <span className="lg:hidden">★ </span>
            {formatCompactNumber(num(p.stars))}
          </span>
          <span className={`text-xs text-[var(--l-muted)] ${styles.mono}`}>
            <span className="lg:hidden">views </span>
            {formatCompactNumber(num(p.views))}
          </span>
          <span className={`text-xs text-[var(--l-muted)] ${styles.mono}`}>{days === null ? "—" : `${days}d`}</span>
        </>
      );
      const cls = `${styles.row} grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3.5 gap-y-1.5 px-[18px] py-3.5 lg:gap-y-0 ${GRID} ${i ? "border-t border-[var(--l-line)]" : ""} [&>*:first-child]:col-span-4 lg:[&>*:first-child]:col-span-1 ${styles.focusRing}`;
      if (!link) return <div key={p.id || i} className={cls} role="row">{cells}</div>;
      return link.external ? (
        <a key={p.id || i} href={link.href} target="_blank" rel="noopener noreferrer" className={cls} role="row">
          {cells}
        </a>
      ) : (
        <Link key={p.id || i} href={link.href} className={cls} role="row">
          {cells}
        </Link>
      );
    });
  }

  return (
    <div className={`${styles.card} min-w-0 overflow-hidden`} role="table" aria-label="Projects">
      {header}
      {body}
      {!loading && rows.length > 0 && hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className={`w-full border-t border-[var(--l-line)] py-3.5 text-[13px] font-medium text-[var(--l-blue)] hover:bg-[rgba(230,237,243,0.03)] disabled:opacity-60 ${styles.mono} ${styles.focusRing}`}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
