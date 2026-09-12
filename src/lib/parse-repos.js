/**
 * Parse repository suggestions from AI response
 * Supports both JSON format and GitHub URL detection
 */

/**
 * Extract repos from JSON code blocks
 * Format: ```repos-json\n[{...repo data...}]\n```
 */
export function extractReposFromJSON(content) {
  const reposJsonRegex = /```repos-json\s*\n([\s\S]*?)\n```/g
  const repos = []
  let match

  while ((match = reposJsonRegex.exec(content)) !== null) {
    try {
      const jsonData = JSON.parse(match[1])
      if (Array.isArray(jsonData)) {
        repos.push(...jsonData)
      }
    } catch (error) {
      console.error('Failed to parse repos JSON:', error)
    }
  }

  return repos
}

/**
 * Extract GitHub repository URLs from content
 * Format: https://github.com/owner/repo
 */
export function extractGithubUrls(content) {
  const githubUrlRegex = /https?:\/\/github\.com\/([^\/\s]+)\/([^\/\s]+)/g
  const urls = []
  let match

  while ((match = githubUrlRegex.exec(content)) !== null) {
    const owner = match[1]
    const repo = match[2].replace(/[.,;!?)]*$/, '') // Remove trailing punctuation
    
    // Skip URLs that are likely not repos (like github.com/settings, etc.)
    if (!['settings', 'explore', 'topics', 'collections', 'trending'].includes(owner)) {
      urls.push({ owner, repo, url: match[0] })
    }
  }

  return urls
}

/**
 * Remove repo suggestion code blocks from content
 * Returns cleaned content without the JSON blocks
 */
export function removeRepoBlocks(content) {
  return content.replace(/```repos-json\s*\n[\s\S]*?\n```/g, '').trim()
}

/**
 * Main function to parse all repo suggestions from AI response
 */
export async function parseRepoSuggestions(content) {
  const suggestions = {
    repos: [],
    cleanedContent: content,
    hasRepos: false
  }

  // 1. Extract repos from JSON blocks
  const jsonRepos = extractReposFromJSON(content)
  suggestions.repos.push(...jsonRepos)

  // 2. Extract GitHub URLs and fetch repo data
  const githubUrls = extractGithubUrls(content)
  
  if (githubUrls.length > 0) {
    try {
      // Fetch repo data for detected URLs
      const repoPromises = githubUrls.map(async ({ owner, repo }) => {
        try {
          const response = await fetch(`/api/github/repo?owner=${owner}&name=${repo}`)
          if (response.ok) {
            return await response.json()
          }
        } catch (error) {
          console.error(`Failed to fetch repo ${owner}/${repo}:`, error)
        }
        return null
      })

      const fetchedRepos = (await Promise.all(repoPromises)).filter(Boolean)
      
      // Only add repos that aren't already in the JSON suggestions
      const existingFullNames = new Set(jsonRepos.map(r => r.full_name))
      const newRepos = fetchedRepos.filter(r => !existingFullNames.has(r.full_name))
      
      suggestions.repos.push(...newRepos)
    } catch (error) {
      console.error('Error fetching GitHub repos:', error)
    }
  }

  // 3. Clean content by removing JSON blocks
  suggestions.cleanedContent = removeRepoBlocks(content)
  suggestions.hasRepos = suggestions.repos.length > 0

  return suggestions
}
