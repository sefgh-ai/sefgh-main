# Onboarding contract

**Version 1** (DATA-002, 2026-10-19): 34 cases for the browser module `src/lib/supabase/onboarding.js`, the second area of the browser's own database calls to move behind Go (`../../docs/plans/browser-data.md`). The first-visit onboarding (`AutoOnboarding.jsx`) and its five steps call it.

```text
node --test scripts/contracts/onboarding.test.mjs
node scripts/contracts/record-onboarding.mjs   # re-record after a reviewed change
cd backend && go test -count=1 ./internal/onboarding/
```

## How it was recorded

`scripts/contracts/record-onboarding.mjs` runs the module's real functions through `scripts/contracts/browser-db-fixture.mjs`, with the clock fixed at 2026-10-19T09:30:00.000Z. For each case it records:

- what the call returned or threw, and every Data API request it made (the direct path);
- `go_answers`: what Go must answer for each database call. That is the `{ data, error }` the real postgrest-js gives for the same reply, unless the case gives its own (Go answers by itself);
- `go_requests` and `go_outcome`: the requests the switched module sends to Go given those answers, and what the caller then sees.

## Recorded behaviour

- **`getOnboardingData`:** reads the user's row as one row. No row (`PGRST116`) gives `null`. A missing table (`42P01`) throws an Error that says so. Any other failure, an unreachable database included, throws the error as it is.
- **`createOnboardingData`:** inserts `[{ user_id, current_step: 1 }]` (a list, so postgrest-js adds `columns="user_id","current_step"`). On a duplicate (`23505`) it reads and returns the existing row instead; a missing table throws an Error naming the setup file.
- **`updateOnboardingData(userId, updates)`:** writes the given fields to the user's row and returns it; no row throws `PGRST116`; a success with no body returns `null`. Every step function is one update: the step number, then the step's fields. `completeOnboarding`, `skipOnboarding` and the last step stamp the browser's time.
- **`needsOnboarding`:** `true` without a row, while neither completed nor skipped, or on any error; otherwise `false`.
- Another user's id reaches no row through row-level security: `null` for a read, a thrown `PGRST116` for an update, a thrown `42501` for an insert.

## Through Go (DATA-002)

With `onboarding` in `NEXT_PUBLIC_SEFGH_GO_DATA`, the module's three database calls go to `backend/internal/onboarding`: `GET`, `POST` and `PATCH /api/onboarding`. Each answers the call's own result, so the module's checks of the error code are unchanged. The caller sees what it saw before, except:

- **Another user's id:** Go gives the same error without asking the database (`go_database: []`).
- **Signed out:** Go answers 401, so `getOnboardingData` throws `Unauthorized` where it returned `null`; `needsOnboarding` still says `true`.
- **Fields the onboarding never writes:** an update of anything outside the fourteen fields the steps write, `user_id` included, is refused by Go with `42501` without asking. Before, the database refused unknown columns, and row-level security refused a `user_id` change.

Without the Go route (404) every call takes its direct path as before. `resetOnboarding` is not here: nothing imports it, and it cannot run (it uses an undefined `supabase`); it is on the Phase 7 list.
