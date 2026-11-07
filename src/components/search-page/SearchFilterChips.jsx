"use client";

import { CaretDownIcon, SparkleIcon } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { analyzeQuery } from "@/components/search/QueryUnderstandingPanel";
import styles from "@/components/home/home.module.css";

// The same options the old navbar offered (SearchNavbar.jsx).
const LANGUAGES = ["", "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "C++", "C#", "Ruby", "PHP", "Swift", "Kotlin"];
const STARS = [["", "Any"], [">100", "> 100"], [">1000", "> 1,000"], [">10000", "> 10,000"], [">50000", "> 50,000"]];
const DATES = [["", "Any time"], ["day", "Past 24 hours"], ["week", "Past week"], ["month", "Past month"], ["year", "Past year"]];
const LICENSES = [["", "Any"], ["mit", "MIT"], ["apache-2.0", "Apache 2.0"], ["gpl-3.0", "GPL 3.0"], ["bsd-3-clause", "BSD 3-Clause"]];
const SORTS = [["all", "All"], ["best-match", "Best match"], ["stars", "Most stars"], ["updated", "Recently updated"]];

function Chip({ label, value, options, onChange, active }) {
  const current = options.find(([v]) => v === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex h-[34px] items-center gap-1.5 rounded-[var(--l-radius-sm)] border px-3 text-[13px] ${styles.mono} ${styles.focusRing} ${
          active
            ? "border-[rgba(88,166,255,0.5)] bg-[rgba(56,139,253,0.1)] text-[var(--l-ink)]"
            : "border-[var(--l-line)] bg-[var(--l-surface)] text-[var(--l-muted)] hover:text-[var(--l-ink)]"
        }`}
      >
        {active ? `${label}: ${current?.[1]}` : label}
        <CaretDownIcon className="h-3 w-3" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="dark max-h-72 overflow-y-auto">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map(([v, l]) => (
            <DropdownMenuRadioItem key={v || "any"} value={v}>
              {l}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** F1: the old navbar filters as chips under the bar; active ones turn blue. */
export function SearchFilterChips({ language, setLanguage, stars, setStars, sort, setSort, advancedFilters, setAdvancedFilters, onClear }) {
  const setAdv = (key) => (v) => setAdvancedFilters({ ...advancedFilters, [key]: v });
  const anyActive = Boolean(language || stars || (sort && sort !== "all") || advancedFilters.license || advancedFilters.dateRange);

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filters" role="group">
      <Chip label="Language" value={language} options={LANGUAGES.map((l) => [l, l || "All languages"])} onChange={setLanguage} active={Boolean(language)} />
      <Chip label="Stars" value={stars} options={STARS} onChange={setStars} active={Boolean(stars)} />
      <Chip label="Updated" value={advancedFilters.dateRange || ""} options={DATES} onChange={setAdv("dateRange")} active={Boolean(advancedFilters.dateRange)} />
      <Chip label="License" value={advancedFilters.license || ""} options={LICENSES} onChange={setAdv("license")} active={Boolean(advancedFilters.license)} />
      <Chip label="Sort" value={sort || "all"} options={SORTS} onChange={setSort} active={Boolean(sort && sort !== "all")} />
      {anyActive && (
        <button type="button" onClick={onClear} className={`ml-auto rounded px-1 text-xs text-[var(--l-blue)] hover:underline ${styles.mono} ${styles.focusRing}`}>
          Clear all
        </button>
      )}
    </div>
  );
}

/** Q1: one quiet line with what the existing query analysis found. */
export function UnderstoodAs({ query }) {
  const a = analyzeQuery(query);
  if (!a) return null;
  const chip = (text, cls) => (
    <span className={`rounded-full px-2.5 py-1 text-[11px] ${cls}`}>{text}</span>
  );
  return (
    <p className={`flex flex-wrap items-center gap-2.5 text-[13px] text-[var(--l-muted)] ${styles.mono}`}>
      <SparkleIcon className="h-4 w-4" aria-hidden="true" />
      <span>Understood as</span>
      {a.language && chip(`language: ${a.language}`, "bg-[rgba(56,139,253,0.1)] text-[var(--l-blue)]")}
      {a.useCase && chip(`type: ${a.useCase}`, "bg-[rgba(63,185,80,0.1)] text-[var(--l-green)]")}
      {a.pattern && chip(`pattern: ${a.pattern}`, "bg-[rgba(163,113,247,0.12)] text-[var(--l-purple)]")}
    </p>
  );
}
