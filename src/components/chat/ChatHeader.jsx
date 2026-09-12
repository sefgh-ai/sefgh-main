"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Menu,
  Sparkles,
  Palette,
  Github,
  X,
  Share2,
} from "lucide-react";
import ShareDialog from "@/components/ShareDialog";

export function ChatHeader({
  currentConversation,
  messages,
  showCanvas,
  setShowCanvas,
  selectedRepo,
  setSelectedRepo,
  shareDialogOpen,
  setShareDialogOpen,
  sidebarOpen,
  setSidebarOpen,
  isMobile,
  router,
}) {
  return (
    <div className="glass-premium rounded-2xl shadow-premium border border-white/10 h-14 px-4 flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to search"
          onClick={() => router.push("/search")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Sidebar Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle sidebar"
          onClick={() => {
            if (isMobile) setSidebarOpen(true);
            else setSidebarOpen(!sidebarOpen);
          }}
          className="md:flex"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Title Section */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h1 className="text-lg font-semibold">
            {currentConversation?.title || "AI Chat"}
          </h1>
          {showCanvas && (
            <Badge
              variant="secondary"
              className="ml-2 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
            >
              <Palette className="h-3 w-3 mr-1" />
              Canvas
            </Badge>
          )}
          {selectedRepo && (
            <Badge
              variant="secondary"
              className="ml-2 bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800"
            >
              <Github className="h-3 w-3 mr-1" />
              Repository
            </Badge>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Close Canvas Button */}
        {showCanvas && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCanvas(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Close Canvas
          </Button>
        )}

        {/* Close Repository Button */}
        {selectedRepo && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedRepo(null)}
          >
            <X className="h-4 w-4 mr-2" />
            Close Repository
          </Button>
        )}

        {/* Share Button - Only shown when there are messages */}
        {currentConversation && messages.length > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareDialogOpen(true)}
            >
              <Share2 className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Share</span>
            </Button>
            <ShareDialog
              open={shareDialogOpen}
              onOpenChange={setShareDialogOpen}
              conversation={currentConversation}
              snapshot={messages}
              onAfterShare={() => {}}
            />
          </>
        )}
      </div>
    </div>
  );
}
