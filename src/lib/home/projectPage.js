// The first page of a Home project tab replaces whatever the previous tab
// showed, including when the new tab has no rows. Keeping the old rows on an
// empty answer left "This month" listing year-old projects (bug register
// R-231).

/** State for a tab's first page: `{ projects, offset, hasMore }`. */
export function firstProjectPage(data, pageSize) {
  const projects = Array.isArray(data) ? data : [];
  return { projects, offset: projects.length, hasMore: projects.length >= pageSize };
}
