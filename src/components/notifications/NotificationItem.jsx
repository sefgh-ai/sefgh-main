"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Check,
  Bookmark,
  CheckCircle2,
  Trash2,
  ExternalLink,
  MoreHorizontal,
  Bell,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  GitPullRequest,
  MessageSquare,
  Star,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Icon mapping for notification types
const typeIcons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
  pr: GitPullRequest,
  comment: MessageSquare,
  star: Star,
  update: Zap,
};

// Badge styles for different notification types
const typeBadgeStyles = {
  success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  error: "bg-red-500/10 text-red-500 border-red-500/20",
  info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

/**
 * Individual notification item component (GitHub-inspired design)
 */
export const NotificationItem = React.memo(function NotificationItem({
  notification,
  selectedIds,
  setSelectedIds,
  savedIds,
  doneIds,
  markAsRead,
  toggleSaved,
  toggleDone,
  deleteNotification,
  formatTimestamp,
}) {
  const router = useRouter();
  const isSelected = selectedIds.includes(notification.id);
  const isSaved = savedIds.includes(notification.id);
  const isDone = doneIds.includes(notification.id);
  const Icon = typeIcons[notification.type] || Bell;

  const handleClick = (e) => {
    // Don't navigate if clicking on checkbox or action buttons
    if (e.target.closest('button') || e.target.closest('[role="checkbox"]')) {
      return;
    }
    
    // Mark as read on click
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Navigate if link exists
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleCheckboxChange = (checked) => {
    if (checked) {
      setSelectedIds([...selectedIds, notification.id]);
    } else {
      setSelectedIds(selectedIds.filter((id) => id !== notification.id));
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer",
        "hover:bg-muted/50",
        isSelected && "bg-primary/5",
        !notification.is_read && "bg-primary/5"
      )}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
      )}

      {/* Checkbox */}
      <div className="flex-shrink-0 pt-0.5">
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
          className="border-muted-foreground/50"
        />
      </div>

      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
          typeBadgeStyles[notification.type] || "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-muted-foreground font-medium">
              SEFGH
            </span>
            {notification.type && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4 font-normal capitalize",
                  typeBadgeStyles[notification.type]
                )}
              >
                {notification.type}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatTimestamp(notification.created_at)}
          </span>
        </div>

        {/* Title */}
        <h3 className={cn(
          "text-sm leading-tight",
          !notification.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80"
        )}>
          {notification.title}
        </h3>

        {/* Message */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {notification.message}
        </p>

        {/* Status indicators */}
        <div className="flex items-center gap-2 pt-1">
          {isSaved && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              <Bookmark className="h-3 w-3 mr-1 fill-current" />
              Saved
            </Badge>
          )}
          {isDone && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-green-500/10 text-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Done
            </Badge>
          )}
        </div>
      </div>

      {/* Actions (show on hover) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider delayDuration={0}>
          {!notification.is_read && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notification.id);
                  }}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Mark as read</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSaved(notification.id);
                }}
                className="h-8 w-8 p-0 hover:bg-muted"
              >
                <Bookmark
                  className={cn(
                    "h-4 w-4",
                    isSaved && "fill-current text-primary"
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isSaved ? "Unsave" : "Save"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDone(notification.id);
                }}
                className="h-8 w-8 p-0 hover:bg-muted"
              >
                <CheckCircle2
                  className={cn(
                    "h-4 w-4",
                    isDone && "fill-current text-green-500"
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isDone ? "Unmark done" : "Mark as done"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Delete</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Avatar placeholder for visual balance */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Avatar className="h-6 w-6 bg-primary/10">
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            SE
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
});
