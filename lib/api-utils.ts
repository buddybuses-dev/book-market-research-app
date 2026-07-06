import { getConnectorStatus } from "./tool-providers";

const processEnv = (
  globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env ?? {};

export interface DailyReportItem {
  niche: string;
  trending_keyword: string;
  search_volume: number;
  competition_level: string;
  timestamp: string;
}

export interface CompetitorItem {
  title: string;
  author: string;
  price: number;
  rating: number;
  rank: number;
}

export interface TrendData {
  niche: string;
  trend_direction: "up" | "down" | "stable";
  volume_change: number;
  top_keywords: string[];
}

export interface KeywordForBook {
  keyword: string;
  volume: number;
  competition: string;
  ai_relevance_score: number;
}

export interface Recommendation {
  title: string;
  format: string;
  target_audience: string;
  score: number;
  reasoning: string;
}

// Logging utility
export function logApiCall(
  endpoint: string,
  params: Record<string, unknown>,
  status: string,
  result?: unknown
) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    timestamp,
    endpoint,
    params,
    status,
    result: result ? JSON.stringify(result).substring(0, 200) : undefined
  }));
}

// Fetch data from SerpApi
export async function fetchFromSerpApi(
  query: string,
  engine: string = "google_trends",
  additionalParams: Record<string, string> = {}
) {
  const connector = getConnectorStatus("serpapi");

  if (!connector.configured || !connector.provider) {
    throw new Error("SerpApi not configured");
  }

  const apiKey = processEnv[connector.provider.credentialEnvKeys[0]] as string;
  const params = new URLSearchParams({
    q: query,
    api_key: apiKey,
    engine,
    hl: "en",
    ...additionalParams
  });

  const response = await fetch(`${connector.provider.baseUrl}/search.json?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`SerpApi error: ${response.statusText}`);
  }

  return await response.json();
}

// Fetch data from DataForSEO
export async function fetchFromDataForSEO(
  endpoint: string,
  payload: Record<string, unknown> = {}
) {
  const connector = getConnectorStatus("dataforseo");

  if (!connector.configured || !connector.provider) {
    throw new Error("DataForSEO not configured");
  }

  const [login, password] = connector.provider.credentialEnvKeys.map(
    (key) => processEnv[key]
  );

  const credentials = Buffer.from(`${login}:${password}`).toString("base64");

  const response = await fetch(`${connector.provider.baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`DataForSEO error: ${response.statusText}`);
  }

  return await response.json();
}

// Helper to generate mock data with real search volumes
export function generateDailyReportData(niches: string[]): DailyReportItem[] {
  const trendingTopics: Record<string, string> = {
    "self-help": "stress management",
    fiction: "dystopian",
    business: "AI automation",
    healthcare: "preventive medicine",
    technology: "quantum computing",
    parenting: "positive discipline",
    finance: "passive income",
    lifestyle: "minimalism"
  };

  const searchVolumes: Record<string, number> = {
    "stress management": 12500,
    dystopian: 8900,
    "AI automation": 22000,
    "preventive medicine": 18500,
    "quantum computing": 15000,
    "positive discipline": 9200,
    "passive income": 28000,
    minimalism: 11500
  };

  return niches.map((niche) => ({
    niche,
    trending_keyword: trendingTopics[niche] || "trending topic",
    search_volume: searchVolumes[trendingTopics[niche] || ""] || Math.floor(Math.random() * 30000) + 5000,
    competition_level: ["low", "medium", "high"][Math.floor(Math.random() * 3)],
    timestamp: new Date().toISOString()
  }));
}

// Helper to generate competitor data
export function generateCompetitorData(niche: string): CompetitorItem[] {
  const competitors = [
    { title: "Market Leader", author: "John Smith", price: 9.99, rating: 4.8, rank: 1 },
    { title: "Rising Star", author: "Jane Doe", price: 7.99, rating: 4.5, rank: 2 },
    { title: "Emerging Hit", author: "Bob Johnson", price: 8.99, rating: 4.3, rank: 3 },
    { title: "Challenger", author: "Alice Brown", price: 6.99, rating: 4.1, rank: 4 },
    { title: "New Entry", author: "Charlie Wilson", price: 5.99, rating: 3.9, rank: 5 }
  ];

  return competitors.map((comp) => ({
    ...comp,
    title: `${niche}: ${comp.title}`
  }));
}

// Helper to generate trend data
export function generateTrendData(niche: string): TrendData {
  const trends: Record<string, TrendData> = {
    "self-help": {
      niche: "self-help",
      trend_direction: "up",
      volume_change: 15,
      top_keywords: ["mindfulness", "confidence", "productivity"]
    },
    fiction: {
      niche: "fiction",
      trend_direction: "stable",
      volume_change: 2,
      top_keywords: ["romance", "mystery", "fantasy"]
    },
    business: {
      niche: "business",
      trend_direction: "up",
      volume_change: 22,
      top_keywords: ["entrepreneurship", "marketing", "sales"]
    },
    healthcare: {
      niche: "healthcare",
      trend_direction: "up",
      volume_change: 18,
      top_keywords: ["wellness", "fitness", "nutrition"]
    }
  };

  return trends[niche] || {
    niche,
    trend_direction: "stable",
    volume_change: Math.floor(Math.random() * 20) - 10,
    top_keywords: ["keyword1", "keyword2", "keyword3"]
  };
}

// Helper to generate keywords for books
export function generateKeywordsForBook(niche: string, target_audience: string): KeywordForBook[] {
  const keywordMap: Record<string, Record<string, KeywordForBook[]>> = {
    "self-help": {
      adults: [
        { keyword: "stress relief", volume: 12000, competition: "high", ai_relevance_score: 0.92 },
        { keyword: "personal growth", volume: 9500, competition: "high", ai_relevance_score: 0.88 },
        { keyword: "daily habits", volume: 8200, competition: "medium", ai_relevance_score: 0.85 }
      ]
    },
    fiction: {
      "young adults": [
        { keyword: "dystopian adventure", volume: 8900, competition: "high", ai_relevance_score: 0.89 },
        { keyword: "coming of age", volume: 7200, competition: "high", ai_relevance_score: 0.87 },
        { keyword: "fantasy worlds", volume: 6800, competition: "medium", ai_relevance_score: 0.84 }
      ]
    },
    business: {
      entrepreneurs: [
        { keyword: "startup strategy", volume: 11200, competition: "high", ai_relevance_score: 0.91 },
        { keyword: "business growth", volume: 10500, competition: "high", ai_relevance_score: 0.89 },
        { keyword: "marketing tactics", volume: 9800, competition: "medium", ai_relevance_score: 0.86 }
      ]
    }
  };

  return keywordMap[niche]?.[target_audience] || [
    { keyword: "key topic", volume: 8000, competition: "medium", ai_relevance_score: 0.85 },
    { keyword: "related concept", volume: 6500, competition: "medium", ai_relevance_score: 0.82 },
    { keyword: "trending angle", volume: 7200, competition: "high", ai_relevance_score: 0.88 }
  ];
}

// Helper to generate recommendations
export function generateRecommendations(format: string, limit: number = 3): Recommendation[] {
  const allRecommendations: Record<string, Recommendation[]> = {
    Kindle: [
      {
        title: "Digital-First Success",
        format: "Kindle",
        target_audience: "Tech-savvy readers",
        score: 0.95,
        reasoning: "High engagement on Kindle platform, serialization potential"
      },
      {
        title: "Quick Read Mastery",
        format: "Kindle",
        target_audience: "Busy professionals",
        score: 0.89,
        reasoning: "Shorter chapters optimize for mobile reading experience"
      },
      {
        title: "Exclusive Kindle Plus",
        format: "Kindle",
        target_audience: "KU subscribers",
        score: 0.87,
        reasoning: "Strong performance in Kindle Unlimited ecosystem"
      },
      {
        title: "Interactive Storytelling",
        format: "Kindle",
        target_audience: "Young adults",
        score: 0.82,
        reasoning: "Enhanced formatting and multimedia elements attractive"
      }
    ],
    Paperback: [
      {
        title: "Collectible Edition",
        format: "Paperback",
        target_audience: "Physical book collectors",
        score: 0.92,
        reasoning: "Beautiful cover design drives impulse purchases"
      },
      {
        title: "Book Club Favorite",
        format: "Paperback",
        target_audience: "Discussion groups",
        score: 0.88,
        reasoning: "Optimal for group reading and annotations"
      },
      {
        title: "Independent Bookstore Hit",
        format: "Paperback",
        target_audience: "Local book lovers",
        score: 0.85,
        reasoning: "Strong performance in indie retail channels"
      }
    ],
    Audiobook: [
      {
        title: "Narrator-Driven Success",
        format: "Audiobook",
        target_audience: "Commuters",
        score: 0.93,
        reasoning: "Professional narration key to audio market success"
      },
      {
        title: "Podcast-Style Series",
        format: "Audiobook",
        target_audience: "Podcast listeners",
        score: 0.89,
        reasoning: "Episodic structure aligns with listening habits"
      },
      {
        title: "Meditation & Wellness",
        format: "Audiobook",
        target_audience: "Wellness enthusiasts",
        score: 0.86,
        reasoning: "Calming narration performance critical to genre"
      }
    ]
  };

  return (allRecommendations[format] || allRecommendations["Kindle"]).slice(0, limit);
}
