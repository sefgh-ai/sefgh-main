import { NextResponse } from 'next/server'

/**
 * GitHub GraphQL API endpoint for fetching user contributions
 * GET /api/github/contributions?username=octocat
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    const isValidUsername = /^[A-Za-z0-9](?:-?[A-Za-z0-9]){0,38}$/.test(username)
    if (!isValidUsername) {
      return NextResponse.json(
        { error: 'Invalid GitHub username format' },
        { status: 400 }
      )
    }

    // Calculate date range (last 52 weeks starting from a Monday)
    const to = new Date()
    const from = new Date()
    from.setDate(to.getDate() - 365)
    
    // Adjust 'from' to the previous Monday
    const dayOfWeek = from.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    from.setDate(from.getDate() - daysToMonday)

    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                  color
                }
              }
            }
          }
        }
      }
    `

    const variables = {
      username,
      from: from.toISOString(),
      to: to.toISOString()
    }

    // Use GitHub token from environment
    const token = process.env.GITHUB_TOKEN

    if (!token) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 }
      )
    }

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GitHub API error:', response.status)
      return NextResponse.json(
        { error: 'Failed to fetch GitHub data' },
        { status: response.status }
      )
    }

    const data = await response.json()

    if (data.errors) {
      console.error('GraphQL errors received from GitHub')
      return NextResponse.json(
        { error: 'GraphQL query failed' },
        { status: 400 }
      )
    }

    if (!data.data?.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Transform the data into a normalized format
    const calendar = data.data.user.contributionsCollection.contributionCalendar
    const weeks = calendar.weeks

    // Build normalized grid
    const grid = []
    let maxCount = 0
    let totalContributions = calendar.totalContributions
    let activeDays = 0

    weeks.forEach((week, weekIndex) => {
      const weekData = []
      week.contributionDays.forEach((day, dayIndex) => {
        const count = day.contributionCount
        if (count > maxCount) maxCount = count
        if (count > 0) activeDays++

        weekData.push({
          date: day.date,
          count: count,
          color: day.color,
          weekIndex,
          dayOfWeekIndex: dayIndex
        })
      })
      grid.push(weekData)
    })

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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
