// The areas of the browser's own database calls that the Go data proxy
// serves (docs/plans/browser-data.md). The Supabase clients' routing
// (src/lib/supabase/data-routing.js) and next.config.mjs both read this
// file, so a listed area is routed and rewritten alike. Since P7-08b every
// area is always on; there is no switch.
//
// PROXY_AREAS are served by the Go data proxy (DATA-PROXY-001), table by
// table: each area lists its tables and functions ("rpc/name"). They must
// match backend/internal/dataproxy/policy.json, which also says what each
// may do; scripts/contracts/data-proxy.test.mjs checks that they do. Search
// history and onboarding have endpoints of their own (DATA-001b, DATA-002).

export const PROXY_AREAS = {
  notifications: ['notifications'],
  profile: ['profiles'],
  'user-stats': ['user_stats'],
  home: ['projects', 'categories'],
  submissions: ['repo_submissions'],
  'search-stats': ['platform_stats'],
  conversations: ['user_conversations'],
  'repo-page': ['repo_votes', 'repo_ratings', 'repo_comments', 'repo_collections'],
  activity: ['rpc/log_user_activity'],
};

/** The proxy area that serves a table or function, or null. */
export function proxyArea(target) {
  for (const [area, targets] of Object.entries(PROXY_AREAS)) {
    if (targets.includes(target)) return area;
  }
  return null;
}
