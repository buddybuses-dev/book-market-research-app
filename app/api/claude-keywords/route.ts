import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const niche = searchParams.get("niche");
  const targetAudience = searchParams.get("target_audience") || "general";
  const format = searchParams.get("format") || "json";

  if (!niche) {
    return NextResponse.json({ error: "niche parameter is required" }, { status: 400 });
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `You are a KDP keyword research expert. Generate keyword data for the following book niche.

Niche: "${niche}"
Target audience: ${targetAudience}

Return ONLY valid JSON array (no markdown, no explanation) of exactly 10 keywords in this shape:
[
  {
    "keyword": "<specific KDP search phrase>",
    "volume": <estimated monthly searches as integer, 100-50000>,
    "competition": "low" | "medium" | "high",
    "ai_relevance_score": <number 1-10>,
    "kdp_category_fit": "<most relevant Amazon category>",
    "tip": "<one actionable tip for using this keyword>"
  }
]

Focus on long-tail, buyer-intent keywords real people type into Amazon search.`
      }]
    });

    const text = (message.content[0] as { type: string; text: string }).text;
    const data = JSON.parse(text);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "max-age=3600" }
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
