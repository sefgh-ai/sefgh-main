/**
 * Pure utility functions for processing SEFGH usage data
 * Used to compute statistics, streaks, and grid structure for contributions visualization
 */

/**
 * Normalize raw usage days into a consistent format with computed metadata
 * @param {Array} rawDays - Array of {date: string, count: number} objects
 * @returns {Array} Normalized days with Date objects and metadata
 */
export function normalizeUsageDays(rawDays) {
  if (!rawDays || rawDays.length === 0) {
    return []
  }

  // Sort by date to ensure chronological order
  const sorted = [...rawDays].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Get date range
  const firstDate = new Date(sorted[0].date)
  const lastDate = new Date(sorted[sorted.length - 1].date)

  // Adjust to start from Sunday of the first week
  const yearStart = new Date(firstDate)
  yearStart.setDate(yearStart.getDate() - yearStart.getDay())

  // Adjust to end on Saturday of the last week
  const yearEnd = new Date(lastDate)
  yearEnd.setDate(yearEnd.getDate() + (6 - yearEnd.getDay()))

  // Create a map for quick lookup
  const dataMap = new Map()
  sorted.forEach(day => {
    dataMap.set(day.date, day.count)
  })

  // Fill in all days including missing ones (count = 0)
  const normalized = []
  let currentDate = new Date(yearStart)
  let weekIndex = 0
  let daysSinceWeekStart = 0

  while (currentDate <= yearEnd) {
    const dateString = currentDate.toISOString().split('T')[0]
    const count = dataMap.get(dateString) || 0
    const dayOfWeek = currentDate.getDay() // 0 = Sunday, 6 = Saturday

    normalized.push({
      date: new Date(currentDate),
      dateString,
      count,
      weekIndex,
      dayOfWeek
    })

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
    daysSinceWeekStart++

    // Check if we completed a week (7 days)
    if (daysSinceWeekStart === 7) {
      weekIndex++
      daysSinceWeekStart = 0
    }
  }

  return normalized
}

/**
 * Group normalized days into weeks for grid rendering
 * @param {Array} normalizedDays - Output from normalizeUsageDays()
 * @returns {Array} Array of weeks, where each week is an array of 7 day objects
 */
export function groupByWeeks(normalizedDays) {
  const weeks = []
  let currentWeek = []

  normalizedDays.forEach(day => {
    currentWeek.push(day)
    
    // If we have 7 days, complete the week
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  // Add any remaining days (shouldn't happen if normalized correctly)
  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  return weeks
}

/**
 * Compute comprehensive usage statistics from normalized days
 * @param {Array} normalizedDays - Output from normalizeUsageDays()
 * @returns {Object} Statistics object with totals, averages, streaks, etc.
 */
export function computeUsageStats(normalizedDays) {
  if (!normalizedDays || normalizedDays.length === 0) {
    return {
      yearStart: null,
      yearEnd: null,
      totalCount: 0,
      averagePerDay: 0,
      bestDay: { date: null, count: 0 },
      longestStreak: { length: 0, startDate: null, endDate: null },
      currentStreak: { length: 0, startDate: null, endDate: null },
      activeDays: 0,
      totalDays: 0
    }
  }

  const yearStart = normalizedDays[0].date
  const yearEnd = normalizedDays[normalizedDays.length - 1].date
  const totalDays = normalizedDays.length

  // Calculate total count
  const totalCount = normalizedDays.reduce((sum, day) => sum + day.count, 0)

  // Calculate average (2 decimal places)
  const averagePerDay = totalDays > 0 
    ? Math.round((totalCount / totalDays) * 100) / 100 
    : 0

  // Find best day (highest count, earliest date if tie)
  let bestDay = { date: normalizedDays[0].date, count: 0 }
  normalizedDays.forEach(day => {
    if (day.count > bestDay.count) {
      bestDay = { date: day.date, count: day.count }
    }
  })

  // Count active days (days with count > 0)
  const activeDays = normalizedDays.filter(day => day.count > 0).length

  // Calculate streaks
  const { longestStreak, currentStreak } = calculateStreaks(normalizedDays)

  return {
    yearStart,
    yearEnd,
    totalCount,
    averagePerDay,
    bestDay,
    longestStreak,
    currentStreak,
    activeDays,
    totalDays
  }
}

/**
 * Calculate longest and current streaks from normalized days
 * A streak is consecutive days with count > 0
 * @param {Array} normalizedDays - Chronologically sorted days
 * @returns {Object} { longestStreak, currentStreak }
 */
function calculateStreaks(normalizedDays) {
  let longestStreak = { length: 0, startDate: null, endDate: null }
  let currentStreakInfo = { length: 0, startDate: null, endDate: null }
  
  let tempStreak = { length: 0, startDate: null, endDate: null }

  normalizedDays.forEach((day, index) => {
    if (day.count > 0) {
      // Continue or start a streak
      if (tempStreak.length === 0) {
        tempStreak.startDate = day.date
      }
      tempStreak.length++
      tempStreak.endDate = day.date

      // Check if this is the longest streak so far
      if (tempStreak.length > longestStreak.length) {
        longestStreak = { ...tempStreak }
      }
    } else {
      // Streak broken, reset temp streak
      tempStreak = { length: 0, startDate: null, endDate: null }
    }

    // If this is the last day, check if we have a current streak
    if (index === normalizedDays.length - 1 && tempStreak.length > 0) {
      currentStreakInfo = { ...tempStreak }
    }
  })

  // Current streak is only valid if it extends to the most recent day
  const lastDay = normalizedDays[normalizedDays.length - 1]
  if (lastDay.count === 0) {
    currentStreakInfo = { length: 0, startDate: null, endDate: null }
  }

  return { longestStreak, currentStreak: currentStreakInfo }
}

/**
 * Format date for display (e.g., "Nov 26, 2025")
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return ''
  
  const options = { month: 'short', day: 'numeric', year: 'numeric' }
  return date.toLocaleDateString('en-US', options)
}

/**
 * Format date range for display (e.g., "Jan 1 → Dec 31")
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {string} Formatted date range
 */
export function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return ''
  
  const startOptions = { month: 'short', day: 'numeric' }
  const endOptions = { month: 'short', day: 'numeric' }
  
  const start = startDate.toLocaleDateString('en-US', startOptions)
  const end = endDate.toLocaleDateString('en-US', endOptions)
  
  return `${start} → ${end}`
}

/**
 * Get color for a given count based on GitHub's contribution color scale
 * @param {number} count - Activity count for the day
 * @param {number} maxCount - Maximum count in the dataset
 * @returns {string} Hex color code
 */
export function getContributionColor(count, maxCount) {
  if (count === 0) {
    return '#161b22' // No activity (dark gray)
  }
  
  if (maxCount === 0) {
    return '#161b22'
  }
  
  const percentage = (count / maxCount) * 100
  
  if (percentage <= 25) {
    return '#0e4429' // Light green
  } else if (percentage <= 50) {
    return '#006d32' // Medium green
  } else if (percentage <= 75) {
    return '#26a641' // Bright green
  } else {
    return '#39d353' // Intense green
  }
}

/**
 * Format large numbers with commas (e.g., 1234 → "1,234")
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  if (typeof num !== 'number') return '0'
  return num.toLocaleString('en-US')
}
