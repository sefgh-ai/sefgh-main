/**
 * Trending Repositories Management
 * Handles curated trending repos by topic
 */

import { createClient } from '@/lib/supabase/client'

// Topic definitions with GitHub search queries
export const TRENDING_TOPICS = [
  {
    id: 'ai-ml',
    name: 'AI & Machine Learning',
    icon: '🤖',
    query: 'topic:artificial-intelligence OR topic:machine-learning OR topic:deep-learning OR topic:tensorflow OR topic:pytorch'
  },
  {
    id: 'web-dev',
    name: 'Web Development',
    icon: '🌐',
    query: 'topic:web OR topic:frontend OR topic:react OR topic:vue OR topic:angular OR topic:nextjs'
  },
  {
    id: 'mobile',
    name: 'Mobile Development',
    icon: '📱',
    query: 'topic:mobile OR topic:android OR topic:ios OR topic:react-native OR topic:flutter'
  },
  {
    id: 'devops',
    name: 'DevOps & Cloud',
    icon: '⚙️',
    query: 'topic:devops OR topic:kubernetes OR topic:docker OR topic:aws OR topic:cloud'
  },
  {
    id: 'data-science',
    name: 'Data Science',
    icon: '📊',
    query: 'topic:data-science OR topic:analytics OR topic:pandas OR topic:jupyter OR topic:visualization'
  },
  {
    id: 'security',
    name: 'Security & Privacy',
    icon: '🔐',
    query: 'topic:security OR topic:cybersecurity OR topic:privacy OR topic:encryption OR topic:penetration-testing'
  }
]

/**
 * Get all trending repos from database
 * @returns {Promise<Array>} - Trending repos grouped by topic
 */
export async function getAllTrendingRepos() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('trending_repos')
    .select('*')
    .order('topic')
    .order('rank')

  if (error) {
    console.error('Error fetching trending repos:', error)
    return []
  }

  // Group by topic
  const grouped = {}
  data.forEach(repo => {
    if (!grouped[repo.topic]) {
      grouped[repo.topic] = []
    }
    grouped[repo.topic].push(repo)
  })

  return grouped
}

/**
 * Get trending repos for a specific topic
 * @param {string} topicId - Topic ID (e.g., 'ai-ml')
 * @returns {Promise<Array>} - Trending repos for topic
 */
export async function getTrendingByTopic(topicId) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('trending_repos')
    .select('*')
    .eq('topic', topicId)
    .order('rank')

  if (error) {
    console.error('Error fetching trending by topic:', error)
    return []
  }

  return data
}

/**
 * Check if trending data is stale (older than 3 days)
 * @returns {Promise<boolean>}
 */
export async function isTrendingDataStale() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('trending_repos')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    // No data exists, consider stale
    return true
  }

  const fetchedAt = new Date(data.fetched_at)
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  return fetchedAt < threeDaysAgo
}

/**
 * Get last refresh timestamp
 * @returns {Promise<Date|null>}
 */
export async function getLastRefreshTime() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('trending_repos')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return new Date(data.fetched_at)
}

/**
 * Clear all trending repos (before refresh)
 * @returns {Promise<void>}
 */
export async function clearTrendingRepos() {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('trending_repos')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (error) {
    console.error('Error clearing trending repos:', error)
    throw error
  }
}

/**
 * Store trending repos in database
 * @param {string} topicId - Topic ID
 * @param {Array} repos - Array of GitHub repo objects
 * @returns {Promise<void>}
 */
export async function storeTrendingRepos(topicId, repos) {
  const supabase = createClient()
  
  const records = repos.map((repo, index) => ({
    topic: topicId,
    repo_full_name: repo.full_name,
    repo_data: repo,
    rank: index + 1,
    stars_count: repo.stargazers_count,
    created_at_github: repo.created_at,
    fetched_at: new Date().toISOString()
  }))

  const { error } = await supabase
    .from('trending_repos')
    .insert(records)

  if (error) {
    console.error('Error storing trending repos:', error)
    throw error
  }
}
