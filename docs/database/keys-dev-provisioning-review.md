# KEYS-PROVISION-001a: development identity and signing setup

Status: **prepared for owner review; not executed**. The owner asked for this
concrete setup after approving the development test policy and one provider-free
acceptance run. Those approvals explicitly excluded identity/signer provisioning.
This proposal fills that gap; it does not change production or enable the app.

## Exact target and proposed authorization

| Item | Proposed value or boundary |
|---|---|
| Project | `sefgh-migration-dev` / `mraglhrenqwadegvwxts` only |
| Organization / region | `hithuduntbsajjhmnntm` / Mumbai `ap-south-1` |
| Database | Already-applied additive migration; already-approved `dev-acceptance-v1` policy |
| New Auth identities | Exactly two disposable, email/password, confirmed, non-anonymous users |
| New signing key | Exactly one imported ES256 / EC P-256 key; private material retained only by the trusted local operator |
| Signing changes | Import as standby, activate for this development test, then restore the recorded original managed key and revoke only the new imported key |
| Accountant token | One fixed-role, fixed-project JWT, maximum 300 seconds lifetime; no user impersonation |
| Execution | Existing approved provider-free hosted runner once; three new keys and five synthetic accounting events |
| Cleanup | Revoke only run-created keys, acknowledge test-session logout before key revocation, clear local secrets; preserve audit rows and both test-user identities/password-login capability |
| Excluded | Production/legacy keys, service-role database CRUD, Auth hooks, schema/grant changes, runtime flags, providers, workers, user deletion, permanent signing-key deletion |

The retained signing private key can mint broader project roles. Restricting the
operator helper to the accountant role does **not** limit the key's underlying
authority. This proposal deliberately requires owner approval of that trust
expansion in this isolated development project. Do not export a Supabase-managed
private key or substitute the legacy JWT secret. The supported path imports a
new operator-retained key and rotates to it.
[Supabase signing-key guide](https://supabase.com/docs/guides/auth/signing-keys).

## Prerequisites and local boundary

Before changes, verify the MCP/Dashboard project reference independently and
read the [policy receipt](keys-staging-policy-2026-10-22.json). Recheck the exact
policy, zero key/event/recovery/window rows, absence of public application
relations, and the current public signing-key IDs/state. Inspect only the Auth
user count; if nonzero, stop and review existing consumers before any rotation
or new identity creation. Confirm no unrelated development consumers. If another
standby key already occupies the import slot, stop rather than move/revoke it.
Record public IDs/state, not user rows or credentials.

An owner-authenticated Dashboard session is required. The current MCP inventory
has no Auth-user/signing-key mutation operation. Do not fetch a database secret,
service-role key or personal access token to work around that missing capability.
Use Dashboard administration for the two users and signing-key state changes.
If its controls cannot perform the reviewed operation, stop at that step and
review the alternative instead of broadening privileges.

Proposed local operator directory:
`%LOCALAPPDATA%\SEFGH\migration-dev\` (outside the repository). Create with a
Windows ACL restricted to the current operator account before writing secrets;
verify its resolved path and effective ACL. Proposed contents:

- `signing-private.jwk`: newly generated EC P-256 private JWK with random `kid`.
- `identities.json`: the two new email/password pairs, Auth UUIDs and run marker.
- Session/short-lived accountant values held in operator memory; if crash
  recovery requires a file, it belongs only in this protected directory.

Use cryptographically random independent passwords and a unique fixture marker.
Use two owner-controlled unused email addresses supplied through the local
operator configuration, never chat. Do not reuse real app users. Do not print
private JWK fields, passwords, session/refresh tokens, JWTs, environment dumps or
raw Auth errors. No secrets in clipboard history, terminal history, Git, shared
receipts, `.env.local`, the Go API, browser builds, or hosted CI secrets.

Only the four supplied acceptance values go to the runner process; it must not
inherit the private JWK or Auth administration credentials. The runner does not
generate/sign/refresh tokens. An operator helper, if implemented after approval,
must hard-code this project/role/expiry, use bounded requests and sanitized fixed
errors, and receive its own source review before live use.

## Ordered operations after approval

1. **Record the original current key.** Open this development project's
   [JWT settings](https://supabase.com/dashboard/project/mraglhrenqwadegvwxts/settings/jwt).
   Record its public `kid`, algorithm and state plus baseline JWKS metadata.
   Keep the original managed key; never revoke/delete it for this test.
2. **Generate and import one key.** Generate the EC P-256 JWK directly into the
   protected operator directory, with no private stdout. The official CLI can
   generate ES256 import material; an implementation must capture output directly
   to the protected file, never a displayed tool result. Import that exact JWK
   as a new standby key using Dashboard; retain its private copy locally and
   record only `kid`/public fingerprint. Verify standby JWKS `kid`, `alg`, `crv`,
   `x` and `y` match the local public key. No second key on an ambiguous outcome:
   inspect metadata before retrying.
3. **Activate it in development.** Use Dashboard's Rotate key action. Confirm
   the imported key is current and the original key is previously used. Honor
   platform state-change cooldowns. Supabase documents edge/client JWKS caches
   of up to 20 minutes combined; observe public discovery/readiness and any actual
   consumer cache policy before relying on a new key. Do not weaken signature
   verification or change app configuration to skip readiness.
4. **Create exactly two confirmed users.** In this project's Auth Users area,
   use Create user with email/password and email confirmation enabled, equivalent
   to Admin `createUser({email,password,email_confirm:true})`. Do not use Invite,
   OTP, Magic Link or public signup: this proposal sends no email. Verify two new
   distinct UUIDs, role `authenticated`, non-anonymous status and the local run
   marker. Leave existing roles/metadata policies/global confirmation and expiry
   settings unchanged. If Create user exposes only an invitation flow, stop.
   [Admin createUser reference](https://supabase.com/docs/reference/javascript/auth-admin-createuser).
5. **Obtain real owner sessions.** An isolated operator client uses only the dev
   publishable key and `signInWithPassword` for each new identity. Set
   `persistSession:false`, `autoRefreshToken:false`, `detectSessionInUrl:false`;
   do not share browser/app session storage. Retain access tokens in memory and
   verify both users online via `/auth/v1/user`; require distinct confirmed,
   non-anonymous owners and at least five minutes remaining before the run.
   Record only UUIDs/expiry times. Password login is the documented existing-user
   path; it does not substitute a custom impersonation JWT for owner sessions.
   [Password login reference](https://supabase.com/docs/reference/javascript/auth-signinwithpassword).
6. **Mint one accountant token immediately before use.** Use the retained key in
   the separate trusted operator, with the fixed header/payload below. Locally
   verify signature, public-key match and expiry without printing the token;
   then call only the dev policy/pending RPCs to establish actual gateway role
   acceptance. A decoded claim or successful local signature is not gateway proof.
   Use a modern publishable key as `apikey`, accountant JWT as Authorization.
   On failure preserve fixed status/code only; do not try a broader role.
7. **Run the approved test once.** Supply the four environment names in the
   [acceptance runbook](keys-hosted-acceptance.md) to the child process, execute
   the exact explicit-target/write-flags command, and save only its secret-free
   nonce/check/cleanup report. Its 120 second bound and separate 15 second cleanup
   fit inside the proposed 300 second accountant lifetime. If token expiry or
   ambiguous writes occur, inspect the report and state; no automatic reissue,
   rerun, counter reset or repeat key creation.

## Fixed accountant JWT

| Field | Required value |
|---|---|
| Header `alg` / `typ` | `ES256` / `JWT` |
| Header `kid` | Exact imported/current key ID verified against public JWKS |
| `iss` | `https://mraglhrenqwadegvwxts.supabase.co/auth/v1` |
| `aud` | `authenticated` |
| `role` | `sefgh_key_accountant` only |
| `iat` / `exp` | Current UTC epoch seconds / `iat + 300`; no caller override |
| `jti` | Fresh random UUID for this single issuance |
| `sub` | Omitted; the accountant does not impersonate either Auth user |

The signing guide permits an existing Postgres role and optional subject. The
issuer/audience/300 second limit are this proposal's tighter choices; verify the
actual gateway honors the project/signature/role boundary. The existing six
accountant RPC grants remain unchanged. Never sign `service_role`, `postgres`,
an owner subject, or a caller-supplied claim set. Use JWT-compatible ES256
signature encoding, not an arbitrary DER signature, if a Node operator helper
is introduced. No third-party Go dependency or runtime signer is proposed.

## Completion, rollback and retained evidence

After success or failure, retain the runner's scoped key-revocation and
accounting-review flags. Reconcile only exact saved receipts under an approved
recovery procedure; unknown outcomes stay pending. Do not delete rows, refund
attempts, manufacture missing outcomes or rerun the acceptance automatically.

**Log out both sessions before changing signing-key trust.** While their access
tokens remain valid and the imported key is still trusted, send a bounded
`POST /auth/v1/logout?scope=global` for each isolated user's access token with
the dev publishable `apikey`. Scope global affects only that new user, not all
project users. Record each actual successful server HTTP acknowledgement
separately from local session disposal; no raw response body. Then discard local
refresh/session values. A high-level SDK `signOut()` result of `error:null` is
insufficient: installed `@supabase/auth-js`2.78.0 suppresses401/403/404 and clears
local state even when the server did not acknowledge logout. Sources:
`node_modules/@supabase/auth-js/src/GoTrueClient.ts` `_signOut`, and
`GoTrueAdminApi.ts` `signOut`. If either logout fails or its outcome is unknown,
record server-side session cleanup as unverified, continue the other independent
cleanup obligations, and retain a scoped recovery receipt. Do not claim refresh
token invalidation or silently obtain additional sessions to hide failure.

Restore the recorded original managed key through the documented
previously-used -> standby -> Rotate key sequence. Observe platform cooldowns
and verify its exact public ID becomes current. Then revoke **only this run's
imported key** and confirm its state. Record the actual action/cooldown times
and accountant `exp`. Supabase documents approximately five minutes between
signing state changes; restoring through standby/rotation/revocation may outlast
the single five-minute accountant token. Only claim active-token revocation
evidence if that same previously accepted token is demonstrably unexpired at
the non-writing denial check. Otherwise record key-state confirmation and token
expiry, with active-token rejection **unverified**. Do not mint another token
for this check. Do not claim local/off-platform caches are instantly purged.
No permanent key
deletion is included. If interrupted, retain the protected private file and
public key-state receipt until a reviewed recovery restores/revokes it; don't
delete the only local key copy while it remains trusted.

Clear the four runner environment variables and stop the isolated operator.
Keep the two identities and revoked key/audit metadata until a separately
reviewed retention decision. Their passwords remain capable of establishing
new sessions under the restored key; session cleanup and local secret disposal
are not account disabling. No password reset, ban or user deletion is proposed.
**Deleting these Auth users cascades into keys, events, windows and saved
recovery receipts** under the applied SQL; user deletion is excluded. After
confirmed imported-key revocation and any required incident evidence, remove
only the known local secret files according to the approved local cleanup step.
Never recursively remove a computed directory without checking its absolute path.

The shared receipt should contain project reference, approval/proposal identity,
public old/new key IDs/states, two test UUIDs/expiry metadata, policy revision,
runner nonce/check results, separate server-logout acknowledgement/local-disposal
results, cooldown/expiry/revocation-evidence limits, cleanup/unknown-outcome flags
and remaining gates.
No raw user rows, email/passwords, tokens, private JWK or response bodies.

Approval of this proposal would authorize only the operations above in this
existing development project. The original production SQL, R143 privilege
proposal, legacy-key revocation, runtime/forwarding/preview/cutover and worker
execution still require their existing separate gates.
