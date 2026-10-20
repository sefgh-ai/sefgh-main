# PHASE5-001 verification evidence

2026-10-20, Codex on Windows. Base `0ebd7435bd77f68ff1292b1076fd838846e9fbb4`.
This verifies local migration tooling and a source snapshot, not a deployed
Python/Go worker or corpus. Existing application routes and switches unchanged.

## Boundaries established

- Current frontend executes GitHub repository search, with no source wiring to
  the inspected semantic APIs.
- Google FastAPI and packaged Ollama candidates use different vector columns,
  RPC names/parameter encodings and response shapes. Buffered code can mix
  Ollama corpus and Google query embeddings. No authoritative runtime/corpus
  identified. No Python imported/executed or external model queried.
- Source-drift tool checks 32 allowlisted local files by SHA-256; no `.env`,
  data rows, credentials or private transcripts included in source artifacts.
- Go comparator has no HTTP registration or model/database dependency. Its
  examples contain synthetic IDs/model/scores. It validates claimed identities;
  it cannot certify their truth or the actual provenance of stored vectors.
- No SQL mutation, route activation, live indexing, re-embedding, deployment or
  performance/cost comparison occurred. Playground catalog query again refused
  by connector with MCP -32600; key lifecycle gate remains closed.

## Checks run by Codex

| Check | Actual result |
|---|---|
| `go test -count=1 ./internal/searchparity ./cmd/searchparity` | Both new packages pass |
| Backend `go test -count=1 ./...` | 34 packages pass |
| Backend `go vet ./...`, `go build ./...`, `gofmt -l .` | Vet/build exit 0; format empty |
| `npm run test:contracts`, isolated retry | 1451/1451 pass |
| `npm run lint` | Exit 0, no ESLint errors/warnings; existing baseline-browser-mapping data-age notice |
| `go test -p 2 -count=1 -tags solution ./...` in learn-go | All 40 lesson solution packages pass |
| Lesson solution `go vet -tags solution ./...`, `gofmt -l .` | Vet exit 0; format empty |
| Lesson 39 without solution tag | Intentionally fails three unfinished cases; owner's exercise preserved |
| `node --test scripts/contracts/semantic-evidence.test.mjs` | 2/2 pass |
| `node scripts/semantic-source-snapshot.mjs --root D:/SEFGH` | All 32 pinned files match |
| Built `bin/searchparity.exe`, example comparison at k=3 | Exit 0, parity true, one judged synthetic query |
| New doc relative links and `git diff --check` | No missing targets or whitespace errors |

New regressions cover every identity field, reordered query records, different
query/parameter hashes, duplicate/missing queries/results, top-k bounds, changed
rank with matching scores, score tolerance, short/empty results, absent judgments,
relevance counting, invalid/nonfinite scores and options, missing/null score,
duplicate/unknown JSON members, malformed/trailing/oversized JSON, command exit
0/1/2, example artifact hashes, and source match/change/missing/path traversal.

## Failures and limits

The first full lesson/Node/backend launch was too concurrent for this Windows
session: two Go lesson linkers reported "paging file is too small", and two Node
test processes reported VirtualAlloc failure. No assertion failure established.
Backend tests/vet/build passed. Isolated Node retry passed all 1451 tests; lesson
retry with `-p 2` passed all 40 packages. No host setting changed or unrelated
process killed. One source listing failed printing emoji through cp1252, rerun
with escaped output; one Node test invocation used learn-go as cwd and was rerun
from repo root. Neither changed application behavior.

No new Next.js production build/browser/forwarding run was needed for this batch:
no frontend, handler, API wiring or route contract changed. Previous batch's
commit49c33b2 is independently confirmed by hosted CI39386698512, including its
Chrome step; that is not CI for PHASE5-001. Local race detector, actual PostgreSQL
RPC execution, SDK/framework coercion/errors, deployed credentials, model/output
dimension, corpus provenance, live relevance and ingestion recovery remain
unverified. These are explicit gates in the [worker plan](../plans/analysis-search-workers.md).

Independent review: pending in the active checkpoint. Normal completed handoff,
Git Agent commit/remote receipt and new hosted CI also pending; verify actual
outcomes rather than treating this report as a synchronization signal.
