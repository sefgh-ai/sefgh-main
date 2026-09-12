"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  CheckCheck,
  Trash2,
  Search,
  CheckCircle2,
  X,
  ChevronDown,
  Bookmark,
  MoreHorizontal,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationTopBar({
  searchQuery,
  setSearchQuery,
  selectedIds,
  setSelectedIds,
  notifications = [],
  unreadCount,
  readFilter,
  setReadFilter,
  handleBulkAction,
  markAllAsRead,
  groupBy,
  setGroupBy,
  selectAll,
  isAllSelected,
}) {
  const hasSelection = selectedIds.length > 0;

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      {/* Tabs Row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-1">
          <TabButton
            active={readFilter === "all"}
            onClick={() => setReadFilter("all")}
          >
            All
          </TabButton>
          <TabButton
            active={readFilter === "unread"}
            onClick={() => setReadFilter("unread")}
            badge={unreadCount}
          >
            Unread
          </TabButton>
        </div>

        {/* Group By Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Group by: <span className="text-foreground ml-1 capitalize">{groupBy || "Date"}</span>
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setGroupBy("date")}>
              Date
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGroupBy("type")}>
              Type
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGroupBy("none")}>
              None
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search and Actions Row */}
      <div className="flex items-center gap-3 px-4 pb-3">
        {/* Search */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-transparent focus:border-border focus:bg-background"
          />
        </div>

        {/* Bulk Actions when selected */}
        {hasSelection ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction("read")}
                className="h-8"
              >
                <Check className="h-4 w-4 mr-1.5" />
                Mark read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction("save")}
                className="h-8"
              >
                <Bookmark className="h-4 w-4 mr-1.5" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction("done")}
                className="h-8"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Done
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction("delete")}
                className="h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="h-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="h-8"
              >
                <CheckCheck className="h-4 w-4 mr-1.5" />
                Mark all read
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => selectAll?.()}>
                  Select all
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={markAllAsRead}>
                  Mark all as read
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Select All Row */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-border/50 bg-muted/30">
        <Checkbox
          checked={isAllSelected && notifications.length > 0}
          onCheckedChange={(checked) => {
            if (checked) {
              selectAll?.();
            } else {
              setSelectedIds([]);
            }
          }}
          disabled={notifications.length === 0}
        />
        <span className="text-sm text-muted-foreground">
          {hasSelection
            ? `${selectedIds.length} of ${notifications.length} selected`
            : "Select all"}
        </span>
      </div>
    </div>
  );
}

function TabButton({ children, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      {children}
      {badge > 0 && (
        <Badge
          variant="secondary"
          className={cn(
            "ml-1.5 h-5 min-w-5 px-1.5 text-xs",
            active && "bg-primary/20 text-primary"
          )}
        >
          {badge > 99 ? "99+" : badge}
        </Badge>
      )}
    </button>
  );
}
