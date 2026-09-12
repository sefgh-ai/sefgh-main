'use client'

import React from 'react'
import { useRouter } from "next/navigation"
import { EmptyState } from '@/components/shared'

/**
 * Empty state component for submissions page
 */
const SubmissionsEmptyState = React.memo(() => {
  const router = useRouter()

  return (
    <EmptyState
      icon="file"
      title="No submissions yet"
      description="Start by submitting your first GitHub repository!"
      actionLabel="Submit a Project"
      onAction={() => router.push('/search')}
      className="glass-premium rounded-2xl border border-white/10"
    />
  )
})

SubmissionsEmptyState.displayName = 'SubmissionsEmptyState'

export default SubmissionsEmptyState
