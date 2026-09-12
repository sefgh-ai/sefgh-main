"use client";

import { Button } from "@/components/ui/button";
import { XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SearchFilters({
  language,
  setLanguage,
  stars,
  setStars,
  sort,
  setSort,
  handleClearFilters,
}) {
  const filterOptions = [
    { label: "All", value: "all" },
    { label: "Latest", value: "latest" },
    { label: "Monthly", value: "monthly" },
    { label: "Yearly", value: "yearly" },
    { label: "Featured", value: "featured" },
  ];

  return (
    <div className="mx-auto mb-8">
      <div className="flex flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl glass-premium hover:glow-border-slate transition-smooth shadow-soft"
            >
              {filterOptions.find((f) => f.value === (sort || "all"))?.label ||
                "All"}
              <ChevronDownIcon className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="rounded-xl glass-premium border-white/10 shadow-premium">
            <DropdownMenuLabel>Filter</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {filterOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setSort(option.value)}
                className="rounded-lg"
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl glass-premium hover:glow-border-grey transition-smooth shadow-soft"
            >
              Language: {language || "All"}
              <ChevronDownIcon className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="rounded-xl glass-premium border-white/10 shadow-premium">
            <DropdownMenuLabel>Select Language</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={() => setLanguage("")}
              className="rounded-lg"
            >
              All
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLanguage("JavaScript")}
              className="rounded-lg"
            >
              JavaScript
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLanguage("TypeScript")}
              className="rounded-lg"
            >
              TypeScript
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLanguage("Python")}
              className="rounded-lg"
            >
              Python
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLanguage("Java")}
              className="rounded-lg"
            >
              Java
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLanguage("Go")}
              className="rounded-lg"
            >
              Go
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLanguage("Rust")}
              className="rounded-lg"
            >
              Rust
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLanguage("C++")}
              className="rounded-lg"
            >
              C++
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl glass-premium hover:glow-border-cyan transition-smooth shadow-soft"
            >
              Stars: {stars ? `>${stars}` : "Any"}
              <ChevronDownIcon className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="rounded-xl glass-premium border-white/10 shadow-premium">
            <DropdownMenuLabel>Minimum Stars</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={() => setStars("")}
              className="rounded-lg"
            >
              Any
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setStars(">100")}
              className="rounded-lg"
            >
              &gt; 100
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setStars(">1000")}
              className="rounded-lg"
            >
              &gt; 1,000
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setStars(">10000")}
              className="rounded-lg"
            >
              &gt; 10,000
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setStars(">50000")}
              className="rounded-lg"
            >
              &gt; 50,000
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {(language || stars || sort !== "all") && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <XMarkIcon className="h-3 w-3 mr-1.5" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
