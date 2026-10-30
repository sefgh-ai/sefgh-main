# Phase 6 decision pack 2: fixes that change a contract

**Owner answer (2026-10-29): recommendation A for every item.** All 27 listed fixes and the two larger choices are approved (count corrected by census on 2026-10-30); fixes remain separate bounded tasks. R-011 is deferred until after Phase 7; R-042's GitHub-token checks remain immediate, without caching. This approval does not authorize deployment, production SQL, credentials or resuming the parked items. Recorded by Codex from the owner's answer in this session.

Implementation progress: R-016 committed at 66024e6; R-021/R-022/R-023 committed at a728edc. R-024 implemented locally in BUG-043 (uncommitted). Five of 27 fixes complete locally; 22 remain, starting R-025. R-205 is a separate open UI issue. The owner resumed this pack after local route source work; hosted key acceptance remains gated on browser access; KEYS-WIRING-001 adds default-off local key-route integration without changing the existing signing/hosted/activation or Phase 6 retirement gates.

Prepared by Claude Code on 2026-10-29 (DECISION-PACK-002) for the owner. Every route is on Go in production since 2026-10-28, so each of these can now be fixed once, in Go (or in React where it says so). Each fix changes what a contract records, which needs your approval. Recommendation **A** is what an agent would build; **B** is the alternative. The register (`../bug-register.md`) has the full detail for each entry.

To answer, reply for example **"pack 2: all A"**, or **"pack 2: all A except R-011 B, R-095 later"**.

## Trending and developers

| Entry | What is wrong today | A (recommended) | B |
|---|---|---|---|
| R-016 Medium | "Monthly" and "yearly" trending show the same as "latest": no date filter | Add the date filter: created in the last 30 or 365 days, like daily and weekly | Remove the two options |
| R-021 Low | The trending language filter refuses C#, which the language list offers | Accept every language the list offers | Remove C# from the list |
| R-022 Low | Monthly ranges overflow February into March; daylight saving shifts the start | Count back fixed days in UTC (30, 365), as daily now does (R-203) | Leave |
| R-023 Medium | A GitHub rate limit becomes a plain 500, so the page cannot say "try again later" | Answer 429 with GitHub's wait time, as search already does | Leave |
| R-024 Low | Language colours can be looked up on built-in object names; the C++ query sends literal plus signs | Look colours up only in the real table; send C++ correctly encoded | Leave |
| R-025 Medium | One failed repository lookup shows a developer as "no public repositories"; one network failure fails the whole list | Show "repository unavailable" for that developer and keep the rest of the list | Leave |
| R-027 Low | Logins from GitHub go into the address unchecked ("undefined", slashes, question marks) | Skip entries whose login is not a valid GitHub login | Leave |

## Repository pages and contributions

| Entry | What is wrong today | A (recommended) | B |
|---|---|---|---|
| R-029 Medium | A repository that does not exist answers 500, so the page cannot say "not found"; rate limits are a plain 500 too | 404 for not found, 429 with the wait time for rate limits, 502 for other GitHub failures | Leave |
| R-030 Low | Malformed GitHub replies are answered 200 with holes | Leave out malformed items; refuse a reply that is not the right shape (502) | Leave |
| R-033 Low | Contributions: dates depend on the server's time zone; an unknown user is 400; the streak is 0 all day until you contribute | UTC dates; unknown user 404; the streak counts from yesterday while today is empty | Leave |
| R-059 Low | Activity grid: the first week has six days; the daily average divides by empty days; the streak is 0 until today has activity | Sunday-to-Saturday weeks throughout, average over real days, streak from yesterday while today is empty | Leave (the profile card computes its own figures) |

## Saving, voting, rating, comments, videos, shares

| Entry | What is wrong today | A (recommended) | B |
|---|---|---|---|
| R-084 Low | When Supabase Auth cannot be reached, saving, voting, rating, commenting and adding videos say "log in", though you are signed in | 503 "Sign-in could not be verified", as activity now does (R-063) | Leave |
| R-085 Low | A rating such as "5", " 5 ", "0x5", `true` or "great" passes the check | Accept only a whole number 1 to 5; anything else is 400 | Leave |
| R-087 Low | Editing someone else's comment (or one that does not exist) says "failed"; deleting it says "success" though nothing changed (videos too) | 404 "not found" for both | Leave |
| R-081 Low | A share link failure can show the library's own error text | A fixed "Internal server error" | Leave |
| R-082 Low | Every database failure on a share link says "not found", so a visitor thinks the link is dead when the database is down | 404 only when there is no such share; 503 when the database cannot answer | Leave |
| R-089 Low | Creating, removing or forking a share can show database and library error text | Fixed messages only | Leave |

## Avatar upload

| Entry | What is wrong today | A (recommended) | B |
|---|---|---|---|
| R-094 Medium | The upload trusts the file's label: an empty file, or any bytes called a PNG, is accepted, and the name can keep `.exe` | Check the file's first bytes for PNG, JPEG, GIF or WebP; refuse empty files; name the file by the type found | Check the label strictly only |
| R-096 Medium | If saving the new avatar to the profile fails, the uploaded file stays; if the profile row fails, the answer still says success | Delete the new file and answer 500 when either step fails | Leave |
| R-097 Low | Upload failures send Storage, Auth and database error text to the browser | Fixed messages only | Leave |
| R-095 Medium | Old-avatar cleanup can miss files (first 100 only, a lone old file) or remove a newer upload when two run at once | After a successful upload, remove every older file in your folder, listing them all, and never the one just uploaded | Later, with a Storage design |

## AI helpers and chat

| Entry | What is wrong today | A (recommended) | B |
|---|---|---|---|
| R-010 Medium (React) | If the AI's reply is not text, the chat page says "Failed to send message" although the server answered | Show "The assistant sent an empty answer" and keep the conversation | Leave |
| R-012 Low | The fallback chat title is cut at 30 units and can split an emoji | Cut at 30 characters without splitting one | Leave |
| R-013 Low | Fallback title: repeated spaces count as words; an AI title of only quotation marks gives an empty title; the message goes into the title prompt between unescaped quotes | Collapse spaces; fall back when the AI title is empty; escape the message in the prompt | Leave |
| R-035 Medium | Enhance-query answers 500 when the AI provider fails, instead of its own built-in enhancement | Fall back to the built-in enhancement; a blank AI answer falls back too; a null body is 400 | Leave |
| R-036 Low | The built-in enhancement matches inside words ("go" in "google"), repeats words already there, keeps stray spaces | Whole-word matches, no repeats, trimmed; escape the query in the AI prompt | Leave |
| R-037 Low | Suggestions: a number or list as the query is 500 (should be 400); a padded short query reaches the AI; duplicates reach the page | 400 for non-text; trim first; remove duplicates and non-text items | Leave |

## Larger choices

| Entry | Question | A (recommended) | B |
|---|---|---|---|
| R-011 Medium | Editing or deleting a chat message rewrites the whole conversation, so two devices writing at once lose one change | Later: it needs a table change (one row per message, or a version check). Keep for after Phase 7 | Design it now |
| R-042 (GitHub part) | Sessions are now remembered for a minute; should GitHub tokens be too? | **No**: a revoked GitHub token must be refused at once (the isolation contract pins it); one GitHub check per request stays | Yes, remember tokens for a minute too |

## Not in this pack

- R-064 and R-076 (Low): no decision needed; they wait on a small test-harness change and are the next agent task.
- R-038: decided (B); needs checking once the AI keys are on the Go project.
- RepoSync (R-189 to R-198), the analysis workers (R-116 to R-123) and the playground keys (R-039, R-127 to R-143, R-177, R-182): wait until those parts are deployed or resumed.
