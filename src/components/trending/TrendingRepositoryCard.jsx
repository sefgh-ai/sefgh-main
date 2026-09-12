"use client";

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
    <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/50 backdrop-blur-sm group">
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
                <span>{repo.stars.toLocaleString()}</span>
              </div>

              {/* Forks */}
              <div className="flex items-center gap-1 text-muted-foreground">
                <GitFork className="w-4 h-4" />
                <span>{repo.forks.toLocaleString()}</span>
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

          {/* Right Side - Stars Today */}
          <div className="flex-shrink-0 flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Star className="w-4 h-4" />
                  <span className="font-semibold">
                    {repo.starsToday.toLocaleString()}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  stars today
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Star className="w-4 h-4 mr-1" />
              Star
            </Button>
          </div>
        </div>

        {/* Growth Progress Bar */}
        {repo.starsToday > 0 && (
          <div className="mt-4 pl-12">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min((repo.starsToday / repo.stars) * 100 * 10, 100)}%`,
                }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Growth: {((repo.starsToday / repo.stars) * 100).toFixed(2)}% today
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
