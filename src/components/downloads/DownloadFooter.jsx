'use client'

import React from 'react'
import Link from "next/link"

/**
 * Download page footer with additional info
 */
const DownloadFooter = React.memo(() => {
  return (
    <div className="text-center mt-12 sm:mt-20 space-y-4">
      <div className="inline-flex items-center gap-2 px-6 py-3 bg-accent/600 dark:bg-card/50 backdrop-blur-sm rounded-full border border-border dark:border-border shadow-lg">
        <div className="w-2 h-2 bg-gradient-to-r from-soft-cyan to-soft-violet rounded-full animate-pulse"></div>
        <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
          Desktop apps coming soon • Stay tuned!
        </p>
      </div>
      <p className="text-sm text-muted-foreground dark:text-muted-foreground">
        In the meantime, use SEFGH on the web at{" "}
        <Link
          href="/"
          className="text-soft-cyan hover:text-soft-violet dark:text-soft-cyan dark:hover:text-soft-violet font-semibold underline decoration-2 underline-offset-4 transition-colors duration-300"
        >
          sefgh.com
        </Link>
      </p>
    </div>
  )
})

DownloadFooter.displayName = 'DownloadFooter'

export default DownloadFooter
