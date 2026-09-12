"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/usageStats'
import { Flame, TrendingUp } from 'lucide-react'

/**
 * Statistics card showing longest and current streaks
 * 
 * @param {Object} props
 * @param {Object} props.longestStreak - {length, startDate, endDate}
 * @param {Object} props.currentStreak - {length, startDate, endDate}
 */
export default function UsageStreaksStats({ longestStreak, currentStreak }) {
  const formatStreakRange = (streak) => {
    if (!streak.startDate || !streak.endDate) return 'No streak'
    
    const start = formatDate(streak.startDate).replace(', 2025', '').replace(', 2024', '')
    const end = formatDate(streak.endDate).replace(', 2025', '').replace(', 2024', '')
    
    return `${start} → ${end}`
  }

  return (
    <Card className="glass-premium border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          Streaks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Longest Streak */}
          <div>
            <div className="text-2xl font-bold text-white">
              {longestStreak.length}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {longestStreak.length === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Longest
            </div>
            <div className="text-xs text-muted-foreground/70 mt-0.5">
              {formatStreakRange(longestStreak)}
            </div>
          </div>

          {/* Current Streak */}
          <div>
            <div className="flex items-center gap-1">
              <div className="text-2xl font-bold text-white">
                {currentStreak.length}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {currentStreak.length === 1 ? 'day' : 'days'}
                </span>
              </div>
              {currentStreak.length > 0 && (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Current
            </div>
            <div className="text-xs text-muted-foreground/70 mt-0.5">
              {currentStreak.length > 0 
                ? formatStreakRange(currentStreak)
                : 'No active streak'
              }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
