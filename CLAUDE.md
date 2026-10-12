# Claude Code entry point

Use the same project instructions as Codex:

@AGENTS.md

Read `docs/coordination.md` at the start of a task and after another agent hands work over. The Go migration in `docs/adr/0002-go-backend.md` is accepted and proceeds one bounded task at a time; it is not an instruction to rewrite the application at once. This file deliberately imports the shared instructions instead of maintaining a separate plan.
