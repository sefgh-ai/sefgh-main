# Analysis and search workers: lineage and migration gate

Tasks PHASE5-001 and PHASE5-002 / BUG-013, 2026-10-20. This records inspected local source, not the active
deployment or verified database configuration. No sibling checkout was changed,
no Python service imported, and no provider/database call made.

## What the app calls

`src/hooks/search/useGitHubSearch.js` calls `/api/github/search` (three request
sites); chat repository suggestions do too (`src/app/chat/page.js`). The Next
handler and optional Go replacement call GitHub repository search. The route
configuration has no semantic-service rewrite. Searches for `match_repo_analysis`,
`match_repos_`, `RepoAnalyser` and local service ports in executable frontend
source found no caller of the Python services below. Marketing copy saying
"semantic" is not evidence of that integration.

## Local candidates

Paths below are relative to `D:/SEFGH`, outside this Git repository. Exact file
hashes are in [source-snapshot.json](../../contracts/semantic-search/source-snapshot.json).
The read-only checker detects changed/missing source before a later agent relies
on this snapshot:

```powershell
node scripts/semantic-source-snapshot.mjs --root D:/SEFGH
```

It reads the explicit allowlist only, prints paths/statuses, rejects real paths
that escape the declared root through symlinks/junctions, never imports Python
or reads `.env`, and cannot establish deployment or corpus identity. Missing
siblings are expected on hosted CI; its own tests use temporary source files.

### Google FastAPI and embedding worker

`search engine/RepoAnalyser/search_api.py:29-69` defines `GET /health` returning
`{"status":"ok"}` and `POST /search`. Request fields: required `query` with
minimum length 1, `top_k` default 5/range 1..25, `min_similarity` default 0.2/range
0..1. The code does not trim whitespace. Exact FastAPI/Pydantic coercion and
validation responses have not been captured; `requirements.txt` is unpinned.

The query call uses `genai.embed_content(model=EMBEDDING_MODEL, content=query,
task_type="retrieval_query")`. Source default is `models/gemini-embedding-2`,
overridable by environment. There is no explicit output dimension or model
revision. RPC is `match_repo_analysis` with **array** `query_embedding`,
`match_threshold` and `match_count`. Success passes data through as `{results}`;
`response.error` or `data is None` raises 500. SDK-thrown exceptions and framework
error envelopes require executable characterization after the runtime is pinned.
The client is constructed with a service-role key. No route authentication,
quota, or explicit upper query length is present in this local source; external
controls and deployment exposure are unverified.

`embed_repos.py:30-101` constructs documents in this order: nonempty
`llm_description` prefixed `Summary:`, normalized labels prefixed `Labels:`,
`README:\n`, `File Structure:\n`, joined with two newlines, stripped, sliced to
`MAX_TEXT_CHARS` (default 12000 **Python characters**, not JS UTF-16 units or Go
bytes). Lists of labels omit `None`; other values use Python `str`. Documents
use the same configurable model with `retrieval_document`. It reads up to 25
`repo_analysis` rows with `embedding IS NULL`, then updates `embedding` by repo ID.
There is no source model/dimension/provenance validation. Empty documents are
skipped but remain eligible forever (R-117).

`supabase_setup.sql:1-44` proposes `repo_analysis.embedding vector(768)`, cosine
IVFFlat (lists 100), and `match_repo_analysis(vector(768),float,int)`. Its strict
filter is `1 - cosine_distance > match_threshold`; ascending cosine distance,
then limit. Equal-distance tie order is unspecified. Returned fields are
`repo_id` **text**, similarity, llm_description, labels, readme, file_structure.
There is no ReposMeta join or GitHub-card data in this result. This SQL is not
evidence that these definitions are installed.

`main.py:122-180` analyzes rows from `ReposMeta`, generates descriptions/labels
with Gemini, inserts/updates `repo_analysis`, then separately marks metadata
analyzed. Reanalysis does not invalidate a previously stored `embedding`, so the
embedding-only worker can leave vectors describing older text (R-119). Do not
run this script for discovery: it clones repositories and writes data.

### Buffered implementation

`search engine/RepoAnalyser/buffer/run.py` offers local analysis or Flask;
`buffer/app.py` constructs `SimpleAnalysisService` and exposes analysis routes.
`buffer/config.py` defaults `LLM_PROVIDER=ollama`, `nomic-embed-text`.
`SimpleAnalysisService` chooses its embedding provider by that setting and saves
`description_embedding`. However, `buffer/services/search_service.py:7-17`
always constructs the Google `EmbeddingService`, whose source constant is
`models/text-embedding-004`/768. Its database helper calls **`search_repositories`**
with a **pgvector string**, threshold and count. This can query an Ollama corpus
with Google vectors (R-116); equal dimensions do not resolve it. Database errors
are swallowed into `[]`, which the service can present as successful zero matches.
The inspected Flask app does not register this search helper as a search route.

### Packaged Ollama and legacy checkout

Independent read-only mapping by Mill confirms `RepoAnalyser-ai/pyproject.toml:45` exposes `src.cli:main` and `src.web_server:main`. Settings defaults are generation `gemma3:4b`, embeddings `nomic-embed-text`, declared 768 dimensions. `src/llm/ollama.py:199` posts `{model,prompt}` to `/api/embeddings`, returns the provider vector unchanged and formats it as a pgvector string. No explicit caller normalization, dimension or finite-value check occurs; provider behavior is unverified. CLI/parallel and separate web-batch paths embed `llm_description`; CLI/web search embed the query with the same client. Storage is `repo_analysis.description_embedding`.

`src/database/repository.py:271` calls `match_repos_cosine` with string `query_embedding` and `match_count`. Saved `sql/vector_search_functions.sql:12` declares vector(768), joins `"ReposMeta"`, and returns analysis UUID, integer repo_id, full_name, description, JSONB labels, spoken_language and similarity. Its additional L2/inner-product functions use different score conventions. Web `POST /api/search` takes query and limit (default 10), returns `{success:true,data:results}`; empty query/errors return `{success:false,error}` without an explicit non-200 status. This is different from the Google `{results}` API. Exact framework parsing/status and installed RPC definitions still need executable characterization. Writers hard-code model provenance despite configurable models (R-120); separate metadata completion and missing-vector paths need recovery work (R-121/R-122). Flask analysis controls have no local auth gate (R-123); live exposure is unknown.

Legacy `RepoAnalyser/main.py:118` is a single-repository Gemini description/label writer with no embedding call. Its buffer runner/app use `SimpleAnalysisService`; `buffer/main.py` selects `OptimizedAnalysisService`. Both support provider selection, defaulting to Ollama ingestion. Standalone `SearchService` always uses Google text-embedding-004/768 and retrieval task types, confirming the same R-116 mismatch; no caller wiring that helper into the inspected Flask app was found. SQL proposes `repo_analysis.description_embedding` and optional `repo_chunks.embedding`, both vector(768). Same-named `search_repositories` in `buffer/database/setup_v2.sql:127` returns full_name; `migrate_add_embedding.sql:37` omits it. These are separate candidate contracts until the installed definition is obtained.

The 40-file snapshot includes these cited legacy launchers/services/SQL variants. Local launchers and README deployment claims do not identify an authoritative deployment or corpus. Keep candidates separate.

### RepoSync is not yet a proven upstream for these analyzers

`RepoSync/main.py:665-679,805-829` maps GitHub GraphQL nodes and inserts into
**`repositories`** keyed by GitHub `databaseId` as `repo_id`. The analyzers above
read **`ReposMeta`** keyed by `id`. No connecting transfer/trigger/view has been
verified. Do not invent a direct ingestion chain between them.

RepoSync has token rotation, backoff, topic status and asynchronous monitoring
writes. Its `False` return conflates existing rows and exhausted insert failures;
the caller counts both as duplicates, and the topic loop marks completion
(R-118). This matters to Phase 4 recovery acceptance. It has not been ported.

## The offline Go foundation

[`searchparity`](../../backend/internal/searchparity/parity.go) and its
[CLI](../../backend/cmd/searchparity/main.go) compare frozen local runs using the
[version-1 evidence format](../../contracts/semantic-search/README.md).

Completed in this batch: strict model/corpus/preparation/RPC identity checks,
query/request-set checks, top-k order and numeric score comparison, per-query
recall and reciprocal rank from baseline-only labels, synthetic examples,
regression tests and [lesson 39](../../learn-go/39-comparing-frozen-search-runs/README.md).
The tool has no network client and is not registered in the API server. It does
not calculate embeddings or pgvector rankings, certify claimed hashes, measure
runtime/cost, or approve a relevance threshold. It adds no production route.

## Next implementation sequence

1. Owner decision (2026-10-20): **deployment is not confirmed; keep worker execution gated**. No candidate is selected by default. Identify the authoritative worker/search deployment and operator, actual entrypoint/configuration, model revision/digest and corpus lineage from deployment records before worker execution or replacement.
2. Obtain read-only catalog definitions for the selected database: actual table,
   key types, vector dimensions/index/opclass, RPC signatures/bodies/permissions,
   RLS/grants/triggers and the RepoSync-to-analyzer transfer if one exists.
   Inspect model provenance for stored vectors; re-embedding is a separate
   reviewed data operation if it cannot be established.
3. Freeze a public/approved corpus and independently labeled queries, model and
   preparation artifacts. Capture the original service request/status/body,
   upstream payload, result mapping, errors, empty input, threshold boundaries,
   ties, cancellation and resource limits with stubbed providers first. Pin
   framework/SDK versions; do not guess FastAPI coercion or raw exception bodies.
4. Port the selected search orchestration to a default-off Go boundary. First
   reproduce existing contracts, with defects explicit. Scope worker credentials
   separately from user API authorization; do not reuse frontend service-role
   access. Preserve model/dimension/prefix/normalization/RPC conventions.
5. Capture real baseline/candidate runs against the same frozen experiment;
   verify artifact hashes, compare rankings/scores and labeled relevance using
   the offline checker. The owner/reviewer must choose quality, throughput,
   recovery and operational acceptance criteria from measured evidence.
6. Port ingestion/analysis execution separately: bounded concurrency, timeouts,
   leases/checkpoints, distinguish duplicate/retryable/permanent failures,
   restart/partial-write/embedding-invalidation tests, and reviewed atomic
   ownership. No dual writes. Obtain preview/cutover approval and test rollback.

Phase 5 has started its source/evaluation foundation. It is **not complete**;
worker execution, active corpus selection, live parity and deployment are gated.
Phase 4 RepoSync and Phase 7 retirement remain separate work.
