// Runs contracts/github-search/cases.json against the current Next.js
// handler. GitHub is replaced by a stub, so no network request is made.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import { after, before, test } from "node:test";

register("./route-loader.mjs", import.meta.url);

const contract = JSON.parse(
  await readFile(
    new URL("../../contracts/github-search/cases.json", import.meta.url),
    "utf8"
  )
);

const { GET } = await import(
  new URL("../../src/app/api/github/search/route.js", import.meta.url).href
);

const realFetch = globalThis.fetch;
const realConsoleError = console.error;
const realToken = process.env.GITHUB_TOKEN;

before(() => {
  // The handler logs every failure it converts to a 500.
  console.error = () => {};
});

after(() => {
  globalThis.fetch = realFetch;
  console.error = realConsoleError;
  if (realToken === undefined) {
    delete process.env.GITHUB_TOKEN;
  } else {
    process.env.GITHUB_TOKEN = realToken;
  }
});

function stubUpstream(upstream, calls) {
  globalThis.fetch = async (url, init) => {
    calls.push({ url, headers: init?.headers });
    if (!upstream) {
      throw new Error("upstream must not be called for this case");
    }
    if (upstream.network_error) {
      throw new TypeError("fetch failed");
    }
    const body =
      upstream.raw_body !== undefined
        ? upstream.raw_body
        : JSON.stringify(upstream.body);
    return new Response(body, {
      status: upstream.status,
      headers: upstream.headers,
    });
  };
}

test("case ids are unique", () => {
  const ids = contract.cases.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

for (const c of contract.cases) {
  test(`${c.id} [${c.disposition}]`, async () => {
    const upstream = c.upstream
      ? contract.upstream_responses[c.upstream]
      : null;
    const expected = contract.responses[c.expect];
    assert.ok(c.upstream === null || upstream, `unknown upstream ${c.upstream}`);
    assert.ok(expected, `unknown response ${c.expect}`);
    assert.ok(["preserve", "defect"].includes(c.disposition));

    if (c.github_token) {
      process.env.GITHUB_TOKEN = c.github_token;
    } else {
      delete process.env.GITHUB_TOKEN;
    }

    const calls = [];
    stubUpstream(upstream, calls);

    const response = await GET(
      new Request(`http://localhost/api/github/search?${c.request}`)
    );

    if (c.expect_upstream_url === null) {
      assert.equal(calls.length, 0, "upstream was called");
    } else {
      assert.equal(calls.length, 1, "expected exactly one upstream call");
      assert.equal(
        calls[0].url,
        contract.upstream_url_prefix + c.expect_upstream_url
      );
      assert.deepEqual(
        calls[0].headers,
        contract.upstream_request_headers[
          c.github_token ? "with_token" : "without_token"
        ]
      );
    }

    assert.equal(response.status, expected.status);
    assert.equal(response.headers.get("content-type"), "application/json");
    assert.equal(response.headers.get("cache-control"), null);
    assert.deepEqual(await response.json(), expected.body);
  });
}
