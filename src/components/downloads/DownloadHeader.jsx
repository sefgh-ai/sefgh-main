'use client'

import React from 'react'
import { Sparkles } from "lucide-react"

/**
 * Download page header component
 */
const DownloadHeader = React.memo(() => {
  return (
    <div className="text-center mb-10 sm:mb-20">
      <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-gradient-to-r from-soft-cyan/10 to-soft-violet/10 rounded-full border border-soft-cyan/20">
        <Sparkles className="w-4 h-4 text-soft-cyan" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Coming Soon
        </span>
      </div>
      <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 dark:text-white mb-4 sm:mb-6 tracking-tight leading-tight mt-0 px-2">
        Download SEFGH
        <br />
        <span className="bg-gradient-to-r from-soft-cyan via-soft-violet to-soft-blue bg-clip-text text-transparent">
          on Your Desktop
        </span>
      </h1>
      <p className="text-base sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium px-4">
        AI-powered GitHub search at your fingertips. Discover repositories
        faster than ever.
      </p>
    </div>
  )
})

DownloadHeader.displayName = 'DownloadHeader'

export default DownloadHeader
