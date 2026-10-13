import { withGitHubAccess, githubFetch } from '@/lib/github/access'
import { NextResponse } from "next/server";

// GitHub serves only the first 1000 results, so no later page can succeed.
const MAX_PAGE = 1000;
const MAX_PER_PAGE = 100;

// A primary limit reports zero remaining requests and a secondary limit
// sends Retry-After. A 403 with neither is treated as an ordinary failure.
function isRateLimited(response) {
  if (response.status === 429) return true;
  return (
    response.status === 403 &&
    (Boolean(response.headers.get("retry-after")) ||
      response.headers.get("x-ratelimit-remaining") === "0")
  );
}

async function handleGET(request, _context, access) {
  const fetch = (url, init) => githubFetch(url, access.token, init)
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const sort = searchParams.get("sort") || "all";
    const language = searchParams.get("language");
    const stars = searchParams.get("stars");
    const page = searchParams.get("page") || "1";
    const per_page = searchParams.get("per_page") || "30";

    // A query made only of whitespace counts as missing.
    if (!query || !/\P{White_Space}/u.test(query)) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Words separated by single spaces, so "C#" and "Jupyter Notebook" pass.
    const isValidLanguage =
      !language ||
      (language.length <= 50 &&
        /^[A-Za-z0-9._+#-]+( [A-Za-z0-9._+#-]+)*$/.test(language));
    const isValidStars =
      !stars || /^(\*|[0-9]+|[0-9]+\.\.[0-9]+|[<>]=?[0-9]+)$/.test(stars);
    // Whole numbers only. Number() alone also accepts "2.5", "1e2", "0x10",
    // "Infinity" and blank strings.
    const isInteger = (value) => /^-?[0-9]+$/.test(value);

    if (!isValidLanguage || !isValidStars || !isInteger(page) || !isInteger(per_page)) {
      return NextResponse.json(
        { error: "Invalid search parameters" },
        { status: 400 }
      );
    }

    const safePage = Math.min(MAX_PAGE, Math.max(1, Number(page)));
    const safePerPage = Math.min(MAX_PER_PAGE, Math.max(1, Number(per_page)));

    // Build GitHub search query
    let githubQuery = query;
    if (language) {
      // GitHub needs quotes around a qualifier value that contains a space.
      githubQuery += language.includes(" ")
        ? ` language:"${language}"`
        : ` language:${language}`;
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

    // Object.hasOwn keeps inherited keys such as "constructor" from matching.
    const filterConfig = Object.hasOwn(filterMap, sort)
      ? filterMap[sort]
      : filterMap["all"];
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
        ...(access.token
          ? { Authorization: `Bearer ${access.token}` }
          : {}),
      },
    });

    const rateLimit = {
      remaining: response.headers.get("x-ratelimit-remaining"),
      reset: response.headers.get("x-ratelimit-reset"),
    };

    if (!response.ok) {
      if (isRateLimited(response)) {
        const retryAfter = response.headers.get("retry-after");
        return NextResponse.json(
          {
            error: "GitHub rate limit reached, please try again shortly",
            rate_limit: rateLimit,
          },
          {
            status: 429,
            headers: retryAfter ? { "Retry-After": retryAfter } : {},
          }
        );
      }

      // GitHub rejected the search itself: a query it cannot parse, or a
      // page beyond its 1000-result cap.
      if (response.status === 422) {
        return NextResponse.json(
          { error: "GitHub could not process this search" },
          { status: 400 }
        );
      }

      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    if (typeof data?.total_count !== "number" || !Array.isArray(data.items)) {
      throw new Error("GitHub API returned an unexpected body");
    }

    return NextResponse.json({
      total_count: data.total_count,
      items: data.items,
      rate_limit: rateLimit,
    });
  } catch (error) {
    console.error("GitHub search error:", error);
    return NextResponse.json(
      { error: "Failed to search repositories" },
      { status: 500 }
    );
  }
}

export const GET = withGitHubAccess(handleGET);
