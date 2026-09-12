import { createClient } from "@/lib/supabase/client";

// Module-level client - created once and reused
const supabase = createClient();

// Create or update a share for a conversation
export async function upsertShare({
  conversationId,
  isPublic = true,
  title,
  summary,
  snapshot,
}) {
  // Use RPC to respect RLS and ownership
  const { data, error } = await supabase.rpc("upsert_shared_conversation", {
    p_conversation_id: conversationId,
    p_is_public: isPublic,
    p_title: title || null,
    p_summary: summary || null,
    p_snapshot: snapshot || [],
  });

  if (error) throw error;
  return data;
}

// Fetch a shared conversation by token (public access allowed when is_public = true)
export async function getSharedByToken(token) {
  const { data, error } = await supabase
    .from("shared_conversations")
    .select(
      "id, share_token, is_public, title, summary, snapshot, shared_at, conversation_id"
    )
    .eq("share_token", token)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  return data;
}

// Delete (soft) a share
export async function deleteShare(shareId) {
  const { data, error } = await supabase
    .from("shared_conversations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", shareId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
