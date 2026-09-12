"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { saveStepGoals } from "@/lib/supabase/onboarding";
import { toast } from "sonner";
import {
  ChevronLeft,
  Sparkles,
  BookOpen,
  Search,
  GitPullRequest,
  FlaskConical,
} from "lucide-react";

const goalOptions = [
  {
    value: "learning",
    label: "Learning & Education",
    icon: BookOpen,
    description: "Discover repositories to learn new skills and technologies",
  },
  {
    value: "finding-tools",
    label: "Finding Tools & Libraries",
    icon: Search,
    description: "Find the right packages and tools for my projects",
  },
  {
    value: "contributing",
    label: "Contributing to Open Source",
    icon: GitPullRequest,
    description: "Find projects to contribute to and collaborate on",
  },
  {
    value: "research",
    label: "Research & Exploration",
    icon: FlaskConical,
    description: "Explore cutting-edge projects and research repositories",
  },
];

export function StepGoals({ userId, onNext, onBack }) {
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleGoal = (goal) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleContinue = async () => {
    if (selectedGoals.length === 0) {
      toast.error("Please select at least one goal");
      return;
    }

    setLoading(true);
    try {
      await saveStepGoals(userId, selectedGoals);
      onNext();
    } catch (error) {
      console.error("Error saving goals:", error);
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
            <p className="text-white text-xs sm:text-sm">
              Perfect! 🎯 What are your main goals with SEFGH?
            </p>
            <p className="text-[#8b949e] text-[10px] sm:text-xs mt-1">
              This helps us curate the best content for you
            </p>
          </div>
        </div>
      </div>

      {/* Goals selection */}
      <div className="space-y-2 sm:space-y-3 max-h-[280px] sm:max-h-none overflow-y-auto">
        {goalOptions.map((goal) => {
          const Icon = goal.icon;
          const isSelected = selectedGoals.includes(goal.value);

          return (
            <button
              key={goal.value}
              onClick={() => toggleGoal(goal.value)}
              className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? "border-[#238636] bg-[#238636]/10"
                  : "border-[#30363d] bg-[#161b22] hover:border-[#8b949e]"
              }`}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div
                  className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                    isSelected ? "bg-[#238636]" : "bg-[#21262d]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 sm:h-5 sm:w-5 ${
                      isSelected ? "text-white" : "text-[#8b949e]"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium text-xs sm:text-sm mb-0.5 sm:mb-1 ${
                      isSelected ? "text-[#238636]" : "text-white"
                    }`}
                  >
                    {goal.label}
                  </div>
                  <div className="text-[10px] sm:text-xs text-[#8b949e] line-clamp-2">
                    {goal.description}
                  </div>
                </div>
                {isSelected && (
                  <div className="flex-shrink-0">
                    <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-[#238636] flex items-center justify-center">
                      <svg
                        className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white"
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
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selection summary */}
      {selectedGoals.length > 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-2 sm:p-3">
          <p className="text-[10px] sm:text-xs text-[#8b949e]">
            ✓ {selectedGoals.length}{" "}
            {selectedGoals.length === 1 ? "goal" : "goals"} selected
          </p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-2 sm:pt-4">
        <Button
          onClick={onBack}
          variant="ghost"
          className="text-[#8b949e] hover:text-white hover:bg-[#21262d] text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={selectedGoals.length === 0 || loading}
          className="bg-[#238636] hover:bg-[#2ea043] text-white text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
        >
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
