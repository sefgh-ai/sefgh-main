# Frozen semantic-search evidence, version 1

PHASE5-001 adds an **offline comparison format and tool**, not a replacement
search API. The Python candidates still need an authoritative deployment/corpus
choice and verified database definitions. Their source boundaries are recorded
in [the worker plan](../../docs/plans/analysis-search-workers.md).

## Run it

From `backend/` in PowerShell:

```powershell
go build -o bin/searchparity.exe ./cmd/searchparity
./bin/searchparity.exe -baseline ../contracts/semantic-search/example-baseline.json -candidate ../contracts/semantic-search/example-candidate.json -k 3
$LASTEXITCODE
```

Use `bin/searchparity` on Linux/macOS. The five `example-*.json` files contain
synthetic data, model names and scores; they test the checker only. No live
embedding, SQL ranking, throughput or retrieval-quality result was measured.

## Freeze before comparing

A run has `version: 1`, `identity`, and a nonempty `queries` array. Identity
requires all fields shown in the examples:

- Pipeline, provider-qualified model and exact model revision/digest.
- Dimension, normalization and document/query task or prefix conventions.
- Vector column, RPC and metric. Metric records the score convention too;
  `cosine-similarity` and `cosine-distance` must not share an identity value.
- `corpus_sha256`: SHA-256 of the frozen corpus artifact, including stable IDs,
  content/revision and stored vector provenance. Synthetic example: exact bytes
  of `example-corpus.json`.
- `preparation_sha256`: SHA-256 of the preprocessing manifest, including text
  construction, truncation, prefixes, task types and code/model revisions.
  Synthetic example: exact bytes of `example-preparation.json`.

Each query has a stable `id`, a `request_sha256`, and ordered `hits` containing
string `id` and finite numeric `score`. Hash the exact frozen request artifact,
including query text, filters, limit, threshold and any embedding/RPC options.
The example hashes the exact bytes of `example-request.json`. An empty result
uses `[]`; missing or `null` hits are invalid. Duplicate query/hit IDs are invalid.

The baseline may include unique `relevant_ids`, assigned independently of the
candidate results. The candidate must not include judgments. The tool uses only
the baseline's judgments. Missing/empty judgments produce `null` quality fields
and do not certify quality. The format does not yet distinguish an explicitly
judged query with no relevant documents; do not claim no-answer accuracy from it.

Frozen example artifacts use LF line endings, matching this repository's Git
attributes. Hash their exact bytes after normalization; do not regenerate a
Windows CRLF file while retaining its old hash. The artifact guard checks both
the hashes and LF bytes. Sibling source hashes intentionally describe the local
source bytes, whose line endings are outside this repository's control.

The checker trusts the supplied metadata. It validates hash syntax and identity
agreement, but does not read a corpus, verify the claimed hashes against files,
generate embeddings, prove a model revision, or check the SQL metric. Verify
those artifacts independently before accepting a real run. Do not put secrets,
private repository content, user queries or service-role credentials in Git;
use approved public/synthetic corpora or store restricted captures outside Git.

## What the report means

Exit `0` means identical top-k repository IDs in the same order and scores within
the absolute `-score-tolerance` (default `0.000001`). Exit `1` prints a valid
report with a ranking/score difference. Exit `2` means invalid/incompatible input
or an I/O error; no parity report is emitted. `-k` defaults to 10 (range 1..1000).
Files are limited to 8 MiB, 10,000 queries and 1,000 hits per query. Unknown fields,
duplicate JSON members, case/Unicode aliases of canonical lowercase ASCII keys,
omitted scores and trailing JSON are rejected.

Scores are compared by repository ID within top-k, so a rank change is visible
even when the underlying scores match. Differences below k are outside the
selected comparison, and query order in the two run files may differ. A score
tolerance controls numeric comparison only; it is not an approved quality gate.

For each query with nonempty judgments, `recall_at_k` is the number of relevant
IDs found divided by the number of relevant IDs. `reciprocal_rank_at_k` is
`1 / rank` of the first relevant hit, or 0 when there is none. They are per-query
measurements, not aggregate MRR. Matching lists can both have poor relevance.
There is no quality pass/fail threshold or production cutover approval in this tool.

Fixtures outside `backend/` require `go test -count=1 ./...`. The package tests
read the examples; CLI tests exercise success, difference and invalid exits.
