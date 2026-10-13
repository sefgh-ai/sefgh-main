import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchRepoFromGitHub } from "@/lib/repo/repoData";

/**
 * GET /api/repo/starred
 * Fetches all starred/collected repositories for the authenticated user
 */
export async function GET(request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's starred repos
    const { data: repos, error } = await supabase
      .from("repo_collections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching starred repos:", error);
      return NextResponse.json(
        { error: "Failed to fetch starred repositories" },
        { status: 500 }
      );
    }

    // Stored enrichment is a snapshot, not proof of current public visibility.
    // Keep the owner's collection/notes; never return stale repository metadata.
    const reposWithData = [];
    const rows = repos || [];
    // Revalidation must not start an unbounded number of upstream requests.
    for (let offset = 0; offset < rows.length; offset += 4) {
      const batch = await Promise.all(rows.slice(offset, offset + 4).map(async (repo) => {
        const parts = typeof repo.repo_full_name === 'string' ? repo.repo_full_name.split('/') : [];
        const data = parts.length === 2 ? await fetchRepoFromGitHub(parts[0], parts[1]) : null;
        return {
          ...repo,
          repo_data: data ? {
            description: data.description,
            stargazers_count: data.stargazers_count,
            forks_count: data.forks_count,
            language: data.language,
            topics: data.topics,
            updated_at: data.updated_at,
          } : null,
        };
      }));
      reposWithData.push(...batch);
    }

    return NextResponse.json({
      repos: reposWithData,
      count: reposWithData.length,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error("Starred API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
