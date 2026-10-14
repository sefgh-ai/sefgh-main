"use client";

import React, { useState } from "react";
import {
  Monitor,
  Smartphone,
  Globe,
  Clock,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// PLACEHOLDER, NOT REAL SESSIONS. Every user sees these, and "terminate"
// ends nothing. Recorded as bug register R-049; what this tab should show
// is the owner's choice. Kept unchanged here, only moved out of an effect.
const PLACEHOLDER_CURRENT_SESSION = {
  id: "current",
  device: "Windows Desktop",
  browser: "Chrome 120",
  city: "Hyderabad",
  region: "Telangana",
  country: "India",
  timezone: "Asia/Kolkata",
  ip: "2405:201:****:****",
  lastActive: "Now",
  isCurrent: true,
};
const PLACEHOLDER_OTHER_SESSIONS = [
  {
    id: "1",
    device: "iPhone 15",
    browser: "Safari",
    city: "Hyderabad",
    country: "India",
    lastActive: "2 hours ago",
    isCurrent: false,
  },
];

export default function SessionsTab() {
  const currentSession = PLACEHOLDER_CURRENT_SESSION;
  const [sessions, setSessions] = useState(PLACEHOLDER_OTHER_SESSIONS);

  const handleTerminateSession = (sessionId) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    toast.success("Session terminated");
  };

  const getDeviceIcon = (device) => {
    if (
      device.toLowerCase().includes("iphone") ||
      device.toLowerCase().includes("android") ||
      device.toLowerCase().includes("mobile")
    ) {
      return Smartphone;
    }
    return Monitor;
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Current Session */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold">Current Session</h3>
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </Badge>
        </div>

        {currentSession && (
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
            {/* Visual Header */}
            <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgMjAgMTAgTSAxMCAwIEwgMTAgMjAiIHN0cm9rZT0icmdiYSgxMDAsMTAwLDEwMCwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />
              <div className="relative flex items-center gap-3">
                <div className="p-3 rounded-xl bg-background/80 backdrop-blur shadow-lg">
                  <Monitor className="w-8 h-8 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">
                    {currentSession.device}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentSession.browser}
                  </p>
                </div>
              </div>
            </div>

            {/* Session Details */}
            <div className="p-6 bg-background/50 backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {currentSession.city}, {currentSession.country}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Last Active</p>
                    <p className="text-sm text-muted-foreground">
                      {currentSession.lastActive}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Timezone</p>
                    <p className="text-sm text-muted-foreground">
                      {currentSession.timezone}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Monitor className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">IP Address</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {currentSession.ip}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Other Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Other Sessions</h3>
          <span className="text-sm text-muted-foreground">
            {sessions.length} device{sessions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {sessions.length > 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden divide-y divide-border/30">
            {sessions.map((session) => {
              const DeviceIcon = getDeviceIcon(session.device);
              return (
                <div
                  key={session.id}
                  className="p-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-muted/50">
                      <DeviceIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{session.device}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {session.browser}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {session.city}, {session.country}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {session.lastActive}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTerminateSession(session.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Terminate
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-muted/30 border border-dashed border-border/50 text-center">
            <Smartphone className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              No other sessions
            </p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              You&apos;re only signed in on this device. When you sign in from other
              devices, they&apos;ll appear here.
            </p>
          </div>
        )}
      </div>

      {/* Security Tip */}
      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-sm">
        <p className="text-amber-600 dark:text-amber-400">
          <strong>🔐 Security Tip:</strong> Don&apos;t recognize a session? Terminate
          it immediately and consider changing your password in the Security
          settings.
        </p>
      </div>
    </div>
  );
}
