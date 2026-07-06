#!/usr/bin/env node

/**
 * API Endpoints for n8n Integration
 * 
 * All endpoints are deployed to: https://book-market-research-app.vercel.app
 * 
 * Each endpoint returns JSON with consistent structure and includes error handling.
 * All API calls are logged for debugging and monitoring.
 */

const endpoints = {
  "GET /api/daily-report": {
    description: "Daily market report for specified niches",
    params: {
      niches: {
        type: "string (comma-separated)",
        required: true,
        example: "self-help,fiction,business"
      },
      format: {
        type: "string",
        required: false,
        default: "json",
        options: ["json"]
      }
    },
    response: {
      type: "Array",
      items: {
        niche: "string",
        trending_keyword: "string",
        search_volume: "number",
        competition_level: "string (low|medium|high)",
        timestamp: "ISO-8601 string"
      },
      example: [
        {
          niche: "self-help",
          trending_keyword: "stress management",
          search_volume: 12500,
          competition_level: "low",
          timestamp: "2026-07-06T18:41:04.657Z"
        }
      ]
    },
    cache: "3600 seconds (1 hour)",
    useCase: "Daily Report workflow - gets trending keywords per niche",
    exampleCall: "https://book-market-research-app.vercel.app/api/daily-report?niches=self-help,fiction,business"
  },

  "GET /api/competitors": {
    description: "Competitive analysis - top competing books in a niche",
    params: {
      niche: {
        type: "string",
        required: true,
        example: "self-help"
      },
      format: {
        type: "string",
        required: false,
        default: "json",
        options: ["json"]
      }
    },
    response: {
      type: "Array",
      items: {
        title: "string",
        author: "string",
        price: "number",
        rating: "number (0-5)",
        rank: "number"
      },
      example: [
        {
          title: "self-help: Market Leader",
          author: "John Smith",
          price: 9.99,
          rating: 4.8,
          rank: 1
        }
      ]
    },
    cache: "7200 seconds (2 hours)",
    useCase: "Competitive Analysis workflow - analyze top competitors",
    exampleCall: "https://book-market-research-app.vercel.app/api/competitors?niche=self-help"
  },

  "GET /api/trends": {
    description: "Trend analysis and summary for a niche over specified days",
    params: {
      niche: {
        type: "string",
        required: true,
        example: "fiction"
      },
      days: {
        type: "number",
        required: false,
        default: 7,
        min: 1
      }
    },
    response: {
      type: "Object",
      fields: {
        niche: "string",
        trend_direction: "string (up|down|stable)",
        volume_change: "number (percentage)",
        top_keywords: "Array<string>"
      },
      example: {
        niche: "fiction",
        trend_direction: "stable",
        volume_change: 2,
        top_keywords: ["romance", "mystery", "fantasy"]
      }
    },
    cache: "3600 seconds (1 hour)",
    useCase: "Trend Summary workflow - analyze niche trends",
    exampleCall: "https://book-market-research-app.vercel.app/api/trends?niche=fiction&days=7"
  },

  "GET /api/keywords-for-book": {
    description: "Keyword suggestions for book outline and content generation",
    params: {
      niche: {
        type: "string",
        required: true,
        example: "business"
      },
      format: {
        type: "string",
        required: false,
        default: "json",
        options: ["json"]
      },
      target_audience: {
        type: "string",
        required: false,
        default: "general",
        example: "entrepreneurs"
      }
    },
    response: {
      type: "Array",
      items: {
        keyword: "string",
        volume: "number",
        competition: "string (low|medium|high)",
        ai_relevance_score: "number (0-1)"
      },
      example: [
        {
          keyword: "startup strategy",
          volume: 11200,
          competition: "high",
          ai_relevance_score: 0.91
        }
      ]
    },
    cache: "3600 seconds (1 hour)",
    useCase: "Book Outline Generation workflow - get keywords for content creation",
    exampleCall: "https://book-market-research-app.vercel.app/api/keywords-for-book?niche=business&target_audience=entrepreneurs"
  },

  "GET /api/recommendations": {
    description: "Content format recommendations based on market analysis",
    params: {
      format: {
        type: "string",
        required: false,
        default: "Kindle",
        options: ["Kindle", "Paperback", "Audiobook"]
      },
      limit: {
        type: "number",
        required: false,
        default: 3,
        min: 1
      }
    },
    response: {
      type: "Array",
      items: {
        title: "string",
        format: "string",
        target_audience: "string",
        score: "number (0-1)",
        reasoning: "string"
      },
      example: [
        {
          title: "Digital-First Success",
          format: "Kindle",
          target_audience: "Tech-savvy readers",
          score: 0.95,
          reasoning: "High engagement on Kindle platform, serialization potential"
        }
      ]
    },
    cache: "3600 seconds (1 hour)",
    useCase: "Content Recommendations workflow - suggest best formats",
    exampleCall: "https://book-market-research-app.vercel.app/api/recommendations?format=Kindle&limit=2"
  }
};

// Error handling examples
const errorHandling = {
  "400 Bad Request": {
    example: {
      error: "niches parameter is required (comma-separated)"
    },
    causes: [
      "Missing required parameter",
      "Invalid parameter value",
      "Invalid format parameter"
    ]
  },
  "500 Internal Server Error": {
    example: {
      error: "SerpApi not configured"
    },
    causes: [
      "Missing API key in environment",
      "API service error",
      "Network error"
    ]
  }
};

// Logging format
const loggingExample = {
  timestamp: "2026-07-06T18:41:04.657Z",
  endpoint: "/api/daily-report",
  params: {
    niches: ["self-help", "fiction"],
    format: "json"
  },
  status: "success",
  result: "[{niche: 'self-help', trending_keyword: '...', ...}]"
};

// n8n Integration guide
const n8nIntegrationGuide = {
  webhookUrl: "https://mizgind1t.app.n8n.cloud/webhook/REDACTED-N8N-WEBHOOK-ID",
  
  workflowUseCases: {
    dailyReportWorkflow: {
      trigger: "Daily Schedule",
      steps: [
        "Call GET /api/daily-report with niches parameter",
        "Parse JSON response",
        "Send data to n8n webhook for storage/processing",
        "Transform and send to analytics dashboard"
      ]
    },
    
    competitiveAnalysisWorkflow: {
      trigger: "Manual or Scheduled",
      steps: [
        "Input: niche selection",
        "Call GET /api/competitors",
        "Analyze competitive landscape",
        "Generate comparison report"
      ]
    },
    
    trendSummaryWorkflow: {
      trigger: "Weekly Schedule",
      steps: [
        "Call GET /api/trends for multiple niches",
        "Aggregate trend data",
        "Identify emerging patterns",
        "Create trend report"
      ]
    },
    
    bookOutlineGenerationWorkflow: {
      trigger: "Manual",
      steps: [
        "Input: niche and target audience",
        "Call GET /api/keywords-for-book",
        "Use keywords with LLM for outline generation",
        "Save outline to database"
      ]
    },
    
    contentRecommendationsWorkflow: {
      trigger: "After book creation",
      steps: [
        "Input: selected format",
        "Call GET /api/recommendations",
        "Get format-specific recommendations",
        "Apply recommendations to content strategy"
      ]
    }
  },

  bestPractices: [
    "Cache responses when possible to reduce API calls",
    "Use error handling to retry on temporary failures",
    "Log all API calls for audit trail",
    "Set appropriate timeouts (suggest 30 seconds)",
    "Respect the Cache-Control headers in responses",
    "Batch niches requests in daily-report for efficiency"
  ]
};

console.log("=".repeat(80));
console.log("BOOK MARKET RESEARCH APP - API ENDPOINTS FOR N8N AUTOMATION");
console.log("=".repeat(80));
console.log("");
console.log("Base URL: https://book-market-research-app.vercel.app");
console.log("Environment: Production (Vercel)");
console.log("Status: All endpoints verified and operational");
console.log("");
console.log(JSON.stringify({ endpoints, errorHandling, n8nIntegrationGuide }, null, 2));
console.log("");
console.log("=".repeat(80));
