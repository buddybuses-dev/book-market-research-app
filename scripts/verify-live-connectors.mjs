const baseUrl = process.env.APP_BASE_URL || "http://localhost:3002";

const checks = [
  {
    key: "n8n-sync",
    endpoint: "/api/n8n-sync",
    payload: {
      storyTitle: "Connection Test",
      primaryLanguage: "en",
      alternateLanguage: "es",
      selectedFormats: ["kindle"],
      selectedTools: ["serpapi:searchGoogleTrends"],
      requestPack: {
        generatedAt: new Date().toISOString(),
        storyTitle: "Connection Test",
        requestCount: 1,
        connectorSummary: {
          configured: 1,
          missing: 0
        },
        requests: []
      },
      liveRun: null,
      runHistory: []
    }
  },
  {
    key: "serpapi-amazon",
    endpoint: "/api/tool-run",
    payload: {
      storyTitle: "B072MQ5BRX",
      primaryLanguage: "en",
      activeTool: {
        key: "serpapi:searchAmazon",
        appName: "serpapi",
        name: "searchAmazon",
        label: "Search Amazon",
        module_type: "search"
      }
    }
  },
  {
    key: "amazon-bridge",
    endpoint: "/api/tool-run",
    payload: {
      storyTitle: "B072MQ5BRX",
      primaryLanguage: "en",
      activeTool: {
        key: "amazon-seller-central:searchProductsPricing",
        appName: "amazon-seller-central",
        name: "searchProductsPricing",
        label: "Search Products Pricing",
        module_type: "search"
      }
    }
  }
];

const results = [];

for (const check of checks) {
  const url = `${baseUrl}${check.endpoint}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(check.payload)
    });

    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    results.push({
      key: check.key,
      status: response.status,
      ok: response.ok,
      data
    });
  } catch (error) {
    results.push({
      key: check.key,
      status: 0,
      ok: false,
      data: String(error)
    });
  }
}

const failed = results.filter((item) => !item.ok);

if (failed.length > 0) {
  console.error("live connector check failed", { results });
  process.exit(1);
}

console.log("live connector check passed", { results });
