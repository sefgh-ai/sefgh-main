# KEYS-ACCEPT-001: hosted development acceptance

Update 2026-10-30: the owner approved the exact replacement addendum SHA-256
`f212c12e9a17f88bec2137d3fd7da636e5a3e0d6d1d970237785d5092d10dde3`.
This supersedes the signing-stop/pending-approval statements below, which record
the prior attempt. Fresh Dashboard/catalog preflight and the approved run remain
incomplete: the browser access host is unavailable, including on resume. No new
replacement material, users, sessions, accountant JWT or hosted run was created.
No Supabase connector is exposed in this session. Restore the browser connection
and resume the exact approved procedure; do not request the same approval again,
reapply SQL, or infer current key/catalog state from the historical receipts.

Status: runner implemented and tested against synthetic gateways; **not run
against hosted lifecycle state**. On 2026-10-22 the owner approved the exact
test policy and one provider-free run once separately approved credentials are
available. The policy is now applied in development only and readback matches.
The owner later approved the exact identity/signing setup. On2026-10-23 its
first import key was revoked before activation after a private-form snapshot
incident; no users/sessions/JWT/acceptance run were created. A separately
reviewed [one-key replacement](keys-dev-replacement-review.md) is not authorized:
the owner selected keep signing changes stopped and continue other migration
work. [Containment receipt](keys-provisioning-incident-2026-10-23.json).
All key/event/recovery/window tables remain empty after actual readback. Existing dev catalog and
anonymous receipts remain historical evidence.

[Policy apply receipt](keys-staging-policy-2026-10-22.json) records exact source
hash, immediate project/pristine-state preflight and actual installed values.
Do not reapply the proposal or the original additive migration.

The separate project exists because the owner chose a development/test
environment, approved its organization/creation quote/creation, then approved
the exact additive SQL there only. Production was not used as the authorization
fixture. [Project and apply receipt](keys-staging.md).

## Ready implementation

[`scripts/keys-hosted-acceptance.mjs`](../../scripts/keys-hosted-acceptance.mjs)
targets only `mraglhrenqwadegvwxts`. Both explicit command flags are required
before network access. Credentials come from environment, never arguments,
reports or Git. It does not provision users, mint tokens, seed SQL, start the
app, call GitHub/AI or provide a production override.

The runner verifies two distinct non-anonymous owners through Auth, requires
fresh owner metadata/pending state and the exact policy, then checks:

- User/anonymous denial of accounting; accountant denial of management;
  private-schema denial for every supplied role.
- Show-once issuance, metadata-only listing, hash-only lookup, cross-owner
  list/revoke isolation and the active-key cap.
- Concurrent per-key and per-owner quota, separate-owner allowance and replay.
- Saved receipt discovery, exact/idempotent completion, conflicting receipt
  refusal and revocation. Timestamp comparisons preserve fractional precision
  and accept equivalent timezone spellings. Receipts are synthetic; no provider ran.

Responses are bounded and redirects fail. Reports contain fixed check names
and counts. Parallel reservations settle before cleanup. Ambiguous issuance is
never retried: metadata discovers this run's unique names, only those new keys
are revoked, and revocation is confirmed. Audit records remain. Failure flags
separately identify key cleanup and accounting review; unknown outcomes are not
invented, and counters/events are never reset automatically.

This exercises the **hosted SQL gateway**, not the Go HTTP/UI runtime. Expiry,
signer rotation, recovery with admissions disabled, retention, preview, rollback
and production acceptance remain separate gates. Synthetic gateways verify
orchestration/failure handling, not hosted authorization.

## Approved development test policy

Review [keys_002_dev_acceptance_policy.sql](../../supabase/proposals/keys_002_dev_acceptance_policy.sql).
It inserts one enabled test policy after checking for no public application
relations or existing lifecycle state. It changes no grants, Auth configuration
or legacy keys. Exact SHA-256
`c433ed1322c919bbbd62a347a6174af92044e11336733d11720741a60e477695`
was approved, rechecked and applied after an independent MCP project-ref check;
SQL collision/data guards cannot identify the project. Readback confirms one
policy with the following values and zero lifecycle data. No grants changed.

| Setting | Test value |
|---|---|
| Revision | `dev-acceptance-v1` |
| Active keys / maximum name length | 2 per owner / 80 characters |
| Admission limits | 2 per key / 3 per owner |
| Key lifetime / quota window | 600 seconds / 86,400 seconds |
| Completion timeout | 1 second |
| Scope / endpoint / charging | `repo:read:public` / `public-search` / attempt |

These values support one isolated acceptance run. Revoked metadata and audit/
counters remain afterward, so rerunning needs fresh identities or a separately
reviewed reset/revision plan. Crossing a quota-window boundary fails instead of
claiming parity. No automatic deletion/reset or production defaults are provided.

## Credentials and signing gate

The owner approved the exact development setup. See
[KEYS-PROVISION-001a](keys-dev-provisioning-review.md): two confirmed disposable
users, one externally retained imported ES256 key, fixed five-minute accountant
token, original-key restoration and audit-preserving cleanup. Approval was
explicit for that exact proposal hash; subsequent owner clarification permits
generated non-deliverable `.invalid` test labels. The snapshot proposal bytes
remain unchanged as the reviewed record. Execution is pending real Dashboard
browser access and source-reviewed [local operator](keys-dev-operator.md).
No further approval for the same scope should be requested.

Two disposable development Auth users and valid sessions need an approved setup.
Do not ask for passwords or paste tokens into chat. The existing publishable key
cannot authorize accounting. No identities/accountant credential were created.
Presence-only checks found all four required environment names absent. The
approved run remains pending; policy approval does not supply credential authority.

The development JWKS previously published ES256 metadata. Supabase-managed
private signing keys cannot be exported; the documented custom-JWT path imports
a retained private key and activates it. That is a separate signing change
requiring review, not authority implied by SQL approval.
[Official signing-key guide](https://supabase.com/docs/guides/auth/signing-keys).

An imported signing key can authorize broader roles; minting an accountant JWT
does not narrow the signer's own authority. Keep private keys in a trusted
operator/signer boundary outside the app and Git. An approved signer must fix
the accountant role, project/issuer/audience and short expiry, define rotation/
revocation, and supply only a bounded token to runtime/tests. Do not change user
Auth hooks, extract a legacy project secret, use service-role CRUD, or place a
signing key in the Go API to bypass this gate. The current MCP inventory has no
Auth-user/signing-key configuration tool; owner dashboard or another explicitly
authorized provisioning path is needed.

## Run after approval and local credential setup

Required environment names:

```text
SEFGH_KEYS_ACCEPT_PUBLIC_KEY
SEFGH_KEYS_ACCEPT_USER_A
SEFGH_KEYS_ACCEPT_USER_B
SEFGH_KEYS_ACCEPT_ACCOUNTANT
```

User values are session access tokens, not IDs/passwords. Accountant is a
separately provisioned role JWT, not a user token or secret API key. Do not load
production `.env.local` or print values for diagnosis.

```powershell
# Safe help only: no network or credentials required.
node scripts/keys-hosted-acceptance.mjs --help

# New development test keys only; needs owner approval and supplied setup.
node scripts/keys-hosted-acceptance.mjs --allow-dev-key-writes --project=mraglhrenqwadegvwxts
```

On failure retain only fixed step/cleanup flags, inspect the relevant boundary
and metadata before retrying. Do not repeat issuance to recover a secret, purge
pending attempts or revoke legacy keys. Failure after reservation requires
accounting review even when all new keys were revoked.
