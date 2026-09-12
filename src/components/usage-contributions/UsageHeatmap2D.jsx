"use client"

import { getContributionColor } from '@/lib/usageStats'
import { useState } from 'react'

/**
 * 2D GitHub-style heatmap grid
 * 
 * @param {Object} props
 * @param {Array} props.weeks - Array of weeks, each week is array of 7 days
 * @param {number} props.maxCount - Maximum count in dataset for color scaling
 */
export default function UsageHeatmap2D({ weeks, maxCount }) {
  const [hoveredDay, setHoveredDay] = useState(null)
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (!weeks || weeks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="inline-flex gap-1 p-4 min-w-max">
        {/* Day labels (left side) */}
        <div className="flex flex-col gap-1 mr-2">
          <div className="h-3" /> {/* Spacer for month labels */}
          {dayLabels.map((label, i) => (
            <div
              key={i}
              className="h-3 flex items-center text-[10px] text-muted-foreground pr-2"
              style={{ minWidth: '28px' }}
            >
              {i % 2 === 1 && label}
            </div>
          ))}
        </div>

        {/* Grid of weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {/* Month label above first week of month */}
            <div className="h-3 text-[10px] text-muted-foreground">
              {weekIndex === 0 || week[0]?.date.getDate() <= 7 
                ? week[0]?.date.toLocaleDateString('en-US', { month: 'short' })
                : ''
              }
            </div>

            {/* Days in week */}
            {week.map((day, dayIndex) => {
              const color = getContributionColor(day.count, maxCount)
              const isHovered = hoveredDay === `${weekIndex}-${dayIndex}`

              return (
                <div
                  key={dayIndex}
                  className="relative group"
                  onMouseEnter={() => setHoveredDay(`${weekIndex}-${dayIndex}`)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <div
                    className="w-3 h-3 rounded-sm transition-all cursor-pointer"
                    style={{ 
                      backgroundColor: color,
                      transform: isHovered ? 'scale(1.5)' : 'scale(1)',
                      zIndex: isHovered ? 10 : 1,
                      border: isHovered ? '1px solid rgba(255,255,255,0.3)' : 'none'
                    }}
                    title={`${day.count} actions on ${day.date.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}`}
                  />

                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap pointer-events-none z-20 border border-white/10">
                      <div className="font-semibold">{day.count} actions</div>
                      <div className="text-muted-foreground text-[10px]">
                        {day.date.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                        <div className="w-2 h-2 bg-black/90 border-b border-r border-white/10 transform rotate-45"></div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 px-4 pb-4 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{ 
                backgroundColor: getContributionColor(
                  percent === 0 ? 0 : Math.ceil(maxCount * percent), 
                  maxCount
                ) 
              }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
