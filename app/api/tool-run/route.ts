import { NextResponse } from "next/server";

import { getConnectorStatus } from "@/lib/tool-providers";

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

const defaultLocalServicesQuery = "plumber";
const localServiceKeywords = [
  "plumber",
  "electrician",
  "locksmith",
  "roofer",
  "lawyer",
  "dentist",
  "cleaning",
  "hvac",
  "contractor"
];

const processEnv = (
  globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env ?? {};

export async function POST(request: Request) {
  const body = (await request.json()) as ToolRunBody;
  const activeTool = body.activeTool;
  const storyTitle = body.storyTitle?.trim() || "Untitled story";
  const primaryLanguage = body.primaryLanguage || "en";

  if (!activeTool) {
    return NextResponse.json({ error: "No active tool was provided." }, { status: 400 });
  }

  const connector = getConnectorStatus(activeTool.appName);

  if (!connector.provider || !connector.configured) {
    return NextResponse.json(
      {
        error: "Connector is not configured for this tool.",
        missingEnvKeys: connector.missingEnvKeys
      },
      { status: 400 }
    );
  }

  if (activeTool.appName === "serpapi") {
    const market = languageMarketMap[primaryLanguage] ?? languageMarketMap.en;
    const apiKey = processEnv[connector.provider.credentialEnvKeys[0]] as string;

    const callSerpApi = async (extraParams: Record<string, string>) => {
      const params = new URLSearchParams({
        hl: primaryLanguage,
        api_key: apiKey
      });

      Object.entries(extraParams).forEach(([key, value]) => {
        params.set(key, value);
      });

      const response = await fetch(`${connector.provider.baseUrl}/search.json?${params.toString()}`, {
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });

      const payload = (await response.json()) as Record<string, unknown>;

      return { response, payload };
    };

    if (activeTool.name === "searchGoogleTrends") {
      const { response, payload } = await callSerpApi({
        engine: "google_trends",
        q: storyTitle,
        date: "today 12-m",
        tz: "420",
        data_type: "TIMESERIES"
      });

      const typedPayload = payload as {
        search_metadata?: { status?: string };
        search_parameters?: Record<string, string>;
        interest_over_time?: {
          timeline_data?: Array<{
            date: string;
            values: Array<{
              query?: string;
              extracted_value?: number;
            }>;
          }>;
          averages?: Array<{
            query?: string;
            value?: number;
          }>;
        };
        error?: string;
      };

      if (!response.ok || typedPayload.error) {
        return NextResponse.json(
          {
            error: typedPayload.error || "SerpApi request failed.",
            status: response.status
          },
          { status: response.ok ? 502 : response.status }
        );
      }

      const averages = typedPayload.interest_over_time?.averages ?? [];
      const timeline = typedPayload.interest_over_time?.timeline_data ?? [];

      return NextResponse.json({
        executedAt: new Date().toISOString(),
        provider: connector.provider.label,
        toolKey: activeTool.key,
        request: typedPayload.search_parameters ?? {},
        summary: {
          status: typedPayload.search_metadata?.status ?? "Unknown",
          averageInterest: averages[0]?.value ?? null,
          points: timeline.length,
          latestPoint: timeline[timeline.length - 1] ?? null
        },
        raw: typedPayload
      });
    }

    if (activeTool.name === "searchGoogleTrendsTrendingNow") {
      const { response, payload } = await callSerpApi({
        engine: "google_trends_trending_now",
        geo: market.geo
      });

      const typedPayload = payload as {
        search_metadata?: { status?: string };
        search_parameters?: Record<string, string>;
        trending_searches?: Array<{
          query?: string;
          search_volume?: string;
        }>;
        daily_searches?: Array<{
          query?: string;
          search_volume?: string;
        }>;
        error?: string;
      };

      if (!response.ok || typedPayload.error) {
        return NextResponse.json(
          {
            error: typedPayload.error || "SerpApi trending request failed.",
            status: response.status
          },
          { status: response.ok ? 502 : response.status }
        );
      }

      const items = typedPayload.trending_searches ?? typedPayload.daily_searches ?? [];

      return NextResponse.json({
        executedAt: new Date().toISOString(),
        provider: connector.provider.label,
        toolKey: activeTool.key,
        request: typedPayload.search_parameters ?? {},
        summary: {
          status: typedPayload.search_metadata?.status ?? "Unknown",
          averageInterest: null,
          points: items.length,
          latestPoint: items[0] ?? null
        },
        raw: typedPayload
      });
    }

    if (activeTool.name === "searchAmazon") {
      const { response, payload } = await callSerpApi({
        engine: "amazon",
        amazon_domain: "amazon.com",
        k: storyTitle
      });

      if (!response.ok || payload.error) {
        return NextResponse.json(
          {
            error: (payload.error as string) || "SerpApi Amazon request failed.",
            status: response.status
          },
          { status: response.ok ? 502 : response.status }
        );
      }

      const items = (payload.organic_results as unknown[] | undefined) ?? [];

      return NextResponse.json({
        executedAt: new Date().toISOString(),
        provider: connector.provider.label,
        toolKey: activeTool.key,
        request: (payload.search_parameters as Record<string, string>) ?? {
          engine: "amazon",
          amazon_domain: "amazon.com",
          k: storyTitle
        },
        summary: {
          status: String((payload.search_metadata as { status?: string } | undefined)?.status ?? "Unknown"),
          averageInterest: null,
          points: items.length,
          latestPoint: items[0] ?? null
        },
        raw: payload
      });
    }

    if (activeTool.name === "searchGoogleTrendsAutocomplete") {
      const { response, payload } = await callSerpApi({
        engine: "google_trends_autocomplete",
        q: storyTitle
      });

      if (!response.ok || payload.error) {
        return NextResponse.json(
          {
            error: (payload.error as string) || "SerpApi Trends Autocomplete request failed.",
            status: response.status
          },
          { status: response.ok ? 502 : response.status }
        );
      }

      const suggestions = (payload.suggestions as unknown[] | undefined) ?? [];

      return NextResponse.json({
        executedAt: new Date().toISOString(),
        provider: connector.provider.label,
        toolKey: activeTool.key,
        request: (payload.search_parameters as Record<string, string>) ?? {
          engine: "google_trends_autocomplete",
          q: storyTitle
        },
        summary: {
          status: String((payload.search_metadata as { status?: string } | undefined)?.status ?? "Unknown"),
          averageInterest: null,
          points: suggestions.length,
          latestPoint: suggestions[0] ?? null
        },
        raw: payload
      });
    }

    if (activeTool.name === "searchGoogleLocalServices") {
      const rawQuery = storyTitle.trim().toLowerCase();
      const query =
        localServiceKeywords.some((keyword) => rawQuery.includes(keyword)) || rawQuery.length <= 30
          ? storyTitle
          : defaultLocalServicesQuery;
      const localHint = market.geo === "US" ? "Austin, Texas, United States" : "United States";
      const mapsQuery = `${query} ${localHint}`;

      const maps = await callSerpApi({
        engine: "google_maps",
        type: "search",
        q: mapsQuery
      });

      if (!maps.response.ok || maps.payload.error) {
        return NextResponse.json(
          {
            error: (maps.payload.error as string) || "SerpApi Google Maps lookup failed.",
            status: maps.response.status
          },
          { status: maps.response.ok ? 502 : maps.response.status }
        );
      }

      const localResults = (maps.payload.local_results as Array<{ data_cid?: string }> | undefined) ?? [];
      const dataCid = localResults[0]?.data_cid;

      if (!dataCid) {
        return NextResponse.json(
          {
            error: "Unable to resolve data_cid for Google Local Services.",
            status: 400
          },
          { status: 400 }
        );
      }

      const localServices = await callSerpApi({
        engine: "google_local_services",
        q: query,
        data_cid: dataCid
      });

      if (!localServices.response.ok || localServices.payload.error) {
        const errorMessage =
          (localServices.payload.error as string | undefined) ||
          "SerpApi Google Local Services request failed.";

        if (errorMessage.includes("hasn't returned any results")) {
          return NextResponse.json({
            executedAt: new Date().toISOString(),
            provider: connector.provider.label,
            toolKey: activeTool.key,
            request: {
              engine: "google_local_services",
              q: query,
              data_cid: dataCid
            },
            summary: {
              status: "No results",
              averageInterest: null,
              points: 0,
              latestPoint: null
            },
            raw: localServices.payload
          });
        }

        return NextResponse.json(
          {
            error: errorMessage,
            status: localServices.response.status
          },
          { status: localServices.response.ok ? 502 : localServices.response.status }
        );
      }

      return NextResponse.json({
        executedAt: new Date().toISOString(),
        provider: connector.provider.label,
        toolKey: activeTool.key,
        request: (localServices.payload.search_parameters as Record<string, string>) ?? {
          engine: "google_local_services",
          q: query,
          data_cid: dataCid
        },
        summary: {
          status: String(
            (localServices.payload.search_metadata as { status?: string } | undefined)?.status ?? "Unknown"
          ),
          averageInterest: null,
          points: 0,
          latestPoint: null
        },
        raw: localServices.payload
      });
    }

    if (activeTool.name === "searchGoogleScholarAuthor") {
      const storyTitleAsAuthorId = /^[A-Za-z0-9_-]{12}$/.test(storyTitle) ? storyTitle : undefined;
      const authorId = processEnv.SERPAPI_SCHOLAR_AUTHOR_ID || storyTitleAsAuthorId || "X1kRkJMAAAAJ";

      const { response, payload } = await callSerpApi({
        engine: "google_scholar_author",
        author_id: authorId
      });

      if (!response.ok || payload.error) {
        return NextResponse.json(
          {
            error: (payload.error as string) || "SerpApi Scholar Author request failed.",
            status: response.status
          },
          { status: response.ok ? 502 : response.status }
        );
      }

      const citedByTable = (payload.cited_by_table as unknown[] | undefined) ?? [];

      return NextResponse.json({
        executedAt: new Date().toISOString(),
        provider: connector.provider.label,
        toolKey: activeTool.key,
        request: (payload.search_parameters as Record<string, string>) ?? {
          engine: "google_scholar_author",
          author_id: authorId
        },
        summary: {
          status: String((payload.search_metadata as { status?: string } | undefined)?.status ?? "Unknown"),
          averageInterest: null,
          points: citedByTable.length,
          latestPoint: citedByTable[0] ?? null
        },
        raw: payload
      });
    }

    return NextResponse.json(
      {
        error: "This SerpApi module is not wired for live execution yet.",
        supportedTools: [
          "serpapi:searchGoogleTrends",
          "serpapi:searchGoogleTrendsTrendingNow",
          "serpapi:searchAmazon",
          "serpapi:searchGoogleTrendsAutocomplete",
          "serpapi:searchGoogleLocalServices",
          "serpapi:searchGoogleScholarAuthor"
        ]
      },
      { status: 400 }
    );
  }

  if (activeTool.appName === "dataforseo" && activeTool.name === "KeywordsDataSearchVolumeLive") {
    const market = languageMarketMap[primaryLanguage] ?? languageMarketMap.en;
    const login = processEnv.DATAFORSEO_LOGIN as string;
    const password = processEnv.DATAFORSEO_PASSWORD as string;

    const response = await fetch(`${connector.provider.baseUrl}/v3/keywords_data/google/search_volume/live`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([
        {
          keywords: [storyTitle.toLowerCase()],
          language_code: primaryLanguage,
          location_code: market.locationCode,
          search_partners: false,
          tag: activeTool.key
        }
      ]),
      cache: "no-store"
    });

    const payload = (await response.json()) as {
      status_code?: number;
      status_message?: string;
      tasks?: Array<{
        status_code?: number;
        status_message?: string;
        data?: Record<string, unknown>;
        result?: Array<{
          keyword?: string;
          search_volume?: number | null;
          competition?: number | null;
          cpc?: number | null;
          monthly_searches?: Array<{
            year: number;
            month: number;
            search_volume: number;
          }>;
        }>;
      }>;
    };

    if (!response.ok || (payload.status_code && payload.status_code >= 40000)) {
      return NextResponse.json(
        {
          error: payload.status_message || "DataForSEO request failed.",
          status: response.status
        },
        { status: response.ok ? 502 : response.status }
      );
    }

    const task = payload.tasks?.[0];
    const result = task?.result?.[0];

    return NextResponse.json({
      executedAt: new Date().toISOString(),
      provider: connector.provider.label,
      toolKey: activeTool.key,
      request: (task?.data as Record<string, string>) ?? {},
      summary: {
        status: task?.status_message ?? payload.status_message ?? "Unknown",
        averageInterest: result?.search_volume ?? null,
        points: result?.monthly_searches?.length ?? 0,
        latestPoint: result?.monthly_searches?.[0] ?? null
      },
      raw: payload
    });
  }

  if (activeTool.appName === "elevenlabs") {
    const apiKey = processEnv[connector.provider.credentialEnvKeys[0]] as string;
    const preferredVoiceId = body.overrides?.elevenLabsVoiceId?.trim() || processEnv.ELEVENLABS_VOICE_ID?.trim();
    const modelId = processEnv.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";

    const elevenLabsHeaders = {
      "xi-api-key": apiKey,
      Accept: "application/json"
    };

    const fetchVoices = async () => {
      const response = await fetch(`${connector.provider.baseUrl}/v1/voices`, {
        headers: elevenLabsHeaders,
        cache: "no-store"
      });

      const payload = (await response.json()) as {
        voices?: Array<{
          voice_id?: string;
          name?: string;
          category?: string;
        }>;
        detail?: string;
      };

      return { response, payload };
    };

    if (activeTool.name === "getVoices") {
      const { response, payload } = await fetchVoices();

      if (!response.ok) {
        return NextResponse.json(
          {
            error: payload.detail || "ElevenLabs voices request failed.",
            status: response.status
          },
          { status: response.status }
        );
      }

      const voices = payload.voices ?? [];

      return NextResponse.json({
        executedAt: new Date().toISOString(),
        provider: connector.provider.label,
        toolKey: activeTool.key,
        request: {
          endpoint: "/v1/voices"
        },
        summary: {
          status: "OK",
          averageInterest: null,
          points: voices.length,
          latestPoint: voices[0] ?? null
        },
        raw: payload
      });
    }

    if (activeTool.name === "textToSpeech") {
      const voicesResult = preferredVoiceId ? null : await fetchVoices();

      if (voicesResult && !voicesResult.response.ok) {
        return NextResponse.json(
          {
            error: voicesResult.payload.detail || "ElevenLabs voices lookup failed.",
            status: voicesResult.response.status
          },
          { status: voicesResult.response.status }
        );
      }

      const voices = voicesResult?.payload.voices ?? [];
      const voiceId = preferredVoiceId || voices[0]?.voice_id || "21m00Tcm4TlvDq8ikWAM";
      const voiceName = voices.find((voice) => voice.voice_id === voiceId)?.name ?? null;
      const script = `This is a voiceover test for ${storyTitle}.`;

      const response = await fetch(`${connector.provider.baseUrl}/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg"
        },
        body: JSON.stringify({
          text: script,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.2,
            use_speaker_boost: true
          }
        }),
        cache: "no-store"
      });

      if (!response.ok) {
        const errorText = await response.text();

        return NextResponse.json(
          {
            error: "ElevenLabs text-to-speech request failed.",
            status: response.status,
            responseText: errorText
          },
          { status: response.status }
        );
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "audio/mpeg";

      return NextResponse.json({
        executedAt: new Date().toISOString(),
        provider: connector.provider.label,
        toolKey: activeTool.key,
        request: {
          text: script,
          model_id: modelId,
          voice_id: voiceId
        },
        summary: {
          status: "OK",
          averageInterest: null,
          points: 1,
          latestPoint: {
            voiceId,
            voiceName,
            contentType,
            audioBytes: audioBuffer.length
          }
        },
        raw: {
          voiceId,
          voiceName,
          contentType,
          audioBytes: audioBuffer.length,
          audioBase64: audioBuffer.toString("base64")
        }
      });
    }

    return NextResponse.json(
      {
        error: "This ElevenLabs module is not wired for live execution yet.",
        supportedTools: ["elevenlabs:getVoices", "elevenlabs:textToSpeech"]
      },
      { status: 400 }
    );
  }

  if (
    activeTool.appName === "amazon-seller-central" &&
    ["searchCompetitivePricing", "searchProductsPricing"].includes(activeTool.name)
  ) {
    const bridgeUrl = processEnv[connector.provider.credentialEnvKeys[0]] as string;
    const bridgeTestUrl =
      processEnv.AMAZON_SP_API_WEBHOOK_TEST_URL ||
      (bridgeUrl.includes("/webhook/") ? bridgeUrl.replace("/webhook/", "/webhook-test/") : undefined);
    const market = languageMarketMap[primaryLanguage] ?? languageMarketMap.en;

    const requestBody = {
      source: "story-market-desk",
      storyTitle,
      primaryLanguage,
      market,
      tool: {
        key: activeTool.key,
        appName: activeTool.appName,
        name: activeTool.name,
        label: activeTool.label,
        moduleType: activeTool.module_type
      }
    };

    const callBridge = async (url: string) => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody),
        cache: "no-store"
      });

      const rawText = await response.text();
      let payload: Record<string, unknown> = {};

      try {
        payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
      } catch {
        payload = {
          message: rawText
        };
      }

      return { response, payload, url };
    };

    let attemptedUrls = [bridgeUrl];
    let bridgeResult = await callBridge(bridgeUrl);

    if (
      !bridgeResult.response.ok &&
      bridgeResult.response.status === 404 &&
      bridgeTestUrl &&
      bridgeTestUrl !== bridgeUrl
    ) {
      attemptedUrls = [bridgeUrl, bridgeTestUrl];
      bridgeResult = await callBridge(bridgeTestUrl);
    }

    if (!bridgeResult.response.ok) {
      return NextResponse.json(
        {
          error: "Amazon bridge request failed.",
          status: bridgeResult.response.status,
          attemptedUrls,
          bridgeResponse: bridgeResult.payload
        },
        { status: bridgeResult.response.status }
      );
    }

    const payload = bridgeResult.payload;
    const summaryFromPayload = (payload.summary as Record<string, unknown> | undefined) ?? undefined;
    const items = Array.isArray(payload.items) ? payload.items : [];

    return NextResponse.json({
      executedAt: new Date().toISOString(),
      provider: connector.provider.label,
      toolKey: activeTool.key,
      request: (payload.request as Record<string, string>) ?? {
        storyTitle,
        primaryLanguage,
        module: activeTool.name
      },
      summary: {
        status: String(summaryFromPayload?.status ?? payload.status ?? payload.message ?? "OK"),
        averageInterest:
          typeof summaryFromPayload?.averageInterest === "number"
            ? summaryFromPayload.averageInterest
            : typeof payload.averageInterest === "number"
              ? payload.averageInterest
              : null,
        points:
          typeof summaryFromPayload?.points === "number"
            ? summaryFromPayload.points
            : items.length,
        latestPoint: summaryFromPayload?.latestPoint ?? items[0] ?? null
      },
      bridgeUrlUsed: bridgeResult.url,
      raw: payload
    });
  }

  return NextResponse.json(
    {
      error: "Live execution is not wired for this tool yet.",
      supportedTools: [
        "serpapi:searchGoogleTrends",
        "serpapi:searchGoogleTrendsTrendingNow",
        "serpapi:searchAmazon",
        "serpapi:searchGoogleTrendsAutocomplete",
        "serpapi:searchGoogleLocalServices",
        "serpapi:searchGoogleScholarAuthor",
        "dataforseo:KeywordsDataSearchVolumeLive",
        "elevenlabs:getVoices",
        "elevenlabs:textToSpeech",
        "amazon-seller-central:searchCompetitivePricing",
        "amazon-seller-central:searchProductsPricing"
      ]
    },
    { status: 400 }
  );
}