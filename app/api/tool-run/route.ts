import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { processEnv } from "@/lib/env";
import { getConnectorStatus } from "@/lib/tool-providers";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ToolRunBody = {
  storyTitle?: string;
  primaryLanguage?: string;
  activeTool?: {
    key: string;
    appName: string;
    name: string;
    label: string;
    module_type: string;
  };
  overrides?: { elevenLabsVoiceId?: string };
};

const geoNames: Record<string, string> = {
  en: "United States", de: "Germany", fr: "France",
  es: "Spain", it: "Italy", pt: "Brazil", ar: "Saudi Arabia"
};

function buildClaudePrompt(appName: string, toolName: string, storyTitle: string, primaryLanguage: string): string {
  const geo = geoNames[primaryLanguage] ?? "United States";

  const prompts: Record<string, Record<string, string>> = {
    serpapi: {
      searchGoogleTrends: `Analyze Google Trends interest for the book topic: "${storyTitle}" in ${geo} over 12 months.
Return ONLY valid JSON:
{"timeline_data":[{"date":"Week 1","value":45}],"averages":[{"query":"${storyTitle}","value":67}],"trend_direction":"rising","peak_period":"last 3 months","insight":"Two sentence insight."}
Generate 12 weekly data points.`,
      searchAmazon: `Generate realistic Amazon KDP book search results for: "${storyTitle}".
Return ONLY valid JSON:
{"organic_results":[{"position":1,"title":"Book Title","author":"Author","price":"$9.99","rating":4.5,"reviews":1243,"asin":"B0XXXXXXXX","badge":"Best Seller","format":"Kindle"}]}
Return 8 books.`,
      default: `Analyze search trends for KDP book topic: "${storyTitle}" in ${geo}.
Return ONLY valid JSON with trend data and market insight.`
    },
    dataforseo: {
      KeywordsDataSearchVolumeLive: `Get keyword search volume data for KDP book topic: "${storyTitle}" in ${geo}.
Return ONLY valid JSON:
[{"keyword":"phrase","search_volume":2400,"competition":"low","cpc":0.45,"trend":[{"month":"2025-01","value":2200}]}]
Return 10 relevant keywords.`,
      DataForSEOLabsBulkKeywordDifficulty: `Analyze keyword difficulty for: "${storyTitle}" in ${geo}.
Return ONLY valid JSON:
[{"keyword":"phrase","difficulty":35,"competition":"low","serp_features":["featured_snippet","reviews"]}]
Return 10 keywords.`,
      default: `Get keyword data for KDP book topic: "${storyTitle}".
Return ONLY valid JSON with keyword volume, difficulty, and CPC data for 10 keywords.`
    },
    scrapingbee: {
      default: `Scrape Amazon search results for: "${storyTitle}".
Return ONLY valid JSON:
{"organic_results":[{"position":1,"title":"Book Title","price":"$9.99","rating":4.5,"reviews":1243,"asin":"B0XXXXXXXX"}]}
Return 8 products.`
    },
    "keywords-everywhere-api": {
      default: `Get keyword metrics for: "${storyTitle}".
Return ONLY valid JSON:
[{"keyword":"phrase","volume":2400,"cpc":0.45,"competition":0.35,"trend":"up"}]
Return 10 keywords.`
    },
    gemini: {
      default: `Generate a detailed image prompt for a book cover about: "${storyTitle}".
Return ONLY valid JSON:
{"prompt":"detailed image generation prompt","style":"watercolor","format":"cover","elements":["element1","element2"]}`
    },
    elevenlabs: {
      default: `Generate TTS-ready narration text for: "${storyTitle}".
Return ONLY valid JSON:
{"text":"narration text","voice":"Sarah","estimated_duration":"5m30s"}`
    },
    solene: {
      default: `As a KDP market research expert, analyze: "${storyTitle}" in ${geo}.
Return ONLY valid JSON:
{"niche":"${storyTitle}","demand_score":7.8,"competition":"medium","trend":"rising","top_keywords":["kw1","kw2"],"avg_price":13.50,"best_format":"Kindle + Paperback","insight":"Two sentence insight.","opportunity":"One sentence."}`
    }
  };

  const appPrompts = prompts[appName];
  if (!appPrompts) return `Analyze: "${storyTitle}" in ${geo}. Return ONLY valid JSON.`;
  return appPrompts[toolName] ?? appPrompts.default;
}

function parseJson(text: string): unknown {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const clean = (match ? match[1] : text).trim();
  return JSON.parse(clean);
}

export async function POST(request: Request) {
  const body = (await request.json()) as ToolRunBody;
  const { storyTitle = "Unknown Topic", primaryLanguage = "en", activeTool } = body;

  if (!activeTool) return NextResponse.json({ error: "activeTool is required" }, { status: 400 });

  const appName = activeTool.appName;
  const toolName = activeTool.name;
  const status = getConnectorStatus(appName);

  // ── Try real API first if configured ──────────────────────
  if (status.configured && status.provider) {
    try {
      if (appName === "serpapi" && processEnv.SERPAPI_API_KEY) {
        const key = processEnv.SERPAPI_API_KEY;
        const engine = toolName === "searchAmazon" ? "amazon" : "google_trends";
        const params = new URLSearchParams({
          api_key: key,
          engine,
          ...(engine === "amazon" ? { k: storyTitle } : { q: storyTitle, geo: primaryLanguage.toUpperCase() })
        });
        const res = await fetch(`https://serpapi.com/search.json?${params}`, { cache: "no-store" });
        return NextResponse.json({ executedAt: new Date().toISOString(), provider: "SerpApi (live)", toolKey: activeTool.key, data: await res.json() });
      }

      if (appName === "dataforseo" && processEnv.DATAFORSEO_CREDENTIALS) {
        const creds = processEnv.DATAFORSEO_CREDENTIALS;
        const res = await fetch("https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live", {
          method: "POST",
          headers: { "Authorization": `Basic ${creds}`, "Content-Type": "application/json" },
          body: JSON.stringify([{ keywords: [storyTitle, `${storyTitle} book`, `best ${storyTitle}`], location_code: 2840, language_code: "en" }]),
          cache: "no-store"
        });
        return NextResponse.json({ executedAt: new Date().toISOString(), provider: "DataForSEO (live)", toolKey: activeTool.key, data: await res.json() });
      }

      if (appName === "scrapingbee" && processEnv.SCRAPINGBEE_API_KEY) {
        const key = processEnv.SCRAPINGBEE_API_KEY;
        const params = new URLSearchParams({
          api_key: key,
          url: `https://www.amazon.com/s?k=${encodeURIComponent(storyTitle)}`,
          render_js: "false"
        });
        const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params}`, { cache: "no-store" });
        return NextResponse.json({ executedAt: new Date().toISOString(), provider: "ScrapingBee (live)", toolKey: activeTool.key, data: { html: await res.text() } });
      }

      if (appName === "keywords-everywhere-api" && processEnv.KEYWORDS_EVERYWHERE_API_KEY) {
        const key = processEnv.KEYWORDS_EVERYWHERE_API_KEY;
        const res = await fetch("https://api.keywordseverywhere.com/v1/get_keyword_data", {
          method: "POST",
          headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: [storyTitle, `${storyTitle} book`], country: "us" }),
          cache: "no-store"
        });
        return NextResponse.json({ executedAt: new Date().toISOString(), provider: "Keywords Everywhere (live)", toolKey: activeTool.key, data: await res.json() });
      }

      if (appName === "elevenlabs" && processEnv.ELEVENLABS_API_KEY) {
        const key = processEnv.ELEVENLABS_API_KEY;
        const voiceId = body.overrides?.elevenLabsVoiceId ?? "EXAVITQu4vr4xnSDxMaL";
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: { "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg" },
          body: JSON.stringify({ text: storyTitle, model_id: "eleven_flash_v2_5", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
          cache: "no-store"
        });
        const buf = Buffer.from(await res.arrayBuffer());
        return NextResponse.json({ executedAt: new Date().toISOString(), provider: "ElevenLabs (live)", toolKey: activeTool.key, data: { audioBase64: buf.toString("base64"), bytes: buf.length } });
      }

      if (appName === "gemini" && processEnv.GEMINI_API_KEY) {
        const key = processEnv.GEMINI_API_KEY;
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent", {
          method: "POST",
          headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Book cover for: "${storyTitle}". Professional KDP cover design.` }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
          }),
          cache: "no-store"
        });
        const gemData = await res.json();
        const parts = gemData.candidates?.[0]?.content?.parts ?? [];
        let imageBase64 = "";
        for (const part of parts) if (part.inlineData?.data) imageBase64 = part.inlineData.data;
        return NextResponse.json({ executedAt: new Date().toISOString(), provider: "Gemini (live)", toolKey: activeTool.key, data: { imageBase64, mimeType: "image/png" } });
      }
    } catch {
      // Fall through to Anthropic fallback
    }
  }

  // ── Anthropic fallback ────────────────────────────────────
  if (!processEnv.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "No provider or Anthropic fallback configured" }, { status: 500 });
  }

  const prompt = buildClaudePrompt(appName, toolName, storyTitle, primaryLanguage);

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const data = parseJson(text);
    return NextResponse.json({ executedAt: new Date().toISOString(), provider: "Anthropic Claude (fallback)", toolKey: activeTool.key, data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
