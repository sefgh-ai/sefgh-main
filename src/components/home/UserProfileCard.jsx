"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Users, Code, Activity, LogOut } from "lucide-react";
import { useUserStats } from "@/hooks/useUserStats";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function UserProfileCard({ user, loading: authLoading }) {
  const router = useRouter();
  const { stats, loading: statsLoading } = useUserStats(user?.id);
  const { signOut } = useAuth();

  // Show skeleton only when:
  // 1. Auth is still loading (we don't know if there's a user yet)
  // 2. OR user exists but stats are still loading
  // Don't show skeleton when auth is done and there's no user
  const loading = authLoading || (user && statsLoading);

  const handleSignOut = async () => {
    try {
      const userName =
        user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
      await signOut();
      toast.success(`Goodbye, ${userName}! 👋`, {
        description: "You've been signed out successfully. Come back soon!",
        duration: 3000,
      });
    } catch (error) {
      toast.error("Sign out failed", {
        description: error.message,
      });
    }
  };

  // Format large numbers (e.g., 4400 -> 4.4k)
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num?.toString() || "0";
  };

  if (loading) {
    return (
      <Card className="glass-premium border-border backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted"></div>
              <div className="space-y-1.5">
                <div className="h-3.5 bg-muted rounded w-20"></div>
                <div className="h-2.5 bg-muted rounded w-14"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded w-full"></div>
              <div className="h-1.5 bg-muted rounded w-full"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </div>
            <div className="h-8 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="glass-premium border-border backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Sign in to see your profile
            </p>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs"
              size="sm"
              onClick={() => router.push("/login")}
            >
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use stats from DB or fallback defaults
  const level = stats?.level || 1;
  const title = stats?.title || "Newbie";
  const contributions = stats?.contributions || 0;
  const contributionsMax = stats?.contributions_max || 64;
  const followers = stats?.followers || 0;
  const projects = stats?.projects || 0;

  return (
    <Card className="glass-premium border-border backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm">
                {user.email?.[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm">
                {user.user_metadata?.full_name || "User"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Lv. {level} • {title}
              </p>
            </div>
          </div>

          {/* Stats - Compact inline layout */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Contributions
              </span>
              <span className="font-semibold text-green-500">
                {contributions}/{contributionsMax}
              </span>
            </div>
            <Progress
              value={(contributions / contributionsMax) * 100}
              className="h-1.5"
              indicatorClassName="bg-green-500"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Followers
              </span>
              <span className="font-semibold text-primary">
                {formatNumber(followers)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5" />
                Projects
              </span>
              <span className="font-semibold text-primary">
                {formatNumber(projects)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs"
              size="sm"
              onClick={() => router.push("/profile")}
            >
              View Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={handleSignOut}
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
