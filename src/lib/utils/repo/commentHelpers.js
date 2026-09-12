/**
 * Fetch replies recursively for a comment
 * @param {Object} supabase - Supabase client
 * @param {string} commentId - Parent comment ID
 * @returns {Promise<Array>} Array of nested replies
 */
export async function fetchRepliesRecursively(supabase, commentId) {
  try {
    const { data: replies, error } = await supabase
      .from("repo_comments")
      .select("*")
      .eq("parent_id", commentId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!replies || replies.length === 0) return [];

    const enrichedReplies = await Promise.allSettled(
      replies.map(async (reply) => {
        try {
          // Get user profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", reply.user_id)
            .maybeSingle();

          // Fallback to email if no username
          let userEmail = null;
          if (!profile?.username) {
            try {
              const {
                data: { user: replyUser },
              } = await supabase.auth.admin.getUserById(reply.user_id);
              userEmail = replyUser?.email;
            } catch (e) {
              // admin.getUserById might fail, that's okay
            }
          }

          // Fetch nested replies
          const nestedReplies = await fetchRepliesRecursively(
            supabase,
            reply.id
          );

          return {
            ...reply,
            user_name: profile?.username || null,
            user_email: userEmail,
            user_avatar: profile?.avatar_url || null,
            replies: nestedReplies,
          };
        } catch (err) {
          console.error("Error enriching reply:", err);
          return {
            ...reply,
            user_name: null,
            user_email: null,
            user_avatar: null,
            replies: [],
          };
        }
      })
    );

    return enrichedReplies
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
  } catch (error) {
    console.error("Error fetching replies:", error);
    return [];
  }
}

/**
 * Enrich comments with user info and nested replies
 * @param {Object} supabase - Supabase client
 * @param {Array} rawComments - Raw comment data
 * @returns {Promise<Array>} Enriched comments with user data and replies
 */
export async function enrichCommentsWithUserData(supabase, rawComments) {
  try {
    const enrichedComments = await Promise.allSettled(
      (rawComments || []).map(async (comment) => {
        try {
          // Get user profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", comment.user_id)
            .maybeSingle();

          // Fallback to email if no username
          let userEmail = null;
          if (!profile?.username) {
            try {
              const {
                data: { user: commentUser },
              } = await supabase.auth.admin.getUserById(comment.user_id);
              userEmail = commentUser?.email;
            } catch (e) {
              // admin.getUserById might fail, that's okay
            }
          }

          // Fetch nested replies
          const replies = await fetchRepliesRecursively(supabase, comment.id);

          return {
            ...comment,
            user_name: profile?.username || null,
            user_email: userEmail,
            user_avatar: profile?.avatar_url || null,
            replies: replies,
          };
        } catch (err) {
          console.error("Error enriching comment:", err);
          return {
            ...comment,
            user_name: null,
            user_email: null,
            user_avatar: null,
            replies: [],
          };
        }
      })
    );

    return enrichedComments
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
  } catch (error) {
    console.error("Error enriching comments:", error);
    return [];
  }
}
