"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CodeExplorer } from "@/components/CodeExplorer";
import { Canvas } from "@/components/Canvas";
import { getUserProfile } from "@/lib/supabase/profiles";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { GitHubSearchDialog } from "@/components/chat/GitHubSearchDialog";
import { useChatConversations } from "@/hooks/chat/useChatConversations";
import { useChatMessages } from "@/hooks/chat/useChatMessages";
import { useVoiceInput } from "@/hooks/chat/useVoiceInput";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { PageLoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

function ChatPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { isAuthenticated, isLoading } = useAuthGuard();
  const router = useRouter();
  const isMobile = useIsMobile();

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [showGithubSearch, setShowGithubSearch] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);

  // Model and Canvas State
  const [model, setModel] = useState("SEFGH V1");
  const [canvasContent, setCanvasContent] = useState("");
  const [canvasLanguage, setCanvasLanguage] = useState("javascript");

  // GitHub Search State
  const [githubSearchQuery, setGithubSearchQuery] = useState("");
  const [githubSearchResults, setGithubSearchResults] = useState([]);
  const [searchingGithub, setSearchingGithub] = useState(false);

  // User Profile
  const [userProfile, setUserProfile] = useState(null);

  // Custom Hooks
  const {
    conversations,
    setConversations,
    currentConversation,
    setCurrentConversation,
    loading,
    handleNewChat,
    loadConversation,
    handleDelete,
    handlePin,
    handleClearAll,
    refreshConversations,
  } = useChatConversations(user);

  const {
    messages,
    setMessages,
    input,
    setInput,
    isSending,
    editingMessageId,
    setEditingMessageId,
    editContent,
    setEditContent,
    regeneratingMessageId,
    handleSend: originalHandleSend,
    handleCopyMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleRegenerateResponse,
    startEditing,
  } = useChatMessages(user, currentConversation, refreshConversations);

  const { isRecording, handleVoiceInput } = useVoiceInput();

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const profile = await getUserProfile(user.id);
        setUserProfile(profile);
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    if (user) loadProfile();
  }, [user]);

  // Load conversation messages when selected
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentConversation) return;
      const conv = await loadConversation(currentConversation.id);
      if (conv) {
        setMessages(conv.messages || []);
      }
    };

    loadMessages();
  }, [currentConversation?.id]);

  // Handle opening code in canvas
  const handleOpenInCanvas = (code, language) => {
    setShowCanvas(false);
    setTimeout(() => {
      setCanvasContent(code);
      setCanvasLanguage(language || "javascript");
      setShowCanvas(true);
      toast.success("Code opened in Canvas!");
    }, 0);
  };

  // Handle repository selection from AI suggestions
  const handleSelectRepoFromAI = (repo) => {
    setSelectedRepo(repo);
    toast.success(`Opening ${repo.full_name} in Code Explorer`, {
      description: "Repository loaded successfully",
    });
  };

  // GitHub search function
  const handleGithubSearch = async () => {
    if (!githubSearchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setSearchingGithub(true);
    try {
      const params = new URLSearchParams({
        q: githubSearchQuery,
        per_page: "12",
      });

      const response = await fetch(`/api/github/search?${params}`);
      const data = await response.json();

      if (response.ok) {
        setGithubSearchResults(data.items || []);
        if (data.items.length === 0) {
          toast.info("No repositories found");
        }
      } else {
        throw new Error(data.error || "Search failed");
      }
    } catch (error) {
      console.error("GitHub search error:", error);
      toast.error("Failed to search repositories");
    } finally {
      setSearchingGithub(false);
    }
  };

  // Handle repository selection
  const handleSelectRepo = (repo) => {
    setSelectedRepo(repo);
    setShowGithubSearch(false);
    toast.success("Repository opened in sidebar");
  };

  // Wrapper for handleSend
  const handleSendWrapper = () => {
    originalHandleSend(
      model,
      currentConversation,
      setCurrentConversation,
      setConversations,
      conversations
    );
  };

  // Wrapper for loadConversation
  const loadConversationWrapper = async (convId) => {
    const conv = await loadConversation(convId);
    if (conv) {
      setMessages(conv.messages || []);
      setSidebarOpen(false);
    }
  };

  // Wrapper for handleNewChat
  const handleNewChatWrapper = async () => {
    const conv = await handleNewChat(model);
    if (conv) {
      setMessages([]);
      setSidebarOpen(false);
    }
  };

  // Handle voice input with transcript callback
  const handleVoiceInputWrapper = () => {
    handleVoiceInput((transcript) => {
      setInput((prev) => prev + " " + transcript);
    });
  };

  if (isLoading || !isAuthenticated || loading) {
    return <PageLoadingSpinner message="Loading chat..." />;
  }

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-background dark:via-card dark:to-background overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <ChatSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          model={model}
          setModel={setModel}
          conversations={conversations}
          currentConversation={currentConversation}
          handleNewChat={handleNewChatWrapper}
          loadConversation={loadConversationWrapper}
          handlePin={handlePin}
          handleDelete={handleDelete}
          setClearDialogOpen={setClearDialogOpen}
          userProfile={userProfile}
          user={user}
          isMobile={isMobile}
        />

        {/* Clear All Dialog */}
        <ConfirmDialog
          open={clearDialogOpen}
          onOpenChange={setClearDialogOpen}
          title="Clear All Conversations?"
          description="This will permanently delete all your conversations. This action cannot be undone."
          onConfirm={() => {
            handleClearAll();
            setClearDialogOpen(false);
          }}
          confirmText="Clear All"
          variant="destructive"
        />

        {/* Main Chat Area */}
        <div
          className={`flex-1 flex flex-col transition-all p-4 ${
            showCanvas || selectedRepo ? "lg:mr-[50vw]" : ""
          }`}
        >
          {/* Header */}
          <ChatHeader
            currentConversation={currentConversation}
            messages={messages}
            showCanvas={showCanvas}
            setShowCanvas={setShowCanvas}
            selectedRepo={selectedRepo}
            setSelectedRepo={setSelectedRepo}
            shareDialogOpen={shareDialogOpen}
            setShareDialogOpen={setShareDialogOpen}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            isMobile={isMobile}
            router={router}
          />

          {/* Messages Area */}
          <MessageList
            currentConversation={currentConversation}
            messages={messages}
            isSending={isSending}
            editingMessageId={editingMessageId}
            editContent={editContent}
            setEditContent={setEditContent}
            setEditingMessageId={setEditingMessageId}
            regeneratingMessageId={regeneratingMessageId}
            userProfile={userProfile}
            user={user}
            handleNewChat={handleNewChatWrapper}
            handleCopyMessage={handleCopyMessage}
            handleEditMessage={handleEditMessage}
            handleDeleteMessage={handleDeleteMessage}
            handleRegenerateResponse={handleRegenerateResponse}
            startEditing={startEditing}
            handleOpenInCanvas={handleOpenInCanvas}
            handleSelectRepoFromAI={handleSelectRepoFromAI}
          />

          {/* Input Area */}
          <ChatInput
            input={input}
            setInput={setInput}
            isSending={isSending}
            isRecording={isRecording}
            currentConversation={currentConversation}
            showCanvas={showCanvas}
            setShowCanvas={setShowCanvas}
            setShowGithubSearch={setShowGithubSearch}
            handleSend={handleSendWrapper}
            handleVoiceInput={handleVoiceInputWrapper}
          />
        </div>

        {/* GitHub Search Dialog */}
        <GitHubSearchDialog
          open={showGithubSearch}
          onOpenChange={setShowGithubSearch}
          githubSearchQuery={githubSearchQuery}
          setGithubSearchQuery={setGithubSearchQuery}
          searchingGithub={searchingGithub}
          githubSearchResults={githubSearchResults}
          handleGithubSearch={handleGithubSearch}
          handleSelectRepo={handleSelectRepo}
        />

        {/* Canvas Panel (Code Editor) - Desktop */}
        {showCanvas && !selectedRepo && (
          <div className="hidden lg:block fixed right-0 top-0 bottom-0 w-1/2 bg-background border-l shadow-2xl z-40">
            <Canvas
              key={canvasContent + canvasLanguage}
              content={canvasContent}
              onChange={setCanvasContent}
              onClose={() => setShowCanvas(false)}
              initialLanguage={canvasLanguage}
            />
          </div>
        )}

        {/* Repository Search Panel - Desktop */}
        {selectedRepo && (
          <div className="hidden lg:block fixed right-0 top-0 bottom-0 w-1/2 bg-background border-l shadow-2xl z-40">
            <CodeExplorer
              repository={selectedRepo}
              onClose={() => setSelectedRepo(null)}
            />
          </div>
        )}

        {/* Canvas Panel (Code Editor) - Mobile */}
        {showCanvas && !selectedRepo && (
          <div className="lg:hidden fixed inset-0 bg-background z-50">
            <Canvas
              key={canvasContent + canvasLanguage}
              content={canvasContent}
              onChange={setCanvasContent}
              onClose={() => setShowCanvas(false)}
              initialLanguage={canvasLanguage}
            />
          </div>
        )}

        {/* Repository Search Panel - Mobile */}
        {selectedRepo && (
          <div className="lg:hidden fixed inset-0 bg-background z-50">
            <CodeExplorer
              repository={selectedRepo}
              onClose={() => setSelectedRepo(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap with error boundary
export default function ChatPage() {
  return (
    <ErrorBoundary>
      <ChatPageContent />
    </ErrorBoundary>
  );
}
