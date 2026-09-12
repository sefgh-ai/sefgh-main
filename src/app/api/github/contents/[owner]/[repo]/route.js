import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { owner, repo } = await params
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path') || ''

    const isSafePath = (candidate) => {
      if (!candidate) return true
      return !candidate.includes('..') && !candidate.startsWith('/') && !candidate.includes('\\')
    }

    if (!isSafePath(path)) {
      return NextResponse.json({ error: 'Invalid path parameter' }, { status: 400 })
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SEFGH-NextJS-App',
      }
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      contents: data,
      rate_limit: {
        remaining: response.headers.get('x-ratelimit-remaining'),
        reset: response.headers.get('x-ratelimit-reset')
      }
    })

  } catch (error) {
    console.error('GitHub contents error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch repository contents' },
      { status: 500 }
    )
  }
}
