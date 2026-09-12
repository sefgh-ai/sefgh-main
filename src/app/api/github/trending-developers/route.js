import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since') || 'daily';

    const allowedSince = ['daily', 'weekly', 'monthly'];
    if (!allowedSince.includes(since)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // GitHub doesn't have a trending developers API
    // We'll use GitHub search API to find active developers
    const sinceDate = getSinceDate(since);
    
    const response = await fetch(
      `https://api.github.com/search/users?q=followers:>100+created:>${sinceDate}&sort=followers&order=desc&per_page=30`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SEFGH-AI-App',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch trending developers');
    }

    const data = await response.json();
    
    // Transform GitHub API response to our format
    const developers = await Promise.all(
      data.items.slice(0, 20).map(async (user, index) => {
        // Fetch user's popular repo
        const reposResponse = await fetch(
          `https://api.github.com/users/${user.login}/repos?sort=stars&per_page=1`,
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'SEFGH-AI-App',
            },
          }
        );
        
        let popularRepo = {
          name: 'No repositories',
          description: 'This developer has no public repositories',
        };
        
        if (reposResponse.ok) {
          const repos = await reposResponse.json();
          if (repos.length > 0) {
            popularRepo = {
              name: repos[0].name,
              description: repos[0].description || 'No description provided',
            };
          }
        }

        return {
          id: user.id,
          rank: index + 1,
          name: user.login, // GitHub API doesn't always provide real name
          username: user.login,
          avatar: user.avatar_url,
          popularRepo,
          following: false,
          url: user.html_url,
        };
      })
    );

    return NextResponse.json(developers);
  } catch (error) {
    console.error('Error fetching trending developers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending developers' },
      { status: 500 }
    );
  }
}

function getSinceDate(since) {
  const date = new Date();
  switch (since) {
    case 'daily':
      date.setDate(date.getDate() - 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() - 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() - 1);
      break;
    default:
      date.setDate(date.getDate() - 1);
  }
  return date.toISOString().split('T')[0];
}
