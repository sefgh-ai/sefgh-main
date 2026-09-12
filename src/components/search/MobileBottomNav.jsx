"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Search,
  Send,
  ChartNoAxesCombined,
  Star,
  Clock,
  Settings,
  Upload,
  Key,
  MoreHorizontal,
  X,
  Lock,
  User,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function MobileBottomNav({ user }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();

  const handleSignOut = useCallback(async () => {
    try {
      const userName =
        user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

      await signOut();
      setOpen(false);

      toast.success(`Goodbye, ${userName}! 👋`, {
        description: "You've been signed out successfully. Come back soon!",
        duration: 3000,
      });
    } catch (error) {
      console.error("[MobileBottomNav] Sign out error:", error);
      toast.error("Sign out failed", {
        description: error.message,
      });
    }
  }, [user, signOut]);

  const getUserInitials = useCallback(() => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(" ");
      return names
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  }, [user]);

  // Primary nav items (always visible)
  const primaryItems = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/search", icon: Search, label: "Search" },
    { href: "/chat", icon: Send, label: "Chat" },
    { href: "/trending", icon: ChartNoAxesCombined, label: "Trending" },
  ];

  // Secondary items (in dropdown) - only for logged in users
  const secondaryItems = user
    ? [
        { href: "/starred", icon: Star, label: "Starred" },
        { href: "/history", icon: Clock, label: "History" },
        { href: "/playground", icon: Key, label: "Playground" },
        { href: "/submissions", icon: Upload, label: "Submissions" },
        { href: "/settings", icon: Settings, label: "Settings" },
      ]
    : [];

  const isActiveInSecondary = secondaryItems.some(
    (item) => item.href === pathname
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {primaryItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                className={cn("h-5 w-5", isActive && "text-primary")}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* More dropdown */}
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActiveInSecondary || open
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {open ? (
                <X className="h-5 w-5" />
              ) : (
                <MoreHorizontal className="h-5 w-5" />
              )}
              <span className="text-[10px] font-medium">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            sideOffset={16}
            className="w-56 mb-2 mr-2"
          >
            {/* User Profile Section */}
            {user ? (
              <>
                <DropdownMenuLabel className="p-0">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 p-3 hover:bg-muted rounded-t-md transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={user?.user_metadata?.avatar_url}
                        alt={user?.email}
                        crossOrigin="anonymous"
                      />
                      <AvatarFallback className="text-sm">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">
                        {user?.user_metadata?.full_name || "User"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </span>
                    </div>
                  </Link>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            ) : (
              <DropdownMenuItem asChild>
                <Link
                  href="/login"
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setOpen(false)}
                >
                  <Lock className="h-4 w-4" />
                  <span>Sign In</span>
                </Link>
              </DropdownMenuItem>
            )}

            {/* Navigation Items */}
            {secondaryItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 cursor-pointer",
                    pathname === item.href && "text-primary"
                  )}
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </DropdownMenuItem>
            ))}

            {/* Logout for logged in users */}
            {user && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive cursor-pointer focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
