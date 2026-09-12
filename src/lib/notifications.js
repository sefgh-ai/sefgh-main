import { createClient } from '@/lib/supabase/client';

/**
 * Create a notification for a user
 * @param {string} userId - The user's ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type: 'info', 'success', 'warning', 'error'
 * @param {string} link - Optional link to navigate to
 * @returns {Promise<object>} The created notification
 */
export async function createNotification(userId, title, message, type = 'info', link = null) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        link,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { data: null, error };
  }
}

/**
 * Mark a notification as read
 * @param {string} notificationId - The notification ID
 * @returns {Promise<object>}
 */
export async function markNotificationAsRead(notificationId) {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { error };
  }
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<object>}
 */
export async function markAllNotificationsAsRead(userId) {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { error };
  }
}

/**
 * Delete a notification
 * @param {string} notificationId - The notification ID
 * @returns {Promise<object>}
 */
export async function deleteNotification(notificationId) {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { error };
  }
}

/**
 * Get unread notification count for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<number>} The count of unread notifications
 */
export async function getUnreadNotificationCount(userId) {
  const supabase = createClient();

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

// Predefined notification templates for common scenarios
export const NotificationTemplates = {
  // API Playground notifications
  apiKeyCreated: (keyName) => ({
    title: 'API Key Created',
    message: `Your API key "${keyName}" has been created successfully.`,
    type: 'success',
    link: '/playground',
  }),

  apiKeyDeleted: (keyName) => ({
    title: 'API Key Deleted',
    message: `Your API key "${keyName}" has been permanently deleted.`,
    type: 'info',
    link: '/playground',
  }),

  rateLimitWarning: (percentage) => ({
    title: 'Rate Limit Warning',
    message: `You have used ${percentage}% of your daily API quota. Consider upgrading your plan.`,
    type: 'warning',
    link: '/playground?tab=limits',
  }),

  rateLimitExceeded: () => ({
    title: 'Rate Limit Exceeded',
    message: 'You have exceeded your API rate limit. Requests are being throttled.',
    type: 'error',
    link: '/playground?tab=limits',
  }),

  apiErrorSpike: (count) => ({
    title: 'API Error Spike Detected',
    message: `Detected ${count} API errors in the last hour. Please check your implementation.`,
    type: 'error',
    link: '/playground?tab=monitoring',
  }),

  // Welcome notification
  welcome: () => ({
    title: 'Welcome to the Platform!',
    message: 'Get started by exploring the API Playground and creating your first API key.',
    type: 'success',
    link: '/playground',
  }),

  // Profile notifications
  profileUpdated: () => ({
    title: 'Profile Updated',
    message: 'Your profile has been successfully updated.',
    type: 'success',
    link: '/profile',
  }),

  // Security notifications
  newLogin: (location) => ({
    title: 'New Login Detected',
    message: `A new login was detected from ${location}. If this wasn't you, please secure your account.`,
    type: 'warning',
    link: '/profile',
  }),

  passwordChanged: () => ({
    title: 'Password Changed',
    message: 'Your password has been successfully changed.',
    type: 'success',
    link: '/profile',
  }),
};

/**
 * Send a notification using a template
 * @param {string} userId - The user's ID
 * @param {object} template - Template from NotificationTemplates
 * @returns {Promise<object>}
 */
export async function sendNotificationFromTemplate(userId, template) {
  return createNotification(
    userId,
    template.title,
    template.message,
    template.type,
    template.link
  );
}
