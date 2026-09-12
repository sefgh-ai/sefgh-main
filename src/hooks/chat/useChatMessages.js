"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  addMessage,
  createMessage,
  updateMessage,
  deleteMessage,
  updateConversationTitle,
} from "@/lib/supabase/conversations";
import { saveSearchHistory } from "@/lib/supabase/search-history";

export function useChatMessages(
  user,
  currentConversation,
  refreshConversations
) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [regeneratingMessageId, setRegeneratingMessageId] = useState(null);

  // Send message
  const handleSend = async (
    model = "SEFGH V1",
    activeConversation,
    setCurrentConversation,
    setConversations,
    conversations
  ) => {
    if (!input.trim() || isSending) return;

    const userMessageContent = input.trim();
    setInput("");

    // Create conversation if none exists
    let conv = activeConversation;
    if (!conv) {
      toast.error("Please create or select a conversation first");
      setInput(userMessageContent);
      return;
    }

    const isFirstMessage = messages.length === 0;
    setIsSending(true);

    try {
      // Add user message
      const userMsg = createMessage("user", userMessageContent, {
        tokens: userMessageContent.split(" ").length,
      });

      await addMessage(conv.id, user.id, userMsg);
      setMessages((prev) => [...prev, userMsg]);

      // Save chat query to search history (async, non-blocking)
      saveSearchHistory(user.id, userMessageContent, "chat", {
        filters: { model, conversationId: conv.id },
        resultsCount: 1,
      });

      // Generate title for first message
      if (isFirstMessage) {
        try {
          const titleResponse = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [{ role: "user", content: userMessageContent }],
              action: "generate_title",
            }),
          });

          if (titleResponse.ok) {
            const { title } = await titleResponse.json();
            await updateConversationTitle(conv.id, user.id, title);
            setCurrentConversation((prev) => ({ ...prev, title }));

            // Update in conversations list
            setConversations((prev) =>
              prev.map((c) => (c.id === conv.id ? { ...c, title } : c))
            );
          }
        } catch (error) {
          console.error("Error generating title:", error);
        }
      }

      // Get AI response
      const chatHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const aiResponse = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!aiResponse.ok) {
        throw new Error("Failed to get AI response");
      }

      const { response } = await aiResponse.json();

      const aiMsg = createMessage("assistant", response, {
        model: "gpt-4o",
        tokens: response.split(" ").length,
      });

      await addMessage(conv.id, user.id, aiMsg);
      setMessages((prev) => [...prev, aiMsg]);
      setIsSending(false);

      // Reload conversations
      await refreshConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message", {
        description: error.message,
      });
      setIsSending(false);
    }
  };

  // Copy message
  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Message copied!");
  };

  // Edit message
  const handleEditMessage = async (messageId) => {
    if (!editContent.trim()) return;

    try {
      await updateMessage(
        currentConversation.id,
        user.id,
        messageId,
        editContent.trim()
      );

      const updatedMessages = messages.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: editContent.trim(), edited: true }
          : msg
      );
      setMessages(updatedMessages);

      setEditingMessageId(null);
      setEditContent("");
      toast.success("Message updated!");

      const editedMessageIndex = messages.findIndex(
        (msg) => msg.id === messageId
      );

      if (messages[editedMessageIndex]?.role === "user") {
        const messagesUpToEdit = updatedMessages.slice(
          0,
          editedMessageIndex + 1
        );

        const messagesToDelete = messages.slice(editedMessageIndex + 1);
        for (const msg of messagesToDelete) {
          try {
            await deleteMessage(currentConversation.id, user.id, msg.id);
          } catch (error) {
            console.error("Error deleting message:", error);
          }
        }

        setMessages(messagesUpToEdit);
        setIsSending(true);

        try {
          const chatHistory = messagesUpToEdit.map((m) => ({
            role: m.role,
            content: m.content,
          }));

          const aiResponse = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: chatHistory }),
          });

          if (!aiResponse.ok) {
            throw new Error("Failed to get AI response");
          }

          const { response } = await aiResponse.json();

          const aiMsg = createMessage("assistant", response, {
            model: "gpt-4o",
            tokens: response.split(" ").length,
          });

          await addMessage(currentConversation.id, user.id, aiMsg);
          setMessages((prev) => [...prev, aiMsg]);
        } catch (error) {
          console.error("Error getting AI response:", error);
          toast.error("Failed to get AI response");
        } finally {
          setIsSending(false);
        }
      }
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error("Failed to edit message");
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(currentConversation.id, user.id, messageId);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  // Regenerate response
  const handleRegenerateResponse = async (messageId) => {
    setRegeneratingMessageId(messageId);
    try {
      const messageIndex = messages.findIndex((msg) => msg.id === messageId);
      const chatHistory = messages.slice(0, messageIndex).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const aiResponse = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!aiResponse.ok) {
        throw new Error("Failed to regenerate response");
      }

      const { response } = await aiResponse.json();

      await updateMessage(currentConversation.id, user.id, messageId, response);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, content: response } : msg
        )
      );

      toast.success("Response regenerated!");
    } catch (error) {
      console.error("Error regenerating:", error);
      toast.error("Failed to regenerate", { description: error.message });
    } finally {
      setRegeneratingMessageId(null);
    }
  };

  // Start editing
  const startEditing = (message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  return {
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
    handleSend,
    handleCopyMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleRegenerateResponse,
    startEditing,
  };
}
