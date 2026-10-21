// Probe utility only: no application or browser-session state is exported.
import { setTimeout as sleep } from 'node:timers/promises';

export async function prepareKeyProbeZoom(evaluate, destination, { timeoutMs = 12000, pollMs = 80 } = {}) {
  const end = performance.now() + timeoutMs;
  // Check and mutate in one evaluation: no gap where navigation can replace
  // the checked document. The old about:blank document must never be zoomed.
  const expression = `Boolean(document.body && document.documentElement &&
    location.href === ${JSON.stringify(destination)} && window.__keysProbe &&
    (document.documentElement.style.zoom = '2') === '2')`;
  while (performance.now() < end) {
    if (await evaluate(expression)) return;
    const remaining = end - performance.now();
    if (remaining > 0) await sleep(Math.min(pollMs, remaining));
  }
  throw Error('Key probe destination document was not ready for zoom');
}
