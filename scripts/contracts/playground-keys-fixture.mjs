// Synthetic entropy only. Runs the unchanged Next handler and real Supabase SDK.
import { runRouteFixture } from './route-db-fixture.mjs';

export async function runKeyFixture(handlers, fixture) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const original = globalThis.crypto;
  let calls = 0;
  const crypto = new Proxy(original, {
    get(target, name) {
      if (name === 'getRandomValues') return (bytes) => {
        calls++;
        if (fixture.entropy_failure_at?.includes(calls)) throw new Error('synthetic entropy failure');
        for (let i = 0; i < bytes.length; i++) bytes[i] = ((calls - 1) * 32 + i) % 256;
        return bytes;
      };
      const value = Reflect.get(target, name, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  Object.defineProperty(globalThis, 'crypto', { value: crypto, configurable: true });
  try {
    return { ...await runRouteFixture(handlers, '/api/playground/keys', fixture), entropy_calls: calls };
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
    else delete globalThis.crypto;
  }
}
