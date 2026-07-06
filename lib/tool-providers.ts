export type ProviderDefinition = {
  key: string;
  label: string;
  baseUrl: string;
  credentialEnvKeys: string[];
  authType: "apiKeyQuery" | "basic" | "bearerHeader" | "apiKeyHeader";
  apps: string[];
};

const processEnv = (
  globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env ?? {};

export const providerDefinitions: ProviderDefinition[] = [
  {
    key: "serpapi",
    label: "SerpApi",
    baseUrl: "https://serpapi.com",
    credentialEnvKeys: ["SERPAPI_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["serpapi"]
  },
  {
    key: "dataforseo",
    label: "DataForSEO",
    baseUrl: "https://api.dataforseo.com",
    credentialEnvKeys: ["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"],
    authType: "basic",
    apps: ["dataforseo", "dataforseo-labs-api", "dataforseo-keywords-data-api"]
  },
  {
    key: "keywords-everywhere-api",
    label: "Keywords Everywhere",
    baseUrl: "https://api.keywordseverywhere.com",
    credentialEnvKeys: ["KEYWORDS_EVERYWHERE_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["keywords-everywhere-api"]
  },
  {
    key: "scrapingbee",
    label: "ScrapingBee",
    baseUrl: "https://app.scrapingbee.com/api/v1",
    credentialEnvKeys: ["SCRAPINGBEE_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["scrapingbee"]
  },
  {
    key: "se-ranking-seo-data",
    label: "SE Ranking",
    baseUrl: "https://api.seranking.com",
    credentialEnvKeys: ["SE_RANKING_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["se-ranking-seo-data"]
  },
  {
    key: "semrush",
    label: "Semrush",
    baseUrl: "https://api.semrush.com",
    credentialEnvKeys: ["SEMRUSH_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["semrush"]
  },
  {
    key: "crayo",
    label: "Crayo",
    baseUrl: "https://api.crayo.ai",
    credentialEnvKeys: ["CRAYO_API_KEY"],
    authType: "bearerHeader",
    apps: ["crayo"]
  },
  {
    key: "elevenlabs",
    label: "ElevenLabs",
    baseUrl: "https://api.elevenlabs.io",
    credentialEnvKeys: ["ELEVENLABS_API_KEY"],
    authType: "apiKeyHeader",
    apps: ["elevenlabs"]
  },
  {
    key: "amazon-seller-central",
    label: "Amazon Seller Central",
    baseUrl: "n8n Amazon webhook bridge",
    credentialEnvKeys: ["AMAZON_SP_API_WEBHOOK_URL"],
    authType: "apiKeyQuery",
    apps: ["amazon-seller-central"]
  },
  {
    key: "haloscan",
    label: "Haloscan",
    baseUrl: "https://api.haloscan.io",
    credentialEnvKeys: ["HALOSCAN_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["haloscan"]
  },
  {
    key: "scrape-it-cloud",
    label: "Scrape-It.Cloud",
    baseUrl: "https://api.scrape-it.cloud",
    credentialEnvKeys: ["SCRAPE_IT_CLOUD_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["scrape-it-cloud"]
  },
  {
    key: "magic-meal-kits",
    label: "Magic Meal Kits",
    baseUrl: "https://api.magicmealkits.example",
    credentialEnvKeys: ["MAGIC_MEAL_KITS_API_KEY"],
    authType: "apiKeyQuery",
    apps: ["magic-meal-kits"]
  }
];

export function getProviderForApp(appName: string) {
  return providerDefinitions.find((provider) => provider.apps.includes(appName)) ?? null;
}

export function getConnectorStatus(appName: string) {
  const provider = getProviderForApp(appName);

  if (!provider) {
    return {
      configured: false,
      provider: null,
      missingEnvKeys: [] as string[]
    };
  }

  const missingEnvKeys = provider.credentialEnvKeys.filter((envKey) => !processEnv[envKey]);

  return {
    configured: missingEnvKeys.length === 0,
    provider,
    missingEnvKeys
  };
}
