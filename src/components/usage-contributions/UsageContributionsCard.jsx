"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import UsageViewToggle from './UsageViewToggle'
import UsageIsometricChart from './UsageIsometricChart'
import UsageHeatmap2D from './UsageHeatmap2D'
import UsageContributionsStats from './UsageContributionsStats'
import UsageStreaksStats from './UsageStreaksStats'
import { normalizeUsageDays, groupByWeeks, computeUsageStats, formatNumber } from '@/lib/usageStats'
import { loadMockUsageForYear } from '@/lib/mockUsageData'

/**
 * Main container for SEFGH Usage Contributions visualization
 * Shows activity data as 2D/3D charts with statistics
 * 
 * PRODUCTION NOTE:
 * Replace mock data with real API call. Example:
 * 
 * const response = await fetch('/api/activity')
 * const apiData = await response.json()
 * const usageDays = apiData.grid.flat().map(day => ({
 *   date: day.date,
 *   count: day.count
 * }))
 * 
 * @param {Object} props
 * @param {string} props.title - Card title (optional, will be generated if not provided)
 * @param {number} props.year - Year to display (default: current year)
 * @param {Array} props.data - Optional raw usage data array of {date, count}
 */
export default function UsageContributionsCard({ title, year, data }) {
  const [currentYear, setCurrentYear] = useState(year || 2025)
  const [view, setView] = useState('2d')
  const [isClient, setIsClient] = useState(false)

  // SSR safety - only run on client
  useEffect(() => {
    setIsClient(true)
    
    // Set current year on client only
    if (!year) {
      setCurrentYear(new Date().getFullYear())
    }
    
    // Load saved view preference from localStorage
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('sefghUsageView')
      if (savedView === '2d' || savedView === '3d') {
        setView(savedView)
      }
    }
  }, [year])

  // Process data
  const { weeks, stats, maxCount } = useMemo(() => {
    // Use provided data or load mock data
    const rawData = data || loadMockUsageForYear(currentYear)
    
    // Normalize and compute statistics
    const normalizedDays = normalizeUsageDays(rawData)
    const computedStats = computeUsageStats(normalizedDays)
    const weekGroups = groupByWeeks(normalizedDays)
    
    // Find max count for color/height scaling
    const max = normalizedDays.reduce((max, day) => Math.max(max, day.count), 0)
    
    return {
      weeks: weekGroups,
      stats: computedStats,
      maxCount: max
    }
  }, [data, currentYear])

  // Generate title if not provided
  const cardTitle = title || `${formatNumber(stats.totalCount)} SEFGH usage in ${currentYear}`

  if (!isClient) {
    // SSR fallback
    return (
      <Card className="glass-premium border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Loading activity data...</CardTitle>
              <CardDescription>Please wait</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="glass-premium border-white/10 shadow-premium">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-xl">{cardTitle}</CardTitle>
            <CardDescription>
              Your activity across all SEFGH features
            </CardDescription>
          </div>
          <UsageViewToggle view={view} onChange={setView} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Chart */}
        <div className="w-full rounded-xl border border-white/5 bg-black/20 overflow-hidden">
          {view === '3d' ? (
            <UsageIsometricChart weeks={weeks} maxCount={maxCount} />
          ) : (
            <UsageHeatmap2D weeks={weeks} maxCount={maxCount} />
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UsageStreaksStats
            longestStreak={stats.longestStreak}
            currentStreak={stats.currentStreak}
          />
          <UsageContributionsStats
            totalCount={stats.totalCount}
            averagePerDay={stats.averagePerDay}
            bestDay={stats.bestDay}
            dateRange={{
              start: stats.yearStart,
              end: stats.yearEnd
            }}
          />
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-white/5">
          <div>
            {stats.activeDays} active days out of {stats.totalDays} total days
          </div>
          <div>
            {data ? 'Live data' : 'Mock data (replace with real API)'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
