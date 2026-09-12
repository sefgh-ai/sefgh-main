"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import {
  getOnboardingData,
  createOnboardingData,
  needsOnboarding,
} from "@/lib/supabase/onboarding";

/**
 * AutoOnboarding - Automatically opens onboarding modal for new/incomplete users
 * This component replaces the OnboardingBanner and shows the modal directly
 */
export default function AutoOnboarding() {
  const { user } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [onboardingData, setOnboardingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only run on client-side and when user is available
    if (!user?.id) {
      console.log("[AutoOnboarding] No user, skipping check");
      setIsLoading(false);
      return;
    }

    console.log("[AutoOnboarding] Checking for user:", user.id);

    // Check if onboarding is needed
    const checkOnboarding = async () => {
      try {
        console.log("[AutoOnboarding] Checking needsOnboarding...");
        const requiresOnboarding = await needsOnboarding(user.id);
        console.log(
          "[AutoOnboarding] needsOnboarding result:",
          requiresOnboarding
        );

        if (requiresOnboarding) {
          // Pre-fetch onboarding data for the modal
          let data = await getOnboardingData(user.id);
          if (!data) {
            data = await createOnboardingData(user.id);
          }
          setOnboardingData(data);
          setShowModal(true);
        } else {
          setShowModal(false);
        }
      } catch (error) {
        // Silently fail - don't block rendering
        console.error("Onboarding check failed:", error);
        setShowModal(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboarding();
  }, [user?.id]);

  const handleComplete = () => {
    setShowModal(false);
    // Refresh the page to reflect the completed onboarding
    router.refresh();
  };

  const handleSkip = async () => {
    setShowModal(false);
    if (user?.id) {
      try {
        // Import skipOnboarding function
        const { skipOnboarding } = await import("@/lib/supabase/onboarding");
        // Save skip to database so it persists across sessions
        await skipOnboarding(user.id);
        console.log("[AutoOnboarding] Onboarding skipped and saved");
      } catch (error) {
        console.error("[AutoOnboarding] Error skipping onboarding:", error);
      }
    }
  };

  // Don't render anything if loading or not showing modal
  if (isLoading || !showModal || !user?.id) {
    return null;
  }

  return (
    <OnboardingModal
      userId={user.id}
      initialStep={onboardingData?.current_step || 1}
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
}
