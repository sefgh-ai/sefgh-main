"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Flame, Code } from "lucide-react";

/**
 * Developer card component (memoized for performance)
 */
export const TrendingDeveloperCard = React.memo(function TrendingDeveloperCard({ dev, onNavigate }) {
  return (
    <Card className="glass-premium border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Rank */}
          <div className="flex-shrink-0 w-8 text-center">
            <span className="text-2xl font-bold text-muted-foreground">
              {dev.rank}
            </span>
          </div>

          {/* Developer Avatar */}
          <Avatar className="w-16 h-16 border-2">
            <AvatarFallback className="text-3xl">{dev.avatar}</AvatarFallback>
          </Avatar>

          {/* Developer Info */}
          <div className="flex-1 min-w-0">
            <h3
              className="text-lg font-semibold text-primary hover:text-primary/80 cursor-pointer"
              onClick={() => onNavigate(`/user/${dev.username}`)}
            >
              {dev.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">{dev.username}</p>

            {/* Popular Repo */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Popular Repo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-muted-foreground" />
                <span
                  className="text-sm text-primary hover:text-primary/80 cursor-pointer font-medium"
                  onClick={() =>
                    onNavigate(`/repo/${dev.username}/${dev.popularRepo.name}`)
                  }
                >
                  {dev.popularRepo.name}
                </span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {dev.popularRepo.description}
              </p>
            </div>
          </div>

          {/* Follow Button */}
          <div className="flex-shrink-0">
            <Button variant="outline" size="sm">
              Follow
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
