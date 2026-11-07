"use client";

import { useMemo } from "react";
import { useCategories } from "@/hooks/home/useCategories";
import styles from "./home.module.css";

/**
 * Topics as a column (T3, HOME-001): the user's preference tags when set,
 * otherwise the live categories, each with its usage count. On small screens
 * the same list becomes a horizontal, scrollable row.
 */
export default function HomeTopics({ selected, onSelect, userPreferences, onOpenPreferences }) {
  const { categories: live, loading } = useCategories();

  const topics = useMemo(() => {
    const fromPrefs = userPreferences?.tags?.length > 0 ? userPreferences.tags : null;
    const list = fromPrefs || (live || []).filter((c) => c.name !== "All");
    return [{ name: "All" }, ...list];
  }, [userPreferences, live]);

  const item = (t) => {
    const on = selected === t.name;
    return (
      <button
        key={t.id || t.name}
        type="button"
        onClick={() => onSelect(t.name)}
        aria-pressed={on}
        className={`${styles.navItem} ${on ? styles.navActive : ""} ${styles.focusRing} shrink-0 justify-between whitespace-nowrap px-3 text-left lg:w-full`}
      >
        <span className={`truncate ${styles.mono}`}># {t.name}</span>
        {t.usage_count > 0 && <small className={`text-[11px] ${styles.mono}`}>{t.usage_count}</small>}
      </button>
    );
  };

  return (
    <aside aria-label="Topics" className="min-w-0">
      <p className={`${styles.eyebrow} mb-3`}>{userPreferences?.tags?.length > 0 ? "Your topics" : "Topics"}</p>
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {loading && !(userPreferences?.tags?.length > 0)
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 w-28 shrink-0 animate-pulse rounded-[var(--l-radius-sm)] bg-[var(--l-surface)] lg:w-full" />
            ))
          : topics.map(item)}
      </div>
      <button
        type="button"
        onClick={onOpenPreferences}
        className={`mt-3 rounded px-3 text-[13px] text-[var(--l-blue)] hover:underline ${styles.mono} ${styles.focusRing}`}
      >
        + edit preferences
      </button>
    </aside>
  );
}
