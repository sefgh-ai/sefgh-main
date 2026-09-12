import {
  fetchRepliesRecursively,
  enrichCommentsWithUserData,
} from "@/lib/utils/repo/commentHelpers";
import { logError } from "@/lib/error-tracking";

/**
 * Fetch SEFGH-specific data from Supabase
 * @param {Object} supabase - Supabase client instance
 * @param {string} repoFullName - Full repository name (owner/repo)
 * @returns {Promise<Object>} SEFGH data including votes, ratings, comments, saves
 */
export async function fetchSefghData(supabase, repoFullName) {
  try {
    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch all data in parallel for better performance
    const [votesData, ratingsData, commentsData, savesData] =
      await Promise.allSettled([
        fetchVotesData(supabase, repoFullName, user),
        fetchRatingsData(supabase, repoFullName, user),
        fetchCommentsData(supabase, repoFullName),
        fetchSavesData(supabase, repoFullName, user),
      ]);

    return {
      votes:
        votesData.status === "fulfilled"
          ? votesData.value.votes
          : { upvotes: 0, downvotes: 0, net_votes: 0 },
      userVote:
        votesData.status === "fulfilled" ? votesData.value.userVote : null,
      ratings:
        ratingsData.status === "fulfilled"
          ? ratingsData.value.ratings
          : { total: 0, average: 0 },
      userRating:
        ratingsData.status === "fulfilled"
          ? ratingsData.value.userRating
          : null,
      comments: commentsData.status === "fulfilled" ? commentsData.value : [],
      saveCount:
        savesData.status === "fulfilled" ? savesData.value.saveCount : 0,
      userSaved:
        savesData.status === "fulfilled" ? savesData.value.userSaved : false,
    };
  } catch (error) {
    console.error("Error fetching SEFGH data:", error);
    logError("sefgh_data_fetch_failed", error, { repoFullName });

    // Return default values instead of crashing
    return {
      votes: { upvotes: 0, downvotes: 0, net_votes: 0 },
      userVote: null,
      ratings: { total: 0, average: 0 },
      userRating: null,
      comments: [],
      saveCount: 0,
      userSaved: false,
    };
  }
}

/**
 * Fetch voting data for repository
 */
async function fetchVotesData(supabase, repoFullName, user) {
  try {
    const { data: allVotes, error: votesError } = await supabase
      .from("repo_votes")
      .select("vote_type")
      .eq("repo_full_name", repoFullName);

    if (votesError) throw votesError;

    const upvotes =
      allVotes?.filter((v) => v.vote_type === "upvote").length || 0;
    const downvotes =
      allVotes?.filter((v) => v.vote_type === "downvote").length || 0;

    let userVote = null;
    if (user) {
      const { data: userVoteData } = await supabase
        .from("repo_votes")
        .select("vote_type")
        .eq("user_id", user.id)
        .eq("repo_full_name", repoFullName)
        .maybeSingle(); // Use maybeSingle to avoid error on no results

      userVote = userVoteData?.vote_type || null;
    }

    return {
      votes: {
        upvotes,
        downvotes,
        net_votes: upvotes - downvotes,
      },
      userVote,
    };
  } catch (error) {
    console.error("Error fetching votes:", error);
    return {
      votes: { upvotes: 0, downvotes: 0, net_votes: 0 },
      userVote: null,
    };
  }
}

/**
 * Fetch ratings data for repository
 */
async function fetchRatingsData(supabase, repoFullName, user) {
  try {
    const { data: ratings, error: ratingsError } = await supabase
      .from("repo_ratings")
      .select("*")
      .eq("repo_full_name", repoFullName);

    if (ratingsError) throw ratingsError;

    const totalRatings = ratings?.length || 0;
    const averageRating =
      totalRatings > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0;

    let userRating = null;
    if (user) {
      const { data: userRatingData } = await supabase
        .from("repo_ratings")
        .select("*")
        .eq("user_id", user.id)
        .eq("repo_full_name", repoFullName)
        .maybeSingle(); // Use maybeSingle to avoid error on no results

      userRating = userRatingData || null;
    }

    return {
      ratings: {
        total: totalRatings,
        average: averageRating,
      },
      userRating,
    };
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return {
      ratings: { total: 0, average: 0 },
      userRating: null,
    };
  }
}

/**
 * Fetch comments data for repository
 */
async function fetchCommentsData(supabase, repoFullName) {
  try {
    const { data: rawComments, error: commentsError } = await supabase
      .from("repo_comments")
      .select("*")
      .eq("repo_full_name", repoFullName)
      .is("parent_id", null)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(10);

    if (commentsError) throw commentsError;

    return await enrichCommentsWithUserData(supabase, rawComments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
}

/**
 * Fetch collection/save data for repository
 */
async function fetchSavesData(supabase, repoFullName, user) {
  try {
    const { data: saves, error: savesError } = await supabase
      .from("repo_collections")
      .select("user_id")
      .eq("repo_full_name", repoFullName);

    if (savesError) throw savesError;

    const saveCount = saves?.length || 0;
    let userSaved = false;
    if (user) {
      userSaved = saves?.some((s) => s.user_id === user.id) || false;
    }

    return { saveCount, userSaved };
  } catch (error) {
    console.error("Error fetching saves:", error);
    return { saveCount: 0, userSaved: false };
  }
}
