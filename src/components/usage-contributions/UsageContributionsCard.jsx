"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import UsageViewToggle from './UsageViewToggle'
import UsageIsometricChart from './UsageIsometricChart'
import UsageHeatmap2D from './UsageHeatmap2D'
import UsageContributionsStats from './UsageContributionsStats'
import UsageStreaksStats from './UsageStreaksStats'
import { normalizeUsageDays, groupByWeeks, computeUsageStats, formatNumber, usageDaysFromActivity } from '@/lib/usageStats'
import { useBrowserValue } from '@/hooks/useBrowser'

// The view the user picked last time. UsageViewToggle saves it.
function savedView() {
  try {
    return localStorage.getItem('sefghUsageView') === '3d' ? '3d' : '2d'
  } catch {
    return '2d'
  }
}

/**
 * The signed-in user's real activity over the last year, from GET
 * /api/activity, as 2D/3D charts with statistics.
 *
 * It used to show generated mock activity for a fixed year whenever no data
 * was passed in, which is what the profile page did (bug register R-006). It
 * never invents data now: while loading, when signed out, or when the request
 * fails, it says so instead.
 *
 * @param {Object} props
 * @param {string} props.title - Card title (optional, will be generated if not provided)
 * @param {Array} props.data - Optional usage data of {date, count}; when given, nothing is fetched
 */
export default function UsageContributionsCard({ title, data }) {
  const [fetched, setFetched] = useState({ status: 'loading', days: null })
  const remembered = useBrowserValue(savedView, '2d')
  const [picked, setPicked] = useState(null)
  const view = picked ?? remembered

  useEffect(() => {
    if (data) return
    const controller = new AbortController()
    fetch('/api/activity', { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          setFetched({ status: 'signed-out', days: null })
        } else if (!response.ok) {
          setFetched({ status: 'error', days: null })
        } else {
          setFetched({ status: 'ready', days: usageDaysFromActivity(await response.json()) })
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') setFetched({ status: 'error', days: null })
      })
    return () => controller.abort()
  }, [data])

  const status = data ? 'ready' : fetched.status
  const days = data ?? fetched.days

  const { weeks, stats, maxCount } = useMemo(() => {
    const normalizedDays = normalizeUsageDays(days || [])
    return {
      weeks: groupByWeeks(normalizedDays),
      stats: computeUsageStats(normalizedDays),
      // Find max count for color/height scaling
      maxCount: normalizedDays.reduce((max, day) => Math.max(max, day.count), 0),
    }
  }, [days])

  if (status !== 'ready') {
    const message = {
      loading: ['Loading activity data...', 'Please wait'],
      'signed-out': ['Sign in to see your activity', 'Your activity is only shown to you'],
      error: ['Your activity could not be loaded', 'Please try again later'],
    }[status]
    return (
      <Card className="glass-premium border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{message[0]}</CardTitle>
              <CardDescription>{message[1]}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  const cardTitle = title || `${formatNumber(stats.totalCount)} SEFGH usage in the last year`

  return (
    <Card className="glass-premium border-border shadow-premium">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-xl">{cardTitle}</CardTitle>
            <CardDescription>
              Your activity across all SEFGH features
            </CardDescription>
          </div>
          <UsageViewToggle view={view} onChange={setPicked} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Chart */}
        <div className="w-full rounded-xl border border-border/60 bg-background/20 overflow-hidden">
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
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/60">
          <div>
            {stats.activeDays} active days out of {stats.totalDays} total days
          </div>
          <div>Last 12 months</div>
        </div>
      </CardContent>
    </Card>
  )
}
