"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber, formatDate, formatDateRange } from '@/lib/usageStats'

/**
 * Statistics card showing total usage, best day, and averages
 * 
 * @param {Object} props
 * @param {number} props.totalCount - Total usage count
 * @param {number} props.averagePerDay - Average usage per day
 * @param {Object} props.bestDay - Best day object {date, count}
 * @param {Object} props.dateRange - Date range {start, end}
 */
export default function UsageContributionsStats({ 
  totalCount, 
  averagePerDay, 
  bestDay,
  dateRange 
}) {
  return (
    <Card className="glass-premium border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Usage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Count */}
        <div>
          <div className="text-3xl font-bold text-white">
            {formatNumber(totalCount)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Total
          </div>
          {dateRange && (
            <div className="text-xs text-muted-foreground/70 mt-1">
              {formatDateRange(dateRange.start, dateRange.end)}
            </div>
          )}
        </div>

        {/* Best Day */}
        <div className="pt-3 border-t border-white/5">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-white">
                {formatNumber(bestDay.count)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Best day
              </div>
              {bestDay.date && (
                <div className="text-xs text-muted-foreground/70 mt-0.5">
                  {formatDate(bestDay.date)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Average */}
        <div className="pt-3 border-t border-white/5">
          <div className="text-sm text-muted-foreground">
            Average: <span className="text-white font-semibold">{averagePerDay}</span> / day
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
