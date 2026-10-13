export async function runSuggestionsFixture(POST, fixture) {
  const originalAI=globalThis.__suggestionAI;
  const originalError=console.error;
  const calls=[];
  try {
    console.error=()=>{};
    globalThis.__suggestionAI=async(messages)=>{
      calls.push(messages);
      if(fixture.ai_error) throw new Error(fixture.ai_error);
      return fixture.ai_response;
    };
    const request=fixture.json_error ? {json:async()=>{throw new Error(fixture.json_error);}} :
      new Request('https://app.test/api/ai/suggestions',{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(fixture.body),
      });
    const response=await POST(request);
    return {status:response.status,body:await response.json(),calls,
      content_type:response.headers.get('content-type'),cache_control:response.headers.get('cache-control')};
  } finally {
    console.error=originalError;
    if(originalAI===undefined) delete globalThis.__suggestionAI; else globalThis.__suggestionAI=originalAI;
  }
}
