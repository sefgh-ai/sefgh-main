'use client'

import React from 'react'
import { LoadingState } from '@/components/shared'

/**
 * Loading skeleton for submissions page
 */
const SubmissionsLoadingSkeleton = React.memo(() => {
  return <LoadingState type="card" count={6} />
})

SubmissionsLoadingSkeleton.displayName = 'SubmissionsLoadingSkeleton'

export default SubmissionsLoadingSkeleton
