# Remaining API route completion: review packet

Prepared by Codex on 2026-10-30, ROUTE-CLOSE-001 / KEYS-WIRING-001,
base `5889bff`. The owner asked to finish the remaining route work.

Execution update, 2026-10-30 (base `fb34d4e`): the owner approved both exact
requests below. The narrow refresh patch has been applied locally. Development
replacement/provisioning/acceptance is authorized under the unchanged proposal
hash, but not executed: browser selection and inventory returned "The browser
access host is unavailable", including the retry after resuming. No Supabase
connector is exposed. Fresh signing/catalog prerequisites cannot be verified;
no replacement key/password/user/session/accountant token/run was created.
Restore browser access, then resume the approved preflight without asking for
the same approval. Production/runtime/cutover/deployment remain excluded.

## Playground keys: local integration

The reviewed hashed-key lifecycle, owner RPC, accounting RPC and HTTP adapter
are connected to the production Go mux at:

- `POST /api/v1/keys`: verified owner creates a show-once key.
- `GET /api/v1/keys`: verified owner lists metadata only.
- `DELETE /api/v1/keys/<selector>`: owner-scoped, idempotent revocation.
- `GET /api/v1/search`: public search with atomic admission/accounting.

This replaces the old plaintext flow; it is not a parity copy of
`POST /api/playground/keys`. That old handler and the legacy UI remain until
authorized cutover/retirement. The local integration introduces no live flag,
database, signing, policy, key or user changes.

| Gate | Required setting/evidence |
|---|---|
| Direct Go runtime | `SEFGH_KEYS_V1=1`, valid existing Supabase URL/public key, separately provisioned `SEFGH_KEYS_ACCOUNTANT_JWT`, enabled approved policy returned by restricted RPC |
| Website forwarding | Go origin, `SEFGH_GO_ROUTES` including `playground-keys-v1`, and `NEXT_PUBLIC_SEFGH_KEYS_V1=1` together |
| Disabled runtime | Fixed 404/no-store; no session verification or RPC request |
| Enabled but unavailable | Fixed 503/no-store, fixed stage-only log; no credential or quota fallback |

Policy bootstrap has a five-second startup bound. Requests allow at most
18 seconds for admission/provider work, up to 10 for detached completion and
one for receipt recovery: 29 seconds, below the server's 30-second write limit.

Independent read-only review accepted the default-off capability separation.
Its timeout-guard correction and probe cleanup/evidence findings were fixed.
Focused tests cover disabled paths, missing credentials, policy denial/outage,
malformed/incomplete/disabled policy, owner create/list/revoke, accounted search,
revocation and recovery. The production Next-to-Go probe uses local stand-ins;
its [receipt](../verification/keys-routing.json) identifies the executable and
source and explicitly excludes live SQL, browser UI and deployment evidence.
Its child environment and Next env files are inherited; only the exercised
RPC/provider destinations and credentials are overridden with synthetic values.

## Playground keys: the exact remaining development approval

The accepted ADR records a signing stop until the owner approves the exact
[one-replacement addendum](../database/keys-dev-replacement-review.md).
Its current SHA-256 was checked in this task:

`f212c12e9a17f88bec2137d3fd7da636e5a3e0d6d1d970237785d5092d10dde3`

That addendum permits one replacement ES256/P-256 signing key in the existing
development project only, preserves the original managed key and revoked first
key, permits the two previously approved disposable confirmed users, one
300-second accountant-only JWT and one provider-free hosted acceptance run,
and requires the reviewed operator and cleanup. No third import/retry is
authorized. No production, legacy-key revocation, service-role CRUD, provider
execution, runtime activation, cutover or deployment is included.

The [ADR](../adr/0002-go-backend.md) explicitly says the signing stop stands
until that exact approval is given. The general request to finish route work
resumes local implementation; it does not silently change that specific stop.
There are no Supabase connector tools exposed in this session. Any authorized
hosted work must first confirm the intended existing connection/UI and current
preconditions, and stop on a permission refusal. Never ask for a password or
copy credentials into chat, documentation or the repository.

## Trending refresh: ready-to-review retirement

The owner selected the existing Go `trending-topics` replacement. A caller
search across `src`, `scripts`, `.github`, Next configuration and backend
deployment configuration found `/api/trending/refresh` only in the old route's
own comments. The old `@/lib/trending` module is imported only by that route;
the current page uses `trending-topics`. This is a repository audit, not proof
of external scheduler configuration or live traffic.

The [retirement patch](trending-refresh-retirement.patch) deletes only
`src/app/api/trending/refresh/route.js` (153 lines). It does not drop a table,
modify stored data, or perform broad dead-code cleanup. It passed
`git apply --check`; the owner then approved the explicit narrow gate exception,
and it was **applied locally on 2026-10-30**. Deployment is not part of this task.

Source SHA-256:
`ed02d832fb37ef891a9f68a19db700229fb75ab74b900f458867d51f15559593`

ADR-0002 puts retirement behind the Phase 6 gate. The actual decision pack
contains 27 fixes plus two larger choices; four fixes are complete, leaving
23 approved fixes, plus the separate open UI issue R-205 and other gated work.
The Phase 6 gate is not satisfied. Applying this narrowly scoped patch early
therefore needs the owner's explicit exception to that gate. Otherwise retain
it for Phase 7 and continue the approved fixes.

## What is still unverified

Hosted effective grants, signing provisioning, two-user hosted isolation,
approved production policy and accountant lifecycle, live cutover/rollback,
deployment and the owner's signed-in walkthrough remain separate evidence.
The historical 23/25 route count is not a claim that this work makes 25/25 live.
Local key replacement wiring is ready behind gates; refresh deletion is a
locally applied retirement under the owner's explicit narrow exception.


Verification update2026-10-31 (BUG-069): BUG-069/R-077, 2026-10-31: owner-approved replacement/retirement is observed at the website. GET /api/trending/topics returns200 from Go with6 populated topics/30 repository entries; GET /api/trending/refresh returns404. No deployment was performed by this task. Helpers/table/data retained; external scheduler inventory and general Phase7 cleanup remain separate gates. Receipt ../verification/trending-retirement-2026-10-31.json. This closes the public endpoint observation gap only; the keys development browser prerequisite and exact approval remain unchanged.
