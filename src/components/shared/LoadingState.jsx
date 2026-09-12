"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { memo } from "react"

/**
 * Generic loading skeleton component
 * Used across multiple pages for consistent loading states
 * @param {Object} props
 * @param {"card"|"list"|"table"|"default"} [props.type="default"] - Skeleton layout type
 * @param {number} [props.count=1] - Number of skeleton items to display
 * @returns {JSX.Element}
 */
export const LoadingState = memo(function LoadingState({ type = "default", count = 1 }) {
  if (type === "card") {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading content">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (type === "list") {
    return (
      <div className="space-y-4" role="status" aria-label="Loading list items">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-1/3 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (type === "table") {
    return (
      <div className="space-y-3" role="status" aria-label="Loading table rows">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1">
              <Skeleton className="h-4 w-1/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    )
  }

  // Default skeleton
  return (
    <div className="space-y-4" role="status" aria-label="Loading content">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  )
})

/**
 * Page-level loading state with centered spinner
 * @param {Object} props
 * @param {string} [props.message="Loading..."] - Loading message to display
 * @returns {JSX.Element}
 */
export const PageLoadingState = memo(function PageLoadingState({ message = "Loading..." }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]" role="status" aria-live="polite">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" aria-hidden="true"></div>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
})

/**
 * Compact loading spinner for inline use
 * @param {Object} props
 * @param {"sm"|"md"|"lg"} [props.size="md"] - Spinner size
 * @returns {JSX.Element}
 */
export const InlineLoadingState = memo(function InlineLoadingState({ size = "md" }) {
  const sizeClasses = {
    sm: "h-4 w-4 border",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-2"
  }

  return (
    <div 
      className={`animate-spin rounded-full border-primary border-t-transparent ${sizeClasses[size]}`} 
      role="status" 
      aria-label="Loading"
    />
  )
})
