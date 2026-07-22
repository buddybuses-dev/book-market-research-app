import { NextResponse } from "next/server";

const SOLENE_AGENT_ID = "6a5ff38fd72457c0ed1c8ddd";
const SOLENE_API_BASE = "https://app.base44.com/api/agents";

const geoNames: Record<string, string> = {
  en: "United States", de: "Germany", fr: "France",
  es: "Spain", it: "Italy", pt: "Brazil", ar: "Saudi Arabia"
};

const languageMarketMap: Record<string, { geo: string; amazonDomain: string; locationCode: number }> = {
  en: { geo: "US", amazonDomain: "amazon.com", locationCode: 2840 },
  de: { geo: "DE", amazonDomain: "amazon.de", locationCode: 2276 },
  fr: { geo: "FR", amazonDomain: "amazon.fr", locationCode: 2250 },
  es: { geo: "ES", amazonDomain: "amazon.es", locationCode: 2724 },
  it: { geo: "IT", amazonDomain: "amazon.it", locationCode: 2380 },
  pt: { geo: "BR", amazonDomain: "amazon.com.br", locationCode: 2076 },
  ar: { geo: "SA", amazonDomain: "amazon.sa", locationCode: 2682 }
};

// ElevenLabs premade voices that work on free plan
const ELEVENLABS_VOICES = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura" }
];

type AgentResearchBody = {
  niche: string;
  tool: string;
  language?: string;
  format?: "trends" | "keywords" | "amazon" | "competitors" | "dataforseo" | "tts" | "generic";
  text?: string;
  voiceId?: string;
};

async function callSerpApi(params: Record<string, string>): Promise<Record<string, unknown>> {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) throw new Error("SERPAPI_API_KEY not set");
  const p = new URLSearchParams({ ...params, api_key: key });
  const res = await fetch(`https://serpapi.com/search.json?${p}`, { cache: "no-store" });
  return await res.json() as Record<string, unknown>;
}

async function callDataForSEO(endpoint: string, body: unknown[]): Promise<Record<string, unknown>> {
  const creds = process.env.DATAFORSEO_CREDENTIALS;
  if (!creds) throw new Error("DATAFORSEO_CREDENTIALS not set");
  const res = await fetch(`https://api.dataforseo.com/v3${endpoint}`, {
    method: "POST",
    headers: { "Authorization": `Basic ${creds}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  return await res.json() as Record<string, unknown>;
}

async function callElevenLabs(text: string, voiceId?: string): Promise<{ audioBase64: string; voiceName: string; bytes: number }> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY not set");
  const voice = ELEVENLABS_VOICES.find(v => v.id === voiceId) ?? ELEVENLABS_VOICES[0];
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg" },
    body: JSON.stringify({ text, model_id: "eleven_flash_v2_5", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    cache: "no-store"
  });
  if (!res.ok) {
    const err = await res.json() as { detail?: { message?: string } };
    throw new Error(err.detail?.message ?? "ElevenLabs TTS failed");
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { audioBase64: buf.toString("base64"), voiceName: voice.name, bytes: buf.length };
}

async function callSolene(prompt: string): Promise<string> {
  const apiKey = process.env.SOLENE_API_KEY;
  if (!apiKey) throw new Error("SOLENE_API_KEY not set");
  const convRes = await fetch(`${SOLENE_API_BASE}/${SOLENE_AGENT_ID}/conversations/default`, {
    method: "POST", headers: { "Content-Type": "application/json", "api_key": apiKey }
  });
  const conv = await convRes.json() as { id: string };
  const msgRes = await fetch(`${SOLENE_API_BASE}/${SOLENE_AGENT_ID}/conversations/${conv.id}/messages`, {
    method: "POST", headers: { "Content-Type": "application/json", "api_key": apiKey },
    body: JSON.stringify({ content: prompt })
  });
  const msg = await msgRes.json() as { content?: string; message?: { content?: string } };
  return msg.content ?? msg.message?.content ?? "";
}

function parseJson(text: string): unknown {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const clean = (match ? match[1] : text).trim();
  return JSON.parse(clean);
}

const solenePrompts: Record<string, (niche: string, geo: string) => string> = {
  trends: (n, g) => `KDP book market analyst. Analyze Google Trends for: "${n}" in ${g} over 12 months. Return ONLY valid JSON: {"timeline_data":[{"date":"Week 1","value":65}],"averages":[{"query":"${n}","value":72}],"trend_direction":"rising","peak_period":"last 3 months","insight":"Two sentence insight."} 12 weekly data points.`,
  keywords: (n, g) => `KDP keyword expert. Research for: "${n}" in ${g}. Return ONLY valid JSON: [{"keyword":"phrase","volume":2400,"competition":"low","ai_relevance_score":8.5,"kdp_category_fit":"Self-Help","tip":"Tip."}] 10 buyer-intent keywords.`,
  amazon: (n) => `Amazon KDP expert. Realistic book results for: "${n}". Return ONLY valid JSON: {"organic_results":[{"position":1,"title":"Title","author":"Author","price":"$12.99","rating":4.5,"reviews":1243,"asin":"B0XXXXXXXX","badge":"Best Seller","format":"Paperback","bsr":45000}]} 8 books.`,
  competitors: (n, g) => `Amazon analyst. Competitive pricing for books like: "${n}" in ${g}. Return ONLY valid JSON: {"items":[{"asin":"B0XXXXXXXX","title":"Book","price":12.99,"format":"Paperback","seller_rank":45000,"estimated_monthly_sales":320,"royalty_estimate_usd":147}],"summary":{"avg_price":13.50,"price_range":{"min":9.99,"max":24.99},"market_opportunity":"One sentence."}} 6 products.`,
  generic: (n, g) => `KDP research expert. Market research for: "${n}" in ${g}. Return ONLY valid JSON: {"niche":"${n}","market":"${g}","demand_score":7.8,"competition":"medium","trend":"rising","top_keywords":["kw1","kw2","kw3"],"avg_price":13.50,"best_format":"Kindle + Paperback","insight":"Two sentence insight.","opportunity":"One sentence opportunity."}`
};

export async function POST(request: Request) {
  const body = (await request.json()) as AgentResearchBody;
  const { niche, tool, language = "en", format = "generic", text, voiceId } = body;
  if (!niche && format !== "tts") return NextResponse.json({ error: "niche is required" }, { status: 400 });

  const market = languageMarketMap[language] ?? languageMarketMap.en;
  const geo = geoNames[language] ?? "United States";

  try {
    // ── TTS via ElevenLabs ───────────────────────────────────
    if (format === "tts") {
      const ttsText = text ?? `This is a voiceover for ${niche}.`;
      const audio = await callElevenLabs(ttsText, voiceId);
      return NextResponse.json({ executedAt: new Date().toISOString(), provider: "ElevenLabs (live)", niche, tool, format, data: audio });
    }

    // ── Amazon search via SerpApi ────────────────────────────
    if ((format === "amazon" || format === "competitors") && process.env.SERPAPI_API_KEY) {
      const data = await callSerpApi({ engine: "amazon", k: niche, amazon_domain: market.amazonDomain, hl: language });
      return NextResponse.json({ executedAt: new Date().toISOString(), provider: "SerpApi (live)", niche, tool, format, data });
    }

    // ── Google Trends via SerpApi ────────────────────────────
    if (format === "trends" && process.env.SERPAPI_API_KEY) {
      const data = await callSerpApi({ engine: "google_trends", q: niche, geo: market.geo, date: "today 12-m", data_type: "TIMESERIES" });
      return NextResponse.json({ executedAt: new Date().toISOString(), provider: "SerpApi (live)", niche, tool, format, data });
    }

    // ── Keywords via DataForSEO ──────────────────────────────
    if (format === "keywords" && process.env.DATAFORSEO_CREDENTIALS) {
      const data = await callDataForSEO("/keywords_data/google_ads/search_volume/live", [
        { keywords: [niche, `${niche} book`, `best ${niche} books`, `${niche} guide`], location_code: market.locationCode, language_code: language === "ar" ? "ar" : language }
      ]);
      return NextResponse.json({ executedAt: new Date().toISOString(), provider: "DataForSEO (live)", niche, tool, format, data });
    }

    // ── Solene fallback for everything ───────────────────────
    if (process.env.SOLENE_API_KEY) {
      const buildPrompt = solenePrompts[format] ?? solenePrompts.generic;
      const rawText = await callSolene(buildPrompt(niche, geo));
      const data = parseJson(rawText);
      return NextResponse.json({ executedAt: new Date().toISOString(), provider: "Solene (Base44 AI)", agentId: SOLENE_AGENT_ID, niche, tool, format, data });
    }

    return NextResponse.json({ error: "No provider configured. Add SERPAPI_API_KEY, DATAFORSEO_CREDENTIALS, or SOLENE_API_KEY to Railway." }, { status: 500 });

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
