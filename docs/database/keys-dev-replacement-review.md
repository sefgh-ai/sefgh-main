# KEYS-PROVISION-001c: one development import-key replacement

Status: **prepared for owner review; not authorized or executed**. This is an
addendum to the approved [original setup](keys-dev-provisioning-review.md), whose
frozen SHA-256 remains
`ef96978f62dc4630d3a8b3e0ad3f681a3eca625a3c6cffebd13623cc51c849d9`.

The first approved key was imported as standby. A premature full accessibility
snapshot after submission included its private textarea contents. Treat that
key as compromised. The agent moved only that key to previously used and revoked
it before activation. It must never be reused or moved back to standby.

| Verified existing state | Value |
|---|---|
| Only target | `sefgh-migration-dev` / `mraglhrenqwadegvwxts` |
| Original managed key, still current | `a0c2cbe5-94b1-4a1f-97c7-c17bc5423f77`, ES256 / P-256 |
| Compromised key, now revoked | `2bb388b5-9ca3-4757-98fc-777f2753cd45` |
| Standby slot | Empty at containment verification |
| Hosted users / lifecycle rows | Zero; exact approved test policy retained |
| Sessions / accountant tokens / acceptance runs issued by this attempt | Zero / zero / zero |

[Containment receipt](keys-provisioning-incident-2026-10-23.json) records public
Dashboard/JWKS/catalog evidence and local cleanup. It does not assert that
off-platform caches were purged or prove an unexpired-token rejection. The
exposed private value is deliberately absent from every repository artifact.

## Exact additional authorization requested

Allow **one additional** newly generated/imported ES256 / EC P-256 key in this
same development project. That makes two imported keys total for this setup:
the already revoked first key and one replacement. Never generate a third key
or retry an ambiguous import automatically. The revoked key remains revoked;
do not delete its metadata.

All other numerical and permission limits of the original setup stay the same:
two new confirmed disposable users with the approved generated `.invalid`
labels, one300second accountant-only JWT without an owner subject, and one
already-approved provider-free hosted acceptance run. None was consumed during
the contained attempt. The retained replacement private key can authorize
broader project roles; it remains confined to the trusted operator directory,
outside the app/runtime/Git. No broader-role token may be minted.

## Corrected execution procedure

1. Verify the original key is still current, the first key remains revoked,
   standby is empty, no unrelated consumers exist and fresh catalog/policy
   prerequisites hold. Preserve all prior evidence; do not reapply SQL.
2. Generate exactly one fresh replacement key and two random passwords directly
   in the existing owner-only local directory. No private stdout or clipboard.
   No actual identity/signing mutation occurs until the owner approves this
   addendum and the corrected source/runbook review is complete.
3. Execute browser interaction only through `cua_repl`. After filling a private
   field, **never request full accessibility/DOM snapshots or screenshots,
   rebind the tab, or emit raw browser errors** while that form may exist.
   A submitted click does not prove asynchronous form removal.
4. Use the reviewed control-presence-only
   [`observeKeyForm`](../../scripts/keys-dashboard-observation.mjs) after the
   import click. It emits fixed booleans/state only, never values, raw text,
   snapshots or errors. A sensitive-form/not-ready/unavailable result is not
   success. Inspect public key rows only after the sensitive form has closed.
   Apply the same no-snapshot/no-raw-error rule to subsequent password forms;
   inspect only targeted fixed control state until those fields are gone.
5. Verify the replacement's public coordinates/JWKS and actual standby state,
   activate it under documented readiness/cooldown requirements, create exactly
   two confirmed users without mail, and execute the accepted operator once.
   On any exposure, failure or ambiguous outcome, stop issuance and follow the
   original independent cleanup obligations. Do not silently replace or retry.
6. Obtain actual logout acknowledgements before changing signing trust. Restore
   the exact original managed key, revoke only the replacement, retain users
   and audit, and remove only known local secret files after confirmed cleanup.
   Token expiry alone is not evidence of active-token revocation.

The original exclusions remain: production, legacy keys/privileges, service-role
CRUD, Auth-hook/schema/grant changes, user deletion/ban/reset, permanent signing
key deletion, providers/workers, runtime activation, cutover and deployment.

The first key's private material and unused passwords have been removed from
their exact local files after Dashboard revocation/JWKS absence. The retained
transcript cannot be treated as a secure key store or as erased. No replacement
material exists at this proposal checkpoint.
