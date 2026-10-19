# Trending topics contract

**Version 1** (TREND-001a, 2026-10-19): 11 cases for `GET /api/trending/topics`. For each of six topics, the endpoint answers the most-starred repositories created in the last 30 days, searched live on GitHub. It replaces the stored `trending_repos` table and its refresh route, which could not write the table (bug register R-077). The owner chose this design, option A in `../../docs/plans/trending-refresh.md`, on 2026-10-19.

```text
node --test scripts/contracts/trending-topics.test.mjs
cd backend && go test -count=1 ./internal/trendingtopics/
```

## How it was made

There is no Next.js handler: the endpoint exists only in Go (`backend/internal/trendingtopics`), so the cases were written by hand, not recorded. The expected repositories were computed by a separate script from the trending list's own mapping (`githubtrending.Item`), which `contracts/github-trending` already pins. The Go contract test runs every case; `trending-topics.test.mjs` checks the fixtures themselves.

A stand-in GitHub answers each topic's search from `github[topic]`; `network_error` means no reply. The clock is fixed at 2026-10-19T09:30:00Z. The searches run at the same time, so requests are compared as a sorted list.

## Behaviour

- **Six searches, two at a time, within one 20-second budget.** Each asks `/search/repositories` for the topic's words joined by `OR`, plus `created:>` (30 days back, in UTC) and `stars:>100`, sorted by stars, five per page.
- **Words, not `topic:` qualifiers.** GitHub applies `OR` only to text, and refuses `OR` between qualifiers with 422 (R-101). So a word may match a repository's name or description as well as its topics, and results are broader than an exact topic match.
- **Each repository** is mapped as the main trending list maps it (`githubtrending.Item`), plus `topic` (the section's name) and `topicIcon`. A list longer than five is cut to five.
- **A topic fails** on any refusal, no reply, a reply that is not JSON or has no list of items, or an item without an owner. It is then answered with `complete: false` and no repositories, and the other topics still answer.
- **The answer** is `{ generatedAt, topics: [{ id, name, icon, complete, repos }] }`, the topics always in the same order.
- **Caching:** every topic found gives `public, max-age=0, s-maxage=21600, stale-while-revalidate=3600`; some failed gives `public, max-age=0, s-maxage=300`; all failed gives 502 `{ "error": "Trending topics could not be loaded" }` with `no-store`.
- **No caller credentials:** the caller's `Authorization` and `X-GitHub-Token` are never read or sent, so one answer can be cached for everyone. In the server the searches may carry the public read token (QUOTA-001).

## Not yet

The page does not read this endpoint yet (TREND-001b), and its switch, `trending-topics`, is off. With it off, Next.js has no handler and the path is a 404. How Vercel's CDN caches the answer is to be verified before the switch is turned on.
