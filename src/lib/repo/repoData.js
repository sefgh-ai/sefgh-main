import { isValidOwner, isValidRepoName } from '@/lib/github/repo-identifiers';
import { publicGitHubFetch } from '@/lib/github/public-token';

/**
 * Public metadata only. The page and collection UI do not yet carry verified
 * per-user GitHub credentials. Never borrow the server token's permissions.
 * Recheck visibility on each read; do not serve old private-capable cache data.
 */
export async function fetchRepoFromGitHub(owner, repo) {
  if (!isValidOwner(owner) || !isValidRepoName(repo)) return null;
  try {
    const response = await publicGitHubFetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'SEFGH-App',
        },
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data?.private === false ? data : null;
  } catch {
    // A private, unavailable or renamed repository is not public enrichment.
    // Do not log upstream payloads or retry using a more privileged credential.
    return null;
  }
}
