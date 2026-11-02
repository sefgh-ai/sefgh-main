# Hosting the Go backend on Vercel (free)

P7-09a (2026-11-03): the trending-topics and playground-keys-v1 names are
removed from SEFGH_GO_ROUTES selection. `/api/trending/topics` always forwards
when SEFGH_GO_API_URL is configured. V1 `/api/v1/keys`, its selector child,
and `/api/v1/search` forward with the Go origin and exact
NEXT_PUBLIC_SEFGH_KEYS_V1=1, independent of route names. That UI flag is retained;
Go SEFGH_KEYS_V1, accountant credentials and approved-policy checks are unchanged.
The legacy `/api/playground/keys` handler remains; no keys activation, signing,
SQL or hosted acceptance is performed. Only the3AI names still use
SEFGH_GO_ROUTES; their handlers/switches stay until P7-07/R-038/R-213.
Without the origin there are no Go rewrites. Without the UI flag, v1 is not
forwarded. A disabled Go v1 runtime still returns404/no-store; missing runtime
configuration/policy fails closed503. This is limited P7-09a, not full P7-09
or Phase7 completion. Rollback: revert this step and redeploy the website.
[Read-only production preflight](verification/p7-09a-routing-2026-11-03.json)
observed topics200/Go, website v1 paths404 without the Go marker, direct Go
v1 paths404/no-store. No deployment or hosted mutation is implied.


> **On hold (OPS-003, 2026-10-14).** Your live Vercel project, `sefgh-ui` in the "sefgh" account, builds the old repository `sefgh-ai/sefgh-nextjs`, not `Adeel0-0/sefgh-nextjs-main`, where this work is. Part C below assumes the website project builds this repository. Settle that first; see the OPS-003 handoff in `coordination.md`. Once it is settled, create the Go project in the same Vercel account as `sefgh-ui`, and import the repository that holds this code.

For the owner. This sets up option A of the hosting proposal in `adr/0002-go-backend.md`: a second Vercel project that runs only the Go server in `backend/`, next to the Next.js project you already have. Written 2026-10-14 (task OPS-002) from Vercel's documentation as read that day. Nobody has tried these steps on your account yet, so screens may be worded a little differently.

When you finish, the website's **preview** sends one route, the languages list, to Go. The live site does not change. Every route stays in Next.js until you and an agent switch it on, one at a time.

## What it costs

Nothing, on Vercel's free Hobby plan. The Go runtime is marked Beta and is available on every plan. Each month Hobby includes 1,000,000 function calls, 100 GB of data transfer and 4 hours of active CPU. If a limit is reached, Vercel pauses that feature until the 30 days are up. It does not charge you.

One condition: Vercel's terms say Hobby is "restricted to non-commercial personal use only". Commercial use includes earning money from the site, ads, or paying anyone to build it. Donations do not count. This already applies to your Next.js project; a second project does not change it. When SEFGH starts earning or paying people, both projects need the Pro plan ($20 a month per member). Read Vercel's fair use guidelines and decide.

## Before you start

- You can sign in to Vercel and see your Next.js project.
- That project is connected to the GitHub repository `Adeel0-0/sefgh-nextjs-main`.
- Never paste a password, key or token into a chat with an agent. Type them only into Vercel's own pages.

## Part A: create the Go project

1. In the Vercel dashboard, click **Add New...** and then **Project**.
2. Under **Import Git Repository**, choose `sefgh-nextjs-main`, the same repository as the website, and click **Import**.
3. On the configuration screen:
   - **Project Name:** `sefgh-api`. Its free address becomes `https://sefgh-api.vercel.app`. If that name is taken, Vercel suggests another; write down whichever you get.
   - **Root Directory:** click **Edit** and choose the `backend` folder. This step matters most: it tells Vercel this project is only the Go server.
   - **Framework Preset:** **Go**. The repository also says so in `backend/vercel.json`, so Vercel may pick it for you.
   - **Build and Output Settings:** leave them alone.
   - **Environment Variables:** add none yet.
4. Click **Deploy** and wait for the build, which takes about a minute.
   - If it fails, open the build log and copy the red error lines into the chat. Build logs hold no passwords. One possible failure is a Go version Vercel does not support yet; the repository asks for Go 1.27.2.
5. When it says the deployment is ready, open **Settings**, then **Domains**, and write down the address that ends in `.vercel.app`. This is the project's **production address**. The rest of this guide calls it `https://sefgh-api.vercel.app`.

## Part B: check it and keep it reachable

6. Open **Settings**, then **Deployment Protection**. Leave **Vercel Authentication** on its standard setting.
   - The standard setting puts a sign-in wall in front of preview links, but not in front of the production address. The website needs to reach the production address, so do not switch on protection for "All Deployments".
   - Right now the production address only serves routes that need nothing secret. Part D adds settings one at a time.
7. Check the server from the VS Code terminal, in the repository folder:

   ```text
   node scripts/check-go-deployment.mjs https://sefgh-api.vercel.app
   ```

   It should end with `All 7 checks passed`. Or send the address to an agent and it will run the check. The address is public, so sharing it is safe.

8. *Optional, saves build time.* Under **Settings**, then **Build and Deployment**, find **Ignored Build Step**. Choose to run a custom command and enter:

   ```text
   git diff HEAD^ HEAD --quiet -- .
   ```

   Vercel then rebuilds the Go project only when something in `backend/` changed.

## Part C: send one route from the website preview to Go

The website already has a switch for this, and it is off. Two settings turn it on, and only for previews.

9. Open your **Next.js** project, not `sefgh-api`. Go to **Settings**, then **Environment Variables**, and add two variables. For each one tick **Preview** only, never Production:

   | Name | Value |
   |---|---|
   | `SEFGH_GO_API_URL` | `https://sefgh-api.vercel.app` (your address from step 5, no slash at the end) |
   | `SEFGH_GO_ROUTES` | `github-languages` |

10. Settings take effect only on the next deployment, so build a new preview:
    - Open **Deployments** and find the newest deployment of the branch `go-backend`. This branch always matches `main`.
    - Click the **...** menu, then **Redeploy**.
    - If there is no `go-backend` deployment, ask an agent to have the Git Agent push that branch. Its next push makes one.
11. Check that the route reached Go:
    - Open the new preview in your browser. You are signed in to Vercel, so its sign-in wall lets you through.
    - Add `/api/github/languages` to the end of the address.
    - Open the developer tools (F12), then **Network**. Reload, click the request, and look under **Response Headers** for `x-sefgh-backend: go`. If it is there, Go answered. Every other route on the preview is still Next.js.
12. Tell an agent it worked. The next steps are to measure speed and practise switching back (ADR "Hosting proposal", steps 3 to 5).

## Switching a route back

Remove the route's name from `SEFGH_GO_ROUTES`, or delete the variable, then redeploy the preview as in step 10. The website then answers that route itself again. Nothing in the Go project needs to change.

## Part D: later, only when an agent asks

Do these one at a time. Each one waits for the route that needs it.

- **Supabase's public settings** for the routes that need a signed-in user: chat and activity.
  - Add them to `sefgh-api` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, with the same values as in the website project. These two are public by design: browsers receive them.
  - Never add `SUPABASE_SERVICE_ROLE_KEY` or a database password to the Go project. The Go code is built never to need them.
- **`GITHUB_PUBLIC_READ_TOKEN`**, once you have created that token: a classic personal access token with **no scopes**. The Go server refuses any other kind.
- **AI keys** (`GITHUB_TOKEN` for GitHub Models, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`): only when the AI routes move, after a decision first. On Vercel several copies of the server can run at once, and each counts requests on its own, so the per-user limits would be looser than they look.
- **The live site:** setting `SEFGH_GO_API_URL` and `SEFGH_GO_ROUTES` for **Production** switches routes for real visitors. That happens only after the preview checks and measurements, with your approval, one route at a time.

## Route names for `SEFGH_GO_ROUTES`

Separate several names with commas. Any name left out stays in Next.js.

`github-languages`, `github-search`, `github-trending`, `github-trending-developers`, `github-contributions`, `github-repo`, `github-repo-details`, `github-contents`, `ai-suggestions`, `ai-enhance-query`, `ai-chat`, `activity`, `repo-starred`, `share-token`, `repo-collect`, `repo-vote`, `repo-rating`, `comment-vote`, `repo-comments`, `repo-videos`, `conversation-share`, `share-fork`, `upload-avatar`, `trending-topics`.

The browser's own database calls had a second setting, `NEXT_PUBLIC_SEFGH_GO_DATA`; since P7-08b nothing reads it, and it can be deleted from `sefgh-main`. For both, the order to switch things in, what to check, and what behaves differently are in `cutover.md`.

Before switching on `activity`, the database check of Phase 3 must be done (see "Connecting Supabase" in `coordination.md`).
