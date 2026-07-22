import { processEnv } from "@/lib/env";

export type ProviderDefinition = {
  key: string;
  label: string;
  description: string;
  baseUrl: string;
  credentialEnvKeys: string[];
  authType: "apiKeyQuery" | "basic" | "bearerHeader" | "apiKeyHeader";
  apps: string[];
  tier: "live" | "ai" | "fallback";
};

/**
 * Active connector stack (as of July 2026):
 *
 * TIER 1 — Live data APIs (paid, real-time results)
 *   SerpApi      → Amazon search + Google Trends
 *   DataForSEO   → Keyword search volume + difficulty
 *   ElevenLabs   → Text-to-speech / audiobook generation
 *
 * TIER 2 — Solene AI agent (Base44, free via SOLENE_API_KEY)
 *   Handles: keyword ideas, competitor analysis, market summaries,
 *            trend interpretation, and any tool not covered by Tier 1.
 *
 * REMOVED (not needed):
 *   Haloscan, ScrapingBee, SE Ranking, Semrush,
 *   Keywords Everywhere, Scrape-It.Cloud, Amazon SP-API webhook
 */

export const providerDefinitions: ProviderDefinition[] = [
  {
    key: "serpapi",
    label: "SerpApi",
    description: "Live Amazon product search and Google Trends data.",
    baseUrl: "https://serpapi.com",
    credentialEnvKeys: ["SERPAPI_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["serpapi"],
    tier: "live"
  },
  {
    key: "dataforseo",
    label: "DataForSEO",
    description: "Keyword search volume, difficulty, and Google Ads data.",
    baseUrl: "https://api.dataforseo.com",
    credentialEnvKeys: ["DATAFORSEO_CREDENTIALS"],
    authType: "basic",
    apps: ["dataforseo", "dataforseo-labs-api", "dataforseo-keywords-data-api"],
    tier: "live"
  },
  {
    key: "elevenlabs",
    label: "ElevenLabs",
    description: "Text-to-speech for audiobook generation.",
    baseUrl: "https://api.elevenlabs.io",
    credentialEnvKeys: ["ELEVENLABS_API_KEY"],
    authType: "apiKeyHeader",
    apps: ["elevenlabs"],
    tier: "live"
  },
  {
    key: "solene",
    label: "Solene (Base44 AI Agent)",
    description: "AI-powered research fallback — keyword ideas, market summaries, competitor analysis, trend insights.",
    baseUrl: "https://app.base44.com/api/agents",
    credentialEnvKeys: ["SOLENE_API_KEY"],
    authType: "apiKeyHeader",
    apps: ["solene"],
    tier: "ai"
  }
];

export function getProviderForApp(appName: string) {
  return providerDefinitions.find((p) => p.apps.includes(appName)) ?? null;
}

export function getConnectorStatus(appName: string) {
  const provider = getProviderForApp(appName);
  if (!provider) return { configured: false, provider: null, missingEnvKeys: [] as string[] };

  const missingEnvKeys = provider.credentialEnvKeys.filter((k) => !processEnv[k]);
  const hasRealKeys = missingEnvKeys.length === 0;
  const hasSolene = !!processEnv["SOLENE_API_KEY"];

  return {
    configured: hasRealKeys || hasSolene,
    provider,
    missingEnvKeys: hasRealKeys ? [] : missingEnvKeys
  };
}
