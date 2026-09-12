"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveStepGitHub } from "@/lib/supabase/onboarding";
import { toast } from "sonner";
import { ChevronLeft, Sparkles, Github } from "lucide-react";

export function StepGitHub({ userId, onNext, onBack }) {
  const [githubUsername, setGithubUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!githubUsername.trim()) {
      toast.error("Please enter your GitHub username");
      return;
    }

    setLoading(true);
    try {
      await saveStepGitHub(userId, true, githubUsername.trim());
      toast.success("GitHub account linked!");
      onNext();
    } catch (error) {
      console.error("Error saving GitHub:", error);
      toast.error("Failed to save GitHub username");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipGitHub = async () => {
    setLoading(true);
    try {
      await saveStepGitHub(userId, false);
      onNext();
    } catch (error) {
      console.error("Error skipping GitHub:", error);
      toast.error("Failed to continue");
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
              Great choices! 🌟 Want to connect your GitHub account?
            </p>
            <p className="text-[#8b949e] text-[10px] sm:text-xs mt-1">
              This helps us show you personalized recommendations based on your
              activity
            </p>
          </div>
        </div>
      </div>

      {/* GitHub connection card */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="p-2 sm:p-3 rounded-lg bg-[#21262d] flex-shrink-0">
            <Github className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm sm:text-base mb-1 sm:mb-2">
              Connect GitHub Account
            </h3>
            <p className="text-[#8b949e] text-xs sm:text-sm">
              We&apos;ll use this to:
            </p>
            <ul className="mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1 text-[#8b949e] text-[10px] sm:text-sm">
              <li className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-1 w-1 rounded-full bg-[#238636] flex-shrink-0"></div>
                <span>Show your starred repositories</span>
              </li>
              <li className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-1 w-1 rounded-full bg-[#238636] flex-shrink-0"></div>
                <span>Recommend similar projects</span>
              </li>
              <li className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-1 w-1 rounded-full bg-[#238636] flex-shrink-0"></div>
                <span>Personalize your feed</span>
              </li>
            </ul>
          </div>
        </div>

        {/* GitHub username input */}
        <div className="space-y-2 sm:space-y-3">
          <label className="text-xs sm:text-sm font-medium text-white">
            GitHub Username
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter your username"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                className="bg-[#0d1117] border-[#30363d] text-white placeholder-[#8b949e] focus:border-[#58a6ff] text-xs sm:text-sm h-8 sm:h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConnect();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleConnect}
              disabled={!githubUsername.trim() || loading}
              className="bg-[#238636] hover:bg-[#2ea043] text-white text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
            >
              Connect
            </Button>
          </div>
          <p className="text-[10px] sm:text-xs text-[#8b949e]">
            Example: octocat
          </p>
        </div>
      </div>

      {/* Skip option */}
      <div className="text-center">
        <button
          onClick={handleSkipGitHub}
          disabled={loading}
          className="text-[10px] sm:text-sm text-[#8b949e] hover:text-white transition-colors"
        >
          Skip this step
        </button>
      </div>

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
        <div className="text-[10px] sm:text-xs text-[#8b949e] flex items-center">
          Step 4 of 5
        </div>
      </div>
    </div>
  );
}
