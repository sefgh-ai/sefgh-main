# Vercel eve, durable agent/workflow frameworks, and making SEFGH usable by external AI agents

Research date: 2026-10-26. Prices and limits are as shown on the cited pages on that date. "Inference" means my reasoning from the cited facts, not a claim from a source. Nothing here was installed or tested.

## (a) Vercel eve: what it is, launch, features, runtime, deployment, cost on Hobby, maturity, and fit for SEFGH

### Takeaway
eve is Vercel's open-source (Apache-2.0) framework for durable AI agents, written in TypeScript and running on Node.js 24+. It launched on 17 June 2026 and is still in beta: the latest changelog entry is v0.83.2, and recent releases have breaking changes. The framework itself costs nothing. You pay only for the Vercel resources it uses (Functions, Workflow, Sandbox, AI Gateway or model tokens, tracing), and Hobby includes a free allowance for each, so a small eve agent can run on Hobby for $0 plus model tokens. However, Hobby allows cron only once a day, functions only 300 s and sandbox sessions only 45 minutes, its Workflow allowance is small, and it is limited to non-commercial use. That makes eve a poor fit as SEFGH's ingestion orchestrator. It fits well as an optional, separate TypeScript "repository analyst" or owner-operations agent that calls the Go API through an OpenAPI or MCP connection.

### Cited Findings
- **Launch:** eve launched on 17 June 2026 at Vercel Ship in London. It is an open-source TypeScript framework in which "each agent is a directory of files", and Vercel calls it "Next.js for agents". — [MarkTechPost, 2026-06-17](https://www.marktechpost.com/2026/06/17/vercel-releases-eve/); [The New Stack](https://thenewstack.io/vercel-launches-eve-an-open-source-framework-that-treats-agents-as-directories/)
- **Passport:** eve debuted alongside Passport, a product for bringing employees' AI-built apps under enterprise control. — [The Register, 2026-06-19](https://www.theregister.com/devops/2026/06/19/vercel-debuts-eve-open-source-agent-framework-tries-to-fix-shadow-ai-with-passport/5258726)
- **Repository:** github.com/vercel/eve describes itself as "The Open Framework for Building Agents" and "a filesystem-first framework for durable AI agents". It is Apache-2.0. When fetched on 2026-10-26 it had about 5.7k stars, 629 forks, 2,186 commits and 278 open issues. — [GitHub vercel/eve](https://github.com/vercel/eve)
- **Maturity:** The README says "eve is currently in beta and subject to the Vercel beta terms", and that APIs and behaviour may change before general availability. — [GitHub vercel/eve](https://github.com/vercel/eve)
- **Release pace and breaking changes:** The newest changelog entry is v0.83.2; the page gives no dates.
  - v0.83.0 broke custom sandbox providers and removed the microsandbox provider.
  - v0.83.0 is also one-way: after upgrading, rolling back to an earlier release makes sessions created on v0.83.0 fail to open their sandbox.
  - v0.82.0 replaced the per-session token and cost options with a single `limits.sessionUsage` function.
  - Source: [eve changelog](https://eve.dev/changelog.md)
- **Earlier versions:** A secondary article said the project went from 0.11.4 at launch to 0.24.3 by 15 July 2026, with 3,516 stars then. — [pasqualepillitteri.it (German, secondary)](https://pasqualepillitteri.it/de/news/5341/vercel-eve-open-source-framework-ki-agenten)
- **Runtime:** Getting started requires Node.js 24 or newer and npm. Behaviour is set in `agent/instructions.md` and model configuration in `agent/agent.ts`. eve adds the `eve`, `ai` (AI SDK) and `zod` dependencies. — [eve Getting Started](https://eve.dev/docs/getting-started)
- **Languages:** The docs index lists only a TypeScript API (`define*` helpers) and a CLI; no Go or Python SDK is mentioned. — [eve llms.txt](https://eve.dev/llms.txt)
- **Project layout:** `agent/` contains `instructions.md`, `tools/`, `skills/`, `channels/` (HTTP, Slack, Discord) and `schedules/`. `npx eve@latest init my-agent` scaffolds a project, and the default model is `openai/gpt-6-luna-fast`. The docs ship inside the package at `node_modules/eve/docs`, so coding agents can read them. — [GitHub vercel/eve](https://github.com/vercel/eve)
- **Documented features:** The docs index covers:
  - tools and built-in tools;
  - memory (file memory and custom providers);
  - channels (Slack, Discord, iMessage, SMS and others);
  - skills, durable state, hooks and dynamic capabilities;
  - subagents and "Remote Agents", which call another eve deployment as a subagent;
  - a sandbox with an isolated shell and filesystem, lifecycle and network policy;
  - schedules, plus experimental dynamic schedules;
  - **connections** to external MCP and OpenAPI servers, "with credentials kept from the model";
  - evals run with `eve eval`;
  - frontend clients (Next.js, Nuxt, SvelteKit, TanStack Start, and a Client SDK);
  - the ACP and UCP protocols, OpenTelemetry instrumentation, multi-tenant memory, auth and approval patterns, and self-modification.
  - Sources: [eve llms.txt](https://eve.dev/llms.txt); [eve Getting Started](https://eve.dev/docs/getting-started)
- **Durability model:**
  - Each session runs as one workflow "built on the open-source Workflow SDK", and sessions can last days and survive restarts and redeploys.
  - A step is "a durable checkpoint inside a turn". By default a step holds one model call plus the inline tool calls that follow it.
  - Completed steps are never re-run; their results are replayed. An interrupted step does re-run, so side effects need idempotency or approval gates.
  - Turns that wait for human approval or OAuth "park" without holding compute.
  - Each session remembers its last 1,024 idempotency keys for deduplication.
  - Source: [eve Execution Model and Durability](https://eve.dev/docs/concepts/execution-model-and-durability)
- **State backends ("worlds"):** Locally and when self-hosted, run data is stored on disk under `.eve/.workflow-data`. On Vercel the same code runs on Vercel Workflow. Self-hosted setups can select `@workflow/world-postgres` through `experimental.workflow.world`. — [eve Execution Model and Durability](https://eve.dev/docs/concepts/execution-model-and-durability)
- **Workflow SDK Postgres world:** It is described as "a self-hosted durable backend for long-running server processes".
  - It reads its connection from `WORKFLOW_POSTGRES_URL` or `DATABASE_URL`.
  - It uses Graphile Worker for jobs, with a default concurrency of 50 and 500 ms polling, and has a `bootstrap` migration command.
  - The Worlds page shows only TypeScript examples and mentions no Go or Python worker.
  - Source: [Workflow SDK Worlds](https://workflow-sdk.dev/docs/configuration/worlds)
- **Schedules:**
  - A schedule is `defineSchedule({ cron, markdown | run })` placed under `agent/schedules/`.
  - On Vercel, "each schedule becomes a Vercel Cron Job" (in UTC). Self-hosted builds register Nitro scheduled tasks, which run while `eve start` is up.
  - `eve dev` never fires schedules on its own.
  - Markdown schedules cannot wait for approval: "the session fails instead of waiting".
  - Source: [eve Schedules](https://eve.dev/docs/schedules.md)
- **Deployment steps:** Every production deployment must:
  - run `eve build`;
  - provide model credentials and other secrets;
  - replace `placeholderAuth()` with a production route policy (the default policy rejects browser traffic in production);
  - choose workflow and sandbox implementations that match the host;
  - check the `/eve/v1/health` route.
  - Source: [eve Deployment Overview](https://eve.dev/docs/guides/deployment/overview)
- **On Vercel:** eve uses:
  - Vercel Workflow for durable runs;
  - Vercel Sandbox as the default sandbox, prewarmed during the build (a prewarm failure stops the deployment);
  - Vercel Cron for schedules;
  - AI Gateway for string model IDs, authenticated with project OIDC so no provider key is needed.
  - Source: [eve Deploy to Vercel](https://eve.dev/docs/guides/deployment/vercel.md)
- **Not Vercel-only (current docs):**
  - Self-hosting runs a Nitro Node server (`.output/`) "on your own infrastructure", with a local or custom Workflow world and Docker or a custom sandbox. eve can also be embedded in a Next.js, Nuxt, SvelteKit or TanStack Start app. — [eve Deployment Overview](https://eve.dev/docs/guides/deployment/overview)
  - Since v0.83.0, `DockerSandbox` is the sandbox outside Vercel, and deployed self-modification requires Vercel. — [eve changelog](https://eve.dev/changelog.md)
  - Vercel told The Register: "We are 100 percent committed to making it work everywhere". — [The Register](https://www.theregister.com/devops/2026/06/19/vercel-debuts-eve-open-source-agent-framework-tries-to-fix-shadow-ai-with-passport/5258726)
  - Conflict: some launch coverage said eve "currently runs only on Vercel". — [digitalapplied.com](https://www.digitalapplied.com/blog/vercel-eve-open-source-typescript-agent-framework-launch). The current self-hosting docs contradict this.
- **Early-user problem:** One early user found eve required a Vercel login even when configured for another model provider, which may have been a bug. — [The Register](https://www.theregister.com/devops/2026/06/19/vercel-debuts-eve-open-source-agent-framework-tries-to-fix-shadow-ai-with-passport/5258726). The current guide says "You do not need a Vercel project to start chatting", and accepts a ChatGPT subscription, a Vercel account or AI Gateway, or an OpenAI or Anthropic key. — [eve Getting Started](https://eve.dev/docs/getting-started)
- **Pricing:** "eve usage is billed through the Vercel resources and third-party services your agent uses."
  - The billable resources are Vercel Functions, Vercel Workflows, Vercel Sandbox, AI Gateway or model providers, and Always-on Tracing.
  - eve inherits the Function, Workflow, Sandbox, model and channel limits.
  - No separate eve fee or eve plan is listed. The page was last updated 2026-06-19.
  - Source: [Vercel docs: eve Pricing and Limits](https://vercel.com/docs/eve/pricing)
- **Hobby is non-commercial:** "the Hobby plan restricts users to non-commercial, personal use only." — [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)

### Inferences
- **Is eve free?** Yes in licence and fee terms. Running it is free on Hobby only within each product's allowance (section (b)) and only for non-commercial use. If SEFGH earns money, Hobby is not allowed regardless of usage. Model tokens are the real cost: AI Gateway's free tier covers only some models, at lower rate limits.
- **Schedules on Hobby:** eve schedules become Vercel Cron Jobs, and Hobby cron fails deployment for anything more frequent than daily. So an eve schedule such as `*/5 * * * *` should fail to deploy on Hobby. This was not tested; it follows from the two cited pages.
- **Rough Hobby capacity:** A Vercel Workflow step creates at least three events, and Hobby includes 50,000 events a month. That is roughly 16,000 steps a month before retries and run-level events. An eve turn with three model calls is about three steps, so Hobby supports a few thousand agent turns a month. This is an estimate, not a measurement.
- **Fit for the pipeline (Discover → Enrich → Analyze → Embed): poor.** The pipeline is deterministic, high-volume and mostly non-LLM. It would spend Workflow events on every repository, run into the daily cron limit and the 300 s function cap, and add Node.js plus a beta framework to a core the owner wants in Go. Keep the core in the Go worker over the Postgres job table.
- **Fit for a "repository analyst" agent: good, if optional.** An eve agent could:
  - answer user questions using SEFGH's Go API as an OpenAPI connection, or SEFGH's own MCP server as an MCP connection;
  - run the optional Analyze stage for a few repositories a day, with approval gates and session usage limits;
  - post owner summaries to Slack or Discord through channels.

  The Go worker must never depend on it, so it can be switched off by configuration.
- **Self-hosting on the owner's small server:** Possible, using the Workflow SDK Postgres world. However, Graphile Worker relies on LISTEN/NOTIFY and writes every workflow event to Postgres. That needs a direct or session connection, not the transaction pooler, and would eat into the Supabase free tier's 500 MB. A separate local Postgres on the server would avoid that. Not verified.

### Gaps
- No dated release list was found, so the version at launch and the date of v0.83.2 are not confirmed from a primary source.
- No Vercel page explicitly says "eve works on Hobby". That conclusion comes from eve's pricing page deferring to per-product pages, all of which list Hobby allowances.
- It is not documented whether the Sandbox prewarm at build time uses Hobby Sandbox allowance on every deploy.

## (b) Related Vercel products in 2026 (Workflow, AI SDK WorkflowAgent, Queues, Sandbox, AI Gateway, Functions, Cron, Daemons): free allowances and limits

### Takeaway
Every Vercel product eve relies on has a free Hobby allowance:

| Product | Hobby allowance and limits |
| --- | --- |
| Workflow | 50,000 events and 1 GB written per month; run history kept 1 day |
| Queues | 1,000,000 operations |
| Sandbox | 5 active CPU-hours, 45-minute sessions, 10 concurrent |
| Functions | 300 s maximum duration, 4 active CPU-hours, 1,000,000 invocations |
| Cron | Once per day, ±59 minutes |
| AI Gateway | Monthly free credit, limited to some models |
| Daemons (new, public beta) | Containerised background workers, 5 active CPU-hours per month |

These allowances suit a low-volume agent or experiment, not a continuously running ingestion pipeline. Every Hobby limit stops service until the next 30-day window instead of billing.

### Cited Findings
- **Workflow billing:** Vercel bills three meters: events, data written and data retained.
  - Hobby includes 50,000 events a month and 1 GB written. "Workflow Data Retained is not available on Hobby."
  - On demand: $0.02 per 1,000 events, $0.50 per GB written and $0.50 per GB-month retained.
  - A normal step produces three events (`step_created`, `step_started`, `step_completed`), plus one per retry.
  - Page updated 2026-09-16. — [Vercel Workflow Pricing and Limits](https://vercel.com/docs/workflow/pricing)
- **Workflow run limits:**
  - On the Node.js runtime: 25,000 events and 10,000 steps per run; QuickJS runs with snapshotting are exempt.
  - 50 MB maximum payload, 2 GB stored per run and 240 s maximum replay.
  - No limit on run or `sleep` duration. Each step is limited by Functions limits.
  - Hobby rate limit: 50,000 requests a minute.
  - Workflow uses Vercel Queues internally, billed at Queues rates. — [Vercel Workflow Pricing and Limits](https://vercel.com/docs/workflow/pricing)
- **Run history and approvals:** Run history is kept "1 day on Hobby, 7 days on Pro, and 30 days on Enterprise". Vercel recommends exporting history to Vercel Blob for longer audits. "Approvals are recorded as workflow events." — [Vercel KB: Durable agent approval workflows (2026-07-29, updated 2026-08-31)](https://vercel.com/kb/guide/agent-approval-workflow-stack-guide)
- **AI SDK `WorkflowAgent`:** `WorkflowAgent` (package `@ai-sdk/workflow`) is the AI SDK's durable agent class.
  - It replaces the Workflow SDK's older `DurableAgent`, and is AI SDK v7's replacement for it.
  - Each tool call becomes a durable step with three retries by default. `needsApproval: true` pauses the agent until a person responds.
  - Sources: [AI SDK docs: WorkflowAgent](https://ai-sdk.dev/docs/agents/workflow-agent); [Vercel KB: What is WorkflowAgent](https://vercel.com/kb/guide/what-is-workflowagent); [Workflow SDK cookbook (workflow@5.2.0)](https://app.unpkg.com/workflow@5.2.0/files/docs/cookbook/agent-patterns/durable-agent.mdx)
  - The `ai` package was at 7.0.40 on unpkg. — [unpkg ai@7.0.40](https://app.unpkg.com/ai@7.0.40/files/docs/03-agents/07-workflow-agent.mdx)
- **Queues:** Billed per API operation (send, receive, delete, visibility change, notify), metered in 4 KiB chunks.
  - Hobby includes the first 1,000,000 operations.
  - Retention is 60 s to 7 days (default 24 h), the visibility timeout is at most 60 minutes, and a message can be up to 100 MB.
  - Page updated 2026-08-12. — [Vercel Queues Pricing and Limits](https://vercel.com/docs/queues/pricing)
- **Sandbox on Hobby** is free with no overage charges; creation pauses once the allowance is used.
  - Allowance: 5 active CPU-hours a month, 420 GB-hours of memory, 5,000 creations, 20 GB data transfer.
  - Limits: 10 concurrent sandboxes, 45-minute sessions, at most 4 vCPU and 8 GB.
  - Pro: $0.128 per CPU-hour and 24-hour sessions.
  - Data downloaded into a sandbox (packages, Git repositories) is free.
  - Page updated 2026-09-10. — [Vercel Sandbox pricing](https://vercel.com/docs/vercel-sandbox/pricing)
- **Functions (Fluid compute):**
  - Hobby: 300 s default and maximum duration, 2 GB and 1 vCPU.
  - Pro: 800 s maximum, plus a 1,800 s extended maximum in beta.
  - Request and response bodies are limited to 4.5 MB.
  - Vercel points to Workflows for work with no time limit. Page updated 2026-08-24. — [Vercel Functions Limits](https://vercel.com/docs/functions/limitations)
- **Hobby included usage:** 4 active CPU-hours, 360 GB-hours of memory and 1,000,000 function invocations. When a Hobby limit is exceeded, you usually wait 30 days. Page updated 2026-09-14. — [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- **Cron:** 100 cron jobs per project on every plan.
  - Hobby runs at most once a day, with per-hour precision (±59 minutes). More frequent expressions "will fail during deployment".
  - Pro allows once a minute. Page updated 2026-07-15. — [Vercel Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- **AI Gateway:** "no markup and no platform fee on tokens".
  - Every team gets a free tier with a monthly free credit, limited to a subset of models and lower per-model rate limits (excess requests get HTTP 429).
  - Buying credits moves the team to the paid tier and ends the monthly free credit.
  - Bringing your own provider key (BYOK) adds no fee but requires purchased credits.
  - Budgets can cap spend per team, project, key or member. Page updated 2026-09-08. — [Vercel AI Gateway Pricing](https://vercel.com/docs/ai-gateway/pricing)
- **Vercel Daemons (public beta, published 2026-10-15):** These are containerised background processes that "don't receive traffic" and pull work from a queue or workflow engine.
  - Available on every plan, including Hobby.
  - Hobby caps daemons at 5 active CPU-hours a month across the team; once reached, all of the team's daemon instances stop.
  - Vercel's advice: "Use Hobby to try daemons and the Pro plan for workers that need to run all month."
  - No autoscaling, no preview deployments, no persistent local storage, Linux amd64 only. A Dockerfile is required; Go is not mentioned.
  - Source: [Vercel KB: Vercel Daemons](https://vercel.com/kb/guide/vercel-daemons)

### Inferences
- **Scheduling:** On Hobby, Vercel Cron can only provide one daily tick. pg_cron in Supabase has no such limit, so it remains the better tick source for the proposed Go worker (with pg_net calling an endpoint, or the worker polling the job table).
- **Daemons:** Vercel Daemons could later host the Go worker as a container, so the same binary runs on Vercel, the owner's server or Cloud Run. On Hobby, 5 active CPU-hours only covers trials, and the product is in beta.
- **Vercel Workflow and `WorkflowAgent`:** These are the Vercel-native way to build a durable TypeScript pipeline. Adopting them would move orchestration out of Go, which conflicts with the accepted Go direction. Use them only for an optional TypeScript agent.
- **Audit retention:** Hobby keeps run history for one day, so any agent decision log must be written to SEFGH's own Postgres tables, not left in Workflow history.

### Gaps
- The AI Gateway pricing page fetched on 2026-10-26 does not state the dollar amount of the monthly free credit.
- No documented pricing was found for Vercel Daemons beyond the Hobby CPU-hour cap.

## (c) Alternatives for durable, resumable jobs and agents: free tiers, Go support, and which keep state in Postgres

### Takeaway
For a Go worker that may use only the standard library, the only options needing no new Go modules are SEFGH's own lease-based job table or Supabase Queues (pgmq), reached through Supabase's HTTP/RPC API. If one third-party module is acceptable, DBOS Transact Go (MIT, durable workflows stored in Postgres, no separate server) and River (a Postgres job queue) keep all state in Postgres. Both need a Postgres driver and a direct or session connection.

Hosted engines with Go SDKs and free tiers:

| Engine | Free tier | Licence |
| --- | --- | --- |
| Hatchet | 1M runs a month | MIT, Postgres-backed |
| Inngest | 50k executions a month | Open source, self-hostable |
| Restate | 50k actions a month (secondary source) | Server licence unclear |

Temporal has the strongest Go SDK but no free cloud plan: only $150 of credits for 90 days. Self-hosting it would be heavy for a small server.

TypeScript-centred options: Trigger.dev, Cloudflare Workflows, Vercel Workflow, eve and Mastra.

Google ADK has an official Go SDK (v2, June 2026), but it is an agent framework, not a durable engine. The OpenAI Agents SDK has no official Go SDK.

### Cited Findings
- **Temporal Cloud:** No ongoing free plan is listed. "Start for free with $150 in credits", valid for 90 days. Pay-as-you-go starts at $50 per million actions (falling to $25 per million), active storage costs $0.042 per GB-hour, and Business starts at $500 a month. — [Temporal pricing](https://temporal.io/pricing)
- **Temporal server:** MIT-licensed, about 24k stars. `temporal server start-dev` runs a local development server. — [GitHub temporalio/temporal](https://github.com/temporalio/temporal)
- **Inngest:** The free Hobby plan includes 50k executions a month; runs and steps both count, and execution pauses at the quota. It also allows 5 concurrent steps and keeps 24 hours of traces and logs. Pro starts at $99 a month. "Inngest is open-source and can be self-hosted." — [Inngest pricing](https://www.inngest.com/pricing)
- **Inngest Go SDK:** The official Go SDK says "Write durable functions in Go via the Inngest SDK", with `step.Run`, durable sleep and `WaitForEvent`. It is Apache-2.0 and small: 116 stars. — [GitHub inngest/inngestgo](https://github.com/inngest/inngestgo)
- **Trigger.dev:** The Free plan is $0 a month with a $5 monthly credit, 20 concurrent runs, 10 schedules and 1-day log retention. Hobby costs $10 a month and Pro $50 a month. Tasks are written in TypeScript or JavaScript; Python is supported through a build extension. It is Apache-2.0 and can be self-hosted. — [Trigger.dev pricing](https://trigger.dev/pricing)
- **Hatchet cloud:** "1M runs and 1M events free, every month"; the no-card tier lists 2,000 task runs a day and 1-day retention. Extra runs cost $30 per million. "100% open-source and MIT licensed." — [Hatchet pricing](https://hatchet.run/pricing)
- **Hatchet architecture:** Hatchet "uses Postgres as a durability layer for both the task runtime and the observability system", and supports Python, TypeScript, Go and Ruby. Local setup uses Docker. About 8.2k stars. — [GitHub hatchet-dev/hatchet](https://github.com/hatchet-dev/hatchet)
- **Restate:**
  - Go SDK: requires Go 1.24 or newer. — [GitHub restatedev/sdk-go](https://github.com/restatedev/sdk-go)
  - Cloud free tier: 50k actions a month, 1 GB storage and 1-day retention, with Starter at $75 a month, according to a secondary aggregator. — [devtune.ai](https://devtune.ai/verticals/workflow-orchestration-and-durable-execution/restate/pricing)
  - The Cloud launch announcement says it is open to everyone. — [Restate blog](https://restate.dev/blog/announcing-restate-cloud-public)
  - Server licence: reported as BSL 1.1 by one review site and MIT by another; neither confirmed. — [beri.net](https://www.beri.net/tools/restate)
- **Cloudflare Workflows on Workers Free:** 100,000 requests a day (shared with Workers), 10 ms of CPU per invocation, 1 GB-month of storage and 3,000 steps a day.
  - Paid plan: 500,000 steps a month included, then $0.80 per 100,000.
  - Billing for steps and storage began on 10 August 2026. Instance state is kept 3 days on Free.
  - Source: [Cloudflare Workflows pricing](https://developers.cloudflare.com/workflows/reference/pricing/)
- **DBOS Transact Go:** "Database-Backed Durable Golang Workflows", with "lightweight durable workflow orchestration on top of Postgres".
  - Workflows run steps with `RunAsStep`.
  - Durable queues support concurrency limits, rate limits, deduplication and priorities, and need "just Postgres", with no separate queueing service or broker.
  - It also supports cron-style scheduled workflows, durable `Sleep`, and `Send`/`Recv` between workflows.
  - No separate server is needed, unlike Temporal. MIT-licensed, about 861 stars.
  - Source: [GitHub dbos-inc/dbos-transact-golang](https://github.com/dbos-inc/dbos-transact-golang)
- **River:** "River persists jobs to a Postgres database".
  - Enqueueing is transactional: a job "becomes visible to workers only after the transaction commits".
  - It supports retries, unique jobs, periodic jobs and scheduled jobs. Workflows, sequences, batching, concurrency limits and a dead-letter queue are paid "Pro" features.
  - Go drivers: `riverpgxv5` (pgx) or `riverdatabasesql`. — [River docs](https://riverqueue.com/docs)
  - Connections: running clients should use a direct or session-pooled connection because they use LISTEN/NOTIFY; "Insert-only clients can use transaction pooling". — [River and PgBouncer](https://riverqueue.com/docs/pgbouncer)
- **Supabase Queues (pgmq):** A Postgres-native queue built on the pgmq extension.
  - "Messages added to Queues are guaranteed to be delivered to your consumers." Each message is "delivered exactly once to a consumer within a customizable visibility window".
  - Queues can be managed with any Postgres tooling. Client access is controlled with API permissions and Row Level Security (RLS).
  - Source: [Supabase Queues](https://supabase.com/docs/guides/queues)
- **Google ADK for Go:** The module is `google.golang.org/adk/v2`; v2.0.0 was published on 30 June 2026 under Apache-2.0. — [pkg.go.dev](https://pkg.go.dev/google.golang.org/adk/v2). ADK Go was first announced in November 2025. — [InfoQ](https://infoq.com/news/2025/11/go-agent-development-kit/). A secondary guide mentions v2.1.0, which conflicts with the pkg.go.dev listing. — [DEV Community](https://dev.to/gde/building-ai-agents-with-the-go-agent-development-kit-adk-2026-edition-v2-4n55)
- **OpenAI Agents SDK:** Official SDKs exist for Python and TypeScript only, with no Go SDK. Reported versions: Python `openai-agents` 0.24.0 (15 October 2026) and TypeScript `@openai/agents` 0.20.0 (8 October 2026). — [developersdigest.tech (secondary)](https://www.developersdigest.tech/blog/openai-agents-sdk-whats-new-2026); [morphllm.com comparison (secondary)](https://www.morphllm.com/comparisons/claude-agent-sdk-vs-openai-agent-sdk)
- **Pydantic AI (Python):** Supports four durable-execution engines: Temporal, DBOS, Prefect and Restate. "a restarted run replays the completed ones from the journal and retries the one in flight". Each agent can use only one engine. — [Pydantic AI durable execution](https://pydantic.dev/docs/ai/integrations/durable_execution/overview/)
- **LangGraph and Mastra (secondary sources only):** LangGraph checkpoints at every "super-step" and supports human-in-the-loop interrupts; a 1.0 release is reported. Mastra is described as TypeScript primitives with a local "Studio". — [alexcloudstar.com comparison](https://www.alexcloudstar.com/blog/ai-agent-frameworks-comparison-2026); [Neon guide](https://neon.com/guides/best-agent-frameworks-2026)

### Inferences
- **Which keep state in Postgres that a plain Go worker could use:**
  - **Own job table or pgmq:** Postgres tables or an extension. A Go worker can reach them through Supabase's PostgREST/RPC over `net/http`, so no new Go module is needed.
  - **DBOS:** stores state in its own Postgres schema; it is a Go library.
  - **River:** stores jobs in Postgres tables; it is a Go library.
  - **Hatchet:** stores state in Postgres, but workers talk to the Hatchet engine rather than to Postgres directly.
  - **Workflow SDK Postgres world:** stores state in Postgres through Graphile Worker, but is TypeScript only.
  - **Temporal:** can use SQL persistence, but only through its own server.
- **Third-party modules:** DBOS, River, Hatchet, Temporal, Inngest and Restate all add third-party Go modules. Go's `database/sql` ships with no Postgres driver, so DBOS and River at least need pgx. Under SEFGH's rule ("only if the standard library cannot reasonably do the job"), the proposed own job table with leases, or pgmq over RPC, remains justified. DBOS is the strongest candidate if the owner later accepts one module, because it adds durable steps, queues, schedules and sleep without a server. That decision would need an ADR record.
- **Connection constraint:** River and DBOS use long-lived connections and LISTEN/NOTIFY. They would need Supabase's direct or session-mode connection, not the transaction pooler. Whether the free plan's direct connection is reachable over IPv4 from the owner's network or Cloud Run was not checked.
- **Hosted engines are free but add a vendor and a network dependency:** Hatchet (1M runs, MIT, can later be self-hosted on the small server), Inngest (50k executions) and Restate. They help "swappable by configuration" only if the worker hides them behind an interface. Temporal's free offer is credits only, so it does not meet the free-tier goal.
- **Keeping the analysers in Python:** Pydantic AI with DBOS (Python) offers durable agent runs backed by Postgres. That is a bridge option while the Go port proceeds, not a target.

### Gaps
- Restate's server licence and Cloud free tier were not confirmed from a primary source.
- Mastra, LangGraph Platform and Pydantic Logfire pricing were not researched; framework facts for Mastra and LangGraph are from secondary sources.
- The official LangGraph and Mastra durability documents were not fetched.
- The DBOS Go version number and its exact Postgres-driver dependency were not visible on the fetched page.

## (d) Making SEFGH usable by external AI agents (MCP, Go SDK, MCP Registry, A2A, llms.txt, AGENTS.md, OpenAPI)

### Takeaway
The highest-value step is a read-only remote MCP server, using the 2026-07-28 spec's stateless Streamable HTTP, with 3–6 coarse tools. Examples: `search_repositories`, `get_repository_digest`, `compare_repositories` and `find_similar_repositories`. The server should allow anonymous access within rate limits and be published to the MCP Registry. Alongside it:
- an OpenAPI document for the Go API (which eve and other frameworks can consume directly);
- an `llms.txt` file with Markdown versions of key pages;
- optionally, an A2A Agent Card later, if SEFGH runs its own analyst agent.

DeepWiki and Context7 show the pattern: two or three tools, a remote `/mcp` endpoint, and no auth or an optional key. The official Go MCP SDK (Apache-2.0/MIT, maintained with Google, v1.7.0+ supports 2026-07-28) would be a justified third-party module. Alternatively, the stateless 2026-07-28 spec makes a small standard-library JSON-RPC handler feasible, at the cost of tracking a fast-moving spec.

### Cited Findings
- **Current MCP spec:** "The **current** protocol version is **2026-07-28**." Versions are named by the date of their last backwards-incompatible change. — [MCP Versioning](https://modelcontextprotocol.io/specification/versioning)
- **Major changes in 2026-07-28:**
  - Protocol-level sessions and the `Mcp-Session-Id` header are removed.
  - The `initialize` handshake is removed, making MCP stateless: each request carries its version and client capabilities in `_meta`.
  - Servers must implement `server/discover`.
  - `subscriptions/listen` replaces the GET stream and resource subscriptions.
  - Tasks move into an official extension, `io.modelcontextprotocol/tasks`, with polling.
  - Multi Round-Trip Requests replace server-initiated sampling and elicitation.
  - `tools/list` should return tools in a deterministic order.
  - List results carry `ttlMs` and `cacheScope` (public or private).
  - Tool schemas may use any JSON Schema 2020-12 keyword.
  - Roots, Sampling and Logging are deprecated.
  - Dynamic Client Registration is deprecated in favour of Client ID Metadata Documents.
  - Source: [MCP 2026-07-28 changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- **Authorization:** "Authorization is **OPTIONAL** for MCP implementations." When an HTTP server does support it:
  - The server acts as an OAuth 2.1 resource server and must publish Protected Resource Metadata (RFC 9728).
  - Clients must send the RFC 8707 `resource` parameter.
  - Servers must check that tokens were issued for them and "MUST NOT accept or transit any other tokens".
  - Tokens must never be placed in query strings.
  - Scopes should be minimal, with step-up authorization through `WWW-Authenticate`.
  - Source: [MCP Authorization 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- **Official Go SDK:** github.com/modelcontextprotocol/go-sdk is "Maintained in collaboration with Google".
  - v1.7.0 and later support 2026-07-28 and every earlier version back to 2024-11-05.
  - The `auth` and `oauthex` packages provide OAuth support.
  - Licensed Apache-2.0 for new contributions, with existing code under MIT. About 5.3k stars.
  - Roots, sampling and logging remain supported for at least 12 months after deprecation.
  - Source: [GitHub modelcontextprotocol/go-sdk](https://github.com/modelcontextprotocol/go-sdk)
- **MCP Registry:** "currently in preview" ("Breaking changes or data resets may occur").
  - It is the official metadata registry for publicly accessible servers, backed by Anthropic, GitHub, PulseMCP and Microsoft.
  - Servers are described in a `server.json` file and named like `io.github.user/server-name` or `com.example/server`. Namespaces are verified through GitHub, DNS or an HTTP challenge.
  - Remote servers are supported; private servers are not. It is consumed mainly by aggregators.
  - Source: [MCP Registry: About](https://modelcontextprotocol.io/registry/about)
- **DeepWiki MCP:** "a free, remote, no-authentication-required service" at `https://mcp.deepwiki.com/mcp`, with three tools: `read_wiki_structure`, `read_wiki_contents` and `ask_question`. It covers public repositories only; private ones need a Devin account. — [DeepWiki MCP docs](https://docs.devin.ai/work-with-devin/deepwiki-mcp)
- **Context7 MCP:** A remote server at `https://mcp.context7.com/mcp` with two tools.
  - `resolve-library-id` takes `query` and `libraryName`.
  - `query-docs` takes `libraryId`, `query` and an optional `language`.
  - A free API key gives higher rate limits.
  - A "CLI + Skills" mode works without MCP.
  - Source: [GitHub upstash/context7](https://github.com/upstash/context7)
- **GitHub MCP server:**
  - Written in Go and hosted remotely at `https://api.githubcopilot.com/mcp/`.
  - Toolsets can be selected with `--toolsets` or `GITHUB_TOOLSETS`; the default is context, repos, issues, pull_requests and users. A `--read-only` mode skips write tools.
  - Authentication is OAuth or a personal access token.
  - Search tools include `search_issues` (natural-language query, owner/repo filters, up to 100 results per page) and `search_orgs`.
  - Source: [GitHub github/github-mcp-server](https://github.com/github/github-mcp-server)
- **A2A:**
  - Google donated A2A to the Linux Foundation on 23 June 2025. — [Google Open Source blog](https://opensource.googleblog.com/search/label/A2April?m=0)
  - More than 150 organisations supported it by 9 April 2026, with integration across Google, Microsoft and AWS. — [Linux Foundation press release](https://linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year)
  - A v1.0 with signed Agent Cards and JSON-RPC, gRPC and HTTP+JSON bindings is reported in 2026, but the date is unverified. — [tyk.io (secondary)](https://tyk.io/learning-center/a2a-protocol-architecture-and-technical-specification/)
  - SDKs reportedly exist for Python, Go, JavaScript, Java and .NET (secondary search summary).
- **llms.txt:** A proposal by Jeremy Howard (published 3 September 2024, modified 10 August 2026, v2), not a formal standard.
  - The H1 title is "the only required section", followed by a blockquote summary and H2 sections listing `[name](url)` links; an "Optional" H2 holds secondary links.
  - Sites should serve Markdown copies of pages at the same URL with `.md` added or substituted, linked with `rel="alternate" type="text/markdown"`.
  - Source: [llmstxt.org](https://llmstxt.org/)
  - Real examples: eve publishes `llms.txt` and `llms-full.txt` — [eve llms.txt](https://eve.dev/llms.txt); modelcontextprotocol.io links its llms.txt from every page — [MCP Versioning](https://modelcontextprotocol.io/specification/versioning).
- **AGENTS.md:** "a README for agents", "now stewarded by the Agentic AI Foundation under the Linux Foundation" and "used by over 60k open-source projects".
  - It is supported by Codex, Jules, Cursor, Gemini CLI, GitHub Copilot's coding agent, Devin, Windsurf, Zed, VS Code and others.
  - "The closest AGENTS.md to the edited file wins".
  - Source: [agents.md](https://agents.md/)
- **eve can consume SEFGH:** eve connections attach external MCP and OpenAPI servers "with credentials kept from the model". — [eve llms.txt](https://eve.dev/llms.txt)

### Inferences
- **Proposed SEFGH MCP server (read-only, anonymous, rate-limited):**
  - **Tools:**
    - `search_repositories(query, language?, topics?, min_stars?, updated_after?, sort?, limit≤25, cursor?)` returns compact results: full name, URL, description, stars, last push, a one-line digest and a SEFGH id.
    - `get_repository_digest(full_name)` returns the stored analysis (purpose, stack, quality signals, licence, `analysed_at`, analyser version and confidence).
    - `compare_repositories(full_names[2..5], aspects?)` returns a side-by-side table built from stored digests, without calling an LLM at request time.
    - `find_similar_repositories(full_name, limit)` uses the existing embeddings.
    - Optionally `list_trending(window, language?)`.
  - **Resources:** `sefgh://repo/{owner}/{name}` for digests.
  - **Design rules taken from the 2026-07-28 spec:**
    - Return tools in a deterministic order.
    - Set `ttlMs` with `cacheScope: "public"`.
    - Return `structuredContent` that matches an `outputSchema`.
    - Keep pagination handles server-minted.
  - **Why this shape:** Following DeepWiki and Context7, keep it to a few coarse tools with clear descriptions rather than mirroring every endpoint.
- **Hosting:** Because 2026-07-28 removed sessions and the handshake, the MCP endpoint can be one stateless POST handler: a Go route such as `/mcp` on the Go API, or a Vercel Function. No sticky sessions are needed, which suits serverless and swapping hosts.
- **Implementation choice:**
  - Option 1: the official Go SDK, recorded in the ADR as a third-party module. It is justified because the spec has changed three times in 2025–2026 and auth is non-trivial.
  - Option 2: a minimal standard-library JSON-RPC handler, for anonymous read-only tools only. Feasible after the stateless change, but it must track spec churn.
  - Either way, add contract fixtures for `server/discover`, `tools/list` and each tool.
- **Authorization:** Start anonymous with rate limits, as DeepWiki does, because the data is public. Add OAuth later only for user-specific tools such as saved searches. Never pass a user's token through to Supabase or GitHub, since the spec forbids token passthrough. Whether Supabase Auth can act as the OAuth 2.1 authorization server MCP requires was not checked.
- **Discoverability:**
  - Publish to the MCP Registry under a GitHub namespace (`io.github.<owner>/sefgh`) or a DNS-verified one.
  - Serve `/llms.txt` linking the API docs, the OpenAPI document, the MCP endpoint and the usage policy, with `.md` versions of repository pages.
  - Publish an OpenAPI 3.1 document for the Go API so eve, ADK and other frameworks can use it as tools.
  - AGENTS.md (already in the repo) serves coding agents working on SEFGH, not consumers of SEFGH.
  - A2A matters only if SEFGH runs its own conversational analyst agent; it is lower priority than MCP.

### Gaps
- The full GitHub MCP server tool list (`search_repositories` and `search_code` parameters) was cut off in the fetched page.
- No primary A2A v1.0 release note was found.
- Context7's free rate limits are not stated.
- The MCP Registry's general-availability timeline was not found.
- Whether tool annotations such as `readOnlyHint` are still in the 2026-07-28 schema was not checked.

## (e) Patterns for "agents that make decisions" safely in a data pipeline

### Takeaway
Let agents propose and let deterministic code apply. The building blocks are:
- durable approval gates (eve and AI SDK `needsApproval`; parked turns cost no compute);
- an approval queue or console;
- idempotent steps, because an interrupted step re-runs;
- hard budget caps (eve `limits.sessionUsage`, AI Gateway budgets, Hobby allowances that pause rather than bill);
- an append-only decision log in SEFGH's own Postgres, because Vercel keeps Hobby run history for only one day;
- evals before an agent is allowed to auto-apply anything.

### Cited Findings
- **Vercel's recommended pattern:**
  - Gate risky tools with `needsApproval`, which "suspends the agent until a user responds hours or days later".
  - Use `createHook` for typed approval events and `createWebhook` for external callbacks.
  - Build the approval queue and console as a Next.js app in the same project, or resume from Slack or Teams.
  - Each tool call is a durable step with three retries by default.
  - A suspended run "executes nothing and incurs no compute charges".
  - "Integrate at the boundary of the system that already owns the process."
  - Source: [Vercel KB: Durable agent approval workflows](https://vercel.com/kb/guide/agent-approval-workflow-stack-guide)
- **Audit:** Each tool call appears as a step with its inputs, outputs, retries and timing, and "Approvals are recorded as workflow events". Retention is 1 day on Hobby, so export history for longer audits. Retried steps should use stable keys derived from run and step IDs, not timestamps. — [Vercel KB: Durable agent approval workflows](https://vercel.com/kb/guide/agent-approval-workflow-stack-guide)
- **eve durability rules:** Completed steps are replayed, but interrupted steps re-run, so "non-idempotent side effects, such as charges or emails, need idempotency or approval gates". Turns waiting for approval park durably. — [eve Execution Model](https://eve.dev/docs/concepts/execution-model-and-durability)
- **eve scheduled runs:** A markdown schedule cannot wait for approval: "the session fails instead of waiting". Data that must persist should live outside session state. — [eve Schedules](https://eve.dev/docs/schedules.md)
- **eve cost limits:** v0.82.0 replaced the per-session token and cost caps with `limits.sessionUsage`. — [eve changelog](https://eve.dev/changelog.md)
- **eve multi-tenant patterns:** The docs include "Multi-Tenant Approvals", "Responsible Use" and "Security Model" pages. — [eve llms.txt](https://eve.dev/llms.txt)
- **AI Gateway budgets:** Budgets can cap spend per team, project, API key or member. — [Vercel AI Gateway Pricing](https://vercel.com/docs/ai-gateway/pricing)
- **Hobby overages pause instead of billing:** For example, Sandbox creation pauses and "You will not be charged" for extra usage. — [Vercel Sandbox pricing](https://vercel.com/docs/vercel-sandbox/pricing)
- **MCP least privilege:** Servers advertise minimal scopes and step up per operation. Tokens must be issued for this server; no passthrough. — [MCP Authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- **Durable agent runs replay completed steps:** This applies to model requests and tool calls when using Temporal, DBOS, Prefect or Restate through Pydantic AI. — [Pydantic AI durable execution](https://pydantic.dev/docs/ai/integrations/durable_execution/overview/)

### Inferences
- **A pattern for SEFGH's Analyze stage:**
  1. The agent writes a *proposal* row (job id, repository, field, old value, new value, rationale, model, prompt version, input hash, token cost, confidence) to an `agent_proposals` table.
  2. Deterministic Go code applies proposals automatically only when: confidence ≥ threshold, the field is on an allow-list (for example the digest summary or tags, never deletion or hiding a repository), and the daily budget is not exhausted.
  3. Everything else goes to a review queue in the existing Next.js admin, where the owner approves or rejects.
  4. Every apply or reject is appended to an `agent_decisions` audit table, never updated.
  5. Use idempotency keys of the form `(repo_id, stage, input_hash, analyser_version)`, so re-runs after a crash do not double-apply.
  6. Start each new agent in shadow mode (proposals only), and enable auto-apply only after an eval set of labelled repositories passes.
  7. Enforce per-run and per-day token and dollar caps in the worker itself, not only in the provider dashboard, so swapping providers keeps the caps.
- **Thresholds:** Confidence thresholds and review queues are standard practice, but no cited source gives a threshold value. Calibrate on SEFGH's own eval set rather than trusting the model's self-reported confidence.

### Gaps
- No primary source with quantitative guidance on confidence thresholds or calibration for LLM decisions in data pipelines was fetched.
- The content of eve's "Multi-Tenant Approvals" and "Security Model" pages was not read.
