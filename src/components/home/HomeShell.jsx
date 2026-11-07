"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  ChartLineUpIcon,
  ChatCircleIcon,
  ClockIcon,
  CodeIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  StarIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { SefghGlyph } from "@/components/brand/SefghMark";
import { NotificationBell } from "@/components/NotificationBell";
import { useStoredChoice } from "@/hooks/home/useStoredChoice";
import styles from "./home.module.css";

const NAV = [
  { href: "/home", label: "Home", Icon: HouseIcon },
  { href: "/search", label: "Search", Icon: MagnifyingGlassIcon },
  { href: "/chat", label: "AI Chat", Icon: ChatCircleIcon },
  { href: "/trending", label: "Trending", Icon: ChartLineUpIcon },
  { href: "/starred", label: "Starred", Icon: StarIcon, auth: true },
  { href: "/history", label: "History", Icon: ClockIcon, auth: true },
  { href: "/playground", label: "Playground", Icon: CodeIcon },
  { href: "/submissions", label: "Submissions", Icon: UploadSimpleIcon },
];

export const TABS = [
  { value: "latest", label: "Latest" },
  { value: "monthly", label: "This month" },
  { value: "yearly", label: "This year" },
];

function initials(user) {
  const name = user?.user_metadata?.full_name;
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return user?.email?.[0]?.toUpperCase() || "U";
}

/**
 * Home's side navigation: a 72px icon rail by default (S2) that expands to a
 * 232px labelled sidebar (S1). The choice is remembered in this browser.
 */
function SideNav({ user }) {
  const pathname = usePathname();
  const [stored, setStored] = useStoredChoice("sefgh.homeSidebar");
  const expanded = stored === "expanded";

  return (
    <nav
      aria-label="Main"
      className={`${styles.side} sticky top-0 hidden h-screen shrink-0 flex-col gap-1 px-3 py-4 md:flex ${expanded ? "w-[232px]" : "w-[72px] items-center"}`}
    >
      <Link
        href="/home"
        className={`mb-3 flex h-11 items-center gap-2.5 rounded-md text-lg font-bold ${styles.display} ${styles.focusRing} ${expanded ? "px-2.5" : "justify-center"}`}
        aria-label="SEFGH home"
      >
        <SefghGlyph size={26} />
        {expanded && "SEFGH"}
      </Link>

      {NAV.filter((n) => !n.auth || user).map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            title={expanded ? undefined : label}
            aria-label={expanded ? undefined : label}
            aria-current={active ? "page" : undefined}
            className={`${styles.navItem} ${active ? styles.navActive : ""} ${styles.focusRing} ${expanded ? "px-3" : "w-10 justify-center"}`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {expanded && label}
          </Link>
        );
      })}

      <div className="mt-auto flex w-full flex-col gap-3">
        {expanded && (
          <div className={`${styles.card} p-4`}>
            <p className="mb-2.5 text-[13px] text-[var(--l-muted)]">Know a project worth finding?</p>
            <Link
              href="/submissions"
              className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--l-radius-sm)] bg-[var(--l-accent)] text-[13px] font-semibold text-white hover:bg-[var(--l-accent-hover)] ${styles.focusRing}`}
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" /> Submit
            </Link>
          </div>
        )}
        <button
          type="button"
          onClick={() => setStored(expanded ? "rail" : "expanded")}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={expanded}
          className={`${styles.navItem} ${styles.focusRing} ${expanded ? "px-3" : "w-10 justify-center self-center"}`}
        >
          {expanded ? (
            <>
              <CaretDoubleLeftIcon className="h-[18px] w-[18px]" aria-hidden="true" /> Collapse
            </>
          ) : (
            <CaretDoubleRightIcon className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
        </button>
      </div>
    </nav>
  );
}

function TopBar({ user, tab, onTabChange, showSearch = true, title = null }) {
  const router = useRouter();
  const input = useRef(null);

  // ⌘K / Ctrl+K focuses the search box.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--l-line)] bg-[rgba(13,17,23,0.92)] px-4 backdrop-blur sm:gap-4 sm:px-6">
      <Link href="/home" className="md:hidden" aria-label="SEFGH home">
        <SefghGlyph size={24} />
      </Link>
      {title && <span className={`text-sm font-bold ${styles.display}`}>{title}</span>}
      {/* The wrapper does the hiding: .tabs sets its own display, which would beat `hidden`. */}
      {onTabChange && (
      <div className="hidden sm:block">
      <div className={styles.tabs} role="tablist" aria-label="Time range">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => onTabChange(t.value)}
            className={`${styles.tab} ${tab === t.value ? styles.tabOn : ""} ${styles.focusRing}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      </div>
      )}
      {showSearch ? (
      <form
        role="search"
        className="ml-auto flex h-10 min-w-0 max-w-[520px] flex-1 items-center gap-2.5 rounded-[var(--l-radius-sm)] border border-[var(--l-line)] bg-[var(--l-surface)] px-3.5 focus-within:border-[var(--l-blue)]"
        onSubmit={(e) => {
          e.preventDefault();
          const q = String(new FormData(e.currentTarget).get("q") || "").trim();
          if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
        }}
      >
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-[var(--l-muted)]" aria-hidden="true" />
        <input
          ref={input}
          name="q"
          type="search"
          autoComplete="off"
          aria-label="Search repositories"
          placeholder="Search repositories…"
          className={`h-full min-w-0 flex-1 bg-transparent text-sm text-[var(--l-ink)] outline-none placeholder:text-[var(--l-muted)] ${styles.mono}`}
        />
        <kbd className={`hidden rounded border border-[var(--l-line)] px-1.5 py-0.5 text-[11px] text-[var(--l-muted)] sm:inline ${styles.mono}`}>⌘K</kbd>
      </form>
      ) : (
        <span className="ml-auto" />
      )}
      {user ? (
        <>
          <NotificationBell />
          <Link href="/profile" aria-label="Your profile" className={`shrink-0 rounded-full ${styles.focusRing}`}>
            {user.user_metadata?.avatar_url ? (
              <Image src={user.user_metadata.avatar_url} alt="" width={34} height={34} className="h-[34px] w-[34px] rounded-full" />
            ) : (
              <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-gradient-to-br from-[#a371f7] to-[#6e40c9] text-[13px] font-semibold text-[#0d1117]">
                {initials(user)}
              </span>
            )}
          </Link>
        </>
      ) : (
        <Link
          href="/login"
          className={`inline-flex h-10 shrink-0 items-center rounded-[var(--l-radius-sm)] bg-[var(--l-accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--l-accent-hover)] ${styles.focusRing}`}
        >
          Sign in
        </Link>
      )}
    </header>
  );
}

/**
 * The app frame of the redesigned signed-in pages: rail/sidebar and top bar.
 * Home passes its time tabs; Search passes `showSearch={false}` (it has its
 * own big search bar) and a title.
 */
export default function HomeShell({ user, tab, onTabChange, showSearch = true, title = null, children }) {
  return (
    <div className="flex min-h-screen">
      <SideNav user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} tab={tab} onTabChange={onTabChange} showSearch={showSearch} title={title} />
        {children}
      </div>
    </div>
  );
}

export { initials };
