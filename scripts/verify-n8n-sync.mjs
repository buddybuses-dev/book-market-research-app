const baseUrl = process.env.APP_BASE_URL || "http://localhost:3002";

const payload = {
  storyTitle: "The Same Story",
  primaryLanguage: "en",
  alternateLanguage: "es",
  selectedFormats: ["kindle", "paperback"],
  selectedTools: ["serpapi:searchGoogleTrends", "serpapi:searchGoogleTrendsTrendingNow"],
  requestPack: {
    storyTitle: "The Same Story",
    requestCount: 2,
    connectorSummary: {
      configured: 2,
      missing: 0
    },
    requests: [
      {
        toolKey: "serpapi:searchGoogleTrends",
        appName: "serpapi",
        module: "searchGoogleTrends",
        label: "Search Google Trends",
        moduleType: "search",
        connector: {
          configured: true,
          provider: {
            label: "SerpApi"
          },
          missingEnvKeys: []
        }
      },
      {
        toolKey: "serpapi:searchGoogleTrendsTrendingNow",
        appName: "serpapi",
        module: "searchGoogleTrendsTrendingNow",
        label: "Search Google Trends Trending Now",
        moduleType: "search",
        connector: {
          configured: true,
          provider: {
            label: "SerpApi"
          },
          missingEnvKeys: []
        }
      }
    ]
  },
  liveRun: null,
  runHistory: []
};

const endpoint = `${baseUrl}/api/n8n-sync`;

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    console.error("n8n sync check failed", { status: response.status, data });
    process.exit(1);
  }

  console.log("n8n sync check passed", data);
} catch (error) {
  console.error("n8n sync check failed", error);
  process.exit(1);
}