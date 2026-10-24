# RepoSync worker contract

**Version 1** (REPOSYNC-001, 2026-10-24): 13 cases, 7 marked defect, recorded from the Python worker in `D:/SEFGH/RepoSync` at commit `056d339`. The three source files' SHA-256 are in `cases.json` (`source`). RepoSync is Phase 4 work in `docs/adr/0002-go-backend.md`: a GitHub GraphQL ingester, not a web route.

```powershell
# Inside backend:
go test -count=1 ./internal/reposync ./cmd/reposync
# Check the recording (needs the pinned packages below):
python scripts/reposync/record.py --source D:/SEFGH/RepoSync
# Re-record:
python scripts/reposync/record.py --source D:/SEFGH/RepoSync --write
```

## How it was recorded

`scripts/reposync/record.py` runs RepoSync's own `main.py`, `db_writers.py` and `shared_logger.py` against a fake GitHub GraphQL endpoint and a fake PostgREST server on localhost, one case per fresh process. Only those three files are copied into a temporary folder, so RepoSync's `.env` is never read, and nothing reaches GitHub or a database. The recorder refuses if the source no longer matches the recorded hashes.

Pinned packages (a virtual environment, Python 3.12.1): `supabase==2.24.0`, `postgrest==2.24.0`, `httpx==0.28.1`, `requests==2.31.0`, `python-dotenv==1.0.1`. The PostgREST requests come from `postgrest-py`, so its version decides the query strings and `Prefer` headers pinned here.

To make a run repeatable:

- The clock is fixed: UTC 2026-10-24 12:00, local 17:30 (Asia/Calcutta, as on the machine RepoSync ran on).
- `time.sleep` only records its seconds; consecutive equal sleeps are merged.
- Monitoring writes, which the original makes on background threads, run inline so their order is stable.
- Timestamps become their format (`<time:naive>` local without zone, `<time:Z>` UTC); measured durations become `<measured>`.
- A bulk insert's `columns=` parameter is sorted, because `postgrest-py` builds it from a Python set.

The recorder calls `process_pending_topics` once with cycle 0, then flushes the usage batch unless the run crashed. A crash is recorded as `raised`, with the calls made before it.

## What is pinned

Each case's `setup` gives the keys, the `topic_list` rows, GitHub's replies in order, and what the fake database holds. `expect` gives the return value, every GitHub request (key number, query name, variables), every PostgREST request (method, path, decoded query, `Prefer`, body), the sleeps, and the keys' final state. The GraphQL text is in `queries.json`, byte for byte; the Go code's copy is checked against it.

## Defects kept on purpose

The port reproduces these so the two can be compared before any cutover. Each is in `docs/bug-register.md`.

| Case | Entry | What happens |
|---|---|---|
| `rate-limit-rotates-key` | R-189 | The backoff is doubled and immediately reset by the key rotation, so it is always 60 s |
| `all-keys-exhausted-crashes` | R-190 | With every key exhausted the worker raises `TypeError` (naive minus aware time) and stops; the topic stays `in_progress` |
| `in-progress-topic-stranded` | R-191 | A topic left `in_progress` is never picked up again |
| all cases | R-192 | The queries never ask GitHub for `cost`, so every cost figure is 0 |
| `search-ceiling-marked-complete` | R-193 | GitHub search stops at 1,000 results; the topic is still marked completed |
| `page-failure-marked-complete` | R-194 | A page that fails three times ends the topic, which is still marked completed |
| `graphql-errors-with-data` | R-195 | A reply with both data and errors is retried as a failure |
| `insert-conflict-counted-duplicate` | R-118 | A refused insert is counted as a duplicate after three attempts |

## Differences in the Go port

- Monitoring rows are written inline, in the recorded order, rather than on background threads.
- A page's measured time is at least one microsecond: Go's monotonic clock on Windows can read a very fast page as zero, which would skip the ETA.
- Error text for a failed connection or unreadable reply is Go's, not Python's `requests` text. No case records one.
- GraphQL errors are stored as Python's `repr` (`pyRepr` in `pyfmt.go`), checked against Python's output for quotes, escapes, `True`/`None` and float forms.
- `cmd/reposync` refuses to start without `REPOSYNC_ENABLED=1`; worker execution stays gated until the owner approves a deployment.
