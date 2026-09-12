/**
 * GitHub API helper functions for fetching repository data
 */

/**
 * Validates if a URL is a valid GitHub repository URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid GitHub repo URL
 */
export function isValidGitHubUrl(url) {
  if (!url) return false;
  
  // Must start with https://github.com/
  if (!url.startsWith('https://github.com/')) return false;
  
  // Match pattern: https://github.com/owner/repo
  const pattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?$/;
  return pattern.test(url.trim());
}

/**
 * Extracts owner and repo name from GitHub URL
 * @param {string} url - GitHub repository URL
 * @returns {{owner: string, repo: string} | null}
 */
export function parseGitHubUrl(url) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/?$/);
  if (!match) return null;
  
  return {
    owner: match[1],
    repo: match[2]
  };
}

/**
 * Fetches repository data from GitHub API
 * @param {string} url - GitHub repository URL
 * @returns {Promise<object>} Repository data including tags
 */
export async function fetchGitHubRepoData(url) {
  const parsed = parseGitHubUrl(url);
  
  if (!parsed) {
    throw new Error('Invalid GitHub URL');
  }
  
  const { owner, repo } = parsed;
  
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    // Fetch repo data from GitHub API; prefer server-side token, never expose public tokens to the client bundle
    const authHeader = process.env.GITHUB_TOKEN
      ? { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` }
      : {};

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...authHeader
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Repository not found');
      }
      if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }
      throw new Error('Failed to fetch repository data');
    }
    
    const data = await response.json();
    
    // Extract tags from language and topics
    const tags = [
      data.language,
      ...(data.topics || [])
    ].filter(Boolean);
    
    return {
      name: data.name,
      fullName: data.full_name,
      description: data.description || '',
      stars: data.stargazers_count,
      forks: data.forks_count,
      language: data.language,
      topics: data.topics || [],
      tags: tags,
      htmlUrl: data.html_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('GitHub API error:', error);
    throw error;
  }
}
