import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { owner, repo } = await params

    // Fetch repository details
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SEFGH-NextJS-App',
        }
      }
    )

    if (!repoResponse.ok) {
      throw new Error(`GitHub API error: ${repoResponse.status}`)
    }

    const repoData = await repoResponse.json()

    // Fetch languages
    const languagesResponse = await fetch(repoData.languages_url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SEFGH-NextJS-App',
      }
    })
    const languagesData = languagesResponse.ok ? await languagesResponse.json() : {}

    // Fetch README
    let readmeData = null
    try {
      const readmeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/readme`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3.raw',
            'User-Agent': 'SEFGH-NextJS-App',
          }
        }
      )
      if (readmeResponse.ok) {
        readmeData = await readmeResponse.text()
      }
    } catch (error) {
      console.log('No README found')
    }

    return NextResponse.json({
      repository: repoData,
      languages: languagesData,
      readme: readmeData,
      rate_limit: {
        remaining: repoResponse.headers.get('x-ratelimit-remaining'),
        reset: repoResponse.headers.get('x-ratelimit-reset')
      }
    })

  } catch (error) {
    console.error('GitHub repo details error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch repository details' },
      { status: 500 }
    )
  }
}
