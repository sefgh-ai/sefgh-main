/**
 * Get user initials from their name or email
 * @param {Object} user - User object from Supabase auth
 * @returns {string} User initials (e.g., "JD" for John Doe)
 */
export const getUserInitials = (user) => {
  if (user?.user_metadata?.full_name) {
    const names = user.user_metadata.full_name.split(' ')
    return names.map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return user?.email?.[0]?.toUpperCase() || 'U'
}

/**
 * Format date string to readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (e.g., "January 1, 2024")
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Extract GitHub username from user metadata
 * @param {Object} user - User object from Supabase auth
 * @returns {string} GitHub username or empty string
 */
export const getGithubUsername = (user) => {
  return user?.user_metadata?.github_username 
    || user?.user_metadata?.user_name
    || user?.identities?.find(id => id.provider === 'github')?.identity_data?.user_name
    || ''
}
