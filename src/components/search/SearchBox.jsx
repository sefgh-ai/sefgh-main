"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowPathIcon,
  SparklesIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { SearchHistoryDropdown } from "./SearchHistoryDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const modeOptions = [
  { label: "Scout", value: "scout", description: "Free" },
  { label: "Analyst", value: "analyst", description: "Advanced" },
  { label: "Strategist", value: "strategist", description: "Expert" },
];

export function SearchBox({
  searchQuery,
  setSearchQuery,
  loading,
  handleSearch,
  mode,
  setMode,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionSource, setSuggestionSource] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setShowHistory(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions when user types
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const response = await fetch("/api/ai/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery }),
        });

        const data = await response.json();
        if (response.ok && data.suggestions) {
          setSuggestions(data.suggestions);
          setSuggestionSource(data.source);
          setShowSuggestions(data.suggestions.length > 0);
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    // Auto-trigger search after selecting suggestion
    setTimeout(() => {
      const submitEvent = new Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      wrapperRef.current?.querySelector("form")?.dispatchEvent(submitEvent);
    }, 100);
  };

  const handleEnhanceQuery = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query first");
      return;
    }

    setEnhancing(true);
    try {
      const response = await fetch("/api/ai/enhance-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await response.json();
      if (response.ok && data.enhancedQuery) {
        setSearchQuery(data.enhancedQuery);
        toast.success("Query enhanced successfully!");
      } else {
        throw new Error(data.error || "Failed to enhance query");
      }
    } catch (error) {
      console.error("Failed to enhance query:", error);
      toast.error("Failed to enhance query");
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <div className="mx-auto mb-8" ref={wrapperRef}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setShowHistory(false);
          handleSearch();
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="relative flex items-center gap-2">
            {/* Mode Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-[52px] px-4 rounded-2xl glass-premium hover:glow-border-purple transition-smooth shadow-soft shrink-0"
                >
                  <span className="hidden sm:inline mr-1">Mode:</span>
                  {modeOptions.find((m) => m.value === mode)?.label || "Scout"}
                  <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl glass-premium border-white/10 shadow-premium">
                <DropdownMenuLabel>Search Mode</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {modeOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setMode(option.value)}
                    className="rounded-lg flex justify-between items-center"
                  >
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({option.description})
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search Input */}
            <div className="relative flex-1 isolate">
              {/* Animated Border Glow - Same as landing page */}
              <div className="absolute -inset-[2px] rounded-2xl overflow-hidden z-[-1]">
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Layer 1: Main Rotating Gradient */}
                  <div
                    className="absolute w-[1200px] h-[1200px] bg-[conic-gradient(from_0deg,#000000_0%,#2563eb_10%,#000000_20%,#000000_50%,#0d9488_60%,#000000_70%)] 
                                  animate-[spin_4s_linear_infinite] opacity-100"
                  ></div>

                  {/* Layer 2: Secondary Gradient for more color depth */}
                  <div
                    className="absolute w-[1000px] h-[1000px] bg-[conic-gradient(from_90deg,transparent_0%,#3b82f6_10%,transparent_20%,transparent_50%,#14b8a6_60%,transparent_70%)] 
                                  animate-[spin_3s_linear_infinite] opacity-70"
                  ></div>
                </div>
              </div>

              {/* Blur Filter Layer */}
              <div className="absolute -inset-[2px] rounded-2xl z-[-1] backdrop-blur-[2px]"></div>

              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search repositories by name, topic, or user..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim() === "") {
                    setShowHistory(true);
                    setShowSuggestions(false);
                  } else {
                    setShowHistory(false);
                  }
                }}
                onFocus={() => {
                  if (searchQuery.trim() === "") {
                    setShowHistory(true);
                  } else if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                disabled={loading}
                suppressHydrationWarning
                className="relative w-full pl-12 pr-20 py-4 text-lg rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-smooth shadow-soft hover:shadow-soft-lg"
              />

              {/* Right side icons container */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                {/* Enhance Query Icon */}
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={handleEnhanceQuery}
                    disabled={enhancing || loading}
                    className="p-1.5 rounded-lg hover:bg-purple-500/20 transition-all disabled:opacity-50 group"
                    title="Enhance query with AI"
                  >
                    {enhancing ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin text-purple-400" />
                    ) : (
                      <SparklesIcon className="h-4 w-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                    )}
                  </button>
                )}

                {/* Clear Icon */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSuggestions([]);
                      setShowSuggestions(false);
                      setShowHistory(true);
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all"
                  >
                    <XMarkIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>

              {/* Search History Dropdown */}
              <SearchHistoryDropdown
                isOpen={showHistory && !searchQuery.trim()}
                onSelect={(query) => {
                  setSearchQuery(query);
                  setShowHistory(false);
                  // Trigger search after selecting from history
                  setTimeout(() => handleSearch(), 100);
                }}
                onClose={() => setShowHistory(false)}
                inputRef={inputRef}
              />
            </div>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {suggestionSource === "ai-powered" &&
                    "AI-Powered Suggestions"}
                  {suggestionSource === "predefined" && "Popular Searches"}
                  {suggestionSource === "predefined-fallback" &&
                    "Suggested Searches"}
                </span>
                {loadingSuggestions && (
                  <ArrowPathIcon className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Suggestions List */}
              <div className="py-1">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-2.5 text-left hover:bg-accent transition-colors flex items-center gap-3 group"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                    <span className="text-sm group-hover:text-foreground transition-colors">
                      {suggestion}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <Button
            type="submit"
            size="lg"
            className="flex-1 rounded-2xl glass-premium hover:glow-border-blue transition-premium shadow-soft hover:shadow-soft-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                Search Repositories
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
