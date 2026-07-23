import { processEnv } from "@/lib/env";

export type ProviderDefinition = {
  key: string;
  label: string;
  description: string;
  baseUrl: string;
  credentialEnvKeys: string[];
  authType: "apiKeyQuery" | "basic" | "bearerHeader" | "apiKeyHeader" | "apiKeyHeaderCustom";
  apps: string[];
  tier: "live" | "ai" | "image" | "tts";
};

/**
 * Connector stack (July 2026):
 *
 * LIVE DATA:
 *   SerpApi            → Amazon search + Google Trends
 *   DataForSEO         → Keyword search volume + difficulty
 *   ScrapingBee        → Amazon product scraping + SERP data
 *   Keywords Everywhere → Keyword metrics + search volume
 *
 * IMAGE GENERATION:
 *   Gemini             → Google Nano Banana / Gemini Flash Image
 *
 * TTS / AUDIOBOOK:
 *   ElevenLabs         → Text-to-speech (eleven_flash_v2_5)
 *
 * AI FALLBACK:
 *   Solene             → Keyword ideas, market summaries, competitor analysis
 *   Anthropic          → Claude LLM fallback
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
    key: "scrapingbee",
    label: "ScrapingBee",
    description: "Amazon product scraping, SERP data extraction, and product page parsing.",
    baseUrl: "https://app.scrapingbee.com/api",
    credentialEnvKeys: ["SCRAPINGBEE_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["scrapingbee"],
    tier: "live"
  },
  {
    key: "keywords-everywhere",
    label: "Keywords Everywhere",
    description: "Keyword metrics, search volume, and related keyword data.",
    baseUrl: "https://api.keywordseverywhere.com",
    credentialEnvKeys: ["KEYWORDS_EVERYWHERE_API_KEY"],
    authType: "apiKeyHeader",
    apps: ["keywords-everywhere-api"],
    tier: "live"
  },
  {
    key: "gemini",
    label: "Google Gemini (Nano Banana)",
    description: "AI image generation for book covers, illustrations, and page designs.",
    baseUrl: "https://generativelanguage.googleapis.com",
    credentialEnvKeys: ["GEMINI_API_KEY"],
    authType: "apiKeyHeaderCustom",
    apps: ["gemini"],
    tier: "image"
  },
  {
    key: "elevenlabs",
    label: "ElevenLabs",
    description: "Text-to-speech for audiobook generation.",
    baseUrl: "https://api.elevenlabs.io",
    credentialEnvKeys: ["ELEVENLABS_API_KEY"],
    authType: "apiKeyHeader",
    apps: ["elevenlabs"],
    tier: "tts"
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
  const hasAnthropic = !!processEnv["ANTHROPIC_API_KEY"];

  return {
    configured: hasRealKeys || hasSolene || hasAnthropic,
    provider,
    missingEnvKeys: hasRealKeys ? [] : missingEnvKeys
  };
}
