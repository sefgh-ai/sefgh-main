"use client";

import { LayoutGrid, List, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ViewToggle({ view, setView }) {
  const views = [
    { value: "grid", icon: LayoutGrid, label: "Grid View" },
    { value: "list", icon: List, label: "List View" },
    { value: "compact", icon: Rows3, label: "Compact View" },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-1 rounded-xl glass-premium border border-white/10">
        {views.map(({ value, icon: Icon, label }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 rounded-lg transition-all ${
                  view === value
                    ? "bg-blue-500/20 text-blue-400 shadow-glow-blue"
                    : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setView(value)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
