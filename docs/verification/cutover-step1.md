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

## After the switch

The runbook asks for preview checks after each switch. For step 1, run against the preview address, listing the step's routes:

```text
node scripts/compare-deployments.mjs https://<preview address> https://sefgh-api.vercel.app --switched=github-trending,github-languages,github-search,github-trending-developers,github-contributions,github-repo,github-repo-details,github-contents
```

If the preview is protected by Vercel Authentication, the script gets a sign-in page instead and fails. Then check in the browser as the runbook says, or run it against production after the production switch. Each run sends about ten requests per address to GitHub.
