"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Plus,
  MessageSquare,
  Sparkles,
  Loader2,
  MoreVertical,
  Copy,
  Edit2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { AIMessageRenderer } from "@/components/AIMessageRenderer";

export function MessageList({
  currentConversation,
  messages,
  isSending,
  editingMessageId,
  editContent,
  setEditContent,
  setEditingMessageId,
  regeneratingMessageId,
  userProfile,
  user,
  handleNewChat,
  handleCopyMessage,
  handleEditMessage,
  handleDeleteMessage,
  handleRegenerateResponse,
  startEditing,
  handleOpenInCanvas,
  handleSelectRepoFromAI,
}) {
  const messagesEndRef = useRef(null);

  // Empty state when no conversation
  if (!currentConversation) {
    return (
      <div className="glass-premium rounded-2xl shadow-premium border border-white/10 flex-1 overflow-hidden">
        <ScrollArea className="h-full p-6">
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="p-8 rounded-full bg-blue-100 dark:bg-blue-950/30 mb-6">
              <Sparkles className="h-16 w-16 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold mb-3">Welcome to AI Chat</h2>
            <p className="text-muted-foreground mb-8 max-w-md text-base">
              Start a new conversation or select an existing one from the
              sidebar
            </p>
            <Button
              onClick={handleNewChat}
              size="lg"
              className="px-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-glow-blue"
            >
              <Plus className="h-5 w-5 mr-2" />
              Start New Chat
            </Button>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Empty state when no messages
  if (messages.length === 0) {
    return (
      <div className="glass-premium rounded-2xl shadow-premium border border-white/10 flex-1 overflow-hidden">
        <ScrollArea className="h-full p-6">
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="p-6 rounded-full bg-muted mb-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground text-sm">
              Send a message below to start the conversation
            </p>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="glass-premium rounded-2xl shadow-premium border border-white/10 flex-1 overflow-hidden">
      <ScrollArea className="h-full p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <TooltipProvider>
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`group flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-600 dark:from-slate-800 dark:to-slate-700 text-white">
                      <Sparkles className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`flex flex-col ${
                    message.role === "user" ? "items-end" : "items-start"
                  } max-w-[90%]`}
                >
                  {/* Message Content */}
                  {editingMessageId === message.id ? (
                    <div className="w-full">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[100px] mb-2"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditMessage(message.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingMessageId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      {/* Message Actions - Left side for user */}
                      {message.role === "user" && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-3">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-2">
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start"
                                  onClick={() =>
                                    handleCopyMessage(message.content)
                                  }
                                >
                                  <Copy className="h-3 w-3 mr-2" />
                                  Copy
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start"
                                  onClick={() => startEditing(message)}
                                >
                                  <Edit2 className="h-3 w-3 mr-2" />
                                  Edit
                                </Button>
                                <Separator className="my-1" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start text-destructive"
                                  onClick={() => handleDeleteMessage(message.id)}
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}

                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          message.role === "user"
                            ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-glow-blue"
                            : "glass-premium border border-white/10"
                        }`}
                      >
                        {/* Render with AIMessageRenderer for AI, markdown for user */}
                        {message.role === "assistant" ? (
                          <AIMessageRenderer
                            content={message.content}
                            onOpenInCanvas={handleOpenInCanvas}
                            onSelectRepo={handleSelectRepoFromAI}
                          />
                        ) : (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                          {message.edited && (
                            <Badge
                              variant="secondary"
                              className="text-xs h-4 px-1"
                            >
                              edited
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Message Actions - Right side for AI */}
                      {message.role === "assistant" && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-3">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-2">
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start"
                                  onClick={() =>
                                    handleCopyMessage(message.content)
                                  }
                                >
                                  <Copy className="h-3 w-3 mr-2" />
                                  Copy
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start"
                                  onClick={() =>
                                    handleRegenerateResponse(message.id)
                                  }
                                  disabled={regeneratingMessageId === message.id}
                                >
                                  <RefreshCw
                                    className={`h-3 w-3 mr-2 ${
                                      regeneratingMessageId === message.id
                                        ? "animate-spin"
                                        : ""
                                    }`}
                                  />
                                  Regenerate
                                </Button>
                                <Separator className="my-1" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start text-destructive"
                                  onClick={() => handleDeleteMessage(message.id)}
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    {userProfile?.avatar_url ? (
                      <AvatarImage
                        src={userProfile.avatar_url}
                        alt={userProfile.full_name}
                      />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-teal-600 text-white">
                      {userProfile?.full_name?.[0]?.toUpperCase() ||
                        user?.email?.[0]?.toUpperCase() ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </TooltipProvider>

          {isSending && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="px-4 py-3 rounded-lg bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
