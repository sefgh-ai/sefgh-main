"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SignOutIcon } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useUserStats";
import { formatCompactNumber, formatDate } from "@/lib/utils/formatters";
import { initials } from "./HomeShell";
import styles from "./home.module.css";

const WEEKS = 18;
const LEVELS = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The last WEEKS weeks as GitHub-style columns (Sunday at the top), coloured
 * by searches that day. The owner chose searches per day because SEFGH stores
 * no daily contribution data.
 */
function SearchGraph({ perDay }) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(end.getDate() - end.getDay() - (WEEKS - 1) * 7);

  const max = Math.max(1, ...Object.values(perDay));
  let total = 0;
  const cols = [];
  for (let w = 0; w < WEEKS; w++) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      if (day > end) {
        cells.push(<span key={d} className="block h-[10px] w-[10px]" />);
        continue;
      }
      const n = perDay[dayKey(day)] || 0;
      total += n;
      const lvl = n === 0 ? 0 : Math.min(4, 1 + Math.floor(((n - 1) / max) * 4));
      cells.push(
        <span
          key={d}
          title={`${n} ${n === 1 ? "search" : "searches"} on ${formatDate(day, { month: "short" })}`}
          className="block h-[10px] w-[10px] rounded-[2px]"
          style={{ background: LEVELS[lvl] }}
        />
      );
    }
    cols.push(
      <div key={w} className="flex flex-col gap-[3px]">
        {cells}
      </div>
    );
  }

  return (
    <div>
      <div className={`mb-2.5 flex justify-between text-xs text-[var(--l-muted)] ${styles.mono}`}>
        <span>Search activity</span>
        <span>
          {total} in {WEEKS} weeks
        </span>
      </div>
      <div className="flex gap-[3px]" role="img" aria-label={`${total} searches in the last ${WEEKS} weeks`}>
        {cols}
      </div>
    </div>
  );
}

function ProfileCard({ user, authLoading, perDay }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { stats, loading: statsLoading } = useUserStats(user?.id);
  const loading = authLoading || (user && statsLoading);

  if (loading) {
    return <div className={`${styles.card} h-[340px] animate-pulse`} />;
  }

  if (!user) {
    return (
      <div className={`${styles.card} p-[22px]`}>
        <p className={`text-base font-bold ${styles.display}`}>Join SEFGH</p>
        <p className="mb-4 mt-1.5 text-sm text-[var(--l-muted)]">Sign in to track your searches, star projects and tune your feed.</p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className={`h-[42px] w-full rounded-[var(--l-radius-sm)] bg-[var(--l-accent)] text-sm font-semibold text-white hover:bg-[var(--l-accent-hover)] ${styles.focusRing}`}
        >
          Sign in
        </button>
      </div>
    );
  }

  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const level = stats?.level || 1;
  const title = stats?.title || "Newbie";
  const contributions = stats?.contributions || 0;
  const max = stats?.contributions_max || 64;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(`Goodbye, ${name}!`, { description: "You've been signed out." });
    } catch (error) {
      toast.error("Sign out failed", { description: error.message });
    }
  };

  return (
    <div className={`${styles.card} p-[22px]`}>
      <div className="flex items-center gap-3">
        {user.user_metadata?.avatar_url ? (
          <Image src={user.user_metadata.avatar_url} alt="" width={46} height={46} className="h-[46px] w-[46px] rounded-full" />
        ) : (
          <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#a371f7] to-[#6e40c9] text-[15px] font-semibold text-[#0d1117]">
            {initials(user)}
          </span>
        )}
        <div className="min-w-0">
          <div className={`truncate text-[15px] font-bold uppercase leading-tight ${styles.display}`}>{name}</div>
          <div className={`text-xs text-[var(--l-green)] ${styles.mono}`}>
            Lv. {level} · {title}
          </div>
        </div>
      </div>

      <div className="mt-[18px]">
        <SearchGraph perDay={perDay} />
      </div>

      <div className={`mb-2 mt-4 flex justify-between text-xs text-[var(--l-muted)] ${styles.mono}`}>
        <span>Contributions</span>
        <span className="text-[var(--l-green)]">
          {contributions} / {max}
        </span>
      </div>
      <div className={styles.bar}>
        <i style={{ width: `${Math.min(100, (contributions / max) * 100)}%` }} />
      </div>

      <div className="mt-[18px] grid grid-cols-2 gap-3">
        <div>
          <b className={`block text-xl font-bold leading-none ${styles.display}`}>{formatCompactNumber(stats?.followers || 0)}</b>
          <span className={`text-xs text-[var(--l-muted)] ${styles.mono}`}>followers</span>
        </div>
        <div>
          <b className={`block text-xl font-bold leading-none ${styles.display}`}>{formatCompactNumber(stats?.projects || 0)}</b>
          <span className={`text-xs text-[var(--l-muted)] ${styles.mono}`}>projects</span>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <Link
          href="/profile"
          className={`flex h-[42px] flex-1 items-center justify-center rounded-[var(--l-radius-sm)] bg-[var(--l-accent)] text-sm font-semibold text-white hover:bg-[var(--l-accent-hover)] ${styles.focusRing}`}
        >
          View profile
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Log out"
          title="Log out"
          className={`grid h-[42px] w-[42px] place-items-center rounded-[var(--l-radius-sm)] border border-[var(--l-line)] text-[var(--l-muted)] hover:border-[var(--l-muted)] hover:text-[var(--l-ink)] ${styles.focusRing}`}
        >
          <SignOutIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function About() {
  return (
    <div className={`${styles.card} p-5`}>
      <p className={styles.eyebrow}>About</p>
      <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--l-muted)]">
        SEFGH is an AI-powered search platform with intelligent query understanding, real-time suggestions and
        multi-language support.
      </p>
      <p className="mt-3 text-[13px] text-[var(--l-blue)]">
        <Link href="/feedback" className="hover:underline">Feedback</Link>
        <span className="mx-2 text-[var(--l-muted)]">·</span>
        <Link href="/business" className="hover:underline">Business</Link>
        <span className="mx-2 text-[var(--l-muted)]">·</span>
        <Link href="/links" className="hover:underline">Links</Link>
      </p>
    </div>
  );
}

/** Right rail (R1 + R2, HOME-001): profile with search graph, then About. */
export default function HomeProfile({ user, authLoading, perDay }) {
  return (
    <aside aria-label="Your profile" className="flex flex-col gap-4">
      <ProfileCard user={user} authLoading={authLoading} perDay={perDay} />
      <About />
    </aside>
  );
}
