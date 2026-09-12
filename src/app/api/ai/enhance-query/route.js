import { NextResponse } from "next/server";

/**
 * POST /api/ai/enhance-query
 * Enhances a user's search query to make it more effective
 */
export async function POST(request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Check if AI API key is configured
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // Fallback: provide basic query enhancement without AI
      const enhancedQuery = enhanceQueryBasic(query);
      return NextResponse.json({
        enhancedQuery,
        source: "basic-enhancement",
      });
    }

    // Use AI to enhance the query
    const enhancedQuery = await enhanceQueryWithAI(query, apiKey);

    return NextResponse.json({
      enhancedQuery,
      source: "ai-powered",
    });
  } catch (error) {
    console.error("Error enhancing query:", error);
    return NextResponse.json(
      { error: "Failed to enhance query" },
      { status: 500 }
    );
  }
}

/**
 * Basic query enhancement without AI
 */
function enhanceQueryBasic(query) {
  const trimmed = query.trim().toLowerCase();

  // Add common GitHub search operators
  const enhancements = [];

  // If it's a simple term, add common modifiers
  if (!trimmed.includes(":") && !trimmed.includes('"')) {
    // Check for common patterns
    if (/(web|website|site)/i.test(trimmed)) {
      enhancements.push("web application");
    }
    if (/(app|application)/i.test(trimmed)) {
      enhancements.push("application");
    }
    if (/(api|rest|graphql)/i.test(trimmed)) {
      enhancements.push("API");
    }
    if (/(dashboard|admin|panel)/i.test(trimmed)) {
      enhancements.push("dashboard");
    }
    if (/(mobile|android|ios)/i.test(trimmed)) {
      enhancements.push("mobile");
    }

    // Return enhanced version
    if (enhancements.length > 0) {
      return query + " " + enhancements.join(" ");
    }
  }

  return query;
}

/**
 * AI-powered query enhancement
 */
async function enhanceQueryWithAI(query, apiKey) {
  // Check which API key is available
  const isOpenAI = process.env.OPENAI_API_KEY;

  if (isOpenAI) {
    return await enhanceWithOpenAI(query, apiKey);
  } else {
    return await enhanceWithAnthropic(query, apiKey);
  }
}

/**
 * Enhance query using OpenAI
 */
async function enhanceWithOpenAI(query, apiKey) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a GitHub search query optimizer. Your task is to take a user's search query and enhance it to make it more effective for searching GitHub repositories. 
          
Rules:
- Add relevant keywords that would help find better results
- Use GitHub search operators when appropriate (stars:, language:, topic:, etc.)
- Keep the query concise and focused
- Don't change the core intent of the search
- Return ONLY the enhanced query, nothing else
- Don't add quotes or explanations`,
        },
        {
          role: "user",
          content: query,
        },
      ],
      max_tokens: 100,
      temperature: 0.7,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "OpenAI API error");
  }

  return data.choices[0].message.content.trim();
}

/**
 * Enhance query using Anthropic Claude
 */
async function enhanceWithAnthropic(query, apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `You are a GitHub search query optimizer. Enhance this search query to make it more effective for finding GitHub repositories: "${query}"
          
Rules:
- Add relevant keywords
- Use GitHub search operators when helpful (stars:, language:, topic:)
- Keep it concise
- Return ONLY the enhanced query, nothing else`,
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Anthropic API error");
  }

  return data.content[0].text.trim();
}
