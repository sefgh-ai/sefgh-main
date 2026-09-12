"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Inbox,
  Bookmark,
  CheckCircle2,
  Bell,
  Menu,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationMobileHeader({
  filter,
  setFilter,
  inboxCount,
  savedCount,
  doneCount,
}) {
  const router = useRouter();

  const filterLabels = {
    inbox: "Inbox",
    saved: "Saved",
    done: "Done",
  };

  return (
    <div className="md:hidden border-b border-border bg-background/95 backdrop-blur sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="-ml-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Title */}
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">{filterLabels[filter]}</h1>
          {filter === "inbox" && inboxCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {inboxCount}
            </Badge>
          )}
        </div>

        {/* Menu Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="-mr-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-1">
              <MobileFilterButton
                icon={Inbox}
                label="Inbox"
                count={inboxCount}
                active={filter === "inbox"}
                onClick={() => setFilter("inbox")}
              />
              <MobileFilterButton
                icon={Bookmark}
                label="Saved"
                count={savedCount}
                active={filter === "saved"}
                onClick={() => setFilter("saved")}
              />
              <MobileFilterButton
                icon={CheckCircle2}
                label="Done"
                count={doneCount}
                active={filter === "done"}
                onClick={() => setFilter("done")}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function MobileFilterButton({ icon: Icon, label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
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
