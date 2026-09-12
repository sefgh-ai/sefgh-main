"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";

const NotificationContext = createContext(null);

// Icon mapping for notification types
const notificationIcons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

// Color mapping for notification types
const notificationColors = {
  success: "text-emerald-500",
  warning: "text-yellow-500",
  error: "text-red-500",
  info: "text-blue-500",
};

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Memoize supabase client
  const supabase = useMemo(() => createClient(), []);

  // Fetch all notifications for the user
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  // Show toast notification for new notifications
  const showNotificationToast = useCallback((notification) => {
    const Icon = notificationIcons[notification.type] || Bell;
    const colorClass = notificationColors[notification.type] || "text-blue-500";

    toast(notification.title, {
      description: notification.message,
      icon: <Icon className={`h-5 w-5 ${colorClass}`} />,
      action: notification.link
        ? {
            label: "View",
            onClick: () => {
              window.location.href = notification.link;
            },
          }
        : undefined,
      duration: 5000,
    });
  }, []);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback(
    (payload) => {
      if (payload.eventType === "INSERT") {
        setNotifications((prev) => [payload.new, ...prev].slice(0, 50));
        if (!payload.new.is_read) {
          setUnreadCount((prev) => prev + 1);
          // Show toast for new notification
          showNotificationToast(payload.new);
        }
      } else if (payload.eventType === "UPDATE") {
        setNotifications((prev) =>
          prev.map((n) => (n.id === payload.new.id ? payload.new : n))
        );
        if (payload.old.is_read !== payload.new.is_read) {
          setUnreadCount((prev) =>
            payload.new.is_read ? Math.max(0, prev - 1) : prev + 1
          );
        }
      } else if (payload.eventType === "DELETE") {
        setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
        if (!payload.old.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    },
    [showNotificationToast]
  );

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) {
      setIsConnected(false);
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchNotifications();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [user?.id, supabase, fetchNotifications, handleRealtimeUpdate]);

  // Mark a single notification as read
  const markAsRead = useCallback(
    async (notificationId) => {
      if (!user?.id) return { error: "Not authenticated" };

      try {
        const { error } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notificationId)
          .eq("user_id", user.id);

        if (error) throw error;

        // Optimistic UI update - update local state immediately
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        return { error: null };
      } catch (error) {
        console.error("Error marking notification as read:", error);
        return { error };
      }
    },
    [user?.id, supabase]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return { error: "Not authenticated" };

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      // Optimistic UI update - update local state immediately
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);

      return { error: null };
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return { error };
    }
  }, [user?.id, supabase]);

  // Delete a notification
  const deleteNotification = useCallback(
    async (notificationId) => {
      if (!user?.id) return { error: "Not authenticated" };

      try {
        // Find the notification to check if it was unread before deleting
        const notification = notifications.find((n) => n.id === notificationId);

        const { error } = await supabase
          .from("notifications")
          .delete()
          .eq("id", notificationId)
          .eq("user_id", user.id);

        if (error) throw error;

        // Optimistic UI update - update local state immediately
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        if (notification && !notification.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        return { error: null };
      } catch (error) {
        console.error("Error deleting notification:", error);
        return { error };
      }
    },
    [user?.id, supabase, notifications]
  );

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    if (!user?.id) return { error: "Not authenticated" };

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      // Optimistic UI update - update local state immediately
      setNotifications([]);
      setUnreadCount(0);

      return { error: null };
    } catch (error) {
      console.error("Error clearing notifications:", error);
      return { error };
    }
  }, [user?.id, supabase]);

  // Add a local notification (for optimistic updates or client-side notifications)
  const addLocalNotification = useCallback(
    (notification) => {
      const newNotification = {
        id: `local-${Date.now()}`,
        user_id: user?.id,
        title: notification.title,
        message: notification.message,
        type: notification.type || "info",
        link: notification.link,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);

      if (notification.showToast !== false) {
        showNotificationToast(newNotification);
      }

      return newNotification;
    },
    [user?.id, showNotificationToast]
  );

  // Refresh notifications
  const refresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const value = useMemo(
    () => ({
      // State
      notifications,
      unreadCount,
      loading,
      isConnected,

      // Actions
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      addLocalNotification,
      refresh,

      // Computed
      hasUnread: unreadCount > 0,
      recentNotifications: notifications.slice(0, 5),
      unreadNotifications: notifications.filter((n) => !n.is_read),
    }),
    [
      notifications,
      unreadCount,
      loading,
      isConnected,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      addLocalNotification,
      refresh,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification context
 * @returns {Object} Notification context value
 * @throws {Error} If used outside of NotificationProvider
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}

/**
 * Hook to safely access notification context (returns null if not in provider)
 * @returns {Object|null} Notification context value or null
 */
export function useNotificationsSafe() {
  return useContext(NotificationContext);
}

export default NotificationContext;
