// Route fixtures supply a per-user GitHub token. The shared github-access
// contract tests issuer verification separately; these stubs bind that token
// to session-a, never to the server environment's GITHUB_TOKEN.
export function fixtureRequest(url, token) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://contract-auth.invalid';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-fixture-key';
  const resourceFetch = globalThis.fetch;
  globalThis.fetch = async (target, init) => {
    if (target === 'https://contract-auth.invalid/auth/v1/user') {
      if (init.headers.Authorization !== 'Bearer session-a') return new Response(null, {status:401});
      return Response.json({id:'a', identities:[{provider:'github',id:'101'}]});
    }
    if (target === 'https://api.github.com/user') {
      if (!token || init.headers.Authorization !== `Bearer ${token}`) return new Response(null, {status:401});
      return Response.json({id:101});
    }
    return resourceFetch(target, init);
  };
  return new Request(url, {headers: token ? {Authorization:'Bearer session-a', 'X-GitHub-Token':token} : {}});
}
