# Database changes

Changes to the Supabase database User-DB, kept in the repository so they can be reviewed before they run. What the live database holds today is recorded in `../docs/database/user-db.md`.

- `migrations/`: changes in the order they run, named the way the Supabase CLI expects. Most of the existing schema was made in the dashboard and is not here.
- `checks/`: for each migration, a read-only query that confirms it is in effect, and the statements that undo it. Also read-only catalog queries that gather evidence before a change is written (`keys_001_catalog.sql`, `avatar_storage_catalog.sql`).

Nothing here runs by itself. A migration changes the production database, so it runs only after the owner approves it, and only after any app change it depends on is live. Record each run, and the verify query's result, in `../docs/coordination.md`.
