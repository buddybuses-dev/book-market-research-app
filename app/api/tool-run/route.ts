import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkAppSecret } from "@/lib/api-auth";
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
  overrides?: {
    elevenLabsVoiceId?: string;
  };
};

const languageMarketMap: Record<string, { geo: string; locationCode: number }> = {
  en: { geo: "US", locationCode: 2840 },
  de: { geo: "DE", locationCode: 2276 },
  fr: { geo: "FR", locationCode: 2250 },
  es: { geo: "ES", locationCode: 2724 },
  it: { geo: "IT", locationCode: 2380 },
  pt: { geo: "BR", locationCode: 2076 },
  ar: { geo: "SA", locationCode: 2682 }
};

const geoNames: Record<string, string> = {
  en: "United States", de: "Germany", fr: "France",
  es: "Spain", it: "Italy", pt: "Brazil", ar: "Saudi Arabia"
};

const defaultLocalServicesQuery = "plumber";
const localServiceKeywords = [
  "plumber","electrician","locksmith","roofer","lawyer",
  "dentist","cleaning","hvac","contractor"
];

// Claude-powered fallback for all research tools
async function claudeToolRun(
  appName: string,
  toolName: string,
  storyTitle: string,
  primaryLanguage: string,
  toolLabel: string,
  toolKey: string
) {
  const geo = geoNames[primaryLanguage] ?? "United States";
  let prompt = "";

  if (appName === "serpapi" && toolName === "searchGoogleTrends") {
    prompt = `You are a book market trends analyst. Analyze Google Trends interest for the book topic/title: "${storyTitle}" in the ${geo} market over the last 12 months.

Return ONLY valid JSON (no markdown, no explanation):
{
  "timeline_data": [
    {"date": "Week 1", "value": 45},
    {"date": "Week 2", "value": 52}
  ],
  "averages": [{"query": "${storyTitle}", "value": 67}],
  "trend_direction": "rising",
  "peak_period": "last 3 months",
  "insight": "Two sentence market insight for a KDP author considering this niche."
}
Generate 12 realistic weekly data points. Base values on real knowledge of this topic.`;

  } else if (appName === "serpapi" && toolName === "searchGoogleTrendsTrendingNow") {
    prompt = `You are a book market analyst. List the top 10 trending book-related and content-related search topics right now in ${geo}.

Return ONLY valid JSON (no markdown):
{
  "trending_searches": [
    {"query": "topic name", "search_volume": "50K+", "book_relevance": "high"}
  ],
  "market": "${geo}",
  "updated": "${new Date().toISOString()}"
}`;

  } else if (appName === "serpapi" && toolName === "searchAmazon") {
    prompt = `You are an Amazon KDP research expert. Generate realistic Amazon book search results for query: "${storyTitle}".

Return ONLY valid JSON (no markdown):
{
  "organic_results": [
    {
      "position": 1,
      "title": "Book Title Here",
      "author": "Author Name",
      "price": "$9.99",
      "rating": 4.5,
      "reviews": 1243,
      "asin": "B0XXXXXXXX",
      "badge": "Best Seller",
      "format": "Kindle"
    }
  ]
}
Return 8 realistic competing books. Base on real knowledge of similar books.`;

  } else if (appName === "serpapi" && toolName === "searchGoogleTrendsAutocomplete") {
    prompt = `You are a keyword research expert. Generate Google Trends autocomplete suggestions for: "${storyTitle}" relevant to book publishing.

Return ONLY valid JSON (no markdown):
{
  "suggestions": [
    {"query": "suggestion phrase", "type": "Top", "relevance_score": 85}
  ]
}
Return 10 suggestions.`;

  } else if (appName === "dataforseo" && toolName === "KeywordsDataSearchVolumeLive") {
    prompt = `You are a KDP keyword research expert. Provide realistic Google search volume data for keywords related to: "${storyTitle}" in the ${geo} market.

Return ONLY valid JSON (no markdown):
{
  "keywords_data": [
    {
      "keyword": "keyword phrase",
      "search_volume": 2400,
      "competition": 0.45,
      "competition_level": "MEDIUM",
      "cpc": 1.23,
      "trend": [65,70,75,80,78,82,85,80,76,79,83,88]
    }
  ]
}
Return 8 keywords — main topic plus long-tail KDP variations.`;

  } else if (appName === "amazon-seller-central") {
    prompt = `You are an Amazon marketplace analyst. Provide competitive pricing research for books related to: "${storyTitle}".

Return ONLY valid JSON (no markdown):
{
  "items": [
    {
      "asin": "B0XXXXXXXX",
      "title": "Competing Book Title",
      "condition": "New",
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
    "market_opportunity": "One sentence opportunity statement."
  }
}
Return 6 competing products with realistic data.`;

  } else {
    prompt = `You are a book market research expert. For the tool "${toolLabel}" (${appName}/${toolName}), provide relevant research data for the book topic: "${storyTitle}" in ${geo}. Return useful JSON data a KDP author would need. No markdown, just JSON.`;
  }

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }]
  });

  const text = (msg.content[0] as { type: string; text: string }).text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = jsonMatch ? jsonMatch[1] : text;
  const data = JSON.parse(jsonText.trim()) as Record<string, unknown>;

  const items = (data.organic_results ?? data.trending_searches ?? data.keywords_data ?? data.items ?? data.timeline_data ?? data.suggestions ?? []) as unknown[];

  return {
    executedAt: new Date().toISOString(),
    provider: "Claude AI (free)",
    toolKey,
    poweredBy: "claude-haiku-4-5",
    request: { storyTitle, primaryLanguage, tool: toolName },
    summary: {
      status: "OK",
      averageInterest: (data.averages as Array<{value?: number}> | undefined)?.[0]?.value ?? null,
      points: Array.isArray(items) ? items.length : 1,
      latestPoint: Array.isArray(items) ? (items[0] ?? null) : items
    },
    raw: data
  };
}

export async function POST(request: Request) {
  const authError = checkAppSecret(request);
  if (authError) return authError;

  const body = (await request.json()) as ToolRunBody;
  const activeTool = body.activeTool;
  const storyTitle = body.storyTitle?.trim() || "Untitled story";
  const primaryLanguage = body.primaryLanguage || "en";

  if (!activeTool) {
    return NextResponse.json({ error: "No active tool was provided." }, { status: 400 });
  }

  const connector = getConnectorStatus(activeTool.appName);

  // CLAUDE FALLBACK: if no paid connector configured, use Claude for research tools
  const claudeApps = ["serpapi", "dataforseo", "amazon-seller-central", "keywords-everywhere-api", "dataforseo-labs-api", "dataforseo-keywords-data-api"];
  if (claudeApps.includes(activeTool.appName) && (!connector.provider || !connector.configured)) {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: "Neither the paid connector nor ANTHROPIC_API_KEY is configured.",
        missingEnvKeys: [...(connector.missingEnvKeys ?? []), "ANTHROPIC_API_KEY"]
      }, { status: 400 });
    }
    try {
      const result = await claudeToolRun(
        activeTool.appName, activeTool.name, storyTitle,
        primaryLanguage, activeTool.label, activeTool.key
      );
      return NextResponse.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Claude fallback failed";
      return NextResponse.json({ error: msg, provider: "claude-fallback" }, { status: 500 });
    }
  }

  if (!connector.provider || !connector.configured) {
    return NextResponse.json({
      error: "Connector is not configured for this tool.",
      missingEnvKeys: connector.missingEnvKeys
    }, { status: 400 });
  }

  if (activeTool.appName === "serpapi") {
    const market = languageMarketMap[primaryLanguage] ?? languageMarketMap.en;
    const apiKey = processEnv[connector.provider.credentialEnvKeys[0]] as string;

    const callSerpApi = async (extraParams: Record<string, string>) => {
      const params = new URLSearchParams({ hl: primaryLanguage, api_key: apiKey });
      Object.entries(extraParams).forEach(([key, value]) => params.set(key, value));
      const response = await fetch(`${connector.provider!.baseUrl}/search.json?${params.toString()}`, {
        headers: { Accept: "application/json" }, cache: "no-store"
      });
      const payload = (await response.json()) as Record<string, unknown>;
      return { response, payload };
    };

    if (activeTool.name === "searchGoogleTrends") {
      const { response, payload } = await callSerpApi({
        engine: "google_trends", q: storyTitle,
        date: "today 12-m", tz: "420", data_type: "TIMESERIES"
      });
      const tp = payload as {
        search_metadata?: { status?: string };
        search_parameters?: Record<string, string>;
        interest_over_time?: {
          timeline_data?: Array<{ date: string; values: Array<{ query?: string; extracted_value?: number }> }>;
          averages?: Array<{ query?: string; value?: number }>;
        };
        error?: string;
      };
      if (!response.ok || tp.error) {
        return NextResponse.json({ error: tp.error || "SerpApi request failed.", status: response.status }, { status: response.ok ? 502 : response.status });
      }
      const averages = tp.interest_over_time?.averages ?? [];
      const timeline = tp.interest_over_time?.timeline_data ?? [];
      return NextResponse.json({
        executedAt: new Date().toISOString(), provider: connector.provider.label, toolKey: activeTool.key,
        request: tp.search_parameters ?? {},
        summary: { status: tp.search_metadata?.status ?? "Unknown", averageInterest: averages[0]?.value ?? null, points: timeline.length, latestPoint: timeline[timeline.length - 1] ?? null },
        raw: tp
      });
    }

    if (activeTool.name === "searchGoogleTrendsTrendingNow") {
      const { response, payload } = await callSerpApi({ engine: "google_trends_trending_now", geo: market.geo });
      const tp = payload as { search_metadata?: { status?: string }; search_parameters?: Record<string, string>; trending_searches?: Array<{ query?: string; search_volume?: string }>; daily_searches?: Array<{ query?: string; search_volume?: string }>; error?: string };
      if (!response.ok || tp.error) {
        return NextResponse.json({ error: tp.error || "SerpApi trending request failed.", status: response.status }, { status: response.ok ? 502 : response.status });
      }
      const items = tp.trending_searches ?? tp.daily_searches ?? [];
      return NextResponse.json({
        executedAt: new Date().toISOString(), provider: connector.provider.label, toolKey: activeTool.key,
        request: tp.search_parameters ?? {},
        summary: { status: tp.search_metadata?.status ?? "Unknown", averageInterest: null, points: items.length, latestPoint: items[0] ?? null },
        raw: tp
      });
    }

    if (activeTool.name === "searchAmazon") {
      const { response, payload } = await callSerpApi({ engine: "amazon", amazon_domain: "amazon.com", k: storyTitle });
      if (!response.ok || payload.error) {
        return NextResponse.json({ error: (payload.error as string) || "SerpApi Amazon request failed.", status: response.status }, { status: response.ok ? 502 : response.status });
      }
      const items = (payload.organic_results as unknown[] | undefined) ?? [];
      return NextResponse.json({
        executedAt: new Date().toISOString(), provider: connector.provider.label, toolKey: activeTool.key,
        request: (payload.search_parameters as Record<string, string>) ?? { engine: "amazon", amazon_domain: "amazon.com", k: storyTitle },
        summary: { status: String((payload.search_metadata as { status?: string } | undefined)?.status ?? "Unknown"), averageInterest: null, points: items.length, latestPoint: items[0] ?? null },
        raw: payload
      });
    }

    if (activeTool.name === "searchGoogleTrendsAutocomplete") {
      const { response, payload } = await callSerpApi({ engine: "google_trends_autocomplete", q: storyTitle });
      if (!response.ok || payload.error) {
        return NextResponse.json({ error: (payload.error as string) || "SerpApi Trends Autocomplete request failed.", status: response.status }, { status: response.ok ? 502 : response.status });
      }
      const suggestions = (payload.suggestions as unknown[] | undefined) ?? [];
      return NextResponse.json({
        executedAt: new Date().toISOString(), provider: connector.provider.label, toolKey: activeTool.key,
        request: (payload.search_parameters as Record<string, string>) ?? { engine: "google_trends_autocomplete", q: storyTitle },
        summary: { status: String((payload.search_metadata as { status?: string } | undefined)?.status ?? "Unknown"), averageInterest: null, points: suggestions.length, latestPoint: suggestions[0] ?? null },
        raw: payload
      });
    }

    if (activeTool.name === "searchGoogleLocalServices") {
      const rawQuery = storyTitle.trim().toLowerCase();
      const query = localServiceKeywords.some((kw) => rawQuery.includes(kw)) || rawQuery.length <= 30 ? storyTitle : defaultLocalServicesQuery;
      const localHint = market.geo === "US" ? "Austin, Texas, United States" : "United States";
      const mapsQuery = `${query} ${localHint}`;
      const maps = await callSerpApi({ engine: "google_maps", type: "search", q: mapsQuery });
      if (!maps.response.ok || maps.payload.error) {
        return NextResponse.json({ error: (maps.payload.error as string) || "SerpApi Google Maps lookup failed.", status: maps.response.status }, { status: maps.response.ok ? 502 : maps.response.status });
      }
      const localResults = (maps.payload.local_results as Array<{ data_cid?: string }> | undefined) ?? [];
      const dataCid = localResults[0]?.data_cid;
      if (!dataCid) {
        return NextResponse.json({ error: "Unable to resolve data_cid for Google Local Services.", status: 400 }, { status: 400 });
      }
      const localServices = await callSerpApi({ engine: "google_local_services", q: query, data_cid: dataCid });
      if (!localServices.response.ok || localServices.payload.error) {
        const errorMessage = (localServices.payload.error as string | undefined) || "SerpApi Google Local Services request failed.";
        if (errorMessage.includes("hasn't returned any results")) {
          return NextResponse.json({
            executedAt: new Date().toISOString(), provider: connector.provider.label, toolKey: activeTool.key,
            request: { engine: "google_local_services", q: query, data_cid: dataCid },
            summary: { status: "No results", averageInterest: null, points: 0, latestPoint: null },
            raw: localServices.payload
          });
        }
        return NextResponse.json({ error: errorMessage, status: localServices.response.status }, { status: localServices.response.ok ? 502 : localServices.response.status });
      }
      const lsItems = (localServices.payload.local_services_ads as unknown[] | undefined) ?? [];
      return NextResponse.json({
        executedAt: new Date().toISOString(), provider: connector.provider.label, toolKey: activeTool.key,
        request: { engine: "google_local_services", q: query, data_cid: dataCid },
        summary: { status: "OK", averageInterest: null, points: lsItems.length, latestPoint: lsItems[0] ?? null },
        raw: localServices.payload
      });
    }

    if (activeTool.name === "searchGoogleScholarAuthor") {
      const { response, payload } = await callSerpApi({ engine: "google_scholar_author", author_id: storyTitle });
      if (!response.ok || payload.error) {
        return NextResponse.json({ error: (payload.error as string) || "SerpApi Scholar Author request failed.", status: response.status }, { status: response.ok ? 502 : response.status });
      }
      const articles = (payload.articles as unknown[] | undefined) ?? [];
      return NextResponse.json({
        executedAt: new Date().toISOString(), provider: connector.provider.label, toolKey: activeTool.key,
        request: (payload.search_parameters as Record<string, string>) ?? { engine: "google_scholar_author", author_id: storyTitle },
        summary: { status: String((payload.search_metadata as { status?: string } | undefined)?.status ?? "Unknown"), averageInterest: null, points: articles.length, latestPoint: articles[0] ?? null },
        raw: payload
      });
    }

    return NextResponse.json({ error: "This SerpApi module is not wired for live execution yet." }, { status: 400 });
  }

  if (activeTool.appName === "dataforseo" && activeTool.name === "KeywordsDataSearchVolumeLive") {
    const login = processEnv[connector.provider.credentialEnvKeys[0]] as string;
    const password = processEnv[connector.provider.credentialEnvKeys[1]] as string;
    const market = languageMarketMap[primaryLanguage] ?? languageMarketMap.en;
    const response = await fetch(`${connector.provider.baseUrl}/v3/keywords_data/google_ads/search_volume/live`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(`${login}:${password}`).toString("base64") },
      body: JSON.stringify([{ keywords: [storyTitle], location_code: market.locationCode, language_code: primaryLanguage === "ar" ? "ar" : primaryLanguage }]),
      cache: "no-store"
    });
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      return NextResponse.json({ error: "DataForSEO request failed.", status: response.status, raw: payload }, { status: response.status });
    }
    const tasks = (payload.tasks as Array<{ result?: Array<{ keyword: string; search_volume?: number; competition?: number; competition_level?: string; cpc?: number; monthly_searches?: unknown[] }> }> | undefined) ?? [];
    const result = tasks[0]?.result?.[0];
    return NextResponse.json({
      executedAt: new Date().toISOString(), provider: connector.provider.label, toolKey: activeTool.key,
      request: { keyword: storyTitle, language: primaryLanguage, location: market.locationCode },
      summary: { status: (payload.status_message as string | undefined) ?? "OK", averageInterest: result?.search_volume ?? null, points: result?.monthly_searches ? (result.monthly_searches as unknown[]).length : 0, latestPoint: result ?? null },
      raw: payload
    });
  }

  if (activeTool.appName === "elevenlabs") {
    const apiKey = processEnv[connector.provider.credentialEnvKeys[0]] as string;
    const modelId = "eleven_monolingual_v1";
    const preferredVoiceId = body.overrides?.elevenLabsVoiceId || "";

    const fetchVoices = async () => {
      const response = await fetch(`${connector.provider!.baseUrl}/v1/voices`, {
        headers: { "xi-api-key": apiKey, Accept: "application/json" }, cache: "no-store"
      });
      const payload = (await response.json()) as { voices?: Array<{ voice_id?: string; name?: string; category?: string }>; detail?: string };
      return { response, payload };
    };

    if (activeTool.name === "getVoices") {
      const { response, payload } = await fetchVoices();
      if (!response.ok) {
        return NextResponse.json({ error: payload.detail || "ElevenLabs voices request failed.", status: response.status }, { status: response.status });
      }
      const voices = payload.voices ?? [];
      return NextResponse.json({
        executedAt: new Date().toISOString(), provider: connector.provider.label, toolKey: activeTool.key,
        request: { endpoint: "/v1/voices" },
        summary: { status: "OK", averageInterest: null, points: voices.length, latestPoint: voices[0] ?? null },
        raw: payload
      });
    }

    if (activeTool.name === "textToSpeech") {
      const voicesResult = preferredVoiceId ? null : await fetchVoices();
      if (voicesResult && !voicesResult.response.ok) {
        return NextResponse.json({ error: voicesResult.payload.detail || "ElevenLabs voices lookup failed.", status: voicesResult.response.status }, { status: voicesResult.response.status });
      }
      const voices = voicesResult?.payload.voices ?? [];
      const voiceId = preferredVoiceId || voices[0]?.voice_id || "21m00Tcm4TlvDq8ikWAM";
      const voiceName = voices.find((v) => v.voice_id === voiceId)?.name ?? null;
      const script = `This is a voiceover test for ${storyTitle}.`;
      const response = await fetch(`${connector.provider!.baseUrl}/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text: script, model_id: modelId, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true } }),
        cache: "no-store"
      });
      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: "ElevenLabs text-to-speech request failed.", status: response.status, responseText: errorText }, { status: response.status });
      }
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "audio/mpeg";
      return NextResponse.json({
        executedAt: new Date().toISOString(), provider: connector.provider.label, toolKey: activeTool.key,
        request: { text: script, model_id: modelId, voice_id: voiceId },
        summary: { status: "OK", averageInterest: null, points: 1, latestPoint: { voiceId, voiceName, contentType, audioBytes: audioBuffer.length } },
        raw: { voiceId, voiceName, contentType, audioBytes: audioBuffer.length, audioBase64: audioBuffer.toString("base64") }
      });
    }

    return NextResponse.json({ error: "This ElevenLabs module is not wired for live execution yet.", supportedTools: ["elevenlabs:getVoices", "elevenlabs:textToSpeech"] }, { status: 400 });
  }

  if (activeTool.appName === "amazon-seller-central" && ["searchCompetitivePricing", "searchProductsPricing"].includes(activeTool.name)) {
    const bridgeUrl = processEnv[connector.provider.credentialEnvKeys[0]] as string;
    const bridgeTestUrl = processEnv.AMAZON_SP_API_WEBHOOK_TEST_URL || (bridgeUrl.includes("/webhook/") ? bridgeUrl.replace("/webhook/", "/webhook-test/") : undefined);
    const market = languageMarketMap[primaryLanguage] ?? languageMarketMap.en;
    const requestBody = {
      source: "story-market-desk", storyTitle, primaryLanguage, market,
      tool: { key: activeTool.key, appName: activeTool.appName, name: activeTool.name, label: activeTool.label, moduleType: activeTool.module_type }
    };
    const callBridge = async (url: string) => {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody), cache: "no-store" });
      const rawText = await response.text();
      let payload: Record<string, unknown> = {};
      try { payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {}; } catch { payload = { message: rawText }; }
      return { response, payload, url };
    };
    let attemptedUrls = [bridgeUrl];
    let bridgeResult = await callBridge(bridgeUrl);
    if (!bridgeResult.response.ok && bridgeResult.response.status === 404 && bridgeTestUrl && bridgeTestUrl !== bridgeUrl) {
      attemptedUrls = [bridgeUrl, bridgeTestUrl];
      bridgeResult = await callBridge(bridgeTestUrl);
    }
    if (!bridgeResult.response.ok) {
      return NextResponse.json({ error: "Amazon bridge request failed.", status: bridgeResult.response.status, attemptedUrls, bridgeResponse: bridgeResult.payload }, { status: bridgeResult.response.status });
    }
    const payload = bridgeResult.payload;
    const summaryFromPayload = (payload.summary as Record<string, unknown> | undefined) ?? undefined;
    const items = Array.isArray(payload.items) ? payload.items : [];
    return NextResponse.json({
      executedAt: new Date().toISOString(), provider: connector.provider.label, toolKey: activeTool.key,
      request: (payload.request as Record<string, string>) ?? { storyTitle, primaryLanguage, module: activeTool.name },
      summary: {
        status: String(summaryFromPayload?.status ?? payload.status ?? payload.message ?? "OK"),
        averageInterest: typeof summaryFromPayload?.averageInterest === "number" ? summaryFromPayload.averageInterest : typeof payload.averageInterest === "number" ? payload.averageInterest : null,
        points: typeof summaryFromPayload?.points === "number" ? summaryFromPayload.points : items.length,
        latestPoint: summaryFromPayload?.latestPoint ?? items[0] ?? null
      },
      bridgeUrlUsed: bridgeResult.url,
      raw: payload
    });
  }

  return NextResponse.json({
    error: "Live execution is not wired for this tool yet.",
    supportedTools: [
      "serpapi:searchGoogleTrends", "serpapi:searchGoogleTrendsTrendingNow",
      "serpapi:searchAmazon", "serpapi:searchGoogleTrendsAutocomplete",
      "serpapi:searchGoogleLocalServices", "serpapi:searchGoogleScholarAuthor",
      "dataforseo:KeywordsDataSearchVolumeLive",
      "elevenlabs:getVoices", "elevenlabs:textToSpeech",
      "amazon-seller-central:searchCompetitivePricing",
      "amazon-seller-central:searchProductsPricing"
    ]
  }, { status: 400 });
}
