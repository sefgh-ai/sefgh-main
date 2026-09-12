"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Sparkles, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function EditorsChoice({ items, onNavigate }) {
  if (!items?.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-100 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Editors&apos; Choice
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Handpicked repos worth your time. Swap this list with live data via `src/data/editorsChoice.js`.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((repo) => (
          <Card
            key={repo.id}
            className="bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/40"
          >
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/repo/${repo.author}/${repo.name}`)}
                    className="text-left group"
                  >
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-sm text-slate-500">{repo.author}</span>
                      <span className="text-slate-700">/</span>
                      <span className="text-lg font-semibold text-white group-hover:text-blue-200">
                        {repo.name}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                      {repo.description}
                    </p>
                  </button>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <Badge variant="secondary" className="bg-slate-800/70 border-slate-700 text-xs">
                      <span
                        className="inline-block h-2 w-2 rounded-full mr-1"
                        style={{ backgroundColor: repo.languageColor || "#888" }}
                      />
                      {repo.language || "Unknown"}
                    </Badge>
                    {repo.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="border-slate-700 text-xs text-slate-200">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Badge className="bg-amber-500/10 text-amber-200 border-amber-500/30 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> {repo.highlight || "Staff pick"}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-300">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-300" />
                  <span className="font-semibold">{repo.stars.toLocaleString()}</span>
                  <span className="text-xs text-slate-500">stars</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-blue-300" />
                  <span className="font-semibold">{repo.starsToday.toLocaleString()}</span>
                  <span className="text-xs text-slate-500">today</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
