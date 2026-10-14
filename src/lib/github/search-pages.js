// GitHub's repository search serves a page only when its first result is
// among the first 1,000, however many results it counts (checked
// 2026-10-14: at 30 a page, page 34 answers and page 35 is refused). Paging
// stops at that page (bug register R-018).
export const GITHUB_SEARCH_RESULT_LIMIT = 1000;

/** The last page that can be loaded, or 0 when there is nothing to page. */
export function lastSearchPage(totalCount, perPage) {
  if (!(totalCount > 0) || !(perPage > 0)) return 0;
  return Math.min(Math.ceil(totalCount / perPage), Math.ceil(GITHUB_SEARCH_RESULT_LIMIT / perPage));
}
