"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Star,
  TrendingUp,
  Bell,
  Mail,
  Sparkles,
  MessageSquare,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";

const notificationSettings = [
  {
    id: "searchAlerts",
    title: "Search Alerts",
    description:
      "Get notified when new repositories match your saved searches.",
    icon: Search,
    defaultValue: true,
  },
  {
    id: "trendingRepos",
    title: "Trending Repositories",
    description:
      "Weekly digest of trending GitHub repos in your preferred languages.",
    icon: TrendingUp,
    defaultValue: true,
  },
  {
    id: "starredUpdates",
    title: "Starred Repository Updates",
    description:
      "Notifications when your starred repos have major releases or updates.",
    icon: Star,
    defaultValue: false,
  },
  {
    id: "aiInsights",
    title: "AI Insights",
    description:
      "Personalized recommendations based on your search patterns and interests.",
    icon: Sparkles,
    defaultValue: true,
  },
  {
    id: "communityUpdates",
    title: "Community Updates",
    description: "News about SEFGH features, tips, and community highlights.",
    icon: MessageSquare,
    defaultValue: false,
  },
  {
    id: "forkAlerts",
    title: "Fork & Clone Activity",
    description:
      "Track when repositories you follow are forked or gain traction.",
    icon: GitBranch,
    defaultValue: false,
  },
];

const deliveryMethods = [
  {
    id: "pushNotifications",
    title: "Push Notifications",
    description: "Receive real-time notifications in your browser",
    icon: Bell,
    defaultValue: true,
  },
  {
    id: "emailDigest",
    title: "Email Digest",
    description: "Get a weekly summary of your notifications via email",
    icon: Mail,
    defaultValue: true,
  },
];

export default function NotificationsTab() {
  const [settings, setSettings] = useState(() => {
    const initial = {};
    [...notificationSettings, ...deliveryMethods].forEach((s) => {
      initial[s.id] = s.defaultValue;
    });
    return initial;
  });

  const handleChange = (id, value) => {
    setSettings((prev) => ({ ...prev, [id]: value }));
    toast.success("Notification preference updated");
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Notification Types */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold">Notification Types</h3>
          <Badge variant="secondary" className="text-xs">
            6 options
          </Badge>
        </div>
        <div className="space-y-1 rounded-2xl border border-border/50 bg-card overflow-hidden">
          {notificationSettings.map((setting, idx) => {
            const Icon = setting.icon;
            return (
              <div
                key={setting.id}
                className={`flex items-center justify-between gap-4 p-5 transition-colors hover:bg-muted/30 ${
                  idx !== notificationSettings.length - 1
                    ? "border-b border-border/30"
                    : ""
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium mb-0.5">
                      {setting.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {setting.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings[setting.id]}
                  onCheckedChange={(value) => handleChange(setting.id, value)}
                  aria-label={`Toggle ${setting.title}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery Methods */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold">Delivery Methods</h3>
        </div>
        <div className="space-y-1 rounded-2xl border border-border/50 bg-card overflow-hidden">
          {deliveryMethods.map((method, idx) => {
            const Icon = method.icon;
            return (
              <div
                key={method.id}
                className={`flex items-center justify-between gap-4 p-5 transition-colors hover:bg-muted/30 ${
                  idx !== deliveryMethods.length - 1
                    ? "border-b border-border/30"
                    : ""
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-2 rounded-lg bg-muted/50 flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium mb-0.5">
                      {method.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {method.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings[method.id]}
                  onCheckedChange={(value) => handleChange(method.id, value)}
                  aria-label={`Toggle ${method.title}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-sm">
        <p className="text-blue-600 dark:text-blue-400">
          <strong>💡 Tip:</strong> Enable search alerts to never miss a new
          repository that matches your interests. You can customize alerts for
          each saved search in your{" "}
          <a href="/history" className="underline hover:no-underline">
            Search History
          </a>
          .
        </p>
      </div>
    </div>
  );
}
