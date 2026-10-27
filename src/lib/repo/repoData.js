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
 * The repository page's read (REPO-PAGE-001). With "github-public-repo" in
 * SEFGH_GO_ROUTES and SEFGH_GO_API_URL set, the Go server makes it
 * (backend/internal/publicrepo, which passes the same contract); otherwise
 * fetchRepoFromGitHub does. The page reads on the server, so no rewrite is
 * involved: removing the name and redeploying is the rollback.
 */
export async function fetchRepoForPage(owner, repo) {
  const origin = (process.env.SEFGH_GO_API_URL || '').replace(/\/+$/, '');
  const switched = (process.env.SEFGH_GO_ROUTES || '').split(',').map((name) => name.trim()).includes('github-public-repo');
  if (!origin || !switched) return fetchRepoFromGitHub(owner, repo);
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
