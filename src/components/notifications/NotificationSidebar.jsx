"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Inbox,
  Bookmark,
  CheckCircle2,
  Bell,
  AtSign,
  MessageSquare,
  Users,
  Eye,
  Filter,
  Plus,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const filterItems = [
  { id: "assigned", label: "Assigned", icon: AtSign, color: "text-orange-500" },
  { id: "participating", label: "Participating", icon: MessageSquare, color: "text-blue-500" },
  { id: "mentioned", label: "Mentioned", icon: AtSign, color: "text-purple-500" },
  { id: "team", label: "Team mentioned", icon: Users, color: "text-green-500" },
  { id: "review", label: "Review requested", icon: Eye, color: "text-yellow-500" },
];

export function NotificationSidebar({
  filter,
  setFilter,
  typeFilter,
  setTypeFilter,
  inboxCount,
  savedCount,
  doneCount,
  typeCounts = {},
}) {
  const router = useRouter();

  return (
    <aside className="hidden md:flex w-72 flex-col border-r border-border bg-card/50">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {/* Header */}
          <div className="flex items-center gap-2 px-2 py-3">
            <Bell className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Notifications</h1>
          </div>

          {/* Main Filters */}
          <nav className="space-y-1">
            <SidebarItem
              icon={Inbox}
              label="Inbox"
              count={inboxCount}
              active={filter === "inbox"}
              onClick={() => setFilter("inbox")}
            />
            <SidebarItem
              icon={Bookmark}
              label="Saved"
              count={savedCount}
              active={filter === "saved"}
              onClick={() => setFilter("saved")}
            />
            <SidebarItem
              icon={CheckCircle2}
              label="Done"
              count={doneCount}
              active={filter === "done"}
              onClick={() => setFilter("done")}
            />
          </nav>

          <Separator className="my-4" />

          {/* Filters Section */}
          <div className="px-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Filters
              </span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <nav className="space-y-1">
              {filterItems.map((item) => (
                <FilterItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  iconColor={item.color}
                  count={typeCounts[item.id] || 0}
                  active={typeFilter === item.id}
                  onClick={() => setTypeFilter(typeFilter === item.id ? null : item.id)}
                />
              ))}
            </nav>
          </div>

          <Separator className="my-4" />

          {/* Type Filters */}
          <div className="px-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              By Type
            </span>
            <nav className="mt-2 space-y-1">
              <TypeFilterItem
                label="Success"
                color="bg-emerald-500"
                count={typeCounts.success || 0}
                active={typeFilter === "success"}
                onClick={() => setTypeFilter(typeFilter === "success" ? null : "success")}
              />
              <TypeFilterItem
                label="Info"
                color="bg-blue-500"
                count={typeCounts.info || 0}
                active={typeFilter === "info"}
                onClick={() => setTypeFilter(typeFilter === "info" ? null : "info")}
              />
              <TypeFilterItem
                label="Warning"
                color="bg-yellow-500"
                count={typeCounts.warning || 0}
                active={typeFilter === "warning"}
                onClick={() => setTypeFilter(typeFilter === "warning" ? null : "warning")}
              />
              <TypeFilterItem
                label="Error"
                color="bg-red-500"
                count={typeCounts.error || 0}
                active={typeFilter === "error"}
                onClick={() => setTypeFilter(typeFilter === "error" ? null : "error")}
              />
            </nav>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
          <Filter className="h-4 w-4 mr-2" />
          Manage notifications
        </Button>
      </div>
    </aside>
  );
}

function SidebarItem({ icon: Icon, label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left">{label}</span>
      {count > 0 && (
        <Badge
          variant={active ? "default" : "secondary"}
          className={cn(
            "h-5 min-w-5 px-1.5 text-xs font-medium",
            active && "bg-primary text-primary-foreground"
          )}
        >
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </button>
  );
}

function FilterItem({ icon: Icon, label, iconColor, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4", iconColor)} />
      <span className="flex-1 text-left">{label}</span>
      {count > 0 && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  );
}

function TypeFilterItem({ label, color, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
      <span className="flex-1 text-left">{label}</span>
      {count > 0 && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  );
}
