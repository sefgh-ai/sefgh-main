/**
 * Mock data generator for SEFGH usage contributions
 * 
 * PRODUCTION NOTE:
 * Replace this mock data with real API calls to /api/activity endpoint.
 * 
 * Example real data fetching:
 * 
 * async function loadRealUsageForYear(year) {
 *   const response = await fetch('/api/activity')
 *   const data = await response.json()
 *   
 *   // Transform API response to UsageDay format
 *   const usageDays = data.grid.flat().map(day => ({
 *     date: day.date,
 *     count: day.count
 *   }))
 *   
 *   return usageDays
 * }
 */

/**
 * Generate realistic mock usage data for a full year
 * Creates varying activity patterns with streaks, gaps, and intensity variations
 * 
 * @param {number} year - Year to generate data for (e.g., 2025)
 * @returns {Array} Array of {date: string, count: number} objects
 */
export function loadMockUsageForYear(year = 2025) {
  const mockData = []
  const startDate = new Date(year, 0, 1) // January 1st
  const endDate = new Date(year, 11, 31) // December 31st
  
  let currentDate = new Date(startDate)
  let streakMode = false
  let streakDaysLeft = 0
  let intensityMultiplier = 1
  
  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0]
    
    // Determine if we should start/continue/end a streak
    if (streakMode) {
      streakDaysLeft--
      if (streakDaysLeft <= 0) {
        streakMode = false
      }
    } else {
      // 30% chance to start a streak each day
      if (Math.random() < 0.3) {
        streakMode = true
        streakDaysLeft = Math.floor(Math.random() * 20) + 5 // 5-25 day streaks
        intensityMultiplier = 0.5 + Math.random() * 2 // 0.5x to 2.5x intensity
      }
    }
    
    // Generate count based on various factors
    let count = 0
    
    if (streakMode) {
      // Active streak - higher activity
      count = Math.floor(Math.random() * 30 * intensityMultiplier) + 5
    } else {
      // Random activity - 60% chance of activity
      if (Math.random() < 0.6) {
        count = Math.floor(Math.random() * 15) + 1
      }
    }
    
    // Reduce activity on weekends (70% of normal)
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      count = Math.floor(count * 0.7)
    }
    
    // Add some "super productive" days (5% chance)
    if (Math.random() < 0.05) {
      count = Math.floor(count * 2.5)
    }
    
    // Seasonal variation - more activity in certain months
    const month = currentDate.getMonth()
    if (month === 0 || month === 1 || month === 8 || month === 9) {
      // January, February, September, October - higher activity
      count = Math.floor(count * 1.3)
    }
    
    mockData.push({
      date: dateString,
      count: Math.min(count, 50) // Cap at 50 to keep it realistic
    })
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return mockData
}

/**
 * Generate minimal mock data for testing edge cases
 * Only a few days with activity
 * 
 * @param {number} year - Year to generate data for
 * @returns {Array} Array of {date: string, count: number} objects
 */
export function loadMinimalMockData(year = 2025) {
  return [
    { date: `${year}-01-15`, count: 5 },
    { date: `${year}-01-16`, count: 8 },
    { date: `${year}-01-17`, count: 12 },
    { date: `${year}-03-10`, count: 3 },
    { date: `${year}-06-20`, count: 20 },
    { date: `${year}-06-21`, count: 15 },
    { date: `${year}-12-25`, count: 1 },
  ]
}

/**
 * Generate empty mock data (all zeros) for testing
 * 
 * @param {number} year - Year to generate data for
 * @returns {Array} Array of {date: string, count: number} objects
 */
export function loadEmptyMockData(year = 2025) {
  const mockData = []
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year, 11, 31)
  
  let currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0]
    mockData.push({
      date: dateString,
      count: 0
    })
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return mockData
}

/**
 * Generate highly active mock data for testing visual limits
 * 
 * @param {number} year - Year to generate data for
 * @returns {Array} Array of {date: string, count: number} objects
 */
export function loadHighActivityMockData(year = 2025) {
  const mockData = []
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year, 11, 31)
  
  let currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0]
    const count = Math.floor(Math.random() * 100) + 50 // 50-150 range
    
    mockData.push({
      date: dateString,
      count
    })
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return mockData
}

/**
 * Get default mock data loader
 * Switch between different mock datasets for testing
 * 
 * @param {string} type - Type of mock data: 'realistic', 'minimal', 'empty', 'high'
 * @param {number} year - Year to generate data for
 * @returns {Array} Array of {date: string, count: number} objects
 */
export function getMockUsageData(type = 'realistic', year = 2025) {
  switch (type) {
    case 'minimal':
      return loadMinimalMockData(year)
    case 'empty':
      return loadEmptyMockData(year)
    case 'high':
      return loadHighActivityMockData(year)
    case 'realistic':
    default:
      return loadMockUsageForYear(year)
  }
}
