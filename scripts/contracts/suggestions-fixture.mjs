// Runs the unchanged suggestions handler with the AI helper replaced by a
// controlled reply (see ai-suggestions-loader.mjs). The clock and
// console.error are replaced too, and restored. No provider is contacted.
import { arrangeLimiter, fixtureRequest, freezeClock } from './ai-fixture-common.mjs';

export async function runSuggestionsFixture(POST, fixture) {
  const { searchLimiter } = await import('../../src/lib/ai/guard.js');
  const originalAI=globalThis.__suggestionAI;
  const originalError=console.error;
  const unfreeze=freezeClock();
  const calls=[];
  try {
    arrangeLimiter(searchLimiter, fixture.address ?? 'unknown', fixture);
    console.error=()=>{};
    globalThis.__suggestionAI=async(messages)=>{
      calls.push(messages);
      if(fixture.ai_error) throw new Error(fixture.ai_error);
      return fixture.ai_response;
    };
    const response=await POST(fixtureRequest('https://app.test/api/ai/suggestions',fixture));
    return {status:response.status,body:await response.json(),calls,
      content_type:response.headers.get('content-type'),cache_control:response.headers.get('cache-control')};
  } finally {
    unfreeze();
    searchLimiter.reset();
    console.error=originalError;
    if(originalAI===undefined) delete globalThis.__suggestionAI; else globalThis.__suggestionAI=originalAI;
  }
}
