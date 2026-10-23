# KEYS-PROVISION-001b / BUG-022: operator and containment evidence

Writer Codex; base main87ba11b. Source work is a separate trusted local Node
operator and browser observation helper, outside app/Go runtime. Original setup
and generated non-deliverable test labels were approved. One replacement key
exceeds the original exact cap and awaits its own decision.

## Source verification

Boyle independently accepted the27-test operator at SHA-256
`1efa9362eeec4c957b269b0f8380e742b81ebc93195a7428b534f1aea21c66cd`
and focused tests at
`d78ca6cc597be71f17e0d46ea88d821a62dee8f14da18b06d52351939246f5d7`.
See [REVIEW-025](../claude-review.md#review-025-keys-provision-001b--bug-022-2026-10-23).

- Writer and reviewer each passed27focused operator tests, including the actual
  Windows owner-only ACL rejection case, real competing-process exclusive-file
  race, real ES256 signature verification and safe child environment handling.
- R178-R181 record draft corrections with failing-before regressions: explicit
  unknown sessions; exact policy/pending/child proof; actual CLI interruption;
  immediate five-minute session checks; complete retained19-check receipt.
- Reviewer evaluated actual CLI wiring synthetically for SIGINT/SIGTERM and
  repeated signals during independent cleanup/report publication. This is not
  a physical Windows console Ctrl+C test. Twenty-one malformed child receipts
  were refused; synthetic extra private fields were excluded.
- Parent passed1560contracts and strict lint after the final operator corrections.
  The later browser observer adds five focused tests; final broad/handoff counts
  are recorded in the final coordination handoff, not inferred here.
- The five observer tests guard asynchronous/filled forms, unrelated visible
  fields, actual destination readiness, wrong host/project/protocol and safe
  errors. They prohibit full AX/DOM snapshots, screenshots, field/text reads
  and raw error output. Live invocation on the actual public key page returned
  only the expected fixed state/booleans. The initial new-suite invocation
  failed because its implementation module did not yet exist; the implemented
  suite passed5/5. This is a regression guard, not proof the incident is erased.

No Go/app/SQL source changed. No lessons were executed. Earlier1554/1555 counts
precede the final corrections and are historical, not the final result.

## Actual hosted workflow and containment

Chrome became available, then DNS/connector transport failed and recovered.
The exact dev Dashboard was reopened and authenticated after owner sign-in.
The old stalled sign-in tab was absent from the refreshed inventory. No system
DNS/proxy/TLS/security setting changed. Supabase's status page reported a gateway
incident in monitoring, independently of the earlier local DNS failure; no
verification was weakened because of it.

Pre-import Dashboard showed original managed P-256 key
`a0c2cbe5-94b1-4a1f-97c7-c17bc5423f77` current and an empty standby slot.
The previous legacy HS256 key remained untouched. Fresh MCP catalog showed
Auth0, exact approved policy1, five lifecycle data tables0 and public application
relations0. A first read-only query used nonexistent `policy_get` and failed42883;
source-defined `get_policy` corrected the query without mutation.

The single approved local key was generated directly in the protected directory
and imported as standby. Parent then requested full AX before the asynchronous
submit form closed; the output included private material. Treat that key as
compromised. It was never activated. Parent moved only that key to previously
used and revoked it. The original managed key remained current throughout.

[Secret-free incident receipt](../database/keys-provisioning-incident-2026-10-23.json)
and [public Dashboard proof](keys-import-revoked-2026-10-23.png) show the exact
revoked public ID. Public JWKS at2026-10-23T04:38:56.238Z returned200, omitted
that ID and retained only the original key/fingerprint. Post-containment MCP
again confirmed Auth0/all five lifecycle data tables0/exact policy1/public
application relations0. No session, accountant JWT, exclusive journal or hosted
acceptance run was created by this attempt. No production/legacy/runtime,
provider or worker change occurred.

After confirmed revocation/JWKS absence, only the known `signing-private.jwk`
and unused `identities.json` were removed. Absolute directory/leaf paths and
regular-file/reparse checks preceded deletion; no recursive deletion. Actual
presence-only CLI then confirmed all secret/config/run files absent, with only
non-secret email labels retained. The exposed transcript is not erased. No
active-token rejection was tested, and off-platform cache purge is unverified.

## Remaining gates

The original setup proposal is unchanged at SHA-256
`ef96978f62dc4630d3a8b3e0ad3f681a3eca625a3c6cffebd13623cc51c849d9`.
The [exact one-replacement addendum](../database/keys-dev-replacement-review.md)
was independently accepted for review, but the owner chose to keep signing
changes stopped and continue other migration work. No replacement/provisioning
restart is authorized. Do not reuse the revoked
key, generate another key automatically, restore secrets from transcripts,
reapply SQL, reset a claim/counter, or substitute service-role/managed-secret
extraction. Fresh Dashboard/catalog/readiness checks precede any new authorized
attempt. Hosted SQL acceptance, Go HTTP/UI integration, runtime configuration,
rollout/rollback, legacy transition, production and worker gates remain open.
