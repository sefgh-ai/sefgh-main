# Verification of five platform-change claims (GitHub, Vercel) for SEFGH

Researched 2026-10-26 from GitHub's and Vercel's own pages, plus Vercel's builder source on GitHub and go.dev for Go release dates. All primary pages listed below were reachable. Live API probes were run from the owner's machine on 2026-10-26 at about 17:01 UTC, **without any token** (anonymous reads only); their results are marked "probe".

Note on quotations: this session's copyright rule allows at most one verbatim quotation (under 15 words) per output, so only Claim 1 carries a direct quote. For the other claims the source wording is closely paraphrased, with the URL so the exact text can be checked.

Summary of verdicts:

| # | Claim | Verdict | Effect on SEFGH |
|---|---|---|---|
| 1 | GitHub Models fully retired on 30 July 2026 | **Confirmed** | Live AI chat, chat titles and search suggestions cannot work; provider must be replaced |
| 2 | On 2026-06-30 stargazer/watcher listing limited to admins and collaborators | **Partly true**: 2026-06-30 is the announcement; the restriction took effect in July 2026 (day not published). GraphQL not mentioned | No current code uses the listings; counts still public. Pipeline must not plan on listing stargazers |
| 3 | `GET /repos/{owner}/{repo}/stargazers/history`, changelog 2026-09-04, daily counts grouped by week, up to 30 weeks per page | **Confirmed** | Usable for the star-history pipeline; works anonymously (probe) |
| 4 | Synchronous SBOM export retired after 2026-11-13 | **Confirmed** (removal date 13 Nov 2026; replacement is the async generate-report / fetch-report pair) | No SBOM use found in `src/`, `backend/`, `scripts/` |
| 5 | Vercel Go runtime versions; Go 1.27; beta? | Go runtime is **still Beta**; Go 1.27 **is supported** per Vercel's builder source (docs list no versions) | `backend/go.mod` `go 1.27.2` is within range; consider 1.27.3 security release |

## Claim 1: Was GitHub Models fully retired on 30 July 2026? What happens to calls, and what replaces it?

### Takeaway
Confirmed. GitHub Models (playground, model catalog, inference API and BYOK) was retired for all customers on 2026-07-30, after closing to new customers on 2026-06-16 and brownouts on 16 and 23 July 2026. The specific endpoint SEFGH calls, `models.inference.ai.azure.com`, had already been deprecated on 2025-07-17 with support removal scheduled for 2025-10-17, and on 2026-10-26 the hostname no longer resolves in DNS. GitHub names Microsoft Foundry (and GitHub Copilot for on-GitHub workflows) as the alternatives; it publishes no error code.

### Cited Findings
- **2025-07-17**: GitHub deprecated the Azure endpoint `https://models.inference.ai.azure.com` for GitHub Models inference and embeddings, told users to move to the GitHub Models API at `https://models.github.ai` (launched 2025-05-15), and said support would be removed on **2025-10-17** (requests kept working temporarily in the meantime). — [GitHub Changelog, "Deprecation of Azure endpoint for GitHub Models", 2025-07-17](https://github.blog/changelog/2025-07-17-deprecation-of-azure-endpoint-for-github-models/)
- **2026-06-16**: GitHub announced it is retiring GitHub Models; organizations and enterprises that had never used it lost access (free and paid plans), while existing active users kept the playground, API and models for the time being. — [GitHub Changelog, "GitHub Models is no longer available to new customers", 2026-06-16](https://github.blog/changelog/2026-06-16-github-models-is-no-longer-available-to-new-customers/)
- **2026-07-01**: GitHub set the full retirement date of **2026-07-30**, after which the playground, model catalog, inference API and BYOK would be unavailable to every customer, including existing ones with active usage; brownouts (requests temporarily returning errors) were scheduled for **2026-07-16 and 2026-07-23**. The post names no endpoint hostnames and no error codes. — [GitHub Changelog, "GitHub Models is being fully retired on July 30, 2026", 2026-07-01](https://github.blog/changelog/2026-07-01-github-models-is-being-fully-retired-on-july-30-2026/)
- **2026-07-30**: GitHub confirmed the retirement: playground, catalog, inference API and BYOK no longer available to any customer. Recommended alternatives: Microsoft Foundry (https://ai.azure.com/) for a broad model catalog for new and existing projects, and GitHub Copilot for AI workflows on GitHub. No error code or HTTP behaviour is stated. — [GitHub Changelog, "GitHub Models is now retired", 2026-07-30](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/)
- GitHub Docs now states: "As of July 30, 2026, GitHub Models has been fully retired." It points to Azure AI Foundry for model access and GitHub Copilot for on-GitHub AI workflows, and does not mention either endpoint hostname. — [GitHub Docs, GitHub Models](https://docs.github.com/en/github-models)
- Probe (2026-10-26): `models.inference.ai.azure.com` returns **NXDOMAIN** ("Non-existent domain") from the local resolver, and `curl` fails with "Could not resolve host". A call therefore fails before any HTTP status: Node `fetch` throws a network `TypeError`, Go's `net/http` returns a "no such host" error. — probe from this machine; no GitHub page documents this
- Probe (2026-10-26): `models.github.ai` still resolves to a GitHub load balancer (alias of `glb-db52c2cf8be544.github.com`, 140.82.112.21), but an unauthenticated POST to `/inference/chat/completions` and GETs to `/inference/chat/completions` and `/catalog/models` all return **HTTP 200, `Content-Type: text/plain`, body `OK`**: a placeholder, not a chat-completion JSON. Authenticated behaviour was not tested. — probe; no GitHub page documents this
- SEFGH code still targets the retired Azure hostname: `src/lib/ai/github.js` line 7 (`API_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions'`, Bearer `GITHUB_TOKEN`) and `backend/internal/aiprovider/provider.go` line 20 (`DefaultEndpoint`). `backend/README.md` documents `GITHUB_TOKEN` as the GitHub Models credential for the AI routes. — local source (this worktree)
- Secondary context only: a third-party issue opened 2026-08-11 reports that calls "hard-fail" after the retirement, with no specific HTTP code observed. — [qte77/gha-issue-triage issue #110](https://github.com/qte77/gha-issue-triage/issues/110)

### Inferences
- The live site's AI chat, chat titles and search suggestions cannot be working today through GitHub Models. They have certainly been broken since 2026-07-30, and possibly since 2025-10-17 if GitHub enforced the Azure-endpoint removal on schedule (not verified).
- Because the hostname does not resolve, SEFGH's handlers see a network exception, not an HTTP error. Whether the UI shows a clean error depends on how `src/lib/ai/github.js` and `aiprovider` handle thrown fetch/dial errors; that should be checked and, under AGENTS.md, recorded in `docs/bug-register.md` (this research task did not edit it).
- Simply switching to `models.github.ai` is not a fix: the whole service is retired and the host currently answers `200 OK` text, which a client that only checks the status code could misread as success.
- What SEFGH needs to change: choose a new provider (GitHub points to Microsoft Foundry; an existing OpenAI/Anthropic key path may also exist, since `backend/cmd/api/ai_wiring_test.go` sets `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`), then change the endpoint, credential variable, model names and request/response mapping in both `src/lib/ai/github.js` and `backend/internal/aiprovider/provider.go`, plus the `contracts/ai-chat` fixtures, in one owner-approved contract change. Because this is a live outage rather than a security/privacy/data-loss bug, the "fix each bug once" rule in AGENTS.md means the owner should decide whether the fix lands in Next.js now or waits for the Go cutover. Do not simply delete `GITHUB_TOKEN`: `src/lib/github-api.js` and `src/app/api/trending/refresh/route.js` also send it to the GitHub REST API; only its `models` permission is now useless.
- "GitHub Copilot APIs" are named by GitHub as a product for AI workflows on GitHub, not as a drop-in inference API for a third-party website; no primary page found here offers Copilot as a replacement chat-completions endpoint for SEFGH.

### Gaps
- No GitHub page documents the HTTP status or error body returned after retirement; the DNS failure and the `200 OK` placeholder are observations from one machine and one resolver on 2026-10-26, unauthenticated.
- Not verified whether `models.inference.ai.azure.com` stopped serving on 2025-10-17 or only at the 2026 retirement.
- Microsoft Foundry's model list, pricing, authentication and endpoint format were not researched (out of scope; Microsoft pages, not GitHub's).

## Claim 2: Did GitHub on 2026-06-30 limit stargazer and watcher listing to admins and collaborators? Does it affect GraphQL `stargazers` and `stargazerCount`?

### Takeaway
Partly true. 2026-06-30 is the date of the **announcement** ("upcoming" restrictions, no exact date); the REST docs say the restriction came in **July 2026**, and the 2026-09-04 changelog describes it as already done. The REST listing endpoints for stargazers and watchers are limited to admins and collaborators, `/users/{username}/subscriptions` is deprecated, and three UI views are affected. No primary source mentions GraphQL; the GraphQL reference carries no notice on `stargazers` or `stargazerCount`. Anonymous REST listing now returns 401, while repository star counts remain public.

### Cited Findings
- **2026-06-30** changelog (titled as upcoming restrictions): the Notifications team would "soon" restrict access; `/repos/{owner}/{repo}/stargazers` (List stargazers) and `/repos/{owner}/{repo}/subscribers` (List watchers) limited to admins and collaborators; `/users/{username}/subscriptions` deprecated, returning empty responses during the deprecation period and removed in a later phase; UI views `/stargazers`, `/stargazers/you_know` and `/watchers` also affected. Reason given: the public lists were misused to harvest user data for spam. Callers may receive empty responses or 403 Forbidden. No effective date, no GraphQL mention, no replacement named. — [GitHub Changelog, "Upcoming access restrictions to public API endpoints and UI views", 2026-06-30](https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/)
- REST starring reference: the notice says the access restrictions are introduced in July 2026 and that stargazer listing endpoints are limited to admins and collaborators; it gives no exact day and lists only 200 and 422 status codes for List stargazers. — [GitHub Docs, REST API endpoints for starring](https://docs.github.com/en/rest/activity/starring?apiVersion=2026-03-10)
- REST watching reference: the subscribers/subscriptions listing endpoints are limited to admins and collaborators, and the "repositories watched by a user" endpoint is deprecated. — [GitHub Docs, REST API endpoints for watching](https://docs.github.com/en/rest/activity/watching) (seen via search snippet; page not fetched in full)
- **2026-09-04** changelog: says that earlier in 2026 the stargazer listing endpoints were restricted to admins and collaborators for privacy, i.e. the restriction is in effect. — [GitHub Changelog, 2026-09-04](https://github.blog/changelog/2026-09-04-new-api-endpoint-provides-privacy-safe-star-history-data/)
- GitHub engineering blog (2026-10-14, Taylor Cuilty and Sarita Iyer): callers without the required permission could get an empty response or 403; gives no effective date and does not mention GraphQL. — [GitHub Blog, "From 2,500 requests to 24: Rebuilding star history without the stargazers"](https://github.blog/engineering/architecture-optimization/from-2500-requests-to-24-rebuilding-star-history-without-the-stargazers/)
- GraphQL reference, `Starrable` interface: `stargazers` is described as a list of users who starred the object and `stargazerCount` as a count of stargazers; there is **no** notice of access restrictions, deprecation or 2026 changes. — [GitHub Docs, GraphQL Activity reference](https://docs.github.com/en/graphql/reference/activity)
- Probe (anonymous, API version 2026-03-10): `GET /repos/react/react/stargazers` and `GET /repos/react/react/subscribers` return **401** with message "Requires authentication"; `GET /repos/react/react` returns 200 with `stargazers_count` 251869, `watchers_count` 251869, `subscribers_count` 6610. (`facebook/react` now answers 301 to `/repositories/10270250`, i.e. the repository was transferred to `react/react`.) — probe
- SEFGH uses only counts: GraphQL `stargazerCount` in `backend/internal/reposync/worker.go` (line 292) and `backend/internal/reposync/queries.go`; no code in `src/`, `backend/` or `scripts/` calls the REST stargazer or subscriber listing endpoints. — local source

### Inferences
- The claim's date is the announcement date, not the enforcement date; "July 2026" is the most precise effective date GitHub publishes.
- Counts (`stargazers_count`, `subscribers_count`, GraphQL `stargazerCount`) are not described as restricted and the REST counts were still public in the probe, so SEFGH's current trending/sync code is not affected.
- The planned pipeline must not depend on listing stargazers (including the `application/vnd.github.star+json` timestamped listing) for history; use the star history endpoint (Claim 3) or daily count snapshots.
- Unauthenticated callers get 401; an authenticated non-collaborator may get 403 or an empty list per GitHub, so any code that lists stargazers should treat empty, 401 and 403 as "not available".
- Repository transfers return 301 to `/repositories/{id}`; tracking repositories by numeric ID and following redirects keeps a star-history pipeline robust. (Note `backend/README.md` says the signed-out read transport refuses redirects; that may surface for transferred repositories.)

### Gaps
- Exact effective day of the restriction: not published.
- GraphQL `Repository.stargazers` / `watchers` connections were not tested live (GraphQL needs a token, and this task used none). Whether they are restricted is unconfirmed; GitHub documents nothing either way.
- Behaviour for an authenticated non-collaborator (403 vs empty list) was not tested.

## Claim 3: Did GitHub add `GET /repos/{owner}/{repo}/stargazers/history` (2026-09-04) returning daily counts grouped by week, up to 30 weeks per page? Authentication and rate-limit cost?

### Takeaway
Confirmed. The changelog of 2026-09-04 announces a privacy-safe star history endpoint; the REST reference documents `GET /repos/{owner}/{repo}/stargazers/history` returning calendar weeks (newest first) with per-day counts, at most 30 weeks per page. The docs state no permissions or rate-limit cost; a probe shows it works anonymously on a public repository and costs one `core` request per page.

### Cited Findings
- **2026-09-04** changelog "New API endpoint provides privacy-safe star history data": track star growth over time without exposing stargazer identities; retrieve historical star counts with timestamps; links to the "Get repository star history" docs at API version 2026-03-10. It does not state path, shape, auth or rate limits. — [GitHub Changelog, 2026-09-04](https://github.blog/changelog/2026-09-04-new-api-endpoint-provides-privacy-safe-star-history-data/)
- REST reference "Get repository star history": `GET /repos/{owner}/{repo}/stargazers/history`; returns repository stars grouped by calendar weeks, most recent first; pages go backward toward the repository's creation week; weeks with no stars are returned with zero counts; `per_page` default 30, **maximum 30**; `page` default 1 (the page also says "max 100" for `page`, which looks inconsistent); response is an array (maxItems 30) of `{ week: integer, total: integer, days: integer[] }`, with `days` starting on Sunday; week and day boundaries are not guaranteed to align with UTC; status codes 200 and 422 (validation failed, or endpoint spammed). No fine-grained token or GitHub App permission is listed, and no rate-limit note. — [GitHub Docs, REST API endpoints for starring (2026-03-10)](https://docs.github.com/en/rest/activity/starring?apiVersion=2026-03-10#get-repository-star-history)
- GitHub engineering blog (2026-10-14): the endpoint returns up to 30 weeks of daily star counts per request with no identities; pagination maps `page`/`per_page` to a date range by calendar week; response shape follows the weekly commit activity endpoint; rebuilding `react/react` star history fell from about 2,511 requests to about 24. No auth or rate-limit details. — [GitHub Blog, "From 2,500 requests to 24"](https://github.blog/engineering/architecture-optimization/from-2500-requests-to-24-rebuilding-star-history-without-the-stargazers/)
- Probe (anonymous, `X-GitHub-Api-Version: 2026-03-10`): `GET /repos/react/react/stargazers/history?per_page=1` returned **200** with `[{"week":1792886400,"total":122,"days":[107,15,0,0,0,0,0]}]`. `1792886400` is Sunday 2026-10-25 00:00 UTC; the current week is partial. Response header `x-github-api-version-selected: 2026-03-10`; `X-RateLimit-Resource: core`, `X-RateLimit-Limit: 60` (anonymous), `X-RateLimit-Used` rose by 1. — probe

### Inferences
- The claim is accurate in every stated detail (path, date, daily-in-weekly grouping, 30 weeks per page).
- Authentication: not required for public repositories (probe); authenticated calls would use the normal 5,000/hour core limit. One page = one core request, so a full backfill costs about ceil(repo age in weeks / 30) requests per repository, and a daily refresh costs one request per repository.
- What SEFGH's planned pipeline should do: use this endpoint for backfill and periodic refresh instead of reconstructing history from stargazer listings; send `X-GitHub-Api-Version: 2026-03-10`; store `week` as the reported Unix timestamp rather than assuming UTC day boundaries; treat the newest week as partial and overwrite it on refresh; handle 422; key rows by repository ID because of transfers. Daily `stargazers_count` snapshots remain a valid cross-check.

### Gaps
- No documented rate-limit cost, secondary-limit behaviour, required token permissions for private repositories, or caching/freshness (how quickly today's stars appear).
- The `days` values are per-day new stars; whether unstars are subtracted (net vs gross) is not stated in the pages read.

## Claim 4: Is GitHub's synchronous SBOM export endpoint retired after 2026-11-13, and what replaces it?

### Takeaway
Confirmed. On 2026-05-12 GitHub deprecated the synchronous `GET /repos/{owner}/{repo}/dependency-graph/sbom` and scheduled its removal for 2026-11-13 (18 days from today); the REST docs mark it as closing down and inaccessible after that date. The replacement is the asynchronous pair `generate-report` then `fetch-report/{sbom_uuid}`. SEFGH does not call any SBOM endpoint today.

### Cited Findings
- **2026-05-12** changelog "Synchronous SBOM API deprecated": the older synchronous API is deprecated and slated for removal in six months, on **2026-11-13**; integrations should switch to `/{owner}/{repo}/dependency-graph/sbom/generate-report`, which returns a URL to poll until the SBOM is computed, after which it is downloadable and cached. — [GitHub Changelog, 2026-05-12](https://github.blog/changelog/2026-05-12-synchronous-sbom-api-deprecated/)
- Related **2026-04-14** changelog announcing that SBOM exports are computed asynchronously. — [GitHub Changelog, "SBOM exports are now computed asynchronously", 2026-04-14](https://github.blog/changelog/2026-04-14-sbom-exports-are-now-computed-asynchronously/) (seen via search; not fetched in full)
- REST reference: `GET /repos/{owner}/{repo}/dependency-graph/sbom` is marked closing down and not accessible after November 13, 2026 (returns SPDX JSON, 200/403/404 while it lasts). Replacements: `GET /repos/{owner}/{repo}/dependency-graph/sbom/generate-report` (201 with an `sbom_url`) and `GET /repos/{owner}/{repo}/dependency-graph/sbom/fetch-report/{sbom_uuid}` (202 while processing; 302 redirect to a temporary download URL; the SBOM may be retained up to one week). Headers shown: Bearer token, `X-GitHub-Api-Version: 2026-03-10`. — [GitHub Docs, REST API endpoints for SBOMs](https://docs.github.com/en/rest/dependency-graph/sboms)
- No reference to `dependency-graph` or `sbom` exists in `src/`, `backend/` or `scripts/`. — local source

### Inferences
- "Retired after 2026-11-13" matches the docs' wording; the changelog says removal is on 2026-11-13, so treat 13 November as the cut-off day itself.
- No change is needed on the live site. If the pipeline ever adds SBOM/dependency data, it must use the async flow (start job, poll for 202 → 302, follow the redirect without forwarding the Authorization header to the download host).

### Gaps
- A search-result summary of the 2026-04-14 post said asynchronous SBOMs are available only for HEAD and that anonymous users get one concurrent request per repository; these details were not confirmed by fetching the post.

## Claim 5: Which Go versions does Vercel's Go runtime support in 2026; is Go 1.27 supported; is the runtime still beta?

### Takeaway
The Go runtime is still **Beta on all plans** (docs updated 2026-08-11). Vercel's docs list no supported versions: the version comes from the `go` directive in the root `go.mod` (a `toolchain` directive overrides it), with the latest supported version as fallback. Vercel's own builder source supports Go 1.13 through **1.27** (newest entry 1.27.1) and downloads other patch releases on demand, so Go 1.27 is supported. Go 1.27.0 was released 2026-08-19; the latest is 1.27.3 (2026-10-19, `crypto/x509` security fixes).

### Cited Findings
- Vercel docs "Using the Go Runtime with Vercel Functions" (last updated **2026-08-11**): the Go runtime is available in Beta on all plans; the Go version is read from the `go` directive in `go.mod`, or from the `toolchain` directive when present; `go.mod` must be at the project root; with no version declared, Vercel uses the latest supported Go version; each Go version's toolchain is downloaded and cached on first use. The Go Framework Preset needs `framework: "go"`, detects `main.go`, `cmd/api/main.go` or `cmd/server/main.go`, and the server must listen on `PORT`. No version list is given. — [Vercel Docs, Go runtime](https://vercel.com/docs/functions/runtimes/go)
- Vercel docs "Runtimes" (last updated 2026-08-12) lists Go among official runtimes with no version table. — [Vercel Docs, Runtimes](https://vercel.com/docs/functions/runtimes)
- Vercel changelog **2026-04-02**, "Zero-configuration Go backend support": Go servers recognized as first-class backends; no version or beta statement. — [Vercel Changelog](https://vercel.com/changelog/zero-configuration-go-backend-support)
- Vercel builder source (`vercel/vercel`, `packages/go/src/go-helpers.ts`, `main` branch as fetched 2026-10-26): `versionMap` is ordered newest first from `1.27` (mapped to `1.27.1`) down to `1.13` (`1.13.15`); `newestSupportedGoVersion()` returns the first entry; future `go 1.N` directives map to `1.N.0`; missing toolchains are downloaded from `dl.google.com`; versions below 1.13 or a major other than 1 fail with `ERR_UNSUPPORTED_GO_VERSION`. — [vercel/vercel go-helpers.ts](https://raw.githubusercontent.com/vercel/vercel/main/packages/go/src/go-helpers.ts)
- Builder changelog: 3.4.4 added Go 1.26 and 1.25; 3.2.0 added parsing of patch versions in `go.mod` and specific toolchains; latest package version listed 10.0.1 (entries undated). — [vercel/vercel packages/go CHANGELOG.md](https://raw.githubusercontent.com/vercel/vercel/main/packages/go/CHANGELOG.md)
- Go release history: go1.25.0 released 2025-08-12; go1.26.0 2026-02-10; go1.27.0 **2026-08-19**; go1.27.1 2026-09-01; go1.27.2 2026-10-08; go1.27.3 **2026-10-19** with security fixes to `crypto/x509`. — [go.dev release history](https://go.dev/doc/devel/release)
- SEFGH: `backend/go.mod` declares `go 1.27.2`; `backend/vercel.json` sets `"framework": "go"`. — local source

### Inferences
- Go 1.27 is supported: it is the newest family in Vercel's builder map, and patch versions (1.27.2) are parsed and downloaded on demand. Because the `go` directive selects the exact toolchain, SEFGH builds with 1.27.2 today.
- Recommended changes: move to Go 1.27.3 (security fixes) by updating the `go` line or adding `toolchain go1.27.3`; make sure the Vercel project for the Go API uses `backend/` as its root directory, since `go.mod` must be at the project root (not verified in the Vercel dashboard); keep treating the runtime as Beta (no SLA implied) when planning cutovers.

### Gaps
- Vercel's public docs give no supported-version list or support policy; the evidence for 1.27 is the `main` branch of the builder source, which may run ahead of the builder deployed in production. Not verified by an actual deployment build log.
- No Vercel changelog entry announcing Go 1.27 support or a GA date for the Go runtime was found.
