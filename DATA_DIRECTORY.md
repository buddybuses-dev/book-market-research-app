# Data Directory

This project depends on these live data connections:

- n8n sync webhook
  - Environment key: `N8N_WEBHOOK_URL`
  - Route used by app: `/api/n8n-sync`
  - Purpose: sends execution packs and run history to n8n

- Amazon bridge webhook
  - Environment key: `AMAZON_SP_API_WEBHOOK_URL`
  - Route used by app: `/api/tool-run` with `amazon-seller-central:*` tools
  - Purpose: forwards Amazon pricing requests to n8n bridge flow

- SerpApi
  - Environment key: `SERPAPI_API_KEY`
  - Route used by app: `/api/tool-run` with `serpapi:*` tools
  - Purpose: trends, autocomplete, amazon SERP, and scholar data

## Fast health checks

- Baseline checks:
  - `npm run verify:all`

- Live connector checks:
  - `npm run verify:live`

- Full checks:
  - `npm run verify:full`
