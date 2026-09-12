"use client";

import { useState } from "react";
import {
  Star,
  GitFork,
  Clock,
  Scale,
  Copy,
  Download,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const languageColors = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
};

export function RepositoryCard({ repo, onSelect }) {
  const router = useRouter();
  const { user } = useAuth();
  const [isStarred, setIsStarred] = useState(false);
  const [isStarring, setIsStarring] = useState(false);

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const handleCopyUrl = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(repo.html_url);
    toast.success("Repository URL copied!");
  };

  const handleClone = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(repo.clone_url);
    toast.success("Clone URL copied!");
  };

  const handleOpenGitHub = (e) => {
    e.stopPropagation();
    window.open(repo.html_url, "_blank");
  };

  const handleCardClick = () => {
    // Navigate to repo details page
    const [owner, repoName] = repo.full_name.split("/");
    router.push(`/repo/${owner}/${repoName}`);
  };

  const handleOpenCanvas = (e) => {
    e.stopPropagation();
    // Open canvas (existing behavior for backward compatibility)
    if (onSelect) {
      onSelect(repo);
    }
  };

  const handleStar = async (e) => {
    e.stopPropagation();

    if (!user) {
      toast.error("Please login to save repositories");
      return;
    }

    if (isStarring) return;
    setIsStarring(true);

    try {
      if (isStarred) {
        // Remove from collection
        const response = await fetch(
          `/api/repo/collect?repo=${encodeURIComponent(repo.full_name)}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to remove from starred");
        }

        setIsStarred(false);
        toast.success("Removed from starred");
      } else {
        // Add to collection
        const response = await fetch("/api/repo/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoFullName: repo.full_name,
            collectionName: "default",
          }),
        });

        if (!response.ok) {
          if (response.status === 409) {
            toast.info("Already in your starred list");
            setIsStarred(true);
            return;
          }
          throw new Error("Failed to star repository");
        }

        setIsStarred(true);
        toast.success("Added to starred!");
      }
    } catch (error) {
      console.error("Star error:", error);
      toast.error(error.message || "Failed to update starred");
    } finally {
      setIsStarring(false);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group p-5 rounded-xl border bg-card hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary/50"
    >
      {/* Repository Name */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-primary hover:underline">
          {repo.full_name}
        </h3>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[60px]">
        {repo.description || "No description provided"}
      </p>

      {/* Statistics Row */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4 text-yellow-500" />
          <span className="font-medium">
            {formatNumber(repo.stargazers_count)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <GitFork className="h-4 w-4 text-blue-500" />
          <span className="font-medium">{formatNumber(repo.forks_count)}</span>
        </div>
        {repo.language && (
          <Badge
            variant="secondary"
            className="text-xs"
            style={{
              backgroundColor: languageColors[repo.language] + "20",
              color: languageColors[repo.language] || "inherit",
              borderColor: languageColors[repo.language] || "transparent",
            }}
          >
            {repo.language}
          </Badge>
        )}
      </div>

      {/* Metadata Row */}
      <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span>Updated {formatDate(repo.updated_at)}</span>
        </div>
        {repo.license && (
          <div className="flex items-center gap-1.5">
            <Scale className="h-3 w-3" />
            <span>{repo.license.name}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant={isStarred ? "default" : "outline"}
          size="sm"
          className={`flex-1 ${
            isStarred ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""
          }`}
          onClick={handleStar}
          disabled={isStarring}
          title={isStarred ? "Remove from starred" : "Add to starred"}
        >
          {isStarred ? (
            <>
              <BookmarkCheck className="h-3 w-3 mr-1.5" />
              Starred
            </>
          ) : (
            <>
              <Bookmark className="h-3 w-3 mr-1.5" />
              Star
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleCopyUrl}
          title="Copy repository URL"
        >
          <Copy className="h-3 w-3 mr-1.5" />
          Copy
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleClone}
          title="Copy clone URL"
        >
          <Download className="h-3 w-3 mr-1.5" />
          Clone
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleOpenGitHub}
          title="Open on GitHub"
        >
          <ExternalLink className="h-3 w-3 mr-1.5" />
          GitHub
        </Button>
      </div>
    </div>
  );
}
