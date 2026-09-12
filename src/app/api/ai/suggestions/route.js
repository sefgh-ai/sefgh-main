import { generateAIResponse } from '@/lib/ai/github'
import { NextResponse } from 'next/server'

// Predefined popular search terms (fallback when AI is unavailable)
const POPULAR_SEARCHES = [
  // Programming Languages
  'javascript projects',
  'python machine learning',
  'react components',
  'nodejs backend',
  'typescript utilities',
  'go microservices',
  'rust systems programming',
  
  // Web Development
  'nextjs templates',
  'vue.js applications',
  'angular projects',
  'tailwind css components',
  'bootstrap themes',
  'css animations',
  
  // Backend & APIs
  'rest api examples',
  'graphql server',
  'express middleware',
  'fastapi projects',
  'django applications',
  
  // Mobile Development
  'react native apps',
  'flutter projects',
  'ios swift',
  'android kotlin',
  
  // Data Science & AI
  'machine learning models',
  'deep learning tensorflow',
  'data visualization',
  'jupyter notebooks',
  'pytorch projects',
  
  // DevOps & Tools
  'docker containers',
  'kubernetes deployments',
  'ci/cd pipelines',
  'terraform infrastructure',
  'monitoring dashboards',
  
  // Categories
  'awesome lists',
  'starter templates',
  'boilerplate code',
  'ui component library',
  'design systems',
  'authentication systems',
  'payment integrations',
  'chat applications',
  'e-commerce platforms',
  'portfolio websites',
]

export async function POST(request) {
  try {
    const { query } = await request.json()

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    const lowerQuery = query.toLowerCase().trim()

    // First, get predefined matches
    const predefinedMatches = POPULAR_SEARCHES
      .filter(term => term.toLowerCase().includes(lowerQuery))
      .slice(0, 3)

    // If we have good predefined matches and query is short, return those
    if (predefinedMatches.length >= 3 || query.length < 5) {
      return NextResponse.json({ 
        suggestions: predefinedMatches.slice(0, 5),
        source: 'predefined'
      })
    }

    // For longer queries, try AI-powered suggestions
    try {
      const aiPrompt = `You are a GitHub search assistant. The user is typing: "${query}"

Generate 3-5 relevant search query completions that would help them find repositories on GitHub. Focus on:
- Completing their thought/sentence
- Adding relevant technologies or keywords
- Suggesting popular search patterns
- Making queries more specific and useful

Return ONLY a JSON array of suggestion strings, nothing else. Example format:
["suggestion 1", "suggestion 2", "suggestion 3"]

Suggestions:`

      const messages = [
        { role: 'system', content: 'You are a helpful GitHub search assistant that completes user queries.' },
        { role: 'user', content: aiPrompt }
      ]

      const aiResponse = await generateAIResponse(messages)
      
      // Try to parse AI response as JSON
      let aiSuggestions = []
      try {
        // Clean the response - remove markdown code blocks if present
        const cleanResponse = aiResponse
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        
        aiSuggestions = JSON.parse(cleanResponse)
        
        if (!Array.isArray(aiSuggestions)) {
          throw new Error('AI response is not an array')
        }
      } catch (parseError) {
        console.error('Failed to parse AI suggestions:', parseError)
        // Fall back to predefined
        return NextResponse.json({ 
          suggestions: predefinedMatches.slice(0, 5),
          source: 'predefined-fallback'
        })
      }

      // Combine AI suggestions with predefined (AI first)
      const combined = [
        ...aiSuggestions.slice(0, 3),
        ...predefinedMatches.filter(p => !aiSuggestions.includes(p))
      ].slice(0, 5)

      return NextResponse.json({ 
        suggestions: combined,
        source: 'ai-powered'
      })

    } catch (aiError) {
      console.error('AI suggestion error:', aiError)
      // Fallback to predefined suggestions
      return NextResponse.json({ 
        suggestions: predefinedMatches.slice(0, 5),
        source: 'predefined-fallback'
      })
    }

  } catch (error) {
    console.error('Suggestions API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}
