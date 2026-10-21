"use client";

import React, { useState } from "react";
import {
  LogOut,
  Shield,
  Key,
  Smartphone,
  Globe,
  AlertTriangle,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function SecurityTab() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showLogoutAllDialog, setShowLogoutAllDialog] = useState(false);

  const handleMfaToggle = (checked) => {
    if (checked) {
      toast.info("Two-factor authentication setup coming soon!");
    } else {
      if (
        window.confirm(
          "Are you sure you want to disable two-factor authentication?"
        )
      ) {
        setMfaEnabled(false);
        toast.success("Two-factor authentication disabled");
      }
    }
  };

  const handleLogout = () => {
    toast.success("Logged out successfully");
  };

  const handleLogoutAll = () => {
    setShowLogoutAllDialog(false);
    toast.success("Logged out of all devices");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Security Overview */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-green-500/5 to-emerald-500/5 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-500/10 flex-shrink-0">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Security Status</h3>
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                Good
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Your account is secure. Enable 2FA for additional protection.
            </p>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="p-6 border-b border-border/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                  Add an extra layer of security to your SEFGH account. You&apos;ll
                  need to enter a code from your authenticator app when signing
                  in.
                </p>
              </div>
            </div>
            <Switch
              checked={mfaEnabled}
              onCheckedChange={handleMfaToggle}
              aria-label="Enable Two-Factor Authentication"
            />
          </div>
        </div>

        {mfaEnabled && (
          <div className="px-6 py-4 bg-muted/30">
            <div className="flex items-center gap-2 text-sm">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Authenticator app configured
              </span>
              <Badge variant="outline" className="ml-auto">
                Active
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Session Management */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="p-6 border-b border-border/30">
          <h3 className="text-lg font-semibold mb-1">Session Management</h3>
          <p className="text-sm text-muted-foreground">
            Control your active sessions across devices
          </p>
        </div>

        {/* Log out current device */}
        <div className="flex items-center justify-between p-6 border-b border-border/30 hover:bg-muted/20 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-muted/50">
              <Globe className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Sign out of this device</h4>
              <p className="text-xs text-muted-foreground">
                End your current session
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign out
            <LogOut className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Log out all devices */}
        <div className="p-6 hover:bg-muted/20 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Sign out everywhere</h4>
                <p className="text-xs text-muted-foreground max-w-md mt-1">
                  End all active sessions across all devices. You&apos;ll need to
                  sign in again on each device.
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowLogoutAllDialog(true)}
            >
              Sign out all
              <LogOut className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Connected Apps */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-lg font-semibold mb-2">Connected Applications</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Manage third-party apps that have access to your SEFGH account.
        </p>

        <div className="p-8 bg-muted/30 border border-dashed border-border/50 rounded-xl text-center">
          <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            No third-party applications are connected to your account. When you
            authorize apps, they&apos;ll appear here.
          </p>
        </div>
      </div>

      {/* Logout All Dialog */}
      <AlertDialog
        open={showLogoutAllDialog}
        onOpenChange={setShowLogoutAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Sign out of all devices?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will end all active sessions including your current one.
              You&apos;ll need to sign in again on all devices. This may take up to
              30 minutes to complete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign out everywhere
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
