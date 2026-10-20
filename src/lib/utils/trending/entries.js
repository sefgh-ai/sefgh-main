// Browser rendering boundary; API contracts stay unchanged. A malformed
// child must not be passed to React, or used as an array by a card.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, fallback = '') => typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)) ? value : fallback;
const number = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export function repositoryEntry(row) {
  if (!object(row)) return null;
  return {
    ...row,
    author: text(row.author, 'unknown'),
    name: text(row.name, 'Unnamed repository'),
    description: text(row.description, 'No description provided'),
    topic: text(row.topic),
    topicIcon: text(row.topicIcon, text(row.topicIcon?.label)),
    language: text(row.language, text(row.language?.label, 'Unknown')),
    languageColor: typeof row.languageColor === 'string' ? row.languageColor : typeof row.languageColor?.color === 'string' ? row.languageColor.color : '#888888',
    stars: number(row.stars),
    forks: number(row.forks),
    views: number(row.views),
    discussions: number(row.discussions),
    heatLevel: number(row.heatLevel, 1),
    starsPerDay: number(row.starsPerDay, null),
    contributors: Array.isArray(row.contributors) ? row.contributors.filter(object).map(contributor => ({ ...contributor, avatar: text(contributor.avatar) })) : [],
  };
}

export function developerEntry(row) {
  if (!object(row)) return null;
  return {
    ...row,
    rank: text(row.rank),
    name: text(row.name, 'Unknown developer'),
    username: text(row.username),
    avatar: text(row.avatar),
    popularRepo: {
      name: text(row.popularRepo?.name, 'No repositories'),
      description: text(row.popularRepo?.description, 'No repository description available'),
    },
  };
}

export function trendingEntries(rows, kind) {
  if (!Array.isArray(rows)) return null;
  const mapped = rows.map(kind === 'repositories' ? repositoryEntry : developerEntry);
  return mapped.some(row => row === null) ? null : mapped;
}
