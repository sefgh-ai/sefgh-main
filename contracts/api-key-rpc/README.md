# Proposed API-key database RPC protocol, version1

New unregistered protocol for the owner-approved hashed lifecycle. SQL is
unapplied; rollout settings, credentials and legacy rotation remain unapproved.
It does not replace the old playground HTTP contract. See [SQL review](../../docs/database/keys-001-review.md).

All calls POST /rest/v1/rpc/name with public schema profile and project public
key. Management retains the verified non-anonymous user's bearer; accounting
uses a separate trusted accountant JWT. No fallback or service-role CRUD.

| RPC | JSON arguments | Success JSON |
|---|---|---|
| sefgh_key_issue | user: p_name, p_scopes=[repo:read:public] | {key: metadata,secret: canonical credential}, once |
| sefgh_key_list | user: p_after_created/p_after_selector, both null or timestamp/id | {items: metadata[],next: {CreatedAt,Selector} or null} |
| sefgh_key_revoke | user: p_selector | void: empty body or null |
| sefgh_key_policy | accountant: {} | enabled policy/revision and endpoint mapping |
| sefgh_key_lookup | accountant: p_selector | flat metadata plus verifier_hex |
| sefgh_key_reserve | accountant: p_selector,p_verifier_hex,p_request_id,p_endpoint,p_revision | Reservation |
| sefgh_key_complete | accountant: p_receipt | void |
| sefgh_key_recovery | accountant: p_receipt | void |
| sefgh_key_pending | accountant: p_after_started/p_after_request, both null or timestamp/id | {items: [{Reservation,Receipt: Completion or null}],next: {StartedAt,RequestID} or null} |

Metadata has exactly id,owner_id,name,prefix,scopes,created_at,expires_at,revoked_at.
Only issuance contains secret; lookup's64lowercase-hex digest is server-only.
Owner pages sort created_at/selector descending; pending pages sort
started_at/request_id ascending. Tie ordering uses bytewise C collation. Each
page has at most100rows; next is its last cursor only if a101st row existed.

Reservation contains RequestID,Selector,Owner,Endpoint,StartedAt. Completion
contains Reservation,Outcome,Status,FinishedAt. Times are finite RFC3339;
instant equality allows equivalent Z/+00:00 spellings. Exact bound-result
retries are idempotent; saved or completed contradictory results are rejected.
Missing receipt means unknown outcome and never authorizes provider replay.
No credential, query or provider response enters these receipts.

Own SQL P0001 errors have fixed SEFGH_KEY_ suffixes OWNER,INPUT,ACTIVE_LIMIT,
UNAVAILABLE,DENIED,LIMIT,REPLAY,ACCOUNTING. Go maps known own identifiers and
collapses unknown errors/gateway/transport/payload failures to unavailable.
No raw database payload is returned/logged. Ambiguous issuance is not retried.
Strict response parsing rejects duplicate/missing/extra/wrong-case fields and
types; adapters also validate metadata, binding and cursor progression.

Executable coverage: [native SQL runner](../../scripts/keys-postgres-test.mjs),
Go apikey rpc_test/rpc_edges_test/rpc_paging_test, existing lifecycle conformance
and36 proposed HTTP fixtures. Run fresh Go tests with -count=1. Native SQL runs
in a separately labelled disposable Docker fixture and a dedicated CI job.
