import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const niche = searchParams.get("niche");
  const language = searchParams.get("language") || "en";

  if (!niche) {
    return NextResponse.json({ error: "niche parameter is required" }, { status: 400 });
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `You are a book market research expert. Analyze the following book niche for KDP publishing.

Niche: "${niche}"
Language market: ${language}

Return ONLY valid JSON (no markdown, no explanation) in this exact shape:
{
  "niche": "${niche}",
  "trend_direction": "up" | "down" | "stable",
  "volume_change": <number between -50 and 100, percent change>,
  "demand_score": <number 1-10>,
  "market_saturation": "low" | "medium" | "high",
  "top_keywords": [<5 highly relevant KDP keywords as strings>],
  "competitor_count_estimate": <number>,
  "avg_price_range": { "min": <number>, "max": <number> },
  "best_formats": [<2-3 of: "kindle", "paperback", "hardcover", "audiobook">],
  "insight": "<2 sentence market insight>",
  "opportunity": "<1 sentence specific opportunity for a new author>"
}`
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
