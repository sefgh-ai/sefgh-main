# Bug and broken UI/UX register

This is the one list of known bugs and broken UI/UX in SEFGH. It belongs to Phase 6 of `adr/0002-go-backend.md`, which must be complete before Phase 7, retiring old logic, begins. The rules for adding and fixing entries are in the ADR under "Phase 6".

Opened 2026-10-14 by Claude Code (task BUG-001). Every entry below came from evidence already in the repository or from reading the source. **No page was opened in a browser for this first pass.** A walk-through of every page, signed in and signed out, at phone and desktop width, is task BUG-002 and will add to this list.

BUG-003 (2026-10-14) fixed R-001, R-003, R-006, R-043 and R-050 and added R-049 to R-057. Some of those came from loading seven signed-out pages (`/`, `/download`, `/privacy`, `/careers`, `/versions`, `/search`, `/trending`) in headless Chrome against a local build with placeholder Supabase settings. That was a spot check, not BUG-002's walk-through.

## How to read and keep this list

- **ID** never changes and is never reused. A new entry takes the next number.
- **Severity.** High: wrong or invented data shown to a user, a security or privacy gap, data loss, or a main feature that does not work. Medium: a control, link or route that does the wrong thing or nothing. Low: an edge case, cosmetic, or a code-health problem with no confirmed user effect.
- **Needs** says what has to happen before a fix. `contract`: the behaviour is pinned by fixtures, so the fix changes the fixtures and every implementation in one commit and raises the contract version. `owner`: the right behaviour is a product choice; an agent writes the options and asks first. `schema`: needs the live database definitions, which are not in the repository. `—`: an agent can fix it in a bounded task.
- **Status**: `open`, `in progress (task)`, `fixed (task, commit)`, or `deferred (owner, date)`. Only the owner defers.
- **Evidence** points at the file, function or fixture case. Line numbers are as of commit `5750ee5`.
- Anyone who finds a bug adds it here in the same change, even without fixing it.

## Site-wide and navigation

| ID | Sev | Problem | Evidence | Needs | Status |
|---|---|---|---|---|---|
| R-001 | Medium | The navbar's "Downloads" link goes to `/downloads`, which does not exist; the page is `/download`. The link is a 404 | `src/components/AnimatedNavbar.jsx:209`; also `src/components/Footer.jsx:13` (found in BUG-003 by loading pages in a browser). Guard: `scripts/contracts/internal-paths.test.mjs` | — | fixed (BUG-003, uncommitted at handoff) |
| R-002 | Medium | The footer's newsletter "Subscribe" button does nothing. There is no form and no handler, so an address typed there goes nowhere, with no message to say so | `src/components/ui/footer-newsletter.jsx:52`, shown in `app-footer.jsx` | owner | open |
| R-003 | Low | The newsletter consent text links "SEFGH Privacy Statement" to `#`. A `/privacy` page exists | `footer-newsletter.jsx:71`. Guard: `scripts/contracts/internal-paths.test.mjs` | — | fixed (BUG-003, uncommitted at handoff) |
| R-004 | Medium | Every client error report in production is sent to `/api/log-error`, which does not exist. Each report is a 404 and nothing is recorded | `src/lib/error-tracking.js:32`; no such route | owner | open |
| R-005 | Low | "Upgrade to Pro" sends the user to `/signup?plan=pro&billing=…`. The signup page ignores both values and there is no payment, so a signed-in user lands on a sign-up form | `src/components/search/UpgradeDialog.jsx:123` (marked TODO), `src/app/signup/page.js` | owner | open |
| R-050 | Medium | On `/links`, "API Reference" went to `/docs/api` and "Changelog" to `/changelog`; neither page exists. Found in BUG-003 | `src/app/links/page.js`; guard `scripts/contracts/internal-paths.test.mjs` | — | fixed (BUG-003, uncommitted at handoff): now `/api-reference` and `/versions#changelog` |
| R-051 | Low | On `/links`, "Blog RSS" goes to `/blog/rss.xml`; there is no feed. Found in BUG-003 | `src/app/links/page.js`; listed in `KNOWN` in `scripts/contracts/internal-paths.test.mjs` | owner | open: build a feed, or remove the link |
| R-053 | Medium | Numbers are formatted with whichever locale the machine has (`toLocaleString()` with no locale), so the server and the browser can disagree. On `/trending` the server wrote "1,20,000" and Chrome "120,000"; React then throws away the server's HTML for that part of the page and logs a hydration error. Found in BUG-003 | 12 calls in 7 files, e.g. `src/components/trending/EditorsChoice.jsx:73`, `:78`; seen in a development build in headless Chrome | — | fixed (BUG-004, uncommitted at handoff): Indian grouping everywhere through `src/lib/utils/formatters.js` (`formatNumber`, `formatCompactNumber` with K, L, Cr); guard `scripts/contracts/number-format.test.mjs` |
| R-054 | Low | On the home page, the content security policy blocks a Web Worker that some component creates from a `blob:` URL ("violates the following Content Security Policy directive: script-src"). Which component, and whether anything visible stops working, was not established. Found in BUG-003 | production build in headless Chrome; the policy is in `next.config.mjs` | — | open |
| R-055 | Medium | Google Analytics loads on every page and sends page views and scroll events before the visitor answers the cookie bar, whose only button is "Got it". Whether consent is needed first depends on where visitors are; that is a legal and product choice. Found in BUG-003 | `src/app/layout.js` (Google Analytics script, `gtag('config', ...)`), `src/components/CookieBar.jsx` | owner | fixed (BUG-004); revised in BUG-006, uncommitted at handoff, on the owner's choice of 2026-10-14: Google Analytics loads for everyone and the cookie bar says so, with "Opt out" and "Got it". Opting out stops it at once (`ga-disable`) and it is not loaded on later pages; Do Not Track is honoured. Consent first can return when the user base grows. Guard `scripts/contracts/consent.test.mjs` |
| R-061 | Low | Four places show a date or time in whichever format the machine uses (`toLocaleDateString()` or `toLocaleTimeString()` with no locale), the same server-and-browser risk as R-053 had for numbers. Most other dates are written out in `en-US` ("Oct 14, 2026"). Found in BUG-004 | `src/components/playground/ApiKeysTab.jsx:229`, `src/components/search/SearchHistoryDropdown.jsx:75`, `src/components/trending/TrendingFilters.jsx:67`, `src/components/chat/MessageList.jsx:225` | owner | fixed (BUG-006, uncommitted at handoff): one locale for every date and time, en-IN ("14 Oct 2026", "14/10/2026", "9:05 am"), the 20 `en-US` calls included. Guard `scripts/contracts/date-format.test.mjs` fails on any date call that is not en-IN |
| R-062 | Medium | Once a visitor answers the cookie bar there is no way to change the answer, short of clearing the site's data; withdrawing consent should be as easy as giving it. Found in BUG-004 | `src/lib/consent.js` (`saveConsent("")` would ask again, but nothing calls it) | owner | fixed (BUG-006, uncommitted at handoff): "Cookie settings" in both footers shows the bar again (`CookieSettingsButton` in `src/components/CookieBar.jsx`). Guard `scripts/contracts/consent.test.mjs` |

## Profile and settings

| ID | Sev | Problem | Evidence | Needs | Status |
|---|---|---|---|---|---|
| R-006 | High | The profile page's usage card shows invented activity. It is given no data, so it generates random mock usage, for a year fixed at 2025. `/api/activity`, which reads real activity, is not used | `src/app/profile/page.js:80`, `UsageContributionsCard.jsx` (`loadMockUsageForYear`), `src/lib/mockUsageData.js` | — | fixed (BUG-003, uncommitted at handoff): the card reads `/api/activity` and says when it is loading, signed out or failed; guard `scripts/contracts/usage-activity.test.mjs` |
| R-007 | Low | Two-factor authentication in Security settings only says "coming soon" | `src/components/settings/SecurityTab.jsx:33` | owner | open |
| R-049 | High | The Sessions tab in settings shows the same invented sessions to every user ("Windows Desktop, Chrome 120, Hyderabad", a masked IP, an "iPhone 15"). Its "Terminate session" button removes the row and says "Session terminated" but ends nothing, so a user who lost a device would believe it is signed out. Found in BUG-003 | `src/components/settings/SessionsTab.jsx` (`PLACEHOLDER_CURRENT_SESSION`, `handleTerminateSession`) | owner | fixed (BUG-004, uncommitted at handoff): this device, sign-in method, last sign-in and time zone, and "Sign out everywhere" with a confirmation; guard `scripts/contracts/sessions-tab.test.mjs` |
| R-058 | Medium | The ordinary "Sign out" signed the account out on every device: Supabase's `signOut()` defaults to the "global" scope. Found in BUG-004 | `src/contexts/AuthContext.js` `signOut` | — | fixed (BUG-004, uncommitted at handoff): `signOut({ scope = "local" })` by default; "Sign out everywhere" in the Sessions tab passes "global"; guard `scripts/contracts/sessions-tab.test.mjs` |

## Chat

| ID | Sev | Problem | Evidence | Needs | Status |
|---|---|---|---|---|---|
| R-008 | Medium | Six options in the chat input menu (Upload repo, Enhance, Think longer, Deep research, Quick answer, Web search) only show "Coming soon" | `src/components/chat/ChatInput.jsx:67-117` | owner | open |
| R-009 | Medium | The first message of a chat waits for the title request to finish before the answer is asked for, so the first reply takes one whole AI call longer | `src/hooks/chat/useChatMessages.js` `handleSend` | — | fixed (BUG-006, uncommitted at handoff): the name and the answer are asked for together, and the conversation list reloads after both. Guard `scripts/contracts/chat-first-reply.test.mjs` runs the real `handleSend` and fails on the old code |
| R-010 | Medium | If the AI's reply is not text (null, an object, or no content), the browser fails on `response.split(" ")` and says "Failed to send message", though the server answered 200 | `useChatMessages.js`; ai-chat cases `reply-null-content`, `reply-object-content`, `reply-without-content`, `reply-message-is-text` | contract | open |
| R-011 | Medium | Editing or deleting a message rewrites the whole conversation. Two tabs or devices writing at once lose one of the changes | `src/lib/supabase/conversations.js`; backend-map finding 5 | schema | open |
| R-012 | Low | The fallback title is cut at 30 UTF-16 units and can keep half an emoji. Whether Postgres then refuses to save the title was not checked | ai-chat `title-fallback-cuts-a-character-in-two` | contract | open |
| R-013 | Low | Fallback title: repeated spaces count as words. AI title of only quotation marks: empty title. The message is pasted into the title prompt between unescaped quotation marks | ai-chat `title-fallback-repeated-spaces`, `title-only-quotation-marks`, `title-quote-in-message` | contract | open |
| R-014 | Low | Chat forwards only the newest 20 messages and 8,000 characters (the owner's limits), which with long answers is two or three exchanges. Older context is dropped without telling the user | `src/lib/ai/guard.js`; ADR decisions 2026-10-13 | owner | open |

## Search

| ID | Sev | Problem | Evidence | Needs | Status |
|---|---|---|---|---|---|
| R-015 | Medium | The navbar's "Most Stars" and "Recently Updated" do nothing: they send `sort=stars` and `sort=updated`, names the API does not know. **Reserved:** this is the real task at the end of lesson 02 (task `FIX-002`), so the owner fixes it | github-search `sort-navbar-stars-ignored`, `sort-navbar-updated-ignored`; `learn-go/02-structs-and-maps` | contract | open (owner's lesson) |
| R-016 | Medium | The `monthly` and `yearly` filters add no date filter; they behave exactly like `latest` | backend-map "Open findings" under search | contract | open |
| R-017 | Medium | The navbar's advanced filters (license, date range, topics, forks, wiki, issues) are kept in the page and never sent to the API | backend-map "Open findings" under search | owner | open |
| R-018 | Low | "Load more" is offered past GitHub's first 1,000 results; that request then answers 400 | backend-map "Open findings" under search | — | fixed (BUG-006, uncommitted at handoff): the page buttons, which had the same fault, and "load more" stop at the last page GitHub serves (`src/lib/github/search-pages.js`; checked against GitHub on 2026-10-14: page 34 of 30 answered, page 35 was refused). The page line says GitHub shows the first 1,000. Guard `scripts/contracts/search-pages.test.mjs` |
| R-019 | Low | Three search callbacks leave out state they read (`view`, `searchResults`, `searchTime`, `totalCount`), so they can act on stale values. Not observed in a browser | lint warnings, `src/hooks/search/useGitHubSearch.js:187`, `:258`, `:310` | — | open |

## Trending

| ID | Sev | Problem | Evidence | Needs | Status |
|---|---|---|---|---|---|
| R-020 | High | "Stars today" on trending repositories is a random number, and the heat level follows position in the list. Neither measures anything | github-trending `random-min`, `random-mid`, `random-max`, `ranking-boundaries`, `fallback-fields`, `unknown-color` | owner, contract | fixed (BUG-005, uncommitted at handoff): trending contract version 2, `starsPerDay` and a heat level from it, in Next.js and Go; mock fallbacks and typed-in numbers removed; guard `scripts/contracts/trending-measure.test.mjs` |
| R-021 | Low | The trending language filter refuses C#, which the language list offers | github-trending `csharp-rejected` | contract | open |
| R-022 | Low | Date ranges: a monthly range overflows February into March, and daylight saving shifts the start date. Both trending routes | github-trending `monthly-overflow`, `leap-monthly-overflow`, `dst-local-calendar`; developers `month-overflow`, `leap-overflow`, `dst-local` | contract | open |
| R-023 | Medium | A GitHub rate limit becomes a generic 500 without retry information, so the page cannot say "try again later" | github-trending `rate-limit`; developers `search-http-403`, `search-http-429` | contract | open |
| R-024 | Low | Language colours are looked up including inherited object properties (`__proto__` gives an object); the C++ query is sent with literal plus signs, which needs checking against real GitHub | github-trending `prototype-color`, `cpp-language` | contract | open |
| R-025 | Medium | Trending developers: any failed repository lookup (401, 403, 404, 429, 500) shows the developer as having no public repositories; one network failure or malformed reply fails the whole list; a null reply throws | developers `repo-http-*`, `one-network-failure`, `repo-malformed-json`, `repo-null-body` | contract | open |
| R-026 | Low | Trending developers: the "top repository" is the first result of `sort=stars`, which GitHub's user repositories endpoint may not honour | developers `first-repository-only` | owner, contract | open |
| R-027 | Low | Trending developers: logins from GitHub go into the URL unchecked (a missing login is looked up as "undefined", path segments and query characters pass through), and entries or logins of the wrong type are looked up as text | developers `missing-login`, `login-path-segments`, `query-in-login`, `*-in-place-of-user`, `*-login`, `repository-reply-is-text` | contract | open |
| R-060 | Low | The trending card's "Star" button has no click handler and does nothing. Found in BUG-005 | `src/components/trending/TrendingRepositoryCard.jsx` | owner | fixed (BUG-006, uncommitted at handoff): the owner chose the link. Star opens the repository on GitHub; only a `https://github.com/` address is used, and a card with no owner shows no button (`src/lib/utils/trending/githubLink.js`). Guard `scripts/contracts/trending-star.test.mjs` |
| R-028 | Medium | The trending refresh job deletes the cached rows before fetching new ones, so a failure leaves trending empty or partial. It runs with the browser Supabase client and no server identity | `src/lib/trending.js`, `src/app/api/trending/refresh/route.js`; backend-map finding 7 | schema | open |

## Repository pages and GitHub routes

| ID | Sev | Problem | Evidence | Needs | Status |
|---|---|---|---|---|---|
| R-029 | Medium | A repository that does not exist answers 500 "Failed to fetch repository details" (or contents), not 404, so the page cannot say "not found". 403, 429 and 500 from GitHub are also a generic 500 | github-repositories `detail-status-*`, `contents-status-*`, `summary-status-*` (14 cases) | contract | open |
| R-030 | Low | Malformed GitHub replies (missing fields, nulls, a list or `true` in place of an object) are answered 200 with holes | github-repositories `summary-missing-fields`, `summary-explicit-nulls`, `summary-array-body`, `summary-boolean-body`, `detail-null-languages`, `contents-null-body` | contract | open |
| R-031 | Medium | Signed-out GitHub reads are made by the server with no token, so all signed-out visitors together share the 60 requests an hour GitHub allows one address. The repository page probably asks twice per view (read from the source, not measured) | `claude-review.md` REVIEW-006 "Still open" | owner | fixed in code (QUOTA-001, uncommitted at handoff); takes effect only when the owner sets `GITHUB_PUBLIC_READ_TOKEN`. The two reads per page view remain |
| R-032 | Medium | `/api/github/contributions` answers 500 "GitHub token not configured" to anyone signed out, because GitHub's GraphQL needs a token. Nothing in the app calls it. QUOTA-001 deliberately leaves it out: allowing it changes its contract | `src/app/api/github/contributions/route.js:67`; `contracts/github-access/README.md` | owner | open: use the public token here, or retire the route in Phase 7 |
| R-033 | Low | Contributions: the date range depends on the server's time zone; a rejected server token reaches the caller as 401; an unknown user is 400; a bare reply is "User not found"; the streak is 0 while today is still empty; reply shapes are not checked | github-contributions, 18 `defect` cases in seven groups (README) | contract | open |
| R-034 | Medium | A cached public repository summary can still be served for up to an hour after the repository is made private, in both implementations | `src/app/api/github/repo/route.js:41` (`revalidate: 3600`), `backend/internal/githubrepos/cache.go`; `claude-review.md` REVIEW-005 and REVIEW-006 | owner | open |

## AI search helpers

| ID | Sev | Problem | Evidence | Needs | Status |
|---|---|---|---|---|---|
| R-035 | Medium | Enhance-query answers 500 when the provider fails instead of using its own built-in enhancement; a reply of only white space is a successful empty enhancement; a body of `null` is 500 where other bodies without a query are 400 | ai-enhance-query `openai-rate-limited`, `openai-network-failure`, `anthropic-network-failure`, `openai-empty-content`, `null-body`, `null-body-with-a-key` | contract | open |
| R-036 | Low | Enhance-query's built-in word lists match inside other words, add words already there, and keep surrounding spaces; the Anthropic prompt pastes the query between unescaped quotation marks | ai-enhance-query `basic-*`, `anthropic-query-pasted-into-prompt` | contract | open |
| R-037 | Low | Suggestions: a query that is a number, list or object is 500 (the caller's mistake, so 400); a padded short query triggers the AI; duplicates and non-text items from the AI reach the UI; a discarded fourth AI item hides a built-in match | ai-suggestions, all 7 `defect` cases | contract | open |
| R-038 | Medium | The AI allowances are counted in each server process and key on `X-Forwarded-For`. On several instances they allow more than 30, and where the proxy does not overwrite that header a caller can change it | `src/lib/ai/guard.js`, `backend/internal/ailimit`; ADR | owner, schema | open |

## Accounts, data and playground

| ID | Sev | Problem | Evidence | Needs | Status |
|---|---|---|---|---|---|
| R-039 | High | Playground API keys are stored in plain text, no handler checks them, and usage logs are written by the browser | `src/app/api/playground/keys/route.js`, `src/components/playground/*Tab.jsx`; backend-map finding 3 | owner, schema | open |
| R-040 | Medium | Comments and videos call `auth.admin.getUserById` with the ordinary public key. That call needs the service-role key, so it cannot succeed and commenter and uploader details are missing | `src/app/api/repo/comments/route.js:157`, `src/app/api/repo/videos/route.js:136`, `src/lib/utils/repo/commentHelpers.js:35`; backend-map finding 8 | owner | open |
| R-041 | Medium | Avatar upload refers to `supabase/avatar-storage-setup.sql`, which is not in the repository; the storage policy it depends on is unknown | backend-map finding 1 | schema | open |
| R-042 | Low | Nothing limits how often a caller can make the server ask Supabase (and GitHub) to verify credentials; each credentialed request costs up to two identity calls | `claude-review.md` REVIEW-006 "could not establish" | owner | open |
| R-056 | Low | `GET /api/activity` sends the database's or the runtime's own error text to the browser on failure (`details: error.message`), the kind of leak the owner had fixed in the AI routes. Found in BUG-003, when the profile started calling it | `src/app/api/activity/route.js:44`, `:148` | — | fixed (ACT-001, uncommitted at handoff): a fixed sentence only; pinned by `contracts/activity` |
| R-057 | Low | `GET /api/activity` builds its date range with the server's local calendar (`setDate`, `getDay`) and then writes dates in UTC (`toISOString`), so near midnight, or on a server outside UTC, days can shift by one and a week can start on the wrong day | `src/app/api/activity/route.js:22-30`, `:76` | — | fixed (ACT-001, uncommitted at handoff): UTC calendar throughout; pinned by `contracts/activity` |
| R-059 | Low | `GET /api/activity`: the first week of the grid runs Monday to Saturday (six days) while the rest run Sunday to Saturday; `totalDays` counts the empty days padding the last week, so `averagePerDay` divides by too many; and `currentStreak` is 0 all day until today has activity. The profile card computes its own statistics, so none shows there today. Found in ACT-001 | `contracts/activity` cases `no-activity`, `streak-zero-when-today-is-empty` (defect) | contract | open |
| R-063 | Low | `GET /api/activity` answers 401 `Unauthorized` when Supabase Auth cannot be reached, because `supabase.auth.getUser()` reports an outage and a refused session alike; the profile card then says the visitor is signed out. The Go port copies it, so the two can be compared before cutover; fix it once, in Go, after cutover (503, as chat answers). Found in ACT-002 | `src/app/api/activity/route.js` (`authError`), `backend/internal/activity/handler.go` `ServeHTTP` | — | open |
| R-065 | High | sefgh.org and www.sefgh.org do not resolve: the domain expired at Hostinger on 2026-10-06 and is parked (nameservers `ns1.dns-expired.com`, `ns2.dns-expired.com`), and DNSSEC checks fail. Visitors cannot reach the site by name. Found in OPS-003 | RDAP for sefgh.org; Google DNS answers SERVFAIL | owner | open: renew at Hostinger, then restore the DNS records Vercel asks for |
| R-066 | High | The live site runs the May 2026 code from `sefgh-ai/sefgh-nextjs`; nothing in this repository is deployed, including every fix in this register. Its latest build, on 2026-05-24, failed. Found in OPS-003 | Vercel project `sefgh-ui` (owner's screenshot); GitHub public API | owner | open: OPS-004 |
| R-064 | Low | If `activity_logs` can hold more than one row per user and day, a busy year can pass the Data API's row limit (1,000 by default on Supabase), and the totals and grid are cut short with no error. The query asks for every row of the year and adds them up; whether this can happen depends on the table's definition, which is not in the repository. Found in ACT-002 | `src/app/api/activity/route.js` query, `backend/internal/activity/handler.go` `askDatabase` | schema | open |
| R-052 | Medium | `/api-reference` documents `GET /api/v1/search`, `POST /api/v1/chat` and `GET /api/v1/trending`, none of which exist; the page calls itself a mock. With R-039, the playground hands out keys for an API that is not there. Found in BUG-003 | `src/app/api-reference/page.js` | owner | open |

## Code health

| ID | Sev | Problem | Evidence | Needs | Status |
|---|---|---|---|---|---|
| R-043 | Medium | `npm run lint` fails: ten places call `setState` directly inside an effect, which renders twice and can flicker | `react-hooks/set-state-in-effect` at `src/app/page.js:72`, `src/components/3d/ThreeBackground.jsx:12`, `src/components/Canvas.jsx:65`, `:73`, `src/components/CookieBar.jsx:22`, `src/components/settings/AccountTab.jsx:33`, `SessionsTab.jsx:22`, `src/components/usage-contributions/UsageContributionsCard.jsx:39`, `src/contexts/LanguageContext.js:66`, `:72` | — | fixed (BUG-003, uncommitted at handoff): `npm run lint` passes with 0 errors and CI now runs it |
| R-044 | Low | Ten more effects or callbacks leave out what they read, so they can use stale values | `react-hooks/exhaustive-deps` at `src/app/chat/page.js:124`, `CodeExplorer.jsx:21`, playground `ApiKeysTab.jsx:29`, `LimitsTab.jsx:39`, `MonitoringTab.jsx:36`, `TestingTab.jsx:30`, `UsageTab.jsx:28`, `RepoVideoTab.jsx:32`, `useNotifications.js:35`, `useTrendingData.js:176` | — | open |
| R-045 | Low | Two plain `<img>` elements, and one component the React compiler skips because it declares a class inline | `RepoDetailsLayout.jsx:82`, `RepoVideoTab.jsx:258`; `src/components/ui/particle-text-canvas.jsx:28` | — | open |

## Documentation

| ID | Sev | Problem | Evidence | Needs | Status |
|---|---|---|---|---|---|
| R-046 | Low | The repositories contract README still says the summary and search routes send the server token for any caller. AUTH-001 removed that | `contracts/github-repositories/README.md`, "Open defects and boundaries" | — | fixed (BUG-006, uncommitted at handoff): the README and its route table describe the AUTH-001 and QUOTA-001 tokens. Guard `scripts/contracts/docs-claims.test.mjs` |
| R-047 | Low | The three generated Go files name a generator script that is not in the repository | `backend/internal/aiprovider/prompt.go`, `aienhance/prompts.go`, `aisuggestions/terms.go`; `backend/README.md` | — | fixed (BUG-006, uncommitted at handoff): the headers say the text is copied and tested, with no generator; `backend/README.md` likewise. Guard `scripts/contracts/docs-claims.test.mjs` |
| R-048 | Low | `.env.example` said `GITHUB_TOKEN` raises the GitHub API limits for public reads. Since AUTH-001 it is never sent to the GitHub API; it is the GitHub Models credential. Found during QUOTA-001 | `.env.example` | — | fixed (QUOTA-001, uncommitted at handoff) |

## Not bugs: for Phase 7 cleanup

Dead code is not a bug, so it is not numbered above. Phase 7 removes it.

- `src/lib/supabase/mcp.js`: a stub nothing imports.
- `streamAIResponse` in `src/lib/ai/github.js`: only throws; nothing calls it.
- `src/lib/mockUsageData.js`: unused since R-006 was fixed in BUG-003; `scripts/contracts/usage-activity.test.mjs` fails if app code imports it again.
