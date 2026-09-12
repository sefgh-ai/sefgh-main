'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowBigUp, ArrowBigDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function RepoVoteSection({ repoFullName, initialVotes, userVote }) {
  const { user } = useAuth()
  const [votes, setVotes] = useState(initialVotes || { upvotes: 0, downvotes: 0, net_votes: 0 })
  const [currentVote, setCurrentVote] = useState(userVote) // null, 'upvote', or 'downvote'
  const [isVoting, setIsVoting] = useState(false)

  const handleVote = async (voteType) => {
    if (!user) {
      toast.error('Please login to vote')
      return
    }

    if (isVoting) return

    setIsVoting(true)

    try {
      // Optimistic UI update
      let newVotes = { ...votes }
      let newCurrentVote = currentVote

      // If clicking same vote, remove it
      if (currentVote === voteType) {
        if (voteType === 'upvote') {
          newVotes.upvotes -= 1
          newVotes.net_votes -= 1
        } else {
          newVotes.downvotes -= 1
          newVotes.net_votes += 1
        }
        newCurrentVote = null
      }
      // If changing vote
      else if (currentVote) {
        if (currentVote === 'upvote') {
          newVotes.upvotes -= 1
          newVotes.downvotes += 1
          newVotes.net_votes -= 2
        } else {
          newVotes.downvotes -= 1
          newVotes.upvotes += 1
          newVotes.net_votes += 2
        }
        newCurrentVote = voteType
      }
      // If new vote
      else {
        if (voteType === 'upvote') {
          newVotes.upvotes += 1
          newVotes.net_votes += 1
        } else {
          newVotes.downvotes += 1
          newVotes.net_votes -= 1
        }
        newCurrentVote = voteType
      }

      setVotes(newVotes)
      setCurrentVote(newCurrentVote)

      // API call
      const response = await fetch('/api/repo/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName,
          voteType: newCurrentVote
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to vote')
      }

      // Update with actual server data
      setVotes(data.votes)
      setCurrentVote(data.userVote)

    } catch (error) {
      console.error('Vote error:', error)
      toast.error(error.message || 'Failed to vote')
      
      // Revert optimistic update on error
      setVotes(initialVotes)
      setCurrentVote(userVote)
    } finally {
      setIsVoting(false)
    }
  }

  // Format vote count with K/M suffix (consistent for SSR)
  const formatVotes = (count) => {
    const n = Number(count)
    if (isNaN(n)) return '0'
    const absN = Math.abs(n)
    if (absN >= 1000000) {
      return (n < 0 ? '-' : '') + (Math.floor(absN / 100000) / 10) + 'M'
    }
    if (absN >= 1000) {
      return (n < 0 ? '-' : '') + (Math.floor(absN / 100) / 10) + 'k'
    }
    return String(n)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Upvote Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('upvote')}
        disabled={isVoting}
        className={cn(
          "flex items-center gap-1 transition-colors",
          currentVote === 'upvote' 
            ? "text-orange-500 hover:text-orange-600" 
            : "text-muted-foreground hover:text-orange-500"
        )}
      >
        <ArrowBigUp 
          className={cn(
            "h-6 w-6",
            currentVote === 'upvote' && "fill-current"
          )} 
        />
      </Button>

      {/* Vote Count */}
      <div className={cn(
        "text-lg font-bold min-w-[60px] text-center",
        votes.net_votes > 0 && "text-orange-500",
        votes.net_votes < 0 && "text-blue-500"
      )}>
        {formatVotes(votes.net_votes)}
      </div>

      {/* Downvote Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('downvote')}
        disabled={isVoting}
        className={cn(
          "flex items-center gap-1 transition-colors",
          currentVote === 'downvote' 
            ? "text-blue-500 hover:text-blue-600" 
            : "text-muted-foreground hover:text-blue-500"
        )}
      >
        <ArrowBigDown 
          className={cn(
            "h-6 w-6",
            currentVote === 'downvote' && "fill-current"
          )} 
        />
      </Button>

      {/* Vote Stats (hover tooltip would be nice) */}
      <div className="ml-4 text-xs text-muted-foreground">
        {votes.upvotes} upvotes • {votes.downvotes} downvotes
      </div>
    </div>
  )
}
