// P7-02: fixture integrity only; Go runs the complete endpoint cases.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
const contract = JSON.parse(await readFile(new URL('../../contracts/github-search/cases.json', import.meta.url), 'utf8'));

test("case ids are unique", () => {
  const ids = contract.cases.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});
test("version 4 sends the supported navbar filters (R-017)", () => {
  assert.equal(contract.contract_version, 5);
  for (const name of ["license", "created", "topic", "forks"]) {
    const sent = contract.cases.find((c) => c.expect_upstream_url && new URLSearchParams(c.request).get(name));
    assert.ok(sent, `no case sends ${name}`);
    assert.ok(decodeURIComponent(sent.expect_upstream_url).includes(` ${name}:`), `${sent.id}: ${name} is not in Go's query`);
  }
});

test("version 5 monthly/yearly windows use fixed UTC days (R-016)", () => {
  const periods = contract.cases.filter((c) => ["monthly", "yearly"].includes(new URLSearchParams(c.request).get("sort")));
  assert.equal(periods.length, 7);
  for (const c of periods) {
    const days = new URLSearchParams(c.request).get("sort") === "monthly" ? 30 : 365;
    const from = new Date(Date.parse(c.now) - days * 86400000).toISOString().replace(".000Z", "Z");
    assert.ok(decodeURIComponent(c.expect_upstream_url).includes(` created:>${from}`), c.id);
  }
  const byId = Object.fromEntries(periods.map((c) => [c.id, c]));
  assert.equal(byId["monthly-dst-offset"].expect_upstream_url, byId["monthly-same-instant-india"].expect_upstream_url);
});
