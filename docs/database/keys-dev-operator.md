# KEYS-PROVISION-001b: local development operator

The owner approved [the exact setup proposal](keys-dev-provisioning-review.md)
with SHA-256 `ef96978f62dc4630d3a8b3e0ad3f681a3eca625a3c6cffebd13623cc51c849d9`.
They subsequently approved generated, non-deliverable `.invalid` addresses for
the two dummy users. The agent handles local files; the owner need not provide
addresses, passwords, tokens, or edit JSON.

Current2026-10-23: Boyle accepted the operator at its recorded source hashes;
27focused tests and1560contracts passed, strict lint passed. Chrome Dashboard
access now works. **Hosted lifecycle acceptance remains unexecuted.** During
the single approved standby import, a premature full accessibility snapshot
included private form contents. That key was never activated and is now
revoked; the original managed key stayed current. The protected private file
and unused passwords were removed after revocation/JWKS absence. No user,
session, JWT or run was created. See the [incident receipt](keys-provisioning-incident-2026-10-23.json).
The owner selected **keep signing changes stopped; continue other migration
work** after reviewing the [replacement question](keys-dev-replacement-review.md).
No replacement or resumed provisioning may occur automatically. The original
one-key limit is not silently expanded.

## What the operator does

[`scripts/keys-dev-operator.mjs`](../../scripts/keys-dev-operator.mjs) is separate
from app/Go runtime. Its only target is `mraglhrenqwadegvwxts`.

- Requires the approved proposal hash, explicit project/run flags, current-key
  Dashboard verification, no unrelated consumers and two distinct test IDs.
- Checks a P-256 private key against its public coordinates and actual public
  JWKS, with the imported/current and retained original public IDs present.
  JWKS presence alone never proves Dashboard key state.
- Claims an exclusive local run journal before any login or JWT issuance.
  Existing/ambiguous claims are never reset or overwritten automatically.
- Obtains real password sessions from Auth, checks identity online, rejects
  anonymous/unconfirmed/mismatched owners, and requires sufficient expiry.
  Decoded claims are consistency checks, not the identity authority.
- Signs one ES256 accountant JWT, fixed project/role/audience and300seconds,
  without an owner subject or configurable claims. Verifies its signature
  locally, then checks actual gateway policy/pending readiness.
- Starts the existing acceptance runner in a separate child process with only
  runtime essentials and its four intended environment values. Private JWK,
  passwords, admin credentials, NODE_OPTIONS and arbitrary environment values
  are excluded. It never forwards child errors/stderr/raw bodies.
- Logs out both verified test sessions independently while signing trust still
  exists. Actual server acknowledgements are separate from local disposal;
  failures/expired sessions/unknown login outcomes remain explicit.

It does not create/delete users, generate/import/rotate keys, perform SQL,
change Auth hooks/grants, call providers, enable runtime, or restore signing
trust automatically. Dashboard work remains governed by the approved procedure.
Source review is satisfied for the27-test operator; the replacement workflow
has its own review/owner gate. This does not establish hosted acceptance.

## Agent-controlled local setup

Protected directory: `%LOCALAPPDATA%\SEFGH\migration-dev\`, outside Git. It was
created with inheritance disabled and a single current-user FullControl ACL.
Before reading any input, the CLI rechecks owner/permissions/reparse points for
the directory and its direct contents. After containment cleanup only the two
non-secret email labels remain. The first private key must never be recreated
from a transcript or used again.

After replacement approval and corrected-workflow review, the agent
verifies the project, baseline current/standby state, no unrelated consumers,
empty Auth/lifecycle state and exact test policy. Only then does it prepare the
single import key and random passwords directly in this protected directory,
perform the approved Dashboard steps, and populate these files:

| File | Contents |
|---|---|
| `test-emails.json` | Two generated test labels; no mailbox or email delivery |
| `dashboard.json` | Fixed project/proposal hash, original/current public IDs, `dashboardCurrentVerified:true`, `noOtherConsumers:true` |
| `signing-private.jwk` | Single retained EC P-256 private JWK matching current/imported ID |
| `identities.json` | `userA`/`userB`, each with its new Auth `id`, test `email`, random `password` |
| `publishable.key` | This dev project's modern publishable configuration, no privileged key |
| `operator-run.json` | Exclusive public-metadata run claim; created by operator, never reset automatically |

`dashboard.json` field names consumed by the operator are `projectRef`,
`approvedSetupHash`, `originalKid`, `currentKid`, `dashboardCurrentVerified`,
`noOtherConsumers`. They are recorded from actual reviewed Dashboard state;
they are not a substitute for observing it. IDs must match the public metadata.
If the platform rejects `.invalid` during confirmed-user creation, stop and
record the fixed error code; do not silently use a real address or send mail.

## Commands and outcome

Safe help and presence-only checks:

```powershell
node scripts/keys-dev-operator.mjs --help
node scripts/keys-dev-operator.mjs --status
```

The following command is **agent use after all prerequisites/source review**:

```powershell
node scripts/keys-dev-operator.mjs --run --project=mraglhrenqwadegvwxts --approved-setup=ef96978f62dc4630d3a8b3e0ad3f681a3eca625a3c6cffebd13623cc51c849d9
```

Reports include fixed step, issuance count/expiry, acceptance nonce, independent
server logout acknowledgements, unknown-session and key/accounting-review flags.
They contain no email/password/token/private JWK. A passed report covers the
operator/acceptance/session work only; **Dashboard restoration/imported-key
revocation remain required**. It cannot label the overall provisioning complete.

After operator completion/failure, follow the approved proposal's cooldown and
rollback order. Preserve unknown outcomes; do not remint, rerun acceptance,
reset counters, delete users/audit, or claim an expired JWT proves active-token
revocation. Retained users remain password-login capable. Deleting them would
cascade through keys/windows/events/saved recovery and is excluded.

## Verification boundaries

For private signing and password forms, never request full accessibility/DOM
snapshots, screenshots, tab rebinding or raw browser errors after filling.
An asynchronous submit may leave the private value in the form. Execute
[`observeKeyForm`](../../scripts/keys-dashboard-observation.mjs) inside
`cua_repl` with its existing Tab handle; it returns only fixed state/booleans
from control presence/disabled attributes. It never reads values, text,
snapshots or errors. Require the actual form to close before inspecting public
key rows. The five focused regressions cover pending/filled forms, unrelated
visible inputs, destination readiness, wrong targets and safe errors. A live
public-page invocation also returned the expected fixed fields. This is a
workflow guard, not transcript erasure or permission to reuse the first key.

The focused synthetic suite verifies actual ES256 signatures/claims, strict
target/JWKS/owner gates, a real competing-process journal race, child environment
isolation, safe failures, ignored-abort/stalled-body cancellation and acknowledged
versus failed/expired logout. It also checks dirty-policy/pending refusal,
insufficient child-success evidence and unknown login outcomes.

The actual local `--status`/ACL probe reads presence and generated-label readiness
only. These checks do not establish hosted sessions, key-state rotation, RLS,
runtime wiring or production readiness. No Go or lesson source changes are
needed for this operator; lesson checks remain optional/skipped.
