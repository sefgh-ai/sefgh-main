/**
 * Activity Logger Utility
 * 
 * Tracks user activities (searches, chats, views, etc.) in Supabase
 */

import { createClient } from '@/lib/supabase/client'

/**
 * Log user activity
 * 
 * @param {string} activityType - Type of activity ('search', 'chat', 'view', 'bookmark', etc.)
 * @param {object} metadata - Optional metadata about the activity
 * @returns {Promise<void>}
 */
export async function logActivity(activityType, metadata = {}) {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn('Cannot log activity: user not authenticated')
      return
    }

    // Call the Supabase function to log activity
    const { error } = await supabase.rpc('log_user_activity', {
      p_user_id: user.id,
      p_activity_type: activityType,
      p_metadata: metadata
    })

    if (error) {
      console.error('Error logging activity:', error)
    }
  } catch (error) {
    console.error('Activity logging failed:', error)
  }
}

/**
 * Activity type constants
 */
export const ACTIVITY_TYPES = {
  SEARCH: 'search',
  CHAT: 'chat',
  VIEW: 'view',
  BOOKMARK: 'bookmark',
  SHARE: 'share',
  SUBMIT: 'submit',
  PROFILE_VIEW: 'profile_view',
  SETTINGS_VIEW: 'settings_view',
  REPO_CLICK: 'repo_click',
  PLAYGROUND_USE: 'playground_use',
  NOTIFICATION_READ: 'notification_read'
}

/**
 * Convenience functions for common activities
 */
export const ActivityLogger = {
  /**
   * Log a search activity
   */
  search: (query) => logActivity(ACTIVITY_TYPES.SEARCH, { query }),
  
  /**
   * Log a chat activity
   */
  chat: (messageCount = 1) => logActivity(ACTIVITY_TYPES.CHAT, { messageCount }),
  
  /**
   * Log a page view
   */
  view: (page) => logActivity(ACTIVITY_TYPES.VIEW, { page }),
  
  /**
   * Log a bookmark action
   */
  bookmark: (repoUrl) => logActivity(ACTIVITY_TYPES.BOOKMARK, { repoUrl }),
  
  /**
   * Log a share action
   */
  share: (itemType, itemId) => logActivity(ACTIVITY_TYPES.SHARE, { itemType, itemId }),
  
  /**
   * Log a repository submission
   */
  submit: (repoUrl) => logActivity(ACTIVITY_TYPES.SUBMIT, { repoUrl }),
  
  /**
   * Log profile view
   */
  profileView: () => logActivity(ACTIVITY_TYPES.PROFILE_VIEW),
  
  /**
   * Log settings view
   */
  settingsView: () => logActivity(ACTIVITY_TYPES.SETTINGS_VIEW),
  
  /**
   * Log repository click
   */
  repoClick: (repoUrl) => logActivity(ACTIVITY_TYPES.REPO_CLICK, { repoUrl }),
  
  /**
   * Log playground usage
   */
  playgroundUse: (endpoint) => logActivity(ACTIVITY_TYPES.PLAYGROUND_USE, { endpoint }),
  
  /**
   * Log notification read
   */
  notificationRead: (notificationId) => logActivity(ACTIVITY_TYPES.NOTIFICATION_READ, { notificationId })
}
