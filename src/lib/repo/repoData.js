import { logError } from "@/lib/error-tracking";

/**
 * Fetch repository data from GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object|null>} Repository data or null if not found
 */
export async function fetchRepoFromGitHub(owner, repo) {
  try {
    // Build headers - GitHub token is optional for public repos
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "SEFGH-App",
    };

    // Add authorization if token exists (increases rate limit)
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      headers["Authorization"] = `Bearer ${githubToken}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers,
        next: { revalidate: 300 }, // Cache for 5 minutes
        cache: "force-cache", // Use cache when possible
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Repository not found: ${owner}/${repo}`);
        return null;
      }

      if (response.status === 401) {
        // Authentication failed - likely invalid token
        console.warn(
          "GitHub API authentication failed. Using unauthenticated requests (lower rate limit)"
        );
        // Try again without auth
        const retryResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}`,
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "SEFGH-App",
            },
            next: { revalidate: 300 },
            cache: "force-cache",
          }
        );

        if (retryResponse.ok) {
          return await retryResponse.json();
        }

        if (retryResponse.status === 404) {
          return null;
        }
      }

      if (response.status === 403) {
        // Rate limit exceeded
        console.error(
          "GitHub API rate limit exceeded. Consider adding a valid GITHUB_TOKEN."
        );
        logError("github_rate_limit", new Error("Rate limit exceeded"), {
          owner,
          repo,
        });
        return null;
      }

      // Log other errors but don't throw - still return null for graceful degradation
      const errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;
      console.warn(errorMessage, { owner, repo });
      logError("github_api_error", new Error(errorMessage), {
        owner,
        repo,
        status: response.status,
      });
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching repo data:", error);
    logError("repo_fetch_failed", error, { owner, repo });
    return null;
  }
}
