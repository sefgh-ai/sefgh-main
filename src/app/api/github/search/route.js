import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const sort = searchParams.get("sort") || "all";
    const language = searchParams.get("language");
    const stars = searchParams.get("stars");
    const page = searchParams.get("page") || "1";
    const per_page = searchParams.get("per_page") || "30";

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const isValidLanguage =
      !language || /^[A-Za-z0-9._+-]{1,50}$/.test(language);
    const isValidStars =
      !stars || /^(\*|[0-9]+|[0-9]+\.\.[0-9]+|[<>]=?[0-9]+)$/.test(stars);

    const pageNumber = Number(page);
    const perPageNumber = Number(per_page);

    if (!isValidLanguage || !isValidStars || Number.isNaN(pageNumber) || Number.isNaN(perPageNumber)) {
      return NextResponse.json(
        { error: "Invalid search parameters" },
        { status: 400 }
      );
    }

    const safePage = Math.max(1, pageNumber);
    const safePerPage = Math.min(100, Math.max(1, perPageNumber));

    // Build GitHub search query
    let githubQuery = query;
    if (language) {
      githubQuery += ` language:${language}`;
    }
    if (stars) {
      githubQuery += ` stars:${stars}`;
    }

    // Map our filter options to GitHub's sort/order parameters
    const filterMap = {
      all: { sort: "", order: "desc" },
      latest: { sort: "updated", order: "desc" },
      monthly: { sort: "updated", order: "desc" },
      yearly: { sort: "updated", order: "desc" },
      featured: { sort: "stars", order: "desc" },
    };

    const filterConfig = filterMap[sort] || filterMap["all"];
    const githubSort = filterConfig.sort;
    const order = filterConfig.order;

    // GitHub API request
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
      githubQuery
    )}&sort=${githubSort}&order=${order}&page=${safePage}&per_page=${safePerPage}`;

    // Without a token GitHub allows ~10 search req/min for the whole app,
    // shared across every visitor. With one it is 30/min.
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "SEFGH-NextJS-App",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      total_count: data.total_count,
      items: data.items,
      rate_limit: {
        remaining: response.headers.get("x-ratelimit-remaining"),
        reset: response.headers.get("x-ratelimit-reset"),
      },
    });
  } catch (error) {
    console.error("GitHub search error:", error);
    return NextResponse.json(
      { error: "Failed to search repositories" },
      { status: 500 }
    );
  }
}
