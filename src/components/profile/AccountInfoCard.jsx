"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils/profile/profileHelpers";

/**
 * Account information card component
 * @param {Object} props
 * @param {Object} props.user - Current user object
 */
const AccountInfoCard = React.memo(({ user }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
        <CardDescription>Your account details and statistics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Account ID</span>
            <span className="text-sm font-mono">
              {user?.id?.slice(0, 8)}...
            </span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Email Verified
            </span>
            <span className="text-sm">
              {user?.email_confirmed_at ? (
                <span className="text-green-600 dark:text-green-400">
                  ✓ Verified
                </span>
              ) : (
                <span className="text-yellow-600 dark:text-yellow-400">
                  ⚠ Not Verified
                </span>
              )}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Last Sign In</span>
            <span className="text-sm">{formatDate(user?.last_sign_in_at)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Authentication
            </span>
            <span className="text-sm capitalize">
              {user?.app_metadata?.provider || "email"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

AccountInfoCard.displayName = "AccountInfoCard";

export default AccountInfoCard;
