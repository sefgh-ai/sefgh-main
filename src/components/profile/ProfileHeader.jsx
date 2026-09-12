"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Shield } from "lucide-react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { formatDate } from "@/lib/utils/profile/profileHelpers";

/**
 * Profile header component with avatar and user info
 * @param {Object} props
 * @param {Object} props.user - Current user object
 * @param {string} props.avatarUrl - Current avatar URL
 * @param {string} props.userInitials - User initials for fallback
 * @param {Function} props.onAvatarUpload - Callback when avatar is uploaded
 */
const ProfileHeader = React.memo(
  ({ user, avatarUrl, userInitials, onAvatarUpload }) => {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <AvatarUpload
              currentAvatarUrl={avatarUrl || user?.user_metadata?.avatar_url}
              userInitials={userInitials}
              onUploadSuccess={onAvatarUpload}
            />
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">
                {user?.user_metadata?.full_name || "User Profile"}
              </h1>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined {formatDate(user?.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{user?.role || "user"}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

ProfileHeader.displayName = "ProfileHeader";

export default ProfileHeader;
