---
name: bug-fix
description: Fix a recorded SEFGH bug (an R-NNN entry, as a BUG-0NN task) the way this project requires - claim, fix once in the right layer, prove the test catches it, update the register, hand off. Use when asked to fix a bug or register entry, or to pick the next bug from the register.
---

# Fixing a register entry

The recipe and the traps are written down once, in `docs/next-agent-briefing.md`. Read those two sections now; do not work from memory of them:

- Section 5, "How a fix is done here": `rg -n "^## 5\." -A 24 docs/next-agent-briefing.md`
- Section 7, "Traps that cost time": `rg -n "^## 7\." -A 36 docs/next-agent-briefing.md`

Before the first edit:

1. `node scripts/agent-handoff.mjs --status`, then take the writer flag (AGENTS.md).
2. Read the entry's row: `rg -n "^\| R-NNN " docs/bug-register.md`. If **Needs** is `owner`, write the options and ask; do not fix. If it is `contract`, the fixtures and every implementation change in one commit, with the owner's approval.
3. Decide the layer (AGENTS.md, "Fix each bug once"): browser and UI bugs in React; backend bugs in Go, and only after the route is cut over and its Next.js handler retired. The exception is a security, privacy or data-loss bug in live Next.js code, fixed where it is live.

While fixing:

- Ship something that would catch the bug again, and prove it: break the fix, see the named test fail, restore, confirm the file hash is unchanged.
- Run the whole Go suite (`go test -count=1 ./...` in `backend/`), not one package; wiring tests live in `backend/cmd/api`.
- Browser code changed: `npm run lint` (zero warnings) and `npm run build`. For anything visible, check it in a browser with the `qa-pages` skill.

When done: set the entry's status to "fixed (BUG-0NN, date): …", write the handoff record under "Current state", release the flag, run `npm run handoff`. If you must stop early, write a paused checkpoint and do not run the handoff.
