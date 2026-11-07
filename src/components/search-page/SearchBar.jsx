"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CaretDownIcon,
  CircleNotchIcon,
  ClockIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  SparkleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { getSearchHistory } from "@/lib/supabase/search-history";
import { useStoredChoice } from "@/hooks/home/useStoredChoice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import SpinBorder from "@/components/landing/SpinBorder";
import styles from "@/components/home/home.module.css";

export const MODES = [
  { value: "scout", label: "Scout", note: "Free" },
  { value: "analyst", label: "Analyst", note: "Advanced" },
  { value: "strategist", label: "Strategist", note: "Expert" },
];

/**
 * The Search page's bar (SEARCH-001): B2 (the mode as a chip inside the bar)
 * with the B3 panel. Focusing or typing opens one panel holding AI
 * suggestions (the existing /api/ai/suggestions call, 300 ms debounce) and
 * the user's recent searches. A small switch in the panel turns AI
 * suggestions off; that choice is remembered in this browser. History stays.
 * "/" focuses the bar, arrow keys move through the panel, Esc closes it.
 */
export default function SearchBar({ query, setQuery, onSearch, loading, mode, setMode, autoFocus = false }) {
  const { user } = useAuth();
  const [suggestOff, setSuggestOff] = useStoredChoice("sefgh.searchSuggestions");
  const suggestionsOn = suggestOff !== "off";

  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [history, setHistory] = useState([]);
  const [active, setActive] = useState(-1);
  const [enhancing, setEnhancing] = useState(false);
  const wrapper = useRef(null);
  const input = useRef(null);

  // "/" focuses the bar unless the user is typing somewhere else.
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && !document.activeElement?.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close the panel on an outside click.
  useEffect(() => {
    const onDown = (e) => {
      if (wrapper.current && !wrapper.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Recent searches, loaded once the panel first opens.
  const historyLoaded = useRef(false);
  useEffect(() => {
    if (!open || !user?.id || historyLoaded.current) return;
    historyLoaded.current = true;
    getSearchHistory(user.id, { limit: 10, source: "search" })
      .then((rows) => setHistory(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, [open, user?.id]);

  // AI suggestions while typing (same endpoint and debounce as before).
  useEffect(() => {
    const q = query.trim();
    if (!suggestionsOn || q.length < 2) return undefined;
    let alive = true;
    const t = setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await fetch("/api/ai/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        if (alive && res.ok && Array.isArray(data.suggestions)) setSuggestions(data.suggestions);
      } catch {
        // Suggestions are optional; the bar still searches.
      } finally {
        if (alive) setSuggesting(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, suggestionsOn]);

  const shownSuggestions = suggestionsOn && query.trim().length >= 2 ? suggestions.slice(0, 5) : [];
  const shownHistory = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seen = new Set();
    return history
      .filter((h) => h?.query && (!q || h.query.toLowerCase().includes(q)))
      .filter((h) => (seen.has(h.query) ? false : seen.add(h.query)))
      .slice(0, 5);
  }, [history, query]);
  const items = [...shownSuggestions.map((s) => ({ kind: "ai", text: s })), ...shownHistory.map((h) => ({ kind: "history", text: h.query }))];

  const run = (text) => {
    setQuery(text);
    setOpen(false);
    setActive(-1);
    onSearch(text);
  };

  const enhance = async () => {
    if (!query.trim()) {
      toast.error("Type a search first");
      return;
    }
    setEnhancing(true);
    try {
      const res = await fetch("/api/ai/enhance-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (res.ok && data.enhancedQuery) {
        setQuery(data.enhancedQuery);
        toast.success("Query enhanced");
      } else {
        throw new Error(data.error || "Failed to enhance query");
      }
    } catch {
      toast.error("Could not enhance the query");
    } finally {
      setEnhancing(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      run(items[active].text);
    }
  };

  const currentMode = MODES.find((m) => m.value === mode) || MODES[0];
  const panelVisible = open && (items.length > 0 || suggestionsOn === false || user);

  return (
    <div ref={wrapper} className="relative">
      <SpinBorder radius={12}>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            setActive(-1);
            onSearch(query);
          }}
          className="relative flex h-14 items-center gap-2.5 rounded-[var(--l-radius)] bg-[var(--l-surface)] pl-4 pr-2 sm:pl-5"
        >
          <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-[var(--l-muted)]" aria-hidden="true" />
          <input
            ref={input}
            type="search"
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            role="combobox"
            aria-expanded={panelVisible}
            aria-controls="search-panel"
            aria-activedescendant={active >= 0 ? `search-opt-${active}` : undefined}
            aria-label="Describe the project you're looking for"
            placeholder="Describe the project you're looking for…"
            disabled={loading}
            className={`h-full min-w-0 flex-1 bg-transparent text-[15px] text-[var(--l-ink)] outline-none placeholder:text-[var(--l-muted)] disabled:opacity-60 ${styles.mono}`}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
              aria-label="Clear"
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--l-muted)] hover:text-[var(--l-ink)] ${styles.focusRing}`}
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={enhance}
            disabled={enhancing || loading}
            aria-label="Enhance query with AI"
            title="Enhance query with AI"
            className={`hidden h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--l-muted)] hover:text-[var(--l-purple)] disabled:opacity-50 sm:grid ${styles.focusRing}`}
          >
            {enhancing ? <CircleNotchIcon className="h-4 w-4 animate-spin" /> : <MagicWandIcon className="h-4 w-4" />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--l-radius-sm)] border border-[var(--l-line)] bg-[var(--l-bg-deep)] px-2.5 text-xs text-[var(--l-ink)] hover:border-[var(--l-muted)] ${styles.mono} ${styles.focusRing}`}
              aria-label={`Search mode: ${currentMode.label}`}
            >
              <SparkleIcon className="h-3.5 w-3.5 text-[var(--l-green)]" aria-hidden="true" />
              <span className="hidden sm:inline">{currentMode.label}</span>
              <CaretDownIcon className="h-3 w-3 text-[var(--l-muted)]" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dark">
              {MODES.map((m) => (
                <DropdownMenuItem key={m.value} onSelect={() => setMode(m.value)} className="flex justify-between gap-6">
                  <span className={m.value === mode ? "font-semibold" : ""}>{m.label}</span>
                  <span className="text-xs text-muted-foreground">{m.note}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="submit"
            disabled={loading}
            className={`inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-[var(--l-radius-sm)] border border-white/10 bg-[var(--l-accent)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--l-accent-hover)] disabled:opacity-60 ${styles.focusRing}`}
          >
            {loading && <CircleNotchIcon className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Search
          </button>
        </form>
      </SpinBorder>

      {panelVisible && (
        <div
          id="search-panel"
          role="listbox"
          className={`absolute inset-x-0 top-full z-40 mt-2 p-2 shadow-[0_24px_60px_-20px_#000] ${styles.card}`}
        >
          <div className="flex items-center px-2.5 py-2">
            <span className={styles.eyebrow}>AI suggestions</span>
            {suggesting && <CircleNotchIcon className="ml-2 h-3 w-3 animate-spin text-[var(--l-muted)]" aria-hidden="true" />}
            <label className={`ml-auto flex items-center gap-2 text-xs text-[var(--l-muted)] ${styles.mono}`}>
              {suggestionsOn ? "On" : "Off"}
              <Switch
                checked={suggestionsOn}
                onCheckedChange={(on) => setSuggestOff(on ? "on" : "off")}
                aria-label="AI suggestions"
                className="h-4 w-7 data-[state=checked]:bg-[var(--l-accent)] [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
              />
            </label>
          </div>
          {!suggestionsOn ? (
            <p className={`px-2.5 pb-2 text-xs text-[var(--l-muted)] ${styles.mono}`}>Suggestions are off. Your history still shows below.</p>
          ) : shownSuggestions.length === 0 ? (
            <p className={`px-2.5 pb-2 text-xs text-[var(--l-muted)] ${styles.mono}`}>
              {query.trim().length < 2 ? "Type two or more letters for suggestions." : suggesting ? "Thinking…" : "No suggestions for this one."}
            </p>
          ) : null}
          {items.map((it, i) => (
            <div key={`${it.kind}-${it.text}`}>
              {it.kind === "history" && (i === 0 || items[i - 1].kind !== "history") && (
                <p className={`px-2.5 pb-1.5 pt-3 text-[11px] uppercase tracking-[0.06em] text-[var(--l-muted)] ${styles.mono}`}>Recent</p>
              )}
              <button
                id={`search-opt-${i}`}
                type="button"
                role="option"
                aria-selected={active === i}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(it.text)}
                className={`flex w-full items-center gap-2.5 rounded-[var(--l-radius-sm)] px-2.5 py-2.5 text-left text-sm ${styles.mono} ${active === i ? "bg-[rgba(56,139,253,0.1)] text-[var(--l-ink)]" : it.kind === "history" ? "text-[var(--l-muted)]" : ""}`}
              >
                {it.kind === "ai" ? <SparkleIcon className="h-3.5 w-3.5 shrink-0 text-[var(--l-purple)]" aria-hidden="true" /> : <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                <span className="truncate">{it.text}</span>
                {active === i && <span className="ml-auto text-xs text-[var(--l-muted)]">↵</span>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
