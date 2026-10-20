"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  getUserConversations,
  getConversation,
  createConversation,
  deleteConversation,
  toggleConversationPin,
  deleteAllConversations,
} from "@/lib/supabase/conversations";

export function useChatConversations(user) {
  const userId = user?.id;
  const loadRequest = useRef(0);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => () => { loadRequest.current++; }, [userId]);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const convs = await getUserConversations(user.id, {
          limit: 50,
          orderBy: "last_message_at",
        });
        setConversations(convs);
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) loadConversations();
  }, [user]);

  // Create new conversation
  const handleNewChat = async (model = "SEFGH V1") => {
    if (!user) return;
    const request = ++loadRequest.current;

    try {
      const conv = await createConversation(user.id, "New Conversation", null, {
        model,
      });
      if (request !== loadRequest.current) return null;
      setConversations([conv, ...conversations]);
      setCurrentConversation(conv);
      toast.success("New chat created!");
      return conv;
    } catch (error) {
      toast.error("Failed to create chat", {
        description: error.message,
      });
      return null;
    }
  };

  // Metadata/token updates for the same account must not trigger a snapshot
  // reload. A newer selection/account also invalidates an older reply.
  const loadConversation = useCallback(async (convId) => {
    if (!userId || !convId) return null;
    const request = ++loadRequest.current;
    try {
      const conv = await getConversation(convId, userId);
      if (request !== loadRequest.current) return null;
      setCurrentConversation(conv);
      return conv;
    } catch (error) {
      if (request !== loadRequest.current) return null;
      toast.error("Failed to load conversation", {
        description: error.message,
      });
      return null;
    }
  }, [userId]);

  // Delete conversation
  const handleDelete = async (convId) => {
    loadRequest.current++;
    try {
      await deleteConversation(convId, user.id);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      setCurrentConversation((prev) => prev?.id === convId ? null : prev);
      toast.success("Conversation deleted");
      return true;
    } catch (error) {
      toast.error("Failed to delete", {
        description: error.message,
      });
      return false;
    }
  };

  // Pin conversation
  const handlePin = async (convId, isPinned) => {
    try {
      await toggleConversationPin(convId, user.id, !isPinned);
      const convs = await getUserConversations(user.id, {
        limit: 50,
        orderBy: "last_message_at",
      });
      setConversations(convs);
      toast.success(isPinned ? "Unpinned" : "Pinned");
      return true;
    } catch (error) {
      toast.error("Failed to pin");
      return false;
    }
  };

  // Clear all conversations
  const handleClearAll = async () => {
    loadRequest.current++;
    try {
      await deleteAllConversations(user.id);
      setConversations([]);
      setCurrentConversation(null);
      toast.success("All conversations cleared!");
      return true;
    } catch (error) {
      toast.error("Failed to clear conversations", {
        description: error.message,
      });
      return false;
    }
  };

  // Refresh conversations list
  const refreshConversations = async () => {
    if (!user) return;
    try {
      const convs = await getUserConversations(user.id, {
        limit: 50,
        orderBy: "last_message_at",
      });
      setConversations(convs);
    } catch (error) {
      console.error("Error refreshing conversations:", error);
    }
  };

  return {
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
  };
}
