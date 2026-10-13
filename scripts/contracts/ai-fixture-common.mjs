// Shared by the three AI contract harnesses.

// Fixed moment for every AI fixture, so an allowance and its Retry-After do
// not depend on when the test runs.
export const FIXTURE_NOW = Date.parse('2026-10-13T12:00:00Z');
export const FIXTURE_SUPABASE_URL = 'https://contract-auth.invalid';
export const FIXTURE_SUPABASE_KEY = 'public-fixture-key';

// A fixture may write long text as { "$repeat": ["ab", 4000] } in place of
// the string itself. expand() turns every such object into the string, in
// request bodies and in expected provider requests alike.
export function expand(value) {
  if (Array.isArray(value)) return value.map(expand);
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === '$repeat') return String(value.$repeat[0]).repeat(value.$repeat[1]);
    return Object.fromEntries(keys.map((key) => [key, expand(value[key])]));
  }
  return value;
}

// Puts a limiter in the state a fixture describes: `earlier_requests` requests
// from the same caller, `earlier_age_seconds` before the fixed moment.
export function arrangeLimiter(limiter, key, fixture) {
  limiter.reset();
  const when = FIXTURE_NOW - (fixture.earlier_age_seconds ?? 0) * 1000;
  for (let i = 0; i < (fixture.earlier_requests ?? 0); i++) limiter.take(fixture.earlier_key ?? key, when);
}

// Freezes Date.now at the fixed moment and returns a function that undoes it.
export function freezeClock() {
  const original = Date.now;
  Date.now = () => FIXTURE_NOW;
  return () => { Date.now = original; };
}

// A POST request for a fixture. `json_error` makes reading the body fail with
// a controlled message, which avoids pinning one JavaScript engine's wording.
export function fixtureRequest(url, fixture, headers = {}) {
  const all = { 'content-type': 'application/json', ...headers };
  if (fixture.address) all['x-forwarded-for'] = fixture.address;
  const request = new Request(url, { method: 'POST', headers: all, body: JSON.stringify(expand(fixture.body) ?? null) });
  if (fixture.json_error) request.json = async () => { throw new Error(fixture.json_error); };
  return request;
}
