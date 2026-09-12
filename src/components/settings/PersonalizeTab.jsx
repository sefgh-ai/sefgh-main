"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Palette,
  Globe,
  Code,
  Sparkles,
  Moon,
  Sun,
  Monitor,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

const languages = [
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "es", label: "Spanish", flag: "🇪🇸" },
  { value: "fr", label: "French", flag: "🇫🇷" },
  { value: "de", label: "German", flag: "🇩🇪" },
  { value: "zh", label: "Chinese", flag: "🇨🇳" },
  { value: "ja", label: "Japanese", flag: "🇯🇵" },
  { value: "hi", label: "Hindi", flag: "🇮🇳" },
  { value: "te", label: "Telugu", flag: "🇮🇳" },
];

const programmingLanguages = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "C++",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "C#",
];

export default function PersonalizeTab() {
  const { theme, setTheme } = useTheme();
  const [aiEnhancedSearch, setAiEnhancedSearch] = useState(true);
  const [smartSuggestions, setSmartSuggestions] = useState(true);
  const [language, setLanguage] = useState("en");
  const [selectedLanguages, setSelectedLanguages] = useState([
    "JavaScript",
    "TypeScript",
    "Python",
  ]);
  const [resultsPerPage, setResultsPerPage] = useState("20");

  const toggleProgrammingLanguage = (lang) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleSave = () => {
    toast.success("Preferences saved successfully");
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Theme Selection */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Appearance</h3>
            <p className="text-sm text-muted-foreground">
              Choose your preferred theme
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "light", label: "Light", icon: Sun },
            { id: "dark", label: "Dark", icon: Moon },
            { id: "system", label: "System", icon: Monitor },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                theme === t.id
                  ? "border-primary bg-primary/5"
                  : "border-border/50 hover:border-border hover:bg-muted/30"
              }`}
            >
              {theme === t.id && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-primary" />
                </div>
              )}
              <t.icon
                className={`w-6 h-6 ${
                  theme === t.id ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  theme === t.id ? "text-primary" : ""
                }`}
              >
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Language Settings */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Language</h3>
            <p className="text-sm text-muted-foreground">
              Set your display language
            </p>
          </div>
        </div>

        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preferred Programming Languages */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Code className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Preferred Languages</h3>
            <p className="text-sm text-muted-foreground">
              Select your preferred programming languages for search results
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {programmingLanguages.map((lang) => {
            const isSelected = selectedLanguages.includes(lang);
            return (
              <Badge
                key={lang}
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "bg-primary hover:bg-primary/90"
                    : "hover:bg-muted"
                }`}
                onClick={() => toggleProgrammingLanguage(lang)}
              >
                {isSelected && <Check className="w-3 h-3 mr-1" />}
                {lang}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* AI Features */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="p-6 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI Features</h3>
              <p className="text-sm text-muted-foreground">
                Enhance your search with AI capabilities
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border/30">
          <div className="flex items-center justify-between p-5 hover:bg-muted/20 transition-colors">
            <div>
              <h4 className="text-sm font-medium">AI-Enhanced Search</h4>
              <p className="text-sm text-muted-foreground">
                Use natural language to find repositories
              </p>
            </div>
            <Switch
              checked={aiEnhancedSearch}
              onCheckedChange={setAiEnhancedSearch}
              aria-label="Toggle AI-Enhanced Search"
            />
          </div>

          <div className="flex items-center justify-between p-5 hover:bg-muted/20 transition-colors">
            <div>
              <h4 className="text-sm font-medium">Smart Suggestions</h4>
              <p className="text-sm text-muted-foreground">
                Get personalized repo recommendations
              </p>
            </div>
            <Switch
              checked={smartSuggestions}
              onCheckedChange={setSmartSuggestions}
              aria-label="Toggle Smart Suggestions"
            />
          </div>
        </div>
      </div>

      {/* Search Preferences */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Search Preferences</h3>

        <div className="space-y-4">
          <div>
            <Label
              htmlFor="resultsPerPage"
              className="text-sm font-medium mb-2"
            >
              Results per page
            </Label>
            <Select value={resultsPerPage} onValueChange={setResultsPerPage}>
              <SelectTrigger id="resultsPerPage" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 results</SelectItem>
                <SelectItem value="20">20 results</SelectItem>
                <SelectItem value="50">50 results</SelectItem>
                <SelectItem value="100">100 results</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="px-8">
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
