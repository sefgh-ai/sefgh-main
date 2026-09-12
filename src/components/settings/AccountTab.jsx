"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  ExternalLink,
  Github,
  Mail,
  Calendar,
  CheckCircle2,
  Crown,
  Zap,
  Search,
  Star,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityLogger } from "@/lib/activity-logger";

export default function AccountTab() {
  const router = useRouter();
  const { user } = useAuth();
  const [userId, setUserId] = useState("");
  const [githubUsername, setGithubUsername] = useState("");

  useEffect(() => {
    if (user) {
      setUserId(user.id || "");

      const username =
        user.user_metadata?.github_username ||
        user.user_metadata?.user_name ||
        user.identities?.find((id) => id.provider === "github")?.identity_data
          ?.user_name ||
        "";

      setGithubUsername(username);
      ActivityLogger.settingsView();
    }
  }, [user]);

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(userId);
    toast.success("User ID copied to clipboard");
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(" ");
      return names
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || "S";
  };

  const getAccountAge = () => {
    if (user?.created_at) {
      const created = new Date(user.created_at);
      const now = new Date();
      const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      if (diffDays < 30) return `${diffDays} days`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
      return `${Math.floor(diffDays / 365)} years`;
    }
    return "N/A";
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Profile Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="relative p-6">
          <div className="flex items-center gap-5">
            <Avatar className="w-20 h-20 ring-4 ring-background shadow-xl">
              <AvatarImage
                src={user?.user_metadata?.avatar_url}
                alt={user?.email}
                crossOrigin="anonymous"
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-2xl font-bold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-semibold truncate">
                  {user?.user_metadata?.full_name || "SEFGH User"}
                </h3>
                <Badge
                  variant="secondary"
                  className="bg-green-500/10 text-green-600 border-green-500/20"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {user?.email || "email@example.com"}
              </p>
              {githubUsername && (
                <p className="text-sm text-muted-foreground truncate flex items-center gap-2 mt-1">
                  <Github className="w-4 h-4" />@{githubUsername}
                </p>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => router.push("/profile")}
              className="flex-shrink-0"
            >
              Edit Profile
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* SEFGH Pro Upgrade Card */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-yellow-500/5">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="relative p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex-shrink-0">
                <Crown className="w-6 h-6 text-amber-500" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold truncate flex items-center gap-2">
                  Upgrade to SEFGH Pro
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                    NEW
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  Unlimited AI searches, advanced filters & priority support
                </p>
              </div>
            </div>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white flex-shrink-0 shadow-lg shadow-amber-500/25">
              <Zap className="w-4 h-4 mr-2" />
              Upgrade
            </Button>
          </div>

          {/* Pro Features */}
          <div className="mt-4 pt-4 border-t border-amber-500/10 grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="w-4 h-4 text-amber-500" />
              <span>Unlimited AI Searches</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="w-4 h-4 text-amber-500" />
              <span>Priority Support</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>Advanced Analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Connection Card */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 rounded-xl bg-muted/50 flex-shrink-0">
              <Github className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold truncate">
                GitHub Account
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {githubUsername
                  ? `Connected as @${githubUsername}`
                  : "Connect for personalized recommendations"}
              </p>
            </div>
          </div>
          <Badge
            variant={githubUsername ? "default" : "outline"}
            className={
              githubUsername
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : ""
            }
          >
            {githubUsername ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Connected
              </>
            ) : (
              "Not Connected"
            )}
          </Badge>
        </div>
      </div>

      {/* Account Info */}
      <div className="rounded-2xl border border-border/50 bg-muted/20 p-6 space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Account Details
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-background border border-border/30">
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Member Since
            </p>
            <p className="text-sm font-semibold">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })
                : "N/A"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-background border border-border/30">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Account Age
            </p>
            <p className="text-sm font-semibold">{getAccountAge()}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-background border border-border/30">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                User ID
              </p>
              <p className="text-xs font-mono text-foreground/80 select-all break-all leading-relaxed">
                {userId}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyUserId}
              className="flex-shrink-0 h-8 w-8 p-0"
              aria-label="Copy User ID"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
