"use client";

import { Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { PageLoadingSpinner } from "@/components/shared/LoadingSpinner";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { NotificationSidebar } from "@/components/notifications/NotificationSidebar";
import { NotificationTopBar } from "@/components/notifications/NotificationTopBar";
import { NotificationList } from "@/components/notifications/NotificationList";
import { NotificationMobileHeader } from "@/components/notifications/NotificationMobileHeader";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { useNotificationFilters } from "@/hooks/notifications/useNotificationFilters";
import { formatTimestamp } from "@/lib/utils/notifications/notificationHelpers";

function NotificationsContent() {
  const { user, loading } = useAuth();
  const { isAuthenticated, isLoading } = useAuthGuard();
  const {
    filter,
    setFilter,
    readFilter,
    setReadFilter,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    groupBy,
    setGroupBy,
  } = useNotificationFilters();

  const {
    notifications,
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
  } = useNotifications(user, filter, readFilter, searchQuery, typeFilter);

  if (isLoading || !isAuthenticated) {
    return <PageLoadingSpinner message="Loading notifications..." />;
  }

  const savedCount = savedIds.length;
  const doneCount = doneIds.length;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar - Desktop only */}
      <NotificationSidebar
        filter={filter}
        setFilter={setFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        inboxCount={inboxCount}
        savedCount={savedCount}
        doneCount={doneCount}
        typeCounts={typeCounts}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <NotificationMobileHeader
          filter={filter}
          setFilter={setFilter}
          inboxCount={inboxCount}
          savedCount={savedCount}
          doneCount={doneCount}
        />

        {/* Top Bar */}
        <NotificationTopBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          notifications={notifications}
          unreadCount={unreadCount}
          readFilter={readFilter}
          setReadFilter={setReadFilter}
          handleBulkAction={handleBulkAction}
          markAllAsRead={markAllAsRead}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          selectAll={selectAll}
          isAllSelected={isAllSelected}
        />

        {/* Notifications List */}
        <div className="flex-1 overflow-auto">
          <NotificationList
            loadingNotifications={loadingNotifications}
            notifications={notifications}
            filter={filter}
            searchQuery={searchQuery}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            savedIds={savedIds}
            doneIds={doneIds}
            markAsRead={markAsRead}
            toggleSaved={toggleSaved}
            toggleDone={toggleDone}
            deleteNotification={deleteNotification}
            formatTimestamp={formatTimestamp}
            groupBy={groupBy}
          />
        </div>
      </div>
    </div>
  );
}

// Wrap the page with Suspense and Error boundary
export default function NotificationsPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={<PageLoadingSpinner message="Loading notifications..." />}
      >
        <NotificationsContent />
      </Suspense>
    </ErrorBoundary>
  );
}
