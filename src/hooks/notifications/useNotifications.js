import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  saveNotificationData,
  loadNotificationData,
} from "@/lib/utils/notifications/notificationHelpers";

export function useNotifications(
  user,
  filter,
  readFilter,
  searchQuery,
  typeFilter = null
) {
  const [allNotifications, setAllNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [doneIds, setDoneIds] = useState([]);
  const supabase = createClient();

  // Load saved state from localStorage
  useEffect(() => {
    if (user) {
      setSavedIds(loadNotificationData(user.id, "saved"));
      setDoneIds(loadNotificationData(user.id, "done"));
    }
  }, [user]);

  // Fetch notifications
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setAllNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Compute filtered notifications
  const notifications = useMemo(() => {
    let filtered = [...allNotifications];

    // Apply read filter
    if (readFilter === "unread") {
      filtered = filtered.filter((n) => !n.is_read);
    }

    // Apply category filter
    if (filter === "saved") {
      filtered = filtered.filter((n) => savedIds.includes(n.id));
    } else if (filter === "done") {
      filtered = filtered.filter((n) => doneIds.includes(n.id));
    } else {
      // Inbox - exclude done
      filtered = filtered.filter((n) => !doneIds.includes(n.id));
    }

    // Apply type filter
    if (typeFilter) {
      filtered = filtered.filter((n) => n.type === typeFilter);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title?.toLowerCase().includes(query) ||
          n.message?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [
    allNotifications,
    filter,
    readFilter,
    searchQuery,
    typeFilter,
    savedIds,
    doneIds,
  ]);

  // Compute counts
  const typeCounts = useMemo(() => {
    const counts = {
      success: 0,
      info: 0,
      warning: 0,
      error: 0,
    };

    const inboxNotifications = allNotifications.filter(
      (n) => !doneIds.includes(n.id)
    );
    inboxNotifications.forEach((n) => {
      if (n.type && counts[n.type] !== undefined) {
        counts[n.type]++;
      }
    });

    return counts;
  }, [allNotifications, doneIds]);

  const unreadCount = useMemo(() => {
    return allNotifications.filter((n) => !n.is_read && !doneIds.includes(n.id))
      .length;
  }, [allNotifications, doneIds]);

  const inboxCount = useMemo(() => {
    return allNotifications.filter((n) => !doneIds.includes(n.id)).length;
  }, [allNotifications, doneIds]);

  const markAsRead = async (notificationIds) => {
    const ids = Array.isArray(notificationIds)
      ? notificationIds
      : [notificationIds];
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", ids);

      if (error) throw error;

      setAllNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      setAllNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
      setSelectedIds((prev) => prev.filter((id) => id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const toggleSaved = (notificationId) => {
    const newSaved = savedIds.includes(notificationId)
      ? savedIds.filter((id) => id !== notificationId)
      : [...savedIds, notificationId];
    setSavedIds(newSaved);
    saveNotificationData(user.id, "saved", newSaved);
  };

  const toggleDone = (notificationId) => {
    const newDone = doneIds.includes(notificationId)
      ? doneIds.filter((id) => id !== notificationId)
      : [...doneIds, notificationId];
    setDoneIds(newDone);
    saveNotificationData(user.id, "done", newDone);

    // Auto mark as read when marking done
    if (!doneIds.includes(notificationId)) {
      markAsRead(notificationId);
    }
  };

  const handleBulkAction = (action) => {
    switch (action) {
      case "read":
        markAsRead(selectedIds);
        setSelectedIds([]);
        break;
      case "save":
        selectedIds.forEach((id) => {
          if (!savedIds.includes(id)) {
            toggleSaved(id);
          }
        });
        setSelectedIds([]);
        break;
      case "done":
        selectedIds.forEach((id) => {
          if (!doneIds.includes(id)) {
            toggleDone(id);
          }
        });
        setSelectedIds([]);
        break;
      case "delete":
        selectedIds.forEach((id) => deleteNotification(id));
        setSelectedIds([]);
        break;
    }
  };

  const selectAll = () => {
    setSelectedIds(notifications.map((n) => n.id));
  };

  const isAllSelected =
    notifications.length > 0 &&
    notifications.every((n) => selectedIds.includes(n.id));

  return {
    notifications,
    allNotifications,
    loadingNotifications,
    selectedIds,
    setSelectedIds,
    savedIds,
    doneIds,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    toggleSaved,
    toggleDone,
    handleBulkAction,
    selectAll,
    isAllSelected,
    unreadCount,
    inboxCount,
    typeCounts,
    refresh: fetchNotifications,
  };
}
