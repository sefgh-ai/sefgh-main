// The trending measure, contract version 2 (bug register R-020, the owner's
// choice of 2026-10-14). It replaced a random "starsToday". The trending API
// route and the trending page both use it; the Go backend computes the same
// in backend/internal/githubtrending, and contracts/github-trending pins both.

const DAY_MS = 24 * 60 * 60 * 1000;
const CREATED_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

/**
 * Stars per day since the repository was created, rounded down, counting at
 * least one day. For the trending search, which asks only for repositories
 * created inside the chosen period, every star was earned in that period.
 * For an older repository it is the average over its whole life.
 * Null when there is no usable star count or creation time; only the form
 * GitHub sends, such as "2026-10-12T08:00:00Z", is read.
 * @param {*} stars - stargazers_count
 * @param {*} createdAt - created_at
 * @param {number} now - the current time in milliseconds
 * @returns {number|null}
 */
export function starsPerDay(stars, createdAt, now = Date.now()) {
  if (typeof stars !== "number" || !Number.isFinite(stars)) return null;
  if (typeof createdAt !== "string" || !CREATED_AT.test(createdAt)) return null;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return null;
  const days = Math.max(1, (now - created) / DAY_MS);
  return Math.floor(stars / days);
}

/** 3 from 100 stars a day, 2 from 25, otherwise 1 (including unknown). */
export function heatLevel(perDay) {
  if (perDay === null || perDay === undefined) return 1;
  return perDay >= 100 ? 3 : perDay >= 25 ? 2 : 1;
}
