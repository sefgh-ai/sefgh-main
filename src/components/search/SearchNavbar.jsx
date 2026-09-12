"use client";

import { useState } from "react";
import { CodeBracketIcon } from "@heroicons/react/24/outline";
import { Filter, Languages, Star, SortAsc, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SubmitProjectDialog } from "@/components/SubmitProjectDialog";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

export function SearchNavbar({
  language,
  setLanguage,
  stars,
  setStars,
  sort,
  setSort,
  advancedFilters,
  setAdvancedFilters,
  isAdvancedOpen,
  setIsAdvancedOpen,
  showFilters = true,
}) {
  const sortOptions = [
    { label: "All", value: "all" },
    { label: "Best Match", value: "best-match" },
    { label: "Most Stars", value: "stars" },
    { label: "Recently Updated", value: "updated" },
  ];

  const languageOptions = [
    { label: "All Languages", value: "" },
    { label: "JavaScript", value: "JavaScript" },
    { label: "TypeScript", value: "TypeScript" },
    { label: "Python", value: "Python" },
    { label: "Java", value: "Java" },
    { label: "Go", value: "Go" },
    { label: "Rust", value: "Rust" },
    { label: "C++", value: "C++" },
    { label: "C#", value: "C#" },
    { label: "Ruby", value: "Ruby" },
    { label: "PHP", value: "PHP" },
    { label: "Swift", value: "Swift" },
    { label: "Kotlin", value: "Kotlin" },
  ];

  const starOptions = [
    { label: "Any Stars", value: "" },
    { label: "> 100", value: ">100" },
    { label: "> 1,000", value: ">1000" },
    { label: "> 10,000", value: ">10000" },
    { label: "> 50,000", value: ">50000" },
  ];

  const licenseOptions = [
    { label: "Any License", value: "" },
    { label: "MIT", value: "mit" },
    { label: "Apache 2.0", value: "apache-2.0" },
    { label: "GPL 3.0", value: "gpl-3.0" },
    { label: "BSD 3-Clause", value: "bsd-3-clause" },
  ];

  const dateOptions = [
    { label: "Any Time", value: "" },
    { label: "Past 24 hours", value: "day" },
    { label: "Past week", value: "week" },
    { label: "Past month", value: "month" },
    { label: "Past year", value: "year" },
  ];

  const activeFilterCount =
    (advancedFilters?.license ? 1 : 0) +
    (advancedFilters?.dateRange ? 1 : 0) +
    (advancedFilters?.hasWiki ? 1 : 0) +
    (advancedFilters?.hasIssues ? 1 : 0) +
    (advancedFilters?.topics?.length || 0) +
    (advancedFilters?.forks ? 1 : 0);

  const totalActiveFilters =
    activeFilterCount +
    (language ? 1 : 0) +
    (stars ? 1 : 0) +
    (sort && sort !== "all" ? 1 : 0);

  const [menuOpen, setMenuOpen] = useState("");

  const handleTriggerClick = (e) => {
    e.preventDefault();
    setMenuOpen(menuOpen === "filters" ? "" : "filters");
  };

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-sm">
      <div className="flex h-12 sm:h-14 items-center px-2 sm:px-4 gap-2 sm:gap-3">
        {/* Hide hamburger on mobile - we have bottom nav */}
        <SidebarTrigger className="hidden md:flex hover:bg-white/10 rounded-xl transition-smooth shrink-0" />

        {/* Unified Filters Navigation Menu - Only shown when showFilters is true */}
        {showFilters && (
          <NavigationMenu value={menuOpen} onValueChange={setMenuOpen}>
            <NavigationMenuList>
              <NavigationMenuItem value="filters">
                <NavigationMenuTrigger
                  onClick={handleTriggerClick}
                  className="h-8 rounded-xl glass-premium hover:glow-border-slate transition-smooth shadow-soft data-[state=open]:glow-border-blue"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {totalActiveFilters > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                      {totalActiveFilters}
                    </span>
                  )}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="glass-premium border-white/10 shadow-premium rounded-xl">
                  <div className="grid gap-3 p-4 w-[500px] md:w-[600px] lg:grid-cols-[1fr_1fr_1fr]">
                    {/* Sort Column */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground">
                        <SortAsc className="h-4 w-4" />
                        Sort By
                      </div>
                      <div className="space-y-1">
                        {sortOptions.map((option) => (
                          <NavigationMenuLink
                            key={option.value}
                            className={cn(
                              "block select-none rounded-lg px-3 py-2 text-sm leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer",
                              sort === option.value &&
                                "bg-accent/50 text-accent-foreground"
                            )}
                            onClick={() => setSort(option.value)}
                          >
                            <div className="flex items-center justify-between">
                              <span>{option.label}</span>
                              {sort === option.value && (
                                <Check className="h-4 w-4 text-blue-400" />
                              )}
                            </div>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>

                    {/* Language Column */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground">
                        <Languages className="h-4 w-4" />
                        Language
                      </div>
                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {languageOptions.map((option) => (
                          <NavigationMenuLink
                            key={option.value}
                            className={cn(
                              "block select-none rounded-lg px-3 py-2 text-sm leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer",
                              language === option.value &&
                                "bg-accent/50 text-accent-foreground"
                            )}
                            onClick={() => setLanguage(option.value)}
                          >
                            <div className="flex items-center justify-between">
                              <span>{option.label}</span>
                              {language === option.value && (
                                <Check className="h-4 w-4 text-blue-400" />
                              )}
                            </div>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>

                    {/* Stars Column */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground">
                        <Star className="h-4 w-4" />
                        Minimum Stars
                      </div>
                      <div className="space-y-1">
                        {starOptions.map((option) => (
                          <NavigationMenuLink
                            key={option.value}
                            className={cn(
                              "block select-none rounded-lg px-3 py-2 text-sm leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer",
                              stars === option.value &&
                                "bg-accent/50 text-accent-foreground"
                            )}
                            onClick={() => setStars(option.value)}
                          >
                            <div className="flex items-center justify-between">
                              <span>{option.label}</span>
                              {stars === option.value && (
                                <Check className="h-4 w-4 text-blue-400" />
                              )}
                            </div>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Advanced Filters Row */}
                  <div className="border-t border-white/10 p-4">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground mb-2">
                      <Filter className="h-4 w-4" />
                      Advanced Filters
                      {activeFilterCount > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                          {activeFilterCount}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* License */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          License
                        </label>
                        <select
                          value={advancedFilters?.license || ""}
                          onChange={(e) =>
                            setAdvancedFilters({
                              ...advancedFilters,
                              license: e.target.value,
                            })
                          }
                          className="w-full h-8 px-2 text-sm rounded-lg border border-white/10 dark:border-white/10 bg-background dark:bg-zinc-900 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 [&>option]:bg-background dark:[&>option]:bg-zinc-900 [&>option]:text-foreground"
                        >
                          {licenseOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Date Range */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Updated
                        </label>
                        <select
                          value={advancedFilters?.dateRange || ""}
                          onChange={(e) =>
                            setAdvancedFilters({
                              ...advancedFilters,
                              dateRange: e.target.value,
                            })
                          }
                          className="w-full h-8 px-2 text-sm rounded-lg border border-white/10 dark:border-white/10 bg-background dark:bg-zinc-900 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 [&>option]:bg-background dark:[&>option]:bg-zinc-900 [&>option]:text-foreground"
                        >
                          {dateOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Checkboxes */}
                      <div className="space-y-2 col-span-2">
                        <label className="text-xs text-muted-foreground">
                          Options
                        </label>
                        <div className="flex flex-wrap gap-3">
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={advancedFilters?.hasWiki || false}
                              onChange={(e) =>
                                setAdvancedFilters({
                                  ...advancedFilters,
                                  hasWiki: e.target.checked,
                                })
                              }
                              className="rounded border-white/20 bg-white/5"
                            />
                            Has Wiki
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={advancedFilters?.hasIssues || false}
                              onChange={(e) =>
                                setAdvancedFilters({
                                  ...advancedFilters,
                                  hasIssues: e.target.checked,
                                })
                              }
                              className="rounded border-white/20 bg-white/5"
                            />
                            Has Issues
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Clear All Button */}
                    {totalActiveFilters > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSort("all");
                            setLanguage("");
                            setStars("");
                            setAdvancedFilters({
                              license: "",
                              dateRange: "",
                              hasWiki: false,
                              hasIssues: false,
                              topics: [],
                              forks: "",
                            });
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear all filters
                        </Button>
                      </div>
                    )}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        )}

        {/* Quick Filter Pills - Show active filters */}
        {showFilters && totalActiveFilters > 0 && (
          <div className="hidden md:flex items-center gap-2">
            {sort && sort !== "all" && (
              <span className="px-2 py-1 text-xs rounded-full glass-premium border border-white/10">
                {sortOptions.find((o) => o.value === sort)?.label}
              </span>
            )}
            {language && (
              <span className="px-2 py-1 text-xs rounded-full glass-premium border border-white/10">
                {language}
              </span>
            )}
            {stars && (
              <span className="px-2 py-1 text-xs rounded-full glass-premium border border-white/10">
                {stars} ⭐
              </span>
            )}
          </div>
        )}

        <div className="flex-1" />
        <div className="flex items-center gap-1 sm:gap-2">
          <SubmitProjectDialog>
            <Button
              variant="outline"
              size="sm"
              className="glass-premium border border-white/10 rounded-xl hover:glow-border-blue transition-smooth shadow-soft hover:shadow-soft-lg h-8 px-2 sm:px-3"
            >
              <CodeBracketIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Submit</span>
            </Button>
          </SubmitProjectDialog>
          <Header showProfileDropdown={true} />
        </div>
      </div>
    </div>
  );
}
