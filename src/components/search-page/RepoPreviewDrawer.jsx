"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { CodeExplorer } from "@/components/CodeExplorer";
import styles from "@/components/home/home.module.css";

/**
 * V2 (SEARCH-001): clicking a result slides a drawer over the right of the
 * results instead of splitting the page. The drawer is the existing Sheet
 * (focus trap, Esc, overlay) holding the existing CodeExplorer (details,
 * files, README, open on GitHub), plus an "Open repository" bar for the full
 * repo page. It renders in a portal, so it carries the page's palette and
 * font classes itself.
 */
export default function RepoPreviewDrawer({ repo, onClose, fontClassName = "" }) {
  const internal = repo?.full_name ? `/repo/${repo.full_name}` : null;
  return (
    <Sheet open={Boolean(repo)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className={`dark ${styles.root} ${fontClassName} flex w-full flex-col gap-0 border-l border-[var(--l-line)] p-0 sm:max-w-xl lg:max-w-2xl [&>button.absolute]:hidden`}
      >
        <SheetTitle className="sr-only">{repo?.full_name || "Repository"}</SheetTitle>
        <SheetDescription className="sr-only">Preview of the repository with its files and README.</SheetDescription>
        <div className="min-h-0 flex-1 overflow-y-auto">{repo && <CodeExplorer repository={repo} onClose={onClose} />}</div>
        {internal && (
          <div className="flex items-center gap-2 border-t border-[var(--l-line)] bg-[var(--l-surface)] p-4">
            <Link
              href={internal}
              className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[var(--l-radius-sm)] bg-[var(--l-accent)] text-sm font-semibold text-white hover:bg-[var(--l-accent-hover)] ${styles.focusRing}`}
            >
              Open repository <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
