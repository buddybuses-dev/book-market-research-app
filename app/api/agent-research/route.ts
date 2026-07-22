import { NextResponse } from "next/server";

const SOLENE_AGENT_ID = "6a5ff38fd72457c0ed1c8ddd";
const SOLENE_API_BASE = "https://app.base44.com/api/agents";

type AgentResearchBody = {
  niche: string;
  tool: string;
  language?: string;
  format?: "trends" | "keywords" | "amazon" | "competitors" | "generic";
};

const formatPrompts: Record<string, (niche: string, geo: string) => string> = {
  trends: (niche, geo) =>
    `You are a KDP book market research expert. Analyze Google Trends-style interest data for the book niche: "${niche}" in the ${geo} market over 12 months.

Return ONLY valid JSON (no markdown):
{
  "timeline_data": [{"date": "Week 1", "value": 65}],
  "averages": [{"query": "${niche}", "value": 72}],
  "trend_direction": "rising" | "stable" | "falling",
  "peak_period": "recent timeframe",
  "insight": "Two sentence market insight for a KDP author."
}
Generate 12 realistic weekly data points.`,

  keywords: (niche, geo) =>
    `You are a KDP keyword research expert. Generate keyword research data for the book niche: "${niche}" targeting the ${geo} market.

Return ONLY valid JSON (no markdown):
[
  {
    "keyword": "specific KDP phrase",
    "volume": 2400,
    "competition": "low" | "medium" | "high",
    "ai_relevance_score": 8.5,
    "kdp_category_fit": "Amazon category",
    "tip": "One actionable tip for using this keyword on KDP."
  }
]
Return 10 buyer-intent keywords real people type into Amazon search.`,

  amazon: (niche, geo) =>
    `You are an Amazon KDP research expert. Generate realistic Amazon book search results for the niche: "${niche}" in ${geo}.

Return ONLY valid JSON (no markdown):
{
  "organic_results": [
    {
      "position": 1,
      "title": "Book Title",
      "author": "Author Name",
      "price": "$12.99",
      "rating": 4.5,
      "reviews": 1243,
      "asin": "B0XXXXXXXX",
      "badge": "Best Seller",
      "format": "Paperback",
      "bsr": 45000,
      "category": "Self-Help"
    }
  ]
}
Return 8 realistic competing books based on real knowledge of this niche.`,

  competitors: (niche, geo) =>
    `You are an Amazon marketplace analyst. Provide competitive pricing and market analysis for books in the niche: "${niche}" in ${geo}.

Return ONLY valid JSON (no markdown):
{
  "items": [
    {
      "asin": "B0XXXXXXXX",
      "title": "Competing Book",
      "price": 12.99,
      "format": "Paperback",
      "seller_rank": 45000,
      "category": "Self-Help",
      "estimated_monthly_sales": 320,
      "royalty_estimate_usd": 147
    }
  ],
  "summary": {
    "avg_price": 13.50,
    "price_range": {"min": 9.99, "max": 24.99},
    "market_opportunity": "One sentence opportunity for new authors."
  }
}
Return 6 competitors with realistic data.`,

  generic: (niche, geo) =>
    `You are a KDP book market research expert. Provide comprehensive market research for the book niche: "${niche}" in the ${geo} market.

Return ONLY valid JSON (no markdown):
{
  "niche": "${niche}",
  "market": "${geo}",
  "demand_score": 7.8,
  "competition": "medium",
  "trend": "rising",
  "top_keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "avg_price": 13.50,
  "best_format": "Kindle + Paperback",
  "insight": "Two sentence market insight.",
  "opportunity": "One sentence specific opportunity for a new author."
}`
};

const geoNames: Record<string, string> = {
  en: "United States", de: "Germany", fr: "France",
  es: "Spain", it: "Italy", pt: "Brazil", ar: "Saudi Arabia"
};

export async function POST(request: Request) {
  const apiKey = process.env.SOLENE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "SOLENE_API_KEY is not configured. Add it to your Railway environment variables." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as AgentResearchBody;
  const { niche, tool, language = "en", format = "generic" } = body;

  if (!niche) {
    return NextResponse.json({ error: "niche is required" }, { status: 400 });
  }

  const geo = geoNames[language] ?? "United States";
  const buildPrompt = formatPrompts[format] ?? formatPrompts.generic;
  const prompt = buildPrompt(niche, geo);

  try {
    // Step 1: Get or create default conversation with Solene
    const convResponse = await fetch(
      `${SOLENE_API_BASE}/${SOLENE_AGENT_ID}/conversations/default`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api_key": apiKey
        }
      }
    );

    if (!convResponse.ok) {
      const err = await convResponse.text();
      return NextResponse.json({ error: `Failed to connect to Solene agent: ${err}` }, { status: 502 });
    }

    const conv = await convResponse.json() as { id: string };
    const conversationId = conv.id;

    // Step 2: Send research prompt to Solene
    const msgResponse = await fetch(
      `${SOLENE_API_BASE}/${SOLENE_AGENT_ID}/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api_key": apiKey
        },
        body: JSON.stringify({
          content: prompt
        })
      }
    );

    if (!msgResponse.ok) {
      const err = await msgResponse.text();
      return NextResponse.json({ error: `Solene agent returned error: ${err}` }, { status: 502 });
    }

    const msgResult = await msgResponse.json() as { content?: string; message?: { content?: string } };
    const rawText = msgResult.content ?? msgResult.message?.content ?? "";

    // Parse JSON from Solene's response
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonText = (jsonMatch ? jsonMatch[1] : rawText).trim();

    let data: unknown;
    try {
      data = JSON.parse(jsonText);
    } catch {
      // Return raw text if not JSON
      data = { raw_response: rawText };
    }

    return NextResponse.json({
      executedAt: new Date().toISOString(),
      provider: "Solene (Base44 AI Agent)",
      agentId: SOLENE_AGENT_ID,
      niche,
      tool,
      format,
      data
    }, {
      headers: { "Cache-Control": "max-age=1800" }
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
