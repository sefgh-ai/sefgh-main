# Existing plaintext key route: contract version 2

`POST /api/playground/keys`, KEYS-CORE-001 / BUG-014. The unchanged behavior was
first recorded as 29 synthetic fixtures in `legacy-v1.json`. That file is
historical evidence; it is not run against the corrected handler. `cases.json`
is the current version2 contract, exercised against the actual Next handler and
real supabase-js with stand-in Auth/Data API and deterministic synthetic entropy.

## Version 2 privacy correction

Under AGENTS.md's live security/privacy exception, every response now has
`Cache-Control: no-store`, and the outer failure logs only the fixed event
`API key creation failed`. Version1 captured a synthetic credential marker in
a free-form database error reaching console output; two failing-before guards
reproduce log leakage/missing response privacy. Version2 changes only these
privacy boundaries: body/status/auth, generated legacy key format, writes and
retry behavior remain the same. There is no existing Go implementation of this
HTTP route to update. The separate proposed Go core is not this route's port.

## Captured behavior and defects

Fixtures cover signed-out/auth/setup failure, name/body types and whitespace,
Unicode/long names, caller-spoofed ownership, raw credential/extra row fields,
uniqueness/network/permission/single-row failures, entropy failure and retry cap.
Marked defects include malformed caller input becoming500, unlimited name
length, permanent/ambiguous-write retries, plaintext persistence and select-star
response fields. Their register entries remain open until the approved lifecycle
replaces the route. Do not silently copy or fix them during a mechanical port.

The owner chose a hashed/show-once lifecycle instead. Schema evidence and
reviewed SQL remain required before affected writes; no production schema was
guessed/applied. The current plaintext route still exists and R-039 remains open.

## Run and inspect

```powershell
node --test scripts/contracts/playground-keys.test.mjs
```

The recorder requires an explicit flag:

```powershell
node scripts/contracts/capture-playground-keys.mjs --write
```

Review every expectation diff; this is not authority to approve changed
contracts. All token-like values are synthetic fixture data. The runner's
optional `capture_errors` records only synthetic console arguments and leaves
all existing contract output shapes unchanged when absent. No live Supabase,
provider or real credentials are used.
