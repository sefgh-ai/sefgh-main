# KEYS-HTTP-001 evidence

2026-10-20, Codex on Windows. Base5ff5db468291b91652aa32223f9cbb558bce6a64.
This batch advances the already-reviewed key core through dependency-free HTTP
boundaries. No production store, SQL, runtime registration, new switch, browser
change, provider credential or deployment. Original route count remains23/25.

## Implemented scope

- Bearer-only POST/GET /api/v1/keys and owner-scoped idempotent DELETE. A required
  trusted session factory verifies the Supabase bearer and returns owner-bound
  management; the HTTP body cannot name an owner. Real token/DB binding remains
  a future adapter responsibility and RLS gate.
- Strict canonical JSON names, duplicate/alias/extra/trailing/type rejection,
  UTF-8/content type/body/name/scope limits; no-store for all outcomes. Creation
  reveals through the core's one-time handle; list returns metadata only.
- GET /api/v1/search admits the API key through the real core, generates request
  IDs on the server, and uses the actual GitHub search parser/mapper. New requests
  omit all incoming credentials. An owned client and fresh Transport inherit no
  supplied/default credential wrapper, cookie jar or proxy callback. The mapper's
  detailed logger is discarded; fixed usage outcomes remain the server record.
- Private/missing/duplicate/aliased visibility is refused. Optional visibility
  must be canonical public, consistent with private:false. Provider output is
  bounded and buffered until accounting completes; cancellation is checked again
  immediately before release. Failed completion yields fixed503 and an exact
  safe receipt to a required bounded server recovery sink, never to the browser.
- Whole request/read budget18s maximum, provider timeout10s maximum within that,
  detached completion10s maximum and recovery1s maximum. Worst total29s is below
  the existing server's30s write timeout. Trusted callbacks must honor contexts;
  a mock cannot establish production durability or forcibly interrupt a broken
  adapter. Actual stalled incoming body is covered through net/http drain.

The new [HTTP fixtures](../../contracts/api-key-http/README.md) are proposed
version1, not a change to legacy HTTPv2. Thirty-six serial scenarios use real
HTTP/core logic with synthetic session verification, the existing test-only
atomic store and a local GitHub server. Policy/charge/expiry values are explicit
synthetic proposals. No real GitHub/Auth/Data API or user/key rows were queried.

## Findings and corrections

Self-review:
- R137: compatibility JSON reader intentionally discarded duplicate members;
  actual duplicate-private case returned200 before correction. Explicit token
  reader now rejects repeated members.
- R138: socket timeout can precede context timer; deterministic test returned400
  before correction. net.Error classification now reports504 independently.
  Actual stalled socket/body and timer-order cases pass ten repeated runs.
- R136: existing shared Go search logger records transport URL/query. A synthetic
  failing transport reproduces query in its logger; this remains open pending
  original route cutover. New adapter suppresses the detailed logger, with a
  regression proving no default-log/query/provider payload escapes.

Sartre's independent first review required three corrections, reproduced red:
- R139: cancellation during successful detached completion still returned200
  and provider body. Final context guard now withholds it; accounting remains
  completed exactly once with the provider's observed successful outcome.
- R140: cloned/default transport injected a synthetic Authorization header after
  request headers were cleared. Actual injector was called and credential reached
  local server before correction. Constructor now offers no client/transport
  input; it owns a fresh transport, ignoring default client/transport/jar/proxy.
- R141: private:false with private/internal/aliased/wrong-type visibility passed.
  Canonical public visibility guard now refuses those cases.

All those targeted regressions pass. SaveRecovery failure remains fixed503;
durable outbox/reconciliation and adapter conformance are explicit later gates.

## Verification receipts

Codex local full backend35 packages pass, vet/build exit0, gofmt empty. Node
contracts1485/1485 and strict lint exit0. Existing browser-mapping age notice is
still emitted on stderr; no ESLint warning/error. All42 lesson solution packages
pass, solution and exercise vet clean, gofmt empty. New lesson41 ordinary and
solution builds pass. Its exercise is deliberately unfinished; expected untagged
failure is checked separately and is not an application regression.

The last additional test-only privacy characterization passes focused tests
after the full backend run. Sartre's final independent acceptance covers the
corrected adapters,36 fixtures and lesson41; actual targeted checks are in
REVIEW-015. Lesson41 without solution tag fails three exercise cases as intended.
Normal handoff will repeat all contracts/fresh Go tests/vet/format/lesson
solutions after final files and writer release. Actual handoff/commit/remote/
hosted CI are separate receipts to inspect, not established by writing this report.

New lesson/contract local links,141 unique contiguous register IDs and diff check
pass. Existing exercise.go files untouched. No application/UI/HTTP wiring changed,
so parent did not repeat production Next build/browser/forwarding; hosted workflow
will exercise those against the eventual commit. Prior39435127091 success proves
base5ff5db4 only. Local race remains unavailable (no C compiler).

## Access and remaining gates

Owner confirmed SEFGH is a custom MCP connection in ChatGPT settings. That
connection's tools are not exposed in this running session; resource inventory
reports unknown server. The separate available Supabase connector lists no
expected project and denies read-only columns query with MCP-32600. Sanitized
local Codex MCP inventory also has no SEFGH entry, which does not establish the
state of the custom ChatGPT connection. No unrelated project/secret/row read.

When the custom connection is exposed, read the expected SEFGH catalog using
supabase/checks/keys_001_catalog.sql; obtain actual grants/RLS/relationships/
triggers/RPCs; prepare owner-reviewed SQL and rollback/denial tests. Then build
user-token management and narrowly scoped accounting/recovery adapters, agreed
rollout limits/retention, show-once UI, runtime wiring, preview/forwarding and
cutover. Existing plaintext-key behavior/R039 remains; R090 share behavior stays
preserved until Go cutover. Worker execution remains explicitly owner-gated.
