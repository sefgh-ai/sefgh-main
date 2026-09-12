'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export function RepoRatingSection({ repoFullName, initialRatings, userRating }) {
  const { user } = useAuth()
  const [ratings, setRatings] = useState(initialRatings || { total: 0, average: 0 })
  const [myRating, setMyRating] = useState(userRating?.rating || 0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState(userRating?.review_text || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRatingSubmit = async () => {
    if (!user) {
      toast.error('Please login to rate')
      return
    }

    if (myRating === 0) {
      toast.error('Please select a rating')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/repo/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName,
          rating: myRating,
          reviewText: reviewText.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit rating')
      }

      setRatings(data.ratings)
      toast.success('Rating submitted successfully!')
    } catch (error) {
      console.error('Rating error:', error)
      toast.error(error.message || 'Failed to submit rating')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Overall Rating Display */}
      <Card className="p-6 bg-card/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">SEFGH Community Rating</h3>
            <p className="text-sm text-muted-foreground">
              {ratings.total === 0 ? 'No ratings yet' : `Based on ${ratings.total} rating${ratings.total > 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-500">
              {ratings.average > 0 ? (Math.round(ratings.average * 10) / 10).toString() : '-'}
            </div>
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-5 w-5",
                    star <= Math.round(ratings.average)
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-gray-300"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* User Rating Form */}
      {user ? (
        <Card className="p-6 bg-card/50">
          <h3 className="text-lg font-semibold mb-4">
            {userRating ? 'Your Rating' : 'Rate this Repository'}
          </h3>
          
          {/* Star Rating */}
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setMyRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-8 w-8 cursor-pointer transition-colors",
                    star <= (hoverRating || myRating)
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-gray-300"
                  )}
                />
              </button>
            ))}
            {myRating > 0 && (
              <span className="ml-2 text-sm text-muted-foreground self-center">
                {myRating} star{myRating > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Review Text */}
          <Textarea
            placeholder="Share your experience with this repository... (optional)"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="mb-4 min-h-[100px]"
          />

          <Button
            onClick={handleRatingSubmit}
            disabled={isSubmitting || myRating === 0}
          >
            {isSubmitting ? 'Submitting...' : userRating ? 'Update Rating' : 'Submit Rating'}
          </Button>
        </Card>
      ) : (
        <Card className="p-6 bg-card/50 text-center">
          <p className="text-muted-foreground">
            Please login to rate this repository
          </p>
        </Card>
      )}
    </div>
  )
}
