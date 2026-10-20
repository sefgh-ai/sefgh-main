// Small controllable hook boundary for exercising the real async hook.
// This is not a browser renderer; the separate browser probe checks React/UI.
const names = ['useState', 'useRef', 'useEffect', 'useCallback'];
export async function resolve(specifier, context, nextResolve) {
  let source;
  if (specifier === 'react') source = names.map(name => `export const ${name} = (...args) => globalThis.__trendingHooks.${name}(...args);`).join('\n');
  if (specifier === 'sonner') source = `export const toast = { success: (...args) => globalThis.__trendingToasts.push(['success', ...args]), error: (...args) => globalThis.__trendingToasts.push(['error', ...args]) };`;
  return source ? { url: 'data:text/javascript,' + encodeURIComponent(source), shortCircuit: true } : nextResolve(specifier, context);
}
