import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook to send notifications to users
 * Can be used anywhere in the app to create notifications
 */
export function useSendNotification() {
  const { user } = useAuth();
  const supabase = createClient();

  /**
   * Send a notification to a specific user
   * @param {string} userId - Target user ID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type: 'info', 'success', 'warning', 'error'
   * @param {string} link - Optional link to navigate to
   */
  const sendToUser = useCallback(
    async (userId, title, message, type = "info", link = null) => {
      try {
        const { data, error } = await supabase
          .from("notifications")
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
        console.error("Error sending notification:", error);
        return { data: null, error };
      }
    },
    [supabase]
  );

  /**
   * Send a notification to the current user (self)
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type: 'info', 'success', 'warning', 'error'
   * @param {string} link - Optional link to navigate to
   */
  const sendToSelf = useCallback(
    async (title, message, type = "info", link = null) => {
      if (!user?.id) {
        console.error("Cannot send notification: No user logged in");
        return { data: null, error: new Error("Not authenticated") };
      }
      return sendToUser(user.id, title, message, type, link);
    },
    [user?.id, sendToUser]
  );

  /**
   * Send notification using a template
   * @param {string} userId - Target user ID (optional, uses current user if not provided)
   * @param {object} template - Template object with title, message, type, link
   */
  const sendFromTemplate = useCallback(
    async (userId, template) => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) {
        console.error("Cannot send notification: No user ID provided");
        return { data: null, error: new Error("No user ID") };
      }
      return sendToUser(
        targetUserId,
        template.title,
        template.message,
        template.type,
        template.link
      );
    },
    [user?.id, sendToUser]
  );

  return {
    sendToUser,
    sendToSelf,
    sendFromTemplate,
  };
}

// Predefined notification templates
export const NotificationTemplates = {
  // Welcome & Onboarding
  welcome: () => ({
    title: "Welcome to SEFGH! 🎉",
    message: "Get started by exploring repositories or trying our AI chat assistant.",
    type: "success",
    link: "/chat",
  }),

  onboardingComplete: () => ({
    title: "Setup Complete! ✅",
    message: "You're all set. Start discovering amazing GitHub repositories.",
    type: "success",
    link: "/search",
  }),

  firstSearch: () => ({
    title: "Great First Search! 🔍",
    message: "You've made your first repository search. Keep exploring to find hidden gems!",
    type: "info",
    link: "/search",
  }),

  // Profile
  profileUpdated: () => ({
    title: "Profile Updated",
    message: "Your profile has been successfully updated.",
    type: "success",
    link: "/profile",
  }),

  avatarUpdated: () => ({
    title: "Avatar Updated 📸",
    message: "Your profile picture has been changed.",
    type: "success",
    link: "/profile",
  }),

  // API & Playground
  apiKeyCreated: (keyName) => ({
    title: "API Key Created 🔑",
    message: `Your API key "${keyName}" has been created successfully.`,
    type: "success",
    link: "/playground",
  }),

  apiKeyDeleted: (keyName) => ({
    title: "API Key Deleted",
    message: `Your API key "${keyName}" has been permanently deleted.`,
    type: "info",
    link: "/playground",
  }),

  rateLimitWarning: (percentage) => ({
    title: "Rate Limit Warning ⚠️",
    message: `You've used ${percentage}% of your daily API quota.`,
    type: "warning",
    link: "/playground?tab=limits",
  }),

  rateLimitExceeded: () => ({
    title: "Rate Limit Exceeded",
    message: "You've reached your API rate limit. Requests are being throttled.",
    type: "error",
    link: "/playground?tab=limits",
  }),

  // Submissions
  submissionReceived: (repoName) => ({
    title: "Submission Received 📬",
    message: `Your submission for "${repoName}" is being reviewed.`,
    type: "info",
    link: "/submissions",
  }),

  submissionApproved: (repoName) => ({
    title: "Submission Approved! 🎉",
    message: `"${repoName}" has been approved and is now live.`,
    type: "success",
    link: "/trending",
  }),

  submissionRejected: (repoName, reason) => ({
    title: "Submission Update",
    message: `"${repoName}" was not approved. ${reason || "Please review guidelines."}`,
    type: "warning",
    link: "/submissions",
  }),

  // Search & Discovery
  searchSaved: (query) => ({
    title: "Search Saved",
    message: `Your search for "${query}" has been saved.`,
    type: "info",
    link: "/search",
  }),

  repoBookmarked: (repoName) => ({
    title: "Repository Saved ⭐",
    message: `"${repoName}" has been added to your bookmarks.`,
    type: "success",
    link: "/profile?tab=bookmarks",
  }),

  trendingRepoAlert: (repoName) => ({
    title: "Trending Repository 🔥",
    message: `"${repoName}" is trending! Check it out before everyone else.`,
    type: "info",
    link: "/trending",
  }),

  // Chat & Conversations
  conversationShared: (title) => ({
    title: "Conversation Shared 🔗",
    message: `"${title}" is now accessible via your share link.`,
    type: "success",
    link: "/chat",
  }),

  chatMilestone: (count) => ({
    title: `${count} Conversations! 💬`,
    message: `You've reached ${count} AI conversations. Keep exploring!`,
    type: "success",
    link: "/chat",
  }),

  // Comments & Engagement
  commentPosted: (repoName) => ({
    title: "Comment Posted 💬",
    message: `Your comment on "${repoName}" has been posted.`,
    type: "success",
    link: null,
  }),

  replyReceived: (repoName, userName) => ({
    title: "New Reply 📢",
    message: `${userName} replied to your comment on "${repoName}".`,
    type: "info",
    link: `/repo/${repoName}`,
  }),

  commentUpvoted: (count) => ({
    title: "Your Comment is Popular! 👍",
    message: `Your comment has received ${count} upvotes.`,
    type: "success",
    link: null,
  }),

  // Security
  newLogin: (location) => ({
    title: "New Login Detected 🔐",
    message: `A login was detected from ${location || "a new device"}.`,
    type: "warning",
    link: "/profile",
  }),

  passwordChanged: () => ({
    title: "Password Changed",
    message: "Your password has been updated successfully.",
    type: "success",
    link: "/profile",
  }),

  // SEFGH Updates & Promotions
  featureUpdate: (featureName) => ({
    title: "New Feature Available 🚀",
    message: `Check out the new ${featureName} feature!`,
    type: "info",
    link: "/",
  }),

  weeklyDigest: () => ({
    title: "Your Weekly SEFGH Digest 📊",
    message: "See this week's trending repositories and your activity summary.",
    type: "info",
    link: "/trending",
  }),

  platformUpdate: (version) => ({
    title: `SEFGH Updated to ${version} 🆕`,
    message: "New features and improvements are now available!",
    type: "info",
    link: "/about",
  }),

  maintenanceScheduled: (date) => ({
    title: "Scheduled Maintenance 🔧",
    message: `SEFGH will undergo maintenance on ${date}.`,
    type: "warning",
    link: "/",
  }),

  maintenanceComplete: () => ({
    title: "Maintenance Complete ✅",
    message: "SEFGH is back online with improved performance!",
    type: "success",
    link: "/",
  }),

  // Tips & Education
  proTip: (tip) => ({
    title: "Pro Tip 💡",
    message: tip,
    type: "info",
    link: null,
  }),

  discoverFeature: (featureName, description) => ({
    title: `Discover: ${featureName}`,
    message: description,
    type: "info",
    link: null,
  }),

  // Achievements & Milestones
  achievementUnlocked: (achievement) => ({
    title: "Achievement Unlocked! 🏆",
    message: `You've earned: ${achievement}`,
    type: "success",
    link: "/profile",
  }),

  streakMilestone: (days) => ({
    title: `${days}-Day Streak! 🔥`,
    message: `You've been active on SEFGH for ${days} days in a row!`,
    type: "success",
    link: "/profile",
  }),

  contributionMilestone: (count) => ({
    title: "Contribution Milestone! 🌟",
    message: `You've made ${count} contributions on SEFGH. Thank you!`,
    type: "success",
    link: "/profile",
  }),
};

export default useSendNotification;
