import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Optionally fetch additional repo data from GitHub for each repo
    const reposWithData = await Promise.all(
      (repos || []).map(async (repo) => {
        // Try to get cached repo data or fetch from GitHub
        if (!repo.repo_data) {
          try {
            const githubResponse = await fetch(
              `https://api.github.com/repos/${repo.repo_full_name}`,
              {
                headers: {
                  Accept: "application/vnd.github.v3+json",
                  ...(process.env.GITHUB_TOKEN && {
                    Authorization: `token ${process.env.GITHUB_TOKEN}`,
                  }),
                },
                next: { revalidate: 3600 }, // Cache for 1 hour
              }
            );

            if (githubResponse.ok) {
              const githubData = await githubResponse.json();
              return {
                ...repo,
                repo_data: {
                  description: githubData.description,
                  stargazers_count: githubData.stargazers_count,
                  forks_count: githubData.forks_count,
                  language: githubData.language,
                  topics: githubData.topics,
                  updated_at: githubData.updated_at,
                },
              };
            }
          } catch (fetchError) {
            console.error(
              `Error fetching GitHub data for ${repo.repo_full_name}:`,
              fetchError
            );
          }
        }
        return repo;
      })
    );

    return NextResponse.json({
      repos: reposWithData,
      count: reposWithData.length,
    });
  } catch (error) {
    console.error("Starred API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
