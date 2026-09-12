import { NextResponse } from 'next/server';
import { githubLanguages } from '@/data/github-languages';

export async function GET() {
  try {
    // GitHub doesn't have a direct API for all languages
    // We use a comprehensive static list of GitHub-supported languages from data file
    return NextResponse.json(githubLanguages);
  } catch (error) {
    console.error('Error fetching languages:', error);
    return NextResponse.json({ error: 'Failed to fetch languages' }, { status: 500 });
  }
}
