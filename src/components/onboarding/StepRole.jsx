"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { saveStepRole } from "@/lib/supabase/onboarding";
import { toast } from "sonner";
import { GraduationCap, Briefcase, FlaskConical, Sparkles } from "lucide-react";

const roles = [
  {
    value: "student",
    label: "Student",
    icon: GraduationCap,
    description: "Learning to code and exploring new technologies",
  },
  {
    value: "professional",
    label: "Professional",
    icon: Briefcase,
    description: "Working as a developer or engineer",
  },
  {
    value: "researcher",
    label: "Researcher",
    icon: FlaskConical,
    description: "Academic research or studying technologies",
  },
  {
    value: "hobbyist",
    label: "Hobbyist",
    icon: Sparkles,
    description: "Coding for fun and personal projects",
  },
];

const experienceLevels = [
  { value: "beginner", label: "Beginner", description: "< 1 year" },
  { value: "intermediate", label: "Intermediate", description: "1-3 years" },
  { value: "expert", label: "Expert", description: "3+ years" },
];

export function StepRole({ userId, onNext }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedRole || !selectedExperience) {
      toast.error("Please select both role and experience level");
      return;
    }

    setLoading(true);
    try {
      await saveStepRole(userId, selectedRole, selectedExperience);
      onNext();
    } catch (error) {
      console.error("Error saving role:", error);
      toast.error("Failed to save your selection");
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
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 sm:p-4">
            <p className="text-white text-xs sm:text-sm mb-1 sm:mb-2">
              Hey there! 👋 I&apos;m{" "}
              <span className="font-semibold text-[#238636]">
                SEFGH AI Assistant
              </span>
            </p>
            <p className="text-[#8b949e] text-xs sm:text-sm">
              Let&apos;s personalize your experience! First, tell me about
              yourself...
            </p>
          </div>
        </div>
      </div>

      {/* Role selection */}
      <div className="space-y-2 sm:space-y-3">
        <label className="text-xs sm:text-sm font-medium text-white">
          What best describes you?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-all text-left ${
                  selectedRole === role.value
                    ? "border-[#238636] bg-[#238636]/10"
                    : "border-[#30363d] bg-[#161b22] hover:border-[#8b949e]"
                }`}
              >
                <div className="flex items-center gap-2 sm:block">
                  <Icon
                    className={`h-4 w-4 sm:h-5 sm:w-5 sm:mb-2 ${
                      selectedRole === role.value
                        ? "text-[#238636]"
                        : "text-[#8b949e]"
                    }`}
                  />
                  <div className="flex-1 sm:block">
                    <div className="font-medium text-white text-xs sm:text-sm">
                      {role.label}
                    </div>
                    <div className="text-[10px] sm:text-xs text-[#8b949e] hidden sm:block">
                      {role.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Experience level */}
      <div className="space-y-2 sm:space-y-3">
        <label className="text-xs sm:text-sm font-medium text-white">
          Experience level?
        </label>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {experienceLevels.map((level) => (
            <button
              key={level.value}
              onClick={() => setSelectedExperience(level.value)}
              className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-center ${
                selectedExperience === level.value
                  ? "border-[#238636] bg-[#238636]/10"
                  : "border-[#30363d] bg-[#161b22] hover:border-[#8b949e]"
              }`}
            >
              <div
                className={`font-medium text-[10px] sm:text-sm mb-0.5 sm:mb-1 ${
                  selectedExperience === level.value
                    ? "text-[#238636]"
                    : "text-white"
                }`}
              >
                {level.label}
              </div>
              <div className="text-[9px] sm:text-xs text-[#8b949e]">
                {level.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Continue button */}
      <div className="flex justify-end pt-2 sm:pt-4">
        <Button
          onClick={handleContinue}
          disabled={!selectedRole || !selectedExperience || loading}
          className="bg-[#238636] hover:bg-[#2ea043] text-white text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
        >
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
