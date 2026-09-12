import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Supabase Activity API endpoint for fetching user activity
 * GET /api/activity
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Calculate date range (last 365 days starting from a Monday)
    const to = new Date()
    const from = new Date()
    from.setDate(to.getDate() - 365)
    
    // Adjust 'from' to the previous Monday
    const dayOfWeek = from.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    from.setDate(from.getDate() - daysToMonday)

    // Fetch activity data
    const { data: activityData, error: activityError } = await supabase
      .from('activity_logs')
      .select('activity_date, activity_count')
      .eq('user_id', user.id)
      .gte('activity_date', from.toISOString().split('T')[0])
      .lte('activity_date', to.toISOString().split('T')[0])
      .order('activity_date', { ascending: true })

    if (activityError) {
      console.error('Supabase error:', activityError)
      return NextResponse.json(
        { error: 'Failed to fetch activity data', details: activityError.message },
        { status: 500 }
      )
    }

    // Create a map of date -> count for quick lookup
    const activityMap = {}
    let totalContributions = 0
    
    if (activityData) {
      activityData.forEach(row => {
        const count = row.activity_count || 0
        if (activityMap[row.activity_date]) {
          activityMap[row.activity_date] += count
        } else {
          activityMap[row.activity_date] = count
        }
        totalContributions += count
      })
    }

    // Build grid for all days in range (including zeros)
    // Each week must have exactly 7 days (Sunday to Saturday)
    const grid = []
    let maxCount = 0
    let activeDays = 0
    
    const currentDate = new Date(from)
    let currentWeek = []
    let weekIndex = 0

    while (currentDate <= to) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const count = activityMap[dateStr] || 0
      
      if (count > maxCount) maxCount = count
      if (count > 0) activeDays++

      const dayOfWeekIndex = currentDate.getDay() // 0 = Sunday, 6 = Saturday
      
      currentWeek.push({
        date: dateStr,
        count: count,
        color: getColorForCount(count, 25), // Use a reasonable max for color calculation
        weekIndex,
        dayOfWeekIndex
      })

      // If it's Saturday (6), push the complete week
      if (dayOfWeekIndex === 6) {
        grid.push([...currentWeek])
        currentWeek = []
        weekIndex++
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Push any remaining days as the last incomplete week
    if (currentWeek.length > 0) {
      // Pad the incomplete week with empty days to make it 7 days
      while (currentWeek.length < 7) {
        currentWeek.push({
          date: '',
          count: 0,
          color: getColorForCount(0, 25),
          weekIndex,
          dayOfWeekIndex: currentWeek.length
        })
      }
      grid.push([...currentWeek])
    }

    // Calculate streak (current streak from today backwards)
    let currentStreak = 0
    const flatDays = grid.flat().sort((a, b) => new Date(b.date) - new Date(a.date))
    
    for (const day of flatDays) {
      if (day.count > 0) {
        currentStreak++
      } else {
        break
      }
    }

    // Calculate average per day
    const totalDays = grid.flat().length
    const averagePerDay = totalDays > 0 ? (totalContributions / totalDays).toFixed(1) : 0

    return NextResponse.json({
      grid,
      stats: {
        maxCount,
        totalContributions,
        currentStreak,
        averagePerDay: parseFloat(averagePerDay),
        activeDays,
        totalDays
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Helper function to get GitHub-style color for a count
 */
function getColorForCount(count, maxCount) {
  if (count === 0) return '#161b22'
  
  const normalized = count / maxCount
  if (normalized <= 0.25) return '#0e4429'
  if (normalized <= 0.5) return '#006d32'
  if (normalized <= 0.75) return '#26a641'
  return '#39d353'
}
