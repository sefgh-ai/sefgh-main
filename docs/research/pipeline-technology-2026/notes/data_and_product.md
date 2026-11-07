# Data sources, signals and competing products for SEFGH (GitHub repository discovery)

Research date: 2026-10-26. Status: complete (resumed after an interruption; all items re-checked in this session). "Unverified" marks claims from secondary or third-party sources that I could not confirm against a primary source.

## 1. Which external data sources and APIs give cheap repository popularity, quality, dependency, security and trend signals in 2025-2026?

### Takeaway
The biggest 2026 change is GitHub's own. On 2026-06-30 GitHub restricted stargazer listing to admins and collaborators. It then shipped `GET /repos/{owner}/{repo}/stargazers/history`, which returns daily star counts, grouped by week, for public repositories. SEFGH can therefore get real "stars gained this week" from GitHub directly, at about one REST call per repository per refresh. GH Archive/BigQuery becomes optional (useful for discovering repositories, but not needed for star counts). The cheapest health and security add-ons are deps.dev (no stated quota, Scorecard, OSS-Fuzz, stars and licence, plus a BigQuery dataset) and the OpenSSF Scorecard REST API (1.3M+ repositories scanned weekly). ecosyste.ms has the richest ready-made maintenance metrics, but it now limits free use to 300 requests/hour, and its data licence is share-alike (CC BY-SA 4.0).

### Cited Findings

**GitHub: stargazers restriction and the new star-history endpoint (most important for the pipeline)**
- GitHub announced on 2026-06-30 that the stargazers API is limited to a repository's own admins and collaborators. Tokens created with no scopes stopped working even for the user's own repositories, and no scope grants access to other people's repositories — [Star History blog, 2026-07-06](https://www.star-history.com/blog/github-stargazer-api-restriction)
- The watchers endpoint (`/subscribers`) was restricted as well, and `/users/{username}/subscriptions` was deprecated (returns empty during deprecation) — [releases.sh summary (secondary)](https://releases.sh/release/rel_3bdld8fPfAxZjPqltpUB2)
- GitHub's changelog of 2026-09-04 describes a new endpoint that returns historical star counts with timestamps and no stargazer identities. It says stargazer listing endpoints had been restricted "to admins and collaborators to protect user privacy" — [GitHub changelog 2026-09-04](https://github.blog/changelog/2026-09-04-new-api-endpoint-provides-privacy-safe-star-history-data)
- Endpoint: `GET /repos/{owner}/{repo}/stargazers/history`. `per_page` defaults to 30 (max 30) and `page` to 1 (max 100). It returns an array of objects with `week`, `total` and `days[]`, giving daily counts starting Sunday. Pages move backward toward the repository's creation week, week and day boundaries are not guaranteed to be UTC, and the endpoint returns 422 when validation fails or "the endpoint has been spammed". REST API version: 2026-03-10 — [GitHub REST docs: starring](https://docs.github.com/en/rest/activity/starring?apiVersion=2026-03-10)
- According to GitHub engineering, each response covers up to 30 weeks. react/react (~251k stars) takes ~24 requests instead of ~2,511 with old stargazer pagination. Removed stars are not kept as history, and a week with unusually many stars can still be a slow query — [GitHub engineering blog, 2026-10-14](https://github.blog/engineering/architecture-optimization/from-2500-requests-to-24-rebuilding-star-history-without-the-stargazers/)
- A GitHub staff member said in the community thread (announcement 2026-08-28) that counts are "stars created on each date that remain active today", with no historical record of unstars. A user noted that cost scales with repository age rather than star count: a 2014 repository with 76 stars needed 22 requests for 647 weeks. The thread does not say whether unauthenticated calls are allowed or what the endpoint costs against the rate limit — [GitHub community discussion #206104](https://github.com/orgs/community/discussions/206104)
- Star History reports that the new endpoint returns exact daily star counts for any public repository back to its creation, and that its charts work again — [Star History blog (update Sept 2026)](https://www.star-history.com/blog/github-stargazer-api-restriction); [Star History: new API](https://www.star-history.com/blog/new-github-star-history-api)

**GitHub: rate limits, search, events, SBOM, semantic search**
- GraphQL allows 5,000 points/hour per user. App installations get 5,000 plus increments, capped at 12,500; Enterprise Cloud gets 10,000. A query's points are its connection requests divided by 100 (minimum 1). Each `first`/`last` is at most 100, and a call returns at most 500,000 nodes. Secondary limits: 100 concurrent requests, 2,000 points/minute for GraphQL (900 for REST), and 90 s of CPU per 60 s. Requests taking more than 10 s are terminated, and timeouts deduct extra points — [GitHub GraphQL rate limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api)
- REST search allows 30 requests/minute authenticated (code search 10/min) and 10/minute unauthenticated. Each search returns up to 1,000 results. Queries are limited to 256 characters (excluding qualifiers) and at most five AND/OR/NOT operators, and a timeout sets `incomplete_results` — [GitHub REST search docs](https://docs.github.com/en/rest/search/search)
- Events API changes, announced 2025-08-08 with full rollout planned for 2025-10-07: PushEvent loses commit summaries and counts, some PullRequestEvent fields are removed, `author_association` is removed from several event types, and Discussion events are added. Events were to arrive "almost immediately" instead of after up to 8 hours. The page is now labelled "Retired" and does not mention WatchEvent or ForkEvent — [GitHub changelog 2025-08-08](https://github.blog/changelog/2025-08-08-upcoming-changes-to-github-events-api-payloads/)
- SBOM export: `GET /repos/{owner}/{repo}/dependency-graph/sbom` returns SPDX JSON and works without authentication for public repositories (fine-grained token: Contents read) — [GitHub REST: SBOMs](https://docs.github.com/en/rest/dependency-graph/sboms)
- I found no documented github.com REST endpoint for "Used by"/dependents. GHES docs say GHES does not calculate dependents at all — [GitHub GHES SBOM docs](https://docs.github.com/en/enterprise-server@3.22/rest/dependency-graph/sboms)
- GitHub Innovation Graph publishes quarterly data aggregated by economy from 2020 (activity, languages, licences, topics), and only for economies with 100 or more developers. It is not per repository. The licence is reported as CC0-1.0 — [SD Times](https://sdtimes.com/softwaredev/githubs-innovation-graph-offers-ongoing-data-about-software-development/); [innovationgraph.github.com](https://innovationgraph.github.com/global-metrics/licenses)

**GH Archive and BigQuery**
- GH Archive provides the public BigQuery dataset `githubarchive` with year, month and day tables, "automatically updated every hour". Raw hourly files are at `https://data.gharchive.org/YYYY-MM-DD-H.json.gz` and start on 2011-02-12. Data since 2015-01-01 comes from the Events API. The page states no licence — [gharchive.org](https://www.gharchive.org/)
- BigQuery on-demand pricing is $6.25 per TiB scanned, with the first 1 TiB per month free. You pay for bytes processed, so columns selected matter more than WHERE filters — [Google BigQuery pricing](https://cloud.google.com/bigquery/pricing)
- Scan sizes (unverified, community guides): `SELECT *` on one GH Archive day table scans ~3 GB even with LIMIT, and about a month of data is ~225 GB — [third-party GH Archive query guide](https://download.hermesedi.duckdns.org/.hermes/hermes-agent/optional-skills/security/oss-forensics/references/github-archive-guide.md); [DEV Community: BigQuery and GitHub](https://dev.to/googlecloud/diving-into-github-with-bigquery-and-python-3gfn)
- Stars appear as `WatchEvent` in GH Archive. For 2012–2014, the `repo_stars_count` and related fields came from Timeline API snapshots, a different source from star events (unverified guide) — [third-party guide](https://download.hermesedi.duckdns.org/.hermes/hermes-agent/optional-skills/security/oss-forensics/references/github-archive-guide.md)
- In March 2026, OSS Insight's trending page was still ranking by "recent star velocity" from 10.5 billion GitHub events collected in real time. Star events were therefore flowing at least until then — [OSS Insight blog, 2026-03-24](https://ossinsight.io/blog/introducing-trending-page)

**deps.dev (Google Open Source Insights)**
- The v3 API has GetPackage, GetVersion (licences, advisories, links, attestations), GetRequirements, GetDependencies (npm, Cargo, Maven, PyPI), GetProject, GetProjectPackageVersions (max 1,500), GetAdvisory (OSV) and Query by name or hash (max 1,000). The docs state no authentication and no rate limit. Use is under the Google API ToS, clients are "expressly permitted to cache", and generated data is CC-BY 4.0. Some examples still use `/v3alpha/` — [deps.dev API v3 docs](https://docs.deps.dev/api/v3/)
- GetProject returns stars, forks and open issues (GitHub and GitLab only), licence, description, homepage, the OpenSSF Scorecard (per-check and overall 0–10) and OSS-Fuzz coverage — [deps.dev API v3 docs](https://docs.deps.dev/api/v3/)
- BigQuery dataset `bigquery-public-data.deps_dev_v1` has the tables Projects, PackageVersions, PackageVersionToProject, Dependencies, Dependents, DependencyGraphEdges, Advisories and Snapshots, each with a `*Latest` view. The docs do not state the snapshot frequency — [deps.dev BigQuery docs](https://docs.deps.dev/bigquery/)
- The full set of dependents for a package is available only through BigQuery (`DependentsLatest`) — [deps.dev blog: enumerating dependents](https://blog.deps.dev/enumerating-dependents/)

**OpenSSF Scorecard**
- Scorecard scans more than 1.3 million repositories every week. The README now says "The BigQuery public dataset is no longer available". REST API data is under CDLA-Permissive-2.0. Weekly scans omit CI-Tests, Contributors and Dependency-Update-Tool because of API cost. There are 19 checks: Binary-Artifacts, Branch-Protection, CI-Tests, CII-Best-Practices, Code-Review, Contributors, Dangerous-Workflow, Dependency-Update-Tool, Fuzzing, License, Maintained, Packaging, Pinned-Dependencies, SAST, Security-Policy, Signed-Releases, Token-Permissions, Vulnerabilities, and Webhooks (experimental) — [ossf/scorecard README](https://github.com/ossf/scorecard)
- A live call to `https://api.scorecard.dev/projects/github.com/expressjs/express` returned a result dated 2026-10-23, Scorecard v5.5.0, overall score 8.9, and 18 checks including CI-Tests and Contributors (express likely publishes via the Scorecard Action). A score of -1 means no result — [api.scorecard.dev (live response)](https://api.scorecard.dev/projects/github.com/expressjs/express)

**ecosyste.ms**
- Plans: Free, 300 requests/hour (common or polite pool); Develop, $200/month for 1,000/hour with an API key; Scale, $1,000/month for 5,000/hour with high priority. Data is CC BY-SA 4.0, with "less restrictive licences on request", and data exports are offered commercially — [ecosyste.ms pricing](https://ecosyste.ms/pricing)
- The polite pool is joined by sending a `mailto` parameter, a User-Agent containing mailto, or a `from` header. A September 2025 post explains the limits: the service was at capacity and donations no longer covered costs — [ecosyste.ms rate limiting blog, 2025-09-01](https://blog.ecosyste.ms/2025/09/01/rate-limiting-the-right-way.html); [docs.ecosyste.ms authentication](https://docs.ecosyste.ms/docs/usage/authentication/)
- Services include Packages, Repositories, Advisories, Commits, Issues, Dependabot, Docker, Open Collective, Sponsors and Timeline, plus experiments (Awesome, Papers, Science). Code is AGPL and data CC BY-SA — [docs.ecosyste.ms usage](https://docs.ecosyste.ms/docs/usage/)
- Live repos API (expressjs/express, synced 2026-10-21) includes `commit_stats`: total_commits 5,509, total_committers 348, and dds 0.36. DDS is a bus-factor-like measure (1 minus the top committer's share; my reading). It also returns `scorecard` (8.8, dated 2025-08-12, so it is stale compared with api.scorecard.dev), `funding_links`, `metadata.files` (readme/contributing/security), topics and licence. In this response `source_name` held a wrong value, so data quality issues exist — [repos.ecosyste.ms API](https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/expressjs%2Fexpress)
- Live issues API (synced 2026-10-25) returns past-year issue and PR counts, closed counts, average time to close, `maintainers` and `active_maintainers` (8 for express), bot issue and PR counts, and average comments — [issues.ecosyste.ms API](https://issues.ecosyste.ms/api/v1/hosts/GitHub/repositories/expressjs%2Fexpress)

**Libraries.io**
- Rate limit is 60 requests/minute per API key (free with registration); requests over the limit get 429. "Larger-scale access" is offered via Tidelift. The `/api/:platform/:name/dependents` endpoint exists, and project responses include `dependent_repos_count` — [libraries.io/api](https://libraries.io/api)

**OSS Insight (PingCAP)**
- Base URL `https://api.ossinsight.io/v1` (beta). No authentication; limits are 600 requests/hour per IP and 1,000 requests/minute globally. Endpoints cover collections (including hot collections and rankings), trends/repos, stargazer history, countries and orgs, and issue and PR creators. The page states no terms or licence — [OSS Insight API docs](https://ossinsight.io/docs/api)

**Hugging Face Hub (successor to Papers with Code)**
- Papers with Code was sunset around 2025-07-24/25, and its URLs redirect to Hugging Face "Trending Papers", built with Meta. Benchmark and leaderboard coverage is largely lost. Historical data is in GitHub `paperswithcode/paperswithcode-data` (secondary reporting; no official Meta statement found) — [HyperAI news](https://hyper.ai/en/news/42900); [Juejin](https://juejin.cn/post/7537593417100492809)
- A live `https://huggingface.co/api/daily_papers` response includes `githubRepo`, `githubStars`, `upvotes`, `projectPage`, `ai_summary` and `ai_keywords` for each paper — [HF daily_papers API (live)](https://huggingface.co/api/daily_papers?limit=2)
- The Hub's OpenAPI spec is at `huggingface.co/.well-known/openapi.json` — [HF Hub API docs](https://huggingface.co/docs/hub/en/api)

**Community mentions (HN, Reddit, Stack Exchange)**
- HN Algolia: base `https://hn.algolia.com/api/v1` (`/search`, `/search_by_date`), with a limit of 10,000 requests/hour per IP and at most 1,000 hits. Unverified: from client READMEs; the official page did not render — [hacker-news-api README](https://unpkg.com/hacker-news-api@2.0.0/README.md)
- Reddit Data API free tier: 100 queries/minute per OAuth client ID, for non-commercial use only. New OAuth apps need manual approval, reported as 2–4 weeks. Commercial pricing is negotiated (third-party summaries of the 2023 terms) — [socialcrawl.dev 2026 guide](https://www.socialcrawl.dev/blog/reddit-api-key-limits-alternatives-2026)
- Stack Exchange API: 300 requests/day per IP anonymous, 10,000/day with a free app key; responses include a `backoff` field (third-party aggregator) — [apis.io Stack Exchange rate limits](https://apis.io/rate-limits/stackexchange/stackexchange-rate-limits/)

### Inferences
- **Star trending design.** Run a daily GraphQL batch snapshot of `stargazerCount` for all tracked repositories, 100 repositories per `nodes(ids:)` query. Such a query has no connections, so it should cost 1 point (my reading of the point formula); 50,000 repositories would then cost about 500 points a day. Use `stargazers/history` for backfill when a repository is first added and to correct gaps. `page=1&per_page=1` returns only the current week, so one REST call per repository gives the current week's daily counts. 50,000 calls exceed one token's 5,000/hour, so history should be used selectively. Not verified by a test call.
- **Net versus gross stars.** The history endpoint counts stars still active today, which is net of later unstars and changes retroactively. GH Archive WatchEvents are gross. SEFGH's "stars this week" will differ from GH Archive-based sites, so the UI should say which it uses.
- **GH Archive is now optional.** Its remaining value is discovering newly active repositories cheaply, with no 1,000-result cap. A daily BigQuery query selecting only `type`, `repo.name` and `created_at` from one day table should scan well under the ~3 GB `SELECT *` figure, so 30 such queries a month would likely fit the free 1 TiB. This is an estimate; confirm with a `--dry_run`. The hourly JSON files can also be downloaded free without BigQuery.
- **Supabase 500 MB budget.** A row per repository per day for 50,000 repositories is ~18M rows a year. At ~40 bytes plus indexes that is likely over 0.7 GB a year, so it will not fit. Options: keep a rolling 60–90 day window or weekly aggregates in Postgres and fetch long history on demand from the GitHub endpoint, or archive to GCS/BigQuery. Rough estimate, not measured.
- **Licences shape what SEFGH may store and re-serve.** deps.dev generated data is CC-BY 4.0 (attribution), Scorecard is CDLA-Permissive-2.0, and ecosyste.ms is CC BY-SA 4.0. Share-alike may require SEFGH to release derived ecosyste.ms data under the same licence. Prefer deps.dev and Scorecard for stored signals, and use ecosyste.ms live or ask for a different licence.
- **Mentions.** HN is the most practical source (free and searchable by URL). Reddit's non-commercial restriction and approval process make it risky for a public product.

### Gaps
- Whether `stargazers/history` needs authentication, and its rate-limit cost, is not documented. Test with an unscoped token and with no token.
- Whether WatchEvent still appears in the public Events API, and therefore in GH Archive, after the 2026-06-30 privacy restriction could not be verified. Check with `SELECT COUNT(*) FROM githubarchive.day.20261025 WHERE type='WatchEvent'`, which should be cheap because it reads only the `type` column.
- The exact bytes scanned per GH Archive day or month table in 2026 is unverified.
- Software Heritage API limits could not be retrieved: archive.softwareheritage.org and docs.softwareheritage.org returned Anubis bot-protection "Access Denied" pages.
- deps.dev freshness and snapshot frequency are not documented, and whether deps.dev has an undocumented quota is unknown.
- Libraries.io data licence and ownership status (Tidelift/Sonar) were not confirmed this session.
- The HN Algolia limit is unverified against Algolia's own documentation.
- Repository custom properties (org-defined metadata) were not researched. They are org-administered and probably low value for public discovery.

## 2. Which quality and health signals are used in practice, and which are cheap to compute for tens of thousands of repositories?

### Takeaway
The commonly used signals are maintenance activity, release cadence, issue and PR responsiveness, bus factor, Scorecard checks, dependents count and licence. Most can come from data that already exists: one GraphQL batch, plus the Scorecard API, deps.dev, and optionally ecosyste.ms. SEFGH would only have to compute issue response time and bus factor itself, and those are the expensive ones. Since 2025–2026, AI bots and fake stars have distorted raw activity and star counts, so signals must filter bots and detect anomalies.

### Cited Findings
- The CHAOSS Starter Project Health model has four metrics: Time to First Response, Bus Factor (the smallest number of people making 50% of contributions), Release Frequency, and Change Request Closure Ratio. One older newsletter lists Time to Close as the fourth — [CHAOSS starter model](https://www.chaoss.community/starter-project-health-metrics-model/); [CHAOSS newsletter Feb 2023](https://chaoss.community/?p=4799)
- Andrew Nesbitt (2026-05-27) argues that agents and cheap generation make CHAOSS activity counts measure "how much of the cheap thing is being pointed at a project". He says AI triage bots push Time to First Response to seconds, agents appear as bursts of new contributors, auto-merge makes absent maintainers look active, and Libyears rewards abandoned packages. Artifact-based measures (test coverage, upstream dependencies) hold up better — [nesbitt.io: CHAOSS metrics in 2026](https://nesbitt.io/2026/05/27/chaoss-metrics-in-2026.html)
- Scorecard's Maintained check and the 18 other checks give a 0–10 score per repository, free via API and refreshed weekly for 1.3M+ repositories — [ossf/scorecard](https://github.com/ossf/scorecard); [api.scorecard.dev live response](https://api.scorecard.dev/projects/github.com/expressjs/express)
- Snyk's former Advisor framed package health as Popularity, Maintenance, Security and Community. The standalone site was sunset in January 2026, and the metrics moved to security.snyk.io for npm, PyPI and Go (announcement dated 2026-02-02) — [Snyk blog: Advisor to security database](https://snyk.io/de/blog/snyk-advisor-security-database/)
- ecosyste.ms already computes past-year issue and PR counts, average time to close, active maintainers, bot PR counts and DDS (commit concentration) for each repository — [issues.ecosyste.ms](https://issues.ecosyste.ms/api/v1/hosts/GitHub/repositories/expressjs%2Fexpress); [repos.ecosyste.ms](https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/expressjs%2Fexpress)
- Fake stars: StarScout (CMU, NC State and Socket; ICSE 2026) found ~6 million suspected fake stars from 2019–2024, surging in 2024. Most promoted short-lived phishing or malware repositories, and the boost lasted under about two months — [arXiv 2412.13459](https://arxiv.org/pdf/2412.13459); [ICSE 2026 listing](https://conf.researchr.org/details/icse-2026/icse-2026-research-track/14/Six-Million-Suspected-Fake-Stars-on-GitHub-A-Growing-Spiral-of-Popularity-Contests)
- The same work reportedly covered 18,617 repositories and ~301,000 accounts, and 90.42% of flagged repositories had been deleted by January 2025 (secondary summary) — [Peerlist summary](https://peerlist.io/saxenashikhil/articles/inside-githubs-fake-star-economy)
- deps.dev gives dependents for packages, not repositories, through BigQuery `Dependents`/`DependentsLatest`, mapped to repositories via `PackageVersionToProject` — [deps.dev BigQuery](https://docs.deps.dev/bigquery/)

### Inferences
Cost tiers for about 50,000 repositories (my assessment, based on the limits cited in section 1):
- **Cheap (one GraphQL batch, 100 repositories per query, roughly 1–2 points each when only scalar fields and `first:1` connections are used; a 0.01-point connection rounds up to the 1-point minimum):** stars, forks, watchers, open issues and PRs (totalCount), `pushedAt`, `createdAt`, `isArchived`, `isFork`, licence (`licenseInfo.spdxId`), topics, primary language, latest release date (`releases(first:1)`), funding links, presence of SECURITY.md or CONTRIBUTING.md (`object(expression:)`).
- **Cheap from external APIs (one call per repository, or bulk):** Scorecard overall and per-check scores (api.scorecard.dev; whether it has a rate limit is undocumented), deps.dev project and advisories, package dependents (deps.dev BigQuery in bulk, or ecosyste.ms packages within the quota).
- **Medium:** commit activity over the last 90 days (`history(since:)` totalCount on the default branch, in the same batch but a heavier query), release cadence (`releases(last:10)` dates), contributor concentration (REST `/contributors`, one call per repository; or ecosyste.ms DDS).
- **Expensive to compute yourself:** issue and PR time to first human response (needs issue timelines and bot filtering; take it from ecosyste.ms instead), bus factor over a time window, and running the Scorecard CLI yourself (many API calls per repository).
- **Gatekeepers:** "Is this maintained?" can be a transparent rule rather than an opaque score, for example archived = no; last human commit under N days; a release or closed issue within the last year; Scorecard Maintained at least X. The rule avoids AI-inflated activity counts by preferring human-review signals (merged PRs with a review) and excluding bot accounts.
- **Fake-star guard for trending:** flag star bursts that are out of proportion to forks, watchers, issues and contributors, or on new repositories with little code. Without stargazer identities (now restricted), StarScout-style account analysis is impossible, so SEFGH can only use aggregate anomaly heuristics.

### Gaps
- No published benchmark gives the exact GraphQL point cost of a combined health query per 100 repositories. It should be measured with `rateLimit { cost }` in the query.
- I found no study validating any composite "health score" against outcomes such as abandonment. Snyk's four-pillar framing is industry practice, not evidence.

## 3. Which competitors and adjacent products exist as of 2026, what do they offer, and where is the gap SEFGH could own?

### Takeaway
The market splits into four groups:
1. Trend boards: GitHub Trending, Trendshift and OSS Insight rank star momentum but do little search or selection.
2. Single-repository understanding tools: DeepWiki and Google Code Wiki explain a repository once you already know it.
3. Package-intelligence services: deps.dev, ecosyste.ms, Libraries.io and Snyk score packages but are not discovery-first.
4. AI answer engines and GitHub Copilot: they answer "best library for X" without grounding, and studies show popularity bias and hallucinated packages.

No product found combines natural-language discovery, live trend data, "is this maintained?" and "alternatives to X / compare" with citations, or exposes that to AI agents over MCP. That combination is SEFGH's opening.

### Cited Findings
- **GitHub:** Semantic issue search in Copilot Chat is generally available on all Copilot plans (2026-05-20), and the Copilot coding agent has a semantic code search tool. No natural-language repository discovery feature was found — [GitHub changelog 2026-05-20](https://github.blog/changelog/2026-05-20-semantic-issue-search-in-copilot-chat/); [GitHub blog search roundup](https://github.blog/search/Search/)
- **GitHub Agent finder** (2026-06-17, all Copilot plans): Copilot searches an index of MCP servers, skills, agents and tools and returns ranked matches. It implements the open Agentic Resource Discovery (ARD) spec, built with Google, GoDaddy, Hugging Face and Microsoft. Registries are GitHub's curated catalog (github.com/agentfinder) or a private registry — [GitHub changelog 2026-06-17](https://github.blog/changelog/2026-06-17-agent-finder-for-github-copilot-now-available/)
- **DeepWiki (Cognition):** the MCP server launched 2025-05-22, free with no login, offering `read_wiki_structure`, `read_wiki_contents` and `ask_question`. Public repositories are indexed on demand at deepwiki.com — [Cognition blog](https://cognition.com/blog/deepwiki-mcp-server). The index is said to exceed 50,000 repositories (third-party, unverified) — [Codersera 2026 guide](https://codersera.com/blog/deepwiki-complete-developer-guide-2026/)
- **Google Code Wiki:** public preview 2025-11-13 at codewiki.google. Gemini generates and regenerates wikis for public repositories, with chat, code-linked answers and diagrams. A Gemini CLI extension for private repositories is waitlisted — [Google Developers blog](https://developers.googleblog.com/introducing-code-wiki-accelerating-your-code-understanding/); [The Register, 2025-11-17](https://www.theregister.com/2025/11/17/google_previews_code_wiki/)
- **Sourcegraph:** still advertises public code search across 1M+ repositories (June 2026) — [Sourcegraph page](https://sourcegraph.com/webinars/building-a-software-factory-06032026). Cody Free and Pro reportedly ended in July 2025, and the enterprise plan starts at $16K a year (third-party, unverified) — [getunblocked.com](https://getunblocked.com/blog/sourcegraph-alternatives/)
- **grep.app:** acquired by Vercel (announced November 2024), indexes 500k+ public Git repositories — [Vercel blog](https://vercel.com/blog/vercel-acquires-grep)
- **Context7 (Upstash):** MCP serving up-to-date library documentation, hosted at `mcp.context7.com/mcp`, with tools `resolve-library-id` and `query-docs`. An API key raises limits (third-party, October 2026) — [Developers Digest](https://www.developersdigest.tech/mcp-servers/upstash-context7); [Upstash launch post](https://upstash.com/blog/context7-mcp)
- **OSS Insight:** trending ranked by "recent star velocity and activity events" with Today, Week and Month and language filters, plus per-repository analytics (contributors, commit history, community and issue health, forks). It reports 10.5B events. On 2026-03-24, 7 of the top 8 trending repositories were AI-agent projects — [OSS Insight blog](https://ossinsight.io/blog/introducing-trending-page)
- **Trendshift:** a "daily momentum ranking" over day, week, month and year, with developer and topic pages, a live X-mentions feed, GitHub Trending snapshots, best-rank badges and repository submission. It claims "180K+ monthly visitors" and sells flat-rate advertising — [trendshift.io](https://trendshift.io/)
- **Snyk Advisor:** the standalone site was sunset in January 2026 and its metrics moved into security.snyk.io (npm, PyPI, Go) — [Snyk blog](https://snyk.io/de/blog/snyk-advisor-security-database/)
- **OpenAlternative:** a community directory of open-source alternatives to proprietary software. It ranks by GitHub metrics (stars, forks, contributors, age, activity) plus manual adjustments, with 400+ tools by an undated count — [The DropTimes](https://www.thedroptimes.com/node/45705); [kocpc](https://en.kocpc.com.tw/?p=14427)
- **daily.dev:** a personalised feed from 2,000+ sources with tools and open-source projects (self-reported). Its Public API v1 (February 2026) is for Plus subscribers only. A daily.dev post points users elsewhere for checking whether a project is still active — [daily.dev blog](https://daily.dev/blog/best-developer-discovery-platforms-2026/); [Peerlist post on API](https://peerlist.io/saxenashikhil/articles/you-asked-for-an-api-we-finally-built-one)
- **AI answer engines, bias:** across 8 LLMs, models used NumPy unnecessarily in up to 48% of cases and chose Python in 58% of high-performance tasks (Rust never). Recommended and actually used libraries were poorly consistent — [arXiv 2503.17181](https://arxiv.org/pdf/2503.17181). LLMs could not correct popularity bias in library recommendation — [arXiv 2501.10313](https://arxiv.org/abs/2501.10313v1)
- **AI answer engines, hallucination:** in USENIX Security 2025, hallucinated packages averaged at least 5.2% for commercial models and 21.7% for open-source models, and 19.7% of samples had at least one hallucinated package ("slopsquatting") — [Dark Reading](https://www.darkreading.com/application-security/ai-code-tools-widely-hallucinate-packages); [CSA research note 2026-04-19](https://labs.cloudsecurityalliance.org/research/csa-research-note-slopsquatting-ai-supply-chain-20260419/)
- **What developers say (Stack Overflow 2025 survey):** 84% use or plan to use AI tools, and 46% distrust the accuracy of AI output (31% in 2024). 66% are frustrated by answers that are "almost right". Technical documentation (68%) remains the top learning resource, and GitHub is used by 66.9% as a community — [Stack Overflow survey 2025, AI](https://survey.stackoverflow.co/2025/ai); [Stack Overflow press release](https://stackoverflow.co/company/press/archive/stack-overflow-2025-developer-survey/)

### Inferences
- **Gap 1: grounded selection.** Developers distrust AI answers, and LLMs show popularity bias and hallucinate packages. A "best library for X" answer limited to indexed, verified-existing repositories, with cited live signals (last release, Scorecard, dependents, stars this week), addresses a documented weakness.
- **Gap 2: "alternatives to X" and comparison across all of GitHub.** OpenAlternative covers only proprietary-to-OSS swaps, and trend boards have no comparison view. A side-by-side page combining star history (new endpoint), maintenance, security and licence does not appear to exist anywhere as one free page (not exhaustively verified).
- **Gap 3: discovery over MCP.** DeepWiki (understand one repository), Context7 (library docs) and Agent finder (MCP and skills only) are not repository-discovery engines. An SEFGH MCP server could complement them, and listing it in an ARD-compatible registry could reach Copilot users. Whether third-party registries can publish to github.com/agentfinder is unknown.
- **Where not to compete:** per-repository wikis and code Q&A (DeepWiki and Code Wiki are free and well funded) and raw trend leaderboards (Trendshift and OSS Insight have years of history). SEFGH should link to DeepWiki for "understand this repo".
- **Trend boards are dominated by AI-agent repositories** (OSS Insight, March 2026). Category filters ("non-AI", by ecosystem) and fake-star filtering may differentiate SEFGH's trending page.

### Gaps
- I found no independent user research on what developers value in repository discovery tools specifically. Evidence above is indirect (survey trust data, product framing).
- I did not verify GitHub Explore or Topics changes in 2025–2026, or whether GitHub Trending's algorithm changed. It still exists, since Trendshift snapshots it.
- No current data on Perplexity or ChatGPT search behaviour for "best library for X" queries. The bias evidence is from model studies, not answer engines.
- Product Hunt-style launches and Awesome lists were not researched in depth. ecosyste.ms has an "Awesome" experiment (docs.ecosyste.ms) that could index awesome lists, but I did not test it.
- Libraries.io and OpenSauced status were not confirmed; a search found nothing about OpenSauced shutting down.

## 4. What 2025-2026 launches target open-source discovery or repository intelligence?

### Takeaway
2025–2026 launches concentrated on AI understanding of a repository (DeepWiki MCP, Google Code Wiki), AI-agent resource discovery (GitHub Agent finder and ARD), and privacy-driven API changes (stargazer restriction and star history). Classic package-health tooling consolidated: Snyk Advisor was folded into Snyk, Papers with Code into Hugging Face, and ecosyste.ms moved to paid rate limits.

### Cited Findings
| Date | Launch or change | Source |
|---|---|---|
| 2025-05-22 | DeepWiki MCP server, free, no auth | [Cognition](https://cognition.com/blog/deepwiki-mcp-server) |
| ~2025-07-24/25 | Papers with Code sunset, replaced by HF Trending Papers (secondary) | [HyperAI](https://hyper.ai/en/news/42900) |
| 2025-09-01 | ecosyste.ms introduces rate limits and paid plans | [ecosyste.ms blog](https://blog.ecosyste.ms/2025/09/01/rate-limiting-the-right-way.html); [pricing](https://ecosyste.ms/pricing) |
| 2025-10-07 (planned) | GitHub Events API payload trim; near-immediate events | [GitHub changelog](https://github.blog/changelog/2025-08-08-upcoming-changes-to-github-events-api-payloads/) |
| 2025-11-13 | Google Code Wiki public preview | [Google Developers blog](https://developers.googleblog.com/introducing-code-wiki-accelerating-your-code-understanding/) |
| Jan–Feb 2026 | Snyk Advisor sunset, metrics moved to security.snyk.io | [Snyk blog](https://snyk.io/de/blog/snyk-advisor-security-database/) |
| Feb 2026 | daily.dev Public API v1 (Plus only) | [Peerlist](https://peerlist.io/saxenashikhil/articles/you-asked-for-an-api-we-finally-built-one) |
| 2026-03-24 | OSS Insight data-driven trending page | [OSS Insight blog](https://ossinsight.io/blog/introducing-trending-page) |
| 2026-05-20 | GitHub semantic issue search in Copilot Chat (GA) | [GitHub changelog](https://github.blog/changelog/2026-05-20-semantic-issue-search-in-copilot-chat/) |
| 2026-06-17 | GitHub Agent finder plus Agentic Resource Discovery spec | [GitHub changelog](https://github.blog/changelog/2026-06-17-agent-finder-for-github-copilot-now-available/) |
| 2026-06-30 | GitHub restricts stargazer and watcher listing | [Star History](https://www.star-history.com/blog/github-stargazer-api-restriction) |
| 2026-08-28 / 2026-09-04 | GitHub star-history endpoint | [Community #206104](https://github.com/orgs/community/discussions/206104); [changelog](https://github.blog/changelog/2026-09-04-new-api-endpoint-provides-privacy-safe-star-history-data) |
| 2026-10-14 | GitHub engineering write-up of the star-history design | [GitHub blog](https://github.blog/engineering/architecture-optimization/from-2500-requests-to-24-rebuilding-star-history-without-the-stargazers/) |

- An unnamed "GitHub discovery app" surfacing hidden projects by commit frequency and issue resolution was reported in March 2026. Unverified: no primary source or app name — [Anavem](https://www.anavem.com/en/news/tech/github-discovery-app-surfaces-hidden-open-source-projects)
- Fake-star research reached ICSE 2026 (StarScout) — [ICSE 2026](https://conf.researchr.org/details/icse-2026/icse-2026-research-track/14/Six-Million-Suspected-Fake-Stars-on-GitHub-A-Growing-Spiral-of-Popularity-Contests)

### Inferences
- The new star-history endpoint makes accurate star-momentum data a commodity: Star History, Trendshift and OSS Insight can all use it. SEFGH's differentiation must come from search, selection and health, not trending alone.
- The ARD spec and Agent finder show that GitHub sees "discovery for agents" as a product category. An SEFGH MCP server fits that trend.

### Gaps
- No evidence found of a 2025–2026 launch that does semantic, natural-language GitHub repository discovery as its main product. This search was not exhaustive; Show HN and Product Hunt were not systematically checked.

## 5. Which product features could SEFGH build on its planned pipeline, and what data does each need?

### Takeaway
SEFGH's planned pipeline (sliced discovery, daily stars, README and file reads, LLM summary, embeddings, hybrid search) can carry about ten differentiated features. The highest-value, lowest-cost ones are real star-momentum trending with fake-star guards, an "Is this maintained?" card, a health and security panel, and "alternatives to X / similar repos". The most strategic is an MCP server for AI agents. Each item below lists the data it needs. Costs are inferences from the limits in section 1.

### Cited Findings
The data availability behind each feature is cited in sections 1–3. The key supports:
- Star history per day — [GitHub REST starring](https://docs.github.com/en/rest/activity/starring?apiVersion=2026-03-10)
- Scorecard checks — [api.scorecard.dev](https://api.scorecard.dev/projects/github.com/expressjs/express)
- deps.dev project, advisories and dependents — [deps.dev API](https://docs.deps.dev/api/v3/); [deps.dev BigQuery](https://docs.deps.dev/bigquery/)
- ecosyste.ms issue and maintainer stats — [issues.ecosyste.ms](https://issues.ecosyste.ms/api/v1/hosts/GitHub/repositories/expressjs%2Fexpress)
- SBOM — [GitHub SBOM REST](https://docs.github.com/en/rest/dependency-graph/sboms)
- HF paper–repository links — [HF daily_papers](https://huggingface.co/api/daily_papers?limit=2)
- LLM bias and hallucination evidence — [arXiv 2503.17181](https://arxiv.org/pdf/2503.17181); [Dark Reading](https://www.darkreading.com/application-security/ai-code-tools-widely-hallucinate-packages)

### Inferences
Feature shortlist, ordered by value per effort:

1. **Real trending: stars gained per day, week and month, with filters**
   - Data: daily GraphQL `stargazerCount` snapshots (100 repositories per query); `stargazers/history` for backfill when a repository is added; language, topic and category fields.
   - Guards: an anomaly flag (star burst against forks, watchers and contributors; repository age); a "non-AI" or category filter.
   - Storage: a rolling window in Supabase, older history fetched on demand.
2. **"Is this maintained?" card with a transparent rule**
   - Data: `pushedAt`, `isArchived`, last release date, default-branch commits in the last 90 days, past-year closed issues and PRs, active maintainers and bot share (ecosyste.ms issues, or own GraphQL), Scorecard Maintained check.
   - Shows each criterion as pass or fail rather than one opaque number, which matters given bot-inflated metrics.
3. **Health and security panel**
   - Data: Scorecard overall and per-check scores (weekly, CDLA-P-2.0); deps.dev advisories (OSV), OSS-Fuzz and licence; SECURITY.md presence; Signed-Releases.
   - Cheap: one or two calls per repository per week.
4. **"Alternatives to X" and "Similar repositories"**
   - Data: embeddings of README and summary, topics, and package keywords; nearest neighbours restricted to the same ecosystem or category and re-ranked by health and momentum. Optional co-occurrence signals from awesome lists (ecosyste.ms Awesome) and HN threads.
   - Uses the planned embedding index directly.
5. **Side-by-side comparison (2–4 repositories)**
   - Data: star-history curves; release cadence (last 10 release dates); issue close times; Scorecard; dependents (deps.dev/ecosyste.ms); downloads (ecosyste.ms packages); licence; commit concentration (DDS or top-contributor share).
   - Shareable URLs could serve SEO for "X vs Y" queries.
6. **Grounded "best library for X" AI answers**
   - The chat may only recommend repositories in SEFGH's index, must cite live signals, and checks package existence (deps.dev Query/GetPackage) before naming an install command.
   - Directly counters documented LLM popularity bias and package hallucination.
7. **Licence filter and compatibility hints**
   - Data: `licenseInfo.spdxId` (GraphQL); SBOM endpoint for dependency licences (SPDX, no auth for public repositories); a static compatibility matrix (e.g. permissive vs copyleft for "use in a closed-source product").
   - Must be labelled informational, not legal advice.
8. **MCP server for AI agents**
   - Tools such as `search_repos`, `get_repo_health`, `compare_repos`, `find_alternatives` and `trending`, reusing the Go API.
   - Complements DeepWiki and Context7 (link out to them for understanding and docs). Consider ARD-compatible registry metadata.
9. **Research-code discovery**
   - Data: HF `daily_papers` (`githubRepo`, `githubStars`, `upvotes`, `ai_keywords`) to tag repositories as paper-linked and feed a "trending research code" view, filling part of the Papers with Code gap.
10. **Community buzz signal**
    - Data: HN Algolia search by repository URL (stories and points over the last 7 or 30 days).
    - Avoid Reddit for a public product unless commercial terms are obtained.

Pipeline budget notes (estimates):
- At 50,000 repositories, the daily GraphQL snapshot is about 500 points (10% of one token-hour).
- Weekly Scorecard and deps.dev refreshes are about 100,000 external calls a week with no GitHub quota impact (whether those APIs have quotas is undocumented).
- ecosyste.ms free (300/hour, about 7,200/day) covers only on-demand lookups, not bulk refresh. Bulk use needs the $200/month plan or a commercial or licence arrangement.
- BigQuery (deps.dev Dependents, GH Archive discovery) fits the 1 TiB/month free tier if queries select few columns. The $300 credit is about 48 TiB of on-demand scanning at $6.25/TiB.

### Gaps
- No user research was done to rank these features by demand. The ordering is the researcher's judgement, based on gaps in competing products and data cost.
- Exact GraphQL point costs, the auth and cost of `stargazers/history`, and BigQuery scan sizes must be measured before committing to schedules (see the section 1 gaps).
- Legal review of licence-compatibility wording and of re-serving CC BY-SA data was not done.
