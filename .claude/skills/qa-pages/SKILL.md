---
name: qa-pages
description: Run page QA on the SEFGH web app - the signed-out walk-through script, browser probes, and read-only page-qa subagents against a local production build. Use when asked to QA, walk through, smoke-test or visually check pages, or to verify a UI change in the browser before a handoff.
---

# Page QA for SEFGH

QA here means a production build served locally, checked in a browser, with every finding written to the register. Follow AGENTS.md throughout: the writer flag applies if you will edit files (the register is a file).

## 1. Build and serve

- A new worktree has no `node_modules`: `npm ci` first.
- To touch no real data, build and serve with placeholder Supabase settings: `NEXT_PUBLIC_SUPABASE_URL=https://probe.invalid` and any non-secret placeholder for `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Signed-in pages then cannot be reached; say so in the result. Never copy values out of `.env.local`.
- `npm run build`, then serve on a port of its own so it cannot collide with a dev server: `npm run start -- -p 3100`. In Claude Code use the preview tool with a launch entry (`npm`, `run start -- -p 3100`, port 3100) instead of a shell, and stop it when done.
- A local production build has no Go backend unless you start one: routes that are served by Go answer 404 or fail locally (`/api/search` did on 2026-11-07). Record that as "not checked", not as a bug.

## 2. Scripted checks first (cheap, repeatable)

- All signed-out pages at 1280 px and 390 px: `node scripts/walkthrough.mjs http://127.0.0.1:3100 <report.json>`. It records exceptions, console and policy errors, failed and 4xx/5xx requests, sideways scrolling, and requests after the page settled. Write the report to a scratch folder, not the repository.
- Compare with a run on the base commit when you need to know what the change caused: the same errors in the same counts mean no regression.
- Feature probes, each documented at the top of its file: `scripts/keys-browser-probe.mjs` (playground keys, synthetic sessions), `scripts/trending-browser-probe.mjs`, `scripts/key-probe-zoom.mjs`.
- In Git Bash, prefix commands that pass `/api/...` arguments with `MSYS_NO_PATHCONV=1`.

## 3. Then look at what scripts cannot judge

Scripts do not see a wrong icon, a control covered by another element, or a label that lies. For those, use the `page-qa` subagent (`.claude/agents/page-qa.md`), which is read-only and runs on a cheaper model:

- Split the affected routes into groups and start one `page-qa` agent per group in a single message so they run in parallel. Three groups has been enough for a whole-site pass.
- Give each one the base URL, its routes, the widths (1280 and 390 unless the change says otherwise), and what changed.
- Their reports are claims. Re-check anything you will act on or record.

## 4. Record

- Every new bug goes into `docs/bug-register.md` in the same change, fixed or not. Search first (`rg -n "<keyword>" docs/bug-register.md`), then take the next free ID across all branches (the command is in AGENTS.md, "Bugs and broken UI/UX").
- In the handoff record, state the routes and widths actually loaded, what was only read in source, and what was not checked. Page QA by subagents is not a code review; do not call it one.
- Leave no server running.
