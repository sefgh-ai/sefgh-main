"use client";

import { Compass, Keyboard, Rocket, Sparkles } from "@/components/ui/icons";

const tips = [
  {
    icon: Compass,
    title: "Navigate faster",
    detail: "Use the top bar quick links or the floating island to jump to chat, playground, or trending.",
  },
  {
    icon: Rocket,
    title: "Refine results",
    detail: "Tune language, stars, and sort in the navbar filters. Switch modes to semantic or keyword.",
  },
  {
    icon: Keyboard,
    title: "Keyboard",
    detail: "Press / to focus search, Enter to run, ↑ to recall last query.",
  },
  {
    icon: Sparkles,
    title: "AI help",
    detail: "Open chat for explanations of any result or to draft follow-up queries.",
  },
];

export function SearchNavGuide() {
  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur px-4 py-3 sm:px-6 sm:py-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-primary">
          <Compass className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-foreground font-semibold">Navigation guide</div>
          <div className="grid gap-2 sm:grid-cols-2 mt-2">
            {tips.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">{title}</div>
                  <p className="text-muted-foreground text-xs leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
