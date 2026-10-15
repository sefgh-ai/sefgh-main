// The profiles columns a browser may read: every column except email
// (SEC-001, bug register R-070). The database grants SELECT on exactly these,
// so a query for `*` or for email is refused. A user's own address comes from
// Supabase Auth (`user.email`).
//
// The grant is in supabase/migrations/20261015140000_sec_001_close_data_exposures.sql.
// scripts/contracts/profile-columns.test.mjs fails if the two lists differ, or
// if code asks profiles for a column outside this list.
export const PROFILE_COLUMNS = "id, full_name, avatar_url, bio, website, created_at, updated_at";
