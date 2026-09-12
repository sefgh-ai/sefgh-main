'use client'

import { useState, useEffect } from 'react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { RepoSuggestions } from './RepoSuggestions'
import { parseRepoSuggestions } from '@/lib/parse-repos'

/**
 * AIMessageRenderer
 * Renders AI messages with repo suggestions and markdown
 */
export function AIMessageRenderer({ content, onOpenInCanvas, onSelectRepo, className = '' }) {
  const [parsedData, setParsedData] = useState({
    repos: [],
    cleanedContent: content,
    hasRepos: false
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function parse() {
      setLoading(true)
      try {
        const data = await parseRepoSuggestions(content)
        setParsedData(data)
      } catch (error) {
        console.error('Error parsing repo suggestions:', error)
        setParsedData({
          repos: [],
          cleanedContent: content,
          hasRepos: false
        })
      } finally {
        setLoading(false)
      }
    }

    parse()
  }, [content])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-muted rounded mb-2"></div>
        <div className="h-4 bg-muted rounded mb-2 w-5/6"></div>
        <div className="h-4 bg-muted rounded w-4/6"></div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Markdown Content */}
      <MarkdownRenderer 
        content={parsedData.cleanedContent}
        onOpenInCanvas={onOpenInCanvas}
      />
      
      {/* Repository Suggestions */}
      {parsedData.hasRepos && (
        <RepoSuggestions 
          repos={parsedData.repos}
          onSelect={onSelectRepo}
        />
      )}
    </div>
  )
}
