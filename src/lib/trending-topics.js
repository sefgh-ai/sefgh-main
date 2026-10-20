// The trending page's topic sections (TREND-001b). They come from
// GET /api/trending/topics, which Go answers with GitHub searches cached by
// the CDN (R-077, option A). They used to be read from the trending_repos
// table, which nothing could fill.
//
// With the route's switch off there is no handler, and the answer is a 404.
// Any failure means no topic sections; the page still shows the main list.
import { repositoryEntry } from './utils/trending/entries.js';

/**
 * The topic repositories, flattened in the answer's order with each
 * repository once, and when they were searched.
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ repos: object[], generatedAt: Date | null }>}
 */
export async function fetchTrendingTopics(fetchImpl = fetch, { signal } = {}) {
  const none = { repos: [], generatedAt: null };
  try {
    const response = await fetchImpl('/api/trending/topics', { signal });
    if (!response.ok) return none;
    const answer = await response.json();
    const topics = Array.isArray(answer?.topics) ? answer.topics : [];
    const repos = uniqueById(topics.flatMap((topic) => (Array.isArray(topic?.repos) ? topic.repos : [])).map(repositoryEntry));
    const generatedAt = new Date(typeof answer?.generatedAt === 'string' ? answer.generatedAt : NaN);
    return { repos, generatedAt: Number.isNaN(generatedAt.getTime()) ? null : generatedAt };
  } catch {
    return none;
  }
}

/**
 * The topic repositories followed by the main trending list, each repository
 * once: a repository in both keeps its topic badge.
 * @param {object[]} topicRepos
 * @param {object[]} repositories
 */
export function mergeTrending(topicRepos, repositories) {
  return uniqueById([...topicRepos, ...repositories]);
}

// Keeps the first item with each id. Items without an id are all kept.
function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    if (item?.id === undefined || item?.id === null) return true;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
