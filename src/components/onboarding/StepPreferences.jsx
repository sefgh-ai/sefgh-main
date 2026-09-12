"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { saveStepPreferences } from "@/lib/supabase/onboarding";
import { toast } from "sonner";
import { ChevronLeft, Sparkles, Bell, BellOff, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const notificationOptions = [
  {
    value: "all",
    label: "All Notifications",
    icon: Bell,
    description: "Get notified about everything",
  },
  {
    value: "important",
    label: "Important Only",
    icon: Bell,
    description: "Only critical updates and mentions",
  },
  {
    value: "digest",
    label: "Daily Digest",
    icon: Bell,
    description: "One summary email per day",
  },
  {
    value: "none",
    label: "No Notifications",
    icon: BellOff,
    description: "Turn off all notifications",
  },
];

export function StepPreferences({ userId, onComplete, onBack }) {
  const { languages, locale } = useLanguage();
  const [notificationPref, setNotificationPref] = useState("important");
  const [selectedLanguage, setSelectedLanguage] = useState(locale || "en");
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    try {
      await saveStepPreferences(userId, notificationPref, selectedLanguage);

      // Trigger confetti or celebration animation here if you want
      onComplete();
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Bot message */}
      <div className="flex gap-2 sm:gap-3">
        <div className="flex-shrink-0">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#238636] flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 sm:p-4">
            <p className="text-foreground text-xs sm:text-sm">
              Almost done! 🎉 Let&apos;s set up your preferences
            </p>
            <p className="text-[#8b949e] text-[10px] sm:text-xs mt-1">
              You can change these anytime in settings
            </p>
          </div>
        </div>
      </div>

      {/* Notification preferences */}
      <div className="space-y-2 sm:space-y-3">
        <label className="text-xs sm:text-sm font-medium text-foreground">
          Notification Preferences
        </label>
        <div className="space-y-1.5 sm:space-y-2 max-h-[160px] sm:max-h-none overflow-y-auto">
          {notificationOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = notificationPref === option.value;

            return (
              <button
                key={option.value}
                onClick={() => setNotificationPref(option.value)}
                className={`w-full p-2.5 sm:p-3 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? "border-[#238636] bg-[#238636]/10"
                    : "border-[#30363d] bg-[#161b22] hover:border-[#8b949e]"
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <Icon
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 ${
                      isSelected ? "text-[#238636]" : "text-[#8b949e]"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-medium text-xs sm:text-sm ${
                        isSelected ? "text-[#238636]" : "text-foreground"
                      }`}
                    >
                      {option.label}
                    </div>
                    <div className="text-[10px] sm:text-xs text-[#8b949e] truncate">
                      {option.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-[#238636] flex items-center justify-center flex-shrink-0">
                      <svg
                        className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-foreground"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Language preference */}
      <div className="space-y-2 sm:space-y-3">
        <label className="text-xs sm:text-sm font-medium text-foreground">
          Preferred Language
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-center ${
                selectedLanguage === lang.code
                  ? "border-[#58a6ff] bg-[#58a6ff]/10"
                  : "border-[#30363d] bg-[#161b22] hover:border-[#8b949e]"
              }`}
            >
              <Globe
                className={`h-3 w-3 sm:h-4 sm:w-4 mx-auto mb-0.5 sm:mb-1 ${
                  selectedLanguage === lang.code
                    ? "text-[#58a6ff]"
                    : "text-[#8b949e]"
                }`}
              />
              <div
                className={`text-[10px] sm:text-xs font-medium truncate ${
                  selectedLanguage === lang.code
                    ? "text-[#58a6ff]"
                    : "text-foreground"
                }`}
              >
                {lang.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-gradient-to-r from-[#238636]/10 to-[#58a6ff]/10 border border-[#238636]/30 rounded-lg p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-[#238636] flex items-center justify-center">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            </div>
          </div>
          <div className="min-w-0">
            <h4 className="text-foreground font-semibold text-xs sm:text-sm mb-0.5 sm:mb-1">
              You&apos;re all set! 🚀
            </h4>
            <p className="text-[#8b949e] text-[10px] sm:text-xs">
              Your personalized SEFGH experience is ready. Let&apos;s find some
              amazing repositories!
            </p>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-2 sm:pt-4">
        <Button
          onClick={onBack}
          variant="ghost"
          className="text-[#8b949e] hover:text-foreground hover:bg-[#21262d] text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
          Back
        </Button>
        <Button
          onClick={handleComplete}
          disabled={loading}
          className="bg-gradient-to-r from-[#238636] to-[#2ea043] hover:from-[#2ea043] hover:to-[#238636] text-white text-xs sm:text-sm h-8 sm:h-9 px-4 sm:px-8"
        >
          {loading ? "Setting up..." : "Complete Setup"}
        </Button>
      </div>
    </div>
  );
}
