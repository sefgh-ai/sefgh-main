"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { ActivityLogger } from "@/lib/activity-logger";
import UsageContributionsCard from "@/components/usage-contributions/UsageContributionsCard";
import { PageLoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useProfileData } from "@/hooks/profile/useProfileData";
import { getUserInitials } from "@/lib/utils/profile/profileHelpers";
import ProfileHeader from "@/components/profile/ProfileHeader";
import PersonalInfoForm from "@/components/profile/PersonalInfoForm";
import AccountInfoCard from "@/components/profile/AccountInfoCard";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthGuard();

  const {
    formData,
    loading,
    updateProfile,
    updateFormData,
    handleAvatarUpload,
  } = useProfileData(user, refreshUser);

  useEffect(() => {
    if (user) {
      ActivityLogger.profileView();
    }
  }, [user]);

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 gap-4">
          <div className="flex-1" />
          <Header />
        </div>
      </div>

      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <ProfileHeader
          user={user}
          avatarUrl={formData.avatarUrl}
          userInitials={getUserInitials(user)}
          onAvatarUpload={handleAvatarUpload}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <PersonalInfoForm
            formData={formData}
            onChange={updateFormData}
            onSubmit={updateProfile}
            loading={loading}
          />

          <AccountInfoCard user={user} />
        </div>

        <div className="mt-6">
          <UsageContributionsCard year={2025} />
        </div>
      </div>
    </div>
  );
}
