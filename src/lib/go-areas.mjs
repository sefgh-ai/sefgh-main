// The areas of the browser's own database calls that Go can serve, and the
// setting that switches them on (docs/plans/browser-data.md). The browser
// (src/lib/supabase/data-routing.js, src/lib/go-data.js) and next.config.mjs
// both read this file, so a listed area is routed and rewritten alike.
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

/** Whether an area is switched to Go by NEXT_PUBLIC_SEFGH_GO_DATA. */
export function usesGo(area, setting = process.env.NEXT_PUBLIC_SEFGH_GO_DATA) {
  return String(setting ?? '').split(',').map((name) => name.trim()).includes(area);
}

/** The proxy area that serves a table or function, or null. */
export function proxyArea(target) {
  for (const [area, targets] of Object.entries(PROXY_AREAS)) {
    if (targets.includes(target)) return area;
  }
  return null;
}
