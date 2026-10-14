"use client";

import { formatNumber } from "@/lib/utils/formatters";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, GitFork, Code } from "lucide-react";

/**
 * Repository card component (memoized for performance)
 */
export const TrendingRepositoryCard = React.memo(function TrendingRepositoryCard({ repo, index, onNavigate, getHeatIndicator }) {
  return (
    <Card className="bg-card/50 border-border hover:border-border transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/50 backdrop-blur-sm group">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Rank */}
          <div className="flex-shrink-0 w-8 text-center">
            <span className="text-2xl font-bold text-muted-foreground">
              {index + 1}
            </span>
          </div>

          {/* Repo Icon */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
              <Code className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Repo Info */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3
              className="text-lg font-semibold text-primary hover:text-primary/80 cursor-pointer mb-2 flex items-center gap-2"
              onClick={() => onNavigate(`/repo/${repo.author}/${repo.name}`)}
            >
              <span className="text-muted-foreground">{repo.author}</span>
              <span className="text-muted-foreground">/</span>
              <span>{repo.name}</span>
              {repo.trending && (
                <span className={`text-base ${getHeatIndicator(repo.heatLevel).color}`}>
                  {getHeatIndicator(repo.heatLevel).label}
                </span>
              )}
              {/* Topic Badge */}
              {repo.topic && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {typeof repo.topicIcon === 'string' ? repo.topicIcon : repo.topicIcon?.label || '🔥'} {repo.topic}
                </Badge>
              )}
            </h3>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-4">
              {repo.description}
            </p>

            {/* Meta Info */}
            <div className="flex items-center gap-6 text-sm">
              {/* Language */}
              {repo.language && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: typeof repo.languageColor === 'string' ? repo.languageColor : repo.languageColor?.color || '#888' }}
                  ></div>
                  <span className="text-muted-foreground">
                    {typeof repo.language === 'string' ? repo.language : repo.language?.label || 'Unknown'}
                  </span>
                </div>
              )}

              {/* Stars */}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Star className="w-4 h-4" />
                <span>{formatNumber(repo.stars)}</span>
              </div>

              {/* Forks */}
              <div className="flex items-center gap-1 text-muted-foreground">
                <GitFork className="w-4 h-4" />
                <span>{formatNumber(repo.forks)}</span>
              </div>

              {/* Built by */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Built by</span>
                <div className="flex -space-x-2">
                  {repo.contributors.map((contributor, i) => (
                    <Avatar
                      key={i}
                      className="w-6 h-6 border-2 border-background"
                    >
                      <AvatarFallback className="text-xs">
                        {contributor.avatar}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - real stars per day since the repository was
              created (R-020); hidden when GitHub gave no creation time. */}
          <div className="flex-shrink-0 flex flex-col items-end gap-3">
            {repo.starsPerDay !== null && repo.starsPerDay !== undefined && (
              <div className="flex items-center gap-2">
                <div className="text-right" title="Average since the repository was created">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Star className="w-4 h-4" />
                    <span className="font-semibold">
                      {formatNumber(repo.starsPerDay)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    stars a day
                  </span>
                </div>
              </div>
            )}
            <Button variant="outline" size="sm">
              <Star className="w-4 h-4 mr-1" />
              Star
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
});
