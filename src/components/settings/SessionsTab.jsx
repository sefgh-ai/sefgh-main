"use client";

import React, { useMemo, useState } from "react";
import {
  MonitorIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  GlobeIcon,
  ClockIcon,
  KeyIcon,
  CheckCircleIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBrowserValue } from "@/hooks/useBrowser";
import { describeUserAgent } from "@/lib/utils/userAgent";

// Only what can really be known (bug register R-049, the owner's choice of
// 2026-10-14). This device is described from what the browser reports;
// Supabase reports how the account signs in and when it last did. A browser
// cannot list the account's other sessions, so none are invented: there is
// one action instead, "sign out everywhere".

const PROVIDER_NAMES = { github: "GitHub", google: "Google", email: "Email and password" };

const DEVICE_ICONS = { phone: DeviceMobileIcon, tablet: DeviceTabletIcon, computer: MonitorIcon };
const DEVICE_NAMES = { phone: "Phone", tablet: "Tablet", computer: "Computer" };

function lastSignIn(timestamp) {
  if (!timestamp) return "Not known";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Not known";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function SessionsTab() {
  const { user, signOut } = useAuth();
  // Empty on the server and while the page hydrates; the browser's own after.
  const userAgent = useBrowserValue(() => navigator.userAgent, "");
  const timeZone = useBrowserValue(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "", "");
  const device = useMemo(() => describeUserAgent(userAgent), [userAgent]);
  const DeviceIcon = DEVICE_ICONS[device.kind];

  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const provider = user?.app_metadata?.provider;
  const signInMethod = PROVIDER_NAMES[provider] ?? (provider ? provider : "Not known");

  const signOutEverywhere = async () => {
    setSigningOut(true);
    try {
      // Ends every session of this account, on every device, this one too.
      await signOut({ scope: "global" });
    } catch {
      toast.error("Could not sign out everywhere", { description: "Nothing was changed. Please try again." });
      setSigningOut(false);
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* This device */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold">This device</h3>
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Signed in
          </Badge>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-background/80 backdrop-blur shadow-lg">
                <DeviceIcon className="w-8 h-8 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">
                  {userAgent ? `${DEVICE_NAMES[device.kind]} · ${device.system}` : "This device"}
                </p>
                <p className="text-sm text-muted-foreground min-h-5">{userAgent && device.browser}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-background/50 backdrop-blur-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <KeyIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Signs in with</p>
                  <p className="text-sm text-muted-foreground">{signInMethod}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ClockIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Last sign-in, on any device</p>
                  <p className="text-sm text-muted-foreground">{lastSignIn(user?.last_sign_in_at)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GlobeIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Time zone of this device</p>
                  <p className="text-sm text-muted-foreground">{timeZone || "Not known"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Every device */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Every device</h3>
        <p className="text-sm text-muted-foreground mb-4">
          SEFGH cannot list the other devices where you are signed in. If you
          think someone else is using your account, sign out everywhere, then
          change your password in the Security settings.
        </p>

        {confirming ? (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3">
            <p className="text-sm">
              This signs you out on every device, including this one. You will
              need to sign in again.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={signOutEverywhere} disabled={signingOut}>
                <SignOutIcon className="w-4 h-4 mr-2" />
                {signingOut ? "Signing out..." : "Sign out everywhere"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={signingOut}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setConfirming(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <SignOutIcon className="w-4 h-4 mr-2" />
            Sign out everywhere
          </Button>
        )}
      </div>
    </div>
  );
}
