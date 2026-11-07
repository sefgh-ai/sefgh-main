# Codex and Claude Code coordination

Last updated: 2026-11-05 (Asia/Calcutta), by Git Agent: merged BUG-071 (branch `claude/openrouter-nemotron-api-85b4d9`) into main.

## Start here

**New to this project, or picking up after 2026-10-29? Read [`next-agent-briefing.md`](next-agent-briefing.md) first**: the state, the work queue, the recipe for a fix, and the traps that cost time.

**The plan is Go, not Rust.** The owner decided this on 2026-10-11, after Codex's last session. The accepted plan is `adr/0002-go-backend.md`. `adr/0001-rust-backend.md` is superseded and must not be implemented.

If you last saw this project when the plan was Rust, read `../AGENTS.md`, then this file, then `adr/0002-go-backend.md`. The rest of this file tells you what was built while you were away and what needs your review.

## Current state

- **Branch:** `main` (active default branch). Work from `go-backend` was merged into `main` at `030d875` and pushed to `origin/main`. Future branches/worktrees can branch off `main` or `go-backend` (which is kept fast-forwarded and in sync).
- **Active writer:** none. Claude Code released SEARCH-001 (Search page redesign, 2026-11-07): committed on worktree branch `claude/home-redesign` (stacked on HOME-001 `81b515d`) and handed off after the owner's review. HOME-001 was committed and handed off earlier the same day. Merged ICON-001, LANDING-001 (PR #3), SESSION-HOOK-001 (PR #6), and GIT-PR-001/002 (PR #4) into main.
- **Stage:** Phase7 remains open. P7-01 through P7-06 and P7-08 are implemented; P7-09a completed the non-AI switch cleanup. P7-10a is documenting the current boundary before final closure. P7-07 and the AI part of P7-09 stay parked behind R-038/R-213. Exactly4Next API handlers remain:3AI and legacy keys, plus retained auth callback/session proxy outside the API count. Eleven migrated data areas have no direct fallback; legacy playground business-data calls and managed Auth/Postgres/Storage/Realtime remain. Keys hosted acceptance, avatar R-095, worker/corpus and signing gates are unchanged. Source progress is separate from deployment/live acceptance. Read [current boundary inventory](migration-boundaries.md) and the newest handoff; older dated progress/route-count records below are historical.

## Handoff: SEARCH-001 Search page redesign (Claude Code, 2026-11-07)

Status: **implementation complete; local checks passed; owner reviewed the layout preview and approved the commit (2026-11-07); committed in one task commit on `claude/home-redesign`; unreviewed by another agent; not deployed**. Owner Claude Code. Branch `claude/home-redesign`, on top of HOME-001 (`81b515d`, not yet in `main`). It reuses Home's shell and fonts, so the owner's one-worktree rule kept it in this worktree rather than a new one. `npm run handoff` run on the commit. Owner decision (2026-11-07): the old UI is retired only once the redesign is finished, and deployment stays the owner's call; agents do not deploy.

What: `/search` rebuilt on the approved design-system picks (SEFGH Design System, "Search page" cards), inside Home's rail. The search itself is unchanged: `useGitHubSearch` still drives `/api/github/search`, filters, pages, history saving and the 30-minute cache.
- **Before searching (E2):** "Find a repository", the bar, two platform numbers from `platform_stats` (as the old banner read them; "—" if unavailable), and six "Try a search" cards that run their query.
- **Bar (B2 + B3):**
  - The mode is a narrow "Scout ▾" chip inside the bar (same three modes; only UI state, as before), plus the existing AI enhance-query button.
  - One panel holds AI suggestions (same `/api/ai/suggestions` call, 300 ms debounce) and recent searches (same history source, top 5, filtered by the typed text).
  - A small switch turns AI suggestions off, remembered as `sefgh.searchSuggestions`; history stays either way.
  - Keys: "/" focuses the bar, ↑/↓ move through the panel, Enter picks, Esc closes.
- **Filters (F1):** the old navbar's language, stars, updated (dateRange), license and sort, as chips. Active chips turn blue, with Clear all. Behaviour change: a filter **the user changes** now re-runs the current search; the old navbar only applied filters on the next search. Filters restored from the cache do not trigger a request.
- **Understood as (Q1):** one line from the existing `analyzeQuery`, now exported from `QueryUnderstandingPanel.jsx`; nothing else in that file changed.
- **Results (R1/R2/R3):** Rows, Cards or Table behind a switch, remembered as `sefgh.searchView` (default Rows), with the old pagination rules and the "GitHub shows the first 1,000 results" note. No match score is shown: the search API does not return one.
- **Preview (V2):** a result opens a Sheet drawer (focus trap, Esc, overlay) holding the existing `CodeExplorer`, plus an "Open repository" bar linking to `/repo/owner/name`. This replaces the split pane. Star and Ask AI from the mock-up are not added: the app has no add-star call in use, and chat's acceptance of a starting question is unverified. `CodeExplorer` keeps its own look (theme tokens in the dark scope).
- **Shell:** `HomeShell` takes `showSearch` and `title`, so Search hides the top-bar search and time tabs; Home is unchanged. `DynamicIslandNav` is also hidden on `/search`. The small site `Footer` is dropped here, as on Home.
- The old Search components (`SearchBox`, `SearchNavbar`, `SearchResults`, `SearchStats`, `PopularSearches`, `SearchNavGuide`, `SearchHeader`, `ViewToggle`, `SearchFilters`) are no longer used by `/search` but remain in the repo.

Changed files: `docs/coordination.md`, `src/app/search/page.js`, `src/components/home/HomeShell.jsx`, `src/components/navigation/DynamicIslandNav.jsx`, `src/components/search/QueryUnderstandingPanel.jsx` (export only); new `src/components/search-page/` (`SearchView.jsx`, `SearchBar.jsx`, `SearchFilterChips.jsx`, `SearchResultsViews.jsx`, `RepoPreviewDrawer.jsx`).

Checks (Claude Code):
- `npm run lint` passed. One justified `eslint-disable-next-line react-hooks/exhaustive-deps`, with a comment: the filter re-run must depend on filters only.
- `npm run test:contracts` 732/732.
- `npm run build` passed (48/48), with placeholder public Supabase values.
- Browser (`next start` on 3108, started from this worktree) at 1440px and 375px. The search API and AI suggestions were fed sample responses in the browser only. Verified:
  - before-search state, with narrow chip and button;
  - suggestion panel and keyboard pick (one request);
  - Rows, Cards and Table views, with the choice remembered;
  - a Language chip change re-runs exactly one request with `language=Rust`;
  - Clear all appears;
  - the drawer opens with the Open repository link, Esc closes it, and the Sheet's duplicate close button is hidden;
  - the suggestions switch off is remembered and shows the history-only note;
  - no overflow at 375px.

Not verified: real search, suggestions and history data (no `.env.local`); `CodeExplorer` content (GitHub is not reachable from this local preview); `platform_stats` numbers.

Next: Git Agent synchronization of `claude/home-redesign` (HOME-001 + SEARCH-001); then the next page (Repo details suggested). After the last page, a bounded clean-up task removes the old, unused UI components. Rollback: revert the commit.

Writer released: yes. No processes left running (the local preview server was stopped).

## Handoff: HOME-001 Home page redesign (Claude Code, 2026-11-07)

Status: **implementation complete; local checks passed; owner reviewed the running page and approved commit and handoff (2026-11-07); committed in one task commit on `claude/home-redesign`; unreviewed by another agent; not deployed**. Owner Claude Code. Branch `claude/home-redesign` (worktree `.claude/worktrees/home-redesign`, created from `main` at `423a8d4` because the app would not merge `main` into the old LANDING-001 worktree: a protected `.claude/settings.json` change needed an origin confirmation that did not take). The old worktree `design-system-extraction-805583` was unregistered and its merged branch deleted; Windows refused to delete its folder (files in use), so `.claude/worktrees/design-system-extraction-805583` is a leftover folder to remove. `idea-planning-d33343` has uncommitted ADR-0003 work and was left alone. Resulting commit: the HOME-001 commit on `claude/home-redesign`; `npm run handoff` run on it.

What: `/home` rebuilt on the approved design-system direction (SEFGH Design System artifact, "Home page" cards), always dark like the landing page:
- **Shell:** a 72px icon rail by default that expands to a 232px labelled sidebar with a Submit nudge, remembered in `localStorage` (`sefgh.homeSidebar`). Top bar: time tabs, search with ⌘K/Ctrl+K, `NotificationBell`, avatar or Sign in. `DynamicIslandNav` is now also hidden on `/home`. Starred and History show only when signed in, as before.
- **Header:** "Welcome back, <first name>." (signed out: "Discover projects."), with three numbers: new projects this week matching the user's preferences, starred count (`/api/repo/starred`), and total searches (search-history count). Any failed value shows "—".
- **One card with a two-way switch** (clock / sliders): "Continue where you left off" shows opened repositories and recent searches; "Sharpen your feed" shows topics followed out of 5, with Add topics (opens the existing PreferencesDialog) and Later. Default is Sharpen until this browser has opened any repository, then Continue. A manual choice is remembered (`sefgh.homePanel`) and wins.
- **Opened repositories:** SEFGH stores no repository visits, so the owner chose browser-only storage. The repo page renders `RecordRepoVisit`, which keeps the last 10 in `localStorage` (`sefgh.recentRepos`). It is per device and cleared with site data. No database change.
- **Topics:** a column (chips on small screens) from preferences or live categories with counts, plus "+ edit preferences".
- **Feed:** the existing projects query per time tab, the same filtering and Load more, as a dense table (project, language, stars, views, age). Clicking Stars, Views or Age sorts the rows loaded so far (descending, then ascending, then off). Rows open `/repo/owner/name`, or the GitHub URL in a new tab, as the old cards did. There is no per-row save button: the app has no add-star API in use, and none was invented.
- **Right rail:** the profile card shows a GitHub-style graph of **searches per day** over 18 weeks (owner's choice; built from the newest 1000 saved searches), level and title, the contributions bar, followers, projects, View profile and Log out. About keeps Feedback · Business · Links. Signed out, a Sign in card shows instead.
- **Fonts:** the shared Commit font module is now `src/lib/fonts/commit.js`, used by both `/` and `/home`.
- Kept: AutoOnboarding, PreferencesDialog, MobileBottomNav.
- Dropped from `/home`: the small site `Footer` on md+ (not in the approved design). `TopicsNav`, `ProjectsFeed`, `ProjectCard`, `UserProfileCard`, `AboutCard` and `CategoriesSidebar` are no longer used by `/home` but remain in the repo.

Changed files: `docs/coordination.md`, `src/app/page.js`, `src/app/home/page.js`, `src/app/repo/[owner]/[repo-name]/page.js`, `src/components/navigation/DynamicIslandNav.jsx`; new `src/lib/fonts/commit.js`, `src/lib/home/recentRepos.js`, `src/hooks/home/useHomeActivity.js`, `src/hooks/home/useStoredChoice.js`, `src/components/repo-details/RecordRepoVisit.jsx`, and in `src/components/home/`: `HomeView.jsx`, `HomeShell.jsx`, `HomeWelcome.jsx`, `HomeTopics.jsx`, `HomeProjectTable.jsx`, `HomeProfile.jsx`, `home.module.css`. Not for commit: `.claude/launch.json` (local preview config).

Checks (Claude Code):
- `npm run lint` passed.
- `npm run test:contracts` 732/732. The first run failed `date-format` (a tooltip used a non-en-IN date); fixed by using the shared `formatDate`/`formatRelativeTime`.
- `npm run build` passed (48/48), with placeholder public Supabase values because the worktree has no `.env.local`.
- Browser (`next start`), checked at 1440, 1280 and 375px:
  - shell, rail/sidebar toggle and persistence;
  - the Continue default with stored repositories, and Sharpen for a new visitor;
  - signed-out profile card;
  - no horizontal overflow at 375px.
- Fixed during the check:
  - the island covered the top bar;
  - the top-bar tabs did not hide on phones (a module `display` beat `hidden`), so Sign in overflowed;
  - the table squeezed to 426px at 1280px with the sidebar open (the profile column now waits for 2xl then).
- The table, topics, sorting and topic filtering were checked by feeding sample `projects`/`categories` rows to the page's `fetch` in the browser only; no live data was read.

Not verified: real data (no `.env.local`; signed-in numbers, real search graph, real feed), PreferencesDialog in the dark scope, and keyboard-only use beyond the focus rings.

Next: Git Agent synchronization; then check the page with real data (signed-in numbers, search graph, feed); the next page through the design-system flow. Optional: remove the now-unused old Home components; delete the leftover `design-system-extraction-805583` folder. Rollback: revert the commit.

Writer released: yes. No processes left running.

## Handoff: ICON-001 replace Lucide/Heroicons with Phosphor (Claude Code, 2026-11-07)

Status: **implementation complete; local checks passed; committed on branch `claude/icon-001-phosphor` and opened as a PR into main (owner request, 2026-11-07); not reviewed; not merged; not deployed.** Owner Claude Code; no independent reviewer (page QA by three read-only subagents is not a code review). Base `2a4db97`. Resumed from the 2026-11-06 checkpoint below.

Result: the app uses `@phosphor-icons/react` 2.1.10 only; `lucide-react` and `@heroicons/react` are removed. Mapping and the reasoning for every former Sparkles site: [`icon-mapping.md`](icon-mapping.md). Page QA (subagents, production build on localhost:3100) found further icons that did not match their labels; fixed here: repo "Issues" Bug, "Claim Project" SealCheck, Security "Sign out of this device" SignOut, "Priority Support" Headset, "Clear Search History" Broom, versions 2.0 PaintBrush, about Code/Heart, careers "Sustainable Pace" Leaf, status Search API MagnifyingGlass / Auth LockKey / Notifications Bell, contact "Response Time" Timer, links Discord DiscordLogo / Changelog ClockCounterClockwise, LogoMarquee Projects Package / Lines of Code Code, sidebar and mobile "Playground" Code, "Sign In" SignIn, sidebar CTA RocketLaunch, header "Submit" UploadSimple, navbar "Trending Projects" TrendUp, island "API" BracketsCurly. `shrink-0` added to squeezed icons (help, research, EditorsChoice, SearchNavGuide). Unused Phosphor imports pruned across `src/`.

Bugs: R-216 (lint scanned `.claude/worktrees/*/.next`) fixed by adding `.claude/**` to `eslint.config.mjs` ignores. R-217 (DynamicIslandNav covers navbar triggers at 800–1440px) recorded, open, not caused by this task.

Checks by Claude Code: `npm run build` exit 0 (run before and after the QA fixes); `npm run lint` exit 0; `npm run test:contracts` 732/732 pass (before QA fixes; they changed only JSX icons). Browser recheck after rebuild: /status, /help, /research, /trending, /search show 0 `.lucide` and no non-square icons. Not verified at runtime: authenticated pages (chat, playground, settings, profile, notifications, onboarding) and repo details; these were checked by reading source only. `/api/search` returned an HTML 404 on the local production server, so search result cards were not seen; not investigated.

Changed files: 126 `src/` files from the migration plus QA fixes, `package.json`, `package-lock.json`, `eslint.config.mjs`, `docs/icon-mapping.md` (new), `docs/bug-register.md`, `docs/coordination.md`. Untracked `.claude/launch.json` (local preview config, not part of the task; do not commit unless the owner wants it). image.png rule unchanged.

Next: PR review and merge; run `npm run handoff` after merge. Rollback: discard the working-tree changes or revert the commit.

Writer released: yes. No processes left running.

## Handoff: BUG-072, fix synthetic playground probe and ESLint ignore (Git Agent, 2026-11-07)

Status: **implementation complete; local checks passed; committed to main; not deployed.** Writer Git Agent. Base commit `77f4d5a`.

Resolves R-221:
- `scripts/keys-browser-probe.mjs`: added proxy intercept for `location.origin` with `/api/data/(notifications|profiles)/` returning `Response.json([])`. Verified all three viewport checks (desktop, phone, zoom200) pass cleanly.
- `eslint.config.mjs`: added `.claude/**` to `globalIgnores` so agent worktree artifacts do not trigger false lint failures. Verified `npm run lint` passes with 0 errors / 0 warnings.
- `npm run test:contracts`: 732/732 passed.
- Go backend: 39 test suites, vet, and gofmt all passed.

Writer released: yes. No processes left running.

## Handoff: GIT-PR-002, CI failure on pull requests 4 and 5 (Claude Code, 2026-11-07)

Status: **complete (diagnosis and documentation only); the CI failure itself is not fixed; unreviewed.** Writer Claude Code; reviewer unassigned. Branch `claude/arch-002-research-001-on-main` (pull request 4), base `585fd20`. Resulting commit: the commit on this branch that adds this record. The owner asked to leave the fix to the Git Agent.

Findings, from `gh pr checks` and the Actions logs:

- **`verify` (Backend verification):** fails in "Show-once playground" with `unapproved API/data access`; the playground requests `/api/data/notifications/rest/v1/notifications`. Same failure on `main` pushes since 2026-11-05 and on pull requests 2 to 5, so neither pull request caused it. Registered as R-221. `keys-postgres` passes.
- **Vercel – sefgh-main / sefgh-api:** "Deployment was blocked: Git author Adeel0-0 must have access to the project on Vercel". Commits authored with the owner's Git email are linked to the GitHub user `Adeel0-0`, who is not a member of the Vercel team; only `github-actions[bot]` commits deploy (for example `2a4db97`). Also on `main`'s `e7cc5a8` and pull request 3. Not a code problem: the owner adds `Adeel0-0` to the Vercel team, or commits use an identity that has access. No account setting was changed.

Checks (Claude Code): `git diff --check` clean; R-221 has six cells and is the only row with that ID. Not run: `npm run handoff` (this worktree has no `node_modules`), and the probe locally.

Next: the Git Agent or the next writer fixes R-221 (decide whether the playground should request notifications, then fix the page or the probe's allow-list, with a check that would catch it again), then reruns CI on pull requests 4 and 5. The owner decides on Vercel access.

Writer released: yes. No processes left running.

## Handoff: GIT-PR-001, pull requests for unmerged branches (Claude Code, 2026-11-07)

Status: **complete (Git maintenance and documentation only); unreviewed; nothing merged or deployed.** Writer Claude Code; reviewer unassigned. Branch `claude/arch-002-research-001-on-main`, base `2a4db97` (`origin/main`). Resulting commit: `aedbf83` and this record update, on pull request 4 (https://github.com/sefgh-ai/sefgh-main/pull/4); not merged into `main`. Hugeicons: pull request 5 (https://github.com/sefgh-ai/sefgh-main/pull/5).

The owner asked for pull requests for the work that has not reached `main`. Local branches compared with `origin/main` (`git cherry`, `git merge-tree`):

- `claude/app-architecture-docs-e15497` (ARCH-002 `1c0c496`, RESEARCH-001 `08e6c83`): 122 commits behind, conflicts in `docs/bug-register.md` and `docs/coordination.md`, and its register IDs R-202 to R-206 were taken on `main` meanwhile. Rebuilt here on `main` instead of merging: the research folder copied unchanged except the ID in `report.md`; the five rows renumbered to the next free IDs, R-202→R-216, R-203→R-217, R-204→R-218, R-205→R-219, R-206→R-220, each saying so; the two handoff records below copied with the same renumbering. R-220 notes that AI-PROVIDER-001 has since made the provider selectable while the default endpoint is still GitHub Models. The original branch and worktree are left untouched.
- `feat/hugeicons-migration` (`e050fe3`, `b289714`, worktree `D:/SEFGH/sefgh-hugeicons`): 173 behind, merges with `main` without conflicts; pushed and opened as its own pull request unchanged.
- `claude/design-system-extraction-805583`: already pull request 3 (LANDING-001); nothing done.
- `claude/frontend-redesign-ae522b`: its two commits are already on `main` as the Git Agent's rebase (`git cherry` marks both `-`); no pull request. Its worktree has uncommitted changes (`docs/coordination.md`, `design-system/`) owned by another session; not touched.

Checks (Claude Code): `git diff --check` clean; the five new rows have six cells each; register IDs unique (no other row uses R-216 to R-220). Not run: `npm run lint`, `npm run build`, `npm run handoff` (no code changed on this branch; the hugeicons branch is code and was not built locally, its CI on the pull request is the first check).

Next: the owner or a reviewer reviews and merges the two pull requests; the hugeicons one needs `npm run lint` and `npm run build` on its merge result before merging.

Writer released: yes. No processes left running.

## Handoff: RESEARCH-001, technology research for the pipeline (Claude Code, 2026-10-26)

Status: **complete, research and documentation only; a recommendation, not a decision; unreviewed.** Writer Claude Code. Branch `claude/app-architecture-docs-e15497`, base `1c0c496`. Resulting commit: the commit on this branch that adds this record, R-220 and `docs/research/pipeline-technology-2026/`, made by Claude Code at the owner's request; not merged into `main`. Interrupted once by a PC shutdown and resumed from the research agents' saved transcripts.

The owner asked for deep research on new technology to improve RepoSync, the RepoAnalysers and the architecture: open-weight models, "repomix but better", Vercel eve (if free) and evals for decisions D1 to D8, and other launches. Owner's answers: research both eve and evals; models free first, with $300 of Google Cloud credits and a small physical server later; "build it for easy switch and smooth CI/CD".

Done:

- **Notes:** [`research/pipeline-technology-2026/notes/`](research/pipeline-technology-2026/notes/): `open_models_and_inference`, `repo_packing`, `agents_and_eve`, `evals`, `embeddings_and_search`, `data_and_product`, `hosting_and_cicd`, and `verification_platform_changes` (five platform claims checked against GitHub's and Vercel's own pages).
- **Report:** [`research/pipeline-technology-2026/report.md`](research/pipeline-technology-2026/report.md), sent to the owner as "New technologies for SEFGH pipeline". The notes and the report were moved there from the working directory on the owner's request. Recommendations, in order: a standard-library Go model gateway on the OpenAI-compatible API, configured per role, using Apache-licensed open-weight models served by several hosts (Gemma 4, gpt-oss, Qwen3.5/3.8, Granite 4.2); a deterministic Go "digest d1" from GitHub GraphQL/REST replacing `npx repomix@latest` (pin 1.18.1 only as a stopgap for R-199); a Go retrieval-evaluation harness (graded labels, nDCG@10, paired t-test, cross-family LLM judge calibrated on owner labels) gating D3 and D4 in CI, rather than eve, whose evals test agents; Qwen3-Embedding-0.6B first on the D3 shortlist at 768-dim `halfvec`; no reranker until measured; a stateless, read-only MCP server (spec 2026-07-28), OpenAPI and `llms.txt`; one distroless image per Go command, `SEFGH_<ROLE>_*` settings, leases ticked by pg_cron, Workload Identity Federation to Google Cloud; activate the 90-day $300 credit only after the eval tooling exists. eve fits only as an optional TypeScript analyst agent.
- **Verified platform changes:** GitHub Models retired 2026-07-30 (both implementations still call the Azure host, which no longer resolves); stargazer listing limited to admins and collaborators in July 2026; `GET /repos/{o}/{r}/stargazers/history` added 2026-09-04 (net daily counts); synchronous SBOM export removed 2026-11-13; Go 1.27.3 is a security release (`backend/go.mod` pins 1.27.2); Vercel's Go runtime still beta.
- **Register:** R-220 (High): AI chat and chat titles fail because GitHub Models is retired; suggestions fall back to built-in terms; enhance-query unaffected. Needs the owner's provider choice and a contract change in both implementations. 206 entries.

Checks (Claude Code): `git diff --check` clean; R-220 parses with six cells, 206 rows; `node --test` on `internal-paths`, `profile-columns`, `docs-claims`, `handoff-state`: 15/15 pass. Not run: `npm run handoff` (this worktree has no `node_modules`; no code changed). R-220 was not reproduced on the deployed site.

Noticed, not changed: the report writer found that `src/lib/github-api.js` is imported by a client component, where `GITHUB_TOKEN` is undefined, while R-048 says the token is never sent; only `src/app/api/trending/refresh/route.js` still sends it. Worth a look when R-220 is fixed.

Next: the owner chooses a replacement for GitHub Models (R-220), and answers D1 to D8 with the report in hand. Then the first bounded tasks would be the model gateway with the R-220 contract change, and digest d1 with a 50-query pilot label set.

Writer released: yes. No processes left running.

## Handoff: ARCH-002, architecture atlas and four register entries (Claude Code, 2026-10-24)

Status: **complete, documentation only; unreviewed.** Writer Claude Code. Branch `claude/app-architecture-docs-e15497` (a worktree), base `942c30b`, clean before claim. Resulting commit: uncommitted.

The owner asked for a complete breakdown of the app: what it is, HLD and LLD, every folder and roughly every file, every built or planned feature, every service, with diagrams.

Done:

- **Atlas, outside the repository.** A private claude.ai page, `https://claude.ai/artifact/FFU6jfyWptWawdMUjiZop2`, built from this repository's documents and source at `942c30b`: what SEFGH is; promised versus real; a system diagram of today; every deployable unit, worker and vendor; the Go switch (routes and data areas) as a diagram; sign-in, signed-in Go write and chat as sequence diagrams; the folder map; every API route with its Go package, switch, case count and state; the Go packages; the User-DB model; every feature with its state and open entries; the search pipeline today against the HLD target; phases and cutover steps; the whole register, filterable; decisions D1 to D8 and owner actions; a fix order. It restates existing documents and proposes nothing new; `hld.md`, `lld.md`, `backend-map.md` and this file stay the source of truth. Its source HTML is in the session scratchpad, not committed.
- **Register:** R-216 (High: `/status` shows invented service health), R-217 (High: `/about` shows invented users, index size and milestones), R-218 (Medium: page metadata, `manifest.json` and `llms.txt` promise semantic, natural-language search that is not connected), R-219 (Medium: the chat microphone button against `Permissions-Policy: microphone=()`; **not tried in a browser**). All four need the owner. 205 entries.

Checks (Claude Code): `git diff --check`; the four new rows have six cells each and parse with the rest of the register (205 rows: 95 open, 108 fixed, 1 deferred, 1 in progress); no links added. The atlas's script passed `node --check`; its tags balance. `node --test` on `internal-paths`, `profile-columns`, `docs-claims` and `handoff-state`: 15/15 pass. **Not run:** `npm run handoff` and the full contracts, because this worktree has no `node_modules` (the route harnesses need Next.js installed) and no code changed; the Go backend, since no Go changed. **Not checked:** the atlas rendered in a browser (local files cannot be screenshotted here; Mermaid renders only on claude.ai).

Next: the owner answers R-216 to R-219 with the decision pack (removing the invented figures is a React change); confirm R-219 in Chrome first. The atlas can be committed as `docs/architecture/atlas.html` if the owner wants it beside the HLD.

Writer released: yes. No processes left running.

## Handoff: BUG-071 reasoning budget for the AI routes (Claude Code, 2026-11-04)

Status: **implementation complete; local checks passed; merged into main (2026-11-05); not deployed**. Owner Claude Code; no reviewer ran. Branch `claude/openrouter-nemotron-api-85b4d9` (desktop-app worktree `.claude/worktrees/openrouter-nemotron-api-85b4d9`), base `63bff68`. Merged into `main` with `learn-go/` excluded per TUTORIAL-REMOVE-001 policy.

Result: R-214 fixed. `SEFGH_AI_REASONING_EFFORT` (`none`, `minimal`, `low`, `medium`, `high`, `xhigh`, or `default` for no field) is sent as the OpenAI-standard top-level `reasoning_effort` by chat, suggestions, chat titles, and enhance-query when it uses the shared provider. The OpenRouter preset defaults to `none`; GitHub Models, Gemini, Groq and custom send nothing unless it is set, so every contract-recorded request is unchanged. A paid `OPENAI_API_KEY` for enhance-query never gets it. An invalid value is a provider setting error (logged `ai_provider`, routes use their fallbacks). The `ai_provider` start-up log line now includes `reasoning_effort`. R-213 (Gemini, owner-parked) is cross-referenced, not changed: whether Gemini honours the setting is untested. New R-215 (open, Low): chat titles always request model `gpt-4o`, so non-GitHub providers most likely always use the fallback title; found by reading source, not fixed here.

Checks by Claude Code: the new tests failed before the fix (compile errors; `TestOpenRouterAsksForNoReasoning` saw no `reasoning_effort`). After it, uncached `go test -count=1 ./...` passed, `go vet ./...` passed, `gofmt -l .` printed nothing. Local live recheck against OpenRouter's free `nvidia/nemotron-3-ultra-550b-a55b:free`: suggestions `ai-powered` in 2.9 s, enhance-query `ai-powered` in 3.0 s. Normal `npm run handoff` passed contracts and Go test/vet/gofmt.

## Handoff: TUTORIAL-REMOVE-001 remove the learn-go tutorial (Claude Code, 2026-11-05)

Status: **implementation complete; required local checks passed; unreviewed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `63bff68`. Resulting commit: `9f37e27` (synchronized by Git Agent on main and go-backend).

- **Owner request (2026-11-05):** remove `learn-go/` completely; the owner has a local copy and it does not contribute to the code. This supersedes the tutorial policy in AGENTS.md and the ADR.
- **Removed:** `learn-go/` (242 tracked files), `scripts/contracts/learn-go-index.test.mjs`, `scripts/contracts/handoff-lessons.test.mjs`.
- **Code:** `scripts/agent-handoff.mjs` drops `--lessons`, the lesson step and the `learnGo*` signal/status fields (steps renumbered). `.github/workflows/backend-verification.yml` drops the `verify_lessons` input and lesson step.
- **Docs:** AGENTS.md tutorial section replaced by a removal note; ADR (route recipe step, decisions row, TUTORIAL-REMOVE-001 section, old policy marked superseded); briefing; migration boundaries; backend README (recipe step, CI note, two lesson links); analysis-search-workers plan (lesson link). Historical records mentioning lessons are unchanged.
- **Checks (Claude Code):** Node contract tests 732/732 (two lesson-only test files removed); `npm run lint` exit 0; `git diff --check` clean. No Go source changed. `npm run handoff` below.

Rollback: revert this commit.

Next: P7-07 remains parked behind R-038/R-213.

Writer released: yes. No processes left running.

## Handoff: P7-10a current migration boundaries (Codex, 2026-11-03)

Status: **bounded documentation and read-only review complete; source/link/diff checks passed**. Owner Codex; reviewer review_p7_10a. Branch main, base `c236f71`. Resulting commit: `5ceb8c4` (synchronized by Git Agent on main and go-backend). Pre-existing untracked image.png preserved byte-identical, excluded from this task's commit and synchronization.

Scope/result: current migration-boundaries.md inventories4remaining NextAPI handlers (3AI/legacy keys), auth/session/UI, fixed origin-required routes,3AI selectors, independent website/Go v1 gates,9policy proxy plus2dedicated data areas, legacy direct playground calls, managed services, workers/corpus and residual helper. Linked backend-map/cutover/backend README/ADR/briefing/plan to it and clarified current progress. Hosting guide rewritten for current source without presenting old platform pricing/quotas as verified. Cutover old instructions explicitly archived; backend traffic instructions updated and older port instructions marked historical. Public-repository contract README correctly describes retained executable helper/page-adapter tests. No source/Go/fixture/lesson/exercise edit; no bug behavior/status changed.

Review: first pass found Important competing old switch rollback/direct fallback instructions and Minor9versus11policy wording. Corrected both; independent recheck accepted with no remaining Critical/Important issue. Also corrected the optional stale backend README sentence about the deleted Next search fixture runner. Reviewer ran no tests/live probes. Parent accepts declined-to-judge boundaries: hosted settings/deployment/AI/provider behavior/keys acceptance/signing/RLS/SQL/avatar/workers/corpus/platform pricing require separate evidence; no gate is waived. Pre-existing image.png was not opened/modified/staged.

Checks by Codex:50new/rewritten local Markdown links resolve;0broken. Source assertions verify exact4API handlers, exact3AI selectors, retained exact v1UI gate and no GO_DATA reader. All10task files Markdown only; source/Go/fixtures/scripts/config/lessons unchanged. `git diff --check` passed; only CRLF normalization advisories. image.png remains untracked and SHA256 matches initial `28c896c095ca37635a05671b4132758c692142a800b1674d752411aa6ff787d3`. Lint/build intentionally not run under AGENTS docs-only rule. Normal `npm run handoff` passed contracts and uncached Go test/vet/gofmt, lessons skipped-owner-policy; precommit tree `999d23495f6c3a61fe512eaa6f227cbcb02fb8be4ef3e8119a384eccb3fdee55` was READY_VERIFIED with no remaining lease. Final handoff will verify the committed fingerprint after this bookkeeping. No owned processes; no deployment/live mutation/provisioning/signing/push/CI by this task. No new hosted observation; dated production receipts remain attributed.

Changed files (explicit task staging list; never include image.png):

```text
backend/README.md
contracts/public-repository-reads/README.md
docs/adr/0002-go-backend.md
docs/backend-map.md
docs/coordination.md
docs/cutover.md
docs/hosting-setup.md
docs/migration-boundaries.md
docs/next-agent-briefing.md
docs/plans/phase7-retirement.md
```

Writer released: yes. P7-10a documentation prepares the boundary gate; P7-07, AI remainder/P7-09 and final P7-10 closure stay open. Keys hosted acceptance, R-095, worker/consolidation/signing gates unchanged. Rollback of this docs-only task: revert its one commit; runtime behavior is unaffected. Next concrete actions: commit only these10files once, then final handoff on committed fingerprint. Future implementation starts with R-038/R-213 evidence before P7-07; update final boundaries after remaining code steps. Do not use a generic continue as a waiver of gates.

## Checkpoint: P7-10a current migration boundaries (Codex, 2026-11-03)

Status: **in progress / incomplete**. Owner Codex; read-only reviewer pending. Branch main, base/current `c236f7167173e202991ba55da0104a5a2ac5fa61`; task uncommitted. Previous writer released; handoff lease absent (READY_NEEDS_VERIFY). Initial tracked diff empty; only pre-existing untracked image.png, SHA256 `28c896c095ca37635a05671b4132758c692142a800b1674d752411aa6ff787d3`. Preserve byte-identical; never stage/commit/synchronize it for this task.

Objective: bounded P7-10a, document current Next.js/Go/Supabase/worker boundaries and remaining gates. P7-07 is parked behind R-038/R-213; P7-09 remains partial. This prepares the P7-10 documentation gate without closing Phase7. No application/Go/fixture/lesson/exercise changes, AI retirement, key activation/provisioning, signing, SQL, live writes or deployment. Scope: new current inventory, backend-map, cutover, hosting guide, backend README, ADR, briefing, plan, public-repository contract README, coordination.

Source audit: exactly4 remaining API handlers (3AI and legacy keys), plus auth callback/session proxy. Only3AI route names remain in next.config.mjs; topics/fixed data routes require origin, v1 forwarding retains exact UI flag plus origin. Data routing intercepts listed tables/RPC only; legacy playground api_keys/api_limits/api_logs remain direct. Managed Auth/Storage/Realtime stay. Public-repo Node suite still executes helper/adapter checks, so its fixture-only banner is stale. Documentation-only checks: source/reference/link/diff checks and normal handoff (contracts and uncached Go test/vet/gofmt); lint/build intentionally omitted under AGENTS docs-only rule. No checks run yet beyond read-only audit/preflight; no owned processes. Two speculative source-path reads were missing (go-client.js, plans/migration-closeout.md); do not cite them. Next: write inventory, correct current operational guidance, independently review, verify, release and one task commit.

Milestone1: current boundary inventory written and linked from backend-map/cutover/backend README/ADR/briefing/plan. Hosting guide now states actual3AI selectors, fixed routing, retained v1 gates and commit-based rollback; old platform prices/quotas are not repeated as current facts. Public-repo contract README now accurately describes executable retained helper/page-adapter tests and removed starred tests. No source/runtime/fixture edits. New inventory records test-only direct-GitHub helper residue without deleting it. Checks/review/handoff remain pending; no owned processes. Next: source/link validation and read-only review before normal handoff. P7-07/P7-09/Phase7 remain open.

Milestone2 before long verification: source assertions passed (exact4API handlers, exact3AI selectors, v1 UI gate, no GO_DATA reader);45new/rewritten local links passed with0broken (plus the current-state link added afterwards). Changed files are Markdown only; src/Go/fixtures/scripts/config/lessons untouched. image.png remains untracked with its original hash. Diff whitespace passed; line-ending normalization advisories only. Independent read-only review is in progress; no tests or hosted checks claimed by reviewer. No owned processes. Next: incorporate review, final reference checks, complete/release handoff record, normal npm run handoff (contracts + uncached Go test/vet/gofmt, lessons skipped), exactly one explicit10file documentation commit and final handoff fingerprint check. Lint/build intentionally not run for docs-only scope. R-038/R-213 and remaining gates unchanged.

Review corrections: reviewer found Important competing rollback/fallback instructions in undated cutover/backend README sections and Minor nine-versus-eleven policy wording. Cutover's entire old runbook remainder is now explicitly archived; backend's traffic section is rewritten for fixed routes/AI3/v1 gates and its later port notes explicitly historical, including the stale page selector. Inventory distinguishes9shared-policy proxy areas from2dedicated handlers. Original dated evidence preserved. Parent rules: hosted state/AI/keys/SQL/avatar/workers/platform pricing require their separate evidence and are outside this source-only task; no gates waived. Next: reviewer recheck and final local-link/source/diff checks, then normal handoff.

## Handoff: P7-09a non-AI route-name switches (Codex, 2026-11-03)

Status: **bounded implementation and read-only review complete; required local checks passed**. Owner Codex; independent read-only reviewer review_p7_09a, no findings. Branch main, operative base `7f153e0`. Resulting commit: `7688bca` (synchronized by Git Agent on main and go-backend). Pre-existing untracked image.png preserved byte-identical, excluded from this task's commit and synchronization.

Owner scope: remove only trending-topics and playground-keys-v1 route-name opt-ins. Topics is now fixed/origin-required. New v1 paths keep exact NEXT_PUBLIC_SEFGH_KEYS_V1=1 and origin requirements. All3AI switches/handlers and SEFGH_GO_ROUTES reading remain until P7-07/R-038/R-213; partial P7-09 only. Legacy /api/playground/keys handler/UI remain. Go SEFGH_KEYS_V1, accountant/policy/capability checks unchanged; no runtime/contract/UI code changed. No real key/user/token/RPC provisioning, signing, live writes, deployment or hosted activation/acceptance.

Audit/preflight: topics caller is trending-topics.js through useTrendingData; v1 client keys-client.mjs uses owner/session and API-key request boundaries under the existing UI flag. Production GETs observed topics200/Go; website v1 paths404 without Go marker, direct Go v1404/no-store. These observations are consistent with disabled v1 but do not establish internal settings or hosted acceptance. Receipt `verification/p7-09a-routing-2026-11-03.json` separates remote preflight and local results. New gated-v1 forwarding cleanup is not retirement/cutover of legacy keys; no gate is waived.

Changes: next.config.mjs only application configuration change: topics fixed list, remove redundant v1 route-name condition, retain UI/origin and allAI gates. Updated routing tests/probes, docs/ADR/plan/briefing/hosting/backend map/readme and lesson47/index. No Go, contract, UI, legacy handler or exercise/solution edits. Keys production localhost receipt refreshed in keys-routing.json with source/executable hashes. Old source/route-name descriptions in earlier records are historical. Rollback is revert this step's one commit and redeploy the website.

Checks by Codex:2new switch-removal guards failed before edits;2existing AI/origin/legacy invariants already passed. Final focused11/11passed. Full `npm run lint` passed0errors/warnings; `npm run build` passed48static outputs. Full `npm run test:contracts`737/737passed. Full uncached `go test -count=1 ./...`, `go vet ./...`, empty `gofmt -l .` passed, including disabled/misconfigured v1 runtime coverage. Production localhost topics --topics2/2matched direct Go without old name. Keys routing probe with route-name setting empty passed5checks: issuance, metadata-only list, encoded/accounted search, failed completion withheld/recovery saved, revocation denied provider work. Exercised Auth/RPC/provider addresses and credentials are local/synthetic; child/Next environment inheritance is disclosed, not claimed isolated. Both probes cleaned all owned children. Doc links/diff whitespace, source boundary and image-hash preservation checks passed. Existing baseline/caniuse age advisories only. Lesson checks skipped-owner-policy, not passed. Normal npm run handoff passed contracts and Go test/vet/gofmt, lessons skipped; READY_VERIFIED matched precommit tree44916b6fc31f. Final normal handoff will reverify completed bookkeeping and the committed fingerprint. This does not authorize staging/synchronizing image.png.

Review accepted with no Critical/Important/Minor finding. Review did not run tests or establish hosted settings/accountant/SQL/RLS/policy/browser acceptance, AI function, deployment/signing or unobserved cleanup; parent executed local checks and cleanup above. Rulings: keep exact UI/Go gates, preserve legacy/AI boundaries, partial P7-09a source cleanup is separate from activation, and local fixture proof does not replace hosted acceptance. No new bug behavior discovered or register status closed.

Actual working tree at this handoff (image.png is PRE-EXISTING/UNOWNED, exclude from commit/synchronization):

```text
 M backend/README.md
 M docs/adr/0002-go-backend.md
 M docs/backend-map.md
 M docs/coordination.md
 M docs/cutover.md
 M docs/hosting-setup.md
 M docs/next-agent-briefing.md
 M docs/plans/phase7-retirement.md
 M docs/verification/keys-routing.json
 M learn-go/47-wiring-gated-routes/README.md
 M learn-go/README.md
 M next.config.mjs
 M scripts/contracts/go-forwarding-probe.mjs
 M scripts/contracts/go-rewrites.test.mjs
 M scripts/keys-routing-probe.mjs
?? docs/verification/p7-09a-routing-2026-11-03.json
?? image.png
?? scripts/contracts/non-ai-switch-retirement.test.mjs
```

Writer released: yes. No owned processes; temporary API executable remains in OS temp, not running. Source task uncommitted at record, no push/CI/deployment by this task. Next: stage/commit only the explicit17task files (never image.png), then normal handoff on the committed fingerprint. The resulting P7-09a commit is the one containing this record (explicitly uncommitted when written); retrieve its hash from Git history. AI remainder/P7-07 stays parked at R-038/R-213; do not call P7-09 or Phase7 wholly complete or remove SEFGH_GO_ROUTES yet.

## Checkpoint: P7-09a non-AI route-name switches (Codex, 2026-11-03)

Status: **in progress / incomplete**. Owner Codex; reviewer unassigned. Branch main, base/current `c4ce38526791e163f2573882f4291748ca66cba6`; uncommitted. Previous writer released, verification lease absent; only pre-existing untracked `image.png` before claim (SHA256 `28c896c095ca37635a05671b4132758c692142a800b1674d752411aa6ff787d3`). Preserve it byte-identical and exclude it from staging/commit/Git Agent synchronization. Source diff initially empty; status READY_NEEDS_VERIFY reflects that unrelated file, not a held lease.

Objective: the owner's limited P7-09 instruction: remove trending-topics and playground-keys-v1 opt-in names from SEFGH_GO_ROUTES. Trending topics becomes fixed/origin-required. New v1 keys forwarding keeps NEXT_PUBLIC_SEFGH_KEYS_V1=1 and Go origin requirements; Go SEFGH_KEYS_V1/accountant/policy gates unchanged. Legacy plaintext keys handler/UI path and all three AI switches/handlers stay. This is bounded P7-09a, not full P7-09 completion; AI residue waits for P7-07/R-038/R-213.

Scope: next.config.mjs, routing regressions/probes, current docs/ADR/lesson references and receipt. No Go runtime/contract changes expected. Use this record as durable ledger. Existing plan's per-route Go preflight applies to trending; keys v1 is gated new-endpoint forwarding cleanup, not retirement/activation of legacy keys. Observe production safely before edits and record limits. No key/users/tokens/RPC provisioning, signing, live writes, SQL, deployment, secrets or image edits. Required checks pending: audit/preflight, regressions, lint/build/contracts/Go/probes/handoff. No owned processes. Next: exact caller/gate audit and read-only production GETs; write failing route-gate tests, then minimal source change.

Milestone1: caller/gate audit and read-only production receipt complete. Topics200/Go. Website v1 paths404 without Go marker; direct Go v1 paths404/no-store, consistent with disabled runtime but not its internal configuration/hosted acceptance proof. No payload/credential/state copied. Current v1 UI callers use keys-client; UI pages/header remain gated. Legacy keys and Go runtime files untouched.

Milestone2: source change limited to next.config.mjs: fixed topics rewrite, v1 routing drops route-name requirement while keeping exact UI/origin gates; AI map unchanged. Two switch-removal regressions failed before edits; AI and origin/legacy invariants already passed. After edits all4new guards and focused routing/scanner/topics11/11pass. Probe keys environment now has empty SEFGH_GO_ROUTES; generic forwarding probe has --topics scope and omits its old topic name. Docs/ADR/plan/lesson47/index updated for partial P7-09a and retained activation gates. No Go/contract/UI runtime changes; existing image.png preserved/excluded. Next: final diff/reference checks, lint/build/full contracts/Go, local production topics and keys probes, independent review, handoff/one commit. All uncommitted, no owned processes.

Milestone3 before long checks: lint passed0ESLint errors/warnings (existing baseline-data advisory only), focused11/11passed, diff whitespace passed. `git diff --exit-code -- src backend/cmd backend/internal contracts` confirms no UI/legacy handler, Go runtime or contract edits. image.png hash matches the initial checkpoint and it remains excluded from this task. No owned processes. Remaining: production build, full Node/Go checks, local production topics probe and gated v1 lifecycle/accounting probe with no route names, read-only review, handoff and one explicit-path commit. Probe will refresh keys-routing.json with current secret-free localhost receipt; no signing/live keys operation. All task changes currently uncommitted.

Current working tree (image.png is pre-existing/unowned and MUST NOT be staged/synchronized for this task):

```text
 M backend/README.md
 M docs/adr/0002-go-backend.md
 M docs/backend-map.md
 M docs/coordination.md
 M docs/cutover.md
 M docs/hosting-setup.md
 M docs/next-agent-briefing.md
 M docs/plans/phase7-retirement.md
 M learn-go/47-wiring-gated-routes/README.md
 M learn-go/README.md
 M next.config.mjs
 M scripts/contracts/go-forwarding-probe.mjs
 M scripts/contracts/go-rewrites.test.mjs
 M scripts/keys-routing-probe.mjs
?? docs/verification/p7-09a-routing-2026-11-03.json
?? image.png
?? scripts/contracts/non-ai-switch-retirement.test.mjs
```

Milestone4 / base drift: build passed48static outputs; four AI/legacy-key API handlers remain in the build as intended. Git Agent finished a previously started P7-08b synchronization during this task: HEAD moved from c4ce385 to7f153e0c94dd4c87b28c8dd9c671a4773a4773cf, rewriting the prior implementation id7bcf69a tofadea0c and timestamp history. Direct tree comparison shows only LAST_UPDATED.txt and docs/coordination.md metadata differ between bases; no src/backend/scripts/contracts/next.config changes. Our edits and ownership preserved; prior coordination stamp already reconciled tofadea0c. Operative base is7f153e0; keep original base/checkpoint as history. Reviewer notified with this evidence. No reset/clean/stash/rebase performed by Codex. Next: full Node contracts, Go/probes and final verified handoff; image still untracked/excluded.

Milestone5 before long Go/probe operation: full `npm run test:contracts`737/737passed; build48static outputs and lint passed. Operative HEAD7f153e0 remains stable, task source/runtime/contract diff boundaries unchanged. Independent read-only review_p7_09a accepted limited scope with no Critical/Important/Minor finding; it did not execute tests or establish hosted/runtime/AI acceptance. Next: uncached Go suite/vet/gofmt, compile API under OS temp, production localhost --topics probe and keys lifecycle/accounting routing probe with route setting empty. These use only synthetic exercised credentials/stand-ins and will clean own children. No servers running now. User image preserved/excluded. Final handoff and one explicit-path commit pending; no activation/deployment/signing changes.

## Handoff: P7-08b data-proxy areas always through Go (Claude Code, 2026-11-03)

Status: **implementation complete; required local checks passed; unreviewed; not deployed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `e9c5667`. Resulting commit: `fadea0c` (synchronized by Git Agent on main and go-backend).

- **Production prerequisite:** all nine areas answered from Go on 2026-11-02 (P7-08a check). Receipt `verification/p7-08b-data-proxy-2026-11-03.json`.
- **Code:** `src/lib/supabase/data-routing.js`: `routedFetch` sends every proxied table to `/api/data/{area}` with no setting and no 404 fallback; `serverRoutedFetch` without SEFGH_GO_API_URL answers proxied requests with a Data API-shaped 503 (`SEFGH503`) and never sends them to Supabase. `src/lib/supabase/server.js`: no `goData` option; every server client is routed. The repository page and the sign-in callback call `createClient()`. `src/lib/go-areas.mjs`: `usesGo` removed. `next.config.mjs`: `dataProxyGoRoutes` joins the unconditional, origin-required rewrites; `goDataAreas` and the NEXT_PUBLIC_SEFGH_GO_DATA reading are gone.
- **Server clients audit:** besides the two routed callers, the playground-keys handler touches only `api_keys` (not proxied) and `src/lib/ai/session.js` only Auth; the test now lists all four and checks both claims. The write scan covers route handlers too (no new proxied writes found).
- **Tests:** `data-proxy.test.mjs` rewritten for always-on routing (7/7). `go-rewrites.test.mjs` drops the data-switch test; proxy paths are fixed. New `data-proxy-retirement.test.mjs` (2 tests: rewrites regardless of the setting; nothing in `src/` or `next.config.mjs` reads the setting or `usesGo`; fails when the rewrite is dropped, restored byte-identical). All Node contract tests 733/733.
- **Probe:** `--data-proxy` scope; the probe no longer sets NEXT_PUBLIC_SEFGH_GO_DATA. `--production --data-proxy` 6 of 6 identical.
- **Docs:** backend map, cutover, briefing, Phase 7 plan, ADR row, browser-data plan, hosting setup, backend README. No Go change, so no lesson.
- **Owner action (optional, after deployment):** delete `NEXT_PUBLIC_SEFGH_GO_DATA` from `sefgh-main`; nothing reads it.

Checks (Claude Code): Node contract tests 733/733; `npm run lint` exit 0; `npm run build` exit 0. `npm run handoff` below.

Rollback: revert this step's commit and redeploy the website.

Next: P7-09, limited to the trending-topics and playground-keys-v1 switches while P7-07 is parked.

Writer released: yes. No processes left running.

## Handoff: P7-08a browser search history and onboarding (Claude Code, 2026-11-02)

Status: **implementation complete; required local checks passed; unreviewed; not deployed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `3830ef4`. Resulting commit: `6875136` (synchronized by Git Agent on main and go-backend).

- **Scope:** P7-08 split in two (plan updated). P7-08a: the two areas with their own Go endpoints. P7-08b: the nine data-proxy areas and the server-side `goData` option.
- **Production prerequisite** (GET, no credentials): `/api/search-history` and `/api/onboarding` 401 with `X-Sefgh-Backend: go`; all nine proxy areas also answer from Go. Receipt `verification/p7-08a-browser-data-2026-11-02.json`.
- **Owner context:** AI is parked (owner, 2026-11-02). R-213 recorded: the search helpers get no usable AI answers with the Gemini key, cause not established (logs unreadable here). P7-07 waits for R-038 and R-213.
- **Code:** `src/lib/go-data.js` keeps `askGo` and `goResult`; a 404 is an ordinary failure; `usesGo`, `NOT_SERVED` and `resultFrom` removed. `search-history.js` and `onboarding.js` ask only Go and no longer create a Supabase client. `resetOnboarding` removed: nothing imported it and it referenced an undefined `supabase` (contract boundary note, Phase 7 list). `next.config.mjs`: `browserDataGoRoutes` joins the unconditional, origin-required rewrites; the two names left `goDataAreas`.
- **Removed:** `scripts/contracts/record-search-history.mjs`, `scripts/contracts/record-onboarding.mjs` (they ran the direct path). Contracts and Go unchanged.
- **Tests:** the two module tests drop the direct-path runs, run every case through Go with the area switched off, and require a missing route to behave like a refusal with no direct database call (135/135). New `browser-data-retirement.test.mjs` (2 tests; fails when the rewrite is dropped and when a module imports the Supabase client again; restored). `go-rewrites.test.mjs` uses proxy areas as data-switch examples.
- **Probe:** `--browser-data` scope; `--production --browser-data` 13 of 13 identical through Next.js and direct. The probe no longer lists the two names in NEXT_PUBLIC_SEFGH_GO_DATA.
- **Docs:** backend map, cutover, briefing, Phase 7 plan, ADR Phase 7 row, browser-data plan, both contract READMEs, register R-213. No Go change, so no lesson.

Checks (Claude Code): focused Node tests 152/152, then the guard 2/2 after a lint rename. `npm run lint` exit 0 (first run caught the variable name `module` in the new guard; renamed). `npm run build` exit 0. First `npm run handoff` failed in `internal-paths.test.mjs`: it turns fixed rewrites into patterns and did not know the `:path*` form, now in the fixed list for the first time; taught it (`:name*` matches the rest of the path), 3/3, lint 0. Second `npm run handoff` below.

Rollback: revert this step's commit and redeploy the website.

Next: P7-08b.

Writer released: yes. No processes left running.

## Handoff: AI-PROVIDER-001 free-tier AI providers (Claude Code, 2026-11-02)

Status: **implementation complete; required local checks passed; unreviewed; not deployed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `2d989e4`. Resulting commit: `ab55b91` (synchronized by Git Agent on main and go-backend).

- **Owner request:** use any free-tier model, not only OpenAI and Anthropic. The owner added `GEMINI_API_KEY` to `sefgh-api`, which nothing read.
- **Finding (R-212, High):** `sefgh-main` already forwards all three AI routes to Go, and `sefgh-api` has no `GITHUB_TOKEN`, so production chat cannot reach a model. Recorded; fixed by this task once deployed.
- **Change (Go only; the Next.js AI handlers are the rollback, retired in P7-07, per fix-once):** new `backend/internal/aiprovider/config.go` `FromEnv` chooses GitHub Models, Gemini, Groq, OpenRouter or a custom OpenAI-compatible service from `SEFGH_AI_PROVIDER` or the first key set; `SEFGH_AI_MODEL` replaces the model. `Client.Model` carries it. `aiMux` wires chat and suggestions to it, and enhance-query uses it when neither OpenAI nor Anthropic key is set (`aienhance.Handler.OpenAIModel`). A half-configured choice is logged and calls nobody. The provider error text no longer says GitHub. With only `GITHUB_TOKEN` set, chat and suggestions are unchanged and enhance-query now also asks GitHub Models instead of the word lists.
- **Contracts:** unchanged. The contract cases construct the handlers directly; no pinned request changes.
- **Tests:** `config_test.go` (11 choice cases; the client's model reaches the request). `ai_wiring_test.go`: a Gemini key alone serves all three routes and goes only to its address; a paid OpenAI key still decides enhance-query; OpenRouter without a model calls nobody. `aiServer` clears the new variables. The free-key test fails when the client is pointed back at `GITHUB_TOKEN`; restored byte-identical.
- **Docs and lesson:** backend README configuration table, register R-212, new lesson 49 (choosing a provider) and the index. Lesson solution passed once with `-tags solution`; the exercise ships unfinished.

Checks (Claude Code): `gofmt -l .` empty; `go vet` and `go test -count=1` for `internal/aiprovider`, `internal/aienhance`, `internal/aichat`, `internal/aisuggestions`, `cmd/api` ok. `npm run handoff` below.

Not verified: the default Gemini model name against Google's live list, and any real provider call. Owner action: redeploy `sefgh-api`; if chat still fails, set `SEFGH_AI_MODEL` to a current free Gemini model.

Rollback: revert this task's commit and redeploy `sefgh-api`.

Next: owner redeploys `sefgh-api`; one signed-in chat; R-038 check; P7-07. P7-08 may proceed independently.

Writer released: yes. No processes left running.

## Handoff: P7-06 avatar upload retirement (Claude Code, 2026-11-02)

Status: **implementation complete; required local checks passed; unreviewed; not deployed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `dbeb930`. Resulting commit: `848d62f` (synchronized by Git Agent on main and go-backend).

- **Production prerequisite** (no credentials, no file): `POST /api/upload-avatar` answers 401 and `GET` 405, both with `X-Sefgh-Backend: go`. Receipt `verification/p7-06-avatar-2026-11-02.json`. A signed-in upload, deployment and hosted rollback are not established here.
- **Caller audit:** only `src/components/AvatarUpload.jsx` calls the path, through `fetchWithSession` (bearer). Nothing else imported the handler except its test and recorder.
- **R-095:** the avatar plan requires every upload writer to honour Go's lock; the Next handler did not. With it retired, Go is the only writer once deployed. Hosted insert atomicity, lock permissions and signed-in replacement remain rollout gates; R-209 recovery stays manual (CLOSEOUT-001).
- **Removed:** `src/app/api/upload-avatar/route.js`, `scripts/contracts/record-upload-avatar.mjs` and `scripts/contracts/avatar-fixture.mjs` (used only by those two). 66 `next_*` fields (60 `next_expect`, 6 `next_engine_message`) dropped from `contracts/upload-avatar/cases.json`; layout kept (checked: the new lines are the old lines in order), JSON otherwise unchanged, version stays 6.
- **Tests:** `upload-avatar.test.mjs` keeps fixture integrity plus "no Next.js-only expectations". New `avatar-retirement.test.mjs` (2 tests; fails with the route left out of the fixed list, restored byte-identical). `go-rewrites.test.mjs` uses `ai-chat` and `ai-suggestions` as switch examples.
- **Routing:** `next.config.mjs` adds `avatarGoRoutes` to the unconditional, origin-required rewrites and drops the `upload-avatar` switch. Remaining switches: `ai-suggestions`, `ai-enhance-query`, `ai-chat`, `trending-topics`.
- **Probe:** `go-forwarding-probe.mjs` gains `--avatar`. Its avatar stand-in follows Go's current upload (R-211, avatar part): a GIF signature body, non-overwriting lock and upload, lock release by `DELETE`, profile `PATCH`; the wrong-type case now sends bytes that are not an image, since Go ignores the label (R-094). Random file names are normalized. `--production --avatar`: 5 of 5 identical through Next.js and direct, with expected statuses.
- **Docs and lessons:** backend map, cutover, briefing, plan, ADR Phase 7 row, backend README, contract README, `docs/database/avatar-storage.md`, lesson 31 and the index, register R-095 and R-211. Exercises and solutions untouched; lesson checks skipped by policy.

Checks (Claude Code): focused Node tests 16/16 (upload-avatar, avatar-retirement, go-rewrites, interaction-retirement, user-read-retirement, profile-columns). `go test -count=1 ./internal/avatar ./cmd/api` ok. `npm run lint` exit 0. `npm run build` exit 0 (no `/api/upload-avatar` route). `npm run handoff` below.

Rollback: revert this step's commit and redeploy both projects.

Next: P7-07 (AI routes) only after the owner confirms AI keys on sefgh-api and R-038 is checked; otherwise P7-08.

Writer released: yes. No processes left running.

## Handoff: P7-05 repository-interaction retirement (Claude Code, 2026-11-02)

Status: **implementation complete; required local checks passed; unreviewed; not deployed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `4a3acba`. Resulting commit: `b6a5f1b` (synchronized by Git Agent on main and go-backend).

- **Production prerequisite** (GETs only, no credentials): collect, vote, rating, comments and videos reads answer 200 and a comment vote without an id 400, all with `X-Sefgh-Backend: go`. Receipt `verification/p7-05-interactions-2026-11-02.json`. Signed-in writes, deployment and hosted rollback are not established here.
- **Caller audit:** the repository page's components call the six paths through `fetchWithSession`; nothing else imported the handlers except their tests and recorders.
- **Removed:** `src/app/api/repo/{collect,vote,rating,comments,comments/vote,videos}/route.js` and `scripts/contracts/record-{repo-collect,repo-vote,repo-rating,comment-vote,repo-comments,repo-videos}.mjs`. Every `next_*` field dropped from the six contracts (124 in all; each file's layout kept, JSON otherwise unchanged). Shared `route-db-fixture`, `route-db-loader` and `collect-fixture` stay (shares, keys, avatar).
- **Tests:** the six Node tests keep fixture integrity plus a "no Next.js-only expectations" check; the vote test's `next_expect` check became "Go never calls `get_repo_vote_stats`" (R-076). `profile-columns.test.mjs`: the R-075 `username` and R-040 admin-lookup exception lists are empty (both handlers gone). New `interaction-retirement.test.mjs` (2 tests; fails with the routes left out of the fixed list, restored, identical SHA-256). `go-rewrites.test.mjs` uses `ai-chat` and `upload-avatar` as the remaining switch examples.
- **Routing:** `next.config.mjs` adds `interactionGoRoutes` to the unconditional, origin-required rewrites and drops the six switch names.
- **Probe:** `go-forwarding-probe.mjs` gains `--interactions`; its video delete stand-in now answers an owner-filtered delete that asks for the row (R-211 partly aligned; it had answered an empty 204, which the current Go correctly treats as not found). `--production --interactions`: 36 of 36 identical through Next.js and direct.
- **Docs and lessons:** backend map, cutover, briefing, plan, ADR Phase 7 row, backend README, six contract READMEs, lessons 25, 27 and 29 and the index, register R-211. Exercises and solutions untouched; lesson checks skipped by policy.

Checks (Claude Code): focused Node tests all pass (collect, vote, rating, comment-vote, comments, videos 2/2 each; profile-columns 4/4; interaction-retirement 2/2; user-read-retirement 2/2; go-rewrites 4/4; share-retirement 3/3; public-read-retirement 5/5). `npm run lint`, `npm run build`, `npm run handoff` below.

Rollback: revert this step's commit and redeploy both projects.

Next: P7-06 (`upload-avatar`).

Writer released: yes. No processes left running.

## Handoff: P7-04 user-read retirement (Claude Code, 2026-11-02)

Status: **implementation complete; required local checks passed; unreviewed; not deployed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `6c1dd41`. Resulting commit: `c356ab1` (synchronized by Git Agent on main and go-backend).

- **Production prerequisite** (GETs only, no credentials): `/api/activity` and `/api/repo/starred` answer 401 with `X-Sefgh-Backend: go` for no bearer and a fake bearer. Receipt `verification/p7-04-user-reads-2026-11-02.json`. Signed-in reads, deployment and hosted rollback are not established here.
- **Caller audit:** the profile's usage card and the starred page call both paths through `fetchWithSession`; nothing else in `src/`, `scripts/` or `backend/` imported the handlers except the tests and helpers removed below.
- **Removed:** `src/app/api/activity/route.js`, `src/app/api/repo/starred/route.js`, `scripts/contracts/{activity-fixture,activity-loader,starred-fixture,starred-loader,record-repo-starred}.mjs`. `next_expect` dropped from all 16 activity cases (the file keeps one case per line; JSON otherwise unchanged).
- **Kept, made standalone:** `backend/internal/activity/node_test.go` compares Go with the R-059 JavaScript reference on 400 generated inputs; that reference used to start from the Next.js handler's answer. `activity-model.mjs` now builds the signed-in answer's status, headers and query itself (`activityAnswer`), and `activity-run.mjs` no longer imports the handler. Before removal, with the handler restored from `HEAD`, the standalone reference was identical to the handler-based one on all 400 inputs (dumped from the Go generator's fixed seed). Go: 400/400 pass; with one colour threshold changed in the reference, 101 cases fail (restored, identical SHA-256). The test no longer needs `node_modules`.
- **Routing:** `next.config.mjs` adds `userReadGoRoutes` to the unconditional, origin-required rewrites and drops the `activity` and `repo-starred` switch names. New `scripts/contracts/user-read-retirement.test.mjs` (2 tests): both paths forward whatever `SEFGH_GO_ROUTES` says, no handler or Next-only helper exists, no origin means no rewrite; it fails with the routes left out of the list (restored, identical SHA-256). `go-rewrites.test.mjs`, `go-forwarding-probe.mjs` (new `--user-reads` scope), `usage-activity.test.mjs` comment updated. `activity.test.mjs` and `repo-starred.test.mjs` keep fixture integrity only; `public-repository-reads.test.mjs` loses its four starred-handler tests and uses `route-loader.mjs`.
- **Docs and lessons:** backend map, cutover, briefing, plan, ADR Phase 7 row, backend README, the two contract READMEs, lesson 23 and the lesson index. Exercises and solutions untouched; lesson checks skipped by policy.

Checks (Claude Code, Windows, Go 1.27.2, Node 24.22.0): focused Node tests (activity 4/4, repo-starred 1/1, public-repository-reads 32/32, user-read-retirement 2/2, go-rewrites 4/4, usage-activity 4/4, share-retirement 3/3, public-read-retirement 5/5); `go test -count=1 ./internal/activity`, `go vet`, `gofmt -l` empty; isolated production forwarding probe `--production --user-reads`: 6 of 6 identical through Next.js and direct. `npm run lint`, `npm run build` and `npm run handoff` below.

Rollback: revert this step's commit and redeploy both projects.

Next: P7-05 (repository interactions: collect, vote, rating, comments, comment votes, videos), one route per task if large.

Writer released: yes. No processes left running.

## Handoff: P7-03 share route retirement (Codex, 2026-11-02)

Status: **implementation and read-only review complete; required local checks passed**. Owner Codex, independent read-only reviewer review_p7_03. Branch `main`, base `18b921e`. Resulting commit: `0c34898` (synchronized by Git Agent on `main` and `go-backend`). Previous writer released and initial tree/verification lease clean.

Production Go prerequisite passed with GETs only: synthetic missing share404, fork405/Allow POST, conversation-share405/Allow DELETE,POST; all carried X-Sefgh-Backend: go. Receipt `verification/p7-03-shares-2026-11-02.json` separates these remote observations from local verification. No real share payload, credentials or mutation. This does not establish live authenticated sharing/forking/removal, two-user RLS/browser acceptance, deployment or hosted rollback.

Caller audit: shared page uses fetchWithSession for share read/fork; ShareDialog uses it for create/delete. Unused browser shares.js has no imports (SQL/history references only); ShareDialog's deleteShare is its own callback. Removed3Next handlers, that orphan browser module, share-fixture/share-loader and3legacy recorders. Shared server/client/session helpers remain used elsewhere. Existing client URLs and session headers stay intact. Go runtime code changed only in explanatory comments. All92cases (21read/23fork/48conversation-share), their order/IDs and Go-relevant values are unchanged against base; only next_* rollback fields removed. Reviewer independently verified the same projections. Node endpoint suites retain substantive credential/ownership/path/cache/shape fixture guards.

Share paths now have unconditional origin-required rewrites; old share-token/share-fork/conversation-share names are ignored. Without SEFGH_GO_API_URL they are404; local development needs a local Go server or sefgh-api. Docs, ADR/register/briefing/plan and lessons24/30/index reflect retirement; exercise.go/solutions untouched. Rollback is revert this step's one commit and redeploy both projects; a switch cannot restore deleted handlers. No later Phase7 step is included.

Checks by Codex:3new retirement guards failed before edits, then focused fixture/routing/scanner18/18passed. `npm run lint` passed0errors/warnings. `npm run build` passed,57static outputs and retired share entries absent in built manifest. Full `npm run test:contracts`1172/1172passed. Full uncached `go test -count=1 ./...`, `go vet ./...` and empty `gofmt -l .` passed. Compiled API in OS temp. Isolated production localhost --shares probe17/17passed with all3old share switches omitted; direct/via-Next replies and relevant upstream behavior agree, including synthetic authenticated writes/fork/revocation, encoded paths and wrong-method requests. All owned children stopped. Added doc links, unchanged exercises/contract projections and `git diff --check` passed. Existing baseline/caniuse age advisories only. Lesson tests skipped by owner policy, not claimed passed. Normal `npm run handoff` passed contracts and Go test/vet/gofmt, lesson checks skipped; READY_VERIFIED matched precommit tree833711fcf043. One final normal handoff will reverify this completed bookkeeping and the committed fingerprint; consult its matching signal before synchronization.

R-211: aligned the share revocation stand-in to current Go behavior (owner-filtered PATCH records revocation, subsequent bounded SELECTid returns empty list). Scope --shares passed. Video/avatar stale stand-ins remain open; full optional probe was not rerun or claimed accepted. No app behavior was changed to match a fake. Prior R-211 initial150scenario failure evidence remains attributed to P7-02.

Review: no Critical/Important finding. Minor optional tooling follow-up: wrong-method local probe cases currently compare parity without independently pinning405/Allow; existing Go mux tests and production receipt cover method behavior. This is test strengthening, not an identified app regression. Prior P7-10 documentation follow-ups remain. Rulings/evidence boundaries: preserve shared session helpers and Go behavior; missing-origin fallback stays404; live authenticated/browser/external-consumer/CI/synchronization/rollback proof is not inferred from local/source checks. The no-origin404 behavior is configuration/source guarded, not a separate runtime production-server acceptance run.

Actual changed files (all P7-03; uncommitted when recorded):

```text
 M backend/README.md
 M backend/internal/shares/handler.go
 M backend/internal/sharetoken/contract_test.go
 M backend/internal/sharetoken/handler.go
 M contracts/conversation-share/README.md
 M contracts/conversation-share/cases.json
 M contracts/share-fork/README.md
 M contracts/share-fork/cases.json
 M contracts/share-token/README.md
 M contracts/share-token/cases.json
 M docs/adr/0002-go-backend.md
 M docs/backend-map.md
 M docs/bug-register.md
 M docs/coordination.md
 M docs/cutover.md
 M docs/next-agent-briefing.md
 M docs/plans/phase7-retirement.md
 M learn-go/24-optional-sign-in/README.md
 M learn-go/30-defaults-and-missing-values/README.md
 M learn-go/README.md
 M next.config.mjs
 M scripts/contracts/conversation-share.test.mjs
 M scripts/contracts/go-forwarding-probe.mjs
 M scripts/contracts/go-rewrites.test.mjs
 M scripts/contracts/public-read-retirement.test.mjs
 D scripts/contracts/record-conversation-share.mjs
 D scripts/contracts/record-share-fork.mjs
 D scripts/contracts/record-share-token.mjs
 D scripts/contracts/share-fixture.mjs
 M scripts/contracts/share-fork.test.mjs
 D scripts/contracts/share-loader.mjs
 M scripts/contracts/share-token.test.mjs
 D src/app/api/conversations/[id]/share/route.js
 D src/app/api/share/[token]/fork/route.js
 D src/app/api/share/[token]/route.js
 D src/lib/supabase/shares.js
?? docs/verification/p7-03-shares-2026-11-02.json
?? scripts/contracts/share-retirement.test.mjs
```

Writer released: yes. No owned servers/processes; temporary API executable remains in OS temp, not running. No push/CI/deployment or live share write performed by this task. Signing remains stopped; no key, worker or database change. Next: create the single completed P7-03 commit containing this record, then final handoff on the committed fingerprint. The resulting commit is the one containing this record (explicitly uncommitted when written); retrieve its hash from Git history. Then P7-04 only; do not start P7-07 without owner AI-key confirmation and R-038 checks.

## Checkpoint: P7-03 share route retirement (Codex, 2026-11-02)

Status: **in progress / incomplete**. Owner Codex; reviewer unassigned. Branch `main`, base/current `18b921e6c9d621849450179e9ddf9e2dad397724`; uncommitted. Initial tree clean, previous writer released and IDLE_CLEAN/no lease verified. Objective: P7-03 only, one commit, following `plans/phase7-retirement.md`.

Scope: Next handlers for share read, fork and conversation share; helpers imported by nothing; corresponding Next-only tests/expectations; preserve Go implementations, cases, authorization and all share semantics. Make these rewrites unconditional when Go origin configured. Audit callers and production Go prerequisite before deleting code. Read-only production GET probes only: synthetic nonexistent share token, wrong-method GET for fork/conversation share (expect405/Allow), no production mutation/auth material.

Completed: current instructions, briefing/map/ADR/review/register, prior handoff/status and plan read. No implementation edit yet. Checks not run: full caller/helper audit, production proof, regressions, lint/build/contracts/Go/probe/handoff. No failures or owned processes. R-211 full optional probe has known stale fixtures; only share fixture compatibility within this step may be adjusted, other domain issues stay open. Signing/keys/workers/database untouched. Next: caller/helper audit and secret-free production receipt, then failing retirement guards and source/test/docs edits. This record is the durable execution ledger; checkpoint after each milestone and before long checks.

Milestone1: production Go prerequisite passed for all3routes using GET only: synthetic missing share404, fork405/Allow POST, conversation-share405/Allow DELETE,POST; Go marker on all. Receipt `verification/p7-03-shares-2026-11-02.json`. Caller audit: shared page read/fork and ShareDialog create/delete use fetchWithSession. No imports of src/lib/supabase/shares.js (SQL/history references only); removed it. Shared server/client/session helpers remain for current callers. No share content or credentials stored; no live write.

Milestone2: deleted3Next handlers, unused browser shares helper, share-fixture/share-loader and3legacy recorders. Retained92Go cases (21read/23fork/48conversation-share); removed only next_* fields and converted Node endpoint suites to integrity. Origin-required unconditional share rewrites preserve existing patterns; removed3old route names. New retirement3/3failed before edits and now passes; focused fixture/routing/scanner suites18/18passed; diff whitespace passes. Updated general rewrite tests so public and share fixed routes remain independently covered. Probe gets --shares scope; share deletion stand-in now records owner-filtered revocation and answers its bounded empty-list verification, addressing the share portion of R-211 without changing app behavior. Video/avatar stand-ins remain open. All changes uncommitted; no owned processes. Next: docs/lessons/projection audit, lint/build/contracts/Go and production localhost share scope, independent review, normal handoff.

Milestone3 checkpoint before full build: `npm run lint` passed0ESLint errors/warnings, existing baseline-data age advisory only. Added documentation links and diff whitespace checks pass. Go projections compared against HEAD remain identical after stripping next_* fields; all92case IDs intact. Lessons24/30/index, contract READMEs, register/ADR/map/cutover/briefing/plan updated. No exercise.go or solution.go changed. Go changes are explanatory comments only and formatted. Remaining checks: production build, full Node contracts and Go test/vet/gofmt, local production --shares forwarding, independent read-only review, final handoff. No owned processes; uncommitted. Next command `npm run build`.

Actual working-tree files at this checkpoint:

```text
 M backend/README.md
 M backend/internal/shares/handler.go
 M backend/internal/sharetoken/contract_test.go
 M backend/internal/sharetoken/handler.go
 M contracts/conversation-share/README.md
 M contracts/conversation-share/cases.json
 M contracts/share-fork/README.md
 M contracts/share-fork/cases.json
 M contracts/share-token/README.md
 M contracts/share-token/cases.json
 M docs/adr/0002-go-backend.md
 M docs/backend-map.md
 M docs/bug-register.md
 M docs/coordination.md
 M docs/cutover.md
 M docs/next-agent-briefing.md
 M docs/plans/phase7-retirement.md
 M learn-go/24-optional-sign-in/README.md
 M learn-go/30-defaults-and-missing-values/README.md
 M learn-go/README.md
 M next.config.mjs
 M scripts/contracts/conversation-share.test.mjs
 M scripts/contracts/go-forwarding-probe.mjs
 M scripts/contracts/go-rewrites.test.mjs
 M scripts/contracts/public-read-retirement.test.mjs
 D scripts/contracts/record-conversation-share.mjs
 D scripts/contracts/record-share-fork.mjs
 D scripts/contracts/record-share-token.mjs
 D scripts/contracts/share-fixture.mjs
 M scripts/contracts/share-fork.test.mjs
 D scripts/contracts/share-loader.mjs
 M scripts/contracts/share-token.test.mjs
 D src/app/api/conversations/[id]/share/route.js
 D src/app/api/share/[token]/fork/route.js
 D src/app/api/share/[token]/route.js
 D src/lib/supabase/shares.js
?? docs/verification/p7-03-shares-2026-11-02.json
?? scripts/contracts/share-retirement.test.mjs
```

Milestone4 before long Go/probe operation: `npm run build` passed (57static outputs; share/conversation handlers absent in built manifest). Full `npm run test:contracts`1172/1172passed. Independent read-only review_p7_03 found no Critical/Important finding and independently confirmed all92Go cases/projections unchanged. Minor verification follow-up: the new wrong-method local probe cases compare routing parity but do not independently pin405/Allow; existing Go mux tests and production receipt cover method behavior. This optional assertion improvement is recorded for later tooling work, not an app regression. No exercise/solution changed. Next: full uncached Go suite, vet/gofmt, compile temporary API executable and production localhost --shares probe. No app server currently running; probe will own and clean its children. Source uncommitted; no publish/handoff hook has run while pending.

## Handoff: P7-02 public GitHub read retirement (Codex, 2026-11-02)

Status: **implementation and read-only review complete; required local checks passed**. Owner Codex, independent read-only reviewer review_p7_02. Branch `main`, base `f86a160`. Resulting commit: `994b972` (synchronized by Git Agent on `main` and `go-backend`). Previous writer released, initial tree clean and verification lease absent.

Production prerequisite: seven bounded website GETs (search, languages, trending, developers, summary, details, contents) all carried X-Sefgh-Backend: go. Public-repo is a server-to-Go read without a website rewrite, so checked it on sefgh-api and received404/Go for an invalid owner. Receipt `verification/p7-02-public-reads-2026-11-02.json` separates remote preflight from local results. No credential sent, upstream sample retrieval or production mutation; this does not establish successful hosted GitHub retrieval, private access/quota behavior, deployment or browser acceptance.

Caller audit: search hook3calls plus chat; trending hook constructs trending/developers; languages from trending page; summary from parse-repos; details from CodeExplorer; no app contents caller found (URL retained in Go); repository page/metadata call fetchRepoForPage. Only the repository-page fallback is removed: fetchRepoFromGitHub remains required by Next starred until P7-04. public-token/identifiers remain for it; askIssuer/4sdeadline remain for verify-bearer. No executable caller remains for removed wrapper/resolver/fetch exports, duplicate catalog or trending measure helper.

Removed seven Next handlers and orphan helpers/runners, and reduced endpoint Node suites to fixture integrity. Go implementations remain unchanged except explanatory comments. All408cases and Go-relevant JSON values are unchanged against base; removed only next_* rollback fields. Unconditional rewrites preserve each existing URL pattern when SEFGH_GO_API_URL is configured; these old switch names are ignored. With no Go origin, public APIs are404 and the page read returns null; it never silently asks GitHub. R-015 remains the owner's unfinished Go task. Lessons/docs/register/ADR updated; exercise.go and solutions unchanged. Rollback is revert this step's commit and redeploy both projects, not unset a route switch.

Checks by Codex: retirement regressions5/5failed before edits, then focused fixture/page/token/UI85/85 and routing/scanner/retirement12/12passed. `npm run lint` passed0errors/warnings; later probe edit passed targeted ESLint. `npm run build` passed (57static outputs; retired handlers absent). `npm run test:contracts`1261/1261passed. `go test -count=1 ./...` and `go vet ./...` passed; initial gofmt check found a later comment edit in githubaccess/access.go, formatted it, repeat `gofmt -l .` empty. Compiled API in OS temp. Isolated production localhost public-read forwarding53/53passed with old public switch names omitted, including awkward encoding and verified credential cases. All probe-owned children stopped. Added documentation links, retained contract projections, unchanged exercises and `git diff --check` passed. Existing baseline/caniuse age advisories only. Lesson tests skipped by owner policy, not passed. Normal `npm run handoff` passed contracts and Go test/vet/gofmt, lessons skipped; READY_VERIFIED matched precommit tree b8b2bb8609d5. After this bookkeeping/single commit, one final normal handoff will verify the committed fingerprint; inspect its matching signal before synchronization.

Known failure: initial optional full150scenario probe reported146passed/4expected-status failures from stale stand-ins after Phase6 changes. Direct and forwarded status/body agreed for all4. R-211 records the finding; public-repo stand-in corrected to supply required owner/URL fields. Remaining video-delete/unshare/avatar harness work is open for a separate bounded tooling task; not owner-deferred, fixed, or claimed accepted. The explicit --public-reads run is not a full-probe pass. This does not change application/backend behavior.

Review: no Critical/Important issue. Minor deferred to P7-10: public-repository contract README understates executable Node helper/page-adapter/starred coverage as fixture integrity. Prior hosting-guide switch-list follow-up remains P7-10. Rulings: server-only public-repo preflight uses the actual Go origin; shared helpers stay for current callers; public routing is origin-required/unconditional; scoped integration evidence does not establish other domains or hosted acceptance. Treating local/source proof as live/browser/private/external-consumer/CI/sync proof would overstate the evidence. Runtime no-origin404 is source/config guarded, not a separate production-server run.

Actual changed files (all P7-02; uncommitted at this record):

```text
 M backend/README.md
 M backend/internal/githubaccess/access.go
 M backend/internal/githublanguages/handler.go
 M backend/internal/githubsearch/contract_test.go
 M backend/internal/githubsearch/handler.go
 M contracts/github-access/README.md
 M contracts/github-languages/README.md
 M contracts/github-repositories/README.md
 M contracts/github-repositories/cases.json
 M contracts/github-search/README.md
 M contracts/github-search/cases.json
 M contracts/github-trending-developers/README.md
 M contracts/github-trending-developers/cases.json
 M contracts/github-trending/README.md
 M contracts/github-trending/cases.json
 M contracts/public-read-token/README.md
 M contracts/public-repository-reads/README.md
 M docs/adr/0002-go-backend.md
 M docs/backend-map.md
 M docs/bug-register.md
 M docs/coordination.md
 M docs/cutover.md
 M docs/next-agent-briefing.md
 M docs/plans/phase7-retirement.md
 M learn-go/02-structs-and-maps/README.md
 M learn-go/06-http-handlers/README.md
 M learn-go/08-testing/README.md
 M learn-go/09-path-parameters/README.md
 M learn-go/14-checking-input/README.md
 M learn-go/16-verifying-access/README.md
 M learn-go/47-sharing-code-between-routes/README.md
 M learn-go/README.md
 M next.config.mjs
 D scripts/contracts/access-fixture.mjs
 D scripts/contracts/developers-fixture.mjs
 D scripts/contracts/github-access-isolation.test.mjs
 D scripts/contracts/github-access.test.mjs
 M scripts/contracts/github-languages.test.mjs
 D scripts/contracts/github-repositories-smoke.mjs
 M scripts/contracts/github-repositories.test.mjs
 M scripts/contracts/github-search.test.mjs
 M scripts/contracts/github-trending-developers.test.mjs
 M scripts/contracts/github-trending.test.mjs
 M scripts/contracts/go-forwarding-probe.mjs
 M scripts/contracts/go-rewrites.test.mjs
 M scripts/contracts/internal-paths.test.mjs
 M scripts/contracts/public-read-token.test.mjs
 M scripts/contracts/public-repository-reads.test.mjs
 D scripts/contracts/trending-fixture.mjs
 M scripts/contracts/trending-measure.test.mjs
 D src/app/api/github/contents/[owner]/[repo]/route.js
 D src/app/api/github/languages/route.js
 D src/app/api/github/repo/[owner]/[repo]/route.js
 D src/app/api/github/repo/route.js
 D src/app/api/github/search/route.js
 D src/app/api/github/trending-developers/route.js
 D src/app/api/github/trending/route.js
 D src/data/github-languages.js
 M src/lib/github/access.js
 M src/lib/repo/repoData.js
 D src/lib/utils/trending/trendingMeasure.js
?? docs/verification/p7-02-public-reads-2026-11-02.json
?? scripts/contracts/public-read-retirement.test.mjs
```

Writer released: yes. No owned servers/processes; temporary API executable remains in OS temp, not running. No commit/push/CI/deployment is claimed at this precommit record. Signing stopped; no keys, SQL, worker or AI activation change. Next: create exactly one completed P7-02 commit containing this record, then handoff on the committed fingerprint. The resulting commit is the one containing this record (explicitly uncommitted when written); obtain its hash from Git history. Subsequent task P7-03 only; do not start P7-07 without owner AI-key confirmation and R-038 check.

## Checkpoint: P7-02 public GitHub read retirement (Codex, 2026-11-02)

Status: **in progress / incomplete**. Owner Codex; reviewer unassigned. Branch `main`, base/current `f86a1609a7a4812c6ed5f40f6c92f3f54b2321ce`; uncommitted. Initial clean checkout, previous writer released, IDLE_CLEAN/no verification lease. Objective: execute P7-02 only, one commit, under `plans/phase7-retirement.md`.

Scope: seven Next GitHub handlers (search, languages, trending, trending developers, summary, details, contents); public-repository read fallback in repoData.js; unused helpers only after reference audit; retain Go implementations and their cases, remove Next-only expectations/tests; routing, lessons/docs and required checks/handoff. Choose unconditional rewrites for the retired handlers, with Go origin still required. Retain unrelated switches until their planned steps. The server-rendered public-repo read calls the Go origin directly, so its production prerequisite is checked on sefgh-api, not a website rewrite that does not exist.

Completed: read current plan/briefing/instructions/ownership and inspected new GitAgent-synchronized P7-01 state. Current diff initially empty; no code edits. Checks not run: caller audit completion, production route proof, regressions, lint/build/contracts/Go/handoff. No failures or owned processes. Dependencies: each route must answer from Go in production before removing its handler. No deployment, signing, keys, worker or database action authorized by this task. Next: exact paths/helper caller audit and bounded production GETs, then contract/test/routing retirement edits. This is the durable execution ledger; checkpoints follow each milestone.

Milestone1: eight bounded unauthenticated production reads all carried X-Sefgh-Backend: go (seven website APIs plus server-only public-repo on sefgh-api). Receipt `verification/p7-02-public-reads-2026-11-02.json`. Caller audit: search hook3fetches +chat1; trending hook builds trending/developers paths; trending page loads languages; parse-repos uses summary; CodeExplorer uses details. No app contents request found, but path remains served by Go for existing clients. Repo page/metadata use fetchRepoForPage. Shared fetchRepoFromGitHub is still used by the Next starred handler and must stay until P7-04, along with public-token and identifier helpers. askIssuer and the4sdeadline still serve verify-bearer; only unused GitHub wrapper/resolver/fetch exports were trimmed.

Milestone2: seven Next handlers deleted; unconditional Go rewrites installed, old route switches removed for this group. Page fallback/switch removed (missing origin returns null/no direct request). Unused Next language catalog, trending measure helper, endpoint fixture runners, access wrapper tests and obsolete Next-versus-Go smoke script removed. Retained408cases across six contracts (107search/3languages/60trending/75developers/148repository/15public read); only next_* fields removed. Node endpoint suites reduced to integrity checks; full Go cases stay. New5retirement tests all failed before changes, then focused85tests passed. Remaining switch/path scanner tests updated to see actual unconditional rewrites. Checks not yet run: final lint/build/contracts/Go, production localhost forwarding and handoff. Current changes uncommitted; no deployment or app servers. Next: focused routing/scanner checks, docs/lessons/reference audit, required full checks. One initial read-only command used unsupported PowerShell brace expansion and was rerun with explicit paths; no code/check result affected.


Milestone3 checkpoint before full build/checks: focused routing/scanner/retirement12/12passed; focused fixture/page/token/UI85/85passed. `npm run lint` passed0ESLint errors/warnings (existing baseline-data advisory only). `git diff --check` initially reported3extra blank EOF lines, now fixed. Contract projection comparison against HEAD confirms the408case IDs and all Go-relevant JSON values are unchanged; only next_* keys removed. Docs/lessons updated, including owner R-015 instructions without implementing it; Go changes are explanatory comments only. Full build/contracts/Go/forwarding/handoff and independent review remain to run. No owned server processes; source uncommitted. Next command `npm run build`, then full contracts, Go suite/vet/gofmt, production localhost forwarding probe and review.

Actual changed files at this checkpoint:

```text
 M backend/README.md
 M backend/internal/githubaccess/access.go
 M backend/internal/githublanguages/handler.go
 M backend/internal/githubsearch/contract_test.go
 M backend/internal/githubsearch/handler.go
 M contracts/github-access/README.md
 M contracts/github-languages/README.md
 M contracts/github-repositories/README.md
 M contracts/github-repositories/cases.json
 M contracts/github-search/README.md
 M contracts/github-search/cases.json
 M contracts/github-trending-developers/README.md
 M contracts/github-trending-developers/cases.json
 M contracts/github-trending/README.md
 M contracts/github-trending/cases.json
 M contracts/public-read-token/README.md
 M contracts/public-repository-reads/README.md
 M docs/adr/0002-go-backend.md
 M docs/backend-map.md
 M docs/bug-register.md
 M docs/coordination.md
 M docs/cutover.md
 M docs/next-agent-briefing.md
 M docs/plans/phase7-retirement.md
 M learn-go/02-structs-and-maps/README.md
 M learn-go/06-http-handlers/README.md
 M learn-go/08-testing/README.md
 M learn-go/09-path-parameters/README.md
 M learn-go/14-checking-input/README.md
 M learn-go/16-verifying-access/README.md
 M learn-go/47-sharing-code-between-routes/README.md
 M learn-go/README.md
 M next.config.mjs
 D scripts/contracts/access-fixture.mjs
 D scripts/contracts/developers-fixture.mjs
 D scripts/contracts/github-access-isolation.test.mjs
 D scripts/contracts/github-access.test.mjs
 M scripts/contracts/github-languages.test.mjs
 D scripts/contracts/github-repositories-smoke.mjs
 M scripts/contracts/github-repositories.test.mjs
 M scripts/contracts/github-search.test.mjs
 M scripts/contracts/github-trending-developers.test.mjs
 M scripts/contracts/github-trending.test.mjs
 M scripts/contracts/go-forwarding-probe.mjs
 M scripts/contracts/go-rewrites.test.mjs
 M scripts/contracts/internal-paths.test.mjs
 M scripts/contracts/public-read-token.test.mjs
 M scripts/contracts/public-repository-reads.test.mjs
 D scripts/contracts/trending-fixture.mjs
 M scripts/contracts/trending-measure.test.mjs
 D src/app/api/github/contents/[owner]/[repo]/route.js
 D src/app/api/github/languages/route.js
 D src/app/api/github/repo/[owner]/[repo]/route.js
 D src/app/api/github/repo/route.js
 D src/app/api/github/search/route.js
 D src/app/api/github/trending-developers/route.js
 D src/app/api/github/trending/route.js
 D src/data/github-languages.js
 M src/lib/github/access.js
 M src/lib/repo/repoData.js
 D src/lib/utils/trending/trendingMeasure.js
?? docs/verification/p7-02-public-reads-2026-11-02.json
?? scripts/contracts/public-read-retirement.test.mjs
```

Milestone4: `npm run build` passed (57static outputs; seven retired handler entries absent). Full `npm run test:contracts`1261/1261passed. Added Markdown links and diff whitespace check passed; no exercise.go/solution.go changed. Existing baseline/caniuse data-age advisories only. Independent read-only review_p7_02 is running, no acceptance claimed yet. Next long operation: full uncached Go test suite, vet/gofmt, compile an API executable in OS temp, then isolated production forwarding probe. Probe uses only localhost stand-ins and owns/cleans its server children. No app server currently running; source remains uncommitted and active writer Codex. Normal handoff remains pending, and no deployment/remote mutation occurred.

Milestone5: full `go test -count=1 ./...` and `go vet ./...` passed. First gofmt check identified the later comment edit in githubaccess/access.go; formatted it and the repeated check is empty. API executable compiled in OS temp. The optional full production forwarding probe built/started localhost Next/Go, then reported146/150:4expected-status failures from stale fixtures, while direct/via-Next status and body agreed. Logged new tooling R-211 in the register. Investigated fixture inputs against current Go contracts: missing repo owner/URL fields; video no deleted row; unshare verify still active; fake avatar only textPNG. Corrected only the public-read repo stand-in for P7-02 and added explicit --public-reads scope; unrelated domains remain open under R-211, not owner-deferred and not silently weakened. Original probe children all stopped (process inventory empty). Next: repeat production public-read scope, lint new probe edit, then required normal handoff.

Review complete: independent read-only review_p7_02 found no Critical/Important issue; one Minor deferred to P7-10, public-repository README understates retained executable Node helper/adapter/starred tests as fixture integrity. Ruling: hosted retirement, successful production retrieval/private/quota behavior, external consumers and CI/sync are not established by routing preflight/local tests. Scope production localhost forwarding and no-origin source guard separately. The missing live evidence is not inferred from local success.

## Handoff: P7-01 contributions retirement (Codex, 2026-11-02)

Status: **implementation and read-only review complete; local verification complete**. Owner Codex; independent read-only reviewer review_p7_01. Branch `main`, base `2cd3404`. Resulting commit: `e9170a8` (synchronized by Git Agent on `main` and `go-backend`). Previous writer released and initial tree/verification lease were clean.

The exact-path and symbol caller audit in src/scripts/backend found no app caller, including dynamic builders. Shared GitHub access helpers remain used by other routes. Pre-removal unauthenticated production GET returned400 (Username is required) with X-Sefgh-Backend: go; secret-free receipt `verification/p7-01-contributions-2026-11-02.json`. This proves the production Go prerequisite only, not live retirement or arbitrary external consumers.

Removed the Next.js endpoint, Go endpoint/package, switch, complete contribution contract/next expectations, endpoint-specific Node/Go tests, unused fixture helper, and probe/comparison entries. P7-01 explicitly retires the whole unused endpoint (R-032), so it overrides the generic recipe that preserves Go contracts and rewrites for other routes. No unconditional rewrite is appropriate. A stale deployed route name is safely ignored after rebuilding. Go retirement tests cover missing/valid/malformed usernames for anonymous and verified callers, require404 and no GitHub resource requests. Next regression requires no handler and no rewrite with or without a Go origin. Both guards failed before removal and pass afterward.

Updated R-032 and remaining R-033/R-207 statuses, route docs/map/cutover/ADR/briefing/plan, access/public-token contract notes and lesson13/index. Teaching examples are marked historical; existing exercise.go and solutions are unchanged. The path scanner's obsolete minimum25handler assertion failed as expected after retirement (now24including auth callback); replaced it with presence checks for auth callback and playground keys, the boundaries the plan keeps.

Checks run by Codex: `npm run lint` passed0errors/warnings; `npm run build` passed,62static pages and no contributions handler/rewrite in built manifests; focused Node tests6/6 and path-scanner tests3/3 passed; targeted ESLint on the later scanner edit passed; final standalone `npm run test:contracts`1699/1699 passed; `go test -count=1 ./...` all packages passed; `go vet ./...` passed; `gofmt -l .` empty; added documentation links and `git diff --check` passed. Initial full contracts1698pass/1fail was the obsolete count and is resolved. Existing baseline-browser-mapping/caniuse age advisories appeared; no dependency update. Lesson checks skipped by owner policy, not claimed passed. Normal `npm run handoff` passed contracts and Go test/vet/gofmt, with lessons explicitly skipped; status READY_VERIFIED, matching precommit tree99c63439b48a. This final bookkeeping and commit change the fingerprint, so one final normal handoff will reverify the committed checkout; consult its matching signal/status before synchronization.

Independent review: no Critical/Important finding. Minor deferred to P7-10: `hosting-setup.md` still lists the obsolete switch and generic Next fallback; backend README/cutover/plan document the retirement and stale settings are harmless. Reviewer did not assess live retirement or consumers outside the repository. Ruling: preserve those boundaries, since treating this audit as hosted404 or external-consumer proof would overstate the evidence.

Actual changed files (all P7-01, uncommitted at this record):

```text
 M backend/README.md
 M backend/cmd/api/access_test.go
 M backend/cmd/api/main.go
 M backend/cmd/api/publictoken_wiring_test.go
 M backend/cmd/api/wiring_test.go
 D backend/internal/githubcontributions/contract_test.go
 D backend/internal/githubcontributions/dates.go
 D backend/internal/githubcontributions/dates_test.go
 D backend/internal/githubcontributions/handler.go
 D backend/internal/githubcontributions/limits_test.go
 D backend/internal/githubcontributions/query.go
 M contracts/github-access/README.md
 D contracts/github-contributions/README.md
 D contracts/github-contributions/cases.json
 M contracts/public-read-token/README.md
 M docs/adr/0002-go-backend.md
 M docs/backend-map.md
 M docs/bug-register.md
 M docs/coordination.md
 M docs/cutover.md
 M docs/next-agent-briefing.md
 M docs/plans/phase7-retirement.md
 M learn-go/13-time-and-clocks/README.md
 M learn-go/13-time-and-clocks/exercise_test.go
 M learn-go/README.md
 M next.config.mjs
 M scripts/compare-deployments.mjs
 D scripts/contracts/contributions-fixture.mjs
 M scripts/contracts/github-access-isolation.test.mjs
 D scripts/contracts/github-contributions.test.mjs
 M scripts/contracts/go-forwarding-probe.mjs
 M scripts/contracts/go-rewrites.test.mjs
 M scripts/contracts/internal-paths.test.mjs
 D src/app/api/github/contributions/route.js
?? backend/cmd/api/retired_routes_test.go
?? docs/verification/p7-01-contributions-2026-11-02.json
```

Writer released: yes. No owned servers/processes; the normal verifier will own its lease only while running. No commit/push/CI/deployment/live404 is claimed at this record. No keys, database, workers, signing or AI activation change. Rollback: revert the one P7-01 commit and redeploy both projects; switch-only rollback cannot restore deleted code. Next: commit this completed P7-01 record/source as exactly one commit, then run normal handoff to verify the committed fingerprint. The resulting commit is the one containing this record (explicitly uncommitted when written); retrieve its hash from Git history. Subsequent task P7-02 only. Do not start P7-07 without the owner's AI-key confirmation and R-038 check.

## Checkpoint: P7-01 contributions retirement (Codex, 2026-11-02)

Status: **in progress / incomplete**. Owner Codex; reviewer unassigned. Branch `main`, base/current `2cd34049e558e7b292b350e90213f84291018ba5`; uncommitted. Initial tree clean, verifier IDLE_CLEAN, previous writer released. Scope: the P7-01 row and recipe in `plans/phase7-retirement.md`, one commit for this step only.

Decision: P7-01 specifically retires both Next.js and Go implementations, the switch, contract and endpoint tests; this takes precedence over the generic recipe that retains Go contracts/rewrites for other routes. Use this coordination record as the durable execution ledger. Owner explicitly requested this checkout and its existing main branch. No P7-02 work, keys, workers, signing, database changes or deployment.

Expected files: Next handler; `backend/internal/githubcontributions/`; Go mux/wiring tests; contribution Node fixtures/tests; rewrite/probe/comparison route lists; route contract; lesson13/index and other retired references; register, ADR, backend-map, cutover, backend README, plan, briefing and this record. Exact changed list will be recorded after edits.

Completed milestone: exact-path/symbol audit found no application callers. Pre-removal production GET400 carries X-Sefgh-Backend: go; secret-free receipt `verification/p7-01-contributions-2026-11-02.json`. Removed both endpoint implementations, switch, entire endpoint contract and old tests/fixture helper; shared GitHub access remains in use. Updated route lists, docs/register (R-032, remainder R-033, R-207) and historical lesson13 references; exercise.go unchanged. P7-01-specific full retirement overrides the generic retained-Go recipe; no unconditional rewrite is appropriate for an endpoint being removed.

Regression evidence: new retirement guard failed in Node (handler still present) and Go (400/500/200, GraphQL reached). After removal, focused Node tests6/6 pass; focused Go API retirement/credential/redirect/public-token tests pass. `git diff --check` passes (line-ending notices only). No production settings or deployment changed. Required full lint/build/contracts/Go/handoff not run yet; lessons skipped by owner policy. Running processes: none owned. Next command: `npm run lint`, then build, contracts, `go test -count=1 ./...`, vet/gofmt, review and final handoff.

Verification update: lint passed (ESLint0errors/warnings; baseline-data advisory only); build passed (62static pages, retired endpoint absent; existing baseline/caniuse age advisories). First full contract run failed1of1699: the internal-path scan required at least25handlers, now24including auth callback after one retirement. Root cause verified from scanner and Git/source inventories; replace the obsolete count with required retained-route sentinels (auth callback and playground keys). This keeps the scanner completeness check compatible with intentional Phase7 removals. Focused rerun and full suite next.

Contracts milestone: `node --test scripts/contracts/internal-paths.test.mjs`3/3 passed after the scanner adjustment; targeted ESLint for that file passed. Final standalone `npm run test:contracts`1699/1699 passed. Full `go test -count=1 ./...`, then `go vet ./...` and empty `gofmt -l .` are running in owned exec session94489 (log in OS temp, no secrets). No app server is running. Next: inspect exit/results, final diff/docs check, complete/release handoff record and normal handoff. No publish/synchronization hook has run while incomplete.

Review: independent read-only review by review_p7_01 found no Critical/Important issues. One Minor deferred to P7-10 documentation: hosting-setup.md still lists the obsolete switch and generic Next fallback. The name is safely ignored; backend README/cutover/plan describe current retirement. Reviewer did not judge live404 (deployment outside task) or arbitrary external consumers (repo audit proves only no app callers). Ruling: retain these evidence boundaries; assuming otherwise could falsely claim live retirement or external compatibility. No second review claimed.

Actual working-tree files at this milestone (all P7-01; uncommitted):

```text
 M backend/README.md
 M backend/cmd/api/access_test.go
 M backend/cmd/api/main.go
 M backend/cmd/api/publictoken_wiring_test.go
 M backend/cmd/api/wiring_test.go
 D backend/internal/githubcontributions/contract_test.go
 D backend/internal/githubcontributions/dates.go
 D backend/internal/githubcontributions/dates_test.go
 D backend/internal/githubcontributions/handler.go
 D backend/internal/githubcontributions/limits_test.go
 D backend/internal/githubcontributions/query.go
 M contracts/github-access/README.md
 D contracts/github-contributions/README.md
 D contracts/github-contributions/cases.json
 M contracts/public-read-token/README.md
 M docs/adr/0002-go-backend.md
 M docs/backend-map.md
 M docs/bug-register.md
 M docs/coordination.md
 M docs/cutover.md
 M docs/next-agent-briefing.md
 M docs/plans/phase7-retirement.md
 M learn-go/13-time-and-clocks/README.md
 M learn-go/13-time-and-clocks/exercise_test.go
 M learn-go/README.md
 M next.config.mjs
 M scripts/compare-deployments.mjs
 D scripts/contracts/contributions-fixture.mjs
 M scripts/contracts/github-access-isolation.test.mjs
 D scripts/contracts/github-contributions.test.mjs
 M scripts/contracts/go-forwarding-probe.mjs
 M scripts/contracts/go-rewrites.test.mjs
 D src/app/api/github/contributions/route.js
?? backend/cmd/api/retired_routes_test.go
?? docs/verification/p7-01-contributions-2026-11-02.json
```


## Handoff: PHASE7-000, the owner's answers and the Phase 7 plan (Claude Code, 2026-11-02)

Status: **complete (documentation only).** Writer Claude Code. Branch `main`, base `fac69df`. Resulting commit: `c65f702` (synchronized by Git Agent on `main` and `go-backend`).

The owner's answers to the list in GIT-REPAIR-001:

- **"1, 2 and 3 are done".** Agent-verified for 1: Decision Pack 2 is on GitHub as `5a2704a` (the Git Agent's rebase of `b034e1f`) and live: a missing repository answers 404 from Go, collect, activity and enhance-query answer from Go, `/api/trending/refresh` is 404. Not agent-verified for 2 and 3 (playground keys hosted acceptance, signed-in testing): no record in this file, and Claude Code has no browser tools. Their register entries are unchanged.
- **"4 … leave that as a gap"**: the analysis, search and RepoSync worker migration. Their 21 open entries (R-116 to R-123, R-189 to R-201) are now "deferred (owner, 2026-11-02)", with the earlier status kept after it. Codex's REPOSYNC-002 and DB-CONSOLIDATE work stays as recorded.
- **"5 go ahead"**: R-028 closed as resolved by retirement (its job and route were retired, R-077). R-015 stays the owner's own lesson.
- **"after done start phase 7"**: recorded in the ADR (decisions log and the Phase 7 row) as the owner's decision to start before the Phase 6 gate is fully met; still open are the keys, the domain (R-065, R-066), R-015, R-033's remainder and R-038. The rollback observation period is taken as the time every route has run on Go in production, since 2026-10-28.

New `plans/phase7-retirement.md`: what is removed and what stays (keys route, workers, auth callback, session proxy, managed services, contract fixtures), a first caller audit (`/api/github/contributions` has no caller), the step order P7-01 to P7-10, and the per-step recipe including rollback by reverting one step's commit.

Checks: `git diff --check`; `npm run handoff` below. No source changed.

Changed files: new `docs/plans/phase7-retirement.md`, `docs/adr/0002-go-backend.md`, `docs/bug-register.md`, `docs/coordination.md`.

Next: P7-01, retire `/api/github/contributions` (R-032), following the plan's recipe.

Writer released: yes. No processes left running.

## Handoff: BUG-070/R-210 source direct-write containment (Codex, 2026-11-01)

Status: **bounded fix applied and remotely verified**. Owner Codex, independent static reviewer review_corpus_namespace. Main base `ec0d388`. Resulting commit: `37864ff` (batch synchronized by Git Agent on `main` and `go-backend`). Prior DB-CONSOLIDATE-003 full handoff396359113edc passed; clear lease/released writer before claim; all priorwork preserved.

BUG-070/R-210 (2026-11-01): exact owner-approved source Repo-DB write/admin grants revoked for PUBLIC/anon/authenticated on9non-RLS tables. All9effective table/column denial checks pass; current reads and service-roleCRUD preserved. Ten source counts and excluded researchACL unchanged. Migration20261031234604; receipt/verify/rollback versioned. No data copied/deleted or User-DB table changed; source read/RPC audit and transfer remain separate.

Owner explicitly approved exact reviewed proposal. Fresh sourceidentityACTIVE_HEALTHY in expectedorg verified; apply_migration success and remotehistory confirms reposync_002_block_public_writes/version20261031234604. Sourcefilehash2e72f0cb5b87f7896aa08fb313b6c3c35b81c0ab5c986058939d7261a0f3b29b. Review found inheritedcolumn assertiongap; corrected with no-columnACL preflight and effective has_any_column_privilege checks, revieweraccepted. Postverify9/9tabledenial,9/9columndenial,9/9existingreads,9/9workerCRUDtrue. Tenexactcounts unchanged, researchACLunchanged. No deliberate destructivewrite or exposure-reopen was run; originalgrants and postverify provide regressionevidence. Manualrollback restores earlierunsafegrants only on exacttables/roles, notexecuted.

Source dependency metadata saved:24constraints,52indexes,12publicroutines,3enabledtriggers includingtopicwebhook. No bodies/arguments/predicateliterals/logpayloads/keys copied. FK distinction ReposMeta.id versus repo_id is nowobserved. Not an activeworker lineage or fullRPC/security audit. User-DBemptycorpus alreadyapplied/verified in priorboundedtask; no further User-DBchange. DevremainsINACTIVE, source/UserDBhealthy; no charge/delete/upgrade.

Changed files for this followup: sourcewriteapplyreceipt and verifySQL; source dependencyreceipt/query010; registerR210fixed, organizationnotes/backendmap/README/briefing/consolidationplan/coordination. Prior DB002/003receipts/proposalsqueries retained. JSON/reference/diffchecks and normalhandofffollow. No Go/app/fixture change requiring a newbuild/lesson; lessonchecks skippedownerpolicy. Sourcewriteapproval is fulfilled, no pending samequestion.

Writerreleased: yes. No owned app/workerprocesses; verifier manages itsownlease. Overall transfer remains incomplete: exactschema/default/index/RPC/triggerdefinition manifest, securebackuprestore/copychannel, provenance-preservingmapping, corpus-onlyworkercapability, reconciliation and consumerrollback. Next: inspectmatchinghandoff/status then continue source-to-corpus additive mapping; do not copy source broadreadgrants, enablewebhooks/workers, or touch app tables by name similarity.

## Historical checkpoint: BUG-070/R-210 source direct-write containment (Codex, 2026-11-01)

Status: **in progress / incomplete**. Owner Codex, reviewer review_corpus_namespace (independent sourceproposal review, columnchecks corrected/accepted). Main base/current ec0d388, source files uncommitted. No lease/otherwriter at claim; prior DB003 fullhandoff396359113edc passed. Owner explicitly approved exact proposal reposync_002_block_public_writes.sql. Filehash2e72f0cb5b87f7896aa08fb313b6c3c35b81c0ab5c986058939d7261a0f3b29b. Next: fresh exact sourceproject verify, apply_migration, effective table/columnwrite denial and read/serviceCRUD verification, source counts, receipt and normalhandoff. No source/public reads revoked, no data/delete/workerexecution or User-DB change.

## Handoff: DB-CONSOLIDATE-003 User-DB restricted corpus foundation (Codex, 2026-11-01)

Status: **bounded implementation and remote verification complete**. Owner Codex; namespace reviewer review_corpus_namespace independent/read-only. Main base `ec0d388`. Resulting commit: `37864ff` (batch synchronized by Git Agent on `main` and `go-backend`). Prior DB-CONSOLIDATE-002 inventory work preserved and completed by successful source metadata/count read after health recovered. No writer/verifier displaced.

DB-CONSOLIDATE-003 (2026-11-01): User-DB now has an empty restricted corpus schema, migration corpus_001_restricted_namespace/version20261031233939. Ownerpostgres; anon/authenticated/service_role have no USAGE/CREATE; no API exposure change. Six before/after app catalog fingerprints match. Existing tables/data/policies/roles unchanged. Repo-DB now healthy and metadata/count inventory saved; source transfer not performed. R-210 source public-write grants recorded; separate reviewed containment proposal awaiting owner decision.

Remote User-DB apply_migration returned success after exact project identity check and independent static review. Proposal file6546e2cd923c839a48249f66cdf389b613024c85577d3ad1a057569522b79ad3; verify returned one row, ownerpostgres, expectedmarker, zero relations/routines and sixfalse roleprivileges. Six app catalog fingerprints (columns/defaultACLs/policies/relations/routines/triggers) unchanged; no appdata queried or rewritten. Manual empty/marker/RESTRICT rollback reviewed, not run. No Dockerdaemon or psql available; no local PostgreSQL runtime pass claimed. Namespace receipt docs/database/corpus-namespace-applied-2026-11-01.json.

User-DB advisor findings triaged: R-079/R-080 owner deferrals preserved; backup no-policy intentional;14mutable-search-path functions are invoker, no bulk edits; vectorpublic kept due1536-dimensional existingcolumn compatibility. Source metadata/counts:10tables,42,044,563bytes, aggregatecounts only; no source payloads/keys read. ReposMeta12030, research15414, usage147, errors14, analysis165, chunks/search0, snapshots33, topics37, history33. Source contains no public.repositories; do not run legacyworker by guessing. Source snapshotapi_keys values remain uninspected/sensitive.

R-210 source nine non-RLS tables have anon/auth tablewrites. Proposal reposync_002_block_public_writes.sql and explicit unsafe-reopen rollback prepared, not applied; reviewer identified column-privilege assertion gap, fixed with attacl preflight and has_any_column_privilege checks, reviewer confirmed resolution/no remaining materialstaticblocker. Owner question pending. This sourcechange is separate from completednamespace work; no source DDL/DML/copy.

Changed files: prior inventory receipts/queries and keys-staging pause notice; new source/namespace receipts, organization findings, namespaceproposal/verify/rollback, source-writeproposal/rollback, checks005-009; registerR210, backend README/map, consolidation/closeout/briefing and coordination. Exact file list via git status; all priorwork preserved. JSON/reference/diff checks and normal handoff follow; no Go/app edits requiring build or lesson changes. No peer review claimed for actual source data/pipeline; migrationreview covers namespace/proposals only. Dev remains paused, User-DB/sourcehealthy; no automaticdevresume, charges, deletion or upgrade.

Writer released: yes; no owned application/worker processes. Overall transfer/cleanup incomplete at source manifest, secure backup/restore/copy channel, scopedworker credential, row reconciliation and consumer/rollback gates. Next: inspect finalstatus; handle exact R210decision if provided; finish source definitions/dependencies and additive corpus-table mapping without changing existing app tables or exposing corpus.

## Historical checkpoint: DB-CONSOLIDATE-003 User-DB restricted namespace (Codex, 2026-11-01)

Status: **in progress / incomplete**. Owner Codex, reviewer review_corpus_namespace (independent read-only). Main base/current ec0d388; prior9-file inventory checkpoint preserved. Scope is owner-requested User-DB organization; previous source wait resolved, Repo-DB now ACTIVE_HEALTHY and metadata-only inventory succeeded. Source has10public tables and42,044,563database bytes;9tables have RLS disabled plus anon CRUD, source R-210 to record/prepare containment separately. No source rows/logpayloads/keys fetched.

Exact User-DB proposal supabase/proposals/corpus_001_namespace.sql creates only empty corpus ownedpostgres, revokes PUBLIC/anon/authenticated/service_role schemaaccess, marks purpose and asserts effective API-role denial beforecommit. Existing schema causes failure. Verify/guarded RESTRICT rollback files prepared. User already authorized corpus-schema organization preserving appdata. Independent review found no materialblockers; verify must explicitly assert one row, owner/marker, zero relations/routines and sixfalse privilege checks. No local Dockerdaemon/psql available; runtimeproof follows remoteapply, not claimed yet.

Before-write live metadata confirmed corpus absent, callerpostgres, broad defaultACLs scopedpublic/storage only; no defaults or role change planned. Saved sixpublic/backup catalog fingerprints (relations/columns/routines/policies/triggers/defaultACLs) to compare afterapply; bodies hashed in database, not returned. Fresh User-DB identity ACTIVE_HEALTHY verified. Next: apply exact reviewed namespace migration via apply_migration, readverify/assert, compare allfingerprints and save receipts. No copy/cutover/sourcechanges or applicationdata mutation.

## Historical checkpoint: DB-CONSOLIDATE-002 live inventory awaiting source readiness (Codex, 2026-11-01)

Status: **paused / incomplete; waiting for platform readiness**. Owner Codex, reviewer unassigned. Main base734e36c/current ec0d388; Git Agent recorded prior source sync while read-only discovery ran, prior work preserved. Metadata files explicitly uncommitted.

Connected Supabase account verified organization sefgh-ai's hithuduntbsajjhmnntm, free plan; User-DBkohwfuxqbllsmvmsfqci active, Repo-DBkiadrbqkkmncoblpcobo inactive, migration-devmraglhrenqwadegvwxts active. User-DB catalog inventory and narrow backup/view/profile-trigger dependency read succeeded under read-only transactions. No application rows/keys/function bodies read.33public relations (29tables/4views), all29tables RLS-enabled; vector0.8.0; no corpus schema; database19,328,147bytes (not quota proof). r078_backup contains repository_bookmarks, repository_shares, user-data. Two profile timestamp triggers point at different functions; do not assume safe to delete. Four stats views depend on repo_*tables.

Owner approved resuming exact Repo-DB for inventory. One restore_project call refused ForbiddenException at two-active-free-project limit. No retry/workaround, pause/delete/upgrade or charge accepted. Owner separately approved pausing only migration-dev and retrying Repo-DB. Fresh exact dev identity verified; pause_project returned success and get_project showed PAUSING. Second restore_project for exact Repo-DB returned success. Dev confirmed INACTIVE; source still COMING_UP. Awaiting healthy; no other project paused/deleted/upgraded, no charge accepted. Existing dev acceptance environment would be unavailable during pause; original signing approval is not broadened.

Changed files so far: docs/coordination.md; docs/database/{consolidation-user-inventory-2026-11-01.json, consolidation-user-grants-2026-11-01.json, consolidation-user-capacity-2026-11-01.json} (metadata only); supabase/checks/{db_consolidation_002_dependencies.sql, db_consolidation_003_read_grants.sql, db_consolidation_004_capacity.sql}. Inventory script SHA37f9ad6fdbf78973e041b139825d0fe6fe4e3db64e738e32605e0c2b5bffd48a. No live DDL/DML/transfer/credentials/deploy. Checks: all three receipt JSON files parse, versioned query references exist and git diff --check passed. Source read-only inventory attempted once while source COMING_UP; BadRequestException: Database is possibly not accessible at the moment. No source metadata/rows returned; no repeated SQL attempts. Final project listing confirms User-DB ACTIVE_HEALTHY, Repo-DB COMING_UP, migration-dev INACTIVE. No application/worker processes owned; Supabase source startup is external. No Go/app source changed, so no app build/test rerun; no peer review or copy/restore validation performed. npm run handoff NOT run because this live inventory task is incomplete; previous proof is not proof of this tree.

Writer released: yes. Owner approval for exact source resume and exact dev pause is recorded; no additional answer needed for the inventory. Next concrete tool: get_project(id=kiadrbqkkmncoblpcobo); when ACTIVE_HEALTHY, execute versioned db_consolidation_001_inventory.sql against that exact source, then save receipt and build dependency/transfer manifest. Reclaim writer after status/diff read. Do not auto-resume dev under the free-project limit; no charges/deletes/upgrades or worker execution authorized. Overall transfer/cleanup incomplete; no database DDL/DML/data copy done.

## Handoff: DB-CONSOLIDATE-001 User-DB corpus organization plan (Codex, 2026-11-01)

Status: **bounded planning/preflight complete; live work pending access**. Owner Codex, reviewer unassigned. Branch `main`, base `f853dbd`. Resulting commit: `734e36c` (batch synchronized by Git Agent on `main` and `go-backend`). Prior REPOSYNC-002a/b tree8c626e9a41a5 and Claude GIT-REPAIR-001 work preserved; no verifier or writer displaced.

DB-CONSOLIDATE-001 owner update2026-11-01: Repo-DB application objects/data are to consolidate into corpus schema inside User-DB while preserving existing app behavior/data. This supersedes separate-project assumptions. Worker needs corpus-only capability, never User-DB service-role key. Live identity/inventory, backup/restore, reviewed additive scripts, reconciliation and rollback remain required; no transfer or cleanup executed. See docs/plans/database-consolidation.md.

Owner answered cleanup choice: separate corpus schema inside User-DB; preserve existing data and app behavior. Historical sourcekiadrbqkkmncoblpcobo, destinationkohwfuxqbllsmvmsfqci, organizationhithuduntbsajjhmnntm must be verified live. No Auth/Storage/managed-schema wholesale restore, no source deletion, no app-table renames. The old project-wide worker key would lose the user/corpus isolation benefit on consolidation; require scoped capability and inherited/PUBLIC grant denial tests. No new credential minted.

Changed files: docs/plans/database-consolidation.md; supabase/checks/db_consolidation_001_inventory.sql; ADR0002; architecture HLD/LLD; backend map/README; analysis-search-workers, next-agent-briefing, reposync-discover-readiness, migration-closeout; coordination. Other dirty changes are prior preserved REPOSYNC work. No Go/contract/lesson edits in this task.

Installed official supabase-postgres-best-practices1.1.1 via skill-installer from supabase/agent-skills into userCodexskills;36Markdown files, no executable scripts. Loaded SKILL and privileges guidance; next turn automatic discovery. Initial git remote transport failed localproxy, normal installer archive succeeded. No permission refusal bypassed. Supabase plugin search found available but uninstalled/unconnected; suggested installation/connection; no query connector exposed, no SQL/row copy/schema/role/runtime/deployment operations.

Checks: source-reviewed metadata-only read-only SQL (not parser/live validated), project refs against existing shared records, plan/ADR link/reference and diff checks; normal full handoff follows. Sources: official skillGitHub, Supabase roles, PostgreSQL transaction docs. Custom-schema docs fetch failed; no API guessed. Live schema/capacity/permissions unknown; no execution success claimed. No independent review for consolidation yet.

Writer released: yes. No application or worker processes owned; verifier has its own lease while checking. Overall consolidation/migration remains gated. Next: inspect final matching status, install/connect Supabase via offered integration; verify org/source/destination independently and run prepared read-only inventory. If source paused, prepare exact resumption action before asking; then dependency/manifest/capacity/backup and least-privilege package. Do not use the old Corpus project-wide service key design.

## Handoff: REPOSYNC-002a/b Discover preflight and offline planner (Codex, 2026-11-01)

Status: **implementation complete for bounded local foundation; not deployed**. Owner Codex; independent read-only reviewer review_discover. Branch `main`, base `f853dbd`. Resulting commit: `734e36c` (batch synchronized by Git Agent on `main` and `go-backend`). Prior Claude GIT-REPAIR-001 coordination diff preserved.

REPOSYNC-002a/b (2026-11-01): accepted HLD discovery direction now has a pure offline Go search-slice planner. Counts above1000 split inclusive UTC date ranges, then bounded star ranges; incomplete/invalid counts fail, one-day unbounded stars request a verified bound, unsplittable crowded slices block. Enumerate means paging eligibility, never completion. No worker/network/runtime/legacy-contract changes. Metadata-only corpus preflight prepared, not executed.

Changed files: backend/internal/discover/slices.go and slices_test.go; supabase/checks/corpus_001_inventory.sql; docs/plans/reposync-discover-readiness.md; docs/plans/analysis-search-workers.md; docs/backend-map.md; backend/README.md; docs/bug-register.md (R-193 accepted-direction clarification, still open); docs/next-agent-briefing.md; learn-go/README.md and new48-splitting-search-ranges/{README.md,exercise.go,exercise_test.go,solution.go}; docs/coordination.md. No existing exercise.go or RepoSync v1 implementation/fixture changed.

Checks: initial missing-symbol regression; four planner tests green including499 date ranges/390 star ranges and edge/error cases; focused go test -count=1 ./internal/discover ./internal/reposync ./cmd/reposync passed, focused vet passed. Both deliberate cap/date-overlap breaks failed behavior tests and exact source restored95be268977534d2fb95707a67ef6d8583e5e2d81f3417a7c80f86389a0263aa2. Independent source review found no material issues; readiness wording correction applied. SQL source-reviewed only, not executed or parser-validated. First full handoff stopped at the lesson-index test: the new lesson link was outside the required table. Added its table row; focused learn-go-index test1/1 passed. References/diff checks passed; normal full handoff rerun follows. Lessons skipped owner policy, no browser production change requiring build.

No Supabase query connector or psql available; required Browser unavailable at previous checkpoint. No credentials read, application rows fetched, SQL executed, worker run, cron configured or service deployed. Catalog script returns metadata only, not function bodies/defaults/policy expressions/scheduler commands; it does not prove grants or active corpus. Asked owner only for public organization/project identity, answer pending. Prior exact signing approval untouched.

Writer released: yes. No owned application/worker processes; handoff verifier tracks its own lease. Overall migration remains gated. Next: verify matching final status; identify existing intended Repo-DB independently and perform authorized read-only inventory when access exists; then review corpus/jobs proposal and atomic fenced checkpoint/output boundaries (002c). Do not infer a project or enable legacyworker; next executor stages can use local interfaces/fakes but live adapters require verified schema.

## Handoff: GIT-REPAIR-001, the Git Agent's interrupted rebase (Claude Code, 2026-11-01)

Status: **complete; repository state repaired with the owner's approval; nothing discarded, nothing pushed.** Writer Claude Code.

Found on resume: the checkout was in an interactive rebase of `main` onto `origin/main` (`d6dc301`), started by the Git Agent on 2026-10-31 at 01:26 after it committed `b034e1f` (Decision Pack 2: BUG-048 to BUG-069 and CLOSEOUT-001; 132 files) and `f853dbd` (its sync record). The rebase had stopped with a stale empty `.git/index.lock` from the same minute: `b034e1f` was listed as done but never applied, `HEAD` was detached at `d6dc301`, and the working tree looked clean. `git rebase --continue` would have dropped `b034e1f` from `main` (recoverable from the reflog, but lost from the branch). No git process was running.

Repair, after the owner chose "Yes, repair it": checked no git process and an empty lock; removed `.git/index.lock`; `git rebase --abort`. Result: on branch `main` at `f853dbd`, `b034e1f` an ancestor of `HEAD`, working tree clean. `main` and `origin/main` differ by 2 local commits and 1 remote commit (the timestamp file only): the Git Agent's next sync must integrate and push them. Claude Code did not push.

Census of open register entries (2026-11-01): all remaining entries wait on the owner, hosted access, a cutover approval or Phase 7: playground keys (R-039, R-127 to R-143, R-177, R-182: hosted dashboard acceptance), workers (R-116 to R-123, R-199 to R-201: active pipeline and corpus not established), RepoSync (R-189 to R-198: fixes follow an approved cutover; R-193 needs an owner product choice), R-015 (owner's lesson), R-032 (Phase 7), R-033 (remaining parts), R-038 (AI keys first), R-065/R-066 (domain), R-017 (rest deferred). R-028 describes the retired trending refresh job and likely needs closing as resolved by retirement (owner).

Changed files: `docs/coordination.md` only.

Next: the Git Agent syncs and pushes; independent review of `b034e1f` (another agent wrote it); the owner's gates as listed in `plans/migration-closeout-2026-10-30.md`.

Writer released: yes. No processes left running.

## Handoff: CLOSEOUT-001 recovery decision and current pickup (Codex, 2026-10-31)

Status: **bounded documentation complete**. Owner Codex; reviewer unassigned. Branch `main`, base `f5c5640`. Resulting commit: `b034e1f` (batch synchronized by Git Agent on `main` and `go-backend`). Prior 131-file tree c1ab4576a0d3 passed full handoff; no lease or writer at claim. Prior dirty work preserved. Overall migration gates are recorded separately below.

Owner decision 2026-10-31 (CLOSEOUT-001): accept manual crash-lock recovery and defer R-209 automatic recovery until after Phase 7. An operator must verify the owning request/process stopped and remove only the exact user lock after inspecting the current profile. Never remove by age or steal a potentially active lock. Hosted lock permissions, insert atomicity, signed-in replacement and participation by all active upload writers remain rollout gates. This decision authorizes no activation or deployment.

Owner cannot reconnect Browser. Explained its use for authenticated Supabase dashboard signing and private-form checks; no browser is required for local checks. Exact existing development approval remains valid and unexecuted; no repeated reconnection request is pending. No key, user, token, SQL, production setting or deployment was created/changed.

Changed files: docs/coordination.md, docs/bug-register.md, docs/adr/0002-go-backend.md, docs/plans/avatar-cleanup-r095.md, docs/plans/migration-closeout-2026-10-30.md, docs/next-agent-briefing.md. Corrected the briefing current pickup, next IDs and unsupported blanket production claim. Register census: 209 entries, 160 fixed-prefixed, 12 deferred-prefixed, 37 other/open/partial/gated; labels are not live verification.

Checks: documentation references, census and git diff --check passed. First handoff passed contracts and Go test/vet/gofmt, then refused its completion signal because the status line included the overall migration's incomplete state. The completed documentation status is now separate from the overall gates; normal handoff follows for final fingerprint, lessons skipped by policy. No application changes or new browser build required. BUG-069 full handoff passed c1ab4576a0d3 (contracts, Go test/vet/gofmt). No new independent review, commit/push or deployment claimed. Writer released; no owned application processes. Overall migration remains incomplete at keys hosted acceptance/production approval, avatar hosted/all-writers checks, worker/schema gates, independent review and signed-in desktop/375px walk-through. Next: inspect final matching verification status; Git Agent synchronization and independent review of accumulated uncommitted source; resume exact hosted acceptance only when required browser capability returns. Do not broaden the narrow retirement exception or auto-expire locks.

## Handoff: BUG-069/R-077 public replacement/retirement verification (Codex, 2026-10-31)

Status: **bounded verification complete; no code change**. Owner Codex, reviewer unassigned; main base/current f5c5640, resulting documentation explicitly uncommitted. Previous BUG-068 full handoff8a5ba4c1500a passed; prior work preserved.

BUG-069/R-077, 2026-10-31: owner-approved replacement/retirement is observed at the website. GET /api/trending/topics returns200 from Go with6 populated topics/30 repository entries; GET /api/trending/refresh returns404. No deployment was performed by this task. Helpers/table/data retained; external scheduler inventory and general Phase7 cleanup remain separate gates.

Changed files: docs/verification/trending-retirement-2026-10-31.json, docs/bug-register.md, docs/backend-map.md, backend/README.md, docs/plans/route-completion-review.md, docs/plans/migration-closeout-2026-10-30.md, docs/next-agent-briefing.md and docs/coordination.md. Checks: public curl GET topics and refresh with20s bounds succeeded; parsed only schema/counts, no private data/auth or writes. OPTIONS preflight ambiguity was resolved with the read-only GET supported by the old route. JSON parse, retained path/reference and git diff --check follow. Existing implementation/retirement regression guards remain; no API/Go/lesson/exercise changes. Full normal handoff follows for the documentation fingerprint; lesson checks skipped by policy. No new review, commit/push, deployment, SQL, signing, keys or scheduling operation.

Overall migration remains blocked/incomplete: required browser host unavailable; existing exact dev acceptance approval/hash persists and no resources consumed. Reconnection and R-209 manual-recovery/deferral question are pending; no answer is assumed. Independent review/hosted acceptance, other owner/schema/worker and walk-through gates remain. Writer released, no owned servers/processes; verifier owns its lease while running. Next: inspect final status/Git, obtain the pending connection/owner inputs, resume exact approved preflight and prepare remaining rollout work without starting broad Phase7 cleanup.

## Historical checkpoint: BUG-069/R-077 (2026-10-31)

Status: **in progress / incomplete**. Codex owner, reviewer unassigned; main base/current f5c5640. BUG-068 full handoff8a5ba4c1500a passed and no lease/writer at claim. Scope: record actual non-mutating public observations for existing owner-approved TREND-001 replacement/retirement, update gate state and closeout. No code, SQL, scheduler configuration or deployment change. GET topics200/Go/six populated topics30 entries; GET refresh404. OPTIONS refresh204 is global preflight, not route-presence proof; GET is the retirement proof. Next: receipt/docs/reference checks and normal handoff.

## Handoff: BUG-068/R-090 share-removal privacy fix (Codex, 2026-10-31)

Status: **implementation complete for this bounded fix; unreviewed; not deployed**. Owner Codex, reviewer unassigned; main base/current f5c5640, explicitly uncommitted. Prior127-file verified treeadb80bb12895 preserved; no other writer or verification lease at claim.

Recorded owner2026-10-18 decision authorized fixing R-090 in Go after cutover. The website OPTIONS request returned405, Allow DELETE/POST, X-Sefgh-Backend go; public non-mutating receipt docs/verification/share-go-cutover-2026-10-31.json records limits. No live shares were read or modified. Required browser host remains unavailable on fresh check; existing exact dev signing approval persists, no material/users/passwords/tokens/run created.

R-090 now updates all active shares matching both caller and conversation, then verifies an empty active-share list before reporting ok. Failed writes return the existing fixed400 error; failed, malformed or nonempty verification returns fixed500. No lookup failure can silently report deletion. Zero existing shares remain idempotent. Credentials/RLS scope stay user-bound.

Changed files: backend/internal/shares/handler.go, contract_test.go, unshare_test.go; contracts/conversation-share/cases.json and README.md; scripts/contracts/conversation-share.test.mjs; lesson30/index; backend README; docs/backend-map.md, bug-register.md, coordination.md, next-agent-briefing.md, plans/migration-closeout-2026-10-30.md and verification/share-go-cutover-2026-10-31.json. Next handlers untouched. No schema/privilege changes; new predicates reuse the existing lookup columns. Snapshot RLS documentation is not fresh hosted proof.

Checks: initial contract regression failed; go test -count=1 ./internal/shares, go vet ./internal/shares and focused API share/conversation/fork wiring tests passed; Node73/73 passed. Stateful test verifies both active own rows are removed, other user/conversation/deleted rows preserved, silent no-update and failed/malformed verification cannot succeed. Separate deliberate breaks detected incorrect caller predicate and skipped nonempty verification; exact source restored f53cf3cb866b73bf16882d6f623b2c1ba0b570668319afcd9587a55fd8be8033. Full npm run handoff follows; consult matching signal/status. Final browser lint/build passed in BUG-066, unchanged since. Lessons skipped by policy; existing exercise.go untouched. No new peer review or deployment claimed.

Writer released: yes. No owned servers/processes at release; verifier tracks its own lease. Overall migration remains blocked/incomplete at the closeout report's browser/owner/schema/worker/walk-through/retirement gates. Next: inspect final handoff/status/Git; independent review and hosted acceptance before deploying R-090; restore required browser connection for existing approved development acceptance. Do not auto-expire avatar locks or generalize the narrow retirement exception.

## Historical checkpoint: BUG-068/R-090 (2026-10-31)

Status: **in progress / incomplete**. Owner Codex, reviewer unassigned; main base/current f5c5640. Previous writer released; READY_VERIFIED treeadb80bb12895 and clear lease confirmed, prior127-file work preserved. Owner decision2026-10-18 explicitly fixes R-090 in Go after cutover. Non-mutating OPTIONS on the website share route now returned405, Allow DELETE/POST and X-Sefgh-Backend go, satisfying that prerequisite. No shares, SQL or settings were changed. Scope: owner-scoped bulk unshare and post-write empty verification; fixture/rollback regression, deliberate break, lesson/docs, handoff. Browser host still unavailable; no signing actions. Next: contract v3 and initial regression.

## Handoff: BUG-067/R-207 and local migration wrap-up (Codex, 2026-10-30)

Status: **implementation complete for the bounded local work; unreviewed; not deployed**. Codex owner, reviewer unassigned; main base/current f5c5640, explicitly uncommitted. Prior BUG-065 full handoff e6fe2d411b44 and BUG-066 full handoff0a85bf3acd6f passed; all prior work preserved.

BUG-067/R-207 enforces the existing39-character contributions login limit with an explicit length guard before the handler token check or GraphQL request. Interleaved hyphens cannot admit40/77-character names; valid39-character names still pass. Invalid400 text is unchanged, and Next rollback replies/calls are preserved.

Checks: initial compiled contract regression failed40/77/pre-token cases in memory/socket suites. go test -count=1 ./internal/githubcontributions and go vet ./internal/githubcontributions passed; Node112/112 passed. Deliberately removing the guard failed the same cases; exact source restored 3a768c67718440def8912e2eb82186bddc3b188375b03ca95eee7ee5ec5aedbb. Contract v4/lesson13/index/readmes updated; existing exercises unchanged and lesson checks skipped by policy. Final browser production source passed lint/build in BUG-066 with existing stale browser-data advisories; no later browser production edits. Full npm run handoff follows.

Overall migration: **blocked / incomplete**. All27 approved pack fixes and React follow-ups R-205/R-206 plus documented guard R-207 are implemented locally. The closeout report records209 register rows: 158 fixed-prefixed statuses, 11 deferred-prefixed, 40 other/open/partial/gated. These are literal labels, not production receipts. Phase6/7 gates remain; no broad retirement exception, production/key activation, SQL, deployment, commit/push or peer review is claimed. Required browser host is still unavailable; reconnection request pending, exact development-plan hash/approval preserved. No private material/users/passwords/tokens/run created. Avatar R-209 and all-writers/hosted acceptance remain rollout gates; never auto-steal a lock.

Actual checkout file list, including preserved earlier tasks:

- `backend/README.md`
- `backend/cmd/api/ai_safety_test.go`
- `backend/cmd/api/ai_wiring_test.go`
- `backend/cmd/api/avatar_wiring_test.go`
- `backend/cmd/api/videos_wiring_test.go`
- `backend/internal/activity/contract_test.go`
- `backend/internal/activity/grid.go`
- `backend/internal/activity/node_test.go`
- `backend/internal/aichat/contract_test.go`
- `backend/internal/aichat/handler.go`
- `backend/internal/aichat/title.go`
- `backend/internal/aichat/title_test.go`
- `backend/internal/aienhance/contract_test.go`
- `backend/internal/aienhance/handler.go`
- `backend/internal/aiprovider/title.go`
- `backend/internal/aisuggestions/contract_test.go`
- `backend/internal/aisuggestions/handler.go`
- `backend/internal/avatar/contract_test.go`
- `backend/internal/avatar/handler.go`
- `backend/internal/avatar/handler_test.go`
- `backend/internal/collect/contract_test.go`
- `backend/internal/collect/handler.go`
- `backend/internal/comments/contract_test.go`
- `backend/internal/comments/handler.go`
- `backend/internal/commentvote/contract_test.go`
- `backend/internal/commentvote/handler.go`
- `backend/internal/githubcontributions/contract_test.go`
- `backend/internal/githubcontributions/dates.go`
- `backend/internal/githubcontributions/dates_test.go`
- `backend/internal/githubcontributions/handler.go`
- `backend/internal/jscompat/text.go`
- `backend/internal/rating/contract_test.go`
- `backend/internal/rating/handler.go`
- `backend/internal/shares/contract_test.go`
- `backend/internal/shares/handler.go`
- `backend/internal/shares/handler_test.go`
- `backend/internal/sharetoken/contract_test.go`
- `backend/internal/sharetoken/handler.go`
- `backend/internal/sharetoken/handler_test.go`
- `backend/internal/supabaserest/supabaserest.go`
- `backend/internal/videos/contract_test.go`
- `backend/internal/videos/handler.go`
- `backend/internal/vote/contract_test.go`
- `backend/internal/vote/handler.go`
- `contracts/activity/README.md`
- `contracts/activity/cases.json`
- `contracts/ai-chat/README.md`
- `contracts/ai-chat/cases.json`
- `contracts/ai-enhance-query/README.md`
- `contracts/ai-enhance-query/cases.json`
- `contracts/ai-suggestions/README.md`
- `contracts/ai-suggestions/cases.json`
- `contracts/comment-vote/README.md`
- `contracts/comment-vote/cases.json`
- `contracts/conversation-share/README.md`
- `contracts/conversation-share/cases.json`
- `contracts/github-contributions/README.md`
- `contracts/github-contributions/cases.json`
- `contracts/repo-collect/README.md`
- `contracts/repo-collect/cases.json`
- `contracts/repo-comments/README.md`
- `contracts/repo-comments/cases.json`
- `contracts/repo-rating/README.md`
- `contracts/repo-rating/cases.json`
- `contracts/repo-videos/README.md`
- `contracts/repo-videos/cases.json`
- `contracts/repo-vote/README.md`
- `contracts/repo-vote/cases.json`
- `contracts/share-fork/README.md`
- `contracts/share-fork/cases.json`
- `contracts/share-token/README.md`
- `contracts/share-token/cases.json`
- `contracts/upload-avatar/README.md`
- `contracts/upload-avatar/cases.json`
- `docs/backend-map.md`
- `docs/bug-register.md`
- `docs/coordination.md`
- `docs/next-agent-briefing.md`
- `docs/plans/phase6-decision-pack-2.md`
- `learn-go/13-time-and-clocks/README.md`
- `learn-go/19-counting-requests/README.md`
- `learn-go/20-text-as-javascript-counts-it/README.md`
- `learn-go/22-reading-rows-as-the-user/README.md`
- `learn-go/24-optional-sign-in/README.md`
- `learn-go/25-writing-as-the-user/README.md`
- `learn-go/27-when-text-meets-numbers/README.md`
- `learn-go/28-many-at-once-one-failure-for-all/README.md`
- `learn-go/29-a-javascript-pattern-in-go/README.md`
- `learn-go/30-defaults-and-missing-values/README.md`
- `learn-go/31-bounded-file-streams/README.md`
- `learn-go/32-request-budgets-and-redirects/README.md`
- `learn-go/45-copying-javascript-string-rules/README.md`
- `learn-go/README.md`
- `scripts/contracts/activity-run.mjs`
- `scripts/contracts/activity.test.mjs`
- `scripts/contracts/ai-chat.test.mjs`
- `scripts/contracts/ai-enhance-query.test.mjs`
- `scripts/contracts/ai-suggestions.test.mjs`
- `scripts/contracts/avatar-fixture.mjs`
- `scripts/contracts/comment-vote.test.mjs`
- `scripts/contracts/conversation-share.test.mjs`
- `scripts/contracts/github-contributions.test.mjs`
- `scripts/contracts/handoff-state.test.mjs`
- `scripts/contracts/repo-collect.test.mjs`
- `scripts/contracts/repo-comments.test.mjs`
- `scripts/contracts/repo-rating.test.mjs`
- `scripts/contracts/repo-videos.test.mjs`
- `scripts/contracts/repo-vote.test.mjs`
- `scripts/contracts/share-fork.test.mjs`
- `scripts/contracts/share-token.test.mjs`
- `scripts/contracts/trending-hook.test.mjs`
- `scripts/contracts/upload-avatar.test.mjs`
- `scripts/handoff-state.mjs`
- `src/components/trending/TrendingDeveloperCard.jsx`
- `src/hooks/chat/useChatMessages.js`
- `src/hooks/trending/useTrendingData.js`
- `backend/internal/aienhance/basic_test.go`
- `backend/internal/avatar/replacement_test.go`
- `docs/plans/avatar-cleanup-r095.md`
- `docs/plans/migration-closeout-2026-10-30.md`
- `scripts/contracts/activity-model.mjs`
- `scripts/contracts/chat-empty-reply.test.mjs`
- `scripts/contracts/contributions-fixture.mjs`
- `scripts/contracts/trending-card-navigation.test.mjs`
- `scripts/contracts/trending-feedback.test.mjs`
- `src/lib/ai/chat-response.js`
- `src/lib/utils/trending/feedback.js`

Writer released: yes. No owned servers/processes at release; verifier tracks its own lease while checking. Next: inspect final status/Git; restore required browser access to resume the already-approved development acceptance from fresh preflight; review the remaining owner/schema/worker/walk-through gates in docs/plans/migration-closeout-2026-10-30.md. Do not mark the whole migration complete.

## Historical checkpoint: BUG-067/R-207

Status: **in progress / incomplete**. Codex owner, reviewer unassigned; main base/current f5c5640. Prior BUG-066 full handoff verified and lease clear before claim. Scope: standing owner approval to fix recorded bugs and wrap migration; enforce the existing documented39-character login maximum, with unchanged400 invalid-username reply. No new product policy, Next rollback fix or live action. Prior work preserved. Next: contract v4, boundary regression, Go guard, deliberate break, lesson/docs and handoff.

## Handoff: BUG-066/R-205/R-206 browser closeout (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Codex owner, reviewer unassigned; main base/current f5c5640, explicitly uncommitted. Prior BUG-065 handoff e6fe2d411b44 passed and all prior work preserved.

BUG-066 closes R-205/R-206 in React: trending errors show available wait seconds from Retry-After or reset metadata, and placeholder popular-repository labels have no navigation handler. Real repository names use keyboard-accessible buttons with validated paths. API contracts stay unchanged.

Changed files: src/lib/utils/trending/feedback.js, src/hooks/trending/useTrendingData.js, src/components/trending/TrendingDeveloperCard.jsx, scripts/contracts/trending-hook.test.mjs, scripts/contracts/trending-card-navigation.test.mjs, scripts/contracts/trending-feedback.test.mjs, docs/bug-register.md, docs/backend-map.md, docs/next-agent-briefing.md, docs/plans/migration-closeout-2026-10-30.md and docs/coordination.md. No Go/API contract or lesson/exercise changes.

Checks: actual hook rate-limit regression and three compiled card regressions failed first. Next SWC harness needed explicit loadBindings; two draft JSX span markers failed before any card write and were corrected. Focused Node18/18 passed, npm run lint passed, npm run build passed with existing stale browser-data advisories. Separate deliberate breaks detected lost rate feedback and placeholder navigation; exact helper restored dba4b35acfaa5febd8026170ec84b4eafb084fccea66f78e1896208a61cf0d98. Stale/unmount hook cases remain passing. These are hook/compiled element checks, not a DOM/live-browser walk-through. Full npm run handoff follows.

No live services, signing, SQL or deployment. Browser host remains unavailable and reconnection request pending; existing approval preserved. Writer released, no owned servers/processes; verifier records its own lease while checking. Next: inspect status/Git, then remaining documented guard R-207 and external closeout gates.

## Historical checkpoint: BUG-066 trending browser closeout

Milestone: 18 focused checks passed after behavioral regressions for hook wait text and actual compiled card handlers. Changed src/lib/utils/trending/feedback.js, src/hooks/trending/useTrendingData.js, src/components/trending/TrendingDeveloperCard.jsx, scripts/contracts/trending-hook.test.mjs and new trending-card-navigation/trending-feedback tests. Initial card harness needed SWC loadBindings; then all three card behavior regressions failed as intended. Fixed two draft span markers before any card write; hook/helper partial edits were preserved and validated. Lint/build running in exec session79217; no verifier lease. Next inspect results, deliberate breaks, docs and full handoff.

Status: **in progress / incomplete**. Codex owner, reviewer unassigned; main base/current f5c5640, prior BUG-065 full handoff e6fe2d411b44 passed and lease clear. Preserve all prior work. Scope: the two recorded unblocked React trending follow-ups R-205/R-206, regression checks, lint/build and docs/handoff. No API behavior change, Go changes, signing or deployment. Browser host remains unavailable; request pending.

## Handoff: BUG-065/R-037 and migration closeout (Codex, 2026-10-30)

Status: **implementation complete for BUG-065 and local closeout report; unreviewed; not deployed; overall migration remains gated**. Codex owner, reviewer unassigned. Main base/current f5c5640, explicitly uncommitted; prior114-file verified tree996732d7b225 preserved. All27 approved pack fixes implemented locally.

Suggestions reject present non-text queries with400, trim before every length check and provider prompt, filter blank/non-text items and deduplicate before taking three AI results. Built-in results are suppressed only by selected AI items; final output remains capped atfive. Missing queries retain the empty-list response.

Checks: initial contract regressions failed in memory/socket suites; go test -count=1 ./internal/aisuggestions passed, focused API wiring/AI/quota tests passed, go vet ./internal/aisuggestions passed, Node54/54 passed. Three deliberate breaks produced behavioral failures and source restored exactly (4b3216a03f7531c9382a8a9a07d37317705c2fa5a5922f2d45b48c4999371940). UI lint/build passed in BUG-060; no later production browser source change. Lessons updated; existing exercises untouched, lesson tests skipped by policy. Full npm run handoff follows; matching status/signal is required for proof. No peer review claimed.

Closeout audit: docs/plans/migration-closeout-2026-10-30.md records actual register census and remaining keys, avatar, worker, signed-in walk-through and Phase7 gates. Approved development-plan hash reverified exactly. Fresh cua_repl getState returned no browsers and browser access host unavailable. No signing material, users, passwords, tokens or acceptance run created. Browser reconnection request is pending; existing approval is not requested again. No live SQL/activation/deployment, commit or push. Overall migration is incomplete; Phase7 remains gated.

Changed checkout files (includes preserved earlier tasks):

- `backend/README.md`
- `backend/cmd/api/ai_safety_test.go`
- `backend/cmd/api/ai_wiring_test.go`
- `backend/cmd/api/avatar_wiring_test.go`
- `backend/cmd/api/videos_wiring_test.go`
- `backend/internal/activity/contract_test.go`
- `backend/internal/activity/grid.go`
- `backend/internal/activity/node_test.go`
- `backend/internal/aichat/contract_test.go`
- `backend/internal/aichat/handler.go`
- `backend/internal/aichat/title.go`
- `backend/internal/aichat/title_test.go`
- `backend/internal/aienhance/contract_test.go`
- `backend/internal/aienhance/handler.go`
- `backend/internal/aiprovider/title.go`
- `backend/internal/aisuggestions/contract_test.go`
- `backend/internal/aisuggestions/handler.go`
- `backend/internal/avatar/contract_test.go`
- `backend/internal/avatar/handler.go`
- `backend/internal/avatar/handler_test.go`
- `backend/internal/collect/contract_test.go`
- `backend/internal/collect/handler.go`
- `backend/internal/comments/contract_test.go`
- `backend/internal/comments/handler.go`
- `backend/internal/commentvote/contract_test.go`
- `backend/internal/commentvote/handler.go`
- `backend/internal/githubcontributions/contract_test.go`
- `backend/internal/githubcontributions/dates.go`
- `backend/internal/githubcontributions/dates_test.go`
- `backend/internal/githubcontributions/handler.go`
- `backend/internal/jscompat/text.go`
- `backend/internal/rating/contract_test.go`
- `backend/internal/rating/handler.go`
- `backend/internal/shares/contract_test.go`
- `backend/internal/shares/handler.go`
- `backend/internal/shares/handler_test.go`
- `backend/internal/sharetoken/contract_test.go`
- `backend/internal/sharetoken/handler.go`
- `backend/internal/sharetoken/handler_test.go`
- `backend/internal/supabaserest/supabaserest.go`
- `backend/internal/videos/contract_test.go`
- `backend/internal/videos/handler.go`
- `backend/internal/vote/contract_test.go`
- `backend/internal/vote/handler.go`
- `contracts/activity/README.md`
- `contracts/activity/cases.json`
- `contracts/ai-chat/README.md`
- `contracts/ai-chat/cases.json`
- `contracts/ai-enhance-query/README.md`
- `contracts/ai-enhance-query/cases.json`
- `contracts/ai-suggestions/README.md`
- `contracts/ai-suggestions/cases.json`
- `contracts/comment-vote/README.md`
- `contracts/comment-vote/cases.json`
- `contracts/conversation-share/README.md`
- `contracts/conversation-share/cases.json`
- `contracts/github-contributions/README.md`
- `contracts/github-contributions/cases.json`
- `contracts/repo-collect/README.md`
- `contracts/repo-collect/cases.json`
- `contracts/repo-comments/README.md`
- `contracts/repo-comments/cases.json`
- `contracts/repo-rating/README.md`
- `contracts/repo-rating/cases.json`
- `contracts/repo-videos/README.md`
- `contracts/repo-videos/cases.json`
- `contracts/repo-vote/README.md`
- `contracts/repo-vote/cases.json`
- `contracts/share-fork/README.md`
- `contracts/share-fork/cases.json`
- `contracts/share-token/README.md`
- `contracts/share-token/cases.json`
- `contracts/upload-avatar/README.md`
- `contracts/upload-avatar/cases.json`
- `docs/backend-map.md`
- `docs/bug-register.md`
- `docs/coordination.md`
- `docs/next-agent-briefing.md`
- `docs/plans/phase6-decision-pack-2.md`
- `learn-go/13-time-and-clocks/README.md`
- `learn-go/19-counting-requests/README.md`
- `learn-go/20-text-as-javascript-counts-it/README.md`
- `learn-go/22-reading-rows-as-the-user/README.md`
- `learn-go/24-optional-sign-in/README.md`
- `learn-go/25-writing-as-the-user/README.md`
- `learn-go/27-when-text-meets-numbers/README.md`
- `learn-go/28-many-at-once-one-failure-for-all/README.md`
- `learn-go/29-a-javascript-pattern-in-go/README.md`
- `learn-go/30-defaults-and-missing-values/README.md`
- `learn-go/31-bounded-file-streams/README.md`
- `learn-go/32-request-budgets-and-redirects/README.md`
- `learn-go/45-copying-javascript-string-rules/README.md`
- `learn-go/README.md`
- `scripts/contracts/activity-run.mjs`
- `scripts/contracts/activity.test.mjs`
- `scripts/contracts/ai-chat.test.mjs`
- `scripts/contracts/ai-enhance-query.test.mjs`
- `scripts/contracts/ai-suggestions.test.mjs`
- `scripts/contracts/avatar-fixture.mjs`
- `scripts/contracts/comment-vote.test.mjs`
- `scripts/contracts/conversation-share.test.mjs`
- `scripts/contracts/github-contributions.test.mjs`
- `scripts/contracts/handoff-state.test.mjs`
- `scripts/contracts/repo-collect.test.mjs`
- `scripts/contracts/repo-comments.test.mjs`
- `scripts/contracts/repo-rating.test.mjs`
- `scripts/contracts/repo-videos.test.mjs`
- `scripts/contracts/repo-vote.test.mjs`
- `scripts/contracts/share-fork.test.mjs`
- `scripts/contracts/share-token.test.mjs`
- `scripts/contracts/upload-avatar.test.mjs`
- `scripts/handoff-state.mjs`
- `src/hooks/chat/useChatMessages.js`
- `backend/internal/aienhance/basic_test.go`
- `backend/internal/avatar/replacement_test.go`
- `docs/plans/avatar-cleanup-r095.md`
- `docs/plans/migration-closeout-2026-10-30.md`
- `scripts/contracts/activity-model.mjs`
- `scripts/contracts/chat-empty-reply.test.mjs`
- `scripts/contracts/contributions-fixture.mjs`
- `src/lib/ai/chat-response.js`

Writer released: yes. No owned servers/processes at release; verifier owns its lease while checking. Next: inspect full handoff/status/Git, restore browser access for approved dev acceptance, and use the closeout report for remaining gate decisions. Do not resume signing without fresh preflight or generalize the narrow retirement exception.

## Historical checkpoint: BUG-065/R-037

Status: **in progress / incomplete**. Codex owner, reviewer unassigned. Main base/current f5c5640; prior114-file tree996732d7b225 verified and preserved uncommitted. Writer release and clear lease confirmed. Finish last approved pack fix, then audit remaining migration gates; no Phase7, live SQL, signing, activation or deployment inferred. Next: suggestions fixtures, regression, Go fix, lesson/docs and full handoff. No owned servers.

## Handoff: BUG-064/R-036 (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Owner Codex, reviewer unassigned; branch main, base/current f5c5640, resulting change explicitly uncommitted. Second batch 8/8; pack 26/27.

Built-in enhancement matches whole Unicode words, adds only words not already present, and trims surrounding whitespace. Operator/quoted queries retain their contents after trimming. Anthropic query text is JSON-escaped inside the prompt. Repeated basic enhancement is idempotent.

Changed files: backend/internal/aienhance/{handler.go,contract_test.go,basic_test.go}, backend/cmd/api/ai_wiring_test.go, contracts/ai-enhance-query/cases.json, scripts/contracts/ai-enhance-query.test.mjs; contract readmes, listed lessons/index, backend/map/register/pack/briefing and coordination as applicable. Prior work preserved. Checks: Whole-word/dedup/trim/prompt contract regressions failed first in memory/socket suites. Aienhance tests/vet and API wiring/isolation checks passed; Node84/84 passed. An old API wiring duplicate-word expectation was corrected without weakening the no-provider-call assertion. Idempotence property passed. Four deliberate breaks detected the four behaviors. UI lint/build already passed in BUG-060; no later browser production changes. Deliberate break: behavioral failure detected; exact source restored (3a1be6ae006538531bc3c753e5b0e262d4fff4ca22b30373213bd64fa1b36790). Full npm run handoff follows. Lessons skipped by owner policy. No live SQL/signing/activation/deployment. No owned processes at writer release; the verifier records its PID in its lease. Next: R-037 after handoff/status/Git inspection.

Writer released: yes.

Second eight-fix batch checkpoint: BUG-057/R-096, BUG-058/R-097, BUG-059/R-095, BUG-060/R-010, BUG-061/R-012, BUG-062/R-013, BUG-063/R-035 and BUG-064/R-036 implemented. Pack26/27; next BUG-065/R-037. Owner Codex, reviewer unassigned; base/current main f5c5640, explicitly uncommitted. Prior BUG-048 and first batch preserved. Full handoffs passed: BUG-057 b14acefa3cfd; BUG-058 51ef207d4f4d; BUG-059 c4efd2a4d752; BUG-060 722a3ac935a1; BUG-061 3b924e371f1a; BUG-062 9400190d7d40; BUG-063 e8ba24ab6868. Fresh final handoff follows.

Checks: npm run lint and npm run build passed for final browser production source in BUG-060, with pre-existing stale browser-data advisories only. Node focused suites passed55 avatar compensation,55 fixed avatar errors,61 serialized avatar replacement,109 chat hook/API/browser guards,92 Unicode title,94 whitespace/quote title,77 provider fallback and84 word/prompt checks. Backend focused commands used go test -count=1 and go vet; final npm run handoff runs go test -count=1 -p2 ./..., go vet ./... and gofmt inspection. Existing exercises untouched; lesson checks skipped by policy. Hook stand-ins are not DOM/live-browser proof. No live SQL, Storage objects, signing, credentials, activation, deployment, commit or push. No owned processes at writer release; verifier owns its lease/process while checking.

Remaining gates: unreviewed source and deployment pending. R-095 rollout requires hosted same-key non-overwrite/permissions and signed-in acceptance, all upload writers honoring the protocol, and operator recovery review. R-209 intentionally remains open: crashes/uncertain lock acquisitions can require manual release after proof the owner stopped; no automatic expiry/steal. See [the storage replacement design](plans/avatar-cleanup-r095.md). Separate hosted-key checkpoint and prior approvals preserved. Next command: inspect Git and handoff status, claim BUG-065/R-037 before editing suggestions input normalization/deduplication.

Actual checkout file list (includes preserved prior work and shared documents):

- `backend/README.md`
- `backend/cmd/api/ai_safety_test.go`
- `backend/cmd/api/ai_wiring_test.go`
- `backend/cmd/api/avatar_wiring_test.go`
- `backend/cmd/api/videos_wiring_test.go`
- `backend/internal/activity/contract_test.go`
- `backend/internal/activity/grid.go`
- `backend/internal/activity/node_test.go`
- `backend/internal/aichat/contract_test.go`
- `backend/internal/aichat/handler.go`
- `backend/internal/aichat/title.go`
- `backend/internal/aichat/title_test.go`
- `backend/internal/aienhance/contract_test.go`
- `backend/internal/aienhance/handler.go`
- `backend/internal/aiprovider/title.go`
- `backend/internal/avatar/contract_test.go`
- `backend/internal/avatar/handler.go`
- `backend/internal/avatar/handler_test.go`
- `backend/internal/collect/contract_test.go`
- `backend/internal/collect/handler.go`
- `backend/internal/comments/contract_test.go`
- `backend/internal/comments/handler.go`
- `backend/internal/commentvote/contract_test.go`
- `backend/internal/commentvote/handler.go`
- `backend/internal/githubcontributions/contract_test.go`
- `backend/internal/githubcontributions/dates.go`
- `backend/internal/githubcontributions/dates_test.go`
- `backend/internal/githubcontributions/handler.go`
- `backend/internal/jscompat/text.go`
- `backend/internal/rating/contract_test.go`
- `backend/internal/rating/handler.go`
- `backend/internal/shares/contract_test.go`
- `backend/internal/shares/handler.go`
- `backend/internal/shares/handler_test.go`
- `backend/internal/sharetoken/contract_test.go`
- `backend/internal/sharetoken/handler.go`
- `backend/internal/sharetoken/handler_test.go`
- `backend/internal/supabaserest/supabaserest.go`
- `backend/internal/videos/contract_test.go`
- `backend/internal/videos/handler.go`
- `backend/internal/vote/contract_test.go`
- `backend/internal/vote/handler.go`
- `contracts/activity/README.md`
- `contracts/activity/cases.json`
- `contracts/ai-chat/README.md`
- `contracts/ai-chat/cases.json`
- `contracts/ai-enhance-query/README.md`
- `contracts/ai-enhance-query/cases.json`
- `contracts/comment-vote/README.md`
- `contracts/comment-vote/cases.json`
- `contracts/conversation-share/README.md`
- `contracts/conversation-share/cases.json`
- `contracts/github-contributions/README.md`
- `contracts/github-contributions/cases.json`
- `contracts/repo-collect/README.md`
- `contracts/repo-collect/cases.json`
- `contracts/repo-comments/README.md`
- `contracts/repo-comments/cases.json`
- `contracts/repo-rating/README.md`
- `contracts/repo-rating/cases.json`
- `contracts/repo-videos/README.md`
- `contracts/repo-videos/cases.json`
- `contracts/repo-vote/README.md`
- `contracts/repo-vote/cases.json`
- `contracts/share-fork/README.md`
- `contracts/share-fork/cases.json`
- `contracts/share-token/README.md`
- `contracts/share-token/cases.json`
- `contracts/upload-avatar/README.md`
- `contracts/upload-avatar/cases.json`
- `docs/backend-map.md`
- `docs/bug-register.md`
- `docs/coordination.md`
- `docs/next-agent-briefing.md`
- `docs/plans/phase6-decision-pack-2.md`
- `learn-go/13-time-and-clocks/README.md`
- `learn-go/20-text-as-javascript-counts-it/README.md`
- `learn-go/22-reading-rows-as-the-user/README.md`
- `learn-go/24-optional-sign-in/README.md`
- `learn-go/25-writing-as-the-user/README.md`
- `learn-go/27-when-text-meets-numbers/README.md`
- `learn-go/28-many-at-once-one-failure-for-all/README.md`
- `learn-go/29-a-javascript-pattern-in-go/README.md`
- `learn-go/30-defaults-and-missing-values/README.md`
- `learn-go/31-bounded-file-streams/README.md`
- `learn-go/32-request-budgets-and-redirects/README.md`
- `learn-go/45-copying-javascript-string-rules/README.md`
- `learn-go/README.md`
- `scripts/contracts/activity-run.mjs`
- `scripts/contracts/activity.test.mjs`
- `scripts/contracts/ai-chat.test.mjs`
- `scripts/contracts/ai-enhance-query.test.mjs`
- `scripts/contracts/avatar-fixture.mjs`
- `scripts/contracts/comment-vote.test.mjs`
- `scripts/contracts/conversation-share.test.mjs`
- `scripts/contracts/github-contributions.test.mjs`
- `scripts/contracts/handoff-state.test.mjs`
- `scripts/contracts/repo-collect.test.mjs`
- `scripts/contracts/repo-comments.test.mjs`
- `scripts/contracts/repo-rating.test.mjs`
- `scripts/contracts/repo-videos.test.mjs`
- `scripts/contracts/repo-vote.test.mjs`
- `scripts/contracts/share-fork.test.mjs`
- `scripts/contracts/share-token.test.mjs`
- `scripts/contracts/upload-avatar.test.mjs`
- `scripts/handoff-state.mjs`
- `src/hooks/chat/useChatMessages.js`
- `backend/internal/aienhance/basic_test.go`
- `backend/internal/avatar/replacement_test.go`
- `docs/plans/avatar-cleanup-r095.md`
- `scripts/contracts/activity-model.mjs`
- `scripts/contracts/chat-empty-reply.test.mjs`
- `scripts/contracts/contributions-fixture.mjs`
- `src/lib/ai/chat-response.js`

## Historical checkpoint: BUG-064/R-036

Milestone: contract v4 updated and initial whole-word/dedup/trim/prompt regressions failed. Implementation passes aienhance contract tests; API wiring TestEnhanceUsesAnthropicWithoutAnOpenAIKeyAndNobodyWithoutEither retains old duplicated web expectation and is being corrected. Node rerun, deliberate breaks, lessons/docs and full handoff remain. Writer Codex; no verifier lease or owned servers. All earlier task handoffs passed through BUG-063 e8ba24ab6868.

Status: **in progress / incomplete**. Owner Codex, reviewer unassigned. Branch main, base/current f5c5640; prior 90-file verified tree73611e4258db preserved uncommitted. Scope: next approved pack fix; no existing exercise.go edits, live SQL, signing, activation or deployment. Writer release and lease absence confirmed before claim. Next: regression fixtures, implementation, deliberate break, lessons/docs and full handoff. Second batch queue: R-096, R-097, R-095, R-010, R-012, R-013, R-035, R-036. No owned servers.

## Handoff: BUG-063/R-035 (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Owner Codex, reviewer unassigned; branch main, base/current f5c5640, resulting change explicitly uncommitted. Second batch 7/8; pack 25/27.

Enhance-query falls back to its built-in enhancement after provider errors or blank replies, including refused redirects and bounded oversized replies. JSON null is400 Query is required, with no provider call. Query/key isolation, provider read bounds and allowance behavior remain.

Changed files: backend/internal/aienhance/{handler.go,contract_test.go}, backend/cmd/api/ai_safety_test.go, contracts/ai-enhance-query/cases.json, scripts/contracts/ai-enhance-query.test.mjs; contract readmes, listed lessons/index, backend/map/register/pack/briefing and coordination as applicable. Prior work preserved. Checks: Provider/null contract regressions failed first. Aienhance/API focused tests and vet passed; Node77/77 passed. Old redirect/oversize/privacy status assertions were updated to check the exact basic fallback while retaining zero destination calls and sanitized logging. Deliberate break: behavioral failure detected; exact source restored (8c5be47b45ae29221258396dd8fb2cc4c3ab7b0da4d05e787a0d2fc01130168c). Full npm run handoff follows. Lessons skipped by owner policy. No live SQL/signing/activation/deployment. No owned processes at writer release; the verifier records its PID in its lease. Next: R-036 after handoff/status/Git inspection.

Writer released: yes.

## Historical checkpoint: BUG-063/R-035

Status: **in progress / incomplete**. Owner Codex, reviewer unassigned. Branch main, base/current f5c5640; prior 90-file verified tree73611e4258db preserved uncommitted. Scope: next approved pack fix; no existing exercise.go edits, live SQL, signing, activation or deployment. Writer release and lease absence confirmed before claim. Next: regression fixtures, implementation, deliberate break, lessons/docs and full handoff. Second batch queue: R-096, R-097, R-095, R-010, R-012, R-013, R-035, R-036. No owned servers.

## Handoff: BUG-062/R-013 (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Owner Codex, reviewer unassigned; branch main, base/current f5c5640, resulting change explicitly uncommitted. Second batch 6/8; pack 24/27.

Fallback titles collapse ECMAScript whitespace before selecting four words. A title emptied by quote stripping uses that fallback. The first message is JSON-escaped inside the title prompt, including quotes, backslashes and controls. The30-code-point cap remains.

Changed files: backend/internal/aichat/{handler.go,title.go,title_test.go,contract_test.go}, backend/internal/aiprovider/title.go, backend/internal/jscompat/text.go, contracts/ai-chat/cases.json, scripts/contracts/ai-chat.test.mjs; contract readmes, listed lessons/index, backend/map/register/pack/briefing and coordination as applicable. Prior work preserved. Checks: Whitespace, quote-only title and quoted-prompt regressions failed first in memory/socket suites. Aichat/aiprovider/jscompat tests/vet and Node94/94 passed. Three separate deliberate breaks detected each approved behavior. Deliberate break: behavioral failure detected; exact source restored (9fee02e3c82344ae6a24d02b24ddd70f3790461e996936aba615ddcca11598ab). Full npm run handoff follows. Lessons skipped by owner policy. No live SQL/signing/activation/deployment. No owned processes at writer release; the verifier records its PID in its lease. Next: R-035 after handoff/status/Git inspection.

Writer released: yes.

## Historical checkpoint: BUG-062/R-013

Status: **in progress / incomplete**. Owner Codex, reviewer unassigned. Branch main, base/current f5c5640; prior 90-file verified tree73611e4258db preserved uncommitted. Scope: next approved pack fix; no existing exercise.go edits, live SQL, signing, activation or deployment. Writer release and lease absence confirmed before claim. Next: regression fixtures, implementation, deliberate break, lessons/docs and full handoff. Second batch queue: R-096, R-097, R-095, R-010, R-012, R-013, R-035, R-036. No owned servers.

## Handoff: BUG-061/R-012 (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Owner Codex, reviewer unassigned; branch main, base/current f5c5640, resulting change explicitly uncommitted. Second batch 5/8; pack 23/27.

Fallback chat titles cap the first four words at30 Unicode code points and append dots only when longer. Emoji scalar values remain intact; existing UTF-16 helper behavior elsewhere and rollback Next titles remain pinned.

Changed files: backend/internal/aichat/{title.go,title_test.go,contract_test.go}, contracts/ai-chat/cases.json, scripts/contracts/ai-chat.test.mjs; contract readmes, listed lessons/index, backend/map/register/pack/briefing and coordination as applicable. Prior work preserved. Checks: Emoji boundary contract regression failed first in memory/socket suites. Aichat tests/vet and Node92/92 passed, including30/31 emoji and an emoji at the limit. Deliberate break: behavioral failure detected; exact source restored (19ac956bce869e1a06fa7a30abb07db2488e501ceda01b9326fc3833496a77e7). Full npm run handoff follows. Lessons skipped by owner policy. No live SQL/signing/activation/deployment. No owned processes at writer release; the verifier records its PID in its lease. Next: R-013 after handoff/status/Git inspection.

Writer released: yes.

## Historical checkpoint: BUG-061/R-012

Status: **in progress / incomplete**. Owner Codex, reviewer unassigned. Branch main, base/current f5c5640; prior 90-file verified tree73611e4258db preserved uncommitted. Scope: next approved pack fix; no existing exercise.go edits, live SQL, signing, activation or deployment. Writer release and lease absence confirmed before claim. Next: regression fixtures, implementation, deliberate break, lessons/docs and full handoff. Second batch queue: R-096, R-097, R-095, R-010, R-012, R-013, R-035, R-036. No owned servers.

## Handoff: BUG-060/R-010 (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Owner Codex, reviewer unassigned; branch main, base/current f5c5640, resulting change explicitly uncommitted. Second batch 4/8; pack 22/27.

The React chat hook guards assistant replies for send, edit and regeneration. Non-text or blank responses show The assistant sent an empty answer and are never stored as assistant text; the conversation/user message stays, and regeneration preserves the prior answer. API non-text replies remain characterized unchanged.

Changed files: src/lib/ai/chat-response.js, src/hooks/chat/useChatMessages.js, scripts/contracts/chat-empty-reply.test.mjs, contracts/ai-chat/cases.json, backend/internal/aichat/contract_test.go, scripts/contracts/ai-chat.test.mjs; contract readmes, listed lessons/index, backend/map/register/pack/briefing and coordination as applicable. Prior work preserved. Checks: Twelve real-hook scenarios failed before implementation. Node109/109, aichat tests/vet, npm run lint and npm run build passed. Build emitted existing stale baseline-browser-mapping/caniuse advisories; dependencies unchanged. Hook stand-ins are not DOM or live-browser evidence. Deliberate break: behavioral failure detected; exact source restored (4249cc4261229f5663990e5374d45c536f2d8bd6db92661bf2849680695d890c). Full npm run handoff follows. Lessons skipped by owner policy. No live SQL/signing/activation/deployment. No owned processes at writer release; the verifier records its PID in its lease. Next: R-012 after handoff/status/Git inspection.

Writer released: yes.

## Historical checkpoint: BUG-060/R-010

Status: **in progress / incomplete**. Owner Codex, reviewer unassigned. Branch main, base/current f5c5640; prior 90-file verified tree73611e4258db preserved uncommitted. Scope: next approved pack fix; no existing exercise.go edits, live SQL, signing, activation or deployment. Writer release and lease absence confirmed before claim. Next: regression fixtures, implementation, deliberate break, lessons/docs and full handoff. Second batch queue: R-096, R-097, R-095, R-010, R-012, R-013, R-035, R-036. No owned servers.

## Handoff: BUG-059/R-095 (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Owner Codex, reviewer unassigned; branch main, base/current f5c5640, resulting change explicitly uncommitted. Second batch 3/8; pack 21/27.

Avatar replacement uses an exclusive own-folder Storage insert across participating Go instances, unique random filenames and non-overwriting uploads. Cleanup snapshots all pages before deleting in batches, traverses explicit legacy folders, and preserves the current file, lock and newer timestamps. A failed page causes no partial-snapshot deletion. Lock release is bounded. Crash/uncertain-acquisition recovery is intentionally manual (R-209); hosted acceptance and all-writers protocol are rollout gates.

Changed files: backend/internal/avatar/{handler.go,contract_test.go,handler_test.go,replacement_test.go}, backend/cmd/api/avatar_wiring_test.go, contracts/upload-avatar/cases.json, scripts/contracts/upload-avatar.test.mjs, docs/plans/avatar-cleanup-r095.md; contract readmes, listed lessons/index, backend/map/register/pack/briefing and coordination as applicable. Prior work preserved. Checks: Initial compiled fixtures failed. Avatar tests/vet, API wiring and Node61/61 passed. Two independent handlers prove conflict refusal makes no avatar write or foreign unlock; later upload succeeds with a distinct filename even at the same millisecond. Snapshot/pagination and safety-name checks passed. Initial concurrency stand-in used URL.Path, empty for jscompat Opaque URLs; corrected to RequestURI, matching the real wire target. Deliberate break: behavioral failure detected; exact source restored (1d5217b1c42b552783175b6941daff3879c493d665fd610dbf3520fdb7b05d3b). Full npm run handoff follows. Lessons skipped by owner policy. No live SQL/signing/activation/deployment. No owned processes at writer release; the verifier records its PID in its lease. Next: R-010 after handoff/status/Git inspection.

Writer released: yes.

## Historical checkpoint: BUG-059/R-095

Status: **in progress / incomplete**. Owner Codex, reviewer unassigned. Branch main, base/current f5c5640; prior 90-file verified tree73611e4258db preserved uncommitted. Scope: next approved pack fix; no existing exercise.go edits, live SQL, signing, activation or deployment. Writer release and lease absence confirmed before claim. Milestone: avatar contract v6 and cleanup/lock implementation now pass contract cases and Node61/61; initial regression failed first. Added paginated205-file, partial-page failure, nested-file, current/lock/newer-protection and lock-refusal cases. Files additionally docs/plans/avatar-cleanup-r095.md, backend/internal/avatar/replacement_test.go and API wiring test. Current writer Codex; independent two-handler and full focused checks next. No hosted proof. Next: concurrency/privacy checks, deliberate break, lesson/docs and full handoff. Second batch queue: R-096, R-097, R-095, R-010, R-012, R-013, R-035, R-036. No owned servers.

## Handoff: BUG-058/R-097 (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Owner Codex, reviewer unassigned; branch main, base/current f5c5640, resulting change explicitly uncommitted. Second batch 2/8; pack 20/27.

Avatar500 responses carry only their fixed public error field; Storage/Auth/database/library and runtime diagnostic details are omitted. Sanitized stage logging and status codes stay unchanged. Next rollback replies retain their original details.

Changed files: backend/internal/avatar/{handler.go,contract_test.go}, contracts/upload-avatar/cases.json, scripts/contracts/upload-avatar.test.mjs; contract readmes, listed lessons/index, backend/map/register/pack/briefing and coordination as applicable. Prior work preserved. Checks: Detailed-error fixtures failed first; avatar tests/vet and Node55/55 passed, including caller/log privacy checks. Deliberate break: behavioral failure detected; exact source restored (2a2c6ca8acd89cf6f68689dc659b112e3e0d58dcd654b1a6327fb38a4e6d774c). Full npm run handoff follows. Lessons skipped by owner policy. No live SQL/signing/activation/deployment. No owned processes at writer release; the verifier records its PID in its lease. Next: R-095 after handoff/status/Git inspection.

Writer released: yes.

## Historical checkpoint: BUG-058/R-097

Status: **in progress / incomplete**. Owner Codex, reviewer unassigned. Branch main, base/current f5c5640; prior 90-file verified tree73611e4258db preserved uncommitted. Scope: next approved pack fix; no existing exercise.go edits, live SQL, signing, activation or deployment. Writer release and lease absence confirmed before claim. Next: regression fixtures, implementation, deliberate break, lessons/docs and full handoff. Second batch queue: R-096, R-097, R-095, R-010, R-012, R-013, R-035, R-036. No owned servers.

## Handoff: BUG-057/R-096 (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Owner Codex, reviewer unassigned; branch main, base/current f5c5640, resulting change explicitly uncommitted. Second batch 1/8; pack 19/27.

A failed Auth metadata or profile write returns500 and attempts to delete exactly the newly uploaded object with the caller token. Compensation has a separate three-second bound and still runs after request cancellation. Rollback refusal stays a failure and is logged without details. These separate services are not made atomic; cleanup success is not promised when Storage refuses it.

Changed files: backend/internal/avatar/{handler.go,handler_test.go,contract_test.go}, contracts/upload-avatar/cases.json, scripts/contracts/upload-avatar.test.mjs; contract readmes, listed lessons/index, backend/map/register/pack/briefing and coordination as applicable. Prior work preserved. Checks: Six compensation regressions failed first. Avatar tests/vet passed, cancellation rollback test passed, Node55/55 passed. Deliberate break: behavioral failure detected; exact source restored (f2d76aeece4786808cd149eac5054b2fd4d678024d6eea785de8f72185c886ab). Full npm run handoff follows. Lessons skipped by owner policy. No live SQL/signing/activation/deployment. No owned processes at writer release; the verifier records its PID in its lease. Next: R-097 after handoff/status/Git inspection.

Writer released: yes.

## Historical checkpoint: BUG-057/R-096

Status: **in progress / incomplete**. Owner Codex, reviewer unassigned. Branch main, base/current f5c5640; prior 90-file verified tree73611e4258db preserved uncommitted. Scope: next approved pack fix; no existing exercise.go edits, live SQL, signing, activation or deployment. Writer release and lease absence confirmed before claim. Next: regression fixtures, implementation, deliberate break, lessons/docs and full handoff. Second batch queue: R-096, R-097, R-095, R-010, R-012, R-013, R-035, R-036. No owned servers.

## Handoff: BUG-056, R-094 (Codex,2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex, reviewer unassigned; branch main, current f5c5640; resulting change explicitly uncommitted. Eight-fix batch8/8, overall18/27.

Avatar uploads detect PNG, JPEG, GIF87a/GIF89a and WebP signatures from bytes, reject empty/unsupported/truncated signatures, and derive MIME and stored extension from the detected format. User filenames and MIME labels cannot choose the stored suffix. The 5MiB bound, caller token, existing metadata/error/cleanup policies remain; full image decoding is outside this signature check.

Changed task files: backend/internal/avatar/{handler.go,contract_test.go,handler_test.go}, backend/cmd/api/avatar_wiring_test.go, scripts/contracts/{avatar-fixture.mjs,upload-avatar.test.mjs}; contracts/readmes, lessons/index, backend README, map/register/pack/briefing and coordination. Prior work preserved. Checks: New/revised contract cases failed before the Go fix. Avatar full package tests, API avatar wiring and vet passed; wiring payload and assertion now use the PNG signature. Node54/54 passed over53 fixtures, including all formats, both GIF signatures, misleading/absent labels, unsafe filenames, empty/fake/truncated files and 5MiB boundaries. Deliberate break produced behavioral test failures and source restored exactly (226f4750c879c27e3b55d9ecde7e5ff3d1f6103ca2f28f8b1399361aa52c065c). Full npm run handoff follows; consult matching signal/status for final result. Lessons skipped by policy. No lint/build repeated unless browser production code changed. No live SQL, credentials, signing, runtime activation or deployment. No owned processes at release. Next: batch complete; next pack entry R-096.

Writer released: yes.

Batch checkpoint: all eight approved fixes implemented; 18/27 pack fixes complete locally, nine remain. Prior BUG-048 work preserved. All task authors Codex; no peer review claimed. Base/current main f5c5640; changes remain uncommitted. Full handoffs passed for BUG-049, BUG-050 (7cb85690f697), BUG-051 plus R-208 (9d9412152968), BUG-052 (831798e3f69d), BUG-053 (2c413d5e1369), BUG-054 (3f082e0d6a12), BUG-055 (baa770378b99). Final BUG-056/batch full handoff follows. No lint/build (browser production code untouched); lessons skipped by owner policy. No live tests, SQL, signing, activation, deployment, commit or push. No owned processes at release; the forthcoming verifier tracks its own PID in the lease. Next bounded task: BUG-057/R-096 avatar rollback on failed metadata/profile writes; then R-097 and R-095.

Recovery detail correction: second premature verifier was stopped after process-tree inspection; the exact root lease was already absent when removal was attempted. Status confirmed lease absent before edits. Fresh normal full verification superseded interrupted runs; no interrupted run is counted as passed.

Actual checkout file list (includes preserved BUG-048 and shared documents; no secrets):

- `backend/README.md`
- `backend/cmd/api/avatar_wiring_test.go`
- `backend/cmd/api/videos_wiring_test.go`
- `backend/internal/activity/contract_test.go`
- `backend/internal/activity/grid.go`
- `backend/internal/activity/node_test.go`
- `backend/internal/avatar/contract_test.go`
- `backend/internal/avatar/handler.go`
- `backend/internal/avatar/handler_test.go`
- `backend/internal/collect/contract_test.go`
- `backend/internal/collect/handler.go`
- `backend/internal/comments/contract_test.go`
- `backend/internal/comments/handler.go`
- `backend/internal/commentvote/contract_test.go`
- `backend/internal/commentvote/handler.go`
- `backend/internal/githubcontributions/contract_test.go`
- `backend/internal/githubcontributions/dates.go`
- `backend/internal/githubcontributions/dates_test.go`
- `backend/internal/githubcontributions/handler.go`
- `backend/internal/rating/contract_test.go`
- `backend/internal/rating/handler.go`
- `backend/internal/shares/contract_test.go`
- `backend/internal/shares/handler.go`
- `backend/internal/shares/handler_test.go`
- `backend/internal/sharetoken/contract_test.go`
- `backend/internal/sharetoken/handler.go`
- `backend/internal/sharetoken/handler_test.go`
- `backend/internal/supabaserest/supabaserest.go`
- `backend/internal/videos/contract_test.go`
- `backend/internal/videos/handler.go`
- `backend/internal/vote/contract_test.go`
- `backend/internal/vote/handler.go`
- `contracts/activity/README.md`
- `contracts/activity/cases.json`
- `contracts/comment-vote/README.md`
- `contracts/comment-vote/cases.json`
- `contracts/conversation-share/README.md`
- `contracts/conversation-share/cases.json`
- `contracts/github-contributions/README.md`
- `contracts/github-contributions/cases.json`
- `contracts/repo-collect/README.md`
- `contracts/repo-collect/cases.json`
- `contracts/repo-comments/README.md`
- `contracts/repo-comments/cases.json`
- `contracts/repo-rating/README.md`
- `contracts/repo-rating/cases.json`
- `contracts/repo-videos/README.md`
- `contracts/repo-videos/cases.json`
- `contracts/repo-vote/README.md`
- `contracts/repo-vote/cases.json`
- `contracts/share-fork/README.md`
- `contracts/share-fork/cases.json`
- `contracts/share-token/README.md`
- `contracts/share-token/cases.json`
- `contracts/upload-avatar/README.md`
- `contracts/upload-avatar/cases.json`
- `docs/backend-map.md`
- `docs/bug-register.md`
- `docs/coordination.md`
- `docs/next-agent-briefing.md`
- `docs/plans/phase6-decision-pack-2.md`
- `learn-go/13-time-and-clocks/README.md`
- `learn-go/22-reading-rows-as-the-user/README.md`
- `learn-go/24-optional-sign-in/README.md`
- `learn-go/25-writing-as-the-user/README.md`
- `learn-go/27-when-text-meets-numbers/README.md`
- `learn-go/28-many-at-once-one-failure-for-all/README.md`
- `learn-go/29-a-javascript-pattern-in-go/README.md`
- `learn-go/30-defaults-and-missing-values/README.md`
- `learn-go/31-bounded-file-streams/README.md`
- `learn-go/45-copying-javascript-string-rules/README.md`
- `learn-go/README.md`
- `scripts/contracts/activity-run.mjs`
- `scripts/contracts/activity.test.mjs`
- `scripts/contracts/avatar-fixture.mjs`
- `scripts/contracts/comment-vote.test.mjs`
- `scripts/contracts/conversation-share.test.mjs`
- `scripts/contracts/github-contributions.test.mjs`
- `scripts/contracts/handoff-state.test.mjs`
- `scripts/contracts/repo-collect.test.mjs`
- `scripts/contracts/repo-comments.test.mjs`
- `scripts/contracts/repo-rating.test.mjs`
- `scripts/contracts/repo-videos.test.mjs`
- `scripts/contracts/repo-vote.test.mjs`
- `scripts/contracts/share-fork.test.mjs`
- `scripts/contracts/share-token.test.mjs`
- `scripts/contracts/upload-avatar.test.mjs`
- `scripts/handoff-state.mjs`
- `scripts/contracts/activity-model.mjs`
- `scripts/contracts/contributions-fixture.mjs`

## Handoff: BUG-055, R-089 (Codex,2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex, reviewer unassigned; branch main, current f5c5640; resulting change explicitly uncommitted. Eight-fix batch7/8, overall17/27.

Creating, removing and forking a share now return fixed failure text: Share operation failed for existing400 responses and Internal server error for500. Status codes, authorization and not-found replies stay pinned. No database, library, transport or parser details are sent to visitors.

Changed task files: backend/internal/shares/{handler.go,contract_test.go}, scripts/contracts/{conversation-share,share-fork}.test.mjs; contracts/readmes, lessons/index, backend README, map/register/pack/briefing and coordination. Prior work preserved. Checks: Focused full shares suite found oversized-body test still expecting the old detailed text; updated to fixed text while keeping the no-database assertion. Changed file also backend/internal/shares/handler_test.go. Own premature handoff PID47732 and descendants stopped, absence verified and exact root lease removed before correction; full fresh rerun required. Initial TestContract selector matched no tests; corrected Contract selector against exact baseline source reproduced all changed failure fixtures. Current focused shares/API tests and vet passed; Node70/70 passed. Deliberate break produced behavioral test failures and source restored exactly (4add15e0811a46d70cf1dbf05d2d85deab5b6ac05f7a3d9c1ae50d2839996c23). Full npm run handoff follows; consult matching signal/status for final result. Lessons skipped by policy. No lint/build repeated unless browser production code changed. No live SQL, credentials, signing, runtime activation or deployment. No owned processes at release. Next: claim next bounded batch entry after handoff/lease/Git inspection.

Writer released: yes.

## Handoff: BUG-054, R-082 (Codex,2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex, reviewer unassigned; branch main, current f5c5640; resulting change explicitly uncommitted. Eight-fix batch6/8, overall16/27.

Public share reads return404 only for a zero-row result or empty/null success. Network, HTTP, parse and invalid non-object results return503 with fixed Share could not be loaded text. Explicit private links retain403, public replies and caller credentials remain unchanged.

Changed task files: backend/internal/sharetoken/{handler.go,contract_test.go,handler_test.go}, scripts/contracts/share-token.test.mjs; contracts/readmes, lessons/index, backend README, map/register/pack/briefing and coordination. Prior work preserved. Checks: Ten changed/new outage-result cases failed before implementation. Focused sharetoken/API regression and log-privacy tests plus vet passed; old log test status updated404 to503. Node22/22 passed. Deliberate break produced behavioral test failures and source restored exactly (c0af5cf114e2bc8dec4bffb4bc138356b4e69acdb36fb62f7df3b548825c9b06). Full npm run handoff follows; consult matching signal/status for final result. Lessons skipped by policy. No lint/build repeated unless browser production code changed. No live SQL, credentials, signing, runtime activation or deployment. No owned processes at release. Next: claim next bounded batch entry after handoff/lease/Git inspection.

Writer released: yes.

## Handoff: BUG-053, R-081 (Codex,2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex, reviewer unassigned; branch main, current f5c5640; resulting change explicitly uncommitted. Eight-fix batch5/8, overall15/27.

Public share settings failures return fixed Internal server error text with500. Library configuration messages no longer reach visitors; sanitized stage logging remains.

Changed task files: backend/internal/sharetoken/{handler.go,contract_test.go}, scripts/contracts/share-token.test.mjs; contracts/readmes, lessons/index, backend README, map/register/pack/briefing and coordination. Prior work preserved. Checks: The settings-missing fixture failed before implementation. Focused sharetoken tests/vet and Node18/18 passed. Deliberate break produced behavioral test failures and source restored exactly (609c8a9c8bb2b8debe539e67ac9aa723530205e9fcfadf2a1cb5b8dfcba30583). Full npm run handoff follows; consult matching signal/status for final result. Lessons skipped by policy. No lint/build repeated unless browser production code changed. No live SQL, credentials, signing, runtime activation or deployment. No owned processes at release. Next: claim next bounded batch entry after handoff/lease/Git inspection.

Writer released: yes.

## Handoff: BUG-052, R-087 (Codex,2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex, reviewer unassigned; branch main, current f5c5640; resulting change explicitly uncommitted. Eight-fix batch4/8, overall14/27.

Comment edits/deletions and video deletions return404 for zero visible matches, covering missing and unowned items without revealing ownership. Deletes request their row in the same owner-filtered mutation. Other database errors, including multiple-row single-object errors, retain fixed500 responses.

Changed task files: backend/internal/{comments,videos}/{handler.go,contract_test.go}, backend/internal/supabaserest/supabaserest.go, scripts/contracts/{repo-comments,repo-videos}.test.mjs; contracts/readmes, lessons/index, backend README, map/register/pack/briefing and coordination. Prior work preserved. Checks: Full handoff first exposed old video wiring query expectation; test updated to return the affected row and expect select=*. Empty-success deletion regression added. Changed file also backend/cmd/api/videos_wiring_test.go. Initial regression failed zero-match responses and returned-row query expectations. Focused comments/videos/supabaserest tests and vet passed. Node rerun follows corrected owner-filter integrity assertion. Deliberate break produced behavioral test failures and source restored exactly (023e2534346ff55d11947cb899a7fe4980360b0c377cf9346d2051cdbf9272ab). Full npm run handoff follows; consult matching signal/status for final result. Lessons skipped by policy. No lint/build repeated unless browser production code changed. No live SQL, credentials, signing, runtime activation or deployment. No owned processes at release. Next: claim next bounded batch entry after handoff/lease/Git inspection.

Writer released: yes.

## Handoff: R-208 approved recovery

Status: **implementation complete; unreviewed; not deployed**. Codex owner, reviewer unassigned; branch main, base/current f5c5640, explicitly uncommitted. Changed files scripts/handoff-state.mjs, scripts/contracts/handoff-state.test.mjs, docs/bug-register.md and docs/coordination.md. Focused verifier tests17/17 passed, including >2MiB regression. Full handoff follows; lesson checks skipped by policy. Writer released; no owned processes.

Owner explicitly approved the exact external review plan on 2026-10-30, including exception to STATUS_ERROR mutation gate. Only verifier maxBuffer64MiB, its >2MiB regression and recovery docs are in scope. Prior batch work preserved. External regression failed ENOBUFS before fix; all9 fingerprint tests passed on fixed copy. BUG051 focused Go/vet and Node56 passed; full handoff failed before checks due ENOBUFS. Earlier premature own verifier PID36372 and descendants were stopped and exact stale lease removed after confirming all stopped. No lease now. Next: focused verifier checks and full handoff; then BUG052/R087.

## Handoff: BUG-051, R-085 (Codex,2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex, reviewer unassigned; branch main, current f5c5640; resulting change explicitly uncommitted. Eight-fix batch3/8, overall13/27.

Rating writes accept only JSON numbers that are whole values 1 through 5. Text, booleans, lists, objects and fractions return 400 before any database write. Existing stored-rating summaries remain characterized.

Changed task files: backend/internal/rating/handler.go, backend/internal/rating/contract_test.go, scripts/contracts/repo-rating.test.mjs; contracts/readmes, lessons/index, backend README, map/register/pack/briefing and coordination. Prior work preserved. Checks: Eight revised invalid-input fixtures failed before implementation; focused rating tests and vet passed. Node rollback suite passed (see local log). Deliberate break produced behavioral test failures and source restored exactly (7cca541f8fcaa8686ecca93931e344a14a3303d057a1e41964280bcf2aa3392b). Full npm run handoff follows; consult matching signal/status for final result. Lessons skipped by policy. No lint/build repeated unless browser production code changed. No live SQL, credentials, signing, runtime activation or deployment. No owned processes at release. Next: claim next bounded batch entry after handoff/lease/Git inspection.

Writer released: yes.

## Handoff: BUG-049, R-059 (Codex,2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex, reviewer unassigned; branch main, current f5c5640; resulting change explicitly uncommitted. Eight-fix batch1/8, overall11/27.

Initial full handoff reached the Go formatting gate and identified grid.go; gofmt applied before the fresh full rerun. Owner approved compact-fixture recovery after ENOBUFS/STATUS_ERROR. Parsed deep equality verified before replacing only contracts/activity/cases.json; status restored READY_NEEDS_VERIFY. No verifier changes or fixture-value changes. New R-208 records the output-buffer limitation, open.

Sunday-to-Saturday weeks, averages/totalDays count only dated squares, yesterday carries an empty today�s streak. Go loops over UTC days; padding is display-only. Independent JavaScript reference covers400generated inputs, including leap years and numeric edge cases.

Changed task files: backend/internal/activity/grid.go, backend/internal/activity/contract_test.go, scripts/contracts/activity.test.mjs, scripts/contracts/activity-run.mjs, scripts/contracts/activity-model.mjs; contracts/readmes, lessons/index, backend README, map/register/pack/briefing and coordination. Prior work preserved. Checks: Initial contract regression failed; focused activity Go tests/vet passed including400generated comparisons; Node19/19 passed. Deliberate break produced behavioral test failures and source restored exactly (24721483ff7b374fe8bb235313f453a39a9d0d6e77e656b2254f99c1c2edf48b). Full npm run handoff follows; consult matching signal/status for final result. Lessons skipped by policy. No lint/build repeated unless browser production code changed. No live SQL, credentials, signing, runtime activation or deployment. No owned processes at release. Next: claim next bounded batch entry after handoff/lease/Git inspection.

Writer released: yes.

## Checkpoint: BUG-049 / R-059 active

Status: **in progress / incomplete**. Codex writer, reviewer unassigned; branch main, base/current f5c5640. Continue the owner-approved eight-fix batch. Prior completed handoffs preserved; lease absent before claim. Next: contracts, implementation, focused regression/vet, deliberate break, lesson/docs and handoff. No live actions or existing exercise edits.

## Checkpoint: BUG-049 / R-059 active

Status: **in progress / incomplete**. Codex writer, reviewer unassigned; branch main, base/current f5c5640. Continue the owner-approved eight-fix batch. Prior completed handoffs preserved; lease absent before claim. Next: contracts, implementation, focused regression/vet, deliberate break, lesson/docs and handoff. No live actions or existing exercise edits.

## Checkpoint: BUG-050 / R-084 active

Status: **in progress / incomplete**. Codex writer, reviewer unassigned; branch main, base/current f5c5640. Continue the owner-approved eight-fix batch. Prior completed handoffs preserved; lease absent before claim. Next: contracts, implementation, focused regression/vet, deliberate break, lesson/docs and handoff. No live actions or existing exercise edits.

## Handoff: BUG-050, R-084 (Codex,2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex, reviewer unassigned; branch main, current f5c5640; resulting change explicitly uncommitted. Eight-fix batch2/8, overall12/27.

Auth outages now return 503 with fixed text Sign-in could not be verified before any database request in collect, vote, rating, comment votes, comment writes and video writes. Refused sessions retain their existing policy.

Changed task files: backend/internal/{collect,vote,rating,commentvote,comments,videos}/{handler.go,contract_test.go}, scripts/contracts/{repo-collect,repo-vote,repo-rating,comment-vote,repo-comments,repo-videos}.test.mjs; contracts/readmes, lessons/index, backend README, map/register/pack/briefing and coordination. Prior work preserved. Checks: All 15 new outage cases failed before the fix. Focused tests and vet for all six packages passed; Node rerun follows after narrowing the older vote-specific fixture invariant. Deliberate break produced behavioral test failures and source restored exactly (306221fd420a6f37c99be48ffb7fa8091fd354f16c2f0b216fb0cbfb180de61b). Full npm run handoff follows; consult matching signal/status for final result. Lessons skipped by policy. No lint/build repeated unless browser production code changed. No live SQL, credentials, signing, runtime activation or deployment. No owned processes at release. Next: claim next bounded batch entry after handoff/lease/Git inspection.

Writer released: yes.

## Checkpoint: BUG-051 / R-085 active

Status: **in progress / incomplete**. Codex writer, reviewer unassigned; branch main, base/current f5c5640. Continue the owner-approved eight-fix batch. Prior completed handoffs preserved; lease absent before claim. Next: contracts, implementation, focused regression/vet, deliberate break, lesson/docs and handoff. No live actions or existing exercise edits.

## Checkpoint: BUG-052 / R-087 active

Status: **in progress / incomplete**. Codex writer, reviewer unassigned; branch main, base/current f5c5640. Continue the owner-approved eight-fix batch. Prior completed handoffs preserved; lease absent before claim. Next: contracts, implementation, focused regression/vet, deliberate break, lesson/docs and handoff. No live actions or existing exercise edits.

## Checkpoint: BUG-052 / R-087 active

Status: **in progress / incomplete**. Codex writer, reviewer unassigned; branch main, base/current f5c5640. Continue the owner-approved eight-fix batch. Prior completed handoffs preserved; lease absent before claim. Next: contracts, implementation, focused regression/vet, deliberate break, lesson/docs and handoff. No live actions or existing exercise edits.

## Checkpoint: BUG-053 / R-081 active

Status: **in progress / incomplete**. Codex writer, reviewer unassigned; branch main, base/current f5c5640. Continue the owner-approved eight-fix batch. Prior completed handoffs preserved; lease absent before claim. Next: contracts, implementation, focused regression/vet, deliberate break, lesson/docs and handoff. No live actions or existing exercise edits.

## Checkpoint: BUG-054 / R-082 active

Status: **in progress / incomplete**. Codex writer, reviewer unassigned; branch main, base/current f5c5640. Continue the owner-approved eight-fix batch. Prior completed handoffs preserved; lease absent before claim. Next: contracts, implementation, focused regression/vet, deliberate break, lesson/docs and handoff. No live actions or existing exercise edits.

## Checkpoint: BUG-055 / R-089 active

Status: **in progress / incomplete**. Codex writer, reviewer unassigned; branch main, base/current f5c5640. Continue the owner-approved eight-fix batch. Prior completed handoffs preserved; lease absent before claim. Next: contracts, implementation, focused regression/vet, deliberate break, lesson/docs and handoff. No live actions or existing exercise edits.

## Checkpoint: BUG-055 / R-089 active

Status: **in progress / incomplete**. Codex writer, reviewer unassigned; branch main, base/current f5c5640. Continue the owner-approved eight-fix batch. Prior completed handoffs preserved; lease absent before claim. Next: contracts, implementation, focused regression/vet, deliberate break, lesson/docs and handoff. No live actions or existing exercise edits.

## Checkpoint: BUG-056 / R-094 active

Status: **in progress / incomplete**. Codex writer, reviewer unassigned; branch main, base/current f5c5640. Continue the owner-approved eight-fix batch. Prior completed handoffs preserved; lease absent before claim. Next: contracts, implementation, focused regression/vet, deliberate break, lesson/docs and handoff. No live actions or existing exercise edits.

## Checkpoint: eight-fix batch BUG-049..056 (Codex, 2026-10-30)

Status: **in progress / incomplete**. Owner explicitly requested eight fixes per batch. Writer Codex, reviewer unassigned; branch main, base/current f5c5640. Previous writer released and verification lease absent; prior16-file BUG-048 change verified b7739c519d2b and preserved uncommitted. Queue in pack order: BUG-049/R-059,050/R-084,051/R-085,052/R-087,053/R-081,054/R-082,055/R-089,056/R-094. Each is bounded with fixtures/rollback, deliberate-break, lessons/docs and handoff. Production SQL, secrets, runtime activation, deployment and signing excluded. Existing exercises untouched. Batch progress8/8; next: activity grid contract/implementation. No running processes or batch checks yet. Preserve the independent hosted-key checkpoint and all owner decisions.

## Handoff: BUG-048, R-033 UTC contribution window and current streak (Codex, 2026-10-30)

Status: **implementation complete for approved pack scope; unreviewed; not deployed**. Writer Codex; reviewer unassigned. Branch main, base/current f5c5640; resulting change explicitly uncommitted. Prior BUG-047 committed83cd859. Ten of27pack fixes complete locally,17remain starting R-059. Hosted key acceptance remains under its separate checkpoint; no live actions.

One UTC clock reading now drives the existing365day/Monday-aligned query window and current streak. Removed the production Location override and local wallClock parity helper. Streak starts today or yesterday while today inactive, walks exact UTC days and stops at missing/inactive dates; stale/future entries cannot invent an active streak. Only a nonempty list of user NOT_FOUND errors at exact path[user], without user data, becomes404. Mixed/nested/other errors preserve policy. Other R-033 reply-shape, bare-reply and token-status behaviors remain open; R-207 length guard is unchanged. No route retirement or activation.

Contribution contract v3:106cases,7prior revised,11added,88prior cases asserted unchanged. Real Next.js responses/local-calendar variables retained in next_expect/next_calls through new reusable contributions-fixture runner; Go uses its UTC variables. Boundary cases cover gaps, stale/future days, absent today, yesterday empty, UTC midnight in two zones and mixed/nested errors. Go date tests pin UTC expectations across17zone/instant examples; rounding/credential behavior retained. Lesson13/index explain UTC clock/maps and mark existing exercise as original local-calendar behavior; existing exercise files untouched.

Checks (Codex): initial TestContract/TestContractOverHTTP failed dates-zone-ahead/behind, graphql-user-does-not-exist, streak-zero-when-newest-day-is-empty and streak-gap-break. After fix go test -count=1 and go vet for githubcontributions/cmd/api passed; Node contributions108/108 passed. Deliberately shifting the UTC range failed both zone cases in memory/socket suites; disabling user-not-found classification failed its case in both; disabling yesterday fallback failed streak-zero and streak-no-today in both. Restored byte-for-byte hashes: handler.go ba318b3ce644d9a482d513e82cb75bfe8f6a6888ac64006d17500178d625da73; dates.go9d58ab88dd5fa3f1347cfe320338cc5663600333192c0c31e078ff0469f86883. git diff --check passed after removing a trailing blank line. Full npm run handoff follows; matching signal/status records final result. Lint/build not repeated (no browser/Next production source change); lessons skipped by policy. No live GitHub, browser, SQL, signing or deployment checks.

Changed files: backend/internal/githubcontributions/{handler.go,dates.go,dates_test.go,contract_test.go}; contracts/github-contributions/{cases.json,README.md}; scripts/contracts/{github-contributions.test.mjs,contributions-fixture.mjs}; learn-go/{13-time-and-clocks/README.md,README.md}; backend/README.md; docs/{backend-map.md,bug-register.md,coordination.md,next-agent-briefing.md,plans/phase6-decision-pack-2.md}. No unrelated edits observed. No owned processes at release. Next: full handoff, inspect actual Git/status/lease and preserve approval/checkpoints, then claim BUG-049 / R-059. Pack remains open; this handoff signals only approved BUG-048 scope.

Writer released: yes.

## Historical checkpoint: BUG-048, R-033 UTC contribution dates and current streak (Codex, 2026-10-30)

Status: **in progress / incomplete**. Writer Codex; reviewer unassigned. Branch main, base/current f5c5640; clean at claim; prior BUG-047 committed83cd859. Owner all-A approval applies. Scope: one UTC clock for query range and streak, narrow user NOT_FOUND GraphQL404, yesterday-based current streak while today empty; contract/rollback answers, deliberate break, lesson/docs. Other error/shape policies and separate R-207 length guard remain unchanged. No existing exercise edits, runtime/SQL/signing/deployment work. Next: revise fixture expectations and add timezone/streak/not-found cases before Go fix. No task checks yet; no owned processes.

## Handoff: BUG-047, R-030 validate repository success shapes (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex; reviewer unassigned. Branch `main`, base `2493237`. Resulting commit: `83cd859` (synchronized by Git Agent on `main` and `go-backend`). During the task Git Agent committed the prior completed BUG-045/046 at 6dff661 and coordination 2493237; current diff/ownership/checkpoint were rechecked and preserved. Nine of27pack fixes complete locally,18remain starting R-033. Hosted key acceptance remains under its separate checkpoint; no live actions.

New githubrepos/shapes.go validates minimum consumer shapes before successful replies. Repository identity needs positive whole ID, usable name/full_name/html_url and owner login. Known malformed counts, description/language/homepage, licence and topics are omitted/filtered; legitimate nullable values remain. Details requires a nonempty languages URL and object languages response, retaining only nonnegative whole counts. Contents supports file/symlink/submodule or a directory list; bad directory entries omitted, bad roots/core shapes or unusable JSON fixed502. Empty valid lists/maps and BOM JSON remain valid. Optional HTTP fallbacks, credentials and cache policy remain. This is a minimum consumer shape, not the full provider schema.

Repository contract v6:148cases,16revised/12added,120prior cases asserted identical; unchanged Next.js answers and raw calls retained. go_calls records the early stop before README for a bad languages reply. Operational cache/HTTP/deadline mocks and two API wiring/isolation mocks now supply valid repository identities; credential/routing assertions were not weakened. Lesson10/index updated; existing exercises untouched.

Checks (Codex): initial TestContracts and TestContractsOverHTTP failed summary-missing-fields/detail-null-languages/contents-null-body. After implementation githubrepos passed; cmd/api exposed skeletal repository mocks in TestPrivateRepositoryIsolation and TestServerNeverLendsItsOwnToken, corrected to valid identities. Final go test -count=1 and go vet for githubrepos/cmd/api passed. Node repository152/152 passed, including nullable controls, BOM, filtering and rollback handlers. Deliberately bypassing validation/filtering failed summary-missing-fields/summary-invalid-optional/detail-filter-language-counts/contents-filter-invalid-entries in memory/socket suites. Restored shapes.go byte-for-byte SHA-256 afd129ba2ab6a0f1d017e81435c2486b52924e7a941c81e944b7f78681f2ff08. git diff --check passed. Full npm run handoff follows; matching signal/status records outcome. Lint/build not repeated (no browser/Next production source change); lessons skipped by policy. No live provider, browser, SQL, signing or deployment checks.

Changed in BUG-047: backend/internal/githubrepos/{shapes.go,handler.go,contract_test.go,http_test.go,review_test.go,deadline_test.go}; backend/cmd/api/{access_test.go,wiring_test.go}; contracts/github-repositories/{cases.json,README.md}; scripts/contracts/github-repositories.test.mjs; learn-go/{10-shared-cache/README.md,README.md}; backend/README.md; docs/{backend-map.md,bug-register.md,coordination.md,next-agent-briefing.md,plans/phase6-decision-pack-2.md}. No unrelated edits observed. No owned processes at release. Next: full handoff, inspect actual Git/status/lease and preserve records, then claim BUG-048 / R-033. Open R-207 is a separate contributions length defect; no deferral implied. Pack remains open; this signals only completed BUG-047.

Writer released: yes.

## Historical checkpoint: BUG-047, R-030 validate repository success replies (Codex, 2026-10-30)

Milestone update: contract v6 now has148cases (16prior revised,12added,120unchanged); rollback Next.js suite151/151 passed before the final fixture-generator BOM correction, with a fresh rerun pending. Initial Go regression failed summary-missing-fields/detail-null-languages/contents-null-body in memory/socket suites. New shapes.go and handler validation implemented; focused githubrepos/cmd/api tests currently running (session62835, log in local temporary sefgh-bug047-go.log). Operational HTTP/cache/deadline mocks updated to valid repository identities, not weakened assertions. Generator draft errors were corrected before implementation: a network-error case remains unchanged and valid BOM JSON remains valid. All prior task changes preserved. Current unfinished work: inspect focused results, correct any affected wiring fixture, run vet/final Node/deliberate break, lesson/docs and full handoff. Writer remains Codex; no hosted processes or live actions.

Status: **in progress / incomplete**. Writer Codex; reviewer unassigned; branch main, base/current374a8ca. Prior completed BUG-045/046 preserved; full handoff passed2c65e70d2c90 and lease cleared before claim. Owner all-A approval applies. Scope: reject invalid repository/contents/languages top-level shapes with fixed502; omit malformed array/map items, preserve legitimate nullable fields and optional HTTP fallbacks; fixtures/rollback answers, deliberate break, lesson/docs. No existing exercise edits or live actions. Next: define minimum shapes from current fixtures/callers, revise contracts and reproduce before Go fix. No task checks yet; no owned processes.

## Handoff: BUG-046, R-029 classify required repository lookup failures (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex; reviewer unassigned; branch `main`, base `374a8ca`. Resulting commit: `6dff661` (batch synchronized by Git Agent on `main` and `go-backend`). Prior completed BUG-045 preserved (full handoff tree5413c3127c2c). Eight of27pack fixes complete locally,19remain starting R-030. Hosted key acceptance remains under its separate checkpoint; no live actions.

Summary/detail/contents now share requiredFailure after their primary GitHub lookup:404for missing repository,429with shared fixed rate message/nullable remaining-reset/Retry-After for429or rate-related403,502with fixed route message for other HTTP/transport failures. Ordinary403 stays distinct from rate-related403. Required languages transport failure also502. Existing optional languages/README HTTP fallbacks, malformed successful-body behavior (R-030), cache permissions/freshness/eviction and credential boundaries retained. Lesson10/index updated; existing exercises untouched.

Repository contract v5 has136cases:15prior cases revised,12added for primary/secondary limits, HTTP-date Retry-After and ordinary403with allowance across three routes;109prior cases asserted unchanged. Real unchanged Next.js handlers verify retained next_expect status/body. Go memory/socket harnesses now pin Retry-After and contract version; deadline tests expect502for required transport timeouts. Node integrity pins rate metadata and absence of raw upstream detail.

Checks (Codex): initial behavioral regression failed summary-status-429, detail-status-404 and contents-status-404 in both TestContracts and TestContractsOverHTTP. After fix go test -count=1 and go vet for githubrepos/cmd/api passed; Node repository139/139 passed after final integrity addition. Deliberately forcing generic500for required failures failed those three plus detail-rate-secondary-403 in memory/socket suites. Restored handler byte-for-byte SHA-256 245425a6cc0e88521f3fcdaa3891d4fbd998a9d39b80615284e6c5a043b33ad5. git diff --check passed. Full npm run handoff follows; matching status/signal records final result. Lint/build not repeated (Go-only production source change); lessons skipped by policy. No live GitHub, signed-in browser, SQL, signing or deployment checks.

Changed in BUG-046: backend/internal/githubrepos/{handler.go,contract_test.go,http_test.go,deadline_test.go}; contracts/github-repositories/{cases.json,README.md}; scripts/contracts/github-repositories.test.mjs; learn-go/{10-shared-cache/README.md,README.md}; backend/README.md; docs/{backend-map.md,bug-register.md,coordination.md,next-agent-briefing.md,plans/phase6-decision-pack-2.md}. Prior BUG-045 files remain intact; no unrelated changes observed. No owned processes at release. Next: full handoff, inspect actual Git/status/lease and preserve approval/checkpoint records, then claim BUG-047 / R-030. Open R-207 remains a separate contributions length fix. This handoff signals completed BUG-046 plus preserved completed BUG-045; pack remains open.

Writer released: yes.

## Historical checkpoint: BUG-046, R-029 repository failure classification (Codex, 2026-10-30)

Status: **in progress / incomplete**. Writer Codex; reviewer unassigned. Branch main, base/current374a8ca. Prior BUG-045 preserved; full handoff passed tree5413c3127c2c and lease cleared. Owner all-A approval applies. Scope: primary repository/contents lookup404, rate-limit429with wait metadata, other required GitHub transport/status failures502; preserve existing optional languages/README HTTP fallbacks and malformed-success handling (R-030). Use shared rate helper, fixtures/rollback expectations, deliberate break, lesson/docs. No existing exercise edits or live actions. Next: bump repository contract and demonstrate status regression before Go fix. No BUG-046 checks yet; no owned processes.

## Handoff: BUG-045, R-027 validate developer logins before lookup (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex; reviewer unassigned; branch `main`, base `374a8ca`. Resulting commit: `6dff661` (batch synchronized by Git Agent on `main` and `go-backend`). Prior BUG-044 committed d725f53. Seven of27pack fixes complete locally,20remain starting R-029. Hosted key acceptance remains under its independent checkpoint; no live actions.

Go filters non-object users and absent/non-text/invalid logins before constructing repository URLs and selecting twenty valid users. Allowed names are1..39ASCII letters/digits with single internal hyphens; total length explicitly includes hyphens. Valid order/ranks are compact, empty valid results are[]; cancellation and credential isolation retained. Removed obsolete jsString coercion and its mirror-only test; numeric-login regression now asserts zero enrichment calls. Nine prior contract cases revised; four added for invalid/valid boundaries, mixed users and cap-after-skips. Contract v6 has75cases,62prior cases asserted identical. Actual unchanged Next.js answers/raw upstream inputs retained; optional go_upstream supplies only Go's surviving lookup replies. Lesson18/index updated; existing exercises untouched.

Checks (Codex): initial Go TestContracts/missing-login, invalid-login-boundaries and mixed-valid-logins failed in memory/socket modes. After fix, go test -count=1 and go vet for githubdevelopers/cmd/api passed; Node developer81/81 passed. Deliberately weakening the string guard failed login-path-segments, query-in-login, invalid-login-boundaries and mixed-valid-logins in memory/socket modes. A first scratch mutation failed compilation because login became unused; the corrected mutation compiled and proved behavioral failures. Handler restored byte-for-byte SHA-256 e23d05419385b1e2508ad526fff1c2421ae21d38b3bcddae11ca1dad62e20ed2. git diff --check passed. Full npm run handoff follows; matching status/signal records result. Lint/build not repeated (Go-only production source change); lessons skipped by policy. No live provider, browser, SQL, signing or deployment checks.

New R-207: contributions' existing regex permits up to77characters with interleaved hyphens although it documents39; source check shows no separate length guard and exact-pattern reproduction accepts77. Recorded open, not fixed in this task; live effect unverified. Existing open UI R-205/R-206 remain separate.

Changed files: backend/internal/githubdevelopers/{handler.go,contract_test.go,review_test.go}; contracts/github-trending-developers/{cases.json,README.md}; scripts/contracts/github-trending-developers.test.mjs; learn-go/{18-bounded-parallel-work/README.md,README.md}; backend/README.md; docs/{backend-map.md,bug-register.md,coordination.md,next-agent-briefing.md,plans/phase6-decision-pack-2.md}. No unrelated changes observed. No owned processes at release. Next: full handoff, inspect actual Git/status/lease, then claim BUG-046 / R-029. Pack remains open; this handoff signals only BUG-045.

Writer released: yes.

## Historical checkpoint: BUG-045, R-027 validate developer logins (Codex, 2026-10-30)

Status: **in progress / incomplete**. Writer Codex; reviewer unassigned. Branch main, base/current374a8ca; clean at claim. Prior BUG-044 committed d725f53. All-A pack approval applies. Scope: skip non-object users and absent/non-text/invalid GitHub logins before URL construction; retain valid search order, cap and cancellation; revise fixtures with rollback Next.js replies, deliberate-break check, lesson and docs. No existing exercise edits, signing/SQL/runtime/deployment work. Next: characterize invalid fixtures and existing username rules; add regression cases before fixing Go. No checks yet and no owned processes.

## Handoff: BUG-044, R-025 retain developers when repository lookups fail (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex; reviewer unassigned. Branch `main`, base `43d88f9`. Resulting commit: `d725f53` (synchronized by Git Agent on `main` and `go-backend`). Six of27pack fixes now complete locally,21remain starting R-027; separate open UI R-205/R-206. Hosted key acceptance remains under its independent checkpoint.

Go developer enrichment now returns a usable developer result plus an error when a repository lookup fails. HTTP/network/JSON/non-array/non-object-entry failures produce a fixed Repository unavailable card; genuine successful empty lists alone show No repositories. Successful siblings, ordering/ranks, four-worker bound and credential separation retained. Whole-request cancellation still joins workers and fails; initial search policy unchanged. One fixed warning counts unavailable lookups without upstream text/URLs. Malformed user/login entries await R-027. Existing React card renders the API labels without source changes; source review found placeholder repository names are clickable (new R-206, open and browser-unverified).

Developer contract v5 has71cases:12revised/3added mixed-result cases,56prior cases asserted identical; actual unchanged Next.js replies retained in next_expect for every revised/new case. Go review tests pin fixed warning counts and unavailable malformed-object output. Lesson18/index explain usable result plus error and slice validation; existing exercise files untouched.

Checks (Codex): before fix TestContracts/repo-http-404, one-network-failure and repo-null-body failed in memory/socket modes. After fix, go test -count=1 and go vet for githubdevelopers/cmd/api passed; Node developer76/76 passed. Deliberately forcing repository errors fatal failed those three plus one-http-failure and one-malformed-reply in memory/socket modes. First scratch mutation was rejected at compilation because its loop index became unused; corrected mutation compiled and demonstrated the behavioral failures. Handler restored byte-for-byte SHA-256 ea85e094b731eece31b369897228e0875ee1189da5810dde688d28952d972d16. git diff --check passed. Full npm run handoff follows; matching signal/status records outcome. Lint/build not repeated (no browser/Next production source changed); lessons skipped by policy. No live provider, signed-in browser, SQL, signing or deployment checks.

Changed files: backend/internal/githubdevelopers/{handler.go,contract_test.go,review_test.go}; contracts/github-trending-developers/{cases.json,README.md}; scripts/contracts/github-trending-developers.test.mjs; learn-go/{18-bounded-parallel-work/README.md,README.md}; backend/README.md; docs/{backend-map.md,bug-register.md,coordination.md,next-agent-briefing.md,plans/phase6-decision-pack-2.md}. No unrelated changes observed. Next: full handoff, inspect actual Git/status/lease, then claim BUG-045 / R-027. No owned processes at writer release. Parent pack remains open; this handoff signals only BUG-044.

Writer released: yes.

## Historical checkpoint: BUG-044, R-025 isolate developer repository failures (Codex, 2026-10-30)

Status: **in progress / incomplete**. Writer Codex; reviewer unassigned. Branch main, base/current 43d88f9. Git Agent committed TREND-001c and BUG-043 at 43d88f9 and tree was clean before claim; prior full handoff passed b1867ac16ff5 and lease cleared. All-A pack approval applies. Scope: per-developer fixed unavailable card for HTTP/network/malformed repository replies, preserve successful siblings/order and genuine-empty card, retain full-request cancellation/initial-search policy; v5 fixtures/rollback answers, deliberate break, lesson/docs. Existing source card renders API labels already; no UI source change planned. Source review also found its placeholder repository labels are clickable as repository names; record this separate UI bug without broadening this API fix. Next: revise fixtures and reproduce old failures. No task checks yet, no owned processes.

## Handoff: BUG-043, R-024 safe language colours and C++ query guard (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex; reviewer unassigned; branch `main`, base `fb34d4e`. Resulting commit: `43d88f9` (batch synchronized by Git Agent on `main` and `go-backend`). Prior verified TREND-001c ten-file diff preserved. Owner resumed the all-A decision pack; five of27fixes now complete locally,22remain starting R-025, plus separate open UI R-205. Hosted key acceptance remains under its independent checkpoint below.

Removed deliberate JavaScript prototype emulation from shared githubtrending.Item colour lookup. languageColor now returns string: only real map entries or fallback #8b949e, including __proto__ and inherited method names. Topics uses this same formatter. C++ was already correctly percent-encoded by R-068; no second query fix. Contract v8 has60cases: prototype case revised, eleven inherited-method names covered in one new case, C++ reclassified preserved and explicitly checked after query decoding. Actual unchanged Next.js replies saved in next_expect for two revised/one new cases; other57prior cases asserted identical. Lesson17/index updated, existing exercises untouched.

Checks (Codex): initial Go regression failed prototype-color and inherited-color-names in memory/socket modes. After fix, go test -count=1 and go vet for githubtrending/trendingtopics/cmd/api passed; Node trending64/64 passed. Deliberate wrong fallback failed both colour cases in memory/socket modes; deliberate replacement of %2B with literal + failed TestSearchTermsReachGitHubAsSeparateWords. Source restored byte-for-byte, SHA-256 88ee2be352a87eb0c79f6c01e851c3e7599db001c0e8d5c2addd96133fb03df1. git diff --check passed. Full npm run handoff follows; consult matching signal/status. Lint/build not repeated (Go-only production source change); prior TREND-001c lint/build/HTTP checks are recorded below. Lessons skipped under owner policy. No live GitHub, browser, SQL or deployment checks.

Changed in BUG-043: backend/internal/githubtrending/{handler.go,handler_test.go}; contracts/github-trending/{cases.json,README.md}; scripts/contracts/github-trending.test.mjs; learn-go/{17-clocks-and-randomness/README.md,README.md}; backend/README.md; docs/{backend-map.md,bug-register.md,coordination.md,next-agent-briefing.md,plans/phase6-decision-pack-2.md}. No unrelated changes observed. No owned processes at release. Next: full handoff, inspect Git/status/lease, then claim BUG-044 / R-025. No production/runtime/signing action authorized by this pack.

Writer released: yes.

## Historical checkpoint: BUG-043, R-024 language colours and C++ encoding (Codex, 2026-10-30)

Status: **in progress / incomplete**. Writer Codex; reviewer unassigned; branch main, base/current fb34d4e. Owner requested resuming decision pack 2; all-A approval applies. Prior TREND-001c ten-file diff is preserved, with matching full handoff tree9700b227b080; Git Agent has not committed it. No writer or verification lease at claim. Scope: remove inherited-property colour emulation, verify existing C++ percent encoding, retain rollback Next.js expectations, regression/deliberate-break checks, lesson and docs. No existing exercise edits or live actions. Next: characterize prototype fixtures and query decoding, revise contract, reproduce failure before the Go fix. No checks run for this task yet; no owned processes.

## Handoff: TREND-001c, narrow refresh route retirement (Codex, 2026-10-30)

Status: **implementation complete; prepared patch independently reviewed; not deployed**. Writer Codex; prior read-only reviewer review_keys_wiring (REVIEW-029 reviewed the exact deletion/caller scope, not live execution). Branch `main`, base `fb34d4e`. Resulting commit: `43d88f9` (batch synchronized by Git Agent on `main` and `go-backend`). Parent ROUTE-CLOSE-001 remains open under the checkpoint below; this handoff signals only completed source retirement and its approval records.

Owner approved applying the reviewed retirement patch now as a narrow Phase 6 gate exception. Deleted only src/app/api/trending/refresh/route.js (153 lines). Pre-delete SHA-256 ed02d832fb37ef891a9f68a19db700229fb75ab74b900f458867d51f15559593 matched, apply-check passed, and reverse apply-check confirms the exact patch is applied. Existing Go topics replacement and page integration are retained. No helper/table/data cleanup or general Phase 7 retirement. Repository caller audit found no caller outside the old handler's own comments; external schedulers/live traffic remain unverified.

Checks (Codex): strict npm run lint exit0; npm run build exit0 (dependency browser-data notices only). Compiled app-paths manifest has no refresh entry. Actual isolated production Next server returns 404 for both GET and POST /api/trending/refresh; owned server exited. Existing trending-page regression 5/5 passed. git diff --check and exact reverse-patch check passed. Full npm run handoff follows; matching verification status/signal records its outcome. No Go change, no lesson changes/tests. Hosted development preflight/acceptance and deployment not run.

Changed files: src/app/api/trending/refresh/route.js (deleted); backend/README.md; docs/{coordination.md,adr/0002-go-backend.md,backend-map.md,bug-register.md,next-agent-briefing.md,plans/route-completion-review.md,database/keys-hosted-acceptance.md,verification/keys-dev-operator.md}. Frozen approval proposal and retirement patch unchanged. No unrelated dirty work observed. Next: run handoff; inspect actual Git Agent synchronization and preserve approval/checkpoint records. No owned servers/checks remain at release.

Writer released: yes.

## Checkpoint: ROUTE-CLOSE-001 development run awaiting browser reconnection (Codex, 2026-10-30)

Status: **incomplete / awaiting external connection**. Writer released; owner Codex for pickup. Branch main, base/current fb34d4e; actual changed files are the completed TREND-001c handoff above. Owner's exact development replacement approval is recorded in the ADR and review packet. The frozen addendum SHA-256 f212c12e9a17f88bec2137d3fd7da636e5a3e0d6d1d970237785d5092d10dde3 is unchanged. Do not ask for this approval again.

Browser selection and inventory returned "The browser access host is unavailable"; retry after usage-limit resume returned the same result. No Supabase tools are exposed. Therefore current project/signing states, empty users/lifecycle tables, exact policy and absence of other consumers could not be reverified. No replacement key/password/user/session/accountant token was generated and no hosted acceptance or live mutation was attempted. No permission denial or workaround. Owner was asked to reconnect browser access while local retirement work continued. Existing public historical receipts are not fresh preflight evidence.

Remaining: reconnect browser; verify current original/revoked/standby states and exact catalog/policy/no-consumer prerequisites; execute the reviewed one-replacement procedure, exactly two users, one 300-second accountant token, one provider-free hosted acceptance and independent acknowledged cleanup. No SQL reapply, third key, ambiguous retry, production/legacy privilege change, runtime activation, cutover or deployment. All prior numerical limits and private-form observation rules apply. Next concrete command after reading Git/status/lease and reclaiming writer: cua.listBrowsers(), then select the exact development Dashboard through the reviewed workflow. Running processes none. Parent objective is not complete; bounded TREND-001c above is ready for synchronization.

Writer released: yes.

## Historical checkpoint: ROUTE-CLOSE-001 resumed under exact approvals (Codex, 2026-10-30)

Status: **in progress / incomplete**. Writer Codex; branch main, base/current fb34d4e, clean at claim. Owner explicitly approved keys-dev-replacement-review.md SHA-256 f212c12e9a17f88bec2137d3fd7da636e5a3e0d6d1d970237785d5092d10dde3 and instructed applying the narrow trending-refresh-retirement.patch now as a Phase 6 retirement exception. Existing managed/revoked keys, production, legacy privileges, SQL/grants, runtime activation, cutover and deployment remain outside scope. Exact development limits and independent cleanup obligations in the approved proposal apply.

Completed at resume: checked Git/status; no writer or verification lease; source integration synchronized at de1ea2c, coordination fb34d4e. No partial edits, failing checks or owned processes at claim. Next: verify proposal/deletion hashes, apply only the reviewed 153-line route deletion, then verify actual development Dashboard/catalog prerequisites before generating any replacement material. Do not reapply SQL or repeat ambiguous issuance. Tests/live operations not yet run for this resumed task. Prior paused checkpoint below is historical and superseded by these explicit approvals.

## Handoff: KEYS-WIRING-001, default-off key route integration (Codex, 2026-10-30)

Status: **implementation complete; independent review complete; not activated or deployed**. Writer Codex; reviewer review_keys_wiring (read-only, REVIEW-029). Branch `main`, base `5889bff`. Resulting commit: `de1ea2c` (synchronized by Git Agent on `main` and `go-backend`). This completed bounded task is source integration only.

Overall ROUTE-CLOSE-001 remains incomplete under the separate checkpoint below; this handoff signals only the completed default-off source integration.

Production mux reserves /api/v1/ outside the ordinary GitHub session verifier. Exact SEFGH_KEYS_V1=1 is required; otherwise404/no-store with no upstream access. Enabled startup requires public Supabase configuration, a separately supplied accountant bearer and the database-approved enabled policy; bootstrap failures install fixed503/no-store and stage-only logs. It composes reviewed owner Sessions, accounting Executor and bound durable SaveRecovery. No quota defaults, caller-to-accountant conversion, service-role CRUD or legacy plaintext forwarding. Next rewrites only keys/key-selector/public-search paths with Go origin, playground-keys-v1 route opt-in and v1 UI opt-in together. No flags or live resources changed.

Tests cover disabled/missing capability, policy denial/outage/malformed/incomplete/disabled responses, owner create/list/revoke, no metadata reveal, credential separation, lookup/reserve/provider/complete order, revoked-key refusal and exact recovery sink. New lesson47 and index explain wiring/deadlines; lessons41/42 updated. Existing exercise.go files untouched; only the new unfinished lesson47 exercise was created.

Validation (Codex): initial focused Go tests failed on absent dispatch and enabled route behavior; Node gate test failed on absent rewrites. Focused key Go tests passed after implementation; go build to temporary executable passed. Rewrite tests3/3 passed. npm run lint exit0 (baseline browser-data notice from dependency, no ESLint warnings/errors). Isolated production Next build and corrected keys-routing-probe passed create/list/search/recovery/revoke through actual Next-to-Go forwarding; receipt docs/verification/keys-routing.json records source/executable hashes and5 checks,2 provider calls, all owned children stopped. It uses local exercised endpoints/credentials but inherits parent/Next env files, and does not claim browser UI/live SQL/deployment evidence. Cooperative interruption check exited143 with interrupted receipt and both recorded child PIDs absent. Reviewer accepted runtime/probe corrections and retirement packet by read-only inspection.

Deliberate breaks: wrong /api/v1 mux prefix failed TestKeyRuntimeConnectsOwnerLifecycleAndAccountedSearch and TestDisabledKeyRoutesDoNotVerifyOrForwardCredentials; removing UI rewrite gate failed the v1 key forwarding Node test. Restored source hashes identical: main.go5e134312bbc56dbe56d0a8d56a204abbd5a7b0b9e62c938f6cb5d78c61a8cf1e; next.config.mjs99616179c41da5bd0814299cc92b0cadd544d8c6accc0f1af48a55c282912f61. Final full npm run handoff follows; consult matching signal/status for receipt. Lesson solution/exercise checks skipped by owner policy. Browser UI, hosted grants/signing, two-user hosted acceptance, production policy/runtime/cutover/deployment were not run.

Changed files: backend/cmd/api/{keys.go,keys_wiring_test.go,keys_lifecycle_wiring_test.go,main.go}; next.config.mjs; scripts/{keys-routing-probe.mjs,contracts/go-rewrites.test.mjs}; learn-go/{47-wiring-gated-routes/*,41-http-capabilities-and-buffered-replies/README.md,42-rpc-capabilities-and-database-authority/README.md,README.md}; backend/README.md; docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,claude-review.md,next-agent-briefing.md,plans/phase6-decision-pack-2.md,plans/route-completion-review.md,plans/trending-refresh-retirement.patch,verification/keys-routing.json,coordination.md}. No unrelated changes observed; old refresh handler and stored data preserved.

Next: full handoff, check Git/status and preservation of review/checkpoints after sync. Ask the owner only the two concrete approvals in the review packet: exact dev signing replacement and a narrow refresh retirement exception (or retain it until Phase6). No Codex servers/check processes running at writer release. Do not claim full25/25 migration/live completion.

Writer released: yes.

## Checkpoint: ROUTE-CLOSE-001, remaining route closure (Codex, 2026-10-30)

Status: **paused / incomplete, waiting for explicit owner gates**. Owner Codex; active writer none. Branch main, base5889bff; current source changes are the completed KEYS-WIRING-001 handoff above. Objective remains finishing the two remaining route entries. Local key runtime/forwarding implementation is complete and reviewed; refresh153-line deletion patch is prepared, apply-check passed and independently reviewed, but not applied.

Outstanding: explicit approval of dev one-replacement addendum SHA-256 f212c12e9a17f88bec2137d3fd7da636e5a3e0d6d1d970237785d5092d10dde3 before any signing/provisioning/hosted acceptance; Phase6 gate or explicit narrow exception before refresh deletion. Production SQL/policy/credentials/runtime/cutover/deployment still require their separate concrete review. Supabase connector tools are absent in this session; authorized hosted work must confirm the intended current connection/UI/preconditions and stop on permission refusal. Never ask for/copy passwords or keys.

Source SHA for proposed deletion ed02d832fb37ef891a9f68a19db700229fb75ab74b900f458867d51f15559593; git apply --check passed. Repository caller audit does not establish external cron/live traffic. Pack census corrected to27fixes+2choices;4fixes done,23remain plus R-205. Source count stays historical23/25 until the remaining route acceptance/retirement gates are met.

No partial source edits or known failing implementation checks left. Running processes: none before bounded-task handoff. Incoming agent: read this checkpoint and review packet, inspect current Git/diff/lease, confirm writer release and claim ownership before any edit/action. Next concrete action is obtaining the two exact owner choices, not importing a key, applying SQL or deleting a route on inference. All files preserved.

Writer released: yes.

## Handoff: BUG-042, R-023 retain trending rate limits and wait metadata (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex; reviewer unassigned. Branch `main`, base `e197504`. Resulting commit: `a728edc` (batch synchronized by Git Agent on `main` and `go-backend`).

New leaf helper internal/githublimit.Write shares the existing search policy: GitHub 429, or 403 with Retry-After/zero remaining, becomes 429 with the same fixed message and nullable remaining/reset metadata. Retry-After is forwarded (including HTTP-date form). Ordinary forbidden responses and success with rate headers retain their prior handling. Upstream bodies remain private. Repository trending calls the helper before its generic status branch; developers returns headers from fetch and uses it only for the initial user search. Repository enrichment failures remain R-025.

Repository contract v7 (59 cases), developer v4 (68 cases): one and two prior rate cases revised respectively; five cases added to each for primary/secondary limits, metadata, ordinary 403 and successful replies with limit headers. Other prior cases asserted identical. Go harnesses now deliver upstream headers and compare Retry-After; Node's repository fixture optionally captures Retry-After. Real unchanged Next.js replies recorded in next_expect. Node integrity checks pin classification and nullable metadata. Lessons 17/18/index updated; existing exercises untouched.

New R-205 (Low, open): useTrendingData discards non-success bodies/Retry-After and still displays a generic message. API R-023 is complete; browser wait-time rendering was not implemented or verified here. No owner deferral implied.

Checks (Codex): regression first failed TestContracts/rate-limit and TestContracts/search-http-429 in memory/socket modes (500 instead of 429). After fix, go test -count=1 ./internal/githubtrending/ ./internal/githubdevelopers/ ./internal/githublimit/ ./cmd/api/ and go vet on those packages passed; githublimit is exercised through route fixtures, not a separate unit suite. Node contracts 134/134 passed. Deliberately disabling shared rate handling failed both packages' primary/secondary cases plus repository rate-limit and developer search-http-429 in memory and sockets; restored helper SHA-256 67e326701db513b590e0b27c8c58ccf678dc726785b24e71c0aa0df051fb33f3. Final combined full npm run handoff follows; consult matching signal/status for receipt. Lint/build not run (no browser/Next.js production source changes); lessons skipped by owner policy. No live or deployment checks claimed.

Changed in BUG-042: backend/internal/{githublimit/response.go,githubtrending/handler.go,githubtrending/handler_test.go,githubdevelopers/handler.go,githubdevelopers/contract_test.go}, contracts/{github-trending,github-trending-developers}/{cases.json,README.md}, scripts/contracts/{github-trending.test.mjs,github-trending-developers.test.mjs,trending-fixture.mjs}, learn-go/{17-clocks-and-randomness/README.md,18-bounded-parallel-work/README.md,README.md}, backend/README.md, docs/{backend-map.md,bug-register.md,next-agent-briefing.md,plans/phase6-decision-pack-2.md,coordination.md}. Earlier BUG-040/041 files remain; no unrelated changes observed.

Remaining: 24 approved pack fixes starting R-024, open UI R-205, independent review, deployment and owner-controlled signed-in/AI checks. No SQL, secret, signing or worker changes. Next concrete command npm run handoff, inspect status/Git and handoff preservation after synchronization. Next implementer reads checkpoint/diff and claims BUG-043 / R-024 before editing. No Codex processes running at writer release.

Writer released: yes.

## Handoff: BUG-041, R-022 fixed elapsed UTC trending periods (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex; reviewer unassigned. Branch `main`, base `e197504`. Resulting commit: `a728edc` (batch synchronized by Git Agent on `main` and `go-backend`).

Both trending handlers subtract 1/7/30 fixed elapsed UTC days for daily/weekly/monthly; no new yearly option. Repository trending keeps its full cutoff timestamp. Developers now sends the full timestamp too, so the elapsed interval is not rounded away by GitHub's date-only interpretation. Existing caller boundaries, concurrency, sorting and response bodies remain.

Repository contract v6: 54 cases; three prior cutoff URLs revised, other prior cases asserted unchanged; three new month/weekly-DST/UTC cases. Developer contract v3: 63 cases; 56 prior search URLs revised, four refusal cases unchanged; three added boundary cases. Revised/new cases retain the real unchanged Next.js handler's complete answers as next_expect (including older R-026 repository requests); prior next_expect records retained. Node integrity checks pin cutoff durations. Lessons 17/18 and index explain elapsed versus calendar days and timestamp precision; all existing exercise.go files untouched.

Checks (Codex): regression first failed monthly-overflow/leap-monthly-overflow in repository memory/socket fixtures, and month-overflow in developer memory/socket fixtures. After fix, go test -count=1 ./internal/githubtrending/ ./internal/githubdevelopers/ ./cmd/api/ and go vet on those packages passed. Node tests for both contracts: 122/122 passed. Deliberately restoring calendar subtraction failed month/weekly-DST fixtures in both packages, in memory and sockets. Restored handler.go hashes: githubtrending 52777bfa80a6c5e67adba6150c709f5b6f647daac2b48d88c3a69b5347ad4c2f; githubdevelopers 845e95942be467f224edd3ea673504f369215255b6ac9c27d6933c4da21d9c7c. git diff --check passed. Full npm run handoff follows; consult matching signal/status for final receipt. Lint/build not run (no browser/Next.js production source changes); lessons skipped by owner policy. No live/deployment checks claimed.

Changed in BUG-041: backend/internal/{githubtrending/handler.go,githubtrending/handler_test.go,githubdevelopers/handler.go,githubdevelopers/contract_test.go}, contracts/{github-trending,github-trending-developers}/{cases.json,README.md}, scripts/contracts/{github-trending,github-trending-developers}.test.mjs, learn-go/{17-clocks-and-randomness/README.md,18-bounded-parallel-work/README.md,README.md}, backend/README.md, docs/{backend-map.md,bug-register.md,next-agent-briefing.md,plans/phase6-decision-pack-2.md,coordination.md}. Earlier BUG-040 files preserved; no unrelated edits observed.

Remaining: 25 approved pack fixes starting R-023, independent review, deployment and owner-controlled signed-in/AI checks. No SQL, secrets, signing or worker changes. Next concrete command npm run handoff, then inspect status/Git and claim BUG-042 / R-023 after lease clears. Verify handoff preservation after any sync. No Codex processes running at writer release.

Writer released: yes.

## Handoff: BUG-040, R-021 accept every offered trending language (Codex, 2026-10-30)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex; reviewer unassigned. Branch `main`, base `e197504`. Resulting commit: `a728edc` (batch synchronized by Git Agent on `main` and `go-backend`).

Go trending keeps accepted simple names and also accepts every name in the embedded language catalog, case-insensitively. internal/githublanguages.Contains exposes a private set built once from the same served catalog; no duplicate catalog or mutable data is exported, and the endpoint response is unchanged. Known names with spaces become one quoted GitHub qualifier before URL encoding. Unknown spaces/slashes/qualifier syntax and excessive lengths remain refused.

Trending contract v5: 51 cases, C# revised and six added for F#, F*, apostrophe, parentheses, multiword names and lowercase C#. Other 44 cases asserted identical; seven rollback next_expect answers recorded through the actual unchanged Next.js handler. Go TestEveryCatalogLanguageReachesGitHub reads the source catalog and tests each name plus lowercase variant against the exact query received. Lessons 12/17 and index updated; existing exercises untouched.

Checks (Codex): regression first failed TestContracts/csharp-rejected in memory and sockets (400 instead of 200). After fix, go test -count=1 ./internal/githubtrending/ ./internal/githublanguages/ ./cmd/api/ and go vet for those packages passed; Node trending 52/52 passed. Deliberately removing catalog acceptance failed TestContracts/{csharp-rejected,multiword-language}/{memory,socket}; restored handler.go SHA-256 11ec12e67e605b8ba72c1b839adfbc2a6720e9ab093244abc469b0c760bae1f7. git diff --check passed. Final full npm run handoff follows; consult matching signal/status for that receipt. Lint/build not run (no browser/Next.js production source changes); lessons skipped by owner policy. No live checks or deployment claimed.

Changed files: backend/internal/{githublanguages/handler.go,githubtrending/handler.go,githubtrending/handler_test.go,githubtrending/languages_test.go}, contracts/github-trending/{cases.json,README.md}, scripts/contracts/github-trending.test.mjs, learn-go/{12-embedded-data/README.md,17-clocks-and-randomness/README.md,README.md}, backend/README.md, docs/{backend-map.md,bug-register.md,next-agent-briefing.md,plans/phase6-decision-pack-2.md,coordination.md}. No unrelated changes observed.

Next: npm run handoff, inspect status and actual Git log/status; then claim BUG-041 / R-022. After synchronization verify this record and DECISION-PACK-002 remain. Remaining: 26 approved pack fixes, independent review, deployment and owner-controlled signed-in/AI verification. No SQL, credential, worker or signing changes. No Codex processes running at writer release.

Writer released: yes.

## Handoff: BUG-039, R-016 real monthly/yearly search periods (Codex, 2026-10-29)

Status: **implementation complete; unreviewed; not deployed**. Writer Codex; reviewer unassigned. Branch `main`, base `b2cef38`. Resulting commit: `66024e6` (batch synchronized by Git Agent on `main` and `go-backend`).

Owner approved all A in decision pack 2 this turn (recorded in the pack and ADR). Go search monthly/yearly now append a created timestamp 30/365 fixed days before the handler's clock, in UTC. Updated sorting and explicit filters remain; creation qualifiers intersect. Handler.Now defaults to time.Now and supplies a fixed clock in tests. The Next.js rollback handler remains unchanged.

Search contract version 5: 107 cases; the two old period cases revised, five new boundary/filter cases, other 100 cases asserted identical by the edit script. Each period case has now and next_expect_upstream_url. Go pins version 5 and injects clocks in both in-memory and real HTTP fixtures. Lesson 4/index explains duration arithmetic, clock injection and leap-day exercise; its quoted parseRequest call is updated. Existing exercise.go files untouched.

Checks (Codex): before fixing Go, TestContract/sort-monthly and TestContractOverHTTP/sort-monthly failed on the missing created qualifier. After fixing: go test -count=1 ./internal/githubsearch/ ./cmd/api/ and go vet on both passed; node --test scripts/contracts/github-search.test.mjs 110/110 passed. Deliberately removing the period qualifier failed all seven period cases in both TestContract and TestContractOverHTTP; restored request.go SHA-256 5242a0ee344896e714c0a307d845bca70d56d8629a8a4f97a36df25dd2fa43c8. git diff --check passed, gofmt -l empty, control-character scan passed for all 32 changed files and changed Markdown links resolve. Full npm run handoff follows this record; lessons skipped by owner policy. Lint/build not run because no browser/Next.js production source changed. No live API, database or deployment checks claimed.

Changed in BUG-039: backend/internal/githubsearch/{request.go,handler.go,contract_test.go}, contracts/github-search/{cases.json,README.md}, scripts/contracts/github-search.test.mjs, learn-go/04-errors/README.md, learn-go/README.md, backend/README.md, docs/{backend-map.md,bug-register.md,next-agent-briefing.md,plans/phase6-decision-pack-2.md,coordination.md}. Earlier BUG-037/038 files remain preserved. Total working tree: 32 changed/new files, all attributable to these three tasks and the owner-answer record. No unrelated changes observed.

Remaining: 27 approved pack fixes, beginning R-021 as BUG-040; R-011 deferred until after Phase 7, R-042 GitHub verification remains per-request. Deployment, signed-in walkthrough, AI-key-dependent verification and all parked/gated work remain owner-controlled. No Codex commit/push/deployment or independent peer review claimed.

Next: npm run handoff; inspect node scripts/agent-handoff.mjs --status and actual Git log/status. After any sync verify this handoff, BUG-037/038 and DECISION-PACK-002 remain. Next implementer reads this checkpoint and diff, confirms release and claims BUG-040 before editing. No Codex background processes running at writer release.

Writer released: yes.

## Handoff: BUG-038, R-064 read every page of the activity year (Codex, 2026-10-29)

Status: **implementation complete; locally verified; unreviewed; not deployed**. Writer Codex; reviewer unassigned. Branch `main`, base `b2cef38`. Resulting commit: `66024e6` (batch synchronized by Git Agent on `main` and `go-backend`).

Go reads activity_logs in 1000-row pages ordered by activity_date,activity_type, increasing offset until a short page. The recorded unique user/type/date key supplies stable ordering for a fixed dataset. One shared 10-second database deadline preserves the existing total bound. Failed, canceled or malformed later pages return the fixed database error rather than partial totals. Offset paging does not provide a database snapshot across concurrent writes.

Contract activity version 3: 16 cases. Existing 13 cases asserted unchanged except explicit go_queries; three new cases recorded through the real Next.js handler cover 1001 rows, exactly 1000 and later-page failure. The Go stand-in slices using actual limit/offset and records every request; Node row_limit simulates the Data API cap and next_expect preserves the old handler. Tests cover shared deadlines, cancellation and malformed later pages. Lesson 22/index, contract/backend/map/register/briefing updated; existing exercise.go files untouched.

Owner answer recorded in decision pack 2 and ADR: every recommendation A approved. R-011 deferred until after Phase 7; R-042 GitHub tokens remain uncached. All 28 pack fixes remain queued. This does not authorize deployment, production SQL, credential or parked-item changes.

Checks (Codex): regression first failed with 1000 versus 1001 contributions and one request instead of two. go test -count=1 ./internal/activity/ ./cmd/api/ and go vet on both passed; the activity package includes 400 generated comparisons with the unchanged Next.js handler. Node activity 19/19 passed. Deliberately stopping after page one failed TestContract/{over-one-page,exactly-one-page,later-page-fails}, TestPagesShareOneDeadline, TestCanceledPagingDoesNotReturnPartialTotals and every TestMalformedLaterPageDoesNotReturnPartialTotals subtest. Restored SHA-256 472f24ba2a39d46196aba57a95ed09662c5477725e786515d8032cdef9f40534. Full npm run handoff follows. Lint/build not run (no browser/Next.js source changes); lessons skipped by owner policy. No live database or deployment checks claimed.

Changed in BUG-038: backend/internal/activity/{handler.go,handler_test.go,contract_test.go,pagination_test.go}, contracts/activity/{cases.json,README.md}, scripts/contracts/{activity.test.mjs,activity-fixture.mjs}, learn-go/22-reading-rows-as-the-user/README.md, learn-go/README.md, backend/README.md, docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,next-agent-briefing.md,plans/phase6-decision-pack-2.md,coordination.md}. Earlier BUG-037 files remain present and uncommitted; no unrelated changes observed.

Next concrete command: npm run handoff, inspect node scripts/agent-handoff.mjs --status, then claim BUG-039 / R-016 after verification clears. Check preservation of both handoffs and the restored DECISION-PACK-002 record after any Git Agent synchronization. No Codex processes running at writer release; no independent review claimed.

Writer released: yes.

## Handoff: BUG-037, R-076 count votes without the missing RPC (Codex, 2026-10-29)

Status: **implementation complete; locally verified; unreviewed; not deployed**. Writer Codex; reviewer unassigned. Branch `main`, base `b2cef38`. Resulting commit: `66024e6` (batch synchronized by Git Agent on `main` and `go-backend`).

Go counts votes directly after a successful write, retaining failed-count zeros, caller authorization and the shared 24-second budget. Contract repo-vote version 2 retains all 37 cases: 15 now use optional go_database replies and next_expect for the unchanged rollback handler. The rewrite script asserted exact old JSON formatting, identical old replies/Next.js expectations and 22 unchanged cases. Wiring checks no RPC; the hanging-count test retains deadline coverage. Lesson 26/index and route/map/contract/register/briefing docs updated; existing exercises untouched.

Checks (Codex): before the fix, the changed contract failed on the old RPC request; after the fix, go test -count=1 ./internal/vote/ ./cmd/api/ and go vet on both passed. Node repo-vote 38/38 passed against the real Next.js handler. gofmt -l empty; git diff --check passed. Deliberately restoring an RPC made TestContract/post-upvote and TestVoteWritesAsTheCaller fail; source restored with identical SHA-256 1b12c73c3c20536bdbc7549d8234d0e81596b66f710e9b5a296847550ee0c4c1. Full npm run handoff follows this record. Lesson checks skipped by owner policy; lint/build not run (no browser/Next.js source changes). No live database/schema/credential changes or production verification.

Changed files: backend/internal/vote/{handler.go,handler_test.go,contract_test.go}, backend/cmd/api/vote_wiring_test.go, contracts/repo-vote/{cases.json,README.md}, scripts/contracts/repo-vote.test.mjs, learn-go/26-three-kinds-of-nothing/README.md, learn-go/README.md, backend/README.md, docs/{backend-map.md,bug-register.md,next-agent-briefing.md,coordination.md}.

Next: run npm run handoff, inspect status and preservation after Git Agent synchronization, then claim BUG-038 for R-064 unless the owner supplies decision-pack answers. No Codex checks/processes running at writer release; no independent peer review claimed. Remaining gates: deployment and owner-controlled signed-in checks; pack 2 pending.

Writer released: yes.

## Handoff: BRIEFING-001, a briefing for an agent without context (Claude Code, 2026-10-29)

Status: **complete (documentation only).** Writer Claude Code. Branch `main`, base `ae56fe7`. Resulting commit: `8c6c8eb` (synchronized by Git Agent on `main` and `go-backend`).

The owner asked for a detailed prompt so another agent with no context can continue. New `docs/next-agent-briefing.md`: what the project is; files to read, in order; the state on 2026-10-29 (what is live, what the owner still has to do, what was fixed, next free IDs BUG-037 and R-205); the work queue (decision pack 2 answers, R-064 and R-076 with their harness changes, R-038, BUG-002, Phase 7, parked items); the fix recipe used for BUG-024 to BUG-036; the rules; and the traps. "Start here" in this file now points to it.

Found while doing it: the DECISION-PACK-002 record below had vanished from this file. The pack itself was committed (`170a5b6`), but the Git Agent's sync appears to have rewritten this file from an older copy, dropping the uncommitted record. It is restored here, and the briefing lists the trap. Also seen, not Claude Code's: `d75fa69` (`test(apikey): eliminate context timer skew race in recovery page test`, `backend/internal/apikey/recovery_test.go` only), committed by the Git Agent's identity; left as is.

Checks: every file the briefing names exists (one wrong reference, `contracts/README.md`, corrected to the per-contract READMEs); `git diff --check`; control-character scan; `npm run handoff` below.

Changed files: new `docs/next-agent-briefing.md`, `docs/coordination.md`.

Next: as in the briefing's queue.

Writer released: yes. No processes left running.

## Handoff: DECISION-PACK-002, the open contract-change entries put to the owner (Claude Code, 2026-10-29; record restored by BRIEFING-001)

Status: **complete (documentation only); waiting on the owner.** Writer Claude Code. The pack was committed as `170a5b6`.

After BUG-026 to BUG-036, a census of the register's open entries (by the Needs column and status) found:

- **Fixable without a decision:** R-083, R-063 (done in BUG-035, BUG-036), R-064 and R-076 (both Low: the contract test harnesses for `activity` and `repo-vote` must first learn paged reads and per-implementation stand-in answers; next agent task).
- **Needing the owner (contract changes):** 28 entries, each with a recommendation in `plans/phase6-decision-pack-2.md`, grouped by area, plus R-011 (needs a table change; recommended later) and R-042's GitHub-token part (recommended no). Avatar R-094, R-095, R-096 and R-097 are in it.
- **Waiting on deployment or resumption:** RepoSync (R-189 to R-198), the analysis workers (R-116 to R-123), the playground keys (R-039, R-127 to R-143, R-177, R-182); R-038 needs checking once the AI keys are on the Go project.

Next: the owner answers pack 2 (for example "pack 2: all A"); agents then fix the approved entries one bounded task at a time, and R-064 and R-076.

## Handoff: BUG-036, R-063 an Auth outage is not a sign-out (Claude Code, 2026-10-29)

Status: **complete; unreviewed; not deployed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `4626fa1`. Resulting commit: `cdd3bc8` (synchronized by Git Agent on `main` and `go-backend`).

- **Go** `internal/activity/handler.go`: a 503 from `User` (the verifier's answer when Supabase Auth is unreachable or answers wrongly) is 503 `{"error":"Sign-in could not be verified"}`, chat's wording; other failures stay 401. The database is not asked either way.
- **Contract `activity` version 2** (13 cases): new `auth-unreachable` inserted as text after `session-error` (hand-formatted file; the other cases asserted unchanged), with `next_expect` 401 for the Next.js handler. Go fixture: a user marked `"unreachable"` makes the stand-in Supabase answer 503. Node test: version 2 and `next_expect ?? expect`.
- **Unit test:** `TestSignInFailures` (table: 401 and 403 → 401, 503 → 503) replaces `TestSignInFailuresAreAll401`.
- **Lesson 22:** the fix and table-driven tests. Exercise untouched. **Docs:** contract README, register.

Checks (Claude Code): `go test -count=1 ./internal/activity/ ./cmd/api/` pass; `go vet`; `gofmt -l` empty. With the 503 branch disabled, `TestContract/auth-unreachable` and `TestSignInFailures` failed (restored, identical SHA-256). `node --test scripts/contracts/activity.test.mjs` 15/15. `npm run handoff` below.

Changed files: `backend/internal/activity/{handler.go,handler_test.go,contract_test.go}`, `contracts/activity/{cases.json,README.md}`, `scripts/contracts/activity.test.mjs`, `learn-go/22-reading-rows-as-the-user/README.md`, `docs/{bug-register.md,coordination.md}`.

Next: R-064, R-076; then the decision pack.

Writer released: yes. No processes left running.

## Handoff: BUG-035, R-083 the save count counts everyone (Claude Code, 2026-10-29)

Status: **complete; unreviewed; not deployed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `2ac43a4`. Resulting commit: `f4f6bc5` (batch synchronized by Git Agent on `main` and `go-backend`).

R-083 (High; Needs "—", so the fix is approved by the register's rule): the count beside the bookmark button counted only the visitor's own saves.

- **Live read (read-only):** view `repo_collection_stats` = `select repo_full_name, count(distinct user_id) as total_saves from repo_collections group by repo_full_name`; no `security_invoker`, so it runs with its owner's rights; SELECT granted to `anon` and `authenticated`.
- **Go** `internal/collect/handler.go`: `count` reads `repo_collection_stats?select=total_saves&repo_full_name=eq.<repo>` and answers its number (a `json.Number` or a float), or 0 for a failure or no row; GET keeps reading the visitor's own rows for `saved` and takes `totalSaves` from `count`.
- **Contract `repo-collect` version 2** by a script (formatting and line endings kept; every unchanged case asserted identical): 23 cases. POST and DELETE count reads go to the view, with stand-ins answering `[{"total_saves": n}]`; GET gains the view read and its stand-in; `post-count-own-rows` and `get-signed-in-saved` answer 42 where the Next.js handler, recorded by running it, says 1. Node test: version 2, `next_expect ?? expect`, every total comes from the view, paths may be the table or the view. Go pins version 2.
- **Wiring:** `cmd/api` `TestCollectWritesAsTheCaller` and `TestCollectSignedOut` know the view (42) and expect two public-key reads on GET.
- **Lesson 25:** the fix, and reading a nil map. Exercise untouched.

Checks (Claude Code): `go test -count=1 ./internal/collect/ ./cmd/api/` pass; `go vet`; `gofmt -l` empty. With the old table read restored for a moment, 23 cases failed (restored, identical SHA-256). `node --test scripts/contracts/repo-collect.test.mjs` 50/50. `npm run handoff` below. No application source changed.

Changed files: `backend/internal/collect/{handler.go,contract_test.go}`, `backend/cmd/api/collect_wiring_test.go`, `contracts/repo-collect/{cases.json,README.md}`, `scripts/contracts/repo-collect.test.mjs`, `learn-go/25-writing-as-the-user/README.md`, `docs/{bug-register.md,coordination.md}`.

Next: R-076, R-063, R-064 (no decision needed); then a decision pack for the contract-change entries.

Writer released: yes. No processes left running.

## Handoff: BUG-034, R-017 the search sends the navbar's supported filters (Claude Code, 2026-10-28)

Status: **complete; unreviewed; not deployed** (Go with `sefgh-api`, browser with `sefgh-main`). Writer Claude Code; reviewer unassigned. Branch `main`, base `2ac43a4`. Resulting commit: `f4f6bc5` (batch synchronized by Git Agent on `main` and `go-backend`).

R-017's decided part: send license, created, topic and forks; Go; the filters stay visible (owner).

- **Go** `internal/githubsearch/request.go`: `license` (`licensePattern`), `created` (`createdPattern`: optional `<`, `<=`, `>`, `>=` and a date, or a date range), `topic` (comma list, each `topicPattern`, at most `maxTopics` 5), `forks` (`starsPattern`). Appended after language and stars as `license:`, `created:`, `topic:` each, `forks:`; a malformed value is `errInvalidParameters` (400) before GitHub is asked; empty values are ignored.
- **Contract `github-search` version 4** (102 cases): 13 `filter-*` cases inserted as text after `stars-less-than` (the file is hand-formatted with CRLF; the script checks the old cases parse unchanged). Each carries `next_expect_upstream_url`/`next_expect` for the Next.js handler, which ignores the filters (one value corrected after the first run: that handler does apply language and stars). Node test reads them and checks version 4 sends all four filters.
- **Browser:** new `src/lib/search/advanced-filters.js` (`appendAdvancedFilters`): license; the date range as `created=>=<date>` from the browser's clock (GitHub reads `>` on a date as after that whole day, R-203's lesson, so `>=`); topics joined; forks. `useGitHubSearch.js` calls it in all three requests, with `advancedFilters` added to the three callbacks' dependencies. New `scripts/contracts/advanced-filters.test.mjs`: the mapping, the four ranges from a fixed clock, every license the navbar lists and every produced value checked against Go's own patterns read from `request.go`, and the three calls in the hook.
- **Not sent:** wiki and issues (no GitHub qualifier); the navbar has no inputs for topics or forks yet.
- **Lesson 4:** a section on the four filters, `strings.Split`, and the shared patterns. Exercise untouched.
- **R-038 checked, not fixed:** see its register entry (needs the AI keys first).

Checks (Claude Code): `go test -count=1 ./internal/githubsearch/` pass; `go vet`; `gofmt -l` empty. Without the license qualifier, `filter-license`, `filter-license-with-dot` and `filter-all-in-order` failed in memory and over HTTP (restored, identical SHA-256). `node --test scripts/contracts/github-search.test.mjs` 104/104; `advanced-filters.test.mjs` 4/4, and 1 failure with one hook call removed (restored, identical SHA-256). `npm run lint` exit 0; `npm run build` exit 0; `npm run handoff` below.

Changed files: `backend/internal/githubsearch/request.go`, `contracts/github-search/{cases.json,README.md}`, `scripts/contracts/{github-search.test.mjs,advanced-filters.test.mjs}`, new `src/lib/search/advanced-filters.js`, `src/hooks/search/useGitHubSearch.js`, `learn-go/04-errors/README.md`, `docs/{bug-register.md,coordination.md}`.

Next: owner decisions (R-042 GitHub tokens, R-094, R-096, R-097); R-038 once the AI keys are in; the signed-in walk-through (BUG-002).

Writer released: yes. No processes left running.

## Handoff: BUG-033, R-041 no bucket listing after a failed avatar upload (Claude Code, 2026-10-28)

Status: **complete; unreviewed; not deployed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `c612932`. Resulting commit: `d4b94ba` (synchronized by Git Agent on `main` and `go-backend`).

- **Go** `internal/avatar/handler.go`: after a failed upload, no `GET /storage/v1/bucket`; the answer is always "Failed to upload avatar" with the same `details` (owner's option A, 2026-10-23). `details` itself is R-097, not decided.
- **Contract `upload-avatar` version 2** by a script (formatting round-trips): the bucket request removed from 7 cases, the setup-file message replaced in the two "bucket missing" cases; each keeps the Next.js handler's answer as `next_expect`. Node test: version 2, `next_expect ?? expect`, integrity: no bucket listing and no setup-file name in `expect`. Go pins version 2.
- **Lesson 31:** a note on the removed request. **Docs:** contract README, `database/avatar-storage.md`, register.

Checks (Claude Code): `go test -count=1 ./internal/avatar/ ./cmd/api/` pass; `go vet`; `gofmt -l` empty. With the old message restored for a moment, the 7 changed cases failed (restored, identical SHA-256). `node --test scripts/contracts/upload-avatar.test.mjs` 48/48. `npm run handoff` below.

Not fixed, owner decisions needed (contract changes outside the decision pack): R-094 (what counts as an image), R-096 (undo a half-finished upload), R-097 (what `details` may say).

Changed files: `backend/internal/avatar/{handler.go,contract_test.go}`, `contracts/upload-avatar/{cases.json,README.md}`, `scripts/contracts/upload-avatar.test.mjs`, `learn-go/31-bounded-file-streams/README.md`, `docs/{database/avatar-storage.md,bug-register.md,coordination.md}`.

Next: R-017's supported filters, R-038.

Writer released: yes. No processes left running.

## Handoff: BUG-032, R-102 a saved search is counted (Claude Code, 2026-10-28)

Status: **complete; unreviewed; not deployed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `ba0dd5e`. Resulting commit: `766ae5c` (batch synchronized by Git Agent on `main` and `go-backend`).

- **Live check (read-only):** `increment_platform_stat(key text) returns void`, security definer, empty `search_path`, granted to `authenticated` (SEC-001); it adds one to `platform_stats.stat_value` where `stat_key = key`.
- **Go** `internal/searchhistory/handler.go`: after a successful insert, `c.db.RPC(..., "increment_platform_stat", {"key":"total_searches"})` as the user; its answer ignored (not critical, as the module meant). Package comment updated.
- **Contract `search-history` version 2:** the four successful saves carry `go_database` (insert, then the call) and a stand-in 204; `preserve`. Node test: version 2; "Go never asks more than the module" now allows exactly that call after a save, and every Go save must make it. Go pins version 2.
- **Lesson 34:** the fix, and the blank identifier. Exercise untouched. **Docs:** contract README, register.

Checks (Claude Code): `go test -count=1 ./internal/searchhistory/ ./cmd/api/` pass; `go vet`; `gofmt -l` empty. Without the call, the four save cases failed (restored, identical SHA-256). `node --test scripts/contracts/search-history.test.mjs` 101/101. `npm run lint` exit 0. The first `npm run handoff` failed on `TestBrowserBudgetStartsBeforeIdentityAndReachesDatabase` (`internal/supabaserest`), which counted one database call for a save; it now expects two for history (the counter, within the same budget). Second `npm run handoff` below.

Changed files: `backend/internal/searchhistory/{handler.go,contract_test.go}`, `backend/internal/supabaserest/browser_budget_test.go`, `contracts/search-history/{cases.json,README.md}`, `scripts/contracts/search-history.test.mjs`, `learn-go/34-a-browser-call-moves-to-the-server/README.md`, `docs/{bug-register.md,coordination.md}`.

Next: the avatar group R-041, R-094, R-096, R-097; then R-017's filters, R-038.

Writer released: yes. No processes left running.

## Handoff: BUG-031, R-042 a verified session remembered for a minute (Claude Code, 2026-10-28)

Status: **complete for sessions; unreviewed; not deployed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `ba0dd5e`. Resulting commit: `766ae5c` (batch synchronized by Git Agent on `main` and `go-backend`).

- **Go** new `internal/githubaccess/memory.go`: `Memory` keeps Supabase Auth's successful answer about a session for `MemoryFor` (60 s), keyed by `sha256(kind, credential)` (the session itself is never kept), bounded at 10,000 entries (expired first, then any), mutex-guarded, nil-safe. `askSupabase` recalls and keeps; `Verifier.Memory` is optional, so the zero `Verifier` (every fixture) asks every time. `cmd/api/main.go` sets `Memory: githubaccess.NewMemory()`, so `Resolve`, `User` and `UserEmail` all share it.
- **Not remembered: GitHub tokens.** First tried; `TestPrivateRepositoryIsolation` (from `contracts/github-access/isolation.json`) then failed on `bob-token-revoked`: a revoked token was accepted. That fixture deliberately pins immediate refusal, so `askGitHub` asks every time. Remembering tokens too is an owner decision (contract change).
- **Tests:** new `memory_test.go`: one Supabase call per session per minute and a second after `MemoryFor` (which it pins at 60 s), refused sessions asked every time and never kept, GitHub asked every time, the bound, and no `Memory` asking every time. `cmd/api`: `TestSearchHistoryAsTheCaller` expects one Supabase call; `TestChatAllowanceIsPerUserAndSeparate` expects nothing upstream past the allowance.
- **Lesson 16:** new section (array map keys, nil-pointer methods, the mutex, why GitHub is not remembered). Exercise untouched. **Docs:** backend map, register.

Checks (Claude Code): `go test -count=1 ./internal/githubaccess/ ./cmd/api/` pass; `go vet`; `gofmt -l` empty. With recall disabled, `TestMemoryRemembersASessionForAMinute` failed (Supabase asked 3 times; restored, identical SHA-256). `npm run handoff` below. No contract or application source changed.

Changed files: new `backend/internal/githubaccess/{memory.go,memory_test.go}`, `backend/internal/githubaccess/access.go`, `backend/cmd/api/{main.go,history_wiring_test.go,ai_wiring_test.go}`, `learn-go/16-verifying-access/README.md`, `docs/{backend-map.md,bug-register.md,coordination.md}`.

Next: R-102 (search counter), the avatar group, R-017's filters, R-038.

Writer released: yes. No processes left running.

## Handoff: BUG-030, R-026 trending developers' most-starred repository (Claude Code, 2026-10-28)

Status: **complete; unreviewed; not deployed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `ba0dd5e`. Resulting commit: `766ae5c` (batch synchronized by Git Agent on `main` and `go-backend`).

- **Go** `internal/githubdevelopers/handler.go`: the repository request is `/users/<login>/repos?per_page=100` (GitHub's user repositories endpoint ignores `sort=stars`, so the old request gave the alphabetically first). The first item stays the popular one unless a later object has strictly more `stargazers_count` (`stars`: a `json.Number`, else 0). Every existing case keeps its answer; the odd replies (null first, text, object) behave as before.
- **Contract `github-trending-developers` version 2** (60 cases), built by a script (formatting round-trips): 54 repository request addresses rewritten (`wire_url` checked against `new URL(url).href`); `first-repository-only` now `preserve`; new `most-starred-repository` (Go `zeta`, Next.js `alpha`), `equal-stars-keep-first`, `stars-not-a-number`, each with `next_expect` recorded from the Next.js handler. Node test: version 2, converts Go's requests back for the Next.js handler, integrity check that Go never sends `sort=stars`. Go: the contract test now pins version 2 (it had no pin); `TestRecordedDifferencesFromNextJS` expects the new address.
- **Lesson 18:** new section before the exercise on the running-best loop (`reduce` comparison, `list[1:]`, comma-ok type assertion, `json.Number`). Exercise untouched.

Checks (Claude Code): `go test -count=1 ./internal/githubdevelopers/ ./cmd/api/` pass; `go vet`; `gofmt -l` empty. With the star comparison disabled for a moment, `most-starred-repository` failed in both the memory and socket runs (restored, identical SHA-256). `node --test scripts/contracts/github-trending-developers.test.mjs` 62/62. `npm run lint` and `npm run handoff` below.

Changed files: `backend/internal/githubdevelopers/{handler.go,contract_test.go,review_test.go}`, `contracts/github-trending-developers/{cases.json,README.md}`, `scripts/contracts/github-trending-developers.test.mjs`, `learn-go/18-bounded-parallel-work/README.md`, `docs/{bug-register.md,coordination.md}`.

Next: R-042 (remember a verified token about 60 s, by hash), R-102, the avatar group, R-017's filters, R-038.

Writer released: yes. No processes left running.

## Handoff: BUG-029, R-034 signed-out repository summaries cached ten minutes (Claude Code, 2026-10-28)

Status: **complete; unreviewed; not deployed** (with `sefgh-api`'s next deployment). Writer Claude Code; reviewer unassigned. Branch `main`, base `ba0dd5e`. Resulting commit: `766ae5c` (batch synchronized by Git Agent on `main` and `go-backend`).

- **Go** `internal/githubrepos/cache.go`: `const FreshFor = 10 * time.Minute` replaces the hour (owner's option A). Found while reading it: `fill` kept a stale copy on every non-200 refresh, so after a repository went private (GitHub 404 to the public read) its copy outlived every refresh and was served indefinitely. A 404 now deletes the copy; other failures (network, rate limit, 5xx) still keep it. The cache is used only for signed-out reads (`h.token == ""`), so no private data is involved.
- **Test** `TestCacheDropsARepositoryThatIsGone`: reused just before ten minutes, one stale read after, then the 404 refresh drops it and the next read asks GitHub; it also pins `FreshFor` at ten minutes. `TestCacheFreshStaleAndRecovery` now advances by `FreshFor`.
- **Lesson 10** (CRLF kept): ten minutes, the 404 rule, and a note that the exercise keeps its original hour. Exercise untouched.
- **Docs:** backend README, backend map, register R-034 fixed.

Checks (Claude Code): `go test -count=1 ./internal/githubrepos/` pass; `go vet`; `gofmt -l` empty. Without the 404 rule the new test fails ("after a 404 the copy was still served"); with `FreshFor` an hour it fails on the pin (both restored, identical SHA-256). `npm run handoff` below. No contract changed (the cache is not in a contract fixture); no application source, so no lint or build needed.

Changed files: `backend/internal/githubrepos/{cache.go,cache_test.go}`, `learn-go/10-shared-cache/README.md`, `backend/README.md`, `docs/{backend-map.md,bug-register.md,coordination.md}`.

Next: R-026 (trending developers' most-starred repository), R-042, R-102, the avatar group, R-017's filters, R-038.

Writer released: yes. No processes left running.

## Handoff: BUG-028b, video uploaders from the public profile, no admin call (Claude Code, 2026-10-28)

Status: **complete; unreviewed; not deployed** (with `sefgh-api`'s next deployment). Writer Claude Code; reviewer unassigned. Branch `main`, base `ba0dd5e` (BUG-028a committed as `381518e`; the Git Agent's sync commit carried this task's claim line). Resulting commit: `766ae5c` (batch synchronized by Git Agent on `main` and `go-backend`).

R-040 and R-075, option A, for videos; with BUG-028a both entries are fixed.

- **Go** `internal/videos`: the profile read asks for `full_name,avatar_url`; `uploader_name` is `full_name`; no admin lookup; `uploader_email` null for listed videos (a new video keeps the poster's own email). Package comment updated. `supabaserest.AdminUser`, `AdminUserEmail` and `uuidPattern` removed (no caller left; `regexp` import gone).
- **Contract `repo-videos` version 3** (57 cases), built by a script from version 2 (formatting round-trips): profile paths renamed, admin calls dropped, `uploader_email: null` on listed videos; stand-in profiles in `post-profile-present`, `get-profile-with-username` (`Octo Cat`) and `get-profile-without-username` (no name) hold `full_name`; `get-admin-null` and `get-uploader-not-uuid` answer 200. 24 cases changed; those without an R-088 `next_expect` got one (version 2's answer, or the real handler's through the shared runner for the three profile cases). Node test: version 3 and the same integrity check as comments.
- **Unit tests** that relied on the admin lookup: `TestDetailsBudgetBoundsHangingReads` now expects `uploader_email: null` twenty times; `TestFirstFailureStopsTheRest` fails the list with a `null` row (the only way left); `cmd/api` `TestVideosListAsTheCaller` expects the `full_name` read and no admin request.
- **Lesson 29:** new short section, "Go will not compile what you no longer use", from this change (`declared and not used: db`, the unused `regexp` import). Exercise untouched.
- **Docs:** contract README (version 3), backend README, backend map, register R-040 and R-075 fixed.

Checks (Claude Code, Windows, Go 1.27.2, Node 24.22.0):

- `go test -count=1 ./internal/videos/ ./cmd/api/` pass; `go vet ./...`; `go build ./...`; `gofmt -l .` empty. With `username` restored in the Go read for a moment, 24 contract cases failed (restored, identical SHA-256).
- `node --test scripts/contracts/repo-videos.test.mjs` 58/58. Changed files scanned for stray control characters (one found and fixed in lesson 29 before this record).
- `npm run lint` and `npm run handoff` below. No application source changed, so no build.

Changed files: `backend/internal/videos/{handler.go,handler_test.go,contract_test.go}`, `backend/internal/supabaserest/supabaserest.go`, `backend/cmd/api/videos_wiring_test.go`, `contracts/repo-videos/{cases.json,README.md}`, `scripts/contracts/repo-videos.test.mjs`, `learn-go/29-a-javascript-pattern-in-go/README.md`, `backend/README.md`, `docs/{backend-map.md,bug-register.md,coordination.md}`.

Next (owner: continue until every bug is fixed): R-034 (public repository cache 10 minutes), R-026 (trending developers' most-starred repository), R-042 (remember a verified token about 60 s by hash), R-102 (search counter), the avatar group R-041/R-094/R-096/R-097, R-017's supported filters, R-038 (AI allowance keyed on the address Vercel sets).

Writer released: yes. No processes left running.

## Handoff: BUG-028a, comment authors from the public profile, no admin call (Claude Code, 2026-10-28)

Status: **complete; unreviewed; not deployed** (Go with `sefgh-api`'s next deployment, browser with `sefgh-main`'s). Writer Claude Code; reviewer unassigned. Branch `main`, base `40936fc`. Resulting commit: `381518e` (synchronized by Git Agent on `main` and `go-backend`).

R-040 and R-075, option A (the owner, 2026-10-28), for comments; videos are BUG-028b.

- **Go** `internal/comments`: the profile read asks for `full_name,avatar_url`; `user_name` is `full_name`; no `AdminUserEmail` call; `user_email` is `null` for listed comments (a new comment keeps the poster's own email). An author id that is not a UUID no longer fails the list. Package comment updated.
- **Contract `repo-comments` version 3** (52 cases): built by a script from version 2 (formatting round-trips): profile paths renamed, admin calls dropped, `user_email: null` on listed comments; the stand-in profile in `get-profile-present` and `post-profile-present` now holds `full_name` (`Octo Cat`); `get-user-id-not-uuid` answers 200. The 14 changed cases keep the Next.js handler's answer in `next_expect` (recorded through the shared runner for the two profile cases). Node test: version 3, `next_expect` under the R-086 conversion, and an integrity check: no admin request and only `full_name,avatar_url` profile reads in `expect`, `user_email` null on listed comments.
- **Browser:** `src/lib/utils/repo/commentHelpers.js` drops both `auth.admin.getUserById` calls (`user_email: null`); `RepoCommentsSection.jsx` shows `user_name` before the email's local part (it showed the email first, so a fresh comment showed the poster's email name). `scripts/contracts/profile-columns.test.mjs`: two new tests, no `auth.admin.` in `src/` except the two Next.js route handlers, and the name-first display.
- **Lesson 28:** corrected where Go no longer matches the old behaviour (no admin lookup; only a null comment fails the list; two requests per comment). Exercise untouched.

Checks (Claude Code, Windows, Go 1.27.2, Node 24.22.0):

- `go test -count=1 ./internal/comments/` pass; `go vet`; `gofmt -l .` empty. With `username` restored in the Go read for a moment, 14 contract cases failed (restored, identical SHA-256).
- `node --test scripts/contracts/repo-comments.test.mjs` 53/53; `profile-columns.test.mjs` 4/4, and 1 failure with the committed `commentHelpers.js` swapped in (restored, identical SHA-256).
- `npm run lint` exit 0; `npm run build` exit 0. The first `npm run handoff` failed on `TestCommentsListAsTheCaller` (`cmd/api`), which still expected the admin request; it now expects none, and its comment says why. Second `npm run handoff` below.
- Not run: a signed-in comment on the site; lesson checks (owner policy).

Changed files: `backend/internal/comments/{handler.go,contract_test.go}`, `backend/cmd/api/comments_wiring_test.go`, `contracts/repo-comments/{cases.json,README.md}`, `scripts/contracts/{repo-comments.test.mjs,profile-columns.test.mjs}`, `src/lib/utils/repo/commentHelpers.js`, `src/components/repo-details/RepoCommentsSection.jsx`, `learn-go/28-many-at-once-one-failure-for-all/README.md`, `backend/README.md`, `docs/{bug-register.md,coordination.md}`.

Next: **BUG-028b**, the same for `internal/videos` and contract `repo-videos` (24 cases read profiles, 5 make the admin call, `get-admin-null` and `get-uploader-not-uuid` fail today on the admin call). Then the remaining decided "Go, after cutover" entries listed in BUG-027's handoff.

Writer released: yes. No processes left running.

## Handoff: BUG-027, R-088 video addresses checked in Go (Claude Code, 2026-10-28)

Status: **complete; unreviewed; Go change not yet deployed to `sefgh-api`.** Writer Claude Code; reviewer unassigned. Branch `main`, base `28c8a64` (BUG-026 committed as `970b603`; the Git Agent's sync commit also carried this task's claim line). Resulting commit: `719c09a` (synchronized by Git Agent on `main` and `go-backend`).

The owner's option A for R-088: accept only `https` addresses whose host is exactly YouTube's or GitHub's.

- **Go:** `backend/internal/videos/handler.go`. `kind` takes text only, parses it with `net/url`, refuses any scheme but `https`, a user name or a port, and looks the host up exactly (case included) in `videoHosts`: `youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be` → youtube; `github.com`, `www.github.com` → github. The host alone gives the type; the YouTube thumbnail is still read with the recorded pattern. Refused: 400 `{"error":"Video URL must be an https link to YouTube or GitHub"}`, after sign-in and the required-field check, before any database request (was 500 for a list or number). Exact case because the page's player (`RepoVideoTab.jsx`, `getEmbedUrl`) only matches lower-case `youtube.com`.
- **Contract `repo-videos` version 2:** 57 cases. Six version 1 cases now 400; ten new (`post-falsy-title-github`, `post-m-youtube`, `post-www-github`, `post-host-decides-type`, `post-http`, `post-lookalike-host`, `post-host-in-query`, `post-user-name`, `post-port`, `post-host-case`). Where the Next.js handler answers differently a case carries `next_expect`: version 1's recorded answer, or for a new case the real handler's answer through the shared runner (13 cases). Built by a script from version 1; the file's formatting round-trips unchanged, and the diff is additive apart from the version line and the six changed cases.
- **Tests:** Go pins version 2; `TestKind` rewritten for the rule, with cases beyond the contract (port 443, no scheme, mixed-case host, the vertical tab as a JSON escape); `TestLogsKeepTheVisitorOut` now posts a GitHub address so it still reaches the insert failure. Node: uses `next_expect ?? expect`, and its integrity check requires every stored address in `expect` to be `https` on a listed host with that host's type.
- **UI:** none needed: `RepoVideoTab.jsx` shows the reply's `error` in a toast, and its placeholder already says YouTube or GitHub.
- **Lesson 29:** the old `includes` section shortened to its history; new section on reading the address (type assertion with ok, comma-ok map lookup, `url.Parse` against JavaScript's `URL`: host case, control characters; checked in Node). Exercise untouched.

Checks (Claude Code, Windows, Go 1.27.2, Node 24.22.0):

- `go test -count=1 ./internal/videos/` pass; `go vet`; `gofmt -l .` empty. With any host accepted for a moment, `post-direct`, `post-falsy-title`, `post-lookalike-host`, `post-host-in-query` and `post-host-case` failed (restored, identical SHA-256).
- `node --test scripts/contracts/repo-videos.test.mjs` 58/58.
- `npm run lint` and `npm run handoff` below. No application source changed, so no build.
- Not run: against the deployed Go service; adding a video on the site signed in; lesson checks (owner policy).

Changed files: `backend/internal/videos/{handler.go,handler_test.go,contract_test.go}`, `contracts/repo-videos/{cases.json,README.md}`, `scripts/contracts/repo-videos.test.mjs`, `learn-go/29-a-javascript-pattern-in-go/README.md`, `backend/README.md`, `docs/{bug-register.md,coordination.md}`.

Next decided "Go, after cutover" entries: R-040 with R-075 (comment and video authors from public profile columns, no admin call; contract change), R-034 (public repository cache 10 minutes), R-026 (trending developers' top repository), R-042 (remember a verified token about 60 s by hash), R-102 (search counter), the avatar group R-041/R-094/R-096/R-097, R-017's supported filters, R-038 after the AI keys.

Writer released: yes. No processes left running.

## Handoff: BUG-026, R-086 comments page capped at 50 in Go (Claude Code, 2026-10-28)

Status: **complete; unreviewed; Go change not yet deployed to `sefgh-api`** (it ships with the Go project's next deployment). Writer Claude Code; reviewer unassigned. Branch `main`, base `a0c2a29`. Resulting commit: `970b603` (synchronized by Git Agent on `main` and `go-backend`).

The owner switched everything to Go at once and said to continue the migration. Fifteen open register entries wait for "Go, after cutover"; three are RepoSync's (not deployed). This task takes R-086 alone:

- **Go:** `backend/internal/comments/handler.go`: `const MaxLimit = 50`; after `parseInt`, a limit above it becomes 50. NaN and numbers below one pass as recorded (the database refuses them before the per-comment requests).
- **Contract `repo-comments` version 2:** 52 cases; new `get-limit-capped` (51 → 50) and `get-limit-capped-with-offset` (1000 → 50, offset 20 kept). Go pins version 2. The Node test converts those two cases back for the Next.js handler, which keeps the old limit until retired (fix-once rule), and its integrity check refuses any expected page above 50.
- **Lesson 28:** new section on the cap: `const`, exported names, and why `NaN` passes every comparison (`math.IsNaN`); one "You now know" line. Exercise untouched.
- **Docs:** contract README (version 2), backend README (52 cases), register R-086 fixed in Go.

Checks (Claude Code, Windows, Go 1.27.2, Node 24.22.0):

- `go test -count=1 ./internal/comments/` pass, `go vet`, `gofmt -l .` empty; with the cap disabled for a moment, `get-limit-capped` and `get-limit-capped-with-offset` failed (restored, identical SHA-256).
- `node --test scripts/contracts/repo-comments.test.mjs` 53/53.
- `npm run lint` and `npm run handoff` below. No application source changed, so no build.
- Not run: against the deployed Go service (needs a `sefgh-api` deployment); lesson checks (owner policy).

Changed files: `backend/internal/comments/{handler.go,contract_test.go}`, `contracts/repo-comments/{cases.json,README.md}`, `scripts/contracts/repo-comments.test.mjs`, `learn-go/28-many-at-once-one-failure-for-all/README.md`, `backend/README.md`, `docs/{bug-register.md,cutover.md,coordination.md}`.

Next: **BUG-027, R-088** (videos: `https` only, host exactly YouTube's or GitHub's). Larger than it looks: most of the 27 `POST` cases among the 47 of `repo-videos` rely on accepting any text (`post-direct`, lists, numbers, the emoji and separator cases), so each needs a version 2 expectation (a 400 with a new message), a Node-side conversion keeping the Next.js handler's recorded answers, the host list decided in code (`youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`, `github.com`, `www.github.com`), and the add-video dialog checked for how it shows a 400. Then the other decided "Go, after cutover" entries: R-034, R-026, R-040 (with R-075), R-042, R-038 (after the AI keys), the avatar group R-041/R-094/R-096/R-097, R-102, R-017's supported filters.

Not Claude Code's: `scripts/agent-handoff.mjs` was changed in this checkout at 14:17:14 UTC by another process (one line: `go test -count=1 -p 2 ./...`), which then ran its own verification (pid 37092, lease 14:17:32 UTC, ended without a commit). Claude Code left the file as found and waited for that lease to clear before its own `npm run handoff`.

Writer released: yes. No processes left running.

## Handoff: OWNER-ANSWERS-005, R-078 and R-103 in production, step 3 live (Claude Code, 2026-10-28)

Status: **complete; R-078 and R-103 fixed in production; unreviewed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `6817b78` (OWNER-ANSWERS-004 committed as `9dab639`). Resulting commit: `223fc85` (synchronized by Git Agent on `main` and `go-backend`).

- **Approval:** "yes, run the R-078 and R-103 database changes on dev and production", then "try again".
- **The connector declines destructive SQL in this session.** `execute_sql` of the dev test (three times) and `apply_migration` of R-103 on User-DB (once) all returned `declined`; nothing ran. Not retried further.
- **Dev test by the owner:** new `supabase/tests/r078_r103_dev_test.sql`, run in sefgh-migration-dev's SQL Editor: 32/32 `ok` (copy fingerprint `916af533…` with 12 policies before, and again after both rollbacks). The owner ran it "with RLS" (the editor's option for tables the script creates; everything was rolled back). Dev left clean (Claude Code: no tables in `public`, no `r078_backup`).
- **Production preflight (Claude Code, 13:48 UTC):** unchanged since the morning read: fingerprint `916af533…`, notifications 0, shares 0, bookmarks 1, `user-data` 1, stats rows 22, users 33, reply function not definer, no backup schema; last history entry `20261024093212`.
- **Applied by the owner** in User-DB's SQL Editor: both migration files as committed. No `supabase_migrations` history entry results; the files are the record.
- **Verified (Claude Code, read-only):** `r078_verify.sql` 8/8 and `r103_verify.sql` 5/5 `ok`; backup rows bookmarks 1, `user-data` 1, shares 0; stats rows 33 of 33 users, all at the defaults.
- **Step 3:** the first check at 13:38 UTC found it not live; the owner's screenshot showed the saved value ending at `trending-topics`. After the owner added the names and redeployed, at 13:47 UTC the website answered `/api/activity` and `/api/repo/starred` 401 with `X-Sefgh-Backend: go`. Signed-in check pending (owner).

Checks: the read-only queries above; `git diff --check`; `npm run handoff` below. No application or Go source changed in this task.

Changed files: new `supabase/tests/r078_r103_dev_test.sql`; `docs/{bug-register.md,cutover.md,adr/0002-go-backend.md,database/user-db.md,coordination.md}`.

Next: the owner checks step 3 signed in (profile activity grid, starred page) and switches step 4. Agents: verify step 4; the signed-in walk-through (BUG-002); R-017's supported filters through Go. `r078_backup` can be dropped once the owner no longer needs the two backed-up rows (`r078_rollback.sql` section 4).

Writer released: yes. No processes left running.

## Handoff: OWNER-ANSWERS-004, step 2 live, R-078 and R-103 revised (Claude Code, 2026-10-28)

Status: **complete; unreviewed; no database change applied.** Writer Claude Code; reviewer unassigned. Branch `main`, base `2ad5384` (OWNER-ANSWERS-003 committed as `35faf45`), clean before claim. Resulting commit: `9dab639` (synchronized by Git Agent on `main` and `go-backend`).

The owner's answers: "step 2 done"; R-103 "why can they create own blank stats, be a realistic app"; R-078 "keep notifications"; playground keys "for later".

- **Step 2 verified:** through `sefgh-main` at 13:03 UTC, `/api/share/<missing>` 404 `{"error":"Not found"}` and `/api/trending/topics` 200, both with `X-Sefgh-Backend: go`. `compare-deployments.mjs` 14/14 (it has no step 2 probes, hence the header check). Recorded in `cutover.md`.
- **R-103 revised:** the migration creates the rows the 11 older users lack and drops the insert and update rules (production read: function and table owner `postgres`, sign-up trigger `AFTER INSERT ON auth.users`, security definer). `src/hooks/useUserStats.js` no longer inserts (shows `DEFAULT_STATS` on PGRST116) and drops the uncalled `updateStats`/`incrementStat`; its one consumer, `UserProfileCard.jsx`, uses only `stats` and `loading`. `backend/internal/dataproxy/policy.json`: `user_stats` GET/HEAD only; new `TestWritesAreChecked` case (a POST of only `user_id` → 403); `data-proxy.test.mjs` write list and assertion updated. Lesson 36 quoted the old refusal; its example and sentence updated (exercise untouched). Backend README, `plans/browser-data.md`.
- **R-078 revised:** notifications kept. `create_reply_notification()` becomes security definer with an empty `search_path` and schema-qualified names, execute revoked from API roles; the open insert rule is dropped; shares, bookmarks and `user-data` backed up and dropped with `get_repository_stats(text)`. Verify and rollback rewritten.
- **Dev test blocked:** the rolled-back test transaction on dev (scaffold matching production's fingerprint `916af533…`, the bugs shown, both migrations, both verify queries, behaviour as signed-in and signed-out users including a reply notifying with no insert rule, both rollbacks back to `916af533…`) was refused by Claude Code's auto-mode permission check ("Modify Shared Resources"). Not routed around; production not attempted. The same script runs once the owner explicitly approves the database changes.

Checks (Claude Code, Windows, Go 1.27.2, Node 24.22.0):

- `go test -count=1 ./internal/dataproxy/ ./cmd/api/` pass; `gofmt -l .` empty. With the old `user_stats` rule restored for a moment, `TestWritesAreChecked` failed on the new case (restored, identical SHA-256).
- `node --test scripts/contracts/data-proxy.test.mjs` 7/7; with an insert put back in the hook it fails "a database write was added or removed" (restored).
- `npm run lint` exit 0 (existing Baseline notice); `npm run build` exit 0. Full contracts and Go backend in `npm run handoff` below.
- Not run: the migrations anywhere; the profile card signed in; lesson checks (only lesson 36's text changed; owner policy).

Changed files: `supabase/migrations/20261028120000_r078_drop_unused_tables.sql`, `supabase/migrations/20261028120100_r103_user_stats_server_only.sql`, `supabase/checks/{r078_verify,r078_rollback,r103_verify,r103_rollback}.sql`, `src/hooks/useUserStats.js`, `backend/internal/dataproxy/{policy.json,handler_test.go}`, `backend/README.md`, `scripts/contracts/data-proxy.test.mjs`, `learn-go/36-a-policy-proxy/README.md`, `docs/{bug-register.md,cutover.md,adr/0002-go-backend.md,database/user-db.md,plans/browser-data.md,coordination.md}`.

Next: the owner says explicitly to run the database changes; then the dev test, `apply_migration` of both files on User-DB, both verify queries, record. Cutover step 3 (`activity`, `repo-starred`) needs signed-in checks with the test account.

Writer released: yes. No processes left running.

## Handoff: OWNER-ANSWERS-003, step 1 live, R-017, R-078 and R-103 prepared, keys (Claude Code, 2026-10-28)

Status: **complete; unreviewed; no database change applied.** Writer Claude Code; reviewer unassigned. Branch `main`, base `872c16f`, clean before claim. Resulting commit: `35faf45` (synchronized by Git Agent on `main` and `go-backend`).

The owner's answers of 2026-10-28 (second message), and what was done:

- **"step 1 done" → verified, R-202 fixed.** At 12:37 UTC `compare-deployments.mjs https://sefgh-main.vercel.app https://sefgh-api.vercel.app --switched=<the eight step 1 reads>` passed 14/14, trending 200 from Go. The repository page renders (`/repo/vercel/next.js` 200 with its title; a missing repository 404); whether Go made its read (`github-public-repo`) shows only in the Go project's logs, which agents cannot open. Recorded in `cutover.md`, the register and the ADR.
- **Step 2 looks ready:** the Go service's `/api/activity` now answers a signed-out caller 401 like the website (500 on 2026-10-24, when its Supabase settings were missing), and a missing share answers 404 `{"error":"Not found"}` on both. `/api/trending/topics` answers 200 from Go.
- **R-017 "visible":** deferred by the owner like the rest of section 4. Sending the supported filters through Go is still decided and is now possible (`github-search` is on Go).
- **Supabase connector re-authorized:** catalog reads of User-DB (`kohwfuxqbllsmvmsfqci`) for R-078 and R-103; policy fingerprint of the five tables `916af533…` (12 policies). New fact for R-078: `trigger_reply_notification` (`AFTER INSERT` on `repository_comments`) writes `repository_notifications` as the replying user, so the table cannot be dropped alone. Prepared: `supabase/migrations/20261028120000_r078_drop_unused_tables.sql` (backup schema `r078_backup`, then trigger, `create_reply_notification()`, `get_repository_stats(text)` and the four tables) and `20261028120100_r103_user_stats_server_only.sql` (no update rule; insert only the caller's own row at the column defaults), with `supabase/checks/r078_{verify,rollback}.sql` and `r103_{verify,rollback}.sql`.
- **Dev test declined:** one `execute_sql` on dev `mraglhrenqwadegvwxts` (a single transaction rolling itself back: scaffold copy, both bugs shown, both migrations, verify, behaviour as signed-in and signed-out users, both rollbacks, fingerprint against production) came back "declined". Not routed around; dev confirmed unchanged afterwards (no tables in `public`, no `r078_backup`). The same script can run once the owner approves.
- **Keys:** the owner cannot reach Codex and asked Claude Code to do it or build it from scratch. Not possible in this session: the approved shape imports a signing key and creates two confirmed users in the Supabase dashboard; there is no browser here, the connector has no signing-key or Auth-user operations, and a secret key or access token is forbidden. Signing stop stands; the existing Next.js keys route keeps serving. KEYS-REDESIGN-001 proposed: accounting that needs no custom-signed token. Not started.

Checks (Claude Code): `git diff --check`; every new path reference resolves; `npm run handoff` below. No application or Go source changed, so no build or lint was needed.

Changed files: new `supabase/migrations/20261028120000_r078_drop_unused_tables.sql`, `supabase/migrations/20261028120100_r103_user_stats_server_only.sql`, `supabase/checks/r078_verify.sql`, `supabase/checks/r078_rollback.sql`, `supabase/checks/r103_verify.sql`, `supabase/checks/r103_rollback.sql`; `docs/{bug-register.md,cutover.md,adr/0002-go-backend.md,database/user-db.md,plans/phase6-owner-decisions.md,coordination.md}`.

Next: the owner approves the R-078 and R-103 migrations (dev test, then `apply_migration` on User-DB, verify, record), and switches step 2 (`share-token`, `trending-topics`). Agents: verify step 2; R-017's supported filters through Go; the signed-in walk-through (BUG-002); KEYS-REDESIGN-001 if the owner wants it.

Writer released: yes. No processes left running.

## Handoff: OWNER-ANSWERS-002 / BUG-024 / BUG-025, the owner's answers, R-203 and R-014 (Claude Code, 2026-10-28)

Status: **complete; unreviewed; nothing switched or deployed.** Writer Claude Code; reviewer unassigned. Branch `main`, base `b7c8d22` (REPO-PAGE-001 committed as `3989a55`), clean before claim. Resulting commit: `1b745da` (synchronized by Git Agent on `main` and `go-backend`).

The owner's answers of 2026-10-28, and what was checked:

- **R-202 "trending restored": not live.** At 08:46 and again at 08:59 UTC the website answered `/api/github/trending` itself (`X-Matched-Path`, no `X-Sefgh-Backend`), 500; `compare-deployments.mjs` 13/14. The Vercel connector still cannot open the team (403; `authorize_team_access` answers "Team not found"), so the cause is not visible: most likely the Production entries were not saved, or no production redeploy ran after the change.
- **R-188 "url config done":** recorded as the owner's fix, not confirmed by an agent. Asking Supabase to start a GitHub sign-in no longer reveals the accepted return address (its state value is opaque). The next sign-in landing on `/home` confirms it.
- **Test account:** one, in a file the owner named outside the repository (`D:\Users\Windows\Downloads\`, existence checked, not opened). Its contents are never copied into the repository or a handoff.
- **Domain:** renewed in November.
- **R-203 approved → BUG-024.** Trending contract version 4: `created:>` carries the full UTC time (`date.UTC().Format(time.RFC3339)`). The 38 expected URLs were rewritten by a script applying the handler's own date rule in each case's time zone, with every date part checked against version 3's; case `daily-just-after-midnight-utc` added (45 cases). Go test pins version 4 and the query test expects the timestamps; the Node test converts both version 3 and 4 changes back for the old Next.js handler, which keeps its query until retired. Lesson 17's text (its quoted line changed; exercise untouched), contract and backend READMEs.
- **Decision pack:** every recommendation except section 4's R-002, R-004, R-005, R-007, R-008, R-051, which stay visible, deferred by the owner, features later. R-017 asked again (same section, not named; its recommendation hides filters). Statuses of 24 register entries updated; answers added to the pack; ADR log rows.
- **R-014 → BUG-025.** New `src/lib/ai/chat-window.js` (`CHAT_WINDOW`, `messagesSent`, same trimming as `prepareChatMessages`); `guard.js` reads its two chat limits from it (values unchanged); `MessageList.jsx` shows a note when the assistant sees only the latest messages, the number formatted with `formatNumber`. New `scripts/contracts/chat-window.test.mjs`.
- **D1–D8 accepted** (ADR log, HLD section 11). **RepoSync:** wanted, rebuilt better inside that plan. **Keys:** the owner asked to resume "if possible"; that needs explicit approval of the exact one-replacement proposal (SHA-256 `f212c12e…`) and its execution in the Supabase dashboard with the reviewed operator (Codex's tooling); the signing stop stands until then.

Checks (Claude Code, Windows, Go 1.27.2, Node 24.22.0):

- Backend `go test -count=1 ./...` all pass; `go vet ./...`; `gofmt -l .` empty. With the old date-only line restored for a moment, 80 trending subtests failed, `daily-just-after-midnight-utc` among them; file restored, identical SHA-256.
- `node --test scripts/contracts/github-trending.test.mjs` 46/46; `chat-window.test.mjs` 3/3, and a count that ignores the window fails it (restored, identical hash).
- `npm run lint` exit 0 (existing Baseline notice); `npm run test:contracts` 1603/1603; `npm run build` exit 0.
- Not run: the chat note in a browser (signed in); lesson checks (only lesson 17's text changed; owner policy); the race detector (CI runs it).

Changed files: `contracts/github-trending/{cases.json,README.md}`, `backend/internal/githubtrending/{handler.go,handler_test.go}`, `backend/README.md`, `scripts/contracts/github-trending.test.mjs`, `learn-go/17-clocks-and-randomness/README.md`, new `src/lib/ai/chat-window.js`, `src/lib/ai/guard.js`, `src/components/chat/MessageList.jsx`, new `scripts/contracts/chat-window.test.mjs`, `docs/{bug-register.md,plans/phase6-owner-decisions.md,adr/0002-go-backend.md,architecture/hld.md,coordination.md}`.

Next: the owner rechecks trending's Production settings and redeploys (R-202), answers R-017, and approves the keys proposal if wanted. Agents: Supabase connector re-authorized → read current definitions and prepare the R-103 and R-078 migrations; the signed-in frontend walk-through with the test account (BUG-002); the ARCH-001 first tasks under D1–D8 (Repo-DB catalog read, Corpus DB migration, local identity check).

Writer released: yes. No processes left running.

## Handoff: REPO-PAGE-001, the repository page's GitHub read served by Go (Claude Code, 2026-10-27)

Status: **implementation complete; unreviewed; nothing switched or deployed.** Writer Claude Code; reviewer unassigned, no peer review claimed. Branch `main`, base `f3e745c` (DATA-010 committed as `2275a41`), clean before claim. Resulting commit: `3989a55` (synchronized by Git Agent on `main` and `go-backend`).

The owner asked to finish the remaining migration, this item last. A sweep of `src/app` and `src/lib` for server-side code outside the API routes found only this read still in Next.js with no Go path (the sign-in callback and the page's database reads were routed in DATA-010; `api-reference` only reads a flag). The submit-project dialog's GitHub read (`src/lib/github-api.js`) runs in the visitor's browser on the visitor's own allowance, so it stays there (recorded in the backend map).

- **Go:** new `backend/internal/publicrepo`. `Read` is the starred port's `publicRepo`, moved unchanged and exported; `internal/starred` now calls it. `Handler` serves `GET /api/github/public-repo/{owner}/{repo}`: 200 with GitHub's fields as sent, or 404 `null` wherever `fetchRepoFromGitHub` gives null, `Cache-Control: private, no-store`. `cmd/api` registers it beside the GitHub access check with the transport of signed-out reads (`publicRepoMux`): no caller credential is read or sent, no Auth call.
- **Next.js:** `fetchRepoForPage` in `src/lib/repo/repoData.js` asks that route when `github-public-repo` is in `SEFGH_GO_ROUTES` and `SEFGH_GO_API_URL` is set, otherwise reads GitHub itself as before; the page and its metadata use it. No website rewrite: only the server calls it. Rollback: remove the name and redeploy.
- **Contract:** `contracts/public-repository-reads` unchanged (version 1, 15 cases). Go: `TestPublicRepositoryReads` (moved) and new `TestRouteAnswersTheContract` run them against `Read` and through the route. Node: the 15 cases through `fetchRepoForPage` against a stand-in answering as the route does; reads GitHub itself unless both settings are set; null on Go failure, bad JSON, `private: true` or an error status; the page calls only the switched read.
- **Lesson 47** (sharing code between routes: own package, exported names, `internal`, no import cycles; exercise `isPublic`, unfinished on purpose) and index row.
- **Docs:** backend README (route row, section), contract README, cutover (switch table; step 1 adds `github-public-repo`, checked in the Go project's logs), backend map, ADR (Phase 3 row; the stale Phase 3 and Phase 6 state corrected: nine proxy areas exist; register 204 entries, 109 fixed, 91 open; lint has no warnings; signed-out walk-through done).

Checks (Claude Code, Windows, Go 1.27.2, Node 24.22.0):

- Backend `go test -count=1 ./...` all packages pass; `go vet ./...` pass; `gofmt -l .` empty. New wiring test `TestPublicRepoIsPublicOnly` passes.
- `npm run lint` (`--max-warnings 0`) exit 0, existing Baseline-data notice only. `npm run test:contracts` 1599/1599 (18 new). `npm run build` exit 0.
- Deliberate breaks, each restored with identical SHA-256: the page reading GitHub directly failed the page test; dropping the private check in JavaScript failed three tests; dropping it in Go failed both Go contract tests.
- Lesson 47 only: solution test and vet pass, gofmt empty, exercise fails as intended. Other lessons not run (owner policy).
- Not run: against real GitHub or a deployed Go service; the race detector (no local C compiler; CI runs it).

### Finish line: what remains of the migration (2026-10-27)

All agent-side migration code is written, each piece behind an off-by-default switch. What is left needs the owner first; agents follow each step.

1. **Owner, settings (minutes each).** Restore `github-trending` on `sefgh-main` Production (R-202). Supabase Auth URL settings (R-188). Then the cutover runbook, step by step, preview before production (`cutover.md`): step 1 public GitHub reads (now with `github-public-repo`), step 2 shares and topics, step 3 own reads, step 4 repository interactions, step 5 conversation shares, step 6 avatar, step 7 the data areas one by one, step 8 the AI routes. Renew `sefgh.org` (R-065).
2. **Owner, decisions.** R-203 (contract version 4); the Phase 6 decision pack (`plans/phase6-owner-decisions.md`, 21 open); architecture D1 to D8 (`architecture/hld.md`), which gate the analysis/search workers (Phase 5); RepoSync's target database and deployment; the playground keys (signing stopped by the owner: resume, or keep the existing route until later).
3. **Owner, inputs.** The two test accounts, for the signed-in walk-through (BUG-002) and signed-in checks of each switch.
4. **Agents, after each owner step.** Verify each switch (`compare-deployments.mjs`, the Go project's logs for server-side reads); fix the "fixed in Go after cutover" entries once their route is on Go; R-203 once approved; Codex reviews REPOSYNC-001, BATCH-CC-002, DATA-010 and REPO-PAGE-001.
5. **Phase 7**, once Phase 6's gate is met: remove the Next.js handlers, the browser's direct Supabase paths and the switches, route by route.

Writer released: yes. No processes left running.

## Handoff: DATA-010, server-rendered data calls through the Go data proxy (Claude Code, 2026-10-27)

Status: **implementation complete; unreviewed; nothing switched or deployed.** Writer Claude Code; reviewer unassigned, no peer review claimed. Branch `main`, base `f16b409` (OPS-005 committed as `d498cf3`), clean before claim. Resulting commit: `2275a41` (synchronized by Git Agent on `main` and `go-backend`).

The owner said "migrate other things" while the owner-side steps wait. Looking for business logic Next.js still runs on the server found that the `repo-page` data switch did nothing (R-204): the only reader of its four tables outside the API routes, `src/lib/repo/sefghData.js` (with `commentHelpers.js`, which also reads `profiles`), runs in the repository page's Server Component, and DATA-PROXY-001's routing fetch was fitted to the browser client only. The sign-in callback's welcome notification bypassed the `notifications` switch the same way.

- `src/lib/supabase/data-routing.js`: `routedFetch` takes a base for `/api/data` (this site by default); new `serverRoutedFetch` sends switched areas to `SEFGH_GO_API_URL`, the rewrite's own destination, and routes nothing without it.
- `src/lib/supabase/server.js`: opt-in `createClient({ goData: true })`. Route handlers keep the unrouted client, so a switched area never sends a Next.js handler's own writes through the proxy's rules (for example `repo-page` allows only GET and HEAD, while `/api/repo/vote` writes `repo_votes`).
- Used by `src/app/repo/[owner]/[repo-name]/page.js` and `src/app/auth/callback/route.js`. The callback's insert writes only fields the `notifications` policy allows; Auth calls are never routed.
- `scripts/contracts/data-proxy.test.mjs`: three new tests. The server routing itself; the page's real `fetchSefghData` on supabase-js through it (all five tables to Go with the user's bearer when `repo-page,profile` are on, all to Supabase when off); and a list of every server-client user outside `src/app/api`, each routed or Auth-only. The write scan now includes the routed callback.
- Docs: register R-204 (fixed; 204 entries), browser-data plan update, backend map section (which also names the page's public GitHub read as the remaining server-side read with no switch), cutover step 7 (`repo-page` with `profile`; these reads are checked in the Go project's Vercel logs, as the browser cannot see them).

Checks (Claude Code, Windows, Node 24.22.0):

- `node --test scripts/contracts/data-proxy.test.mjs` 7/7. Deliberate breaks, files restored with identical SHA-256: unrouted `createClient()` in both files failed the server-client test; a routing fetch that ignores the Go origin failed both new routing tests.
- `npm run lint` (`--max-warnings 0`) exit 0; only the existing Baseline-data age notice. `npm run test:contracts` 1581/1581. `npm run build` exit 0 (`/repo/[owner]/[repo-name]` dynamic, as before).
- Not run: the repository page against a real Go server or database; no browser walk-through (signed-in check needs the test accounts). No Go change, so no Go test change or lesson; `npm run handoff` runs contracts and the Go backend after this record.

Remaining gates: independent review (Codex); switching `repo-page`, `profile` or `notifications` stays the owner's step in `cutover.md`. Next for agents: optionally give the page's public GitHub read a switch (it would use the Go `github-repo-details` route, which makes three GitHub calls where the page makes one; measure first).

Writer released: yes. No processes left running.

## Handoff: OPS-005, production trending no longer forwarded to Go (Claude Code, 2026-10-27)

Status: **complete, documentation only; the fix is the owner's.** Writer Claude Code; no reviewer. Branch `main`, base/current `942c30b` (ARCH-001 committed as `e3e7220`), clean before claim. Resulting commit: `d498cf3` (synchronized by Git Agent on `main` and `go-backend`).

The owner said "continue the migration". Every open task waits on the owner, so this began by checking the live switches from outside, and found a regression.

- **R-202 (High, new).** The website's `/api/github/trending?since=daily` answers 500 `Failed to fetch trending repositories` with `X-Matched-Path: /api/github/trending` and no `X-Sefgh-Backend`: its own Next.js handler answered (R-068's old query). `sefgh-api` answers 200 with `X-Sefgh-Backend: go`. `scripts/compare-deployments.mjs https://sefgh-main.vercel.app https://sefgh-api.vercel.app` (default `--switched=github-trending`): 13/14, only trending fails ("website did not forward it to Go"). The step-1 routes are not forwarded on Production either (`/api/github/languages` has no `X-Sefgh-Backend`), as expected while step 1 is on Preview only. `next.config.mjs` has not changed since 2026-10-21, so the production build was made without `SEFGH_GO_API_URL` or without `github-trending` in `SEFGH_GO_ROUTES`. Cause and time not confirmed: the Vercel connector answers 403 for listing deployments (as recorded in OWNER-ANSWERS-001) and the Vercel CLI is not installed.
- **R-203 (Medium, new).** Go's trending answers `since=daily` with 200 `[]` early in the UTC day. Both implementations search `created:>YYYY-MM-DD`, which GitHub reads as "after that whole day", so "daily" spans only the hours since 00:00 UTC. Checked against GitHub at about 04:30 UTC: `stars:>100 created:>2026-10-26` 0 (also 0 at floors 50 and 20), `created:>2026-10-26T04:30:00Z` 20, `created:>=2026-10-26` 24; weekly 249 against 294 with a timestamp. `/trending` opens on daily. The proposed fix is in Go only (contract version 4, owner's approval needed): send the full UTC time.
- R-068's status no longer says trending is live. `cutover.md` now says to keep Production's own values while a preview is tested, and to run `compare-deployments.mjs` after any change.

Changed files: `docs/bug-register.md` (R-068 status; new section with R-202 and R-203; 203 entries), `docs/cutover.md` (one paragraph), this file.

Checks (Claude Code): fewer than 50 GitHub-backed requests in total: `compare-deployments.mjs` once and a few single requests, within the two projects' token allowance, plus 7 signed-out GitHub searches. `git diff --check` clean; no new links. `npm run handoff` after this record. No code changed, so no build, Go test or lesson change.

Next, for the owner: (1) on `sefgh-main`, give **Production** `SEFGH_GO_API_URL=https://sefgh-api.vercel.app` and `SEFGH_GO_ROUTES` with `github-trending` (keep Preview's step-1 list as its own entry), then redeploy production; (2) approve R-203's contract version 4, or choose otherwise. Then agents: rerun `compare-deployments.mjs` against Production (expect 14/14), and on approval fix R-203 in Go with the fixtures (new task). Everything else waiting on the owner is as listed under "Current state".

Writer released: yes. No processes left running.

## Handoff: ARCH-001, backend architecture HLD and LLD (Claude Code, 2026-10-24)

Status: **complete, documentation only; a proposal, not a decision; unreviewed.** Writer Claude Code. Branch `main`, base/current `2c25b78` (REPOSYNC-001 committed as `6df8f06`). Resulting commit: `e3e7220` (synchronized by Git Agent on `main` and `go-backend`).

History: the owner asked to stop mid-task ("save a checkpoint and stop here"); work resumed on the same tree, and that checkpoint is replaced by this record.

The owner asked for an opinion on RepoSync and the RepoAnalysers, and a better architecture for everything behind the UI, as an HLD and an LLD.

Done:

- **New `docs/architecture/hld.md`.** Current state and verdict (good experiments, not a system: disconnected tables, incompatible embeddings, local state, PC-run with service keys). Goals and checked constraints (Vercel Hobby cron once a day; Supabase Free 500 MB, 2 active projects, pause after a week; private repository with 2,000 Actions minutes; User-DB pgvector 0.8.0, `pg_cron`/`pg_net`/`pgmq`/`pg_trgm` available; User-DB publishes one ES256 JWKS key). Then: three planes (Go API, User-DB plus a separate Corpus DB, a Go worker driven by `pg_cron` ticks), the pipeline stages, flows, data ownership, security, reliability, capacity estimates marked as estimates, observability, **decisions D1 to D8** with recommendations, a migration path, and what to keep.
- **New `docs/architecture/lld.md`.** Package layout; middleware; local ES256 identity check (D6); database allowances (D8); caching; Corpus DB schema; job protocol with lease-token fencing and rerun; tick runtime and the `pg_cron` call; sliced discovery, README through the API instead of cloning, optional analysis, embedding recipe version 1; GitHub token pool and reply classes; hybrid `search_repos` and the search API contract; failure matrix; security; observability; testing; rollout and rollback. Each section says what was checked.
- **Register:** R-199 (High: RepoAnalyser-ai runs `npx -y repomix@latest`, unpinned, per repository, on a machine holding a service-role key), R-200 (Medium: the Google search API is unauthenticated, service-role, no quota), R-201 (Low: analyser progress in local files). 201 entries.
- **Pointers:** ADR "Open, for the owner" names the HLD and D1 to D8; the worker plan's "Next implementation sequence" points to both documents; "Current state" shows 201 register entries.

Checks (Claude Code):

- SQL blocks extracted from `lld.md` on PGlite 0.2.17 with pgvector 0.8.0 (scratch, not committed): 23/23, run before the pause and again after the final edits. The first run found the DDL relied on Supabase's search path for `halfvec`; the types are now qualified. **Not tested:** concurrent claimers (`for update skip locked`), which need a real Postgres with two connections.
- Standard-library ES256 proof of concept (scratch): User-DB's published key parses as a P-256 point; a token signed in the test verifies; a tampered one is refused. **Not checked:** a real access token's `kid`.
- Read-only sources: vendor pricing and billing pages, repository visibility, User-DB extensions and vector schema (`public`), JWKS, the sibling source folders.
- 41 relative links and anchors in the changed documents resolve; code fences balanced; `git diff --check` clean; no token-like strings added. **Not checked:** Mermaid rendering (no renderer locally; GitHub renders it on push). No code changed, so no build or Go change; `npm run handoff` runs contracts and the Go backend after this record.

Next: the owner answers D1 to D8 (D1 corpus location, D2 scheduler, D3 embedding space, D4 LLM summaries, D5 scope, D6 identity, D7 region, D8 limits). Then the first bounded tasks would be: read Repo-DB's catalog before reusing it (D1); a reviewed Corpus DB migration with the job protocol, tested natively with two connections; the local identity verifier behind `SEFGH_IDENTITY` (D6), starting by confirming a real token's `kid`. Codex can review both documents read-only.

Writer released: yes. No processes left running.

## Handoff: REPOSYNC-001, RepoSync recorded and ported to a gated Go worker (Claude Code, 2026-10-24)

Status: **implementation complete; unreviewed; not run against GitHub or any database; not deployed.** Writer Claude Code; reviewer unassigned, no peer review claimed. Branch `main`, base `9b7d7a6`, clean before claim. Resulting commit: `6df8f06` (synchronized by Git Agent on `main` and `go-backend`).

The owner asked to "continue the migration to go of other micro services". The sibling services are RepoSync (Phase 4) and the analysis/search candidates (Phase 5). The latter stay gated: the owner's 2026-10-20 decision selects no candidate and keeps worker execution off, and R-116 shows the candidates' embeddings disagree. `apiserver` is empty and `webapp` is an old copy of this site. RepoSync has a single implementation, so it was ported.

Done:

- **Recorder** `scripts/reposync/record.py`. It runs RepoSync's own `main.py`/`db_writers.py`/`shared_logger.py` (commit `056d339`, SHA-256 pinned; it refuses changed source) against a fake GitHub GraphQL endpoint and a fake PostgREST server on localhost. It uses a temporary copy of those three files only, never `.env`. Pinned venv: supabase 2.24.0, postgrest 2.24.0, httpx 0.28.1, requests 2.31.0, python-dotenv 1.0.1, Python 3.12.1. The clock is fixed, sleeps are recorded, background monitoring threads run inline, timestamps are normalised to their format, and `columns=` (a Python set) is sorted.
- **Contract** `contracts/reposync/` (13 cases, 7 defect; exact GraphQL text in `queries.json`; README). Three check runs: 0 differences.
- **Go port** `backend/internal/reposync` (worker, keys, state, Python-format helpers, generated queries) and `backend/cmd/reposync`. The command refuses without `REPOSYNC_ENABLED=1`, uses its own `REPOSYNC_*` settings, and offers `-once`, a 5-minute poll and a graceful stop (finish the topic). Standard library only. Not registered in `cmd/api` and not in any Vercel build.
- **Defects found:** R-189 (backoff never grows), R-190 (**crash when every key is exhausted**: naive minus aware time; found by recording), R-191 (`in_progress` topics stranded), R-192 (cost never requested), R-193 (1,000-result ceiling marked complete), R-194 (failed page marked complete), R-195 (partial GraphQL data dropped), R-196 (local time written as UTC), R-197 (monitoring rows lost), R-198 (shutdown not checked between pages; misleading counters). R-118 is now pinned by a case. All are reproduced by the port so the two can be compared; they are fixed in Go after an approved cutover.
- **Lesson 46** (recording first, injected clock/sleep, `atomic.Bool` stop flag, zones), exercise unfinished on purpose, index row.
- Docs: `backend/README.md` section, ADR Phase 4 row and two recorded differences, backend map, worker plan, register (198 entries).

Checks (Claude Code, Windows, Go 1.27.2, Node 24.22.0, Python 3.12.1):

- `go test -count=1 ./internal/reposync` covers 13/13 contract cases plus Python-repr (checked against Python's own output), isoformat and key-name tests. `cmd/reposync`: refusal makes zero requests, `-once` makes one read, a stop ends the poll. Three repeated runs pass.
- Five deliberate breaks were each caught: real backoff doubling, errors-with-data accepted, search sort changed, no error event before the crash, `in_progress` topics resumed. Files restored identical.
- The full backend `go test -count=1 ./...` passes, `go vet ./...` passes, `gofmt -l .` is empty. `npm run test:contracts` 1578/1578. Lesson 46 solution test/vet pass; its exercise fails as intended. Lessons otherwise not run (owner policy).
- Corrected during the work: the first recording crashed on R-190 (now recorded as `raised`); a determinism check showed 11/13 differing because of set-ordered `columns=` (now sorted); two Go cases differed because Go's Windows monotonic clock read fast pages as 0 s (floored at 1 µs, explained in code); the harness was flushing after a crash (now only after a clean run); the first float-repr rule was wrong and was replaced by Python's rules, checked against Python.
- Not run: the race detector (no local C compiler; CI runs `-race`, and the test reads were made lock-safe), and RepoSync against real GitHub or a database.

Remaining gates: the owner names RepoSync's target database and approves a deployment and its worker key (and whether it is still wanted, since its link to the analysers' `ReposMeta` is unverified). After that, a reviewed cutover, then R-189 to R-198 fixed in Go. Independent review of this batch (Codex), especially `keys.go` and `worker.go` against `main.py`.

Writer released: yes. No processes left running.

## Handoff: AUTH-URL-001, sign-in lands on localhost (Claude Code, 2026-10-24)

Status: **complete, documentation only; the fix is the owner's.** Writer Claude Code. Base `1595cd5` (OWNER-ANSWERS-001 committed as `d6b4af3`), clean before claim. Resulting commit: `d55b02a` (synchronized by Git Agent on `main` and `go-backend`).

- **`sefgh-api` Supabase settings: verified.** The owner re-added both as Config. `check-go-deployment.mjs` 7/7; `/api/activity` now answers 401 instead of 500. Step 2's `share-token` and later steps can now reach the database.
- **R-188 (High, new):** the owner's screenshot shows sign-in ending at `localhost:3000/?code=…`. The login and signup pages ask Supabase to return to `${window.location.origin}/auth/callback`; Supabase uses its Site URL when that address is not on its Redirect URLs list, and the code arrived at the root, which matches that fallback. The site's own redirect is right: `GET /auth/callback` without a code answers 307 to `https://sefgh-main.vercel.app/login?error=invalid_link`. The fix is in User-DB's Auth URL Configuration, which neither the database nor the connectors reach. Steps were given to the owner.
- **Step 1 preview:** the owner's DevTools screenshot shows `/api/github/languages` 200 in 342 ms, but not the `x-sefgh-backend` header. Still unconfirmed.

Changed files: `docs/bug-register.md` (R-188; 188 entries), this file. Checks: `git diff --check`, `npm run handoff`.

Next: the owner sets Site URL `https://sefgh-main.vercel.app` and Redirect URLs `https://sefgh-main.vercel.app/**`, `https://sefgh-main-*-sefghais-projects.vercel.app/**`, `http://localhost:3000/**`, then signs in again; then the avatar upload (R-186 signed-in check). Agents then verify sign-in from the owner's report.

Writer released: yes. No processes left running.


## Handoff: OWNER-ANSWERS-001, the owner's answers and the verified token (Claude Code, 2026-10-24)

Status: **complete, documentation only.** Writer Claude Code. Base `553ded2` (BATCH-CC-002 committed as `cfd0003`), clean before claim. Resulting commit: `d6b4af3` (synchronized by Git Agent on `main` and `go-backend`).

Owner's answers to the six requests:

1. **GitHub token: set** on `sefgh-main` and `sefgh-api`, both redeployed. Verified from outside: both deployments report 4,992–4,993 of 5,000 left, with one shared reset time. R-031 is now in effect.
2. **Domain:** the owner will renew `sefgh.org` later. "From now all deployments will be done in this repo" (R-066 A). Recorded in the ADR log, the register and the decision pack. The other 21 decision-pack entries are still unanswered.
3. **Step 1 preview: done** (owner's report). Not verified by an agent: the `go-backend` preview redirects to Vercel's sign-in (302).
4. **Supabase settings on `sefgh-api`: not done.** The owner's screenshot shows Vercel refusing a `NEXT_PUBLIC_` variable typed "Secret" ("Remove the public framework prefix… change the variable to Config"); a saved Secret cannot be changed to Config. Fix: delete it and add it again as type Config. Checked: `/api/activity` still answers 500.
5. **Avatar test: not done.** The owner opened `sefgh.vercel.app`, which answers 402 `DEPLOYMENT_DISABLED` ("temporarily paused"). That address is not the default address of any project in the team, and the connector cannot see it. The site to use is `sefgh-main.vercel.app` (200).
6. **Test accounts: A**, two accounts the owner signs up on the site, with passwords kept in a local file outside the repository.

The Vercel connector reconnected but can only list projects. Reading a project, its deployments or its variables answered 404/403, so agents still cannot switch or inspect settings.

Changed files: `docs/bug-register.md` (R-031, R-065, R-066), `docs/adr/0002-go-backend.md` (decisions log), `docs/plans/phase6-owner-decisions.md` (two answered rows), `docs/cutover.md` (step 1 note), this file. Checks: links and `git diff --check`, then `npm run handoff`.

Next: the owner fixes the two Supabase variables as Config and redeploys `sefgh-api`; checks the step 1 preview in the browser (`x-sefgh-backend: go`); uploads an avatar on `sefgh-main.vercel.app/profile`; creates the two test accounts. Agents then verify each one.

Writer released: yes. No processes left running.

## Handoff: BATCH-CC-002, cutover gates, two reviews and the Phase 6 decision pack (Claude Code, 2026-10-24)

Status: **complete; unreviewed as a batch; nothing switched, deployed or changed in any database.** Writer Claude Code; reviewer unassigned. Branch `main`, base `0abbe31`, clean before claim. Resulting commit: `cfd0003` (synchronized by Git Agent on `main` and `go-backend`).

1. **VERIFY-005, forwarding on Vercel.** 14 awkward trending queries through the website's switched route matched Go direct exactly (status, cache, results). Closes the query-string part of "Rewrite forwards requests unchanged: not checked on Vercel".
2. **MEASURE-001, response times from outside.** Equal regions (`bom1::iad1`), routes without GitHub, 220 requests, no errors. Medians equal within the network round trip (~300 ms from India); Go's tail shorter in three of four series. CPU, memory, outbound counts and GitHub-backed time not measured (Vercel connector unavailable). Both Supabase projects are in Mumbai while both functions run in Washington: measure before step 2.
3. **Incident, own doing:** the comparisons (about 70 signed-out GitHub requests over roughly an hour and a half) spent the Go service's GitHub allowance around 10:00 UTC. Website trending (forwarded to Go) answered 500 for weekly/monthly until GitHub reset it. No more GitHub-backed requests were sent. `GITHUB_PUBLIC_READ_TOKEN` is now a stated prerequisite for step 1 (R-031, `cutover.md`).
4. **REVIEW-007 (CI-001, VERIFY-002, VERIFY-003; author Codex).** Workflow sound; one observation (`cancel-in-progress`). Three deliberate forwarding breaks (stripped `Authorization`, re-serialized query, wrong destination) were all caught by the probe; files restored with identical hashes. No defect.
5. **REVIEW-028 (AVATAR-001a/b; author Codex).** Found R-187: the port named crafted uploads differently from Next.js (`part.FileName()` drops path segments, OS-dependent; slashes collapsed pairwise). Two defect cases recorded from the unchanged Next.js handler, red in Go, then fixed (`params["filename"]`, new `cleanPath`), green. New lesson 45 (exercise unfinished on purpose), lesson 31 pointer, index row. Account isolation rests on the own-folder policies verified live.
6. **Phase 6 decision pack:** [`plans/phase6-owner-decisions.md`](plans/phase6-owner-decisions.md) gives options and a recommendation for all 23 open `owner` entries, and says where each fix then goes. The old live code was searched before recommending the R-078 and R-103 database changes.

Changed files: `backend/internal/avatar/handler.go`; `contracts/upload-avatar/{cases.json,README.md}` (two cases added, existing ones unchanged; a misplaced sentence from AVATAR-POLICY-002 moved back); new `learn-go/45-copying-javascript-string-rules/` (README, exercise, test, solution), `learn-go/README.md`, `learn-go/31-bounded-file-streams/README.md`; new `docs/plans/phase6-owner-decisions.md`; `docs/verification/cutover-step1.md`, `docs/cutover.md`, `docs/bug-register.md` (R-031 evidence, R-187; 187 entries), `docs/claude-review.md` (REVIEW-028, REVIEW-007), `docs/adr/0002-go-backend.md` (four Phase 1 gate rows), this file.

Checks (Claude Code, Windows, Node 24.22.0, Go 1.27.2):

- Backend `go test -count=1 ./...` pass, `go vet ./...` pass, `gofmt -l .` empty. Avatar contract: the two new cases failed before the fix and pass after.
- Node avatar contract 48/48. Forwarding probe 152/152 before the breaks and with the rebuilt server after the fix.
- Lesson 45: `go test -tags solution`, `go vet -tags solution` pass, gofmt empty; the unfinished exercise fails as intended. Other lessons not run (owner policy).
- A first `gofmt` run flagged the new doc comment: gofmt turns `''` in doc comments into a typographic quote. Reworded in the handler and the exercise.
- Links and `git diff --check` below; full contracts and the Go backend in `npm run handoff` after this record. Not run: `npm run build` (no app source changed), hosted CI.

Next, for the owner: (1) answer the decision pack, even partly; (2) set `GITHUB_PUBLIC_READ_TOKEN` on `sefgh-api`; (3) switch step 1 on a preview; (4) add the two public Supabase settings to `sefgh-api` before step 2; (5) one signed-in avatar upload on the site. Next for agents: Codex can review this batch read-only, including REVIEW-028's fix. After the owner's answers, fix the "React, now" entries in one BUG task.

Writer released: yes. No processes left running.

## Handoff: CUTOVER-001a, cutover step 1 compared on the deployments (Claude Code, 2026-10-24)

Status: **complete; unreviewed; nothing switched or deployed.** Writer Claude Code; reviewer unassigned, no peer review claimed. Branch `main`, base `19eeb0c` (AVATAR-POLICY-002b, committed by the Git Agent), clean before claim. Resulting commit: uncommitted; Git Agent commit and synchronization pending (base `19eeb0c`).

The owner said "continue the migration". Per [`cutover.md`](cutover.md), the next migration step is the owner's preview switch of step 1. This task gathers the outside evidence for it. Results: [`verification/cutover-step1.md`](verification/cutover-step1.md).

- `scripts/check-go-deployment.mjs https://sefgh-api.vercel.app`: 7/7.
- New `scripts/compare-deployments.mjs`: website vs Go service on the step-1 routes, in parallel, no credentials. 14/14 from the committed file. It is exact for refusals and the languages list; for live GitHub answers, status, headers and JSON shape must match. It also checks the switch state (`--switched`, default `github-trending`). A run with a deliberately wrong switch list failed in both directions (exit 1).
- Explained differences: GitHub's search ranking for ties (website differs from itself from the 25th result on); each deployment's own `rate_limit` figures; Go's trailing newline on one refusal (same JSON).
- Configuration facts: neither deployment has a GitHub token (both start at GitHub's signed-out 60/hour, R-031), so contributions answers 500 "GitHub token not configured" on both; nothing calls it. The Go project lacks the two public Supabase settings (`/api/activity` 500), which step 2's `share-token` and later steps need. `trending-topics` on the Go service: 200, 6×5 repositories, a CDN hit on the second request.
- First draft mistakes, corrected before recording: Git Bash rewrote `/api/...` arguments into Windows paths (`MSYS_NO_PATHCONV=1`); a field-name guess (`repositories` for `repos`) briefly counted 0 repositories; a raw-text comparison flagged the trailing newline before the rule was settled on parsed JSON. About 70 GitHub requests in total across both deployments' signed-out allowances.

Changed files: new `scripts/compare-deployments.mjs`, new `docs/verification/cutover-step1.md`, `docs/cutover.md` (steps 1 and 2), `backend/README.md` (pointer; no Go change, so no lesson), this file. Checks: ESLint `--max-warnings 0` on the new script exit 0; links and `git diff --check` below; `npm run handoff` after this record.

Next, for the owner: step 1 on a **preview** (`SEFGH_GO_ROUTES` with the seven step-1 names, `SEFGH_GO_API_URL` already set), then `compare-deployments.mjs` with `--switched=…` against it, or a browser check if the preview is protected. Before step 2: add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `sefgh-api`. Optional: `GITHUB_PUBLIC_READ_TOKEN` (QUOTA-001). Still open from AVATAR-POLICY-002b: one signed-in avatar upload on the site.

Writer released: yes. No processes left running.

## Handoff: AVATAR-POLICY-002b, R-186 tested on dev and applied to production (Claude Code, 2026-10-24)

Status: **complete; R-186 fixed in production; unreviewed.** One signed-in upload on the site is still to be confirmed by the owner. Writer Claude Code; reviewer unassigned, no peer review claimed. Branch `main`, base `127a49c` (002 committed as `537faec`), clean before claim. Resulting commit: uncommitted; Git Agent commit and synchronization pending (base `127a49c`).

The owner approved applying the migration ("yeah you can go ahead"), asked for a test on the other project first, then said "continue the migration".

Dev `mraglhrenqwadegvwxts` (Storage version and settings as production; no signing, user or token change):

- Preflight (read): 0 buckets, objects, Storage policies and Auth users; no `storage.prefixes`.
- Set up as a copy of production: bucket `avatars` (public, 5 MiB, four types) and the eight policies with text identical to production. A temporary anon INSERT policy, limited to `avatar-002-fixture/pixel.png`, let one 1×1 PNG be uploaded (200); it was then dropped, leaving 8 policies and 0 temporary.
- Mid-task, Claude Code's auto-mode classifier denied a read-only `pg_policies` select ("Modify Shared Resources"). Claude Code stopped and asked the owner; after "continue the migration" the same read was allowed. Nothing was routed around the denial.
- Signed-out results, before → migration → rollback → migration: bucket list 0 throughout (R-041, left for Go); root/folder listing 1/1 → 0/0 → 1/1 → 0/0; public link 200 with identical bytes throughout; upload elsewhere 400 throughout; verify 4 rows not `ok` → 5/5 `ok`.
- The rollback's policy fingerprint (MD5 over name, roles, command and conditions) was `3b710771…`, identical to production's before the change. Dev ends migrated (`a000479a…`) with the fixture image kept as a production copy for later tests.

Production User-DB `kohwfuxqbllsmvmsfqci`:

- Preflight: fingerprint `3b710771…`, so unchanged since the 2026-10-23 read.
- `apply_migration` with the committed file (`537faec`, unchanged): success, history `20261024093212 avatar_002_own_folder_reads`.
- Verify 5/5 `ok`; four policies, fingerprint `a000479a…` (same as tested dev).
- Signed-out probe (public key read from `.env.local` by a scratch script, statuses and counts only): listing the bucket 200 with 0 entries (3 before); all 3 uploaded avatar links in `profiles` load (200, PNG/GIF/JPEG).

Changed files: `docs/database/avatar-storage.md` ("Applied" section, state line), `docs/bug-register.md` (R-186 fixed), `docs/adr/0002-go-backend.md` (decisions log, Phase 4), `docs/database/user-db.md` (change note), this file. Checks: link/anchor and `git diff --check` below, then full contracts and the Go backend in `npm run handoff`.

Not confirmed: a signed-in upload against the real Storage server (upsert and cleanup under the new SELECT). Owner: upload an avatar once on the site; if it fails, run `supabase/checks/avatar_002_rollback.sql` and record it. R-041 stays open for Go after cutover.

Writer released: yes. No processes left running.

## Handoff: AVATAR-POLICY-002, R-186 migration prepared; R-041 decision recorded (Claude Code, 2026-10-23)

Status: **complete as prepared; unreviewed; NOT applied to any database; nothing deployed.** Writer Claude Code; reviewer unassigned, no peer review claimed. Branch `main`, base `76859e2` (001b committed by the Git Agent as `610cfbf`), clean before claim. Resulting commit: uncommitted; Git Agent commit and synchronization pending (base `76859e2`).

The owner chose option A for both ("yeah go for your recommendation for both 41 and 186"):

- **R-041:** recorded only. Under the fix-once rule it is fixed in Go after the avatar cutover, with `contracts/upload-avatar` version 2. Nothing changes in Next.js, the fixtures or Go now. ADR decisions log, register (Needs `contract`) and the contract README record it.
- **R-186:** new `supabase/migrations/20261023120000_avatar_002_own_folder_reads.sql` (drop both public SELECT policies, add an own-folder SELECT for `authenticated`, drop the three duplicate write policies), `supabase/checks/avatar_002_verify.sql` (five read-only rows), `supabase/checks/avatar_002_rollback.sql` (the eight live policies as read today), and `scripts/contracts/avatar-storage-policy.test.mjs`. Under the 2026-10-15 rule, the migration runs only after the owner approves this file.

Live preconditions (read-only MCP, User-DB): SQL runs as `postgres`, which is not the owner of `storage.objects` and not a superuser; `supautils.policy_grants` includes `storage.objects`. The listing functions run with the caller's rights. There is no `storage.prefixes` table.

Checks (Claude Code):

- Two-user dry run on PGlite 0.2.17 with Storage's tenant migrations and the eight live policies (text identical to the live read): 26/26. R-186 reproduced before; after: verify 5/5 `ok`, signed out reads and lists nothing, A only A's folder, upload/upsert/cleanup in own folder work, every cross-folder write refused, rollback restores the live text exactly, reapply works. Two broken migration variants were caught.
- A first dry run used the `version` column, which the stand-in lacks (Storage adds it in tenant migration 0016). That failed two checks and made "A cannot upsert over B's file" pass for the wrong reason. Corrected to `metadata`; each refusal was then printed and is a row-level-security violation.
- New policy test 3/3; four deliberate breaks (public read, `if exists`, no folder limit, short rollback) each fail it, files restored with identical hashes. Doc-reading and avatar contract tests 10/10. ESLint `--max-warnings 0` on the new test: exit 0. 28 links and anchors resolve; `git diff --check` clean. Full contracts and the Go backend in `npm run handoff` after this record.
- Not run: the Storage server itself (stand-in is Postgres only), the public-link path, the two-user tests against a real project.

Changed files: the four new files above; `docs/database/avatar-storage.md` ("The fix" section), `docs/bug-register.md` (R-041, R-186), `docs/adr/0002-go-backend.md` (decisions log, Phase 4), `contracts/upload-avatar/README.md` (R-041 note; fixtures unchanged), this file.

Next: the owner approves (or not) the migration file. Then run it (SQL editor, or an agent through MCP if the owner says so), run the verify query (5 `ok`), repeat the anonymous probe (listing empty, a current avatar link still loads), upload once on the site, and record the result here. Rollback: `supabase/checks/avatar_002_rollback.sql`.

Writer released: yes. No processes left running.

## Handoff: AVATAR-POLICY-001b, avatar Storage live read (Claude Code, 2026-10-23)

Status: **complete; unreviewed; nothing changed in any database, nothing deployed.** Writer Claude Code; reviewer unassigned, no peer review claimed. Branch `main`, base `f08679b` (001a, committed by the Git Agent), clean before claim. Resulting commit: uncommitted; Git Agent commit and synchronization pending (base `f08679b`).

The owner connected the Supabase MCP server (full access, not the read-only one recommended below). Only SELECT statements were sent to User-DB `kohwfuxqbllsmvmsfqci`: the catalog file's queries one at a time, helper bodies as MD5, counts in one row. No `apply_migration` or other write tool was used. Then two anonymous Storage API calls with the app's public key, read by a scratch script from the two `NEXT_PUBLIC_` settings only (never the service-role setting), printing status codes and counts only. No key, user id or object name is recorded.

Results, in full in [database/avatar-storage.md](database/avatar-storage.md#results):

- Bucket `avatars`: public, 5 MiB, the route's four image types; the only bucket. The object policies give exactly what upsert and cleanup need, only in the user's own folder; four duplicate pairs, plus a duplicate pair on `profiles` UPDATE. Leftovers: none (3 objects, 3 folders, all current users).
- **R-041 confirmed:** `storage.buckets` has RLS and no policy, and anonymous `GET /storage/v1/bucket` returned an empty list. Every failed upload therefore says to run the missing setup file. Needs now `owner, contract`.
- **R-186 (new, Low):** both object SELECT policies are `bucket_id = 'avatars'` for every role; an anonymous list returned every folder. Today it reveals only what `profiles` already shows.
- The live site (`sefgh-ai/sefgh-nextjs` at `c7d8828`, R-066; shallow clone in the scratchpad, text search only) has an identical upload route and no other Storage call.

Changed files: `docs/database/avatar-storage.md` (results, answers, fix options), `docs/bug-register.md` (R-041, new R-186), `docs/database/user-db.md` (pointer), `docs/adr/0002-go-backend.md` (Phase 4 state), this file (register count 186). No SQL file, route, contract, Go or lesson change.

Checks (Claude Code): 26 relative links and anchors resolve; `git diff --check` clean; no key or UUID pattern in added lines; `avatar-storage-catalog`, `internal-paths`, `keys-catalog` and `profile-columns` tests 7/7 pass. Full contracts and Go backend in `npm run handoff` after this record. Not run: the two-user Storage tests (no project with test users and the bucket).

Owner decisions (options and recommendations in [avatar-storage.md](database/avatar-storage.md#fix-options-owners-choice)):

1. R-041: A, Go after cutover with contract version 2, dropping the bucket check (recommended); or B, a narrow `storage.buckets` SELECT policy now.
2. R-186: A, one migration replacing both public SELECT policies with an own-folder SELECT for `authenticated` and removing the duplicates (recommended); B, operation-limited public reads; C, leave it.

Next bounded task after the owner chooses: for R-186 A, AVATAR-POLICY-002 writes the migration, verify query and rollback under `supabase/` and dry-runs them on the PGlite stand-in, without applying them. Separately, the owner should consider swapping the full-access Supabase MCP for the read-only, project-scoped one ("Owner decisions pending").

Writer released: yes. No processes left running.

## Handoff: AVATAR-POLICY-001a, avatar Storage evidence, source side (Claude Code, 2026-10-23)

Status: **complete (source side); unreviewed; nothing applied or deployed.** The live read is AVATAR-POLICY-001b and waits for the owner. Writer Claude Code; reviewer unassigned, no peer review claimed. Branch `main`, base `4438cd8` (a `LAST_UPDATED.txt` commit over Codex's `8617bc3`), clean before claim. Resulting commit: uncommitted; Git Agent commit and synchronization pending (base `4438cd8`).

Done:

- [database/avatar-storage.md](database/avatar-storage.md): each Storage call the Next.js route and `backend/internal/avatar` make, mapped to the `storage.objects` / `storage.buckets` permission it needs. Sources: Supabase's storage-js TSDoc (`supabase/supabase-js` master, read 2026-10-23) and its access-control guide. Eight questions for the live read, where fixes go under the fix-once rule, and the two-user Storage authorization tests the Phase 4 gate needs.
- `supabase/checks/avatar_storage_catalog.sql`: one read-only transaction covering the bucket's `public`, size and type settings, RLS and grants on both Storage tables, every Storage policy, the `profiles` UPDATE policy, the Storage helpers, the schema version, and leftover counts (R-095). It returns definitions and counts only.
- `scripts/contracts/avatar-storage-catalog.test.mjs`: keeps that file read-only, counts-only for `storage.objects` / `auth.users`, and covering the bucket settings and both tables' policies.
- R-041 evidence extended: if no `storage.buckets` SELECT policy reaches signed-in users, `listBuckets()` returns `[]` and the setup-file message follows every failed upload. Not confirmed; status stays open. Possible listing exposure (question 4) is not registered until the policy text confirms it.

Changed files: new `docs/database/avatar-storage.md`, `supabase/checks/avatar_storage_catalog.sql`, `scripts/contracts/avatar-storage-catalog.test.mjs`; `docs/bug-register.md` (R-041), `docs/database/user-db.md` (pointer), `docs/adr/0002-go-backend.md` (Phase 4 state), `supabase/README.md` (`checks/` description), this file. No route, contract, Go or lesson change.

Checks (Claude Code, Windows, Node 24.22.0):

- Catalog file dry run: PGlite 0.2.17 (scratchpad, not committed) with the schema from Supabase Storage's tenant migrations `0002`, `0008`, `0013`, `0014`, `0024`, `0058` plus a stand-in `auth.users`/`profiles`. All nine result sets returned; counts matched the planted objects (5, 3 folders, 1 at root, 1 with two files, 1 with no user).
- New guard passes; three deliberate breaks (selecting object names, adding an UPDATE, dropping `buckets` from the policy query) each fail it; file restored with an identical SHA-256.
- `node --test` on the doc-reading contract tests (`internal-paths`, `keys-catalog`, `profile-columns`) plus the new guard: pass. ESLint `--max-warnings 0` on the new test: exit 0 (existing Baseline-data notice only).
- 23 relative links and anchors in the changed docs resolve; `git diff --check` clean. The full contracts and the Go backend run in `npm run handoff`, after this record.

Not checked: the live project (the Supabase MCP server needs OAuth this session cannot run; no Supabase CLI); whether the dev project `mraglhrenqwadegvwxts` has an `avatars` bucket.

Next bounded task, **AVATAR-POLICY-001b**: run `supabase/checks/avatar_storage_catalog.sql` against User-DB `kohwfuxqbllsmvmsfqci` (owner in the SQL editor, or an agent through a read-only MCP connection), record the results in `avatar-storage.md`, answer its eight questions, and register what they confirm. Any policy or bucket change is a migration with verify and rollback for the owner to approve. Then the owner chooses where the two-user Storage tests run.

Writer released: yes. No processes left running.

## Handoff: CI-TOOLS-001 final source verification receipt (Codex, 2026-10-23)

Status: **complete, documentation only; application source verification and remote synchronization confirmed; writer released.** This receipt does not enable runtime or resume signing. Branch main, base/currentc960e7c0395f54a0e350052ac5fd32db1588a101, clean before claim and prior writer released. Resulting commit: uncommitted; Git Agent commit and synchronization pending (base `5abc81a`).

Changed: `docs/coordination.md`, `docs/bug-register.md` (R142/R178-R185 source commit attribution and owner signing-stop status), new `docs/verification/migration-tools-ci-2026-10-23.json`. The [receipt](verification/migration-tools-ci-2026-10-23.json) binds actual job/API/log evidence to exact sourcec960e7c, not to a future documentation commit.

Confirmed normal source handoff88811exit0, treeHash454967080d30: full contracts, uncached Go backend tests, vet and format pass; lessons skipped. Actual during-run status VERIFICATION_BUSY/canSynchronizefalse, then READY_VERIFIED before commit and IDLE_CLEAN afterward. Full strict lint plus final changed-source scoped lint passed. Independent source reviews25/26/27 include27operator tests,5observer tests and final20handoff-focused tests. All source hashes remain as reviewed.

Hosted sourceCI39992178601 on exactc960e7c overallSUCCESS: keys-postgres120546430029 and verify120546430614 SUCCESS. Native PostgreSQL128checks; contracts1572total,1571pass,0fail,1expected Windows-only ACL skip on Linux. Exact skip line/source condition confirmed; that ACL case passed local/independent Windows verification. Backend race/vet, production forwarding, trending browser flows, show-once playground and separate default-off production build all succeeded. Lesson step was skipped, not passed. No actual tutorial exercise/solution was run. Earlier1569counts predate corrections; this receipt supersedes them for source CI.

Receipt JSON/private-scalar/diff checks pass; documentation links/refs checked. One ad hoc CI-log summary failed because PowerShell replaced a non-ASCII regex character; ASCII retry succeeded. No unresolved product/test failure remains in this bounded source bundle. No parent task compiler/test process or root lease is running before the required normal documentation handoff; quota meter unavailable. No app/Go/SQL/lesson change, hosted identity/token/run, signing change, provider/worker call, runtime activation, production/legacy/cutover or deployment in this receipt task.

Next exact command: `npm run handoff` (default, no lessons), then verify actual Git Agent receipt commit/remote refs. SourceCI39992178601 is already green; any new documentation CI is separate and must not be represented as the source run. Next independent migration task: AVATAR-POLICY-001, read R041 and inspect catalog-only Storage bucket/object-policy definitions/source references before claiming scope; no SQL apply/signing/runtime/deployment. Owner chose keep signing changes stopped; no replacement or provisioning restart is authorized. Workers remain gated on unknown deployment/corpus; SQL/R143/legacy transition and cutover gates remain. Migration stays23/25original route implementations, not whole-migration completion.

## Archived checkpoint: CI-TOOLS-001 (Codex, 2026-10-23)

Status: **in progress / incomplete, documentation only**. Clean current/base c960e7c0395f54a0e350052ac5fd32db1588a101; prior writer released. Actual Git Agent committed all26source files and pushed source to both branches. Remote main5abc81a differs only LAST_UPDATED.txt; remote go-backendc960e7c. Normal handoff88811exit0, treeHash454967080d30, contracts/backend uncached tests/vet/format passed, lessons skipped; actual during-run status VERIFICATION_BUSY/canSynchronizefalse. HostedCI39992178601 on exactsourcec960e7c overallSUCCESS; jobs120546430029 and120546430614 SUCCESS. Parsed native128checks. CI contract log total1572/pass1571 (expected Windows-only ACL skip to verify explicitly). Browser/forwarding/race/default-off all sourceCI steps succeed, lessons step skipped. Need secret-free receipt, final source-commit bug attributions and exact skip evidence; no app/Go/SQL/lesson/signing/identity/runtime changes. One ad hoc CI-log summary regex failed after PowerShell replaced a non-ASCII character; ASCII retry succeeded, not an application failure. No task test/compiler process or root lease. Owner signing stop remains. Next verify skip metadata, write receipt/doc attribution, run link/JSON/diff checks and release docs writer before required normal handoff. Do not wait for a new documentation CI run to reinterpret already-green application source.

## Handoff: KEYS-PROVISION-001b / HANDOFF-002 / BUG-022 / BUG-023 (Codex, 2026-10-23)

Status: **complete for this bounded source and containment bundle; independently reviewed; writer released.** Hosted key acceptance and the whole migration remain separate open work. Owner explicitly selected keep signing changes stopped and continue other migration work. No replacement/provisioning restart is authorized. This handoff signals only the completed source bundle, not a successful hosted run or rollout.

Writer Codex; independent source reviewers Boyle (REVIEW-025/026) and replacement Boyle01a169a8-551d-73c0-8ec6-1515f7eaeddb (REVIEW-027). Branch main; base/current87ba11b5e4a1e34a734ee8c9d5b14e7aa5e9325a. Resulting commit: uncommitted; Git Agent commit and synchronization pending (base `87ba11b`).

Completed:

- Separate trusted development operator: exact project/role/proposal gates, P256 private/public binding, real online owner identity/freshness checks, one exclusive claim/one300second accountant JWT, isolated acceptance child, complete allowlisted19check receipt and independently acknowledged logout/cancellation. No app/Go runtime import or enabled route.
- Source-review corrections R178-R181, plus private-form observation guard. During the one approved standby import, a full AX snapshot included the still-open private input (R182). Key2bb388b5-9ca3-4757-98fc-777f2753cd45 was never activated and is now revoked; originala0c2cbe5 stayed current, legacy previous untouched. Public proof/JWKS04:38:56UTC and post-containment catalog are recorded. Exact local private/password files removed after confirmed revocation/JWKS absence. Transcript erasure/cache purge/active-token rejection are not claimed.
- No user/session/accountant JWT/run was created. Post-containment administrative counts Auth0, all five lifecycle data tables0, exact policy1/public application relations0 are dated observations. Original SQL/policy were not reapplied. The reviewed one-replacement proposal is retained, but owner chose signing stopped. No new project, production/legacy/runtime/provider/worker action occurred.
- R142/R183 handoff safety: atomic advisory verification lease, watcher/competitor/stamp gates, own process/nonce cleanup, unknown-state refusal and matching source fingerprints before/after checks. R184/R185 add final lease sampling after slow reads and fail-closed Git-read STATUS_ERROR. Cooperation is not an OS/VCS lock; transient restored edits/direct-command bypass remain documented limits.

Actual changed files:

- `.gitignore`, `AGENTS.md`; `scripts/agent-handoff.mjs`, `scripts/handoff-state.mjs`, new `scripts/handoff-lease.mjs`, `scripts/keys-dev-operator.mjs`, `scripts/keys-dashboard-observation.mjs`.
- `scripts/contracts/handoff-errors.test.mjs`, `scripts/contracts/handoff-state.test.mjs`, new `scripts/contracts/handoff-concurrency.test.mjs`, `scripts/contracts/keys-dev-operator.test.mjs`, `scripts/contracts/keys-dashboard-observation.test.mjs`.
- `docs/adr/0002-go-backend.md`, `docs/backend-map.md`, `docs/bug-register.md`, `docs/claude-review.md`, `docs/coordination.md`, `docs/plans/playground-keys.md`.
- `docs/database/keys-hosted-acceptance.md`, new `docs/database/keys-dev-operator.md`, `docs/database/keys-dev-replacement-review.md`, `docs/database/keys-provisioning-preflight-2026-10-22.json`, `docs/database/keys-provisioning-incident-2026-10-23.json`.
- New `docs/verification/keys-dev-operator.md`, `docs/verification/handoff-concurrency.md`, `docs/verification/keys-import-revoked-2026-10-23.png` (public metadata only).

Checks/results already observed: writer/reviewer27operator tests and5observer tests pass; final handoff concurrency7tests pass, and reviewer complete focused group20/20 passes. Actual CLI failing-before reproductions cover R142/R183/R184/R185. Full strictlint passed before final handoff-status changes; final scoped lint on every changed handoff source/test passed afterward (5201exit0). Prior broad1569contracts precedes final corrections and is not final-source evidence. Syntax/diff/local-link/JSON/private-scalar-literal checks pass; original frozen proposal/operator/observer/incident hashes reverified. Existing informational Baseline-data age notice remains. Earlier DNS/transport failures recovered; mistaken read-only policy_get query failed42883 and was corrected to source-defined get_policy. Intentional RED tests and reviewer probe-harness correction are not unresolved application failures.

Next exact command: `npm run handoff` with Go on PATH/GOFLAGS=-p=2; this must run final contracts and uncached production backend tests/vet/format, with lessons skipped. Its actual result/proof is separate; do not assume this written handoff proves it passed. No app source changed, so no new local Next production build/browser flow was required; hosted CI remains necessary. Before this command there is no parent check/compiler process or root verification lease. No actual tutorial tests were run (lesson-policy regressions use fake commands). Quota meter unavailable.

After normal verification, Git Agent should inspect status, synchronize only the verified source and record actual commit/push evidence; verify exact-source hosted CI. EarlierCI39793835592 once91e2c is green but does not verify this bundle. Preserve no signing/provisioning restart, production SQL/R143/legacy cutover/worker gates. Next independent migration task after receipt: AVATAR-POLICY-001, inspect R041 and catalog-only Storage bucket/object-policy evidence for the existing avatar route; capture verified definitions/source references without applying SQL, changing signing or enabling deployment. Read current status/diff/ownership before claiming it. No existing Claude session is claimed to have received this record.

## Archived checkpoint: HANDOFF-002 / BUG-023 (Codex, 2026-10-23)

Milestone4 / source-review corrections: replacement Boyle independently passed18focused tests but requested two status fixes. Parent reproduced both RED in actual isolated CLI: a status call paused before lease acquisition later returned READY_VERIFIED during active verification; corrupted disposable Git index returned IDLE_CLEAN/canSynchronize true. Corrected final lease sampling after all slow/async reads and fail-closed Git status/reference/fingerprint reads (fixed STATUS_ERROR, canSynchronizefalse, cleanlinessunknown, exit1). New final7concurrency tests PASS. R184/R185 recorded; total185entries. Final scoped lint on changed handoff sources/tests5201 exit0; independent final re-review requested. No normal source handoff/remote change yet, no root lease, no live/signing action. Active Codex/base87ba11b; next collect lint/review, finalize26-file source bundle and source-only handoff, then production backend/contracts verification and actual Git/CI receipts. Earlier1569 broad count predates final3extra tests and two status corrections; do not reuse as final result.

Milestone3 / final source review2026-10-23: replacement read-only reviewer Boyle01a169a8-551d-73c0-8ec6-1515f7eaeddb is running; previous reviewer became unavailable before this new handoff review. Parent full1569contracts PASS, strictlint exit0; afterward added fifth concurrency regression for active-writer/paused stamp refusal and strengthened clean-tree unknown-lease refusal. Final5concurrency tests PASS; scoped lint on that final test file exit0. Last broad count predates only this extra test. All26changed/new files checked for local Markdown references/JSON parse/private-scalar literals: no broken paths, valid JSON, no private scalar literals. Reverified all prior accepted operator/observer/proposal/incident hashes unchanged. Actual presence-only operator status: labels retained, all private/identity/config/run files absent. Read-only watcher correctly WRITER_ACTIVE/canSynchronizefalse/no root lease. Latest hostedCI39793835592 once91e2c remainsSUCCESS, not evidence for this uncommitted source. No parent process running. Active Codex/base87ba11b; owner signing stop remains; no further live actions. Next consume independent verdict/correct blockers, finalize source handoff/writer release, then normal npm run handoff (no lessons), verify actual Git Agent commit/remote/CI. No quota meter.

Milestone2 / before independent review and broad checks: two real CLI regressions failed on old source (watcher READY_NEEDS_VERIFY during active check; changed source still emitted success). Added atomic public-metadata lease, VERIFICATION_BUSY/canSynchronizefalse status, stamp/competitor refusal, own process/nonce release and matching before/after source fingerprints. Four concurrency cases plus existing failure-output/lesson-policy/fingerprint/stamp tests pass17/17; synthetic lesson commands only, no actual tutorial execution. R142 corrected locally, new R183 records false-proof defect. AGENTS gets one protocol pointer; shared recovery docs explain advisory limits and checked stale recovery. Helper fixture deadlines increased to avoid CI-load speed assertions. Source checks/diff pass; actual parent handoff not run. Boyle is now not_found, so no handoff source acceptance yet; assign replacement read-only reviewer. All earlier Boyle acceptances remain attributed/source-hash-bound. Actual diff now includes lease/script/tests/instructions/docs plus preserved operator/containment bundle; base main87ba11b, Active Codex. No parent check process, no root lease, browser public evidence page retained; signing owner-stopped. Next independent handoff review, final strictlint/contracts/backend/default handoff only after completed source record/writer release. Quota unavailable.

Status: **in progress / incomplete**. Owner selected "Keep signing changes stopped; continue other migration work" for reviewed replacement SHAf212c12e9a17f88bec2137d3fd7da636e5a3e0d6d1d970237785d5092d10dde3. No replacement, user, JWT or hosted run is authorized by that response; do not resume signing automatically. First imported key remains revoked, original current, all hosted Auth/lifecycle counts0; exact local private/password files removed. Boyle accepted the observation helper/tests/proposal/incident receipt with5focused tests and independent hostile/error/pending checks; public PNG supports actual key states. Operator27tests/source previously accepted. Strictlint final operator+observer exit0; last full1560contracts precedes5newobserver tests. No Go/app/SQL/lesson source changed.

New bounded scope: fix recorded R142 shared-checkout handoff/Git synchronization overlap. Reproduce watcher status during an active verifier, add one atomic public-metadata verification lease honored by status/stamp/competing verification, and reject proof if source fingerprint changes during checks. Lock is advisory to cooperating agents, not a filesystem/VCS lock; interrupted/unknown lease must fail closed, no automatic stale reset. Expected files scripts/agent-handoff.mjs, scripts/handoff-state.mjs or separate lease helper, focused regressions, .gitignore, shared instructions/review/verification/bug-register/coordination. No provider/database/signing/deployment action. Reviewer Boyle read-only; writer Codex/base87ba11b. Source batch currently17files preserved; parent no test process running, Chrome page retained for public evidence only. Next write isolated competing-process regression before implementation, then focused source review, final lint/contracts/backend/default handoff after completed source record and writer release. Quota unavailable.

## Archived checkpoint: KEYS-PROVISION-001b (Codex, 2026-10-22)

Milestone5 / incident contained2026-10-23 04:39UTC: single approved ES256 import kid2bb388b5-9ca3-4757-98fc-777f2753cd45 generated privately, imported as standby. After submit, parent requested full AX before async dialog closed; output included private textarea contents. Treat key compromised; never activate or use it. Moved only that standby to previous, revoked it, actual Dashboard confirms Revoked and original managed a0c2cbe5 remains Current, legacy previous untouched. Public JWKS04:38:56UTC returns200, compromised kid absent, only original fingerprint Ea_YyPTTJ1EWqQg2QwluiTt7q_ARgVdzaI8GvcRXaBo. Public screenshot docs/verification/keys-import-revoked-2026-10-23.png retained. No users, sessions, JWT or acceptance run created; no operator journal. No second key authorized/generated. New control-presence-only CUA observer5tests PASS; never AX/DOM snapshot/screenshot/value/body/error output. Need R182, reviewer addendum, exact one-replacement proposal before owner decision; protected compromised private key and unused passwords to remove by exact known filenames under approved cleanup, never recursive. All original approval gates remain. Current task source still uncommitted; Active Codex/base87ba11b; no parent check process; quota unavailable. Next verify post-incident catalog, dispose known local secret files, document/review corrected workflow and replacement proposal, then finish source-only batch independently of still-unexecuted hosted acceptance.

Milestone4 / before approved live setup2026-10-23: Boyle independently accepted final operator hashes1efa9362eeec4c957b269b0f8380e742b81ebc93195a7428b534f1aea21c66cd and d78ca6cc597be71f17e0d46ea88d821a62dee8f14da18b06d52351939246f5d7;27focused tests plus synthetic actual-CLI SIGINT/SIGTERM and21malformed receipts independently verified. Parent final full1560contracts PASS and strictlint exit0 (informational Baseline notice). Dashboard authenticated in fresh Chrome tab1072050929; old sign-in tab absent. Exact dev project shows managed ES256/P256 current a0c2cbe5-94b1-4a1f-97c7-c17bc5423f77, empty standby slot, legacy HS256 previous cea7391e-7ecd-40a3-bde9-edd49a71ab8f untouched. Fresh MCP counts Auth0, all five lifecycle data tables0, policy1 exact approved, public application relations0. Initial read-only query used nonexistent policy_get and failed42883; corrected source-defined get_policy succeeds. No hosted mutation or deployment key/password/JWT generation yet. Supabase status reports gateway incident monitoring; readiness must be checked, no verification weakening. Next prepare the single approved key/passwords in owner-only local directory, import via observed Dashboard form, then approved activation/users/operator/rollback. All cleanup obligations remain; no runtime/legacy/production changes. Active Codex/base87ba11b; no parent check process running; uncommitted source batch, quota unavailable.

Milestone3 / before final checks2026-10-23: network recovered (Windows DNS resolves supabase.com; MCP SQL succeeds). Fresh actual counts Auth0/keys0/events0/recovery0 and exact approved policy verified. Dashboard reached GitHub two-factor sign-in; tab1072050841 marked handoff, owner asked to complete code only in browser. No secret extraction or code requested in chat. Boyle requested3source corrections: CLI interrupt cleanup, immediate session-freshness checks, full retained child receipt. Five new regressions RED, corrected27focused tests now pass. R179-R181/BUG022 record corrections. CLI signal handlers remain through cleanup/publication, two five-minute checks stop without retries, exact19check receipt is allowlisted/retained. Final independent re-review pending; last broad1555contracts/lint pass preceded these latest JS changes, so repeat after final source. Real setup still unexecuted; no import key/identities/JWT created. Parent no test process; Active Codex/base87ba11b; quota unavailable. Next get source acceptance/full checks while owner completes sign-in, then exact Dashboard baseline and approved dev steps.

Resume milestone2026-10-23: Chrome is connected, but navigation to exact dev settings failed ERR_NAME_NOT_RESOLVED; visible error is DNS_PROBE_FINISHED_BAD_CONFIG. Bounded Windows Resolve-DnsName supabase.com timed out; MCP get_project also failed transport to chatgpt.com/backend-api/ps/mcp. Network access is now the live blocker, not missing approval or email input. Owner asked to check internet/VPN and report when Supabase loads. Do not change system DNS/proxy/security settings or route private signing material through a new cloud provider. All last-known database/Auth/JWKS observations remain dated2026-10-22, not reverified current. Need fresh catalog/Dashboard preflight after connection restored. Operator21focused tests pass again on unchanged source; last1554contracts/lint pass remain source-valid, new source review replacement Boyle01a166ec-9581-7b21-adee-5b7bb013573a running. Current actualfiles7 unchanged. No local task test/browser/provider/container process known; browser error tab may auto-close, no handoff mark on error page. Active writer Codex/base87ba11b, no deployment secrets/users/JWT generated.

Resume2026-10-23: owner continued. Actual status/log/diff rechecked: same main87ba11b, preserved seven changed/new files, active writer still Codex; no overlapping writer. Operator21focused tests and full1554contracts/strictlint passed on final current source before interruption. Current draft adds R178 for three failing-before evidence/unknown-session corrections. Last reviewer Arendt is now not_found; no final source acceptance was recorded, so assign replacement read-only review before live operator use. Fresh browser inventory now shows connected Chrome profileRoot (id1); browser access blocker resolved, need actual Supabase Dashboard authentication/state next. Owner-approved exact setup and later generated.invalid labels remain valid, no repeat approval needed. No hosted users/import key/JWT/run have been created; seven-file draft remains uncommitted. Next open exact dev JWT settings, inspect only key/project metadata and Auth prerequisites, finish operator source review then approved steps. No task process known; quota unavailable.

Milestone2 / before final operator corrections and broad checks: new scripts/keys-dev-operator.mjs + scripts/contracts/keys-dev-operator.test.mjs implement fixed-role signing/JWKS/session/child/logout orchestration, Windows owner-only ACL/config loading and atomic exclusive run journal. Initial18synthetic tests pass including real ES256 signature verification, independent cleanup, refused repeats, ignored abort/stalled body, env isolation, real two-process exclusive-file race and safe CLI gates. `--status` passed against actual protected local directory before generated labels; no liveoperator run or deployment signing key/identities/JWT created. Arendt source review running read-only. Need explicit ambiguous-Auth cleanup flags and strict preflight/result validation checks, then source acceptance/full contracts/lint/docs. Previous docs-only CI39793835592 once queued is now overallSUCCESS once verified. Browserproviders remain unavailable; plugin discovery found cloud browser but no connected local bridge, not used for private signing material. Current actual changed files coordination + two new operator sources. No active parent test process; active Codex/base87ba11b; quota unavailable.

Owner clarification: generating non-deliverable `.invalid` addresses for the two confirmed dummy users is now explicitly approved, replacing the prior owner-controlled-email input requirement. Handle local configuration without asking owner to edit files; no email is sent. Browser choice alone did not establish access: second supported provider attempt, Chrome, also returned `Browser is not available: chrome`; no browser session exists. Do not work around this using forbidden admin/secret extraction. Current new operator module is an unverified draft and must not run live; tests/source review still pending.

Milestone1: actual MCP recheck confirms dev ACTIVE_HEALTHY, Auth user count0, exact installed policy1, all other lifecycle table counts0, public application relations0. No mutation. Created/verified approved local operator directory with inheritance disabled and a single current-user FullControl ACL; created blank test-emails.json only if absent, no overwrite. No deployment key or identities file exists. Browser inventory empty/iab unavailable and email input pending. Implement a fixed-project operator entrypoint: protected local config, actual JWKS match, one atomic run claim, real two-user password sessions, one fixed300second accountant JWT, isolated existing acceptance subprocess, independently acknowledged logout before any external key restoration. It performs no Dashboard mutations; preparation/generation and live execution remain blocked on actual prerequisites/source review. No app/Go/lesson/SQL change. Current changed file coordination only, base87ba11b; no task process. Next add operator/regressions, get Arendt read-only review; checkpoint before broad checks.

Status: **in progress / incomplete**. Owner explicitly approved exact provisioning proposal SHA-256 `ef96978f62dc4630d3a8b3e0ad3f681a3eca625a3c6cffebd13623cc51c849d9` for existing development project `mraglhrenqwadegvwxts`; source rehash matches. Scope includes two confirmed disposable users, one imported/temporarily active external ES256 key, one300second fixed-role accountant token, approved provider-free run and reviewed session/key cleanup. Production, legacy keys, runtime activation, user deletion and permanent signing-key deletion remain excluded. Do not repeat approval for this same scope. Dashboard controls/readiness and a source-reviewed operator helper remain prerequisites.

Branch main base/current `87ba11b5e4a1e34a734ee8c9d5b14e7aa5e9325a`, clean before claim; docs commitce91e2c and implementation03dfc5a present. No new checks claimed yet. Read-only browser inventory returned no browsers; one direct open of the exact dev Dashboard failed `Browser is not available: iab`. Cannot perform Dashboard operations through current tools; no secret/PAT/service-role workaround permitted. Owner input requested for available authenticated Dashboard browser or manual reviewed steps, and two unused owner-controlled emails in local test-emails.json (no passwords/tokens in chat). Continue independent offline operator implementation/tests/review meanwhile.

Expected files: coordination, dedicated operator module/CLI and meaningful regressions, source/verification/setup runbook and review records. Existing approved proposal bytes remain immutable; record its approval in the runbook/coordination. No Go/lesson/app/SQL/runtime changes planned. No credentials, private key, identities or JWT generated. No task processes running; Docker engine remains running. Account quota unavailable. Next recheck actual dev project/policy/zero lifecycle+Auth count, create/verify owner-only local config directory, implement narrow secret-safe operator stages with synthetic tests, then independent source review. Checkpoint at milestones/before long operations/every10minutes; stop live steps until actual prerequisites exist.

## Handoff: KEYS-PROVISION-001a / source CI receipt (Codex, 2026-10-22)

Status: **owner-requested review proposal complete; independent review and documentation checks passed; provisioning unapproved/unexecuted**. Owner Codex, read-only reviewer Arendt, REVIEW-024. Branch main, base/current03dfc5a54dd75320d6e954b799cadb37758f5265; clean before claim, previous writer released. This seven-file documentation receipt is explicitly uncommitted until Git Agent synchronization. Writer released: yes. The larger migration remains active behind its existing gates.

Prepared `docs/database/keys-dev-provisioning-review.md`, exact SHA-256 `ef96978f62dc4630d3a8b3e0ad3f681a3eca625a3c6cffebd13623cc51c849d9`: dev target only, two disposable confirmed users/password sessions, one externally retained ES256 import/activation, fixed-role300second accountant token, original-key restoration/imported-key revocation and audit-preserving cleanup. Existing policy/run approval explicitly excludes this provisioning; owner requested preparation for review only. No credentials/keys/users generated, no import/rotation/JWT mint, no extra SQL or runtime/provider/legacy/production change. Current MCP inventory lacks Auth/signing mutation API; proposed owner-authenticated Dashboard path remains an execution-time dependency. Operator helper must receive source review before live use.

Arendt accepted the final proposal after three corrections: direct server-acknowledged per-user logout before changing signing trust; expired-token denial cannot prove active-token revocation during cooldowns; retained accounts remain password-login capable. Parent verified installed auth-js2.78.0 suppresses401/403/404 during high-level signOut. R177 records the unexecuted draft-plan correction, not a deployed defect. User deletion would cascade through audit/recovery and is excluded. No new application tests for this documentation-only change; source/operator regression checks are required if a helper is later implemented.

Previous implementation batch is committed03dfc5a (21files), on both remote branches. Handoff73293 exit0/tree1d3c02aa39ea passed contracts/backend/vet/format; lessons truthfully skipped. Actual new hosted [CI39791285330](https://github.com/sefgh-ai/sefgh-main/actions/runs/39791285330) for exactly03dfc5a is overallSUCCESS; verify119867686731 and keys-postgres119867686407 bothSUCCESS. Full step metadata and selected bounded logs confirm1533contracts/0fail,128nativeSQL, race/vet/format,152forwardingrequests, Phase2 69statefulrequests/6gates, trendingdesktop/phone, show-once desktop/phone/zoom200 and separate default-off production gate. Lesson stepSKIPPED. New `docs/verification/keys-acceptance-ci-2026-10-22.json` and verification text preserve the receipt. GitHub connector job query404 was bypassed read-only with the repository's existing local credential path, no secret output. An initial ad-hoc log collector had a Windows-pipe Unicode regex SyntaxError before network access; ASCII retry succeeded. No application/CI source changed for either diagnostic.

Actual changed files (7): docs/coordination.md; docs/claude-review.md; docs/bug-register.md; docs/database/keys-hosted-acceptance.md; new docs/database/keys-dev-provisioning-review.md; docs/verification/keys-acceptance.md; new docs/verification/keys-acceptance-ci-2026-10-22.json. Checks:15relative targets exist,177unique bugIDs, reviewed proposal hash unchanged, sourceCIreceiptshape/head/success verified, diffcheckpass. Existing exercises untouched; no Go/app/lesson/SQL source or environment change. No actual lesson tests/vet/build, local app build/browser repeated; source CI above includes established synthetic build/browser gates. Final normalhandoff follows only because this bounded documentation work is complete, without lesson flag.

Remaining gates: owner review/approval of the concrete dev provisioning proposal; owner-authenticated Dashboard access and two locally supplied unused owner-controlled email identities; separately reviewed operator helper if needed. Approved hosted acceptance still pending these credentials, not a whole-phase or route cutover. Production policy/retention, actual token expiry/revocation/disabled-admission recovery and unrelated effective grants, runtime/preview/rollback/cutover and R143 privilege approval remain. Old plaintext keys may be revoked only at approved cutover. Unknown worker deployment keeps execution gated. R039 open; original routecount23/25. No account quota meter available.

Processes: no parent/reviewer task test/app/browser/container/provider/worker running; Docker engine remains running. Next command npm run handoff with Go user PATH/GOFLAGS=-p=2, no lesson flag; verify Git Agent commit/status/remotes. Present this exact stable proposal/hash for explicit owner approval as the final dependent step. Do not provision based on source review or the earlier test-policy/run approval. Incoming writer must inspect the actual tree/current owner and reclaim before edits; writing this record does not notify Claude automatically.

## Checkpoint history: KEYS-PROVISION-001a (Codex, 2026-10-22)

Milestone: concrete proposal written; Arendt identified three cleanup/evidence issues before any execution. Installed auth-js2.78.0 source confirms high-level signOut suppresses401/403/404; proposal now requires bounded server-acknowledged logout while tokens/key still valid, independent cleanup flags, retained-user/password capability disclosure, and active-token revocation unverified when the single five-minute token expires during key-state cooldowns. R177 records draft-plan correction, no deployed bug claim. Final focused doc review pending. No provisioning/helper/secret generation performed. Source CI39791285330 on03dfc5a now overallSUCCESS per actual run metadata; full job/log receipt to collect. Parent no local task process. Active Codex, base03dfc5a; changed docs now includes bug-register; lesson checks remain skipped; quota unavailable.

Status: **in progress / incomplete**, documentation-only concrete development identity/signing setup requested by owner. Owner selected preparation for review, not execution. Branch main base/current `03dfc5a54dd75320d6e954b799cadb37758f5265`, clean before claim. Previous migration handoff73293 exit0/tree1d3c02aa39ea with contracts/backend/vet/format passed and lessons explicitly skipped. Git Agent committed21files as03dfc5a and synchronized both remote branches; fetched origin/mainc9efa91 differs only LAST_UPDATED.txt, origin/go-backend03dfc5a. Current sourceCI39791285330 on03dfc5a in progress; no new hosted green claim.

Scope: exact target, two disposable confirmed non-anonymous users/sessions, externally retained ES256 import/activation and short-lived fixed-accountant JWT, local secret boundary, revert/revoke imported key and audit-preserving cleanup plan. Prepare review file and link authoritative runbook/coordination; no provisioning, JWT minting, key generation/import/rotation, extra SQL, production or runtime activation. Supabase official signing-key/Admin createUser/password-login sources checked. Current tools have no Auth/signing mutation API; propose owner-authenticated Dashboard operations, not extracting a database/project secret. Auth FK on-delete cascade means deleting test users would delete key/event/audit state: explicitly excluded from cleanup. Existing key/privacy/worker gates preserved.

Expected changed files: coordination, new docs/database/keys-dev-provisioning-review.md, acceptance runbook/review record references and register count correction. No application/Go/lesson changes; no lesson execution. Parent handoff/tests exited; no task container/browser/server/provider/worker. Docker engine running. Account quota unavailable. Next write concrete review proposal, independent read-only review, links/diff validation; observe sourceCI while working. Before any live provisioning obtain explicit approval of that concrete scope and required Dashboard authentication.

## Handoff: KEYS-RECOVERY-002 / KEYS-ACCEPT-001 / BUG-021 (Codex, 2026-10-22)

Status: **implementation and independent source review complete; local checks passed; normal handoff and new hosted CI pending**. This bounded batch is finished; the overall migration and live key acceptance remain open. Writer Codex; read-only reviewer Arendt, REVIEW-023. Branch main, base/current `a60e3b9342ee210add92b0cc1ccf38d081b9d251`, clean before writer claim. Resulting changes explicitly uncommitted until the Git Agent synchronizes; a handoff signal is not a commit receipt. Writer released: yes.

Completed:

- Unregistered Go `RPCClient.OpenRecovery` opens through one validated pending read independent of admission policy and returns a separate Pending/Complete-only concrete type. No widening into reservation/management, token minting, broader SQL grant, scheduler or runtime registration. Redaction/cancellation/failure tests pass; lesson42/44/index updated only.
- Exact-dev-target, opt-in hosted SQL acceptance runner implements supplied-session verification, full role/private-profile matrix, show-once/metadata/hash-only checks, cross-owner isolation, concurrent key/owner quotas, exact recovery/completion/replay/attempt accounting, revocation and independently confirmed run-scoped cleanup. It has no provider, production override, SQL seed or credential provisioning. Twenty-one synthetic regressions pass; no hosted lifecycle run occurred.
- Owner approved exact `keys_002_dev_acceptance_policy.sql` SHA-256 `c433ed1322c919bbbd62a347a6174af92044e11336733d11720741a60e477695` and one provider-free acceptance run once separately approved credentials exist. Existing dev target/status and empty state verified immediately before one guarded transaction. Readback confirms exactly one test policy with reviewed values, five other lifecycle tables empty, no public application relations and unchanged restricted accountant flags. Receipt `docs/database/keys-staging-policy-2026-10-22.json`; original additive migration NOT reapplied. Production/legacy/identity/signing/runtime untouched.
- R172-R176 draft tool/fixture defects corrected with regression evidence. Register176unique entries. Arendt accepted final source, independently ran21runner tests and28timestamp-helper cases, plus earlier five-group Go suite; no reviewer Docker/live/lesson execution. Parent native128checks passed including exact policy conformance/guards and legacyfixture restoration.

Actual changed files (21): `backend/{README.md,internal/apikey/rpc_recovery.go,internal/apikey/rpc_recovery_test.go}`; `scripts/{keys-hosted-acceptance.mjs,contracts/keys-hosted-acceptance.test.mjs,keys-postgres-test.mjs}`; `supabase/proposals/keys_002_dev_acceptance_policy.sql`; `learn-go/{README.md,42-rpc-capabilities-and-database-authority/README.md,44-bounded-receipt-recovery/README.md}`; `docs/{coordination.md,claude-review.md,bug-register.md,backend-map.md,adr/0002-go-backend.md,plans/playground-keys.md,verification/keys-acceptance.md,database/keys-001-review.md,database/keys-staging.md,database/keys-hosted-acceptance.md,database/keys-staging-policy-2026-10-22.json}`. Existing exercises untouched.

Actual checks: focused Go5groups/subcases pass; full uncached backend tests/vet/format session25956 exit0; focused Node21pass and full contracts1533/1533 after timestamp correction; final strictlint19160 exit0 (existing Baseline age notice only). Native wrapper91032 exit0,128assertions, owned container removed. Three microsecond regressions RED before fix, then pass with equivalent-offset case. Earlier cancellation fixture timed out10minutes in server teardown despite client return; release-channel correction passed25s-timeout suite. First Docker attempt failed before container creation; started installed Docker Desktop hidden, retry succeeded. Relative links120passed before final review record; final reference/diff check and required normal handoff next. No new UI source, local production build/browser not repeated; hosted workflow retains them. No lesson tests/vet/build run; normal handoff must report lessons skipped. Local race unavailable without C compiler; new hosted race result pending. Prior828dde7 CI39651769559 overallSUCCESS is baseline evidence only.

Remaining gates: all four acceptance env names absent (presence only inspected); separately approved disposable Auth identities/sessions and trusted accountant signing/token setup still needed. Owner input requested for credential path while independent work continued; no token/password requested in chat. Approved provider-free hosted gateway run remains pending credentials. Expiry/signing rotation/disabled-admission hosted recovery/unrelated effective grants, production policy/retention/unknown outcomes, runtime/forwarding/real UI/preview/rollback and approved cutover remain. Rotate to v1 chosen; revoke old plaintext keys only at approved cutover. R143 separate legacy privilege SQL remains unapproved. Worker execution remains gated on actual deployment/corpus. R039 remains open; original API route count23/25 (92% of routes, not whole migration). No account quota meter available.

Processes: parent/reviewer tests/lint exited; no task browser/server/container/provider/worker running; Docker engine remains running. Next command: `npm run handoff` with installed Go PATH and GOFLAGS=-p=2, no lesson flag. Then inspect actual Git Agent commit/status/remotes and new source CI. Next bounded migration task: obtain owner-selected credential setup, review/provision only specifically authorized dev identities/signer, run approved acceptance once credentials exist; do not bypass with service-role CRUD/Auth hooks/managed-private-key extraction. Incoming writer must inspect the actual current tree and reclaim ownership before edits.

## Checkpoint history: KEYS-RECOVERY-002 / KEYS-ACCEPT-001 (Codex, 2026-10-22)

Milestone7: exact owner-approved dev policy applied successfully via one transactional execute_sql, no DDL/original-migration reapply. Readback confirms exactly one `dev-acceptance-v1` policy, all reviewed values match the runner constant, all five other lifecycle tables still empty, no public application relations and unchanged restricted accountant role. Receipt `docs/database/keys-staging-policy-2026-10-22.json` preserves target/hash/preflight/readback without credentials. Hosted lifecycle run still pending because all four required environment names are absent; no identity/signer provisioning, production/legacy/provider/runtime action.

Arendt final review accepts exact SQL, native extension and OpenRecovery. Remaining runner blocker: Date.parse comparison loses sub-millisecond precision in pending reservations/saved receipts. Next add actual-runner one-microsecond failure regressions and equivalent-timezone success, then preserve fractional precision and recheck focused/full contracts/lint; log next bug ID R176. Prior1529/fullGo/vet/format/lint/native128 passed before this planned script correction. Active writer Codex/base-currenta60e3b9, no parent check process, Docker engine running; no lesson execution. Do not run acceptance until corrected/reviewed source and separately approved credentials exist.

Milestone6 / before approved development policy application: owner approved the exact test-policy SHA-256 `c433ed1322c919bbbd62a347a6174af92044e11336733d11720741a60e477695` and one provider-free acceptance run once separately approved credentials are available. This excludes identity/signer provisioning, legacy keys, providers and production. Rehashed source matches; MCP project lookup confirms existing `sefgh-migration-dev` / `mraglhrenqwadegvwxts`, organization `hithuduntbsajjhmnntm`, Mumbai, ACTIVE_HEALTHY. Actual read-only preflight: private schema present, zero public application relations and zero rows in all six lifecycle tables; accountant NOLOGIN/NOINHERIT/NOBYPASSRLS. Next execute that exact guarded policy SQL only, then read back and save a secret-free receipt. Do not reapply the original additive migration.

Full uncached backend tests/vet/format session25956 exit0; full Node contracts session50379 passes1529/1529; final strict lint session52357 exit0 (existing Baseline-data age notice only). Native128 and focused Go5/Node17 remain passed. All four acceptance environment names are absent (presence only inspected, no secret values read); hosted lifecycle acceptance therefore cannot run yet. Arendt final review pending; parent check processes have exited, Docker engine remains running. Active writer Codex/base-currenta60e3b9; actual Git status includes19changed/new files; no hosted mutation this turn yet. Quota unavailable. Remaining hosted credentials/acceptance, runtime/cutover/legacy/worker gates preserved.

Milestone5/pre-broad-checks: native PostgreSQL wrapper91032 exit0,128checks pass including application-bearing/pristine/repeated/dirty-data policy guards, exactSQL-runnerpolicy and restored legacyfixture hash. Owned container removed; Dockerengine running. Updated lesson42/44/index as source only, no exercise edit/execution. Go5focusedgroups passed; Node17focusedtests passed. Owner review question submitted for exact test-policy hashc433ed1322c919bbbd62a347a6174af92044e11336733d11720741a60e477695 plus oneprovider-free devtest run, excludingprovisioning/signing/legacy/providers/production; answer pending. Nothing applied to hosted database in this turn.

Arendt final source/proposal/nativeextension review pending. Starting full uncached backend tests/vet/format and full Node contracts/strictlint now; preserve current files during checks. Final focusedlint earlierpass precededlatestchanges, not reused as final. First Dockerfailedbeforecontainercreate and prior10minute teardown timeout are documented/corrected. Actualfiles Gitstatus authoritative; includes sharedADR/map/plan/backend/staging/review/verification and newSQL/script/tests. ActiveCodex/basea60e3b9, quota unavailable. Next collect fullchecks/review, resolve findings, inspect approval before any dependentlivepolicy step, then normalhandoff only when boundedwork complete.

Milestone4: focused new cancellation run87862 timed out10minutes in httptest.Server.Close because remote handler waited indefinitely for request context; client cancellation had returned. Added owned release-channel teardown, final five-group go test -count=1 -timeout=25s ./internal/apikey -run TestRPCRecovery passes (2.946s package). Recorded R172-R175/BUG021 for strict-reply, cleanup, coverage and teardown corrections. Latest17Node acceptance tests pass. Full lint exited0 before latest matrix/cleanup source edits; recheck needed. Docker Desktop nowready25.0.3; native suite retried in wrapper session pending, owned fixture cleanup guaranteed by wrapper. No hosted actions/credentials/policy changed. Lessons42/44/index updated without execution. Remaining review/proposal-native/fullbackend+contracts+finalhandoff gates. Currentactualnewfiles include policy SQL/runbook and script tests; gitstatus authoritative. ActiveCodex/basea60e3b9, quota unavailable.

Milestone3: Arendt accepted OpenRecovery foundation and reproduced cleanup-skips-other-owner and void-reply false acceptance in the new runner. Parent added3regressions RED then corrected independent known-key/owner cleanup and strict void responses. Full role matrix, actual two-key owner race, attempt charging after completion, saved-pending conflict/receipt preservation and run nonce now implemented;17synthetic tests pass. These are unshipped tool defects to record as R172-R174/BUG021, not product gateway findings. Native-policy proposal and runbook now created; lessons42/44/index updated only, existing exercises untouched.

Extended existing labelled Docker-only PostgreSQL suite with pristine-policy/config-conformance/reapply/dirty-data guards and temporary movement/restoration of synthetic legacy tables. First native attempt failed BEFORE container creation: Docker engine named pipe unavailable. Started existing Docker Desktop hidden; will wait bounded readiness and retry once ready. No hosted SQL changed. Lint session74856 running; corrected Go cancellation-focused87862 still to collect. Actual changed additional native test script, proposal/runbook, lesson READMEs/index. Reviewer now reviewing final source; no policy/signing/user provisioning/live lifecycle approved or run. ActiveCodex/basea60e3b9, quota unavailable.

Milestone2: corrected Go focused session80697 exit0: four recovery-opening groups plus malformed/denied subcases. OpenRecovery remains unregistered; admission opener unchanged. New provider-free scripts/keys-hosted-acceptance.mjs and nine synthetic-gateway tests pass. Exact dev target/write flags, env-only supplied tokens, online owner checks/distinct users, strict policy/fresh identities, role/private-schema denial, creation/list/cross-owner/active cap, shared quota races, exact saved receipts/replay/revocation, scoped confirmed cleanup. Initial acceptance draft accepted noncanonical key/list extra fields; regression failed, corrected canonical/strict validation. Also drain all parallel requests before cleanup and report accounting-review separately. These are synthetic tests only, no live lifecycle executed.

Actual changed: coordination; new rpc_recovery.go/test; new hosted acceptance script/test. Lessons/docs/proposed test-policy still need generation. Existing Go lesson44 can be updated for narrow returned capability; no need another large lesson. Next add small cancellation/settlement regressions, review Arendt findings, prepare concrete unapplied dev policy/provisioning instructions, generate lesson updates, then request only missing specific approvals. No live actions this turn, no policy/identity/signer changes, Go focused processes exited. Base/currenta60e3b9, activeCodex, quota unavailable.

Milestone1: OpenRecovery now opens only after a validated pending read, independent of admission policy, returns a separate Pending/Complete-only concrete type with redacted formatting/JSON refusal and bounded/cancellable opening. Initial stub run failed invalid-credential/cancellation checks; disabled-policy fixture also failed because it omitted strict RPC fields, corrected to full rpcPolicy shape. First two test invocations overlapped implementation; do not treat them as final verification. Both exited1, final corrected focused session80697 running. Actual newfiles backend/internal/apikey/rpc_recovery.go and rpc_recovery_test.go; no existing production Go source changed. New lesson still needed.

Official Supabase signing-key docs/changelog read: managed private key non-extractable; supported custom JWT path requires imported signing key and activation/rotation. No signing change or minting authorized/performed. Preparing reviewed dev-only test-policy proposal and provider-free hosted acceptance runner with explicit mutation flag, supplied sessions, exact target and cleanup. No policy/testidentity/accountant token exists yet; no live mutation in this turn. Prior reviewerHume not found; replacement Arendt01a16398-ab93-7ec2-b154-12d8a0de8232 read-only sidecar assigned (source/security/matrix). Active Codex/basea60e3b9; account quota unavailable; checkpoint before longer checks.

Status: **in progress / incomplete**. Owner explicitly continued and asked why a new Supabase project exists. Explained the prior separate-test-environment choice, explicit organization/cost/create approval and separate exact dev-only SQL approval. Keep using the existing isolated dev target; do not create another project or alter production. Writer Codex, branch main, base/current a60e3b9342ee210add92b0cc1ccf38d081b9d251, clean before claim, prior writer none. Receipt828dde7 is committed; hosted39651769559 on828dde7 overallSUCCESS, verify119401658185 and SQL119401657698 SUCCESS. Earlier source55d8c35 green remains valid.

Scope: (1) separate policy-independent Pending/Complete-only recovery capability, so disabling admissions does not prevent opening recovery; no scheduler/runtime registration, credential minting or broader grants. (2) prepare a strictly targeted, provider-free hosted key acceptance runner and concrete test-policy/provisioning review material. Existing user-scoped management remains, no service-role CRUD, Auth-hook alteration, SQL reapply, policy seed, test-user provisioning, legacy-key revocation, worker execution, runtime enablement or deployment without the remaining specific approvals. SQL target mraglhrenqwadegvwxts is already migrated; do NOT reapply.

Expected files: backend/internal/apikey recovery capability/tests; bounded acceptance runner/tests if appropriate after source/docs review; matching generated lesson/index; shared plan/ADR/map/review/verification/coordination and unapplied test proposal. Existing exercises untouched; no lesson execution. Actual changed file at claim: docs/coordination.md only. Current technical uncertainty: safe accountant JWT provisioning through actual ES256 signing setup; researching official documentation before proposing a path. No account quota meter; no local task process started. Next command: inspect official signing-key guidance and recovery capability, implement narrow recovery opening with focused regressions, then acceptance preparation. Checkpoint at milestones/before long operations/every10minutes.

## Handoff: CI-KEYS-002 final receipt / KEYS-GATEWAY-001a (Codex, 2026-10-21)

Status: **complete for this bounded batch; independently reviewed; local and hosted source verification passed; runtime not enabled or deployed.** The whole migration remains active. Writer Codex; read-only reviewer Hume, REVIEW-021/022 and receipt addendum. Branch main; base/current55d8c351751aa3bef871a07d8dbc06eb0d29e398. This final documentation receipt is explicitly uncommitted until Git Agent synchronization. Prior writer released before this claim; status/diff were clean. Remote main218471f contains the same source plus one LAST_UPDATED.txt-only commit; remote go-backend contains55d8c35.

Completed implementation and synchronization:

- Migration batch7a9d979: bounded exact-receipt recovery helper, optional tutorial checks, R170 stale-proof correction, lesson44 and isolated dev SQL staging/verification. All23files committed by Git Agent and present on both remote branches. Handoff35515 exit0, treeHash23f400bd31e0; contracts/backend/vet/format passed, lessons truthfully skipped.
- Fixture55d8c35: R171 destination/root readiness and atomic zoom, actual-expression regressions and computed200percent assertion. Handoff48482 exit0, treeHashbe20d0fb88a6; contracts/backend/vet/format passed, lessons skipped. Git Agent committed/synchronized; local protected production browser30377 passed desktop/phone/zoom. Earlier failed6dadafc CI39613327377 remains recorded, not misrepresented as green.
- New development project sefgh-migration-dev / mraglhrenqwadegvwxts in sefgh-ai's organization, Mumbai. Owner explicitly approved creation at quoted0USD/month, then exact additive SQL for development only. Applied once; hosted migration20261021174847, source filename20261021063751 retained. Do NOT reapply it. All six catalog queries,24direct-table denials/RLS,9wrapper grants and23function-body comparisons passed; policy empty. Public JWKS publishes ES256 metadata; no signing secret, user token or accountant capability provisioned.
- KEYS-GATEWAY-001a: actual anonymous development gateway denies all nine key RPCs with401/42501 and private-profile exposure with406/PGRST106. Used existing modern publishable configuration without user Authorization; no value/raw response retained. Policy/keys/events/recovery counts remain0. Hume checked the saved artifact and wording locally; hosted calls/count/body comparisons are writer-run evidence. UserA/userB/accountant tests remain pending.

Hosted verification is confirmed for exact source55d8c35: [run39649911218](https://github.com/sefgh-ai/sefgh-main/actions/runs/39649911218) overallSUCCESS, verify119395210686 SUCCESS and keys-postgres119395211211 SUCCESS. Logs show1512contracts passed/0failed,152forwarding requests, Phase2 acceptance69requests/6gates, trending desktop/phone7checks each, keys desktop/phone/computedzoom200, separate default-off production gate and120nativeSQL assertions. Backendrace/vet passed; lesson step explicitly SKIPPED. Earlier migration7a9d979 run39648555071 also overallSUCCESS with lesson skip. A later documentation-only run is separate; do not claim its result from these receipts.

Final documentation changes: docs/coordination.md, docs/claude-review.md, docs/bug-register.md, docs/database/keys-001-review.md, docs/database/keys-staging.md, new docs/database/keys-staging-anonymous-2026-10-21.json, docs/verification/keys-recovery.md and docs/verification/playground-key-ui.md. No application/Go/lesson/SQL/config changes after the green source run. Relevant receipt shape,11local links and diff checks passed before this final record; final reference/diff checks and required normal handoff follow. No actual lesson tests/vet/build ran in this batch; existing exercises untouched. Local race unavailable without C compiler; hosted race passed.

Remaining gates: trusted narrow accountant provisioning/rotation/expiry and verified gateway role selection; explicit test policy/two isolated identities and real userA/userB/accountant acceptance; production policy/retention, unknown outcomes, recovery startup while admissions are disabled; runtime/forwarding, preview, rollback and approved cutover. Rotation to v1 is chosen; revoke old plaintext keys only at an approved cutover. R143 legacy privilege proposal and production SQL need separate review/approval. Workers stay gated while deployment/corpus are unknown. R039 remains open; original route count23/25. Register171entries:93fixed locally,76open,1inprogress,1owner-deferred. R142 shared-checkout overlap remains open.

No production SQL/data/privilege, policy seed, test-user provisioning, runtime activation, legacy revocation, provider or worker execution. Local task processes all exited; Docker engine remains running. Account quota unavailable. Next concrete command: npm run handoff with user Go PATH and GOFLAGS=-p=2, then inspect Git Agent commit/remotes. Next bounded migration work: prepare the trusted accountant capability/test policy and actual two-user acceptance on this exact dev project, preserving all gates. Writer released: yes.

## Active checkpoint: CI-KEYS-002 receipt / KEYS-GATEWAY-001a (Codex, 2026-10-21)

Milestone: Hume independentlyaccepted anonymousreceipt/docs addendum, all9RPCnames/statuscodes/privateprofile/zerocounts/projectref/no credentials crosschecked,11links/diffpass. CI39649911218 on55d8c35 now showonceUI stepafterrace/vet/forwarding/trending; SQLsuccess; lessonsSKIPPED. No wholeCIclaimyet, defaultoffstillneedscompletion. Currentfilesdocs-only:coordination,claude-review,keysreview,staging,newanonymousJSON. No local taskprocess. Next getwholeCIresult thenrecordfinalreceipt, releasewriter/normalhandoff fordocs and verifyGitAgentsync. ActiveCodex/base55d8c35/quotaunavailable.

Milestone: actualdevanonymousgateway10denialchecks pass usingexistingmodernpublishableconfig only (no userAuthorization/no minting):9fixedRPCCalls401/42501, privateAcceptProfilelimit0GET406/PGRST106. Capturedstatus/codeonly; no publishablevalue/legacyJWT/errorbody persisted. Afterwardread-onlycounts policy/keys/events/recovery all0. Secretfreereceipt docs/database/keys-staging-anonymous-2026-10-21.json added; staging/review gates updatedanonymouscomplete/userAuserBaccountantpending. CI39649911218 on55d8c35 stillbackendrace/vet, nativeSQLjobsuccess. No runtimesource/SQL/policy/role/testidentity/providerchange. Next Hume receipt/docreview and CIcompletion then finalboundedhandoff. ActiveCodex/base55d8c35; parentno tasklocalprocess; quotaunavailable.

Status: **in progress / incomplete**. Branchmain base/current55d8c351751aa3bef871a07d8dbc06eb0d29e398; cleanbeforeclaim, priorwriternone. GitAgentcommittedR171fixture55d8c35 onbothremotebranches; origin/main218471f ahead1onlyLAST_UPDATED.txt (fetch/diffverified). Handoff48482 exit0/treebe20d0fb88a6 fullcontracts/backend/vet/format/explicitlessonskip. Mainmigration7a9d979 hosted39648555071 overallSUCCESS, verify119390524329 andSQL119390523616 SUCCESS; stepmetadata confirmslessonSKIPPED, race/vet/forwarding/trending/keyUI/defaultoffSUCCESS. NewfixtureCI39649911218 on55d8c35 starting, no currentgreenclaimyet.

Whilehostedruns, boundedanonymousgatewaydenialchecks ondevmraglhrenqwadegvwxts only: read existingmodernpublishablekey withoutprinting/persisting, no privilegedkey/JWT/userprovisioning; fixedinvalidRPCinputs/no policy and expectedanonrole denies beforewrites; testprivateprofiledenial. No liveuser/key/usagevalues, prodrequest/provider. Need recordonlystatus/code, no responsepayload/key. SQL appliedalready; noDDL/DML/policy/legacy/runtimechange. Expectedreceipt/docsupdates only unlessconfirmedfixturefailure. Next obtainpublickeymetadata/selectenabledmodern, executecontrollednegativegatewayrequests, preserveartifact; Hume readonlyevidence review, currentCIreceipt and finaldocs/handoff. Parent no tests/browser/server/container/task process; Dockerenginerunning; quotaunavailable.

## Handoff: CI-KEYS-002 / BUG-020 (Codex, 2026-10-21)

Status: **source implementation, independent review and local production browser verification complete; normal handoff/hosted verification pending**. OwnerCodex, reviewerHume REVIEW022. Branchmain base/current7a9d979e352d0bcf74e58c039a8ebb3446ce36f4; resulting fixturefix explicitlyuncommitted/GitAgentpending. Previous23filemigrationbatchcommitted7a9d979 onbothremote branches; origin/main d62fc69 ahead1timestamp-only verified. Previoushandoff35515 exit0/tree23f400bd31e0 fullcontracts/backend/vet/format,lessons explicitlyskipped, actualexternalGitAgentcompat observed. No new hostedgreen yet.

R171 reproduced from hosted39613327377 on6dadafc: keydesktop/phonepassed, zoom nullroot.style afterPage.navigate, defaultoffskipped; SQLjobsuccess. New helper scripts/key-probe-zoom.mjs polls exactdestination/fixture/body/root and applieszoom inoneevaluation, avoidsoldaboutblank, preserves error/timeout. Probe importshelper beforeforms, assertscomputedrootzoom2 afterreadiness. Olddirectsetter RED2cases, corrected3actualexpressionVMtests pass, independently underHume; evaluatorfailureremainsfailure. Actualproductionprobe30377 --reuse exit0 desktop1280/phone390/zoom200640; alloldproductassertions intact plusnewzoomassertion. SyntheticSDK sessions/buildonly, no new livekeys/users/providers. Focusedlint0/syntax/diffpass, previousbaseline-browser-mapping age notice persists. No application/Go/SQL/runtime/env/Chrome startup/lesson change; no lessonchecks.

Actual7changedfiles: scripts/key-probe-zoom.mjs; scripts/contracts/key-probe-zoom.test.mjs; scripts/keys-browser-probe.mjs; docs/bug-register.md; docs/claude-review.md; docs/coordination.md; docs/verification/playground-key-ui.md. Register171entries/93fixedlocally/76open/1inprogress/1ownerdeferred; R170commitreceipt updated, R171fixedlocallynotyethosted, R142overlap remainsopen. Finalfullcontracts/backend handoffnow. Latest7a9d979 CI39648555071 was backendrace/vet withSQLsuccess atlastread; maystillhitoldR171fixture, nofalseclaim. Next getGitAgentfixturecommit then verifyreplacementwholeworkflowincludingdefaultoff, recordexactreceipt.

Alllocaltaskbrowser/Next/auth/lint/testprocesses exited, Dockerengine staysrunning; quotaunavailable. Workerexecutiongated, devSQLalreadyappliedverifieddoNOTreapply; no policy/JWT/testusers/prod/legacyrevocation. Remainingrealaccountantprovisioning/testpolicy/twousergateway/recoveryoperational/runtime/rollback/cutovergates preserved. Writerreleased:yes. Nextcommand npm run handoff withuserGoPATH/GOFLAGS=-p=2(defaultlessonskip), then remote/CIreceipt. Entiremigrationnotclaimedcomplete.

## Active checkpoint: CI-KEYS-002 / BUG-020 (Codex, 2026-10-21)

Milestone: extractedactualprobezoomexpression with expectedURL/fixture/body/root andsameevaluationassignment; originaldirectsetter RED2cases, corrected3VMcasespass (includingboundedneverready/evaluatorfailure). Actualproductionbrowserprobe30377 --reuse --report=temp/sefgh-key-zoom-002 exit0 desktop1280/phone390/zoom200640 withcomputedzoom2assertion, no unexpectedAPI/browsererrors. Existingignoredmanifestsyntheticauthport65151/enabledtrue reused; appsourceunchanged. Focusedlint85357running, Hume source/focusedreviewpending. LatestnewsourceCI39648555071 on7a9d979 started backendrace/vet, SQLjobsuccess; previous6dadafcrun39613327377 failedrootreadiness, defaultoffskipped. Actualchangedcoordination/register/keyprobe/newhelper/newVMtest; no Go/lesson/SQL/env/runtime change. Parentbrowser/server/fixture exited; lintonlyrunning. Next review/docs/fullhandoff+hostedreceipt; no sourcecompleteclaim yet. ActiveCodex/base7a9d979/quotaunavailable.

Status: **in progress / incomplete**. Base/current7a9d979e352d0bcf74e58c039a8ebb3446ce36f4, main clean beforeclaim; prior writer none. Git Agent committed all23files recovery/lessonpolicy/devSQLreceipt at7a9d979, bothremote branches contain exactsource; origin/main d62fc69 ahead1 onlyLAST_UPDATED.txt (fetch/diffverified). Handoff35515 exit0/treeHash23f400bd31e0: fullcontracts/backendtest/vet/emptyformat, lessons explicitlyskipped notpassed. This is actual externalGitAgent synchronization compatibility evidence, not new hostedgreen.

Newdiscovery latestprior-docCI39613327377 on6dadafc FAILED: SQLjobsuccess, verify119267676005 keyzoomfixture TypeError null.style atkeys-browser-probe96 afterPage.navigate; desktop/phonepass, defaultoffskipped. Actualsource dereferences document.documentElement (earlier commentary saidbody imprecisely); navigationcommandreturn doesnotmeanrootready. Hume readonlydiagnosisagrees expectedURL+fixturemarker+root/bodyguard andatomiczoomassignment needed, then effectivezoomassertion. NewR171notproductdefect. Next extractsmallboundedprobehelper, deterministicactualexpression regression foraboutblank/missingroot/ready/neverready, actual3viewproductionprobe, review/checks/handoff then hostedCI. No app/Go/SQL/runtime/credential change intended; expectedfiles probes/helper/tests/register/verification/coordination/review only. No taskprocessrunning, Dockerengine staysrunning, quotaunavailable. PreviousdevSQL fullyapplied/verified perreceipt; no reapply. Workers andproductiongates unchanged.

## Handoff: LESSON-POLICY-001 / KEYS-RECOVERY-001 / KEYS-STAGE-001 (Codex, 2026-10-21)

Status: **implementation and independent review complete; final normal verification/Git receipt pending; development SQL applied and catalog verified; runtime not activated**. Owner Codex, read-only reviewer Hume REVIEW-021. Branch main, base/current6dadafce0ac18e108a57ef514aa4d9575c7f0cd0; resulting source explicitly uncommitted until Git Agent synchronization. Scope is this bounded batch, not whole-migration completion. Prior source baseline hosted39609303873 is green; no new hosted result claimed yet.

Completed: owner tutorial policy generates lessons but skips default solution test/vet/build; explicit --lessons/manualCIverify_lessons retained, skip truthfully null/notpassed. R170 stale success proof reproduced red and corrected before normal verification; five actual isolatedCLI regressions pass with fakecommands. ExistingR142 overlap remains open. Bounded Go RecoverCompletionPage validates onepage, explicit1..100rows/positivebudget<=30s, exactknownreceipt retry only, unknownpending/freshscan, partialcursor/failfast/sanitizederrors, no scheduler/reservation/provider/runtime. Newlesson44fivefiles generated/gofmt/source-reviewed only; no tutorial test/vet/build or existingexercise edits.

External completed action: owner approved quoted0USD/month Mumbai/orgcreation, then exact additiveSQLhashce091529781d5a6522431cef4bcbaca6540f04d16383d695fe7e9bc7aa16b211 on isolateddev ONLY. Project sefgh-migration-dev/refmraglhrenqwadegvwxts/orghithuduntbsajjhmnntm ACTIVE_HEALTHY/PostgreSQL17.11. SQL applysuccess/version20261021174847/namekeys_001_hashed_lifecycle; original sourcefilename20261021063751 retained, do NOT reapply. All6committedcatalogqueries runread-only:24directrole/tabledenials+RLS,9invokerwrappers3owner/6accountant,restrictedrole/SETmembership,0unrelatedrelations,only6accountantwrappers amonginspectednonsystemfunctions.23deployedfunctionbodiesmatchreviewedSQL(normalizedlineend/trim),policycount0. PublicJWKS200publishesES256/ECmetadata; no usertoken/signingsecret/credentialprovisioning inferred. JSONreceipt and stagingrunbook persisted. OriginalUserDB/RepoDB untouched; no policyseed/testusers/runtime/legacyprivilege/revocation/production/provider/worker action.

Actual23changedfiles: .github/workflows/backend-verification.yml; AGENTS.md; backend/README.md; backend/internal/apikey/recovery.go,recovery_test.go; docs/adr/0002-go-backend.md; docs/backend-map.md; docs/bug-register.md; docs/claude-review.md; docs/coordination.md; docs/database/keys-001-review.md,keys-staging.md,keys-staging-catalog-2026-10-21.json; docs/plans/playground-keys.md; docs/verification/keys-recovery.md; learn-go/README.md; learn-go/44-bounded-receipt-recovery/{README.md,types.go,exercise.go,solution.go,exercise_test.go}; scripts/agent-handoff.mjs; scripts/contracts/handoff-lessons.test.mjs. SQL source unchanged. Register170entries,92fixedlocally/76open/1inprogress/1ownerdeferred; R039open, routecount23/25 unchanged.

Writer checks: first stub7recoverygroups failed as expected; final12groupspass, packagevet/emptybackendgofmt; initialbroad35backendpackages uncachedtest/vet/format exit0 beforelasttestdelta; strictlint exit0 (existing baseline-browser-mapping age notice); allchangedMarkdown104localtargets valid, Nodesyntax/diffpass beforethisreviewrecord. Reviewer independently5CLI/fullapikey/updated12recovery/vet/format/syntax/diff, source/docsaccepted. No localrace (noCcompiler), no newlocalproductionUIbuild/browser (UIunchanged), no real lesson execution. FullNodecontracts+finalbackend verification will run normalhandoff now. Failurepath invalidates oldsignal; externalwatcher skipcompat remains to be established byactualsync.

Remaining gates: narrowly scoped accountantJWT provisioning/rotation/expiry and effectivegatewayroles; explicit testpolicy/isolatedtwoidentities and actualanon/userA/userB/accountantgatewaytests; productionpolicy/retention/unknownoutcomes/recoverystartupwithadmissionsdisabled; preview/runtime/forwarding/rollback/cutover. Owner chose rotationtov1, revokeoldkeysonlyapprovedcutover. R143legacyproposal and productionSQL requireseparateapproval. Workersstaygatedwhiledeployment/corpusunknown. Nextboundedtask: trusted accountant capability and test-policy/gateway acceptance preparation on this exact devref, never broadencredential/fallback. Nextcommand: npm run handoff (defaultlessonskip), then inspectGitAgentcommit/remotes/hostedCI. Alllocaltasktest/browser/build/containerprocesses exited, Dockerengine remainsrunning; accountquotaunavailable. Writerreleased: yes.

## Active checkpoint: LESSON-POLICY-001 / KEYS-STAGE-001 (Codex, 2026-10-21)

Milestone6/postapply: owner-approved devSQL appliedonlymraglhrenqwadegvwxts/version20261021174847. All6committedverificationqueriesread-only:24directtablechecksdenied/RLStrue,9invokerRPCsexpected3owner/6accountant,accountantNOLOGIN/NOINHERIT/NOBYPASSRLS,authenticatorSETtrueINHERITfalse,unrelatedrelation0/othercallableonly6wrappers. All23deployedprosrc matchreviewedSQL(normalizedCRLF/trim),policycount0. Secretfreecatalogreceipt docs/database/keys-staging-catalog-2026-10-21.json persisted; currentstaging/plan/ADR/map/review/evidence updatedfromunappliedtodEVapplied. A local result-wrapper parser initiallymatched prose, failedbeforeanyquery/mutation; correctedanchoredparser, no DDLretry. Remaining actualgateway/twousers/accountantprovisioning/policy/retention/recoverystartup/runtime/legacycutover. No testidentities/JWTs/providers/workers/productionwrites. Hume finalreceipt reviewpending; nextfocusedfinaltest+contracts/handoff aftercompletedbatch. ActiveCodex/base6dadafc.

Milestone5/applyreceipt: exact owner-approved additive SQL rehashedce091529..., collisionpreflight stillclear, applied successfully viaSEFGH MCP to devmraglhrenqwadegvwxts ONLY. apply_migration keys_001_hashed_lifecycle success=true; list_migrations records20261021174847. File name version20261021063751 differs from hostedassignedversion; preserveboth, no rename/reapply. Postapplycatalog/effectivegrantverification NOW pending; next execute committedkeys_001_verify.sql queriesread-only and compareexpectations. No policyseed/credential/testusers/runtime/legacy/productionchange. Do not rerun migration (collisionintentional). Localtests exited, Hume reviewpending. ActiveCodex/base6dadafc, taskinprogress.

Milestone4/pre-apply: owner explicitly approved exact additive SQL hashce091529781d5a6522431cef4bcbaca6540f04d16383d695fe7e9bc7aa16b211 on development mraglhrenqwadegvwxts ONLY, excluding policy/credentials/legacyprivileges/production/runtime. No apply yet at this checkpoint. Next rehash+collisionpreflight, MCPapplymigration then read-onlyfullverification and migrationreceipt. Broadwriterbackend go test -count=1 ./.../vet/emptygofmt session65057 exit0 (beforelasttestdelta); strictlint0,101documenttargetsvalid,Node syntax/diffpass. Hume finaldelta/stagingdocreview stillrunning. SQL/runtimegates otherwise unchanged; no tasklocalprocess left. ActiveCodex/base6dadafc/accountquotaunavailable.

Milestone3: isolated Supabase project independently rechecked ACTIVE_HEALTHY/PostgreSQL17.11. Read-only catalog confirms Auth prerequisites/pgcrypto/extensions and no key collisions/applicationtables; migration list empty. docs/database/keys-staging.md records exactreviewhashes and staged sequence, SQLapplyapprovalquestion nowpending. Sharedplan/ADR/map/backend/review/register updated for rotation and recovery. Hume accepted unwiredsource (12thbounded edge test added afterward; finaldelta review pending); production apikey11groups+fullpackage/vet reviewerpass,5CLIpass. Writer lint exit0 (existing baseline-browser-mapping age notice only); fullbackendtest/vet session65057 stillrunning, no lessonexecution. New44lesson source generated/gofmt only. No SQL/policy/JWT/users/env/runtime/legacy/worker action. Actualchangedfiles Gitstatus authoritative; next fullchecks/docsreview then normalhandoff only on completedreleasedbatch. Base6dadafc/activeCodex/quotaunavailable.

Milestone2: owner explicitly confirmed quoted0USD/month and creation target. SEFGH MCP first create required a confirmation ID, obtained only after that approval; project sefgh-migration-dev created2026-10-21T16:16:41Z, refmraglhrenqwadegvwxts, orghithuduntbsajjhmnntm, Mumbai/ap-south-1, reported ACTIVE_HEALTHY. No SQL/policy/role/JWT/user fixture/runtime/legacy mutation; key SQL still review-gated. Next read-only target/config check and durable staging review runbook. Local bounded recovery11groups pass incl100unknown/laterreceipt/freshscan, exactHTTPRPC retry, deadline/cursor/partial failure; no provider/reservation operation. Newlesson44 generated only; existing exercises untouched, no tutorial tests/vet/build. R170 stale signal repro red then fixed; focused5CLI tests pass with fakecommands. R142 overlap remains distinct/open. Hume reviewing final source; productionchecks/handoff pending. Newactualfiles include lesson44fivefiles plus index. Parent no task process/provider; activewriterCodex/base6dadafc.

Milestone1: default lesson skip and explicit opt-in implemented in handoff/CI/shared rules; four isolated CLI regressions pass using fake commands (no real tutorial execution). Hume read-only review found stale success proof after later explicit failure (separate stale-proof defect R170; R142 remains open); correcting with sequence regression before handoff. Owner selected sefgh-ai's organization hithuduntbsajjhmnntm. SEFGH get_cost quoted project0USD/month; explicit quoted-cost/create question pending, no creation or SQL apply. New bounded completion recovery helper/test files currently stub/red: go test -count=1 ./internal/apikey -run TestRecovery failed as expected7groups/7malformed subcases; next implement narrow Pending+Complete-only function, validate full page, exact known receipts, unknown left pending, explicit row/time limits and failure-safe cursor. No scheduler/runtime/provider registration. Lesson44 not yet generated. Actual changed: workflow,AGENTS,learn-go/README,handoff script+new CLI test,coordination,new backend recovery.go/recovery_test.go. Parent red test exited; no task app/browser/container/provider running. Base/current6dadafc, active Codex, account quota unavailable. Remaining review, production checks, staging/runbook and Git Agent handoff gates open.

Status: **in progress / incomplete**. Owner explicitly continued; base/current6dadafce0ac18e108a57ef514aa4d9575c7f0cd0, main clean before claim; previous writer none. Owner2026-10-21: generate/update Go lessons with development, keep exercise sources, stop continuous/repeated lesson testing; lesson tests optional rather than default handoff/CI gate. Production contracts/backend checks retained. New owner decisions: separate development/test Supabase project; worker deployment still unknown and execution gated; rotate to v1, revoke old plaintext keys only at a separately approved cutover.

Read-only SEFGH MCP lists only active User-DBkohwfuxqbllsmvmsfqci and inactive Repo-DBkiadrbqkkmncoblpcobo, same organizationhithuduntbsajjhmnntm; no dev target assumed or unrelated DB repurposed. No create/apply/role/key/row action. Need organization selection and actual tool-quoted cost confirmation before project creation per MCP rules, then SQL review before apply. Continuing independent local policy/acceptance preparation meanwhile. Expected files AGENTS,learn-go/README,scripts/agent-handoff/tests,workflow and shared key plan/staging records; actual changed onlycoordination at claim. No existing exercise edit, Go/source rollout or deployment. Parent no task server/test/container; account quota unavailable. Next: optional truthful lesson skip signaling+regression; dev inventory/cost path; next bounded key recovery/acceptance work after source inspection. Checkpoint every milestone/10min.

## Handoff: CI-BROWSER-001d final hosted receipt (Codex, 2026-10-21)

Status: **complete for this bounded batch; reviewed and locally/hosted verified; not activated or deployed**. Whole migration remains active under existing gates. Owner Codex, reviewer Hume read-only REVIEW019/020. Branch main base/current622f7c3bce0c70679862bba22ffdce565e81739f. UI source6a1ee1a and fixture correction622f7c3 committed by Git Agent and on both remote branches. Final receipt changes documentation only, explicitly uncommitted until Git Agent synchronization. Previous normal handoff20380 exit0/treeHashbf7f5d077e71, all1505contracts/35backend/44lesson checks passed.

Confirmed hosted39609303873 https://github.com/sefgh-ai/sefgh-main/actions/runs/39609303873 on622f7c3 is overallSUCCESS. verify119253652382 SUCCESS and keys-postgres119253652570 SUCCESS. Logs:1505tests/pass,0fail;152/152 direct-vs-forwarded; Phase2 acceptance69requests/6gates; Chrome155.0.8059.84 ready1118ms; trending7checks eachdesktop/phone; keys desktop/phone/zoom200 pass; separate default-off production build/browser stepSUCCESS. SQL120native checks pass. Linux backend race/vet and44lesson solutions pass. This supersedes failed39606408872 for corrected source acceptance, without erasing its actualR169failure/defaultoffskip. R155 probe now verified under separate bounded readiness; earlier8055ms launch also passed. No unique D-Bus/solely-timeout claim, no sandbox change.

Completed current scope: bounded Chrome diagnostics/readiness, default-off strict show-once playground/client/public-search testing/reference, owner/session/unmount/ambiguous-write controls, CookieBar narrow/zoom correction, and corrected CI fixture. R052/R155 statuses reconciled; R158-R169 fixed locally/verified and source commits recorded. Register169 entries;91fixed (local status, not necessarily deployed),76open,1inprogressR077,1owner-deferredR067. Planning estimate requested by owner: roughly40percent overall work remains, not a measured checklist percentage. API route code separately23/25 (92percent); no inference of whole completion or production cutover from that count. Next substantial work includes key SQL/provisioning/runtime/recovery/legacy gates, per-domain hosted isolation/realtime/rollout, RepoSync/chosen workers, openbugfix/ownerdeferral and Phase7retirement.

Actual final receipt files: docs/coordination.md, docs/bug-register.md, docs/verification/browser-startup.md, docs/verification/playground-key-ui.md, docs/database/keys-001-review.md (completed UI gate wording). Documentation target/register/diff checks next; normal handoff repeats standard suites solely to synchronize updated receipt. Prior source acceptance is exactly622f7c3; a later documentation-only CI run is separate and may be queued, not falsely called green. No app/Go/SQL/env/runtime changes after green code run;44lessons unchanged, owner's exercises untouched.

Remaining gates unchanged: owner SQL and separateR143 review before apply; trusted accountantJWT signing/provisioning/rotation/effective grants, explicit policy/expiry/retention/recovery, hosted anonymous/userA/userB/accountant gateway proof, legacykeytransition; explicit runtime/forwarding/preview/rollback/cutover. Workers remain owner-gated pending authoritative deployment/corpus/provider selection. R039 staysopen. No live SQL/rowdata/credentials/provider/worker action. Local task processes all exited; Docker engine remainsrunning. Account quota unavailable.

Next bounded task: read AGENTS/currenthandoff/keysreview; inspect status/log/diff, claim writer. Resolve concrete SQL/provisioning/policy/legacy gates before registering/enabling key runtime. Other independent preview/isolation or approved UI/backendbug tasks may proceed in checkpointed batches; do not execute workers by inference. Next current command npm run handoff after docchecks, then inspect Git Agent final receipt commit/remotes; stop this batch with writer none. Writer released: yes.

## Active checkpoint: CI-BROWSER-001d hosted receipt (Codex, 2026-10-21)

Status: **in progress / incomplete**. Clean main at622f7c3bce0c70679862bba22ffdce565e81739f before reclaim; previous writer none. Git Agent committed6file R169 correction622f7c3 and pushed both branches (exact remote tips622f7c3 verified). Prior UI source6a1ee1a preserved. Normal handoff20380 exit0,1505contracts/35backend/44lesson checks; treeHashbf7f5d077e71. Hume accepted REVIEW020; local actual3view corrected production probe55014 passes. No product/Go/SQL change in fixture correction.

Replacement hosted39609303873 https://github.com/sefgh-ai/sefgh-main/actions/runs/39609303873 on622f7c3, verify119253652382 / keys-postgres119253652570 starting. Previous39606408872 failedoverall duefixtureR169, successful Chrome8055ms and allprekey checks; defaultoffskipped. Next concrete read: temp sefgh-key-ci-status.mjs, then bounded job logs on completion. Need wholeenabled/defaultoffgreen before final receipt. Actual changed file onlydocs/coordination.md; no parent test/build/browser/server/container/provider/worker, Docker engine remains running. No SQL/provision/policy/runtime/activation/legacy/cutover action. R155 arrangement alreadyworks once, uniqueD-Bus causenotestablished. Account quota unavailable. Preserve gates, record actual hosted outcome/release; reclaim rule satisfied before this edit.

## Handoff: CI-BROWSER-001c / BUG-018 (Codex, 2026-10-21)

Status: **implementation complete; independently reviewed; locally verified; replacement hosted verification pending**. Owner Codex, reviewer Hume read-only REVIEW-020. Branch main, base/current6a1ee1a07f9ed5529f84947a803c5b8e18b59242; result explicitly uncommitted/Git Agent pending. Original22file UI batch committed6a1ee1a, on both remotes; main2e58852 verified ahead1/behind0 with onlyLAST_UPDATED.txt. Prior normal handoff30683 exit0/treeHash980e49b9e095,1505contracts/35backend/44lesson checks pass.

Hosted39606408872 overallFAILED: keys-postgres119243611813 success; verify119243611350 passed lint1505contracts/race/vet/44lessons/build/152forwarding/Phase2/trending browser. Chrome155.0.8059.39 readiness8055ms, desktop/phone assertions pass. New key fixture prematurely clicked disabled Revoke while metadata recovery was pending. No DELETE/dialog resulted; default-off step skipped. R169 regression identified test synchronization, not a product authorization/revocation failure. Serial45s browser startup arrangement works on observed runner; no unique D-Bus or solely-timeout cause inferred.

Fix is fixture-only: wait for enabled rendered controls, specific revoke selector, deliberately deferred metadata response, assert product disables revoke then wait for correct release. Existing modal-error/focus/revoke assertions retained. Parent actual production probe55014 exit0 desktop/phone/zoom200, focused lint0, syntax/diff pass. Hume accepts source and independently syntax/diff pass; no reviewer browser or live claims. No app/Go/SQL/env/runtime/lesson change. Originalroutes23/25,44Go lessons andSQL/rollout/worker gates unchanged.

Actual changed files6: scripts/keys-browser-probe.mjs; docs/coordination.md; docs/bug-register.md; docs/claude-review.md; docs/verification/browser-startup.md; docs/verification/playground-key-ui.md. Register169unique IDs. All parent builds/tests/browser/server/fixtures exited, no task containers/providers/workers; Docker engine remains running. Account quota unavailable. Next concrete command npm run handoff with user Go path/GOFLAGS=-p=2; inspect Git Agent commit/remotes and replacement whole CI including previously skipped default-off. Do not end at prior failed run or attribute reviewer checks to parent. Overall hosted verification continues after this bounded handoff. Writer released: yes.

## Active checkpoint: CI-BROWSER-001c hosted verification (Codex, 2026-10-21)

Milestone2: corrected actual protected production probe55014 now exits0 desktop/phone/zoom200 including deliberately deferred metadata refresh and enabled-Revoke synchronization. Focused lint0/Node syntax/diff pass. No app source changed or assertions removed. Hume read-only review pending; then evidence/register finalization, normal handoff and replacement whole CI. Actual files now also docs/verification/browser-startup.md and playground-key-ui.md. R155 first hosted startup success recorded separately from overallFAILED39606408872; default-off step skipped. Parent fixture/build/browser/server exited, no task SQL/container/provider. Base6a1ee1a, writerCodex, no live/Go/lesson changes. Next bounded action final reviewer reply, handoff; account quota unavailable.

Milestone: hosted39606408872 finishedFAILED, SQL and all prior verify steps including trending browserSUCCESS. Chrome measured8055ms, version155.0.8059.39; serial45s/json/version arrangement works, previous8s window insufficient in this observed launch, no unique D-Bus cause established. New enabled key fixture failed Confirm revocation wait: its direct click happened while recovery metadata refresh still disabled Revoke; product correctly serialized it. R169 recorded. Fix fixture only: click helpers wait enabled/visible, exact selector for revoke, deliberate deferred-list/disabled-action regression. Actual changed files now coordination, bug-register and keys-browser-probe; app/Go/SQL untouched on6a1ee1a. Parent local new on-build/probe next; normal handoff only after review/regression. Default-off hosted step was skipped, not passed. All prior CLI/server/browser/container processes exited, no provider/worker. Next: run corrected actual UI fixture, focused lint/syntax, Hume review, update evidence and handoff; new CI must be wholly green.

Status: **in progress / incomplete**. Writer Codex reclaimed after clean status/log/diff, previous writer none. Base/current6a1ee1a07f9ed5529f84947a803c5b8e18b59242 main. Git Agent committed22file completed UI/diagnostic batch at6a1ee1a, present on both remotes; origin/go-backend6a1ee1a and origin/main2e58852 timestamp follow-up. Normal handoff30683 exit0 with1505contracts,35backend packages/test/vet/format and44lesson solutions; treeHash980e49b9e095. Fullstrictlint0 and actual on/off production browser evidence in prior handoff/REVIEW019. No source change after that acceptance.

New hosted39606408872 https://github.com/sefgh-ai/sefgh-main/actions/runs/39606408872 on6a1ee1a running: verify119243611350 and keys-postgres119243611813. Next concrete read: node temp sefgh-key-ci-status.mjs (secret-free authorized Git credential helper); then bounded job-log failure/readiness extraction. R15545s readiness experiment remains open, no sandbox cause inferred. Current actual changed files docs/coordination.md only; no parent test/build/browser/server/container running, Docker engine remains running. Do not emit completion hook until hosted scope is resolved or explicitly checkpointed incomplete. No SQL/policy/accountant provisioning/newruntime/environment/legacy transition/worker changes. Originalroutes23/25. Account quota unavailable. Next: exact hosted Chrome readiness/result plus enabled/default-off UI checks; fix confirmed failure if any, then durable final receipt and release. Overall migration remains subject to existing gates.

## Handoff: KEYS-UI-001 / BUG-017 and CI-BROWSER-001b (Codex, 2026-10-21)

Status: **implementation complete; independently reviewed; locally verified; hosted verification pending**. This bounded UI/diagnostic batch is complete; whole migration and R155 hosted investigation continue after Git synchronization. No runtime/SQL/rollout activation.

Owner Codex, reviewer Hume read-only REVIEW-019. Branch main, base/current791b4719ba5199091270ec42f48cbf27e77b9c28; result explicitly uncommitted/Git Agent pending. Prior diagnostics committed791b471 and present on both remote branches. No reset/clean/stash or owner exercise edit.

Completed: separate default-off show-once playground, strict owner/session metadata client, one-attempt creation with ambiguous-write refresh gate, canonical pasted-key-only public search, secret lifetime/focus/clipboard handling and truthful reference. Fixed R158-R168 after actual browser/independent review regressions. CookieBar narrow/zoom action visibility corrected without changing consent policy. No legacy fallback, browser usage write or arbitrary testing destination. NEXT_PUBLIC_SEFGH_KEYS_V1=1 is a build-time UI selection only, never enabled in live configuration here. No Go registration/forwarding added; missing endpoint fails closed. Original route count23/25;44Go lessons unchanged because no Go changed.

CI-BROWSER-001b: actual791b471 hosted39601025772 passed PostgreSQL/race/vet/lessons/Next build/152forwarding/Phase2 but failed final Chrome. Bounded evidence shows alive child, ECONNREFUSED8s, D-Bus messages; no sandbox cause. Reviewed45s GET/json/version experiment records monotonic readiness before starting Next, subsequent target commands remain8s. No launch/sandbox flags or product timeouts changed. This changes timing and startup overlap; hosted success would establish that arrangement, not a unique cause. R155 remains open until actual result.

Actual changed files (22): .github/workflows/backend-verification.yml; .gitignore; eslint.config.mjs; next.config.mjs; src/app/{playground,api-reference}/page.js; src/components/CookieBar.jsx; src/components/playground/{PlaygroundHeader,V1Playground}.jsx; src/lib/playground/keys-client.mjs; scripts/{keys-browser-probe,trending-browser-probe}.mjs; scripts/contracts/{keys-client,browser-startup}.test.mjs; docs/{coordination,bug-register,claude-review,backend-map}.md; docs/plans/playground-keys.md; docs/adr/0002-go-backend.md; docs/verification/{playground-key-ui,browser-startup}.md. No SQL/backend/lesson/env file changed.

Checks actually run: final1505/1505 Node contracts; full strictlint0 after R168 ignore correction (prior19115 full lint failed generated-chunk ENOENT; focused lint passes were separate). Production flag-on build and enhanced actual desktop1280/390px/200percent CSSzoom browser probes pass, zoom applied before flows. Tests cover owner/chunked-cookie switch, pending create/search/navigation, exact pasted bearer, no legacy calls, ambiguous no-retry, metadata-only/404, revoke failure/success/modal/focus, Enter/Tab/ShiftTab/Escape, truthful/deferred clipboard, reveal bounds and cookie-choice hit-testing. Phone/zoom reveal screenshots manually inspected. Separate final default-off production build/probe87508 exit0: legacy retained/no v1 mount/request. Local trending existing-production-build probe readiness417ms Chrome155.0.8059.85 plus7checks eachdesktop/phone pass. Doc targets,168unique IDs, syntax/diff pass. Baseline-browser-mapping/caniuse age notices remain informational. Hume independently13client tests,6startup tests, ignored-abort fetch/stalled body and cookie-filter probes/syntax/diff pass; no reviewer browser/SQL/live claims. Normal handoff now repeats unchanged backend35packages/test/vet/format and44lesson solutions alongside all contracts; do not assume its result before receipt.

Remaining gates: owner review additive SQL and separate R143 proposal before apply; policy/expiry/retention, trusted accountant JWT provisioning/rotation/effective grants, recovery scheduler, hosted two-user gateway/accounting, legacy plaintext transition, runtime/forwarding/preview/rollback/cutover. Worker execution stays gated pending actual deployment/corpus selection. R039 remains open; no production key/user/usage rows or signing secrets read. No account quota meter available.

Processes: parent builds/tests/browser/server/fixtures exited, no task container/worker/provider running; Docker engine remains running. Reviewer complete. Current files preserved. Next concrete command npm run handoff with user Go path and GOFLAGS=-p=2; inspect Git Agent commit/remotes and new hosted verification including UI on/off steps. Continue R155 based on actual45s startup evidence, reclaiming writer before edits; if CI succeeds record exact run and remaining runtime batch. Do not end overall user objective merely at local success. Writer released: yes.

## Active checkpoint: CI-BROWSER-001b, then KEYS-UI-001 (Codex, 2026-10-21)

Milestone3: original actual production v1 desktop/phone/zoom passed12groups each, caught R158 focus and corrected before that pass; screenshots then exposed existing CookieBar zoom/nav obstruction R166. Hume source review requested changes R159-R165/R167; reproduced post-dispatch/session cancellation/history/numeric failures with13client tests, corrected and now13pass. Search edits now invalidate generations, revoke errors are in-modal with explicit focus recovery. CookieBar layout corrected; synthetic harness now exact bearer, deletes stale SDKcookie chunks, uses chunked ownerB, zoom applied before forms, deferred clipboard and search-edit checks. New flag-on production rebuild/browser session96254 active; full rerun/default-off/review/CI still pending. Prior default-off build/probe61927 exited0 before latest source corrections. Actual changed files include CookieBar, workflow UI on/off steps, register now167IDs. No live SQL/roles/policy/route/provider/worker action, no Go or lesson edits. Next: actual enhanced browser results/screenshots, final source review, full local checks and normal handoff only on accepted completed batch. No claimed hosted green; R15545s experiment awaits new commit. Quota unavailable.

Milestone2:1501/1501 Node contracts pass; focused lint0 after ref-cleanup correction. Production flag-on build passed; synthetic browser probe setup initially had invalid test-JWT encoding (fixed), then early document access (fixed), now fails waiting for initial metadata: fixture/auth diagnosis in progress, no UI acceptance claim. Parent browser rerun session pending, no task SQL/container/provider. New actual files additionally .gitignore, next.config.mjs, scripts/keys-browser-probe.mjs and browser-startup.test.mjs. Date locale corrected to existing en-IN requirement; final UI build must rerun. No application/backend runtime environment changed.

Milestone: hosted39601025772 failed only final browser step, SQL/race/lessons/build/152forwarding/Phase2 all passed. Captured actual Chrome process alive/no exit, ECONNREFUSED8s, three D-Bus messages; no established sandbox cause. Added diagnostic45s GET/json/version before Next startup, monotonic elapsed/version validation, flags unchanged. Hume agrees this is diagnostic, not sole-cause proof. Continuing independent default-off UI while next hosted experiment awaits completed batch; nine new owner/session/metadata/credential/no-retry client tests pass. New client and V1Playground component wired under NEXT_PUBLIC_SEFGH_KEYS_V1=1 (unset/off in real environments); reference narrowed to supported scope and availability. No Go/SQL/runtime registration/rewrites. Focused lint found one effect-cleanup ref warning, corrected; rerun pending. Actual changes now coordination, trending probe, keys-client/test, V1Playground, playground/page, PlaygroundHeader, api-reference/page. Browser fixture/build/review/full checks remain, no completion claim. Parent no test/app/browser/container running (focused lint exited). Next: synthetic SDK-cookie production UI probe, account/pending/unmount/clipboard/revoke/overflow checks. Existing exercise files and rollout gates unchanged.

Status: **in progress / incomplete**, owner explicitly resumed; branch main, base/current791b4719ba5199091270ec42f48cbf27e77b9c28, clean before this claim. Git Agent committed diagnostics at791b471; source commit is on both remote branches (origin/main also timestamp-only1051476). Prior handoff26651 passed1491contracts,35backend packages/vet/format and44lesson solutions. New hosted39601025772: keys-postgres119225249700 success; verify119225250210 running backend race/vet at last observation. No claim of green CI or established Chrome root cause. Next: inspect bounded browser diagnostics from that run and fix confirmed cause, verify replacement CI; then default-off show-once playground/reference, meaningful client/security/browser checks and review.

Expected files: browser probe/workflow/tests only as evidence requires, then dedicated key client/components, playground/reference pages, browser fixture and shared docs. Actual changed files at claim: docs/coordination.md only. Parent no test/build/browser/server/container running; Docker engine remains running. SQL review/provisioning/policy/retention/legacy-transition/rollout gates unchanged, no live apply, new runtime registration or activation. Existing exercises untouched; no Go change yet. Hume recommended actual protected-page production fixture using SDK-generated synthetic cookies and loopback Auth, no test-only app route. Account quota unavailable. Checkpoint after milestones and before long checks.

## Handoff: CI-BROWSER-001a / BUG-016 diagnostics (Codex, 2026-10-21)

Status: **diagnostics implementation complete; independently reviewed; locally verified; hosted root-cause evidence pending**.

Final verification follow-up: R156 failure stdout now retained beside stderr at four handoff failure sites, with real isolated CLI red/green regression. R157 Linux PATH corruption reproduced in actual disposable Node24Linux container, fixed by Windows-only Go prefix/platform delimiter. Six final process/HTTP/CLI tests pass on Windows and Linux; pinned Node image91acba91b842bec0bf7ea6f5e09c644c7ccad72c4996ed9616d861d1c7cd60d4, workspace read-only/networknone/autoremoved. Linux also exposed retry overwriting oversized-protocol diagnostic with a timer; terminal size failure now preserves fixed reason and DOM timeout names remain readable. This does not establish the earlier unidentified handoff failure. Final full1491contracts and strictlint0 pass. Hume independently accepted final source and6Windows cases plus two temporary oversize/timeout checks; no reviewer Linux/hosted claims. All parent test/container/lint/browser processes exited; no fixtures left. Registry157IDs. Changed-file list additionally scripts/agent-handoff.mjs and scripts/contracts/handoff-errors.test.mjs. Normal handoff follows final record/release; no SQL/Go/app source or sandbox flags changed.

Milestone: first normal handoff failed at contracts but printed only generic stderr, losing Node failure stdout. Direct full rerun1490/1490 passes; exact transient failed assertion unavailable, not inferred. Reclaimed writer for bounded handoff failure-report regression/R156 before trying again. Will retain both output streams; no test skip or production timeout/sandbox change. Root Linux browser cause still pending diagnostics commit. Parent no app/browser/server running; source remains uncommitted on c802e67.

Milestone2: R156 real isolated CLI test reproduced missing stdout, fixed four failure-report sites; focused6tests and full1491contracts plus strictlint0 pass. Hume found Linux PATH corruption in existing Windows-semicolon Go prefix; source acceptance pending that correction. Pulling disposable official Node24 Linux image for actual red/green test (Docker session46890); no application/Go/SQL changes. scripts/agent-handoff.mjs + scripts/contracts/handoff-errors.test.mjs now also changed; bug IDs156/157 need final register/status. Existing diagnostics local14browser checks remain passed; no actual LinuxChrome cause yet. Next: LinuxCLI regression then handoff/CI diagnostics. Other parent check/lint/browser processes exited. Account meter unavailable.

Owner Codex, reviewer Hume read-only (REVIEW-018). Branch main base/currentc802e670087a3af9e709d968dff571129fe64787; resulting commit explicitly uncommitted/Git Agent pending. Owner explicitly resumed from paused checkpoint; two previous checkpoint edits preserved. This bounded handoff commits diagnostic instrumentation so CI can expose the actual Linux Chrome cause; it does not declare R155 or the larger migration finished. No sandbox/launch flags changed, no live SQL/runtime rollout.

Changes: scripts/browser-startup.mjs, scripts/contracts/browser-startup.test.mjs, scripts/trending-browser-probe.mjs; docs/coordination.md, docs/bug-register.md, docs/claude-review.md, docs/verification/browser-startup.md. Adds bounded4KiB stderr, exit/signal/spawn/elapsed/HTTP/error-code diagnostics, 8s overall/per-request deadlines,64KiB response bound, PID-aware cleanup. No environment dumps/response-error payloads/real browser profile. Existing desktop/phone UI assertions retained.

Actual checks: three missing-diagnostic/deadline tests failed before fix; five final real-process/HTTP regressions pass. Existing local production probe passed sevenchecks per desktop andphone. Full Node contracts1489 and strictlint0 passed before fifth regression; final normal handoff will count1490. Prior baseline-browser-mapping age stderr notice persists, no ESLint warnings/errors. Node syntax/diff pass. No Go/app UI/SQL changes or new lesson required. Hume independently passed four original committed cases plus five additional adversarial checks, syntax/diff; accepted for evidence collection. Suggested error specificity implemented and fifth regression passed. Actual Linux cause remains unknown until new CI, no false green claim.

Known hosted prior39565339360: SQL and backendrace/vet/lessons/build/152forwarding pass, final browserstartup fail. No new provider/DB/worker call. SQL/provisioning/policy/retention/legacy/cutover gates and owner decisions unchanged. Original route count23/25. Parent local probe exited, no task server/browser left running. Account quota meter unavailable.

Next concrete action: run npm run handoff with GOFLAGS=-p=2, inspect Git Agent commit/remotes and actual hosted diagnostics. Resume CI-BROWSER-001b with fresh writer claim on resulting commit, fix confirmed cause and verify CI before show-once playground/reference work. Overall user objective remains active across this bounded diagnostic handoff. Do not infer acceptance from code instrumentation. Writer released: yes.

## Implementation history: CI-BROWSER-001 / BUG-016 and KEYS-UI-001 (2026-10-21)

Status: **in progress / incomplete; owner explicitly resumed**. Branch main, base/currentc802e670087a3af9e709d968dff571129fe64787. Read AGENTS/checkpoint and inspected status/log/diff; previous writer none, reclaimed before edits. Existing changes only docs/coordination.md and docs/bug-register.md saved by prior pause, preserved. No new verification assumed from old results.

Scope: (1) diagnose R155 with bounded browser stderr/exit/HTTP diagnostics, reproduce and fix actual startup cause without guessing sandbox changes; verify local probe and hosted CI; (2) build default-off show-once playground/reference using reviewed v1 lifecycle and session boundary; (3) meaningful browser/contract checks and durable handoff. SQL stays review-only/unapplied, policy/role JWT provisioning and actual gateway/rollout/legacy-transition gates remain. No provider/worker execution or route cutover. Existing exercise.go files untouched. Keep one writer, reviewer read-only; work in checkpointed bounded milestones.

Expected files: scripts/trending-browser-probe.mjs and a bounded process/DevTools helper/tests if useful; .github/workflows only if evidence requires runner changes; src/components/playground and dedicated key-client/runtime config/contract tests for default-off UI; shared plan/ADR/map/register/review/verification/coordination as needed. Actual changed-file list currently just the two saved checkpoint docs. Parent no test/app/browser process at resume; Docker engine previously left running, no fixture container. Next concrete edit: browser launch diagnostics and regression before selecting fix; then hosted result, key UI inspection and implementation. Prior source commits732d0dc/c802e67 and failed39565339360 remain attributed historical evidence below. Account quota meter unavailable; checkpoint after milestones/before long operations/every10minutes.

## Paused checkpoint: migration / CI-BROWSER-001 (Codex, 2026-10-21)

Status: **paused / incomplete — owner requested immediate stop because usage limit is imminent**. This supersedes the completed bounded-task handoffs below for current ownership/work status. No account quota percentage is visible or inferred. Resume only on explicit owner instruction.

Objective: continue the staged Go migration in larger verified batches, retaining shared Codex/Claude coordination and growing learn-go. Current writer none; last implementation owner Codex, reviewer Hume read-only. Branch main; turn base660a508ca85cea5c09c9ff440c622848c0ff5745; currentc802e670087a3af9e709d968dff571129fe64787. Just before this checkpoint git status was clean. Git Agent committed original36file KEYS-DB-001 at732d0dc and CI-harness/lesson43 correction atc802e67. Both source commits are on both remote branches. Verified origin/go-backend=c802e67; origin/main=966c6a9099334b6e3fa17ec1ccd3a404ac2b602d (timestamp-only commit afterc802e67). No reset, clean, stash or partial implementation commit.

Completed: SEFGH MCP catalog access works on expected User-DB kohwfuxqbllsmvmsfqci;16catalog-only evidence sections persisted. Additive private SQL lifecycle/nine RPCs, atomic quotas, owner-bound Go manager, separate restricted accountant, safe receipts/keyset recovery/history pages, review docs and lessons42/43 are committed. No policy seeded, live SQL applied, credentials provisioned, new runtime registered or endpoint activated. Existing original route implementation count23/25 (92% of route files, not whole migration). SQL/provisioning/UI/cutover and full migration remain unfinished.

Actual checks/results:
- Native PostgreSQL17.6 actual proposal120assertions pass locally; after readiness correction both launcher and immediate direct cold-start runs each120pass. Role/owner denial, concurrent quotas, issuance cap, post-lock expiry/policy stability, receipt conflict/idempotency, >100paging, finite JSON/time, transactional failure/collision/rollback and legacy hardening checks covered.
- Final Windows normal handoff57872 passed contracts1485, backend35packages/test/vet/format and44lesson solutions, writer release; emitted signal with treeHash4275299d2d4b. Prior normal handoff98161 also passed. Additional backend build, lesson ordinary/solution builds/both vets, strict lint0 and doc/index/register checks passed as recorded below. Existing exercises untouched;42/43 intentionally fail until owner completes them.
- Hume accepted REVIEW-016 runtime SQL/RPC foundation and REVIEW-017 readiness/atomic test fixes; independent apikey/lesson tests/vets/repeats/format and Node/PowerShell syntax. Native assertions are Codex-run; no reviewer live calls. No local C compiler, so local race unavailable.
- Initial hosted39563561717 failed fixture startup R153 and test-counter race R154. Corrected in c802e67.
- Replacement hosted39565339360 on c802e67: **overall FAILED**. Native keys-postgres job119106144499 SUCCESS; verify job119106144161 passed lint/contracts, Linux backend race/vet,44lesson solutions, production Next build,152/152 forwarding comparisons and Phase2 acceptance69requests/6gates. Final existing trending browser step FAILED before UI assertions: DevTools not ready /json/new?about:blank. Do not call this run green. See https://github.com/sefgh-ai/sefgh-main/actions/runs/39565339360 .

Current unresolved issue R155: scripts/trending-browser-probe.mjs launches headless Chrome with custom profile but ignores stderr/process startup errors, then gives an opaque DevTools timeout. Root cause is NOT established. No sandbox flag/configuration, browser source or app UI was changed. Hume was asked to diagnose read-only, then explicitly sent an interrupt/stop request when the owner paused; acknowledgement/final diagnosis not yet observed. Do not claim another agent read this checkpoint or stopped without evidence.

Actual uncommitted files after saving this checkpoint: docs/coordination.md and docs/bug-register.md only. R155 recorded open and register now155entries. No partial application/SQL/Go edit or currently running parent test/build/browser/server. Temp CI-status helper and prior logs remain under the Windows temp directory; helper contains no stored credential, retrieves authorized Git credential transiently for status reads only. All owned PostgreSQL containers removed; Docker Desktop engine remains running. No worker/provider task started. No long operation is being left running by Codex.

Outstanding gates/decisions: owner reviews docs/database/keys-001-review.md and separate R143 TRUNCATE proposal before any apply; actual trusted accountant JWT signing/provisioning/rotation, effective unrelated privileges, policy limits/expiry/retention/recovery, hosted gateway/two-user proof, legacy plaintext transition, show-once playground, runtime/forwarding/preview/rollback/cutover. Worker execution remains explicitly owner-gated pending deployment/corpus selection. R090 remains scheduled for Go after cutover. No live user/key/usage rows or signing secrets were read/copied; no service-role CRUD fallback.

Next concrete resume action: read AGENTS.md and this checkpoint, run git status --short and git log -3, verify writer none and inspect the two checkpoint diffs, then claim writer before edits. Inspect failed browser job119106144161 logs and add bounded Chrome stderr/exit/readiness diagnostics before selecting any runner fix; do not guess or disable sandbox blindly. Verify the browser startup/desktop+phone assertions and replacement CI, then return to the default-off show-once playground/reference and runtime configuration under the existing gates. Hosted SQL/race successes already establish their fixes; keep failed-browser evidence separate.

STOP RULE: no npm run handoff, completion signal, commit, push or synchronization for this paused/incomplete checkpoint. Preserve both documentation changes uncommitted. No further implementation until explicit owner resume. Writer released: yes.

## Handoff: KEYS-DB-002 / BUG-015 (Codex, 2026-10-21)

Status: **implementation complete; independently reviewed; locally verified; not enabled or deployed**.

Owner Codex; reviewer Hume read-only accepted both corrections (REVIEW-017), no remaining blocking source finding. Branch main; clean base/current732d0dcbe9ae1d9af705fd6c3eb7f6d713fa5d97; result explicitly uncommitted at this record. Git Agent committed original36file KEYS-DB-001 at732d0dc and pushed both remote branches; origin/main also timestamp-onlyd538936 (verified diff onlyLAST_UPDATED.txt). That task's normal handoff98161 passed contracts/backend/43lessons and emitted2026-10-21T07:36:55Z signal. No source/SQL/runtime activation changes in this follow-up; only test counter, fixture readiness and lesson/docs.

Hosted39563561717 failed: keys-postgres job119100316463 observed temporary unix-only PostgreSQL initialization server before its stop, then bootstrap lost socket; verify job119100316408 found the plain calls counter race in ambiguous/hijacked test (rpc_edges_test lines74/92). Full run is failed, not green. Parent inspected failure logs through authorized existing Git credential helper API without outputting credentials; GitHub connector returned404. Both actual CI failures are corrected/regressed locally, replacement hosted verification remains the next gate.

Completed: wait for TCP127.0.0.1 final server in CI/PowerShell and central native runner before any SQL, bounded probes, no partial-bootstrap replay. Pinned entrypoint source confirms temporary listener has empty listen_addresses. Test counters use atomic Add/Load in handler/assertion/diagnostics. Added lesson43/exercise/solution/tests/index; existing exercise files untouched. R153/R154 fixed locally;154unique contiguous IDs. Prior SQL/RPC runtime hashes/acceptance unchanged, policy missing, no credential provisioning or live SQL. R143 hardening remains a reviewed proposal only. Exact original routes23/25, not a full-migration percentage.

Changed files: `.github/workflows/backend-verification.yml`; `backend/internal/apikey/rpc_edges_test.go`; `scripts/{keys-postgres-test.mjs,run-keys-postgres-test.ps1}`; `learn-go/README.md` and `learn-go/43-atomic-test-counters/{README.md,exercise.go,exercise_test.go,solution.go}`; `docs/{coordination.md,bug-register.md,claude-review.md}`, `docs/verification/keys-db.md`, `docs/database/keys-001-review.md` (review status wording).

Actual checks: wrapper cold fixture120assertions pass; immediate direct invocation (without external readiness wait)120assertions pass; all owned containers removed by verified label cleanup. Corrected RPC test10repeats/vet pass. Lesson43 solution tests, ordinary/solution build/both vets/format pass; its untagged exercise has one expected positive-count failure without panic. Strict lint0 (preexisting baseline-age stderr notice only), Node syntax, lesson index,154ID and diff checks pass. Prior final backend35packages and43lessons broad checks passed on732d0dc before these harness-only corrections. Normal handoff below repeats full contracts/backend/now44lesson solutions after release.

Reviewer independently passed RPC25repeats/vet, lesson43 solution tests/ordinary+solution builds/both vets/format/diff/index, Node syntax/PowerShell parse and readiness diff. No local C compiler/CGO, no local -race claim; replacement Linux CI is required. No reviewer Docker/live calls. No current failing application/local check; new exercises intentionally unfinished. Readiness-source review hashes and SQL/runtime hashes in review record are unchanged.

Processes at release: all parent test/compiler/lint/native processes exited, Hume review complete; no task server, worker or fixture container. Docker engine remains running. Account quota unavailable. Current files preserved; no live SQL/data/provider or deployment action. No key/user/usage values read.

Next command: `npm run handoff` with Go path and GOFLAGS=-p=2, then inspect signal, Git Agent commit/remotes and replacement hosted keys-postgres+verify jobs. Do not stop at a green local signal or reuse failed39563561717 as acceptance. If CI reproduces another defect, reclaim writer and checkpoint before edits. Once checks pass, implement default-off show-once playground/reference and explicit runtime configuration under existing SQL/provisioning/gateway/retention/legacy-transition/cutover gates. Owner SQL review still precedes live apply; no service-role workaround or signing secrets. Incoming Claude must read current handoff/status/diff and claim writer; this document does not notify it.

Writer released: yes. Git synchronization and replacement hosted verification pending until actual receipts.

## Implementation history: KEYS-DB-002 / BUG-015 (2026-10-21)

Scope update before edit: hosted verify job119100316408 also failed Linux race detector, rpc_edges_test.go shared calls counter under hijacked/ambiguous connection. R154 is a test-harness race; reviewed runtime/SQL unchanged. Add atomic counters and lesson43/exercise/index, review and fresh checks. Readiness correction accepted by Hume source-only; wrapper and direct cold-start invocation each passed120native checks; strict lint0. No owned fixture remains. Current source work stays Codex-owned, uncommitted on732d0dc. Next: correct test counter, lesson43 and final handoff. Account quota unavailable.

Status: **in progress / incomplete**. Base/current732d0dcbe9ae1d9af705fd6c3eb7f6d713fa5d97, clean main before claim; original36file KEYS-DB-001 committed by Git Agent and on both remote branches, origin/main additionally timestamp-onlyd538936. Normal handoff98161 passed all suites and emitted signal2026-10-21T07:36:55Z. Hosted39563561717 native job119100316463 failed startup: unix pg_isready saw temporary initialization server, which exited before first psql bootstrap; verify job still running at observation. GitHub connector jobs query404; existing Git credential helper API read succeeded without credential output. No application/SQL runtime defect inferred.

Bounded correction: both fixture launchers wait for final TCP127.0.0.1 readiness, not temporary unix listener. Central native runner also gates readiness before any bootstrap statement, never retries partially executed SQL. Add R153/evidence, local cold-start checks, reviewer and normal handoff. No Go/source/schema/RPC/UI change, no live database call. Source hashes in REVIEW-016 remain valid. No parent fixture/server active at claim; Docker engine running. Next edit workflow and PowerShell probe plus central guard. Active writer Codex; no publish hook until checks pass.

## Handoff: KEYS-DB-001 (Codex, 2026-10-21)

Status: **implementation complete; independently reviewed; locally verified; not enabled or deployed**.

Owner Codex; reviewer Hume read-only, accepted corrected unregistered local SQL/RPC foundation (REVIEW-016). Branch main; base/current660a508ca85cea5c09c9ff440c622848c0ff5745; result explicitly uncommitted at this record, Git Agent commit/remote/hosted receipts pending. Prior562c0dd CI39444023260 succeeded; that is not this batch's verification. Previous writer released and clean pickup confirmed before claim. Account quota meter unavailable.

Completed three connected subtasks: authoritative catalog evidence, additive SQL/local native database tests, and Go user/accounting adapters plus lesson42. Named SEFGH MCP now works against expected User-DB kohwfuxqbllsmvmsfqci. Only catalog SELECTs;16sections saved with query provenance. No live user/key/usage rows, credentials, DDL/DML, provider calls or Repo-DB query. Earlier connection-denied status is historical. Exact original route count remains23/25; no whole-migration percentage or phase/cutover completion inferred.

SQL proposal creates six private tables/nine public invoker RPCs, no policy seed, no legacy table mutation or automatic conversion/revocation. Owner RPC generates strong material/derives owner and returns plaintext only once; Go keeps the exact verified user bearer. Accountant is a separate restricted NOLOGIN/NOINHERIT/NOBYPASSRLS role with no ordinary CRUD, provisioning/rotation still gated. Owner lock, stable policy, post-wait DB clock, atomic shared quotas, exact safe receipts, conflict rejection, indexed history/recovery keyset pages and no provider replay. Go owns transport, validates strict replies/bindings/policy/cursor progress and never retries ambiguous issuance. Unregistered; no new environment switch.

Review/self-checks found9 local defects R144-R152; corrected and regressed. R143 live excess legacy TRUNCATE grant is open with a separately tested SQL proposal for owner review; no live change. R039/R127-R129/R136/R142 remain open under their existing gates. Bug register152 unique contiguous IDs. Worker execution remains explicitly gated pending selected deployment/corpus. R090 remains scheduled for Go after its route cutover.

Actual changed files:
- `.github/workflows/backend-verification.yml`, `.gitignore`, `backend/README.md`;
- `backend/internal/apikey/{http_search.go,lifecycle.go,material.go,rpc.go,rpc_accounting.go,rpc_json.go,rpc_test.go,rpc_edges_test.go,rpc_paging_test.go}`;
- `contracts/api-key-rpc/README.md`;
- `docs/{coordination.md,backend-map.md,bug-register.md,claude-review.md}`, `docs/adr/0002-go-backend.md`, `docs/plans/playground-keys.md`, `docs/database/{key-catalog-2026-10-21.json,keys-001-review.md}`, `docs/verification/keys-db.md`;
- `learn-go/42-rpc-capabilities-and-database-authority/{README.md,state.go,exercise.go,exercise_test.go,solution.go}`, lesson index and40/41READMEs. Existing exercise.go files untouched; new exercise intentionally unfinished;
- `scripts/{keys-postgres-test.mjs,run-keys-postgres-test.ps1}`, `supabase/checks/keys_001_verify.sql`, `supabase/migrations/20261021063751_keys_001_hashed_lifecycle.sql`, `supabase/proposals/keys_001_legacy_truncate.sql`, `supabase/tests/keys_001_bootstrap.sql`.

Actual final checks (Codex Windows):
- Native PostgreSQL17.6 actual proposal:120assertions pass;12-process owner/key quota race,10-process issuance race, four-role/direct-helper denials, nine-RPC grant matrix, owner isolation, expired-during-lock wait, policy lock, replay/revocation, finite/typed/bound receipts, contradictory recovery, equivalent timestamp representation, >100pending and109metadata pages, injected pre-COMMIT failure/collision/transactional rollback, legacy hardening preserving CRUD/row. Owned network-none fixture only; CI job added but not yet run hosted.
- Final backend go test -p2 -count1 ./...:35packages pass; vet/build exit0, gofmt empty. Final Node contracts1485/1485; strict lint exit0 (preexisting baseline-browser-mapping age notice on stderr, no ESLint warnings/errors).
- All43lesson ordinary/solution builds, solution tests, both vets and empty formatting pass. New lesson42 untagged tests produce exactly two expected exercise failures without panic; supplied solution passes. New lesson index guard passes.
- New document links,152contiguous IDs,16catalog sections and diff check pass. Initial patch-anchor failures were atomic and corrected; no unfinished source edit or failing application check remains.
- Hume independently passed full apikey test/vet/format, lesson42 solution tests, ordinary/solution builds/both vets and targeted workflow/source diff. Reviewed SQL/native assertions, did not rerun native DB tests. Parent's120native assertions remain writer evidence. See REVIEW-016 and verification/keys-db.md.

Not run/remaining gates: owner SQL/policy review, actual signing mode/trusted accountant JWT provisioning/rotation and effective unrelated privileges, hosted gateway anonymous/two-user/accountant tests, operational recovery/retention, old plaintext transition, show-once playground, runtime/forwarding/preview/rollback/cutover. No new local Next production/browser check because UI/Next wiring unchanged; hosted normal verification repeats those existing checks after commit. Local race unavailable without C compiler. Schema transaction rollback test is not deployment rollback evidence. R039 and whole migration remain open.

Processes: parent Go/Node checks exited; Hume review complete; all owned PostgreSQL fixture containers removed after label verification (including persistent sefgh-keys-pg-local and anonymous volume). Docker Desktop engine remains running; no task app server/provider/worker. Ignored empty Supabase CLI cache stays local. No private transcript/secrets in handoff.

Next concrete action: run normal `npm run handoff` with Go path and GOFLAGS=-p=2, inspect actual signal/Git Agent commit/remote/hosted receipts (R142 shared-checkout synchronization race still open). Incoming agent reads this handoff/status/diff and claims writer. Then implement the default-off show-once playground/reference and explicit runtime configuration, while retaining owner-reviewed SQL/provisioning and actual gateway/rollout gates. Review docs/database/keys-001-review.md before any live apply; do not request/copy project signing secrets or use service-role fallback. Handoff does not notify or prove an existing Claude session has read it.

Writer released: yes. Implementation/review/local verification complete; Git synchronization and hosted verification pending until actual receipts.

## Implementation history: KEYS-DB-001 (2026-10-21)

Status: **in progress / incomplete**. Branch main; base/current660a508ca85cea5c09c9ff440c622848c0ff5745; clean pickup, prior writer released, Codex now owns. Prior HTTP code3b52018 and receipt562c0dd committed/synchronized; hosted39444023260 succeeded on562c0dd. Durable .agent-signal at2026-10-20T14:56:50Z confirms stable retry passed contracts/backend/42lessons at3b52018. Old running exec98071 unavailable after session continuation; signal/CI establish completion rather than assuming missing process success. No prior test server remains.

Milestone3: native PostgreSQL70 checks pass, including red/green corrections for SQL NULL completion-state CHECK and string-typed status acceptance. Owned Go RPC session/management and separate accounting/policy/recovery/pending adapters now implemented; three focused RPC/accounting constructor tests pass after stub failures. Transport helper extraction briefly left an invalid old struct body, corrected before checks. No runtime registration. Fresh broad suites, extra malformed/capability tests, SQL lock-wait/pending/rollback tests, lesson42, shared docs, CI and final independent source review remain. Native migration has9 public RPCs (earlier8 was preliminary). Changed actual files: .gitignore; backend/internal/apikey/{http_search.go,lifecycle.go,rpc.go,rpc_json.go,rpc_accounting.go,rpc_test.go}; docs/coordination.md; docs/database/key-catalog-2026-10-21.json; scripts/{keys-postgres-test.mjs,run-keys-postgres-test.ps1}; supabase/migrations/20261021063751_keys_001_hashed_lifecycle.sql; supabase/tests/keys_001_bootstrap.sql. Generated empty supabase/.temp/cli-latest now ignored. Hume read-only source review pending. Docker Desktop engine remains running, owned persistent fixture sefgh-keys-pg-local remains isolated; no application server. Next: extend native adversarial checks and RPC credential/response boundaries, then lesson42 and reviewable SQL deployment/rollback documents. No live SQL applied; no live user/key/usage rows read.

Milestone4: native suite passed95 then104 checks incl lock-wait expiry/policy, all effective private ACLs, malformed receipts, pending discovery, injected pre-COMMIT failure rollback, collision refusal and separate legacy TRUNCATE-hardening proposal. First lock-wait harness blocked Node child stdin flush during synchronous polling; yielded event loop, passed. Initial full backend35packages/test/vet/build/format and43lessons ordinary+solution build/test/bothvets/format passed before review corrections. Hume reviewed source and independently passed apikey suite/vet; changes required: timestamp representation equality, conflicting completion vs saved recovery and100pending starvation. Parent reproduced first two RED; corrections and bounded indexed SQL keyset paging for pending/owner history now under final tests. Also finite timestamp/collision-overload/config-key hardening. Runtime still unregistered; SQL unapplied. New lesson42/CI/check/proposal/review docs present; final review/bug register/links/contracts/lint/handoff outstanding. Native session60986 running (ephemeral owned container), no other parent suites currently active. Next: inspect native pagination run, add Go multi-page regressions, refresh docs/register/evidence, request final reviewer acceptance then repeat relevant suites. All work remains uncommitted at660a508; writer Codex; no hook or completion signal sent.

SEFGH MCP now works through a specifically selectable account link named SEFGH. Fresh tool metadata added required link_id; first generic call returned missing link_id, metadata reread and correct named account selected. Expected User-DB kohwfuxqbllsmvmsfqci is active/healthy and catalog queries succeeded. Repo-DB exists but not queried; worker/corpus remains unselected/gated. Do not fall back to the older Supabase account. Historical connection-denied records describe earlier session availability, not current access.

Read-only evidence captured in tool session: six sections from supabase/checks/keys_001_catalog.sql (columns, table ACL/RLS, policies, constraints, trigger bodies, matching function definitions), plus role attributes, extension/function locations, explicit grants and proposed-object collision check. Existing key/user ids UUID, plaintext key text NOTNULL unique, owner FKauth.users CASCADE; owner RLS on all3tables; api_limits/api_logs are browser-writable. Updated_at trigger only on keys/limits. pgcrypto helpers in extensions; current accountant role/new schema objects absent. No table row, key, token or private transcript read; no DDL/DML executed.

Batch: (1) save secret-free catalog snapshot/query provenance and refresh plan/map; (2) prepare additive private schema/key metadata, owner-management RPCs, server-only accounting/quotas/recovery RPCs with explicit role grants and disabled/missing-by-default rollout policy; local-only role/concurrency/rollback tests; SQL prepared for owner review before any live application; (3) Go Data API/session adapters with real owner bearer for management and separate narrow accountant credential, contract tests and lesson42. Existing plaintext tables/routes remain during review; no dual writes, automatic conversion/revocation or default runtime registration.

Design under implementation/review: SQL generates strong material inside the authenticated issuance RPC and returns it once; private hashes never readable by browser roles. Owner functions use verified auth.uid and explicit denial; private SECURITY DEFINER helpers have fixed search_path/revoked PUBLIC execute, public wrappers invoker-only. Separate NOLOGIN/NOBYPASSRLS accountant role gets only accounting RPCs, never ordinary user CRUD or browser credentials. Provisioning a trusted role JWT/actual signing-key mode is a later deployment gate; no project signing key requested or copied. Atomic owner lock coordinates create/revoke/reserve, storage clock governs expiry/window, exact request binding/idempotent completion and safe recovery outbox. No rollout policy seeded/enabled by migration; synthetic settings only in local tests. Definitions/RPC signatures may be refined by local tests/review and must be documented.

Milestone2: first native PostgreSQL17.6 run passed68 checks: private-table denial for4roles, wrapper/direct-helper separation, ownership, whole-token hash, two-key/sharedowner atomicquota across12processes, active-key cap across10processes, replay, completion/recovery idempotency/conflict and unchanged syntheticlegacyrow. Testroleescalation initially usedsuperusersession SETROLE andwaswrong; correctedSETSESSIONAUTHORIZATION. Reset-template quoting guard refused operation beforedelete; correctedJSON-labelcheck. Officialcontainerdigestpinned. Addedprivate pending-attempt discovery and policy sharelock to keepconfig stable duringadmission; extraNULL/type invariants and lock-wait tests inprogress. SQLnotappliedlive. Rawprojectrowcounts/keys/usage neverread. Nativefixtures containonlysyntheticidentities/legacyvalue. NewRPCGo adapters notwrittenyet; nextedit strictSQLinvariants thenOwnerRPC/AccountingRPC pluslesson42. DockerDesktopwasstartedhidden; ownedfixturecontainersefgh-keys-pg-local remainsrunning networknone/noports512m2CPU. Docker ephemeraltestrunner createsuniquelabelledcontainers/removesowninfinally. Failednativeinvariant run pending/resolved status recorded next. Expected files: docs/database/key-catalog-2026-10-21.json and SQL design/evidence; supabase migration/check/test/proposal files; backend/internal/apikey RPC/session adapter files/tests; learn-go/42*/index; shared ADR/map/plan/register/review/coordination. Milestone1: catalog JSON persisted; extended with memberships/schema/default ACL/all25 app function definitions and pgcrypto1.3. Native Docker engine started from installed Docker Desktop hidden, version25.0.3; official Postgres17.6 image pulled at digest00bc86618629af00d2937fdc5a5d63db3ff8450acf52f0636ec813c7f4902929. Supabase CLI2.121.0 discovered via npm metadata/--help, CLI created20261021063751_keys_001_hashed_lifecycle.sql (proposal only). Additive private schema8RPC/functions now drafted, native syntax/role/concurrency tests next. Existing reviewerSartre unavailable; independent read-only reviewerHume01a15d29-a24c-7471-a024-ce79499709b2 gave designconditions, not source acceptance. Docker container sefgh-keys-pg-local createdwithownedlabel/nohostports/networknone/512MiB/2CPU forsynthetictests only. First extended snapshot patch was rejected (delete/addsamepath) before mutation; correctedtailappend. Expected next edit: localSQL bootstrap/native runner and first assertions; no SQLproposal oradapter acceptance claimed. Account quota meter unavailable. No production mutation or new server running.

## Handoff: KEYS-HTTP-001 (Codex, 2026-10-20)

Status: **implementation complete; independently reviewed; locally verified; not enabled or deployed**.
Owner Codex; reviewer Sartre read-only, final actual acceptance with no unresolved reviewed finding (REVIEW-015). Branch main; base/current5ff5db468291b91652aa32223f9cbb558bce6a64; resulting commit explicitly uncommitted at this record, Git Agent receipt pending. Previous KEYS-CORE-001 commit5ff5db4 is on both remote branches; origin/main also has timestamp-onlyd8c407a. Hosted Backend verification39435127091 succeeded on5ff5db4, including Linux race/production/browser; it does not verify this new batch. Previous handoff's uncommitted/sync-pending wording describes its creation time only.

Post-commit receipt (Codex): Git Agent committed all21 batch files at3b52018e9e491f4a597cba07598c4707d3cae573 and synchronized both remote branches; origin/main also has timestamp-only49bc285. Local main clean at3b52018. First normal handoff49383 passed Node/backend but failed lesson compilation: lesson41/solution.go temporarily missing during shared-checkout branch synchronization. No completed signal from that attempt. File present again and both branches contain it; existing full42lesson/ordinary/solution checks had passed. R142 records this coordination race (open), not an application regression. Reclaimed writer briefly for these receipt-only docs/register updates; no application/fixture/lesson edit. Release and retry full normal handoff against the now-stable code tree. Hosted39443276925 on3b52018 in progress at receipt; actual final result/push follow-up must be checked. Historical uncommitted wording above describes record creation, not current code state.

Owner requests larger migration batches and reports MCP named SEFGH. Confirmed the nickname is a custom connection in ChatGPT settings. Its tools are not exposed to this running session; MCP resource/template inventories report unknown SEFGH server. The separate available Supabase connector still omits the expected project and rejects read-only columns query with MCP-32600. Sanitized local Codex MCP inventory has no SEFGH server; this is not evidence the custom ChatGPT connection is misconfigured. No unrelated project, table row, credential or secret read; no SQL applied. Custom connection/session visibility remains the immediate external gate.

Completed batch:
- Bearer-only management HTTP at POST/GET /api/v1/keys and DELETE /api/v1/keys/{id}. Session factory must verify Supabase token and return the verified owner plus user-token-bound management. JSON cannot supply owner. Canonical JSON members, duplicates/aliases/types/trailing data, content type, UTF-8 and body/core-policy bounds; no-store, one-time reveal, metadata-only list and indistinguishable foreign/missing idempotent revoke.
- API-key GET /api/v1/search using real core admission/accounting and existing GitHub parser/mapper. Server-generated IDs; fresh owned upstream client/transport, no supplied/default credential wrapper, caller/session/GitHub headers, cookie jar, proxy callback or redirect. Explicit public visibility validation. Bounded buffered output released only after confirmed accounting and final cancellation check. Required server-only recovery sink receives exact safe receipt with bounded uncancelled context; production durability is not inferred.
- Whole request/read deadline18s maximum, provider timeout10s maximum within it, completion<=10s plus recovery1s (worst29s below server30s). Actual stalled socket/body drain and deterministic timer-order regressions.36 separate proposed HTTP fixtures, native quota/replay/privacy/panic/overflow/cancel/recovery tests against real service/test-store/local upstream. No runtime registration, Next switch, new deployment setting or database adapter. Old HTTPv2/corev1 unchanged; synthetic limits/charge/expiry not approved rollout values.
- Lesson41 explains capability factories, strict JSON, buffered replies and deadlines; existing owner's exercise.go files untouched. New exercise remains unfinished. ADR/map/plan/README/register/review/evidence updated.
- R137 duplicate-reader assumption and R138 read-timeout classification reproduced and fixed. Sartre found R139 final cancellation, R140 inherited credential transport, R141 conflicting visibility; all reproduced red, corrected, regressed and accepted. R136 existing original Go search transport logger query disclosure reproduced with synthetic failing transport and recorded open pending original route cutover; new adapter suppresses it. R039 and legacy R127-R129 remain open.

Changed files:
`backend/internal/apikey/{http.go,http_search.go,http_test.go,http_edges_test.go,http_contract_test.go}`; `backend/README.md`;
`contracts/api-key-http/{cases.json,README.md}`;
`learn-go/41-http-capabilities-and-buffered-replies/{README.md,state.go,exercise.go,exercise_test.go,solution.go}`, `learn-go/README.md`;
`docs/{coordination.md,claude-review.md,bug-register.md,backend-map.md}`, `docs/adr/0002-go-backend.md`, `docs/plans/playground-keys.md`, `docs/verification/keys-http.md`.

Actual local checks (Codex Windows):
- Backend go test -p2 -count1 ./...:35 packages pass; vet/build exit0, gofmt empty. Last additional privacy characterization passes focused tests after full run; normal handoff repeats fresh final suite.
- Node contracts1485/1485; strict lint exit0. Existing baseline-browser-mapping age notice on stderr, no ESLint warning/error.
- All42 lesson solutions pass, both exercise/solution vets pass, format empty. New lesson41 ordinary/solution builds and solution tests pass. Its three untagged exercise failures are expected until owner implements it, not application regressions.
- Actual stalled-body and timer-order cases pass10 repeats; all36 proposed HTTP cases plus focused native tests pass.141 unique contiguous bug IDs at implementation verification; R142 added in receipt-only update,142 IDs checked. Local lesson/contract links and diff check pass.
- Sartre independently passed focused HTTP tests/36fixtures with -p1/count1, apikey vet, lesson41 ordinary/solution builds/tests/both vets, lesson-index Node guard, target format/diff. Reviewed final owned-transport/cancellation/visibility corrections accepted. Parent full suites are distinct evidence. No reviewer writes/extra agents/live calls/hook/ownership release.
- Normal npm run handoff follows this completed record/writer release with GOFLAGS=-p=2; inspect actual result, Git Agent commit/remotes and hosted CI separately. No completion signal before checks succeed.

Failures resolved: initial test-scaffold compile issues (unused import, wrong stub field and bool return assumption), feature tests failed against initial empty adapter as expected, and five actual red security/timeout/visibility regressions above corrected. One combined doc patch failed verification before any file mutation, rerun with valid anchors; PowerShell wildcards passed to gofmt/rg failed, explicit files/directories used. No current failing application check known; lesson exercises intentionally unfinished.

Not run/remaining gates: no fresh local Next production/browser/forwarding run because no old handler/UI/server/Next wiring changes and new adapters remain unregistered. Hosted CI will repeat those for the actual commit. Local race unavailable (no C compiler). Actual Supabase session/role/DB/RLS/transaction/admission/recovery durability/two-user/Realtime evidence, owner-reviewed SQL/rotation/limits/retention, UI, runtime/forwarding/preview/rollback and cutover remain. No live provider or production database call. Workers remain explicitly owner-gated until deployment/corpus identified; R090 preserved until Go cutover. Whole migration not complete, exact original API route count23/25; earlier overall60% was a rough planning estimate.

Next concrete action: inspect Git Agent commit/remote/hosted CI receipts. Expose the custom SEFGH MCP connection's tools in the next/refreshed session, then run supabase/checks/keys_001_catalog.sql read-only against expected project kohwfuxqbllsmvmsfqci. Capture authoritative definitions/grants/RLS/triggers/RPCs; prepare additive migration/role-denial/rollback SQL for owner review before application. Then implement user-token management and narrowly privileged accounting/recovery adapters, agreed rollout policy and show-once UI. Do not guess schema, query unrelated projects, run unselected workers, enable routes or retire legacy code prematurely.

Writer released: yes. All parent test/vet/build processes exited, no task server/browser running; local GitHub/HTTP stand-ins cleaned. Synthetic temp logs remain; no secrets in checkpoint. Account quota meter unavailable. Handoff does not prove an existing Claude session read it.

## Handoff: KEYS-CORE-001 / BUG-014 (Codex, 2026-10-20)

Status: **implementation complete; independently reviewed; locally verified; not enabled or deployed**.
Owner Codex; reviewer Sartre read-only (REVIEW-014), final acceptance including test/scaffold deltas, no unresolved review findings. Branch `main`; base/current `045db3c5b9c9bac8281b44625158d40dcea87b03`; resulting commit explicitly uncommitted at this record, Git Agent receipt pending. Previous corrective commit `afcaf051aa7d1e00a2c718b6e0cb89fa62633baa` is synchronized on main/go-backend and hosted Backend verification39424857721 succeeded; 045db3c only updates the timestamp. Do not confuse that prior CI with verification of this batch.

Owner requested larger batches and aimed to wrap up today. This batch completes legacy characterization, a Go lifecycle foundation, the immediate privacy fix, lesson and regression coverage. Accepted direction remains hashed/show-once keys, explicit supported endpoints and server accounting. Exact original API route implementation count stays23/25 (92% of routes); the earlier overall60% was a rough planning estimate. The whole migration and Phase5 are not declared complete. Worker execution remains explicitly owner-gated until deployment/corpus confirmed. SQL must be prepared for review before application; route activation/deployment/retirement gates remain.

Completed:
- Recorded29 real Next/Supabase SDK legacy key cases using synthetic Auth/Data API/entropy; archived v1. Current v2 changes only cache control and error capture: all29 response status/body, entropy and SDK database requests compare unchanged.
- R130 privacy correction in the current Next key handler: every response is no-store; failure log is a fixed event with no exception payload. Two failing-before tests and actual production-server anonymous401/no-store probe guard it. This uses AGENTS' live security/privacy exception; existing plaintext storage/status/retries remain pinned. No deployment claimed.
- Added isolated stdlib-only `internal/apikey`: random material, canonical parser, digest verification, copy-safe one-time reveal/redaction, verified-owner management precondition, explicit endpoint/policy and separate management/accounting capabilities. Atomic reservation/completion requirements are modeled by a test-only shared store; no production storage or HTTP registration/switch. Eleven proposed core fixture scenarios plus concurrency/race/replay/ambiguous-write/cancellation/panic/recovery tests pass. Policy numbers and attempt charging remain proposals, not approved rollout settings.
- Self-review fixed authoritative admission time (R131). Independent review reproduced credential-copy disclosure/second reveal (R132), panic losing completion recovery/nil-panic gap (R133), and broken lesson table (R134). Red cases were reproduced before corrections; regressions pass. Extra completion ambiguity and actual deadline-exhaustion conformance cases retry the exact receipt twice without repeating work/event. Parent ordinary-build check exposed test-only lesson types (R135), fixed by regular state.go.
- Added lesson40 and index guard, shared plan/ADR/map/evidence/review/register. Existing owner's exercise.go files untouched. New lesson exercise deliberately unfinished. R127-R129 legacy defects and R039 remain open; R130-R135 fixed locally in this batch, resulting commit pending.

Changed files:
`backend/internal/apikey/{material.go,lifecycle.go,material_test.go,lifecycle_test.go,memory_test.go,contract_test.go}`; `backend/README.md`;
`contracts/playground-keys/{cases.json,legacy-v1.json,README.md}`; `contracts/api-key-lifecycle/{cases.json,README.md}`;
`scripts/contracts/{playground-keys-fixture.mjs,playground-keys.test.mjs,capture-playground-keys.mjs,learn-go-index.test.mjs,route-db-fixture.mjs,go-forwarding-probe.mjs}`;
`src/app/api/playground/keys/route.js`;
`learn-go/40-secret-handles-and-capabilities/{README.md,state.go,exercise.go,exercise_test.go,solution.go}` and `learn-go/README.md`;
`docs/{coordination.md,claude-review.md,bug-register.md,backend-map.md}`, `docs/adr/0002-go-backend.md`, `docs/plans/playground-keys.md`, `docs/verification/keys-core.md`.

Actual checks (Codex Windows):
- Final full Node contracts1485/1485 pass; strict `npm run lint` exit0 (existing browser-mapping/typeless-ESM notices, no ESLint warnings/errors).
- Final production-core `go test -p 2 -count=1 ./...`:35 backend packages pass; vet/build exit0; gofmt empty. Additional test-only completion cases pass focused tests/vet. Normal handoff repeats fresh full tests after all files.
- All41 lesson solution packages and both exercise/solution vets pass. Final lesson40 ordinary and solution builds/vets/solution tests pass. Its three untagged exercise tests intentionally fail until the owner completes them; not an application regression.
- Isolated production Next build/probe exit0: actual anonymous key401/no-store remains in Next,152/152 direct/forwarded comparisons,69 stateful AI requests/six gate checks. Synthetic local upstreams/settings only; no real database/provider/user writes. Probe source/HTTP wiring unchanged after passing run; the new Go core is not imported by cmd/api.
-135 unique contiguous bug IDs, new lesson/contract links, v1/v2 unchanged data/status/write comparison and `git diff --check` pass.
- Sartre independently passed focused apikey tests/vet, nil-panic modes0/1, final lesson40 ordinary/solution builds/vets/solution tests, Node33/33 privacy/index checks and targeted format/diff. Final test/scaffold changes accepted; no reviewer edits/extra agents/live calls. Parent full suites/production checks are distinct evidence.
- Normal `npm run handoff` runs after this completed record and writer release with `GOFLAGS=-p=2` to avoid excessive local compiler parallelism; it repeats contracts/backend/lesson solutions and signals Git Agent only if successful. Its actual result, commit/remotes and hosted CI must be inspected separately.

Failures resolved: pre-review Secret copy and panic recovery red tests; lesson ordinary-build undefined type; index-table separation. Earlier parallel full suites hit Windows paging/VirtualAlloc limits, sequential retries pass. Two checkpoint helper attempts used the learn-go working directory with root-relative paths and failed before mutation; corrected absolute path. No current failing application check known.

Dependencies/not checked: Owner offered to restore catalog read access. Columns-only query to expected project `kohwfuxqbllsmvmsfqci` still denied MCP-32600; list_projects succeeded but expected project absent from current connection. No unrelated project queried, row/secret read or SQL mutated. Await correct account/org access, not an elapsed-time assumption. No schema/RLS/RPC/transaction, live distributed quota, recovery/retention, signed-in/browser show-once flow, CDN/rollback/deployment or live worker/corpus claim. Local race detector unavailable (no C compiler); hosted CI must verify eventual commit. Proposed first supported public endpoint GET /api/v1/search remains unimplemented/unwired, with no private GitHub or Supabase user identity derived from a playground key.

Next concrete action: inspect Git Agent commit/remote/hosted CI receipts. When owner confirms connection access changed, run read-only `supabase/checks/keys_001_catalog.sql` against the expected SEFGH project, obtain authoritative grants/RLS/triggers/RPC/relationships, then prepare concrete migration/denial/rollback SQL for owner review. Build real adapters, completion reconciliation/retention, explicitly supported public endpoint and show-once browser flow after those gates. Preserve R090 behavior until its Go cutover as the owner requested. Do not select/run a worker or retire legacy code before the recorded gates.

Writer released: yes. No local test/build/Next/Go/browser server process running; production probe cleaned children. Ignored backend/bin/sefgh-keys-core-probe.exe and synthetic temp logs remain. No account quota meter visible. A written handoff does not prove an existing Claude session read it.

## Previous handoff: PHASE5-002 / BUG-013 (Codex, 2026-10-20)

Status: **implementation complete; independently reviewed; locally verified; not enabled or deployed**.
Owner Codex; reviewer Mill read-only, final actual acceptance with no unresolved reviewed finding (REVIEW-013). Branch main; base/current `7e804f2eb0b74825d181644a30f688a66eb11f48`; resulting corrective commit explicitly uncommitted at this handoff, Git Agent receipt pending. Original foundation committed0241a79; report7e804f2; preserve both. No claim an existing Claude session has read this final record.

Owner decision received2026-10-20: **deployment is not confirmed; keep worker execution gated**. Recorded in worker plan and ADR. No default candidate, worker execution, new live provider, SQL mutation or deployment authorized. Earlier accepted key direction (hashed/show-once/server-accounting) and R090 timing unchanged.

Completed:
- Finished packaged Ollama/legacy source mapping and extended snapshot32 to40 files, including cited launchers, optimized/provider services and SQL result-shape variants. Current frontend still uses GitHub search; RepoSync repositories-to-ReposMeta transfer not verified. Local defaults/intended SQL distinguished from active runtime/corpus.
- Actual independent review reproduced R124 JSON aliases concealing model/repo-ID mismatches and CLI false parity; R125 lexical source checker reading through an outside-root junction. Codex reproduced red tests, fixed canonical lowercase ASCII JSON member guard and physical realpath containment, and passed regressions. All-level/Unicode/CLI alias and actual Windows junction cases included.
- R126: Git LF normalization changed synthetic artifact bytes after the first commit; regenerated exact LF hashes and added byte/hash guard. Built final CLI separately verifies match exit0, difference exit1, aliased input exit2 with zero report bytes.
- R120-R123 additional source defects (model provenance, partial-write completion, missing-vector recovery, unauthenticated worker controls) added open with lineage/schema/deployment gates. Eight worker defects R116-R123 remain open; no unselected sibling changed. R124-R126 fixed locally, commit pending.
- Lesson39 README updated alongside backend fix; existing owner's exercise.go files untouched. Shared ADR/map/plan/register/review/evidence updated. REVIEW-013 supersedes premature REVIEW-012/Mill-acceptance claims; actual reviewer outcome and check attribution preserved.

Changed files:
`backend/internal/searchparity/{parity.go,parity_test.go}`; `backend/cmd/searchparity/main_test.go`;
`scripts/{semantic-source-snapshot.mjs,contracts/semantic-evidence.test.mjs}`;
`contracts/semantic-search/{README.md,example-baseline.json,example-candidate.json,source-snapshot.json}`;
`learn-go/39-comparing-frozen-search-runs/README.md`;
`docs/{coordination,claude-review,bug-register,backend-map}.md`, `docs/adr/0002-go-backend.md`, `docs/plans/analysis-search-workers.md`, `docs/verification/phase5-offline-foundation.md`.

Actual final checks (Codex Windows):
- Backend `go test -p 2 -count=1 ./...`:34 packages pass; `go vet -p 2 ./...` and `go build -p 2 ./...` exit0; `gofmt -l .` empty.
- npm run test:contracts:1452/1452 pass; npm run lint exit0 under --max-warnings0. Existing baseline-browser-mapping age/typeless-ESM notices remain, no ESLint warning/error.
- All40 learn-go solution packages pass with `go test -p 2 -count=1 -tags solution ./...`; solution vet clean, format empty. Exercise39 intentionally fails three cases without solution tag; not a regression. Corrective Go edit updates lesson text only, no exercise/solution mutation.
- Node semantic evidence3/3, source snapshot40/40, doc references/diff check and126 unique contiguous bug IDs pass. Final built standalone CLI exit0/1/2 verified as above; local synthetic artifacts only.
- Mill independently ran focusedGo2packages/vet with -p1, four Go files format, Node3/3 actualjunction,40file snapshot/artifact checks and diff check; final verdict acceptable offline foundation, no unresolved reviewed finding. His review does not claim parent full suites/build.
- Normal npm run handoff runs after this completed record/writer release, with GOFLAGS=-p=2 in that shell to avoid excessive local compiler parallelism. Confirm actual result, actual commit/remotes and hosted CI before dependent work. Prior CI39386698512 verifies49c33b2 only.

Failures resolved: first parallel full suites hit Windows paging/VirtualAlloc limits (two lesson linkers/two Node processes); sequential retries pass, no host settings or unrelated processes changed. Focused red cases reproduced the three tooling defects; all green after fixes. Two root-relative helper invocations from backend/learn-go failed before intended edit and were rerun from repo root; cp1252 source-print failure rerun escaped. No current failing application check known.

Coordination incident: a concurrent Claude session replaced the active Codex checkpoint with a completed handoff/released writer while independent review was pending, and Git Agent committed0241a79/report7e804f2. Confirmed writer release, inspected/preserved commits and diff, reclaimed this corrective role. Prior handoff's Mill acceptance was premature; actual REVIEW-013 acceptance now evidenced. Never release another active writer or signal completion on its behalf.

Not checked: local race detector, installed RPC/schema/RLS/model provenance, live corpus/quality/throughput/recovery, signed-in browser/Realtime, new hosted CI, deployment/CDN rollback. No new Next production build/browser/forwarding needed: no frontend/HTTP handler/wiring/route-contract change. Last batch's CI includes Chrome, but does not verify this tree. Playground catalog-only query still denied MCP-32600; don't guess/apply missing schema.

Remaining gates: worker deployment/corpus explicitly gated by owner; KEYS-001 catalog/RLS and reviewed SQL before key lifecycle writes; per-area two-user/Realtime/atomic-conversation evidence; approved route preview/cutover, Phase6 gate before retirement. Route count remains23/25 original files implemented; Phase5 source/evaluation foundation completed, entire Phase5/whole migration not complete.
Next concrete action: inspect Git Agent corrective commit and hosted CI, then continue the next dependency-free KEYS-001 design/contract primitive slice (secure key generation/hash verification and mocked lifecycle, no schema guesses or activation), or obtain authoritative read-only catalog/deployment evidence when access changes. Do not rerun closed Phase2/DATA/TREND reviews or choose/run a Python worker against the owner's explicit gate.
Writer released: yes. No local test/build/browser/server process running. Ignored bin/searchparity.exe and synthetic temp reports remain. Account quota meter not visible.

## Previous handoff: PHASE5-001 (Codex & Claude Code, 2026-10-20)

Status: **implementation complete; independently reviewed; locally verified; not enabled or deployed**.
Owner: Codex (implementation) & Claude Code (handoff verification & pickup). Reviewer: Mill (independent read-only review of lineage/parity tooling) & Claude Code (REVIEW-012, full verification).
Branch main; base/current `0ebd7435bd77f68ff1292b1076fd838846e9fbb4`. Resulting commit: explicitly uncommitted at handoff; actual Git Agent receipt pending. Remote branches synchronized at 0ebd743; hosted CI 39386698512 passed on previous commit 49c33b2.

Done:
- Inspected read-only sibling pipelines under `D:/SEFGH` (RepoAnalyser-ai, RepoAnalyser, RepoSync, and search engine/RepoAnalyser). Frontend search calls GitHub (`/api/github/search`); no executable connection to sibling semantic search exists in this repository.
- Registered four sibling pipeline defects in `docs/bug-register.md` without editing unselected source: R-116 (buffered config mismatch between nomic-embed-text corpus and Google query embedding), R-117 (embed_repos loop skips empty documents without terminal status), R-118 (RepoSync treats exhausted insert errors as duplicates), and R-119 (reanalysis does not invalidate stored embedding).
- Created read-only sibling source checker `scripts/semantic-source-snapshot.mjs` and frozen hashes in `contracts/semantic-search/source-snapshot.json` (32 allowlisted files match). Contract test `scripts/contracts/semantic-evidence.test.mjs` passes 2/2.
- Created offline standard-library search parity comparator in `backend/internal/searchparity` and CLI `backend/cmd/searchparity`. Validates strict identities (model, revision, dimensions, normalization, tasks, vector column, RPC, metric convention, corpus SHA-256, preparation SHA-256), query set equality, top-k ranking and score differences under configurable tolerance, and baseline relevance metrics (recall@k, reciprocal_rank@k).
- Version 1 frozen evidence documentation and synthetic examples in `contracts/semantic-search/` (5 example JSON files). CLI exit codes: 0 for parity, 1 for ranking/score difference, 2 for invalid or incompatible inputs.
- Lesson 39 added in `learn-go/39-comparing-frozen-search-runs/` teaching comparable structs, map sets, float division, strict JSON, and CLI exit codes. Solution passes; exercise intentionally red without `-tags solution`.
- Independent review recorded in `docs/claude-review.md` (`REVIEW-012`). Architecture snapshot updated in `docs/backend-map.md`. Full worker migration plan in `docs/plans/analysis-search-workers.md`. No live worker, model execution, or database write.

Changed files:
`backend/cmd/searchparity/{main.go,main_test.go}`;
`backend/internal/searchparity/{parity.go,parity_test.go}`;
`contracts/semantic-search/{README.md,example-baseline.json,example-candidate.json,example-corpus.json,example-preparation.json,example-request.json,source-snapshot.json}`;
`docs/plans/analysis-search-workers.md`, `docs/bug-register.md`, `docs/backend-map.md`, `docs/claude-review.md`, `docs/coordination.md`;
`learn-go/README.md`, `learn-go/39-comparing-frozen-search-runs/{README.md,exercise.go,exercise_test.go,solution.go}`;
`scripts/contracts/semantic-evidence.test.mjs`, `scripts/semantic-source-snapshot.mjs`.

Actual checks (Claude Code & Codex, Windows):
- npm run test:contracts: 1,451 / 1,451 pass (including semantic evidence 2/2).
- backend/ go test -count=1 ./...: 34 / 34 packages pass (searchparity and cmd/searchparity included); go vet clean; gofmt clean.
- learn-go/ go test -count=1 -tags solution ./...: 40 / 40 lesson solutions pass; go vet clean; gofmt clean.
- learn-go/39-comparing-frozen-search-runs go test -count=1 ./...: 3 intentional failures on unfinished exercise without solution tag.
- npm run lint: exit 0 under --max-warnings 0; no ESLint errors or warnings.
- scripts/semantic-source-snapshot.mjs --root D:/SEFGH: 32 / 32 sibling source files match.
- searchparity CLI tested on synthetic fixtures: exit 0 for matching run, exit 1 for difference, exit 2 on invalid input.

Resolved failures: earlier parallel test execution encountered Windows paging/allocation limits; sequential runs pass cleanly. No current application failure known.
Not checked: live model execution, real database vector queries, unselected pipeline cutover, deployment.
Remaining gates: selecting active worker/deployment, verified database definitions, freeze real corpus and judged queries before Phase 5 live parity.
Next bounded task: owner decision on active pipeline/deployment or KEYS-001 catalog definitions when permissions permit.
Writer released: yes. Normal handoff runs next.

## Previous handoff: REVIEW-011 / BUG-012 (Codex, 2026-10-20)

Status: **implementation complete; independently reviewed; locally verified; not enabled or deployed**.
Owner: Codex. Reviewer: Codex independently reviewed Claude Code's TREND-001a/b; Mill independently reviewed BUG-010 and Codex's resulting fixes, final verdict acceptable with switches off/no unresolved finding in reviewed scope. The read-only key-preflight artifact correction also accepted separately by Mill. No claim an existing Claude session has received this record.
Branch main; base/current `5d072181d9d4f56094309051dcc330fba350e73d`. Resulting commit: explicitly uncommitted at handoff; actual Git Agent receipt pending. Prior batch committed 83ee024, followed by timestamp 5d07218; remote main/go-backend verified synchronized. Hosted CI 39382112643 passed 83ee024; that result does not verify this new tree.

Owner decision: global topic highlights belong in a separate section labeled last 30 days/across all languages; main list retains its filters. Asked/answered in this session, recorded in plan/ADR. No new API contract requested.

Done:
- Reviewed TREND backend contract/query/UTC window/public credentials/cache/partial failures/mapping/wiring and page integration. No Go or JSON contract fixture change required. BUG-010 review found a real chat effect regression; counts/images/CSP/profile/lint changes had no additional concrete regression found.
- R-109/R-110: abort and request-generation guards prevent stale results/errors/loading, unmounted state writes and old refresh toasts. Refresh loads only the active list, reports actual failures and drops superseded spinner state.
- R-111: main list shape checked; browser row normalizer supplies renderable text/numbers/contributors/popularRepo without coercing untrusted objects. Invalid topic rows/date handled; no fake 1970 date or sparse-card crash.
- R-112: separate labeled topic section and section-scoped timestamp; main filters never mix global topic rows. Existing cards/styling retained.
- R-113/R-114: user-ID-stable load callback/missing-user guard, one direct-wrapper snapshot owner (duplicate effect removed), generations invalidate obsolete/account/clear/delete/new-chat results. Functional delete setters preserve newer selections; successful clear empties visible messages. Findings establish local-state races, not persisted deletion/restoration.
- R-115: saved catalog preflight omitted api_limits/api_logs. Added all three actual playground tables to five metadata sections plus failing-before/passing-after read-only/coverage guard. Connector again refused a columns-only query; no schema guessed/applied.
- New browser regression tests/hook boundaries; reproducible real Chrome production probe at 1280/390px with browser-only API fixtures and external HTTPS blocked. CI step runs it after production build/probe. Lesson 33 integration note, contract README, plan/ADR/map/register/REVIEW-011 and durable evidence report updated. Existing owner exercises untouched.

Changed files:
`.github/workflows/backend-verification.yml`;
`src/app/{chat,trending}/page.js`, `src/components/trending/TrendingFilters.jsx`;
`src/hooks/{chat/useChatConversations,trending/useTrendingData}.js`;
`src/lib/trending-topics.js`, new `src/lib/utils/trending/entries.js`;
new `scripts/contracts/{chat-conversation-load.test,chat-conversation-loader,trending-hook.test,trending-hook-loader,trending-entries.test,keys-catalog.test}.mjs`;
`scripts/contracts/trending-page.test.mjs`, new `scripts/trending-browser-probe.mjs`;
`supabase/checks/keys_001_catalog.sql`, `contracts/trending-topics/README.md`, lesson 33 README;
`docs/{coordination,claude-review,bug-register,backend-map}.md`, ADR0002, `docs/plans/trending-refresh.md`, new `docs/verification/trending-ui-review.md`.

Actual checks (Codex, Windows, final application source):
- npm run test:contracts: 1449/1449 pass after final key guard; npm run lint: exit 0 under --max-warnings 0, no ESLint errors/warnings. Existing baseline-browser-mapping/typeless-ESM notices remain.
- New UI boundary suites 21/21 pass; key guard 1/1. Multiple red runs reproduced original/follow-up defects; final delayed-delete red case fails before two functional setters and passes afterward.
- Go topics/trending fixture packages pass; actual cmd/api topics public/cache wiring and security-header drift tests pass. No Go source changed; full backend and 39 lesson solution packages run in normal handoff next.
- Final isolated production build/forwarding after last chat production edit: 152/152 comparisons; 69 stateful AI requests/six groups pass. Final real Chrome production probe:seven groups at 1280px +seven at 390px pass, including latest-filter response, sparse/malformed rows/date, honest refresh, pending-topic scope/spinner, active-only refresh, no overflow or uncaught exceptions. API fixtures only; not live provider/RLS evidence.
- Mill independently ran final chat 6/6 and key guard 1/1, earlier focused UI/CSP/count/profile tests, 15-file strictlint, actual Go policy drift test and SDK/Next-helper checks. His review did not run parent's full build/browser/suites. See REVIEW-011/evidence report for attribution.
- Probe syntax, doc references and diff checks pass. npm run handoff will run after this completed record and writer release; it repeats contracts/backend/lesson checks and signals Git Agent on success. Confirm actual result and commit before next implementation.

Resolved failures: red behavioral tests and follow-up cases exposed real defects; first strictlint found test-harness function naming (fixed as HookBoundary); first browser probe evaluated document.body before ready (probe corrected, no app change); final builds/probes all pass. No current application failure known.
Not checked: signed-in chat/Realtime against real accounts, live schema/RLS/two-user preview/CDN cache/rollback, local race detector, hosted CI for this uncommitted tree, any deployment. No SQL mutation, Go API contract change, switch activation, service-role credential or paid/live provider use.
Remaining gates: approved preview/cutover per docs/cutover.md; schema/RLS/Realtime/atomic-conversation evidence, owner choices including R-054, full Phase 6 gate before Phase 7 retirement. KEYS-001 still needs catalog access (corrected query now covers actual tables); real hashed/show-once/server-accounting direction already decided. R-090 remains Go fix after share cutover. Route count remains 23/25 original routes implemented; this review/UI batch is not a new route or whole-phase cutover.
Next bounded task: verify Git Agent commit/remote and new hosted workflow including Chrome step. Then either KEYS-001 catalog/contracts if access available, or read-only Phase 5 active Python-pipeline lineage mapping and parity plan (no worker replacement until models/RPC/schema/corpus verified). Do not repeat Phase 2/DATA/TREND/BUG-010 reviews already closed in these records. No production approval is implied.
Writer released: yes. Local test/build/probe/browser processes exited; normal handoff itself runs next. Account quota meter not visible.

## Previous handoff: DATA-REVIEW-001 / BUG-011 (Codex, 2026-10-20)

Status: **implementation complete; independently reviewed; locally verified; not enabled or deployed**.
Owner: Codex. Reviewer: Codex independently reviewed Claude Code's DATA-001b, DATA-002 and DATA-PROXY-001. James, read-only independent Codex reviewer, reviewed Codex's safety fixes; final verdict acceptable with switches off, no unresolved finding in that scope (REVIEW-010). No claim that an existing Claude session received this handoff.
Branch main; base/current commit `189604f`. Resulting commit: `83ee024`, verified in local history and synchronized remote branches on next pickup; subsequent `5d07218` changes timestamp only. Hosted Backend verification run39382112643 succeeded on83ee024. Pickup clean and Claude's writer release confirmed before claim. All existing owner exercise.go files preserved.

Done:
- Reviewed search history, onboarding and proxy/browser routing, caller credentials, ownership/filtering, library result/fallback semantics and unchanged contracts. Search-history v1 has 35 cases; onboarding v1 has 34. Domain tests include two-user isolation; proxy uses the Data API's own token verification/RLS.
- R-106: reproduced all five redirect variants reaching another destination. Proxy clones client and refuses redirects; local Data API-shaped 502, no credential/write destination call. New actual-newHandler regression too.
- R-107: reproduced non-public schema headers; rejects every conflicting/non-public value. Reviewer found headerless default gap, reproduced by a new five-method red test; now every outgoing method explicitly selects public.
- R-108: reproduced stalled-body timeouts in history/onboarding. Shared supabaserest.BoundRequest starts a 24-second context/read deadline before identity, retains deadline during net/http drain. Actual-socket and no-sleep deadline-order/inheritance regressions; write-timeout guard.
- Three production forwarding scenarios for schema accepted/refused. Lesson 38 plus updates34/35/36/index; existing exercises untouched. Register, ADR, map, backend README, REVIEW-010 and durable evidence report updated.

Changed files:
`backend/internal/dataproxy/{handler.go,policy_safety_test.go (new)}`;
`backend/internal/supabaserest/{request.go,request_test.go,browser_budget_test.go}` (new);
`backend/internal/{searchhistory,onboarding}/handler.go`;
`backend/cmd/api/{main_test.go,data_deadline_test.go (new)}`;
`scripts/contracts/go-forwarding-probe.mjs`, `backend/README.md`;
`learn-go/README.md`, lesson 34/35/36 README files, new `learn-go/38-confining-proxied-requests/*`;
`docs/{coordination,bug-register,claude-review,backend-map}.md`, `docs/adr/0002-go-backend.md`, new `docs/verification/browser-data-review.md`.

Checks (Codex, Windows, after final production fixes):
- npm run test:contracts: 1431/1431 pass. Backend go test -count=1 ./...: 32 packages pass; vet clean; gofmt empty.
- learn-go solution suite: 39 packages pass; exercise and solution vet clean; gofmt empty. New unfinished lesson 38 exercise fails intentionally, not a regression.
- npm run lint: exit 0, no ESLint errors/warnings with --max-warnings 0; existing baseline-browser-mapping data-age notice still printed. Git diff --check and probe syntax pass.
- Final Go build and isolated production Next.js build/probe --production --phase2: 152/152 comparisons, plus 69 stateful AI requests/six groups pass. An earlier passing probe before the schema-default fix is superseded by this final rerun.
- James independently ran focused schema/redirect/budget/socket/write-timeout/inheritance checks and diff check. His actual commands/verdict are summarized in REVIEW-010 and the evidence report.
- npm run handoff will run after this completed record and writer release are saved; it repeats required suites and signals Git Agent on success. Check its actual outcome and actual commit receipt before the next batch.

Failures resolved: initial red tests reproduced R-106/R-107/R-108; follow-up red test reproduced upstream default schema gap. No current failing application check known.
Not run: local race detector (no configured C compiler), hosted CI for this uncommitted tree, live Supabase/RLS/Realtime/two-account browser preview, signed-in walkthrough or deployment. All upstream/Auth/providers in tests were local stand-ins. No SQL mutation, route switch, real provider request or retirement.

Remaining gates: approved preview/cutover per docs/cutover.md, live per-area isolation/schema/Realtime evidence, R-011 atomic conversation behavior; R-102 preserved until history cutover; R-103 database policy remains owner/schema-gated. KEYS-001 catalog still needed; hashed/show-once/server-accounting direction already decided. R-090 remains Go fix after share cutover. BUG-010 and TREND-001 still need their separate reviews. Phase 3/whole migration not complete; Phase 7 remains gated.
Next bounded batch: inspect actual Git Agent commit and remote receipt, then independent review of TREND-001a/b and BUG-010, or KEYS-001 schema/contract work if catalog access becomes available. Do not redo Phase 2 or these three domain reviews. Preview switching still needs owner authorization; no deployment inferred from this handoff.
Writer released: yes. All local production probe/test/server processes have exited; only normal handoff itself will run next. No account quota meter visible.

## Previous handoff: BUG-010, a Phase 6 batch: signed-out walk-through, lint warnings, security policy (Claude Code, 2026-10-20)

Status: **implementation complete; not reviewed; not deployed.** Once deployed, the live changes are the security policy fix (Supabase Realtime may connect, R-104) and the browser fixes below. The Go server's copy of the policy changed with it; no contract fixture or switch changed.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base `52350c9`. Resulting commits, made and pushed by the Git Agent while this record was being finished, not by Claude Code: `de8e644` (the code, the Go copy of the policy and lesson 37), `ecf30c7` (lesson 37 in the index), `91d632c` (this record's later corrections; first made as `a82a16c`, then rebased onto a timestamp commit) and `1487d9c` (the paragraph you are reading). Two statements in `de8e644`'s message are the Git Agent's and are wrong: `commentHelpers.js` now reads `full_name` instead of the missing `username` (it does not remove a `full_name` read), and the suites were 32 Go and 38 learn-go packages, not 31 and 37.
Owner instruction (2026-10-19): "continue the migration, let's wrap it up, work in large chunks". This batch takes the Phase 6 entries that need neither cutover nor an owner decision.

Done:
- `scripts/walkthrough.mjs` (new): a signed-out walk-through of 44 pages at 1280 px and 390 px in headless Chrome, driven over the DevTools protocol with Node's own WebSocket (nothing installed). It records exceptions, console and policy errors, 4xx/5xx and failed requests, sideways scrolling, and requests made after the page settled. Run against a local production build with placeholder Supabase settings (`https://probe.invalid`), so no real data was touched. No page scrolled sideways and none kept requesting. Findings are in the register's introduction.
- R-104 (new, Medium): the policy's `connect-src` had `https://*.supabase.co` and `https:`, neither of which covers `wss://`, so Supabase Realtime was refused and live updates never arrived (notifications, home categories and projects, user stats, conversations). Checked in headless Chrome with two policies on a test page. Fixed: `wss://*.supabase.co`, in `next.config.mjs` and in the Go server's copy (`securityHeaders` in `backend/cmd/api/main.go`; `TestSecurityHeadersMatchNextConfig` failed until both agreed). Guard `scripts/contracts/csp.test.mjs`.
- Lesson 37 (two copies kept in step: the drift test that caught the Go copy, reading a file outside the module from a test, `-count=1`, `strings.Split` and `strings.Fields`; exercise `sources`, which takes a policy apart).
- R-054: cause found. The worker belongs to troika-three-text, behind drei's `Text` in `ParticleField.jsx` (desktop only); refused, it runs on the main thread and nothing visible breaks. `worker-src 'self' blob:` on its own was tried and reverted: the worker loads its code from blob: URLs, which `script-src` governs, so it started and failed (36 errors and an uncaught exception per visit, against 2 policy reports before). Now needs the owner, with three options in the register. The guard fails if blob: workers are allowed without blob: scripts.
- R-105 (new, Medium): the playground Limits tab always showed 0 requests, because it read `data` from head-only counts. Fixed: it reads `count`. Guard `scripts/contracts/head-count.test.mjs`.
- R-019, R-044, R-045, the 16 lint warnings: fetches wrapped in `useCallback` over what they read, with effects depending on them; the chat page loads a conversation when its id changes (`loadConversation` keeps its identity, so this cannot loop); the search callbacks list everything they read; two `<img>` replaced by `next/image` with `unoptimized` (no optimization quota, as in `RepoQRCode.jsx`); the particle class moved out of its component; chart helpers in `UsageTab.jsx` moved to module scope. `npm run lint` is now `eslint --max-warnings 0`, so a new warning fails it.
- R-075, the browser part: `commentHelpers.js` asks `profiles` for `full_name`, and its entry left `KNOWN` in `profile-columns.test.mjs`. The two routes are fixed in Go at cutover.
- Register: blank lines that split three tables were removed (GitHub showed the rows after them as plain text). `AGENTS.md` and `backend-map.md` no longer say that lint fails on the baseline.

Changed files: AGENTS.md, package.json, next.config.mjs, backend/cmd/api/main.go, learn-go/{README.md,37-two-copies-kept-in-step/* (new)}, scripts/walkthrough.mjs (new), scripts/contracts/{csp.test.mjs (new),head-count.test.mjs (new),profile-columns.test.mjs}, src/app/chat/page.js, src/components/CodeExplorer.jsx, src/components/playground/{ApiKeysTab,LimitsTab,MonitoringTab,TestingTab,UsageTab}.jsx, src/components/repo-details/{RepoDetailsLayout,RepoVideoTab}.jsx, src/components/ui/particle-text-canvas.jsx, src/hooks/chat/useChatConversations.js, src/hooks/notifications/useNotifications.js, src/hooks/search/useGitHubSearch.js, src/hooks/trending/useTrendingData.js, src/lib/utils/repo/commentHelpers.js, docs/{bug-register.md,backend-map.md,coordination.md}.

Checks (Claude Code, Windows, Node 24.22.0, Chrome headless), after the last code change unless stated:
- `npm run test:contracts`: 1431 of 1431, after the last code change and this record. Each new guard was run against the defect: the old policy fails both policy tests, the old `LimitsTab.jsx` gives three findings, and `worker-src` alone fails the R-054 test.
- `npm run lint`: 0 errors, 0 warnings, exit 0 with `--max-warnings 0`.
- `npm run build`: passes (also the placeholder build twice, with and without `worker-src`).
- Walk-through, 88 page loads each: before the fixes, after them with `worker-src` (where the R-054 regression showed), and on the final state: the final state matched the first run exactly (366 errors, each of the same kind and count; no exception, no sideways scroll, at most one request after settling). The fixes cannot show there: the Realtime request goes to the placeholder `probe.invalid`, which `wss://*.supabase.co` does not cover. Most errors were the placeholder settings (an address that does not resolve), Vercel Analytics, which only Vercel serves, R-004 and R-068. Reports in the session scratchpad only.
- backend: `go test -count=1 ./...` 32 packages pass (the first `npm run handoff` stopped here, at the policy drift, before the Go copy was changed); `go vet ./...` clean; `gofmt -l .` empty. learn-go `-tags solution`: 38 packages pass; lesson 37's exercise fails only its own tests.
- `git diff --check`: clean. `npm run handoff` runs every suite again after this record is saved.
Not checked: a signed-in walk-through (needs a test account, BUG-002); Realtime against a real project (only the policy: the guard and Chrome on a test page); the playground tabs, chat page and search page in a signed-in browser (lint and build only); R-054's options B and C.

Remaining gates: the owner's choice for R-054 (A, B or C) and R-004 (where error reports go); a test account for the signed-in walk-through; independent review; cutover per `docs/cutover.md`.
Next bounded action: the owner's first preview switch (step 1 of `docs/cutover.md`). For agents meanwhile: an independent review, or Phase 6 entries that wait for neither cutover nor the owner.
Writer released: yes. The placeholder server was stopped; nothing is left running. Account usage is not visible to Claude Code.

## Previous handoff: CUTOVER-001, the cutover runbook (Claude Code, 2026-10-19)

Status: **complete (documentation only).** Nothing switched, nothing deployed.
Owner: Claude Code. Base `c41bea7` (DATA-PROXY-001, local commit). Resulting commit: a local commit after this record.
Owner instruction (2026-10-19): "continue the migration, let's wrap it up, work in large chunks". With every browser data area and 23 of 25 API routes reachable through Go, what remains is mostly switching on, which the owner does; this runbook is for that.

Done:
- `docs/cutover.md` (new): the two switches (`SEFGH_GO_ROUTES`, `NEXT_PUBLIC_SEFGH_GO_DATA`) and rollback; the Go project's settings per step; an order in eight steps from public reads to the AI routes, each with what to check on a preview; the differences a visitor could notice; what is not ready (KEYS-001; the trending refresh, replaced); what follows (Phase 6 fixes in Go, Phase 7 removals). Every one of the 24 route switches and 11 data areas is named (checked by script against `next.config.mjs` and `src/lib/go-areas.mjs`).
- `docs/hosting-setup.md`: the route-name list brought up to date, and a pointer to the runbook.

Changed files: docs/cutover.md (new), docs/hosting-setup.md, docs/coordination.md.
Checks: `git diff --check` clean; the switch-name check above; `npm run handoff` below.

Remaining gates: the owner's switching, preview first, step by step; independent review of the unreviewed tasks (DATA-001a/b, DATA-002, DATA-PROXY-001, TREND-001a/b among them); KEYS-001 (catalog evidence); R-103, R-090, R-088, R-086 (owner).
Next bounded action: the owner's first preview switch (step 1 of `docs/cutover.md`). For agents meanwhile: Phase 6 fixes that do not wait for cutover (browser and UI entries), or an independent review.
Writer released: yes.

## Previous handoff: DATA-PROXY-001, the remaining browser data areas through Go (Claude Code, 2026-10-19)

Status: **implementation complete; awaiting independent review; not deployed; off by default.** Live change once deployed: the browser's Supabase client has a routing fetch, which with `NEXT_PUBLIC_SEFGH_GO_DATA` unset passes every request through unchanged (checked with the real supabase-js).
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base `ba354ac`. Resulting commit: a local commit made at the owner's request after this record (the Git Agent may push it).
Owner decisions (2026-10-19, asked in this session): a Go policy proxy for the remaining areas instead of one endpoint package each; local commits per chunk.

Done:
- `backend/internal/dataproxy`: `/api/data/{area}/rest/v1/{table or rpc/name}` checks each request against the embedded `policy.json` (nine areas: notifications, profile, user-stats, home, submissions, search-stats, conversations, repo-page, activity; their tables or functions, methods and writable fields) and forwards it unchanged with the caller's token and the server's public key; the reply's status, body and `Content-Range` come back. Refusals are 403 in the Data API's error shape; 20-second budget with a read deadline, 4 MiB bodies, 16 MiB replies; logs name area, table and status only (a test caught the first version logging the URL). `dataMux` in `cmd/api`, `data_wiring_test.go`, write-timeout check.
- Browser: `src/lib/go-areas.mjs` (the area list and `usesGo`, shared by the browser and `next.config.mjs`); `src/lib/supabase/data-routing.js` (`routedFetch`: switched-on areas' Data API requests to `/api/data`, a 404 not marked by Go falls back to Supabase directly, everything else unchanged); `client.js` uses it; `go-data.js` re-exports `usesGo`. `next.config.mjs` rewrites `/api/data/{area}/:path*` for listed areas.
- `scripts/contracts/data-proxy.test.mjs`: the browser's area list equals the Go policy; routing rules; real supabase-js through the routing fetch; an inventory of every database write the browser code makes on a proxied table (29), each allowed by the policy except the one with no caller (`updateStats`, refused: R-103), and a failure when a write is added or removed.
- Probe: three proxy requests through Next.js (a read, a write, a refused stats update). It showed Next's rewrite re-encodes the query (`%2A` arrives as `*`), which the Data API reads the same; recorded in the ADR.
- Lesson 36 (a policy proxy: `go:embed`, `{rest...}`, forwarding unchanged, refusing in the library's shape; exercise `targetOf`). Docs: ADR (decision, three recorded differences, dated note), plan update, backend README section and route row, backend map, register (R-103 note).

Changed files: backend/internal/dataproxy/{handler.go,handler_test.go,policy.json} (new), backend/cmd/api/{main.go,main_test.go,data_wiring_test.go (new)}, backend/README.md, src/lib/{go-areas.mjs (new),go-data.js}, src/lib/supabase/{client.js,data-routing.js (new)}, next.config.mjs, scripts/contracts/{data-proxy.test.mjs (new),go-forwarding-probe.mjs}, learn-go/{README.md,36-a-policy-proxy/* (new)}, docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md,plans/browser-data.md}.

Checks (Claude Code, Windows, Node 24.22.0, Go 1.27.2), after the last code change:
- `npm run test:contracts`: 1427 of 1427 before the last test was added; `data-proxy.test.mjs` 4 of 4 after it. `npm run lint`: 0 errors, 16 warnings (unchanged). `npm run build`: passes. `git diff --check`: clean.
- backend: `go test -count=1 ./...` 32 packages pass; `go vet ./...` clean; `gofmt -l .` empty. learn-go `-tags solution`: 37 packages pass; lesson 36's exercise fails only its own test.
- Forwarding probe (dev): 149 of 149 identical, three data proxy requests among them.
- `npm run handoff` runs after this record is saved (all suites).
Not checked: any area switched on in a browser or against the real database; the routing fetch in a real browser (only with the real supabase-js in Node). **Before switching an area on, check it on a preview**: with the proxy every Data API call of that area takes one more hop.

Remaining gates: independent review; per-area switching on a preview, then production, area by area; R-103 (owner, schema); KEYS-001 blocked on catalog evidence; R-090, R-088, R-086 as before. Phase 6 (bug fixing) and Phase 7 (retiring the direct paths, dead code and the Next.js handlers) follow the cutovers.
Next bounded action: with every browser area and 23 of 25 routes reachable through Go, what remains is cutover work the owner switches (preview first), KEYS-001 once the catalog query can run, and Phase 6 fixes. A cutover checklist per route and area would be the next useful document.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: DATA-002, onboarding in Go (Claude Code, 2026-10-19)

Status: **implementation complete; awaiting independent review; not deployed; off by default.** No live change: without `onboarding` in `NEXT_PUBLIC_SEFGH_GO_DATA` the module takes its direct path exactly as before.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base `1e67beb` (local commit of TREND-001b, DATA-PLAN-001 and DATA-001a/b, made at the owner's request; not pushed). Resulting commit: uncommitted; Git Agent commit and synchronization pending (base `1e67beb`).

Done:
- `backend/internal/onboarding`: `GET`, `POST` and `PATCH /api/onboarding`, each answering the database call's own result `{ data, error }` (the module branches on error codes, so only its three calls changed). Signed-in only, as the caller; the browser's user id a checked filter (another user's id gets row-level security's own `PGRST116` or `42501` without a request); updates limited to the fourteen fields the steps write (`Writable`), `user_id` included in what is refused.
- `supabaserest.Result` (supabase-js's `{ data, error }` for one reply) and `InsertListReturning` (a list insert with postgrest-js's quoted `columns`).
- `src/lib/go-data.js`: `goResult` and `resultFrom`; `src/lib/supabase/onboarding.js`: the three calls through `resultFrom`.
- Browser runner: a fixed clock, console quieted, a list of Go answers in order, and `postgrestResult` (the real postgrest-js works out what Go must answer).
- Contract `contracts/onboarding` v1, 34 cases (`record-onboarding.mjs`, `onboarding.test.mjs`: 103 tests on the direct path, switched, and with the Go route missing); Go `TestContract` 34 of 34; unit tests: two-user isolation on all three endpoints, bad bodies, logs. `onboardingMux` and `onboarding_wiring_test.go`; `next.config.mjs` area `onboarding`; rewrite test; six probe requests.
- Register: R-103 (any user can set their own stats; `user_stats` write rule), and three Phase 7 dead-code items (`resetOnboarding`, `shares.js`, the trending refresh). Lesson 35 (answering the library's own result; a map as a set; exercise `firstNotAllowed`).

Changed files: backend/internal/onboarding/{handler.go,handler_test.go,contract_test.go} (new), backend/internal/supabaserest/supabaserest.go, backend/cmd/api/{main.go,onboarding_wiring_test.go (new)}, backend/README.md, src/lib/go-data.js, src/lib/supabase/onboarding.js, next.config.mjs, scripts/contracts/{browser-db-fixture.mjs,go-rewrites.test.mjs,go-forwarding-probe.mjs}, scripts/contracts/{record-onboarding,onboarding.test}.mjs (new), contracts/onboarding/{cases.json,README.md} (new), learn-go/{README.md,35-answering-the-librarys-own-result/* (new)}, docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md,plans/browser-data.md}.

Checks (Claude Code, Windows, Node 24.22.0, Go 1.27.2), after the last code change:
- `npm run test:contracts`: 1424 of 1424. `npm run lint`: 0 errors, 16 warnings (unchanged). `npm run build`: passes. `git diff --check`: clean.
- backend: `go test -count=1 ./...` 31 packages pass; `go vet ./...` clean; `gofmt -l .` empty. learn-go `-tags solution`: 36 packages pass; lesson 35's exercise fails only its own test.
- Forwarding probe (dev): 146 of 146 identical, six onboarding requests among them (another user's id answered without a database request).
- Deliberate breaks, each restored byte for byte: 14 tried, all caught after one case was added (`update-empty-reply`) and one break that did not compile was redone: the client's id trusted on read, create and update; the allowlist skipped; `user_id` writable; signed out let through; the insert as an object, without `columns`, or with unquoted columns; the update without the row back; another error code for no row; the network error without supabase-js's text; a refusal answered as data; an empty success answered as an error.
- `npm run handoff` runs after this record is saved.
Not checked: the area switched on against a real Supabase project or in a browser.

Remaining gates: committing DATA-002 (and pushing `1e67beb`, when the owner wants); independent review; switching `onboarding` on after a preview; R-103 needs the owner. KEYS-001 blocked; R-090, R-088, R-086 as before.
Next bounded action: notifications (DATA-004), the next area in the plan's order after user stats. User stats (DATA-003) needs a React hook harness and the owner's R-103 decision first, so it is the better one to take after notifications.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: DATA-001b, search history in Go (Claude Code, 2026-10-19)

Status: **implementation complete; awaiting independent review; not deployed; off by default.** No live change: without `search-history` in `NEXT_PUBLIC_SEFGH_GO_DATA` the module takes its direct Supabase path exactly as before (the direct-path contract passes unchanged).
**Not committed.** The Git Agent has not committed since `042b560` (TREND-001a): two watches of 15 and 10 minutes saw no commit. This tree holds TREND-001b, DATA-PLAN-001, DATA-001a and DATA-001b; this handoff's signal covers all four; their records follow below.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base `e927dba`. Resulting commit: not yet made.

Done:
- `backend/internal/searchhistory`: five endpoints (`POST`, `GET`, `DELETE /api/search-history`, `DELETE /api/search-history/{id}`, `GET /api/search-history/count`), each answering exactly what its browser function returns; signed-in only, with the caller's own token; the browser's user id only as a filter checked against the verified caller (another user's id gets the row-level-security outcome without a request). R-102 copied, not fixed. `historyMux` in `cmd/api`; `history_wiring_test.go`.
- `src/lib/go-data.js` (new): `usesGo(area)` reads `NEXT_PUBLIC_SEFGH_GO_DATA`; `askGo` answers the endpoint's value, `NOT_SERVED` on 404 (the module then takes its direct path), or the module's fallback on any other failure. `src/lib/supabase/search-history.js`: each function asks Go when the area is on, after its own argument checks.
- `next.config.mjs`: `goDataAreas`; the same setting adds `/api/search-history` and `/api/search-history/:path*` rewrites when `SEFGH_GO_API_URL` is set; the route list cannot switch a data area. New rewrite test.
- Contract `contracts/search-history` now 35 cases (5 `defect`; two added after deliberate breaks found gaps: `save-without-source`, `count-other-user`), with `expect.go_request` recorded from the switched module. Node: 101 tests (direct, switched, Go route missing). Go `TestContract` replays the 30 Go requests. Unit tests: two-user isolation (ADR Phase 3 gate), body limit, logs.
- Probe: seven search-history requests through the data-area rewrite (one id holding `%2F`), with `NEXT_PUBLIC_SEFGH_GO_DATA=search-history` for Next.js.
- Lesson 34 (a browser call moves to the server: the fallback, never trusting a client's id, `ServeMux` precedence, closures and method values; exercise `countSources`). Index updated.
- Docs: contract README, backend README section and route row, ADR (Phase 3 row, dated note), backend map, plan status, register (R-102 status).

Changed files (this task): backend/internal/searchhistory/{handler.go,handler_test.go,contract_test.go} (new), backend/cmd/api/{main.go,history_wiring_test.go (new)}, backend/README.md, src/lib/go-data.js (new), src/lib/supabase/search-history.js, next.config.mjs, scripts/contracts/{browser-db-fixture.mjs,record-search-history.mjs,search-history.test.mjs,go-rewrites.test.mjs,go-forwarding-probe.mjs}, contracts/search-history/{cases.json,README.md}, learn-go/{README.md,34-a-browser-call-moves-to-the-server/* (new)}, docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md,plans/browser-data.md}.

Checks (Claude Code, Windows, Node 24.22.0, Go 1.27.2), after the last code change:
- `npm run test:contracts`: 1321 of 1321. `npm run lint`: 0 errors, 16 warnings (unchanged). `npm run build`: passes. `git diff --check`: clean.
- backend: `go test -count=1 ./...` 30 packages pass; `go vet ./...` clean; `gofmt -l .` empty. learn-go `-tags solution`: 35 packages pass; lesson 34's exercise fails only its own test, as intended.
- Forwarding probe (dev): 140 of 140 identical, including seven search-history requests.
- Deliberate breaks against the Go contract, each restored byte for byte: 14 tried, all caught after two cases were added (the client's user id trusted on save, list, clear and count; signed out let through; ascending order; the source filter dropped on list and clear; an empty list answered null; missing fields written as null; a failed save answered with the error; a failed delete answered true; chat not counted; the counter called early, which would fix R-102 before the switch).
- `npm run handoff` runs after this record is saved.
Not checked: the area switched on against a real Supabase project or in a browser; `-race` locally.

Remaining gates: the Git Agent's commit of the four tasks; independent review; turning `search-history` on (a preview first: it needs `SEFGH_GO_API_URL` and the setting, and then the page's history, saving and clearing checked in a browser); then R-102 fixed once in Go. KEYS-001 blocked on catalog evidence; R-090, R-088, R-086 as before.
Next bounded action: DATA-002 (onboarding) and DATA-003 (user stats) the same way, from `docs/plans/browser-data.md`; each needs its table's definitions checked before its writes move.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: DATA-PLAN-001 and DATA-001a, browser database calls (Claude Code, 2026-10-19)

Status: **complete: a plan (documentation) and a characterization (tests and fixtures only). No application behaviour changed.** Not committed: the Git Agent did not commit TREND-001b after about half an hour (no commit within a 15-minute watch either), so this batch is stacked on it. The tree now holds TREND-001b, DATA-PLAN-001 and DATA-001a, and this handoff's signal covers all three. TREND-001b's own record is below.
Owner: Claude Code. Reviewer: none; no peer review claimed.
Branch main; base `e927dba` (TREND-001a at `042b560`). Resulting commit: not yet made.
Owner decision (2026-10-19, asked in this session): browser areas switch by a per-area list in a public build setting (option A of the plan). Recorded in the ADR's decisions log and in the plan.

Done:
- **DATA-PLAN-001:** `docs/plans/browser-data.md`: survey of the browser's direct database calls (25 files, 19 tables, 3 functions, 7 Realtime channels), what stays (Auth, Realtime, row-level security), how one area moves (characterize, port with the user's bearer, switch the module by area, Phase 7 removes the direct path), the owner's choice, an order of nine areas, and the evidence still needed for writes.
- **R-102 (found):** `saveSearchHistory` never sends `increment_platform_stat` because the call is not awaited; checked with the real supabase-js. Characterized as `defect` cases; fixed once in Go.
- **DATA-001a:** `scripts/contracts/browser-db-loader.mjs` and `browser-db-fixture.mjs` (a runner for browser modules: the real supabase-js with the browser client's session, installed before the module loads); `contracts/search-history` version 1, 32 cases (3 `defect`), recorded by `record-search-history.mjs`; `search-history.test.mjs` (33 tests). `go_database` marks the cases where Go will ask nothing (signed out, another user's id).
- Corrected this agent's three earlier records of today: they ran on Node 24.22.0, not 21.7.1.
- Docs: plan, contract README, ADR (decision, dated note), backend map, register (R-102).

Changed files (this batch): docs/plans/browser-data.md (new), contracts/search-history/{cases.json,README.md} (new), scripts/contracts/{browser-db-loader,browser-db-fixture,record-search-history,search-history.test}.mjs (new), docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md}. Plus TREND-001b's files, listed in its record.

Checks (Claude Code, Windows, Node 24.22.0, Go 1.27.2):
- `node --test scripts/contracts/search-history.test.mjs`: 33 of 33. The full suites run in `npm run handoff` below.
- `git diff --check`: clean.
Not checked: lint and build for this batch (no application code changed since TREND-001b's build); the module against a real Supabase project.

Remaining gates: the Git Agent's commit of the three tasks; independent review; TREND-001b's own gates (CDN caching on a preview); KEYS-001 blocked on catalog evidence; R-090, R-088, R-086 as before.
Next bounded action: **DATA-001b**: Go endpoints for search history (`internal/searchhistory`, the user's bearer, the module's user id as a checked filter), the module switched by `NEXT_PUBLIC_SEFGH_GO_DATA` containing `search-history`, contract and isolation tests, a lesson; then R-102 is fixed once in Go.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: TREND-001b, the trending page reads the topics endpoint (Claude Code, 2026-10-19)

Status: **implementation complete; awaiting independent review; not deployed**. Live change once synchronized and deployed: the trending page asks `/api/trending/topics` for its topic sections instead of reading `trending_repos`. While the `trending-topics` switch is off that answer is a 404, so the page shows the main list only, as it effectively did with the empty table, and the browser's network log shows one 404 per visit. The "Data is older than 3 days" badge is gone.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base `e927dba` (TREND-001a at `042b560`, pushed). Resulting commit: not yet made; the Git Agent commits after `npm run handoff`.

Done:
- `src/lib/trending-topics.js` (new): `fetchTrendingTopics` flattens the topics' repositories in order, each once, with `generatedAt`; any failure (404, 502, no reply, not JSON, a wrong shape) gives no repositories and no date. `mergeTrending` puts the topic rows before the main list and keeps each repository once, so one in both keeps its topic badge.
- `useTrendingData.js`: one `fetchTopics` replaces the table read and the freshness check; returns `topicRepos`; the table-based mapping is gone (Go maps the rows now). `page.js` merges with `mergeTrending`. `TrendingFilters.jsx`: the stale badge and its unused `Badge` import removed; "Last updated" now shows the answer's search date.
- Guard `scripts/contracts/trending-page.test.mjs` (4 tests); run against the old page code, the R-100 test fails. `trending-star.test.mjs` (R-060) checked the removed hook mapping for `url`; it now checks the trending-topics contract's row instead, through `githubRepoUrl`.
- Register: R-100 fixed; R-077 progress. ADR dated note; backend map.

Changed files: src/lib/trending-topics.js (new), src/hooks/trending/useTrendingData.js, src/app/trending/page.js, src/components/trending/TrendingFilters.jsx, scripts/contracts/trending-page.test.mjs (new), scripts/contracts/trending-star.test.mjs, docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md}.

Checks (Claude Code, Windows, Node 24.22.0 (corrected 2026-10-19: first written as 21.7.1, the version earlier sessions used)):
- `npm run test:contracts`: 1219 of 1219. `npm run lint`: 0 errors, 16 warnings (unchanged; the one in `useTrendingData.js` is the existing filter-effect warning). `npm run build`: passes. `git diff --check`: clean.
- No Go code changed, so no lesson; `npm run handoff` runs the Go and learn-go suites.
Not checked: the page in a browser (with the switch on or off); the switch on against real GitHub.

Remaining gates: independent review; CDN caching verified on a preview before `trending-topics` is switched on; KEYS-001 blocked on catalog evidence; R-090, R-088, R-086 as before.
Next bounded action: **TREND-001c**: a caller audit of `src/lib/trending.js` and `/api/trending/refresh`, retire the route (keeping the 25-route count honest: retired, not ported) and the table helpers, and prepare a reviewed migration to drop `trending_repos` without applying it.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: TREND-001a, `GET /api/trending/topics` in Go (Claude Code, 2026-10-19)

Status: **implementation complete; awaiting independent review; not deployed; off by default**. No live change: the page does not call the endpoint yet, and without the switch Next.js has no handler for it.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base `9203581` (TREND-PLAN-001 and BUG-009 at `0ea050c`, pushed). Resulting commit: uncommitted; Git Agent commit and synchronization pending (base `9203581`).
Owner decision (2026-10-19, asked in this session): R-077 option A, "live + CDN cache". Recorded in the ADR's decisions log and at the top of `docs/plans/trending-refresh.md`.

Done:
- `backend/internal/trendingtopics`: six GitHub searches, two at a time within a 20-second `Budget`, with the public transport and never a caller's credential. A failed topic is answered empty with `complete: false`; all failed is 502 `no-store`. Cache headers: six hours (`s-maxage=21600`, `stale-while-revalidate=3600`) when complete, five minutes when partial. Items mapped by `githubtrending.Item`, now exported from the trending route (its contract still passes), plus `topic` and `topicIcon`.
- Found R-101 while building it: GitHub refuses `OR` between `topic:` qualifiers with 422, so the old refresh's searches could never have worked (checked with three read-only, unauthenticated calls to GitHub's public search). The endpoint searches the same words as text; results are broader than an exact topic match.
- Contract `contracts/trending-topics` version 1, 11 hand-written cases (no Next.js handler exists), expected items computed by a separate script; Go `TestContract` 11 of 11; `trending-topics.test.mjs` checks the fixtures (one search per topic, no `topic:` in any search, cache headers by outcome). Unit tests: two at a time, the budget's deadline on every hanging search (deterministic, as BUG-009), and logs without URLs.
- Wiring: `topicsMux` (GET only) with the public transport; `topics_wiring_test.go` (no credential reaches GitHub, cache header, 405); the write-timeout check covers the budget. Next.js switch `trending-topics` (off), rewrite test, two probe requests; the probe masks `generatedAt` and sorts the concurrent searches for this route.
- Lesson 33 (`WaitGroup.Go`, partial answers, `max-age` against `s-maxage` and `no-store`, never caching who asked; exercise `answer`). Index updated.
- Docs: contract README, backend README section and route row, ADR (decision, Phase 4 row, dated note), backend map, plan decision note. Register: R-101 new, fixed in Go; R-077 in progress.

Changed files: backend/internal/trendingtopics/{handler.go,handler_test.go,contract_test.go} (new), backend/internal/githubtrending/handler.go, backend/cmd/api/{main.go,main_test.go,topics_wiring_test.go (new)}, backend/README.md, contracts/trending-topics/{cases.json,README.md} (new), scripts/contracts/trending-topics.test.mjs (new), scripts/contracts/{go-rewrites.test.mjs,go-forwarding-probe.mjs}, next.config.mjs, learn-go/{README.md,33-partial-answers-and-shared-caches/* (new)}, docs/plans/trending-refresh.md, docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md}.

Checks (Claude Code, Windows, Node 24.22.0 (corrected 2026-10-19: first written as 21.7.1, the version earlier sessions used), Go 1.27.2), run one after another:
- `npm run test:contracts`: 1215 of 1215. `npm run lint`: 0 errors, 16 warnings (unchanged). `npm run build`: passes. `git diff --check`: clean.
- backend: `go test -count=1 ./...` 29 packages pass; `go vet ./...` clean; `gofmt -l .` empty. learn-go `-tags solution`: 34 packages pass, vet clean, gofmt empty; lesson 33's exercise fails only its own test, as intended.
- Forwarding probe (dev): 133 of 133 identical, including two topics requests (one with caller credentials, checking status and the cache header through Next.js).
- Deliberate breaks against the contract, each run then restored byte for byte (13 tried, 12 caught): the old `topic:` query, a 7-day window, no star minimum, ten per topic, the list not cut, a partial answer cached for six hours, all-failed answered 200, the topic id instead of its name, an item without an owner kept, a byte-order mark not skipped, `url.QueryEscape` encoding, `generatedAt` in another format. Not caught: clearing a failed topic's repositories, because the search already returns none with an error; that line was dead and was removed.
- `npm run handoff` runs after this record is saved.
Not checked: how Vercel's CDN caches the answer (a gate before the switch is turned on); `-race` locally; real GitHub through the Go server (only the three direct query checks above).

Remaining gates: independent review; verify CDN caching on a preview; then TREND-001b. KEYS-001 still blocked on catalog evidence. R-090, R-088 and R-086 as before.
Next bounded action: **TREND-001b**: the trending page reads `/api/trending/topics` (degrading to no topic sections when it is unavailable, as with the switch off), drops the repeated repositories when merging the lists, and fixes R-100 with the answer's own `generatedAt`; then **TREND-001c**: a caller audit, retire `/api/trending/refresh` and the table reads, and propose a reviewed migration to drop `trending_repos`.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: TREND-PLAN-001 and BUG-009 (Claude Code, 2026-10-19)

Status: **complete. TREND-PLAN-001 is a plan for the owner (documentation only); BUG-009 fixes test code only. Nothing deployed, no route switched, no database change.**
Owner: Claude Code. Reviewer: none; no peer review claimed.
Branch main; base `24ed16a` (PHASE2-001 at `80bc459`, pushed, `go-backend` at `80bc459`). Resulting commit: uncommitted; Git Agent commit and synchronization pending (base `24ed16a`).
Owner instruction (2026-10-19): "continue where codex stopped". Codex's next batch was: Git Agent sync (done), monitor hosted CI, then `trending/refresh` (R-077) or KEYS-001 if catalog access is granted. Both routes need the owner, so this batch prepared the R-077 decision and fixed an approved bug instead.

Done:
- **TREND-PLAN-001:** `docs/plans/trending-refresh.md`, four options for R-077 with a recommendation: (A) no stored table, Go serves the topic searches live behind the CDN's cache; (B) keep the table, a secret-gated `SECURITY DEFINER` replace function; (C) keep the table, a least-privilege Postgres role over a direct connection (needs a third-party driver); (D) remove the topic sections. Recommended A. Found and registered R-100: `/trending` always says "Data is older than 3 days" because the freshness check reads the empty table; it is fixed with whichever option is chosen. ADR dated note; R-077 points to the plan.
- **BUG-009 (R-091):** the comments and videos `TestDetailsBudgetBoundsHangingReads` now check that every hanging read carries the budget's deadline (deterministic), and stop waiting after 30 seconds instead of timing the reply against 2 seconds. The github-access deadline test is bounded by the four-second default deadline, with a 10-second test timeout. The chat allowance test had already been fixed in PHASE2-001.
- R-098 and R-099 statuses brought up to date: fixed in `80bc459`, reviewed in PHASE2-001.

Changed files: docs/plans/trending-refresh.md (new), docs/{bug-register,coordination}.md, docs/adr/0002-go-backend.md, backend/internal/comments/handler_test.go, backend/internal/videos/handler_test.go, scripts/contracts/github-access.test.mjs.

Checks (Claude Code, Windows, Node 24.22.0 (corrected 2026-10-19: first written as 21.7.1, the version earlier sessions used), Go 1.27.2):
- `npm run test:contracts`: 1214 of 1214. `git diff --check`: clean. `go vet` and `gofmt -l` on comments and videos: clean.
- The three rewritten tests pass, and each was run against a deliberately broken subject, then restored byte for byte: the default 16-second budget instead of the configured one (comments and videos: "8 reads had no deadline within the 50ms budget"); no budget at all (comments: "no reply after 30 seconds"); the identity check ignoring `deadlineMs` (github-access: failed at 4042 ms).
- `npm run handoff` runs after this record is saved; a failure would be recorded here by a further edit.
- Hosted CI for PHASE2-001: **not checked**. `gh` is not installed here, the repository is private, and the GitHub tools available have no workflow-run call.
Not checked: lint and build (no application code changed).

Remaining gates and owner decisions:
- **R-077: choose A, B, C or D** in `docs/plans/trending-refresh.md`. R-100 follows the choice.
- **KEYS-001:** catalog evidence still blocked. The Supabase connector needs authorizing in claude.ai connector settings, or the owner runs `supabase/checks/keys_001_catalog.sql` in the SQL editor and shares the output (no key values are selected).
- Still open from before: R-090 (owner's after-cutover decision recorded by AVATAR-001), R-088, R-086; switching any route on.
Next bounded action: on the owner's R-077 choice, TREND-001a (option A) or the option's first task as listed in the plan; KEYS-001a when catalog evidence is available.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: PHASE2-001, whole Phase 2 gate closure and verification (Codex & Claude Code, 2026-10-19)

Status: **implementation and verification complete for all seven Phase 2 routes; independently reviewed; off by default (trending on in prod); not deployed**.
Owner: Codex (implementation & safety fixes), Claude Code (pickup, verification, and handoff closure).
Reviewers: Euclid (AI-002b/c, provider, limiter, wiring), Bacon (Phase 2 acceptance probe and R-098/R-099 fix diff).
Branch: `main`; base/current commit `4144b3dffa3d70b9b97e5a50c9d42a6e0e05e536`.
Resulting commit: uncommitted; Git Agent commit and synchronization pending (base `4144b3d`).

Pickup & Context:
- Owner instruction (2026-10-19): Codex reached usage limit; Claude Code picked up and completed remaining verification and handoff closure.
- Preserved all Codex changes in working tree without resets or destructive edits.

Done in PHASE2-001:
- Closed Phase 2 implementation, review, and verification gates across all 7 routes: `GET /api/github/languages`, `GET /api/github/contributions`, `GET /api/github/trending`, `GET /api/github/trending-developers`, `POST /api/ai/suggestions`, `POST /api/ai/enhance-query`, `POST /api/ai/chat`.
- Addressed R-098: Bound whole AI request lifecycle and connection read deadline (`ailimit.BoundRequest` with 25s `RequestBudget`, connection read deadline on incoming body).
- Addressed R-099: Confined AI provider client redirects (`CheckRedirect` returns `http.ErrUseLastResponse`) so credentials and conversation bodies are never forwarded across origin/port/scheme changes.
- Added safety tests in `backend/cmd/api/ai_safety_test.go` verifying redirect credential isolation across models, openai, anthropic and stalled-body read timeouts across all 3 AI routes.
- Added stateful acceptance probe `scripts/contracts/phase2-probe.mjs` and `--phase2` flag in `scripts/contracts/go-forwarding-probe.mjs` covering 69 requests across 6 gate checks (anonymous rejection, 30/31 allowance boundary with positive Retry-After, user vs IP isolation, public helper fallback sharing, system-role injection rejection, oversized query rejection).
- Updated `.github/workflows/backend-verification.yml` to run the production probe with `--phase2`.
- Added Lesson 32 in `learn-go/32-request-budgets-and-redirects/` with README, exercise, solution, and tests.
- Recorded bugs R-098 and R-099 in `docs/bug-register.md`.

Changed files:
`backend/internal/ailimit/{request,request_test}.go` (new);
`backend/cmd/api/ai_safety_test.go` (new);
`scripts/contracts/phase2-probe.mjs` (new);
`learn-go/32-request-budgets-and-redirects/*` (new);
`backend/internal/aichat/handler.go`, `backend/internal/aienhance/handler.go`, `backend/internal/aisuggestions/handler.go`;
`backend/internal/aiprovider/provider.go`, `backend/cmd/api/{ai_wiring_test,main_test}.go`;
`scripts/contracts/go-forwarding-probe.mjs`, `.github/workflows/backend-verification.yml`;
`learn-go/README.md`, `docs/{coordination,bug-register}.md`.

Checks (Windows / Node 21.7.1 / Go 1.27.2):
- backend Go tests: **28/28 packages pass** (`go test -count=1 ./...`); `go vet ./...` clean; `gofmt -l .` empty.
- learn-go tutorial suite: **33/33 packages pass** (`go test -count=1 -tags solution ./...`); solution vet clean; gofmt empty.
- Contract fixtures: **1214/1214 pass** (`npm run test:contracts`).
- Handoff state regression: **8/8 pass** (`node --test scripts/contracts/handoff-state.test.mjs`).
- ESLint: **0 errors, 16 existing warnings** (`npm run lint`).
- Production forwarding probe (`--production --phase2`): **131/131 identical scenarios**, Phase 2 acceptance **69 requests / 6 checks pass**.

Not checked / remaining gates:
- Hosted GitHub Actions CI run (monitored after push).
- Phase 2 cutover: routes remain disabled by default in `next.config.mjs` (only trending is live on production `sefgh-main`). Cutover and retirement of Next.js handlers remain separate future gates per ADR-0002.
- KEYS-001 schema access remains permission-blocked on Supabase.

Next bounded batch:
1. Git Agent commits PHASE2-001, pushes to `main`, and fast-forwards `go-backend`.
2. Monitor hosted CI run.
3. Next route port: `GET /api/trending/refresh` (R-077 worker/atomic-write design) or KEYS-001 if catalog access is granted.

Writer released: yes. All probe/test servers exited cleanly.

## Previous handoff: AVATAR-001a/b, contract and Go avatar port (Codex, 2026-10-18)

Status: **implementation complete; independently unreviewed; off by default; not deployed**.
Owner: Codex. Reviewer: unassigned; no peer review claimed.
Branch main; base/current commit `4f8c815840af963b37955a3010c20b588c8546d9`.
Resulting commit: `72491c7`, Git Agent commit verified locally and on both remote branches before PHASE2-001.

Pickup and owner decisions:
- Verified `AGENTS.md`, prior handoff, status/log and writer release. SHARE-002/BATCH-001 committed by Git Agent at `7b71c07` on both branches; remote main had only a later timestamp update, fast-forwarded cleanly to `4f8c815` before claiming writer. No existing dirty source was overwritten.
- Retried key-schema catalog read: connector again refused `You do not have permission to perform this action`; no data or SQL mutation. Followed the recorded fallback: avatar characterization and port/wiring/tutorial in one batch. R-039 real-key direction and R-090 after-cutover decision remain unchanged.

Done:
- **AVATAR-001a:** `contracts/upload-avatar` version 1, 45 recorded cases, 23 defect. Installed Storage/Auth/PostgREST SDK; multipart requests; binary uploads compared by byte count and SHA-256. Session/HTTP/clock stand-ins; SDK Auth update retains real HTTP/parsing. Cleanup drained before globals restored. `engine_message` pins error detail presence, status, message category and call order without Node-version-specific wording.
- **AVATAR-001b:** `backend/internal/avatar` preserves upload, bucket-error fallback, metadata/profile writes and cleanup selection with the caller's bearer/public key. Six-MiB whole body, five-MiB existing file limit, 24-second whole-route budget including identity, connection read deadline, ten seconds per call, eight-MiB replies, redirects refused. Cleanup completes before response within a three-second child budget; deliberate difference recorded in ADR/README. No detached goroutine.
- Wiring `avatarMux`, real-socket caller-credential/405/signed-out test, write-budget guard, default-off `upload-avatar` switch and rewrite test. `AvatarUpload.jsx` uses `fetchWithSession` without setting multipart Content-Type manually.
- Production forwarding adds five multipart/auth/error cases, verifies upload bytes and upsert flag, normalizes only avatar timestamps across distinct requests. Lesson 31 covers readers, one-extra-byte size checks, multipart and deadlines; intentionally unfinished exercise plus solution/tests; existing exercises untouched.
- Register R-094 (MIME-only/extension/empty-file validation), R-095 (cleanup selection/concurrency), R-096 (partial writes), R-097 (error detail disclosure); preserved for later fixes. R-041's missing setup-file wording also preserved. Active ADR/backend map/README updated.

Changed files:
`backend/internal/avatar/{handler,handler_test,contract_test}.go` (new);
`backend/cmd/api/{main,main_test}.go`, new `avatar_wiring_test.go`;
`contracts/upload-avatar/{cases.json,README.md}` (new);
`scripts/contracts/{avatar-fixture,record-upload-avatar,upload-avatar.test}.mjs` (new);
`scripts/contracts/{go-forwarding-probe,go-rewrites.test}.mjs`;
`next.config.mjs`, `src/components/AvatarUpload.jsx`, `backend/README.md`;
`learn-go/README.md`, new `learn-go/31-bounded-file-streams/*`;
`docs/{coordination,backend-map,bug-register}.md`, `docs/adr/0002-go-backend.md`.

Checks (Codex, Windows / Node 21.7.1 / Go 1.27.2; suites run serially):
- Focused Node contract: **46/46**; Go avatar contracts all **45** pass, plus unit and real-socket server wiring checks.
- Six deliberate Go contract breaks all caught and restored byte for byte: MIME, size cap, upsert flag, Auth PUT method, cleanup threshold, profile owner filter.
- New slow-body socket regression caught an initial deadline reset that let net/http block draining an unfinished request body. Removing the reset fixed it; focused test and avatar suite passed before rebuilding the final binary.
- Recorder null-shape extension caught the new runner converting null to an empty object; corrected and rerecorded before accepting the final fixtures. Earlier Opaque URL assertion corrected to RequestURI. Two documentation/format commands first used the wrong working directory; corrected without altering unrelated files.
- Final production forwarding probe: **131/131 identical**, including five avatar cases, after production build. Separate rollback production build with Go switches empty: avatar answered **401 Unauthorized from Next.js**, no Go header. Both builds passed and test servers exited.
- Full `npm run test:contracts`: **1214/1214 pass**; `npm run lint`: **0 errors, 16 existing warnings**.
- backend `go test -count=1 ./...`: **28 packages pass**; vet clean; gofmt empty. Go binary built at ignored `backend/bin/sefgh-avatar-probe.exe`.
- Tutorial `go test -count=1 -tags solution ./...`: **32 packages pass**; solution vet clean; gofmt empty. Lesson 31 unfinished exercise fails only the intended tests; existing exercises preserved.
- `git diff --check`: clean. `npm run handoff` runs after saving this record and releasing the writer; checkpoint any failure before continuing. A signal is not a commit/push/deployment receipt.

Not checked / remaining gates:
- Independent review (especially cleanup timing, multipart/parser behavior and account isolation); local race detector (prior environment lacks C compiler), hosted CI, live Storage writes or current live policy/bucket configuration; deployment upload limits. No production state or environment changed.
- KEYS-001 schema/RPC evidence is still permission-blocked. No executable key migration applied, no paid resource/dependency added. API route progress 23/25 excludes browser Supabase operations and Python workers; whole migration is not complete.
- Preserved risks R-041 and R-094 to R-097 are not fixed or silently deferred; follow fix-once rules at cutover. R-090 stays for after Go cutover as the owner decided.

Next bounded batch:
1. Verify actual Git Agent commit with `git status --short`, `git log -3`, and `node scripts/agent-handoff.mjs --status`; read this handoff, then claim writer.
2. Independent avatar review plus BUG-008 helper review can be batched read-only. If key catalog access is restored, execute KEYS-001a/b/c from `plans/playground-keys.md`, preparing SQL for review before applying.
3. Otherwise characterize `trending/refresh` and prepare its worker/atomic-replacement design as a batch; R-077 privileges and schema gates must be settled before enabling writes. Do not port the plaintext key route as if R-039 were solved.

Writer released: yes. No avatar/probe/rollback servers left running. No test jobs remain except the final handoff command launched after this record. Account quota is not visible to Codex.

## Previous handoff: BATCH-001, review, recovery fixes and key-system decisions (Codex, 2026-10-18)

Status: **implementation complete for REVIEW-008 and BUG-008; key-system planning complete; awaiting Git Agent synchronization; no new route port or deployment**.
Owner: Codex. Reviewer: Codex independently reviewed Claude Code's SHARE-002; a different reviewer is needed for Codex's BUG-008 fixes.
Branch: `main`. Base/current commit: `bf67292e2e704a219929167673e457708ad063d7`.
Resulting commit: `7b71c07` (SHARE-002 + BATCH-001), committed by Git Agent; verified in local history and both remote branches on 2026-10-18 before AVATAR-001.

Pickup evidence:
- Read `AGENTS.md`, SHARE-002, architecture/ADR/review/bug records, and tutorial index. `git status --short` showed SHARE-002 still dirty; `git log -3` showed `bf67292`, `9486f35`, `7c894a0`. Both local branches were at `bf67292`; there was no signal file. The old synchronization stamp did not prove a commit. Previous writer was none/released; Codex claimed the writer before editing.
- Preserved Claude Code's SHARE-002 implementation, fixtures, lesson and browser changes. Codex has not committed, staged, reset, stashed or overwritten those source files.

Completed subtasks:
1. **REVIEW-008:** independent source/contract review of both SHARE-002 routes and their shared helpers and bearer wiring; acceptable with switches off, no cutover approval. Details in `claude-review.md`. No intentional mutations applied in this review. R-089 and R-090 remain recorded.
2. **BUG-008:** fixed R-092 (pre-commit stamp claimed synchronization) and R-093 (verification fingerprint omitted untracked content). New `scripts/handoff-state.mjs` hashes tracked/staged changes, HEAD and new file contents, fails on Git errors, and keeps pre-commit stamps explicitly pending without rewriting older handoffs. Eight temporary-repository/receipt regression tests. No backend Go changed, so no new tutorial exercise is required.
3. **KEYS-001 planning:** owner decisions recorded in the ADR and register. R-039: build real hashed/show-once keys, validate supported endpoints, server-side accounting; prepare database changes for review before applying. R-090: preserve until Go cutover, then fix in Go. Product direction is decided; no permission to apply SQL or switch a route on. Plan and three implementation subtasks in `plans/playground-keys.md`; read-only catalog preflight in `../supabase/checks/keys_001_catalog.sql`.

Changed by Codex: `docs/coordination.md`, `docs/claude-review.md`, `docs/bug-register.md`, `docs/backend-map.md`, `docs/adr/0002-go-backend.md`, new `docs/plans/playground-keys.md`, new `supabase/checks/keys_001_catalog.sql`, `scripts/agent-handoff.mjs`, new `scripts/handoff-state.mjs`, new `scripts/contracts/handoff-state.test.mjs`. The previous SHARE-002 changed-file inventory below remains attributed to Claude Code and is still in the same uncommitted tree.

Checks (Codex, Windows / Node 21.7.1 / Go 1.27.2):
- Focused share/fork Node contracts: **70/70 pass**. Targeted Go `shares`, `supabaserest`, `jscompat`, `sharetoken`: pass. cmd/api share and conversation wiring tests: pass.
- BUG-008 regression tests: **8/8 pass**; focused ESLint clean (baseline-browser-mapping age warning only).
- `npm run test:contracts`: **1168/1168 pass**, with no Go suite running concurrently.
- backend `go test -count=1 ./...`: **27 packages pass**; `go vet ./...` clean; `gofmt -l .` empty.
- learn-go `go test -count=1 -tags solution ./...`: **31 packages pass**; solution vet clean; gofmt empty. Owner exercises preserved.
- `npm run lint`: **0 errors, 16 existing warnings**, exit 0. `git diff --check`: clean.
- `npm run handoff` runs after this record is saved and writer released. A failure must be checkpointed before any new port. Its signal verifies the tree; it does not establish a commit, push, peer review or deployment.

Failure/dependencies/checks not run:
- Supabase connector refused a catalog-only query for `kohwfuxqbllsmvmsfqci`: `You do not have permission to perform this action`. No rows or key values read, no SQL applied. The 2026-10-15 snapshot lacks the full key/usage definitions; executable schema migration waits for read-only catalog evidence. The saved SQL is an unexecuted read-only check, not a migration.
- No new build, forwarding probe, local race run, hosted CI or live-route verification by Codex in this batch. Claude Code's prior SHARE-002 results below stay attributed to Claude Code. BUG-008 itself still needs peer review.
- SHARE-002 commit/push is not verified; do not port a new route until the Git Agent actually commits it. R-090's accepted risk remains until cutover. Account quota is not visible to Codex.

Next bounded batch (2-3 related subtasks, checkpoints between them):
1. Run `node scripts/agent-handoff.mjs --status`, `git status --short`, and `git log -3`; confirm SHARE-002 and BUG-008 files are in actual Git Agent commits. Never infer synchronization from a pre-commit stamp.
2. If the key catalog is available: KEYS-001a schema/contracts, KEYS-001b Go lifecycle and supported public-search API, KEYS-001c playground/reference. Prepare SQL for review; no live schema mutation or cutover. New Go work must update the tutorial.
3. If catalog access is still refused: AVATAR-001a characterization plus AVATAR-001b Go port/wiring/tutorial as one bounded batch after synchronization. Keys stay gated explicitly. Trending refresh requires its separate R-077/worker/atomic-write design.

Writer released: yes. No Codex test/server processes remain at handoff; the handoff command itself will run next. Existing SHARE-002 files preserved in place.

## Previous handoff: SHARE-002, `/api/conversations/[id]/share` and `/api/share/[token]/fork` (Claude Code, 2026-10-17)

Status: **implementation complete; awaiting independent review; not deployed; off by default**. Live change once synchronized: the share dialog (create and delete) and the shared page's fork button send the Supabase bearer (`fetchWithSession`); Next.js still answers both routes.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base `bf67292` (VIDEOS-001 at `9486f35`, pushed). Resulting commit: uncommitted on Codex pickup, 2026-10-18; the earlier Git Agent synchronization stamp was not supported by Git history. Synchronization must be verified after the actual commit.
Owner instruction (2026-10-17): "continue and paceup the implemetation". The two routes were taken as one bounded task because they share tables, sign-in rules and error handling.

Done:
- Shared runner `route-db-fixture.mjs`: `params` (path parameters, decoded as Next.js hands them; percent-encoded in the request's path) and `site_url` (`NEXT_PUBLIC_SITE_URL` per case). The six earlier contracts on it pass unchanged.
- Contracts `contracts/conversation-share` (45 cases, 14 `defect`) and `contracts/share-fork` (23 cases, 7 `defect`), version 1, recorded from the Next.js handlers at `bf67292` (`record-conversation-share.mjs`, `record-share-fork.mjs`, `conversation-share.test.mjs`, `share-fork.test.mjs`). Cases marked `engine_message` pin the status and that an error text is sent, not the text, which comes from the JavaScript engine (`engine-message.mjs`).
- `backend/internal/shares`: `Conversation` (POST, DELETE) and `Fork` (POST), 68 of 68. Unit tests: body limit, logs without the visitor's data, and the link's origin with and without `SiteURL` and forwarded headers.
- `supabaserest.ErrorMessage` (supabase-js's `error.message`, every test row checked against postgrest-js 2.78), `InsertSelect`, and `MissingSettings` (moved from `sharetoken`, which uses it). `jscompat.JSONParseMessage`.
- Wiring: `conversationsMux` (with `NEXT_PUBLIC_SITE_URL`) and the fork in `shareMux`; `shares_wiring_test.go`; `share_wiring_test.go` now expects the fork route to answer (401 signed out, 405 for GET) instead of 404. Next.js switches `conversation-share` and `share-fork`, rewrite test, eight probe scenarios and stand-ins (the Go server in the probe has `NEXT_PUBLIC_SITE_URL`). `ShareDialog.jsx` and `src/app/s/[token]/page.js`: the three calls use `fetchWithSession`.
- Lesson 30 (destructuring defaults against `||`, `undefined` fields that JSON leaves out, `slice(-50)` without negative indexes, error text; exercise `jsSlice`). Index updated.
- Docs: two contract READMEs, backend README "Shares (SHARE-002)", route table rows and `NEXT_PUBLIC_SITE_URL` in the settings table, ADR (Phase 3 row, two recorded differences, dated note; the stale Phase 1, 2 and 6 status cells brought up to date), backend map. Bug register: R-089 (error text sent to the browser), R-090 (a failed removal reports success; needs the owner), R-091 (three wall-clock tests that fail on a busy machine); R-081 annotated.

Changed files: backend/internal/shares/{handler.go,handler_test.go,contract_test.go} (new), backend/internal/supabaserest/{supabaserest.go,supabaserest_test.go}, backend/internal/sharetoken/handler.go, backend/internal/jscompat/{json.go,json_test.go}, backend/cmd/api/{main.go,share_wiring_test.go,shares_wiring_test.go (new)}, backend/README.md, contracts/{conversation-share,share-fork}/{cases.json,README.md} (new), scripts/contracts/{record-conversation-share,record-share-fork,conversation-share.test,share-fork.test,engine-message}.mjs (new), scripts/contracts/{route-db-fixture.mjs,go-rewrites.test.mjs,go-forwarding-probe.mjs}, next.config.mjs, src/components/ShareDialog.jsx, src/app/s/[token]/page.js, learn-go/{README.md,30-defaults-and-missing-values/* (new)}, docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md}.

Checks (Claude Code, Windows, Node 21.7.1, Go 1.27.2), after the last code change:
- `npm run test:contracts`: 1159 of 1160 while the Go suites ran at the same time; the one failure, "an issuer that never answers is given up on at the deadline" (`github-access.test.mjs`, unchanged since `d2320c2`), then passed alone three times out of three (R-091). `npm run lint`: 0 errors, 16 warnings (unchanged). `npm run build`: passes. `git diff --check`: clean.
- backend: `go test -count=1 ./...` 27 packages pass on a quiet machine. Under the same load, `TestChatAllowanceIsPerUserAndSeparate` (cmd/api) and `TestDetailsBudgetBoundsHangingReads` (comments) failed once on wall-clock bounds (R-091). `go vet ./...` clean; `gofmt -l .` empty. `-race` could not run here (no C compiler). learn-go `-tags solution`: 31 packages pass, vet clean, gofmt empty; lesson 30's exercise fails only its own tests, as intended.
- Forwarding probe (dev): 126 of 126 identical, including eight share and fork requests (a path id holding `%2F`, a body that is not JSON, DELETE, a refused session, signed out).
- Deliberate breaks against the contracts, each caught, then restored byte for byte (24 tried; 23 caught; 2 of them redone because they did not compile): `isPublic` defaulted when null; the title fallback only when missing; an empty summary kept; the snapshot uncapped, or the first 50; `p_title` written as null; every trailing slash dropped; no forwarded host; a missing token written empty; a null share answered; a failed lookup answered as an error; the update without the share's id; the lookup without the owner filter; `is_public` unchecked; an untitled fork kept empty; another model; the insert asking every column; `conversationId` written as null; a broken body answered 400; the fetch failure worded differently; a refusal's text unused; the `message` field ignored; the empty-body message worded differently. Not caught, and not observable: answering the share's JSON without collapsing repeated names, which every JSON reader collapses the same way. The new unit tests were not broken on purpose.
- `npm run handoff` runs after this record is saved; a failure would be recorded here by a further edit.
Not checked: `-race` locally; the routes against the real database (the definition of `upsert_shared_conversation` and the policies of both tables are not versioned here); the probe in `--production` mode; Vercel.

Remaining gates: independent review; the owner's choice to switch `conversation-share` and `share-fork` on, and to set `NEXT_PUBLIC_SITE_URL` for the Go server first; **R-090 needs the owner's decision** (fix it now in the live Next.js handler as a privacy bug, or in Go after cutover); R-088 and R-086 still need the owner.
Next bounded action: `/api/playground/keys` (R-039), then `upload-avatar` (Storage) and `trending/refresh` (R-077). Wait for the Git Agent's commit of this task first.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: VIDEOS-001, `/api/repo/videos` (Claude Code, 2026-10-17)

Status: **implementation complete; awaiting independent review; not deployed; off by default**. Live change once synchronized: the video tab sends the Supabase bearer (`fetchWithSession`) for all three calls; Next.js still answers the route.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base `7c894a0` (COMMENTS-001 at `71ff742`, pushed). Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `7c894a0`).
Owner instructions (2026-10-17): "continue"; then "save a checkpoint and stop" (the task was paused, checkpointed and released); then the pickup prompt, which resumed it.

Done:
- Contract `contracts/repo-videos` version 1, 47 cases (4 `defect`), recorded from the three Next.js handlers at `7c894a0` (`record-repo-videos.mjs`, `repo-videos.test.mjs`, 48 of 48). GET's requests are compared in any order. One hand-written reason was corrected after the pause (a stray comma); no recorded answer changed.
- `backend/internal/jscompat/regexp.go`: `JSSpace` and `JSDot` (JavaScript's white space class and dot, which differ from Go's) and `FindSubmatchUTF16` (a pattern run over UTF-16 units, so `{11}` counts an emoji as two and can end in half of one). Its tests are vectors produced in Node.
- `backend/internal/videos`: the port, 47 of 47. Uploaders for at most four videos at once within `DetailsBudget` (16 s); the first rejection cancels the rest; a POST's two calls within `WriteBudget` (20 s); 1 MiB bodies. `kind` copies `includes()` on text and on a list. The contract test also compares lone halves of emoji written as escapes, which Go's JSON reader would turn into U+FFFD. Unit tests: four at a time, a hanging read, the first failure stopping the rest, body limit, logs, and `kind` for every kind of value.
- `supabaserest.AdminUserEmail` (with `uuidPattern`), moved out of comments and shared; comments uses it and still passes its 50 cases.
- Wiring: `videosMux` (GET, POST, DELETE), `videos_wiring_test.go` (list, insert and delete as the caller; the admin lookup carries only the public key; PATCH is 405), write-timeout checks for both budgets. Next.js switch `repo-videos`, rewrite test, five probe scenarios (one with an id ending in half of an emoji) and stand-ins. `RepoVideoTab.jsx`: all three calls use `fetchWithSession` (CRLF kept).
- Lesson 29 (a JavaScript pattern in Go: white space, dot, UTF-16 units, byte offsets, `includes` on a list; exercise `unitIndex`). Index updated.
- Docs: contract README, backend README "Videos (VIDEOS-001)" and the route table (the six earlier write ports were missing from it and are added), ADR (Phase 3 row, recorded difference, dated note), backend map. Bug register: R-088 new (any text accepted as a video address, type found anywhere in it; needs the owner); R-040, R-075, R-084 and R-087 extended to videos.

Changed files: backend/internal/videos/{handler.go,handler_test.go,contract_test.go} (new), backend/internal/jscompat/{regexp.go,regexp_test.go} (new), backend/internal/supabaserest/supabaserest.go, backend/internal/comments/handler.go, backend/cmd/api/{main.go,main_test.go,videos_wiring_test.go (new)}, backend/README.md, contracts/repo-videos/{cases.json,README.md} (new), scripts/contracts/{record-repo-videos,repo-videos.test}.mjs (new), scripts/contracts/{go-rewrites.test.mjs,go-forwarding-probe.mjs}, next.config.mjs, src/components/repo-details/RepoVideoTab.jsx, learn-go/{README.md,29-a-javascript-pattern-in-go/* (new)}, docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md}.
Not part of this task: `scripts/agent-handoff.mjs` (a 5-second timeout on the CI-status fetch) was already changed in the working tree when the task resumed; it was left as found.

Checks (Claude Code, Windows, Node 21.7.1, Go 1.27.2), after the last code change:
- `npm run test:contracts`: 1090 of 1090. `npm run lint`: 0 errors, 16 warnings (unchanged). `npm run build`: passes. `git diff --check`: clean.
- backend: `go test -count=1 ./...` 26 packages pass; `go vet ./...` clean; `gofmt -l .` empty. `-race` could not run here (no C compiler); CI runs it, and this route is concurrent. learn-go `-tags solution`: 30 packages pass, vet clean, gofmt empty; lesson 29's exercise fails only its own tests (`TestUnitIndex`, `TestUnitIndexOfAMatch`), as intended.
- Forwarding probe (dev): 118 of 118 identical, including five videos requests (GET signed in and out, POST, DELETE, signed-out POST).
- Deliberate breaks against the contract, each caught, then restored byte for byte: Go's own white space class; Go's own dot; matching over runes; the thumbnail written through a Go string (caught only by the lone-half comparison); a list without `includes()`; a row without `uploaded_by` looked up; no admin lookup when a profile exists; a throwing admin lookup ignored; DELETE without the uploader filter; the email written as null; the order columns swapped; a falsy title kept; a null reply as an error; a non-list reply as empty; a null row returned; the insert without `uploaded_by`. Three of these did not compile at first (unused variables) and were redone. Unit breaks: no `cancel()` (the reply took 10 s, caught); no concurrency limit (20 at once, caught). A first concurrency break raised the constant the test compares against, proved nothing, and was redone.
- `npm run handoff` runs after this record is saved; a failure would be recorded here by a further edit.
Not checked: `-race` locally; the route against the real database (the columns and policies of `repo_videos`); the probe in `--production` mode; Vercel.

Remaining gates: independent review (concurrency and the UTF-16 matching especially); the owner's choice to switch `repo-videos` on; R-088 needs the owner's choice of accepted addresses; R-086 still needs a maximum comments page size.
Next bounded action: `/api/conversations/[id]/share`, then `share/[token]/fork`, `playground/keys` (R-039), `upload-avatar` (Storage) and `trending/refresh` (R-077). Wait for the Git Agent's commit of this task first.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: COMMENTS-001, `/api/repo/comments` (Claude Code, 2026-10-17)

Status: **implementation complete; awaiting independent review; not deployed; off by default**. Live change once synchronized: the comment form, edit and delete send the Supabase bearer (`fetchWithSession`); Next.js still answers the route.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base fead0d9 (CVOTE-001 at 20ae482, pushed). Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `fead0d9`).
Owner instruction (2026-10-17): "continue".

Done:
- Shared runner `route-db-fixture.mjs`: hands supabase-js the session through `getSession` (so the auth admin API gets the public key, as with the real cookie client), answers by `routes` for concurrent requests, passes reply headers, and sends PATCH bodies. The vote, rating and comment-vote contracts pass unchanged with it.
- Contract `contracts/repo-comments` version 1, 50 cases (6 `defect`), recorded from the four Next.js handlers (`record-repo-comments.mjs`, `repo-comments.test.mjs`). GET's requests are compared in any order.
- `backend/internal/comments`: the port, 50 of 50. Details for at most four comments at once within `DetailsBudget` (16 s); the first rejection cancels the rest; a POST's calls within `WriteBudget` (20 s). Unit tests: four at a time, a hanging read, body limit, logs.
- `supabaserest`: `InsertReturning`, `Update`, `Count` (HEAD and Content-Range), `AdminUser` (with the public key, R-040), and `send` returning headers. `jscompat`: `ParseInt`, `Spread`, `Assign`. `githubaccess.Verifier.UserEmail`.
- Wiring: `commentsMux`, `comments_wiring_test.go` (the admin lookup carries only the public key), write-timeout checks for both budgets. Next.js switch `repo-comments`, rewrite test, six probe scenarios (the probe now sends PATCH) and stand-ins. `RepoCommentsSection.jsx`: all comment calls use `fetchWithSession`.
- Lesson 28 (many at once, one failure for all, `HEAD` counts, `parseInt` against `Number`; exercise `sameInAnyOrder`). Index updated.
- Docs: contract README, backend README "Comments (COMMENTS-001)", ADR (Phase 3 row, recorded difference, dated note), backend map. Bug register: R-086 (unbounded `limit`, needs the owner's maximum), R-087 (misleading PATCH and DELETE on another's comment); R-040, R-075 and R-084 updated.

Changed files: backend/internal/comments/* (new), backend/internal/jscompat/{parseint.go,parseint_test.go,spread.go,spread_test.go} (new), backend/internal/supabaserest/supabaserest.go, backend/internal/githubaccess/session.go, backend/cmd/api/{main.go,main_test.go,comments_wiring_test.go (new)}, backend/README.md, contracts/repo-comments/* (new), scripts/contracts/{record-repo-comments,repo-comments.test}.mjs (new), scripts/contracts/{route-db-fixture.mjs,go-rewrites.test.mjs,go-forwarding-probe.mjs}, next.config.mjs, src/components/repo-details/RepoCommentsSection.jsx, learn-go/{README.md,28-many-at-once-one-failure-for-all/* (new)}, docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md}.

Checks (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- `npm run test:contracts`: 1042 of 1042. `npm run lint`: 0 errors, 16 warnings (unchanged). `npm run build`: passes. `git diff --check`: clean.
- backend: `go test -count=1 ./...` 25 packages pass; vet clean; gofmt empty. `-race` could not run here (no C compiler); CI runs it, and this route is concurrent. learn-go `-tags solution`: 29 packages pass; lesson 28's exercise fails only `TestSameInAnyOrder`, as intended.
- Forwarding probe (dev): 113 of 113 identical, including six comments requests (GET signed in and out with `parseInt` limits, POST, PATCH, DELETE, signed-out POST).
- Deliberate breaks, each caught, then restored:
  - no admin lookup;
  - a missing email written as null;
  - `limit` read with `Number` instead of `parseInt`;
  - any id passing the UUID check;
  - another's comment answered 404;
  - Go's `TrimSpace` instead of JavaScript's `trim`.
  The first attempt at the admin break did not compile and was redone.
- npm run handoff ran after this record was saved; a failure would be recorded here by a further edit.
Not checked: `-race` locally; the route against the real database (including the unique and foreign keys of `repo_comments`); the probe in `--production` mode; Vercel.

Remaining gates: independent review (concurrency especially); the owner's choice to switch `repo-comments` on; R-086 needs the owner's maximum page size.
Next bounded action: `/api/repo/videos`, the same shape as comments, with the same R-040 and R-075. Then the remaining writes: `conversations/[id]/share`, `share/[token]/fork`, `playground/keys` (R-039), `upload-avatar` (Storage), `trending/refresh` (R-077).
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: CVOTE-001, `/api/repo/comments/vote` (Claude Code, 2026-10-17)

Status: **implementation complete; awaiting independent review; not deployed; off by default**. Live change once synchronized: the comment vote arrows send the Supabase bearer (`fetchWithSession`); Next.js still answers the route.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base 88bea3d (RATING-001 at 5f0689c, pushed). Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `88bea3d`).
Owner instruction (2026-10-17): "continue".

Done:
- Contract `contracts/comment-vote` version 1, 25 cases, recorded from the two Next.js handlers with the shared runner (`record-comment-vote.mjs`, `comment-vote.test.mjs`).
- `backend/internal/commentvote`: the port, 25 of 25. `jscompat.FieldOr` (`data?.name || fallback`, moved out of vote; vote uses it). Unit tests: body limit, logs. Wiring: `commentVoteMux`.
- Next.js switch `comment-vote`, rewrite test, five probe scenarios with stand-ins. `RepoCommentsSection.jsx`: only the vote call uses `fetchWithSession`; the comment calls stay for COMMENTS-001.
- Lesson 26 gained a section on comment votes and `FieldOr` (no new exercise).
- Docs: contract README, backend README "Comment votes (CVOTE-001)", ADR (Phase 3 row, dated note), backend map. R-084 extended; no new entry.

Changed files: backend/internal/commentvote/* (new), backend/internal/jscompat/request.go, backend/internal/vote/handler.go, backend/cmd/api/{main.go,main_test.go}, backend/README.md, contracts/comment-vote/* (new), scripts/contracts/{record-comment-vote,comment-vote.test}.mjs (new), scripts/contracts/{go-rewrites.test.mjs,go-forwarding-probe.mjs}, next.config.mjs, src/components/repo-details/RepoCommentsSection.jsx, learn-go/26-three-kinds-of-nothing/README.md, docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md}.

Checks (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- `npm run test:contracts`: 991 of 991. `npm run lint`: 0 errors, 16 warnings (unchanged). `npm run build`: passes. `git diff --check`: clean.
- backend: `go test -count=1 ./...` 24 packages pass; vet clean; gofmt empty. learn-go `-tags solution`: 28 packages pass.
- Forwarding probe (dev): 107 of 107 identical, including five comment-vote requests.
- Deliberate breaks, each caught, then restored:
  - the public key for the upsert;
  - a signed-out GET asking the database;
  - `userVote` written when undefined;
  - a null count passed through instead of 0.
  The last needed two attempts: the first wrote `0.0`, which JSON reads as 0, and the second matched text the stand-in's spacing did not contain.
- npm run handoff ran after this record was saved; a failure would be recorded here by a further edit.
Not checked: `-race` (CI runs it); the route against the real database; the probe in `--production` mode; Vercel.

Remaining gates: independent review; the owner's choice to switch `comment-vote` on.
Next bounded action: `/api/repo/comments` (GET, POST, PATCH, DELETE). Its GET fetches each commenter's profile, an admin user lookup and a reply count concurrently. It carries R-040 (the admin call with the public key) and R-075 (`username`), which the port copies until cutover. It needs a HEAD count request in `supabaserest` and JavaScript's `parseInt` for `limit` and `offset`.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: RATING-001, `/api/repo/rating` (Claude Code, 2026-10-17)

Status: **implementation complete; awaiting independent review; not deployed; off by default**. Live change once synchronized: the rating form sends the Supabase bearer (`fetchWithSession`); Next.js still answers the route.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base e223449 (VOTE-001 at 34a05c1, pushed). Resulting commit: uncommitted at handoff; the Git Agent synchronizes.
Owner instruction (2026-10-17): "continue next stages", "continue".

Done:
- Contract `contracts/repo-rating` version 1, 52 cases (8 `defect`, all R-085), recorded from the three Next.js handlers with the shared runner `route-db-fixture.mjs`. Recorder `record-repo-rating.mjs`, Node runner `repo-rating.test.mjs`.
- `jscompat/number.go` (new): `Number`, `StringToNumber`, `Add`, `MathRound`, `NumberJSON`, `Undefined`; `String` now also writes float64 and undefined. Every expected value in `number_test.go` came from Node.
- `jscompat.LengthOrZero` (moved out of collect) and `supabaserest.DataJSON` (moved out of vote); collect and vote use them.
- `backend/internal/rating`: the port, 52 of 52. Unit tests: body limit and logs. Wiring: `ratingMux`, `rating_wiring_test.go`.
- Next.js switch `repo-rating`, rewrite test, six probe scenarios with a ratings stand-in. `RepoRatingSection.jsx` uses `fetchWithSession`.
- Lesson 27 (when text meets numbers; exercise `mathRound`). Index updated.
- Docs: contract README, backend README "Rating (RATING-001)", ADR (Phase 3 row, dated note), backend map. Bug register R-085 (new, Low) and R-084 extended to rating.

Changed files: backend/internal/rating/* (new), backend/internal/jscompat/{number.go,number_test.go} (new), backend/internal/jscompat/{tostring.go,request.go}, backend/internal/supabaserest/supabaserest.go, backend/internal/{collect,vote}/handler.go, backend/cmd/api/{main.go,main_test.go,rating_wiring_test.go (new)}, backend/README.md, contracts/repo-rating/* (new), scripts/contracts/{record-repo-rating,repo-rating.test}.mjs (new), scripts/contracts/{go-rewrites.test.mjs,go-forwarding-probe.mjs}, next.config.mjs, src/components/repo-details/RepoRatingSection.jsx, learn-go/{README.md,27-when-text-meets-numbers/* (new)}, docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md}.

Checks (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- `npm run test:contracts`: 965 of 965. `npm run lint`: 0 errors, 16 warnings (unchanged). `npm run build`: passes. `git diff --check`: clean.
- backend: `go test -count=1 ./...` 23 packages pass; vet clean; gofmt empty. learn-go `-tags solution`: 28 packages pass; lesson 27's exercise fails only `TestMathRound`, as intended.
- Forwarding probe (dev): 102 of 102 identical, including six rating requests (GET signed in and out, POST, a refused rating, DELETE signed in and out).
- Deliberate breaks, each caught, then restored:
  - the public key instead of the caller's token for the upsert;
  - only real numbers passing the check (7 cases);
  - a sum added only as numbers (`post-sum-joins-text`);
  - NaN written as text (2 cases);
  - `allRatings` passed through even when empty (`get-empty-success`).
  One attempt at the NaN break did not compile and was redone.
- npm run handoff ran after this record was saved; a failure would be recorded here by a further edit.
Not checked: `-race` (CI runs it); the route against the real database (including the type of `repo_ratings.rating`, which decides what the database refuses); the probe in `--production` mode; Vercel.

Remaining gates: independent review; the owner's choice to switch `repo-rating` on.
Next bounded action: `/api/repo/comments` and `comments/vote`. Comments also need commenters' names, which R-040 and R-075 break today: the Go port must copy that until cutover. Read the comment routes and their tables' rules in `database/user-db.md` first.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: VOTE-001, `/api/repo/vote` (Claude Code, 2026-10-17)

Status: **implementation complete; awaiting independent review; not deployed; off by default**. Live change once synchronized: the vote arrows send the Supabase bearer (`fetchWithSession`); Next.js still answers the route.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base 7881116 (COLLECT-001, pushed). Resulting commit: uncommitted at handoff; the Git Agent synchronizes.
Owner instruction (2026-10-17): "continue next stages".

Done:
- Contract `contracts/repo-vote` version 1, 37 cases (5 `defect`, all R-076), recorded from the two Next.js handlers by `scripts/contracts/record-repo-vote.mjs`. New shared runner `route-db-fixture.mjs` and `route-db-loader.mjs`: the real supabase-js with only `fetch` and `auth.getUser()` replaced, and a fixed clock. Meant for the next routes. Node runner `repo-vote.test.mjs`.
- `backend/internal/vote`: the port, 37 of 37. `supabaserest.Upsert` and `RPC` (new, with tests). The missing stats function is still called, then the votes are counted, as in Next.js. One 24-second budget (`vote.Budget`) bounds the write, the stats call and the count: `TestHandlersFinishInsideTheWriteTimeout` failed at 34 s when the route was wired, which led to it. Unit tests: body limit, logs, a hanging stats call.
- `jscompat`: `Truthy`, `TruthyJSON`, `RequestFields` (moved out of collect; collect and `supabaserest.Truthy` now use them) and `ISOString`, with answers from Node.
- Wiring: `voteMux` in `cmd/api`, `vote_wiring_test.go`, the write-timeout check. Next.js switch `repo-vote`, rewrite test, six probe scenarios and stand-ins for votes and the missing function. `RepoVoteSection.jsx` uses `fetchWithSession`.
- Lesson 26 (three kinds of nothing, one deadline for calls in a row, stopping the clock; exercise `reply`). Index updated.
- Docs: contract README, backend README "Vote (VOTE-001)", ADR (Phase 3 row, recorded difference, dated note), backend map. Bug register: R-076 and R-084 extended to the vote route; no new entry.

Changed files: backend/internal/vote/* (new), backend/internal/jscompat/{request.go,request_test.go} (new), backend/internal/supabaserest/{supabaserest.go,supabaserest_test.go}, backend/internal/collect/handler.go, backend/cmd/api/{main.go,main_test.go,vote_wiring_test.go (new)}, backend/README.md, contracts/repo-vote/* (new), scripts/contracts/{route-db-loader,route-db-fixture,record-repo-vote,repo-vote.test}.mjs (new), scripts/contracts/{go-rewrites.test.mjs,go-forwarding-probe.mjs}, next.config.mjs, src/components/repo-details/RepoVoteSection.jsx, learn-go/{README.md,26-three-kinds-of-nothing/* (new)}, docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md}.

Checks (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- `npm run test:contracts`: 912 of 912. `npm run lint`: 0 errors, 16 warnings (unchanged). `npm run build`: passes. `git diff --check`: clean.
- backend: `go test -count=1 ./...` 22 packages pass; vet clean; gofmt empty. learn-go `-tags solution`: 27 packages pass; lesson 26's exercise fails only `TestReply`, as intended.
- Forwarding probe (dev): 96 of 96 identical, including six vote requests.
- Deliberate breaks, each caught, then restored: the public key instead of the caller's token for the upsert; a null row not throwing; `userVote` always left out; vote types matched in any case; the real clock instead of `Now`.
- npm run handoff ran after this record was saved; a failure would be recorded here by a further edit.
Not checked: `-race` (CI runs it); the route against the real database; the probe in `--production` mode; Vercel.

Remaining gates: independent review; the owner's choice to switch `repo-vote` on.
Next bounded action: `/api/repo/rating`. Its checks compare a rating with numbers and its average adds with `+`, so text in place of numbers follows JavaScript's loose rules. That needs `jscompat` versions of `Number()`, `<` and `+` for JSON values, and the fixed clock.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: COLLECT-001, `/api/repo/collect` (Claude Code, 2026-10-17)

Status: **implementation complete; awaiting independent review; not deployed; off by default**. Live change once synchronized: the bookmark button, the repository card and the starred page send the Supabase bearer (`fetchWithSession`); Next.js still answers the route.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base 7625677. Resulting commit: uncommitted at handoff; the Git Agent synchronizes.
Owner instruction (2026-10-17): "continue migration", then "retry" after an interruption.
Found on resume: after committing SHARE-001 (27d9e0d) the Git Agent left this checkout on `go-backend` (still 64c9bc0, not fast-forwarded). Claude Code switched back to `main` and fast-forwarded to `origin/main`; `go-backend` was not touched and is behind `main`.

Done:
- Contract `contracts/repo-collect` version 1, 49 cases (1 `defect`), over GET, POST and DELETE, recorded from the three Next.js handlers by `scripts/contracts/record-repo-collect.mjs`. The runner `collect-fixture.mjs` builds the client with the real supabase-js 2.78 (only `fetch` and `auth.getUser()` replaced) and records every request's method, URL, headers and JSON body. Node runner `repo-collect.test.mjs`.
- `backend/internal/collect`: the port, 49 of 49. Writes (`supabaserest.Insert`, `Delete`, new, with tests) go with the caller's own token; reads with the bearer or the public key. Unit tests: a body over 1 MiB, and logs that never hold the user, the repository or the token.
- `jscompat.String` (JavaScript's `String(value)` for JSON values; answers generated in Node). `githubaccess.SessionToken` exported; share now uses it instead of its own parser, so every route reads a bearer by one rule. Share's header test was rewritten for that rule.
- Wiring: `collectMux` in `cmd/api`, `collect_wiring_test.go`, write-timeout checks for share and collect. Next.js switch `repo-collect`, rewrite test, probe scenarios (the probe can now send DELETE) and stand-ins for insert and delete.
- Browser: `RepoCollectButton.jsx`, `RepositoryCard.jsx` and `src/app/starred/page.js` call the route with `fetchWithSession`.
- Lesson 25 (a request with a body, writes as the user, `||`, type switch, exercise `savedBy`). Lesson 24 updated for `SessionToken` (README and lesson.go only; its exercise.go untouched). Lesson 22's index row updated.
- Docs: contract README, backend README "Collect (COLLECT-001)", ADR (Phase 3 row, recorded difference, dated note), backend map. Bug register R-083 (High: the save count counts only the visitor's own rows) and R-084 (401 when Auth is unreachable).

Changed files: backend/internal/collect/* (new), backend/internal/jscompat/{tostring.go,tostring_test.go} (new), backend/internal/supabaserest/{supabaserest.go,supabaserest_test.go}, backend/internal/githubaccess/access.go, backend/internal/sharetoken/{handler.go,handler_test.go}, backend/cmd/api/{main.go,main_test.go,collect_wiring_test.go (new)}, backend/README.md, contracts/repo-collect/* (new), scripts/contracts/{collect-loader,collect-fixture,record-repo-collect,repo-collect.test}.mjs (new), scripts/contracts/{go-rewrites.test.mjs,go-forwarding-probe.mjs}, next.config.mjs, src/components/repo-details/RepoCollectButton.jsx, src/components/RepositoryCard.jsx, src/app/starred/page.js, learn-go/{README.md,24-optional-sign-in/{README.md,lesson.go},25-writing-as-the-user/* (new)}, docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md}.

Checks (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- `npm run test:contracts`: 874 of 874. `npm run lint`: 0 errors, 16 warnings (unchanged). `npm run build`: passes. `git diff --check`: clean.
- backend: `go test -count=1 ./...` 21 packages pass; vet clean; gofmt empty. learn-go `-tags solution`: 26 packages pass; lesson 25's exercise fails only `TestSavedBy`, as intended.
- Forwarding probe (dev): 90 of 90 identical, including eight collect requests (GET signed in and out, POST, a body that is not JSON, DELETE).
- Deliberate breaks, each caught, then restored: writing with the public key instead of the caller's token (14 cases); a null row not throwing; text length ignored; the unique-key code changed (`post-duplicate`); the raw body text instead of `String(value)` in the count's filter (10 cases). One attempt at the unique-key break did not compile and was redone.
- npm run handoff ran after this record was saved; a failure would be recorded here by a further edit.
Not checked: `-race` (CI runs it); the route against the real database; the unique key behind the 409, which was not read from the live database (the Supabase connector needed re-authorising this session); the probe in `--production` mode; Vercel.

Remaining gates: independent review; the owner's choice to switch `repo-collect` on; R-083 is visible to users today, in Next.js.
Next bounded action: the next write route against `docs/database/user-db.md`. `POST /api/repo/rating` and `/api/repo/vote` are similar in shape; `vote` also calls the missing RPC (R-076).
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: SHARE-001, `GET /api/share/[token]` (Claude Code, 2026-10-16)

Status: **implementation complete; awaiting independent review; not deployed; off by default**. Live change once synchronized: the shared-chat page sends the Supabase bearer (`fetchWithSession`); Next.js still answers the route.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base 64c9bc0. Resulting commit: uncommitted at handoff; the Git Agent synchronizes.
Owner instruction: "continue the migration" ("CONTINUE", 2026-10-16), then "save and stop".

Done:
- Contract `contracts/share-token` version 1, 17 cases (5 `defect`), recorded from the Next.js handler by `scripts/contracts/record-share-token.mjs`. The runner `share-fixture.mjs` builds the client with the real supabase-js 2.78 around a stand-in `fetch`, so the URL, headers and reply reading are supabase-js's own; `share-loader.mjs` swaps the server client. Node runner `share-token.test.mjs`.
- `backend/internal/sharetoken`: the port. The visitor's bearer, or the public key when signed out, goes to the Data API; no Supabase Auth call. 17 of 17 cases, the database URL compared byte for byte. Unit tests: header parsing, a malformed header reads as signed out, logs never hold either token.
- `jscompat.FormEncode` (URLSearchParams encoding, answers generated in Node). `supabaserest.Param` now uses it for every route; `supabaserest.SelectObject` asks for one row as `.single()` does, with tests.
- Wiring: `shareMux` in `cmd/api` serves only `GET /api/share/{token}`; `share_wiring_test.go`. Next.js switch `share-token` (`/api/share/:token`), rewrite test, seven probe scenarios and a `shared_conversations` stand-in.
- `src/app/s/[token]/page.js` reads the share with `fetchWithSession`.
- Lesson 24 (route patterns and `PathValue`, optional sign-in, two URL encoders, exercise `bearer`). Lesson 22 updated for `Param`; index updated.
- Docs: contract README, backend README "Share (SHARE-001)", and the activity and starred gate notes (database gate met on 2026-10-15). ADR (Phase 3 row, two recorded differences, dated note), backend map. Bug register R-081 (500 sends the library's message) and R-082 (every database failure reads as "Not found").

Changed files: backend/internal/sharetoken/* (new), backend/internal/jscompat/{jscompat.go,jscompat_test.go}, backend/internal/supabaserest/{supabaserest.go,supabaserest_test.go}, backend/cmd/api/{main.go,share_wiring_test.go (new)}, backend/README.md, contracts/share-token/* (new), scripts/contracts/{share-loader,share-fixture,record-share-token,share-token.test}.mjs (new), scripts/contracts/{go-rewrites.test.mjs,go-forwarding-probe.mjs}, next.config.mjs, src/app/s/[token]/page.js, learn-go/{README.md,22-reading-rows-as-the-user/README.md,24-optional-sign-in/* (new)}, docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md}. No exercise.go changed except the new lesson's own.

Checks (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- `npm run test:contracts`: 824 of 824. `npm run lint`: 0 errors, 16 warnings (unchanged). `npm run build`: passes. `git diff --check`: clean.
- backend: `go test -count=1 ./...` 20 packages pass; vet clean; gofmt empty. learn-go `-tags solution`: 25 packages pass; lesson 24's exercise fails only `TestBearerReadsTheToken`, as intended.
- Forwarding probe (dev): 82 of 82 identical, including seven share requests (encoded space, slash and `é` in the token).
- Deliberate breaks, each caught, then restored: sending no bearer when signed out (13 cases fail); `url.QueryEscape` back in `Param` (`token-with-symbols` fails); `is_public` compared with `true` instead of truthiness. That one first went uncaught, so case `is-public-not-boolean` was added, and it is now caught.
- npm run handoff ran after this record was saved; a failure would be recorded here by a further edit.
Not checked: `-race` (CI runs it); the route against the real database; the probe in `--production` mode; Vercel.

Remaining gates: independent review; switching `share-token` on is the owner's choice (it needs only the two variables on `sefgh-main`, like trending).
Next bounded action: port the first write route against `docs/database/user-db.md`. `POST /api/repo/collect` is the smallest: `repo_collections`, own rows only.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: SEC-001b, migration applied and trending on Go (Claude Code, 2026-10-16)

Status: **complete and live**. The owner applied the migration and switched trending; Claude Code verified both. No independent review.
Owner: Claude Code (verification and records); the owner ran both production steps. Branch main; base 1bf8e71. Resulting commit: uncommitted at handoff; the Git Agent synchronizes.
Owner instructions (2026-10-15): "1.apply", "yeah switch to go", leaked-password protection "if its recommended then go for it".

Done:
- Before applying, Claude Code checked that the SEC-001 app change was live on `sefgh-main`: the chat and profile chunks `06d492b920fa6f54.js` and `7a2cf75bb5684727.js` are served and contain the new column list.
- The Supabase connector declined both a dry run (`execute_sql`) and `apply_migration`; neither ran, and a read-only check showed the database unchanged. The owner then ran `supabase/migrations/20261015140000_sec_001_close_data_exposures.sql` in the Supabase SQL editor. Run that way, it is not in the project's migration history table.
- Verified (Claude Code, read-only `execute_sql`): `supabase/checks/sec_001_verify.sql` returned 13 rows, all true. R-070 to R-074 marked fixed.
- The owner set `SEFGH_GO_API_URL` and `SEFGH_GO_ROUTES=github-trending` on `sefgh-main` and redeployed. Verified from outside: `https://sefgh-main.vercel.app/api/github/trending?since=daily` answers 200 with repositories (it answered 500 before), and `/trending` answers 200. R-068 marked live.
- Leaked-password protection (R-080): Supabase offers it only on the Pro plan, outside the free-tier budget; not turned on. Left for the owner.

Changed files: docs/{coordination.md,bug-register.md,adr/0002-go-backend.md,backend-map.md,database/user-db.md}. No code change.
Checks: the verify query (13 of 13 on 2026-10-15, and again on 2026-10-16); the two HTTP requests above (repeated on 2026-10-16); `npm run handoff` ran after this record was saved, and a failure would be recorded here by a further edit.
Not checked: signed-in pages (profile, chat, activity logging, sharing) in a browser after the migration; the old `sefgh-ui` project.

Remaining gates: a signed-in look at the profile and chat pages; independent review of SEC-001.
Next bounded action: record `GET /api/share/[token]` (the last read-only route), then port the write routes one at a time against `database/user-db.md`.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: SEC-001, User-DB security review (Claude Code, 2026-10-15)

Status: **app change complete; migration prepared and dry-run, NOT applied; awaiting the owner's approval and independent review**. Applying the migration changes the production database, so it waits for the owner's explicit "apply".
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base 268d5b0. Resulting commit: uncommitted at handoff; the Git Agent synchronizes.
Owner instruction (2026-10-15): authorized the Supabase MCP with full access, "done do this and continue the migration".

Done:
- Read User-DB's live definitions with catalog queries only (tables, columns, policies, grants, functions and bodies, triggers, views, Storage policies, publication, migration history, security advisor). Recorded in `database/user-db.md`, secret-free: definitions and row counts, no data.
- Found and recorded R-070 to R-080. Live exposures: anyone can read every user's email (R-070, 32 of 32); anyone can read (R-071) or write (R-072) any user's activity; any account can rewrite trending (R-073); owner-rights functions callable without signing in (R-074). Also missing `username` column (R-075), missing `get_repo_vote_stats` (R-076), trending refresh cannot write (R-077), unused loose tables (R-078), owner-rights views (R-079), leaked-password protection off (R-080). Updated R-039, R-041, R-064 with what the definitions settle.
- Phase 3 evidence: `activity_logs` and `repo_collections` allow reading own rows only, which ACT-002 and STAR-001 assume. Recorded in the ADR and backend map. Not a cutover approval.
- App change, safe before and after the migration: `src/lib/supabase/profile-columns.js` (`PROFILE_COLUMNS`, every column but email); `profiles.js` and `useProfileData.js` name their columns; the profile form takes email from Auth; `searchProfiles` (unused) searches names only.
- Migration `supabase/migrations/20261015140000_sec_001_close_data_exposures.sql`, five sections: column grant on `profiles`; revoke the two activity read functions; `log_user_activity` runs as the caller and refuses other ids; drop the three `authenticated` write policies on `trending_repos`; revoke anonymous EXECUTE and fix `search_path` on the remaining owner-rights functions. `supabase/checks/sec_001_verify.sql` (read-only, 13 checks) and `sec_001_rollback.sql`. `supabase/README.md`.
- Guard `scripts/contracts/profile-columns.test.mjs`: PROFILE_COLUMNS equals the migration's grant and leaves out email; code asks `profiles` only for granted columns (R-075's three files listed as KNOWN).

Changed files: src/lib/supabase/profile-columns.js (new), src/lib/supabase/profiles.js, src/hooks/profile/useProfileData.js, scripts/contracts/profile-columns.test.mjs (new), supabase/{README.md,migrations/20261015140000_sec_001_close_data_exposures.sql,checks/sec_001_verify.sql,checks/sec_001_rollback.sql} (new), docs/database/user-db.md (new), docs/{bug-register.md,adr/0002-go-backend.md,backend-map.md,coordination.md}. No Go or learn-go change, so no lesson.

Checks (Claude Code, Windows, Node 21.7.1):
- Dry run on PGlite (Postgres 17.5) loaded with the live definitions, 17 of 17: the stand-in reproduced R-070 to R-073 first; afterwards the verify file passed, the public columns, profile and avatar updates, own-activity logging, the service role's trending write, the search counter and sharing still worked; sign-up and email change still fired the triggers without EXECUTE; rollback restored the old access, and the migration applied again. Scratch files, not committed.
- `npm run test:contracts`: 806 of 806. `npm run lint`: 0 errors, 16 warnings (unchanged). `npm run build`: passes. `git diff --check`: clean.
- Deliberate breaks, each caught by the guard, then restored: `select('*')` in `useProfileData.js`; `email` added to `PROFILE_COLUMNS`.
- npm run handoff ran after this record was saved; a failure would be recorded here by a further edit.
Not checked: the migration against the live database (by design, until approved); the pages in a browser; the old `sefgh-ui` project's code, which uses the same database and may still `select('*')` on profiles.

Remaining gates: owner approval of the migration; this app change live on `sefgh-main` before it runs; independent review.
Next bounded action: on the owner's "apply", SEC-001b: confirm `sefgh-main` serves this change, dry-run the migration on the live database inside a transaction that is rolled back, apply it with `apply_migration` (name `sec_001_close_data_exposures`), run `supabase/checks/sec_001_verify.sql`, check the profile and chat pages, record the result here and mark R-070 to R-074 fixed. Without that, continue the migration: record `GET /api/share/[token]`, or port the first write route against the definitions now recorded.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: STAR-001, `GET /api/repo/starred` (Claude Code, 2026-10-15)

Status: **implementation complete; awaiting independent review; not deployed; off by default**. Live change once synchronized: the starred page sends the Supabase bearer (`fetchWithSession`); Next.js still answers the route.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base 044b63e. Resulting commit: uncommitted at handoff; the Git Agent synchronizes.
Owner instruction (2026-10-15): "continue the migration".

Done:
- VERIFY-004: after `03149a4` was pushed, Go trending on `https://sefgh-api.vercel.app` answered 200 with real data, and `check-go-deployment.mjs` passed 7 of 7. Switching it on for the website is the owner's step (`SEFGH_GO_API_URL` and `SEFGH_GO_ROUTES=github-trending` on `sefgh-main`, then redeploy).
- Contract `contracts/repo-starred` version 1, 14 cases, recorded from the Next.js handler by the new `scripts/contracts/record-repo-starred.mjs` through `starred-fixture.mjs`.
  - The existing `starred-loader.mjs` is unchanged. It was overwritten by mistake for a moment, then restored with `git checkout` before anything ran.
  - Node runner: `scripts/contracts/repo-starred.test.mjs`.
- `backend/internal/supabaserest`: `Select` (the Data API request as the user), `ReadResult`, `Truthy`, `Describe`, `Param`. Activity now uses it; its 12 contract cases, its 400 generated comparisons with Node and its tests still pass. The `ReadResult` test moved with it.
- `backend/internal/starred`: the port. It passes the 14 route cases and the 15 `public-repository-reads` cases.
  - Values pass through as written: `jscompat.ObjectFields`, `Elements`, `Kind` and `WriteObject` are new, with tests.
  - Reads: at most four GitHub reads at once, a 14-second budget for all of them, redirects refused.
  - `githubrepos.ValidOwner` and `ValidRepoName` export the existing rules. No existing code changed, so lesson 14 still holds.
- Wiring: `starredMux` in `cmd/api`, beside the GitHub access check; GitHub through the signed-out transport. `cmd/api/starred_wiring_test.go`, and the write-timeout test covers the budget.
- Next.js: switch `repo-starred` in `next.config.mjs`; rewrite test; three probe requests and a `repo_collections` stand-in in the forwarding probe.
- Lesson 23 (passing JSON through, packages and capital letters, one deadline for many goroutines). Lesson 22 updated for the moved code. Docs: contract READMEs, backend README "Starred (STAR-001)", ADR (phase row, recorded difference, dated note), backend map.

Changed files: backend/internal/{supabaserest/*,starred/*} (new), backend/internal/jscompat/rawjson{,_test}.go (new), backend/internal/activity/{handler.go,rows.go,handler_test.go}, backend/internal/githubrepos/identifiers.go, backend/cmd/api/{main.go,main_test.go,starred_wiring_test.go}, backend/README.md, contracts/repo-starred/* (new), contracts/public-repository-reads/README.md, scripts/contracts/{starred-fixture,record-repo-starred,repo-starred.test}.mjs (new), scripts/contracts/{go-rewrites.test.mjs,go-forwarding-probe.mjs}, next.config.mjs, src/app/starred/page.js, learn-go/{README.md,22-reading-rows-as-the-user/README.md,23-passing-json-through/*}, docs/{adr/0002-go-backend.md,backend-map.md,coordination.md}. No exercise.go changed.

Checks (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- `npm run test:contracts`: 804 of 804. `npm run lint`: 0 errors, 16 warnings (unchanged). `git diff --check`: clean; no trailing spaces in new files.
- backend: gofmt empty, vet clean, `go test -count=1 ./...` 19 packages pass. learn-go `-tags solution`: 24 packages pass; lesson 23's exercise fails until written, as intended.
- Production forwarding probe: 75 of 75 identical, including three starred requests.
- Deliberate breaks, each caught, then restored:
  - a credential sent to GitHub fails 20 checks;
  - five reads at once fails the concurrency test;
  - accepting any `private` value fails `not-public-gets-null` and `private-response-denied`. A first attempt at this one did not compile and was redone.
- The expected answers of `TestRowsOfOtherKinds` were produced by running the Next.js handler (a temporary script, deleted). All 8 match Go byte for byte.
- npm run handoff ran after this record was saved; a failure would be recorded here by a further edit.
Not checked: `-race` (CI runs it); the route against the real database; Vercel.

Remaining gates: independent review. Turning `repo-starred` on waits for Phase 3's gate (the `repo_collections` definition and row-level security, checked against the live project), like activity. The Supabase connector now asks to be authorized (`/mcp`, `plugin:supabase:supabase`); read-only is enough.
Next bounded action: with no decision needed, record `GET /api/share/[token]`, the last read-only route; its port needs the owner's view on shared-link rules (revoked and private shares, a Phase 3 gate item). Otherwise, read the database definitions once the connector is authorized, then port the write routes one at a time.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: BRAND-001, new logo system (Claude Code, 2026-10-15)

Status: **implementation complete; awaiting the owner's look and independent review; not deployed**. Changes what every visitor sees once synchronized: favicon, app icons, sidebar and footer logo, the 404 page and the brand page.
Owner: Claude Code. Reviewer: unassigned.
Branch main; base 6dd37cc plus the uncommitted BUG-007 change. Resulting commit: uncommitted at handoff; the Git Agent synchronizes.
Owner request (2026-10-15): implement the design in the artifact "Scout the Star-Nosed Mole" (a mascot, a seven-ray glyph, the lowercase monospace wordmark `sefgh`), keep the site's own colours so it fits in yet stands out, and make the mascot "more corporate, abstract and minimalist".

Done:
- Glyph: seven rays around a dot, one pointing up, in the brand's secondary emerald, which stands apart from the blue of buttons and links. A heavier variant is used at 24 pixels and below. Theme tokens `--brand-nose-from` and `--brand-nose-to` in `src/app/globals.css`.
- Scout: rebuilt from one shape, a low back tapering into a pointed snout, in the primary blue, with the emerald nose, one closed eye and a ground line. The original's feet, claws and eyebrow are gone.
- Wordmark: `sefgh` in Geist Mono bold, the site's own mono face.
- `src/components/brand/SefghMark.jsx`: `SefghGlyph`, `SefghTile`, `SefghLogo`, `Scout`. Coordinates are written out so server and browser draw the same numbers. Gradients span the drawing (`userSpaceOnUse`): per-element gradients would skip the vertical ray. That bug showed in the first render and is fixed.
- Static files: `public/brand/{sefgh-glyph,sefgh-glyph-on-dark,sefgh-icon,sefgh-icon-square,scout}.svg` and `public/icon.svg` (the favicon).
- `scripts/generate-icons.js` now draws every PNG icon (8 sizes, 2 maskable, the new `apple-touch-icon.png`) and `src/app/favicon.ico` (16, 32, 48) from those SVGs. Run with a working sharp: the local `node_modules/sharp` lacks its `semver` dependency, so this run used sharp 0.34.5 installed in a scratch folder. CI's `npm ci` installs it whole.
- Used in: the search sidebar (tile and wordmark), the footer (`SefghLogo`), the 404 page (Scout, new copy: "Scout couldn't dig up this page"), and the brand page (new downloads, logo gradient swatch). Layout metadata: SVG icon, .ico, Apple icon; JSON-LD logo now `https://sefgh.org/icons/icon-512x512.png`.
- `public/logo.jpg` removed: it was GitHub's Octocat (R-069). Note: the search page already has a search mode named "Scout".

Changed files: scripts/contracts/internal-paths.test.mjs, src/components/brand/SefghMark.jsx (new), src/app/globals.css, src/app/layout.js, src/app/not-found.js, src/app/brand/page.js, src/components/search/SearchSidebar.jsx, src/components/ui/footer-newsletter.jsx, scripts/generate-icons.js, public/brand/* (new), public/icon.svg (new), public/icons/* (redrawn, apple-touch-icon.png new), src/app/favicon.ico, public/logo.jpg (deleted), docs/{bug-register.md,coordination.md}.

Checks (Claude Code, Windows):
- Every mark was rendered in headless Chrome at 16 to 512 pixels on light and dark and looked at. The mascot went through three snout shapes, and the vertical-ray bug was caught this way.
- The production build succeeded (isolated output folder). The 404 page, the search page and the brand page were screenshotted from `next start` and looked at.
- eslint on the changed files: clean.
- `npm run test:contracts`: 789 of 789, after one fix to the guard. `scripts/contracts/internal-paths.test.mjs` flagged `/favicon.ico` in the new icon list, a file Next.js serves from `src/app`. The guard now knows the app folder's own files (favicon, icon, apple-icon, robots, sitemap, manifest), and it still fails when such a path points at a missing file (checked with `/favicon-missing.ico`).
- `npm run lint`: 0 errors, 16 warnings (unchanged). `git diff --check`: clean.
Not checked: light theme on the real pages (the preview page covered light backgrounds); a real phone's home-screen icon; Vercel.

Remaining gates: the owner's look; independent review; synchronization by the Git Agent.
Next bounded action: VERIFY-004, trending on Go, once the Git Agent has pushed BUG-007. Then the owner sets `SEFGH_GO_API_URL` and `SEFGH_GO_ROUTES=github-trending` on `sefgh-main`.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: BUG-007, trending fixed once in Go (Claude Code, 2026-10-15)

Status: **implementation complete; awaiting independent review; not deployed**. The Go fix reaches visitors only when trending is switched to Go, which needs the Go project (OPS-004).
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base 6dd37cc. Resulting commit: uncommitted at handoff; the Git Agent synchronizes.
Owner decision (2026-10-15, ADR decisions log): option A. Fix R-068 once, in Go, raise the trending contract to version 3, and make trending the first route to switch to Go. It needs no credentials.

Done:
- R-068 found while testing the new site from outside. The trending route joined GitHub search terms with `+` and percent-encoded the query, so GitHub got `%2B` and answered 422. The live site has failed on every trending request (old site too). Checked against GitHub on 2026-10-15: with spaces, the same query answers 200, also with `language:Go` and `language:C++`.
- `backend/internal/githubtrending/handler.go`: the terms are separated by spaces.
- `contracts/github-trending/cases.json` is now version 3. The 38 expected URLs were rebuilt from each case's date and language (not a find-and-replace; `C%2B%2B` stays); nothing else changed. Its README is updated.
- `scripts/contracts/github-trending.test.mjs` expects version 3 and checks that every expected query has space-separated terms. It still runs the Next.js handler against all 44 cases with one stated exception: the query, which that handler keeps until it is retired. A comment in `src/app/api/github/trending/route.js` says so.
- Go tests: the contract test checks version 3; the new `TestSearchTermsReachGitHubAsSeparateWords` reads the query back as GitHub does.
- Lesson 17 has a new section on the bug. `backend/README.md`'s trending section was stale (33 fixtures, starsToday) and is corrected. Bug register R-068 is fixed in Go; ADR decisions log updated.
- Earlier in this session, now in this change: R-065 to R-067, the OPS-003 and OPS-004 records, and `hosting-setup.md` on hold.

Changed files: backend/internal/githubtrending/{handler.go,handler_test.go}, contracts/github-trending/{cases.json,README.md}, scripts/contracts/github-trending.test.mjs, src/app/api/github/trending/route.js (comment only), learn-go/17-clocks-and-randomness/README.md, backend/README.md, docs/{adr/0002-go-backend.md,bug-register.md,coordination.md}. No exercise.go changed.

Checks (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- Deliberate break: with the old `+` query restored, the new Go guard fails and 76 contract subtests fail (38 cases, in memory and over a socket). Restored; passing.
- `npm run test:contracts` 789 of 789; trending runner 45 of 45.
- backend: gofmt empty, vet clean, `go test -count=1 ./...` all packages pass. learn-go `-tags solution`: 23 packages pass; gofmt empty.
- eslint on the two changed JavaScript files: clean. `git diff --check` clean.
- Production forwarding probe: 72 of 72 identical.
- npm run handoff ran after this record was saved; a failure would be recorded here by a further edit.
Not checked: `-race` (CI runs it); trending through a hosted Go project, which does not exist yet.

Remaining gates: independent review; the owner creates `sefgh-api` (Import single project on the `backend` (Go) row); then an agent runs `scripts/check-go-deployment.mjs` against it; then the owner adds `SEFGH_GO_API_URL` and `SEFGH_GO_ROUTES=github-trending` to `sefgh-main` and redeploys; then an agent verifies trending live and the rollback; then the Next.js trending handler is retired.
Next bounded action: VERIFY-004 when the owner reports the Go project's address.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Waiting on owner: OPS-004, one repository and a new Vercel project (Claude Code, 2026-10-14)

Status: **paused / incomplete, waiting on the owner**. Owner: Claude Code. Writer released (this checkpoint). Branch main; base 8dd76ed, then fast-forwarded to 6dd37cc (a timestamp commit); no tracked file changed besides this one.
Owner decisions (2026-10-14):
- The repository was transferred to `github.com/sefgh-ai/sefgh-main` (private).
- The "auto update repo timestamp" workflow stays. The owner relies on it so that Vercel's free plan builds pushes.
- A **new** Vercel project replaces `sefgh-ui`, which "has too many errors".
- Steps 8 to 12 of the plan: "you go ahead".
Done:
- Local `origin` now points to `https://github.com/sefgh-ai/sefgh-main.git`; fetch works. `Adeel0-0` stays a collaborator after the transfer, as GitHub documents.
- Read through the Vercel connector, team "sefghai's projects" (`team_5EJzBDhXfAMCNe0yCQhqLB5T`):
  - Projects: `sefgh-ui` (`prj_g3hgvdP7gPK94CUA7iRdj2gXhyFw`) and `sefgh-ai-docs-temp`.
  - `sefgh-ui`: Next.js, Node 22.x. Domains sefgh.org, www.sefgh.org and sefgh-ui.vercel.app. Vercel Authentication on "all_except_custom_domains".
  - Its last build (2026-05-24, `c7d8828`) failed at `npm run build` (exit 1) in the old code.
  - Its env var names: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, GITHUB_TOKEN, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_AUTH_REDIRECT_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_SERVICE_KEY. All are stored readable; Vercel flags the three secrets "readable-secret". Values were not decrypted.
  - The Vercel GitHub app is installed on `sefgh-ai` with access to all repositories.
- The connector is read-only for this account: `create_project` answered 403 "You don't have permission to create the project". So the owner creates the project in the dashboard.
- Reading `.env.local` to copy the public anon key was refused by the tool's permission rules. It was not worked around: the owner copies the values from `sefgh-ui`.
Settings the new project needs, from `git grep process.env`:
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and GITHUB_TOKEN (GitHub Models; mark it Sensitive).
- **Not** the two Supabase admin keys and not NEXT_PUBLIC_AUTH_REDIRECT_URL: the current code reads none of them.
- NEXT_PUBLIC_SITE_URL is left out until sefgh.org works. `src/app/auth/callback/route.js` would otherwise send sign-ins to the dead domain; without it the request's own origin is used.
- CRON_SECRET is not set, so the refresh route refuses everyone.
Next, once the owner says the new project exists:
1. Read its first deployment and build log; test the production address (pages, `/api/github/languages`, search).
2. The owner adds that address to Supabase Auth's Redirect URLs, then a sign-in is tested.
3. After sefgh.org is renewed (R-065): the owner removes the domains from `sefgh-ui` and adds them to the new project, then sets NEXT_PUBLIC_SITE_URL.
4. The Go project (`hosting-setup.md`, parts A and B, Root Directory `backend`) in the same team.
5. Archive `sefgh-ai/sefgh-nextjs`. Delete `sefgh-ui` only after the new site has run well; the owner deletes it.
2026-10-15, new project created by the owner: **`sefgh-main`** in "sefghai's projects", from `sefgh-ai/sefgh-main`, app (Next.js) imported as a single project (not Services), with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and GITHUB_TOKEN. Production address `https://sefgh-main.vercel.app` (public); the generated address answers 302 (Vercel Authentication). The connector cannot see this project (lists only the two old ones; `list_deployments` 403), so build logs were not read. Checked from outside, with no credentials (Claude Code), 15 of 16:
- Pass: `/`, `/search`, `/trending`, `/about` and `/privacy` answer 200; the home page is the new code (footer "Cookie settings"); security headers present; the browser code carries Supabase project `kohwfuxqbllsmvmsfqci` and its public key.
- Pass: `/api/github/languages` 200; `/api/github/search` 200 from GitHub; `/api/activity` and `/api/ai/chat` 401 without sign-in; `/api/trending/refresh` 401.
- Fail: `/api/github/trending` 500, also on the old site. Cause recorded as R-068.
Not checked: sign-in (needs the owner to add `https://sefgh-main.vercel.app/**` to Supabase Auth's Redirect URLs; the code returns to `window.location.origin/auth/callback`), signed-in pages, chat with the token.
2026-10-15: the owner pasted the old project's environment values, including the Supabase service-role key and `GITHUB_TOKEN`, into the chat; they were not used or stored. They are now R-067 (rotate). The owner had not yet created the new project. The new project should start with the rotated values: a new narrow `GITHUB_TOKEN` (GitHub Models only), and Supabase's publishable key in `NEXT_PUBLIC_SUPABASE_ANON_KEY` (supabase-js 2.78 accepts it; verify on the first deployment before disabling the legacy keys).
No processes running. Account usage is not visible to Claude Code.

## Latest handoff: OPS-003, account and deployment audit (Claude Code, 2026-10-14)

Status: **audit complete; nothing changed outside this repository's documents**. Owner: Claude Code. Reviewer: unassigned. Branch main; base 7303b61; resulting commit: uncommitted at handoff.
Owner request (2026-10-14, with a screenshot of the Vercel project `sefgh-ui`): the deployed site is in the "sefgh" GitHub and Vercel accounts, not the owner's personal one; look at the Vercel account; "rectify and clear everything".

Findings (Claude Code, 2026-10-14, from public sources only: Git history, GitHub's public API, public DNS and RDAP, the live site's public pages; no account was signed in to):
- **The live site is built from another repository.** Vercel team "sefghai's projects", project `sefgh-ui` (owner's screenshot), deploys `github.com/sefgh-ai/sefgh-nextjs`. That repository is public; its last real commit is "sd" on 2026-05-24. Production is the 2026-05-20 build (`d9d0b59`); the 2026-05-24 build failed. `https://sefgh-ui.vercel.app` answers 200 with that old version.
- **All work since September is in a different, private repository**, `github.com/Adeel0-0/sefgh-nextjs-main` (this checkout's `origin`). It began on 2026-09-12 as a copy of the deployed one without its history: at its first commit, 267 of the deployed repository's 370 files were identical and 52 changed. The 51 files found only in the deployed repository look old or replaced (examples, `middleware.js` that became `src/proxy.js`, an older settings panel); this checkout builds without them. None of this repository's work (the Go backend, the Phase 6 fixes) is live.
- **sefgh.org has expired and is down.** RDAP: registrar Hostinger; status "auto renew period"; last changed 2026-10-06, the anniversary; nameservers `ns1.dns-expired.com` and `ns2.dns-expired.com` (parking). With DNSSEC still signed, Google DNS answers SERVFAIL for sefgh.org and www.sefgh.org; without the check it gives a parking address, not Vercel. Visitors cannot reach the site by its name.
- **The database is the same.** The live site and this checkout use the same Supabase project, `kohwfuxqbllsmvmsfqci`. That ID is public: it is in browser code and in the public repository's `.vscode/mcp.json`, which holds no credentials.
- Commits here are authored as `sefgh-ai`, with the owner's e-mail, and pushed to the `Adeel0-0` repository. Vercel's GitHub integration and the agents' Git Agent therefore point at different repositories.

**Hold OPS-002's setup** (`hosting-setup.md`) until the repository question is settled. Its part C assumed the website project builds this repository, and it does not.

Proposed (not done; each step needs the owner):
1. Renew sefgh.org at Hostinger now, while the renewal grace period lasts; it is a paid renewal. Then restore the DNS records Vercel's Domains page asks for. If the nameservers move to Vercel, turn DNSSEC off at Hostinger first.
2. One home for the code: transfer `Adeel0-0/sefgh-nextjs-main` to the `sefgh-ai` account (GitHub keeps history and redirects the old address), and archive `sefgh-ai/sefgh-nextjs` as the record of the May version. Do not delete it.
3. Point `sefgh-ui` at the transferred repository, with the Production Branch set to a branch that does not exist yet (for example `release`), so pushes make previews only. Test a preview; then release by creating that branch, with the owner's approval. Instant Rollback stays available.
4. Then OPS-002: the Go project in the same Vercel team, from the same repository.
Owner action that lets agents see more: authorize the Vercel connector (`/mcp`, `plugin:vercel:vercel`, Authenticate, sign in to the **sefgh** Vercel account). Agents would only read (env var names, the 2026-05-24 build log, domain settings) and ask before any change.

Checks: `git diff --check` clean; relative links resolve. No code changed.
Next bounded action: after the owner's answers, OPS-004 carries out steps 2 and 3 with them; VERIFY-004 follows.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Previous handoff: OPS-002 (Claude Code, 2026-10-14)

Status: **implementation complete (repository side); nothing deployed**. The owner creates the Vercel project by following `hosting-setup.md`; agents cannot sign in to Vercel. No route is switched on anywhere.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base c51c29d. Resulting commit: uncommitted at handoff; the Git Agent synchronizes.
Owner instruction (2026-10-14): go ahead with hosting option A, free, with detailed steps. The owner also offered full Supabase access; Claude Code asked for read-only and wrote the steps (Owner decisions pending, "Phase 3 database definitions").

Done:
- `backend/vercel.json`: Vercel's Go preset for a project rooted at `backend/`.
- `scripts/check-go-deployment.mjs`: checks a deployed Go service from outside with no credentials (health, marker and security headers, languages, activity and chat refused without sign-in, chat refuses GET; `--github` adds one search). It recognizes a deployment hidden behind Vercel's sign-in.
- `hosting-setup.md`: the owner's guide (create the project, check it, connect the website preview with one route, roll back, what comes later and what never to add).
- ADR: hosting decided (gate row, proposal heading, decisions log); backend README "On Vercel"; this file's owner-decision bullets.
- Vercel facts were read from its documentation that day by a web-fetch agent. They include the Go preset, entry point `cmd/api/main.go`, the Root Directory limits, the Hobby limits and the non-commercial term, Standard Protection, and redeploying after env changes. Nothing was tried on the owner's account.

Changed files: backend/vercel.json (new), scripts/check-go-deployment.mjs (new), docs/hosting-setup.md (new), backend/README.md, docs/adr/0002-go-backend.md, docs/coordination.md. No Go code changed, so no lesson changed.

Checks (Claude Code, Windows): the check script against the local Go server built from this tree passed 7 of 7. Against a closed port it fails with ECONNREFUSED; a bad argument prints usage (exit 2). `npm run test:contracts` passed 789 of 789. `npm run lint` gave 0 errors and 16 warnings (unchanged). `git diff --check` was clean. Every new relative link resolves. npm run handoff ran after this record was saved; a failure would be recorded here by a further edit.
Not checked: anything on Vercel. Unknowns to watch on the first deployment: whether Vercel's Go preset accepts Go 1.27.2; whether a Next.js rewrite to the Go project passes the caller's address in X-Forwarded-For (the AI allowances use it); timings.

Remaining gates: the owner creates `sefgh-api` and the preview switch (guide parts A to C); then an agent verifies (check script, the probe's paths against the preview, measurements, a practised rollback), which is ADR hosting steps 3 to 5. Each live route still waits for its own gates and the owner's approval. Supabase read-only connection by the owner, for Phase 3.
Next bounded action: VERIFY-004, once the owner gives the production address: run `node scripts/check-go-deployment.mjs <address>` and record the result; then the preview route check.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Earlier handoff: BUG-006 / ACT-002 (Claude Code, 2026-10-14)

Status: **implementation complete; awaiting independent review; not deployed**. BUG-006 changes live Next.js and browser code once synchronized (analytics for everyone, cookie settings, en-IN dates, the Star link, chat, search paging). ACT-002 adds a Go route that is off by default and changes nothing live except that the usage card and chat now send the Supabase bearer through one helper.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base fac5be5. Resulting commit: uncommitted at handoff; the Git Agent synchronizes.
Owner instructions carried out (2026-10-14, ADR decisions log): fix each bug once (AGENTS.md); Google Analytics for everyone with an opt-out; dates as the agent judged best (en-IN, one locale); cookie settings; the Star button links to GitHub; pace up the migration. Mandatory GitHub sign-in was raised as a question and is **not** implemented: a recommendation was given to the owner in chat, awaiting their answer.

Done:
- BUG-006 (browser code, which stays in React):
  - R-055 revised: Google Analytics loads for every visitor who has not opted out. The bar says so, with "Opt out" and "Got it"; opting out sets Google's own `ga-disable` switch at once and GA is not loaded on later pages; Do Not Track still honoured.
  - R-062: "Cookie settings" in both footers asks again.
  - R-061: every date call is en-IN, the 20 `en-US` ones and the four locale-free ones.
  - R-060: Star opens the repository on GitHub; only a `https://github.com/` address is used.
  - R-009: the first chat message asks for the name and the answer together; the conversation list reloads after both.
  - R-018: page buttons (the same fault, on the live search page) and "load more" stop at the last page GitHub serves, checked against GitHub: page 34 of 30 answered, page 35 refused.
  - R-046, R-047: stale contract README lines and the three Go headers that named a generator script that does not exist.
- ACT-002 (migration, Phase 3 step 2): `backend/internal/activity` ports `GET /api/activity` at contract version 1, defects included, off by default (switch `activity`). It asks the Supabase Data API with the caller's own token and the public key, so row-level security decides as it does now; no service key. `Verifier.User` (anonymous accounts count, as for getUser) hands back the bearer for that call. `jscompat.ToFixed` copies JavaScript's rounding (Go rounds a tie to even). Browser: `src/lib/supabase/session-fetch.js` adds the bearer; chat and the usage card use it. Lesson 22.
- Found and recorded: R-063 (activity answers 401 when Supabase Auth is unreachable; Go copies it, fix once in Go after cutover), R-064 (a busy year could pass the Data API's row limit, if the table allows several rows a day; needs the schema).

Changed files: AGENTS.md; docs/{adr/0002-go-backend.md,backend-map.md,bug-register.md,coordination.md}; next.config.mjs; src/lib/consent.js; src/components/{GoogleAnalytics,CookieBar,Footer}.jsx; src/components/ui/footer-newsletter.jsx; date calls in src/app/history/page.js, src/components/{CodeExplorer,NotificationBell}.jsx, src/components/chat/MessageList.jsx, src/components/notifications/NotificationList.jsx, src/components/playground/{ApiKeysTab,MonitoringTab,UsageTab}.jsx, src/components/search/SearchHistoryDropdown.jsx, src/components/settings/AccountTab.jsx, src/components/trending/TrendingFilters.jsx, src/components/usage-contributions/{UsageHeatmap2D,UsageIsometricChart}.jsx, src/lib/supabase/search-history.js, src/lib/usageStats.js, src/lib/utils/formatters.js, src/lib/utils/profile/profileHelpers.js, src/lib/utils/submissions/submissionHelpers.js; src/components/trending/TrendingRepositoryCard.jsx; src/hooks/trending/useTrendingData.js; src/hooks/chat/useChatMessages.js; src/components/search/SearchResults.jsx; src/hooks/search/useGitHubSearch.js; src/lib/ai/chat-request.js; src/components/usage-contributions/UsageContributionsCard.jsx; contracts/{github-repositories,activity}/README.md; backend/README.md; backend/cmd/api/{main.go,main_test.go}; backend/internal/githubaccess/{session.go,session_test.go}; backend/internal/{aiprovider/prompt.go,aienhance/prompts.go,aisuggestions/terms.go} (headers only); scripts/contracts/{consent,usage-activity,ai-chat-browser,go-rewrites}.test.mjs; scripts/contracts/go-forwarding-probe.mjs; learn-go/{README.md,16-verifying-access/README.md}.
New files: backend/internal/activity/{handler,grid,rows}.go with {contract,handler,node}_test.go; backend/internal/jscompat/tofixed{,_test}.go; backend/cmd/api/activity_wiring_test.go; learn-go/22-reading-rows-as-the-user/{README.md,lesson.go,exercise.go,solution.go,exercise_test.go}; src/lib/supabase/session-fetch.js; src/lib/github/search-pages.js; src/lib/utils/trending/githubLink.js; scripts/contracts/{date-format,trending-star,chat-first-reply,search-pages,docs-claims}.test.mjs; scripts/contracts/{chat-stub-loader,activity-run}.mjs. No existing exercise.go changed.

Things a reviewer should know:
- Every new guard was run against the old code, or with the fix broken on purpose, and failed there: dates, Star link, chat (runs the real handleSend), search paging, the docs claims. For ACT-002: Go's own rounding in place of `ToFixed` fails 24 of the 400 generated cases (the 12 contract cases do not notice), and a streak counted from the wrong end fails 8 contract cases.
- `currentStreak`: the Next.js handler sorts squares with dates and squares without (NaN comparisons); V8's TimSort leaves the padding last, so Go counts back from the last real day. node_test.go compares this, and everything else, with the real handler on 400 generated inputs.
- `readResult` copies postgrest-js 2.78's reading of Data API replies; all 17 table rows were checked by running postgrest-js itself.
- The cookie choice still lives under the old key; "accepted" now means "Got it" and "declined" means opted out.

Checks on the tree being handed off (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- backend: gofmt -l empty; go vet clean; `go test -count=1 ./...` 17 packages pass, including activity's 12 contract cases and 400 generated comparisons with Node. Not run here: `-race` (needs cgo on this machine); CI runs it.
- learn-go: `go test -count=1 -tags solution ./...` 23 packages pass; vet clean; gofmt empty. Lesson 22's exercise fails until the owner writes it, as intended.
- `npm run test:contracts`: 789 of 789. `npm run lint`: 0 errors, 16 warnings (unchanged, all recorded). `git diff --check`: clean; new files have no trailing spaces or CRLF.
- Production forwarding probe (`--production`): built, 72 of 72 identical, including three activity requests (200 with the bearer, 401 refused, 401 without).
- Headless Chrome against that production build: first visit shows the bar and requests Google Analytics; "Opt out" stores "declined" and sets `ga-disable`, and a reload requests nothing from Google; "Cookie settings" shows the bar again; "Got it" stores "accepted" and GA loads again. No exceptions.
- npm run handoff: run after this record was saved; a failure would be recorded here by a further edit.
Not checked: signed-in pages in a browser (chat, profile card, Sessions tab); dates on signed-in pages; the activity route against a real Supabase project; Vercel.

Remaining gates: independent review; a hosted CI run for this batch; for turning `activity` on, Phase 3's gate (the `activity_logs` definition and its row-level security, checked against the live project) and hosting; the owner's answer on mandatory GitHub sign-in.
Next bounded action: with no decision needed, REVIEW-007 (CI-001, VERIFY-002, VERIFY-003). For the migration, the next Phase 3 contract can be recorded now (step 1 needs no database access), and ports can be turned on once hosting is chosen and the Supabase connector (read-only) or a schema-only dump is available.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Earlier handoff: BUG-004 / BUG-005 / ACT-001 (Claude Code, 2026-10-14)

Status: **implementation complete; awaiting independent review; not deployed**. Live Next.js changes once synchronized, including the trending reply's new shape (contract version 2) and the cookie bar.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base 500dbb7.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `500dbb7`).

Done, carrying out the owner's four answers of 2026-10-14 (ADR decisions log):
- BUG-004: R-053 Indian number format everywhere (one formatter; short forms K, L, Cr written out). R-049 Sessions tab: only this device's facts and Supabase's, plus "Sign out everywhere" with a confirmation. R-058, found on the way: the ordinary Sign out used Supabase's default "global" scope and ended every device's session; it is now "local". R-055: Accept and Decline on the cookie bar; Google Analytics loads only after Accept; the old "Got it" counts as Accept.
- BUG-005: R-020 trending contract version 2 in Next.js and Go: `starsPerDay` (stars per day since created, at least one day, rounded down) replaces the random `starsToday`; `heatLevel` comes from it. The page no longer shows mock repositories or developers when a request fails, curated repositories use the real measure and owner, Editor's Choice lost its typed-in numbers, and the heat badge now shows the right level.
- ACT-001 (migration, Phase 3 step 1): `GET /api/activity` fixed for R-056 (error text) and R-057 (UTC calendar), then recorded as contract version 1, 12 cases, 2 defect. No Go port: Phase 3 waits for the database definitions.

Changed files: as in the milestones of the checkpoint below, plus contracts/activity/{cases.json,README.md}, scripts/contracts/{activity.test.mjs,activity-fixture.mjs,activity-loader.mjs}, src/app/api/activity/route.js, contracts/github-trending/README.md, learn-go/{17-clocks-and-randomness/README.md,README.md}, docs/{bug-register.md,adr/0002-go-backend.md,backend-map.md,coordination.md}. No exercise.go changed.

Things a reviewer should know:
- Contract change, owner-approved: github-trending version 2. The re-recording script compared every kept case and found no change outside `starsToday`/`starsPerDay` and `heatLevel`. Go and Next.js pass the same 44 cases.
- `formatCompactNumber` is written out because Intl's en-IN compact form writes thousands as "T" and depends on the ICU version, which can differ between server and browser.
- The consent state lives in localStorage under the key the old bar used; there is not yet a way to change the choice later (R-062).
- `useSyncExternalStore` reads (useBrowserValue, useConsent) return strings, never new objects, as it requires.

Checks on the tree being handed off (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- backend: gofmt -l empty; go vet clean; `go test -count=1 ./...` 16 packages pass; build ok. Trending: 88 of 88 subtests (44 cases in memory and over a socket).
- learn-go: gofmt -l empty; vet clean both ways; `go test -count=1 -tags solution ./...` 22 packages pass.
- `npm run test:contracts`: 778 of 778. `npm run lint`: exit 0 (0 errors, 16 warnings, unchanged). `git diff --check`: exit 0 (after removing one blank line at the end of useTrendingData.js).
- Production forwarding probe: production build compiled; 69 of 69 identical, exit 0.
- Headless Chrome against a local production build with placeholder Supabase settings: first visit shows the bar and requests nothing from Google; after Decline nothing, also after a reload; after Accept Google Analytics is requested at once; a stored "accepted" from the old bar is not asked again; /trending throws no exception (the earlier hydration error, R-053, is gone) and, its GitHub request failing in this sandbox, shows the error message and no mock data.
- The old activity route, run through the same harness for comparison, returned `details` with the database text and mislabelled weekdays outside UTC; the new one does neither.
- npm run handoff: run after this record was saved; a failure would be recorded here by a further edit.
Not checked: signed-in pages in a browser (Sessions tab, profile, chat); the trending page with real GitHub data; Vercel.

Remaining gates: independent review; a hosted CI run for this batch; owner choices R-060, R-061, R-062 and the other `owner` entries; database definitions for Phase 3; BUG-002 (test account).
Next bounded action: BUG-006, fixes needing no decision: R-009 (first chat reply waits for the title), R-018 (load more past 1,000 results), R-046, R-047 (documentation). For the migration: once the owner connects the Supabase connector or adds a schema dump, ACT-002 can confirm `activity_logs` and its policies and port `GET /api/activity` to Go with the user's own token.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Historical checkpoint: BUG-004 / BUG-005 / ACT-001 (Claude Code, 2026-10-14)

Earlier status: active. Owner: Claude Code. Reviewer: unassigned.
Branch main; base and HEAD 500dbb7 (the Git Agent committed BUG-003). Tree clean at start; previous writer released. Recorded on arrival: `agent-handoff.mjs --status --ci` reported the hosted run on 500dbb7 as completed, success; it now includes the lint step. Read through the script; logs not opened.
Owner decisions (2026-10-14), answering the four BUG-003 questions: R-049, the Sessions tab shows only what Supabase can report (this session) plus "sign out everywhere"; R-055, wait for consent before loading Google Analytics (the owner added "not sure"; done as the reversible, privacy-safe choice and explained to the owner); R-053, Indian number format everywhere; R-020, replace the random "stars today" with a real measure. And: continue the migration.
Plan:
1. BUG-004 (no contract change): R-053 one formatter, en-IN, for every number shown, with a guard; R-049 Sessions tab; R-055 cookie bar with a real choice, Google Analytics only after "Accept".
2. BUG-005 (contract change, owner-approved): R-020 in the trending contract, Next.js and Go together, version raised; lesson 17 updated.
3. ACT-001 (migration, Phase 3 step 1 for a read-only route): fix R-056 and R-057 in `GET /api/activity`, then record its behaviour as contract fixtures against the Next.js handler with Supabase stubbed. No Go port in this task: Phase 3 is gated on database definitions.
4. Checks, register, docs, handoff.
Milestone 1 (BUG-004 written; tests pass; browser check not yet run): R-053: src/lib/utils/formatters.js `formatNumber` (Intl en-IN, "1,20,000") and `formatCompactNumber` (written out K/L/Cr, because Intl's en-IN compact writes thousands as "T" and depends on the ICU version); usageStats.formatNumber delegates; 12 `toLocaleString()` calls and 8 hand-made abbreviators replaced in 14 files; guard scripts/contracts/number-format.test.mjs. R-049: SessionsTab shows this device (from the user agent, src/lib/utils/userAgent.js), sign-in method, last sign-in and time zone, and "Sign out everywhere" with a confirmation step; guard scripts/contracts/sessions-tab.test.mjs. Found and fixed on the way: R-058, AuthContext's `signOut()` used Supabase's default scope "global", so the ordinary Sign out ended every device's session; it now takes `{ scope = "local" }`. R-055: src/lib/consent.js, CookieBar with Accept and Decline, src/components/GoogleAnalytics.jsx loads GA only after "accepted" (old "Got it" counts as accepted); the layout no longer loads GA itself; guard scripts/contracts/consent.test.mjs. ESLint on the changed files: clean. Next: BUG-005 (R-020), then ACT-001.
Milestone 2 (BUG-005 written; Next.js 45 of 45 and Go 88 of 88 trending subtests pass): contract github-trending version 2 (44 cases, 7 defect; random-min/mid/max removed, 13 measure cases added, every kept case unchanged apart from starsToday -> starsPerDay and heatLevel, checked by the re-recording script). `starsPerDay` = floor(stars / max(1, days since created_at)), null without a finite count or a created_at of the form 2026-10-12T08:00:00Z; heatLevel 3 from 100 a day, 2 from 25, else 1. Next.js: src/lib/utils/trending/trendingMeasure.js shared by the route and useTrendingData. Go: githubtrending `starsPerDay`, `heatLevel`, Random field and math/rand removed; handler_test.go updated. UI: TrendingRepositoryCard shows "stars a day" (growth bar removed, it was computed from the random number); getHeatIndicator takes the level (it used to receive the level where it expected a star count, so every badge was the lowest); sort "growth" uses starsPerDay; useTrendingData no longer falls back to mock repositories or developers (an error message instead), and curated repositories use the real measure and real owner; Editor's Choice's typed-in "today" numbers removed. Guards: scripts/contracts/trending-measure.test.mjs. Lesson 17 and the lesson index updated; no exercise.go changed. Found: R-060, the trending card's "Star" button has no handler. Next: ACT-001.
No processes running. Account usage is not visible to Claude Code.

## Handoff: BUG-003 (Claude Code, 2026-10-14)

Status: **implementation complete; awaiting independent review; not deployed**. These are live Next.js changes once synchronized.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base 654d993.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `654d993`).

Fixed (bug register): R-001 (Downloads links in the navbar and the footer went to /downloads), R-003 (newsletter privacy link was "#"), R-050 (/links pointed to /docs/api and /changelog), R-006 (profile usage card showed generated data; it now reads /api/activity and says when it is loading, signed out or failed), R-043 (the ten set-state-in-effect lint errors; `npm run lint` passes).
Added: R-049 (High: the Sessions tab shows invented sessions and its "Terminate" ends nothing), R-051 to R-057. Register: 57 entries, 6 fixed.

Changed files: as listed in Milestone 1 of the checkpoint below, plus docs/{bug-register.md,adr/0002-go-backend.md,backend-map.md,coordination.md}. No Go, no contract fixture, no route handler changed.

Things a reviewer should know:
- `src/hooks/useBrowser.js` (`useBrowserValue`, `useIsClient`, `useMediaQuery`) replaces "useState plus an effect that sets it at once". Values are the same on the server and during hydration as before; the browser value follows.
- LanguageContext keeps showing the current language while a new one downloads, as before; the saved-language read moved out of the effect. A nonsense saved value still gives English.
- SessionsTab still shows the placeholder data, unchanged, moved out of the effect and labelled in a comment; fixing it is R-049, an owner choice.
- Canvas uses the "compare with the last prop during render" pattern; the two debug console.log lines that printed user content were removed.
- CI now runs `npm run lint`. The 16 remaining warnings are register entries (R-019, R-044, R-045).
- The guards are static scans of the source: they cannot see links built at run time. The browser spot check found the footer link the first scan missed, and the guard now reads `href:` and `url:` lists too.

Checks on the tree being handed off (Claude Code, Windows, Node 21.7.1): `npm run test:contracts` 740 of 740; `npm run lint` exit 0 (0 errors, 16 warnings); `git diff --check` exit 0, and no file changed its line endings; production forwarding probe: production build compiled, 69 of 69 identical, exit 0. Runtime: headless Chrome against local builds with placeholder Supabase settings (details in the checkpoint below). Go unchanged, so its suites only rerun in `npm run handoff`.
- npm run handoff: run after this record was saved; a failure would be recorded here by a further edit.
Not checked: any signed-in page in a browser (profile, settings, chat): there is no test account; Vercel; a phone-width layout.

Remaining gates: independent review; a hosted CI run, which now includes lint; BUG-002 (needs a test account); the owner entries in the register.
Next bounded action: BUG-004, fixes needing no owner choice: R-009 (first chat reply waits for the title), R-018 (load more past 1,000 results), R-056 and R-057 (/api/activity error text and dates), R-046 and R-047 (documentation). Owner questions to put alongside, most urgent first: R-049 (Sessions tab), R-055 (analytics before consent), R-053 (which number format to show), R-020 (random "stars today").
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Historical checkpoint: BUG-003 (Claude Code, 2026-10-14)

Earlier status: active. Owner: Claude Code. Reviewer: unassigned.
Branch main; base and HEAD 654d993 (the Git Agent committed PLAN-001 / BUG-001 / QUOTA-001). Tree clean at start; previous writer released. Recorded on arrival: `agent-handoff.mjs --status --ci` reported run 38526169800 on 654d993 as completed, success (includes `go test -race`). Read through the script; logs not opened.
Owner instruction (2026-10-14): "yes yes go ahead start", answering the proposal of BUG-003.
Objective: the first Phase 6 fixes, needing no owner choice and no contract change: R-001 (navbar /downloads link), R-003 (newsletter privacy link "#"), R-006 (profile usage card shows generated data), R-043 (ten `react-hooks/set-state-in-effect` lint errors). Each fix ships with a check that would catch it again.
Plan: 1) a contract-suite test that fails on internal links, navigation targets and API calls that reach no page or route, and on `href="#"`, with the open R-004 listed by name; 2) R-001 and R-003; 3) R-006 from /api/activity; 4) R-043 file by file without changing behaviour, then `npm run lint` passing and a lint step in CI; 5) build, contracts, register statuses, handoff.
Milestone 1 (all fixes written; final checks not yet run): steps 1-4 done. ESLint on the whole repo: 0 errors, 16 warnings (the same warnings as before; `npm run lint` exit 0). New: src/hooks/useBrowser.js, scripts/contracts/{internal-paths,usage-activity}.test.mjs. Changed: src/app/page.js, src/components/{3d/ThreeBackground.jsx,Canvas.jsx,CookieBar.jsx,AnimatedNavbar.jsx,Footer.jsx,ui/footer-newsletter.jsx,settings/AccountTab.jsx,settings/SessionsTab.jsx,usage-contributions/UsageContributionsCard.jsx}, src/contexts/LanguageContext.js, src/lib/usageStats.js, src/app/profile/page.js, src/app/links/page.js, .github/workflows/backend-verification.yml (lint step), docs. Runtime evidence: headless Chrome (CDP, scratch script) against a local production build and a dev build with placeholder Supabase settings: cookie bar shown on a first visit, hidden after "Got it" and on the next visit; a saved Spanish language shows Spanish, a nonsense value English; no exception on the home page. The /trending hydration error (#418) is pre-existing: the dev message shows locale formatting ("1,20,000" against "120,000"), now R-053. A baseline build of 654d993 for comparison could not be made (Turbopack refuses a linked node_modules outside the project; webpack's font loader fails on it), so that question was settled from the dev message instead. Register: 57 entries; R-001, R-003, R-006, R-043, R-050 fixed in this task; R-049 to R-057 added. Next: full contracts, lint, production probe, handoff.
No processes running (both local Next.js servers stopped). Account usage is not visible to Claude Code.

## Handoff: PLAN-001 / BUG-001 / QUOTA-001 (Claude Code, 2026-10-14)

Status: **implementation complete; awaiting independent review; not deployed**. The public read token is off until the owner sets `GITHUB_PUBLIC_READ_TOKEN`; with it unset, every path behaves as before. The Next.js changes are live code once synchronized.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base 5750ee5.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `5750ee5`).
History: paused at the owner's request with a checkpoint (below) and resumed the same day; nothing was committed in between.

Done:
- PLAN-001: Phase 6, bugs and broken UI/UX, in the ADR (table row, gate, "Phase 6" rules section, decisions log). Retiring old logic is Phase 7 and waits for Phase 6's gate. AGENTS.md: reading order item 5 and a "Bugs and broken UI/UX (Phase 6)" section for both agents.
- BUG-001: docs/bug-register.md, 48 entries (3 High, 23 Medium, 22 Low), R-001 to R-048, from recorded evidence, the lint run and a static scan of the source. Status: R-031 fixed in code (takes effect with the owner's token), R-048 fixed; the rest open.
- QUOTA-001: `GITHUB_PUBLIC_READ_TOKEN` for signed-out GitHub reads in Next.js and Go, used only when GitHub confirms a classic token with no scopes; contract contracts/public-read-token (20 cases) passed by both; lesson 21.

Changed files: the list in the checkpoint below, unchanged since, plus this record.

Things a reviewer should know:
- How "can read only public data" is checked: `GET /user` must answer 200 with an empty `X-OAuth-Scopes`. Only a classic token with no scopes does that. Fine-grained tokens are refused because they cannot be checked this way. Every reply is checked again; scopes or a 401 make the reply be discarded and the request repeated without the token.
- In Go it is an `http.RoundTripper` on the signed-out handlers' clients only (`githubMux` gained a transport argument). The handlers did not change.
- Contributions is not covered, on purpose (register R-032).
- The Go wiring test caught a bug in the first version that the package tests missed (Opaque URLs; see the checkpoint). Lesson 21 explains it.
- `.env.example` documents the new variable and no longer claims `GITHUB_TOKEN` raises GitHub API limits (R-048).

Checks on the tree being handed off (Claude Code, Windows, Node 21.7.1, Go 1.27.2): the quick checks in the checkpoint below ran on this tree (backend 16 packages, learn-go 22 solution packages, contracts 733 of 733, ESLint and diff check clean) and no code changed after them. Then: `go build -o bin/api.exe ./cmd/api` ok; production forwarding probe on that binary: production build compiled, 69 of 69 identical, exit 0. Deliberate breaks: Go 26 of 27 and Next.js 19 of 20 noticed; each one left is an equivalent change (details in the checkpoint).
- npm run handoff: run after this record was saved; a failure would be recorded here by a further edit.
Not checked: a real GitHub token; `go test -race` (hosted CI after synchronization); Vercel; any page in a browser.

Remaining gates: independent review of this batch; a hosted CI run for it; the owner's token, then a look at the server log to see whether it is accepted; BUG-002's walk-through (needs a test account); every earlier cutover gate.
Next bounded action: BUG-003, first fixes from the register that need no owner choice and no contract change: R-001 (navbar /downloads link), R-003 (newsletter privacy link), R-006 (profile usage card shows generated data instead of /api/activity) and R-043 (the ten `set-state-in-effect` lint errors, so `npm run lint` can pass). Each with a check that would catch it again. BUG-002 when the owner can provide a test account.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Historical checkpoint: PLAN-001 / BUG-001 / QUOTA-001, PAUSED / INCOMPLETE (Claude Code, 2026-10-14)

Resumed later the same day: the owner said "continue from where you stopped". Claude Code found HEAD 5750ee5 and the same 24 changed entries, writer none, reclaimed the role, and did the two NOT done steps; see the handoff above.
Earlier status: paused / incomplete. The owner asked to stop (not immediately) and save a checkpoint. Implementation stopped after the quick checks below.

Where it stands (the milestones further down give the detail):
- PLAN-001 and BUG-001: written, nothing left but review. ADR Phase 6 and Phase 7; AGENTS.md section; docs/bug-register.md with 48 entries (R-048, a stale `.env.example` comment about `GITHUB_TOKEN`, was found and fixed during QUOTA-001).
- QUOTA-001: code, tests, lesson 21, deliberate breaks and documentation done. NOT done: the production forwarding probe and the handoff record.

Working tree on 5750ee5, all uncommitted (`git status --short`):
- Modified: .env.example, AGENTS.md, backend/README.md, backend/cmd/api/{ai_wiring_test.go,main.go,main_test.go,trending_test.go,wiring_test.go}, docs/{adr/0002-go-backend.md,backend-map.md,coordination.md}, learn-go/16-verifying-access/README.md, learn-go/README.md, scripts/contracts/go-forwarding-probe.mjs, src/app/api/github/{trending,trending-developers}/route.js, src/lib/github/access.js, src/lib/repo/repoData.js.
- New: docs/bug-register.md, contracts/public-read-token/{cases.json,README.md}, src/lib/github/public-token.js, scripts/contracts/public-read-token.test.mjs, backend/internal/publictoken/{transport.go,contract_test.go}, backend/cmd/api/publictoken_wiring_test.go, learn-go/21-wrapping-every-request/{README.md,lesson.go,exercise.go,solution.go,exercise_test.go}.
- No existing exercise.go changed. No fixture of an existing contract changed.

Checks run on this exact tree, last thing before pausing (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- backend: gofmt -l empty; go vet clean; `go test -count=1 ./...` 16 tested packages pass.
- learn-go: gofmt -l empty; go vet clean with and without the solution tag; `go test -count=1 -tags solution ./...` 22 packages pass; lesson 21 as shipped fails its four tests without panicking.
- `npm run test:contracts`: 733 of 733 (705 before plus 28 in public-read-token.test.mjs).
- ESLint on src/lib/github, src/lib/repo/repoData.js, the two trending routes, scripts/contracts, next.config.mjs: clean. `git diff --check`: exit 0. (Git warns AGENTS.md uses CRLF; the committed file already did on every line, and the added lines match.)
- Deliberate breaks, QUOTA-001. Go, in a scratch copy: 27; 26 noticed; the one left (giving a verified caller's handlers the public transport) changes nothing today, because every request those handlers send carries the caller's own Authorization and the transport leaves such requests alone. One break of mine first did not compile and was rewritten; it is noticed. Next.js, in memory: 20; 19 noticed; the one left (dropping `.trim()` on the scopes header) changes nothing, because the Fetch Headers class already strips surrounding white space.
- The Go wiring test caught a real bug in the first version: URLs built by jscompat.FetchURL keep the path in Opaque, and `u.String()` then drops the host, so repository, contents and developers reads did not get the token. Fixed by reading Scheme and Host directly; pinned by `TestRequestsBuiltByFetchURLGetTheToken`.

NOT done, in order:
1. Rebuild and probe: in backend `go build -o bin/api.exe ./cmd/api`, then from the root `node scripts/contracts/go-forwarding-probe.mjs ./backend/bin/api.exe --production`. Expected 69 of 69: the probe now empties GITHUB_PUBLIC_READ_TOKEN for both servers, and no route's forwarded behaviour changed. Next.js code changed, so this is needed.
2. Turn this checkpoint into a handoff record (status "implementation complete; awaiting independent review; not deployed"), set the task table rows for PLAN-001, BUG-001 and QUOTA-001 to complete and uncommitted, then run `npm run handoff`.

Known failures: none. Not checked: a real GitHub token (whether GitHub sends an empty X-OAuth-Scopes header for a classic no-scope token is from its documentation; if not, the check refuses the token and reads continue without one); `go test -race` (no C compiler here; hosted CI runs it after a commit); Vercel; any page in a browser.
Owner actions this needs, when convenient: create a classic personal access token with no scopes and set it as GITHUB_PUBLIC_READ_TOKEN for Next.js (and the Go service once hosted); provide a test account for BUG-002's signed-in walk-through.
Processes: none running. The scratch copies used for breaks are outside the repository. Account usage is not visible to Claude Code; no percentage is claimed.

Pickup prompt: "Read AGENTS.md and the PAUSED / INCOMPLETE checkpoint at the top of docs/coordination.md. Run `git status --short` and `node scripts/agent-handoff.mjs --status`, confirm Active writer is none, claim the writer role, then do the two NOT done steps in order."

Earlier status: active. Owner: Claude Code.
Branch main; base and HEAD 5750ee5 (the Git Agent committed AI-002c). Tree clean at start; previous writer released.
Recorded on arrival: `node scripts/agent-handoff.mjs --status --ci` reported run 38512059829 on 5750ee5 as completed, success, which includes `go test -race` for AI-002c. Read through the script; logs not opened.
Owner instruction (2026-10-14): continue the implementation, and add a new phase in which all bugs and broken UI/UX are recorded and fixed before the cleanup phase.
Plan:
1. PLAN-001: a new Phase 6, "bugs and broken UI/UX", in the ADR, before retiring old logic (which becomes Phase 7); decisions log; the rule in AGENTS.md that every agent records a bug it finds.
2. BUG-001: `docs/bug-register.md`, one register, filled from what is already recorded (contract defect cases, review findings, backend-map findings, the lint baseline) plus static checks of the source (internal links and API calls that lead nowhere). No fixes in this task.
3. QUOTA-001: a public-only server token for anonymous GitHub reads, in Next.js and Go, off unless set, with a check that refuses a token able to read private data; tests, lesson, docs.
Milestone 1 (PLAN-001 and BUG-001 written; documentation only): ADR phase table gains "6: bugs and broken UI/UX" with its gate, retiring old logic is now Phase 7 and waits for it, a "Phase 6" section gives the rules, and the decisions log records the owner's instruction. AGENTS.md: reading order item 5 and a "Bugs and broken UI/UX (Phase 6)" section. docs/bug-register.md opened with 47 entries (3 High, 22 Medium, 22 Low), IDs R-001 to R-047. Sources: all 124 contract `defect` cases grouped into entries, backend-map findings, review notes, the lint run (10 errors, 16 warnings, the same as the 2026-10-11 baseline), and a static scan of src/ for links and API calls that match no page or route. New findings from that scan: the navbar's /downloads link is a 404 (R-001); the newsletter Subscribe button has no handler (R-002); its privacy link is "#" (R-003); the profile page shows generated mock usage for 2025 (R-006); six chat menu items only say "Coming soon" (R-008). No page was opened in a browser; that is BUG-002, which needs a test account from the owner for the signed-in half. Task table updated (AI-002b and AI-002c committed; PLAN-001, BUG-001, BUG-002 added). Next: QUOTA-001.
Milestone 2 (QUOTA-001 code written and passing): new variable GITHUB_PUBLIC_READ_TOKEN, off when unset. Rules (contracts/public-read-token, 20 cases, both implementations): only a classic token whose GET /user reply has an empty X-OAuth-Scopes header is used; a pass counts ten minutes, a refusal one; a reply showing scopes or a 401 is discarded and the request repeated without the token; only GET requests to the GitHub API origin without an Authorization of their own get it. Next.js: src/lib/github/public-token.js (`createPublicReader`, `publicGitHubFetch`); access.js `githubFetch` uses it when signed out; trending, trending-developers and repoData.js use it. Go: backend/internal/publictoken `Transport`, an http.RoundTripper given only to the public mux's clients in cmd/api/main.go (`githubMux` gains a transport argument). Contributions is deliberately left out: it refuses before calling GitHub without a caller's token, and changing that changes its contract. Tests: scripts/contracts/public-read-token.test.mjs (28); publictoken/contract_test.go; cmd/api/publictoken_wiring_test.go, which caught a real bug in the first version (URLs built by jscompat.FetchURL keep the path in Opaque, and u.String() then drops the host, so repository, contents and developers reads did not get the token; fixed by reading Scheme and Host directly, with a package test). The write-timeout guard adds the 4-second check. The probe empties the variable for both servers. Checks so far: `npm run test:contracts` 733 of 733; backend `go test` for cmd/api and publictoken pass; gofmt and vet clean. Still to do: lesson 21, deliberate breaks, docs (ADR, backend README, backend-map, register status), full checks, production probe, handoff.
No processes running. Account usage is not visible to Claude Code.

## Handoff: AI-002c (Claude Code, 2026-10-14)

Status: **implementation complete; awaiting independent review; not deployed; `ai-chat` off by default**. The browser change is live Next.js code once synchronized; Next.js already accepted the bearer it now sends, so Next.js behaviour should be unchanged, but that has not been checked in a browser.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base 81f1044.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `81f1044`).

Done: `POST /api/ai/chat` is ported to Go against contract version 2 and passes every case, including those marked defect. Eleven of 25 routes now exist in Go; Phase 2 has no route left to port. The browser sends the Supabase access token as a bearer with every chat request, which is what Go requires. Lesson 20.

What was added or changed:
- backend/internal/githubaccess: session.go `SignedInUser`, the Supabase half of the access check with chat's rules (an anonymous account is 401, the id must be text). access.go shares `sessionToken`, `deadline` and `askSupabase` with it. The bearer pattern now matches "Bearer" in ASCII only (finding below). Tests: session_test.go; review_test.go gains two rows.
- backend/internal/jscompat: utf16.go `UTF16`, text as UTF-16 units, written as JSON.stringify writes it, so half an emoji survives as `\ud83d`. Expected values checked against Node.
- backend/internal/aiprovider: `Undefined` for a reply with no `content` field (JavaScript answers `{}` for it, `{"response":null}` for null); title.go `TitleMessages` and `TitleOptions`, checked against the contract's recorded title request.
- backend/internal/aichat (new): handler.go, messages.go (the checks of src/lib/ai/guard.js), title.go (the cleanup and fallback of src/lib/ai/github.js). contract_test.go runs every case in memory and over a socket, with the real verifier and provider client behind one stand-in transport, as chat-fixture.mjs does. handler_test.go and title_test.go cover what fixtures cannot carry.
- backend/internal/aitest: `Decode` keeps a lone surrogate escape visible, so a reply with U+FFFD where JavaScript writes `\ud83d` fails. aitest_test.go (new).
- backend/cmd/api: `aiMux(logger, verifier)` serves chat with its own per-user counter; ai_wiring_test.go gains four chat tests (credentials reach only their own service; no session means no call at all; separate allowances; a counter of its own); main_test.go checks sign-in plus one provider call fits the write timeout.
- next.config.mjs and scripts/contracts/go-rewrites.test.mjs: switch name `ai-chat`.
- scripts/contracts/go-forwarding-probe.mjs: six chat scenarios, a /models stand-in, and a per-scenario expected Cache-Control.
- Browser: src/lib/ai/chat-request.js (new) `postChat`; src/hooks/chat/useChatMessages.js uses it for all four chat calls. scripts/contracts/ai-chat-browser.test.mjs (new, 3 tests); ai-chat-loader.mjs also replaces the browser Supabase client.
- Fixtures, additive, recorded from the unchanged Next.js handler: contracts/ai-chat 78 -> 84 cases, 3 -> 7 defect. No version change; existing bytes unchanged (414 insertions, 0 deletions at recording).
- learn-go/20-text-as-javascript-counts-it (new); learn-go/README.md; lessons 06 and 16 updated for the changed code. No existing exercise.go changed.
- docs/{coordination.md,adr/0002-go-backend.md,backend-map.md,claude-review.md}, backend/README.md, contracts/ai-chat/README.md.

Things a reviewer should know:
- Finding in reviewed code: Go's bearer pattern began with `(?i)`, which in Go also lets the long s and the Kelvin sign match `s` and `k`. Go asked Supabase about sessions Next.js refuses on sight; both answered 401. Fixed for `Resolve` and `SignedInUser`; recorded in claude-review.md.
- The fallback title can cut an emoji in half, as JavaScript does. Recorded as a defect fixture and reproduced, not fixed. It may matter: a lone surrogate might not survive being saved as the conversation title in Postgres. That was not checked; it is a candidate defect fix for the owner.
- Chat's body limit is 4 MiB, not the 1 MiB of the search helpers, because the browser sends the whole conversation every time. Recorded in the ADR.
- Four rows added to the ADR's recorded differences: lone surrogate escapes in a request read as U+FFFD (all AI routes); OPTIONS answered 405 where Next.js answers 204 (all AI routes, already true of the helpers); bearer only for chat; the 4 MiB limit.
- The three "generated" Go files name a generator that is not in the repository. backend/README.md now says so and how to change a prompt.
- The editing tool turned `\u` escapes in two Go test files into raw characters; they are rebuilt from code points. Every new or changed Go file is ASCII.

Checks on the tree being handed off (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- backend: gofmt -l empty; go vet clean; `go test -count=1 ./...` passes 15 tested packages; `go build -o bin/api.exe ./cmd/api` ok.
- learn-go: gofmt -l empty; go vet clean with and without the solution tag; `go test -count=1 -tags solution ./...` passes 21 packages; lesson 20 as shipped fails its test without panicking.
- `npm run test:contracts`: 705 of 705.
- ESLint on next.config.mjs, scripts/contracts, src/lib/ai, src/hooks/chat/useChatMessages.js, src/lib/supabase/verify-bearer.js: clean. `git diff --check`: exit 0; new files have no trailing white space or CRLF.
- Production forwarding probe on the rebuilt binary: production build compiled; 69 of 69 identical, exit 0. The six chat cases answered 200, 200, 400, 500, 401, 401 through Next.js and directly; Supabase was asked once where a bearer was sent, the provider only for the two signed-in successes.
- Deliberate breaks of the new and changed Go, in a scratch copy: 59. First round: 54 noticed, 1 did not compile (my break), 4 not noticed. Of those four, one was a faulty break of mine (it did not log the messages), and three were real gaps: the 4 MiB limit's value (the test measured against the constant itself), the byte-order mark on a request body, and chat sharing the helpers' counter. Three tests were added; all 59 are now noticed.
- Deliberate breaks of src/lib/ai/chat-request.js, in memory: 8 of 8 noticed.
- npm run handoff: run after this record was saved; a failure would be recorded here by a further edit.
Not checked: a real Supabase project, AI provider or key; chat in a browser, signed in or out; `go test -race` (no C compiler here; it runs in hosted CI after synchronization); Vercel.

Remaining gates: independent review of AI-002a, AI-002b and AI-002c; a hosted CI run for this batch; a browser check of chat signed in, signed out and after a token refresh; live-provider checks; a decision on a shared counter before any allowance is relied on across instances; hosting, Vercel forwarding, measurements, rollback.
Next bounded action: QUOTA-001, the public-only server token for anonymous GitHub reads, approved by the owner. The owner has to create that token before it can be used live. Independent reviews of the AI batches can run alongside it.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Historical checkpoint: AI-002c (Claude Code, 2026-10-14)

Earlier status: active. Owner: Claude Code. Reviewer: unassigned.
Branch main; base and HEAD 81f1044 (the Git Agent committed AI-002b). Tree clean at start; previous writer released.
Recorded on arrival: `node scripts/agent-handoff.mjs --status --ci` reported run 38451803995 on 81f1044 as completed, success. That run includes `go test -race`, so AI-002b's counter has now passed the race detector in hosted CI. Read through the script; logs not opened.
Objective: the Go port of `POST /api/ai/chat` against contract version 2, off by default, and the browser sending the Supabase bearer that Go requires.
Plan:
1. githubaccess: `SignedInUser`, the Supabase half of the access check, answering as src/lib/supabase/verify-bearer.js does.
2. jscompat: text held as UTF-16 units and written as JSON.stringify writes it, because the fallback title can cut an emoji in two.
3. aiprovider: the title request; a reply with no `content` field kept distinct from `null` (JavaScript answers `{}` for the first).
4. backend/internal/aichat with contract tests in memory and over a socket, using the real verifier and provider client behind a stub transport.
5. Additive fixtures recorded from the unchanged Next.js handler for anything the port shows is unpinned.
6. Server wiring with its own per-user allowance, wiring and time-budget tests, switch name `ai-chat`, rewrite test, chat cases in the forwarding probe.
7. Browser: chat requests carry `Authorization: Bearer <access token>`; Next.js accepts it today, so behaviour is unchanged there.
8. Lesson 20. 9. Deliberate breaks. 10. Docs, full checks, production probe, handoff.
Milestone 1 (steps 1-3 written and passing their package tests): githubaccess/session.go `SignedInUser` with session_test.go, whose 21 reply cases and header cases were produced by running the real verify-bearer.js; access.go now shares `sessionToken`, `deadline` and `askSupabase` with it, and its bearer pattern matches "Bearer" in ASCII only, because Go's (?i) let a long s or Kelvin sign through where JavaScript does not (an identity call Next.js never makes; same 401). jscompat/utf16.go `UTF16` writes JSON as JSON.stringify does, values checked against Node. aitest.Decode keeps a lone surrogate escape visible instead of turning it into U+FFFD on both sides. aiprovider returns `Undefined` for a missing content field and has title.go (`TitleMessages`, `TitleOptions`), checked against the contract's recorded title request. Not yet started: aichat, fixtures, wiring, browser, lesson. If interrupted: `go test -count=1 ./...` in backend is expected to pass as the tree stands.
Milestone 2 (steps 4-7 written and passing): backend/internal/aichat (handler.go, messages.go, title.go; contract_test.go runs every case in memory and over a socket with the real verifier and provider client behind one stand-in transport; handler_test.go, title_test.go with values checked in Node). Fixtures, additive, recorded from the unchanged Next.js handler: ai-chat 78 -> 84 (reply-without-content and reply-message-is-text, defect, answer {}; title-fallback-cuts-a-character-in-two, defect, a lone surrogate escape; title-only-quotation-marks, defect; title-trimmed-as-javascript-trims; dropped-message-is-still-checked). No existing byte changed. cmd/api: `aiMux(logger, verifier)` serves POST /api/ai/chat with its own per-user allowance; ai_wiring_test.go gains three chat tests; main_test.go checks sign-in plus one provider call fits the write timeout. next.config.mjs `ai-chat`; rewrite test; probe has six chat scenarios and a /models stand-in. Browser: src/lib/ai/chat-request.js `postChat` sends `Authorization: Bearer <access token>`; useChatMessages.js uses it for all four calls; scripts/contracts/ai-chat-browser.test.mjs (3 tests) with ai-chat-loader.mjs replacing the browser client. Checks so far: backend package tests for githubaccess, jscompat, aitest, aiprovider, aisuggestions, aienhance, aichat, cmd/api pass; gofmt and vet clean; node chat + browser + rewrite tests 93 of 93; ESLint clean on changed JS. Not yet run: full suites, production probe. Still to do: lesson 20, deliberate breaks, docs, full checks, handoff.
Milestone 3: lesson 20 (learn-go/20-text-as-javascript-counts-it) written; as shipped it fails its test without panicking, and `go test -count=1 -tags solution ./...` passes 21 lesson packages; lessons 06 and 16 and the lesson index updated. Docs updated: contracts/ai-chat/README.md, backend/README.md, ADR (three recorded differences, AI-002c note), backend-map.md, claude-review.md (the bearer-pattern finding). Browser breaks in memory: 8 of 8 noticed. Go breaks in a scratch copy: running in the background; of the first 28, one did not compile (my break; rewritten) and one was not noticed (the 4 MiB body limit, because the test measured against the constant itself; the test now pins the value). The editing tool turned `\u` escapes in two Go test files into raw characters; they are rebuilt from code points and every new or changed Go file is ASCII. Still to do: rest of the breaks and a rerun of the misses, full checks, production probe, handoff record.
Then: the background break run finished, the misses were fixed and rerun, and the full checks and production probe ran; results are in the handoff above. No process is running.

## Handoff: AI-002b (Claude Code, 2026-10-14)

Status: **implementation complete; awaiting independent review; not deployed; both new routes off by default**.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base d2320c2.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `d2320c2`).

Done: `POST /api/ai/suggestions` and `POST /api/ai/enhance-query` are ported to Go against contract version 2 and pass every case, including the ones marked defect. Ten of 25 routes now exist in Go. Lesson 19.

What was added:
- backend/internal/jscompat/{text.go,text_test.go}: JavaScript's trim, lower-casing and string length; json.go gains ParseJSON. Every expected value was checked against Node.
- backend/internal/ailimit: the request counter and the caller's address, tested with the same steps and answers as the JavaScript limiter.
- backend/internal/aiprovider: the GitHub Models call. prompt.go is generated from the chat contract, and a test compares the request with the one that contract records.
- backend/internal/aisuggestions, backend/internal/aienhance: the handlers and their contract tests, in memory and over a socket. terms.go and prompts.go are generated from the Next.js source and the contract.
- backend/internal/aitest: test support shared by the AI contract tests.
- backend/cmd/api/main.go: the AI routes are served from aiMux, beside the GitHub access check. ai_wiring_test.go and main_test.go cover the wiring and the time budget.
- next.config.mjs, scripts/contracts/go-rewrites.test.mjs: switch names `ai-suggestions` and `ai-enhance-query`.
- scripts/contracts/go-forwarding-probe.mjs: eight POST cases; the Go server it starts is given empty AI keys and stub provider addresses, so a real key in the surrounding shell cannot reach a real provider.
- Fixtures, additive, recorded from the unchanged Next.js handlers: ai-enhance-query 73 -> 76 (a null body, marked defect; length counted in UTF-16 units), ai-suggestions 44 -> 49 (length counted in UTF-16 units; the AI reply trimmed as JavaScript trims). No version changed.
- learn-go/19-counting-requests (new), learn-go/README.md, learn-go/06-http-handlers/README.md. No existing exercise.go changed.
- docs/{coordination.md,backend-map.md,adr/0002-go-backend.md}, backend/README.md, the two contract READMEs.

Things a reviewer should know:
- The Go server reads GITHUB_TOKEN again. It is the GitHub Models credential, as in src/lib/ai/github.js, and goes only to the models address. The REVIEW-006 test that forbids it on GitHub API routes still passes, and a new test checks the same from the AI side.
- The AI routes are outside the GitHub access check on purpose: behind it, a request with a bearer and no X-GitHub-Token would be refused, and chat will send exactly that.
- Go refuses a request body over 1 MiB, a provider reply over 4 MiB and a provider call over 25 seconds, and logs a failure's stage and status without the query or the provider's words. Next.js does none of this. Recorded in the ADR.
- Go's lower-casing differs from JavaScript's for two characters. One is handled; the other cannot affect a result. Recorded in the ADR.
- The allowance is per process and the caller's address comes from X-Forwarded-For, as in Next.js. Both limits of that design are unchanged.
- While writing tests, three Unicode escapes were turned into the characters themselves by the editing tool, one of them a byte-order mark that Go refuses in source. The affected files now build such text from code points and contain only ASCII.

Checks on the tree being handed off (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- backend: gofmt -l empty; go vet clean; `go test -count=1 ./...` passes 13 tested packages; `go build -o bin/api.exe ./cmd/api` ok.
- learn-go: gofmt -l empty; go vet clean with and without the solution tag; `go test -count=1 -tags solution ./...` passes 20 packages; lesson 19 as shipped fails its three tests without panicking.
- `npm run test:contracts`: 696 of 696.
- ESLint on next.config.mjs and scripts/contracts: clean. `git diff --check`: exit 0.
- Production forwarding probe on the rebuilt binary: production build compiled; 63 of 63 identical, exit 0. The eight POST cases answered 200, 200, 500, 200 for suggestions and 200, 200, 400, 400 for enhance-query, through Next.js and directly.
- Deliberate breaks of the new Go in scratch copies: 97 tried. 84 were noticed at first, 6 of the breaks themselves did not compile and were rewritten, and 7 were not noticed. Five cases and two tests were added. Now 95 are noticed and the 2 left change nothing: the cap of five suggestions cannot be exceeded by three AI answers plus two built-in ones, and a null first choice is refused by the next check.
- npm run handoff: run after this record was saved; a failure would be recorded here by a further edit.
Not checked: a real AI provider or key; `go test -race` (it runs in hosted CI after synchronization; the new counter is the code it matters most for); Vercel.

Remaining gates: independent review of AI-002a and AI-002b; a hosted CI run for this batch; live-provider checks; a decision on a shared counter before the allowance is relied on across instances; hosting, Vercel forwarding, measurements, rollback.
Next bounded action: AI-002c, the Go port of chat: the bearer sign-in check from githubaccess's Supabase half, the per-user allowance, message checking, title generation, and the browser sending a bearer token. Then QUOTA-001.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Historical checkpoint: AI-002b (Claude Code, 2026-10-13)

Earlier note: Claude Code owned this task; reviewer unassigned. Base main @ d2320c2, tree clean at start: the Git Agent committed REVIEW-006 and AI-002a together.
Objective: Go ports of `POST /api/ai/suggestions` and `POST /api/ai/enhance-query` that pass the version 2 fixtures unchanged, off by default like every other route.
Plan: 1) jscompat helpers for JavaScript's trim, lower-casing, string length and JSON.parse; 2) backend/internal/ailimit, the request counter and caller address; 3) backend/internal/aiprovider, the GitHub Models call the suggestions route needs; 4) backend/internal/aisuggestions and aienhance with contract tests in memory and over sockets; 5) server wiring outside the GitHub access check, switch names, rewrite test, POST cases in the forwarding probe; 6) lesson 19; 7) deliberate breaks; 8) full checks, probe, handoff.
Nothing written yet beyond this checkpoint. No processes running. Account usage is not visible to Claude Code.
Milestone 1 (AI-002b): the Go packages are written and pass. New: backend/internal/jscompat/{text.go,text_test.go} (JavaScript's trim, lower-casing and string length; every expected value checked against Node), jscompat/json.go gains ParseJSON; backend/internal/ailimit (counter and caller address, same steps and answers as the JavaScript limiter test); backend/internal/aiprovider (GitHub Models call; prompt.go is generated from the chat contract; its request test compares with the contract's recorded request); backend/internal/aitest (shared test support); backend/internal/aisuggestions and aienhance with terms.go and prompts.go generated from the Next.js source and the contract. Contract runs in Go: suggestions 44 cases and enhance-query 73, each in memory and over a socket, 234 of 234. Not yet done: server wiring, switch names, rewrite test, probe, lesson 19, deliberate breaks, docs, full checks. Nothing is registered in cmd/api yet, so the server is unchanged. If interrupted: `go test -count=1 ./...` in backend is expected to pass as the tree stands.
Milestone 2 (AI-002b): server wiring, switch names, rewrite test and probe are done; lesson 19 is written. backend/cmd/api/main.go serves the two routes from aiMux beside the GitHub access check; ai_wiring_test.go checks each AI credential reaches only its own provider, that the two helpers share one allowance, and that the models token never reaches a GitHub API route. next.config.mjs has ai-suggestions and ai-enhance-query. The probe gained eight POST cases and empties any real AI key from the environment it gives the Go server; dev-mode run 63 of 63. Additive fixtures from the unchanged Next.js handlers: ai-enhance-query 73 -> 75 (null body, defect), ai-suggestions 44 -> 47 (UTF-16 counting). Backend `go test -count=1 ./...` passed with 13 tested packages before the last fixture additions; the two affected packages pass after them. learn-go/19-counting-requests fails as shipped without panicking and its solution passes. Running now: about 99 deliberate breaks of the new Go in a scratch copy. Still to do: read those results, full checks, production probe, handoff record.
Milestone 3 (AI-002b), written when the owner asked to stop as soon as possible: all code, tests, fixtures, lesson 19 and documentation except the final handoff record are written. Deliberate breaks of the new Go in scratch copies: 97 tried, 95 noticed after five cases and two tests were added; the 2 left change nothing (a cap of five suggestions that three plus two can never exceed; a null first choice that the next check refuses anyway). Fixtures now: ai-suggestions 49 cases (7 defect), ai-enhance-query 76 (12 defect), both passing in Next.js and Go. No further implementation will be started. In progress: the final full check run in the background (backend gofmt, vet, tests, build; learn-go; all contracts; lint; diff check; production probe). If it passes, the next and last steps are the handoff record and `npm run handoff`. If it does not, this checkpoint is to be marked paused / incomplete with the failure, the writer released, and no handoff run.

## Handoff: AI-002a, with REVIEW-006 still uncommitted beneath it (Claude Code, 2026-10-13)

Status: **implementation complete in Next.js with version 2 fixtures; awaiting independent review; not deployed by an agent; no Go route added or switched on**.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base 9480ef9f407571fe333bae48eb824181acfdba5e. The working tree holds two finished tasks: REVIEW-006 (its own record follows this one) and AI-002a. The Git Agent had not acted on REVIEW-006's signal when AI-002a began.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `9480ef9`).

Owner decisions this implements (2026-10-13, in the ADR decisions log): chat for signed-in users only with limits; the two search helpers public with limits; three safety defects fixed in every implementation. Only Next.js implements these routes today, so Next.js and the fixtures changed together.

What changed in behaviour:
- `POST /api/ai/chat`: 401 without a signed-in user (a bearer token verified online with Supabase, or the app's own session cookie); 503 if that check cannot be made; 429 with Retry-After past 30 requests in five minutes per user; messages must be `user` or `assistant` with text content; only `role` and `content` are forwarded; the most recent 20 messages and 8,000 characters are kept; every failure is the fixed 500 sentence.
- `POST /api/ai/suggestions`: fixed 500 sentence; 400 over 500 characters; past 30 AI calls in five minutes per address the built-in list answers.
- `POST /api/ai/enhance-query`: 400 over 500 characters; past the same allowance the basic enhancement answers.
These are live Next.js handlers on main. Whether Vercel deploys main automatically has not been inspected.

Judgment calls, for review:
- Chat drops the oldest messages beyond the limits and refuses only a newest message that is itself over 8,000 characters. The browser sends the whole conversation each time, so refusing would break every long chat. Consequence the owner should know: with long AI answers, 8,000 characters is roughly the last two or three exchanges of context. The numbers are constants in src/lib/ai/guard.js.
- The search helpers fall back to their built-in answers past the allowance; they do not answer 429. The allowance protects provider spend, and the search box keeps working.
- The allowance is counted per server process. On a platform that runs several instances it is weaker than its number says. A shared counter needs a store.
- A caller's address is the first entry of X-Forwarded-For. That is right behind a proxy that sets it and wrong if the server is reachable directly.
- src/lib/github/access.js now exports its one identity call as `askIssuer` so the chat sign-in check shares it. Behaviour is unchanged; the access tests still pass.

Changed files for AI-002a:
- New: src/lib/ai/{guard.js,session.js}, src/lib/supabase/verify-bearer.js, scripts/contracts/{ai-fixture-common.mjs,ai-chat-loader.mjs,ai-guard.test.mjs}.
- Changed: src/app/api/ai/{chat,suggestions,enhance-query}/route.js, src/lib/github/access.js, scripts/contracts/{chat-fixture.mjs,enhance-fixture.mjs,suggestions-fixture.mjs,ai-chat.test.mjs,ai-enhance-query.test.mjs,ai-suggestions.test.mjs}.
- Fixtures at version 2: contracts/ai-chat (42 -> 78 cases, 3 defect), contracts/ai-enhance-query (62 -> 73, 10 defect, no earlier case changed), contracts/ai-suggestions (35 -> 44, 7 defect); their READMEs.
- docs/{coordination.md,backend-map.md,adr/0002-go-backend.md}.
No Go and no lesson changed in AI-002a.

Checks on the tree being handed off (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- `npm run test:contracts`: 688 of 688.
- Every version 1 case whose answer changed was printed while re-recording: 13 in chat and 4 in suggestions, each one of the approved fixes; 1 chat case removed as a duplicate of another after the fix; none in enhance-query.
- 59 deliberate changes to the new code, applied in memory: 58 noticed at first; the miss got a case (`type-is-checked-before-length`) and is now noticed.
- ESLint on scripts/contracts, src/lib/ai, src/lib/supabase/verify-bearer.js, src/lib/github/access.js, src/app/api/ai and next.config.mjs: clean. `git diff --check`: exit 0.
- Production Next.js build with these handlers, through the forwarding probe: compiled successfully; 55 of 55 identical, exit 0.
- Go: unchanged by AI-002a. REVIEW-006's results stand: 9 packages, 19 lesson packages. `npm run handoff` reruns them.
- npm run handoff: run after this record was saved; a failure would be recorded here by a further edit.
Not checked: a real Supabase project or AI provider; the chat page in a browser; Vercel.

Remaining gates: independent review of AI-002a and of REVIEW-006's fixes; a browser check of chat signed in and signed out; live-provider checks; the browser must send a bearer token before chat can be served by Go; hosting, Vercel forwarding, measurements, rollback.
Next bounded action: AI-002b, Go ports of suggestions and enhance-query against these version 2 fixtures, with the limiter and UTF-16 counting in Go and a lesson. Then AI-002c, chat. QUOTA-001 is approved and not started; the owner still has to create the public-only token.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Historical checkpoint: AI-002a (Claude Code, 2026-10-13)

Earlier note: Claude Code owned this task; reviewer unassigned. Base main @ 9480ef9. REVIEW-006 below is finished and handed off but still uncommitted: `agent-handoff.mjs --status` said READY_VERIFIED for several minutes and the Git Agent did not act, so this task's files sit on top of REVIEW-006's 21 in the working tree. Hosted CI on 9480ef9 is green.
Owner decisions received today through four direct questions, now in the ADR decisions log: chat is for signed-in users only with limits; the two search helpers stay public with limits; fix three safety defects in Next.js and Go together; a public-only server token for anonymous GitHub reads is approved (QUOTA-001, not started).
Objective of AI-002a: contract version 2 of the three AI routes, in the only implementation that exists (Next.js), with fixtures. That is the contract the Go ports (AI-002b, AI-002c) must then meet.
Plan: 1) shared limits and message checks in src/lib/ai/guard.js; 2) session check for chat (bearer verified online, or the app's own cookie session); 3) the three handlers; 4) harnesses and re-recorded fixtures, every changed case listed; 5) in-memory handler changes to check the fixtures notice; 6) READMEs, full contracts, lint, handoff. No Go change in this task, so no lesson and no probe.
Nothing of AI-002a written yet beyond this checkpoint and the ADR decisions rows. Milestone 1 (AI-002a): handlers, shared modules, harnesses and version 2 fixtures are written and pass. New source: src/lib/ai/{guard.js,session.js}, src/lib/supabase/verify-bearer.js. Changed source: the three src/app/api/ai/*/route.js handlers; src/lib/github/access.js (its one identity call is now the exported askIssuer, shared with verify-bearer; behaviour unchanged, access tests 43 of 43). New test files: scripts/contracts/{ai-fixture-common.mjs,ai-chat-loader.mjs,ai-guard.test.mjs}; changed: the three AI harnesses and runners. Fixtures re-recorded at version 2: ai-chat 42 -> 78 (3 defect), ai-enhance-query 62 -> 72 (10 defect, no earlier case changed), ai-suggestions 35 -> 44 (7 defect). Every changed case was printed and is one of the three approved fixes. Focused run of the three AI test files: 201 of 201. Judgment call: chat drops the oldest messages beyond 20 messages or 8,000 characters and refuses only a newest message that is itself too long, because the browser sends the whole conversation each time and a refusal would break every long chat. Still to do: fixture sensitivity, the three contract READMEs, full contracts, lint, a production build, handoff. If interrupted: the v1 fixture files are saved outside the repository; nothing else is half-written.
No processes running. Account usage is not visible to Claude Code.

## Handoff: REVIEW-006 (Claude Code, 2026-10-13)

Status: **review complete with fixes; awaiting an independent look at the fixes; not deployed; no route switched on**.
Owner: Claude Code. This task is the independent review of Codex's AUTH-001 and AUTH-002. Nobody has reviewed the fixes it made.
History: stopped at the owner's instruction part-way through and resumed the same day from the checkpoint below. Nothing was committed in between.
Branch main; base 9480ef9f407571fe333bae48eb824181acfdba5e.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `fac5be5`).

Verdict: the access design holds; I found no way for a caller to get another user's data or the server's token. The tests did not hold, and that is what this batch fixes. Full record: REVIEW-006 in claude-review.md.

Deliberate breaks before any fix: Next.js 42 tried, 12 unnoticed; Go 27 that compiled, 13 unnoticed. The worst: in Go, giving the public handlers the server's GITHUB_TOKEN passed every test.
After the fixes: Next.js 46 of 46 noticed; Go 38 of 39, and the one left changes no behaviour.

What changed:
- backend/cmd/api/main.go: `newHandler` builds the server; `run()` and the tests both call it.
- backend/cmd/api/wiring_test.go (new): all five routes through `newHandler`, signed in and not, with a decoy server token; the credential on every request to GitHub is checked; a verified caller's token never follows a redirect.
- backend/cmd/api/{access_test.go,main_test.go}: the isolation test uses `newHandler`; the write-timeout guard adds the four seconds of verification.
- backend/internal/githubaccess/access.go: issuer replies read with jscompat.DecodeJSON and checked field by field as the Next.js check does; `DefaultTimeout` named; a `Timeout` field for tests.
- backend/internal/githubaccess/{access_test.go,review_test.go}, backend/internal/githubrepos/review_test.go: the missing tests.
- src/lib/github/access.js: a malformed identity entry is skipped; an identity id must be non-empty text; only status 200 is an answer; the deadline is `IDENTITY_DEADLINE_MS`.
- contracts/github-access/cases.json 15 -> 35; contracts/public-repository-reads/cases.json 14 -> 15; scripts/contracts/{github-access.test.mjs,public-repository-reads.test.mjs}.
- learn-go/16-verifying-access/README.md explains the changed Go. No exercise.go changed.
- docs/{coordination.md,claude-review.md,backend-map.md,adr/0002-go-backend.md}, backend/README.md, both contract READMEs.
Contract or decision changes: no version changed and no earlier case changed. Behaviour changed only for malformed issuer replies, where the two implementations used to disagree; none of those ever let a caller in.

Final checks on the tree being handed off (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- backend: gofmt -l empty; go vet clean; `go test -count=1 ./...` 9 packages pass; `go build -o bin/api.exe ./cmd/api` ok.
- learn-go: gofmt -l empty; go vet clean with and without the solution tag; `go test -count=1 -tags solution ./...` 19 packages pass.
- `npm run test:contracts`: 615 of 615.
- ESLint on scripts/contracts, src/lib/github/access.js and next.config.mjs: clean. `git diff --check`: exit 0.
- Production forwarding probe on the rebuilt binary: 55 of 55 identical, exit 0.
- npm run handoff: run after this record was saved; a failure would be recorded here by a further edit.
Not checked: live Supabase or GitHub, Vercel, a hosted CI run for this batch.

Remaining gates: independent review of these fixes and of CI-001, VERIFY-002, VERIFY-003; live-provider checks of the access boundary; the owner's four AI decisions; anonymous GitHub quota; hosting, Vercel forwarding, measurements, rollback.
Next bounded action that needs no decision: REVIEW-007, CI-001, VERIFY-002 and VERIFY-003 by the same method. With the owner's AI answers: AI-002.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Historical checkpoint: REVIEW-006 resumed (Claude Code, 2026-10-13)

Earlier note: the owner said "continue the implementation". Claude Code read the checkpoint below, found main still at 9480ef9 with the same 15 changed files and no other writer, and reclaimed the role.
Doing the five items the checkpoint lists, in order: full checks on the tree as it stands; rebuild and production probe; REVIEW-006 record in claude-review.md; contract READMEs, ADR, backend-map and task table; completed handoff.
No file changed yet since the pause except this one. No processes running. Account usage is not visible to Claude Code.

## Historical checkpoint: REVIEW-006 as it stood when the owner asked for a stop (Claude Code, 2026-10-13)

Earlier status, since resolved: stopped by the owner, who said "stop and save a checkpoint here". Implementation stopped at once. Not ready for synchronization: `npm run handoff` was NOT run for this task and must not be run until it is finished.
Task: REVIEW-006, the independent review of Codex's AUTH-001 and AUTH-002 by deliberate breaks, with fixes for what the breaks showed.
Owner: Claude Code until this checkpoint; writer released below. Reviewer of these fixes: nobody yet.
Branch main; base and current HEAD 9480ef9f407571fe333bae48eb824181acfdba5e. All changes below are uncommitted. Nothing is deployed and no route is switched on.

Working tree, exactly (`git status --short`):
- Modified: backend/cmd/api/{access_test.go,main.go,main_test.go}, backend/internal/githubaccess/{access.go,access_test.go}, contracts/github-access/cases.json, contracts/public-repository-reads/cases.json, docs/coordination.md, learn-go/16-verifying-access/README.md, scripts/contracts/{github-access.test.mjs,public-repository-reads.test.mjs}, src/lib/github/access.js.
- New: backend/cmd/api/wiring_test.go, backend/internal/githubaccess/review_test.go, backend/internal/githubrepos/review_test.go.
- No exercise.go changed.

Finished:
- Deliberate breaks before any fix. Next.js side (access.js, repoData.js, starred route), 42 applied in memory: 30 noticed, 12 not. Go side (githubaccess, cmd/api wiring, githubrepos), 29 in a scratch copy: 14 noticed, 13 not, 2 of the breaks themselves did not compile.
- The worst miss: in Go, giving the public handlers the server's GITHUB_TOKEN, or giving a verified caller's handlers no token, passed every test, because the isolation test built its own copy of the wiring and never ran the server's.
- Fixes written: `newHandler` in cmd/api/main.go is now what both `run()` and the tests use; wiring_test.go checks the credential on every upstream request for all five routes, signed in and not, with a decoy server token, and that a verified caller's token never follows a redirect. githubaccess checks each field of an issuer reply as the Next.js check does (through jscompat.DecodeJSON), with DefaultTimeout as a named constant and a Timeout field for tests. src/lib/github/access.js skips a malformed identity entry, requires a non-empty text id, treats only status 200 as an answer, and names its deadline IDENTITY_DEADLINE_MS. Shared access cases 15 -> 35; public-repository-reads cases 14 -> 15 and one more row in the starred test. The write-timeout guard now adds the four seconds of verification. Lesson 16 explains the changed Go.
- Deliberate breaks after the fixes: Next.js 46 of 46 noticed. Go 37 of 39: one of my breaks did not compile ("identities that are not a list"; the shared case of that name covers it), and one survived ("identity reply size unlimited"), which is an equivalent change, because the reader already stops one byte past the limit and the cut-off JSON fails to decode.

Checks actually run on the fixes, and when:
- `npm run test:contracts`: 615 of 615, and backend `go test -count=1 ./...` 9 packages, gofmt and vet clean. These ran BEFORE two later edits: the `github-id-fraction` case was tightened and lesson 16 was edited.
- After those edits only this was rerun: scripts/contracts/github-access.test.mjs 41 of 41, and `go test -count=1 ./internal/githubaccess` ok.

NOT done, in order:
1. Rerun on the tree as it stands: `npm run test:contracts`; in backend `gofmt -l .`, `go vet ./...`, `go test -count=1 ./...`; in learn-go `go vet ./...`, `go vet -tags solution ./...`, `go test -count=1 -tags solution ./...`; `npx eslint scripts/contracts src/lib/github/access.js`; `git diff --check`.
2. Rebuild `backend/bin/api.exe` and run `node scripts/contracts/go-forwarding-probe.mjs ./backend/bin/api.exe --production` (expected 55 of 55). Go changed, so the probe is needed.
3. Insert the REVIEW-006 record into docs/claude-review.md. It is drafted outside the repository and not yet in any committed file; if the draft is lost, this checkpoint has every fact it contains.
4. Update contracts/github-access/README.md (35 cases; the aligned rules) and contracts/public-repository-reads/README.md (15 cases); add a short note to the ADR and backend-map.md; update the task table row for REVIEW-006.
5. Turn this checkpoint into a completed handoff, then `npm run handoff`.

Known failures: none known. No test is known to fail on the current tree, but item 1 has not been run in full since the last two edits.
Processes: none running. The background runs have ended.
Remaining gates, unchanged: owner's four AI decisions; anonymous GitHub quota; hosting; live Supabase and GitHub checks; Vercel forwarding; measurements; rollback. Independent review still missing for CI-001, VERIFY-002, VERIFY-003 and for these fixes.
Account usage is not visible to Claude Code; no remaining percentage is claimed.

Pickup prompt: "Read AGENTS.md and the REVIEW-006 PAUSED / INCOMPLETE checkpoint at the top of docs/coordination.md. Run git status --short and git diff, confirm Active writer is none, claim the writer role, then do the five NOT done items in order."

Recorded on arrival, still true: the Git Agent committed the two earlier batches as b5745b3 and 9480ef9, and `node scripts/agent-handoff.mjs --status --ci` reported the Backend verification run 38360938461 on 9480ef9 as completed, success. That run includes `go test -race` on Linux. Claude Code read the status through the script and did not open the logs.

## Earlier working notes for REVIEW-006 (superseded by the checkpoint above)

Earlier note: Claude Code owns this task; it is itself the independent review of Codex's AUTH-001 and AUTH-002. Base/current main @ 9480ef9; tree clean at start; previous writer released.
Recorded on arrival: the Git Agent committed the last two batches as b5745b3 and 9480ef9. `node scripts/agent-handoff.mjs --status --ci` reported the Backend verification run 38360938461 on 9480ef9 as completed, success. That run includes `go test -race` on Linux and covers both batches. Claude Code read the status through the script and did not open the logs.
Plan: 1) read the current access code and AUTH-002's changes; 2) deliberate breaks of access.js in memory and of access.go in a scratch copy; 3) fix only what the breaks or reading show, with tests; 4) REVIEW-006 record; 5) checks and handoff.
Milestone 1: deliberate breaks run; no repository file changed yet. Next.js side (access.js, repoData.js, starred route), 42 breaks applied in memory: 30 noticed, 12 not. Go side (githubaccess, cmd/api wiring, githubrepos), 29 breaks in a scratch copy: 14 noticed, 13 not, 2 of my own breaks did not compile. The important misses: in Go, giving the public handlers the server GITHUB_TOKEN, or giving private handlers no token, passes every test, because the isolation test builds its own wiring and never runs the server's; in both, accepting an identity from any provider, a user with no id, an unchecked GitHub id, oversized credentials, missing configuration, a missing public key header, an oversized identity reply and a longer deadline all pass. Reading also confirmed two mismatches on malformed issuer replies (an identity id that is a number; a null identity entry).
Milestone 2: fixes written. Changed: backend/internal/githubaccess/access.go (replies checked field by field as the Next.js check does; DefaultTimeout and a Timeout field), backend/cmd/api/main.go (newHandler, used by run() and by tests), backend/cmd/api/{access_test.go,main_test.go}, backend/internal/githubaccess/access_test.go, src/lib/github/access.js (only a 200 is an answer; malformed identity entries skipped; deadline constant), scripts/contracts/{github-access.test.mjs,public-repository-reads.test.mjs}, contracts/github-access/cases.json (15 -> 35), contracts/public-repository-reads/cases.json (14 -> 15). New: backend/cmd/api/wiring_test.go, backend/internal/githubaccess/review_test.go, backend/internal/githubrepos/review_test.go.
Next: rerun both sets of deliberate breaks; lesson 16 text; REVIEW-006 record; full checks and production probe; handoff. If interrupted: `git diff` shows any partial edit; the scratch scripts are outside the repository. No processes running. Account usage is not visible to Claude Code.

## Handoff: AI-001b / AI-001c / AI policy proposal (Claude Code, 2026-10-13)

Status: **fixtures and documentation complete; awaiting independent review; no source, Go or route change; not deployed**.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base b5745b32d68a75d3bddf4926ae098da4d7cf23cc.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `b5745b3`).

Done:
- AI-001b: 62 fixtures (10 defect) for `POST /api/ai/enhance-query`. The real handler runs; the two provider keys, global fetch and console.error are replaced and restored.
- AI-001c: 42 fixtures (16 defect) for `POST /api/ai/chat`. The real handler and the real `src/lib/ai/github.js` run, so the provider request (address, headers, model, system prompt) is pinned as well.
- A proposal for the owner in adr/0002-go-backend.md: four decisions, each with a recommendation, that the AI ports wait for.
- Every Phase 2 route now has fixtures. Eight are ported (the GitHub reads); the three AI routes are recorded only.

Findings worth the owner's attention (recorded as `defect` cases, nothing fixed):
- Chat checks no caller and no limit, and a caller's system message replaces the application's. It is an open relay to the model on the server's `GITHUB_TOKEN`.
- Chat returns provider and internal error text to the caller.
- Enhance-query answers 500 on any provider failure and does not use its own basic enhancement as a fallback.

Changed files (all new except the shared docs):
- scripts/contracts/{enhance-fixture.mjs,ai-enhance-query.test.mjs,chat-fixture.mjs,ai-chat.test.mjs}
- contracts/ai-enhance-query/{cases.json,README.md}, contracts/ai-chat/{cases.json,README.md}
- docs/{coordination.md,adr/0002-go-backend.md,backend-map.md}
No file under src/, backend/ or learn-go/ changed, so no lesson and no production probe.

Checks (Claude Code, Windows, Node 21.7.1):
- The two new test files: 106 of 106.
- `npm run test:contracts`: 589 of 589.
- Fixture sensitivity: 63 changes to the two handlers and the helper, applied in memory through a module loader so no source file was written. 62 were noticed at first; the miss, one trigger word, got its own case and is now noticed.
- ESLint on scripts/contracts: clean. `git diff --check`: exit 0.
- npm run handoff: run after this record was saved; a failure would be recorded here by a further edit.
Not checked: any live provider, key, model name, address or usage. Three failures whose message is the JavaScript engine's own wording are described in the chat README and not pinned.

Remaining gates: owner's four AI decisions before any AI port; independent review of this batch and of AUTH-001, AUTH-002, CI-001, VERIFY-002, VERIFY-003; a hosted CI run that includes the last two batches; anonymous GitHub quota; hosting, Vercel forwarding, measurements, rollback.
Next bounded action that needs no decision: REVIEW-006, independent review of AUTH-001 and AUTH-002 with full suites and deliberate breaks. With the owner's answers: AI-002, the session check and limits in Go.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Historical checkpoint: AI-001b / AI-001c / AI policy proposal (Claude Code, 2026-10-13)

Status: active. Claude Code owns this batch; reviewer unassigned. Base/current main @ b5745b3 (the Git Agent committed the previous batch); tree clean at start; previous writer released.
Objective: record what the two remaining AI routes do today, before any port. enhance-query calls OpenAI or Anthropic directly; chat calls GitHub Models through src/lib/ai/github.js. Only global fetch and the environment are replaced; the real handlers and the real helper run. Fixture keys are obvious fakes. No provider is contacted and no real key is read.
Plan: 1) enhance-query harness, cases, runner, README; 2) chat harness, cases, runner, README; 3) deliberate in-memory handler changes to check the fixtures notice; 4) policy proposal in the ADR; 5) full contracts, ESLint, diff check, handoff. No Go change, so no lesson and no production probe.
Milestone 1: both harnesses, runners and fixture files are written and pass. New files: scripts/contracts/{enhance-fixture.mjs,ai-enhance-query.test.mjs,chat-fixture.mjs,ai-chat.test.mjs}, contracts/ai-enhance-query/cases.json (62 cases, 10 defect), contracts/ai-chat/cases.json (42 cases, 16 defect). Focused run of the two test files: 106 of 106. ESLint on scripts/contracts clean. Fixture sensitivity: 63 changes to the handlers and the helper, applied in memory only, 62 noticed at first; the miss (one trigger word) got its own case and is now noticed. No source file under src/ or backend/ changed.
Still to do: the two contract READMEs, the policy proposal in the ADR, shared docs, full contracts, diff check, handoff. If interrupted: the fixture files are complete and self-checking; only documentation is missing. No processes running. Account usage is not visible to Claude Code.

## Handoff: GO-007b / lesson 18 / AI-001a / REVIEW-005 (Codex implementation; Claude Code review and completion, 2026-10-13)

Status: **bounded local implementation complete and reviewed by the other agent; not deployed; no route switched on**.
Owner: Codex wrote GO-007b, lesson 18 and AI-001a and stopped on a usage limit at its pre-final checkpoint. Claude Code took the batch over at the owner's instruction, ran the outstanding checks, reviewed it (REVIEW-005 in claude-review.md) and fixed what the review found. Codex has not seen those fixes.
Branch main; base 259ff7ba125bfb367e3fbba211e277a05f41476d.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `259ff7b`).

What the batch contains:
- GO-007b (Codex): `GET /api/github/trending-developers` in Go, `backend/internal/githubdevelopers`. Public-only, no credential forwarded, four lookups at a time, 25 seconds for the whole request, off unless `github-trending-developers` is enabled.
- Lesson 18 (Codex): bounded parallel work.
- AI-001a (Codex): fixtures for `POST /api/ai/suggestions` with the AI call stubbed. No AI code in Go, no provider call.
- REVIEW-005 (Claude Code): findings and fixes below.

Codex's tree as found, checked by Claude Code before changing anything:
backend gofmt/vet clean; `go test -count=1 ./...` 9 packages; build; learn-go
vet both ways and 19 solution packages; `npm run test:contracts` 470/470;
ESLint on next.config.mjs and scripts/contracts clean; `git diff --check`
clean; production probe 55 of 55, exit 0.

Review fixes by Claude Code (all in this batch):
- Trending and trending developers logged nothing on failure. Each now takes a
  Logger and writes one error record per failed request: stage and cause,
  never the address. Wired in cmd/api/main.go.
- New `jscompat.DecodeJSON` reads a GitHub reply as `response.json()` does
  (leading byte-order mark skipped, digits kept, nothing after the value).
  Both handlers use it; before, a byte-order mark was a 500 in Go only.
- Developers: a search entry that is not an object, a login that is not a
  string, and a repository reply that is a string are now handled as the
  Next.js handler handles them.
- Fixtures added from the unchanged Next.js handlers, existing cases
  byte-identical, no version raised: developers 48 -> 57 (23 defect),
  trending 33 -> 34, ai-suggestions 32 -> 35.
- Lesson 18's test now requires two calls to really run together. Lesson 18
  and lesson 05 explain the new Go. No exercise.go changed.
- Two differences from Next.js are left on purpose, recorded in the ADR and
  pinned by a Go test each: a numeric login keeps its digits; an object reply
  with a `length` field counts as no repositories.

Final checks on the tree being handed off (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- backend: gofmt -l empty; go vet clean; `go test -count=1 ./...` 9 packages pass; `go build -o bin/api.exe ./cmd/api` ok.
- learn-go: gofmt -l empty; go vet clean with and without the solution tag; `go test -count=1 -tags solution ./...` 19 packages pass; lesson 18 as shipped fails its test without panicking; its solution passed 5 runs.
- `npm run test:contracts`: 483 of 483.
- ESLint on next.config.mjs and scripts/contracts: clean. `git diff --check`: exit 0.
- Production forwarding probe on the rebuilt binary: 55 of 55 identical, exit 0.
- Differential check, developers route: 32 inputs outside the fixtures, Next.js against Go. 12 differed before the fixes; the two recorded differences remain.
- 21 deliberate breaks of the fixes in a scratch copy: 20 caught at first; the survivor led to one more fixture, after which it was caught.
- The test table for DecodeJSON and jsString was run against Node; one row was wrong (Node 21 accepts two byte-order marks) and is now a recorded difference.
- Hosted CI: `node scripts/agent-handoff.mjs --status --ci` reported the Backend verification run 38351494790 on 259ff7b as completed, success. That run includes `go test -race`. It does not cover this batch.

Changed files, beyond Codex's 22 listed in the checkpoint below:
- backend/internal/jscompat/{json.go,json_test.go} (new)
- backend/internal/githubdevelopers/{handler.go,review_test.go}
- backend/internal/githubtrending/{handler.go,review_test.go}
- backend/cmd/api/main.go (Logger for both handlers)
- contracts/{github-trending-developers,github-trending,ai-suggestions}/{cases.json,README.md}
- learn-go/18-bounded-parallel-work/{README.md,exercise_test.go}, learn-go/05-json/README.md, learn-go/README.md
- docs/{coordination.md,claude-review.md,backend-map.md,adr/0002-go-backend.md}, backend/README.md

Remaining gates:
- Independent review of AUTH-001, AUTH-002, CI-001, VERIFY-002 and VERIFY-003. Codex has not reviewed REVIEW-005's fixes.
- A hosted CI run that includes this batch.
- Anonymous GitHub quota: one developers call makes up to 21 requests without a credential, against a limit of 60 an hour per address. Owner decision, shared with search, summary and trending.
- Hosting, Vercel forwarding, measurements, rollback under traffic: unchanged.
- AI: guest policy, quotas and key ownership before any AI port.

Next bounded action: AI-001b, fixtures for `POST /api/ai/enhance-query` with the AI call stubbed, then the same for `POST /api/ai/chat`. Those two complete the characterization of Phase 2's routes. No AI port before the owner's policy decisions.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Historical takeover checkpoint: Claude Code, batch GO-007b / lesson 18 / AI-001a (2026-10-13)

Status: active. Claude Code claimed the writer role by owner instruction after
Codex's usage limit. Tree on arrival: main @ 259ff7b, 22 uncommitted files as
Codex's pre-final checkpoint below lists; `node scripts/agent-handoff.mjs
--status` reported WRITER_ACTIVE, signalMatchesTree false. No file other than
this one changed yet. No processes running. Account usage is not visible to
Claude Code; no remaining percentage is claimed.
Milestone 1 (Claude Code): Codex's tree, unaltered, passed every outstanding
check: backend gofmt/vet clean, `go test -count=1 ./...` 9 packages, build of
bin/api.exe, learn-go vet both ways and 19 solution packages, lesson 18 fails
as shipped without panicking, `npm run test:contracts` 470/470, ESLint on
next.config.mjs and scripts/contracts clean, `git diff --check` clean,
production probe 55 of 55 exit 0.
Milestone 2: differential check of the developers route, 32 inputs outside
the 48 fixtures, Next.js handler against Go in a scratch copy: 20 agree, 12
differ (entries that are not objects; a login that is an object, array or
non-canonical number; a repository reply that is a string or an object with
`length`; a leading byte-order mark). None is something GitHub sends.
Milestone 3 (Claude Code): fixes written and passing in the changed packages
(`go test -count=1` jscompat, githubdevelopers, githubtrending, cmd/api; gofmt
and vet clean). New: backend/internal/jscompat/{json.go,json_test.go},
backend/internal/githubdevelopers/review_test.go,
backend/internal/githubtrending/review_test.go. Changed by Claude Code:
githubdevelopers/handler.go, githubtrending/handler.go, cmd/api/main.go
(Logger wiring), learn-go/18-bounded-parallel-work/exercise_test.go, and
fixtures added without touching existing cases: developers 48 -> 56,
trending 33 -> 34, ai-suggestions 32 -> 35.
Still to do: full suites and production probe on the final tree, deliberate
breaks (running), lesson text for the new Go, REVIEW-005, ADR rows, handoff.
If interrupted: run `npm run test:contracts`, then in backend `go test
-count=1 ./...`; both are expected to pass on the tree as it stands.

## Historical pre-final checkpoint (Codex): batch GO-007b / lesson 18 / AI-001a (2026-10-13)

Status: active, all three implementations written. Developers focused Go checks passed: 48 cases in two modes plus real upstream fan-out/order and cancellation. Main route/public exception/default-off switch added; lesson 18 exercise/solution/tests written, prior exercises untouched. AI suggestions 32 fixtures/8 defects and integrity check passed (33/33), actual provider stubbed. Docs/index updated. Initial Go harness mismatch with opaque URL.String fixed; no known implementation failure remains. No running processes. Base/current 259ff7b, main, uncommitted.

Next long operations: full fresh Go tests/vet/format/build, lesson solutions/vet, all Node contracts/lint, production probe with 55 URLs. Checkpoint files: backend/internal/githubdevelopers/, backend/cmd/api/{main.go,main_test.go,trending_test.go}, backend/internal/githubaccess/access.go, next.config.mjs, scripts/contracts/{go-rewrites.test.mjs,go-forwarding-probe.mjs,ai-suggestions-loader.mjs,suggestions-fixture.mjs,ai-suggestions.test.mjs}, contracts/ai-suggestions/, learn-go/18-bounded-parallel-work/, lesson06/16/index and backend/access/developers/shared docs. No deployment/cutover, peer review or hosted race result claimed.

## Batch milestone (2026-10-13)

Status: active. GO-007b handler and all 48 fixtures pass in memory/local HTTP. Wire test verifies four-request fan-out and result order; cancellation test verifies workers joined. First test run failed because fixture transport used URL.String on jscompat's opaque URLs; fixed harness to inspect scheme/host/RequestURI, production unchanged. Routing/public exemption/default-off switch wired; focused Go packages passed. Lesson 18 and AI suggestions harness written; AI fixtures not recorded yet. Base/current 259ff7b main, uncommitted. No owned processes running. Next: record AI fixtures, lesson/docs, final full suites/build/probe, single batch handoff. No deployment or provider calls.

## Batch checkpoint: GO-007b / lesson 18 / AI-001a (2026-10-13)

Status: active. Owner requested 2-3 related tasks per turn. Codex owns this batch; reviewer unassigned. Base/current main @ 259ff7ba125bfb367e3fbba211e277a05f41476d; starting tree clean; previous writer released. Go developers port will preserve all 48 cases/17 defects, limit concurrent enrichment to four, use a 25-second whole-request deadline and no credentials, remain default-off. Lesson 18 covers bounded parallel work. AI-001a records suggestions route behavior with only the AI dependency stubbed; no provider calls, production AI port or guest-policy decision implied.

Next: implement developers Go and fixture tests, wire route, add lesson; checkpoint; record AI fixtures, then one final full verification/handoff. No tests run yet, no owned processes running, no secret reads. Existing review/hosted CI/auth/quota/cache/deployment gates remain. Progress metric is 7/25 built routes (28%), not a weighted whole-migration percentage.

## Latest handoff: GO-007a (Codex, 2026-10-13)

Status: **implementation complete; local contract verification complete; independent review pending**.
Owner: Codex. Reviewer: unassigned, no peer approval claimed.
Branch main; base/current 086a6dca2e1ca369a223ce9cdc2ce2b2fe735ee3.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `086a6dc`).

Implemented: 48 version-1 fixtures for GET /api/github/trending-developers,
17 marked defect; two integrity/ordering checks. Fixed clocks/time zones,
delayed enrichment, up to 21 upstream calls, 20-result cap, ordered ranks,
credential non-forwarding, partial failures, malformed replies and URL behavior.
Harness drains pending mocked requests before restoring global substitutions.
No production handler, Go code, lesson, route switch or deployment change.

Changed files:
- contracts/github-trending-developers/README.md
- contracts/github-trending-developers/cases.json
- scripts/contracts/developers-fixture.mjs
- scripts/contracts/github-trending-developers.test.mjs
- docs/coordination.md
- docs/backend-map.md
- docs/adr/0002-go-backend.md

Checks by Codex:
- Focused developers tests: 50/50 passed.
- Full npm run test:contracts: 437/437 passed, exit 0 (backend/bin/go007a-contracts.log).
- Six deliberate in-memory handler mutations caught; real source untouched:
  result cap, rank offset, wrong date, enrichment HTTP-error handling,
  credential leakage and reversed developer order.
- Focused ESLint passed, exit 0; git diff --check passed.
- No source diff under src/, backend/ or learn-go/. Build/probe/full UI lint not
  repeated because this task changes only fixtures, harness and documentation.
- npm run handoff passed, exit 0: all contracts, fresh backend tests/vet/format and lesson solutions passed; writerReleased=true, signal emitted. Log: backend/bin/go007a-handoff.log. Rerun after this documentation-only result update refreshes the tree fingerprint.

Remaining gates: GO-007b is not implemented; existing seven Go routes still
require independent review/hosted CI/live cutover evidence. No live GitHub,
Supabase, deployment or quota check was performed. Defect characterization does
not approve fixing or publishing defective behavior. No owned processes running.
Next bounded action: claim GO-007b after checking status and this handoff; add
standard-library handler, controlled fan-out, clock injection, shared fixtures,
public-only/no-credential routing, default-off switch and lesson 18. Writer
released: yes. No Git Agent receipt or remote synchronization claimed yet.

## Historical GO-007a pre-verification checkpoint (2026-10-13)

Status: active. 48 fixtures/17 defects and two additional checks pass locally (50/50). Six deliberate in-memory source mutations caught: cap21, rank offset, wrong date, HTTP-error fail-all, credential leakage, reversed output. Actual production source unchanged. Contract README, ADR and backend-map updated; Go/lessons untouched. Base/current 086a6dc main, changes uncommitted; no processes running. Next: full contracts/focused lint/diff and shared handoff suites. No production build needed for fixture/docs-only changes. Remaining review/deployment/CI gates unchanged. Full changed files: contracts/github-trending-developers/{README.md,cases.json}, scripts/contracts/{developers-fixture.mjs,github-trending-developers.test.mjs}, docs/{coordination.md,backend-map.md,adr/0002-go-backend.md}.

## GO-007a milestone checkpoint (2026-10-13)

Status: active. Wrote 48 version-1 developer fixtures (17 marked defects), harness and Node runner. Focused checks 50/50 passed (backend/bin/go007a-focused.log). Manually inspected normal card, 429 fallback, whole-response network failure, path normalization, DST/UTC dates. No production files changed. New files: contracts/github-trending-developers/cases.json, scripts/contracts/{developers-fixture.mjs,github-trending-developers.test.mjs}; coordination modified. Base/current 086a6dc, main, uncommitted. No owned processes running. Next: deliberate in-memory handler changes to check fixture sensitivity, README/architecture notes, full contracts/lint/diff, then handoff suites. No Go source change so no lesson added.

## Active checkpoint: GO-007a (Codex, 2026-10-13)

Status: active. Objective: characterize existing trending-developers behavior before its Go port. Starting tree clean, previous writer released. Branch main, base/current 086a6dca2e1ca369a223ce9cdc2ce2b2fe735ee3. GO-006b committed at 4640b10; subsequent Git Agent commit 086a6dc fixes HTTP-test counter synchronization. No hosted CI result inferred from that fix.

Constraints: contract-first; preserve response/query/date behavior and mark defects. Public route sends no credential; never inspect secrets or make real GitHub requests. Exercise/Go code untouched in this bounded task. Capture up to 20 parallel enrichment requests, ordered results despite out-of-order completion, and asymmetric HTTP versus transport/malformed-body failures. Fixed clocks/time zones; stub fetch only. Test counts and progress percentage are not cutover evidence (7/25 routes implemented = 28%; wider migration unweighted).

Next: write fixture harness and explicit cases, record expected results from unchanged source, inspect representative outputs, run full contracts/lint and handoff suites. Checks so far: status/HEAD/source inspected only; no owned processes running. Reviewer unassigned. No new tests run yet. All new work will remain uncommitted until Git Agent synchronization.

## Latest handoff: GO-006b (Codex, 2026-10-13)

Status: **implementation complete; local verification complete; independent review pending**.
Owner: Codex. Reviewer: unassigned; no peer approval claimed.
Branch main; base/current 7097beec821d296fbaa0cb6d1a8116f64666bdb3.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `7097bee`).

Implemented: standard-library GET /api/github/trending, with injected clock/random
inputs and unchanged version-1 contract. Preserves all 33 cases including 13
marked defects; no new package dependency. Public-only, ignores inbound auth
and sends no GitHub credential. Registered in the actual mux, with explicit
public verifier exemption and default-off github-trending rewrite. Ten-second
upstream timeout, cancellation and 16 MiB body bound. Added lesson 17 and updated
lessons 06/16 and index. Existing exercise.go files untouched. Node source and
trending fixtures unchanged. Production probe includes three trending URLs.

Checks by Codex on final implementation:
- npm run test:contracts: 387 passed, exit 0 (backend/bin/go006b-contracts.log).
- backend go test -count=1 ./...: all eight packages passed; go vet ./... passed;
  gofmt -l . empty; go build -o bin/api.exe ./cmd/api passed.
- All 33 trending cases checked through in-memory and local HTTP handlers (66
  subcases), plus cancellation, oversized/trailing JSON and actual mux token
  non-forwarding tests. Upstream is stubbed; not a live GitHub test.
- learn-go go test -count=1 -tags solution ./...: eighteen packages passed;
  go vet -tags solution ./... passed; gofmt empty.
- Focused ESLint next.config/probe/rewrite test passed. Full UI lint not repeated;
  earlier baseline 10 errors/16 warnings remains an attributed prior result.
- Production Next build/probe: 53/53, native exit 0 (backend/bin/go006b-production.log).
- git diff --check passed. No owned processes remain running.
- Completion hook: npm run handoff passed, exit 0; contracts/backend/lesson checks passed, writerReleased=true, signal emitted. Log: backend/bin/go006b-handoff.log. Rerun after this documentation-only result update refreshes the tree fingerprint. Git Agent receipt/commit/push not yet verified.

Remaining gates: independent review; hosted CI after Git Agent's lockfile fix;
live OAuth/Vercel, quota and summary cache-retention work; hosting/measurements
and rollback. Local fixtures do not approve fabricated starsToday or fix its
calendar/prototype defects. Public-only trending must not later inherit a private
credential without a new contract. No agent deployment/cutover performed;
automatic deployment of synchronized Next.js changes remains unverified.

Next bounded task: GO-007a ? characterize /api/github/trending-developers,
including its fan-out, error behavior and rate-limit exposure. Reviewer can
independently review GO-006b first. Read this handoff and inspect git status/diff,
then claim writer before editing. Writer released: yes.

Actual changed files:

```text
backend/README.md
backend/cmd/api/main.go
backend/cmd/api/trending_test.go
backend/internal/githubaccess/access.go
backend/internal/githubtrending/handler.go
backend/internal/githubtrending/handler_test.go
contracts/github-access/README.md
contracts/github-trending/README.md
docs/adr/0002-go-backend.md
docs/backend-map.md
docs/coordination.md
learn-go/06-http-handlers/README.md
learn-go/16-verifying-access/README.md
learn-go/17-clocks-and-randomness/README.md
learn-go/17-clocks-and-randomness/exercise.go
learn-go/17-clocks-and-randomness/exercise_test.go
learn-go/17-clocks-and-randomness/solution.go
learn-go/README.md
next.config.mjs
scripts/contracts/go-forwarding-probe.mjs
scripts/contracts/go-rewrites.test.mjs
```

## Historical GO-006b verification milestone (2026-10-13)

387 Node checks passed. All eight Go packages passed fresh tests; go vet passed; gofmt empty; rebuilt binary passed. All eighteen lesson packages passed with solutions, lesson vet passed, gofmt empty. Focused changed-JS ESLint and git diff --check passed. Existing exercises unchanged. Production probe running in owned session 71716, log backend/bin/go006b-production.log, 53 scenarios expected. No other owned tests running. Next: capture probe exit, finalize docs and release, run npm run handoff. Current source stays uncommitted on 7097bee; independent review/hosted race not claimed.

Git Agent pipeline note from source inspection: its new treeHash hashes status text and git diff HEAD, which does not include untracked file contents. Do not treat a matching hash alone as proof that untracked content was tested; the current task runs the full handoff checks. Pipeline hardening is separate work, not modified during GO-006b.

## GO-006b pre-verification checkpoint (2026-10-13)

Status: active. Base/current 7097bee, main; writer Codex. Implemented standard-library handler, 33 shared cases in memory/local HTTP, route registration/default-off rewrite, explicit public-only auth exemption, credential non-forwarding test, cancellation/body bounds, lesson 17 plus updated lesson 06/16 and index, backend/access/trending/docs notes. Focused Go tests for githubtrending, cmd/api and githubaccess passed before extra cancellation/body tests. No new dependency, contract version change, deployment or cutover.

Next long checks: gofmt changed Go/new lesson; fresh backend tests/vet/format and lesson solutions/vet/format; 387 Node checks + lint; rebuilt binary and production probe (53 scenarios). New source paths: backend/internal/githubtrending/{handler.go,handler_test.go}, backend/cmd/api/trending_test.go, learn-go/17-clocks-and-randomness/. Modified main.go, githubaccess/access.go, next.config.mjs, rewrite test/probe, listed docs/lessons. No owned process running at checkpoint. Remaining gates: independent review, hosted CI after Git Agent lockfile fix, live OAuth/Vercel, public cache retention and quotas. No new permission needed for this local port.

## Active checkpoint: GO-006b (Codex, 2026-10-13)

Status: active, implementation written; final verification pending. Starting tree clean; prior writer released. Base/current main @ 7097beec821d296fbaa0cb6d1a8116f64666bdb3. Prior batch committed by Git Agent at 7831c0b, pipeline/lockfile changes at 7097bee. Read-only --status says IDLE_CLEAN. Remote main observed at 6a11b032, contents uninspected; no merge/reset performed.

Objective: standard-library Go trending handler against all 33 GO-006a cases, injected clock/random source, preserved marked defects, opt-in switch, lesson 17. Public-only route must not borrow any credential; match current Next trending behavior even with auth headers. No source contract fixes. No new Go dependency. Review unassigned; no peer approval claimed.

Additional evidence: Codex's switch-off npm run build completed exit 0 (backend/bin/auth002-switch-off-build.log). Earlier 387 Node tests/focused lint were also run by Codex before Git Agent repeated them. Git Agent's commit message records hosted Linux npm ci failure and lockfile fix, not a verified green rerun. Corrected max-5 handoff typo to actual max 4. New task checks not yet run; no owned processes running. Next: complete final checks and handoff.

## Latest handoff: AUTH-002 / VERIFY-003 / GO-006a (Codex + Git Agent final verification, 2026-10-13)

Status: **bounded local implementation complete; awaiting independent review; not deployed**.
Owner: Codex (implementation & 50/50 production probe); final verification & handoff release completed by Git Agent after Codex usage limit halt.
Branch: `main`; base `7e0820c3649ae83205f682a93d6b934ede1d8899`.

Completed:
- **AUTH-002:** Closed shared-token reads on the public repository page (`src/lib/repo/repoData.js`) and starred collection enrichment (`src/app/api/repo/starred/route.js`). Validated identifiers, removed server `GITHUB_TOKEN` usage, enforced uncached public reads, and revalidated starred enrichment with bounded concurrency (max 4) while preserving user-scoped Supabase authorization. Added 18 contract/isolation tests in `contracts/public-repository-reads/` and `scripts/contracts/public-repository-reads.test.mjs`.
- **VERIFY-003:** Strengthened `scripts/contracts/go-forwarding-probe.mjs` identity stub to require exact Supabase bearer token, exact public key, and known GitHub tokens, plus a wrong-session `401` scenario (50/50 production probe passed, native exit 0).
- **GO-006a:** Recorded 33 characterization fixtures (including 13 marked `defect`) for `GET /api/github/trending` under fixed UTC/local clocks and deterministic `Math.random` in `contracts/github-trending/` and `scripts/contracts/github-trending.test.mjs`. No trending behavior change or Go route port yet (`GO-006b` is next).

Final checks:
- `npm run test:contracts`: **387 / 387 passed**, exit 0.
- Focused ESLint (`npx eslint src/lib/repo/repoData.js src/app/api/repo/starred/route.js scripts/contracts/...`): **passed**, 0 errors/0 warnings.
- `node scripts/contracts/go-forwarding-probe.mjs ./backend/bin/api.exe --production`: **50 / 50 passed**, native exit 0.
- `git diff --check`: **clean**.
- Writer released: yes.

## Latest handoff: REVIEW-004 / CI-001 / VERIFY-002 / AUTH-001 (Codex, 2026-10-13)

Status: **bounded local implementation complete; synchronized at `7e0820c`; new work awaiting independent review; not deployed**.
Owner: Codex. Reviewer: unassigned for this batch; no Claude review or receipt claimed.
Branch main; base HEAD `905c1d953a15b296fad1ff257d5c0a53e0043688`.
Resulting commit: `7e0820c3649ae83205f682a93d6b934ede1d8899` (synchronized by Git Agent on `main` and `go-backend`).
This record supersedes the historical incomplete checkpoints below.

Completed:
- REVIEW-004 reviewed GO-005a/b, FIX-003/004, VERIFY-001 and OPS-001a at the base commit; accepted with routing off. See claude-review.md.
- CI-001 adds a pinned, read-only Linux workflow for contracts, race/vet/format, lesson solutions and production forwarding. Hosted run pending.
- VERIFY-002 tests production Next build/start with isolated output and portable cleanup: 46 public URL cases plus 3 authenticated cases.
- AUTH-001 verifies Supabase user and GitHub account online, matches the linked provider ID, and uses only that user's GitHub credential on five dynamic migrated routes. Anonymous requests have no server-token fallback. Private summary requests bypass shared caches; private replies are no-store. Shared contracts cover two users and revocation.
- Added lesson 16 and updated affected lessons; existing exercise.go files untouched. All Go rewrites remain opt-in/off by default.
- Global checkpoint instructions saved in C:/Users/Windows/.codex/AGENTS.md and C:/Users/Windows/.claude/CLAUDE.md, plus the owner's requested memory note. No suitable checkpoint plugin found or installed. No quota meter/background watcher is claimed.

Final checks (Codex):
- npm run test:contracts: 335 passed, exit 0.
- backend: go test -count=1 ./...: seven packages passed; go vet ./... passed; gofmt -l . empty; go build -o bin/api.exe ./cmd/api passed.
- learn-go: go test -count=1 -tags solution ./...: 17 packages passed; go vet -tags solution ./... passed; gofmt -l . empty.
- node scripts/contracts/go-forwarding-probe.mjs ./backend/bin/api.exe --production: production build and 49/49 checks passed, explicitly captured native exit 0.
- Full ESLint: existing 10 errors/16 warnings in unaffected UI; targeted changed access/probe/test/config files passed. Generated probe output is now ignored by ESLint.
- Workflow YAML parsed; git diff --check passed; no existing exercise.go diff.
- Logs under ignored backend/bin/: final-contracts.log, production-probe-final.log, final-lint-source.log.
- Earlier lint run scanned generated files and was stopped; earlier probe exit ambiguity was resolved by the final explicit exit-0 run. No known task test/server processes remain running.

Remaining gates / dependencies:
- Independent review of AUTH-001 / CI-001 / VERIFY-002; hosted Linux race-detector result. No local race detector result (no C compiler).
- Live Supabase/GitHub OAuth, Vercel preview forwarding, latency/error measurements and rollback evidence not run. No deployment or cutover authorized by this handoff.
- Private UI is deliberately not connected yet: useGitHubSearch localStorage cache is not account-scoped; chat/share flows need a private-data audit. This API boundary is not a claim that all private UI or all server-token consumers are secured.
- Audit remaining token consumers in src/lib/github-api.js, src/lib/repo/repoData.js, /api/repo/starred, /api/trending/refresh and AI helpers. Anonymous contributions retain the existing missing-token error and anonymous GitHub rate limits are lower.
- Hosting selection/deployment and later AI/data policy decisions remain as listed below. No credentials needed from the owner for the completed local work.

Next bounded action: run git status --short and git diff, read this handoff and contracts/github-access/README.md, then independently review this batch. Observe the first hosted CI run after Git Agent synchronization. Before private UI integration, claim writer and design account-isolated caches and provider-token/session handling. GO-006a remains the next unassigned route port.
Writer released: yes. Completion hook: npm run handoff passed, exit 0; contracts, fresh backend tests/vet/format and lesson solutions passed. Emitted .agent-signal.json at 2026-10-13T04:14:38.997Z, writerReleased=true, branch main, HEAD 905c1d953a15b296fad1ff257d5c0a53e0043688. Synchronized and verified by Git Agent (base `7097bee`).

Actual repository files changed (all uncommitted at this handoff):

```text
.github/workflows/backend-verification.yml
.gitignore
backend/README.md
backend/cmd/api/access_test.go
backend/cmd/api/main.go
backend/internal/githubaccess/access.go
backend/internal/githubaccess/access_test.go
backend/internal/githubcontributions/handler.go
backend/internal/githubrepos/handler.go
backend/internal/githubrepos/http_test.go
backend/internal/githubrepos/private_test.go
backend/internal/githubsearch/handler.go
contracts/github-access/README.md
contracts/github-access/cases.json
contracts/github-access/isolation.json
contracts/github-contributions/README.md
contracts/github-contributions/cases.json
contracts/github-repositories/README.md
contracts/github-repositories/cases.json
contracts/github-search/README.md
contracts/github-search/cases.json
docs/adr/0002-go-backend.md
docs/backend-map.md
docs/claude-review.md
docs/coordination.md
eslint.config.mjs
learn-go/06-http-handlers/README.md
learn-go/07-calling-github/README.md
learn-go/09-path-parameters/README.md
learn-go/10-shared-cache/README.md
learn-go/15-settings-from-the-environment/README.md
learn-go/16-verifying-access/README.md
learn-go/16-verifying-access/exercise.go
learn-go/16-verifying-access/exercise_test.go
learn-go/16-verifying-access/solution.go
learn-go/README.md
next.config.mjs
scripts/contracts/access-fixture.mjs
scripts/contracts/github-access-isolation.test.mjs
scripts/contracts/github-access.test.mjs
scripts/contracts/github-contributions.test.mjs
scripts/contracts/github-repositories.test.mjs
scripts/contracts/github-search.test.mjs
scripts/contracts/go-forwarding-probe.mjs
src/app/api/github/contents/[owner]/[repo]/route.js
src/app/api/github/contributions/route.js
src/app/api/github/repo/[owner]/[repo]/route.js
src/app/api/github/repo/route.js
src/app/api/github/search/route.js
src/lib/github/access.js
```

## Historical resume milestone: Codex, 2026-10-13

Global checkpoint instructions saved in local Codex AGENTS.md and Claude
CLAUDE.md at the owner's explicit request, plus an authorized memory note.
No suitable quota/checkpoint plugin found; none installed. No background quota
meter is available. Existing checkpoint below remains the interruption record.
Next: finish docs, final formatting/tests, production probe with explicit exit
code, then final handoff. No known test processes remain running from prior work.

Pre-verification checkpoint: AUTH-001 code and lesson 16 are now written;
REVIEW-004 record, ADR, backend/access/route contract documentation are updated.
Redirect errors were aligned between Next and Go. No new credentials or UI
integration. Final checks below are about to run; this is still incomplete.
If interrupted, inspect their logs under ignored backend/bin/ and rerun any
whose exit status was not captured. Writer remains Codex while checks run.

## Historical recovery checkpoint: Codex, 2026-10-13

Status: **paused / incomplete**, not ready for synchronization. Owner reported
a usage interruption and requested global checkpointing. Account quota is not
visible; no remaining percentage can be claimed. This checkpoint precedes resume.

Task: REVIEW-004 / CI-001 / VERIFY-002 / AUTH-001. Owner Codex; new work has
no independent peer review. Branch main; base/current HEAD
`905c1d953a15b296fad1ff257d5c0a53e0043688`; all new changes uncommitted.
Working tree: modified .gitignore, backend/cmd/api/main.go,
backend/internal/githubrepos/{handler.go,http_test.go}, three existing route
contract JSON files, docs/{coordination.md,adr/0002-go-backend.md},
learn-go/{README.md,10-shared-cache/README.md}, next.config.mjs, three existing
Node contract runners, scripts/contracts/go-forwarding-probe.mjs, and the five
dynamic migrated src/app/api/github route handlers. New files/directories:
.github/workflows/backend-verification.yml, backend/cmd/api/access_test.go,
backend/internal/githubaccess/, backend/internal/githubrepos/private_test.go,
contracts/github-access/, learn-go/16-verifying-access/,
scripts/contracts/{access-fixture.mjs,github-access.test.mjs,github-access-isolation.test.mjs},
src/lib/github/access.js. Use git status --short for the exact list.

Implemented but not final-verified:
- CI: read-only pinned actions, Ubuntu race detector, vet/formatting, Node
  contracts, lesson solutions, production forwarding. Hosted execution pending.
- Probe: isolated .next-forwarding-probe build, production mode, portable
  teardown, 46 public + 3 authenticated requests.
- Access: Supabase /auth/v1/user then GitHub /user, linked provider ID match,
  no server-token fallback for five migrated handlers, no private shared cache,
  no-store responses, credential redirect/origin restrictions. Shared auth and
  two-user/revocation fixtures; contract versions search 3/repositories 4/contributions 2.
- Lesson 16 added, exercise unfinished. Existing exercises untouched.
- ADR and access README partly reconciled; other shared docs still stale.

Actual checks already run:
- Initial baseline: 317 Node checks, six backend packages, 16 solution lessons passed.
- Updated npm run test:contracts: 334 passed before the last extra origin test.
- Updated backend go test -count=1 ./...: seven packages passed before the last
  redirect/cancellation and origin tests. Need rerun on final files.
- Production build/probe: 46/46 initially; after auth 49/49 printed in
  backend/bin/production-probe.log. The latter PowerShell session returned 1
  with a NativeCommandError for stderr warnings: rerun with explicit native
  exit-code propagation before claiming a clean exit.
- Direct local eslint command for access/probe/new tests/config exited 0;
  npx invocation eventually exited 0 too. Existing application lint baseline
  remains 10 errors/16 warnings, not rerun across the whole app in this batch.
- Workflow parsed with installed js-yaml; remote v6 action refs resolved before pinning.

Still to do: final gofmt/tests/vet/lesson solutions and lint; prove clean probe
exit; finish REVIEW-004 record, backend-map/README/contract and lesson updates;
inspect final diff/security boundaries. New auth/CI/probe need independent peer
review. No race-detector result, live OAuth, Vercel routing, performance or rollback
evidence. Existing other server-token call sites need later audit. Private UI
integration is not wired because shared browser storage/chat sharing need isolation.

Next command: inspect git diff, claim writer, then run Go formatting and fresh
tests and Node contracts. Record final results before release and npm run handoff.
Do not run npm run handoff until this bounded batch is complete. Do not reset,
stash, delete or overwrite this work. No agent receipt/review is claimed.

## Handoff: OPS-001a (Claude Code, 2026-10-12)

```text
Task / scope: OPS-001a, the one step of the hosting proposal that needs no
  owner decision: backend/cmd/api reads the PORT variable a hosting platform
  sets. With lesson 15.
Owner / reviewer: Claude Code / Codex (peer review NOT run).
Status: implementation complete; review pending; not deployed. No hosting
  account was touched and nothing was created anywhere.
Base commit / branch / worktree: 3f4c7dd / main / main checkout, on top of
  the uncommitted FIX-004 and VERIFY-001 changes.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `c51c29d`).
Changed files:
  backend/cmd/api/main.go: listenAddr(getenv) chooses the address.
    SEFGH_API_ADDR wins; else PORT, on every interface; else 127.0.0.1:8787.
    A PORT that is not a number from 1 to 65535 stops the server at start-up.
  backend/cmd/api/main_test.go: TestListenAddr, 14 cases.
  backend/README.md: the PORT row.
  learn-go/15-settings-from-the-environment/: new lesson (README, lesson.go,
    exercise.go, solution.go, exercise_test.go). learn-go/README.md: index row.
  docs/{coordination.md,adr/0002-go-backend.md}.
  No existing exercise.go changed. No handler, fixture, contract or Next.js
  change. The default address is unchanged, so local use is unchanged.
Contract or decision changes: none.
Judgment calls, for review:
  - SEFGH_API_ADDR wins over PORT, so an explicit setting is never overridden
    by a platform default, and the local scripts that set it are unaffected.
  - A bad PORT is an error, not a fall back to 8787. A quiet fall back would
    look like a deployment that hangs.
  - PORT means every network interface (":3000"). That is what a platform
    needs. It also applies on a developer's machine if PORT happens to be set
    in the shell that starts the server.
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
  - npm run test:contracts: 317 passed, 0 failed.
  - backend: go test -count=1 ./... passes all six packages; go vet clean;
    gofmt -l empty.
  - learn-go: go test -count=1 -tags solution ./... passes all 16 packages;
    go vet clean with and without the solution tag; gofmt -l empty. Lesson 15
    as shipped fails its four tests without panicking, as intended.
  - 9 deliberate breaks of listenAddr in a scratch copy: 9 caught.
  - The built server with PORT=abc and no SEFGH_API_ADDR: logs "PORT must be
    a number from 1 to 65535" and exits with status 1.
  - Forwarding probe against the new build, with a bad PORT in the
    environment and SEFGH_API_ADDR set by the probe: 46 of 46, exit 0.
  - npx eslint scripts/contracts: clean.
  - npm run handoff: run once after this record was saved, covering
    VERIFY-001 as well. Claude Code reports its outcome to the owner; a
    failure would be recorded here by a further edit.
Not verified:
  - The built server actually listening on a PORT. That binds every network
    interface, which makes Windows show a firewall prompt on the owner's
    screen, so it was left to the unit test and the standard library.
  - That this is all Vercel's Go runtime needs. Only a deployment shows that.
  - go test -race, as before.
Remaining Phase 1 gates: unchanged from the VERIFY-001 record below. All of
  them now need the owner, a deployment, or Codex.
Next bounded action: owner decisions (private-repository access, CI-001,
  hosting option). Meanwhile Phase 2 can continue with GO-006a.
Writer released: yes
```

## Handoff: VERIFY-001 (Claude Code, 2026-10-12)

```text
Task / scope: VERIFY-001, the two Phase 1 verification gates that could be
  attempted on this machine: how the Next.js rewrite forwards awkward URLs to
  Go, and the race detector. Plus a hosting proposal for the owner, in the ADR.
Owner / reviewer: Claude Code / Codex (peer review NOT run).
Status: forwarding check complete for `next dev`. Race detector NOT run.
  Nothing deployed. No route switched on.
Base commit / branch / worktree: 3f4c7dd / main / main checkout. Started while
  FIX-004 was still uncommitted, so both tasks' files are in the working tree.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `7303b61`).
Changed files:
  scripts/contracts/go-forwarding-probe.mjs: new. Optional; it starts servers,
    so it is not part of npm run test:contracts.
  contracts/github-repositories/README.md: how to run it.
  docs/{coordination.md,claude-review.md,adr/0002-go-backend.md}.
  No handler, fixture, Go or lesson change.
Contract or decision changes: none. The ADR gains a gate table for Phase 1 and
  a hosting proposal; the proposal is not a decision.
What the probe does: starts a stand-in GitHub, the compiled Go server, and
  `next dev` with all six routes forwarded to Go. It sends 46 paths as raw
  HTTP, each once through Next.js and once straight to Go, and compares the
  status, the body, the X-Sefgh-Backend marker and the requests the stand-in
  GitHub received. The paths include %2F, %20, %23, %3F and %25 inside a path
  segment, repeated and reordered parameters, "+", ";", a lone "%", "%zz",
  bytes that are not valid UTF-8, and a percent-encoded parameter name.
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2,
    Next 16.1.1, a Go build of the current working tree):
  - Probe: identical 46 of 46, exit 0. Every reply carried X-Sefgh-Backend: go.
  - The listing (PROBE_SHOW=1) was read by eye. Examples of what reached the
    stand-in GitHub through Next.js: path=src%2Fmain.go -> contents/src/main.go;
    path=docs/C%23/readme.md -> contents/docs/C%23/readme.md;
    path=%252e%252e%2Fprivate -> contents/%252e%252e/private; q=a%FF%FFb ->
    q=a%EF%BF%BD%EF%BF%BDb; q=first&q=second -> q=first; %71=react -> q=react.
    An owner of a%2Fb answered 400 with no upstream call.
  - Two faults in the probe itself were found and fixed before this handoff:
    1. An inserted line split an if from its else, so every path was listed as
       DIFFERENT while the count said 46 of 46. The count was right.
    2. The stand-in GitHub answered every repository with the same body, so on
       the cached summary route a changed owner or name compared as identical.
       It now repeats the requested path in full_name.
  - The probe was then tested against planted differences, in scratch copies:
    a different search term on one path -> 45 of 46, that path named, exit 1;
    a different repository name on one summary path -> missed by the probe as
    it was before fix 2 (46 of 46, exit 0), caught after it (45 of 46, exit 1).
  - npx eslint scripts/contracts: clean.
  - npm run handoff: see the last line of this record.
Not done, and why:
  - go test -race. It needs cgo and a C compiler. This machine has neither gcc
    nor clang, Docker Desktop was not running, and the only WSL distributions
    are Docker's own. A 108 MB portable compiler download ran at about 30 KB/s
    and was stopped at 29 MB; the partial file is outside the repository.
    The practical route is CI-001 on Linux, which needs the owner's approval.
  - The same forwarding check on Vercel. A deployment forwards through
    Vercel's routing layer, not through `next dev`. Run the probe's path list
    against a preview deployment before any route is switched on there.
  - `next start` with the switch on. Rewrites are fixed when Next.js is built,
    so this needs a production build with the switch set; not attempted.
Phase 1, where it stands:
  Closed in code: REVIEW-002 findings 1 to 10 (FIX-003, GO-003, FIX-004).
  Checked locally: fixture parity for all four routes; switch and rollback;
    forwarding through `next dev`.
  Open, needs the owner:
    - Who may see private repositories. Finding 11 depends on it.
    - Approval for CI-001, which is how the race detector gets run.
    - A hosting choice. Proposal in adr/0002-go-backend.md.
  Open, needs a deployment: forwarding on Vercel, staging measurements,
    rollback under real traffic, production cache behaviour.
  Open, needs Codex: peer review of GO-005a, GO-005b, FIX-003, FIX-004 and
    this task.
Next bounded action: none of the remaining Phase 1 gates can be closed without
  the owner. Phase 2 can continue meanwhile with GO-006a (github/trending).
Writer released: yes
npm run handoff: not run separately. Claude Code went straight on to OPS-001a
  in the same working tree and ran it once for both; see that record.
```

## Handoff: FIX-004 (Claude Code, 2026-10-12)

```text
Task / scope: FIX-004, REVIEW-002 findings 7 (text that is not valid UTF-8 was
  decoded differently from JavaScript) and 8 (no overall deadline on the
  detail route), in Go.
Owner / reviewer: Claude Code / Codex (peer review NOT run).
Status: implementation complete; review pending; not deployed.
History: paused on the owner's instruction part-way through and resumed the
  same day from a checkpoint in this file. Nothing was committed in between.
Base commit / branch / worktree: 3f4c7dd / main / main checkout.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `6dd37cc`).
Changed files:
  backend/internal/jscompat/{utf8.go,utf8_test.go}: new. DecodeUTF8 is a
    step-for-step port of the WHATWG UTF-8 decoder.
  backend/internal/jscompat/jscompat.go: ParseQuery decodes with it.
  backend/internal/githubrepos/handler.go: README decoded with DecodeUTF8;
    DetailTimeout (25 s) is one deadline for the detail route's three calls.
  backend/internal/githubrepos/deadline_test.go: new.
  backend/internal/githubrepos/{contract_test.go,http_test.go} and
    scripts/contracts/github-repositories.test.mjs: accept raw_body_base64.
  backend/cmd/api/{main.go,main_test.go}: the 30 s write timeout is a named
    constant, and a test requires DetailTimeout to be below it.
  contracts/github-repositories/cases.json: +4 README cases, 124 total, v3.
  contracts/github-search/cases.json: +2 query cases, 89 total, v2.
  contracts/*/README.md, backend/README.md, learn-go/03-strings-and-bytes/README.md,
    learn-go/07-calling-github/README.md,
    docs/{coordination.md,backend-map.md,claude-review.md,adr/0002-go-backend.md}.
  No exercise.go changed. No Next.js handler changed.
Contract or decision changes: none. The six new cases record what the Next.js
  handlers already did; Go changed to match them. No version was raised.
  One recorded difference is removed from the ADR: query bytes that are not
  valid UTF-8 now decode identically in both backends.
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
  - npm run test:contracts: 317 passed, 0 failed.
  - backend: go test -count=1 ./... passes all six packages; go vet clean;
    gofmt -l empty (the formatting failure recorded at the pause is fixed).
  - DecodeUTF8 against JavaScript's TextDecoder on 200,000 random byte strings,
    173,581 of them not valid UTF-8, in a scratch copy: 0 differ. The
    strings.ToValidUTF8 call it replaces differed on 127,952.
  - 17 deliberate breaks of the decoder, the deadline and their wiring, in a
    scratch copy: 16 caught at first. The miss (overlong four-byte forms) led
    to three more values in the decoder's table, after which it was caught.
    A test for a hang on the second of the three detail calls was also added.
  - npx eslint scripts/contracts: clean.
  - learn-go: checked by npm run handoff; only two README files changed there.
Unverified: go test -race (no C compiler here; this task adds no shared
  state); a real slow GitHub; a production deployment.
REVIEW-002 findings now: 1 fixed (FIX-003); 2, 3, 4, 5, 6, 10 fixed (GO-003);
  7 and 8 fixed here; 9 addressed (GO-003). Finding 11, no token on detail and
  contents, is an owner decision tied to the private-repository question.
Remaining Phase 1 gates:
  - OWNER: who may see private repositories.
  - go test -race on a machine with a C compiler.
  - How the Next.js rewrite forwards percent-encoded path segments.
  - Hosting the Go service on Vercel's free tier; staging measurements;
    rollback under real traffic; production cache behaviour.
  - Codex peer review of GO-005a, GO-005b, FIX-003 and FIX-004.
Next bounded action: VERIFY-001, the two verification gates that can be
  attempted locally (race detector, rewrite forwarding). Then a hosting
  proposal for the owner.
Writer released: yes
```

## Handoff: FIX-003 (Claude Code, 2026-10-12)

```text
Task / scope: FIX-003, input validation for the three repository routes
  (REVIEW-002 finding 1), in Next.js and Go together, contract version 3.
Owner / reviewer: Claude Code / Codex (peer review NOT run).
Status: implementation complete; review pending; not deployed.
Base commit / branch / worktree: 80cee17 / main / main checkout, clean at start.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `03149a4`).
Owner decisions this rests on, relayed by the owner on 2026-10-12 and now in
  the ADR decisions log: input validation approved; the server token is NOT to
  be limited to public data, and who may see private repositories is
  undecided; hosting is Vercel and Supabase; free tier only.
Changed files:
  src/lib/github/repo-identifiers.js: new, the shared rules for Next.js.
  src/app/api/github/repo/route.js, repo/[owner]/[repo]/route.js,
    contents/[owner]/[repo]/route.js: validate before building a URL.
  backend/internal/githubrepos/{identifiers.go,identifiers_test.go}: new.
  backend/internal/githubrepos/{handler.go,http_test.go}: validate; one cache
    test used names that are now invalid and was given valid ones.
  contracts/github-repositories/{cases.json,README.md}: version 3, 120 cases.
  scripts/contracts/route-loader.mjs: resolves any "@/" import, not one file.
  learn-go/14-checking-input/*, learn-go/09-path-parameters/README.md,
    learn-go/README.md: new lesson, one corrected passage, index row.
  backend/README.md, docs/{coordination.md,backend-map.md,adr/0002-go-backend.md}.
  No existing exercise.go changed.
Contract change: github-repositories version 2 -> 3. 22 existing cases changed,
  37 added, 61 untouched, 18 still marked defect (upstream status collapsing
  and unchecked reply shapes; none about URL input).
Judgment calls inside the approved change, for the reviewer:
  - Owner pattern ^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$ is deliberately looser than
    GitHub's own rule: it admits underscores (managed-user accounts) and
    repeated or trailing hyphens (old accounts). It is a safety rule.
  - Contents paths are ENCODED part by part, not restricted to a character
    set, so a folder named "C#" works. This goes beyond "reject invalid
    input": names containing #, ? or % now reach the right file.
  - A trailing slash and an empty part are rejected. Before, "src/" was sent on.
  - Backslash stays rejected, as before. Control characters are now rejected.
  - Wire bytes change for some valid names: ";" is sent as %3B, "|" as %7C.
    GitHub decodes both to the same name.
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
  - Before touching fixtures: the new handlers failed exactly 22 of the old
    cases, all about URL input, and no others.
  - Re-recording printed every changed case, each reviewed by hand. A guard
    in the recorder refuses any change outside a reviewed list.
  - npm run test:contracts: 311 passed, 0 failed.
  - backend: go test -count=1 ./... passes all six packages (240 repository
    contract subtests); go vet clean; gofmt -l empty.
  - New Go test: 11 hostile requests, with a server token set, produce 400 and
    zero requests to GitHub.
  - Deliberate weakenings of the validation: JavaScript 17 of 17 caught by the
    contract tests; Go 14 of 14 valid ones caught (2 more did not compile).
  - learn-go: all 15 solution packages pass; go vet clean in both modes;
    gofmt -l empty; lesson 14's exercise fails without panic.
  - npx eslint on the changed handlers, the new module, the runners and
    next.config.mjs: clean.
  - npm run build with the switch variables unset: passed, exit 0. The three
    handlers import the shared module through the @/ alias, so this is the
    check that the alias resolves in a real build.
Unverified: live GitHub; the Next.js rewrite with these inputs; a production
  deployment. The race detector has still not run.
Remaining Phase 1 gates after this task:
  - OWNER: who may see private repositories. Until decided, summary and search
    return whatever the server token can read to any caller. This affects the
    Next.js routes in production today, not only the Go ports.
  - REVIEW-002 findings 7 (non-UTF-8 README) and 8 (one deadline for detail).
  - Race-detector run; rewrite check for percent-encoded path segments.
  - Hosting the Go service on the free tier; staging measurements; rollback
    under real traffic; production cache behaviour.
Next bounded action: FIX-004, findings 7 and 8 in Go. Then the two
  verification gates. Then a hosting proposal for the owner.
Writer released: yes
```

## Handoff: GO-005b (Claude Code, 2026-10-12)

```text
Task / scope: GO-005b, Go port of GET /api/github/contributions against the
  GO-005a fixtures, with lesson 13. Routing off. The owner confirmed on
  2026-10-12 that the route should be ported although nothing calls it.
Owner / reviewer: Claude Code / Codex (peer review NOT run).
Status: implementation complete; review pending; not deployed.
Base commit / branch / worktree: cd6ad67 / main / main checkout, clean at start.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `268d5b0`).
Changed files:
  backend/internal/githubcontributions/{handler.go,dates.go,query.go,
    contract_test.go,dates_test.go,limits_test.go}: new package.
  backend/cmd/api/main.go: registers GET /api/github/contributions.
  next.config.mjs, scripts/contracts/go-rewrites.test.mjs: opt-in route name
    github-contributions.
  backend/README.md, contracts/github-contributions/README.md.
  learn-go/13-time-and-clocks/{README.md,lesson.go,exercise.go,
    exercise_test.go,solution.go}, learn-go/README.md: new lesson and index row.
  docs/{coordination.md,backend-map.md,adr/0002-go-backend.md}.
  Not changed: the fixtures, the Next.js handler, any existing exercise.go.
Contract or decision changes: none. Contract stays at version 1. All 18
  defect cases are reproduced as recorded, not fixed. Standard library only.
Design notes for the reviewer:
  - The clock and the time zone are fields on Handler (Now, Location). Nil
    means time.Now and the machine's zone, matching the Next.js handler.
  - dates.go has its own wallClock helper in place of time.Date / AddDate,
    because Go leaves a skipped or repeated clock time unspecified and
    JavaScript does not. A first version returned its result in UTC and failed
    every non-UTC case; the fixtures and the Node-derived table caught it.
  - toFixed1 rounds with math/big on the exact float64, because
    strconv.FormatFloat sends an exact tie to the even digit (0.25 -> 0.2).
  - query.go was generated from the fixture's recorded text and is checked
    against it by TestQueryMatchesTheContract.
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
  - backend: go test -count=1 ./... passes all six packages; go vet clean;
    gofmt -l empty. The new package runs the 95 cases in memory and over
    sockets (190 subtests) plus unit and limit tests.
  - npm run test:contracts: 274 passed, 0 failed.
  - Large comparison with JavaScript in a scratch copy: 24,000 random instants
    across 12 time zones, 0 date ranges differ; 200,000 random divisions,
    0 rounded values differ.
  - Deliberate breaks in a scratch copy: 31 valid, 29 caught at first. The two
    misses led to changes: a redundant truncation was removed, and the
    body-limit test was rewritten so that it fails when the limit is removed.
    Five further breaks of logging and limits were then all caught.
  - One new test hung on its first run: a fake GitHub waited for a hang-up
    that Go's server cannot see while a POST body is unread. Fixed in the test.
  - Compiled server against a local stand-in for GitHub's GraphQL endpoint,
    dummy token: 200 with the expected grid and statistics; the stand-in
    received POST /graphql with the bearer token, JSON content type and the
    three variables; an invalid name answered 400 with no upstream call; POST
    answered 405. Marker and security headers present.
  - learn-go: go test -tags solution ./... passes all 14 packages; go vet clean
    in both modes; gofmt -l empty; lesson 13's exercise fails without panic.
  - npx eslint next.config.mjs scripts/contracts: clean.
  - npm run build with the switch variables unset: passed, exit 0.
Unverified:
  - Live GitHub GraphQL. It needs a real token and none was used, so the
    reply shapes for an unknown user and for errors rest on documentation.
  - The Next.js rewrite for this route in dev or a production build. Only the
    rewrite configuration is unit-tested.
  - The race detector (no C compiler here). The handler holds no shared state.
Recorded differences from the Next.js handler, outside the fixtures (also in
  ADR-0002): a 10-second timeout; a 16 MiB reply limit; a count or total that
  is not a JSON number is passed through without JavaScript's coercion; a
  status that cannot carry a body answers 500.
Remaining gates: Codex peer review of GO-005a and GO-005b. Owner decisions on
  the seven groups of defect cases. All earlier cutover gates.
Next bounded action: GO-006a, characterize GET /api/github/trending as
  fixtures. It calls GitHub search and adds a random starsToday value, so the
  runner must fix the random source as this one fixes the clock.
Writer released: yes
```

## Handoff: GO-005a (Claude Code, 2026-10-12)

```text
Task / scope: GO-005a, characterize GET /api/github/contributions as contract
  fixtures, before any Go port. Second Phase 2 route.
Owner / reviewer: Claude Code / Codex (peer review NOT run).
Status: implementation complete; review pending; not deployed. No Go code.
Base commit / branch / worktree: 73429e1 / main / main checkout, clean at start.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `1bf8e71`).
Changed files:
  contracts/github-contributions/{cases.json,README.md}: 95 cases, version 1.
  scripts/contracts/github-contributions.test.mjs: Node runner.
  docs/{coordination.md,backend-map.md,adr/0002-go-backend.md}: state and findings.
  No handler, Go, routing, lesson or exercise file changed. No lesson is owed:
  the tutorial rule applies to Go changes in backend/, and there are none.
Contract or decision changes: none. New contract at version 1; the Next.js
  handler is unchanged. 18 cases are marked defect and await owner decisions.
How the fixtures were made: a one-off recorder ran the unchanged handler with
  a fixed clock, fixed time zone and stubbed GitHub replies, and wrote the file.
  The committed runner replays the file and never regenerates expectations.
  Date ranges for the leap-day, India, and three daylight-saving cases, and the
  statistics for the week, streak and rounding cases, were then checked by hand.
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
  - node --test scripts/contracts/github-contributions.test.mjs: 96 pass
    (95 cases plus a well-formedness check).
  - npm run test:contracts: 274 passed, 0 failed.
  - Ten deliberate breaks of the handler, one at a time, each then restored and
    the file confirmed identical to HEAD: all 10 caught (364-day window, Sunday
    not moved to Monday, weekday in UTC, status not passed through, streak not
    sorted, two-decimal average, 40-character name, errors ignored, zero days
    counted active, extra upstream header).
  - npx eslint on the new runner: clean.
  - backend Go tests, vet, gofmt and learn-go solutions: run by npm run handoff
    at release; nothing in them changed.
Findings recorded (details in contracts/github-contributions/README.md):
  - No page or component in this checkout calls the route.
  - Its date range depends on the server's time zone and daylight saving.
  - It passes GitHub's status through, so a bad server token answers 401.
  - A real unknown user answers 400, not the 404 the handler intends. This
    follows GitHub's documented reply shape and was NOT observed live.
  - It is public, spends the server token's GraphQL allowance, and has no
    rate limit or cache.
Unverified: live GitHub GraphQL behaviour (needs a token; none was used);
  non-number counts and totals; undated days; methods other than GET.
Remaining gates: Codex peer review of GO-005a. Owner decisions below before a
  port changes any behaviour. All earlier cutover gates remain.
Next bounded action: GO-005b, port to Go against these fixtures with a lesson,
  routing off. Start only after the owner confirms the route is still wanted,
  since nothing calls it. If it is, port the 18 defect cases as recorded; do
  not fix them without an owner-approved contract change in both
  implementations. The contract README ends with notes for the port.
Writer released: yes
```

## Handoff: REVIEW-003 (Claude Code, 2026-10-12)

```text
Task / scope: REVIEW-003, peer review of GO-003 (cd8906c against 1e5d87f) and
  GO-004 (b0ef691 against cd8906c), including lessons 10, 11 and 12.
Owner / reviewer: Claude Code reviewed Codex's work. This record is unreviewed.
Status: review complete for both tasks. Not deployed.
Base commit / branch / worktree: b0ef691 / main / main checkout, clean at start.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `64c9bc0`).
Changed files: docs/claude-review.md (review section added) and this file. Nothing else.
Contract or decision changes: none.
Verdicts: GO-003 accepted. GO-004 accepted with routing off. No route is
  approved to switch on; every earlier cutover gate remains.
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
  - REVIEW-002 experiments repeated on the GO-003 code in a scratch copy:
    712 generated URLs against Node, 0 mismatches (was 72); 20 concurrent
    callers on one 404 key, 1 upstream call and 50 ms (was 20 calls, 1.0 s);
    panic in the loader releases the key; a cancelled fetching caller does not
    pass its cancellation to waiters; failures are logged without token or URL.
  - 28 deliberate breaks of handler.go, cache.go and fetchurl.go: 25 caught,
    3 not (listed in claude-review.md). All 11 missed in REVIEW-002 are caught.
  - Compiled server against live GitHub, no token, six requests: summary 200,
    repeat served from cache, renamed-repository redirect followed, contents 200.
  - GO-004: three catalog copies identical (565 names); 5 of 5 breaks caught.
  - learn-go lessons 11 and 12: exercises fail without panic or hang; go vet
    clean in both modes; gofmt -l empty.
  - npm run handoff: run at release; see .agent-signal.json for its result.
Unverified: race detector (no C compiler here); the Next.js rewrite for the
  languages route and for percent-encoded path segments; staging measurements.
Remaining gates before any route is switched on: REVIEW-002 findings 1, 7, 8
  and 11; the unverified items above; hosting and measurements.
Next bounded action: Claude Code continues with GO-005a as Codex's GO-004
  handoff specifies: characterize GET /api/github/contributions with
  deterministic GraphQL stubs before any Go port.
Writer released: yes
```

## Handoff: GO-004 (Codex, 2026-10-12)

```text
Task / scope: GO-004, first Phase 2 slice: GET /api/github/languages.
Owner / reviewer: Codex / independent reviewer pending; no agent was contacted.
Status: implementation complete, review pending, not deployed.
Base / branch / worktree: cd8906c / main / main checkout; clean at start.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `7625677`).
Changed files:
  contracts/github-languages/{cases.json,response.json,README.md}
  scripts/contracts/{github-languages.test.mjs,route-loader.mjs,go-rewrites.test.mjs}
  backend/internal/githublanguages/{handler.go,catalog.json,contract_test.go}
  backend/cmd/api/main.go, backend/README.md, next.config.mjs
  learn-go/12-embedded-data/{README.md,lesson.go,sample.json,exercise.go,
    exercise_test.go,solution.go}, learn-go/README.md
  docs/{coordination.md,backend-map.md,adr/0002-go-backend.md}
Behavior / decisions:
  - Captured version-1 fixtures against the unchanged Next.js handler BEFORE
    porting. Pins all 565 language strings in order, JSON array shape, status
    and headers; query parameters ignored, no upstream HTTP call.
  - Go embeds a separate production JSON artifact as an immutable string.
    Both implementations must match the independent approved snapshot.
  - Added github-languages opt-in rewrite; no route enabled by default.
  - Lesson 12 teaches go:embed and serving JSON text. Its exercise is unfinished;
    no existing owner exercise changed. Standard library only.
Actual checks (Codex):
  - Initial Node language characterization: 4 checks passed before Go code.
  - npm run test:contracts: 178 passed, 0 failed (173 cases plus integrity and
    rewrite checks). Existing search/repository contracts remain unchanged.
  - backend: go test -count=1 ./... passed all five packages; new fixture cases
    pass in memory and over local sockets.
  - Compiled api.exe smoke from an unrelated temporary working directory:
    catalog response, marker/security headers, HEAD, POST 405 all passed.
    The harness stopped only the Go server it started; no live GitHub call.
  - learn-go: all 13 solution packages pass; both vet modes clean; formatting
    clean. Default exercise tests were not run.
  - npm run build with SEFGH_GO_ROUTES and SEFGH_GO_API_URL empty: passed.
    Only existing browser-data/punycode warnings; no production deployment.
  - Targeted ESLint on next.config.mjs and the three changed contract scripts:
    passed. Full-project lint was not rerun; GO-003 recorded the baseline
    10 errors and 16 warnings in unchanged UI files.
  - Markdown link checks, git diff --check and existing-exercise preservation
    checks passed.
Release validation: npm run handoff is run after release; inspect its emitted
  .agent-signal.json for result. This text does not claim a Git commit or push.
Remaining gates:
  - GO-003 and GO-004 independent peer review. No self-review is labeled peer review.
  - Earlier Phase 1 URL-input/token-policy, race-detector, encoded-segment rewrite,
    production cache, hosting, measurement and rollback gates remain open.
  - New route opt-in config behavior is unit-tested, but an actual Next-to-Go
    language rewrite has not been exercised in staging. No traffic moved.
  - AI policy and user-data schema/RLS gates remain; FIX-002 stays owner-reserved.
Next bounded implementation: GO-005a, characterize GET /api/github/contributions
  with deterministic GraphQL stubs and fixtures before its Go port (GO-005b).
  Read the current source/callers, claim writer, preserve existing behavior,
  and record defects for owner decisions. No live credentials are needed.
Next review: Claude reviews GO-003 (cd8906c versus 1e5d87f) and GO-004 separately.
Writer released: yes.
```

## Owner instruction: low-capacity checkpoints

The owner requires every agent to stop implementation at approximately 3–5%
remaining visible capacity and leave a pickup record. See `../AGENTS.md`,
"Low-capacity checkpoint (owner requirement)". Account usage is not visible to
Codex in this session; no percentage is asserted. Incomplete work must be marked
paused, the writer released, and the next concrete action recorded. Do not emit
the normal completion signal for an incomplete task.

## Handoff: GO-003 (Codex, 2026-10-12)

```text
Task / scope: GO-003, REVIEW-002 findings 2–6 and 10, lesson clarification
  (finding 9), and the owner's low-capacity checkpoint rule.
Owner / reviewer: Codex / Claude Code intended, peer review NOT run.
Status: implementation complete; review pending; not deployed.
Base / branch / worktree: 1e5d87f / main / main checkout.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `7881116`).
Changed files:
  AGENTS.md: owner-required low-capacity checkpoint rule, shared via CLAUDE.md.
  backend/internal/githubrepos/{cache.go,cache_test.go,cache_regression_test.go,
    handler.go,limits_test.go}: shared flights, cancellation/panic recovery,
    structured failure logs and targeted tests.
  backend/internal/jscompat/{fetchurl.go,fetchurl_test.go}: preserve wire paths.
  backend/cmd/api/main.go: wire the repository logger to the server logger.
  backend/README.md: operational behavior and tests.
  contracts/github-repositories/{cases.json,README.md}: five additive cases.
  scripts/contracts/github-repositories.test.mjs: Node wire_url assertion.
  learn-go/{README.md,09-path-parameters/README.md,10-shared-cache/README.md}:
    updated explanations and lesson index.
  learn-go/11-shared-results/{README.md,lesson.go,exercise.go,exercise_test.go,
    solution.go}: new unfinished owner exercise and separate tested solution.
  docs/{coordination.md,backend-map.md,claude-review.md,adr/0002-go-backend.md}:
    current implementation, review responses and remaining gates.
Contract / decision changes: no response contract changes; version remains 2.
  Standard library only. No routing switches changed. No existing exercise.go
  changed. Owner instructed all agents to checkpoint at 3–5% visible capacity;
  account quota is not visible to Codex and no percentage is asserted.
Checks and outcomes (Codex):
  - Before fixing: the new shared-failure test reproduced 20 upstream calls
    instead of one for 201/404/429/500/network errors. Expected red test.
  - npm run test:contracts: 174 passed, 0 failed (87 search cases,
    83 repository cases plus integrity/rewrite checks).
  - backend: go test -count=1 ./... passed all four packages; go vet ./...
    clean; gofmt -l . empty. Repository contracts run in memory and over sockets.
  - Cache tests: go test -count=20 ./internal/githubrepos -run TestCache passed.
  - Twelve deliberate mutations in a scratch copy outside the checkout:
    all 12 caught by test assertions; see claude-review.md for categories.
  - learn-go: go test -tags solution ./... passed all 12 packages (00–11);
    go vet ./... and go vet -tags solution ./... clean; gofmt -l . empty.
    Default exercise suite was not run and owner exercises remain unfinished.
  - npm run lint: existing 26 problems (10 errors, 16 warnings), all in
    unchanged UI files. No new lint findings in the modified runner.
  - git diff --check and local Markdown link checks passed; existing owner
    exercise files verified unchanged.
  - go test -race ./internal/githubrepos ./internal/jscompat: could not run;
    Go reported that -race requires cgo. No gcc/clang found on PATH.
Release verification: npm run handoff runs immediately after writer release.
  Its result is in .agent-signal.json; this record alone does not assert that
  the release script has passed or that Git Agent has committed/pushed.
Remaining gates / unverified work:
  - Claude peer review of GO-003. REVIEW-002 remains Claude's earlier work.
  - Finding 1: owner-approved validation contract in BOTH implementations,
    and verification that the server token is limited to public data.
  - Race detector with a supported C compiler; encoded-segment Next rewrite
    checks; production cache/hosting choice; staging measurements and rollback.
  - Findings 7 (malformed UTF-8), 8 (whole-handler deadline), and 11 (upstream
    identity policy) remain open; FIX-002 remains the owner's exercise.
  - No production build, live GitHub/Supabase audit or deployment performed.
Next bounded action: Claude reads git diff from this base and reviews GO-003
  against findings 2–6/10; include lesson 11. Then resolve remaining Phase 1
  gates before switching routes on. No live reviewer was contacted in this task.
Writer released: yes.
```

## Handoff: REVIEW-002 (Claude Code, 2026-10-12)

```text
Task / scope: REVIEW-002, peer review of GO-002a and GO-002b (commit 6e0753d):
  contracts/github-repositories/, backend/internal/githubrepos/,
  backend/internal/jscompat/fetchurl.go, their tests, and lessons 09 and 10.
Owner / reviewer: Claude Code reviewed Codex's work. This record is itself unreviewed.
Status: review complete. Implementation was already complete. Not deployed.
Base commit / branch / worktree: 43513d4 / main / main checkout
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `e223449`).
Changed files: docs/claude-review.md (review section added) and this file. Nothing else.
Contract or decision changes: none.
Verdict: acceptable as merged with routing off. NOT ready to switch any of the
  three repository routes on. Eleven findings are in claude-review.md under
  "GO-002 peer review by Claude Code".
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
  - All 97 fixture wire_url values recomputed with Node's URL parser: all match.
  - jscompat.FetchURL against Node on 712 generated URLs: 640 identical;
    72 differ, every one containing "|" or "^".
  - 27 deliberate code breaks in a scratch copy: 16 caught by tests, 11 not.
  - Cache, 20 concurrent callers, one 404 key, 50 ms upstream: 20 upstream calls
    one at a time; slowest caller waited 1.0 s.
  - Panic inside the cache loader: key stays pending; next caller times out.
  - Non-UTF-8 README bytes: JavaScript 2, 3, 1 replacement characters for three
    samples; Go 1, 1, 1.
  - learn-go lessons 09 and 10: solutions pass, exercises fail without panic,
    go vet clean.
  - Experiments ran in a copy outside the repository; git status showed only
    this file modified before the review section was written.
  - npm run handoff: run at release; see .agent-signal.json for its result.
Remaining gates before any repository route is switched on:
  - Findings 1 to 5 resolved (finding 1 needs an owner decision and a contract
    change in both implementations).
  - go test -race run on a machine with a C compiler.
  - Forwarding of percent-encoded path segments through the Next.js rewrite checked.
  - Codex's existing gates: production cache behaviour chosen and verified,
    outbound request measurements, peer review of any fixes.
Not reviewed: SYNC-001's documentation diff as a separate item, and CI-000
  beyond the handoff script's release check.
Next bounded action: Codex takes GO-003: fix findings 2 to 6 in Go, add the
  missing cache tests and "|" / "^" fixture cases, and add the wire_url
  assertion to the Node runner. No contract change is needed for those.
Writer released: yes
```

## What was done while Codex was away

All by Claude Code, at the owner's direction, on 2026-10-11 and 2026-10-12. Run `git log --oneline main..go-backend` for the commits.

| Task | What it did | Where to look |
|---|---|---|
| `RUST-001a` | Recorded the behaviour of `GET /api/github/search` as contract fixtures, with a runner for the Next.js handler. Recorded the lint and build baseline. The task name is historical | `contracts/github-search/`, `scripts/contracts/` |
| `FIX-001` | The owner approved fixing all 13 defects the fixtures had recorded. Fixed in the Next.js handler; fixtures moved to contract version 2 in the same commit | `src/app/api/github/search/route.js`, and the Versions table in `contracts/github-search/README.md` |
| `GO-001` | Go module in `backend/`, standard library only. Search handler, a JavaScript-compatibility package, the server, and an opt-in rewrite in `next.config.mjs` | `backend/README.md` |
| `LEARN-001` | A Go tutorial for the owner, nine lessons built on the real backend code | `learn-go/README.md` |
| `GO-000` | Plans switched from Rust to Go: new ADR, old one marked superseded, shared instructions and this file rewritten | `adr/0002-go-backend.md`, `../AGENTS.md` |

## Codex synchronization log — 2026-10-12

The owner supplied Claude's updated coordination handoff and asked Codex to read the changed plan and keep both agents synchronized after building. Codex read the attachment, AGENTS.md, CLAUDE.md, this file, backend-map.md, ADR-0002, the superseded notice in ADR-0001, claude-review.md, backend/README.md and learn-go/README.md. The accepted Go plan supersedes the earlier chat's proposed Rust scope and its historical "no implementation yet" status. The current checkout, not that old chat, is the source of truth.

```text
Task / scope: SYNC-001 — shared-plan readback, completion logging rules,
  documentation corrections, and verification of existing local test suites.
Owner / reviewer: Codex / Claude Code (this documentation diff not peer-reviewed)
Status: complete (synchronization only; implementation peer review remains pending)
Base commit / branch / worktree: 2b4f880 / go-backend / main checkout
Allowed files / interfaces: AGENTS.md, docs/coordination.md,
  docs/claude-review.md, docs/backend-map.md, docs/adr/0002-go-backend.md
Changes made:
  - Added an explicit end-of-task handoff requirement for either agent.
  - Recorded Go acceptance, existing implementation, and pending review separately.
  - Corrected unmeasured performance/merge-readiness claims and HEAD wording.
  - Distinguished the original source audit from Claude's later runtime checks.
Contract or decision changes: none. No application or exercise files changed.
Checks run and exact outcome (Codex, 2026-10-12):
  - Initial git status --short: empty; current branch go-backend, HEAD 2b4f880.
  - npm run test:contracts: exit 0; 88 passed, 0 failed.
  - Go version: go1.27.2 windows/amd64.
  - backend: go test ./... passes (githubsearch and jscompat cached);
    go vet ./... has no diagnostics; gofmt -l . prints nothing.
  - learn-go: go test -tags solution ./... passes all nine lesson packages;
    go vet ./... and go vet -tags solution ./... have no diagnostics;
    gofmt -l . prints nothing. Owner exercises were not edited or completed.
  - Documentation diff and local Markdown link checks: passed.
Unverified dependencies / blockers:
  - No full implementation/lesson peer review in this task. Passing existing
    tests is not proof of missing-case coverage or completion of the six review requests.
  - Build, lint, live GitHub, rewrite runtime and rollback checks were not rerun;
    the earlier results remain attributed to Claude, including baseline lint failure.
  - Remote branch/PR/deployment state was not refreshed. No deployment or cutover.
  - Hosting, staging measurements, database definitions and Python lineage remain open.
Next bounded action: Codex performs the six implementation review requests below,
  records findings, then GO-002a captures the three repository/contents contracts.
  GO-002b follows the fixtures and includes corresponding lessons.
Writer released: yes. Five documentation files changed locally; no commit or push.
```

Both agents must update this log at task completion using the handoff format. Reading this file is the synchronization step; no live Claude session was contacted or claimed to have acknowledged this update.

## Handoff: GO-002a and GO-002b (Codex -> Claude Code)

```text
Task / scope: GO-002a / GO-002b — contract fixtures for repository routes (summary, detail, contents), Go port with in-memory caching and path parameters, and owner tutorial lessons 09 & 10.
Owner / reviewer: Codex / Claude Code (peer review pending)
Status: review
Base commit / branch / worktree: 2b4f880 / go-backend / main checkout
Allowed files / interfaces: contracts/github-repositories/, scripts/contracts/, backend/, next.config.mjs, src/app/api/github/repo/route.js, learn-go/, shared docs
Changes made:
  - Added 78 contract fixtures in contracts/github-repositories/ covering summary, detail, and contents routes.
  - Implemented Go handlers in backend/internal/githubrepos/ with path parameter matching and bounded in-memory LRU cache (256 entries / 64 MiB).
  - Added backend/internal/jscompat/fetchurl.go for normalized wire URL handling.
  - Registered routes in backend/cmd/api/main.go and opt-in rewrites in next.config.mjs.
  - Normalized Next.js summary error text to 500 "Failed to fetch repository" for internal/transport failures.
  - Created lessons 09 (path parameters) and 10 (shared cache) in learn-go/.
Checks run and exact outcome (Windows, Go 1.27.2, Node 21.7.1):
  - npm run test:contracts: exit 0; 168 passed (88 search + 78 repository/contents + 2 rewrites), 0 failed.
  - backend: go test -count=1 ./... passes; go vet ./... clean; gofmt -l . clean.
  - learn-go: go test -tags solution ./... passes (all 11 packages 00-10); go vet -tags solution ./... clean; gofmt -l . clean.
  - npm run lint: baseline 26 problems (10 errors, 16 warnings), 0 in modified files.
Unverified dependencies / blockers:
  - Peer review by Claude Code pending.
  - Routing remains off by default; no production deployment or cutover.
  - Multi-instance cache persistence / sharing remains a cutover gate.
Next bounded action: Claude Code peer-reviews GO-002 diff; Owner decides on FIX-002 and production hosting.
Writer released: yes.
```

## Prior handoff (Claude Code -> Codex)

```text
Task / scope: FIX-001, GO-001, LEARN-001, GO-000 (described above)
Owner / reviewer: Claude Code / Codex (review not yet run)
Status: review
Base commit / branch / worktree: 42759dd / go-backend / main checkout
Allowed files / interfaces: backend/, learn-go/, contracts/, scripts/contracts/,
  the search route handler, next.config.mjs, .gitattributes, .gitignore, shared docs
Changes made: see the table above and the commit messages.
Contract or decision changes:
  - Backend language is Go (ADR-0002, accepted).
  - Search contract version 2: 13 defects fixed. See "Judgment calls" below.
Checks run and exact outcome (Windows, Node 21.7.1, Go 1.27.2):
  - npm run test:contracts: 88 tests pass (87 cases plus an id check).
  - backend: go test ./... passes. 174 contract subtests (87 cases, each run in
    memory and over real sockets), plus unit tests. go vet clean. gofmt -l empty.
  - The 87 new fixtures run against the OLD handler: 27 fail, all in the fixed
    areas. The 53 old fixtures run against the NEW handler: exactly the 13
    defect cases fail.
  - Deliberate breaks, each caught by exactly the expected cases, then reverted:
    page cap 999; Retry-After not forwarded; "+" not decoded as a space;
    a wrong expected Retry-After; a security header changed in next.config.mjs.
  - Go server against live GitHub, unauthenticated: a C# search answers 200.
  - Switch, in next dev: on, the route is served by Go with the security
    headers; off, by Next.js. Other routes unaffected.
  - Switch, in a production build: a build made with the switch on forwards to
    Go even when started without the variables, and a build made with it off
    does not forward even when started with them. It is fixed at build time.
  - npm run build: passes, with the switch off and with it on.
  - npm run lint: FAILS exactly as on the baseline, 10 errors and 16 warnings,
    all in UI files not touched here. The files changed here lint clean.
  - learn-go: go test -tags solution ./... passes; go vet passes with and
    without the tag; go test ./... fails in all nine lessons by design.
    Both "real tasks" in the lessons were carried out as written, behaved as
    the lessons say, and were reverted.
Unverified dependencies / blockers:
  - Not deployed. Hosting for the Go service is undecided.
  - GitHub's rate-limit replies (403 with zero remaining, Retry-After, 429) were
    not observed live. The mapping follows GitHub's documented behaviour.
    Observed live: quoted multi-word language and C# work; a blank query and
    a page past 1000 results both answer 422.
  - No latency, memory or cost measurement of either implementation.
  - Tested on one Windows machine only. No CI exists for Node or Go.
  - The Next.js runner depends on Node module hooks and on next/server.js
    resolving; verified on Node 21.7.1 only.
  - Deployed topology, live RLS, and Python service lineage: still unverified.
Next bounded action: Codex reviews (see "Review requests"), then GO-002a.
Writer released: yes
```

## Judgment calls made inside FIX-001

The owner approved fixing the 13 defects. Fixing them needed these specific choices, which the owner did not individually approve. Reviewer, please check each one. They are all pinned by fixtures.

| Choice | Why |
|---|---|
| `page` is capped at 1000 | GitHub serves only the first 1000 results, so no higher page can succeed. Without a cap, a 30-digit page would reach GitHub in exponent notation |
| `page` and `per_page` must match `^-?[0-9]+$` | Rejects fractions, exponents, hex and `Infinity`, as intended. It also rejects `+5` and `5` with a trailing space, which `Number()` used to accept |
| A blank query means no character outside Unicode `White_Space` | Catches a full-width space from an IME. Identical by construction in JavaScript (`\P{White_Space}`) and Go (`strings.TrimSpace`) |
| `language` allows `#` and single spaces between words; multi-word values are quoted upstream | The navbar offers C#. Quotes are never accepted in the value, so quoting cannot be escaped. Single-word values stay unquoted so existing URLs do not change |
| Rate limits answer 429 with `rate_limit` in the body, and `Retry-After` forwarded when GitHub sent it | The search page shows the error text in a toast and could not tell "slow down" from "broken" |
| GitHub's 422 answers 400 `GitHub could not process this search` | It is the caller's request that GitHub rejected |
| A 200 without a numeric `total_count` and an `items` array answers 500 | It used to answer 200 with both keys missing, which the page would show as "Found undefined repositories" |
| Other upstream failures still answer 500 | They were marked `preserve` in version 1; not part of the 13 |

## Review requests for Codex

1. `contracts/github-search/cases.json` against `route.js`: is any rule in the README wrong, or any case missing?
2. `backend/internal/githubsearch` against `route.js`, line by line. They are meant to be the same program in two languages.
3. `backend/internal/jscompat`: the query parser and the encoder. Invalid UTF-8 is knowingly left unspecified.
4. The switch in `next.config.mjs`, and Go sending the security headers itself with a drift test, instead of sharing one source.
5. The judgment calls above.
6. `learn-go/`: is anything in a lesson untrue about Go or about this codebase?

Record disagreements in `claude-review.md` or the ADR, as before.

## Active & Upcoming tasks

| Task | Scope | Status | Blocked on |
|---|---|---|---|
| `SYNC-001` | Readback, documentation synchronization and verification | Implementation complete | Claude peer review |
| `GO-002a` | Contract fixtures for `github/repo`, `github/repo/[owner]/[repo]` and `github/contents/[owner]/[repo]` | Implemented and reviewed in REVIEW-002 | Cutover gates remain |
| `GO-002b` | Go implementation of repo summary, detail, contents + lessons 09 & 10 | Implemented and reviewed in REVIEW-002 | Findings and cutover gates |
| `GO-003` | Cache/logging/URL fixes, regression coverage, wire URL checks and lesson 11 | Implemented at `cd8906c`; accepted in REVIEW-003 | Cutover gates remain |
| `GO-004` | First Phase 2 route: static `github/languages`, with lesson 12 | Implemented at `b0ef691`; accepted with routing off in REVIEW-003 | Cutover gates remain |
| `GO-005a` | Contract fixtures for contributions | Committed cd6ad67; reviewed in REVIEW-004 | Cutover gates |
| `GO-005b` | Contributions Go port and lesson 13 | Committed 80cee17; reviewed in REVIEW-004 | Cutover gates |
| `FIX-003` | Repository input validation and lesson 14 | Committed 3f4c7dd; reviewed in REVIEW-004 | Cutover gates |
| `FIX-004` | Non-UTF-8 text and shared detail deadline | Committed 905c1d9; reviewed in REVIEW-004 | Cutover gates |
| `VERIFY-001` | Development forwarding and race preparation | Committed 905c1d9; reviewed in REVIEW-004; dev 46/46 | Hosted race and Vercel preview |
| `AUTH-001` | Two-token verification & private repo isolation across 5 dynamic GitHub routes + Lesson 16 | Committed 7e0820c; reviewed in REVIEW-006, with fixes | Live Supabase and GitHub checks; private UI; cutover gates |
| `AUTH-002` | Public repository page & starred enrichment isolation | Committed 7831c0b; reviewed in REVIEW-006 | Anonymous quota decision; cutover gates |
| `VERIFY-003` | Exact credentials & wrong-session 401 forwarding check (50/50 production probe) | Implementation complete & verified | Independent review |
| `GO-006a` | Characterize trending with fixed clock/random inputs; no production fix | Committed 7831c0b; 34 fixtures after REVIEW-005 | Independent review before cutover |
| `FIX-002` | Make the navbar's "Most Stars" and "Recently Updated" work. Offered to the owner as the real task in `learn-go/02-structs-and-maps`. Do not fix it unasked: it is the owner's exercise | Reserved for Owner | Owner |
| `CI-001` | Linux contracts, race, vet, format, lessons and production probe | Committed; hosted run 38351494790 on 259ff7b succeeded | Independent review; a run for each later commit |
| `OPS-001a` | PORT support and lesson 15 | Committed 905c1d9; reviewed in REVIEW-004 | Deployment gates |
| `OPS-001` | Choose hosting for the Go service; deploy to a staging environment; take the measurements the ADR requires. Proposal written in the ADR | Proposal written; nothing deployed | Owner |
| `GO-006b` | Trending Go port and lesson 17 | Committed 4640b10; logging and JSON decoding reviewed and fixed in REVIEW-005 | Rest of it unreviewed; cutover gates |
| `GO-007a` | Trending-developers characterization | Committed 259ff7b; 57 fixtures/23 defects after REVIEW-005 | Cutover gates |
| `GO-007b` | Trending-developers Go port and lesson 18 | Committed b5745b3; reviewed in REVIEW-005 | Hosted CI run; anonymous quota decision; cutover gates |
| `AI-001a` | Fixtures for `POST /api/ai/suggestions`, AI call stubbed | Committed b5745b3; 35 fixtures/8 defects; reviewed in REVIEW-005 | Owner's AI decisions before any port |
| `REVIEW-005` | Claude Code review of GO-007b, lesson 18, AI-001a, with fixes | Committed b5745b3 | Codex has not seen the fixes |
| `AI-001b` | Fixtures for `POST /api/ai/enhance-query`, provider call stubbed | Committed 9480ef9; 62 fixtures/10 defects | Independent review; owner's AI decisions before any port |
| `AI-001c` | Fixtures for `POST /api/ai/chat` with the real helper, provider call stubbed | Committed 9480ef9; 42 fixtures/16 defects | Independent review; owner's AI decisions before any port |
| `AI-002a` | AI contract version 2 in Next.js: sign-in for chat, limits, three safety fixes, fixtures | Committed d2320c2 | Independent review; browser check of chat |
| `AI-002b` | Go ports of suggestions and enhance-query against version 2, with lesson 19 | Committed 81f1044; hosted run 38451803995 succeeded | Independent review |
| `AI-002c` | Go port of chat with the session check and limits, with lesson 20; the browser sends a bearer token | Committed 5750ee5; hosted run 38512059829 succeeded | Independent review; browser check of chat |
| `QUOTA-001` | Public-only server token for anonymous GitHub reads, in Next.js and Go, with a check that refuses a private-capable token | Complete; uncommitted at handoff | Independent review; owner creates and sets the token before it is used live |
| `PLAN-001` | Phase 6, bugs and broken UI/UX, added to the ADR before retiring old logic (now Phase 7); the recording rule in AGENTS.md | Complete; uncommitted at handoff | Independent review |
| `BUG-001` | `docs/bug-register.md` opened and filled from recorded evidence and static source checks; no fixes | Complete (48 entries); uncommitted at handoff | Independent review |
| `BUG-003` | First register fixes needing no decision: R-001, R-003, R-006, R-043, and R-050 found on the way; guards in the contract suite; lint in CI | Complete; uncommitted at handoff | Independent review |
| `BUG-004` | The owner decisions of 2026-10-14: R-049, R-053, R-055; R-058 found on the way | Complete; uncommitted at handoff | Independent review |
| `BUG-005` | R-020: a real measure in place of the random "stars today", trending contract version 2 in Next.js and Go | Complete; uncommitted at handoff | Independent review |
| `ACT-001` | `GET /api/activity`: fix R-056 and R-057, then contract fixtures (Phase 3 step 1) | Complete; uncommitted at handoff | Independent review |
| `ACT-002` | Port `GET /api/activity` to Go with the user's own token | Complete, off by default; uncommitted at handoff | Independent review; Phase 3 gate (definitions of `activity_logs` and its policies) and hosting before it is turned on |
| `BUG-006` | R-009, R-018, R-046, R-047, and the owner's answers of 2026-10-14: R-055 revised, R-060, R-061, R-062 | Complete; uncommitted at handoff | Independent review |
| `OPS-002` | Hosting option A: repository side and the owner's setup guide | Complete; uncommitted at handoff; nothing deployed | The owner creates the Vercel project; VERIFY-004 checks it |
| `OPS-003` | Where the live site comes from: repositories, Vercel project, domain | Complete (audit); uncommitted at handoff | Owner answers; see the handoff |
| `OPS-004` | Bring code, Vercel and domain together (transfer, relink, release branch) | Not started | Owner: domain renewal, choice of home account, Vercel connector |
| `VERIFY-004` | Check the owner's Go deployment from outside, then the preview route | Go side passed 2026-10-15 (trending real data, 7 of 7 checks) | The owner sets the trending switch on `sefgh-main`; then verify through the website |
| `STAR-001` | `GET /api/repo/starred`: contract, Go port off by default, shared `supabaserest` | Complete; uncommitted at handoff | Independent review; Phase 3 gate before it is turned on |
| `BUG-002` | Walk-through of every page, signed out and signed in, at phone and desktop width; findings added to the register | Not started | A test account from the owner for the signed-in half |
| `REVIEW-006` | Independent review of AUTH-001 and AUTH-002 by deliberate breaks, with fixes | Committed d2320c2 | Someone other than Claude Code to look at the fixes |
| `REVIEW-007` | Independent review of CI-001, VERIFY-002 and VERIFY-003 by the same method | Not started; next task that needs no decision | Nothing |

Suggested ownership: whichever agent is available takes the writer role for one task and records it under "Current state"; the other reviews.

## Owner decisions pending

- Navbar sort (`FIX-002`): teach the API the navbar's names, or change the navbar to the API's names.
- **Live site and accounts (OPS-003, 2026-10-14):** sefgh.org has expired at Hostinger (renew now); the live Vercel project `sefgh-ui` builds the old public repository `sefgh-ai/sefgh-nextjs`, not this one. Proposal in the OPS-003 handoff: renew, transfer this repository to `sefgh-ai`, relink `sefgh-ui` with a release branch, then host Go beside it.
- **Hosting: decided on 2026-10-14, option A** (a second Vercel project rooted at `backend/`, free Hobby plan, preview first). The owner creates the project by following `hosting-setup.md`; agents cannot sign in to Vercel. Still the owner's to judge: Vercel's Hobby plan is for non-commercial use only, which already applies to the Next.js project.
- **AI routes: decided on 2026-10-13.** Chat for signed-in users only, the search helpers public, both with limits, and three safety defects to fix. See the ADR decisions log. Playground-key policy is separate and still open, before Phase 3.
- Contributions route: the owner chose on 2026-10-12 to port it although nothing calls it, and it is ported with its defects reproduced. Still to decide: the seven groups of `defect` cases in `contracts/github-contributions/README.md`, the first being whether its date range should be computed in UTC.
- **Private access is decided:** signed-in users may see only repositories their own GitHub account can access. AUTH-001 implements the API boundary locally; independent review and private UI integration remain. This is not waiting on another policy answer.
- **CI-001 needs nothing further from the owner.** It is committed and its hosted run on `259ff7b` succeeded.
- **Anonymous GitHub quota: decided on 2026-10-13, implemented in QUOTA-001 (2026-10-14).** The owner still has to create a classic personal access token with no scopes and set it as `GITHUB_PUBLIC_READ_TOKEN`; a fine-grained token is refused by design. Never paste it into a chat or a shared document.
- **Phase 6 (2026-10-14):** entries in `bug-register.md` marked `owner` need a choice before they are fixed; agents will bring them as questions with options. R-049, R-053, R-055 and R-020 were answered on 2026-10-14 and are fixed; R-060, R-061, R-062 and a revised R-055 (analytics for everyone, with an opt-out) were answered the same day and fixed in BUG-006.
- **Mandatory GitHub sign-in (raised by the owner on 2026-10-14, not decided):** Claude Code recommended against making it mandatory for the whole site and gave the reasons in chat; nothing is implemented until the owner answers.
- **Phase 3 database definitions (Connecting Supabase):** needed before any user-data route is switched on in Go (first: `activity`). On 2026-10-14 the owner offered full access; Claude Code asked for read-only, because only definitions are needed (tables, row-level security policies, functions, triggers) and read-only means neither a mistake nor text planted in user data can change the live database. Any change an agent finds necessary is written as a migration file for the owner to approve. How the owner connects, with no secret passing through a chat:
  1. Find the project ID: Supabase dashboard, Project Settings, General ("Project ID"), the part before `.supabase.co` in the project URL. It is not secret.
  2. In the VS Code terminal: `claude mcp add --scope user --transport http supabase-readonly "https://mcp.supabase.com/mcp?read_only=true&project_ref=PROJECT_ID"`.
  3. In Claude Code, type `/mcp`, choose `supabase-readonly`, then **Authenticate**. A browser opens; sign in to Supabase and allow access. In the same `/mcp` list, disable `plugin:supabase:supabase`, the plugin's server, which has full access to every project in the account.
  4. Tell the agent it is connected. The alternative remains a schema-only dump (`supabase db dump --schema-only`) added to the repository. No service-role key or database password is needed or wanted.

## State of the owner's machine

- Go 1.27.2 is installed for the Windows user at `%LOCALAPPDATA%\Programs\Go`, from the official archive with its checksum verified, and its `bin` folder was appended to the user `PATH`. No administrator rights were used. To remove it, delete that folder and the `PATH` entry.
- A terminal or editor that was open before the install does not see `go` until it is restarted. Agents can prefix a command's `PATH` with that `bin` folder.
- At GO-003 start, `main` and `go-backend` both pointed to `1e5d87f` and matched
  their locally recorded origin refs. No remote fetch was performed by Codex.
  The earlier divergence was resolved before this task.

## Shared reading order

1. `../AGENTS.md`: cooperation and implementation rules.
2. This file: latest task and actual state.
3. `backend-map.md`: observed source architecture and unverified dependencies.
4. `adr/0002-go-backend.md`: the accepted plan, how a route moves, phases and gates.
5. `claude-review.md`: findings and reconciled differences from the original review.

`../CLAUDE.md` imports `AGENTS.md`, keeping one set of core instructions. Claude supports repository instruction files and imports; see [Claude Code's official memory documentation](https://code.claude.com/docs/en/memory). Existing sessions should explicitly read the updated files; changes are not a live message bus.

## Working agreement

A task has one writer and one reviewer, and the roles swap freely. Shared files carry facts and decisions; private chat context is not automatically synchronized.

Before an implementation task, the writer records its scope and base commit here. The reviewer reads the same files and reviews the bounded diff. Record disagreements in the ADR or review notes and resolve them before changing affected contracts. Release ownership before another agent edits. Concurrent feature work requires separate worktrees and explicit allocation; merely using different terminals does not isolate edits.

## Handoff format for future tasks

```text
Task / scope:
Owner / reviewer:
Status: proposed | active | review | complete | blocked
Base commit / branch / worktree:
Allowed files / interfaces:
Changes made:
Contract or decision changes:
Checks run and exact outcome:
Unverified dependencies / blockers:
Next bounded action:
Writer released: yes/no
```

## Prompt for an existing Codex or Claude Code session

> The backend plan changed from Rust to Go on 2026-10-11. Read AGENTS.md and docs/coordination.md, then docs/adr/0002-go-backend.md, docs/backend-map.md and docs/claude-review.md. Do not implement docs/adr/0001-rust-backend.md. Continue from the shared state: check `git status --short`, the current branch, and task ownership before editing. Unreviewed work is listed under "Review requests" in the coordination file; review it read-only unless you are assigned the writer role. Any task that changes Go in backend/ must also update learn-go/.
