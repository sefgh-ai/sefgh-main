'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { BookmarkSimpleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { fetchWithSession } from '@/lib/supabase/session-fetch'

// `compact` (REPO-001): an icon-only button for the floating action bar, with
// the label and count in its tooltip; `className` styles it there.
export function RepoCollectButton({ repoFullName, initialSaved, initialCount, compact = false, className }) {
  const { user } = useAuth()
  const [saved, setSaved] = useState(initialSaved || false)
  const [saveCount, setSaveCount] = useState(initialCount || 0)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleSave = async () => {
    if (!user) {
      toast.error('Please login to save repositories')
      return
    }

    if (isLoading) return

    setIsLoading(true)

    try {
      if (saved) {
        // Remove from collection
        const response = await fetchWithSession(`/api/repo/collect?repo=${encodeURIComponent(repoFullName)}`, {
          method: 'DELETE'
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to remove from collection')
        }

        setSaved(false)
        setSaveCount(data.totalSaves)
        toast.success('Removed from collection')
      } else {
        // Add to collection
        const response = await fetchWithSession('/api/repo/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoFullName,
            collectionName: 'default'
          })
        })

        const data = await response.json()

        if (!response.ok) {
          if (response.status === 409) {
            toast.info('Already in your collection')
            setSaved(true)
            return
          }
          throw new Error(data.error || 'Failed to save repository')
        }

        setSaved(true)
        setSaveCount(data.totalSaves)
        toast.success('Added to collection!')
      }
    } catch (error) {
      console.error('Toggle save error:', error)
      toast.error(error.message || 'Failed to update collection')
    } finally {
      setIsLoading(false)
    }
  }

  if (compact) {
    const label = `${saved ? 'Saved' : 'Save'} (${saveCount})`
    return (
      <button
        type="button"
        onClick={handleToggleSave}
        disabled={isLoading}
        aria-pressed={saved}
        aria-label={label}
        title={label}
        className={className}
      >
        <BookmarkSimpleIcon weight={saved ? 'fill' : 'regular'} className="h-4 w-4" aria-hidden="true" />
      </button>
    )
  }

  return (
    <Button
      variant={saved ? "default" : "outline"}
      size="lg"
      onClick={handleToggleSave}
      disabled={isLoading}
      className={cn(
        "transition-all",
        saved && "bg-primary hover:bg-primary/90"
      )}
    >
      {saved ? (
        <>
          <BookmarkSimpleIcon weight="fill" className="h-4 w-4 mr-2" />
          Saved ({saveCount})
        </>
      ) : (
        <>
          <BookmarkSimpleIcon className="h-4 w-4 mr-2" />
          Save ({saveCount})
        </>
      )}
    </Button>
  )
}
