'use client'

import { useState } from 'react'
import { RepositoryCard } from '@/components/RepositoryCard'
import { Github, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * RepoSuggestions Component
 * Displays a list of GitHub repository suggestions in chat
 */
export function RepoSuggestions({ repos, onSelect }) {
  const [expanded, setExpanded] = useState(true)

  if (!repos || repos.length === 0) return null

  return (
    <div className="my-4 rounded-xl border border-blue-200/50 dark:border-blue-800/50 bg-gradient-to-br from-blue-50/50 to-cyan-50/30 dark:from-blue-950/20 dark:to-cyan-950/10 overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 bg-blue-100/50 dark:bg-blue-900/20 border-b border-blue-200/50 dark:border-blue-800/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-600 dark:bg-blue-500">
            <Github className="h-4 w-4 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Suggested Repositories
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {repos.length} {repos.length === 1 ? 'repository' : 'repositories'} • Click to explore
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-blue-700 dark:text-blue-300 hover:bg-blue-200/50 dark:hover:bg-blue-800/30"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Repository Cards */}
      {expanded && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {repos.map((repo, index) => (
            <div key={repo.id || index} className="transform transition-transform hover:scale-[1.02]">
              <RepositoryCard
                repo={repo}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
