#!/usr/bin/env node
/**
 * N8N QUICK START - API ENDPOINT CALLS
 * 
 * Copy and paste these examples directly into n8n HTTP Request nodes
 */

const n8nWorkflowExamples = {
  
  // Example 1: Daily Report Workflow
  dailyReportNode: {
    method: "GET",
    url: "https://book-market-research-app.vercel.app/api/daily-report",
    qs: {
      niches: "self-help,fiction,business,healthcare,technology",
      format: "json"
    },
    description: "Get daily trending keywords for multiple niches",
    triggerExample: "Daily schedule at 8:00 AM UTC"
  },

  // Example 2: Competitive Analysis Workflow
  competitorAnalysisNode: {
    method: "GET",
    url: "https://book-market-research-app.vercel.app/api/competitors",
    qs: {
      niche: "self-help",
      format: "json"
    },
    description: "Analyze top 5 competitors in a niche",
    triggerExample: "Manually or weekly schedule",
    variableExample: {
      niche: "{{ $node['Select Niche'].value }}"
    }
  },

  // Example 3: Trend Analysis Workflow
  trendAnalysisNode: {
    method: "GET",
    url: "https://book-market-research-app.vercel.app/api/trends",
    qs: {
      niche: "fiction",
      days: 7
    },
    description: "Get trend direction and volume changes",
    triggerExample: "Weekly schedule",
    outputExample: {
      niche: "fiction",
      trend_direction: "up",
      volume_change: 15,
      top_keywords: ["romance", "mystery", "fantasy"]
    }
  },

  // Example 4: Book Outline Generation Workflow
  bookOutlineNode: {
    method: "GET",
    url: "https://book-market-research-app.vercel.app/api/keywords-for-book",
    qs: {
      niche: "business",
      target_audience: "entrepreneurs",
      format: "json"
    },
    description: "Get keyword suggestions for book outline",
    triggerExample: "After user selects niche and audience",
    chainingExample: "Send keywords to GPT-4 for outline generation"
  },

  // Example 5: Content Recommendations Workflow
  recommendationsNode: {
    method: "GET",
    url: "https://book-market-research-app.vercel.app/api/recommendations",
    qs: {
      format: "Kindle",
      limit: 3
    },
    description: "Get format-specific content recommendations",
    triggerExample: "After book completion",
    outputExample: {
      title: "Digital-First Success",
      format: "Kindle",
      target_audience: "Tech-savvy readers",
      score: 0.95,
      reasoning: "High engagement on Kindle platform"
    }
  }
};

// Node Configuration Templates for n8n

const nodeConfigTemplates = {
  httpRequestNode: {
    nodeType: "n8n-nodes-base.httpRequest",
    settings: {
      authentication: "none",
      method: "GET",
      followRedirects: true,
      timeoutMs: 30000,
      ignoreResponseCode: false
    },
    description: "Use these settings for all API endpoints"
  },

  functionNode: {
    example: `
// Parse and transform daily report data
const reports = $node['HTTP Request'].json.body;
const transformed = reports.map(report => ({
  niche: report.niche,
  keyword: report.trending_keyword,
  volume: report.search_volume,
  competition: report.competition_level,
  date: new Date(report.timestamp).toLocaleDateString()
}));

return { data: transformed };
    `,
    description: "Transform API responses for storage/processing"
  },

  webhookResponseNode: {
    example: {
      statusCode: 200,
      body: {
        status: "success",
        processedItems: "{{ $node['HTTP Request'].json.body.length }}",
        timestamp: "{{ $now.toISOString() }}"
      }
    },
    description: "Return confirmation to n8n webhook"
  }
};

// Error Handling Pattern

const errorHandling = {
  httpRequestWithErrorHandling: {
    setup: "Add IF node after HTTP Request",
    condition: "If error occurs OR status !== 200",
    actions: [
      "Log error with timestamp",
      "Send alert notification",
      "Retry with exponential backoff",
      "Store in error queue"
    ]
  },

  exampleErrorResponse: {
    statusCode: 400,
    body: {
      error: "niches parameter is required (comma-separated)"
    }
  }
};

// Workflow Patterns

const workflowPatterns = {
  
  dailyReportPattern: {
    nodes: [
      "Cron: Daily 8:00 AM UTC",
      "GET /api/daily-report",
      "Parse JSON",
      "Store in database",
      "Send email with report",
      "Webhook response"
    ]
  },

  competitiveAnalysisPattern: {
    nodes: [
      "Webhook: Manual trigger",
      "Select niche",
      "GET /api/competitors",
      "GET /api/trends (parallel)",
      "Merge results",
      "Generate comparison table",
      "Save to Google Sheets",
      "Webhook response"
    ]
  },

  bookOutlinePattern: {
    nodes: [
      "Form: User input niche + audience",
      "GET /api/keywords-for-book",
      "Function: Format keywords",
      "OpenAI: Generate outline",
      "Function: Parse outline",
      "Save to database",
      "Send confirmation email",
      "Webhook response"
    ]
  }
};

// Testing in n8n

const testingGuide = {
  manualTest: {
    steps: [
      "1. Add HTTP Request node",
      "2. Set Method to GET",
      "3. Paste URL from examples above",
      "4. Click 'Execute Node'",
      "5. Check 'Output' tab for response"
    ],
    expectedOutput: "200 OK with JSON array or object"
  },

  debugMode: {
    steps: [
      "1. Add Debug node after HTTP Request",
      "2. Set 'Output' to Body",
      "3. Execute workflow",
      "4. Check debug output in sidebar",
      "5. Examine JSON structure"
    ]
  }
};

// Performance Recommendations

const performanceRecommendations = {
  caching: [
    "Daily Report: Cache for 3600 seconds (refresh at 00:00 UTC)",
    "Competitors: Cache for 7200 seconds (2x daily refresh)",
    "Trends: Cache for 3600 seconds (hourly refresh)",
    "Keywords: Cache for 3600 seconds (hourly refresh)",
    "Recommendations: Cache for 3600 seconds (hourly refresh)"
  ],

  rateOptimization: [
    "Batch niches in daily-report instead of individual calls",
    "Use parallel HTTP nodes for independent calls (trends + competitors)",
    "Implement exponential backoff for retries",
    "Use webhooks for event-driven triggers vs scheduled"
  ],

  monitoring: [
    "Log all API calls with timestamp",
    "Track response times for performance",
    "Alert on errors or >5 second latency",
    "Monitor rate limit headers if present"
  ]
};

console.log(JSON.stringify({
  n8nWorkflowExamples,
  nodeConfigTemplates,
  errorHandling,
  workflowPatterns,
  testingGuide,
  performanceRecommendations
}, null, 2));
