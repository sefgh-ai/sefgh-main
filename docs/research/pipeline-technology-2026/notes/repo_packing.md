# Repository packing and code understanding: "repomix but better" for SEFGH (research notes, 2026-10-26)

Scope: tools and techniques (2025-2026) that turn a GitHub repository into a compact, LLM- and search-ready representation, and a concrete, deterministic "repository digest" SEFGH can build in its Go worker (standard library only, no cgo) without running untrusted code. Facts carry a source; anything without one is marked as inference or listed under Gaps. Nothing was installed or run. Version and star data come from the GitHub REST API and npm registry, queried on 2026-10-26.

SEFGH context these notes assume (from the repository's own docs, not external sources): `docs/architecture/lld.md` §6.2 already proposes an "Enrich" stage that replaces cloning and repomix. It reads the README via `GET /repos/{owner}/{repo}/readme` with ETag, takes top-level files and languages from GraphQL (20 repositories per query), and hashes the result. §6.4 embeds "Summary + Labels + README + File Structure", cut at 12,000 code points. `docs/coordination.md` records R-199 (High): `npx -y repomix@latest`, unpinned, per repository, on a machine that holds a service-role key.

---

## 1. What does repomix do today, and what are its risks for a hosted batch pipeline?

### Takeaway
Repomix's latest release is 1.18.1 (npm, 2026-09-21; MIT; Node >= 22; 28 direct runtime dependencies). It packs a whole local or remote repository into one XML, Markdown, JSON or plain-text file. It offers optional Tree-sitter "compress" (signatures only), Secretlint secret screening, gpt-tokenizer token counts, an MCP server and Claude skill generation. In 2026 it shipped fixes for code execution via a remote repo's config, argument injection, a secret-scan bypass, and git-config keys that name executables. That record shows how much attack surface a "pack everything" tool has when it runs unpinned on untrusted repositories next to production credentials. Repomix is also built for one repository and one human. SEFGH needs a small, stable description of each of many thousands of repositories, which a full pack is not.

### Cited Findings
- **Version and date.** npm `dist-tags.latest` is 1.18.1, published 2026-09-21T08:27Z. Earlier 2026 releases: 1.11.1 (01-14), 1.12.0 (02-26), 1.13.0 (03-23), 1.14.0 (04-26), 1.14.1 (05-26), 1.15.0 (06-18), 1.16.0 (06-29), 1.16.1 (07-11), 1.17.0 (07-21), 1.18.0 (08-04). Licence MIT; `engines.node >=22.0.0`. The 28 direct dependencies include `web-tree-sitter`, `@repomix/tree-sitter-wasms`, `@secretlint/core`, `gpt-tokenizer`, `@modelcontextprotocol/sdk`, `handlebars`, `tar`, `globby` and `jiti` — [npm registry metadata](https://registry.npmjs.org/repomix). The GitHub release page dates 1.18.0 "08 Aug" while npm says 2026-08-04, so the release note and the npm publish differ by four days — [Repomix releases](https://github.com/yamadashy/repomix/releases)
- **Popularity.** 29,028 stars, MIT, TypeScript, last push 2026-10-25 — GitHub REST API `/repos/yamadashy/repomix` (queried 2026-10-26)
- **Output formats.** XML (default), Markdown, JSON (`--style json`) and plain text — [Repomix README](https://github.com/yamadashy/repomix)
- **`--compress`.** Uses Tree-sitter to keep "essential signatures" (classes, functions, interfaces) and drop implementation bodies. It is marked experimental. The MCP docs claim it "Reduces token usage by ~70%", with no benchmark shown — [Repomix README](https://github.com/yamadashy/repomix). Release 1.16.1 fixed a WebAssembly memory leak from unreleased Tree-sitter trees "which matters for `--compress` on large repos". Since 1.16.0, a file that fails to parse falls back to uncompressed output instead of aborting — [Repomix releases](https://github.com/yamadashy/repomix/releases)
- **Remote mode.** `--remote` will "Clone and pack a remote repository" and "Git must be installed". `--remote-branch` accepts a branch, tag or commit. Since 1.15.0, a bare `owner/repo` is treated as remote when no local path of that name exists — [Repomix remote docs](https://repomix.com/guide/remote-repository-processing); [Repomix releases](https://github.com/yamadashy/repomix/releases)
- **Remote config trust.** Since 1.13.0 (2026-03-23), config files in remote repositories are skipped by default "to prevent code execution from a malicious repo's `repomix.config.ts`/`.js`". Opt-in is `--remote-trust-config`. The docs warn that it "grants the remote repository's config the same trust as your own machine", and that the confirmation prompt is skipped in non-interactive shells such as CI — [Repomix releases](https://github.com/yamadashy/repomix/releases); [Repomix remote docs](https://repomix.com/guide/remote-repository-processing)
- **2026 security fixes.**
  - 1.14.1: argument injection through `--remote-branch` (GHSA-9mm9-rqhj-j5mx), and a secret-scan bypass in MCP `attach_packed_output` (GHSA-hwpp-h97w-2h3j).
  - 1.18.0: MCP `--sandbox` mode, described as "application-level confinement ... not an OS-level sandbox"; credentials redacted from logged URLs; cloud metadata endpoints refused as clone targets.
  - 1.18.1: repository-level `.git/config` keys that name executables (e.g. `core.fsmonitor`) are no longer honoured when Repomix runs git in a target directory (GHSA-4p5g-gh74-q524).

  — [Repomix releases](https://github.com/yamadashy/repomix/releases)
- **File processors.** 1.17.0 added `input.processors`, which "run external commands" before packing. They are default-deny, CLI only, and disabled for the library API, the MCP server and repomix.com — [Repomix releases](https://github.com/yamadashy/repomix/releases); [Repomix README](https://github.com/yamadashy/repomix)
- **Secret check.** Secretlint runs by default and leaves out files "matching known credential formats". It can be disabled with `--no-security-check` — [Repomix README](https://github.com/yamadashy/repomix)
- **Token counting.** Default encoding `o200k_base`, "Powered by gpt-tokenizer". `--token-budget` (since 1.15.0) exits non-zero when the output exceeds N tokens; `--token-count-tree` gives a per-directory breakdown. 1.14.0 replaced tiktoken WASM with gpt-tokenizer and reports about 2.4× faster packing; 1.14.1 added a disk cache for token counts — [Repomix README](https://github.com/yamadashy/repomix); [Repomix releases](https://github.com/yamadashy/repomix/releases)
- **MCP server.** Tools: `pack_codebase`, `attach_packed_output`, `pack_remote_repository`, `read_repomix_output`, `grep_repomix_output`, plus sandbox-only `file_system_read_file` and `file_system_read_directory`. Other surfaces: Docker image `ghcr.io/yamadashy/repomix`; `--skill-generate` writes Claude Agent Skills (`SKILL.md` plus references); `runCli()`/`pack()` are mentioned as a library API — [Repomix README](https://github.com/yamadashy/repomix)
- **npm supply-chain context.** On 2025-09-23 CISA warned of the self-replicating "Shai-Hulud" npm worm, which compromised more than 500 packages. It scanned environments for credentials, targeted GitHub personal access tokens and AWS/GCP/Azure keys, and exfiltrated them. CISA recommended pinning dependencies and reviewing transitive dependencies through lock files — [CISA alert](https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem). Check Point reported a second wave, "Shai-Hulud 2.0", in November 2025 — [Check Point Research](https://blog.checkpoint.com/research/shai-hulud-2-0-inside-the-second-coming-the-most-aggressive-npm-supply-chain-attack-of-2025/)

### Inferences
- **Risks of the current invocation, `npx -y repomix@latest --remote <repo>`, in a batch pipeline:**
  - It resolves "latest" from npm on every run. That pulls a fresh tree of 28 direct dependencies, plus their transitive ones, with no lockfile and no pinning, on a machine that holds a Supabase service-role key. This is exactly the exposure Shai-Hulud exploited.
  - It shells out to `git` against attacker-controlled repositories. Repomix's own 2026 advisories (argument injection, executable git-config keys) show that this boundary is fragile.
  - Its `--sandbox` is an MCP tool-surface restriction, not OS isolation.
  - The output is a whole-repository dump, so cost scales with repository size. SEFGH then throws most of it away when it cuts to 12,000 characters.
  - It is Node-only. A Go worker could call it only through a subprocess, which breaks the "Go standard library only" rule in spirit.
- **What repomix packs that SEFGH needs.** For discovery and search, SEFGH needs only the README, metadata, manifests and the shape of the file tree. Repomix's main value, the full source with optional signature compression, is aimed at "chat with this codebase" and largely does not apply.
- **Remote fetching.** The `tar` dependency suggests Repomix may also download archives for remote repositories, but no doc reviewed confirms an archive path. The docs say only that git must be installed (see Gaps).

### Gaps
- Whether `--remote` uses `git clone --depth 1`, an archive download, or both with a fallback was not confirmed. The docs say only "Clone" and "Git must be installed".
- No independent benchmark of `--compress` (the "~70%" claim) or of the claimed 2.4× speed-up was found.

---

## 2. Alternatives: approach, maturity, licence; which are libraries, services, or callable from a backend?

### Takeaway
The "packer" tools (gitingest, code2prompt, yek, files-to-prompt, repo2txt, onefilellm) all do the same thing as repomix with different trade-offs. None is Go, and every remote-capable one clones or downloads the repository.

The "code understanding" techniques are more relevant ideas than dependencies:
- aider's tree-sitter repo map ranks symbols by graph importance under a token budget.
- universal-ctags and SCIP index symbols.

The hosted "wiki" services (DeepWiki, Google Code Wiki, Context7, GitMCP) are LLM-facing services with no documented SLA or terms for bulk backend use. GitHub's official MCP server (Go, MIT) is a wrapper over the same GitHub API SEFGH can call directly.

### Cited Findings

**Packers.** Stars, licence and latest release are from the GitHub REST API on 2026-10-26.
- **gitingest** (coderamp-labs/gitingest): 16,015 stars, MIT, Python, latest release v0.3.1 (2025-07-31), repository still active (pushed 2026-10-24).
  - Output is summary + tree + content (`digest.txt`).
  - Python API: `ingest()` / `ingest_async()` return `(summary, tree, content)`.
  - Self-hostable FastAPI server (`pip install gitingest[server]`, Docker). gitingest.com has no documented public API — [gitingest README](https://github.com/coderamp-labs/gitingest)
  - Remote clone is `git clone --single-branch --no-checkout --depth=1`. A subpath uses `--filter=blob:none --sparse`. Submodules are fetched with `git submodule update --init --recursive --depth=1` when enabled — [gitingest clone.py](https://raw.githubusercontent.com/coderamp-labs/gitingest/main/src/gitingest/clone.py)
- **code2prompt** (mufeedvh/code2prompt): 7,738 stars, MIT, Rust, v4.2.0 (2025-12-11).
  - Handlebars templates; can include git diff, log and branch comparisons.
  - Python SDK `code2prompt-rs`, an MCP server mode and a TUI.
  - Token counts are estimated per file plus template overhead — [code2prompt README](https://github.com/mufeedvh/code2prompt)
- **yek** (moved to mohsen1/yek): 2,475 stars, MIT, Rust, v0.25.5 (2026-06-29).
  - Ranks files partly by git history (`git_boost_max`) and places "more important files ... last".
  - Caps output with `--max-size` (default 10 MB) or `--tokens`.
  - Local inputs only. The author claims it is 230× faster than Repomix on the Next.js repository (5.19 s vs 22.24 min; self-reported) — [yek README](https://github.com/bodo-run/yek)
- **files-to-prompt** (simonw): 2,797 stars, Apache-2.0, Python, last release 0.6 (2025-02-19); no push since then — GitHub REST API. Its features were not reviewed in this session.
- **repo2txt** (abinthomasonline): 1,839 stars, TypeScript web tool, "100% Browser-Based".
  - Filters by extension and `.gitignore`; a token gives higher rate limits — [repo2txt README](https://github.com/abinthomasonline/repo2txt)
  - The README says MIT, but GitHub's licence detection returns none. This conflict is unresolved — GitHub REST API.
- **onefilellm** (jimmc414): 2,023 stars, MIT, Python, no releases.
  - Aggregates GitHub repos, issues and PRs, arXiv, DOI and PMID papers, YouTube and web pages into one XML file (`<onefilellm_output>`).
  - Uses `GITHUB_TOKEN` "for GitHub API access" — [onefilellm README](https://github.com/jimmc414/onefilellm)

**Structure and code-intelligence techniques**
- **aider repo map** (aider is Apache-2.0, 49,759 stars, v0.86.0 on 2025-08-09, last push 2026-05-22 — GitHub REST API).
  - It is "a compact overview of the entire repository" listing important classes and functions with signatures.
  - A "graph ranking algorithm" runs over a file dependency graph and keeps the identifiers "most often referenced by other portions of the code". `--map-tokens` "defaults to 1k tokens" — [aider repo map docs](https://aider.chat/docs/repomap.html)
  - The 2023-10-22 post explains that aider uses tree-sitter with "modified versions of the tags.scm files" to find definitions and references. It replaced universal-ctags to get richer signatures and to avoid a system install — [aider blog](https://aider.chat/2023/10/22/repomap.html)
- **universal-ctags**: GPL-2.0, C, 7,302 stars, v6.2.1 (2025-10-25), active — GitHub REST API.
- **SCIP** (now scip-code/scip): Apache-2.0, Go, 846 stars, v0.10.0 (2026-09-03).
  - A "language-agnostic protocol for indexing source code" for go-to-definition and find-references.
  - Indexes come from language-specific indexers: scip-java, scip-typescript, scip-python, rust-analyzer, scip-clang and others — [SCIP README](https://github.com/scip-code/scip)

**Hosted wiki and documentation services**
- **DeepWiki** (Cognition).
  - Launch date conflicts between sources: Cognition's post says swapping github.com for deepwiki.com gives a wiki for any repo, with more than 50,000 top public repos indexed at launch; secondary coverage dates the launch 2025-04-25 (smol.ai) or 2025-05-05.
  - Public repos are free; private repos need a Devin account — [Cognition blog](https://cognition.com/blog/deepwiki); [smol.ai issue 25-04-25](https://news.smol.ai/frozen-issues/25-04-25-cognition-deepwiki.html)
  - DeepWiki MCP: `https://mcp.deepwiki.com/mcp` (streamable HTTP; `/sse` is legacy). Tools: `read_wiki_structure`, `read_wiki_contents`, `ask_question`. "Free, remote", no authentication, public repositories only. The page mentions no rate limits or terms — [Devin docs: DeepWiki MCP](https://docs.devin.ai/work-with-devin/deepwiki-mcp.md)
- **deepwiki-open** (AsyncFuncAI): 18,280 stars, MIT, Python, no releases, active (pushed 2026-10-23). **OpenDeepWiki** (AIDotNet): 3,640 stars, MIT, C#, v2.0.6 (2026-09-08) — GitHub REST API.
- **Google Code Wiki.** Launched in public preview on 2025-11-13 at codewiki.google for public repositories. It generates a wiki that is regenerated after changes, plus a Gemini chat and diagrams. A Gemini CLI extension for private code is on a waitlist — [Google Developers Blog](https://developers.googleblog.com/en/introducing-code-wiki-accelerating-your-code-understanding/); [InfoQ](https://www.infoq.com/news/2025/11/google-code-wiki)
- **Context7** (upstash/context7): 63,709 stars, MIT; latest tag `@upstash/context7-sdk@0.6.0` (2026-10-23).
  - Only the MCP server, CLI and SDK are open. The "API backend, parsing engine, and crawling engine are private".
  - Libraries are "community-contributed". MCP tools are `resolve-library-id` and `query-docs`. A free API key is "recommended" for higher rate limits. A REST API is documented on context7.com — [Context7 README](https://github.com/upstash/context7)
- **GitMCP** (idosal/git-mcp): 8,491 stars, Apache-2.0, last push 2026-05-08.
  - Remote MCP at `gitmcp.io/{owner}/{repo}`. Reads `llms.txt` first, then AI-optimised docs, then README.
  - Tools: `fetch_<repo>_documentation`, `search_<repo>_documentation`, `search_<repo>_code` (via GitHub code search) and `fetch_url_content`. No authentication; self-hostable — [GitMCP README](https://github.com/idosal/git-mcp)
- **GitHub MCP server** (github/github-mcp-server): 33,970 stars, MIT, Go, v2.0.3 (2026-10-21).
  - Remote at `https://api.githubcopilot.com/mcp/`, or local in Docker or as a binary. Toolsets include `repos`; tools include `get_file_contents` and `get_repository_tree` (with `recursive` and `path_filter`); `--read-only` skips write tools.
  - Auth is OAuth or a PAT.
  - Importable as Go module `github.com/github/github-mcp-server/v2`, but "the existing `v2.0.0` tag can't be used as a Go module", so a pseudo-version is needed — [github-mcp-server README](https://github.com/github/github-mcp-server)

**Go building blocks** (GitHub REST API, 2026-10-26)
- go-git: Apache-2.0, 7,830 stars, v5.19.3 (2026-10-04).
- go-enry: Apache-2.0, 634 stars, v2.9.6 (2026-04-04).
- gitleaks: MIT, 30,343 stars, v8.30.1 (2026-03-21).
- wazero (now wazero/wazero): Apache-2.0, 6,436 stars, v1.12.0 (2026-05-29).
- secretlint: MIT, 1,468 stars, v13.1.0 (2026-10-26).

### Inferences
- **How each can be used from a Go backend:**

  | Kind | Tools | Use from Go |
  |---|---|---|
  | Library | gitingest (Python), code2prompt (Rust and Python), Repomix (Node `pack()`), aider (Python app, not a library), SCIP (protocol plus Go bindings), go-git, go-enry, gitleaks, wazero | Only the last four are Go-callable without a subprocess |
  | CLI | Repomix, yek, code2prompt, files-to-prompt, onefilellm, ctags | Subprocess only |
  | Service | DeepWiki, Code Wiki, Context7, GitMCP, repo2txt, gitingest.com | Over HTTP or MCP |
  | Thin API wrapper | GitHub MCP server | Same GitHub REST/GraphQL API SEFGH can call directly |

- **None of the hosted services should be a production input** for a free-tier discovery site. None documents rate limits, an SLA, or terms that allow bulk crawling. Their output is LLM-generated text about third-party repositories with unclear reuse rights. Context7 covers libraries, not arbitrary repositories. DeepWiki and Code Wiki cover only repositories they have indexed. A link out ("Open in DeepWiki / Code Wiki") is a cheap UI feature that needs no API.
- **GitMCP's source order is a useful signal for SEFGH:** `llms.txt` (author-curated LLM summary), then docs, then README.
- **The transferable idea from aider** is ranking by references under a fixed token budget. For repository discovery, the analogue is ranking README sections, manifests and directories by information value, not ranking code symbols.
- **SCIP is not suitable** for bulk untrusted indexing. Precise indexers such as scip-java and scip-typescript generally need the project's build or dependency setup. This is inference: their docs were not reviewed.
- **universal-ctags** would mean running a GPL-2.0 C binary through `os/exec`. It is technically possible without cgo, but it is an external binary to sandbox and distribute.

### Gaps
- Exact remote-fetch behaviour, current maturity and functions of files-to-prompt and repo2txt (beyond the README) were not reviewed.
- No public, documented API or terms were found for Google Code Wiki. DeepWiki MCP's rate limits and terms for backend use are undocumented.
- Whether SCIP indexers require a project build or dependency installation was not verified from their docs.
- deepwiki-open and OpenDeepWiki internals (clone method, embedding model) were not reviewed.

---

## 3. What can GitHub's APIs provide without cloning, and at what rate-limit cost per repository?

### Takeaway
Everything a discovery digest needs is available without cloning:
- metadata, description, topics, licence, languages
- the README (raw, with ETag)
- root and nested tree listings, with per-entry `language`, `isGenerated`, `size` and `lineCount` in GraphQL
- arbitrary small files through GraphQL `object(expression: "HEAD:path")`
- a community-health profile

GraphQL connection-based pricing makes a batched query over 20 repositories cost about 1 point, so a two-query digest costs roughly 0.1 point per repository (inference from the documented formula; measure it with `rateLimit { cost }`). REST costs about 2-3 requests per repository. Conditional README refreshes that return 304 are free when authorised.

### Cited Findings
- **GraphQL primary limit.**
  - 5,000 points/hour per user token; 10,000 for an Enterprise Cloud-owned GitHub App acting for a user.
  - GitHub App installations get 5,000/hour plus 50 per repository or user beyond 20, up to 12,500 (10,000 on Enterprise Cloud).
  - `GITHUB_TOKEN` in Actions gets 1,000/hour per repository — [GitHub GraphQL rate limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api)
- **GraphQL cost formula.** Add up the requests needed for each unique connection, assuming every `first`/`last` limit is reached; "divide the total by 100 and round to the nearest whole number"; the minimum is 1 point. `rateLimit { cost limit remaining used resetAt }` reports the cost. Every connection needs `first`/`last` between 1 and 100; at most 500,000 total nodes per call — same source.
- **GraphQL secondary limits.**
  - No more than 100 concurrent requests (shared with REST).
  - No more than 2,000 points per minute to the GraphQL endpoint; a query costs 1 secondary point, a mutation 5.
  - No more than 90 s of CPU per 60 s of real time, of which at most 60 s may be GraphQL.
  - Requests over 10 s are terminated with 502/504 and cost extra primary points for the next hour — same source.
- **REST limits.**
  - 60 requests/hour unauthenticated; 5,000/hour authenticated; GitHub App installations from 5,000 up to 12,500 (15,000 on Enterprise Cloud).
  - Secondary: 100 concurrent requests and 900 points per minute per endpoint; GET costs 1 point, writes 5 — [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- **Conditional requests.** "Making a conditional request does not count against your primary rate limit if a `304` response is returned and the request was correctly authorized with an `Authorization` header." GitHub advises serial, not concurrent, requests — [GitHub REST best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api)
- **README endpoint.** `GET /repos/{owner}/{repo}/readme` (optional `ref`) returns 200, 304 or 404 in raw or HTML media types. `GET /repos/{owner}/{repo}/readme/{dir}` reads a directory README — [GitHub REST contents](https://docs.github.com/en/rest/repos/contents)
- **README location.** GitHub surfaces a README from `.github`, the root, or `docs`, in that order of precedence. "any content beyond 500 KiB will be truncated" when viewed on GitHub — [About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- **Contents API limits.**
  - Files up to 1 MB get all features; 1-100 MB only raw or object media types; over 100 MB is unsupported.
  - A directory lists at most 1,000 files; use the Git Trees API for more.
  - Tarball and zipball endpoints (`GET /repos/{owner}/{repo}/tarball/{ref}`) return a 302 redirect to a download URL — [GitHub REST contents](https://docs.github.com/en/rest/repos/contents)
- **Recursive git tree.** "The limit for the tree array is 100,000 entries with a maximum size of 7 MB when using the recursive parameter". `truncated: true` means incomplete; the workaround is non-recursive, subtree-by-subtree fetching. Entries carry `path`, `mode`, `type`, `sha` and `size` — [GitHub REST git trees](https://docs.github.com/en/rest/git/trees)
- **GraphQL Blob and TreeEntry.**
  - `Blob.text` is "UTF8 text data or null if the Blob is binary", with `byteSize`, `isBinary` and `isTruncated` ("Indicates whether the contents is truncated").
  - `TreeEntry` exposes `name`, `path`, `type`, `mode`, `size`, `extension`, `lineCount`, `language`, `isGenerated`, `submodule` and `object`.

  — [GitHub GraphQL Git reference](https://docs.github.com/en/graphql/reference/git)
- **Community profile.** `GET /repos/{owner}/{repo}/community/profile` returns `health_percentage`, the description, a documentation link, and `files` (code of conduct, licence, README, CONTRIBUTING, issue and PR templates). "The repository cannot be a fork" — [GitHub REST community metrics](https://docs.github.com/en/rest/metrics/community)
- **SBOM export.**
  - The synchronous `GET /repos/{owner}/{repo}/dependency-graph/sbom` (SPDX JSON) is deprecated and "will not be accessible after November 13, 2026".
  - The replacement is asynchronous: `.../sbom/generate-report` returns 201 with a URL; `.../sbom/fetch-report/{uuid}` returns 202 until a 302 redirects to the file.
  - Needs at least read access; reports are retained for up to one week; API version header `2026-03-10` — [GitHub REST SBOM](https://docs.github.com/en/rest/dependency-graph/sboms)

### Inferences
- **Per-repository call plan.**

  | Step | Call | Cost |
  |---|---|---|
  | G1, batch of 20 | Aliased `repository(owner:,name:)` blocks with `description`, `homepageUrl`, `repositoryTopics(first:20)`, `licenseInfo{spdxId}`, `primaryLanguage`, `languages(first:10, orderBy SIZE)`, `isFork`, `isArchived`, `pushedAt`, `defaultBranchRef{name target{oid}}`, and `object(expression:"HEAD:"){... on Tree{entries{name type extension size language{name} isGenerated object{... on Tree{entries{name type}}}}}}` for root plus second-level names | Connections: 20 × topics + 20 × languages = 40 requests → 40/100 = 0.4 → rounds to 0 → minimum **1 point** |
  | G2, batch of 20 | Exact `object(expression:"HEAD:<path>")` Blob reads for the files chosen from G1: README (applying GitHub's `.github` → root → `docs` precedence), `llms.txt`, and up to four manifests (`package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, `composer.json`, `pom.xml`, `*.csproj`, `pubspec.yaml`, `Gemfile`, `setup.cfg`), each with `text byteSize isTruncated` | No connections → **1 point** |
  | R1, REST, refresh only | `GET /readme` with `If-None-Match` | 304 is free when authorised |

  - The G1 and G2 costs follow from the documented formula. They must be confirmed with `rateLimit { cost }`, because nested `object` and `entries` are not connections and may be priced differently.
  - Under these assumptions, about 2 points per 20 repositories is around 0.1 point per repository. The 5,000-point budget would then cover about 50,000 repositories per hour per token on paper. In practice, the 10-second timeout and the GraphQL CPU-time secondary limit will bind first. The batch size must be tuned, and blob reads kept small: skip blobs over about 64 KiB and use `byteSize` from G1 to decide.
- **REST-only plan:** README + recursive tree + community profile is about 3 requests per repository, or about 1,650 repositories per hour per token. Re-runs are cheaper because README 304s are free.
- **Do not use the recursive tree by default.**
  - Monorepos can return up to 7 MB of JSON per call or be truncated at 100,000 entries.
  - The depth-2 GraphQL listing, with `isGenerated` and `language` per entry, describes the shape of almost any repository, because GitHub runs Linguist on its side. That avoids reimplementing Linguist (go-enry) in SEFGH.
- **Do not build on the SBOM export.** The synchronous endpoint is retired three weeks from today (2026-11-13). The asynchronous flow needs polling, and the SBOM is heavier than the dependency names a discovery digest needs. Manifest files read through G2 give direct dependency names deterministically.
- **The community profile is optional** (one REST call, not for forks). Its `health_percentage` and the presence of CONTRIBUTING and a code of conduct are quality and ranking signals, not embedding text.

### Gaps
- The maximum size `Blob.text` returns before `isTruncated` becomes true is not documented on the reference page.
- Whether tarball/codeload downloads count against the REST primary limit beyond the initial 302 request is not documented in the pages reviewed.
- The real point cost of G1 and G2 shapes (nested `object`, `entries`) was not measured. It must be measured on the live API with `rateLimit { cost }`.
- GraphQL `dependencyGraphManifests` (a preview) was not reviewed.

---

## 4. Which repository signals best describe a repository for semantic search and LLM summarisation? Is there published evidence?

### Takeaway
The published evidence is thin and mostly older, but it consistently favours natural-language signals: README text, description and topics, with metadata and structure as additions. Code helps for similarity, but at much higher cost. No 2024-2026 study was found that benchmarks which fields a repository-level search embedding should contain under modern embedding models. Indirect evidence (Anthropic's Contextual Retrieval) supports prefixing an LLM-written context or summary to the text being embedded. A hard practical constraint dominates: embedding-model input limits (2,048 tokens for gemini-embedding-001, 8,192 for gemini-embedding-2).

### Cited Findings
- **RepoPal** (Zhang, Lo, Kochhar, Xia, Li, Sun; SANER 2017) detects similar repositories from README similarity plus stargazer co-starring and time signals. On 1,000 Java repositories it achieved a higher success rate, precision and confidence than CLAN, a code-based approach, and it works across languages — [SMU record](https://ink.library.smu.edu.sg/sis_research/3615); [RepoPal repo](https://github.com/Qualia-Li/RepoPal)
- **Repo2Vec** (Islam et al., arXiv 2107.05112, 2021) embeds metadata, directory structure and source code into one vector. It reports 93% precision vs 78% for earlier approaches on 1,013 repositories, with nearly twice as many "strongly similar" results — [Repo2Vec arXiv](https://arxiv.org/pdf/2107.05112)
- **LEGION** (Dang et al., EASE 2024) uses pre-trained language models for GitHub topic recommendation with a distribution-balanced loss. It reports up to 26% improvement over vanilla PTMs, and about 20% better precision and 5% better F1 than the state-of-the-art baseline — [EASE 2024 listing](https://conf.researchr.org/details/ease-2024/ease-2024-papers/1/LEGION-Harnessing-Pre-trained-Language-Models-for-GitHub-Topic-Recommendations-with-); [LEGION repo](https://github.com/RISE-BKAI/LEGION)
- **NAICS-GH** (Xu, Quispe; arXiv 2607.06505, 2026-07-07) labels 6,588 repositories by industry sector.
  - The retrieve-and-verify pipeline uses BAAI/bge-large-en embeddings, FAISS retrieval and GPT-4.1 rubric scoring, narrowing about 1.37M repositories to 31,178 candidate pairs. Labels reach 96.98% precision on a 2,421-repository human-validated sample.
  - RoBERTa-large reached 86.45% F1 — [arXiv 2607.06505](https://arxiv.org/abs/2607.06505)
  - A search snippet says the embeddings use the first 1,000 characters of the raw README. That detail was not confirmed in the abstract (see Gaps).
- **Contextual Retrieval** (Anthropic, 2024-09-19) prepends 50-100 tokens of LLM-generated context to each chunk before embedding and BM25 indexing. It reduced the top-20 retrieval failure rate by 35% (embeddings alone), 49% (with contextual BM25) and 67% (with reranking) — [Anthropic: Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
- **Hierarchical summarisation.** A 2025 paper on repository-level understanding via LLM summaries reports gains for code search and bug localisation (Pass@10 0.89, Recall@10 0.33 on a Jira dataset). It is code retrieval, not repository discovery — [ResearchGate record](https://www.researchgate.net/publication/393434398_Repository-Level_Code_Understanding_by_LLMs_via_Hierarchical_Summarization_Improving_Code_Search_and_Bug_Localization)
- **Embedding input limits.**
  - gemini-embedding-001 has a "2048 maximum input token length" and 3,072 default dimensions (Matryoshka; 768, 1,536 or 3,072 recommended) — [Google Developers Blog: Gemini Embedding GA](https://developers.googleblog.com/en/gemini-embedding-available-gemini-api/)
  - gemini-embedding-2 accepts 8,192 input tokens with 128-3,072 output dimensions — [Gemini API model page](https://ai.google.dev/gemini-api/docs/models/gemini-embedding-2); [Vertex AI docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/embedding-2)
- **llms.txt.** GitMCP treats `llms.txt` as the top-priority documentation source when present, falling back to README — [GitMCP README](https://github.com/idosal/git-mcp)

### Inferences
- **Recommended signal ranking for SEFGH's embedding text**, from most to least useful per token:
  1. The GitHub description and topics: author-written and short.
  2. An LLM summary and fixed labels, when present (D4 in the LLD). This is analogous to Contextual Retrieval's prefix.
  3. The README's lead and purpose sections: the first H1 and paragraph, and sections titled About, Features, Overview, Why, Usage or Getting started.
  4. Manifest facts: package name and description, keywords, Cargo `categories`, the Python classifiers' "Topic ::" lines, and direct dependency names mapped to framework names (Next.js, React, Django, Tokio).
  5. Primary language and the language mix.
  6. Tree shape: top-level directories, and the presence of `docs/`, `examples/`, `cmd/`, `packages/`, Dockerfile, CI, tests.
  7. `llms.txt`, when present.
- **Signals that should stay out of the embedding text:**
  - Volatile counts (stars, forks, `pushed_at`): they change daily. Including them would change `source_hash` and force re-embedding without changing meaning. Use them as ranking and filter columns.
  - Badge, link and HTML noise.
  - Licence boilerplate. The SPDX id is a filter.
  - Contributor and sponsor lists, changelog sections, and long code blocks. Keep install one-liners, which carry the package name.
- **The current recipe truncates in the wrong place.** It concatenates summary + labels + README + structure and cuts at 12,000 code points, so a long README pushes the file structure out entirely. LLD §6.2 caps the README excerpt at 4,000 characters, which mitigates this. Per-section budgets are more robust than one global cut.
- **12,000 characters is roughly 3,000 tokens** for English prose at the usual 3-4 characters per token (a rule of thumb, not measured here). That exceeds gemini-embedding-001's 2,048-token limit, so the tail (the file structure) would be silently cut or rejected if that model is used. It fits gemini-embedding-2 (8,192).

### Gaps
- No 2024-2026 benchmark was found comparing README-only, metadata-only, LLM-summary, and combined documents for repository-level semantic search with modern embedding models. SEFGH should build a small labelled query set (the "frozen corpus" in LLD §6.4) and measure.
- LEGION's exact input fields (README vs description vs both) and NAICS-GH's README truncation detail were not confirmed from the papers' full text.
- The context length and truncation behaviour of `nomic-embed-text` under Ollama (used by RepoAnalyser) were not verified.
- How the Gemini API handles over-length input (auto-truncation or error) was not verified in this session.

---

## 5. Structure extraction in Go without cgo: tree-sitter via WebAssembly, pure-Go tree-sitter, regex heuristics, or manifests only?

### Takeaway
For a discovery digest, use manifests plus the GitHub-provided tree metadata, at zero new dependencies and zero code execution. Symbol-level structure (signatures) is a later, optional enhancement. If it is ever needed, the realistic cgo-free paths are tree-sitter compiled to WebAssembly and run under wazero, or the young pure-Go gotreesitter. Both are third-party modules that would need an ADR entry under the project's dependency rule.

### Cited Findings
- **wazero.** The pure-Go WebAssembly runtime (now wazero/wazero) is Apache-2.0, 6,436 stars, v1.12.0 (2026-05-29) — GitHub REST API. A runtime guide calls it the best choice for pure Go projects "as it requires no CGO" — [wasmruntime.com Go guide](https://wasmruntime.com/en/languages/go)
- **Tree-sitter on wazero.** Wrappers exist but are immature:
  - zema1/wasitter: 0 stars, created 2026-09-07. Builds the C runtime and grammars to WASM; JavaScript and JSON embedded by default — [pkg.go.dev wasitter](https://pkg.go.dev/github.com/zema1/wasitter)
  - lewtec/wazero-tree-sitter: 0 stars, created 2026-09-26. Emscripten-compiled grammars; copies the tree to a Go snapshot and frees the WASM tree — [lewtec/wazero-tree-sitter](https://github.com/lewtec/wazero-tree-sitter)
  - malivvan/tree-sitter: 5 stars, single-day activity in January 2025. Pins tree-sitter v0.24.7 — [pkg.go.dev malivvan/tree-sitter](https://pkg.go.dev/github.com/malivvan/tree-sitter)

  Star and activity data: GitHub REST API, 2026-10-26.
- **gotreesitter** (odvcencio): a pure-Go tree-sitter runtime; MIT, 580 stars, created 2026-02-20, active (pushed 2026-10-26), v0.56.0.
  - `ts2go` extracts grammar tables from upstream `parser.c` into compressed blobs. 206 grammars, of which 119 have hand-written Go external scanners.
  - Queries support "the full S-expression pattern language", and tagging and outlines are built on tags-query captures.
  - Parity with C tree-sitter is not quantified; the README cites only error-free trees "on smoke samples" — [gotreesitter README](https://github.com/odvcencio/gotreesitter); GitHub REST API
- **Upstream Go bindings.** tree-sitter/go-tree-sitter (MIT, 300 stars) is mainly C, so it uses cgo — GitHub REST API.
- **Repomix's own experience** with WASM tree-sitter includes a memory leak from unreleased trees (fixed in 1.16.1), and per-file parse failures that had to fall back to raw output (1.16.0) — [Repomix releases](https://github.com/yamadashy/repomix/releases)
- **go-enry** (Apache-2.0), a Go port of GitHub Linguist, provides `IsVendor`, `IsDocumentation`, `IsTest`, `IsGenerated(path, content)`, `IsConfiguration`, `IsBinary` and `GetLanguage*`. It uses Go's regexp by default; Oniguruma, via cgo, is optional — [pkg.go.dev go-enry](https://pkg.go.dev/github.com/go-enry/go-enry/v2)
- **GitHub-side classification.** GraphQL `TreeEntry` already returns `language`, `isGenerated` and `lineCount` per entry, computed by GitHub — [GitHub GraphQL Git reference](https://docs.github.com/en/graphql/reference/git)
- **aider** uses tree-sitter `tags.scm` definition and reference queries for its map — [aider blog](https://aider.chat/2023/10/22/repomap.html)

### Inferences
- **Option comparison for SEFGH:**

  | Option | New deps | Executes repo code? | Needs source blobs? | Value for discovery search | Notes |
  |---|---|---|---|---|---|
  | A. Manifests only, plus GitHub tree metadata | none: `encoding/json` for package.json and composer.json; a line parser for go.mod; a small hand-written subset parser for the TOML keys needed; requirements.txt lines | No | Only 1-5 small files | High (name, description, keywords and categories, dependency names → framework) | Recommended default. TOML and YAML have no stdlib parser: limit parsing to a handful of keys and treat parse failure as "absent". |
  | B. Regex heuristics over code (ctags-style) | none | No | Many blobs (API cost) | Low-medium | Brittle across languages; costs API points; adds little over A for "what is this repo". |
  | C. Tree-sitter via wazero | wazero plus grammar `.wasm` files (or wasitter-style wrapper) | No (parsing only) | Many blobs | Medium for code-centric queries | Wrappers are 0-5 stars. Grammar WASM supply chain needs pinning and hashing. Memory management (free trees) and per-file timeouts are needed. |
  | D. Pure-Go gotreesitter | 1 module (MIT) plus grammar blobs | No | Many blobs | Medium | 8 months old, fast-moving (v0.56); parity unquantified; good candidate to re-evaluate in 2027. |
  | E. `go/parser` for Go repos only | none (stdlib) | No | Go files | Medium, Go only | Exact and free for Go; not general. |
  | F. ctags or SCIP binaries | external binaries | ctags no; SCIP indexers typically build or install | Full checkout | Medium-high | Needs a clone and a sandbox; GPL binary (ctags); out of scope for discovery. |

- **GitHub's server-side Linguist removes the main reason to add go-enry** when tree data comes from GraphQL. go-enry matters only if SEFGH processes tarballs itself (section 6).
- **If symbol structure is ever added:** follow aider's approach (definitions and references via `tags.scm`, rank by reference count, fixed small token budget of about 1k tokens). Feed it to the LLM summary, not to the embedding text.

### Gaps
- No benchmarks were found for any wazero tree-sitter wrapper (throughput, memory) or for gotreesitter versus C tree-sitter (its BENCH.md was not reviewed).
- Whether upstream tree-sitter publishes WASI-targeted (non-Emscripten) grammar builds usable directly in wazero was not verified.

---

## 6. Safety for any path that does fetch or clone repository contents

### Takeaway
The default should be "no clone". The digest needs only API-fetched text, which is never executed. If full contents are ever needed, prefer the REST tarball streamed through Go's `archive/tar` and `compress/gzip` with strict caps, over the git CLI: no hooks, no submodules, no LFS, no repository config. Run it in a disposable, credential-free sandbox (Cloud Run job, gen2 microVM; or Vercel Sandbox, a Firecracker microVM), never on the PC that holds the service-role key. If the git CLI must be used, use only a patched git with shallow, blob-filtered, no-submodule, hooks-disabled options.

### Cited Findings
- **CVE-2025-48384.** A carriage-return handling flaw in `.gitmodules` "allows arbitrary file write, and ultimately code execution" (e.g. writing a hook) when an untrusted repository is cloned with `--recursive`.
  - Affects Linux and macOS, not Windows.
  - Fixed in git v2.43.7, v2.44.4, v2.45.4, v2.46.4, v2.47.3, v2.48.2, v2.49.1 and v2.50.1 (coordinated release 2025-07-08) — [Datadog Security Labs](https://securitylabs.datadoghq.com/articles/git-arbitrary-file-write/)
- **Repomix's own advisories** show the risks of running git in an attacker-controlled directory: executable-naming `.git/config` keys such as `core.fsmonitor` (GHSA-4p5g-gh74-q524), and argument injection via a ref name (GHSA-9mm9-rqhj-j5mx) — [Repomix releases](https://github.com/yamadashy/repomix/releases)
- **gitingest's clone flags:** `--single-branch --no-checkout --depth=1`, plus `--filter=blob:none --sparse` for subpaths. Submodules are fetched only when enabled — [gitingest clone.py](https://raw.githubusercontent.com/coderamp-labs/gitingest/main/src/gitingest/clone.py)
- **Tarball endpoint.** `GET /repos/{owner}/{repo}/tarball/{ref}` returns a 302 to a download URL; private-repository links expire after 5 minutes — [GitHub REST contents](https://docs.github.com/en/rest/repos/contents)
- **Cloud Run sandboxes.** Gen1 "is based on gVisor" (system-call emulation). Gen2 "is a microVM" with full Linux compatibility. "Cloud Run jobs and worker pools only use the second generation execution environment" — [Cloud Run execution environments](https://docs.cloud.google.com/run/docs/about-execution-environments)
- **Vercel Sandbox.** Runs "untrusted or agent-generated code in isolated Linux microVMs", each "in a secure Firecracker microVM with its own filesystem and network". JS and Python SDKs, a CLI, and access tokens for non-Vercel environments — [Vercel Sandbox docs](https://vercel.com/docs/vercel-sandbox)
  - Hobby includes 5 Active CPU hours/month, 420 GB-hours of memory, 5,000 creations/month, 20 GB data transfer, 10 concurrent sandboxes and a 45-minute maximum session. Over quota, creation pauses rather than billing. Data downloaded into a sandbox (e.g. git repositories) is free — [Vercel Sandbox pricing](https://vercel.com/docs/sandbox/pricing)
- **go-git** (pure Go, Apache-2.0, v5.19.3 on 2026-10-04) is an in-process alternative to the git CLI — GitHub REST API.
- **gitleaks** (MIT, v8.30.1) can be used as a Go library: `detect.NewDetectorDefaultConfig()`, `(*Detector).DetectString(string) []report.Finding` — [pkg.go.dev gitleaks detect](https://pkg.go.dev/github.com/zricethezav/gitleaks/v8/detect)

### Inferences
- **Tiered safety model for SEFGH:**
  1. **Tier 0, the default (no contents downloaded).** API text only: README, `llms.txt`, manifests, tree names. Nothing is written to disk or executed.
     - Cap bytes per blob (e.g. skip over 64 KiB using `byteSize` before fetching) and total bytes per repository.
     - Treat all text as untrusted data. Never interpret it as config.
     - Strip HTML, control characters and bidi overrides before storing.
  2. **Tier 1, the tarball (only if code-level features are added later).** Stream `tarball/{ref}` through `compress/gzip` and `archive/tar` in memory, never extracting to disk.
     - Cap the compressed size (abort when the stream exceeds, say, 50 MB), the entry count, and the per-file size.
     - Skip symlinks, hardlinks and device entries. Reject `..` and absolute paths.
     - Only read text files with allow-listed extensions. Enforce a wall-clock timeout.
     - No git binary is involved, so hooks, submodules, LFS smudge filters, `.gitattributes` filters and `.git/config` are irrelevant.
  3. **Tier 2, the git CLI (avoid).** Use a git at or above the CVE-2025-48384 fixed versions.
     - `git -c core.hooksPath=/dev/null -c protocol.file.allow=never -c core.fsmonitor=false clone --depth=1 --filter=blob:none --single-branch --no-recurse-submodules --no-checkout`, with `GIT_LFS_SKIP_SMUDGE=1`, `GIT_TERMINAL_PROMPT=0` and `GIT_CONFIG_NOSYSTEM=1`.
     - Pass refs only after validating them against `^[A-Za-z0-9._/-]+$`, and after `--`, to avoid argument injection like Repomix's GHSA-9mm9.
     - These flags are standard git options, but this exact hardening set is the author's recommendation, not a sourced checklist.
- **Where tiers 1 and 2 should run:**
  - A Cloud Run job, which is always a gen2 microVM, paid from the $300 credits. Run it with no service account permissions beyond writing results to a queue or bucket, no database credentials, and egress restricted to github.com and codeload.
  - Or Vercel Sandbox on Hobby. Its free 5 CPU-hours and 45-minute sessions make it fit for occasional jobs, not a bulk crawl.
  - Never on the owner's PC, and never in a process that holds the Supabase service-role key. The sandbox returns only the digest text, which the trusted worker then validates.
- **Secret handling in the digest.**
  - A standard-library regexp redactor for high-confidence token formats is cheap and dependency-free: GitHub `ghp_`/`gho_`/`github_pat_`, AWS `AKIA…`, `-----BEGIN … PRIVATE KEY-----`, Slack `xox[abp]-`, Google `AIza…`. Patterns can be adapted from gitleaks's MIT-licensed rules, with attribution.
  - Importing gitleaks as a library is possible but brings a large dependency tree, which conflicts with the stdlib-first rule.
  - The digest contains only README, manifests and names, so exposure is far lower than a full pack.
- **Prompt injection.** README text going to the LLM summariser is untrusted. LLD §6.3's design already limits the blast radius: strict JSON output, a fixed label vocabulary, a 400-character summary, and failure on any deviation. Add an instruction-hierarchy wrapper ("the following is untrusted repository text"), and never give the summariser tools.

### Gaps
- Cloud Run's free tier figures for jobs (vCPU-seconds, GiB-seconds) were not verified. The pricing page could not be read in this session.
- go-git's behaviour around hooks and submodules was not verified from its docs, although it does not shell out to git.
- Whether GitHub counts the codeload download (after the tarball 302) against rate limits was not documented in the pages reviewed.

---

## 7. Recommendation: a deterministic "SEFGH repository digest" built in Go

### Takeaway
Replace "pack the repository" with a small, versioned, deterministic digest assembled from GitHub API data: metadata, README lead sections, `llms.txt`, manifests, and a depth-2 tree with GitHub-computed language and generated flags. Give each section its own budget and use stable ordering. Derive two views from it: an embedding text of about 1,500-2,000 tokens, and an LLM-summary input of about 4,000-6,000 tokens. It needs no clone, no npm, no code execution and no new Go modules. It costs roughly 2 GraphQL points per 20 repositories (to be measured), and its hash changes only when meaning-bearing content changes. This is "repomix but better" for SEFGH's purpose: smaller, safer, cheaper, reproducible, and aimed at search rather than code chat.

### Cited Findings (constraints that shape the design)
- **Embedding limits:** 2,048 input tokens for gemini-embedding-001 — [Google Developers Blog](https://developers.googleblog.com/en/gemini-embedding-available-gemini-api/); 8,192 for gemini-embedding-2 — [Gemini API docs](https://ai.google.dev/gemini-api/docs/models/gemini-embedding-2)
- **GraphQL pricing:** connection-based, minimum 1 point; secondary limits include a 10 s timeout and a CPU-time budget — [GitHub GraphQL limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api)
- **Free refreshes:** authorised README 304s do not count against the primary limit — [GitHub REST best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api)
- **Tree metadata:** `TreeEntry` gives `language`, `isGenerated`, `size` and `lineCount` without downloading files — [GitHub GraphQL Git reference](https://docs.github.com/en/graphql/reference/git)
- **README precedence and size:** `.github` → root → `docs`; GitHub truncates the rendered README beyond 500 KiB — [About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- **Context prefixes help retrieval:** prefixing LLM-generated context to embedded text reduced retrieval failures by 35-49% in Anthropic's tests — [Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
- **aider budgets its repo map** at about 1k tokens by default, ranked by importance — [aider repo map](https://aider.chat/docs/repomap.html)
- **Repomix's pack-everything approach** required repeated 2026 security fixes — [Repomix releases](https://github.com/yamadashy/repomix/releases)

### Inferences (the proposed design; all of this is recommendation, not sourced fact)

**Digest v1 sections.** Plain text with fixed section order and fixed labels, LF line endings, trimmed whitespace, and budgets counted in runes (matching LLD §6.4's code-point counting):

| # | Section | Content | Budget (runes) |
|---|---|---|---|
| 1 | `Repository:` | `owner/name`, description, topics (sorted), primary language plus top languages by share (rounded to 5%), SPDX licence, homepage host, flags `archived`/`fork`/`template` | 600 |
| 2 | `Summary:` / `Labels:` | Optional LLM output (LLD §6.3, versioned). Absent → omitted, not empty. | 400 + 200 |
| 3 | `Purpose:` | README cleaned and section-selected: first H1 text and lead paragraph, then About/Overview/Features/Why/What sections in document order, then Usage/Getting started/Install first paragraphs | 3,000 (embedding view) / 12,000 (LLM view) |
| 4 | `LLM notes:` | `llms.txt` first lines, if present | 800 |
| 5 | `Package:` | For each detected manifest (max 3, ordered by path depth, then fixed ecosystem order): name, description, keywords/categories/classifier topics, and the first 30 direct dependency names, sorted; plus detected frameworks (fixed mapping table: `next`→Next.js, `django`→Django, `tokio`→Tokio …) | 1,000 |
| 6 | `Layout:` | Depth-2 tree: top-level directories and files, sorted, each directory with child count. Drop `isGenerated` entries and vendored paths. Mark notable features (`docs/`, `examples/`, `tests/`, CI workflows, Dockerfile, monorepo `packages/`/`apps/`) | 1,200 |

**README cleaning** (all stdlib):
- Remove HTML tags, badge lines (images inside links), reference link targets, images, code fences except single-line install commands, tables of contents, and sections titled License, Contributors, Sponsors, Backers, Changelog, Acknowledgements, Star History.
- Collapse whitespace and drop control and bidi characters.
- Read at most 64 KiB raw: the LLD already says this, and GitHub truncates rendered READMEs at 500 KiB anyway.

**Two views from one digest:**
- **Embedding view:** sections 1, 2, 3 (3,000-rune budget), 5 and 6, total ≤ 6,500 runes (≈ 1,600-2,000 tokens). It fits gemini-embedding-001's 2,048 limit with headroom, and fits trivially in 8,192 models. Volatile numbers are excluded.
- **LLM view:** sections 1, 3 (12,000), 4, 5 and 6, total ≤ 18,000 runes (≈ 4,500-6,000 tokens). It is the input to the optional summary/labels step. The summary then flows back into the embedding view, which is the Contextual Retrieval analogue.

**Determinism and versioning:**
- Every list is sorted, and every budget cut happens at a section boundary, then at a sentence or line boundary, never mid-word.
- `digest_version` = "d1/" + SHA-256 of the recipe constants (budgets, section list, framework map, regexes).
- `source_hash` = SHA-256 of the digest text. Re-embed only when it changes. Stars and dates never enter the hash.
- Store the commit `oid` (`defaultBranchRef.target.oid`) the digest was built from. Skip a repository when the oid is unchanged and only metadata changed. Re-check the README with an ETag when the oid moved.

**API plan per batch of 20 repositories:**
- G1: metadata, topics, languages, root and depth-2 `entries` with `isGenerated`, `language` and `size`, and the commit oid.
- G2: blobs for README (precedence `.github` → root → `docs`), `llms.txt` and up to three manifests, each pre-filtered by `size` ≤ 64 KiB.
- Measure the cost of both with `rateLimit { cost }` before choosing the batch size. Fall back to smaller batches on 502/504 timeouts.
- Optional REST refresh: `/readme` with `If-None-Match`, free on 304.

**Safety defaults:**
- No clone and no subprocess, so nothing from a repository is ever executed.
- Every repository-sourced string is treated as untrusted. A stdlib regexp secret redactor runs before storage.
- Byte caps apply per blob and per repository.
- The LLM summariser gets strict JSON, a fixed label list, no tools, and an untrusted-text wrapper.
- The worker holds GitHub tokens and database credentials, but because nothing is executed, credential exposure reduces to ordinary input-validation bugs.
- A tarball path (tier 1, section 6) is added only if code-level features are later justified. It runs in a Cloud Run job without database credentials.

**Retire repomix.** The R-199 fix is to stop calling `npx` entirely, not to pin it. Pinning (`repomix@1.18.1` with a lockfile, in a sandbox) is only an interim mitigation if the Python analysers must keep running before the Go Enrich stage ships.

**Possible later additions** (each needs an ADR entry because it adds a module):
- aider-style symbol map through gotreesitter or a wazero wrapper, feeding the LLM view only.
- go-enry, if tarball processing is added.
- Community profile `health_percentage` as a ranking feature, not embedding text.

**Measurement before switching recipes.** Build a frozen set of about 100-200 real SEFGH queries with judged relevant repositories. Compare document recipe v1 (current) with digest d1 on recall@10 and nDCG@10 for each embedding model. This is the evidence gap section 4 identified, and LLD §6.4's "compare on the frozen corpus" step already provides for it.

### Gaps
- The token-per-rune ratio for README-heavy text under Gemini's tokenizer was not measured. The budgets above assume about 3.5-4 characters per token, a common rule of thumb. Verify with the provider's count-tokens endpoint on a sample.
- The real GraphQL point cost and latency of the G1/G2 shapes at batch sizes 10, 20 and 50 are unmeasured.
- No published evidence fixes the optimal README excerpt length for repository-level embeddings. The 3,000-rune figure is a design choice to be validated on the frozen query set.
