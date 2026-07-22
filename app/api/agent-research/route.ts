import { NextResponse } from "next/server";

const SOLENE_AGENT_ID = "6a5ff38fd72457c0ed1c8ddd";
const SOLENE_API_BASE = "https://app.base44.com/api/agents";

const geoNames: Record<string, string> = {
  en: "United States", de: "Germany", fr: "France",
  es: "Spain", it: "Italy", pt: "Brazil", ar: "Saudi Arabia"
};

const languageMarketMap: Record<string, { geo: string; amazonDomain: string }> = {
  en: { geo: "US", amazonDomain: "amazon.com" },
  de: { geo: "DE", amazonDomain: "amazon.de" },
  fr: { geo: "FR", amazonDomain: "amazon.fr" },
  es: { geo: "ES", amazonDomain: "amazon.es" },
  it: { geo: "IT", amazonDomain: "amazon.it" },
  pt: { geo: "BR", amazonDomain: "amazon.com.br" },
  ar: { geo: "SA", amazonDomain: "amazon.sa" }
};

type AgentResearchBody = {
  niche: string;
  tool: string;
  language?: string;
  format?: "trends" | "keywords" | "amazon" | "competitors" | "generic";
};

// Call real SerpApi
async function callSerpApi(params: Record<string, string>): Promise<Record<string, unknown>> {
  const serpKey = process.env.SERPAPI_API_KEY;
  if (!serpKey) throw new Error("SERPAPI_API_KEY not set");
  const p = new URLSearchParams({ ...params, api_key: serpKey });
  const res = await fetch(`https://serpapi.com/search.json?${p.toString()}`, { cache: "no-store" });
  return await res.json() as Record<string, unknown>;
}

// Call Solene agent as fallback
async function callSolene(prompt: string): Promise<string> {
  const apiKey = process.env.SOLENE_API_KEY;
  if (!apiKey) throw new Error("SOLENE_API_KEY not set");

  const convRes = await fetch(`${SOLENE_API_BASE}/${SOLENE_AGENT_ID}/conversations/default`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api_key": apiKey }
  });
  const conv = await convRes.json() as { id: string };

  const msgRes = await fetch(`${SOLENE_API_BASE}/${SOLENE_AGENT_ID}/conversations/${conv.id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api_key": apiKey },
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

export async function POST(request: Request) {
  const body = (await request.json()) as AgentResearchBody;
  const { niche, tool, language = "en", format = "generic" } = body;
  if (!niche) return NextResponse.json({ error: "niche is required" }, { status: 400 });

  const market = languageMarketMap[language] ?? languageMarketMap.en;
  const geo = geoNames[language] ?? "United States";
  const hasSerpApi = !!process.env.SERPAPI_API_KEY;
  const hasSolene = !!process.env.SOLENE_API_KEY;

  try {
    // ── AMAZON SEARCH (real SerpApi) ──────────────────────────
    if (format === "amazon" || format === "competitors") {
      if (hasSerpApi) {
        const data = await callSerpApi({
          engine: "amazon",
          k: niche,
          amazon_domain: market.amazonDomain,
          hl: language
        });
        return NextResponse.json({
          executedAt: new Date().toISOString(),
          provider: "SerpApi (live)",
          niche, tool, format,
          data
        });
      }
    }

    // ── GOOGLE TRENDS (real SerpApi) ─────────────────────────
    if (format === "trends") {
      if (hasSerpApi) {
        const data = await callSerpApi({
          engine: "google_trends",
          q: niche,
          geo: market.geo,
          date: "today 12-m",
          data_type: "TIMESERIES"
        });
        return NextResponse.json({
          executedAt: new Date().toISOString(),
          provider: "SerpApi (live)",
          niche, tool, format,
          data
        });
      }
    }

    // ── SOLENE FALLBACK for everything else ──────────────────
    if (hasSolene) {
      const prompts: Record<string, string> = {
        trends: `You are a KDP book market analyst. Analyze Google Trends interest for: "${niche}" in ${geo} over 12 months. Return ONLY valid JSON: {"timeline_data":[{"date":"Week 1","value":65}],"averages":[{"query":"${niche}","value":72}],"trend_direction":"rising","peak_period":"last 3 months","insight":"Two sentence insight for KDP authors."} Generate 12 weekly data points.`,
        keywords: `You are a KDP keyword expert. Generate keyword research for: "${niche}" in ${geo}. Return ONLY valid JSON: [{"keyword":"phrase","volume":2400,"competition":"low","ai_relevance_score":8.5,"kdp_category_fit":"Self-Help","tip":"Actionable tip."}] Return 10 buyer-intent keywords.`,
        amazon: `You are an Amazon KDP expert. Generate realistic book search results for: "${niche}". Return ONLY valid JSON: {"organic_results":[{"position":1,"title":"Book Title","author":"Author","price":"$12.99","rating":4.5,"reviews":1243,"asin":"B0XXXXXXXX","badge":"Best Seller","format":"Paperback","bsr":45000,"category":"Self-Help"}]} Return 8 books.`,
        competitors: `You are an Amazon marketplace analyst. Competitive pricing for books like: "${niche}" in ${geo}. Return ONLY valid JSON: {"items":[{"asin":"B0XXXXXXXX","title":"Book","price":12.99,"format":"Paperback","seller_rank":45000,"estimated_monthly_sales":320,"royalty_estimate_usd":147}],"summary":{"avg_price":13.50,"price_range":{"min":9.99,"max":24.99},"market_opportunity":"One sentence."}} Return 6 products.`,
        generic: `You are a KDP research expert. Market research for: "${niche}" in ${geo}. Return ONLY valid JSON: {"niche":"${niche}","market":"${geo}","demand_score":7.8,"competition":"medium","trend":"rising","top_keywords":["kw1","kw2","kw3"],"avg_price":13.50,"best_format":"Kindle + Paperback","insight":"Two sentence insight.","opportunity":"One sentence opportunity."}`
      };

      const rawText = await callSolene(prompts[format] ?? prompts.generic);
      const data = parseJson(rawText);

      return NextResponse.json({
        executedAt: new Date().toISOString(),
        provider: "Solene (Base44 AI Agent)",
        agentId: SOLENE_AGENT_ID,
        niche, tool, format,
        data
      });
    }

    return NextResponse.json({
      error: "No AI provider configured. Set SERPAPI_API_KEY or SOLENE_API_KEY in Railway Variables."
    }, { status: 500 });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
