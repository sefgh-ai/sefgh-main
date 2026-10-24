# Phase 6: decisions the owner makes

Prepared by Claude Code on 2026-10-24 (BATCH-CC-002) for the owner. These are the open entries in [`../bug-register.md`](../bug-register.md) whose Needs column says `owner`. Phase 6 cannot finish without an answer to each. An answer can also be "defer", which only the owner can give.

Each entry lists the options and a recommendation, and says where the fix would then go:

- **React, now:** browser code, fixed at once.
- **Go, after cutover:** a backend route, fixed once in Go after its switch.
- **Migration:** a database change, written as a reviewed file for you to approve.
- **Owner action:** an account or service setting.

To answer, reply with the entry and a letter, for example "R-002 A, R-005 A, R-065 renew". Anything not answered stays open.

## 1. The live site (do these first)

| Entry | Problem | Options | Recommendation |
|---|---|---|---|
| R-065 High | `sefgh.org` expired at Hostinger on 2026-10-06 and does not resolve | **A** renew it and restore the DNS records Vercel asks for; **B** let it go and use another domain | **Answered 2026-10-24: renew later.** Owner action |
| R-066 High | The live site runs the old May 2026 code (`sefgh-ui`, from `sefgh-ai/sefgh-nextjs`); nothing from this repository, including every fix, is live there | **A** point the domain at `sefgh-main` (this repository) once renewed (OPS-004); **B** keep `sefgh-ui` | **Answered 2026-10-24: A** ("all deployments will be done in this repo"). Owner action, after R-065 |

## 2. Database rules

| Entry | Problem | Options | Recommendation |
|---|---|---|---|
| R-103 Medium | Any signed-in user can set their own level, XP, followers and other stats | **A** users may only create their own empty row (column grant `insert (user_id)`), never update it; stats change only on the server. **B** allow some columns. **C** leave it | **A**. Migration. Both this code and the live site's old code only insert `{ user_id }` and never call `updateStats`, so nothing visible changes. The sign-up trigger already creates the row |
| R-078 Low | Four tables nobody uses have loose rules: anyone can add notifications or shares for any user, everyone can read every bookmark | **A** drop the four tables. **B** tighten their rules. **C** leave them | **A**. Migration with a backup first. Neither this repository nor the live site's old code mentions them (checked 2026-10-24); unknown outside tools might, so the migration says so |
| R-079 Low | Four stats views run with the owner's rights (the security advisor flags it) | **A** keep them as they are: they show only per-repository counts, and they are what makes the save count right (R-083). **B** make them run as the caller, which breaks the counts | **A**, recorded as an accepted risk. Nothing to do |
| R-080 Low | Leaked-password protection is off; Supabase offers it only on the Pro plan | **A** defer while on the free tier. **B** upgrade | **A**. Only the owner defers |

## 3. Limits against abuse

| Entry | Problem | Options | Recommendation |
|---|---|---|---|
| R-038 Medium | The AI allowances count per server copy and trust `X-Forwarded-For`, which a caller can change where the proxy does not overwrite it | **A** count in the database (a table and an atomic function: exact, one more call per request). **B** key on the address Vercel itself sets, and accept per-copy counting. **C** leave | **B** after the AI routes move (step 8), **A** only if abuse is seen. Go, after cutover |
| R-042 Low | Nothing limits how often a caller makes the server verify credentials (up to two identity calls per request) | **A** remember a verified token briefly (say 60 s, by its hash). **B** a per-address request limit. **C** leave | **A**. Go, after cutover |
| R-086 Low | `GET /api/repo/comments` takes any `limit`; each comment costs three more requests | **A** cap at 50. **B** another number | **A**. Go, after cutover (step 4) |
| R-088 Low | A video address can be any text; its type is guessed by searching the whole text for `youtube.com` or `github.com` | **A** accept only `https` addresses whose host is exactly YouTube's or GitHub's. **B** any `https` address, typed by its host | **A**. Go, after cutover (step 4) |

## 4. Controls that do nothing

| Entry | Problem | Options | Recommendation |
|---|---|---|---|
| R-002 Medium | The footer's newsletter "Subscribe" does nothing | **A** hide it until a newsletter service is chosen. **B** choose a service (a new account, possibly a cost) | **A**. React, now |
| R-004 Medium | Every error report from browsers goes to `/api/log-error`, which does not exist (404s, nothing recorded) | **A** remove the reporting call. **B** a small Go endpoint that writes a bounded, cleaned record to the server log | **A** now; **B** if you want browser errors collected. React, now (A) |
| R-005 Low | "Upgrade to Pro" leads to a sign-up form; there is no payment | **A** hide it until payments exist. **B** a "coming soon" page | **A**. React, now |
| R-007 Low | Two-factor authentication says "coming soon" | **A** hide the row. **B** build it with Supabase's authenticator-app sign-in (MFA) | **A** now, **B** as a later feature |
| R-008 Medium | Six chat menu items only say "Coming soon" | **A** hide them. **B** keep them, visibly disabled | **A**. React, now |
| R-051 Low | "Blog RSS" on `/links` goes to a feed that does not exist | **A** remove the link. **B** build a feed | **A**, unless a blog is planned. React, now |
| R-017 Medium | The navbar's advanced filters are never sent to the search API | **A** send the ones GitHub search supports (license, created, topic, forks) and hide the rest. **B** hide all of them | **A**: hide now (React); sending them is Go, after step 1 |

## 5. Behaviour choices

| Entry | Problem | Options | Recommendation |
|---|---|---|---|
| R-014 Low | Chat keeps only the newest 20 messages and 8,000 characters without telling the user | **A** show a note when older messages are left out. **B** raise the limits. **C** summarise older messages | **A**. React, now |
| R-034 Medium | A cached public repository can still be shown for up to an hour after it is made private | **A** cache for 10 minutes. **B** keep an hour | **A**, after step 1. Trade-off: more GitHub requests (see R-031) |
| R-026 Low | The trending developers' "top repository" relies on a sort GitHub may ignore | **A** pick the most-starred one from the list returned. **B** leave | **A**. Go, after cutover, contract change |
| R-032 Medium | `/api/github/contributions` answers 500 to everyone signed out; nothing calls it | **A** retire it in Phase 7. **B** use the public read token there | **A** |
| R-040 Medium | Comments and videos look up their authors with an admin call the public key cannot make, so names and pictures are missing | **A** read the author's public profile columns instead (no admin key). **B** leave | **A**. Go, after cutover (step 4), contract change. Fixes R-075's missing names too |
| R-054 Low | The security policy blocks a 3D text worker on the home page; nothing visible breaks | **A** leave it and record why. **B** allow `blob:` scripts (weakens the policy). **C** remove the 3D text | **A** |

## Already decided elsewhere

R-041 and R-186 (2026-10-23), R-031 (set `GITHUB_PUBLIC_READ_TOKEN`), and the playground key entries under the signing stop are not repeated here.
