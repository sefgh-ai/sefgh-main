"use client";

import Link from "next/link";
import {
  MoonIcon,
  SunIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { toast } from "sonner";
import { useCallback, memo, useState } from "react";

const Header = memo(function Header({ showProfileDropdown = true }) {
  const { setTheme, theme } = useTheme();
  const { user, signOut, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = useCallback(async () => {
    try {
      const userName =
        user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

      console.log("[Header] Signing out user:", userName);
      await signOut();
      console.log("[Header] Sign out successful");

      toast.success(`Goodbye, ${userName}! 👋`, {
        description: "You've been signed out successfully. Come back soon!",
        duration: 3000,
      });
    } catch (error) {
      console.error("[Header] Sign out error:", error);
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

  if (loading) {
    return (
      <>
        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
      </>
    );
  }

  return (
    <>
      {!user ? (
        <>
          <Link href="/login">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Login/Signup</span>
              <span className="sm:hidden">Login</span>
            </Button>
          </Link>
        </>
      ) : (
        <>
          {/* Notification Bell */}
          <NotificationBell />

          {/* Profile Dropdown - conditionally rendered - Desktop Only (hidden on mobile) */}
          {showProfileDropdown && (
            <div
              className="hidden md:block"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar
                      className="h-8 w-8"
                      key={user?.user_metadata?.avatar_url}
                    >
                      <AvatarImage
                        src={user?.user_metadata?.avatar_url}
                        alt={user?.email}
                        crossOrigin="anonymous"
                      />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.user_metadata?.full_name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem>
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      <Cog6ToothIcon className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      handleSignOut();
                    }}
                    className="text-destructive cursor-pointer"
                  >
                    <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </>
      )}

      <div className="ml-1 sm:ml-2 pl-1 sm:pl-2 border-l">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="h-8 w-8 sm:h-9 sm:w-9"
        >
          <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </>
  );
});

export { Header };
