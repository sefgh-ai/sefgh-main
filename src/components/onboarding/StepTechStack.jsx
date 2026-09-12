"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { saveStepTechStack } from "@/lib/supabase/onboarding";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Sparkles } from "lucide-react";

const techCategories = {
  frontend: {
    label: "Frontend",
    items: ["React", "Vue", "Angular", "Svelte", "Next.js", "Nuxt", "Remix"],
  },
  backend: {
    label: "Backend",
    items: [
      "Node.js",
      "Python",
      "Go",
      "Rust",
      "Java",
      "PHP",
      "Ruby",
      "C#",
      ".NET",
    ],
  },
  mobile: {
    label: "Mobile",
    items: ["React Native", "Flutter", "Swift", "Kotlin", "Ionic"],
  },
  devops: {
    label: "DevOps",
    items: [
      "Docker",
      "Kubernetes",
      "CI/CD",
      "AWS",
      "Azure",
      "GCP",
      "Terraform",
    ],
  },
  aiml: {
    label: "AI/ML",
    items: ["TensorFlow", "PyTorch", "LangChain", "Hugging Face", "OpenAI"],
  },
  databases: {
    label: "Databases",
    items: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Supabase", "Firebase"],
  },
};

const languages = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "C++",
  "C#",
  "PHP",
  "Ruby",
  "Swift",
  "Kotlin",
  "Other",
];

export function StepTechStack({ userId, onNext, onBack }) {
  const [selectedTech, setSelectedTech] = useState([]);
  const [primaryLanguage, setPrimaryLanguage] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleTech = (tech) => {
    setSelectedTech((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const handleContinue = async () => {
    if (selectedTech.length === 0) {
      toast.error("Please select at least one technology");
      return;
    }
    if (!primaryLanguage) {
      toast.error("Please select your primary language");
      return;
    }

    setLoading(true);
    try {
      await saveStepTechStack(userId, selectedTech, primaryLanguage);
      onNext();
    } catch (error) {
      console.error("Error saving tech stack:", error);
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
              Awesome! 🚀 Now, what technologies are you interested in?
            </p>
            <p className="text-[#8b949e] text-[10px] sm:text-xs mt-1">
              Select all that apply - this helps us show you relevant
              repositories
            </p>
          </div>
        </div>
      </div>

      {/* Tech stack selection */}
      <div className="space-y-3 sm:space-y-4 max-h-[200px] sm:max-h-[280px] overflow-y-auto pr-1 sm:pr-2 scrollbar-thin">
        {Object.entries(techCategories).map(([key, category]) => (
          <div key={key} className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] sm:text-xs font-medium text-[#8b949e] uppercase tracking-wide">
              {category.label}
            </label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {category.items.map((tech) => (
                <Badge
                  key={tech}
                  variant={selectedTech.includes(tech) ? "default" : "outline"}
                  className={`cursor-pointer transition-all text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 ${
                    selectedTech.includes(tech)
                      ? "bg-[#238636] hover:bg-[#2ea043] text-white border-[#238636]"
                      : "bg-[#161b22] hover:bg-[#21262d] text-[#8b949e] border-[#30363d] hover:border-[#8b949e]"
                  }`}
                  onClick={() => toggleTech(tech)}
                >
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Primary language */}
      <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-[#21262d]">
        <label className="text-xs sm:text-sm font-medium text-white">
          Primary programming language?
        </label>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {languages.map((lang) => (
            <Badge
              key={lang}
              variant={primaryLanguage === lang ? "default" : "outline"}
              className={`cursor-pointer transition-all text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 ${
                primaryLanguage === lang
                  ? "bg-[#58a6ff] hover:bg-[#79c0ff] text-white border-[#58a6ff]"
                  : "bg-[#161b22] hover:bg-[#21262d] text-[#8b949e] border-[#30363d] hover:border-[#8b949e]"
              }`}
              onClick={() => setPrimaryLanguage(lang)}
            >
              {lang}
            </Badge>
          ))}
        </div>
      </div>

      {/* Selection summary */}
      {selectedTech.length > 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-2 sm:p-3">
          <p className="text-[10px] sm:text-xs text-[#8b949e]">
            Selected: {selectedTech.length}{" "}
            {selectedTech.length === 1 ? "technology" : "technologies"}
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
          disabled={selectedTech.length === 0 || !primaryLanguage || loading}
          className="bg-[#238636] hover:bg-[#2ea043] text-white text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
        >
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
