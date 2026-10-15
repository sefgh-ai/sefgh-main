import { NextResponse } from 'next/server';
import { publicGitHubFetch } from '@/lib/github/public-token';
import { starsPerDay, heatLevel } from '@/lib/utils/trending/trendingMeasure';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || '';
    const since = searchParams.get('since') || 'daily';

    const allowedSince = ['daily', 'weekly', 'monthly'];
    const isValidLanguage = !language || /^[A-Za-z0-9._+-]{1,50}$/.test(language);

    if (!allowedSince.includes(since) || !isValidLanguage) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // GitHub trending doesn't have an official API, so we'll use a scraper service
    // or fallback to GitHub search API with trending parameters
    
    // Option 1: Use trending-github API (if available)
    // const trendingUrl = `https://api.gitterapp.com/repositories?language=${language}&since=${since}`;
    
    // Option 2: Use GitHub Search API with trending logic
    //
    // Known bug, left here on purpose (bug register R-068): GitHub reads the
    // encoded "+" as a literal plus sign and refuses this query. It is fixed
    // once, in Go (backend/internal/githubtrending, contract version 3), and
    // this handler is retired when trending switches to Go.
    const sinceDate = getSinceDate(since);
    const languageQuery = language && language !== 'any' ? `+language:${language}` : '';
    const query = `stars:>100+created:>${sinceDate}${languageQuery}`;
    
    const response = await publicGitHubFetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SEFGH-AI-App',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch trending repositories');
    }

    const data = await response.json();
    
    // Transform GitHub API response to our format
    const repositories = data.items.map((repo) => ({
      id: repo.id,
      author: repo.owner.login,
      name: repo.name,
      description: repo.description || 'No description provided',
      language: repo.language || 'Unknown',
      languageColor: getLanguageColor(repo.language),
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      // Contract version 2 (bug register R-020, the owner's choice of
      // 2026-10-14): a real measure replaces the random "starsToday".
      starsPerDay: starsPerDay(repo.stargazers_count, repo.created_at),
      contributors: [
        { avatar: repo.owner.avatar_url, name: repo.owner.login },
      ],
      heatLevel: heatLevel(starsPerDay(repo.stargazers_count, repo.created_at)),
      trending: true,
      url: repo.html_url,
    }));

    return NextResponse.json(repositories);
  } catch (error) {
    console.error('Error fetching trending repos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending repositories' },
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

function getLanguageColor(language) {
  const colors = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584',
    'C++': '#f34b7d',
    'C#': '#178600',
    PHP: '#4F5D95',
    Ruby: '#701516',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    Vue: '#41b883',
    React: '#61dafb',
  };
  return colors[language] || '#8b949e';
}
