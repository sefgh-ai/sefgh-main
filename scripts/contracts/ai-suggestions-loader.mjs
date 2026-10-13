import { resolve as resolveRoute, load } from './route-loader.mjs';
export { load };
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/ai/github') {
    return {url:'data:text/javascript,'+encodeURIComponent(
      'export async function generateAIResponse(messages) { return globalThis.__suggestionAI(messages); }'
    ),shortCircuit:true};
  }
  return resolveRoute(specifier,context,nextResolve);
}
