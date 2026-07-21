import { processEnv } from "@/lib/env";

export type ProviderDefinition = {
  key: string;
  label: string;
  baseUrl: string;
  credentialEnvKeys: string[];
  authType: "apiKeyQuery" | "basic" | "bearerHeader" | "apiKeyHeader";
  apps: string[];
  claudeSupported?: boolean;
};

// Apps that Claude can fully replace with free AI-generated research
const CLAUDE_SUPPORTED_APPS = new Set([
  "serpapi",
  "dataforseo",
  "dataforseo-labs-api",
  "dataforseo-keywords-data-api",
  "amazon-seller-central",
  "keywords-everywhere-api",
  "scrapingbee",
  "se-ranking-seo-data",
  "semrush",
  "haloscan",
  "scrape-it-cloud"
]);

export const providerDefinitions: ProviderDefinition[] = [
  {
    key: "serpapi",
    label: "SerpApi",
    baseUrl: "https://serpapi.com",
    credentialEnvKeys: ["SERPAPI_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["serpapi"],
    claudeSupported: true
  },
  {
    key: "dataforseo",
    label: "DataForSEO",
    baseUrl: "https://api.dataforseo.com",
    credentialEnvKeys: ["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"],
    authType: "basic",
    apps: ["dataforseo", "dataforseo-labs-api", "dataforseo-keywords-data-api"],
    claudeSupported: true
  },
  {
    key: "keywords-everywhere-api",
    label: "Keywords Everywhere",
    baseUrl: "https://api.keywordseverywhere.com",
    credentialEnvKeys: ["KEYWORDS_EVERYWHERE_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["keywords-everywhere-api"],
    claudeSupported: true
  },
  {
    key: "scrapingbee",
    label: "ScrapingBee",
    baseUrl: "https://app.scrapingbee.com/api/v1",
    credentialEnvKeys: ["SCRAPINGBEE_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["scrapingbee"],
    claudeSupported: true
  },
  {
    key: "se-ranking-seo-data",
    label: "SE Ranking",
    baseUrl: "https://api.seranking.com",
    credentialEnvKeys: ["SE_RANKING_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["se-ranking-seo-data"],
    claudeSupported: true
  },
  {
    key: "semrush",
    label: "Semrush",
    baseUrl: "https://api.semrush.com",
    credentialEnvKeys: ["SEMRUSH_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["semrush"],
    claudeSupported: true
  },
  {
    key: "crayo",
    label: "Crayo",
    baseUrl: "https://api.crayo.ai",
    credentialEnvKeys: ["CRAYO_API_KEY"],
    authType: "bearerHeader",
    apps: ["crayo"],
    claudeSupported: false
  },
  {
    key: "elevenlabs",
    label: "ElevenLabs",
    baseUrl: "https://api.elevenlabs.io",
    credentialEnvKeys: ["ELEVENLABS_API_KEY"],
    authType: "apiKeyHeader",
    apps: ["elevenlabs"],
    claudeSupported: false
  },
  {
    key: "amazon-seller-central",
    label: "Amazon Seller Central",
    baseUrl: "n8n Amazon webhook bridge",
    credentialEnvKeys: ["AMAZON_SP_API_WEBHOOK_URL"],
    authType: "apiKeyQuery",
    apps: ["amazon-seller-central"],
    claudeSupported: true
  },
  {
    key: "haloscan",
    label: "Haloscan",
    baseUrl: "https://api.haloscan.io",
    credentialEnvKeys: ["HALOSCAN_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["haloscan"],
    claudeSupported: true
  },
  {
    key: "scrape-it-cloud",
    label: "Scrape-It.Cloud",
    baseUrl: "https://api.scrape-it.cloud",
    credentialEnvKeys: ["SCRAPE_IT_CLOUD_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["scrape-it-cloud"],
    claudeSupported: true
  },
  {
    key: "magic-meal-kits",
    label: "Magic Meal Kits",
    baseUrl: "https://api.magicmealkits.example",
    credentialEnvKeys: ["MAGIC_MEAL_KITS_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["magic-meal-kits"],
    claudeSupported: false
  }
];

export function getProviderForApp(appName: string) {
  return providerDefinitions.find((provider) => provider.apps.includes(appName)) ?? null;
}

export function isClaudeSupported(appName: string): boolean {
  return CLAUDE_SUPPORTED_APPS.has(appName) && !!processEnv.ANTHROPIC_API_KEY;
}

export function getConnectorStatus(appName: string) {
  const provider = getProviderForApp(appName);

  if (!provider) {
    return {
      configured: false,
      claudeFallback: false,
      provider: null,
      missingEnvKeys: [] as string[]
    };
  }

  const missingEnvKeys = provider.credentialEnvKeys.filter((envKey) => !processEnv[envKey]);
  const hasRealKeys = missingEnvKeys.length === 0;
  const claudeFallback = !hasRealKeys && isClaudeSupported(appName);

  return {
    // configured = true if real API key OR Claude fallback available
    configured: hasRealKeys || claudeFallback,
    claudeFallback,
    provider,
    missingEnvKeys: claudeFallback ? [] : missingEnvKeys
  };
}
