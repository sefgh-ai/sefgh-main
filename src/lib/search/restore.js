// What Search does when it mounts, decided once. Restoring the cache and
// searching the URL query used to be two effects in the same commit: the
// search still saw the default filters, so a restored "TypeScript" chip sat
// over unfiltered results (bug register R-230).

/**
 * "restore" when the cache answers the URL query (or there is none),
 * "search" when the URL has a query the cache does not answer, else "none".
 */
export function mountSearchAction(cached, initialQuery) {
  const query = initialQuery || "";
  const usable = Array.isArray(cached?.results) && cached.results.length > 0;
  if (usable && (!query || query === cached.query)) return "restore";
  return query ? "search" : "none";
}
