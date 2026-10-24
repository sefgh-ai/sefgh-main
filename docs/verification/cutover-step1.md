# Cutover step 1: the deployed website and Go service compared

CUTOVER-001a, 2026-10-24, Claude Code. From outside, with no credentials: the website `https://sefgh-main.vercel.app` (Next.js; `github-trending` already forwarded to Go) and the Go service `https://sefgh-api.vercel.app`. Nothing was switched or deployed.

**Result: step 1 of [`../cutover.md`](../cutover.md) is ready for a preview switch.** On every step-1 route the two deployments give the same answers, except for differences explained below that a visitor cannot notice.

## How

- `node scripts/check-go-deployment.mjs https://sefgh-api.vercel.app`: 7 of 7 checks passed (health, Go marker, security headers, languages, signed-out refusals).
- `node scripts/compare-deployments.mjs https://sefgh-main.vercel.app https://sefgh-api.vercel.app` (new): 14 of 14 checks passed. It sends each path to both addresses at once and compares status, content type, `Cache-Control`, the `x-sefgh-backend` marker and the JSON. It also checks the switch state: the website's answer is marked as forwarded for `github-trending` and for nothing else. Run with a wrong `--switched` list, it failed in both directions (exit 1), so it does catch a wrong switch.

## What was compared

| Route | Requests | Result |
|---|---|---|
| `github-languages` | the list | identical |
| `github-search` | no query (400); `q=react` | 400 identical; 200 same shape |
| `github-trending` (switched) | `since=daily` | identical, forwarded to Go |
| `github-trending-developers` | `since=yearly` (400); `since=daily` | same JSON (see below); identical |
| `github-contributions` | no username (400); `torvalds` | identical; 500 identical (see below) |
| `github-repo` | no parameters (400); `vercel/next.js` | identical |
| `github-repo-details` | `-octo/demo` (400); `vercel/next.js` | identical |
| `github-contents` | `octo/demo?path=..` (400); `vercel/next.js?path=packages` | identical |

Status, content type and `Cache-Control` matched on every request. The Go service marked every answer as Go's.

## Differences, all explained

- **Search order.** From the 25th result on, `q=react` differs. GitHub orders tied results differently from call to call: two calls to the website alone differed in the same place, and both deployments returned the same set of repositories.
- **Rate-limit figures.** `rate_limit.remaining` and `reset` differ because each deployment spends its own GitHub allowance. Both started from 60 an hour, GitHub's signed-out limit: neither deployment has a token for these reads. That is R-031. `GITHUB_PUBLIC_READ_TOKEN` (QUOTA-001) is the owner's to create; once step 1 is on, every GitHub read goes through the Go service's single allowance.
- **A trailing newline.** Go ends the `since=yearly` refusal with a newline (`json.Encoder`); the JSON is the same, and browsers read it the same.
- **Contributions answers 500 on both:** `{"error":"GitHub token not configured"}`, because neither deployment has `GITHUB_TOKEN`. Nothing on the site calls this route (owner decision, 2026-10-12), so it is the same before and after the switch.

## Step 2, checked on the Go service

- **`trending-topics`** answers 200: six topics, five repositories each. A second request was a CDN hit (`x-vercel-cache: HIT`, about 0.1 s). Vercel keeps the `s-maxage` for itself and shows browsers `public, max-age=0`. This is the "CDN caching verified" gate for switching it on. The website has no handler for it, so it is 404 there until switched (expected).
- **`share-token`** needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on the Go project first. They are not set: `/api/activity` answers 500 "Internal server error", which the deployment checker reports as "Supabase settings not set". Both values are public; see [`../hosting-setup.md`](../hosting-setup.md).

## Forwarding through Vercel (VERIFY-005, BATCH-CC-002)

`github-trending` is already switched on the website, so Vercel's rewrite is in use there. The trending requests from the local forwarding probe, and more awkward ones, went through the website and straight to Go at the same time. There were 14: an encoded `#` (`C%23`), `%20` against `+`, a repeated `since`, an encoded parameter name (`%73ince`), a lone `%`, invalid UTF-8 (`%FF`), a `;`, `Daily` in capitals, an empty `language`, an extra unknown parameter, and Japanese text. **All 14 gave the same status, `Cache-Control` and results**, and every website answer was marked as Go's. The rewrite hands queries to Go unchanged. This closes "Rewrite forwards requests unchanged: not checked on Vercel" for query strings on one GET route. Bodies and headers through the rewrite are still checked only locally (VERIFY-002/003).

Daily trending answered no repositories on both sides. That is the contract's query (created in the last day with more than 100 stars), not a forwarding fault.

## Response times (MEASURE-001, BATCH-CC-002)

Measured 2026-10-24 around 10:04 UTC, from one client in India. Both deployments' functions run in `iad1` (Washington, D.C.), reached through Vercel's Mumbai edge (`x-vercel-id: bom1::iad1::…`), so the regions are equal. Only routes that answer without GitHub were used: the built-in languages list and a refused search. A unique query value on each request forced a function run (no CDN hit). Requests alternated between the two, and alternated which went first.

| Route, mode | Website (Next.js) p50 / p95 / max | Go p50 / p95 / max |
|---|---|---|
| languages, 40 one at a time | 318 / 830 / 2,469 ms | 308 / 587 / 641 ms |
| refusal (400), 40 one at a time | 306 / 415 / 693 ms | 302 / 366 / 1,039 ms |
| languages, 10 at once | 519 / 906 ms | 530 / 532 ms |
| refusal (400), 10 at once | 407 / 431 ms | 270 / 301 ms |

No errors in 220 requests. **What it shows:** the network round trip from India dominates (about 300 ms on both), so the medians do not tell the servers apart. Go's tail was shorter in three of four series. The single 2.5 s request on the website looks like a cold start but was not confirmed. **What it does not show:** GitHub-backed time (left out to save the allowance, see below), CPU, memory, outbound request counts and error rates under representative load. Those need Vercel's dashboard or observability data, which agents could not reach (the Vercel connector failed to connect). This is a baseline, not a speed claim.

**For step 2 and later:** both Supabase projects are in Mumbai (`ap-south-1`), and both functions run in Washington. Every database call from either implementation crosses that distance. Not measured yet; measure it before step 2, and consider the function region then (GitHub's API is in the US, the database in India).

## GitHub's allowance ran out during these checks

The comparisons of 2026-10-24 sent about 70 signed-out GitHub requests through the Go service over roughly an hour and a half (a repository page counts three). Then, around 10:00 UTC, its 60-an-hour allowance was spent: `trending?since=weekly` and `monthly` answered 500 `{"error":"Failed to fetch trending repositories"}`, **on the website too**, because the website forwards trending to Go. GitHub restores the allowance within the hour. No further GitHub-backed request was sent in this batch.

This is R-031 seen directly: a small burst from one tester is enough to break a switched route. Before step 1, which sends every public GitHub read through the Go service, `GITHUB_PUBLIC_READ_TOKEN` (QUOTA-001, a classic token with no scopes) should be set on `sefgh-api`. It already protects trending today.

## After the switch

The runbook asks for preview checks after each switch. For step 1, run against the preview address, listing the step's routes:

```text
node scripts/compare-deployments.mjs https://<preview address> https://sefgh-api.vercel.app --switched=github-trending,github-languages,github-search,github-trending-developers,github-contributions,github-repo,github-repo-details,github-contents
```

If the preview is protected by Vercel Authentication, the script gets a sign-in page instead and fails. Then check in the browser as the runbook says, or run it against production after the production switch. Each run sends about ten requests per address to GitHub.
