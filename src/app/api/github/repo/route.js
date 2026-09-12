import { NextResponse } from 'next/server'

/**
 * Fetch individual GitHub repository data
 * GET /api/github/repo?owner=<owner>&name=<repo>
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner')
    const name = searchParams.get('name')

    if (!owner || !name) {
      return NextResponse.json(
        { error: 'Owner and name parameters are required' },
        { status: 400 }
      )
    }

    // Fetch repository data from GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${name}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SEFGH-NextJS-App',
          ...(process.env.GITHUB_TOKEN && {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
          })
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Repository not found' },
          { status: 404 }
        )
      }
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const repo = await response.json()
    
    // Return formatted repository data
    return NextResponse.json({
      id: repo.id,
      full_name: repo.full_name,
      name: repo.name,
      owner: repo.owner,
      html_url: repo.html_url,
      description: repo.description,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      language: repo.language,
      topics: repo.topics,
      license: repo.license,
      created_at: repo.created_at,
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      homepage: repo.homepage,
      clone_url: repo.clone_url,
      default_branch: repo.default_branch,
      open_issues_count: repo.open_issues_count,
      watchers_count: repo.watchers_count,
      size: repo.size,
    })
  } catch (error) {
    console.error('Error fetching repository:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch repository' },
      { status: 500 }
    )
  }
}
