/**
 * User Conversations Helper Functions
 *
 * Manages AI chat conversations stored in Supabase
 * Uses JSONB format for efficient message storage
 */

import { createClient } from "@/lib/supabase/client";

// Module-level client - created once and reused
const supabase = createClient();

/**
 * Message format:
 * {
 *   id: string (unique message ID)
 *   role: 'user' | 'assistant' | 'system'
 *   content: string (message text)
 *   timestamp: string (ISO 8601)
 *   tokens?: number (optional)
 *   model?: string (optional, for assistant messages)
 * }
 */

/**
 * Create a new conversation
 */
export async function createConversation(
  userId,
  title = "New Conversation",
  initialMessage = null,
  options = {}
) {
  const messages = initialMessage ? [initialMessage] : [];

  const { data, error } = await supabase
    .from("user_conversations")
    .insert({
      user_id: userId,
      title: title,
      messages: messages,
      model: options.model || "gpt-4o",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    throw error;
  }

  return data;
}

/**
 * Delete all conversations for a user
 */
export async function deleteAllConversations(userId) {
  const { error } = await supabase
    .from("user_conversations")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting all conversations:", error);
    throw error;
  }

  return true;
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(userId, options = {}) {
  const {
    limit = 20,
    offset = 0,
    status = "active",
    orderBy = "last_message_at",
    ascending = false,
  } = options;

  let query = supabase
    .from("user_conversations")
    .select(
      "id, title, total_messages, total_tokens, last_message_at, is_pinned, created_at, status"
    )
    .eq("user_id", userId);

  if (status) {
    query = query.eq("status", status);
  }

  query = query
    .order("is_pinned", { ascending: false })
    .order(orderBy, { ascending })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }

  return data;
}

/**
 * Get a single conversation with all messages
 */
export async function getConversation(conversationId, userId) {
  const { data, error } = await supabase
    .from("user_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching conversation:", error);
    throw error;
  }

  return data;
}

/**
 * Add a message to a conversation
 */
export async function addMessage(conversationId, userId, message) {
  // First, get the current messages
  const { data: conversation, error: fetchError } = await supabase
    .from("user_conversations")
    .select("messages")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  if (fetchError) {
    console.error("Error fetching conversation:", fetchError);
    throw fetchError;
  }

  // Add the new message
  const updatedMessages = [...conversation.messages, message];

  // Update the conversation
  const { data, error } = await supabase
    .from("user_conversations")
    .update({ messages: updatedMessages })
    .eq("id", conversationId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error adding message:", error);
    throw error;
  }

  return data;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId,
  userId,
  newTitle
) {
  const { data, error } = await supabase
    .from("user_conversations")
    .update({ title: newTitle })
    .eq("id", conversationId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating title:", error);
    throw error;
  }

  return data;
}

/**
 * Pin/Unpin a conversation
 */
export async function toggleConversationPin(conversationId, userId, isPinned) {
  const { data, error } = await supabase
    .from("user_conversations")
    .update({ is_pinned: isPinned })
    .eq("id", conversationId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error toggling pin:", error);
    throw error;
  }

  return data;
}

/**
 * Archive a conversation (soft delete)
 */
export async function archiveConversation(conversationId, userId) {
  const { data, error } = await supabase
    .from("user_conversations")
    .update({ status: "archived" })
    .eq("id", conversationId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error archiving conversation:", error);
    throw error;
  }

  return data;
}

/**
 * Delete a conversation permanently
 */
export async function deleteConversation(conversationId, userId) {
  const { error } = await supabase
    .from("user_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }

  return true;
}

/**
 * Search conversations by title or message content
 */
export async function searchConversations(userId, searchTerm, limit = 10) {
  const { data, error } = await supabase
    .from("user_conversations")
    .select("id, title, total_messages, last_message_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .or(
      `title.ilike.%${searchTerm}%,messages.cs.${JSON.stringify([
        { content: searchTerm },
      ])}`
    )
    .order("last_message_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error searching conversations:", error);
    return [];
  }

  return data;
}

/**
 * Get conversation statistics
 */
export async function getConversationStats(userId) {
  const { data, error } = await supabase
    .from("user_conversations")
    .select("status, total_messages, total_tokens")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching stats:", error);
    return {
      total: 0,
      active: 0,
      archived: 0,
      totalMessages: 0,
      totalTokens: 0,
    };
  }

  return {
    total: data.length,
    active: data.filter((c) => c.status === "active").length,
    archived: data.filter((c) => c.status === "archived").length,
    totalMessages: data.reduce((sum, c) => sum + (c.total_messages || 0), 0),
    totalTokens: data.reduce((sum, c) => sum + (c.total_tokens || 0), 0),
  };
}

/**
 * Subscribe to conversation changes in real-time
 */
export function subscribeToConversation(conversationId, callback) {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_conversations",
        filter: `id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to all user conversations
 */
export function subscribeToUserConversations(userId, callback) {
  const channel = supabase
    .channel(`user_conversations:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_conversations",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from real-time updates
 */
export async function unsubscribeFromConversation(channel) {
  await supabase.removeChannel(channel);
}

/**
 * Generate a unique message ID
 */
export function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a formatted message object
 */
export function createMessage(role, content, options = {}) {
  return {
    id: options.id || generateMessageId(),
    role,
    content,
    timestamp: options.timestamp || new Date().toISOString(),
    tokens: options.tokens || null,
    model: options.model || null,
    ...options.metadata,
  };
}

/**
 * Update a specific message in a conversation
 */
export async function updateMessage(
  conversationId,
  userId,
  messageId,
  newContent
) {
  // Get current messages
  const { data: conversation, error: fetchError } = await supabase
    .from("user_conversations")
    .select("messages")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  if (fetchError) {
    console.error("Error fetching conversation:", fetchError);
    throw fetchError;
  }

  // Update the specific message
  const updatedMessages = conversation.messages.map((msg) =>
    msg.id === messageId ? { ...msg, content: newContent, edited: true } : msg
  );

  // Save updated messages
  const { data, error } = await supabase
    .from("user_conversations")
    .update({ messages: updatedMessages })
    .eq("id", conversationId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating message:", error);
    throw error;
  }

  return data;
}

/**
 * Delete a specific message from a conversation
 */
export async function deleteMessage(conversationId, userId, messageId) {
  // Get current messages
  const { data: conversation, error: fetchError } = await supabase
    .from("user_conversations")
    .select("messages")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  if (fetchError) {
    console.error("Error fetching conversation:", fetchError);
    throw fetchError;
  }

  // Remove the message
  const updatedMessages = conversation.messages.filter(
    (msg) => msg.id !== messageId
  );

  // Save updated messages
  const { data, error } = await supabase
    .from("user_conversations")
    .update({ messages: updatedMessages })
    .eq("id", conversationId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error deleting message:", error);
    throw error;
  }

  return data;
}
