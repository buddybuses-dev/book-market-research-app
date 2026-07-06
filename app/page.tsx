"use client";

import { type MouseEvent, useEffect, useMemo, useState } from "react";

type ResponseItem = {
  similarity: number;
  popularity: number;
  relevant_modules: Array<{
    label: string;
    name: string;
    module_type: string;
  }>;
  appName: string;
  appVersion: number;
};

type RequestPackResponse = {
  generatedAt: string;
  storyTitle: string;
  requestCount: number;
  connectorSummary: {
    configured: number;
    missing: number;
  };
  requests: Array<{
    toolKey: string;
    appName: string;
    module: string;
    label: string;
    moduleType: string;
    connector: {
      configured: boolean;
      provider: {
        key: string;
        label: string;
        baseUrl: string;
        credentialEnvKeys: string[];
        authType: "apiKeyQuery" | "basic" | "bearerHeader" | "apiKeyHeader";
      } | null;
      missingEnvKeys: string[];
    };
  }>;
};

type LiveRunResponse = {
  executedAt: string;
  provider: string;
  toolKey: string;
  request: Record<string, string>;
  summary: {
    status: string;
    averageInterest: number | null;
    points: number;
    latestPoint: unknown;
  };
  bridgeUrlUsed?: string;
  raw: unknown;
};

type RunHistoryEntry = {
  id: string;
  executedAt: string;
  storyTitle: string;
  toolKey: string;
  toolLabel: string;
  provider: string;
  status: string;
  averageInterest: number | null;
};

type N8nSyncResponse = {
  syncedAt: string;
  webhookUrl: string;
  status: number;
  webhookResponse: unknown;
};

type ElevenLabsVoice = {
  voice_id?: string;
  name?: string;
  category?: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const requestPayload = {
  intention: "Google Trends search interest data and BookBeam Kindle KDP sales/royalty estimation data"
};

const responsePayload: ResponseItem[] = [
  {
    similarity: 0.3850191248247936,
    popularity: 0.4155844155844156,
    relevant_modules: [
      { label: "Search Google Trends", name: "searchGoogleTrends", module_type: "search" },
      { label: "Search Google Trends Trending Now", name: "searchGoogleTrendsTrendingNow", module_type: "search" },
      { label: "Search Amazon", name: "searchAmazon", module_type: "search" },
      { label: "Search Google Trends Autocomplete", name: "searchGoogleTrendsAutocomplete", module_type: "search" },
      { label: "Search Google Local Services", name: "searchGoogleLocalServices", module_type: "search" },
      { label: "Search Google Scholar Author", name: "searchGoogleScholarAuthor", module_type: "search" }
    ],
    appName: "serpapi",
    appVersion: 1
  },
  {
    similarity: 0.38240629990901476,
    popularity: 1,
    relevant_modules: [
      { label: "Get Google Search Volume", name: "KeywordsDataSearchVolumeLive", module_type: "action" },
      { label: "Get AI Keyword Search Volume", name: "getAiKeywordSearchVolume", module_type: "action" },
      { label: "Get Historical Traffic Stats", name: "DataForSEOLabsHistoricalBulkTrafficEstimation", module_type: "action" },
      { label: "Get Organic Traffic Stats", name: "DataForSEOLabsBulkTrafficEstimation", module_type: "action" },
      { label: "Get Google AI Mode SERP", name: "getGoogleAIModeSerp", module_type: "action" },
      { label: "Get Ranked Keywords", name: "labsrankedkeywords", module_type: "action" },
      { label: "Get Keyword Ideas", name: "getKeywordIdeas", module_type: "action" },
      { label: "Get Parsed SERP", name: "GoogleSERPOrganic", module_type: "action" },
      { label: "Get Keyword Suggestions", name: "labskeywordsuggestions", module_type: "action" },
      { label: "Get Parsed SERP Advanced", name: "getParsedSerpAdvanced", module_type: "action" },
      { label: "Get Bulk Backlink Rank", name: "getBcklinkRankInBulk", module_type: "action" },
      { label: "Get Keyword Difficulty", name: "DataForSEOLabsBulkKeywordDifficulty", module_type: "action" }
    ],
    appName: "dataforseo",
    appVersion: 1
  },
  {
    similarity: 0.3789275895774633,
    popularity: 0.05194805194805195,
    relevant_modules: [
      { label: "Get keyword data", name: "getKeywordData", module_type: "search" },
      { label: "Get PASF keywords", name: "getPasfKeywords", module_type: "search" }
    ],
    appName: "keywords-everywhere-api",
    appVersion: 1
  },
  {
    similarity: 0.3701805013226427,
    popularity: 0.05194805194805195,
    relevant_modules: [
      { label: "Search For Products In Amazon", name: "SearchForProductsInAmazon", module_type: "action" },
      { label: "Get Google SERP Data", name: "GetGoogleSerpData", module_type: "action" },
      { label: "Get Product Data From Amazon", name: "GetProductDataFromAmazon", module_type: "action" }
    ],
    appName: "scrapingbee",
    appVersion: 1
  },
  {
    similarity: 0.36099665345049825,
    popularity: 0.03896103896103896,
    relevant_modules: [{ label: "Get a Keyword Overview from Google", name: "getKeywordOverview", module_type: "action" }],
    appName: "dataforseo-labs-api",
    appVersion: 1
  },
  {
    similarity: 0.35940871683455033,
    popularity: 0.025974025974025976,
    relevant_modules: [
      { label: "Search Keyword Metrics", name: "exportKeywordData", module_type: "search" },
      { label: "AI Search - Get Overview", name: "getAISearchOverview", module_type: "action" },
      { label: "Search Related Keywords", name: "searchRelatedKeywords", module_type: "search" },
      { label: "Search Question Keywords", name: "searchQuestionKeywords", module_type: "search" },
      { label: "Search Similar Keywords", name: "searchSimilarKeywords", module_type: "search" },
      { label: "Search Keyword Domain Comparison", name: "searchKeywordDomainComparison", module_type: "search" }
    ],
    appName: "se-ranking-seo-data",
    appVersion: 1
  },
  {
    similarity: 0.335905438900976,
    popularity: 0.14285714285714285,
    relevant_modules: [
      { label: "Get Keyword Overview (All Databases)", name: "SearchKeywordOverviewAllDatabases", module_type: "search" },
      { label: "Get Keyword Overview (One Database)", name: "ActionKeywordOverviewOneDatabase", module_type: "action" },
      { label: "Get Paid Search Keywords", name: "SearchDisplayPaidSearchKeywords", module_type: "search" }
    ],
    appName: "semrush",
    appVersion: 1
  },
  {
    similarity: 0.3335013127817803,
    popularity: 0.11688311688311688,
    relevant_modules: [
      { label: "Search Competitive Pricing", name: "searchCompetitivePricing", module_type: "search" },
      { label: "Search Products Pricing", name: "searchProductsPricing", module_type: "search" }
    ],
    appName: "amazon-seller-central",
    appVersion: 1
  },
  {
    similarity: 0.3294429611189024,
    popularity: 0.2987012987012987,
    relevant_modules: [
      { label: "Get Voices", name: "getVoices", module_type: "action" },
      { label: "Text to Speech", name: "textToSpeech", module_type: "action" }
    ],
    appName: "elevenlabs",
    appVersion: 1
  },
  {
    similarity: 0.321778087532814,
    popularity: 0.012987012987012988,
    relevant_modules: [{ label: "Get Google Keywords for Keywords", name: "getGoogleKeywordsForKeywords", module_type: "action" }],
    appName: "dataforseo-keywords-data-api",
    appVersion: 1
  },
  {
    similarity: 0.3149702911047406,
    popularity: 0.03896103896103896,
    relevant_modules: [{ label: "Compare a Keywords SERP", name: "keywordsSerpCompare", module_type: "action" }],
    appName: "haloscan",
    appVersion: 1
  },
  {
    similarity: 0.3129458574355266,
    popularity: 0.03896103896103896,
    relevant_modules: [{ label: "Extract Google SERP Results", name: "GoogleSERP", module_type: "action" }],
    appName: "scrape-it-cloud",
    appVersion: 1
  },
  {
    similarity: 0.30832494450614845,
    popularity: 0.03896103896103896,
    relevant_modules: [{ label: "Get My Thread Insights (Follower Demographics)", name: "getMyInsightsFollowerDemographics", module_type: "search" }],
    appName: "magic-meal-kits",
    appVersion: 1
  }
];

const languages = [
  { code: "en", label: "English" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ar", label: "Arabic" }
];

const formatProfiles = [
  { id: "kindle", name: "Kindle", detail: "Fastest digital launch with KDP-style royalty focus.", demandBoost: 1.14, royaltyRate: 0.7, costFactor: 0.14 },
  { id: "paperback", name: "Paperback", detail: "Accessible print edition with balanced margin and reach.", demandBoost: 1, royaltyRate: 0.46, costFactor: 0.35 },
  { id: "hardcover", name: "Hardcover", detail: "Premium print edition suited to gift and collector buyers.", demandBoost: 0.82, royaltyRate: 0.38, costFactor: 0.44 },
  { id: "audiobook", name: "Audiobook", detail: "Voice-led format with strong convenience appeal.", demandBoost: 0.93, royaltyRate: 0.4, costFactor: 0.28 }
];

const languageAdjustments: Record<string, number> = {
  en: 1,
  de: 0.91,
  fr: 0.88,
  es: 0.94,
  it: 0.82,
  pt: 0.85,
  ar: 0.79
};

const salesCriteria = [
  { id: "keyword-fit", label: "Keyword fit validated", detail: "Core keywords verified in Trends + autocomplete + Amazon.", weight: 12 },
  { id: "category-fit", label: "Category fit selected", detail: "Primary and fallback categories chosen before launch.", weight: 10 },
  { id: "metadata", label: "Metadata final", detail: "Title, subtitle, description, and backend keywords are finalized.", weight: 12 },
  { id: "cover-test", label: "Cover tested", detail: "At least two cover variants tested for click-through quality.", weight: 9 },
  { id: "pricing-plan", label: "Pricing plan set", detail: "Launch price, promo windows, and post-launch price are defined.", weight: 11 },
  { id: "review-engine", label: "Review engine ready", detail: "ARC/review team and follow-up flow prepared.", weight: 11 },
  { id: "ads-ready", label: "Ad creatives ready", detail: "Ad copy and creatives are ready for testing.", weight: 9 },
  { id: "author-platform", label: "Audience channels active", detail: "Email/social/community channels are active before launch.", weight: 8 },
  { id: "format-coverage", label: "Format coverage chosen", detail: "Kindle/print/audio plan locked for this release.", weight: 9 },
  { id: "launch-calendar", label: "Launch calendar locked", detail: "Weekly milestones set for launch week and 30-day follow-up.", weight: 9 }
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const normalized = String(value ?? "").replace(/"/g, '""');
  return `"${normalized}"`;
}

export default function Page() {
  const [storyTitle, setStoryTitle] = useState("The Same Story");
  const [primaryLanguage, setPrimaryLanguage] = useState("en");
  const [alternateLanguage, setAlternateLanguage] = useState("es");
  const [price, setPrice] = useState(9.99);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["kindle", "paperback"]);
  const [toolSearch, setToolSearch] = useState("");
  const [toolTypeFilter, setToolTypeFilter] = useState<"all" | "search" | "action">("all");
  const [selectedTools, setSelectedTools] = useState<string[]>([
    "serpapi:searchGoogleTrends",
    "serpapi:searchGoogleTrendsTrendingNow"
  ]);
  const [activeToolKey, setActiveToolKey] = useState("serpapi:searchGoogleTrends");
  const [requestPack, setRequestPack] = useState<string>("");
  const [requestPackStatus, setRequestPackStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [requestPackData, setRequestPackData] = useState<RequestPackResponse | null>(null);
  const [liveRunStatus, setLiveRunStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [liveRunData, setLiveRunData] = useState<LiveRunResponse | null>(null);
  const [liveRunError, setLiveRunError] = useState<string>("");
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([]);
  const [autoSyncLiveToN8n, setAutoSyncLiveToN8n] = useState(false);
  const [n8nStatus, setN8nStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [n8nResult, setN8nResult] = useState<N8nSyncResponse | null>(null);
  const [n8nError, setN8nError] = useState("");
  const [selectedSalesCriteria, setSelectedSalesCriteria] = useState<string[]>([]);
  const [launchBudget, setLaunchBudget] = useState(350);
  const [targetReviewCount, setTargetReviewCount] = useState(25);
  const [targetConversionRate, setTargetConversionRate] = useState(4.5);
  const [homeCopyStatus, setHomeCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [focusMode, setFocusMode] = useState<"full" | "minimal">("full");
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState("");
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
  const [elevenLabsVoicesStatus, setElevenLabsVoicesStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [elevenLabsVoicesError, setElevenLabsVoicesError] = useState("");
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installStatus, setInstallStatus] = useState<"idle" | "available" | "installed" | "dismissed">("idle");
  const [enabledProviders, setEnabledProviders] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("enabledProviders");
    return saved ? JSON.parse(saved) : ["serpapi", "dataforseo", "keywords-everywhere", "scrapingbee", "crayo", "elevenlabs", "amazon"];
  });

  useEffect(() => {
    localStorage.setItem("enabledProviders", JSON.stringify(enabledProviders));
  }, [enabledProviders]);

  const availableProviders = [
    { key: "serpapi", label: "SerpApi", configured: !!process.env.NEXT_PUBLIC_SERPAPI_CONFIGURED },
    { key: "dataforseo", label: "DataForSEO", configured: !!process.env.NEXT_PUBLIC_DATAFORSEO_CONFIGURED },
    { key: "keywords-everywhere", label: "Keywords Everywhere", configured: !!process.env.NEXT_PUBLIC_KW_EVERYWHERE_CONFIGURED },
    { key: "scrapingbee", label: "ScrapingBee", configured: !!process.env.NEXT_PUBLIC_SCRAPINGBEE_CONFIGURED },
    { key: "crayo", label: "Crayo", configured: !!process.env.NEXT_PUBLIC_CRAYO_CONFIGURED },
    { key: "elevenlabs", label: "ElevenLabs", configured: !!process.env.NEXT_PUBLIC_ELEVENLABS_CONFIGURED },
    { key: "amazon", label: "Amazon SP-API", configured: !!process.env.NEXT_PUBLIC_AMAZON_CONFIGURED }
  ];

  const averageSimilarity = useMemo(
    () => responsePayload.reduce((sum, item) => sum + item.similarity, 0) / responsePayload.length,
    []
  );
  const averagePopularity = useMemo(
    () => responsePayload.reduce((sum, item) => sum + item.popularity, 0) / responsePayload.length,
    []
  );

  const editionResults = useMemo(() => {
    const languageMultiplier = (languageAdjustments[primaryLanguage] + languageAdjustments[alternateLanguage]) / 2;

    return formatProfiles
      .filter((format) => selectedFormats.includes(format.id))
      .map((format) => {
        const demandSignal = averageSimilarity * averagePopularity * 100 * format.demandBoost * languageMultiplier;
        const royaltyEstimate = price * format.royaltyRate * (1 - format.costFactor * 0.5);
        const reachLabel = demandSignal >= 24 ? "High" : demandSignal >= 18 ? "Medium" : "Niche";

        return {
          ...format,
          demandSignal,
          royaltyEstimate,
          reachLabel
        };
      });
  }, [alternateLanguage, averagePopularity, averageSimilarity, price, primaryLanguage, selectedFormats]);

  const summary = useMemo(() => {
    const demand = editionResults.reduce((sum, item) => sum + item.demandSignal, 0) / editionResults.length;
    const royalty = editionResults.reduce((sum, item) => sum + item.royaltyEstimate, 0) / editionResults.length;

    return {
      count: editionResults.length,
      demand,
      royalty
    };
  }, [editionResults]);

  const toolCatalog = useMemo(
    () =>
      responsePayload.flatMap((source) =>
        source.relevant_modules.map((module) => ({
          key: `${source.appName}:${module.name}`,
          appName: source.appName,
          appVersion: source.appVersion,
          similarity: source.similarity,
          popularity: source.popularity,
          ...module
        }))
      ),
    []
  );

  const visibleTools = useMemo(() => {
    const query = toolSearch.trim().toLowerCase();

    return toolCatalog.filter((tool) => {
      const matchesType = toolTypeFilter === "all" || tool.module_type === toolTypeFilter;
      const matchesQuery =
        query.length === 0 ||
        tool.label.toLowerCase().includes(query) ||
        tool.name.toLowerCase().includes(query) ||
        tool.appName.toLowerCase().includes(query);

      return matchesType && matchesQuery;
    });
  }, [toolCatalog, toolSearch, toolTypeFilter]);

  const selectedToolDetails = useMemo(
    () => toolCatalog.filter((tool) => selectedTools.includes(tool.key)),
    [selectedTools, toolCatalog]
  );

  const toolMix = useMemo(() => {
    const searchCount = selectedToolDetails.filter((tool) => tool.module_type === "search").length;
    const actionCount = selectedToolDetails.filter((tool) => tool.module_type === "action").length;

    return {
      apps: new Set(selectedToolDetails.map((tool) => tool.appName)).size,
      searchCount,
      actionCount
    };
  }, [selectedToolDetails]);

  const recommendedToolKeys = useMemo(() => {
    const next = new Set<string>([
      "serpapi:searchGoogleTrends",
      "serpapi:searchGoogleTrendsTrendingNow"
    ]);

    if (selectedFormats.includes("kindle")) {
      next.add("keywords-everywhere-api:getKeywordData");
    }

    if (selectedFormats.includes("paperback") || selectedFormats.includes("hardcover")) {
      next.add("amazon-seller-central:searchCompetitivePricing");
      next.add("scrapingbee:SearchForProductsInAmazon");
    }

    if (selectedFormats.includes("audiobook")) {
      next.add("scrapingbee:GetProductDataFromAmazon");
      next.add("elevenlabs:getVoices");
      next.add("elevenlabs:textToSpeech");
    }

    if (primaryLanguage !== alternateLanguage) {
      next.add("keywords-everywhere-api:getPasfKeywords");
      next.add("se-ranking-seo-data:searchRelatedKeywords");
    }

    if (selectedFormats.length >= 3) {
      next.add("se-ranking-seo-data:exportKeywordData");
    }

    return Array.from(next);
  }, [alternateLanguage, primaryLanguage, selectedFormats]);

  const activeTool = useMemo(
    () => toolCatalog.find((tool) => tool.key === activeToolKey) ?? selectedToolDetails[0] ?? visibleTools[0] ?? null,
    [activeToolKey, selectedToolDetails, toolCatalog, visibleTools]
  );

  const activeToolBrief = useMemo(() => {
    if (!activeTool) {
      return null;
    }

    const languagePair = `${primaryLanguage}-${alternateLanguage}`;
    const selectedEditionNames = formatProfiles
      .filter((format) => selectedFormats.includes(format.id))
      .map((format) => format.name);

    return {
      useCase:
        activeTool.module_type === "search"
          ? "Use this module to size demand, compare language variants, and shape metadata before launch."
          : "Use this module to estimate commercial viability, price positioning, and adjacent opportunity.",
      request: {
        app: activeTool.appName,
        module: activeTool.name,
        story: storyTitle || "Untitled story",
        formats: selectedEditionNames,
        languages: {
          primary: primaryLanguage,
          alternate: alternateLanguage,
          pair: languagePair
        },
        targetPriceUsd: Number(price.toFixed(2)),
        ...(activeTool.appName === "elevenlabs"
          ? {
              voiceId: elevenLabsVoiceId.trim() || "Use saved default voice"
            }
          : {})
      },
      response: {
        demandSignal: Number((activeTool.similarity * activeTool.popularity * 100).toFixed(2)),
        confidenceBand: activeTool.similarity > 0.35 ? "strong" : "moderate",
        nextDecision:
          activeTool.module_type === "search"
            ? "Refine keywords and localize subtitle positioning"
            : "Adjust pricing, format mix, or market entry sequence"
      }
    };
  }, [activeTool, alternateLanguage, elevenLabsVoiceId, price, primaryLanguage, selectedFormats, storyTitle]);

  const selectedElevenLabsVoice = useMemo(
    () => elevenLabsVoices.find((voice) => voice.voice_id === elevenLabsVoiceId) ?? null,
    [elevenLabsVoiceId, elevenLabsVoices]
  );

  const industryTracks = useMemo(() => {
    const languageLabel = languages.find((language) => language.code === alternateLanguage)?.label ?? alternateLanguage;
    const primaryLabel = languages.find((language) => language.code === primaryLanguage)?.label ?? primaryLanguage;
    const selectedEditionNames = formatProfiles
      .filter((format) => selectedFormats.includes(format.id))
      .map((format) => format.name);

    return [
      {
        title: "Metadata pack",
        status: selectedTools.some((tool) => tool.includes("searchGoogleTrends")) ? "Ready to brief" : "Needs search inputs",
        items: [
          `Lock subtitle, keywords, and category copy for ${selectedEditionNames.join(", ")}.`,
          `Prepare language-specific metadata for ${primaryLabel} and ${languageLabel}.`,
          "Keep title, contributor, and series naming consistent across every edition."
        ]
      },
      {
        title: "Rights and territory",
        status: primaryLanguage !== alternateLanguage ? "Translation rights check" : "Single-language rights check",
        items: [
          "Confirm territorial rights before separate language launches.",
          "Decide whether pricing will be global, territory-based, or channel-based.",
          "Track ISBN, ASIN, audio ownership, and imprint naming by edition."
        ]
      },
      {
        title: "Production and QA",
        status: selectedFormats.length >= 3 ? "Multi-format workflow" : "Standard workflow",
        items: [
          selectedFormats.includes("kindle") ? "Validate EPUB or KPF output and device rendering." : "Digital file prep not selected.",
          selectedFormats.includes("paperback") || selectedFormats.includes("hardcover")
            ? "Approve trim size, proof copy, spine width, and print cover wrap."
            : "Print proofing not selected.",
          selectedFormats.includes("audiobook")
            ? "Complete narrator brief, pronunciation guide, and audio QC pass."
            : "Audiobook production not selected."
        ]
      },
      {
        title: "Launch and demand",
        status: selectedToolDetails.length >= recommendedToolKeys.length ? "Stack complete" : "Add missing tools",
        items: [
          "Stage preorder timing, review copy outreach, and ad-copy tests before launch week.",
          "Benchmark competitive pricing against Amazon and category leaders.",
          "Use trend and keyword tools to decide rollout order by language and format."
        ]
      }
    ];
  }, [alternateLanguage, primaryLanguage, recommendedToolKeys.length, selectedFormats, selectedToolDetails.length, selectedTools]);

  const readinessScore = useMemo(() => {
    const toolCoverage = Math.min(selectedToolDetails.length / Math.max(recommendedToolKeys.length, 1), 1);
    const formatCoverage = Math.min(selectedFormats.length / 4, 1);
    const languageCoverage = primaryLanguage !== alternateLanguage ? 1 : 0.8;

    return Math.round((toolCoverage * 0.45 + formatCoverage * 0.3 + languageCoverage * 0.25) * 100);
  }, [primaryLanguage, alternateLanguage, recommendedToolKeys.length, selectedFormats.length, selectedToolDetails.length]);

  const salesChecklist = useMemo(() => {
    const totalWeight = salesCriteria.reduce((sum, item) => sum + item.weight, 0);
    const completedWeight = salesCriteria
      .filter((item) => selectedSalesCriteria.includes(item.id))
      .reduce((sum, item) => sum + item.weight, 0);
    const checklistScore = totalWeight === 0 ? 0 : completedWeight / totalWeight;
    const budgetScore = Math.min(launchBudget / 500, 1);
    const reviewScore = Math.min(targetReviewCount / 50, 1);
    const conversionScore = Math.min(targetConversionRate / 8, 1);
    const weightedScore = checklistScore * 0.7 + budgetScore * 0.1 + reviewScore * 0.1 + conversionScore * 0.1;

    return {
      score: Math.round(weightedScore * 100),
      done: selectedSalesCriteria.length,
      total: salesCriteria.length,
      missing: salesCriteria.filter((item) => !selectedSalesCriteria.includes(item.id))
    };
  }, [launchBudget, selectedSalesCriteria, targetConversionRate, targetReviewCount]);

  const directoryRows = useMemo(() => {
    const connectorRows =
      requestPackData?.requests.map((requestItem) => ({
        key: requestItem.toolKey,
        label: `${requestItem.appName} / ${requestItem.label}`,
        status: requestItem.connector.configured ? "connected" : "missing",
        detail: requestItem.connector.configured
          ? `${requestItem.connector.provider?.label ?? "Provider"} ready`
          : `Missing ${requestItem.connector.missingEnvKeys.join(", ")}`
      })) ?? [];

    const systemRows = [
      {
        key: "system-n8n",
        label: "n8n sync webhook",
        status: n8nStatus === "ready" ? "connected" : n8nStatus === "error" ? "error" : "pending",
        detail: n8nResult?.webhookUrl ?? "Uses N8N_WEBHOOK_URL from .env.local"
      },
      {
        key: "system-amazon",
        label: "Amazon webhook bridge",
        status:
          liveRunData?.provider === "Amazon Seller Central" && liveRunStatus === "ready"
            ? "connected"
            : liveRunStatus === "error"
              ? "error"
              : "pending",
        detail: liveRunData?.bridgeUrlUsed ?? "Uses AMAZON_SP_API_WEBHOOK_URL from .env.local"
      }
    ];

    return [...systemRows, ...connectorRows];
  }, [liveRunData, liveRunStatus, n8nResult, n8nStatus, requestPackData]);

  const requestPackCsv = useMemo(() => {
    if (!requestPackData) {
      return "";
    }

    const header = [
      "storyTitle",
      "toolKey",
      "appName",
      "module",
      "label",
      "moduleType",
      "connectorConfigured",
      "providerLabel",
      "baseUrl",
      "missingEnvKey"
    ];

    const rows = requestPackData.requests.map((requestItem) => [
      escapeCsvCell(requestPackData.storyTitle),
      escapeCsvCell(requestItem.toolKey),
      escapeCsvCell(requestItem.appName),
      escapeCsvCell(requestItem.module),
      escapeCsvCell(requestItem.label),
      escapeCsvCell(requestItem.moduleType),
      escapeCsvCell(requestItem.connector.configured),
      escapeCsvCell(requestItem.connector.provider?.label ?? ""),
      escapeCsvCell(requestItem.connector.provider?.baseUrl ?? ""),
      escapeCsvCell(requestItem.connector.missingEnvKeys.join(" | "))
    ]);

    return [header.map(escapeCsvCell).join(","), ...rows.map((row) => row.join(","))].join("\n");
  }, [requestPackData]);

  const activeConnector = useMemo(
    () => requestPackData?.requests.find((requestItem) => requestItem.toolKey === activeTool?.key)?.connector ?? null,
    [activeTool?.key, requestPackData]
  );

  const supportsLiveRun = Boolean(
    activeTool &&
      ((activeTool.appName === "serpapi" &&
        [
          "searchGoogleTrends",
          "searchGoogleTrendsTrendingNow",
          "searchAmazon",
          "searchGoogleTrendsAutocomplete",
          "searchGoogleLocalServices",
          "searchGoogleScholarAuthor"
        ].includes(activeTool.name)) ||
        (activeTool.appName === "dataforseo" && activeTool.name === "KeywordsDataSearchVolumeLive") ||
        (activeTool.appName === "amazon-seller-central" &&
          ["searchCompetitivePricing", "searchProductsPricing"].includes(activeTool.name)) ||
        (activeTool.appName === "elevenlabs" && ["getVoices", "textToSpeech"].includes(activeTool.name)))
  );

  useEffect(() => {
    const stored = window.localStorage.getItem("story-market-run-history");
    const autoSyncStored = window.localStorage.getItem("story-market-auto-sync-live-n8n");
    const salesCriteriaStored = window.localStorage.getItem("story-market-sales-criteria");
    const launchBudgetStored = window.localStorage.getItem("story-market-launch-budget");
    const reviewTargetStored = window.localStorage.getItem("story-market-review-target");
    const conversionTargetStored = window.localStorage.getItem("story-market-conversion-target");
    const focusModeStored = window.localStorage.getItem("story-market-focus-mode");
    const elevenLabsVoiceIdStored = window.localStorage.getItem("story-market-elevenlabs-voice-id");

    if (!stored) {
      if (autoSyncStored === "1") {
        setAutoSyncLiveToN8n(true);
      }

      return;
    }

    try {
      setRunHistory(JSON.parse(stored) as RunHistoryEntry[]);
    } catch {
      window.localStorage.removeItem("story-market-run-history");
    }

    if (autoSyncStored === "1") {
      setAutoSyncLiveToN8n(true);
    }

    if (salesCriteriaStored) {
      try {
        const parsed = JSON.parse(salesCriteriaStored) as string[];
        setSelectedSalesCriteria(parsed);
      } catch {
        window.localStorage.removeItem("story-market-sales-criteria");
      }
    }

    if (launchBudgetStored) {
      setLaunchBudget(Number(launchBudgetStored));
    }

    if (reviewTargetStored) {
      setTargetReviewCount(Number(reviewTargetStored));
    }

    if (conversionTargetStored) {
      setTargetConversionRate(Number(conversionTargetStored));
    }

    if (focusModeStored === "minimal" || focusModeStored === "full") {
      setFocusMode(focusModeStored);
    }

    if (elevenLabsVoiceIdStored) {
      setElevenLabsVoiceId(elevenLabsVoiceIdStored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("story-market-auto-sync-live-n8n", autoSyncLiveToN8n ? "1" : "0");
  }, [autoSyncLiveToN8n]);

  useEffect(() => {
    window.localStorage.setItem("story-market-sales-criteria", JSON.stringify(selectedSalesCriteria));
  }, [selectedSalesCriteria]);

  useEffect(() => {
    window.localStorage.setItem("story-market-launch-budget", String(launchBudget));
  }, [launchBudget]);

  useEffect(() => {
    window.localStorage.setItem("story-market-review-target", String(targetReviewCount));
  }, [targetReviewCount]);

  useEffect(() => {
    window.localStorage.setItem("story-market-conversion-target", String(targetConversionRate));
  }, [targetConversionRate]);

  useEffect(() => {
    window.localStorage.setItem("story-market-focus-mode", focusMode);
  }, [focusMode]);

  useEffect(() => {
    window.localStorage.setItem("story-market-elevenlabs-voice-id", elevenLabsVoiceId);
  }, [elevenLabsVoiceId]);

  useEffect(() => {
    async function loadElevenLabsVoices() {
      if (!activeTool || activeTool.appName !== "elevenlabs") {
        setElevenLabsVoices([]);
        setElevenLabsVoicesStatus("idle");
        setElevenLabsVoicesError("");
        return;
      }

      setElevenLabsVoicesStatus("loading");
      setElevenLabsVoicesError("");

      try {
        const response = await fetch("/api/tool-run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            activeTool: {
              key: "elevenlabs:getVoices",
              appName: "elevenlabs",
              name: "getVoices",
              label: "Get Voices",
              module_type: "action"
            }
          })
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "ElevenLabs voices failed to load.");
        }

        const voices = (payload.raw?.voices as ElevenLabsVoice[] | undefined) ?? [];
        setElevenLabsVoices(voices);
        setElevenLabsVoicesStatus("ready");
      } catch (error) {
        setElevenLabsVoices([]);
        setElevenLabsVoicesError(error instanceof Error ? error.message : "ElevenLabs voices failed to load.");
        setElevenLabsVoicesStatus("error");
      }
    }

    void loadElevenLabsVoices();
  }, [activeTool?.appName, activeTool?.key]);

  useEffect(() => {
    const installedStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ((window.navigator as Navigator & { standalone?: boolean }).standalone === true);

    if (installedStandalone) {
      setInstallStatus("installed");
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setInstallStatus("available");
    }

    function handleAppInstalled() {
      setInstallPromptEvent(null);
      setInstallStatus("installed");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    async function generateRequestPack() {
      if (selectedToolDetails.length === 0) {
        setRequestPack("");
        setRequestPackData(null);
        setRequestPackStatus("idle");
        return;
      }

      setRequestPackStatus("loading");

      try {
        const response = await fetch("/api/tool-requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            storyTitle,
            primaryLanguage,
            alternateLanguage,
            price,
            selectedFormats,
            selectedTools: selectedToolDetails.map((tool) => ({
              key: tool.key,
              appName: tool.appName,
              name: tool.name,
              label: tool.label,
              module_type: tool.module_type
            }))
          })
        });

        if (!response.ok) {
          throw new Error("Request pack generation failed");
        }

        const payload = (await response.json()) as RequestPackResponse;
        setRequestPackData(payload);
        setRequestPack(JSON.stringify(payload, null, 2));
        setRequestPackStatus("ready");
      } catch {
        setRequestPackData(null);
        setRequestPackStatus("error");
      }
    }

    void generateRequestPack();
  }, [alternateLanguage, price, primaryLanguage, selectedFormats, selectedToolDetails, storyTitle]);

  function toggleFormat(id: string) {
    setSelectedFormats((current) => {
      const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
      return next.length === 0 ? [id] : next;
    });
  }

  function toggleTool(key: string) {
    setSelectedTools((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key]
    );
  }

  function toggleSalesCriterion(id: string) {
    setSelectedSalesCriteria((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  async function copyHomeLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setHomeCopyStatus("copied");
    } catch {
      setHomeCopyStatus("error");
    }
  }

  async function promptInstall() {
    if (!installPromptEvent) {
      return;
    }

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;

    if (choice.outcome === "accepted") {
      setInstallStatus("installed");
    } else {
      setInstallStatus("dismissed");
    }

    setInstallPromptEvent(null);
  }

  function applyRecommendedStack() {
    setSelectedTools(recommendedToolKeys);
    setActiveToolKey(recommendedToolKeys[0] ?? "serpapi:searchGoogleTrends");
  }

  function applyAllTools() {
    setSelectedTools(toolCatalog.map((tool) => tool.key));
    setActiveToolKey(toolCatalog[0]?.key ?? "serpapi:searchGoogleTrends");
  }

  function exportRequestPackJson() {
    if (!requestPack) {
      return;
    }

    downloadTextFile("story-market-execution-pack.json", requestPack, "application/json;charset=utf-8");
  }

  function exportRequestPackCsv() {
    if (!requestPackCsv) {
      return;
    }

    downloadTextFile("story-market-execution-pack.csv", requestPackCsv, "text/csv;charset=utf-8");
  }

  async function sendToN8n(overrides?: { liveRun?: LiveRunResponse | null; runHistory?: RunHistoryEntry[] }) {
    if (!requestPackData) {
      return;
    }

    setN8nStatus("loading");
    setN8nResult(null);
    setN8nError("");

    try {
      const response = await fetch("/api/n8n-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          storyTitle,
          primaryLanguage,
          alternateLanguage,
          selectedFormats,
          selectedTools,
          requestPack: requestPackData,
          liveRun: overrides?.liveRun ?? liveRunData,
          runHistory: overrides?.runHistory ?? runHistory
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "n8n sync failed.");
      }

      setN8nResult(payload as N8nSyncResponse);
      setN8nStatus("ready");
    } catch (error) {
      setN8nError(error instanceof Error ? error.message : "n8n sync failed.");
      setN8nStatus("error");
    }
  }

  async function runActiveToolLive() {
    if (!activeTool) {
      return;
    }

    setLiveRunStatus("loading");
    setLiveRunData(null);
    setLiveRunError("");

    try {
      const response = await fetch("/api/tool-run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          storyTitle,
          primaryLanguage,
          activeTool: {
            key: activeTool.key,
            appName: activeTool.appName,
            name: activeTool.name,
            label: activeTool.label,
            module_type: activeTool.module_type
          },
          overrides: {
            elevenLabsVoiceId: elevenLabsVoiceId.trim() || undefined
          }
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Live tool run failed.");
      }

      const livePayload = payload as LiveRunResponse;
      setLiveRunData(livePayload);
      setLiveRunStatus("ready");

      const entry: RunHistoryEntry = {
        id: `${Date.now()}-${activeTool.key}`,
        executedAt: livePayload.executedAt,
        storyTitle,
        toolKey: activeTool.key,
        toolLabel: activeTool.label,
        provider: livePayload.provider,
        status: livePayload.summary.status,
        averageInterest: livePayload.summary.averageInterest
      };

      const nextHistory = [entry, ...runHistory].slice(0, 10);

      setRunHistory(nextHistory);
      window.localStorage.setItem("story-market-run-history", JSON.stringify(nextHistory));

      if (autoSyncLiveToN8n) {
        await sendToN8n({
          liveRun: livePayload,
          runHistory: nextHistory
        });
      }
    } catch (error) {
      setLiveRunError(error instanceof Error ? error.message : "Live tool run failed.");
      setLiveRunStatus("error");
    }
  }

  function clearRunHistory() {
    setRunHistory([]);
    window.localStorage.removeItem("story-market-run-history");
  }

  function preventDirectoryNavigation(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement | null;
    const link = target?.closest("a");

    if (link) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  return (
    <main className="page-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Book format and language market planning</p>
          <h1>Story Market Desk</h1>
          <p className="hero-text">
            Compare book formats, switch the same story across languages, and keep the Google Trends and KDP
            estimation sources visible at the top.
          </p>
        </div>
        <div className="hero-stat">
          <span>Sources in focus</span>
          <strong>Google Trends + BookBeam</strong>
          <div className="tool-actions-row">
            <button
              type="button"
              className={`tool-utility-button ${focusMode === "full" ? "strong" : ""}`}
              onClick={() => setFocusMode("full")}
            >
              Full mode
            </button>
            <button
              type="button"
              className={`tool-utility-button ${focusMode === "minimal" ? "strong" : ""}`}
              onClick={() => setFocusMode("minimal")}
            >
              Minimal mode
            </button>
          </div>
        </div>
      </header>

      {focusMode === "full" ? (
      <section className="panel panel-wide providers-panel">
        <div className="panel-heading">
          <div>
            <p className="section-tag">Active providers</p>
            <h2>Toggle data sources on/off</h2>
          </div>
          <p className="panel-note">Enable or disable providers to customize your stack.</p>
        </div>
        <div className="providers-grid">
          {availableProviders.map((provider) => (
            <label key={provider.key} className="provider-checkbox" title={provider.configured ? "" : "Not configured"}>
              <input
                type="checkbox"
                checked={enabledProviders.includes(provider.key)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setEnabledProviders([...enabledProviders, provider.key]);
                  } else {
                    setEnabledProviders(enabledProviders.filter((p) => p !== provider.key));
                  }
                }}
                disabled={!provider.configured}
              />
              <span>{provider.label}</span>
              {!provider.configured && <span className="config-note">(unconfigured)</span>}
            </label>
          ))}
        </div>
      </section>
      ) : null}

      {focusMode === "full" ? (
      <section className="panel panel-wide">
        <div className="panel-heading">
          <div>
            <p className="section-tag">Top input</p>
            <h2>Source payload</h2>
          </div>
          <p className="panel-note">Pinned above the planning controls.</p>
        </div>
        <div className="json-grid">
          <article className="json-card">
            <h3>Request</h3>
            <pre>{JSON.stringify(requestPayload, null, 2)}</pre>
          </article>
          <article className="json-card">
            <h3>Response</h3>
            <pre>{JSON.stringify(responsePayload, null, 2)}</pre>
          </article>
        </div>
      </section>
      ) : null}

      <div className="layout">
        <section className="panel controls-panel">
          <div className="panel-heading">
            <div>
              <p className="section-tag">Planning controls</p>
              <h2>Edition setup</h2>
            </div>
          </div>
          <div className="control-grid">
            <label className="field">
              <span>Story title</span>
              <input value={storyTitle} onChange={(event) => setStoryTitle(event.target.value)} type="text" />
            </label>
            <label className="field">
              <span>Primary language</span>
              <select value={primaryLanguage} onChange={(event) => setPrimaryLanguage(event.target.value)}>
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Alternate language</span>
              <select value={alternateLanguage} onChange={(event) => setAlternateLanguage(event.target.value)}>
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-range">
              <span>Base list price</span>
              <input
                type="range"
                min="2.99"
                max="29.99"
                step="0.5"
                value={price}
                onChange={(event) => setPrice(Number(event.target.value))}
              />
              <strong>{formatCurrency(price)}</strong>
            </label>
          </div>

          <div className="format-section">
            <div className="format-header">
              <div>
                <p className="section-tag">Formats</p>
                <h3>Choose every edition you want to enter</h3>
              </div>
              <p>Select one or several.</p>
            </div>
            <div className="format-grid">
              {formatProfiles.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  className={`format-card ${selectedFormats.includes(format.id) ? "selected" : ""}`}
                  onClick={() => toggleFormat(format.id)}
                >
                  <div className="format-meta">{format.id}</div>
                  <h4>{format.name}</h4>
                  <p>{format.detail}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel insights-panel">
          <div className="panel-heading">
            <div>
              <p className="section-tag">Output</p>
              <h2>Market readout</h2>
            </div>
          </div>
          <div className="summary-strip">
            <article>
              <span>Selected editions</span>
              <strong>{summary.count}</strong>
            </article>
            <article>
              <span>Average demand signal</span>
              <strong>{summary.demand.toFixed(1)} pts</strong>
            </article>
            <article>
              <span>Estimated blended royalty</span>
              <strong>{formatCurrency(summary.royalty)}</strong>
            </article>
          </div>
          <div className="edition-results">
            {editionResults.map((result) => (
              <article key={result.id} className="result-card">
                <p className="format-meta">{storyTitle || "Untitled story"}</p>
                <h3>{result.name}</h3>
                <p>
                  {languages.find((language) => language.code === primaryLanguage)?.label} to{" "}
                  {languages.find((language) => language.code === alternateLanguage)?.label} edition planning.
                </p>
                <div className="metrics">
                  <div className="metric">
                    <span>Demand signal</span>
                    <strong>{result.demandSignal.toFixed(1)} pts</strong>
                  </div>
                  <div className="metric">
                    <span>Reach</span>
                    <strong>{result.reachLabel}</strong>
                  </div>
                  <div className="metric">
                    <span>Estimated royalty</span>
                    <strong>{formatCurrency(result.royaltyEstimate)}</strong>
                  </div>
                  <div className="metric">
                    <span>Formats live</span>
                    <strong>{editionResults.length}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel panel-wide tool-panel">
        <div className="panel-heading">
          <div>
            <p className="section-tag">Tools</p>
            <h2>Tool stack for this story</h2>
          </div>
          <p className="panel-note">Pick the modules you want in your workflow.</p>
        </div>

        <div className="tool-layout">
          <div className="tool-browser">
            <div className="tool-controls">
              <label className="field tool-search">
                <span>Find a tool</span>
                <input
                  value={toolSearch}
                  onChange={(event) => setToolSearch(event.target.value)}
                  placeholder="Search by label, app, or module name"
                  type="text"
                />
              </label>
              <div className="filter-row">
                {[
                  { key: "all", label: "All" },
                  { key: "search", label: "Search" },
                  { key: "action", label: "Action" }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={`filter-pill ${toolTypeFilter === filter.key ? "active" : ""}`}
                    onClick={() => setToolTypeFilter(filter.key as "all" | "search" | "action")}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="tool-actions-row">
                <button type="button" className="tool-utility-button strong" onClick={applyRecommendedStack}>
                  Use recommended stack
                </button>
                <button type="button" className="tool-utility-button" onClick={applyAllTools}>
                  Add all tools
                </button>
                <button type="button" className="tool-utility-button" onClick={() => setSelectedTools([])}>
                  Clear stack
                </button>
              </div>
            </div>

            <div className="tool-grid">
              {visibleTools.map((tool) => (
                <article key={tool.key} className={`tool-card ${selectedTools.includes(tool.key) ? "selected" : ""}`}>
                  <div className="tool-card-top">
                    <div>
                      <p className="format-meta">{tool.appName}</p>
                      <h3>{tool.label}</h3>
                    </div>
                    <span className={`tool-badge ${tool.module_type}`}>{tool.module_type}</span>
                  </div>
                  <p className="tool-id">{tool.name}</p>
                  <div className="metrics compact-metrics">
                    <div className="metric">
                      <span>Similarity</span>
                      <strong>{tool.similarity.toFixed(3)}</strong>
                    </div>
                    <div className="metric">
                      <span>Popularity</span>
                      <strong>{tool.popularity.toFixed(3)}</strong>
                    </div>
                  </div>
                  <div className="tool-card-actions">
                    <button type="button" className="tool-utility-button" onClick={() => setActiveToolKey(tool.key)}>
                      View brief
                    </button>
                    <button type="button" className="tool-toggle" onClick={() => toggleTool(tool.key)}>
                      {selectedTools.includes(tool.key) ? "Remove from stack" : "Add to stack"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="tool-stack">
            {activeTool && activeToolBrief ? (
              <article className="tool-brief-card">
                <div className="stack-top">
                  <div>
                    <p className="format-meta">Active module</p>
                    <h3>{activeTool.label}</h3>
                  </div>
                  <span className={`tool-badge ${activeTool.module_type}`}>{activeTool.module_type}</span>
                </div>
                <p>{activeToolBrief.useCase}</p>
                {activeTool.appName === "elevenlabs" ? (
                  <label className="field">
                    <span>ElevenLabs voice</span>
                    <select value={elevenLabsVoiceId} onChange={(event) => setElevenLabsVoiceId(event.target.value)}>
                      <option value="">Use saved default voice</option>
                      {elevenLabsVoices.map((voice) => (
                        <option key={voice.voice_id} value={voice.voice_id ?? ""}>
                          {voice.name ?? voice.voice_id ?? "Unnamed voice"}
                          {voice.category ? ` · ${voice.category}` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="live-note">
                      {elevenLabsVoicesStatus === "loading"
                        ? "Loading ElevenLabs voices..."
                        : elevenLabsVoicesStatus === "error"
                          ? elevenLabsVoicesError
                          : selectedElevenLabsVoice
                            ? `Selected: ${selectedElevenLabsVoice.name ?? selectedElevenLabsVoice.voice_id}`
                            : "Pick a voice or keep the saved default."}
                    </p>
                  </label>
                ) : null}
                <div className="tool-actions-row live-actions-row">
                  <button
                    type="button"
                    className="tool-utility-button strong"
                    onClick={runActiveToolLive}
                    disabled={!supportsLiveRun || !activeConnector?.configured || liveRunStatus === "loading"}
                    suppressHydrationWarning
                  >
                    {liveRunStatus === "loading" ? "Running live" : "Run live"}
                  </button>
                  <button
                    type="button"
                    className="tool-utility-button"
                    onClick={() => {
                      setLiveRunData(null);
                      setLiveRunError("");
                      setLiveRunStatus("idle");
                    }}
                    disabled={liveRunStatus === "idle"}
                    suppressHydrationWarning
                  >
                    Clear run
                  </button>
                </div>
                <button
                  type="button"
                  className={`tool-utility-button ${autoSyncLiveToN8n ? "strong" : ""}`}
                  onClick={() => setAutoSyncLiveToN8n((current) => !current)}
                >
                  {autoSyncLiveToN8n ? "Auto-sync live run to n8n: On" : "Auto-sync live run to n8n: Off"}
                </button>
                <p className="live-note">When enabled, each successful live run is sent to n8n automatically.</p>
                {!supportsLiveRun ? <p className="live-note">Live execution currently prioritizes the SerpApi tools in the lower-cost default stack.</p> : null}
                {supportsLiveRun && activeConnector && !activeConnector.configured ? (
                  <p className="live-note">Add {activeConnector.missingEnvKeys.join(" and ")} in .env.local to enable live execution.</p>
                ) : null}
                <div className="brief-grid">
                  <div className="brief-block">
                    <span>Example request</span>
                    <pre>{JSON.stringify(activeToolBrief.request, null, 2)}</pre>
                  </div>
                  <div className="brief-block">
                    <span>Example response</span>
                    <pre>{JSON.stringify(activeToolBrief.response, null, 2)}</pre>
                  </div>
                </div>
                {liveRunData ? (
                  <div className="live-run-panel">
                    <div className="brief-grid">
                      <div className="brief-block">
                        <span>Live summary</span>
                        <pre>{JSON.stringify(liveRunData.summary, null, 2)}</pre>
                      </div>
                      <div className="brief-block">
                        <span>Live request</span>
                        <pre>{JSON.stringify(liveRunData.request, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                ) : null}
                {liveRunStatus === "error" ? <p className="live-note error-note">{liveRunError}</p> : null}
              </article>
            ) : null}

            <div className="summary-strip tool-summary-strip">
              <article>
                <span>Selected tools</span>
                <strong>{selectedToolDetails.length}</strong>
              </article>
              <article>
                <span>Apps covered</span>
                <strong>{toolMix.apps}</strong>
              </article>
              <article>
                <span>Mix</span>
                <strong>
                  {toolMix.searchCount}S / {toolMix.actionCount}A
                </strong>
              </article>
            </div>

            <div className="stack-list">
              {selectedToolDetails.length === 0 ? (
                <article className="stack-card empty-state-card">
                  <h3>No tools selected</h3>
                  <p>Apply the recommended stack or pick modules manually to build your workflow.</p>
                </article>
              ) : (
                selectedToolDetails.map((tool) => (
                  <article key={tool.key} className="stack-card">
                    <div className="stack-top">
                      <div>
                        <p className="format-meta">{tool.appName}</p>
                        <h3>{tool.label}</h3>
                      </div>
                      <span className={`tool-badge ${tool.module_type}`}>{tool.module_type}</span>
                    </div>
                    <p>
                      Use for {storyTitle || "this story"} in {languages.find((language) => language.code === primaryLanguage)?.label} and{" "}
                      {languages.find((language) => language.code === alternateLanguage)?.label}.
                    </p>
                    <button type="button" className="tool-utility-button inline-button" onClick={() => setActiveToolKey(tool.key)}>
                      Open brief
                    </button>
                  </article>
                ))
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="panel panel-wide essentials-panel">
        <div className="panel-heading">
          <div>
            <p className="section-tag">Industry essentials</p>
            <h2>What is needed for a publishable market entry</h2>
          </div>
          <p className="panel-note">This covers the operational work beyond search and pricing tools.</p>
        </div>

        <article className="essential-card strategy-card">
          <p className="format-meta">Default app strategy</p>
          <h3>SerpApi-first, lower-cost research stack</h3>
          <div className="essential-list">
            <p>Live defaults now focus on SerpApi for Google Trends and Trending Now.</p>
            <p>Cheaper keyword support is recommended ahead of paid enterprise-only defaults.</p>
            <p>DataForSEO remains optional, not the default path.</p>
          </div>
        </article>

        <div className="summary-strip essentials-summary-strip">
          <article>
            <span>Readiness score</span>
            <strong>{readinessScore}%</strong>
          </article>
          <article>
            <span>Recommended stack</span>
            <strong>{selectedToolDetails.length}/{recommendedToolKeys.length}</strong>
          </article>
          <article>
            <span>Formats planned</span>
            <strong>{selectedFormats.length}</strong>
          </article>
        </div>

        <div className="essentials-grid">
          {industryTracks.map((track) => (
            <article key={track.title} className="essential-card">
              <p className="format-meta">{track.status}</p>
              <h3>{track.title}</h3>
              <div className="essential-list">
                {track.items.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel panel-wide execution-panel">
        <div className="panel-heading">
          <div>
            <p className="section-tag">Execution pack</p>
            <h2>API-ready request bundle</h2>
          </div>
          <div className="execution-actions">
            <button type="button" className="tool-utility-button" onClick={exportRequestPackJson} disabled={!requestPack} suppressHydrationWarning>
              Export JSON
            </button>
            <button
              type="button"
              className="tool-utility-button"
              onClick={exportRequestPackCsv}
              disabled={!requestPackCsv}
              suppressHydrationWarning
            >
              Export CSV
            </button>
            <button
              type="button"
              className="tool-utility-button strong"
              onClick={() => {
                void sendToN8n();
              }}
              disabled={!requestPackData || n8nStatus === "loading"}
              suppressHydrationWarning
            >
              {n8nStatus === "loading" ? "Sending to n8n" : "Send to n8n"}
            </button>
          </div>
        </div>

        <div className="execution-grid">
          <article className="execution-card status-card">
            <p className="format-meta">Current state</p>
            <h3>
              {requestPackStatus === "loading"
                ? "Generating"
                : requestPackStatus === "ready"
                  ? "Ready"
                  : requestPackStatus === "error"
                    ? "Needs retry"
                    : "Waiting for tools"}
            </h3>
            <p>
              {requestPackStatus === "ready"
                ? "This payload can be passed to a connector or automation step."
                : requestPackStatus === "loading"
                  ? "The app is building a request bundle for your current stack."
                  : requestPackStatus === "error"
                    ? "The request bundle could not be generated from the current selection."
                    : "Select one or more tools to generate a usable request bundle."}
            </p>
            {requestPackData ? (
              <div className="connector-summary-box">
                <div className="connector-stat">
                  <span>Configured connectors</span>
                  <strong>{requestPackData.connectorSummary.configured}</strong>
                </div>
                <div className="connector-stat">
                  <span>Missing connectors</span>
                  <strong>{requestPackData.connectorSummary.missing}</strong>
                </div>
              </div>
            ) : null}
            <div className="n8n-status-box">
              <span>n8n handoff</span>
              <strong>
                {n8nStatus === "loading"
                  ? "Sending"
                  : n8nStatus === "ready"
                    ? "Connected"
                    : n8nStatus === "error"
                      ? "Needs webhook"
                      : "Ready to connect"}
              </strong>
              <p>
                {n8nStatus === "ready"
                  ? "The current request bundle was posted to your n8n webhook."
                  : "Add N8N_WEBHOOK_URL in .env.local to hand this bundle to your automation flow."}
              </p>
            </div>
            {n8nStatus === "error" ? <p className="live-note error-note">{n8nError}</p> : null}
          </article>

          <article className="execution-card request-pack-card">
            <p className="format-meta">Generated JSON</p>
            <pre>{requestPack || "{}"}</pre>
            {n8nResult ? (
              <div className="n8n-response-block">
                <p className="format-meta">Last n8n response</p>
                <pre>{JSON.stringify(n8nResult, null, 2)}</pre>
              </div>
            ) : null}
          </article>
        </div>

        {requestPackData ? (
          <div className="connector-grid">
            {requestPackData.requests.map((requestItem) => (
              <article key={requestItem.toolKey} className="connector-card">
                <div className="connector-card-top">
                  <div>
                    <p className="format-meta">{requestItem.appName}</p>
                    <h3>{requestItem.label}</h3>
                  </div>
                  <span className={`connector-badge ${requestItem.connector.configured ? "ready" : "missing"}`}>
                    {requestItem.connector.configured ? "configured" : "missing env"}
                  </span>
                </div>
                <p>{requestItem.connector.provider?.label ?? "No provider mapping found for this app."}</p>
                {requestItem.connector.provider ? (
                  <div className="connector-details">
                    <p>
                      <strong>Base URL</strong>
                      {requestItem.connector.provider.baseUrl}
                    </p>
                    <p>
                      <strong>Env key</strong>
                      {requestItem.connector.provider.credentialEnvKeys.join(", ")}
                    </p>
                    <p>
                      <strong>Auth type</strong>
                      {requestItem.connector.provider.authType}
                    </p>
                  </div>
                ) : null}
                {!requestItem.connector.configured && requestItem.connector.missingEnvKeys.length > 0 ? (
                  <p className="connector-warning">Add {requestItem.connector.missingEnvKeys.join(" and ")} to enable this provider.</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}

        <div className="panel-heading history-heading">
          <div>
            <p className="section-tag">Run history</p>
            <h2>Saved live executions</h2>
          </div>
          <button type="button" className="tool-utility-button" onClick={clearRunHistory} disabled={runHistory.length === 0}>
            Clear history
          </button>
        </div>

        <div className="history-grid">
          {runHistory.length === 0 ? (
            <article className="history-card empty-state-card">
              <h3>No saved runs yet</h3>
              <p>Run a supported live connector and the latest results will be stored here in your browser.</p>
            </article>
          ) : (
            runHistory.map((entry) => (
              <article key={entry.id} className="history-card">
                <p className="format-meta">{entry.provider}</p>
                <h3>{entry.toolLabel}</h3>
                <p>{entry.storyTitle}</p>
                <div className="metrics compact-metrics">
                  <div className="metric">
                    <span>Status</span>
                    <strong>{entry.status}</strong>
                  </div>
                  <div className="metric">
                    <span>Signal</span>
                    <strong>{entry.averageInterest ?? "n/a"}</strong>
                  </div>
                </div>
                <p className="history-timestamp">{new Date(entry.executedAt).toLocaleString()}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel panel-wide sales-panel">
        <div className="panel-heading">
          <div>
            <p className="section-tag">Sales engine</p>
            <h2>Max-sale checklist</h2>
          </div>
          <p className="panel-note">Fill as many criteria as possible for stronger launch performance.</p>
        </div>

        <div className="summary-strip sales-summary-strip">
          <article>
            <span>Sales readiness</span>
            <strong>{salesChecklist.score}%</strong>
          </article>
          <article>
            <span>Checklist complete</span>
            <strong>
              {salesChecklist.done}/{salesChecklist.total}
            </strong>
          </article>
          <article>
            <span>Missing items</span>
            <strong>{salesChecklist.missing.length}</strong>
          </article>
        </div>

        <div className="control-grid sales-controls-grid">
          <label className="field field-range">
            <span>Launch budget (USD)</span>
            <input
              type="range"
              min="50"
              max="1500"
              step="25"
              value={launchBudget}
              onChange={(event) => setLaunchBudget(Number(event.target.value))}
            />
            <strong>{formatCurrency(launchBudget)}</strong>
          </label>
          <label className="field field-range">
            <span>Review goal (first 30 days)</span>
            <input
              type="range"
              min="5"
              max="100"
              step="1"
              value={targetReviewCount}
              onChange={(event) => setTargetReviewCount(Number(event.target.value))}
            />
            <strong>{targetReviewCount} reviews</strong>
          </label>
          <label className="field field-range">
            <span>Conversion goal (%)</span>
            <input
              type="range"
              min="1"
              max="12"
              step="0.5"
              value={targetConversionRate}
              onChange={(event) => setTargetConversionRate(Number(event.target.value))}
            />
            <strong>{targetConversionRate.toFixed(1)}%</strong>
          </label>
        </div>

        <div className="criteria-grid">
          {salesCriteria.map((criterion) => {
            const selected = selectedSalesCriteria.includes(criterion.id);
            return (
              <article key={criterion.id} className={`criterion-card ${selected ? "selected" : ""}`}>
                <div>
                  <p className="format-meta">Weight {criterion.weight}</p>
                  <h3>{criterion.label}</h3>
                  <p>{criterion.detail}</p>
                </div>
                <button
                  type="button"
                  className={`tool-utility-button ${selected ? "strong" : ""}`}
                  onClick={() => toggleSalesCriterion(criterion.id)}
                >
                  {selected ? "Completed" : "Mark complete"}
                </button>
              </article>
            );
          })}
        </div>

        <article className="execution-card install-card">
          <p className="format-meta">Home screen</p>
          <h3>Pin this app on your home screen</h3>
          <div className="essential-list">
            <p>iPhone: Share -&gt; Add to Home Screen.</p>
            <p>Android Chrome: Menu -&gt; Install app / Add to Home screen.</p>
            <p>Desktop Chrome/Edge: Address bar install icon -&gt; Install.</p>
          </div>
          <div className="tool-actions-row">
            <button type="button" className="tool-utility-button" onClick={() => void copyHomeLink()}>
              Copy app link
            </button>
            <button
              type="button"
              className="tool-utility-button strong"
              onClick={() => void promptInstall()}
              disabled={installStatus !== "available"}
            >
              {installStatus === "installed"
                ? "App installed"
                : installStatus === "dismissed"
                  ? "Install dismissed"
                  : installStatus === "available"
                    ? "Install app"
                    : "Install not available"}
            </button>
            <span className="live-note">
              {homeCopyStatus === "copied"
                ? "Link copied"
                : homeCopyStatus === "error"
                  ? "Could not copy link"
                  : installStatus === "available"
                    ? "Install prompt is ready on this device"
                    : "Use this link for quick access"}
            </span>
          </div>
        </article>
      </section>

      <section className="panel panel-wide directory-panel">
        <div className="panel-heading">
          <div>
            <p className="section-tag">Directory</p>
            <h2>Connection directory</h2>
          </div>
          <p className="panel-note">Live overview of data connectors and webhook state.</p>
        </div>
        <div className="connector-grid" onClickCapture={preventDirectoryNavigation}>
          {directoryRows.map((row) => (
            <article key={row.key} className="connector-card">
              <div className="connector-card-top">
                <h3>{row.label}</h3>
                <span className={`connector-badge ${row.status === "connected" ? "ready" : "missing"}`}>
                  {row.status}
                </span>
              </div>
              <p>{row.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {focusMode === "full" ? (
      <section className="panel panel-wide source-panel">
        <div className="panel-heading">
          <div>
            <p className="section-tag">Connected apps</p>
            <h2>Relevant modules from the payload</h2>
          </div>
        </div>
        <div className="source-cards">
          {responsePayload.map((source) => (
            <article key={`${source.appName}-${source.appVersion}`} className="source-card">
              <div className="source-top">
                <div className="source-copy">
                  <p>{source.appName}</p>
                  <h3>v{source.appVersion}</h3>
                </div>
                <strong>{(source.similarity * 100).toFixed(1)}%</strong>
              </div>
              <div className="metrics">
                <div className="metric">
                  <span>Similarity</span>
                  <strong>{source.similarity.toFixed(3)}</strong>
                </div>
                <div className="metric">
                  <span>Popularity</span>
                  <strong>{source.popularity.toFixed(3)}</strong>
                </div>
              </div>
              <div className="module-list">
                {source.relevant_modules.map((module) => (
                  <span key={`${source.appName}-${module.name}`} className="module-chip">
                    {module.label}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      ) : null}
    </main>
  );
}
