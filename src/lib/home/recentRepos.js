// Repositories this browser opened, newest first (HOME-001). SEFGH has no
// server-side record of repository visits, so the owner chose to keep this
// list in the browser only: it is per device and is lost with site data.
// It drives Home's "Continue where you left off" and decides whether a user
// counts as returning (any opened repository) or new.

const KEY = "sefgh.recentRepos";
const MAX = 10;

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((r) => r && typeof r.name === "string") : [];
  } catch {
    return [];
  }
}

/** The stored list: [{ name: "owner/repo", description, language, at }] */
export function getRecentRepos() {
  if (typeof window === "undefined") return [];
  return read();
}

/** Put a repository at the front of the list (deduplicated, capped at MAX). */
export function recordRepoVisit({ name, description = null, language = null }) {
  if (typeof window === "undefined" || !name) return;
  const next = [
    { name, description, language, at: new Date().toISOString() },
    ...read().filter((r) => r.name.toLowerCase() !== name.toLowerCase()),
  ].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage blocked: Home simply treats the user as new.
  }
}
