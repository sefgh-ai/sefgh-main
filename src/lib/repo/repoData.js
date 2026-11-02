import { isValidOwner, isValidRepoName } from '@/lib/github/repo-identifiers';
import { publicGitHubFetch } from '@/lib/github/public-token';

// The repository, only when the reply says, with an explicit false, that it
// is not private.
async function publicOnly(response) {
  if (!response.ok) return null;
  const data = await response.json();
  return data?.private === false ? data : null;
}

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
    return await publicOnly(response);
  } catch {
    // A private, unavailable or renamed repository is not public enrichment.
    // Do not log upstream payloads or retry using a more privileged credential.
    return null;
  }
}

/**
 * P7-02: the repository page always reads through Go. Without the Go origin,
 * or when Go cannot return public metadata, the page follows its not-found path.
 * fetchRepoFromGitHub remains only for the Next starred route until P7-04.
 */
export async function fetchRepoForPage(owner, repo) {
  const origin = (process.env.SEFGH_GO_API_URL || '').replace(/\/+$/, '');
  if (!origin) return null;
  if (!isValidOwner(owner) || !isValidRepoName(repo)) return null;
  try {
    const response = await fetch(`${origin}/api/github/public-repo/${owner}/${repo}`, {
      cache: 'no-store',
      redirect: 'error',
      // Go bounds its own GitHub read to 10 seconds.
      signal: AbortSignal.timeout(12_000),
    });
    return await publicOnly(response);
  } catch {
    return null;
  }
}
