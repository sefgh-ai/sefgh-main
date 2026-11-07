# Rebuild SEFGH's pipeline on portable, measured parts

SEFGH should adopt four things, in this order. First, a model gateway written in standard-library Go that uses the OpenAI-compatible API and is driven by configuration. Second, a deterministic "repository digest" built from GitHub's own APIs, replacing `npx repomix@latest`. Third, a retrieval-evaluation harness in Go that gates every model choice in CI. Fourth, a small, stateless, read-only MCP server for AI agents. The first is urgent. GitHub retired GitHub Models for every customer on **2026-07-30**, and the Azure hostname both SEFGH implementations still call no longer resolves in DNS. As a result, the live AI chat and AI chat titles fail with network errors, and search suggestions survive only on built-in fallbacks (recorded as R-220). Several open-weight models released or relicensed in 2025-2026 (Gemma 4, under Apache-2.0 since April 2026, gpt-oss-20b/120b, Qwen3.5/3.8 and Granite 4.2) are each served by several hosted providers and also run locally. That is what turns "switch provider" into a configuration change rather than a migration. Summarising a 20,000-repository corpus costs about **$4-8** hosted, or nothing locally. Vercel eve (launched 2026-06-17, still beta) is the wrong instrument for choosing the embedding model or deciding on LLM summaries. Its evals check an agent's answers and tool calls, whereas those decisions need graded relevance judgments, nDCG@10 and a paired t-test on SEFGH's own queries. GitHub's star data also changed. Listing a repository's stargazers closed to non-collaborators in July 2026. A privacy-safe `stargazers/history` endpoint (2026-09-04) now returns net daily star counts, at one request per 30 weeks of history. Accurate trending is now cheap for everyone, so SEFGH has to compete on grounded selection ("is this maintained?", "alternatives to X", side-by-side comparison) offered to people and to agents. The binding constraints are not money. They are Supabase's 500 MB database, Vercel Hobby's once-a-day cron and non-commercial rule, and the 90-day life of the $300 Google credit, which cannot pay for Gemini in AI Studio.

## Platform changes since 2025 that SEFGH must absorb

GitHub wound GitHub Models down in stages. It deprecated the Azure endpoint `models.inference.ai.azure.com` on 2025-07-17 and scheduled removal of support for 2025-10-17 ([GitHub Changelog](https://github.blog/changelog/2025-07-17-deprecation-of-azure-endpoint-for-github-models/)). It closed the service to new customers on 2026-06-16 ([GitHub Changelog](https://github.blog/changelog/2026-06-16-github-models-is-no-longer-available-to-new-customers/)). It announced full retirement, with brownouts on 16 and 23 July ([GitHub Changelog](https://github.blog/changelog/2026-07-01-github-models-is-being-fully-retired-on-july-30-2026/)). Finally, it removed the playground, catalog, inference API and BYOK for everyone on **2026-07-30**, pointing users to Microsoft Foundry and to Copilot for on-GitHub workflows ([GitHub Changelog](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/)). GitHub's documentation now states it plainly: "As of July 30, 2026, GitHub Models has been fully retired" ([GitHub Docs](https://docs.github.com/en/github-models)).

SEFGH still targets the dead host, in three places:

| Location | What it holds |
|---|---|
| `src/lib/ai/github.js` line 7 | The Next.js handler's endpoint |
| `backend/internal/aiprovider/provider.go` line 20 | The Go port's `DefaultEndpoint` |
| `contracts/ai-chat/cases.json` | The URL, pinned in dozens of fixtures |

A lookup on 2026-10-26, repeated while this report was written, returned **NXDOMAIN** for the hostname. Every call therefore fails as a network exception before any HTTP status exists. GitHub documents no error behaviour, so this is an observation, not a published fact.

Repointing to the newer host `models.github.ai` is not a fix. An unauthenticated probe got **HTTP 200 with a plain-text body reading "OK"**. That is a placeholder, and a client that checks only the status code would treat it as a successful reply.

The bug register (R-220) records the effects. Chat cannot answer, and new chats get no AI title. Suggestions fall back to built-in terms. Query enhancement calls OpenAI or Anthropic directly and is unaffected. The outage has not yet been reproduced on the deployed site.

The repair is one owner-approved contract change. It replaces the endpoint, credential, model names and request/response mapping in both implementations and in the `ai-chat` and `ai-suggestions` fixtures. Because a contract change must update every implementation in the same commit anyway, doing both at once does not break the "fix each bug once" rule. Whether to land it before the Go cutover is still the owner's call. `GITHUB_TOKEN` should lose only its Models role: `src/app/api/trending/refresh/route.js` still reads the same variable for GitHub REST calls.

The other changes are smaller but have dates attached:

| Date | Change | Effect on SEFGH | Action |
|---|---|---|---|
| Announced 2026-06-30; in force July 2026 | Listing stargazers and watchers through REST is limited to admins and collaborators. `/users/{u}/subscriptions` is deprecated ([GitHub Changelog](https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/); [REST docs](https://docs.github.com/en/rest/activity/starring?apiVersion=2026-03-10)) | No current code lists stargazers. Counts (`stargazers_count`, GraphQL `stargazerCount`) remain public; an anonymous probe got 401 on the listing and 200 on the repository | Never design on stargazer identities. Treat empty, 401 and 403 responses as "not available" |
| 2026-09-04 | `GET /repos/{o}/{r}/stargazers/history` returns calendar weeks of per-day counts, newest first, at most 30 weeks per page ([GitHub Changelog](https://github.blog/changelog/2026-09-04-new-api-endpoint-provides-privacy-safe-star-history-data/)) | Rebuilding react/react's history fell from about 2,511 requests to about 24 ([GitHub Engineering](https://github.blog/engineering/architecture-optimization/from-2500-requests-to-24-rebuilding-star-history-without-the-stargazers/)). An anonymous probe succeeded and cost one `core` request per page | Use it for backfill, plus a cheap daily count snapshot for trending |
| 2026-11-13 | The synchronous SBOM export is removed. Its replacement is the asynchronous `generate-report` then `fetch-report` pair ([GitHub Changelog](https://github.blog/changelog/2026-05-12-synchronous-sbom-api-deprecated/); [REST docs](https://docs.github.com/en/rest/dependency-graph/sboms)) | Not used today | Any dependency or licence feature reads manifests or uses the asynchronous flow |
| 2026-10-19 | Go 1.27.3 fixes `crypto/x509` security issues ([go.dev](https://go.dev/doc/devel/release)) | `backend/go.mod` pins 1.27.2. Vercel's Go runtime is still Beta ([Vercel Docs](https://vercel.com/docs/functions/runtimes/go)); its builder source maps Go up to 1.27 ([vercel/vercel](https://raw.githubusercontent.com/vercel/vercel/main/packages/go/src/go-helpers.ts)) | Bump the `go` or `toolchain` line |

Three properties of the star-history endpoint shape SEFGH's design.

**The counts are net, not gross.** A GitHub staff member explained that each day's count includes only stars that still exist, and that no record of unstars is kept ([GitHub Community](https://github.com/orgs/community/discussions/206104)). History therefore changes retroactively, and SEFGH's "stars this week" will not match sites that count GH Archive `WatchEvent`s. The interface should say which it uses.

**Cost grows with the repository's age, not its popularity.** A 2014 repository with 76 stars needed 22 requests, because it spans 647 weeks ([GitHub Community](https://github.com/orgs/community/discussions/206104)).

**Boundaries and identity need care.** Week and day boundaries are not guaranteed to be UTC, and the endpoint returns 422 when it decides it is being spammed ([REST docs](https://docs.github.com/en/rest/activity/starring?apiVersion=2026-03-10)). Store the reported week timestamps as they are, overwrite the partial current week on each refresh, and key rows by numeric repository ID. Repository transfers (for example `facebook/react` to `react/react`) answer with 301 redirects.

Whether the GraphQL `stargazers` connection is restricted is undocumented, and it was not tested.

## Open-weight models served by several hosts make the provider a setting

The lesson of GitHub Models is that a free hosted inference service can disappear within about six weeks of announcing its closure (16 June to 30 July 2026). The defence is to pick **models**, not providers: choose open-weight models that at least two hosted providers serve and that also run locally. Then losing any one provider means editing a base URL.

The shortlist for SEFGH's task is reading about 3,000 tokens of README, file tree and manifests and returning about 300 tokens of summary, labels and JSON. Every candidate's context window holds that input, so context length does not separate them.

| Size class | Model | Licence | Where it runs |
|---|---|---|---|
| Small, CPU or laptop | Qwen3.5-4B: IFEval 89.8, 262K context ([HF card](https://huggingface.co/Qwen/Qwen3.5-4B)) | Apache-2.0 | Local |
| | Gemma 4 E4B, with official QAT q4_0 GGUF builds ([Gemma 4 card](https://ai.google.dev/gemma/docs/core/model_card_4)) | Apache-2.0 since 2026-04-02 ([Techzine](https://techzine.eu/news/applications/140206/google-launches-gemma-4-with-a-broad-licensing-model)) | Local |
| | Granite 4.2 3B/8B ([HF](https://hf.co/ibm-granite/granite-4.2-8b)) | Apache-2.0 | Local |
| Medium | Gemma 4 26B-A4B: 3.8B active parameters, Artificial Analysis index 17 at about $0.1 ([Artificial Analysis](https://artificialanalysis.ai/models/open-source/small)) | Apache-2.0 | Gemini API, which lists Gemma 4 as free with no paid tier ([Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)); Cloudflare at $0.10/$0.30 per 1M tokens ([Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/)); local |
| | gpt-oss-20b, August 2025 ([HF](https://hf.co/openai/gpt-oss-20b)) | Apache-2.0 | Groq at $0.075/$0.30 and about 1,000 tok/s ([Groq](https://console.groq.com/docs/models)); Cloudflare; Vertex ([Google forum](https://discuss.google.dev/t/now-ga-openais-gpt-oss-qwen3-models-on-vertex-ai-as-open-model-apis/253945)); local |
| Large, hosted | Qwen3.8-27B, August 2026 ([HF card](https://huggingface.co/Qwen/Qwen3.8-27B)); gpt-oss-120b | Apache-2.0 | Groq (Qwen3.8-27B is in preview there), Cloudflare, Hugging Face inference providers, Vertex |

Four licence families need a separate read before use in a public product, because their Hub licence tag is "other": Llama 4, Kimi, Nemotron, and the largest Qwen3.8 models ([HF meta-llama](https://huggingface.co/meta-llama); [HF Qwen3.8-Flash-Next](https://hf.co/Qwen/Qwen3.8-Flash-Next)).

Every adapter also needs a per-model "thinking off" setting, because reasoning multiplies output tokens on a 300-token JSON task:

| Model | How to turn thinking off or down | Source |
|---|---|---|
| Qwen | `chat_template_kwargs.enable_thinking=false` | [Qwen3.5-4B card](https://huggingface.co/Qwen/Qwen3.5-4B) |
| Gemma 4 | Leave out the `<|think|>` token | [Gemma 4 card](https://ai.google.dev/gemma/docs/core/model_card_4) |
| gpt-oss | Always reasons; request `reasoning_effort: low` | Design inference; measure the extra output tokens |
| Gemini | `"none"` works only on 2.5 models; 3.x models cannot disable reasoning | [Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai) |

The free landscape shrank in 2026. Free Hugging Face accounts no longer get monthly inference credits ([HF](https://huggingface.co/docs/inference-providers/pricing)). Cerebras offers only a $5, 30-day trial ([Cerebras](https://inference-docs.cerebras.ai/support/rate-limits)). Google publishes free-tier Gemini limits only inside AI Studio, and free-tier content is used to improve Google's products ([Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits); [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)).

What remains is still enough. A 20,000-repository backfill is 60M input and 6M output tokens. The costs below are arithmetic on the cited prices:

| Option | Cost for 20,000 repositories | Free throughput, or catch |
|---|---|---|
| Gemini 2.5 Flash-Lite, Batch ($0.05/$0.20) | **$4.20** | Not open-weight; the $300 credit cannot pay for AI Studio |
| Groq gpt-oss-20b | $6.30 | Free plan: 200K tokens/day per model ([Groq](https://console.groq.com/docs/rate-limits)), so about 60 repositories a day |
| Cloudflare gemma-4-26b-a4b | $7.80 | 10,000 free neurons/day, about 280 repositories a day |
| Vertex gpt-oss-120b | $7.56-$12.60 | Whether the trial credit covers it is unconfirmed ([DEV](https://dev.to/alanwest/gpt-6-on-google-cloud-vertex-ai-your-300-free-credit-cant-pay-for-it-1363)) |
| OpenRouter `:free` models | $10 one-off credit purchase | 1,000 requests/day ([OpenRouter](https://openrouter.ai/docs/api-reference/limits)) |
| Local 3-4B model on a CPU (estimate from a third-party llama.cpp benchmark) | $0 | About a minute per repository, about two weeks continuous |

Mixing providers multiplies daily throughput but produces inconsistent summaries. Record `provider`, `model` and `prompt_version` on every row, and pin one "generation" of summariser plus prompt, re-summarising only as an explicit backfill. Summaries feed embeddings, so changing the summariser shifts the vector space.

The $300 Google credit has sharp edges. It is valid for **90 days**. It cannot pay for Gemini in AI Studio or for partner generative-AI models offered as managed APIs. A Free Trial account cannot use GPUs until it upgrades to paid billing ([Google Cloud free features](https://docs.cloud.google.com/free/docs/free-cloud-features)).

After the upgrade, a Cloud Run job with an L4 GPU (4 vCPU, 16 GiB, scaling to zero) costs about **$1.05 per hour** ([Cloud Run pricing](https://cloud.google.com/run/pricing)), so the credit buys roughly 287 GPU-hours. Each GPU task is capped at one hour ([task timeout](https://docs.cloud.google.com/run/docs/configuring/task-timeout)), so work must be split into resumable shards. An always-on L4 service would use up the credit in about 12 days. To beat Gemini Batch's $4.20, a GPU run would need about 0.9 repositories per second, a throughput nobody has measured. The first GPU spend should therefore be a small benchmark, not a backfill.

Google's Vertex OpenAI-compatible endpoint, now titled "Gemini Enterprise Agent Platform", authenticates with one-hour OAuth tokens from Application Default Credentials ([Vertex OpenAI compatibility](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/openai)). The gateway therefore needs an auth type besides a bearer key.

### The gateway design

Make OpenAI Chat Completions the contract. Gemini, Groq, Cerebras, OpenRouter, the Hugging Face router, Cloudflare, Ollama, vLLM and llama.cpp all accept it ([Ollama](https://docs.ollama.com/api/openai-compatibility); [vLLM](https://docs.vllm.ai/en/latest/features/structured_outputs.html)).

**Configuration per provider and role.** Each provider and role is one configuration record:

| Field | Purpose |
|---|---|
| Base URL, model ID | Where to send requests and which model to use |
| Auth type: `bearer`, `gcp-adc` or `none` | `gcp-adc` covers Vertex's one-hour OAuth tokens |
| Key reference | Name of the secret holding the key, never the key itself |
| JSON mode: `json_schema`, `json_object` or prompt-only | How to request structured output |
| Thinking-off fragment | The per-model setting from the table above |
| RPM, TPM and daily caps | Enforced client-side |
| Prices | For cost logging |

**Request handling.** All of the following is `net/http` plus `encoding/json`, so no third-party module is needed:

| Situation | Behaviour |
|---|---|
| 429 or 5xx | Retry, honouring `Retry-After` |
| 400, 401 or 404 | Never retry |
| 402 or quota exhausted | Switch provider or park the job |
| Every reply | Validate the JSON locally, because some providers ignore `response_format` |

**Gemini Batch.** It needs native file upload, so it sits behind the same interface as a separate submit/poll/collect adapter.

**Hosted gateways.** These move keys and fallbacks out of Go, but sit in the request path:

| Gateway | Trade-off |
|---|---|
| LiteLLM (MIT) | Needs Postgres, so it fits the later physical server better than the free tier ([LiteLLM](https://docs.litellm.ai/docs/simple_proxy)) |
| Vercel AI Gateway | No token markup, but a small monthly free credit that ends once credits are bought ([Vercel](https://vercel.com/docs/ai-gateway/pricing)) |
| OpenRouter | One key and one bill for many providers |

## A deterministic Go digest replaces repomix rather than another packer

Repomix is healthy, popular software, and that is part of the problem. Version 1.18.1 (2026-09-21) needs Node 22 or newer and pulls in 28 direct dependencies, including Tree-sitter WASM, Secretlint, an MCP SDK and `tar` ([npm](https://registry.npmjs.org/repomix)). Its 2026 releases kept closing holes that only matter when it packs untrusted repositories ([Repomix releases](https://github.com/yamadashy/repomix/releases)):

| Version | Fix |
|---|---|
| 1.13.0 | Stopped executing a remote repository's config file by default |
| 1.14.1 | Fixed argument injection through `--remote-branch` (GHSA-9mm9-rqhj-j5mx) and a secret-scan bypass |
| 1.18.0 | Added an MCP sandbox that its authors describe as application-level, not an OS-level sandbox |
| 1.18.1 | Stopped honouring `.git/config` keys that name executables, such as `core.fsmonitor` (GHSA-4p5g-gh74-q524) |

SEFGH's analysers run `npx -y repomix@latest`, unpinned, on a machine that holds a Supabase service-role key (risk R-199). That resolves a fresh dependency tree from npm on every run. It is the exposure the self-replicating "Shai-Hulud" worm exploited in September 2025. That worm compromised more than 500 npm packages and hunted for GitHub tokens and cloud keys; CISA's advice was to pin dependencies and review lockfiles ([CISA](https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem)). A second wave followed in November 2025 ([Check Point](https://blog.checkpoint.com/research/shai-hulud-2-0-inside-the-second-coming-the-most-aggressive-npm-supply-chain-attack-of-2025/)).

Swapping to another packer does not help. Every remote-capable alternative clones or downloads the whole repository, and none is written in Go:

| Tool | Notes |
|---|---|
| gitingest (Python, MIT, 16k stars) | Shallow-clones the repository ([clone.py](https://raw.githubusercontent.com/coderamp-labs/gitingest/main/src/gitingest/clone.py)) |
| code2prompt (Rust) | Same pack-everything model |
| yek (Rust) | Local inputs only; its author's 230× speed claim over repomix is self-reported ([yek](https://github.com/bodo-run/yek)) |

The hosted "wiki" services are useful link-outs but unsuitable as production inputs. DeepWiki's MCP is free with no authentication but documents no rate limits or terms ([Devin docs](https://docs.devin.ai/work-with-devin/deepwiki-mcp)). Google Code Wiki is a preview with no public API ([Google Developers Blog](https://developers.googleblog.com/en/introducing-code-wiki-accelerating-your-code-understanding/)). Context7 covers library documentation and keeps its backend private ([Context7](https://github.com/upstash/context7)).

More fundamentally, a full pack is the wrong shape for discovery. SEFGH needs a small, stable description of each of tens of thousands of repositories, and today it truncates whatever it packs to 12,000 characters anyway.

GitHub's APIs already provide everything that description needs, without cloning anything. The GraphQL `TreeEntry` type returns `language`, `isGenerated`, `size` and `lineCount` for each path. These are computed by GitHub's own Linguist, so SEFGH does not need to reimplement it. `Blob.text` returns small files, with `byteSize` and `isTruncated` ([GraphQL Git reference](https://docs.github.com/en/graphql/reference/git)).

GraphQL is priced by connections, with a minimum of one point per query ([GraphQL limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api)). Two batched queries per 20 repositories should therefore cost about **0.1 point per repository**:

| Query | Contents |
|---|---|
| G1 | Metadata, topics, languages, a depth-2 tree and the head commit `oid` |
| G2 | README, `llms.txt` and up to three manifests |

That figure is an inference from the formula and must be measured with `rateLimit { cost }`. The 10-second query timeout and CPU-time secondary limits will cap batch size first. README refreshes sent with `If-None-Match` cost nothing when GitHub answers 304 to an authorised request ([REST best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api)).

The research on what to embed is thin, but it consistently favours natural language over code. RepoPal found README similarity plus co-starring beat a code-based method at finding similar repositories ([SMU](https://ink.library.smu.edu.sg/sis_research/3615)). Anthropic's Contextual Retrieval cut top-20 retrieval failures by 35%, or 49% when combined with BM25, by prefixing a short LLM-written context to each embedded text ([Anthropic](https://www.anthropic.com/news/contextual-retrieval)). That is the analogue of putting an LLM summary in front of the digest.

The token limits are hard. gemini-embedding-001 accepts **2,048 tokens** ([Google Developers Blog](https://developers.googleblog.com/en/gemini-embedding-available-gemini-api/)). The current 12,000-character recipe is roughly 3,000 tokens, so the file-structure tail is silently lost on that model. Gemini Embedding 2 accepts 8,192 tokens ([Gemini docs](https://ai.google.dev/gemini-api/docs/models/gemini-embedding-2)).

The recommended digest, "d1", has six labelled sections in a fixed order, each with its own budget counted in runes:

| Section | Content | Budget |
|---|---|---|
| Repository | Name, description, sorted topics, language mix, SPDX licence, flags | 600 |
| Summary / Labels | Optional LLM output, omitted when absent | 400 + 200 |
| Purpose | Cleaned README: lead paragraph, then About, Features, Usage and similar sections | 3,000 (embedding view) or 12,000 (LLM view) |
| LLM notes | First lines of `llms.txt` | 800 |
| Package | Manifest name, keywords, first 30 direct dependencies, detected frameworks | 1,000 |
| Layout | Depth-2 tree without generated or vendored paths, with notable features marked | 1,200 |

From these sections the worker builds two views. The **embedding view** is at most 6,500 runes, about 1,600-2,000 tokens, which fits even the 2,048-token model. The **LLM view** is at most 18,000 runes and is the input to the optional summary.

Three rules keep the digest stable. Stars and dates never enter its hash, because they change daily without changing meaning. The digest records the commit `oid` it was built from, and a repository whose commit has not moved is skipped. A `digest_version` hash of the recipe constants makes any recipe change explicit.

The safety model follows from never executing anything:

**Tier 0, the default.** Text from the API only, with byte caps per blob and per repository. HTML, control characters and bidirectional-override characters are stripped. A standard-library regex redactor removes high-confidence token formats, with patterns adapted from gitleaks under its MIT licence ([gitleaks](https://pkg.go.dev/github.com/zricethezav/gitleaks/v8/detect)).

**Tier 1, only if code-level features are ever justified.** The REST tarball is streamed through Go's `archive/tar` in memory: no symlinks, no `..` paths, and caps on size and entry count. It runs in a Cloud Run job, which always uses a gen2 microVM ([Cloud Run](https://docs.cloud.google.com/run/docs/about-execution-environments)), with no database credentials and only the digest returned.

**Tier 2, the git CLI: avoid.** CVE-2025-48384 showed that cloning an untrusted repository recursively could lead to code execution on unpatched git ([Datadog](https://securitylabs.datadoghq.com/articles/git-arbitrary-file-write/)).

README text that reaches the summariser is untrusted. The summariser therefore gets strict JSON output, a fixed label vocabulary, an untrusted-text wrapper around the input, and no tools.

Pinning `repomix@1.18.1` with a lockfile, inside a sandbox, is an acceptable stopgap only while the Python analysers must keep running. The real fix for R-199 is to stop calling npm at all.

Symbol-level maps in the style of aider, which ranks definitions by how often they are referenced, under a budget of about 1k tokens ([aider](https://aider.chat/docs/repomap.html)), can wait. If they are added, use the pure-Go gotreesitter (MIT, eight months old, v0.56: [gotreesitter](https://github.com/odvcencio/gotreesitter)) or Tree-sitter under wazero. Either needs an ADR entry and should feed only the LLM view.

## One 768-dimension space on Supabase holds about 30,000 repositories

The HLD's plan for one recorded embedding space at 768 dimensions, stored as `halfvec`, is sound. 768 is native for several strong small models and is a Matryoshka truncation size for others, so changing model means re-embedding but never changing the column type.

Equal width does not mean compatibility. That is exactly the recorded bug where Ollama `nomic-embed-text` and a Google model share one index. Google says outright that its own two Gemini embedding models produce incompatible spaces ([Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings)).

The realistic candidates:

| Model | Licence | 768-dim fit | Context | Published quality | Hosts |
|---|---|---|---|---|---|
| Qwen3-Embedding-0.6B | Apache-2.0 | 1,024 native, Matryoshka to 768 | 32K | MMTEB 64.33 at 1,024 ([HF](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B)); no score published at 768 | Cloudflare at $0.012/M tokens ([Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/)); local |
| EmbeddingGemma-300M | Gemma terms (gated) | 768 native, Matryoshka to 512/256/128 | 2,048 | MMTEB 61.15; code 68.76 ([HF](https://huggingface.co/google/embeddinggemma-300m)) | Local only |
| Granite-embedding-english-r2 | Apache-2.0 | 768 native | 8,192 | English plus code ([arXiv](https://arxiv.org/html/2508.21085v1)) | Local |
| Gemini Embedding 2 (GA April 2026) | Proprietary | 768 recommended | 8,192 | Not on the model page | $0.20/M, $0.10/M in Batch ([Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)) |
| nomic-embed-text-v1.5 (current) | Apache-2.0 | 768 native | 8,192 | MTEB v1 62.28 ([HF](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5)) | Ollama |

Some 2026 models are out for now. Jina v5 is non-commercial (CC-BY-NC-4.0: [Jina](https://jina.ai/models/jina-embeddings-v5-text-small/)). Microsoft's MIT-licensed harrier-oss-v1 documents no Matryoshka truncation, and its 270M size is natively 640-dimensional ([HF](https://huggingface.co/microsoft/harrier-oss-v1-0.6b)).

Gemini Embedding 2 has two traps. Several inputs sent in one request are aggregated into **a single embedding**, so batching code written for gemini-embedding-001 silently changes meaning. And on the free tier, the text sent, which here includes users' search queries, may be used to improve Google's products ([Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings); [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)). Public README text does not mind that; user queries do, so queries should go through a paid tier or a self-hosted model.

The strongest structural pick for the shortlist is **Qwen3-Embedding-0.6B**. It is the one candidate available both as a cheap hosted API today (Cloudflare's 10,000 free neurons a day work out to roughly 9M tokens daily, by my estimate) and as Apache-2.0 weights for the future physical server. That keeps one embedding space across the hosted and self-hosted phases, provided the model revision, pooling and truncation match, which must be verified. Embedding 50,000 repositories at 1,500 tokens each costs about $0.90 on Cloudflare, or $15 ($7.50 in Batch) with Gemini Embedding 2. Either way, cost does not decide this choice; the evaluation does.

Supabase's free plan is the binding constraint. It offers **500 MB**, pauses after a week of inactivity, and takes no automatic backups ([Supabase pricing](https://supabase.com/pricing)), so a scheduled `pg_dump` job is mandatory. The sizing below is an estimate from pgvector's storage formulas, not a measurement:

| Item | Size |
|---|---|
| One `halfvec(768)` value | 1,544 bytes ([pgvector](https://github.com/pgvector/pgvector/blob/master/README.md)) |
| One HNSW element | About 1.8-2.0 KB |
| 30,000 repositories, vectors plus index | About 105 MB |
| Whole HLD estimate per repository | 8-10 KB |
| Repositories that fit in 500 MB | 30,000-40,000 |
| Saving from `halfvec(256)` | About 2.3 KB per repository |

The installed pgvector 0.8.0 predates two fixes that matter for HNSW: a buffer overflow in parallel index builds (0.8.2) and possible index corruption during vacuuming (0.8.3). The current release is 0.8.7, from 2026-10-01 ([pgvector CHANGELOG](https://github.com/pgvector/pgvector/blob/master/CHANGELOG.md)). Check `extversion` and whether an upgrade is offered.

Supabase's documented hybrid search fuses `tsvector` full-text search with HNSW through reciprocal-rank fusion (k=50) in one SQL function. It does not use BM25 ([Supabase](https://supabase.com/docs/guides/ai/hybrid-search)). True BM25 in Postgres now exists as Tiger Data's pg_textsearch (v1.0 GA on 2026-04-03, PostgreSQL License: [PostgreSQL.org](https://www.postgresql.org/about/news/pg_textsearch-v10-3264)), but only on self-hosted Postgres.

Rerankers should not ship at launch. Qwen's own table shows Qwen3-Reranker-0.6B scoring **73.42** on MTEB-Code against the embedding baseline's **75.41**, and bge-reranker-v2-m3 scoring 41.38 ([HF](https://huggingface.co/Qwen/Qwen3-Reranker-0.6B)). On technical text, a small reranker can make results worse. ColBERT-style late interaction would need about 4 GB for 30,000 repositories, eight times the whole database.

When the corpus outgrows 500 MB, there are three paths. Supabase Pro costs $25 a month for 8 GB. Self-hosted Postgres on the future server can run pgvector 0.8.7 with pg_textsearch. Neon's free plan offers 1 GB per project ([Neon](https://neon.com/pricing)). All three keep the single SQL function. Free dedicated vector stores are smaller and split the search across systems: Cloudflare Vectorize's free 5M stored dimensions hold only about 6,500 vectors at 768 dimensions ([Vectorize](https://developers.cloudflare.com/vectorize/platform/pricing/)).

## Retrieval evals, not eve, should decide D3 and D4

Vercel eve is real and promising, but it answers a different question. It launched on **2026-06-17** at Vercel Ship ([MarkTechPost](https://www.marktechpost.com/2026/06/17/vercel-releases-eve/)) as an Apache-2.0, filesystem-first TypeScript framework for durable agents, and it is still officially beta ([GitHub](https://github.com/vercel/eve)). Its changelog shows the churn. Release 0.83.0 removed a sandbox provider and cannot be rolled back, because sessions it creates fail on older releases. Release 0.82.0 replaced the per-session cost options ([eve changelog](https://eve.dev/changelog.md)). It requires Node 24 and has no Go or Python SDK ([eve docs](https://eve.dev/docs/getting-started)).

On Hobby, eve inherits every limit of the products it uses ([Vercel eve pricing](https://vercel.com/docs/eve/pricing)):

| Limit | Value |
|---|---|
| Schedules | Each becomes a Vercel Cron job, which Hobby runs at most once a day ([eve schedules](https://eve.dev/docs/schedules.md); [Vercel Cron](https://vercel.com/docs/cron-jobs/usage-and-pricing)) |
| Workflow events | 50,000 a month, roughly 16,000 durable steps by my estimate ([Workflow pricing](https://vercel.com/docs/workflow/pricing)) |
| Run history | Kept one day |
| Use | Non-commercial only ([Hobby plan](https://vercel.com/docs/plans/hobby)) |

`eve eval` checks an agent's final answers and which tools it called ([InfoQ](https://infoq.com/news/2026/06/vercel-eve-agents/)). That makes it the right test for an eve agent and the wrong instrument for choosing an embedding model or deciding whether summaries improve search.

eve's proper place is an optional **"repository analyst" or owner-operations agent**. It would connect to SEFGH's OpenAPI document or MCP server, which eve supports while keeping credentials away from the model ([eve llms.txt](https://eve.dev/llms.txt)), and run the Analyze stage for a few repositories a day behind approval gates. The Go worker must never depend on it.

Vercel's recommended pattern carries over to anything an agent decides. Gate risky tools with `needsApproval`. Remember that interrupted steps re-run, so make every step idempotent. Export the decision log, because Hobby keeps run history for one day ([Vercel KB](https://vercel.com/kb/guide/agent-approval-workflow-stack-guide)). In SEFGH's terms, an agent writes *proposal* rows; deterministic Go applies only allow-listed, budget-capped ones; everything else goes to a review queue; and every decision is appended to an audit table.

### How the evaluation should work

The method that settles D3 (the embedding space) and D4 (LLM summaries) comes from information-retrieval research. Relevance is graded 0-3, with **nDCG@10** as the primary metric and Recall@50 for each retrieval arm, because a reranker can only reorder what the first stage returns.

Configurations are compared with a **paired t-test** on per-query differences. Urbano and colleagues simulated over 500 million p-values and found the t-test robust even at small sample sizes, the Wilcoxon and sign tests unreliable, and the bootstrap biased toward small p-values. They also found that Precision@10 and reciprocal rank have two to four times the variance of other measures, which rules them out as gates ([Urbano et al.](https://arxiv.org/abs/1905.11096)).

No fixed "enough queries" figure exists. Label about 50 pilot queries, measure the spread σ_d of per-query differences, then fix n before looking at results. Adding queries until a difference becomes significant biases the result, and many shallowly judged queries beat a few deeply judged ones ([Webber et al.](https://people.eng.unimelb.edu.au/ammoffat/abstracts/wmz08cikm.html)). As an illustration, σ_d = 0.15 needs about **71 queries** to detect a 0.05 difference and about 196 to detect 0.03.

Pool the top 20 results from every configuration under test for judging. Re-judge whenever a newcomer drops Judged@10 below about 0.9, because unjudged documents count as non-relevant and would penalise the newcomer ([ir_measures](https://github.com/terrierteam/ir_measures)).

LLM judges make this affordable but need guarding:

| Finding | Source |
|---|---|
| The open UMBRELA judge reached only fair agreement with TREC assessors per label (κ about 0.31-0.37 on four levels, 0.42-0.50 binary) while ranking systems well (Kendall τ 0.87-0.94) | [UMBRELA](https://arxiv.org/html/2406.06519) |
| Prompt wording alone moved agreement between about 0.20 and 0.64 | [Thomas et al.](https://arxiv.org/html/2309.10621v3) |
| Among the top 20 systems, τ fell to 0.51 | [Clarke & Dietz](https://arxiv.org/html/2412.17156v2) |
| When the judge model was also a system's reranker, the top-5 ranking inverted (τ −0.40) | [Clarke & Dietz](https://arxiv.org/html/2412.17156v2) |

Two rules follow. The judge must come from a different model family than any model inside the pipeline. And a few hundred owner-labelled pairs should calibrate it, using prediction-powered correction as in ARES ([ARES](https://arxiv.org/html/2311.09476v2)). Synthetic queries generated from READMEs preserve the relative ranking of systems but bias absolute scores ([Rahmani et al.](https://arxiv.org/abs/2506.10301v2)), so report them separately and never use them for go/no-go thresholds. No public benchmark of natural-language-to-repository search was found, so SEFGH's own labels are the deciding evidence. MTEB and RTEB only narrow the shortlist; a large gap between a model's public and private RTEB scores is a warning sign ([HF RTEB](https://huggingface.co/blog/rteb)).

**D4 is decided by retrieval, not by how good the summaries read.** The test is the change in nDCG@10 and Recall@50 between digest d1 with the summary prefix and without it, on the same labels. Contextual Retrieval makes a positive result plausible, but it does not replace the measurement. Summary-quality checks explain the result rather than decide it: JSON validity without repair, label precision and recall against GitHub topics, and faithfulness judged by a model from another family. UniSumEval found G-Eval-style LLM judges agreed best with human faithfulness ratings ([UniSumEval](https://arxiv.org/pdf/2409.19898)). Then pick the cheapest model within a small margin of the best.

### Gating changes in CI

CI runs in two tiers. Tier 1 runs on every pull request with no API keys. It replays frozen candidate lists and scores them in Go, using only `math` and `math/rand/v2`. Tier 2 runs on demand. It embeds the 100-200 queries live against precomputed corpus vectors for each space, judges only new holes, and applies a **non-inferiority rule**: the lower 95% bound of the change in nDCG@10 must stay above −0.02. With σ_d = 0.15 and 100 queries, the confidence half-width is about 0.03, so the margin itself has to be sized after the pilot.

Each embedding space gets an immutable manifest. It records the model ID and revision, native and stored dimensions, truncation, normalisation, query and document templates, and the digest version. The worker refuses to compare vectors whose manifests differ.

Python tools cross-check the Go scorer: ir_measures, or ranx, which adds Tukey's HSD and RRF fusion ([ranx](https://pypi.org/project/ranx)). promptfoo (MIT, owned by OpenAI since 2026-03-09: [TechCrunch](https://www.techcrunch.com/2026/03/09/openai-acquires-promptfoo-to-secure-its-ai-agents/)) can run optional LLM-output assertions.

Keep hosted platforms out of required gates. OpenAI's hosted Evals goes read-only on 31 October and shuts on **2026-11-30** ([OpenAI deprecations](https://developers.openai.com/api/docs/deprecations)), a second 2026 example of a free hosted dependency vanishing. If a trace and annotation interface is wanted later, Langfuse moved its annotation queues and LLM-judge features to MIT in 2025 ([Langfuse](https://langfuse.com/blog/2025-06-04-open-sourcing-langfuse-product)) and stays self-hostable after ClickHouse acquired it ([ClickHouse](https://clickhouse.com/blog/clickhouse-acquires-langfuse-open-source-llm-observability)).

Online evaluation comes much later. Team-draft interleaving is reported to be one to two orders of magnitude more sensitive than A/B testing ([Schuth et al.](https://www.microsoft.com/en-us/research/publication/predicting-search-satisfaction-metrics-with-interleaved-comparisons/)), which suits a low-traffic site.

## Grounded discovery and a stateless MCP server are the open lane

The competitive map has four groups:

| Group | Examples | What it does |
|---|---|---|
| Trend boards | OSS Insight, Trendshift | Rank star momentum but offer little selection |
| Single-repository explainers | DeepWiki, Google Code Wiki | Explain a repository you already know |
| Package-intelligence services | deps.dev, ecosyste.ms | Score packages but are not built for discovery |
| AI answer engines | ChatGPT-style assistants | Answer "best library for X" without grounding |

On OSS Insight's new trending page (2026-03-24), seven of the top eight repositories were AI-agent projects ([OSS Insight](https://ossinsight.io/blog/introducing-trending-page)).

The weakness SEFGH can attack is documented:

| Evidence | Source |
|---|---|
| Models show strong library popularity bias | [arXiv 2503.17181](https://arxiv.org/pdf/2503.17181) |
| Hallucinated package names averaged at least 5.2% for commercial models and 21.7% for open-source models | [Dark Reading](https://www.darkreading.com/application-security/ai-code-tools-widely-hallucinate-packages) |
| 46% of developers distrust the accuracy of AI output | [Stack Overflow 2025](https://survey.stackoverflow.co/2025/ai) |

A "best library for X" answer that can name only repositories in SEFGH's index, cites live signals and checks that a package exists before showing an install command addresses that weakness directly. The nearest products do not do this. GitHub's own 2026 launches, semantic issue search ([GitHub](https://github.blog/changelog/2026-05-20-semantic-issue-search-in-copilot-chat/)) and Agent finder for MCP servers and skills ([GitHub](https://github.blog/changelog/2026-06-17-agent-finder-for-github-copilot-now-available/)), stop short of natural-language repository discovery.

The cheap health signals come with licences that decide what SEFGH may store and re-serve:

| Source | Coverage | Limits | Data licence |
|---|---|---|---|
| OpenSSF Scorecard API | More than 1.3M repositories, scanned weekly | None stated | CDLA-Permissive-2.0 ([Scorecard](https://github.com/ossf/scorecard)) |
| deps.dev | Stars, Scorecard, OSS-Fuzz and OSV advisories | No stated quota or authentication | CC-BY 4.0 ([deps.dev](https://docs.deps.dev/api/v3/)) |
| ecosyste.ms | Ready-made maintainer and issue statistics | Free plan 300 requests/hour | CC BY-SA 4.0 ([ecosyste.ms](https://ecosyste.ms/pricing)) |

Store derived data only from the permissive sources. ecosyste.ms data is share-alike, so use it live rather than storing what is derived from it.

Raw activity counts now lie in two ways. AI triage bots push "time to first response" down to seconds, and auto-merge makes absent maintainers look active ([Nesbitt](https://nesbitt.io/2026/05/27/chaoss-metrics-in-2026.html)). And StarScout found about **6 million suspected fake stars** between 2019 and 2024, mostly boosting short-lived malicious repositories ([arXiv 2412.13459](https://arxiv.org/pdf/2412.13459)). With stargazer identities now closed, SEFGH can guard trending only with aggregate anomaly checks, such as a star burst out of proportion to forks, watchers and contributors.

Ordered by value per effort, the product features are:

| Feature | Data it needs | Cost |
|---|---|---|
| Real trending (day, week, month), with fake-star flags and category filters such as "non-AI" | Daily GraphQL `stargazerCount` snapshot, 100 repositories per `nodes` query; `stargazers/history` backfill when a repository is added | About 500 points a day for 50,000 repositories (inference from the point formula). Daily rows for 50,000 repositories are about 18M a year, more than 500 MB, so keep a 60-90 day window and fetch older history on demand |
| "Is this maintained?" card, showing each rule as pass or fail | `pushedAt`, archived flag, last release, 90-day commits, Scorecard "Maintained" check, bot share | One GraphQL batch plus the Scorecard API |
| Health and security panel | Scorecard checks, deps.dev advisories and OSS-Fuzz, SECURITY.md | One or two external calls per repository per week |
| "Alternatives to X" and "similar repositories" | Nearest neighbours in the embedding index, filtered by ecosystem and re-ranked by health and momentum | Existing index |
| Side-by-side comparison of 2-4 repositories, with shareable URLs | Star history, release cadence, Scorecard, licence, dependents | On demand |
| Grounded AI answers | Index-only recommendations with cited signals; deps.dev existence check | The gateway's model cost |
| Research-code view | Hugging Face `daily_papers` links papers to repositories ([HF API](https://huggingface.co/api/daily_papers?limit=2)) | Free |

The same features become agent-facing through MCP. The current specification version, **2026-07-28**, made the protocol stateless. Sessions, the `Mcp-Session-Id` header and the `initialize` handshake are gone. Servers must implement `server/discover`, list results carry `ttlMs` and `cacheScope`, and `tools/list` should return tools in a deterministic order ([MCP changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)). An MCP endpoint is therefore a single POST handler that suits serverless hosting and host swaps. Authorization is optional. If SEFGH adds it, the server becomes an OAuth 2.1 resource server and must never pass tokens through to Supabase or GitHub ([MCP authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)).

Follow the DeepWiki and Context7 pattern of a few coarse, anonymous, rate-limited tools: `search_repositories`, `get_repository_digest`, `compare_repositories`, `find_similar_repositories` and, optionally, `list_trending`. All of them serve stored data, with no LLM call at request time.

Implementation is a choice between two options. The official Go SDK (maintained with Google; v1.7.0 and later support 2026-07-28; Apache-2.0 for new contributions and MIT for existing code: [go-sdk](https://github.com/modelcontextprotocol/go-sdk)) is a defensible ADR-recorded exception to the standard-library rule, because the specification changed repeatedly in 2025-2026. The alternative is a minimal standard-library JSON-RPC handler for anonymous read-only tools, which is now feasible but has to track that churn.

Around the server, SEFGH should publish an entry in the MCP Registry, which is still in preview and may see data resets ([Registry](https://modelcontextprotocol.io/registry/about)). It should also publish an OpenAPI 3.1 document for the Go API, which eve and other frameworks can consume directly, and an `llms.txt` file with Markdown copies of key pages ([llmstxt.org](https://llmstxt.org/)). An A2A Agent Card can wait until SEFGH runs its own analyst agent.

## One image, environment-driven roles and Postgres leases keep every host swappable

The pipeline's core should remain the HLD's Go worker. It runs the Discover, Enrich, Analyze and Embed stages over a Postgres job table with leases, ticked by `pg_cron` (decision D2, option A). The same binary also accepts `--once --stage enrich --budget 10m` from a terminal and an authenticated `POST /tick`. pg_cron, Cloud Scheduler (three jobs free: [pricing](https://cloud.google.com/scheduler/pricing)), a Vercel Daemon or a systemd timer on the home server can then trigger it interchangeably, and a host change only resumes leased work. Vercel's Workflow, WorkflowAgent and eve are TypeScript-only, so they do not belong in that core.

If the owner later accepts one Go module, **DBOS Transact Go** (MIT) adds durable workflows, queues, schedules and sleep on top of Postgres alone, with no separate server ([DBOS](https://github.com/dbos-inc/dbos-transact-golang)). Like River, it relies on LISTEN/NOTIFY, so it needs a direct or session-mode database connection rather than the transaction pooler ([River](https://riverqueue.com/docs/pgbouncer)). Supabase Queues (pgmq) can be reached over RPC with no new module ([Supabase Queues](https://supabase.com/docs/guides/queues)). Hosted engines have free tiers but add a vendor:

| Engine | Free offer |
|---|---|
| Hatchet (MIT) | 1M runs a month ([Hatchet](https://hatchet.run/pricing)) |
| Inngest | 50k executions a month ([Inngest](https://www.inngest.com/pricing)) |
| Temporal Cloud | Only $150 of credits ([Temporal](https://temporal.io/pricing)) |

Package every Go command from one multi-stage Dockerfile. Building with `CGO_ENABLED=0 go build -trimpath` is perfectly reproducible as of Go 1.21 ([Go blog](https://go.dev/blog/rebuild)). The final stage should be `gcr.io/distroless/static-debian13:nonroot`, which is about 2 MiB and signed by cosign ([distroless](https://github.com/GoogleContainerTools/distroless)). A Dockerfile is the common input for Vercel's Container runtime and Daemons, Cloud Build, Docker Compose and Kamal.

For signing, GitHub artifact attestations need GitHub Enterprise Cloud for private repositories ([GitHub Docs](https://docs.github.com/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds)). The alternative, cosign keyless signing, publishes the repository name in a public transparency log.

The hosting options, as of 2026-10-26:

| Target | Free allowance | Best use | Watch out for |
|---|---|---|---|
| Vercel Hobby | Functions: 300 s, 4 active CPU-hours a month. Daemons (public beta): 5 CPU-hours a month ([Daemons](https://vercel.com/docs/daemons/limits)) | Go API, short ticks | Non-commercial use only ([fair use](https://vercel.com/docs/limits/fair-use-guidelines)); daemons do not run in previews and cannot be added to projects whose root is a subfolder; rollback only to the previous deployment |
| Cloud Run, always-free | Jobs: 240,000 vCPU-seconds a month (about 66 vCPU-hours) ([pricing](https://cloud.google.com/run/pricing)) | CPU worker, sandboxed tarball jobs | Only 6 free Secret Manager versions |
| Cloud Run with GPUs, on the credit | About $1.05/h for an L4 | Measured open-model batches | Paid billing account required; one-hour task cap; 90-day credit |
| Northflank Sandbox | 2 services, 2 jobs and cron, no card ([Northflank](https://northflank.com/pricing)) | Fallback host | Wording of the free allowance is unclear |
| Home server, later | Hardware only | Compose plus Caddy, or Kamal 2 ([Kamal](https://kamal-deploy.org/docs/configuration/proxy/)); llama.cpp `llama-server` for chat, embeddings and rerank ([llama.cpp](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)) | Self-hosted Supabase needs at least 4 GB of RAM ([Supabase](https://supabase.com/docs/guides/self-hosting/docker)) |

Four other hosts are poor fits. Fly.io has no free tier for new organizations ([Fly.io](https://docs.fly.io/about/pricing)) and deprecated its GPUs as of 31 July 2026 ([Fly community](https://community.fly.io/t/gpu-migration-fly-io-gpus-will-be-deprecated-as-of-july-31-2026/27110)). Render's free services sleep, and its workers are paid ([Render](https://render.com/docs/free)). Koyeb is joining Mistral AI ([Koyeb](https://www.koyeb.com/docs/reference/instances)). Cloudflare Containers need the $5 Workers Paid plan ([Cloudflare](https://developers.cloudflare.com/containers/pricing/)).

Configuration is where switching happens. Each role (summariser, embedder, reranker) reads `SEFGH_<ROLE>_BASE_URL`, `_MODEL`, `_AUTH` and `_API_KEY`, or a `_FILE` path, once at startup into a typed struct. A missing or invalid value fails startup, and the log names providers but never keys.

Two exceptions keep this honest. The **embedder** carries an ID that must match the manifest stored with the vectors, so the worker refuses to write on a mismatch: switching embedders is a migration, not a flip. And moving the Go API between hosts is one origin variable read by the Next.js rewrite, which is subject to Vercel's 120-second limit on proxied requests ([Vercel limits](https://vercel.com/docs/limits)).

Runtime toggles, such as "Go serves route X" or "summariser B for 10% of jobs", belong in a Postgres flags table read through the OpenFeature Go SDK ([OpenFeature](https://github.com/open-feature/go-sdk)). Vercel Flags allows only 10,000 flag requests a month on Hobby and would tie SEFGH to Vercel ([Vercel Flags](https://vercel.com/docs/flags/vercel-flags/limits-and-pricing)).

CI/CD has to work around the GitHub Free plan on a private repository:

**No environment protections.** The plan has no environment secrets and no required reviewers ([GitHub Docs](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)). Use Workload Identity Federation with an attribute condition that allows only `main` or tag refs. Google enforces that condition, so it works on GitHub Free ([google-github-actions/auth](https://github.com/google-github-actions/auth)).

**Skipped required checks block merges.** A required check whose workflow is skipped by a path filter stays pending forever ([GitHub Docs](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks)). Make one always-running gate job the only required check, and skip expensive jobs inside it.

**Vercel needs a static token.** Vercel offers no OIDC for deploys from Actions ([Vercel KB](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel)). Either confine `VERCEL_TOKEN` to deploy workflows or keep Vercel's Git integration for the website.

**No database branches.** Supabase Branching is not on the free plan ([Supabase pricing](https://supabase.com/pricing.md)). Add `supabase db lint --fail-on error` and `db push --dry-run` ([CLI](https://supabase.com/docs/reference/cli/supabase-db-lint)) beside the existing native Postgres test.

**Canary before switching.** Deploy Cloud Run revisions with `--no-traffic --tag`, probe them, then shift traffic in steps ([Cloud Run](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration)).

**No paid models in CI.** Contract-test the model gateway against a tiny local model served by Ollama or llama.cpp, never against paid providers.

## Spend the credit clock on measurement, not servers

The $300 credit's 90 days start at sign-up. The cheapest sequence therefore builds the measuring tools before activating the credit:

| Phase | Adopt | Why then | Expected spend |
|---|---|---|---|
| Now, after owner decisions | Model gateway and a replacement for GitHub Models (R-220 contract change); Go 1.27.3; stop calling `npx repomix@latest`, pinning 1.18.1 only as a stopgap | Live outage; R-199 supply-chain risk | About $0 |
| Next | Digest d1 in the Go Enrich stage; 50 pilot queries with graded labels; Tier 1 eval gate; embedding shortlist on a frozen corpus | D3 and D4 need evidence; storage fit must be measured | Cents (Cloudflare, Gemini Batch) |
| Credit window, 90 days | Activate the GCP trial; small measured Cloud Run GPU benchmark; bulk embedding and judging runs; Vertex open-model trial (check billing after a few calls) | The credit expires; GPUs need the paid upgrade | At most $300 |
| Then | MCP server, OpenAPI and `llms.txt`; star-history trending; maintained card and health panel; Registry listing | Product differentiation | Free tiers |
| Later, on the server | Self-hosted Postgres with pgvector 0.8.7 and pg_textsearch; `llama-server`; optional LiteLLM; optional eve analyst agent | Growth past 500 MB | Hardware |
| Avoid | eve or Vercel Workflow as the pipeline; hosted wikis as inputs; ColBERT; Jina's non-commercial models; Temporal Cloud; Fly.io; hosted-only eval gates; any design that lists stargazers | Wrong shape, wrong licence or no free tier | — |

Several things remain unmeasured or unconfirmed, and each blocks a specific choice:

| Unknown | What it blocks |
|---|---|
| Real GraphQL point cost of the digest queries and the daily snapshots | Digest batch size and the trending refresh schedule |
| Whether the trial credit covers Vertex open-model APIs | The cheapest hosted open-model path |
| Official free-tier Gemini limits | Free-tier throughput planning |
| GPU throughput for any candidate model | Whether a GPU batch beats Gemini Batch on cost |
| Whether Supabase offers a pgvector newer than 0.8.0 | Exposure to the 2026 HNSW bugs |
| σ_d for repository search | The size of the query set and the CI margin |
| Whether a summary actually improves retrieval for SEFGH's corpus | D4 |

## Conclusion

The 2026 changes reward one discipline: treat every hosted dependency as temporary. GitHub Models went from closed to new customers to retired in six weeks. OpenAI's hosted Evals goes from read-only to shut down in a month. GitHub closed stargazer listings, a long-standing data source, on privacy grounds. What survives such shocks is portable: Apache-licensed models served by several hosts, an OpenAI-compatible wire format, contract fixtures, and a Postgres-centred core. The useful asymmetry is that the **summariser can be disposable but the embedder cannot**. Choose the summariser for price and swap it freely, freezing each generation. Choose the embedding model as if permanent, preferably one that exists both as an API and as open weights. For SEFGH, that means Qwen3-Embedding-0.6B is worth testing first, not just the highest-scoring model.

The second shift is where SEFGH's value sits. GitHub's star-history endpoint makes trending a commodity, wikis explain single repositories for free, and general AI assistants still invent packages. The defensible product is judgement with receipts: a recommendation drawn only from indexed repositories, with every claim tied to a live, licence-clean signal. That judgement serves people and AI agents alike through the same MCP server. Dollars are not the constraint: by the arithmetic above, summarising 20,000 repositories and embedding 50,000 costs well under $30 on any hosted option, and nothing locally. The scarce resources are the 500 MB database, the 90-day credit clock and the owner's attention. Those are best spent on the labelled query set, because every later decision (embedder, summaries, reranker, provider) is only as good as the evidence that set produces.
