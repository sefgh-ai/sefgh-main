import assert from 'node:assert/strict';
import { test } from 'node:test';
import { repositoryEntry, developerEntry, trendingEntries } from '../../src/lib/utils/trending/entries.js';

test('repository objects always supply renderable text, numbers and contributors', () => {
  const row = repositoryEntry({ id: 1, name: {}, author: [], description: {}, contributors: [null, { avatar: {} }],
    stars: { valueOf: {}, toString: {} }, language: { label: {} }, topic: {}, topicIcon: { label: {} }, languageColor: { color: {} } });
  assert.equal(row.name, 'Unnamed repository'); assert.equal(row.author, 'unknown');
  assert.equal(row.description, 'No description provided'); assert.equal(row.language, 'Unknown');
  assert.equal(row.stars, 0); assert.equal(row.languageColor, '#888888');
  assert.deepEqual(row.contributors, [{ avatar: '' }]);
  assert.equal(row.topic, ''); assert.equal(row.topicIcon, '');
  assert.deepEqual(repositoryEntry({ id: 2 }).contributors, []);
});

test('developer objects supply a safe popular repository and text children', () => {
  for (const popularRepo of [undefined, null, 42, [], { name: {}, description: {} }]) {
    const row = developerEntry({ id: 1, name: {}, username: [], avatar: {}, rank: {}, popularRepo });
    assert.equal(row.name, 'Unknown developer'); assert.equal(row.username, '');
    assert.equal(row.avatar, ''); assert.equal(row.rank, '');
    assert.deepEqual(row.popularRepo, { name: 'No repositories', description: 'No repository description available' });
  }
});

test('invalid list entries fail the main list instead of reaching the sorter/cards', () => {
  for (const kind of ['repositories', 'developers']) {
    for (const rows of [null, {}, [null], [42], [[]], ['bad']]) assert.equal(trendingEntries(rows, kind), null);
    assert.deepEqual(trendingEntries([], kind), []);
  }
});
