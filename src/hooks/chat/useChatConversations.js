"use client";

import { useState, useEffect } from "react";
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
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [loading, setLoading] = useState(false);

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

    try {
      const conv = await createConversation(user.id, "New Conversation", null, {
        model,
      });
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

  // Load conversation messages
  const loadConversation = async (convId) => {
    try {
      const conv = await getConversation(convId, user.id);
      setCurrentConversation(conv);
      return conv;
    } catch (error) {
      toast.error("Failed to load conversation", {
        description: error.message,
      });
      return null;
    }
  };

  // Delete conversation
  const handleDelete = async (convId) => {
    try {
      await deleteConversation(convId, user.id);
      setConversations(conversations.filter((c) => c.id !== convId));
      if (currentConversation?.id === convId) {
        setCurrentConversation(null);
      }
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
