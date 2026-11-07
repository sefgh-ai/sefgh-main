"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  BookOpenIcon,
  CalendarIcon,
  ChatIcon,
  CircleIcon,
  ClockIcon,
  CodeIcon,
  EyeIcon,
  GitBranchIcon,
  GitForkIcon,
  ScalesIcon,
  SealCheckIcon,
  StarIcon,
  VideoIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCompactNumber, formatDate, formatRelativeTime } from "@/lib/utils/formatters";
import { MobileBottomNav } from "@/components/search/MobileBottomNav";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { readmeUrlTransform } from "@/lib/github/readme-links";
import { Scout } from "@/components/brand/SefghMark";
import HomeShell from "@/components/home/HomeShell";
import ContributionRain from "@/components/landing/ContributionRain";
import { SCOUT_PURPLE } from "@/components/landing/palette";
import { RepoVoteSection } from "@/components/repo-details/RepoVoteSection";
import { RepoRatingSection } from "@/components/repo-details/RepoRatingSection";
import { RepoCommentsSection } from "@/components/repo-details/RepoCommentsSection";
import { RepoCollectButton } from "@/components/repo-details/RepoCollectButton";
import { RepoVideoTab } from "@/components/repo-details/RepoVideoTab";
import { RepoQRCode } from "@/components/repo-details/RepoQRCode";
import { RepoDrawer } from "@/components/repo-details/RepoDrawer";
import styles from "@/components/home/home.module.css";

const LANG_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572a5", Java: "#b07219", Go: "#00add8", Rust: "#dea584",
  "C++": "#f34b7d", "C#": "#178600", Ruby: "#701516", PHP: "#4f5d95", Swift: "#f05138", Kotlin: "#a97bff", C: "#555555",
};

// The README, from the same endpoint the code explorer reads (/api/github/repo).
function useReadme(owner, repo) {
  const [state, setState] = useState({ loading: true, readme: null });
  useEffect(() => {
    let alive = true;
    fetch(`/api/github/repo/${owner}/${repo}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setState({ loading: false, readme: d?.readme || null }))
      .catch(() => alive && setState({ loading: false, readme: null }));
    return () => {
      alive = false;
    };
  }, [owner, repo]);
  return state;
}

const TABS = [
  { value: "readme", label: "README", Icon: BookOpenIcon },
  { value: "video", label: "Video", Icon: VideoIcon },
  { value: "comments", label: "Comments", Icon: ChatIcon },
];

const iconBtn = `grid h-10 w-10 shrink-0 place-items-center rounded-[var(--l-radius-sm)] border border-[var(--l-line)] text-[var(--l-muted)] hover:border-[var(--l-muted)] hover:text-[var(--l-ink)] ${styles.focusRing}`;

/**
 * Repository page (/repo/owner/name), redesigned in REPO-001: H3's compact
 * header over faint contribution rain, two columns (README / Video / Comments
 * on the left; About with Scout on it and the community rating on the right)
 * and a floating action bar (A3). Data is unchanged: the page's GitHub data
 * and SEFGH data (votes, ratings, comments, saves) from the server, and the
 * existing vote, rating, comment, collect, video, QR and code-drawer parts.
 */
export default function RepoView({ repoData, sefghData, owner, repoName, fontClassName = "" }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("readme");
  const [canvasOpen, setCanvasOpen] = useState(false);
  const { loading: readmeLoading, readme } = useReadme(owner, repoName);
  const full = `${owner}/${repoName}`;
  const commentCount = Array.isArray(sefghData.comments) ? sefghData.comments.length : 0;

  const discussUrl = repoData.has_discussions ? `${repoData.html_url}/discussions` : `${repoData.html_url}/issues`;

  const meta = `flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[var(--l-muted)] ${styles.mono}`;

  return (
    <div className={`dark min-h-screen shrink-0 ${styles.root} ${fontClassName}`}>
      <HomeShell user={user} showSearch={false} title="Repository">
        {/* Header (H3) over faint rain (from H2) */}
        <section className="relative overflow-hidden px-4 pt-6 sm:px-8 lg:px-10">
          <ContributionRain className="pointer-events-none absolute inset-0 h-full w-full opacity-30" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 90% at 30% 40%, rgba(13,17,23,.95) 45%, rgba(13,17,23,.65) 80%, transparent), radial-gradient(35% 70% at 95% 0%, rgba(137,87,229,.25), transparent 70%), linear-gradient(transparent 70%, var(--l-bg))",
            }}
          />
          <div className="relative max-w-[1180px]">
            <Link
              href="/search"
              className={`mb-4 inline-flex items-center gap-1.5 rounded text-xs text-[var(--l-muted)] hover:text-[var(--l-ink)] ${styles.mono} ${styles.focusRing}`}
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden="true" /> Search
            </Link>
            <div className="flex items-center gap-3.5">
              {repoData.owner?.avatar_url ? (
                <Image
                  src={repoData.owner.avatar_url}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 shrink-0 rounded-[11px] border border-[var(--l-line)]"
                />
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] border border-[var(--l-line)] bg-[var(--l-surface)] text-base font-bold">
                  {owner[0]?.toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <h1 className={`truncate text-xl font-bold leading-tight sm:text-[26px] ${styles.display}`}>
                  {owner} / <span className="text-[var(--l-blue)]">{repoName}</span>
                </h1>
                <p className="mt-1.5 max-w-[720px] text-sm text-[var(--l-muted)]">
                  {repoData.description || "No description available"}
                </p>
              </div>
            </div>
            <div className={`mt-3.5 ${meta}`}>
              {repoData.language && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: LANG_COLORS[repoData.language] || "var(--l-muted)" }} aria-hidden="true" />
                  {repoData.language}
                </span>
              )}
              <span className="flex items-center gap-1.5"><StarIcon className="h-3.5 w-3.5" aria-hidden="true" />{formatCompactNumber(repoData.stargazers_count || 0)} stars</span>
              <span className="flex items-center gap-1.5"><GitForkIcon className="h-3.5 w-3.5" aria-hidden="true" />{formatCompactNumber(repoData.forks_count || 0)} forks</span>
              <span className="flex items-center gap-1.5"><EyeIcon className="h-3.5 w-3.5" aria-hidden="true" />{formatCompactNumber(repoData.watchers_count || 0)} watching</span>
              {repoData.updated_at && <span>updated {formatRelativeTime(repoData.updated_at).toLowerCase()}</span>}
            </div>
            <div className={`mt-4 flex gap-6 border-b border-[var(--l-line)] text-sm ${styles.mono}`} role="tablist" aria-label="Repository sections">
              {TABS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`flex items-center gap-2 py-3.5 ${styles.focusRing} ${
                    tab === value ? "text-[var(--l-ink)] shadow-[inset_0_-2px_0_var(--l-green)]" : "text-[var(--l-muted)] hover:text-[var(--l-ink)]"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                  {value === "comments" && commentCount > 0 && (
                    <small className="rounded-full border border-[var(--l-line)] px-1.5 text-[11px]">{commentCount}</small>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Two columns (L2) */}
        <div className="grid max-w-[1260px] items-start gap-6 px-4 pb-40 pt-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-10">
          <div className="min-w-0" role="tabpanel">
            {tab === "readme" && (
              <article className={`${styles.card} p-5 sm:p-7`}>
                {readmeLoading ? (
                  <div className="space-y-3" aria-busy="true">
                    <div className="h-6 w-1/3 animate-pulse rounded bg-[#161b22]" />
                    <div className="h-3.5 w-full animate-pulse rounded bg-[#161b22]" />
                    <div className="h-3.5 w-5/6 animate-pulse rounded bg-[#161b22]" />
                    <div className="h-24 w-full animate-pulse rounded bg-[#161b22]" />
                  </div>
                ) : readme ? (
                  <MarkdownRenderer content={readme} urlTransform={readmeUrlTransform(full)} />
                ) : (
                  <p className="py-10 text-center text-sm text-[var(--l-muted)]">
                    No README found.{" "}
                    <a href={repoData.html_url} target="_blank" rel="noopener noreferrer" className="text-[var(--l-blue)] hover:underline">
                      Open on GitHub
                    </a>
                  </p>
                )}
              </article>
            )}
            {tab === "video" && (
              <div className={`${styles.card} p-5 sm:p-6`}>
                <RepoVideoTab repoFullName={full} />
              </div>
            )}
            {tab === "comments" && (
              <div className={`${styles.card} p-5 sm:p-6`}>
                <RepoCommentsSection repoFullName={full} initialComments={sefghData.comments} />
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-4" aria-label="About this repository">
            <div className="relative">
              <Scout
                width={88}
                body={SCOUT_PURPLE}
                title=""
                className="pointer-events-none absolute -top-[40px] right-3 z-10 -scale-x-100 text-[#9198a1]"
              />
              <div className={`${styles.card} flex flex-col gap-3.5 p-5`}>
                <p className={styles.eyebrow}>About</p>
                <p className="text-sm text-[var(--l-muted)]">{repoData.description || "No description available"}</p>
                {repoData.topics?.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5" aria-label="Topics">
                    {repoData.topics.map((t) => (
                      <li key={t} className={`rounded-full bg-[rgba(56,139,253,0.1)] px-2.5 py-1 text-xs text-[var(--l-blue)] ${styles.mono}`}>{t}</li>
                    ))}
                  </ul>
                )}
                <ul className={`flex flex-col gap-2.5 text-[13px] text-[var(--l-muted)] ${styles.mono}`}>
                  <li className="flex items-center gap-2"><ScalesIcon className="h-3.5 w-3.5" aria-hidden="true" />{repoData.license?.name || "No license"}</li>
                  {repoData.default_branch && <li className="flex items-center gap-2"><GitBranchIcon className="h-3.5 w-3.5" aria-hidden="true" />{repoData.default_branch} branch</li>}
                  {repoData.created_at && <li className="flex items-center gap-2"><CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />created {formatDate(repoData.created_at, { month: "short" })}</li>}
                  {repoData.updated_at && <li className="flex items-center gap-2"><ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />updated {formatDate(repoData.updated_at, { month: "short" })}</li>}
                  <li className="flex items-center gap-2"><CircleIcon className="h-3.5 w-3.5" aria-hidden="true" />{formatCompactNumber(repoData.open_issues_count || 0)} open issues</li>
                </ul>
              </div>
            </div>
            <div className={`${styles.card} p-5`}>
              <RepoRatingSection repoFullName={full} initialRatings={sefghData.ratings} userRating={sefghData.userRating} compact />
            </div>
          </aside>
        </div>
      </HomeShell>

      {/* Floating action bar (A3): stays while the page scrolls */}
      <div
        role="toolbar"
        aria-label="Repository actions"
        className="fixed bottom-[84px] left-1/2 z-30 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-2 overflow-x-auto rounded-[14px] border border-[var(--l-line)] bg-[rgba(21,27,35,0.96)] p-2 shadow-[0_24px_60px_-20px_#000] md:bottom-6 md:ml-9"
      >
        <button
          type="button"
          onClick={() => setCanvasOpen(true)}
          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-[var(--l-radius-sm)] border border-white/10 bg-[var(--l-accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--l-accent-hover)] ${styles.focusRing}`}
        >
          <CodeIcon className="h-4 w-4" aria-hidden="true" /> Open code
        </button>
        <RepoCollectButton repoFullName={full} initialSaved={sefghData.userSaved} initialCount={sefghData.saveCount} compact className={iconBtn} />
        <a href={repoData.html_url} target="_blank" rel="noopener noreferrer" aria-label="Open on GitHub" title="Open on GitHub" className={iconBtn}>
          <ArrowSquareOutIcon className="h-4 w-4" aria-hidden="true" />
        </a>
        <a href={discussUrl} target="_blank" rel="noopener noreferrer" aria-label="Discuss on GitHub" title="Discuss on GitHub" className={iconBtn}>
          <ChatIcon className="h-4 w-4" aria-hidden="true" />
        </a>
        <span className="shrink-0">
          <RepoQRCode repoFullName={full} />
        </span>
        <span className="shrink-0 rounded-[var(--l-radius-sm)] border border-[var(--l-line)] px-1">
          <RepoVoteSection repoFullName={full} initialVotes={sefghData.votes} userVote={sefghData.userVote} />
        </span>
        <button type="button" disabled aria-label="Claim project (coming soon)" title="Claim project (coming soon)" className={`${iconBtn} cursor-not-allowed opacity-50`}>
          <SealCheckIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <MobileBottomNav user={user} />
      <RepoDrawer
        open={canvasOpen}
        onOpenChange={setCanvasOpen}
        repository={{ full_name: full, name: repoName, owner: { login: owner }, ...repoData }}
      />
    </div>
  );
}
