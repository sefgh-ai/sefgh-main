"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Upload,
  Sparkles,
  Brain,
  SearchCheck,
  Github,
  Zap,
  Palette,
  Globe,
  Mic,
  MicOff,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export function ChatInput({
  input,
  setInput,
  isSending,
  isRecording,
  currentConversation,
  showCanvas,
  setShowCanvas,
  setShowGithubSearch,
  handleSend,
  handleVoiceInput,
}) {
  return (
    <div className="glass-premium rounded-2xl shadow-premium border border-white/10 p-4 mt-4">
      <div className="flex gap-2">
        {/* + Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 flex-shrink-0 hover:shadow-glow-blue"
              aria-label="Open quick actions"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 glass-premium border-white/10"
          >
            <DropdownMenuItem
              onClick={() =>
                toast.info("Upload repo", { description: "Coming soon" })
              }
            >
              <Upload className="mr-2 h-4 w-4" />
              <span>Upload repo</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.info("Enhance", { description: "Coming soon" })
              }
            >
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Enhance</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.info("Think longer", { description: "Coming soon" })
              }
            >
              <Brain className="mr-2 h-4 w-4" />
              <span>Think longer</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.info("Deep research", {
                  description: "Coming soon",
                })
              }
            >
              <SearchCheck className="mr-2 h-4 w-4" />
              <span>Deep research</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowGithubSearch(true)}>
              <Github className="mr-2 h-4 w-4" />
              <span>GitHub search</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.info("Quick answer", { description: "Coming soon" })
              }
            >
              <Zap className="mr-2 h-4 w-4" />
              <span>Quick answer</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowCanvas(!showCanvas)}>
              <Palette className="mr-2 h-4 w-4" />
              <span>{showCanvas ? "Close Canvas" : "Open Canvas"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.info("Web search", { description: "Coming soon" })
              }
            >
              <Globe className="mr-2 h-4 w-4" />
              <span>Web search</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Input Field */}
        <div className="relative flex-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) =>
              e.key === "Enter" && !e.shiftKey && handleSend()
            }
            placeholder={
              currentConversation
                ? "Type your message..."
                : "Start a new chat..."
            }
            className="h-11 pr-12"
            disabled={isSending}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 ${
                    isRecording ? "text-red-500 animate-pulse" : ""
                  }`}
                  onClick={handleVoiceInput}
                  disabled={isSending}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRecording ? "Stop recording" : "Voice input"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isSending}
          size="icon"
          className="h-11 w-11 flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-glow-blue"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Help Text */}
      {currentConversation && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <p className="text-xs text-muted-foreground">
            Enter to send • Shift+Enter for new line • + for features • 🎤 for
            voice
          </p>
        </div>
      )}
    </div>
  );
}
