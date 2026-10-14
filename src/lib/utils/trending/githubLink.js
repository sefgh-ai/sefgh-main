// The repository's page on GitHub, where the trending card's Star button
// goes (bug register R-060). GitHub's own html_url is used when it is a
// GitHub address; otherwise the address is built from owner and name.
// Anything else gives null, and the card shows no button: curated rows come
// from the database, and an unchecked address could be a javascript: link.
export function githubRepoUrl(repo) {
  if (typeof repo?.url === "string" && repo.url.startsWith("https://github.com/")) return repo.url;
  if (!repo?.author || !repo?.name || repo.author === "unknown") return null;
  return `https://github.com/${encodeURIComponent(repo.author)}/${encodeURIComponent(repo.name)}`;
}
