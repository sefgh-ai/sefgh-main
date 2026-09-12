"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { StepRole } from "./StepRole";
import { StepTechStack } from "./StepTechStack";
import { StepGoals } from "./StepGoals";
import { StepGitHub } from "./StepGitHub";
import { StepPreferences } from "./StepPreferences";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useSendNotification,
  NotificationTemplates,
} from "@/hooks/useSendNotification";

export function OnboardingModal({
  userId,
  initialStep = 1,
  onComplete,
  onSkip,
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [open, setOpen] = useState(true);
  const { sendFromTemplate, sendToSelf } = useSendNotification();

  const totalSteps = 5;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    toast.info("Onboarding skipped", {
      description: "You can complete your profile anytime from settings",
    });
    setOpen(false);
    onSkip?.();
  };

  const handleComplete = async () => {
    toast.success("Welcome to SEFGH! 🎉", {
      description: "Your profile is all set up",
    });

    // Send welcome notification
    await sendFromTemplate(null, NotificationTemplates.onboardingComplete());

    setOpen(false);
    onComplete?.();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepRole userId={userId} onNext={handleNext} />;
      case 2:
        return (
          <StepTechStack
            userId={userId}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <StepGoals userId={userId} onNext={handleNext} onBack={handleBack} />
        );
      case 4:
        return (
          <StepGitHub userId={userId} onNext={handleNext} onBack={handleBack} />
        );
      case 5:
        return (
          <StepPreferences
            userId={userId}
            onComplete={handleComplete}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent
        className="w-[95vw] max-w-2xl p-0 gap-0 bg-[#0d1117] border-[#30363d] overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Hidden title for accessibility */}
        <VisuallyHidden>
          <DialogTitle>
            Complete Your Profile - Step {currentStep} of {totalSteps}
          </DialogTitle>
        </VisuallyHidden>

        {/* Header with progress and skip */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#21262d] flex-shrink-0">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#238636]"></div>
              <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#238636]"></div>
              <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#238636]"></div>
              <span className="text-xs sm:text-sm text-[#8b949e] ml-1.5 sm:ml-2">
                SEFGH AI
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-[#8b949e] hover:text-white hover:bg-[#21262d] text-xs sm:text-sm h-8 px-2 sm:px-3"
            >
              Skip for now
            </Button>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-all ${
                  index < currentStep ? "bg-[#238636]" : "bg-[#21262d]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step content - scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {renderStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
