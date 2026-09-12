"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, Star, MessageSquare, Clock, Flame } from "lucide-react";

/**
 * Extract owner and repo name from GitHub URL
 * @param {string} githubUrl - Full GitHub URL (e.g., https://github.com/owner/repo)
 * @returns {{ owner: string, repo: string } | null}
 */
function parseGitHubUrl(githubUrl) {
  if (!githubUrl) return null;

  try {
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ""), // Remove .git suffix if present
      };
    }
  } catch (error) {
    console.error("Error parsing GitHub URL:", error);
  }

  return null;
}

export function ProjectCard({ project }) {
  const router = useRouter();

  // Parse GitHub URL to get owner and repo
  const repoInfo = parseGitHubUrl(project.github_url);

  // Determine the route to navigate to
  const projectRoute = repoInfo
    ? `/repo/${repoInfo.owner}/${repoInfo.repo}`
    : project.github_url // If we have URL but can't parse, open externally
    ? project.github_url
    : null; // No URL available

  const handleClick = () => {
    if (!projectRoute) {
      console.warn("No route available for project:", project.title);
      return;
    }

    // If it's an external URL (starts with http), open in new tab
    if (projectRoute.startsWith("http")) {
      window.open(projectRoute, "_blank", "noopener,noreferrer");
    } else {
      // Navigate to internal route
      router.push(projectRoute);
    }
  };

  return (
    <Card
      className="bg-card hover:border-primary/30 transition-all duration-200 hover:shadow-md group cursor-pointer"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Project Avatar */}
          <div className="flex-shrink-0">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-muted to-accent flex items-center justify-center text-xl border group-hover:scale-105 transition-transform">
              {project.avatar}
            </div>
          </div>

          {/* Project Info */}
          <div className="flex-1 min-w-0">
            {/* Title Row with Badge */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold group-hover:text-primary transition-colors flex items-center gap-1 truncate">
                {project.trending && (
                  <Flame className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                )}
                <span className="truncate">{project.title}</span>
              </h3>
              <Badge className="ml-auto flex-shrink-0 bg-primary/90 text-primary-foreground text-[10px] h-4 px-1.5">
                {project.trending ? "🔥" : "✨"}
              </Badge>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground mb-1.5 line-clamp-2 leading-relaxed">
              {project.description}
            </p>

            {/* Meta Info Row */}
            <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mb-1.5">
              <span className="flex items-center gap-1">
                <Avatar className="w-3.5 h-3.5">
                  <AvatarFallback className="text-[8px]">
                    {project.author[0]}
                  </AvatarFallback>
                </Avatar>
                {project.author}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                {project.language}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {project.daysAgo}d ago
              </span>
            </div>

            {/* Tags and Stats Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1 flex-wrap">
                {project.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4"
                  >
                    {tag}
                  </Badge>
                ))}
                {project.tags.length > 3 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4"
                  >
                    +{project.tags.length - 3}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-shrink-0">
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-yellow-500" />
                  {project.stars}
                </span>
                <span className="flex items-center gap-0.5">
                  <Eye className="w-3 h-3" />
                  {project.views > 1000
                    ? `${(project.views / 1000).toFixed(1)}k`
                    : project.views}
                </span>
                <span className="flex items-center gap-0.5">
                  <MessageSquare className="w-3 h-3" />
                  {project.comments}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="w-11 h-11 rounded-lg bg-muted flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-muted rounded w-3/4 mb-1.5"></div>
            <div className="h-3 bg-muted rounded w-full mb-1"></div>
            <div className="h-3 bg-muted rounded w-2/3 mb-1.5"></div>
            <div className="flex gap-1.5">
              <div className="h-4 bg-muted rounded w-12"></div>
              <div className="h-4 bg-muted rounded w-12"></div>
              <div className="h-4 bg-muted rounded w-12"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
