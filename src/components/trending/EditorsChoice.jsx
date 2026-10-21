"use client";

import { formatNumber } from "@/lib/utils/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Sparkles, Flame } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function EditorsChoice({ items, onNavigate }) {
  if (!items?.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Editors&apos; Choice
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Handpicked repos worth your time. Swap this list with live data via `src/data/editorsChoice.js`.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((repo) => (
          <Card
            key={repo.id}
            className="bg-card/70 border border-border hover:border-blue-500/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/40"
          >
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/repo/${repo.author}/${repo.name}`)}
                    className="text-left group"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-sm text-muted-foreground">{repo.author}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-lg font-semibold text-foreground group-hover:text-primary">
                        {repo.name}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {repo.description}
                    </p>
                  </button>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <Badge variant="secondary" className="bg-muted/70 border-border text-xs">
                      <span
                        className="inline-block h-2 w-2 rounded-full mr-1"
                        style={{ backgroundColor: repo.languageColor || "#888" }}
                      />
                      {repo.language || "Unknown"}
                    </Badge>
                    {repo.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="border-border text-xs text-foreground">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Badge className="bg-warning/10 text-warning border-warning/30 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> {repo.highlight || "Staff pick"}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-300" />
                  <span className="font-semibold">{formatNumber(repo.stars)}</span>
                  <span className="text-xs text-muted-foreground">stars</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
