"use client";

import { Bell, Inbox } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotificationItem } from "./NotificationItem";
import { cn } from "@/lib/utils";

/**
 * Group notifications by date
 */
function groupByDate(notifications) {
  const groups = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);

  notifications.forEach((notification) => {
    const date = new Date(notification.created_at);
    date.setHours(0, 0, 0, 0);
    
    let groupKey;
    if (date.getTime() === today.getTime()) {
      groupKey = "Today";
    } else if (date.getTime() === yesterday.getTime()) {
      groupKey = "Yesterday";
    } else if (date > thisWeek) {
      groupKey = "This week";
    } else {
      groupKey = date.toLocaleDateString("en-US", { 
        month: "long", 
        year: "numeric" 
      });
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
  });

  return groups;
}

/**
 * Group notifications by type
 */
function groupByType(notifications) {
  const groups = {};
  const typeOrder = ["error", "warning", "success", "info"];
  
  notifications.forEach((notification) => {
    const type = notification.type || "info";
    const groupKey = type.charAt(0).toUpperCase() + type.slice(1);
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
  });

  // Sort groups by type priority
  const sortedGroups = {};
  typeOrder.forEach((type) => {
    const key = type.charAt(0).toUpperCase() + type.slice(1);
    if (groups[key]) {
      sortedGroups[key] = groups[key];
    }
  });

  return sortedGroups;
}

/**
 * Notification list component with loading and empty states
 */
export function NotificationList({
  loadingNotifications,
  notifications,
  filter = "inbox",
  searchQuery = "",
  selectedIds,
  setSelectedIds,
  savedIds,
  doneIds,
  markAsRead,
  toggleSaved,
  toggleDone,
  deleteNotification,
  formatTimestamp,
  groupBy = "date",
}) {
  if (loadingNotifications) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (notifications.length === 0) {
    const getEmptyStateContent = () => {
      if (searchQuery) {
        return {
          icon: <Bell className="h-12 w-12 text-muted-foreground/50" />,
          title: "No results found",
          description: "No notifications match your search. Try a different query.",
        };
      }
      if (filter === "saved") {
        return {
          icon: <Inbox className="h-12 w-12 text-muted-foreground/50" />,
          title: "No saved notifications",
          description: "Save important notifications to access them later.",
        };
      }
      if (filter === "done") {
        return {
          icon: <Inbox className="h-12 w-12 text-muted-foreground/50" />,
          title: "No completed notifications",
          description: "Mark notifications as done to keep your inbox clean.",
        };
      }
      return {
        icon: <Inbox className="h-12 w-12 text-muted-foreground/50" />,
        title: "All caught up!",
        description: "You have no new notifications. Check back later for updates.",
      };
    };

    const { icon, title, description } = getEmptyStateContent();

    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="mb-4 p-4 rounded-full bg-muted/50">
            {icon}
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    );
  }

  // Group notifications if groupBy is set
  if (groupBy && groupBy !== "none") {
    const groups = groupBy === "type" 
      ? groupByType(notifications) 
      : groupByDate(notifications);

    return (
      <div className="divide-y divide-border">
        {Object.entries(groups).map(([groupName, groupNotifications]) => (
          <div key={groupName}>
            {/* Group Header */}
            <div className="sticky top-[137px] z-[5] px-4 py-2 bg-muted/80 backdrop-blur-sm border-b border-border/50">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {groupName}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                ({groupNotifications.length})
              </span>
            </div>
            
            {/* Group Items */}
            <div className="divide-y divide-border/50">
              {groupNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  savedIds={savedIds}
                  doneIds={doneIds}
                  markAsRead={markAsRead}
                  toggleSaved={toggleSaved}
                  toggleDone={toggleDone}
                  deleteNotification={deleteNotification}
                  formatTimestamp={formatTimestamp}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // No grouping
  return (
    <div className="divide-y divide-border/50">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          savedIds={savedIds}
          doneIds={doneIds}
          markAsRead={markAsRead}
          toggleSaved={toggleSaved}
          toggleDone={toggleDone}
          deleteNotification={deleteNotification}
          formatTimestamp={formatTimestamp}
        />
      ))}
    </div>
  );
}
